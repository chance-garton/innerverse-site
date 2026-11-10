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

import datetime
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



def llms_txt(newest):
    """A plain-text guide for AI tools (llmstxt.org): what InnerVerse is and where its pages are."""
    o = common.LIVE_ORIGIN
    lines = [
        "# InnerVerse",
        "",
        "> InnerVerse is an independent podcast hosted by Chance Garton, running since 2015 with more "
        "than 1,000 conversations. It explores astrology, mythology, lost history, natural health, and symbolism. "
        "The official site is " + o + "/ .",
        "",
        "Not to be confused with other businesses that share the name (a Pilates studio, a coaching app, a nonprofit "
        "and others). InnerVerse the podcast is the one hosted by Chance Garton.",
        "",
        "Shows under the InnerVerse name: InnerVerse (guest interviews), Vibe Rant (co-hosted with Gabe, Slick "
        "Dissident), Inner Whirled (co-hosted with researcher Dylan Saccoccio) and Astro-Herbalism.",
        "",
        "## Main pages",
        "",
        "- [Home](" + o + "/): what InnerVerse is, the latest episode and how to listen",
        "- [Episodes](" + o + "/episodes): the full free archive, searchable by topic, show and guest",
        "- [About](" + o + "/about): Chance Garton and the history of the show",
        "- [InnerVerse Plus+](" + o + "/plus): the members' archive with full-length and bonus episodes",
        "- [Biofield Tuning](" + o + "/biofield-tuning): remote sound healing sessions with Chance Garton over Zoom",
        "- [Contact](" + o + "/contact)",
        "",
        "## Recent episodes",
        "",
    ]
    for post, _ in newest[:25]:
        lines.append("- [" + __import__("html").unescape(post.get("title") or post["slug"]).strip() + "](" + o + "/episodes/" + post["slug"] + ")")
    lines += [
        "",
        "## Optional",
        "",
        "- [Sitemap](" + o + "/sitemap.xml): every episode page",
        "- [YouTube](https://www.youtube.com/@InnerVersePodcast)",
        "- [Apple Podcasts](https://podcasts.apple.com/us/podcast/innerverse/id1066918535)",
        "- [Spotify](https://open.spotify.com/show/3PtsUrYFJiradha3biNf9Y)",
        "- [Substack](https://innerversepodcast.substack.com)",
        "- [Patreon](https://www.patreon.com/innerverse)",
        "",
    ]
    return "\n".join(lines)

def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def assets_hash():
    h = hashlib.sha1()
    for p in sorted(glob.glob(os.path.join(ROOT, "src", "css", "*.css")) + glob.glob(os.path.join(ROOT, "src", "js", "*.js"))
                    + [os.path.join(ROOT, "data", "images", "map.json")]):
        if os.path.exists(p):
            h.update(open(p, "rb").read())
    return h.hexdigest()[:10]


os.environ.setdefault("IV_ASSET_VERSION", assets_hash())
import common  # noqa: E402  (reads the environment at import)
import episode  # noqa: E402
import pages as hand  # noqa: E402
import plus_episode  # noqa: E402
import redirects  # noqa: E402


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
    # The image lookup window.ivImg reads (image move, stage 3): one small
    # cached file instead of the whole map in every page.
    write("assets/img-map.js", "window.IV_IMG_T=" + json.dumps(common.image_table()) + ";\n")


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
    # Episodes published after the snapshot (2026-11-04): every index row whose
    # url is a free /episodes/ page also gets a page, so new episodes appear
    # without a Squarespace post. The snapshot only adds old SEO text and dates.
    known = {p["slug"] for p in posts}
    for e in index.values():
        u = (e.get("url") or "").rstrip("/")
        if "/episodes/" not in u:
            continue
        slug = u.rsplit("/", 1)[-1]
        file = episode_file(slug) or episode_file(e["slug"])
        if slug in known or not file:
            continue
        known.add(slug)
        when = 0
        try:
            when = int(datetime.datetime.strptime(e.get("date") or "", "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
        except ValueError:
            pass
        pages.append(({"slug": slug, "title": e.get("title") or "", "tags": e.get("tags") or [], "publishOn": when,
                       "date": e.get("date") or ""}, file))
    live = {p["slug"] for p, _ in pages} | {(f or {}).get("fields", {}).get("Slug") for _, f in pages}
    related = episode.Related(corpus, live)

    sitemap = []
    for post, file in pages:
        slug = post["slug"]
        data_slug = file["fields"].get("Slug") or slug
        tags = (index.get(data_slug) or {}).get("tags") or post.get("tags") or []
        html = episode.render(slug, file, post, related.rank(data_slug), tags)
        write("episodes/" + slug + ".html", html)
        # Real dates only: "generated" is the hourly data build time, so it said every page changed today.
        lastmod = (file["fields"].get("Publish Date") or post.get("date") or "")[:10]
        sitemap.append((common.LIVE_ORIGIN + "/episodes/" + slug, lastmod))

    # The homepage and the archive (stage 2). The archive lists newest first.
    write("index.html", hand.home())
    newest = sorted(pages, key=lambda pf: pf[0].get("publishOn") or 0, reverse=True)
    arch = hand.episodes(newest)
    write("episodes.html", arch)
    write("episodes/index.html", arch)
    plus_eps = sorted(load(os.path.join(DATA, "plus-index.json"))["episodes"], key=lambda e: e.get("date") or "", reverse=True)

    # The members' pages (stage 1b): one per /plus entry in plus-index.json
    # with an episode file. Entries whose url is a free page are the free-only
    # rows with no members' cut, and have no /plus page to build.
    plus_posts = {p["slug"]: p for p in snap.get("plus", [])}
    plus_pages, plus_no_data = 0, []
    for e in plus_eps:
        if "/plus/" not in (e.get("url") or ""):
            continue
        file = episode_file(e["slug"])
        if not file:
            plus_no_data.append(e["slug"])
            continue
        write("plus/" + e["slug"] + ".html", plus_episode.render(e["slug"], file, plus_posts.get(e["slug"]), e))
        plus_pages += 1
        lastmod = (e.get("date") or file["fields"].get("Publish Date") or "")[:10]
        sitemap.append((common.LIVE_ORIGIN + "/plus/" + e["slug"], lastmod))
    plus_page = hand.plus(plus_eps)
    write("plus.html", plus_page)
    write("plus/index.html", plus_page)
    today = __import__("datetime").date.today().isoformat()
    # Hand-made pages (stage 3). Built here and held for the switch.
    write("about.html", hand.about())
    write("about/index.html", hand.about())
    ct = hand.contact()
    write("contact.html", ct)
    write("contact/index.html", ct)
    sp = hand.support()
    write("support.html", sp)
    write("support/index.html", sp)
    bt = hand.biofield_tuning()
    write("biofield-tuning.html", bt)
    write("biofield-tuning/index.html", bt)
    # The home page and the two archives change when a new episode lands, so they carry the newest
    # episode date. The hand-made pages carry no date rather than a false one.
    newest_date = max([d for d in [s[1] for s in sitemap] if d] or [today])
    sitemap[:0] = [(common.LIVE_ORIGIN + "/", newest_date), (common.LIVE_ORIGIN + "/episodes", newest_date),
                   (common.LIVE_ORIGIN + "/plus", newest_date),
                   (common.LIVE_ORIGIN + "/about", ""), (common.LIVE_ORIGIN + "/biofield-tuning", ""),
                   (common.LIVE_ORIGIN + "/contact", ""), (common.LIVE_ORIGIN + "/support", "")]
    write("llms.txt", llms_txt(newest))

    write("robots.txt", ("User-agent: *\nDisallow: /\n" if common.NOINDEX else
                         "User-agent: *\nAllow: /\n\nSitemap: " + common.LIVE_ORIGIN + "/sitemap.xml\n"))
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod in sitemap:
        xml.append("<url><loc>" + common.esc(loc) + "</loc>" + ("<lastmod>" + mod + "</lastmod>" if mod else "") + "</url>")
    xml.append("</urlset>")
    write("sitemap.xml", "\n".join(xml) + "\n")
    write(".nojekyll", "")
    # Cloudflare Pages: keep the pages.dev addresses (production and previews) out of search,
    # so only www.innerversepodcast.com is indexed once the build is in real-domain mode.
    write("_headers", "https://:project.pages.dev/*\n  X-Robots-Tag: noindex\n\n"
                      "https://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex\n\n"
                      # Browsers keep to https, other sites cannot frame these pages (the app may), and no page
                      # asks for camera, microphone or location. Files under /assets carry a version in their
                      # address, so a browser may keep them for a year.
                      "/*\n  Strict-Transport-Security: max-age=31536000\n"
                      "  Content-Security-Policy: frame-ancestors 'self' https://circle.innerversepodcast.com\n"
                      "  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n"
                      "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n")
    # A real not-found page: Cloudflare Pages serves it with a 404 status for any address
    # that has no page and no redirect.
    write("404.html", hand.not_found())

    # Redirects for the switch (stage 4): written to _redirects (Cloudflare Pages format; GitHub Pages ignores it).
    ep_slugs = {p["slug"] for p, _ in pages}
    plus_slugs = {e["slug"] for e in plus_eps if "/plus/" in (e.get("url") or "") and episode_file(e["slug"])}
    redirect_lines, redirect_report = redirects.build(ep_slugs, plus_slugs, list(index.values()))
    write("_redirects", "\n".join(redirect_lines) + "\n")
    write("redirects-report.json", json.dumps(redirect_report, indent=1))

    report = {"episodePages": len(pages), "plusPages": plus_pages, "postsWithNoData": [p["slug"] for p, _ in no_data], "plusWithNoData": plus_no_data}
    write("build-report.json", json.dumps(report, indent=1))
    print(json.dumps(report))


if __name__ == "__main__":
    main()
