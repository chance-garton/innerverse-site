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
import sys

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

# Images copied off Squarespace into Cloudflare R2 (image move, stage 3).
# IMAGE_BASE is the one setting for where the copies are served from: the
# bucket's own address, images.innerversepodcast.com (live 2026-11-04).
# Override with IV_IMAGE_BASE if it ever moves.
IMAGE_BASE = os.environ.get("IV_IMAGE_BASE", "https://images.innerversepodcast.com").rstrip("/")
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "tools", "images"))
from migrate import key_for, normalise  # noqa: E402  (the same keys the copy tool used)

IMG_EXT = {"png": "p", "jpg": "j", "gif": "g", "webp": "w", "svg": "s"}
IMG_WIDTHS = [300, 500, 750, 1000, 1500]


def _load_image_map():
    path = os.path.join(ROOT_DIR, "data", "images", "map.json")
    if not os.path.exists(path):
        return {}
    out = {}
    for entry in json.load(open(path, encoding="utf-8")).values():
        out[entry["key"]] = (entry["ext"], sorted(entry.get("widths") or []))
    return out


IMAGES = _load_image_map()  # bucket key -> (original type, WebP widths that exist)


def img_key(u):
    """The bucket key for a Squarespace address (or an /s/ path), if copied.
    normalise() runs twice, as in the copy tool: a %2B in a file name only
    lines up with the map after the second pass."""
    u = str(u or "").strip()
    if u.startswith(IMAGE_BASE + "/"):
        # an address already on our own image host (Stage 5 links): the key is
        # the path between the base and the last slash, as in the browser twin
        r = re.split(r"[?#]", u[len(IMAGE_BASE) + 1:])[0]
        k = r[:r.rfind("/")] if "/" in r else ""
        return k if k in IMAGES else None
    if u.startswith("/s/"):
        u = LIVE_ORIGIN + u
    if not re.match(r"https?://(images\.squarespace-cdn\.com|static1\.squarespace\.com|(www\.)?innerversepodcast\.com/s/)", u):
        return None
    k = key_for(normalise(normalise(u)))
    return k if k in IMAGES else None


def img_file(k, width=None, original=False):
    """The R2 address for one copied image: the smallest WebP at least
    `width` wide, else the largest WebP; the original file when asked for, or
    when no WebP sizes exist (tiny images, GIF, SVG)."""
    ext, widths = IMAGES[k]
    if original or not widths:
        return IMAGE_BASE + "/" + k + "/orig." + ext
    pick = widths[-1]
    for w in widths:
        if w >= (width or widths[-1]):
            pick = w
            break
    return IMAGE_BASE + "/" + k + "/w" + str(pick) + ".webp"


def _asked_width(u):
    m = re.search(r"[?&](?:amp;)?format=(\d+)w", u) or re.search(r"/w(\d+)\.webp", u)
    return int(m.group(1)) if m else None


def iv_img(u, width=500):
    """Python twin of window.ivImg. A copied image comes back as its R2 file at
    the nearest width that exists; anything else as before: format= first,
    width snapped to a size the Squarespace CDN actually generates."""
    if not u:
        return ""
    u = str(u)
    k = img_key(u)
    if k:
        return img_file(k, width or _asked_width(u) or 500)
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


# Any copied Squarespace image address left in a finished page (templates,
# episode bodies, page data) is swapped for its R2 file: the width it asked
# for with format=, or the largest WebP when it asked for none.
_SQ_IMG = re.compile(r"https?://(?:images\.squarespace-cdn\.com|static1\.squarespace\.com)/[^\"'\s)<>\\]+")


def _swap(m):
    u = m.group(0)
    tail = ""
    for stop in ("&#39;", "&quot;", "&#x27;"):
        i = u.find(stop)
        if i != -1:
            u, tail = u[:i], u[i:] + tail
    k = img_key(html.unescape(u))
    if not k:
        return m.group(0)
    return img_file(k, _asked_width(u)) + tail


_PAGE_DATA = re.compile(r'(<script type="application/json"[^>]*>.*?</script>)', re.S)


def swap_images(text):
    """Page data (the JSON the scripts read) keeps its Squarespace addresses:
    the scripts map them with ivImg, and keep them as a fallback."""
    parts = _PAGE_DATA.split(text)
    return "".join(p if i % 2 else _SQ_IMG.sub(_swap, p) for i, p in enumerate(parts))


def image_table():
    """The lookup the browser needs, small: one entry per copied image, a
    32 bit hash of its bucket key, its original type and which widths exist."""
    out, seen = [], {}
    for k, (ext, widths) in sorted(IMAGES.items()):
        h = fnv(k)
        if h in seen:
            raise SystemExit("image map: hash clash between %s and %s" % (seen[h], k))
        seen[h] = k
        bits = sum(1 << i for i, w in enumerate(IMG_WIDTHS) if w in widths)
        out.append(_b36(h).rjust(7, "0") + IMG_EXT[ext] + _b36(bits))
    return "".join(out)


def fnv(s):
    h = 0x811C9DC5
    for ch in s.encode("utf-8"):
        h = ((h ^ ch) * 0x01000193) & 0xFFFFFFFF
    return h


def _b36(n):
    d = "0123456789abcdefghijklmnopqrstuvwxyz"
    s = ""
    while True:
        n, r = divmod(n, 36)
        s = d[r] + s
        if not n:
            return s


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
VR_LOGO = CDN + "b8217739-ae93-4527-bd8a-37d690f4296b/VIBRANT_LOGO.png"

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


def nav(active="", inner_whirled=False, vibe_rant=False):
    if vibe_rant:
        # 2026-11-05 (Chance): Vibe Rant pages keep the InnerVerse colours and
        # mark, with the Vibe Rant wordmark in place of the word INNERVERSE.
        brand = (
            '<img class="iv-nav-logo" src="' + esc(LOGO_URL) + '" alt="InnerVerse Podcast" width="48" height="48">'
            '<span class="iv-nav-word iv-nav-vr"><img class="iv-nav-vrmark" src="' + esc(iv_img(VR_LOGO, 500)) + '" alt="Vibe Rant" width="992" height="558"></span>'
        )
    elif inner_whirled:
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
        '<div class="iv-footer-bottom"><span class="iv-footer-copy">&copy; Chance Garton 2015 to 2026</span></div>'
        "</footer>"
    )


FONTS = (
    '<link rel="preconnect" href="' + IMAGE_BASE + '">'
    # The two faces used above the fold on every page; the rest load when a page needs them (src/css/00-fonts.css).
    '<link rel="preload" as="font" type="font/woff2" crossorigin href="' + url("/assets/fonts/fjalla-one-normal-latin.woff2") + '">'
    '<link rel="preload" as="font" type="font/woff2" crossorigin href="' + url("/assets/fonts/manrope-normal-latin.woff2") + '">'
)
FONT_IW = ""  # IM Fell Great Primer is declared in src/css/00-fonts.css and loads only where the Inner Whirled skin uses it.

# Runs before first paint: the page classes, the cached Plus member answer (so
# a member's gold nav and member cards paint from the first frame, as
# iv-nav-plus-precheck did), and ivImg for every script after it.
HEAD_SCRIPT = r"""<script>
(function(){var r=document.documentElement;
try{if(localStorage.getItem('iv_session_token')&&localStorage.getItem('iv_plus_entitled')==='yes')r.classList.add('iv-plus-member');}catch(e){}
var S=[100,300,500,750,1000,1500,2500];
var IB=%s,IE={p:'png',j:'jpg',g:'gif',w:'webp',s:'svg'},IW=[300,500,750,1000,1500],IT=null;
function itab(){if(IT)return IT;var s=window.IV_IMG_T;if(!s)return null;IT={};for(var i=0;i+9<=s.length;i+=9)IT[s.substr(i,7)]=s.substr(i+7,2);return IT;}
function inrm(u){var m=/^(?:https?:)?\/\/([^\/?#]*)([^?#]*)/i.exec(u);if(!m)return'';var p=m[2].replace(/\+/g,' ');try{p=decodeURIComponent(p);}catch(e){}return'https://'+m[1].toLowerCase()+p;}
function icl(s){s=s.toLowerCase().replace(/\.[a-z0-9]{2,4}$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return s||'image';}
function ikey(u){if(u.indexOf(IB+'/')===0){var r=u.slice(IB.length+1).split(/[?#]/)[0];return r.slice(0,r.lastIndexOf('/'));}
var n=inrm(inrm(u)),m=/^https:\/\/([^\/]*)(.*)$/.exec(n);if(!m||!/^(images\.squarespace-cdn\.com|static1\.squarespace\.com)$/.test(m[1]))return'';
var a=m[2].split('/').filter(Boolean);if(!a.length)return'';var ids=a.slice(0,-1).filter(function(x){return x!=='content'&&x!=='v1'&&x!=='static'&&x!=='5987d897cf81e0278ec5322e';}).map(icl).join('-');return'sq/'+(ids||'x')+'/'+icl(a[a.length-1]);}
function ihash(k){var h=0x811c9dc5;for(var i=0;i<k.length;i++){h^=k.charCodeAt(i)&255;h=Math.imul(h,0x01000193)>>>0;}return('0000000'+h.toString(36)).slice(-7);}
window.ivImgR2=function(u,w){var t=itab();if(!t)return'';var k=ikey(u);if(!k)return'';var e=t[ihash(k)];if(!e)return'';
if(!w){var f=/[?&]format=(\d+)w/.exec(u)||/\/w(\d+)\.webp/.exec(u);w=f?+f[1]:500;}var b=parseInt(e.charAt(1),36),ws=[];for(var i=0;i<IW.length;i++)if(b&(1<<i))ws.push(IW[i]);
if(!ws.length)return IB+'/'+k+'/orig.'+IE[e.charAt(0)];var x=ws[ws.length-1];for(i=0;i<ws.length;i++){if(ws[i]>=w){x=ws[i];break;}}return IB+'/'+k+'/w'+x+'.webp';};
window.ivImgSq=function(u,w){if(!u)return'';u=String(u);if(u.indexOf('images.squarespace-cdn.com')===-1)return u;var x=S[S.length-1];for(var i=0;i<S.length;i++){if(S[i]>=(w||500)){x=S[i];break;}}var p=u.split('?');var rest=(p[1]||'').split('&').filter(function(kv){return kv&&kv.indexOf('format=')!==0;});return p[0]+'?format='+x+'w'+(rest.length?'&'+rest.join('&'):'');};
window.ivImg=function(u,w){if(!u)return'';return window.ivImgR2(String(u),w)||window.ivImgSq(u,w);};
window.IV_BASE=%s;window.ivPath=function(){var b=window.IV_BASE,p=location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length);p=p.replace(/\/index\.html$/,'/').replace(/\.html$/,'');return p||'/';};if(window.IV_BASE)document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="/"]');if(!a)return;var h=a.getAttribute('href');if(h.indexOf('//')===0||h.indexOf(window.IV_BASE+'/')===0||h===window.IV_BASE)return;a.setAttribute('href',window.IV_BASE+h);},true);})();
</script>"""


# Visitor counter (2026-11-03): Cloudflare Web Analytics for www.innerversepodcast.com, no cookies.
# Left out of test-address builds (IV_NOINDEX=1) so the counts hold real visits only. The token is public by design.
ANALYTICS = ('<script defer src="https://static.cloudflareinsights.com/beacon.min.js" '
             'data-cf-beacon=\'{"token": "cebe8e3f9775468fb1df77995875a1a2"}\'></script>')


def head(title, description, canonical, image="", og_type="website", html_class="", inner_whirled=False, extra=""):
    robots = '<meta name="robots" content="noindex, nofollow">' if NOINDEX else '<meta name="robots" content="index, follow, max-image-preview:large">'
    k = img_key(image) if image else None
    img = img_file(k, original=True) if k else (iv_img(image, 1500) if image else "")
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
        HEAD_SCRIPT % (json.dumps(IMAGE_BASE), json.dumps(BASE)),
        ANALYTICS if not NOINDEX else "",
        extra,
    ]
    return "<head>" + "".join(p for p in parts if p) + "</head>"


def page(head_html, body_html, html_class="", scripts=()):
    if scripts:
        scripts = ("/assets/img-map.js",) + tuple(scripts)
    tags = "".join('<script src="' + url(s) + "?v=" + ASSET_VERSION + '" defer></script>' for s in scripts)
    return (
        "<!doctype html>\n"
        '<html lang="en"' + (' class="' + html_class + '"' if html_class else "") + ">"
        + swap_images(head_html) + "<body>" + swap_images(body_html) + tags + "</body></html>\n"
    )
