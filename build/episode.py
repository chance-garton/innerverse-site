"""One finished HTML page per /episodes/<slug>.

Every builder here is a line-for-line Python twin of the matching function in
the old iv-episode-render script (Squarespace Code Injection, build
2026-10-04a-shownotes), producing the same markup and classes, so the Lapis
Library stylesheet carried over in src/css applies unchanged. The difference
is when it runs: the page arrives finished, with every word, link and the
structured data in the HTML, instead of being drawn by script after load.

assets/episode.js then wires the interactive parts (players, chapters,
accordions, tabs, share, quote cards, the member-aware Plus card) onto this
markup without redrawing it.
"""

import json
import math
import re
import time
from urllib.parse import quote

from common import (LIVE_ORIGIN, CDN, esc, esc_em, url, iv_img, json_ld, plain,
                    head, nav, footer, page)

PNG = ".png?format=300w&content-type=image%2Fpng"
ICON = {
    "plusLogo": CDN + "c3607ade-e087-4b27-af0f-e0913f4dc3d0/plus+asset" + PNG,
    "ivLogo": CDN + "5d0e8860-e033-455f-a928-ac117245bcd8/InnerVerse+Podcast+Logo" + PNG,
    "substack": CDN + "97ea4460-fa59-4cec-aeb7-738c2a811286/SUBSTACK" + PNG,
    "patreon": CDN + "a71319bb-a7f7-4bc7-934e-227cfea475d7/PATREON" + PNG,
    "apple": CDN + "2d9b38a3-e7fd-48a4-93fc-72391a9e8b41/APPLE" + PNG,
    "spotify": CDN + "e25969fb-b848-4f61-bdb8-f4fb1953c3f6/SPOTIFY" + PNG,
    "rumble": CDN + "084be10d-b58a-4cce-8e56-0ec65d279c5d/RUMBLE" + PNG,
    "share": CDN + "8b43cf98-5e5a-4d66-b17c-e53003e00ba3/SHARE" + PNG,
    "imessage": CDN + "bec737af-11ac-4d1d-b28c-5c5717a15a94/text" + PNG,
    "instagram": CDN + "49f44b8f-7aa0-4f45-87dd-b590e1a74520/INSTA" + PNG,
    "telegram": CDN + "3bfe10e1-b999-4d2b-9912-eaef614c6cd2/TELEGRAM" + PNG,
    "copy": CDN + "803e4681-439b-4acd-943a-b7a6d5149626/copy-link" + PNG,
}
PLATFORMS = [
    ("Apple", "https://itunes.apple.com/us/podcast/innerverse-podcast/id1066918535?mt=2", ICON["apple"]),
    ("Spotify", "https://open.spotify.com/show/3PtsUrYFJiradha3biNf9Y", ICON["spotify"]),
    ("Rumble", "https://rumble.com/c/InnerVerse", ICON["rumble"]),
    ("Substack", "https://innerversepodcast.substack.com/", ICON["substack"]),
    ("Patreon", "https://www.patreon.com/innerverse", ICON["patreon"]),
]
PLATFORM_HOME = {
    "plus": "/plus",
    "substack": "https://innerversepodcast.substack.com",
    "patreon": "https://www.patreon.com/innerverse",
    "youtube": "https://www.youtube.com/c/@innerversepodcast/join",
}
SVG = {
    "lock": '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
    "lockGold": '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D8AA3C" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>',
    "play": '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>',
    "listen": '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3a9 9 0 00-9 9v7a3 3 0 003 3h3v-8H5v-2a7 7 0 0114 0v2h-4v8h3a3 3 0 003-3v-7a9 9 0 00-9-9z"></path></svg>',
    "bigPlay": '<svg viewBox="0 0 24 24" fill="#fff" width="26" height="26"><path d="M8 5v14l11-7z"></path></svg>',
    "rowPlay": '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>',
    "chevron": '<svg class="iv-chevron" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>',
    "quoteShare": '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .09 2.31L8.9 9.5a3 3 0 1 0 0 5l6.19 3.19A3 3 0 1 0 18 16a2.98 2.98 0 0 0-1.09.21L10.9 13.1a3.01 3.01 0 0 0 0-2.2l6.01-3.11A3 3 0 0 0 18 8z"></path></svg>',
}

HOST_GUEST_ID = "rec7Vm5QNrDbc9sdb"
HOST_PORTRAIT = CDN + "aa717e55-9487-4255-a7df-3f8ef10940c4/Chance+Garton+Patreon+Portrait.png?format=500w&content-type=image%2Fpng"
FREE_SHOWS = ["vibe rant", "astro-herbalism", "chance guest spots", "marvelous demystifiers"]
IV_NOTES_TEASE = "Members also get the full research notes for this episode."
IV2_FORKS = "https://images.squarespace-cdn.com/content/v1/5987d897cf81e0278ec5322e/7a926674-e13c-4827-ac2a-8d4cf8964ab0/CHANCE+GARTON+ABOUT+PAGE+INNERVERSE.png"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---------------------------------------------------------------- helpers

def parse_json_field(val):
    if not val:
        return []
    try:
        out = json.loads(val)
        return out if isinstance(out, list) else []
    except Exception:
        return []


def linked_ids(val):
    if not val:
        return []
    out = []
    for v in (val if isinstance(val, list) else [val]):
        out.append(v.get("id") if isinstance(v, dict) else v)
    return [x for x in out if x]


def names(val):
    return [(c.get("name") if isinstance(c, dict) else c) for c in (val or [])]


def format_date(d):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", d or "")
    if not m:
        return d or ""
    return MONTHS[int(m.group(2)) - 1] + " " + str(int(m.group(3))) + ", " + m.group(1)


def youtube_id(u):
    m = re.search(r"(?:youtu\.be/|v=|embed/)([A-Za-z0-9_-]{6,})", u or "")
    return m.group(1) if m else ""


def vimeo_id(u):
    m = re.search(r"vimeo\.com/(?:video/|channels/[^/]+/|groups/[^/]+/videos/)?(\d{6,})", u or "", re.I)
    return m.group(1) if m else ""


def odysee_path(u):
    m = re.search(r"odysee\.com/(?:\$/embed/)?([^?#\s]+)", u or "", re.I)
    return m.group(1).rstrip("/") if m else ""


def video_embed(u):
    od = odysee_path(u)
    if od:
        return {"platform": "odysee", "id": od, "src": "https://odysee.com/$/embed/" + od + "?autoplay=1"}
    yt = youtube_id(u)
    if yt:
        return {"platform": "youtube", "id": yt, "src": "https://www.youtube.com/embed/" + yt + "?autoplay=1&rel=0"}
    vm = vimeo_id(u)
    if vm:
        return {"platform": "vimeo", "id": vm, "src": "https://player.vimeo.com/video/" + vm + "?autoplay=1"}
    return {"platform": "", "id": "", "src": ""}


def minutes(s):
    m = re.match(r"\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?", str(s or ""))
    if not m:
        return 0
    return int(m.group(1) or 0) * 60 + int(m.group(2) or 0)


def extra_minutes(f):
    a, b = minutes(f["plusDuration"]), minutes(f["duration"])
    return str(a - b) if (a and b and a > b) else ""


def iso_duration(s):
    mins = minutes(s)
    if not mins:
        return ""
    h, m = divmod(mins, 60)
    return "PT" + (str(h) + "H" if h else "") + (str(m) + "M" if m else "")


def norm_name(s):
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def is_host_author(a):
    return norm_name(a).split(" ")[0] == "chance"


def portrait_for(author, guests):
    a = norm_name(author)
    if not a:
        return ""
    if is_host_author(a):
        h = [g for g in guests if g["id"] == HOST_GUEST_ID and g["portrait"]]
        return h[0]["portrait"] if h else HOST_PORTRAIT
    lst = [g for g in guests if g["portrait"] and norm_name(g["name"])]
    hit = next((g for g in lst if norm_name(g["name"]) == a), None)
    if not hit:
        hit = next((g for g in lst if norm_name(g["name"]).startswith(a + " ") or a.startswith(norm_name(g["name"]) + " ")), None)
    if not hit:
        hit = next((g for g in lst if norm_name(g["name"]).split(" ")[0] == a.split(" ")[0]), None)
    return hit["portrait"] if hit else ""


def link_text(u):
    s = re.sub(r"^https?://", "", str(u or ""), flags=re.I)
    s = re.sub(r"^www\.", "", s, flags=re.I)
    s = re.sub(r"[?#].*$", "", s).rstrip("/")
    if not s:
        return ""
    host, _, path = s.partition("/")
    if re.search(r"(^|\.)amazon\.", host, re.I):
        return "Amazon"
    if re.search(r"(^|\.)audible\.", host, re.I):
        return "Audible"
    if re.search(r"(^|\.)youtube\.com$", host, re.I) or re.search(r"(^|\.)youtu\.be$", host, re.I):
        if path.startswith("@"):
            return path.split("/")[0]
        return "YouTube" if path else host
    if re.search(r"(^|\.)instagram\.com$", host, re.I):
        return "@" + path.split("/")[0] if path else host
    if re.search(r"(^|\.)(twitter|x)\.com$", host, re.I):
        return "@" + path.split("/")[0] if path else host
    if not path:
        return host
    if len(path) <= 18:
        return host + "/" + path
    return host


def pill(label, href, icon_html):
    return '<a class="iv-pill" href="' + esc(href) + '" target="_blank" rel="noopener">' + icon_html + "<span>" + esc(label) + "</span></a>"


def img_icon(src, alt):
    return '<img src="' + esc(src) + '" alt="' + esc(alt) + '">'


# ---------------------------------------------------------------- the f object

def build_f(r):
    """The same field bag the render script built from the Airtable row."""
    shows = names(r.get("Show Categories"))
    f = {
        "title": r.get("Title") or "",
        "topicLine": r.get("Topic Line") or "",
        "showCategory": shows[0] if shows else "",
        "year": r.get("Year") or "",
        "episodeNumber": r.get("Episode Number") or "",
        "publishDate": r.get("Publish Date") or "",
        "duration": r.get("Duration") or "",
        "thumbnail": r.get("Thumbnail URL") or "",
        "videoUrl": r.get("Video URL") or r.get("YouTube URL") or "",
        "videoPlusUrl": r.get("YouTube Plus URL") or "",
        "acastAudioUrl": r.get("Acast Audio URL") or "",
        "audioOffset": float(r.get("Audio Offset Seconds") or 0),
        "intro1": r.get("Intro Paragraph 1") or "",
        "intro2": r.get("Intro Paragraph 2") or "",
        "directPlusUrl": r.get("Direct Plus URL") or "",
        "substackUrl": r.get("Substack Post URL") or "",
        "patreonUrl": r.get("Patreon Post URL") or "",
        "plusDuration": r.get("Plus Duration") or "",
        "plusChapters": parse_json_field(r.get("Plus Chapters JSON")),
        "showCategories": shows,
        "notesTease": bool(r.get("Has Show Notes") is True and "Inner Whirled" in shows),
    }
    f["free"] = is_free_episode(f)
    f["fullChip"] = bool(not f["free"] and f["directPlusUrl"] and f["plusDuration"])
    return f


def is_free_episode(f):
    if f["directPlusUrl"] or f["substackUrl"] or f["patreonUrl"]:
        return False
    return any(str(c).lower() in FREE_SHOWS for c in f["showCategories"])


# ---------------------------------------------------------------- builders

def build_header(f, root_label="Podcast"):
    path = [esc(root_label)]
    if f["showCategory"]:
        path.append(esc(f["showCategory"].upper()))
    bits = []
    if f["episodeNumber"]:
        bits.append("EPISODE " + esc(f["episodeNumber"]))
    if f["publishDate"]:
        bits.append(esc(format_date(f["publishDate"])))
    elif f["year"]:
        bits.append(esc(f["year"]))
    if f["duration"]:
        bits.append(esc(f["duration"]))
    return (
        '<div class="iv-header">'
        '<div class="iv-header-breadcrumb">'
        '<span class="iv-crumb-path">' + " / ".join(path) + "</span>"
        + ('<span class="iv-crumb-meta">' + " &middot; ".join(bits) + "</span>" if bits else "")
        + "</div>"
        + ('<div class="iv-header-topic">' + esc(f["topicLine"]) + "</div>" if f["topicLine"] else "")
        + '<h1 class="iv-header-title">' + esc_em(f["title"]) + "</h1>"
        '<div class="iv-header-rule"></div>'
        "</div>"
    )


def build_media_toggle(f):
    if not video_embed(f["videoUrl"])["platform"]:
        return build_media_novideo(f)
    return build_media_toggle_full(f)


def build_media_toggle_full(f):
    v = video_embed(f["videoUrl"])
    chip = ""
    if f["fullChip"]:
        chip = '<a class="iv2-fullchip" href="' + esc(plus_href(f["directPlusUrl"])) + '">' + SVG["lock"] + "Full episode " + esc(f["plusDuration"]) + "</a>"
    return (
        '<div class="iv-media-toggle">'
        '<div class="iv-toggle-btns">'
        '<span class="iv2-seg">'
        '<button type="button" class="iv-tbtn iv-tbtn-active" data-panel="watch">' + SVG["play"] + " Watch</button>"
        '<button type="button" class="iv-tbtn" data-panel="listen">' + SVG["listen"] + " Listen</button>"
        "</span>" + chip +
        '<button type="button" class="iv-pip-btn" id="iv-pip-btn" aria-label="Play in a floating window" title="Play in a floating window" style="display:none;">'
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"></rect></svg>'
        "<span>Window</span></button>"
        "</div>"
        '<div class="iv-toggle-panel iv-panel-watch" data-panel="watch">'
        '<div class="iv-ratio" id="iv-video-ratio" data-yt-id="' + esc(v["id"] if v["platform"] == "youtube" else "") + '" data-video-id="' + esc(v["id"]) + '" data-video-src="' + esc(v["src"]) + '" data-video-platform="' + esc(v["platform"]) + '">'
        '<div class="iv-video-cover" id="iv-video-cover" style="background-image:url(&#39;' + esc(iv_img(f["thumbnail"], 1000)) + '&#39;);">'
        '<button type="button" class="iv-video-play" id="iv-video-play-btn" aria-label="Play video">' + SVG["bigPlay"] + "</button>"
        "</div></div></div>"
        '<div class="iv-toggle-panel iv-panel-listen" data-panel="listen" style="display:none;">'
        '<div class="iv-audio-player">'
        '<img class="iv-audio-thumb" src="' + esc(iv_img(f["thumbnail"], 300)) + '" alt="" loading="lazy">'
        '<div class="iv-audio-body">'
        '<div class="iv-audio-label">INNERVERSE PODCAST</div>'
        '<div class="iv-audio-title">' + esc(f["title"]) + "</div>"
        '<div class="iv-audio-controls">'
        '<button type="button" class="iv-audio-play" id="iv-audio-play" aria-label="Play">'
        '<svg class="iv-audio-icon-play" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"></path></svg>'
        '<svg class="iv-audio-icon-pause" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>'
        "</button>"
        '<input type="range" class="iv-audio-scrub" id="iv-audio-scrub" min="0" max="100" value="0" step="0.1" aria-label="Seek">'
        '<div class="iv-audio-time" id="iv-audio-time">0:00 / --:--</div>'
        '<button type="button" class="iv-audio-vol-btn" id="iv-audio-vol-btn" aria-label="Mute">'
        '<svg id="iv-audio-vol-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z"></path></svg>'
        "</button>"
        '<input type="range" class="iv-audio-volume" id="iv-audio-volume" min="0" max="1" step="0.01" value="1" aria-label="Volume">'
        "</div></div>"
        '<audio id="iv-audio-el" preload="none" data-audio-offset="' + fmt_num(f["audioOffset"]) + '" src="' + esc(f["acastAudioUrl"]) + '"></audio>'
        "</div></div></div>"
    )


def build_media_novideo(f):
    """The eight old pages with no video (kept old-style on Squarespace by
    Chance's choice). Here they get the same player with Listen alone, or the
    artwork alone when there is no audio either."""
    full = build_media_toggle_listen_only(f) if f["acastAudioUrl"] else (
        '<div class="iv-media-toggle iv-media-artonly"><div class="iv-ratio"><div class="iv-video-cover" style="background-image:url(&#39;'
        + esc(iv_img(f["thumbnail"], 1000)) + '&#39;);"></div></div></div>')
    return full


def build_media_toggle_listen_only(f):
    g = dict(f)
    g["videoUrl"] = ""
    html_ = build_media_toggle_full(g)
    # Listen is the only tab: drop Watch and its panel, show the audio panel.
    html_ = re.sub(r'<button type="button" class="iv-tbtn iv-tbtn-active" data-panel="watch">.*?</button>', "", html_, count=1)
    html_ = html_.replace('class="iv-tbtn" data-panel="listen"', 'class="iv-tbtn iv-tbtn-active" data-panel="listen"', 1)
    html_ = re.sub(r'<div class="iv-toggle-panel iv-panel-watch" data-panel="watch">.*?</div></div></div>', "", html_, count=1, flags=re.S)
    html_ = html_.replace('data-panel="listen" style="display:none;"', 'data-panel="listen"', 1)
    return html_


def fmt_num(x):
    return str(int(x)) if float(x).is_integer() else str(x)


def plus_href(u):
    """A Direct Plus URL points at the live domain; keep it on this site."""
    m = re.match(r"https?://(?:www\.)?innerversepodcast\.com(/.*)$", u or "")
    return url(m.group(1)) if m else (u or "")


def build_intro(f):
    return (
        '<div class="iv-intro-text">'
        + ("<p>" + esc(f["intro1"]) + "</p>" if f["intro1"] else "")
        + ("<p>" + esc(f["intro2"]) + "</p>" if f["intro2"] else "")
        + "</div>"
    )


def yt_join_icon(platform):
    color = "#1AB7EA" if platform == "vimeo" else ("#EF1970" if platform == "odysee" else "#FF0000")
    return ('<span class="iv-pill-circle-icon iv-pill-yt-icon"><svg viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" rx="5" fill="' + color + '"></rect><path d="M10 8l6 4-6 4V8z" fill="#fff"></path></svg></span>')


def build_plus_sales_card(f):
    generic = f["free"] or not (f["directPlusUrl"] or f["substackUrl"] or f["patreonUrl"])
    plus_url = url("/plus") if generic else plus_href(f["directPlusUrl"] or "/plus")
    substack_href = PLATFORM_HOME["substack"] if generic else f["substackUrl"]
    patreon_href = PLATFORM_HOME["patreon"] if generic else f["patreonUrl"]
    plus_video = f["videoPlusUrl"] or f["videoUrl"]
    video_href = PLATFORM_HOME["youtube"] if generic else plus_video
    video_platform = "youtube" if generic else video_embed(plus_video)["platform"]
    extra = extra_minutes(f)
    heading = "Hear every full episode" if generic else ("Hear the full " + (esc(f["plusDuration"]) + " " if f["plusDuration"] else "") + "episode")
    if generic:
        blurb = "Every extended episode, the complete Plus+ archive, premium video and a private podcast feed for your app."
    else:
        blurb = ((extra + " more minutes of this conversation, plus " if extra else "The extended version of this episode, plus ")
                 + "the complete Plus+ archive, premium video and a private podcast feed for your app.")
        if f["notesTease"]:
            blurb += " " + IV_NOTES_TEASE
    joins = ""
    if substack_href:
        joins += '<a href="' + esc(substack_href) + '" target="_blank" rel="noopener">' + img_icon(ICON["substack"], "Substack") + "Substack</a>"
    if patreon_href:
        joins += '<a href="' + esc(patreon_href) + '" target="_blank" rel="noopener">' + img_icon(ICON["patreon"], "Patreon") + "Patreon</a>"
    if video_href:
        label = "Vimeo" if video_platform == "vimeo" else ("Odysee" if video_platform == "odysee" else "YouTube")
        joins += '<a href="' + esc(video_href) + '" target="_blank" rel="noopener">' + yt_join_icon(video_platform) + label + "</a>"
    eyebrow = ('<span class="iv2-eyebrow iv2-gold">Full episode &middot; ' + esc(f["plusDuration"]) + "</span>") if (f["plusDuration"] and not generic) else '<span class="iv2-eyebrow iv2-gold">InnerVerse Plus+</span>'
    return (
        '<div class="iv-plus-cta iv2-hcard" data-iv-plus-state="' + ("sell-free" if generic else "sell-cut") + '">'
        '<div class="iv2-mediacol">'
        '<a class="iv2-media iv2-media-gold" href="' + esc(plus_url) + '" aria-label="InnerVerse Plus+">'
        '<img src="' + esc(iv_img(f["thumbnail"], 750)) + '" alt="" loading="lazy">'
        '<span class="iv2-badge">' + SVG["lock"] + "Plus+</span></a>" + eyebrow +
        "</div>"
        '<div class="iv2-copy">'
        '<div class="iv2-brand"><img src="' + esc(ICON["plusLogo"]) + '" alt=""><span class="iv2-eyebrow iv2-gold" style="margin:0">InnerVerse Plus+</span></div>'
        '<h3 class="iv2-h3">' + heading + "</h3>"
        '<p class="iv2-p">' + esc(blurb) + "</p>"
        '<div class="iv2-actions">'
        '<a class="iv-plus-btn iv2-btn iv2-btn-gold" href="' + esc(plus_url) + '">Start your 7-day free trial</a>'
        '<span class="iv2-fine">Then $9 a month.<br>Cancel any time.</span>'
        "</div>"
        + ('<div class="iv2-join"><span>Or join through</span>' + joins + "</div>" if joins else "")
        + "</div></div>"
    )


def build_book_session():
    return (
        '<div class="iv-booksession iv2-card iv2-hcard" id="iv2-tuned">'
        '<div class="iv2-media iv2-media-forks"><img src="' + esc(iv_img(IV2_FORKS, 750)) + '" alt="Chance Garton holding a tuning fork" loading="lazy"></div>'
        '<div class="iv2-copy">'
        '<div class="iv2-tabs" role="tablist">'
        '<button type="button" class="iv2-tab iv2-on" role="tab" data-i="0" aria-selected="true">Biofield Tuning</button>'
        '<button type="button" class="iv2-tab" role="tab" data-i="1" aria-selected="false">Consultations</button>'
        "</div>"
        '<div class="iv2-pane iv2-on" data-i="0">'
        '<div class="iv2-eyebrow" style="margin:4px 0 0">Transformative energy work</div>'
        '<h3 class="iv2-h3">Get tuned with Chance</h3>'
        '<p class="iv2-p">Tuning forks find where energy is stuck in the field around your body and bring it back into flow. Sessions over Zoom, recorded for you to keep.</p>'
        '<div class="iv2-actions" style="gap:10px">'
        '<a class="iv2-btn iv2-btn-primary iv-booksession-link-primary" href="' + url("/biofield-tuning") + '">See availability</a>'
        '<a class="iv2-btn iv2-btn-secondary iv-booksession-link" href="' + url("/biofield-tuning") + '">Learn more</a>'
        "</div></div>"
        '<div class="iv2-pane" data-i="1">'
        '<div class="iv2-eyebrow" style="margin:4px 0 0">Natal charts, tarot &amp; I Ching</div>'
        '<h3 class="iv2-h3">30 Minute Consultations</h3>'
        '<p class="iv2-p">Have something to look at, or looking for guidance? We can consult oracular tools, read your chart, or just talk through whatever you choose.</p>'
        '<div class="iv2-actions" style="gap:10px">'
        '<a class="iv2-btn iv2-btn-primary" href="' + url("/biofield-tuning") + '">Book a consultation</a>'
        '<a class="iv2-btn iv2-btn-secondary" href="' + url("/biofield-tuning") + '">Learn more</a>'
        "</div></div></div></div>"
    )


def build_plus_book_row(f):
    return '<div class="iv-plus-book-row" id="iv-plus-card">' + build_plus_sales_card(f) + build_book_session() + "</div>"


def section_head(label_cls, title_cls, label, title, aria, count):
    return (
        '<div class="iv-section-head"><div>'
        '<div class="' + label_cls + '">' + esc(label) + "</div>"
        '<h2 class="' + title_cls + '">' + esc(title) + "</h2>"
        "</div>"
        '<div class="iv2-headright">'
        + ('<span class="iv2-count">' + esc(count) + "</span>" if count else "")
        + '<button type="button" class="iv-section-toggle" aria-label="' + esc(aria) + '">' + SVG["chevron"] + "</button>"
        "</div></div>"
    )


def build_locked_chapters(f):
    if not f["plusChapters"] or f["free"] or not f["directPlusUrl"]:
        return ""
    extra = extra_minutes(f)
    rows = "".join(
        '<div class="iv2-lockrow"><span class="t">' + esc(ch.get("time")) + '</span><span class="n">' + esc(ch.get("title")) + "</span>" + SVG["lockGold"] + "</div>"
        for ch in f["plusChapters"])
    href = plus_href(f["directPlusUrl"])
    actions = ('<a class="iv2-btn iv2-btn-gold" href="' + esc(href) + '">Start your 7-day free trial</a>'
               '<a class="iv2-btn iv2-btn-secondary" href="' + url("/plus") + '">Already a member? Log in</a>')
    return (
        '<div class="iv2-card iv2-locked" data-iv-locked="visitor">'
        '<div class="iv2-locked-head">'
        '<span><span class="iv2-eyebrow iv2-gold">Continues in the full episode</span><span class="iv2-locked-title">'
        + ("Members hear " + extra + " more minutes" if extra else "The members’ version continues") + "</span></span>"
        '<span class="iv2-count">' + str(len(f["plusChapters"])) + " more chapters</span>"
        "</div>" + rows +
        '<div class="iv2-locked-actions">' + actions + "</div></div>"
    )


def build_chapters(chapters, extra_html, page_url):
    if not chapters:
        return ""
    rows = "".join(
        # A real link to the moment (?t=), so a crawler sees each chapter as a
        # place in the video and a reader can open one in a new tab; the page
        # script plays it in place on a normal click.
        '<a href="' + esc(page_url + "?t=" + str(int(float(ch.get("seek") or 0)))) + '" class="iv-chapter-row" data-seek="' + esc(ch.get("seek")) + '">'
        '<span class="iv-chapter-time">' + esc(ch.get("time")) + "</span>"
        '<span class="iv-chapter-title">' + esc(ch.get("title")) + "</span>"
        '<span class="iv-chapter-btn">' + SVG["rowPlay"] + "</span></a>"
        for ch in chapters)
    return (
        '<div class="iv-chapters iv-accordion" id="iv-chapters-acc">'
        + section_head("iv-chapters-label", "iv-chapters-heading", "Chapters", "In this episode", "Toggle chapters", str(len(chapters)) + " chapters")
        + '<div class="iv-chapters-rule"></div>'
        '<div class="iv-section-body"><div class="iv-chapters-list" id="iv-chapters-list">' + rows + "</div>" + (extra_html or "") + "</div>"
        "</div>"
        # Chapters open on a wide screen, closed on a phone, decided before
        # the first paint so nothing jumps.
        "<script>if(window.innerWidth>700)document.getElementById('iv-chapters-acc').classList.add('iv-open');</script>"
    )


def build_themes(themes):
    if not themes:
        return ""
    items = "".join(
        '<div class="iv-theme-item"><div class="iv-theme-num">' + str(i + 1) + "</div>"
        '<div class="iv-theme-body"><h3 class="iv-theme-title">' + esc(t.get("title")) + "</h3>"
        '<p class="iv-theme-text">' + esc(t.get("body")) + "</p></div></div>"
        for i, t in enumerate(themes))
    return (
        '<div class="iv-themes-section iv-accordion" id="iv-themes-acc">'
        + section_head("iv-section-label", "iv-section-title", "Show notes", "Core themes", "Toggle core themes", str(len(themes)) + " themes")
        + '<div class="iv-section-rule"></div>'
        '<div class="iv-section-body"><div class="iv-themes-list">' + items + "</div></div></div>"
    )


def build_quotes(quotes, ep_title, guests):
    if not quotes:
        return ""
    cards = ""
    for q in quotes:
        portrait = q.get("portrait") or ""
        if not portrait or is_host_author(q.get("author")):
            portrait = portrait_for(q.get("author"), guests) or portrait
        av = ""
        if portrait:
            av = (' class="iv-quote-avatar iv-on" style="background-image:url(&quot;' + esc(iv_img(portrait, 300))
                  + '&quot;)" title="' + esc(q.get("author")) + '" data-iv-av="' + esc(portrait) + '"')
        else:
            av = ' class="iv-quote-avatar"'
        cards += (
            '<div class="iv-quote-card">'
            '<blockquote class="iv-quote-text">&ldquo;' + esc(q.get("text")) + "&rdquo;</blockquote>"
            '<div class="iv-quote-footer"><span class="iv-quote-who">'
            "<span" + av + "></span>"
            '<span class="iv-quote-author">' + esc(q.get("author")) + "</span></span>"
            '<button type="button" class="iv-quote-share-btn" data-quote="' + esc(q.get("text")) + '" data-author="' + esc(q.get("author"))
            + '" data-portrait="' + esc(portrait) + '" data-episode="' + esc(ep_title) + '" aria-label="Share this quote">' + SVG["quoteShare"] + "</button>"
            "</div></div>"
        )
    return (
        '<div class="iv-quotes-outer iv-accordion" id="iv-quotes-acc">'
        + section_head("iv-section-label", "iv-section-title", "Memorable", "Quotes", "Toggle quotes", str(len(quotes)) + " quotes")
        + '<div class="iv-section-rule"></div>'
        '<div class="iv-section-body"><div class="iv-quotes-wrap">' + cards + "</div></div></div>"
    )


def guest_panel_inner(g):
    links = []
    for label, key in (("Website", "website"), ("YouTube", "youtube"), ("Substack", "substack"), ("Books", "books"), ("Socials", "socials")):
        if g.get(key):
            links.append((label, g[key]))
    first = (g["name"] or "").split(" ")[0]
    allbtn = ""
    if g["id"] != HOST_GUEST_ID and norm_name(g["name"]) != "chance garton":
        # The live page linked a Squarespace category page when the post had
        # one; those pages go away with Squarespace, and the /episodes guest
        # filter lists the same episodes, so every card links there.
        allbtn = ('<a class="iv-guest-allbtn iv-guest-alllink" href="' + esc(url("/episodes") + "?guest=" + quote(g["name"]))
                  + '">See all ' + esc(first) + ' episodes<span class="iv-guest-allcaret">&rarr;</span></a>')
    return (
        ('<div class="iv-guest-subtitle">' + esc(g["role"]) + "</div>" if g["role"] else "")
        + '<p class="iv-guest-bio">' + esc(g["bio"]) + "</p>"
        '<div class="iv-guest-divider"></div>' + allbtn +
        '<div class="iv-guest-links">' + "".join(
            '<div><span class="iv-guest-link-label">' + esc(l) + '</span> <a href="' + esc(h) + '" target="_blank" rel="noopener">' + esc(link_text(h)) + "</a></div>"
            for l, h in links) + "</div>"
    )


def build_guest_card(guests):
    if not guests:
        return ""
    tab_row = "".join(
        '<button type="button" class="iv-guest-tab-unit' + (" iv-guest-tab-active" if i == 0 else "") + '" data-i="' + str(i) + '" aria-label="' + esc(g["name"]) + '">'
        '<img class="iv-guest-tab-photo" src="' + esc(iv_img(g["portrait"], 300)) + '" alt="' + esc(g["name"]) + '" loading="lazy"></button>'
        for i, g in enumerate(guests))
    name_row = "".join(
        '<span class="iv-guest-name-unit">' + ('<span class="iv-guest-name-sep">|</span>' if i > 0 else "")
        + '<button type="button" class="iv-guest-tab-name' + (" iv-guest-tab-active" if i == 0 else "") + '" data-i="' + str(i) + '">' + esc(g["name"]) + "</button></span>"
        for i, g in enumerate(guests))
    panels = "".join(
        '<div class="iv-guest-panel' + (" iv-guest-panel-active" if i == 0 else "") + '" data-i="' + str(i) + '"' + ("" if i == 0 else ' style="display:none"') + ">"
        + guest_panel_inner(g) + "</div>"
        for i, g in enumerate(guests))
    return ('<div class="iv-guest-card" id="iv-guest-card-1"><div class="iv-guest-tab-row">' + tab_row + "</div>"
            '<div class="iv-guest-name-row">' + name_row + "</div>" + panels + "</div>")


def aff_panel_inner(a):
    try:
        books = json.loads(a["booksJson"]) if a["booksJson"] else []
    except Exception:
        books = []
    if not isinstance(books, list):
        books = []
    link_html = ""
    if a["primaryUrl"]:
        link_html += '<a class="iv-aff-link-primary" href="' + esc(a["primaryUrl"]) + '" target="_blank" rel="noopener">' + esc(a["primaryLabel"] or "Learn More") + " &rarr;</a>"
    if a["secondaryUrl"]:
        link_html += '<a class="iv-aff-link" href="' + esc(a["secondaryUrl"]) + '" target="_blank" rel="noopener">' + esc(a["secondaryLabel"] or "Learn More") + " &rarr;</a>"
    books_html = ""
    for b in books:
        if not b or not b.get("title"):
            continue
        books_html += ('<a class="iv-aff-book" href="' + esc(b.get("url") or "#") + '" target="_blank" rel="noopener">'
                       + ('<img src="' + esc(b["image"]) + '" alt="' + esc(b["title"]) + '" loading="lazy">' if b.get("image") else "")
                       + "<span>" + esc(b["title"]) + "</span></a>")
    return (
        '<div class="iv-aff-name iv-aff-name-solo">' + esc(a["name"]) + "</div>"
        '<p class="iv-aff-body">' + esc_em(a["body"]) + "</p>"
        + ('<div class="iv-aff-offer">' + esc(a["offerLine"]) + "</div>" if a["offerLine"] else "")
        + ('<div class="iv-aff-links">' + link_html + "</div>" if link_html else "")
        + ('<p class="iv-aff-note">' + esc(a["note"]) + "</p>" if a["note"] else "")
        + ('<div class="iv-aff-books">' + books_html + "</div>" if books_html else "")
    )


def build_affiliates_card(affs):
    if not affs:
        return ""
    solo = len(affs) == 1
    tabs = "".join('<button type="button" class="iv-aff-tab' + (" iv-aff-tab-active" if i == 0 else "") + '" data-i="' + str(i) + '">' + esc(a["name"]) + "</button>" for i, a in enumerate(affs))
    panels = "".join(
        '<div class="iv-affiliates-panel' + (" iv-affiliates-panel-active" if i == 0 else "") + '" data-i="' + str(i) + '"' + ("" if i == 0 else ' style="display:none"') + ">"
        + aff_panel_inner(a) + "</div>" for i, a in enumerate(affs))
    return ('<div class="iv-affiliates-card" id="iv-affiliates-card"><div class="iv-affiliates-heading">Support the show</div>'
            + ("" if solo else '<div class="iv-affiliates-tabs">' + tabs + "</div>") + panels + "</div>")


def build_tags_cloud(tags):
    tags = [t for t in (tags or []) if t][:10]
    if not tags:
        return ""
    pills = "".join('<a class="iv-tag-pill" href="' + esc(url("/episodes") + "?tag=" + quote(t)) + '">' + esc(t) + "</a>" for t in tags)
    return '<div class="iv-tags-cloud" id="iv-tags-cloud"><div class="iv-tags-label">Tagged</div><div class="iv-tags-row">' + pills + "</div></div>"


def build_platforms_row():
    pills = "".join(pill(n, h, img_icon(i, n)) for n, h, i in PLATFORMS)
    return (
        '<div class="iv-platforms"><div class="iv-platforms-inner">'
        '<div class="iv-platforms-label">ALSO ON</div>'
        '<div class="iv-platform-row">' + pills +
        '<button type="button" class="iv-pill iv-share-btn" id="iv-share-trigger">' + img_icon(ICON["share"], "Share") + "<span>Share</span></button>"
        "</div></div></div>"
    )


def share_opt(id_, label, icon, label_id=None, extra=""):
    return ('<a class="iv-share-opt" id="' + id_ + '" href="#"' + extra + '><span class="iv-share-icon">' + img_icon(icon, "") + "</span>"
            '<span class="iv-share-optlabel"' + (' id="' + label_id + '"' if label_id else "") + ">" + esc(label) + "</span></a>")


def build_share_modal(f):
    return (
        '<div class="iv-share-overlay" id="iv-share-overlay"><div class="iv-share-modal">'
        '<button type="button" class="iv-share-close" id="iv-share-close" aria-label="Close">&times;</button>'
        '<div class="iv-share-label">SHARE THIS EPISODE</div>'
        '<div class="iv-share-title">' + esc(f["title"]) + "</div>"
        '<div class="iv-share-grid">'
        + share_opt("iv-share-imessage", "iMessage", ICON["imessage"])
        + share_opt("iv-share-instagram", "Instagram", ICON["instagram"])
        + share_opt("iv-share-telegram", "Telegram", ICON["telegram"], None, ' target="_blank" rel="noopener"')
        + share_opt("iv-share-copy", "Copy Link", ICON["copy"], "iv-share-copy-label")
        + "</div></div></div>"
    )


# ---------------------------------------------------------------- related episodes

REL_STOP = set("the a an and or of in on to for with is are was were be been it its this that these those you your we our us they them from by at as not no but if then than so what who whom which how why when where all any both each few more most other some such own same too very can will just now ep episode part feat vs amp nbsp".split())
REL_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def rel_tokens(s):
    out = []
    for t in re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).split(" "):
        if len(t) > 2 and t not in REL_STOP:
            out.append(t[:-1] if (len(t) > 4 and t.endswith("s") and not t.endswith("ss")) else t)
    return out


class Related:
    """The render script's TF-IDF related-episode ranking, run once at build
    time over the whole corpus. Candidates are limited to episodes that have
    a page, which also retires the old related-link guard."""

    def __init__(self, records, live_slugs):
        docs = []
        for rec in records:
            f = rec.get("fields") or {}
            words = rel_tokens(f.get("Title")) + rel_tokens(f.get("Topic Line")) * 2
            tf = {}
            for w in words:
                tf[w] = tf.get(w, 0) + 1
            docs.append({
                "slug": f.get("Slug") or "", "title": f.get("Title") or "", "tf": tf,
                "topics": linked_ids(f.get("Topics")), "cats": linked_ids(f.get("Show Categories")),
                "guests": linked_ids(f.get("Guests")), "date": f.get("Publish Date") or "",
                "thumb": f.get("Thumbnail URL") or "", "num": f.get("Episode Number"),
                "topicLine": f.get("Topic Line") or "",
            })
        n = len(docs)
        df = {}
        for d in docs:
            for w in d["tf"]:
                df[w] = df.get(w, 0) + 1
        for d in docs:
            vec = {}
            ss = 0.0
            for w, c in d["tf"].items():
                v = c * (math.log(n / (df.get(w) or 1)) + 1)
                vec[w] = v
                ss += v * v
            d["vec"] = vec
            d["norm"] = math.sqrt(ss) or 1
        self.docs = docs
        self.by_slug = {d["slug"]: d for d in docs}
        self.live = live_slugs

    @staticmethod
    def _cos(a, b):
        small, large = (a, b) if len(a["vec"]) < len(b["vec"]) else (b, a)
        dot = sum(v * large["vec"].get(w, 0) for w, v in small["vec"].items())
        return dot / (a["norm"] * b["norm"])

    @staticmethod
    def _overlap(a, b):
        s = set(a)
        return len([x for x in b if x in s])

    def rank(self, slug, now=None):
        me = self.by_slug.get(slug)
        if not me:
            return []
        now = now or time.time()
        scored = []
        for d in self.docs:
            if d is me or not d["thumb"] or not d["slug"] or d["slug"] not in self.live:
                continue
            years = 5
            if d["date"]:
                try:
                    ts = time.mktime(time.strptime(d["date"][:10], "%Y-%m-%d"))
                    years = max(0, (now - ts) / (86400 * 365))
                except Exception:
                    pass
            score = (10 * self._cos(me, d) + 4.5 * self._overlap(me["guests"], d["guests"])
                     + 2 * self._overlap(me["topics"], d["topics"]) + 1.5 * self._overlap(me["cats"], d["cats"])
                     + max(0, 0.5 - years * 0.08))
            if score >= 3.0:
                scored.append((score, d))
        scored.sort(key=lambda x: -x[0])
        return [d for _, d in scored[:6]]


def rel_meta(d):
    when = ""
    p = str(d["date"] or "").split("-")
    if len(p) >= 2 and p[1].isdigit():
        when = REL_MONTHS[int(p[1]) - 1] + " " + p[0]
    lead = d["topicLine"] or ("EP " + str(d["num"]) if d["num"] else "")
    return " · ".join(x for x in (lead, when) if x)


def build_related(picks):
    if len(picks) < 3:
        return ""
    cards = "".join(
        '<a class="iv-related-card" href="' + esc(url("/episodes/" + d["slug"])) + '">'
        '<div class="iv-related-thumb"><img src="' + esc(iv_img(d["thumb"], 500)) + '" alt="" loading="lazy"></div>'
        '<div class="iv-related-body"><div class="iv-related-meta">' + esc(rel_meta(d)) + "</div>"
        '<div class="iv-related-title">' + esc(d["title"]) + "</div></div></a>"
        for d in picks)
    return ('<div class="iv-related" id="iv-related"><div class="iv-section-label">Follow the thread</div>'
            '<h2 class="iv-section-title">More episodes</h2><div class="iv-section-rule"></div>'
            '<div class="iv-related-grid" id="iv-related-grid">' + cards + "</div></div>")


# ---------------------------------------------------------------- structured data

def structured_data(f, r, guests, canonical, description, image, post):
    """PodcastEpisode for the show, a VideoObject with each chapter as a Clip
    (Google's key moments), a Person per guest and a breadcrumb trail."""
    series = {"@type": "PodcastSeries", "@id": LIVE_ORIGIN + "/#podcast", "name": "InnerVerse Podcast",
              "url": LIVE_ORIGIN + "/", "webFeed": "https://feeds.acast.com/public/shows/innerverse",
              "author": {"@type": "Person", "name": "Chance Garton", "url": LIVE_ORIGIN + "/about"}}
    people = [{"@type": "Person", "name": g["name"], **({"image": iv_img(g["portrait"], 500)} if g["portrait"] else {}),
               **({"url": g["website"]} if g.get("website") else {})} for g in guests]
    date = f["publishDate"] or (post or {}).get("date", "")
    ep = {
        "@type": "PodcastEpisode", "@id": canonical + "#episode", "url": canonical, "name": plain(f["title"].replace("*", "")),
        "description": description, "partOfSeries": series,
    }
    if date:
        ep["datePublished"] = date
    if f["episodeNumber"]:
        ep["episodeNumber"] = str(f["episodeNumber"])
    if iso_duration(f["duration"]):
        ep["timeRequired"] = iso_duration(f["duration"])
    if image:
        ep["image"] = iv_img(image, 1500)
    if f["acastAudioUrl"]:
        ep["associatedMedia"] = {"@type": "MediaObject", "contentUrl": f["acastAudioUrl"], "encodingFormat": "audio/mpeg"}
    if people:
        ep["actor"] = people
    graph = [ep]
    v = video_embed(f["videoUrl"])
    if v["platform"] and date:
        vid = {
            "@type": "VideoObject", "@id": canonical + "#video", "name": plain(f["title"].replace("*", "")),
            "description": description, "uploadDate": date, "embedUrl": v["src"].replace("?autoplay=1&rel=0", "").replace("?autoplay=1", ""),
            "thumbnailUrl": [iv_img(f["thumbnail"] or image, 1500)],
        }
        if v["platform"] == "youtube":
            vid["contentUrl"] = "https://www.youtube.com/watch?v=" + v["id"]
        if iso_duration(f["duration"]):
            vid["duration"] = iso_duration(f["duration"])
        chapters = parse_json_field(r.get("Chapters JSON"))
        clips = []
        for i, ch in enumerate(chapters):
            start = int(float(ch.get("seek") or 0))
            end = int(float(chapters[i + 1].get("seek") or 0)) if i + 1 < len(chapters) else None
            clip = {"@type": "Clip", "name": plain(ch.get("title")), "startOffset": start, "url": canonical + "?t=" + str(start)}
            if end and end > start:
                clip["endOffset"] = end
            clips.append(clip)
        if clips:
            vid["hasPart"] = clips
        graph.append(vid)
        ep["video"] = {"@id": canonical + "#video"}
    crumbs = [("Episodes", LIVE_ORIGIN + "/episodes")]
    if f["showCategory"]:
        crumbs.append((f["showCategory"], LIVE_ORIGIN + "/episodes?show=" + quote(f["showCategory"])))
    crumbs.append((plain(f["title"].replace("*", "")), canonical))
    graph.append({"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    return {"@context": "https://schema.org", "@graph": graph}


# ---------------------------------------------------------------- the page

def guests_for(r, file):
    ids = [i for i in linked_ids(r.get("Guests")) if i != HOST_GUEST_ID] + [HOST_GUEST_ID]
    by = file.get("_guestsById") or {}
    out = []
    for gid in ids:
        g = by.get(gid) or {}
        if not g.get("Name"):
            continue
        out.append({"id": gid, "name": g.get("Name") or "", "portrait": g.get("Portrait URL") or "", "role": g.get("Role") or "",
                    "bio": g.get("Bio") or "", "website": g.get("Website URL") or "", "youtube": g.get("YouTube URL") or "",
                    "substack": g.get("Substack URL") or "", "books": g.get("Books URL") or "", "socials": g.get("Socials URL") or ""})
    return out


def affiliates_for(r, file):
    by = file.get("_affiliatesById") or {}
    out = []
    for aid in linked_ids(r.get("Affiliates Shown")):
        a = by.get(aid) or {}
        out.append({"name": a.get("Name") or "", "body": a.get("Body") or "", "offerLine": a.get("Offer Line") or "",
                    "primaryLabel": a.get("Primary Link Label") or "", "primaryUrl": a.get("Primary Link URL") or "",
                    "secondaryLabel": a.get("Secondary Link Label") or "", "secondaryUrl": a.get("Secondary Link URL") or "",
                    "note": a.get("Note") or "", "booksJson": a.get("Books JSON") or ""})
    return out


def seo_title(f, post, r=None):
    # Airtable's SEO Title first (2026-10-29), then the Squarespace snapshot, then Title.
    t = plain((r or {}).get("SEO Title")) or (post or {}).get("seoTitle") or plain(f["title"].replace("*", ""))
    # Squarespace appended " | InnerVerse" to every SEO title; keep doing so.
    return t if t.endswith("| InnerVerse") else t + " | InnerVerse"


def seo_description(f, post, r=None):
    d = plain((r or {}).get("SEO Description")) or (post or {}).get("seoDescription")
    if d:
        return plain(d)
    return plain(f["intro1"] or f["topicLine"] or f["title"], 160)


def render(slug, file, post, related, tags):
    r = file["fields"]
    f = build_f(r)
    guests = guests_for(r, file)
    affs = affiliates_for(r, file)
    canonical = LIVE_ORIGIN + "/episodes/" + slug
    page_url = url("/episodes/" + slug)
    title = seo_title(f, post, r)
    description = seo_description(f, post, r)
    image = (post or {}).get("image") or f["thumbnail"]
    iw = "Inner Whirled" in f["showCategories"]

    chapters = parse_json_field(r.get("Chapters JSON"))
    themes = parse_json_field(r.get("Core Themes JSON"))
    quotes = parse_json_field(r.get("Quotes JSON"))

    root = (
        build_header(f)
        + build_media_toggle(f)
        + build_platforms_row()
        + build_share_modal(f)
        + '<div class="iv-sticky-layout"><div class="iv-sticky-main">'
        + build_intro(f)
        + build_plus_book_row(f)
        + build_chapters(chapters, build_locked_chapters(f), page_url)
        + build_themes(themes)
        + build_quotes(quotes, f["title"], guests)
        + '</div><div class="iv-sticky-sidebar">'
        + build_guest_card(guests)
        + build_affiliates_card(affs)
        + build_tags_cloud(tags)
        + "</div></div>"
        + build_related(related)
    )

    # What the page script needs to redraw the Plus card for a member and to
    # draw the quote share images; everything else it reads off the markup.
    state = {"slug": slug, "shareUrl": canonical, "f": f,
             "guests": [{"id": g["id"], "name": g["name"], "portrait": g["portrait"]} for g in guests]}

    body = (
        nav("podcast", iw)
        + '<main class="iv-page"><div class="blog-item-wrapper"><article class="entry"><div class="blog-item-content-wrapper"><div class="blog-item-content">'
        + '<div id="iv-episode-root">' + root + "</div>"
        + "</div></div></article></div></main>"
        + footer()
        + '<script type="application/json" id="iv-page-data">' + json_ld(state) + "</script>"
    )
    ld = structured_data(f, r, guests, canonical, description, image, post)
    html_class = "iv-2026 iv-newtpl" + (" iv-iw" if iw else "")
    h = head(title, description, canonical, image, "article", html_class, iw,
             extra='<script type="application/ld+json">' + json_ld(ld) + "</script>")
    return page(h, body, html_class, scripts=("/assets/site.js", "/assets/episode.js", "/assets/promo.js", "/assets/my-library.js"))
