# innerverse-site

The InnerVerse website, built as finished pages from the episode data, on its
way off Squarespace. Plan and status: the Website Recode project's
`claude/PLAN-site-off-squarespace-2026-10-19.md` and `claude/START-HERE.md`.

## How it works

- `build/build.py` reads a checkout of `chance-garton/innerverse-data` (the
  files its daily Airtable build makes) and `data/squarespace-posts.json` (a
  frozen copy of what only Squarespace held: SEO titles and descriptions,
  social images, tags, post dates), and writes `dist/`: one page per
  `/episodes/<slug>`, `assets/`, `sitemap.xml`, `robots.txt`.
- `build/episode.py` is the episode page: the old `iv-episode-render`
  builders, ported to Python, so every word, chapter, quote, guest and the
  structured data are in the HTML.
- `src/css/` is the Lapis Library stylesheet, carried over from the Code
  Injection blocks (file names say which), plus `00-base.css`, which stands in
  for Squarespace's theme. Built into `assets/site.css`.
- `src/js/site.js` (membership helper, nav, footer, Inner Whirled brand) and
  `src/js/episode.js` (players, chapters, accordions, tabs, share, quote
  cards, member-aware Plus card) wire the finished markup.
- `.github/workflows/build.yml` builds hourly and publishes to GitHub Pages.

## Build locally

    IV_DATA_DIR=../innerverse-data python3 build/build.py

`IV_BASE` sets the path prefix (`/innerverse-site` at the test address, empty
on the real domain); `IV_NOINDEX=1` keeps search engines off a test build.

## Still on Squarespace (later stages)

`/plus/<slug>` pages, the homepage, `/episodes`, `/plus`, About, Biofield
Tuning, the other hand-made pages, comments, redirects, image storage, the
domain switch.
