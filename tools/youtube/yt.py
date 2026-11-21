#!/usr/bin/env python3
"""YouTube channel edits through the YouTube Data API (run by .github/workflows/youtube.yml).

Secrets (repository secrets, never printed): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
YOUTUBE_REFRESH_TOKEN (scope youtube.force-ssl).

Modes:
  test  <batch>   read only: which channel the token signs in to, and the current
                  title, description and thumbnail of every video in the batch.
  apply <batch>   for each video in the batch: back up the current snippet, set the new
                  title and/or description (every other snippet field kept as it was),
                  and set the new thumbnail from its address.

A batch is data/youtube/batches/<name>.json: [{"videoId", "title"?, "description"?,
"thumbnail"?}]. Any field left out is not changed. Every run writes a report to
data/youtube/runs/<mode>-<batch>-<UTC time>.json (old and new values, errors).
Quota: videos.list 1 unit, videos.update 50, thumbnails.set 50 (10,000 a day).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
API = "https://www.googleapis.com/youtube/v3"
UPLOAD = "https://www.googleapis.com/upload/youtube/v3"


def token():
    body = urllib.parse.urlencode({
        "client_id": os.environ["YOUTUBE_CLIENT_ID"],
        "client_secret": os.environ["YOUTUBE_CLIENT_SECRET"],
        "refresh_token": os.environ["YOUTUBE_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", body, timeout=30) as r:
        return json.load(r)["access_token"]


def call(tok, method, url, data=None, ctype="application/json"):
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Authorization": "Bearer " + tok, "Content-Type": ctype})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raise RuntimeError("HTTP %s: %s" % (e.code, e.read().decode(errors="replace")[:600]))


def videos(tok, ids):
    out = {}
    for i in range(0, len(ids), 50):
        q = urllib.parse.urlencode({"part": "snippet,status", "id": ",".join(ids[i:i + 50])})
        for it in call(tok, "GET", API + "/videos?" + q).get("items", []):
            out[it["id"]] = it
    return out


def main():
    mode, name = sys.argv[1], sys.argv[2]
    batch = json.load(open(os.path.join(ROOT, "data/youtube/batches", name + ".json")))
    tok = token()
    ch = call(tok, "GET", API + "/channels?part=snippet&mine=true").get("items", [])
    report = {"mode": mode, "batch": name,
              "channel": [{"id": c["id"], "title": c["snippet"]["title"]} for c in ch],
              "videos": []}
    print("Signed in to channel:", report["channel"])
    have = videos(tok, [b["videoId"] for b in batch])
    for b in batch:
        vid = b["videoId"]
        it = have.get(vid)
        row = {"videoId": vid}
        report["videos"].append(row)
        if not it:
            row["error"] = "video not found on this channel (or not visible to this sign-in)"
            print(vid, "NOT FOUND")
            continue
        sn = it["snippet"]
        row["old"] = {"title": sn.get("title"), "description": sn.get("description"),
                      "thumbnail": (sn.get("thumbnails", {}).get("maxres") or sn.get("thumbnails", {}).get("high") or {}).get("url"),
                      "privacy": it["status"].get("privacyStatus"), "channelId": sn.get("channelId")}
        if mode == "test":
            print(vid, "|", sn.get("title"))
            continue
        try:
            if "title" in b or "description" in b:
                keep = {k: sn[k] for k in ("title", "description", "categoryId", "tags",
                                           "defaultLanguage", "defaultAudioLanguage") if k in sn}
                keep["title"] = b.get("title", keep.get("title"))
                keep["description"] = b.get("description", keep.get("description", ""))
                res = call(tok, "PUT", API + "/videos?part=snippet",
                           json.dumps({"id": vid, "snippet": keep}).encode())
                row["new"] = {"title": res["snippet"]["title"], "description": res["snippet"]["description"]}
            if b.get("thumbnail"):
                img = urllib.request.urlopen(urllib.request.Request(
                    b["thumbnail"], headers={"User-Agent": "innerverse-youtube"}), timeout=60).read()
                res = call(tok, "POST", UPLOAD + "/thumbnails/set?videoId=" + vid, img, "image/jpeg")
                row["thumbnailSet"] = bool(res.get("items"))
            print(vid, "updated")
        except Exception as e:  # noqa: BLE001
            row["error"] = str(e)
            print(vid, "ERROR", e)
        time.sleep(1)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    os.makedirs(os.path.join(ROOT, "data/youtube/runs"), exist_ok=True)
    path = os.path.join(ROOT, "data/youtube/runs", "%s-%s-%s.json" % (mode, name, stamp))
    json.dump(report, open(path, "w"), indent=1, ensure_ascii=False)
    print("report:", path)
    return 1 if any("error" in r for r in report["videos"]) and mode == "apply" else 0


if __name__ == "__main__":
    sys.exit(main())
