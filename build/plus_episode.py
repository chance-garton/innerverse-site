"""One finished HTML page per /plus/<slug> (stage 1b).

The live members' page is a paywalled Squarespace post: a signed-out visitor
gets the join screen that ivPlusMemberfulUnlock paints (paintLock), and a
member gets the page renderPlus draws from the episode's data file once the
innerverse-plus Worker says they are entitled.

This writes the signed-out page into the HTML, with the same markup and
classes as paintLock, and below it the parts of the episode that are already
public elsewhere on the site (the description, the members' chapter titles the
free page lists under its Plus card, the guests). Nothing members-only is
written here: no video or audio address, no members' quotes or core themes,
no show notes. Members still get their page from assets/episode.js, which
reads the same public data file the live site reads and unlocks the audio,
video and show notes through the Worker exactly as now.
"""

import re
from urllib.parse import quote

from common import LIVE_ORIGIN, esc, iv_img, json_ld, plain, url, head, nav, footer, page
import episode as ep

PLUS_TRIAL = "https://innerverseplus.memberful.com/checkout?plan=149343"
PLUS_MONTHLY = "https://innerverseplus.memberful.com/checkout?plan=149341"
PLUS_YEARLY = "https://innerverseplus.memberful.com/checkout?plan=149342"
PLUS_LOGO_URL = "https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset.png?format=300w&content-type=image%2Fpng"
WORKER = "https://innerverse-plus.chance-5da.workers.dev"
LOCK_SVG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"></rect><path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9"></path></svg>')


def clean_title(t):
    return re.sub(r"\s*\(\s*PLUS\s*\)\s*$", "", str(t or ""), flags=re.I).strip()


def login_href(canonical):
    # The page script swaps in the visitor's own address; this one works without it.
    return WORKER + "/auth/choose?return_to=" + quote(canonical, safe="")


def build_lock(f, canonical):
    """paintLock, line for line. The headline is the page's one h1."""
    meta = [x for x in (f["showCategory"], f["year"]) if x]
    headline = clean_title(f["title"]) or f["topicLine"] or "A members-only episode"
    runtime = ("Unlock the <strong>" + esc(f["duration"]) + "</strong> episode.") if f["duration"] else "Unlock the full episode."
    art = ('<img class="iv-lock-thumb" src="' + esc(iv_img(f["thumbnail"], 750)) + '" alt="">') if f["thumbnail"] else ""
    return (
        '<div class="iv-lock">'
        '<div class="iv-lock-grid">'
        '<div class="iv-lock-left">'
        '<div class="iv-lock-player">' + art + '<div class="iv-lock-veil"></div><div class="iv-lock-orb">' + LOCK_SVG + "</div></div>"
        '<p class="iv-lock-runtime">' + runtime + "</p>"
        "</div>"
        '<div class="iv-lock-right">'
        '<div class="iv-lock-brand"><img class="iv-lock-logo" src="' + PLUS_LOGO_URL + '" alt="InnerVerse Plus">'
        '<div><div class="iv-lock-eyebrow">InnerVerse Plus</div><div class="iv-lock-sub">Members only</div></div></div>'
        + ('<p class="iv-lock-meta">' + esc(" • ".join(str(m) for m in meta)) + "</p>" if meta else "")
        + ('<p class="iv-lock-topic">' + esc(f["topicLine"]) + "</p>" if f["topicLine"] else "")
        + '<h1 class="iv-lock-headline">' + esc(headline) + "</h1>"
        '<p class="iv-lock-copy">Join Plus to watch this one in full, along with every other members’ episode across InnerVerse and Inner Whirled.'
        + (" " + ep.IV_NOTES_TEASE if f["notesTease"] else "") + " Cancel any time.</p>"
        '<div class="iv-lock-buttons">'
        '<a class="iv-lock-btn iv-lock-btn-primary" href="' + PLUS_TRIAL + '">Start 7-day free trial<span>then $9 / month</span></a>'
        '<a class="iv-lock-btn" href="' + PLUS_MONTHLY + '">Join for $9 / month</a>'
        '<a class="iv-lock-btn" href="' + PLUS_YEARLY + '">Join for $100 / year<span>save $8</span></a>'
        "</div>"
        '<a class="iv-lock-login" data-iv-login href="' + esc(login_href(canonical)) + '">Already a member? Log in</a>'
        "</div></div></div>"
    )


def chapter_list(r):
    """The members' cut in order: the free part re-timed to this cut, then the
    chapters only members hear. Titles and times only, as the free page's
    locked card already shows them."""
    rows = ep.parse_json_field(r.get("Plus Free Chapters JSON")) + ep.parse_json_field(r.get("Plus Chapters JSON"))

    def at(ch):
        try:
            return float(ch.get("seek") or 0)
        except (TypeError, ValueError):
            return 0.0
    return sorted(rows, key=at)


def build_public_chapters(f, chapters, canonical):
    if not chapters:
        return ""
    rows = "".join(
        '<div class="iv2-lockrow"><span class="t">' + esc(ch.get("time")) + '</span><span class="n">' + esc(ch.get("title")) + "</span>" + ep.SVG["lockGold"] + "</div>"
        for ch in chapters)
    title = ("Inside the full " + esc(f["duration"]) + " episode") if f["duration"] else "Inside the full episode"
    return (
        '<div class="iv2-card iv2-locked iv-plus-pubchapters" data-iv-locked="visitor">'
        '<div class="iv2-locked-head">'
        '<span><span class="iv2-eyebrow iv2-gold">Chapters</span><span class="iv2-locked-title">' + title + "</span></span>"
        '<span class="iv2-count">' + str(len(chapters)) + " chapters</span>"
        "</div>" + rows +
        '<div class="iv2-locked-actions">'
        '<a class="iv2-btn iv2-btn-gold" href="' + PLUS_TRIAL + '">Start your 7-day free trial</a>'
        '<a class="iv2-btn iv2-btn-secondary" data-iv-login href="' + esc(login_href(canonical)) + '">Already a member? Log in</a>'
        "</div></div>"
    )


def structured_data(f, guests, canonical, description, image, date):
    series = {"@type": "PodcastSeries", "@id": LIVE_ORIGIN + "/#podcast", "name": "InnerVerse Podcast", "url": LIVE_ORIGIN + "/"}
    name = plain(clean_title(f["title"]).replace("*", ""))
    epi = {"@type": "PodcastEpisode", "@id": canonical + "#episode", "url": canonical, "name": name,
           "description": description, "partOfSeries": series, "isAccessibleForFree": False}
    if date:
        epi["datePublished"] = date
    if ep.iso_duration(f["duration"]):
        epi["timeRequired"] = ep.iso_duration(f["duration"])
    if image:
        epi["image"] = iv_img(image, 1500)
    people = [{"@type": "Person", "name": g["name"], **({"image": iv_img(g["portrait"], 500)} if g["portrait"] else {})} for g in guests]
    if people:
        epi["actor"] = people
    crumbs = [("Plus+", LIVE_ORIGIN + "/plus"), (name, canonical)]
    return {"@context": "https://schema.org", "@graph": [epi, {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]}]}


def render(slug, file, post, entry):
    r = file["fields"]
    shows = ep.names(r.get("Show Categories"))
    f = {
        "title": r.get("Title") or entry.get("title") or "",
        "topicLine": r.get("Topic Line") or entry.get("topicLine") or "",
        "showCategory": shows[0] if shows else ((entry.get("shows") or [""])[0]),
        "year": r.get("Year") or "",
        # Duration on a members' page is the members' runtime (renderPlus).
        "duration": r.get("Plus Duration") or r.get("Duration") or entry.get("plusDuration") or "",
        "thumbnail": r.get("Thumbnail URL") or entry.get("thumb") or "",
        "intro1": r.get("Intro Paragraph 1") or "",
        "intro2": r.get("Intro Paragraph 2") or "",
        "notesTease": bool(r.get("Has Show Notes") is True and "Inner Whirled" in shows),
    }
    guests = ep.guests_for(r, file)
    canonical = LIVE_ORIGIN + "/plus/" + slug
    post = post or {}
    t = post.get("seoTitle") or clean_title(post.get("title") or f["title"])
    title = t if t.endswith("| InnerVerse") else t + " | InnerVerse"
    description = plain(post.get("seoDescription")) if post.get("seoDescription") else plain(f["intro1"] or f["topicLine"] or f["title"], 160)
    image = post.get("image") or entry.get("thumb") or f["thumbnail"]
    date = r.get("Publish Date") or entry.get("date") or ""

    info = ""
    main = ep.build_intro(f) if (f["intro1"] or f["intro2"]) else ""
    main += build_public_chapters(f, chapter_list(r), canonical)
    side = ep.build_guest_card(guests)
    if main or side:
        info = ('<div class="iv-sticky-layout iv-plus-pubinfo"><div class="iv-sticky-main">' + main + "</div>"
                '<div class="iv-sticky-sidebar">' + side + "</div></div>")

    # The members' page script needs only which file to read.
    state = {"kind": "plus", "slug": slug, "dataSlug": r.get("Slug") or slug, "shareUrl": canonical}
    body = (
        nav("plus")
        + '<main class="iv-page"><div class="blog-item-wrapper"><article class="entry"><div class="blog-item-inner-wrapper">'
        + '<div class="iv-plus-public" id="iv-plus-public">' + build_lock(f, canonical) + info + "</div>"
        + "</div></article></div></main>"
        + footer()
        + '<script type="application/json" id="iv-page-data">' + json_ld(state) + "</script>"
    )
    ld = structured_data(f, guests, canonical, description, image, date)
    # The Inner Whirled skin waits for a member's page, as on the live site.
    html_class = "iv-2026 iv-plus-slug"
    h = head(title, description, canonical, image, "article", html_class, "Inner Whirled" in shows,
             extra='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Abel&display=swap">'
             + '<script type="application/ld+json">' + json_ld(ld) + "</script>")
    return page(h, body, html_class, scripts=("/assets/site.js", "/assets/episode.js", "/assets/promo.js", "/assets/my-library.js"))
