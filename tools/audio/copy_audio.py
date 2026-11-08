#!/usr/bin/env python3
"""Copy the free episode audio from Acast into our own R2 bucket.

Why: the site, the app and the members' feed play free audio straight from a
podcast host today. Once copied, they play our own file, so a host change
(or a host's inserted ads) can never shift chapter timings or break playback.

What it copies: every distinct Acast episode named in the `Acast Audio URL`
field of the episode data (a checkout of chance-garton/innerverse-data),
newest first. The file is stored exactly as Acast serves it today, byte for
byte, with no re-encoding, so Audio Offset Seconds and chapters stay right.

Stored as  episodes/<slug>.mp3  (slug of the newest row using that audio)
Public at  <AUDIO_BASE_URL>/episodes/<slug>.mp3

Safe to rerun: a file already in the bucket at the expected size is skipped,
and nothing is ever overwritten. Each run checks every file answers from the
public address with the right type and size, records it in
data/audio/map.json, and writes a run report in data/audio/runs/.

Usage:
  python tools/audio/copy_audio.py <batch> [--data DIR] [--dry-run]
    batch: "test" (newest 3), "all", or a number N (next N not yet copied),
           all from the episode data; or "feed", "feed-test", "feed-N": every
           PUBLISHED episode in Acast's public feed not yet copied (episodes
           with no site page yet), stored as episodes/acast-<episodeId>.mp3

Environment (repository secrets): R2_ACCOUNT_ID, R2_AUDIO_ACCESS_KEY_ID,
R2_AUDIO_SECRET_ACCESS_KEY. R2_AUDIO_BUCKET and AUDIO_BASE_URL are set in
the workflow itself (innerverse-audio, https://audio.innerversepodcast.com).
"""
import glob
import json
import os
import re
import sys
import tempfile
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO_DIR = os.path.join(ROOT, "data", "audio")
MAP = os.path.join(AUDIO_DIR, "map.json")
RUNS = os.path.join(AUDIO_DIR, "runs")

UA = "InnerVerse audio copy (chance-garton/innerverse-site)"
CACHE = "public, max-age=31536000, immutable"
WORKERS = 4
ID_RE = re.compile(r"/episodes/([0-9a-f]{24})\.mp3|/e/([0-9a-f]{24})/")
lock = threading.Lock()


def log(*a):
    with lock:
        print(*a, flush=True)


def episode_id(url):
    m = ID_RE.search(url or "")
    return (m.group(1) or m.group(2)) if m else None


def worklist(data_dir):
    """One entry per distinct Acast episode, newest first."""
    by_id = {}
    for path in glob.glob(os.path.join(data_dir, "episodes", "*.json")):
        try:
            f = json.load(open(path, encoding="utf-8")).get("fields") or {}
        except (ValueError, AttributeError):
            continue
        url, slug = f.get("Acast Audio URL"), f.get("Slug")
        eid = episode_id(url)
        if not (eid and slug):
            continue
        row = {"slug": slug, "date": f.get("Publish Date") or "", "url": url}
        by_id.setdefault(eid, []).append(row)
    out = []
    for eid, rows in by_id.items():
        rows.sort(key=lambda r: (r["date"], r["slug"]), reverse=True)
        out.append({"id": eid, "slug": rows[0]["slug"], "date": rows[0]["date"],
                    "source": rows[0]["url"], "slugs": sorted(r["slug"] for r in rows)})
    out.sort(key=lambda e: (e["date"], e["slug"]), reverse=True)
    return out


FEED = "https://feeds.acast.com/public/shows/5a7e6d34b56c94b1216394e3"


def feed_worklist():
    """Every PUBLISHED episode in Acast's public feed (drafts are never in it)."""
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    req = urllib.request.Request(FEED, headers={"User-Agent": UA})
    root = ET.fromstring(urllib.request.urlopen(req, timeout=120).read())
    out = []
    for it in root.iter("item"):
        enc = it.find("enclosure")
        url = enc.get("url") if enc is not None else ""
        eid = (it.findtext("guid") or "").strip()
        if not re.fullmatch(r"[0-9a-f]{24}", eid):
            # Old SoundCloud-era items carry a "tag:soundcloud" guid and a
            # matching enclosure path; Acast's own episodeId is in its namespace.
            eid = (it.findtext("{https://schema.acast.com/1.0/}episodeId") or "").strip() or episode_id(url)
        if not (eid and url):
            continue
        try:
            date = parsedate_to_datetime(it.findtext("pubDate")).strftime("%Y-%m-%d")
        except Exception:
            date = ""
        out.append({"id": eid, "slug": "acast-" + eid, "date": date, "source": url,
                    "slugs": [], "title": (it.findtext("title") or "").strip()})
    out.sort(key=lambda e: (e["date"], e["slug"]), reverse=True)
    return out


def s3():
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url="https://%s.r2.cloudflarestorage.com" % os.environ["R2_ACCOUNT_ID"],
        aws_access_key_id=os.environ["R2_AUDIO_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_AUDIO_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4", retries={"max_attempts": 5}),
        region_name="auto")


def stored_size(cli, bucket, key):
    try:
        return cli.head_object(Bucket=bucket, Key=key)["ContentLength"]
    except Exception:
        return None


def looks_like_mp3(head):
    return head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)


def download(url, dest):
    """Fetch the file as served today, following Acast's redirects."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as out:
        expected = int(r.headers.get("Content-Length") or 0)
        ctype = (r.headers.get("Content-Type") or "").lower()
        got = 0
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
            got += len(chunk)
    if expected and got != expected:
        raise RuntimeError("short download: %d of %d bytes" % (got, expected))
    with open(dest, "rb") as fh:
        head = fh.read(4)
    if not looks_like_mp3(head):
        raise RuntimeError("not an mp3 (type %s)" % ctype)
    return got


def check_public(url, size):
    """The public copy must answer a Range request with the right type and size."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Range": "bytes=0-1"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                ctype = r.headers.get("Content-Type", "")
                total = (r.headers.get("Content-Range") or "").rpartition("/")[2]
                if r.status != 206:
                    raise RuntimeError("no range support (status %s)" % r.status)
                if "audio/mpeg" not in ctype:
                    raise RuntimeError("wrong type %s" % ctype)
                if str(size) != total:
                    raise RuntimeError("size %s, expected %s" % (total, size))
                return
        except Exception as e:  # the custom domain can lag a moment after upload
            err = e
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("public check failed: %s" % err)


def preflight(cli, bucket):
    """Say what shape each secret has (never its value) and try one tiny write."""
    def shape(name, want_len=None, hexy=False):
        v = os.environ.get(name, "")
        notes = ["%d chars" % len(v)]
        if v != v.strip():
            notes.append("HAS SPACES OR A NEW LINE AT AN END")
        if want_len and len(v.strip()) != want_len:
            notes.append("expected %d" % want_len)
        if hexy and not re.fullmatch(r"[0-9a-f]+", v.strip()):
            notes.append("not plain hex")
        log("  %s: %s" % (name, ", ".join(notes)))
    shape("R2_ACCOUNT_ID", 32, True)
    shape("R2_AUDIO_ACCESS_KEY_ID", 32, True)
    shape("R2_AUDIO_SECRET_ACCESS_KEY", 64, True)
    log("  R2_AUDIO_BUCKET is innerverse-audio: %s" % (bucket == "innerverse-audio"))
    log("  AUDIO_BASE_URL is https://audio.innerversepodcast.com: %s"
        % (os.environ.get("AUDIO_BASE_URL", "").rstrip("/") == "https://audio.innerversepodcast.com"))
    try:
        cli.put_object(Bucket=bucket, Key="_check.txt", Body=b"ok", ContentType="text/plain")
        cli.delete_object(Bucket=bucket, Key="_check.txt")
        log("  test write: ok")
    except Exception as e:
        sys.exit("  test write refused: %s" % str(e)[:200])


def run_one(ep, cli, bucket, base, dry):
    key = "episodes/%s.mp3" % ep["slug"]
    public = "%s/%s" % (base.rstrip("/"), key)
    t0 = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "a.mp3")
        size = download(ep["source"], path)
        if dry:
            return {"key": key, "url": public, "bytes": size, "dry": True}
        have = stored_size(cli, bucket, key)
        if have is None:
            cli.upload_file(path, bucket, key, ExtraArgs={
                "ContentType": "audio/mpeg", "CacheControl": CACHE})
        elif have != size:
            raise RuntimeError("a different file is already stored at %s (%d bytes); not overwritten" % (key, have))
    check_public(public, size)
    log("  ok %s  %.1f MB  %.0fs" % (ep["slug"], size / 1e6, time.time() - t0))
    return {"key": key, "url": public, "bytes": size}


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    batch = args[0]
    dry = "--dry-run" in args
    data_dir = args[args.index("--data") + 1] if "--data" in args else os.environ.get("IV_DATA_DIR", "../innerverse-data")
    if not os.path.isdir(os.path.join(data_dir, "episodes")):
        sys.exit("No episode data at %s (pass --data)" % data_dir)

    amap = json.load(open(MAP)) if os.path.exists(MAP) else {"episodes": {}}
    done = amap.setdefault("episodes", {})
    if batch.startswith("feed"):
        todo = [e for e in feed_worklist() if e["id"] not in done]
        batch_kind = batch[4:].lstrip("-") or "all"
    else:
        todo = [e for e in worklist(data_dir) if e["id"] not in done]
        batch_kind = batch
    if batch_kind == "test":
        todo = todo[:3]
    elif batch_kind.isdigit():
        todo = todo[:int(batch_kind)]
    elif batch_kind != "all":
        sys.exit("batch must be test, all, a number, or feed / feed-test / feed-N")
    log("%d to copy (%d already done)" % (len(todo), len(done)))

    cli = bucket = base = None
    if not dry:
        for v in ("R2_ACCOUNT_ID", "R2_AUDIO_ACCESS_KEY_ID", "R2_AUDIO_SECRET_ACCESS_KEY",
                  "R2_AUDIO_BUCKET", "AUDIO_BASE_URL"):
            if not os.environ.get(v):
                sys.exit("Missing %s" % v)
        cli, bucket = s3(), os.environ["R2_AUDIO_BUCKET"]
        preflight(cli, bucket)
    base = os.environ.get("AUDIO_BASE_URL", "https://audio.innerversepodcast.com")

    def save_map():
        amap["count"] = len(done)
        amap["bytes"] = sum(v["bytes"] for v in done.values())
        with open(MAP, "w") as fh:
            json.dump(amap, fh, indent=1, sort_keys=True)

    report = {"batch": batch, "started": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "copied": [], "failed": [], "bytes": 0}

    def job(ep):
        try:
            res = run_one(ep, cli, bucket, base, dry)
            with lock:
                report["copied"].append(ep["slug"])
                report["bytes"] += res["bytes"]
                if not dry:
                    done[ep["id"]] = {"slug": ep["slug"], "slugs": ep["slugs"], "url": res["url"],
                                      "bytes": res["bytes"], "source": ep["source"]}
                    if ep.get("title"):  # an Acast episode with no site page yet
                        done[ep["id"]].update({"title": ep["title"], "date": ep["date"], "nopage": True})
                    if len(report["copied"]) % 20 == 0:
                        save_map()  # so a run cut short keeps its progress
        except Exception as e:
            log("  FAILED %s: %s" % (ep["slug"], e))
            with lock:
                report["failed"].append({"slug": ep["slug"], "id": ep["id"], "reason": str(e)[:300]})

    with ThreadPoolExecutor(WORKERS) as pool:
        list(pool.map(job, todo))

    report["finished"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    if not dry:
        save_map()
        os.makedirs(RUNS, exist_ok=True)
        stamp = report["finished"].replace(":", "").replace("-", "")
        with open(os.path.join(RUNS, "%s-%s.json" % (batch, stamp)), "w") as fh:
            json.dump(report, fh, indent=1)
    log("copied %d, failed %d, %.2f GB" % (len(report["copied"]), len(report["failed"]), report["bytes"] / 1e9))
    if report["failed"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
