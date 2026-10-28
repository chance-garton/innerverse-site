#!/usr/bin/env python3
"""Build the InnerVerse site into dist/.

Reads the files the innerverse-data build already makes every day from
Airtable (episodes/<slug>.json, _corpus.json, episodes-index.json) plus the
frozen Squarespace snapshot in data/squarespace-posts.json, and writes one
finished page per episode, the stylesheet, the scripts, a sitemap and
robots.txt.

    IV_DATA_DIR=../innerverse-data python3 build/build.py

Environment:
    IV_DATA_DIR       path to a checkout of chance-garton/innerverse-data
    IV_BASE           "" for the real domain, "/innerverse-site" for the test address
    IV_NOINDEX=1      tell search engines to stay away (the test address)
    IV_ASSET_VERSION  cache-buster for site.css and the scripts
"""

import glob
import hashlib
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

DATA = os.environ.get("IV_DATA_DIR", os.path.join(ROOT, "..", "innerverse-data"))
OUT = os.path.join(ROOT, "dist")


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def assets_hash():
    h = hashlib.sha1()
    for p in sorted(glob.glob(os.path.join(ROOT, "src", "css", "*.css")) + glob.glob(os.path.join(ROOT, "src", "js", "*.js"))):
        h.update(open(p, "rb").read())
    return h.hexdigest()[:10]


os.environ.setdefault("IV_ASSET_VERSION", assets_hash())
import common  # noqa: E402  (reads the environment at import)
import episode  # noqa: E402
import pages as hand  # noqa: E402


def write(rel, text):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def build_assets():
    css = "".join(open(p, encoding="utf-8").read() + "\n" for p in sorted(glob.glob(os.path.join(ROOT, "src", "css", "*.css"))))
    write("assets/site.css", css)
    for p in glob.glob(os.path.join(ROOT, "src", "js", "*.js")):
        write("assets/" + os.path.basename(p), open(p, encoding="utf-8").read())


def episode_file(slug):
    """The live post slug, or the same slug without Squarespace's five
    character duplicate suffix, as the render script tried both."""
    for cand in (slug, re.sub(r"-[a-z0-9]{5}$", "", slug)):
        p = os.path.join(DATA, "episodes", cand + ".json")
        if os.path.exists(p):
            return load(p)
    return None


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    build_assets()

    snap = load(os.path.join(ROOT, "data", "squarespace-posts.json"))
    posts = snap["episodes"]
    corpus = load(os.path.join(DATA, "episodes", "_corpus.json"))["records"]
    index = {e["slug"]: e for e in load(os.path.join(DATA, "episodes-index.json"))["episodes"]}

    # Which episodes have a page: every live Squarespace post with episode
    # data. A post with no data file is a known duplicate (OPEN-ITEMS) and is
    # listed for the redirects file instead.
    pages, no_data = [], []
    for p in posts:
        file = episode_file(p["slug"])
        (pages if file else no_data).append((p, file))
    live = {p["slug"] for p, _ in pages} | {(f or {}).get("fields", {}).get("Slug") for _, f in pages}
    related = episode.Related(corpus, live)

    sitemap = []
    for post, file in pages:
        slug = post["slug"]
        data_slug = file["fields"].get("Slug") or slug
        tags = (index.get(data_slug) or {}).get("tags") or post.get("tags") or []
        html = episode.render(slug, file, post, related.rank(data_slug), tags)
        write("episodes/" + slug + ".html", html)
        lastmod = (file.get("generated") or "")[:10] or (file["fields"].get("Publish Date") or "")
        sitemap.append((common.LIVE_ORIGIN + "/episodes/" + slug, lastmod))

    # The homepage and the archive (stage 2). The archive lists newest first.
    write("index.html", hand.home())
    newest = sorted(pages, key=lambda pf: pf[0].get("publishOn") or 0, reverse=True)
    arch = hand.episodes(newest)
    write("episodes.html", arch)
    write("episodes/index.html", arch)
    today = __import__("datetime").date.today().isoformat()
    sitemap[:0] = [(common.LIVE_ORIGIN + "/", today), (common.LIVE_ORIGIN + "/episodes", today)]

    write("robots.txt", ("User-agent: *\nDisallow: /\n" if common.NOINDEX else
                         "User-agent: *\nAllow: /\n\nSitemap: " + common.LIVE_ORIGIN + "/sitemap.xml\n"))
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod in sitemap:
        xml.append("<url><loc>" + common.esc(loc) + "</loc>" + ("<lastmod>" + mod + "</lastmod>" if mod else "") + "</url>")
    xml.append("</urlset>")
    write("sitemap.xml", "\n".join(xml) + "\n")
    write(".nojekyll", "")
    # Until every page lives here, an address this site does not have yet
    # (the homepage, /plus, About...) goes on to the same page on the live site.
    write("404.html", "<!doctype html><meta charset=utf-8><title>InnerVerse</title><script>"
          "var b=" + json.dumps(common.BASE) + ",p=location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length);"
          "location.replace(" + json.dumps(common.LIVE_ORIGIN) + "+(p||'/')+location.search+location.hash);</script>"
          "<p>Taking you to <a href=\"" + common.LIVE_ORIGIN + "\">innerversepodcast.com</a>.</p>\n")

    report = {"episodePages": len(pages), "postsWithNoData": [p["slug"] for p, _ in no_data]}
    write("build-report.json", json.dumps(report, indent=1))
    print(json.dumps(report))


if __name__ == "__main__":
    main()
