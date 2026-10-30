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

from common import LIVE_ORIGIN, esc, footer, head, iv_img, json_ld, nav, page, url

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
    return page(h, body, "iv-home-page", scripts=("/assets/site.js", "/assets/archive.js", "/assets/home.js", "/assets/promo.js"))


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


def local_path(e):
    """An index entry's own page on this site: /plus/<slug>, or the free page
    for the free-only rows that have no members' cut."""
    u = e.get("url") or ""
    i = u.find("innerversepodcast.com/")
    return u[i + len("innerversepodcast.com"):] if i > -1 else "/plus/" + e["slug"]


def plus(plus_index):
    """The members' archive. plus_index: innerverse-data's plus-index.json
    episodes, newest first. Only what a visitor sees today goes in the HTML
    (titles, artwork, chapter-free cards); nothing members-only."""
    title = "InnerVerse Plus+ | InnerVerse Podcast"
    desc = ("InnerVerse Plus is the premium membership archive for InnerVerse Podcast. Full episodes, extended "
            "conversations, Inner Whirled exclusives, and deep dives into consciousness, mythology, holistic "
            "health, and hidden history with Chance Garton.")
    items = "".join(
        '<li><a href="' + esc(url(local_path(e))) + '">' + esc((e.get("title") or "").replace("—", ", ").replace("–", ", ")) + "</a></li>"
        for e in plus_index if e.get("slug")
    )
    every = ('<div class="collection-content-wrapper iv-every">'
             '<details class="iv-every-box"><summary>Browse every Plus+ episode by title</summary>'
             '<ol class="iv-every-list">' + items + "</ol></details></div>")
    cls = "iv-plus-page iv-archive-2026 iv-plus-archive"
    h = head(title, desc, LIVE_ORIGIN + "/plus", PLUS_IMAGE, "website", cls)
    body = nav("plus") + '<main id="iv-main">' + mount('<div class="iv-plus-hero-slot"></div>' + every) + "</main>" + footer()
    return page(h, body, cls, scripts=("/assets/site.js", "/assets/archive.js", "/assets/plus.js"))


# ---------------------------------------------------------------- About ----
# The About InnerVerse page (brand-search entity page). Built for the new site
# and held for the switch; never put on Squarespace (Chance, 2026-10-30).
# Design: the About-InnerVerse board on the canvas, in the site's own nav and
# footer. Copy rules: claude/SPEC-brand-search-dominance.md, "About InnerVerse
# Page" (no medical claims, no superlatives, no counts without a method).
# Facts checked 2026-10-30: start year 2015 (Chance), show list and playlists
# from the live site's header, every channel link answered.

ABOUT_PHOTO = "https://images.squarespace-cdn.com/content/v1/5987d897cf81e0278ec5322e/7a926674-e13c-4827-ac2a-8d4cf8964ab0/CHANCE+GARTON+ABOUT+PAGE+INNERVERSE.png"
ABOUT_OG = "https://static1.squarespace.com/static/5987d897cf81e0278ec5322e/t/69f7320df691fe20c1392d7c/1777807885424/ChatGPT+Image+Apr+30%2C+2026%2C+09_03_08+AM.png"
RSS = "https://feeds.acast.com/public/shows/5a7e6d34b56c94b1216394e3"

ABOUT_SHOWS = [
    ("InnerVerse", "#3B74CC", "InnerVerse",
     "The flagship. Long-form conversations with researchers, healers, philosophers and independent thinkers."),
    ("Inner Whirled", "#7B5BC4", "Inner Whirled",
     "Research-dense history, myth and symbolism, co-hosted with Dylan Saccoccio."),
    ("Vibe Rant", "#C0553F", "Vibe Rant",
     "Live and unscripted with Gabe, the Slick Dissident, reading current events through a wider lens."),
    ("Astro-Herbalism", "#4E9A62", "Astro-Herbalism",
     "One sign at a time, the plants it rules and the folklore around them, with a panel of herbalists."),
    ("Marvelous DeMystifiers", "#C9963A", "Marvelous Demystifiers",
     "Chance and Gabe decode the symbolism and esoteric references hidden in Marvel films."),
    ("Chance as a guest", "#3AA0B5", "Chance Guest Spots",
     "Chance's conversations on other people's shows, gathered in one place."),
]

ABOUT_LISTEN = [
    ("Website archive", "/episodes", False),
    ("Apple Podcasts", "https://podcasts.apple.com/us/podcast/innerverse/id1066918535", True),
    ("Spotify", "https://open.spotify.com/show/3PtsUrYFJiradha3biNf9Y", True),
    ("Acast", "https://shows.acast.com/innerverse", True),
    ("YouTube", "https://www.youtube.com/@InnerVersePodcast", True),
    ("Rumble", "https://rumble.com/c/InnerVerse", True),
    ("Public RSS feed", RSS, True),
]

ABOUT_PROFILES = [
    ("Instagram", "https://www.instagram.com/innerversepodcast/"),
    ("TikTok", "https://www.tiktok.com/@innerversepodcast"),
    ("Telegram", "https://t.me/innerversepodcast"),
    ("Substack", "https://innerversepodcast.substack.com"),
    ("Patreon", "https://www.patreon.com/innerverse"),
]


def _chip(label, href, ext):
    return ('<a class="iv-about-chip" href="' + esc(url(href) if not ext else href) + '"'
            + (' target="_blank" rel="noopener"' if ext else "") + ">" + label + "</a>")


def _section(kicker, title, body, sid):
    return ('<section class="iv-about-row" id="' + sid + '" aria-labelledby="' + sid + '-h">'
            '<div class="iv-about-head"><div class="iv-about-kicker">' + kicker + "</div>"
            '<h2 id="' + sid + '-h">' + title + "</h2></div>"
            '<div class="iv-about-body">' + body + "</div></section>")


def about():
    title = "About InnerVerse | The Podcast by Chance Garton"
    desc = ("InnerVerse is the independent podcast created and hosted by Chance Garton since 2015, exploring "
            "consciousness, holistic health, mythology, symbolism and esoteric philosophy.")
    canonical = LIVE_ORIGIN + "/about"

    shows = "".join(
        '<li class="iv-about-show"><span class="iv-about-dot" style="background:' + col + '"></span><div>'
        '<a class="iv-about-show-name" href="' + esc(url("/episodes?show=" + key.replace(" ", "+"))) + '">' + name + "</a>"
        '<p>' + blurb + "</p></div></li>"
        for name, col, key, blurb in ABOUT_SHOWS
    )
    listen = "".join(_chip(l, h, e) for l, h, e in ABOUT_LISTEN)
    profiles = "".join(_chip(l, h, True) for l, h in ABOUT_PROFILES)

    hero = (
        '<header class="iv-about-hero">'
        '<div class="iv-about-hero-text">'
        '<div class="iv-about-kicker">About</div>'
        "<h1>About InnerVerse</h1>"
        '<p class="iv-about-lede">InnerVerse is an independent podcast created and hosted by Chance Garton. '
        "It publishes long-form conversations, research-driven investigations, round tables and solo presentations "
        "about consciousness, holistic health, mythology, symbolism, esoteric philosophy, alternative history, "
        "language and the nature of reality.</p>"
        "<p>Since 2015 the show has grown from a single podcast into a family of shows and a deep archive, with "
        "free episodes for everyone and full, extended editions for InnerVerse Plus+ members. The earliest "
        "recordings are no longer in the public feed, so the archive on this site begins with the episodes that are.</p>"
        "</div>"
        '<img class="iv-about-photo" src="' + esc(iv_img(ABOUT_PHOTO, 1000)) + '" alt="Chance Garton, host of InnerVerse" '
        'width="840" height="630" fetchpriority="high">'
        "</header>"
    )

    rows = "".join([
        _section("What it is", "One project, several shows",
                 "<p>InnerVerse is the umbrella. The flagship podcast carries the guest conversations, and each of the "
                 "other shows takes one format and goes deep on it. Every episode lives on this site with its chapters, "
                 "themes, quotes and guest notes, and the Plus+ editions pick up where the free versions end.</p>"
                 '<ul class="iv-about-shows">' + shows + "</ul>", "shows"),
        _section("History", "Since 2015",
                 "<p>InnerVerse started as a personal question: how do people build a life around work that actually "
                 "means something to them? That question led Chance into a decade of conversations with researchers, "
                 "healers, philosophers and independent thinkers working at the edges of what we understand about "
                 "health, consciousness, language and human potential.</p>"
                 "<p>Along the way he trained in Biofield Tuning and built a practice that runs alongside the podcast to "
                 "this day, while the show itself branched into co-hosted series, live streams and a members' edition "
                 "of every episode.</p>", "history"),
        _section("Subjects", "What the conversations circle",
                 "<p>Consciousness and the nature of reality. Holistic and terrain-based approaches to health. "
                 "Comparative mythology, astrotheology and the symbolism woven through scripture, tarot and the zodiac. "
                 "The hidden patterns in language and etymology. Historical investigations that read the record closely, "
                 "including the show's ongoing look at Tartaria claims. Esoteric philosophy and gnosticism treated as "
                 "living traditions rather than curiosities.</p>"
                 '<p><a class="iv-about-link" href="' + esc(url("/episodes")) + '">Search every episode by topic</a></p>', "subjects"),
        _section("The host", "Chance Garton",
                 "<p>Chance Garton is the creator, host, editor and producer of InnerVerse, and the one constant across "
                 "every show in the family. He is an independent researcher and philologist focused on the symbolic and "
                 "esoteric dimensions of language, and a Biofield Tuning practitioner who offers remote sessions and "
                 "Oracle Card Readings over Zoom.</p>"
                 '<div class="iv-about-buttons">'
                 '<a class="iv-about-btn iv-about-btn-lapis" href="' + esc(url("/biofield-tuning")) + '">Sessions with Chance</a>'
                 '<a class="iv-about-btn iv-about-btn-ghost" href="' + esc(url("/episodes?show=Chance+Guest+Spots")) + '">Chance on other shows</a>'
                 "</div>", "host"),
        _section("Listen and watch", "Every official channel",
                 "<p>Free episodes go out on this site and to every major podcast app from one public feed. "
                 "Video lives on YouTube and Rumble.</p>"
                 '<div class="iv-about-chips">' + listen + "</div>", "listen"),
        _section("Support", "InnerVerse Plus+",
                 "<p>Plus+ is the membership: the full, extended edition of every episode, the complete members' "
                 "archive, a private podcast feed and the Inner Circle community. It is how the show stays independent.</p>"
                 '<div class="iv-about-buttons"><a class="iv-about-btn iv-about-btn-gold" href="' + esc(url("/plus")) + '">About Plus+</a></div>', "support"),
        _section("Official profiles", "Where else to find InnerVerse",
                 '<div class="iv-about-chips">' + profiles + "</div>"
                 '<p>Questions, corrections and booking enquiries go through the <a class="iv-about-link" href="'
                 + esc(url("/contact")) + '">contact page</a>.</p>', "profiles"),
    ])

    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "AboutPage", "@id": canonical + "#page", "url": canonical, "name": title, "description": desc,
             "isPartOf": {"@id": LIVE_ORIGIN + "/#website"}, "about": {"@id": LIVE_ORIGIN + "/#podcast"},
             "primaryImageOfPage": ABOUT_PHOTO},
            {"@type": "PodcastSeries", "@id": LIVE_ORIGIN + "/#podcast", "name": "InnerVerse",
             "alternateName": ["InnerVerse Podcast", "Inner Verse"], "url": LIVE_ORIGIN + "/",
             "webFeed": RSS, "startDate": "2015", "author": {"@id": LIVE_ORIGIN + "/#chance"},
             "sameAs": [h for _, h, e in ABOUT_LISTEN if e and h != RSS] + [h for _, h in ABOUT_PROFILES]},
            {"@type": "Person", "@id": LIVE_ORIGIN + "/#chance", "name": "Chance Garton",
             "jobTitle": "Podcast host and Biofield Tuning practitioner", "url": canonical, "image": ABOUT_PHOTO},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": LIVE_ORIGIN + "/"},
                {"@type": "ListItem", "position": 2, "name": "About", "item": canonical}]},
        ],
    }
    cls = "iv-about-page"
    h = head(title, desc, canonical, ABOUT_OG, "website", cls, extra='<script type="application/ld+json">' + json_ld(ld) + "</script>")
    body = (nav("about") + '<main id="iv-main"><article class="iv-about">' + hero
            + '<div class="iv-about-rows">' + rows + "</div></article></main>" + footer())
    return page(h, body, cls, scripts=("/assets/site.js",))
