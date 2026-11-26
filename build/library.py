"""My library (/library), added 2026-11-25.

A Plus+ member's own page: the episodes and songs they saved, their private
notes, what they have watched and the messages they saved in the chat. It is
the same library the InnerVerse app keeps (the Inner Circle server's
/api/library), so nothing about a member is in the served page: the HTML is the
empty frame and the join pitch, and src/js/library.js fills the frame for a
signed-in member. Always noindex and never in the sitemap.

The page class on <html> (set before first paint) picks the view: a Plus+
member sees the library, anyone else the pitch, so nothing flashes.

The saved songs play in place with the Music page's own script
(src/js/music.js, mode "library"), so the page carries the same song list.
"""
from common import LIVE_ORIGIN, esc, footer, head, json_ld, nav, page, url
from music import AUDIO_BASE, I_HEART, I_PLAY, SONGS_URL, load_songs

TRIAL = "https://innerverseplus.memberful.com/checkout?plan=149343"
MONTHLY = "https://innerverseplus.memberful.com/checkout?plan=149341"
YEARLY = "https://innerverseplus.memberful.com/checkout?plan=149342"
CHAT_SAVED = "https://circle.innerversepodcast.com/#room=saved"

I_SEARCH = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>'
I_CLOSE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>'
I_PEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"></path><path d="M13.5 6.5l4 4"></path></svg>'
I_CHECK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>'
I_PHONE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><path d="M11 18.5h2"></path></svg>'
HEART_20 = I_HEART.replace('width="17" height="17"', 'width="20" height="20"')
HEART_13 = I_HEART.replace('width="17" height="17"', 'width="13" height="13"').replace('stroke-width="2"', 'stroke-width="2.4"')

PERKS = [
    (HEART_20, "Save episodes and songs", "One tap keeps anything you want to come back to."),
    (I_PEN, "Private notes", "Write on any episode. Only you can read them, and a time such as 42:10 opens the episode at that moment."),
    (I_CHECK, "What you have watched", "Episodes you finish are marked for you, so you always know what is still ahead."),
    (I_PHONE, "The website and the app", "One library on your account, the same on both."),
]


def build(episodes):
    """episodes: the free index's list, for each song's air date (as the Music page has it)."""
    songs, _source = load_songs()
    dates = {e["slug"]: e.get("date") or "" for e in episodes}
    title = "My library | InnerVerse Plus+"
    desc = "A Plus+ member's own library on InnerVerse: saved episodes and songs, private notes, and what they have watched."
    cls = "iv-library-page"
    h = head(title, desc, LIVE_ORIGIN + "/library", "", "website", cls)
    # A member's own page: never listed, on every build.
    h = h.replace('content="index, follow, max-image-preview:large"', 'content="noindex, nofollow"')
    data = {"songs": songs, "dates": {s["episode"]: dates.get(s["episode"], "") for s in songs if s.get("episode")},
            "audio": AUDIO_BASE, "live": SONGS_URL, "mode": "library"}
    perks = "".join(
        '<li class="ivl-perk"><span class="ivl-perk-i">' + icon + '</span><div><h3>' + name + "</h3><p>" + line + "</p></div></li>"
        for icon, name, line in PERKS)
    body_html = (
        '<main id="iv-main"><div class="ivl" id="iv-library">'
        '<header class="ivl-hero">'
        '<div class="ivl-kicker">' + HEART_13 + '<span class="ivl-m">Plus+ member</span><span class="ivl-v">InnerVerse Plus+</span></div>'
        "<h1>My library</h1>"
        '<p class="ivl-lede ivl-m">The episodes and songs you saved, your private notes, and what you have watched. '
        "It is the same library the InnerVerse app keeps, so a save in one shows in the other.</p>"
        '<p class="ivl-lede ivl-v">A place of your own inside InnerVerse. Save episodes and songs, keep private notes on anything you hear, '
        "and find it all again on the website or in the app.</p>"
        "</header>"

        # ---- a Plus+ member: the frame library.js fills ----
        '<div class="ivl-member">'
        '<div class="ivcl-rowwrap" id="ivl-continue" hidden></div>'
        '<div class="ivl-tools">'
        '<label class="ivl-search">' + I_SEARCH +
        '<input type="search" id="ivl-q" placeholder="Search your library" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Search your library">'
        '<button type="button" class="ivl-search-x" id="ivl-qx" aria-label="Clear the search" hidden>' + I_CLOSE + "</button></label>"
        '<div class="ivl-chips" id="ivl-chips" role="group" aria-label="What to show"></div>'
        "</div>"
        '<div class="ivl-state" id="ivl-state" role="status" aria-live="polite"><div class="ivl-wait"><span></span><span></span><span></span></div></div>'
        '<div class="ivl-body" id="ivl-body" hidden>'
        '<section class="ivl-sec" id="ivl-eps" aria-labelledby="ivl-eps-h" hidden><div class="ivl-sec-head"><h2 id="ivl-eps-h">Episodes</h2></div>'
        '<ul class="ivl-list" id="ivl-ep-list"></ul><div class="ivl-more" id="ivl-ep-more"></div></section>'
        '<section class="ivl-sec" id="ivl-songs" aria-labelledby="ivl-songs-h" hidden><div class="ivl-sec-head"><h2 id="ivl-songs-h">Saved songs</h2>'
        '<div class="ivl-sec-acts"><button type="button" class="ivl-btn ivl-btn-play" id="ivl-playsongs">' + I_PLAY + "<span>Play saved</span></button>"
        '<a class="ivl-btn" href="' + esc(url("/music")) + '">All songs</a></div></div>'
        '<ol class="ivm-list" id="ivm-list"></ol></section>'
        '<section class="ivl-sec" id="ivl-msgs" aria-labelledby="ivl-msgs-h" hidden><div class="ivl-sec-head"><h2 id="ivl-msgs-h">Saved messages</h2>'
        '<div class="ivl-sec-acts"><a class="ivl-btn" href="' + CHAT_SAVED + '" target="_blank" rel="noopener">Open in the chat</a></div></div>'
        '<ul class="ivl-list" id="ivl-msg-list"></ul><div class="ivl-more" id="ivl-msg-more"></div></section>'
        "</div>"
        '<p class="ivl-foot" id="ivl-foot" hidden>Private to you. Your library is kept on your account, so it is the same in the app and on the website.</p>'
        "</div>"

        # ---- anyone else: what the library is, and the way in ----
        '<div class="ivl-pitch">'
        '<ul class="ivl-perks">' + perks + "</ul>"
        '<div class="ivl-join" id="ivl-join">'
        '<div class="ivl-join-k" id="ivl-join-k">Members only</div>'
        '<h2 id="ivl-join-h">Your library comes with Plus+</h2>'
        '<p id="ivl-join-p">Every full, extended episode across InnerVerse and Inner Whirled, and a library of your own on the website and in the app. Cancel any time.</p>'
        '<div class="ivl-join-btns" id="ivl-join-btns">'
        '<a class="ivl-join-btn ivl-join-primary" href="' + TRIAL + '">Start your 7-day free trial<span>then $9 a month</span></a>'
        '<a class="ivl-join-btn" href="' + MONTHLY + '">Join for $9 a month</a>'
        '<a class="ivl-join-btn" href="' + YEARLY + '">Join for $100 a year<span>save $8</span></a>'
        "</div>"
        '<button type="button" class="ivl-join-login" id="ivl-login">Already a member? Log in</button>'
        "</div></div>"

        '<p class="ivm-status" id="ivm-status" role="status" aria-live="polite"></p>'
        "</div></main>"
        '<script type="application/json" id="ivm-data">' + json_ld(data) + "</script>"
    )
    return page(h, nav("") + body_html + footer(), cls,
                scripts=("/assets/site.js", "/assets/library-client.js", "/assets/music.js", "/assets/library.js"))


def headers():
    """Cloudflare Pages _headers lines: the page stays out of search by header as well as by tag."""
    return "".join(p + "\n  X-Robots-Tag: noindex, nofollow\n\n" for p in ("/library", "/library/*"))
