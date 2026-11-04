#!/usr/bin/env python3
"""Stage 4 of the image move: keep the bucket in step with the data, by itself.

Run hourly by .github/workflows/images-sync.yml, a quarter hour before the site
build. It scans the Airtable mirror (and, when it is checked out, the songs
file of chance-garton/inner-circle) for Squarespace image addresses, finds the
ones that have no entry in data/images/map.json, and copies exactly those to
the bucket with the same code the hand-run batches use. Nothing found means
nothing happens and nothing is committed. Never overwrites an existing file.

Usage:
  python tools/images/sync.py --data ../innerverse-data [--songs ../inner-circle/songs/songs.json] [--dry-run]

Needs the R2 secrets in the environment unless --dry-run (see migrate.py).
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import inventory  # noqa: E402
import migrate  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="checkout of chance-garton/innerverse-data")
    ap.add_argument("--songs", help="songs/songs.json of chance-garton/inner-circle (optional)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    inv = inventory.Inv()
    inventory.scan_data(inv, a.data)
    if a.songs and os.path.exists(a.songs):
        inventory.walk_json(json.load(open(a.songs)), [],
                            lambda addr, path: inv.add(addr, {"kind": "songs", "field": str(path[:2])}))

    imap = migrate.load(migrate.MAP, {})
    missing = sorted(u for u in inv.imgs if u not in imap)
    print("images in use: %d, in the map: %d, missing: %d" % (len(inv.imgs), len(imap), len(missing)))
    for u in missing:
        print("  missing", u)
    if not missing:
        return 0
    stamp = datetime.now(timezone.utc).strftime("auto")
    return migrate.run(stamp, a.dry_run, urls=missing)


if __name__ == "__main__":
    sys.exit(main())
