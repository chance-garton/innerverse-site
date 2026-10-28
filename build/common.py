"""Shared pieces for every page the generator writes: escaping, image
sizing, the head, the nav and the footer.

The nav and footer markup is the same markup the old iv-site-nav script drew
into every Squarespace page (v2 nav), now written into the HTML itself so a
crawler sees every link without running anything. assets/site.js wires the
burger, the scroll shrink and the member state on top of it.
"""

import html
import json
import os
import re

LIVE_ORIGIN = "https://www.innerversepodcast.com"
CDN = "https://images.squarespace-cdn.com/content/5987d897cf81e0278ec5322e/"

# Where the built site is served from. "" for the real domain; "/innerverse-site"
# for the GitHub Pages test address. Every internal link and asset goes through
# url() so the same build works at either.
BASE = os.environ.get("IV_BASE", "").rstrip("/")
# A test build tells search engines to stay away, so the copy at the test
# address can never compete with the live pages it duplicates.
NOINDEX = os.environ.get("IV_NOINDEX", "") == "1"
# Bumped by the build so a changed stylesheet or script is never served stale.
ASSET_VERSION = os.environ.get("IV_ASSET_VERSION", "dev")


def esc(s):
    """Same escaping as the old render script's esc()."""
    if s is None:
        return ""
    return html.escape(str(s), quote=True).replace("&#x27;", "&#39;")


def esc_em(s):
    """*asterisked* spans become <em>, as escEm() did."""
    return re.sub(r"\*([^*]+)\*", r"<em>\1</em>", esc(s))


def url(path):
    """An internal path on this site, with the base prefix for a test build."""
    if not path.startswith("/"):
        return path
    return BASE + path


STEPS = [100, 300, 500, 750, 1000, 1500, 2500]


def iv_img(u, width=500):
    """Python twin of window.ivImg: format= first, width snapped to a size the
    Squarespace CDN actually generates. Anything else comes back untouched."""
    if not u:
        return ""
    u = str(u)
    if "images.squarespace-cdn.com" not in u:
        return u
    w = STEPS[-1]
    for s in STEPS:
        if s >= (width or 500):
            w = s
            break
    base, _, query = u.partition("?")
    rest = [kv for kv in query.split("&") if kv and not kv.startswith("format=")]
    return base + "?format=" + str(w) + "w" + ("&" + "&".join(rest) if rest else "")


def json_ld(obj):
    """A JSON-LD script body that cannot close its own script tag early."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def plain(s, limit=None):
    """Collapse whitespace; optionally cut at a word boundary for meta text."""
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    if limit and len(s) > limit:
        cut = s[: limit - 1]
        cut = cut[: cut.rfind(" ")] if " " in cut else cut
        s = cut.rstrip(",;:.") + "…"
    return s


LOGO_URL = CDN + "9a710a85-f780-4b67-a4c7-2b45690b6006/2025-Electric-Logo-2026.png?format=300w&content-type=image%2Fpng"
IW_MARK = CDN + "a39095cd-b9d2-444d-b4e2-14a2484d766d/Inner-Whirled-Logo.png?format=300w"

V2_LINKS = [
    ("podcast", "Episodes", "/episodes"),
    ("plus", "Plus+", "/plus"),
    ("circle", "Inner Circle", "https://circle.innerversepodcast.com/"),
    ("app", "App", "https://circle.innerversepodcast.com/app/"),
    ("about", "About", "/about"),
    ("tuning", "Get Tuned", "/biofield-tuning"),
]
ICON_SEARCH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>'
ICON_PERSON = '<svg class="iv-nav-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 4-6 8-6s8 2 8 6"></path></svg>'
ICON_BOLT = '<svg class="iv-nav-bolt" viewBox="0 0 16 18" width="15" height="17" fill="currentColor" aria-hidden="true"><path d="M9.6 0 1 10.2h5.6L5.4 18 15 6.9H9.2z"></path></svg>'


def _link(key, label, href, active):
    tuned = key == "tuning"
    cls = "iv-nav-link" + (" iv-nav-tuned" if tuned else "") + (" iv-nav-active" if key == active else "")
    return '<a href="' + esc(url(href)) + '" class="' + cls + '" data-key="' + key + '">' + (ICON_BOLT if tuned else "") + label + "</a>"


def _login():
    return (
        '<div class="iv-nav-account-wrap">'
        '<button type="button" class="iv-nav-link iv-nav-login" data-key="login" aria-label="Log in">'
        '<span class="iv-nav-login-label">Log in</span>'
        '<span class="iv-nav-face">' + ICON_PERSON + "</span>"
        "</button>"
        '<div class="iv-nav-account-menu">'
        '<a class="iv-nav-account-item" data-act="settings" href="https://innerverseplus.memberful.com/account">Settings</a>'
        '<button type="button" class="iv-nav-account-item" data-act="logout">Logout</button>'
        "</div></div>"
    )


def nav(active="", inner_whirled=False):
    if inner_whirled:
        brand = (
            '<img class="iv-nav-logo" src="' + esc(IW_MARK) + '" alt="Inner Whirled" width="48" height="48">'
            '<span class="iv-nav-word"><span class="iw-inner">Inner</span><span class="iw-whirled">Whirled</span></span>'
        )
    else:
        brand = (
            '<img class="iv-nav-logo" src="' + esc(LOGO_URL) + '" alt="InnerVerse Podcast" width="48" height="48">'
            '<span class="iv-nav-word">InnerVerse</span>'
        )
    links = "".join(_link(k, l, h, active) for k, l, h in V2_LINKS)
    join = '<a href="' + esc(url("/plus")) + '" class="iv-nav-join">Join Plus+</a>'
    return (
        '<div id="iv-nav" class="iv-nav-v2"><div class="iv-nav-inner">'
        '<a href="' + esc(url("/")) + '" class="iv-nav-brand" aria-label="InnerVerse Podcast home">' + brand + "</a>"
        '<nav class="iv-nav-side iv-nav-center" aria-label="Main">' + links + "</nav>"
        '<div class="iv-nav-actions">'
        '<a href="' + esc(url("/episodes")) + '" class="iv-nav-search" aria-label="Search episodes">' + ICON_SEARCH + "</a>"
        + _login() + join +
        '<button class="iv-nav-burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>'
        "</div></div>"
        '<div class="iv-nav-mobile-panel">' + links + _login() + join + "</div>"
        "</div>"
    )


FOOTER_COLS = [
    ("Listen &amp; Watch", [
        ("All Episodes", "/episodes", False),
        ("InnerVerse App", "https://circle.innerversepodcast.com/app/", False),
        ("YouTube", "https://www.youtube.com/@InnerVersePodcast", True),
        ("Apple Podcasts", "https://podcasts.apple.com/us/podcast/innerverse/id1066918535", True),
        ("Rumble", "https://rumble.com/c/InnerVerse", True),
        ("Spotify", "https://open.spotify.com/show/3PtsUrYFJiradha3biNf9Y", True),
    ]),
    ("Join Plus+", [
        ("InnerVerse Plus+", "/plus", False),
        ("Inner Circle", "https://circle.innerversepodcast.com/", False),
        ("Members Log In", None, False),
        ("Patreon", "https://www.patreon.com/innerverse", True),
        ("Substack", "https://innerversepodcast.substack.com", True),
        ("YouTube", "https://www.youtube.com/@InnerVersePodcast/join", True),
    ]),
    ("Connect", [
        ("Sessions with Chance", "/biofield-tuning", False),
        ("Contact Chance", "/contact", False),
        ("Instagram", "https://www.instagram.com/innerversepodcast/", True),
        ("Telegram", "https://t.me/innerversepodcast", True),
        ("Group Chat", "https://t.me/+iZBaVmVvxZ05NjQx", True),
    ]),
]


def footer():
    cols = ""
    for head, links in FOOTER_COLS:
        items = ""
        for label, href, ext in links:
            if href is None:
                items += '<button type="button" class="iv-footer-link iv-footer-login">' + label + "</button>"
            else:
                items += '<a href="' + esc(url(href)) + '" class="iv-footer-link"' + (' target="_blank" rel="noopener"' if ext else "") + ">" + label + "</a>"
        cols += '<div class="iv-footer-col"><div class="iv-footer-col-head">' + head + "</div>" + items + "</div>"
    return (
        '<footer id="iv-footer"><div class="iv-footer-inner"><div class="iv-footer-brand">'
        '<h2 class="iv-footer-title">InnerVerse <span class="iv-footer-accent">with Chance Garton</span></h2>'
        '<p class="iv-footer-tagline">A podcast dedicated to prying open your third ear<br>so you can stay in perpetual synchronicity.</p>'
        '</div><div class="iv-footer-cols">' + cols + "</div></div>"
        '<div class="iv-footer-rule"></div>'
        '<div class="iv-footer-bottom"><span class="iv-footer-copy">&copy; Chance Garton 2016 to 2026</span></div>'
        "</footer>"
    )


FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link rel="preconnect" href="https://images.squarespace-cdn.com">'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fjalla+One&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Manrope:wght@400;500;600;700;800&display=swap">'
)
FONT_IW = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+Great+Primer:ital@0;1&display=swap">'

# Runs before first paint: the page classes, the cached Plus member answer (so
# a member's gold nav and member cards paint from the first frame, as
# iv-nav-plus-precheck did), and ivImg for every script after it.
HEAD_SCRIPT = r"""<script>
(function(){var r=document.documentElement;
try{if(localStorage.getItem('iv_session_token')&&localStorage.getItem('iv_plus_entitled')==='yes')r.classList.add('iv-plus-member');}catch(e){}
var S=[100,300,500,750,1000,1500,2500];
window.ivImg=function(u,w){if(!u)return'';u=String(u);if(u.indexOf('images.squarespace-cdn.com')===-1)return u;var x=S[S.length-1];for(var i=0;i<S.length;i++){if(S[i]>=(w||500)){x=S[i];break;}}var p=u.split('?');var rest=(p[1]||'').split('&').filter(function(kv){return kv&&kv.indexOf('format=')!==0;});return p[0]+'?format='+x+'w'+(rest.length?'&'+rest.join('&'):'');};
window.IV_BASE=%s;window.ivPath=function(){var b=window.IV_BASE,p=location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length);p=p.replace(/\/index\.html$/,'/').replace(/\.html$/,'');return p||'/';};if(window.IV_BASE)document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="/"]');if(!a)return;var h=a.getAttribute('href');if(h.indexOf('//')===0||h.indexOf(window.IV_BASE+'/')===0||h===window.IV_BASE)return;a.setAttribute('href',window.IV_BASE+h);},true);})();
</script>"""


def head(title, description, canonical, image="", og_type="website", html_class="", inner_whirled=False, extra=""):
    robots = '<meta name="robots" content="noindex, nofollow">' if NOINDEX else '<meta name="robots" content="index, follow, max-image-preview:large">'
    img = iv_img(image, 1500) if image else ""
    parts = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>" + esc(title) + "</title>",
        '<meta name="description" content="' + esc(description) + '">',
        '<link rel="canonical" href="' + esc(canonical) + '">',
        robots,
        '<meta property="og:site_name" content="InnerVerse">',
        '<meta property="og:type" content="' + og_type + '">',
        '<meta property="og:title" content="' + esc(title) + '">',
        '<meta property="og:description" content="' + esc(description) + '">',
        '<meta property="og:url" content="' + esc(canonical) + '">',
    ]
    if img:
        parts += [
            '<meta property="og:image" content="' + esc(img) + '">',
            '<meta name="twitter:image" content="' + esc(img) + '">',
        ]
    parts += [
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(title) + '">',
        '<meta name="twitter:description" content="' + esc(description) + '">',
        '<meta name="theme-color" content="#0A0F1C">',
        '<link rel="icon" href="' + esc(iv_img(LOGO_URL, 100)) + '">',
        FONTS,
        FONT_IW if inner_whirled else "",
        '<link rel="stylesheet" href="' + url("/assets/site.css") + "?v=" + ASSET_VERSION + '">',
        HEAD_SCRIPT % json.dumps(BASE),
        extra,
    ]
    return "<head>" + "".join(p for p in parts if p) + "</head>"


def page(head_html, body_html, html_class="", scripts=()):
    tags = "".join('<script src="' + url(s) + "?v=" + ASSET_VERSION + '" defer></script>' for s in scripts)
    return (
        "<!doctype html>\n"
        '<html lang="en"' + (' class="' + html_class + '"' if html_class else "") + ">"
        + head_html + "<body>" + body_html + tags + "</body></html>\n"
    )
