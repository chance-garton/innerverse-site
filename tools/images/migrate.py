#!/usr/bin/env python3
"""Copy one batch of Squarespace images into Cloudflare R2.

Brief: claude/BRIEF-image-migration-2026-10-30.md (Stage 2) in Chance's
Claude project. For every image in the batch that is not already complete in
the bucket it fetches the true original, makes WebP copies at the site's
widths (never enlarging), uploads them, checks each file answers from the
public address, and records the image in data/images/map.json.

Safe to rerun: an image whose files are all in the bucket is skipped, and an
existing file is never overwritten.

Usage:
  python tools/images/migrate.py <batch-name>            (needs the R2 secrets)
  python tools/images/migrate.py <batch-name> --dry-run  (no upload, files
                                                          written to ./_dryrun)

Environment (from the repository secrets): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
R2_SECRET_ACCESS_KEY, R2_BUCKET, IMAGE_BASE_URL.
"""
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG_DIR = os.path.join(ROOT, "data", "images")
BATCHES = os.path.join(IMG_DIR, "batches.json")
MAP = os.path.join(IMG_DIR, "map.json")
RUNS = os.path.join(IMG_DIR, "runs")

WIDTHS = [300, 500, 750, 1000, 1500]
QUALITY = 82
ACCEPT = "image/png,image/jpeg,image/gif,*/*;q=0.1"  # no webp or avif: get the real original
UA = "InnerVerse image migration (chance-garton/innerverse-site)"
CACHE = "public, max-age=31536000, immutable"
SITE_ID = "5987d897cf81e0278ec5322e"

TYPES = {  # first bytes -> (extension, content type)
    "png": ("png", "image/png"),
    "jpg": ("jpg", "image/jpeg"),
    "gif": ("gif", "image/gif"),
    "webp": ("webp", "image/webp"),
    "svg": ("svg", "image/svg+xml"),
}


def normalise(url):
    """One image, one entry: no query string, decoded path, https."""
    p = urllib.parse.urlsplit(url.strip())
    path = urllib.parse.unquote(p.path.replace("+", " "))
    host = p.netloc.lower()
    return urllib.parse.urlunsplit(("https", host, path, "", ""))


def clean(s):
    s = s.lower()
    s = re.sub(r"\.[a-z0-9]{2,4}$", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "image"


def key_for(url):
    """Stable folder name in the bucket, made from the Squarespace address."""
    p = urllib.parse.urlsplit(url)
    parts = [x for x in p.path.split("/") if x]
    name = clean(parts[-1]) if parts else "image"
    if p.netloc.endswith("innerversepodcast.com") and len(parts) >= 2 and parts[0] == "s":
        return "files/%s" % name
    ids = [x for x in parts[:-1] if x not in ("content", "v1", "static", SITE_ID)]
    ident = "-".join(clean(x) for x in ids) or "x"
    return "sq/%s/%s" % (ident, name)


def sniff(b):
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if b[:3] == b"\xff\xd8\xff":
        return "jpg"
    if b[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "webp"
    head = b[:512].lstrip().lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in b[:2048].lower()):
        return "svg"
    return None


def fetch(url, tries=3):
    req_url = urllib.parse.urlunsplit(urllib.parse.urlsplit(url)._replace(
        path=urllib.parse.quote(urllib.parse.urlsplit(url).path)))
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(req_url, headers={"Accept": ACCEPT, "User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            if getattr(e, "code", None) in (403, 404, 410):
                break
            time.sleep(2 * (i + 1))
    raise RuntimeError("fetch failed: %s" % last)


def make_sizes(data, kind):
    """Return (width, height, {width: webp bytes})."""
    if kind == "svg":
        return None, None, {}
    from PIL import Image  # here, not at the top, so the site build can import normalise() without Pillow

    im = Image.open(io.BytesIO(data))
    w, h = im.size
    if getattr(im, "is_animated", False):
        return w, h, {}  # animated: keep the original only
    if im.mode in ("P", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
    elif im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    out = {}
    for tw in WIDTHS:
        if tw > w:
            continue
        th = max(1, round(h * tw / w))
        small = im if tw == w else im.resize((tw, th), Image.LANCZOS)
        buf = io.BytesIO()
        small.save(buf, "WEBP", quality=QUALITY, method=6)
        out[tw] = buf.getvalue()
    return w, h, out


class Bucket:
    def __init__(self):
        import boto3
        from botocore.config import Config
        acct = os.environ["R2_ACCOUNT_ID"].strip()
        self.name = os.environ["R2_BUCKET"].strip()
        self.base = os.environ["IMAGE_BASE_URL"].strip().rstrip("/")
        self.s3 = boto3.client(
            "s3",
            endpoint_url="https://%s.r2.cloudflarestorage.com" % acct,
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"].strip(),
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"].strip(),
            region_name="auto",
            config=Config(retries={"max_attempts": 5, "mode": "standard"}),
        )

    def exists(self, key):
        try:
            self.s3.head_object(Bucket=self.name, Key=key)
            return True
        except Exception as e:  # noqa: BLE001
            code = str(getattr(e, "response", {}).get("Error", {}).get("Code", ""))
            if code in ("404", "NoSuchKey", "NotFound"):
                return False
            raise

    def put(self, key, body, ctype):
        if self.exists(key):
            return False  # never overwrite
        self.s3.put_object(Bucket=self.name, Key=key, Body=body,
                           ContentType=ctype, CacheControl=CACHE)
        return True

    def check_public(self, key, ctype):
        url = "%s/%s" % (self.base, key)
        for i in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=30) as r:
                    got = r.headers.get("Content-Type", "")
                    n = len(r.read())
                    if r.status == 200 and got.split(";")[0] == ctype and n > 0:
                        return True, "%s %d bytes" % (got, n)
                    return False, "status %s type %s" % (r.status, got)
            except Exception as e:  # noqa: BLE001
                err = str(e)
                time.sleep(2 * (i + 1))
        return False, err


class DryBucket:
    base = "dry-run"

    def __init__(self):
        self.dir = os.path.join(ROOT, "_dryrun")

    def exists(self, key):
        return os.path.exists(os.path.join(self.dir, key))

    def put(self, key, body, ctype):
        p = os.path.join(self.dir, key)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if os.path.exists(p):
            return False
        with open(p, "wb") as f:
            f.write(body)
        return True

    def check_public(self, key, ctype):
        return True, "dry run"


def load(path, default):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


def save(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=1, sort_keys=True, ensure_ascii=False)
        f.write("\n")


def run(batch, dry):
    batches = load(BATCHES, {})
    if batch not in batches:
        sys.exit("No batch named %r in data/images/batches.json" % batch)
    urls = batches[batch]["images"] if isinstance(batches[batch], dict) else batches[batch]
    bucket = DryBucket() if dry else Bucket()
    imap = load(MAP, {})
    report = {"batch": batch, "started": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "base": bucket.base, "dry_run": dry, "copied": [], "skipped": [], "failed": [],
              "bytes_added": 0}

    for raw in urls:
        url = normalise(raw)
        key = key_for(url)
        entry = imap.get(url)
        if entry and all(bucket.exists("%s/%s" % (key, f)) for f in entry["files"]):
            report["skipped"].append(url)
            continue
        try:
            data = fetch(url)
            kind = sniff(data)
            if not kind:
                raise RuntimeError("not an image (first bytes %r)" % data[:12])
            ext, ctype = TYPES[kind]
            w, h, sizes = make_sizes(data, kind)
            files = [("orig.%s" % ext, data, ctype)]
            files += [("w%d.webp" % sw, b, "image/webp") for sw, b in sorted(sizes.items())]
            added = 0
            for name, body, ct in files:
                if bucket.put("%s/%s" % (key, name), body, ct):
                    added += len(body)
            bad = []
            for name, _, ct in files:
                ok, why = bucket.check_public("%s/%s" % (key, name), ct)
                if not ok:
                    bad.append("%s: %s" % (name, why))
            if bad:
                raise RuntimeError("public check failed: " + "; ".join(bad))
            imap[url] = {"key": key, "ext": ext, "w": w, "h": h,
                         "widths": sorted(sizes), "files": [f[0] for f in files],
                         "bytes": {f[0]: len(f[1]) for f in files}}
            report["copied"].append({"url": url, "key": key, "w": w, "h": h,
                                     "widths": sorted(sizes), "bytes_added": added})
            report["bytes_added"] += added
        except Exception as e:  # noqa: BLE001
            report["failed"].append({"url": url, "key": key, "reason": str(e)[:300]})
        time.sleep(0.3)  # gentle on Squarespace

    report["finished"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    if not dry:
        save(MAP, imap)
        stamp = report["started"].replace(":", "").replace("-", "")[:15]
        save(os.path.join(RUNS, "%s-%s.json" % (batch, stamp)), report)
    print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in report.items()}, indent=1))
    for f in report["failed"]:
        print("FAILED", f["url"], f["reason"])
    return 1 if report["failed"] and not report["copied"] else 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    sys.exit(run(args[0], "--dry-run" in sys.argv))
