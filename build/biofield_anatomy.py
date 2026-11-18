"""The Biofield Anatomy map at /biofield-anatomy.

A full-screen page of its own, without the site's header and footer: the map needs the whole screen,
most of all on a phone. It is the built viewer from tools/biofield-anatomy:

- the page:      tools/biofield-anatomy/viewer/src/index.html, with its three preview script tags swapped for the site's
- the code:      tools/biofield-anatomy/site/viewer.js (the built bundle; rebuild it with checks/build_viewer.sh and copy
                 viewer/dist/viewer.js there after any change to the viewer's code)
- the 3D body:   tools/biofield-anatomy/viewer/model/body.glb
- the wording:   NOT in this repo (it paraphrases copyrighted books and the repo is public). It loads from the image
                 bucket at CONTENT_URL. A wording change is a new dated file in the bucket and a new CONTENT_URL here.

- the share picture: tools/biofield-anatomy/site/share.jpg, 1200 by 630, shown when the page's link is sent in a text or
                 posted (the og: and twitter: tags below). It is drawn from the real viewer by tools/biofield-anatomy/checks/share.mjs;
                 draw it again when the opening view changes.

HIDDEN keeps the page out of search engines and the sitemap until the public launch. Link previews do not depend on it.
"""

import hashlib
import html as html_lib
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOL = os.path.join(ROOT, "tools", "biofield-anatomy")

CONTENT_URL = "https://images.innerversepodcast.com/biofield-anatomy/content-2026-11-18.js"
HIDDEN = True
PATH = "/biofield-anatomy"
ORIGIN = "https://www.innerversepodcast.com"
# What a text message or a social post shows for the page's link: the picture, this title and this line.
SHARE_TITLE = "Biofield Anatomy: Interactive 3D Map"
SHARE_TEXT = ("Explore the body, the chakras, the zodiac and the field around you in 3D, "
              "with the emotions and patterns Biofield Tuning reads in each place.")
SHARE_ALT = "A glowing human figure in the colors of the chakras, each center labeled, with the Sun Star above and the Earth Star below."

PREVIEW_TAGS = ('<script src="content.js"></script>\n<script src="model.js"></script>\n'
                '<script type="module" src="viewer.js"></script>')


def _ver(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()[:10]


def build(out):
    """Write the page and its two files into out (the site's dist folder). Returns the page's HTML."""
    viewer = os.path.join(TOOL, "site", "viewer.js")
    model = os.path.join(TOOL, "viewer", "model", "body.glb")
    with open(os.path.join(TOOL, "viewer", "src", "index.html"), encoding="utf-8") as fh:
        html = fh.read()
    assert html.count(PREVIEW_TAGS) == 1, "the viewer page no longer carries the three preview script tags"
    base = PATH + "/"
    html = html.replace(PREVIEW_TAGS,
                        '<script src="' + CONTENT_URL + '"></script>\n'
                        '<script>window.__BFA_MODEL_URL="' + base + 'body.glb?v=' + _ver(model) + '";</script>\n'
                        '<script type="module" src="' + base + 'viewer.js?v=' + _ver(viewer) + '"></script>')
    meta = '<meta name="viewport" content="width=device-width, initial-scale=1">'
    assert html.count(meta) == 1
    share = os.path.join(TOOL, "site", "share.jpg")
    e = lambda t: html_lib.escape(t, quote=True)
    url, img = ORIGIN + PATH, ORIGIN + base + "share.jpg?v=" + _ver(share)
    tags = [
        '<meta name="description" content="' + e(SHARE_TEXT) + '">',
        '<meta property="og:site_name" content="InnerVerse">',
        '<meta property="og:type" content="website">',
        '<meta property="og:title" content="' + e(SHARE_TITLE) + '">',
        '<meta property="og:description" content="' + e(SHARE_TEXT) + '">',
        '<meta property="og:url" content="' + url + '">',
        '<meta property="og:image" content="' + img + '">',
        '<meta property="og:image:type" content="image/jpeg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="' + e(SHARE_ALT) + '">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + e(SHARE_TITLE) + '">',
        '<meta name="twitter:description" content="' + e(SHARE_TEXT) + '">',
        '<meta name="twitter:image" content="' + img + '">',
        '<meta name="twitter:image:alt" content="' + e(SHARE_ALT) + '">',
    ]
    if HIDDEN:
        tags.insert(0, '<meta name="robots" content="noindex, nofollow">')
    html = html.replace(meta, meta + "\n" + "\n".join(tags))
    dest = os.path.join(out, PATH.strip("/"))
    os.makedirs(dest, exist_ok=True)
    shutil.copyfile(share, os.path.join(dest, "share.jpg"))
    shutil.copyfile(viewer, os.path.join(dest, "viewer.js"))
    shutil.copyfile(model, os.path.join(dest, "body.glb"))
    return html


def headers():
    """Extra lines for the site's _headers file."""
    if not HIDDEN:
        return ""
    return "".join(p + "\n  X-Robots-Tag: noindex, nofollow\n\n" for p in (PATH, PATH + "/*"))
