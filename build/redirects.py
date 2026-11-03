"""Build the redirects file for the switch (dist/_redirects, Cloudflare Pages format).

Sources, all in this repo's data/ folder:
  live-urls-2026-10-30.json     every address the live Squarespace site serves
  squarespace-url-mappings.txt  Squarespace's own URL Mappings field
  redirects-decided.txt         redirects Chance has decided (his word wins)

Rules:
  - an old address that has a page on the new site needs no line
  - /season-N/<slug> goes to /episodes/<slug>; if that page does not exist it goes to /episodes
  - /episodes/category/<x> goes to the archive filter that matches <x> (show, guest, theme, tag),
    else to a search for <x>
  - /episodes/tag/<x> goes to the tag filter when the index has that tag, else to a search for <x>
  - a catch-all per family comes last so a missed address lands on the archive, not a 404
Nothing here makes a chain: every target is a real page on the new site.
"""

import json
import os
import re
from urllib.parse import quote_plus, unquote_plus

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")

# Real pages on the new site, besides episode and plus pages.
STATIC_PAGES = {"/", "/episodes", "/plus", "/about", "/biofield-tuning", "/contact"}


def _read_lines(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as fh:
        return [ln.rstrip("\n") for ln in fh]


def _norm(path):
    return path.rstrip("/") or "/"


def build(episode_slugs, plus_slugs, index_episodes):
    """Return (lines, report). episode_slugs and plus_slugs are sets of slugs that have pages."""
    live = json.load(open(os.path.join(DATA_DIR, "live-urls-2026-10-30.json"), encoding="utf-8"))

    def page_exists(path):
        path = _norm(path)
        if path in STATIC_PAGES:
            return True
        if path.startswith("/episodes/"):
            return path[len("/episodes/"):] in episode_slugs
        if path.startswith("/plus/"):
            return path[len("/plus/"):] in plus_slugs
        return False

    rules = {}      # old path -> (new, status, why)
    notes = []      # things the report should say in words

    def add(old, new, why, status=301):
        old = _norm(old)
        if old in rules or page_exists(old):
            return
        rules[old] = (new, status, why)

    # 1. Chance's own calls come first and win.
    for ln in _read_lines("redirects-decided.txt"):
        if not ln.strip() or ln.startswith("#"):
            continue
        parts = ln.split()
        add(parts[0], parts[1], "decided")

    # 2. Squarespace's URL Mappings.
    for ln in _read_lines("squarespace-url-mappings.txt"):
        m = re.match(r"^(\S+) -> (\S+) (30[12])$", ln.strip())
        if not m:
            continue
        old, new = m.group(1), m.group(2)
        if "[" in old:                      # the leftover store rule, no store exists
            continue
        if old == "/index":                 # Squarespace's own 302, made permanent
            new = "/episodes"
        if new.startswith("/episodes/") and not page_exists(new):
            notes.append("mapping target has no page, sent to /episodes: " + old + " -> " + new)
            new = "/episodes"
        add(old, new, "mapping")

    # 3. Pages and system addresses from the crawl.
    add("/homepage", "/", "crawl")
    add("/search", "/episodes", "system")
    add("/cart", "/", "system")
    add("/index", "/episodes", "system")

    # 4. Live episode and plus posts with no page (the known duplicates).
    for p in live["episode_posts"]:
        if not page_exists(p):
            add(p, "/episodes?show=Inner+Whirled" if "inner-whirled" in p else "/episodes", "duplicate post")
            notes.append("live post with no page: " + p)
    for p in live["plus_posts"]:
        if not page_exists(p):
            add(p, "/plus", "plus post without page")
            notes.append("live plus post with no page: " + p)

    # 5. Category and tag pages, matched to the archive filters.
    facets = {"shows": {}, "guests": {}, "topics": {}, "tags": {}}
    for e in index_episodes:
        for key in facets:
            for v in e.get(key) or []:
                facets[key].setdefault(v.lower(), v)
    cat_key = (("shows", "show"), ("guests", "guest"), ("topics", "theme"), ("tags", "tag"))

    def filter_url(name):
        low = name.lower()
        for key, param in cat_key:
            if low in facets[key]:
                return "/episodes?%s=%s" % (param, quote_plus(facets[key][low])), param
        return "/episodes?q=" + quote_plus(name), "q"

    kinds = {"show": 0, "guest": 0, "theme": 0, "tag": 0, "q": 0}
    for p in live["episode_categories"]:
        name = unquote_plus(p[len("/episodes/category/"):])
        new, kind = filter_url(name)
        kinds[kind] += 1
        add(p, new, "category")
    for p in live["episode_tags"]:
        name = unquote_plus(p[len("/episodes/tag/"):])
        low = name.lower()
        if low in facets["tags"]:
            new, kind = "/episodes?tag=" + quote_plus(facets["tags"][low]), "tag"
        else:
            new, kind = "/episodes?q=" + quote_plus(name), "q"
        kinds[kind] += 1
        add(p, new, "tag")

    lines = ["# Redirects for the switch. Built by build/redirects.py; do not edit by hand.",
             "# Specific addresses first, then one catch-all per old family."]
    # Cloudflare matches the decoded path, except for / ? # and %, so a rule
    # written %27 or %2B or %26 never matches; write those characters plainly.
    def _cf_source(old):
        def one(m):
            c = chr(int(m.group(1), 16))
            return c if (33 <= ord(c) < 127 and c not in "/?#%") else m.group(0)
        return re.sub(r"%([0-9A-Fa-f]{2})", one, old)

    written = set()
    for old in sorted(rules):
        new, status, _ = rules[old]
        src = _cf_source(old)
        if src in written:
            continue
        written.add(src)
        lines.append("%s %s %d" % (src, new, status))

    # 6. Catch-alls for anything the crawl missed (tag, category and season pages, plus categories).
    lines += ["/episodes/tag/* /episodes 301",
              "/episodes/category/* /episodes 301",
              "/plus/category/* /plus 301",
              "/season-* /episodes 301"]

    # 7. Check: no chain, no loop, every target is a real page.
    problems = []
    for old, (new, status, why) in rules.items():
        target = _norm(new.split("?")[0])
        if not page_exists(target):
            problems.append("target is not a page: %s -> %s" % (old, new))
        if target in rules:
            problems.append("chain: %s -> %s" % (old, new))

    # 8. Check: every address the crawl found answers or redirects.
    covered = 0
    unanswered = []
    every = (live["pages"] + live["episode_posts"] + live["plus_posts"] + live["episode_categories"]
             + live["episode_tags"] + [s for s in live["system"] if "?" not in s])
    for u in every:
        if page_exists(u) or _norm(u) in rules:
            covered += 1
        else:
            unanswered.append(u)

    report = {
        "rules": len(rules),
        "catchAlls": 4,
        "byWhy": {w: sum(1 for r in rules.values() if r[2] == w) for w in sorted({r[2] for r in rules.values()})},
        "filterTargets": kinds,
        "crawlAddresses": len(every),
        "covered": covered,
        "unanswered": unanswered,
        "problems": problems,
        "notes": notes,
    }
    return lines, report
