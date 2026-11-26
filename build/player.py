"""The pop-out player (/player), added 2026-11-26.

A small window a desktop listener opens from the Music bar or from an episode's
player (the Pop out button), so the sound carries on while the main tab is used
for browsing. The page is an empty frame: src/js/player.js fills it from what
the opening tab handed over (localStorage "iv_pop") and from the Continue
listening record (src/js/listen.js), which it keeps up to date as it plays.
Nothing about an episode or a member is in the served page.

No header or footer: it is a window, not a page of the site. Always noindex
and never in the sitemap.
"""
from common import LIVE_ORIGIN, NAV_LOGO, esc, head, page, url

I_PLAY = '<svg class="ivp-i-play" viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"></path></svg>'
I_PAUSE = '<svg class="ivp-i-pause" viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"></rect><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"></rect></svg>'
I_BACK = ('<svg class="ivp-i-ep" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path>'
          '<text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Manrope,Arial,sans-serif">15</text></svg>')
I_FWD = ('<svg class="ivp-i-ep" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<path d="M21 12a9 9 0 1 1-3-6.7"></path><path d="M21 4v5h-5"></path>'
         '<text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Manrope,Arial,sans-serif">15</text></svg>')
I_PREV = '<svg class="ivp-i-song" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 6.2v11.6a1 1 0 0 1-1.55.83L9.6 12.83a1 1 0 0 1 0-1.66l8.85-5.8A1 1 0 0 1 20 6.2z"></path></svg>'
I_NEXT = '<svg class="ivp-i-song" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 6.2v11.6a1 1 0 0 0 1.55.83l8.85-5.8a1 1 0 0 0 0-1.66l-8.85-5.8A1 1 0 0 0 4 6.2z"></path></svg>'
I_SHUFFLE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"></path><path d="M4 20 21 3"></path><path d="M21 16v5h-5"></path><path d="m15 15 6 6"></path><path d="m4 4 5 5"></path></svg>'
I_VOL = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"></path><path class="ivp-vol-on" d="M15.5 9a4 4 0 0 1 0 6"></path><path class="ivp-vol-on" d="M18 6.5a7.5 7.5 0 0 1 0 11"></path>'
         '<path class="ivp-vol-off" d="m16 9.5 5 5M21 9.5l-5 5"></path></svg>')
I_OUT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"></path><path d="M20 4 11 13"></path><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"></path></svg>'


def build():
    title = "InnerVerse player"
    desc = "The InnerVerse pop-out player: an episode or a song keeps playing in a small window while you browse."
    cls = "iv-player-page"
    h = head(title, desc, LIVE_ORIGIN + "/player", "", "website", cls)
    # A window, not a page of the site: never listed, on every build.
    h = h.replace('content="index, follow, max-image-preview:large"', 'content="noindex, nofollow"')
    body_html = (
        '<main class="ivp is-empty" id="ivp">'
        '<header class="ivp-top">'
        '<a class="ivp-brand" href="' + esc(url("/")) + '" target="_blank" rel="noopener" aria-label="InnerVerse home, in a new tab">'
        '<img src="' + esc(NAV_LOGO) + '" alt="" width="28" height="28"><span>INNERVERSE</span></a>'
        '<span class="ivp-tag" id="ivp-tag">Player</span>'
        "</header>"

        '<div class="ivp-art"><img id="ivp-img" alt="" decoding="async"></div>'
        '<div class="ivp-meta">'
        '<div class="ivp-k" id="ivp-k"></div>'
        '<h1 class="ivp-t" id="ivp-t">InnerVerse player</h1>'
        '<div class="ivp-s" id="ivp-s"></div>'
        "</div>"

        '<div class="ivp-seek">'
        '<input type="range" class="ivp-range" id="ivp-range" min="0" max="100" step="1" value="0" aria-label="Position">'
        '<div class="ivp-times"><span id="ivp-now">0:00</span><span id="ivp-all">0:00</span></div>'
        "</div>"

        '<div class="ivp-ctl">'
        '<button type="button" class="ivp-b ivp-side ivp-speed" id="ivp-speed" aria-label="Playback speed">1x</button>'
        '<button type="button" class="ivp-b ivp-side ivp-shuf" id="ivp-shuf" aria-pressed="false" aria-label="Shuffle">' + I_SHUFFLE + "</button>"
        '<button type="button" class="ivp-b ivp-skip" id="ivp-prev" aria-label="Back 15 seconds">' + I_BACK + I_PREV + "</button>"
        '<button type="button" class="ivp-pp" id="ivp-pp" aria-label="Play">' + I_PLAY + I_PAUSE + "</button>"
        '<button type="button" class="ivp-b ivp-skip" id="ivp-next" aria-label="Forward 15 seconds">' + I_FWD + I_NEXT + "</button>"
        '<button type="button" class="ivp-b ivp-side ivp-mute" id="ivp-mute" aria-pressed="false" aria-label="Mute">' + I_VOL + "</button>"
        "</div>"

        '<p class="ivp-note" id="ivp-note" role="status" aria-live="polite"></p>'

        '<div class="ivp-foot">'
        '<a class="ivp-open" id="ivp-open" href="' + esc(url("/episodes")) + '" target="_blank" rel="noopener">' + I_OUT + '<span id="ivp-open-t">Open the episode page</span></a>'
        '<label class="ivp-vol"><span class="ivp-sr">Volume</span>'
        '<input type="range" class="ivp-range ivp-volr" id="ivp-vol" min="0" max="1" step="0.01" value="1" aria-label="Volume"></label>'
        "</div>"

        # ---- nothing handed over and nothing to pick up ----
        '<div class="ivp-none" id="ivp-none">'
        "<p>Nothing is playing. Press Pop out on an episode's player or on the Music bar, and it plays here while you browse.</p>"
        '<div class="ivp-none-btns">'
        '<a class="ivp-btn ivp-btn-main" href="' + esc(url("/episodes")) + '" target="_blank" rel="noopener">Browse episodes</a>'
        '<a class="ivp-btn" href="' + esc(url("/music")) + '" target="_blank" rel="noopener">InnerVerse Music</a>'
        "</div></div>"
        "</main>"
    )
    return page(h, body_html, cls, scripts=("/assets/listen.js", "/assets/player.js"))


def headers():
    """Cloudflare Pages _headers lines: the window stays out of search by header as well as by tag."""
    return "".join(p + "\n  X-Robots-Tag: noindex, nofollow\n\n" for p in ("/player", "/player/*"))
