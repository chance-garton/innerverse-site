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
import re

from common import LIVE_ORIGIN, esc, footer, head, img_file, img_key, iv_img, json_ld, nav, page, url

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
    desc = "InnerVerse is an independent podcast hosted by Chance Garton since 2015, exploring astrology, mythology, lost history, natural health, and symbolism."
    h = head(title, desc, LIVE_ORIGIN + "/", DEFAULT_IMAGE, "website", "iv-home-page")
    body = nav("home") + '<main id="iv-main">' + mount(shell) + "</main>" + footer()
    return page(h, body, "iv-home-page", scripts=("/assets/site.js", "/assets/archive.js", "/assets/home.js", "/assets/promo.js"))


def episodes(pages):
    """pages: [(post, file)] as build.py has them, newest first. The list of
    every episode under the search tool is plain links, so every episode page
    is one click from the archive for a crawler, as Squarespace's paged list
    was."""
    title = "All Episodes | InnerVerse Podcast"
    desc = ("Search every InnerVerse episode with Chance Garton: astrology, mythology, lost history, natural health, and symbolism. "
            "Filter by topic, show, guest or year.")
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
        for e in plus_index if e.get("slug") and local_path(e).startswith("/plus/")
    )  # only episodes with a members' cut; free-only rows are already in the /episodes list (Chance, 2026-11-06)
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
    desc = "InnerVerse is an independent podcast hosted by Chance Garton since 2015, exploring astrology, mythology, lost history, natural health, and symbolism."
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
        '<p class="iv-about-lede">InnerVerse is an independent podcast hosted by Chance Garton. '
        "It publishes long-form conversations, research-driven investigations, round tables and solo presentations "
        "about astrology, mythology, lost history, natural health, and symbolism.</p>"
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
             "sameAs": [h for _, h, e in ABOUT_LISTEN if e and h != RSS] + [h for _, h in ABOUT_PROFILES] + ["https://www.wikidata.org/wiki/Q142069834"]},
            {"@type": "Person", "@id": LIVE_ORIGIN + "/#chance", "name": "Chance Garton",
             "jobTitle": "Podcast host and Biofield Tuning practitioner", "url": canonical, "image": ABOUT_PHOTO,
             "sameAs": ["https://www.wikidata.org/wiki/Q142069835"]},
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


# Biofield Tuning (stage 3, 2026-10-30). The page body is the live code block,
# kept verbatim in src/templates/biofield-tuning.html (its own styles and the
# Biofield Anatomy script travel with it). This wraps it in the site's head,
# nav and footer. The /s/ chart PNGs were Squarespace file storage; they now
# point at their R2 copies (the original files), and at the live site only if
# one is ever missing from the image map.
BT_OG = ("https://static1.squarespace.com/static/5987d897cf81e0278ec5322e/t/6ac2b6826681143eec927d37/1791145602054/"
         "chance%2Bgarton%2Bbiofield%2Btuning%2Bsessions%2Binnerverse%2Bpodcast.png")
BT_OFFERS = [
    ("Full Session", 200, LIVE_ORIGIN + "/booking?type=tuning-45"),
    ("Quick Tune Up", 100, LIVE_ORIGIN + "/booking?type=tuning-20"),
    ("Counseling and Readings", 75, LIVE_ORIGIN + "/booking?type=counseling-30"),
    ("Three Full Sessions", 500, LIVE_ORIGIN + "/booking?type=bundle-3"),
]


def _chart_file(m):
    k = img_key(m.group(1))
    return '"' + (img_file(k, original=True) if k else LIVE_ORIGIN + m.group(1)) + '"'


def biofield_tuning():
    title = "Biofield Tuning Sessions with Chance Garton | InnerVerse Podcast"
    desc = ("Book a remote Biofield Tuning session or a Counseling and Readings session with Chance Garton over Zoom, "
            "working with sound and the human energy field to support healing, clarity, and alignment.")
    canonical = LIVE_ORIGIN + "/biofield-tuning"
    body_html = open(os.path.join(ROOT, "src", "templates", "biofield-tuning.html"), encoding="utf-8").read()
    body_html = re.sub(r'"(/s/[^"]+)"', _chart_file, body_html)
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebPage", "@id": canonical + "#page", "url": canonical, "name": title, "description": desc,
             "isPartOf": {"@id": LIVE_ORIGIN + "/#website"}, "about": {"@id": canonical + "#service"}},
            {"@type": "Service", "@id": canonical + "#service", "name": "Remote Biofield Tuning with Chance Garton",
             "serviceType": "Biofield Tuning", "areaServed": "Worldwide", "url": canonical,
             "provider": {"@type": "Person", "@id": LIVE_ORIGIN + "/#chance", "name": "Chance Garton"},
             "offers": [{"@type": "Offer", "name": n, "price": str(p), "priceCurrency": "USD", "url": u}
                        for n, p, u in BT_OFFERS]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": LIVE_ORIGIN + "/"},
                {"@type": "ListItem", "position": 2, "name": "Biofield Tuning", "item": canonical}]},
        ],
    }
    cls = "iv-bt-page"
    h = head(title, desc, canonical, BT_OG, "website", cls, extra='<script type="application/ld+json">' + json_ld(ld) + "</script>")
    body = nav("tuning") + '<main id="iv-main" class="iv-bt-main">' + body_html + "</main>" + footer()
    return page(h, body, cls, scripts=("/assets/site.js",))


# Contact (stage 3, 2026-11-03). The live page is one Squarespace form (Name,
# Email, Subject, Message) under two lines of copy; the copy is carried word
# for word. The form posts as JSON to a small Worker (CONTACT_ENDPOINT) that
# emails Chance; src/js/contact.js does the sending and shows the thank-you.
CONTACT_ENDPOINT = "https://innerverse-contact.chance-5da.workers.dev/contact"
CONTACT_EMAIL = "chance@innerversepodcast.com"


def contact():
    title = "Contact | InnerVerse Podcast"
    desc = ("Send Chance Garton a message about the InnerVerse podcast: thoughts on the show, guest recommendations, "
            "shows to appear on, interview requests or anything else.")
    canonical = LIVE_ORIGIN + "/contact"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "ContactPage", "@id": canonical + "#page", "url": canonical, "name": title, "description": desc,
             "isPartOf": {"@id": LIVE_ORIGIN + "/#website"}, "about": {"@id": LIVE_ORIGIN + "/#podcast"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": LIVE_ORIGIN + "/"},
                {"@type": "ListItem", "position": 2, "name": "Contact", "item": canonical}]},
        ],
    }
    form = (
        '<form class="iv-contact-form" id="iv-contact-form" method="post" action="' + esc(CONTACT_ENDPOINT) + '" novalidate>'
        '<div class="iv-contact-field"><label for="iv-c-name">Name <span>(required)</span></label>'
        '<input id="iv-c-name" name="name" type="text" autocomplete="name" required maxlength="120"></div>'
        '<div class="iv-contact-field"><label for="iv-c-email">Email <span>(required)</span></label>'
        '<input id="iv-c-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>'
        '<div class="iv-contact-field"><label for="iv-c-subject">Subject</label>'
        '<input id="iv-c-subject" name="subject" type="text" maxlength="200"></div>'
        '<div class="iv-contact-field"><label for="iv-c-message">Message <span>(required)</span></label>'
        '<textarea id="iv-c-message" name="message" rows="7" required maxlength="5000"></textarea></div>'
        '<div class="iv-contact-trap" aria-hidden="true"><label>Leave this empty'
        '<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>'
        '<button class="iv-contact-submit" type="submit">Submit</button>'
        '<p class="iv-contact-status" id="iv-contact-status" role="status" aria-live="polite"></p>'
        '</form>'
    )
    body_html = (
        '<main id="iv-main"><article class="iv-contact">'
        '<header class="iv-contact-head"><div class="iv-contact-kicker">Contact</div>'
        "<h1>Get in touch</h1>"
        "<p class=\"iv-contact-lede\">Hey there! I’d love to hear your thoughts on the show, recommendations for guests, "
        "shows you’d like to me appear on, or any other messages you’ve got for me. I’m also available for "
        "interviews on other shows.</p>"
        "<p class=\"iv-contact-sub\">Fill out this contact form and I’ll read everything that comes in.</p></header>"
        + form +
        '<p class="iv-contact-alt">Prefer email? Write to <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + "</a>.</p>"
        "</article></main>"
    )
    cls = "iv-contact-page"
    h = head(title, desc, canonical, ABOUT_OG, "website", cls, extra='<script type="application/ld+json">' + json_ld(ld) + "</script>")
    return page(h, nav("contact") + body_html + footer(), cls, scripts=("/assets/site.js", "/assets/contact.js"))


def not_found():
    """The real 404 page (stage 4). Cloudflare Pages serves 404.html with a
    404 status for any address with no page and no redirect. Always noindex,
    on every build, so a dead address never gets listed."""
    title = "Page not found | InnerVerse Podcast"
    desc = "That address has no page on InnerVerse. Search the archive or head to a main page."
    h = head(title, desc, LIVE_ORIGIN + "/", "", "website", "iv-nf-page")
    h = h.replace('content="index, follow, max-image-preview:large"', 'content="noindex, nofollow"')
    body = (
        nav("") + '<main id="iv-main"><section class="iv-nf">'
        '<div class="iv-nf-kicker">Error 404</div>'
        "<h1>This page wandered off</h1>"
        "<p>Nothing lives at this address. It may have moved, or the link may have a typo. "
        "Search the archive, or head to one of the main rooms.</p>"
        '<form class="iv-nf-search" action="' + esc(url("/episodes")) + '" method="get" role="search">'
        '<input type="search" name="q" placeholder="Search episodes, guests, subjects" aria-label="Search episodes">'
        '<button type="submit">Search</button></form>'
        '<div class="iv-nf-links">'
        '<a href="' + esc(url("/")) + '">Home</a>'
        '<a href="' + esc(url("/episodes")) + '">All episodes</a>'
        '<a href="' + esc(url("/plus")) + '">Plus+</a>'
        '<a href="' + esc(url("/biofield-tuning")) + '">Biofield Tuning</a>'
        '<a href="' + esc(url("/contact")) + '">Contact</a></div>'
        "</section></main>" + footer()
    )
    return page(h, body, "iv-nf-page", scripts=("/assets/site.js",))


# -------------------------------------------------------------- Support ----
# Support InnerVerse (stage 3, 2026-11-04). The live /support page is where the
# alt domain innerverseplus.com lands. Chance asked for it redesigned in line
# with the new pages (not carried block for block): the live copy is kept, two
# em dashes reworded, the Oracle Card block dropped (Chance, 2026-11-04), and
# the Astro-Herbalism button points at the show's archive on this site.
# The Plus+ card is the signed-out view in the HTML; plus.js (mountSupportCta)
# redraws it for signed-in and lapsed members, as on Squarespace.
SQ = "https://images.squarespace-cdn.com/content/v1/5987d897cf81e0278ec5322e/"
SUPPORT_OG = ("https://static1.squarespace.com/static/5987d897cf81e0278ec5322e/t/69fba4fde74674760d4a6655/"
              "1778099453966/ChatGPT+Image+May+6%2C+2026%2C+03_30_14+PM.png")
SUP_PLUS_ICON = SQ + "0ea36d78-0ea0-4069-84c3-357546676fd8/Plus-Icon.png"
SUP_CHECKOUT = "https://innerverseplus.memberful.com/checkout?plan="
SUP_PLATFORMS = [
    ("Patreon", "$9", "https://www.patreon.com/cw/innerverse", "Become a patron",
     SQ + "4886f9a3-5af4-419b-ab75-ff31986fe08a/Patreon.png",
     "Patreon has the most complete archive of InnerVerse Plus+ Content, along with over 300 free episodes. As a "
     "Patreon member you get access to the extended video for each episode, and a custom RSS Feed URL Link to plug in "
     "to your favorite podcast player, allowing you to listen to InnerVerse Plus+ in the iTunes Podcast App or similar program.",
     "Patreon", ["Custom RSS Feed", "Video Episodes", "Complete Archive", "Episodes Collected By Topic"]),
    ("Substack", "$8", "https://innerversepodcast.substack.com", "Try free for 7 days",
     SQ + "5d82bbd2-a173-4a85-a835-33e268485695/substack.png",
     "Joining InnerVerse Plus+ here has the exclusive benefit of giving you access to more complete episode research "
     "notes for Inner Whirled Podcasts. Substack members get access to the extended video for each episode, and a custom "
     "RSS Feed URL Link to plug in to your favorite podcast player, allowing you to listen to InnerVerse Plus+ in the "
     "iTunes Podcast App or similar program.",
     "Substack", ["Custom RSS Feed", "Video Episodes", "Complete Research Notes", "Great Community"]),
    ("YouTube", "$10", "https://www.youtube.com/playlist?list=UUMOrqPdnXaoZ18JoXSXN5MjjA", "Join YouTube membership",
     SQ + "a3a82ad1-a924-4be7-971d-4e5f59f32c5b/youtuber.png",
     "For those who enjoy YouTube’s infrastructure and functionality, you can join InnerVerse Plus+ with a paid "
     "YouTube channel membership and get premium episodes there.",
     None, ["Video Episodes", "Watch Without Leaving YouTube"]),
]
SUP_BOOKS = [
    ("July’s End with Black Swans", SQ + "ed6a3da5-c8d8-46a0-87e0-ffee9a4f2562/July%27s+End.webp",
     "https://www.audible.com/pd/Julys-End-with-Black-Swans-Audiobook/B09RQ7G6CY?ref=acx_bty_BK_ACX0_296155_pd_us&source_code=AUDFPWS0223189MWU-BK-ACX0-296155"),
    ("A Godsacre for Winds of the Soul", SQ + "0dd20f77-340f-4d4a-94ab-d63d0c2aeaf2/A+godsacre.webp",
     "https://www.audible.com/pd/A-Godsacre-for-Winds-of-the-Soul-Audiobook/B0BSR7MFX5?ref=acx_bty_BK_ACX0_335197_pd_us&source_code=AUDFPWS0223189MWU-BK-ACX0-335197"),
    ("The Holy Sailors", SQ + "cc68c653-088d-43fa-bc4e-997896b19c32/the+holy+sailors.webp",
     "https://www.audible.com/pd/The-Holy-Sailors-Audiobook/B0C5FJXB9Y?ref=acx_bty_BK_ACX0_351752_pd_us&source_code=AUDFPWS0223189MWU-BK-ACX0-351752"),
    ("Terminalia", SQ + "78f88ed0-ca24-42ad-bfb8-e50468ed0f07/terminalia.webp",
     "https://www.audible.com/pd/B0CXG1VYX2/?source_code=AUDFPWS0223189MWU-BK-ACX0-389833&ref=acx_bty_BK_ACX0_389833_pd_us"),
]
DYLAN_SUBSTACK = "https://greattide.substack.com?r=1x95oc"


def _ext(href, label, cls):
    return '<a class="' + cls + '" href="' + esc(href) + '" target="_blank" rel="noopener">' + label + "</a>"


def _sup_section(sid, kicker, title, intro, inner):
    return ('<section class="iv-sup-section" id="' + sid + '" aria-labelledby="' + sid + '-h">'
            '<div class="iv-sup-section-head"><div class="iv-sup-kicker">' + kicker + "</div>"
            '<h2 id="' + sid + '-h">' + title + "</h2>" + (("<p>" + intro + "</p>") if intro else "") + "</div>"
            + inner + "</section>")


def support_plus_card():
    """The signed-out Plus+ card, same markup plus.js draws (buildSupportCta)."""
    return (
        '<div class="iv-plus-cta iv-plus-signup-cta iv-sup-plus-card" id="iv-support-plus">'
        '<div class="iv-plus-content">'
        '<div class="iv-plus-price-line"><span class="iv-plus-price-num">$9</span><span class="iv-plus-price-unit">/ month</span></div>'
        '<p class="iv-plus-blurb">Unlock every Plus episode across InnerVerse and Inner Whirled.</p>'
        '<a class="iv-plus-btn" href="' + SUP_CHECKOUT + '149343">Start 7-day free trial</a>'
        '<div class="iv-plus-alt"><div class="iv-plus-alt-label">OR</div><div class="iv-plus-alt-row">'
        '<a class="iv-pill" href="' + SUP_CHECKOUT + '149341">$9 / month</a>'
        '<a class="iv-pill" href="' + SUP_CHECKOUT + '149342">$100 / year</a>'
        '<a class="iv-pill iv-sup-login" href="' + esc(url("/plus")) + '">Already a member? Log in</a>'
        "</div></div></div></div>"
    )


def support():
    title = "Support InnerVerse | Plus+ Membership, Sessions and Trusted Affiliates"
    desc = ("Support InnerVerse: join Plus+ for full episodes on this site, Patreon, Substack or YouTube, book a "
            "Biofield Tuning session with Chance Garton, and explore trusted affiliates and audiobooks.")
    canonical = LIVE_ORIGIN + "/support"

    jumps = "".join('<a class="iv-sup-jump" href="#' + h + '">' + l + "</a>" for l, h in [
        ("Other ways to join", "join"), ("Sessions with Chance", "workwithchance"),
        ("Trusted affiliates", "affiliates"), ("Spirit Whirled audiobooks", "spiritwhirled"),
        ("Dylan Saccoccio on Substack", "dylan")])

    hero = (
        '<header class="iv-sup-hero">'
        '<div class="iv-sup-hero-text">'
        '<div class="iv-sup-kicker">Support</div>'
        "<h1>Support InnerVerse</h1>"
        '<p class="iv-sup-lede">InnerVerse is free to explore. This page is for those who want to support the work, '
        "access full episodes, work with Chance directly, or connect with trusted affiliates.</p>"
        '<div class="iv-sup-new"><span class="iv-sup-new-badge">New membership option</span>'
        "<p><b>Unlock access to InnerVerse and Inner Whirled Plus+.</b> InnerVerse Plus+ memberships are now accessible "
        "within the InnerVerse website. If you’ve put off subscribing because you didn’t want to deal with a third party "
        "like Patreon or Substack, you can now support InnerVerse and get premium content directly from the source. "
        "Other options listed below.</p></div>"
        '<nav class="iv-sup-jumps" aria-label="On this page">' + jumps + "</nav>"
        "</div>"
        '<div class="iv-sup-hero-card">'
        '<img class="iv-sup-plus-icon" src="' + esc(iv_img(SUP_PLUS_ICON, 300)) + '" alt="InnerVerse Plus+" width="96" height="96">'
        '<div class="iv-sup-card-title">InnerVerse Plus+</div>'
        '<div class="iv-sup-card-sub">Premium content, extended episodes</div>'
        + support_plus_card() +
        "</div></header>"
    )

    cards = ""
    for name, price, href, btn, img, body, browser, perks in SUP_PLATFORMS:
        note = ('<p class="iv-sup-note"><b>Join ' + browser + " on a web browser.</b> The " + browser + " app is "
                + ("good" if browser == "Patreon" else "great") + ", but if you sign up through it you will be paying "
                "more due to Apple’s 30% tax.</p>") if browser else ""
        cards += (
            '<article class="iv-sup-card">'
            '<img class="iv-sup-card-img" src="' + esc(iv_img(img, 700)) + '" alt="' + name + '" width="640" height="360" loading="lazy">'
            '<div class="iv-sup-card-body">'
            '<div class="iv-sup-card-top"><h3>' + name + '</h3><div class="iv-sup-price"><b>' + price + "</b> / month</div></div>"
            "<p>" + body + "</p>" + note +
            '<ul class="iv-sup-perks">' + "".join("<li>" + p + "</li>" for p in perks) + "</ul>"
            + _ext(href, btn, "iv-sup-btn iv-sup-btn-ghost") +
            "</div></article>"
        )
    join = _sup_section("join", "Plus+ elsewhere", "Other ways to join",
                        "Already living on one of these platforms? Plus+ is there too.",
                        '<div class="iv-sup-grid iv-sup-grid-3">' + cards + "</div>")

    work = _sup_section(
        "workwithchance", "Sessions", "Work with Chance", "",
        '<div class="iv-sup-feature">'
        '<img class="iv-sup-feature-img" src="' + esc(iv_img(SQ + "4e0c5819-8627-4923-a558-ebed935da372/CHANCE+GARTON+ABOUT+PAGE+INNERVERSE.png", 1000))
        + '" alt="Chance Garton" width="724" height="543" loading="lazy">'
        '<div class="iv-sup-feature-body"><h3>Biofield Tuning</h3>'
        "<p>Remote sound healing sessions via Zoom using tuning forks to locate and balance energetic dissonance in the biofield.</p>"
        '<div class="iv-sup-buttons"><a class="iv-sup-btn iv-sup-btn-lapis" href="' + esc(url("/biofield-tuning")) + '">Book a session</a></div>'
        "</div></div>")

    affiliates = _sup_section(
        "affiliates", "Trusted affiliates", "Products Chance actually uses", "",
        '<div class="iv-sup-grid iv-sup-grid-2">'
        '<article class="iv-sup-card iv-sup-aff">'
        '<a class="iv-sup-aff-logo" href="https://tippecanoeherbs.com/" target="_blank" rel="noopener">'
        '<img src="' + esc(iv_img(SQ + "b9ecc671-b201-40f9-95ce-f9ff0c004f08/tippecanoe+logo.webp", 700)) + '" alt="Tippecanoe Herbs" width="640" height="342" loading="lazy"></a>'
        '<div class="iv-sup-card-body"><h3>Tippecanoe Herbs</h3>'
        '<div class="iv-sup-code">Use coupon code <b>innerverse</b> at checkout for a 10% discount</div>'
        "<p>Kyle and Serena Denton are community herbalists creating wild-crafted and organic plant medicines out of "
        "Milwaukee since 2015. I have used their teas and tinctures on an almost daily basis for years now. Kyle is a great "
        "friend of InnerVerse and has appeared on the channel more times than I can count. These products work, not in the "
        "allopathic “pharma-medicine” way, but in a terrain-support, consciousness bolstering <i>plant-teacher</i> sort of way.</p>"
        '<div class="iv-sup-buttons">' + _ext("https://tippecanoeherbs.com/", "Shop Tippecanoe", "iv-sup-btn iv-sup-btn-gold")
        + '<a class="iv-sup-btn iv-sup-btn-ghost" href="' + esc(url("/episodes?show=Astro-Herbalism")) + '">Watch the Astro-Herbalism series</a></div>'
        "</div></article>"
        '<article class="iv-sup-card iv-sup-aff">'
        '<a class="iv-sup-aff-logo iv-sup-aff-logo-tall" href="https://lotuswei.com/innerverse" target="_blank" rel="noopener">'
        '<img src="' + esc(iv_img(SQ + "025478ea-ef40-443c-bd06-554aba0a9bcf/lotuswei.png", 700)) + '" alt="LotusWei flower essence elixirs" width="402" height="505" loading="lazy"></a>'
        '<div class="iv-sup-card-body"><h3>LotusWei Flower Essence Elixirs</h3>'
        '<div class="iv-sup-code">Use my affiliate link to support InnerVerse</div>'
        "<p>LotusWei provides amazing and transformative plant essence elixirs, using one of nature’s most gentle and "
        "beautiful elements: the flowers themselves. Led by founder Katie Hess, LotusWei supports customers with diverse "
        "products that operate on homeopathic principles and energetic resonances. I use LotusWei Elixirs to give me an "
        "edge with psychic &amp; energetic sensitivity, discernment, and life force coherence. In other words, LotusWei "
        "Elixirs help me be a better podcaster and Biofield Tuner. Benefits accumulate over long term use!</p>"
        '<div class="iv-sup-buttons">' + _ext("https://lotuswei.com/innerverse", "Shop LotusWei", "iv-sup-btn iv-sup-btn-gold")
        + '<a class="iv-sup-btn iv-sup-btn-ghost" href="' + esc(url("/episodes/katie-hess-lotuswei")) + '">Watch Katie Hess on InnerVerse</a></div>'
        "</div></article></div>")

    books = "".join(
        '<a class="iv-sup-book" href="' + esc(h) + '" target="_blank" rel="noopener">'
        '<img src="' + esc(iv_img(i, 500)) + '" alt="' + esc(t) + ' audiobook cover" width="250" height="250" loading="lazy">'
        "<span>" + t + "</span></a>"
        for t, i, h in SUP_BOOKS)
    spirit = _sup_section(
        "spiritwhirled", "Audiobooks narrated by Chance Garton", "Spirit Whirled by Dylan Saccoccio",
        "If you ever wondered where I gained my symbolic and linguistic chops, it was the <i>Spirit Whirled</i> series of "
        "books, by Dylan Saccoccio. If you want to keep up with us on our show Inner Whirled, you’ll need to do the same "
        "work. These books are a value and treasure greater than a college education in comparative mythology and "
        "religious studies ever could be. Give yourself the keys of discernment. Listen to Spirit Whirled.",
        '<div class="iv-sup-books">' + books + "</div>"
        '<p class="iv-sup-fine">New to Audible? Activate your <b>Free Trial</b> and use it to listen to one of my audiobooks. '
        "Amazon Prime members get <b>2 free audiobooks</b> during trial. Use your free trial to try <i>Spirit Whirled</i>.</p>")

    dylan = _sup_section(
        "dylan", "Inner Whirled co-host", "Support Dylan Saccoccio on Substack", "",
        '<div class="iv-sup-feature iv-sup-feature-small">'
        '<img class="iv-sup-feature-img" src="' + esc(iv_img(SQ + "6670d9e4-df07-4fcb-831f-47c6f4c1582c/dylan.jpg", 500)) + '" alt="Dylan Saccoccio" width="400" height="400" loading="lazy">'
        '<div class="iv-sup-feature-body">'
        "<p>The <i>Spirit Whirled</i> series may be finished, but Dylan’s work isn’t. There are hundreds of articles on his "
        "Substack along with access to our shared podcast Inner Whirled for paying supporters at greattide.substack.com.</p>"
        '<div class="iv-sup-buttons">' + _ext(DYLAN_SUBSTACK, "Ancient history, mythology and epic fantasy: join Dylan on Substack", "iv-sup-btn iv-sup-btn-lapis") + "</div>"
        "</div></div>")

    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebPage", "@id": canonical + "#page", "url": canonical, "name": title, "description": desc,
             "isPartOf": {"@id": LIVE_ORIGIN + "/#website"}, "about": {"@id": LIVE_ORIGIN + "/#podcast"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": LIVE_ORIGIN + "/"},
                {"@type": "ListItem", "position": 2, "name": "Support", "item": canonical}]},
        ],
    }
    cls = "iv-support-page"
    h = head(title, desc, canonical, SUPPORT_OG, "website", cls, extra='<script type="application/ld+json">' + json_ld(ld) + "</script>")
    body = (nav("") + '<main id="iv-main"><article class="iv-sup">' + hero
            + join + work + affiliates + spirit + dylan + "</article></main>" + footer())
    return page(h, body, cls, scripts=("/assets/site.js", "/assets/plus.js"))
