# innerverse-site

The InnerVerse website, www.innerversepodcast.com, built as finished pages from the episode data and served by Cloudflare Pages (project `innerverse-site`). How it builds, deploys and is looked after is in Claude's project doc `claude/RUN-site.md`, section 1.

## How it works

- `build/build.py` reads a checkout of `chance-garton/innerverse-data` (the files its Airtable build makes) and `data/old-site-posts.json` (a frozen copy of what only the old site held: SEO titles and descriptions, social images, tags, post dates), and writes `dist/`: every `/episodes/<slug>` and `/plus/<slug>` page, the hand-made pages (`build/pages.py`), `assets/`, `sitemap.xml`, `robots.txt`, `llms.txt`, `_headers` and `_redirects`.
- `build/episode.py` and `build/plus_episode.py` are the episode pages, so every word, chapter, quote, guest and the structured data are in the HTML.
- `src/css/` is the site stylesheet (built into `assets/site.css`); `src/js/` wires the finished markup (players, chapters, search, membership, share and quote cards).
- Images live on `images.innerversepodcast.com` (R2); see `data/images/README-images.md`. Free episode audio lives on `audio.innerversepodcast.com` (`tools/audio/`).
- `.github/workflows/build.yml` builds on every push, by hand and hourly at :20, then deploys `dist/` with wrangler. A push to `main` publishes the site.

## Build locally

    IV_DATA_DIR=../innerverse-data IV_BASE="" IV_NOINDEX=0 python3 build/build.py
    PW_CHROMIUM=/path/to/chrome NODE_PATH=/path/to/node_modules node tools/prerender.js

`IV_BASE` sets a path prefix (empty on the real domain); `IV_NOINDEX=1` keeps search engines off a test build.
