#!/usr/bin/env python3
"""Stage 1 of the image move: list every Squarespace image the site uses.

Read only. Nothing is copied or changed. Brief: claude/BRIEF-image-migration-2026-10-30.md
in Chance's Claude project.

It scans, for image addresses on images.squarespace-cdn.com, static1.squarespace.com
and the /s/ files on innerversepodcast.com:
  1. the Airtable mirror (the innerverse-data repo, built nightly from Airtable):
     per-episode files (Episodes, Guests, Affiliates, by record id and field) and
     the generated index files
  2. this repo (code, templates, CSS, JSON, including data/squarespace-posts.json)
  3. the HTML of the live hand-made pages only
  4. other chance-garton repos given with --other (listed, never changed)
  5. an optional extra file of Airtable rows read straight from Airtable
     (tables the mirror does not carry, such as Promotions)

Every address is normalised with normalise() from migrate.py, so one image is one entry
and the inventory, the batches and the map all share the same keys.

Writes data/images/inventory.json and data/images/batches.json (batch 0 kept as is).

Usage:
  python3 tools/images/inventory.py --data ../chance-garton/innerverse-data \
      [--other ../chance-garton/inner-circle ...] [--extra airtable_extra.json] [--no-live]
"""
import argparse
import glob
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from migrate import normalise  # noqa: E402

IMG_DIR = os.path.join(ROOT, "data", "images")
LIVE_PAGES = ["/", "/episodes", "/plus", "/about", "/biofield-tuning", "/support", "/contact"]
LIVE_BASE = "https://www.innerversepodcast.com"
UA = "InnerVerse image inventory (chance-garton/innerverse-site)"

ADDR = re.compile(
    r"https?://(?:images\.squarespace-cdn\.com|static1\.squarespace\.com)/[^\s\"'<>()\\\]\[]+"
    r"|https?://(?:www\.)?innerversepodcast\.com/s/[^\s\"'<>()\\\]\[]+\.(?:png|jpe?g|gif|webp|svg|avif)",
    re.I,
)
WHOLE = re.compile(r"^https?://(?:images\.squarespace-cdn\.com|static1\.squarespace\.com)/\S+(?: [^\n]*)?$")
SKIP_DIRS = {".git", "node_modules", "dist", "_dryrun", "runs"}
TEXT_EXT = {".py", ".js", ".css", ".html", ".json", ".md", ".txt", ".yml", ".yaml", ".toml", ".webmanifest", ".src", ".mjs"}


REL = re.compile(r"""(?<=["'(=\s])/s/[^\s"'<>()\\\]\[]+\.(?:png|jpe?g|gif|webp|svg|avif)""", re.I)


def found(text):
    out = []
    text = text.replace("&amp;", "&").replace("\\/", "/")
    for m in ADDR.findall(text):
        m = m.rstrip(".,;:")
        if m.endswith("/"):
            last = m.rstrip("/").rsplit("/", 1)[-1]
            if not re.search(r"\.(?:png|jpe?g|gif|webp|svg|avif)$", last, re.I) and not re.search(r"/\d{13}/$", m):
                continue  # a folder or code prefix, not an image (a Squarespace asset ends in its 13 digit timestamp)
            if re.search(r"\.(?:png|jpe?g|gif|webp|svg|avif)/$", m, re.I):
                m = m.rstrip("/")
        out.append(m)
    for m in REL.findall(text):  # relative /s/ file links, as the Biofield page uses
        out.append("https://www.innerversepodcast.com" + m)
    return out


def walk_json(node, path, emit):
    if isinstance(node, str):
        t = node.strip()
        if WHOLE.match(t) and "\n" not in t:
            emit(t, path)  # a field holding just the address (file names can have spaces)
        else:
            for a in found(node):
                emit(a, path)
        s = node.strip()
        if s[:1] in "[{":  # JSON stored inside a text field (quotes, books, chapters)
            try:
                walk_json(json.loads(s), path, emit)
            except ValueError:
                pass
    elif isinstance(node, dict):
        for k, v in node.items():
            walk_json(v, path + [k], emit)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk_json(v, path + [i], emit)


class Inv:
    def __init__(self):
        self.imgs = defaultdict(lambda: {"raw": set(), "uses": [], "_seen": set()})
        self.meta = {}  # normalised address -> extra hints (episode date, etc.)

    def add(self, raw, use):
        if re.search(r"\.(?:css|js|map|json|woff2?|ttf|eot)(?:\?|$)", raw.split("#")[0], re.I):
            return  # Squarespace's own style and script files are not images
        key = normalise(normalise(raw))  # twice, as migrate.py does, so inventory and map keys always match
        if key.endswith("/") and re.search(r"\.(?:png|jpe?g|gif|webp|svg|avif)/$", key, re.I):
            key = key.rstrip("/")  # the live pages write a stray slash after the file name
        e = self.imgs[key]
        e["raw"].add(raw.split("?")[0] if "?" in raw else raw)
        sig = json.dumps(use, sort_keys=True)
        if sig not in e["_seen"]:
            e["_seen"].add(sig)
            e["uses"].append(use)


def scan_data(inv, ddir):
    """The Airtable mirror."""
    dates = {}
    for f in sorted(glob.glob(os.path.join(ddir, "episodes", "*.json"))):
        base = os.path.basename(f)
        if base.startswith("_"):
            continue
        d = json.load(open(f))
        if not isinstance(d, dict) or "fields" not in d:
            continue
        rec = d.get("recordId", base)
        flds = d["fields"]
        slug = flds.get("Slug") or base[:-5]
        dates[slug] = flds.get("Publish Date") or ""

        def em(addr, path, table="Episodes", rid=rec, slug=slug):
            inv.add(addr, {"kind": "airtable", "table": table, "record": rid, "field": path[0] if path else "", "slug": slug})
        walk_json(flds, [], em)
        for gid, g in (d.get("_guestsById") or {}).items():
            walk_json(g, [], lambda a, p, gid=gid: inv.add(a, {"kind": "airtable", "table": "Guests", "record": gid, "field": p[0] if p else ""}))
        for aid, a in (d.get("_affiliatesById") or {}).items():
            walk_json(a, [], lambda x, p, aid=aid: inv.add(x, {"kind": "airtable", "table": "Affiliates", "record": aid, "field": p[0] if p else ""}))
    # generated files built from the same Airtable rows: one use per file, not per item
    for f in ["episodes-index.json", "plus-index.json", "promo.json", "episodes-extra.json", os.path.join("episodes", "_corpus.json")]:
        p = os.path.join(ddir, f)
        if os.path.exists(p):
            walk_json(json.load(open(p, encoding="utf-8")), [], lambda a, pth, f=f: inv.add(a, {"kind": "data-file", "repo": "innerverse-data", "path": f}))
    return dates


def scan_repo(inv, rdir, repo, kind="repo", cap=None):
    for dp, dn, fn in os.walk(rdir):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for name in fn:
            ext = os.path.splitext(name)[1].lower()
            if ext not in TEXT_EXT:
                continue
            p = os.path.join(dp, name)
            if os.path.getsize(p) > 8_000_000:
                continue
            rel = os.path.relpath(p, rdir)
            if rdir == ROOT and rel.startswith(os.path.join("data", "images") + os.sep):
                continue  # the log, map, batches and this scan's own output are not sources
            try:
                txt = open(p, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            if ext == ".json":
                try:
                    walk_json(json.loads(txt), [], lambda a, pth, rel=rel: inv.add(a, {"kind": kind, "repo": repo, "path": rel}))
                    continue
                except ValueError:
                    pass
            for a in set(found(txt)):
                inv.add(a, {"kind": kind, "repo": repo, "path": rel})


def scan_posts(inv):
    p = os.path.join(ROOT, "data", "squarespace-posts.json")
    d = json.load(open(p))
    for grp in ("episodes", "plus"):
        items = d.get(grp) or []
        it = items.items() if isinstance(items, dict) else enumerate(items)
        for k, v in it:
            slug = v.get("slug", k) if isinstance(v, dict) else k
            walk_json(v, [], lambda a, path, grp=grp, slug=slug: inv.add(a, {"kind": "post-snapshot", "group": grp, "slug": str(slug), "field": path[0] if path else ""}))


def scan_live(inv):
    got = {}
    for pg in LIVE_PAGES:
        req = urllib.request.Request(LIVE_BASE + pg, headers={"User-Agent": UA})
        try:
            html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "ignore")
        except Exception as ex:  # noqa: BLE001
            got[pg] = "error: %s" % ex
            continue
        addrs = set(found(html))
        got[pg] = len(addrs)
        for a in addrs:
            inv.add(a, {"kind": "live-page", "page": pg})
    return got


def scan_extra(inv, path):
    for row in json.load(open(path)):
        table, rec, field, addr = row
        inv.add(addr, {"kind": "airtable", "table": table, "record": rec, "field": field})


def group_of(entry):
    """Which copy group an image belongs to. Earlier groups win."""
    uses = entry["uses"]
    kinds = {u["kind"] for u in uses}
    paths = [u.get("path", "") for u in uses if u["kind"] == "repo" and u.get("repo") == "innerverse-site"]
    site_wide = [p for p in paths if not p.startswith("data/")]
    if entry.get("noname"):
        return "leftover"
    if site_wide and not all(p.startswith("src/templates/") for p in site_wide):
        return "sitewide"
    if any(u["kind"] == "live-page" and u["page"] in ("/", "/about", "/biofield-tuning", "/support", "/contact") for u in uses) or \
       any(p.startswith("src/templates/") for p in site_wide) or \
       any("innerversepodcast.com/s/" in r for r in entry["raw"]):
        return "pages"
    if any(u["kind"] == "airtable" and u["table"] == "Guests" and u["field"] == "Portrait URL" for u in uses):
        return "portraits"
    if any(u["kind"] in ("airtable", "post-snapshot") and (u.get("field") or "") != "" or u["kind"] == "post-snapshot" for u in uses) and \
       any(u["kind"] == "airtable" and u["table"] == "Episodes" or u["kind"] == "post-snapshot" for u in uses):
        return "episodes"
    return "leftover"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--other", nargs="*", default=[])
    ap.add_argument("--extra")
    ap.add_argument("--no-live", action="store_true")
    ap.add_argument("--chunk", type=int, default=100)
    a = ap.parse_args()

    inv = Inv()
    dates = scan_data(inv, a.data)
    scan_repo(inv, ROOT, "innerverse-site")
    scan_repo(inv, a.data, "innerverse-data", kind="data-file")
    scan_posts(inv)
    live = {} if a.no_live else scan_live(inv)
    if a.extra:
        scan_extra(inv, a.extra)
    others = {}
    for od in a.other:
        name = os.path.basename(os.path.abspath(od))
        before = set(inv.imgs)
        tmp = Inv()
        scan_repo(tmp, od, name, kind="other-repo")
        for k, e in tmp.imgs.items():
            for raw in e["raw"]:
                for u in e["uses"]:
                    inv.add(raw, u)
        others[name] = len(set(tmp.imgs) )

    # build entries
    entries = []
    for key, e in inv.imgs.items():
        uses = e["uses"]
        # cap long use lists (one per file) so the file stays readable
        ent = {"address": key, "raw_forms": sorted(e["raw"])[:3], "use_count": len(uses), "uses": uses[:12]}
        entries.append(ent)
    slugdate = lambda e: max([dates.get(u.get("slug", ""), "") for u in e["uses"]] + [""])
    for ent in entries:
        ent["group"] = group_of({"noname": ent["address"].endswith("/") and not any(u["kind"] == "repo" and u["path"].startswith(("src/", "build/")) for u in inv.imgs[ent["address"]]["uses"]), "uses": [u for u in inv.imgs[ent["address"]]["uses"]], "raw": inv.imgs[ent["address"]]["raw"]})
        ent["_date"] = max([dates.get(u.get("slug", ""), "") for u in inv.imgs[ent["address"]]["uses"]] + [""])
    entries.sort(key=lambda e: (e["group"], e["address"]))

    old = json.load(open(os.path.join(IMG_DIR, "batches.json")))
    batch0 = old["0"]
    zero = {normalise(x) for x in batch0["images"]}
    groups = defaultdict(list)
    for ent in entries:
        if ent["address"] in zero:
            continue
        groups[ent["group"]].append(ent)

    batches = {"0": batch0}
    def addbatch(name, what, items):
        batches[name] = {"what": what, "images": [i["address"] for i in items]}
    addbatch("1", "Site-wide images used by code and styles: logos, icons, nav and Plus+ art, loader, share frame", groups["sitewide"])
    addbatch("2", "Hand-made pages: homepage, About, Biofield Tuning and the /s/ chart files", groups["pages"])
    addbatch("3", "Guest and host portraits", groups["portraits"])
    ep = sorted(groups["episodes"], key=lambda e: e["_date"], reverse=True)
    n = 4
    for i in range(0, len(ep), a.chunk):
        part = ep[i:i + a.chunk]
        addbatch(str(n), "Episode images, newest first (%d to %d of %d)" % (i + 1, i + len(part), len(ep)), part)
        n += 1
    addbatch("last", "Leftovers: affiliate book covers, promo art, other repos, anything not placed above", groups["leftover"])
    batches = {k: v for k, v in batches.items() if k == "0" or v["images"]}

    for ent in entries:
        ent.pop("_date", None)
    out = {
        "generated": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": len(entries),
        "by_group": {g: len(v) for g, v in groups.items()},
        "live_pages": live,
        "other_repos": others,
        "images": entries,
    }
    json.dump(out, open(os.path.join(IMG_DIR, "inventory.json"), "w"), indent=1)
    json.dump(batches, open(os.path.join(IMG_DIR, "batches.json"), "w"), indent=1)
    print("total", len(entries), out["by_group"])
    print("batches", {k: len(v["images"]) for k, v in batches.items()})
    print("live", live)
    print("other repos", others)


if __name__ == "__main__":
    main()
