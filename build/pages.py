"""The homepage and the /episodes archive.

Each is the page shell plus the live scripts carried over from Code Injection
(src/js/home.js, src/js/archive.js). The build then runs tools/prerender.js,
which opens each page in a headless browser, lets the scripts draw it, and
writes what they drew into the HTML, so search engines and link previews get
the full page without running anything. In a visitor's browser the original
shell is put back before the scripts run, so search, filters and member state
work exactly as on Squarespace.
"""

import os

from common import LIVE_ORIGIN, esc, footer, head, nav, page, url

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

DEFAULT_IMAGE = "https://static1.squarespace.com/static/5987d897cf81e0278ec5322e/t/6070e0ff1834a220b71fa697/1618010367716/rokfin-cover-art.jpg"


def mount(shell):
    """The block the prerender fills. data-iv-prerender marks it for the
    prerender step, which adds the restore script after it."""
    return '<div id="iv-mount" data-iv-prerender>' + shell + "</div>"


def home():
    shell = open(os.path.join(ROOT, "src", "templates", "home-root.html"), encoding="utf-8").read()
    title = "InnerVerse Podcast with Chance Garton | Official Site"
    desc = ("InnerVerse is a podcast exploring consciousness, alternative health, esoteric philosophy, and the "
            "nature of reality. Host Chance Garton brings a decade of research and conversation for independent "
            "thinkers ready to go deeper.")
    h = head(title, desc, LIVE_ORIGIN + "/", DEFAULT_IMAGE, "website", "iv-home-page")
    body = nav("home") + '<main id="iv-main">' + mount(shell) + "</main>" + footer()
    return page(h, body, "iv-home-page", scripts=("/assets/site.js", "/assets/archive.js", "/assets/home.js"))


def episodes(pages):
    """pages: [(post, file)] as build.py has them, newest first. The list of
    every episode under the search tool is plain links, so every episode page
    is one click from the archive for a crawler, as Squarespace's paged list
    was."""
    title = "All Episodes | InnerVerse Podcast"
    desc = ("Search every InnerVerse episode with Chance Garton: consciousness, holistic health, mythology, "
            "symbolism, esoteric philosophy and hidden history. Filter by topic, show, guest or year.")
    items = "".join(
        '<li><a href="' + esc(url("/episodes/" + p["slug"])) + '">' + esc((f["fields"].get("Title") or p.get("title") or "").replace("—", ", ").replace("–", ", ")) + "</a></li>"
        for p, f in pages
    )
    every = ('<div class="collection-content-wrapper iv-every">'
             '<details class="iv-every-box"><summary>Browse every episode by title</summary>'
             '<ol class="iv-every-list">' + items + "</ol></details></div>")
    cls = "iv-search-page iv-archive-2026"
    h = head(title, desc, LIVE_ORIGIN + "/episodes", DEFAULT_IMAGE, "website", cls)
    body = nav("podcast") + '<main id="iv-main">' + mount(every) + "</main>" + footer()
    return page(h, body, cls, scripts=("/assets/site.js", "/assets/archive.js"))


PLUS_IMAGE = "https://static1.squarespace.com/static/5987d897cf81e0278ec5322e/t/69fbc0e54bf4684fff7e35ec/1778106597548/ChatGPT+Image+May+6%2C+2026%2C+03_30_14+PM.png"


def plus(plus_index):
    """The members' archive. plus_index: innerverse-data's plus-index.json
    episodes, newest first. Only what a visitor sees today goes in the HTML
    (titles, artwork, chapter-free cards); nothing members-only."""
    title = "InnerVerse Plus+ | InnerVerse Podcast"
    desc = ("InnerVerse Plus is the premium membership archive for InnerVerse Podcast. Full episodes, extended "
            "conversations, Inner Whirled exclusives, and deep dives into consciousness, mythology, holistic "
            "health, and hidden history with Chance Garton.")
    items = "".join(
        '<li><a href="' + esc(url("/plus/" + e["slug"])) + '">' + esc((e.get("title") or "").replace("—", ", ").replace("–", ", ")) + "</a></li>"
        for e in plus_index if e.get("slug")
    )
    every = ('<div class="collection-content-wrapper iv-every">'
             '<details class="iv-every-box"><summary>Browse every Plus+ episode by title</summary>'
             '<ol class="iv-every-list">' + items + "</ol></details></div>")
    cls = "iv-plus-page iv-archive-2026 iv-plus-archive"
    h = head(title, desc, LIVE_ORIGIN + "/plus", PLUS_IMAGE, "website", cls)
    body = nav("plus") + '<main id="iv-main">' + mount('<div class="iv-plus-hero-slot"></div>' + every) + "</main>" + footer()
    return page(h, body, cls, scripts=("/assets/site.js", "/assets/archive.js", "/assets/plus.js"))
