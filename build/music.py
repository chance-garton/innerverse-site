"""The InnerVerse Music page (/music), added 2026-11-25.

The songs were app only until now. The list is the app's own file,
songs/songs.json in chance-garton/inner-circle (served at
https://circle.innerversepodcast.com/songs/songs.json): original songs made for
episodes, free for everyone, kept in the order shown (episode air date, newest
first, track order within an episode). The build reads the live file and falls
back to the copy in data/songs.json, so every song is in the served page for
search engines and for a browser with scripts off. src/js/music.js then asks for
the live file again, so a song added after the last build still shows.

Audio plays from https://audio.innerversepodcast.com/songs/<file>. A song's
link is /music?song=<id>.
"""
import json
import os
import urllib.request

from common import LIVE_ORIGIN, esc, footer, head, iv_img, json_ld, nav, page, url

SONGS_URL = "https://circle.innerversepodcast.com/songs/songs.json"
AUDIO_BASE = "https://audio.innerversepodcast.com/songs/"
HERE = os.path.dirname(os.path.abspath(__file__))
SNAPSHOT = os.path.join(HERE, "..", "data", "songs.json")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

I_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"></path></svg>'
I_SHUFFLE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"></path><path d="M4 20 21 3"></path><path d="M21 16v5h-5"></path><path d="m15 15 6 6"></path><path d="m4 4 5 5"></path></svg>'
I_NOTE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>'
I_LINK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"></path><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"></path></svg>'


def load_songs():
    """The live list, or the copy in the repo when the live file cannot be had."""
    try:
        req = urllib.request.Request(SONGS_URL, headers={"User-Agent": "innerverse-site-build"})
        with urllib.request.urlopen(req, timeout=12) as r:
            d = json.loads(r.read().decode("utf-8"))
        songs = d.get("songs") or []
        if songs:
            return songs, "live"
    except Exception:
        pass
    with open(SNAPSHOT, encoding="utf-8") as f:
        return (json.load(f).get("songs") or []), "snapshot"


def clock(sec):
    sec = int(sec or 0)
    return "%d:%02d" % (sec // 60, sec % 60)


def total_text(songs):
    """59 songs, 3 hr 11 min: counted from the list itself, so it is never a guess."""
    sec = sum(int(s.get("seconds") or 0) for s in songs)
    h, m = sec // 3600, round((sec % 3600) / 60)
    if m == 60:
        h, m = h + 1, 0
    run = (str(h) + " hr " if h else "") + str(m) + " min"
    return str(len(songs)) + (" song" if len(songs) == 1 else " songs"), run


def month_year(d):
    p = str(d or "").split("-")
    try:
        return MONTHS[int(p[1]) - 1] + " " + p[0]
    except Exception:
        return ""


def row(s, n, dates):
    sid, title = s["id"], s.get("title") or ""
    ep, ep_title = s.get("episode") or "", s.get("episodeTitle") or ""
    art = iv_img(s.get("art") or "", 300)
    cover = ('<img class="ivm-cover" src="' + esc(art) + '" alt="" width="56" height="56" loading="lazy" decoding="async">'
             if art else '<span class="ivm-cover ivm-cover-none"></span>')
    return (
        '<li class="ivm-row" data-id="' + esc(sid) + '">'
        '<button type="button" class="ivm-play" aria-label="Play ' + esc(title) + '"><span class="ivm-num">' + str(n) + "</span>"
        '<span class="ivm-ico">' + I_PLAY + '</span><span class="ivm-eq" aria-hidden="true"><i></i><i></i><i></i></span></button>'
        + cover +
        '<div class="ivm-main"><span class="ivm-title">' + esc(title) + "</span>"
        '<a class="ivm-ep" href="' + esc(url("/episodes/" + ep)) + '">' + esc(ep_title) + "</a></div>"
        '<span class="ivm-date">' + esc(month_year(dates.get(ep))) + "</span>"
        '<span class="ivm-acts"><button type="button" class="ivm-act ivm-share" aria-label="Copy a link to ' + esc(title) + '">' + I_LINK + "</button></span>"
        '<span class="ivm-len">' + clock(s.get("seconds")) + "</span>"
        "</li>"
    )


def build(episodes):
    """episodes: the free index's list (slug, date, thumb), for each song's air date."""
    songs, source = load_songs()
    dates = {e["slug"]: e.get("date") or "" for e in episodes}
    title = "InnerVerse Music | Original Songs from the InnerVerse Podcast"
    desc = ("Listen free to InnerVerse Music: original songs made for episodes of the InnerVerse podcast. "
            "Press play, then follow any song into the conversation behind it.")
    canonical = LIVE_ORIGIN + "/music"
    count, run = total_text(songs)
    first_art = (songs[0].get("art") if songs else "") or ""
    tracks = []
    for s in songs:
        sec = int(s.get("seconds") or 0)
        t = {"@type": "MusicRecording", "name": s.get("title") or "", "url": canonical + "?song=" + s["id"],
             "duration": "PT%dM%dS" % (sec // 60, sec % 60), "byArtist": {"@id": LIVE_ORIGIN + "/#podcast"}}
        if s.get("art"):
            t["image"] = s["art"]
        tracks.append(t)
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "MusicPlaylist", "@id": canonical + "#playlist", "url": canonical, "name": "InnerVerse Music",
             "description": desc, "numTracks": len(songs), "isAccessibleForFree": True,
             "isPartOf": {"@id": LIVE_ORIGIN + "/#website"}, "creator": {"@id": LIVE_ORIGIN + "/#chance"}, "track": tracks},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": LIVE_ORIGIN + "/"},
                {"@type": "ListItem", "position": 2, "name": "InnerVerse Music", "item": canonical}]},
        ],
    }
    data = {"songs": songs, "dates": {s["episode"]: dates.get(s["episode"], "") for s in songs if s.get("episode")},
            "audio": AUDIO_BASE, "live": SONGS_URL}
    hero_art = iv_img(first_art, 750)
    body_html = (
        '<main id="iv-main"><div class="ivm" id="iv-music">'
        '<header class="ivm-hero"><div class="ivm-hero-text">'
        '<div class="ivm-kicker">' + I_NOTE + "<span>Original music</span></div>"
        "<h1>InnerVerse Music</h1>"
        '<p class="ivm-lede">Original songs made for InnerVerse episodes. Press play, then follow any song into the conversation behind it.</p>'
        '<p class="ivm-meta"><span id="ivm-count">' + count + '</span><span class="ivm-dot"></span><span id="ivm-run">' + run + '</span><span class="ivm-dot"></span><span>Free for everyone</span></p>'
        '<div class="ivm-btns"><button type="button" class="ivm-btn ivm-btn-primary" id="ivm-playall">' + I_PLAY + "<span>Play all</span></button>"
        '<button type="button" class="ivm-btn ivm-btn-secondary" id="ivm-shuffle">' + I_SHUFFLE + "<span>Shuffle</span></button></div>"
        "</div>"
        '<div class="ivm-hero-art"><div class="ivm-hero-frame">'
        + ('<img id="ivm-hero-img" src="' + esc(hero_art) + '" alt="" width="320" height="320" decoding="async">' if hero_art else "") +
        '</div><div class="ivm-hero-cap"><span class="ivm-hero-k" id="ivm-hero-k">Newest song</span>'
        '<span class="ivm-hero-t" id="ivm-hero-t">' + esc(songs[0].get("title") if songs else "") + "</span></div></div>"
        "</header>"
        '<ol class="ivm-list" id="ivm-list">' + "".join(row(s, i + 1, dates) for i, s in enumerate(songs)) + "</ol>"
        '<p class="ivm-status" id="ivm-status" role="status" aria-live="polite"></p>'
        "</div></main>"
        '<script type="application/json" id="ivm-data">' + json_ld(data) + "</script>"
    )
    cls = "iv-music-page"
    h = head(title, desc, canonical, first_art, "website", cls, extra='<script type="application/ld+json">' + json_ld(ld) + "</script>")
    html = page(h, nav("music") + body_html + footer(), cls, scripts=("/assets/site.js", "/assets/music.js"))
    return html, {"songs": len(songs), "source": source}
