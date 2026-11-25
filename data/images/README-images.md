# Images (innerverse-site data/images/)

Every image the site, the app and the episode data use lives in the Cloudflare R2 bucket `innerverse-images`, served at `https://images.innerversepodcast.com` (CORS GET and HEAD from any origin). Each image has a folder `<key>/` holding `orig.<ext>` (the original file) and WebP copies `w300.webp` to `w1500.webp` (never larger than the original).

## Status (the only place it is kept)

All 1149 images are in R2, and since 2026-11-25 nothing in Airtable, `innerverse-data`, this repo, `inner-circle` or the built pages points anywhere else for an image (the last outside host, Acast's image server, was dropped that day). The build and the in-page `ivImg` helper only size addresses on the image host. Update this line when something changes.

## Files here

- `map.json`: one entry per copied image, keyed by the address it was copied from (for images moved from the old site, its own `orig.` address on the image host): bucket `key`, original `ext`, `w` and `h`, the WebP `widths` that exist, `files` and their `bytes`. `build/common.py` reads it to pick the right width, and the build hands the browser a small table made from it.
- `batches.json`: the copy batches, by name. Each has `what` and `images` (source addresses).
- `runs/<batch>-<UTC time>.json`: one report per copy run: copied, skipped, failed (with reason), bytes added.
- `incoming/<slug>/`: new files waiting to be copied. Delete a folder once its batch has run.

## Adding images

1. Commit the files to `data/images/incoming/<slug>/` (slides as `slide-NN-<alt text>.jpg`; thumbnails are photographs, so JPEG).
2. Add a batch `ep-<slug>` to `batches.json` whose `images` are their `https://raw.githubusercontent.com/chance-garton/innerverse-site/main/...` addresses (`json.dump(..., indent=1, ensure_ascii=False)`), and push.
3. Run it: Actions tab, workflow "Copy images to R2", batch name. From a Claude session: `gh api -X POST repos/chance-garton/innerverse-site/actions/workflows/images.yml/dispatches -f ref=main -f 'inputs[batch]=<name>'`. The run commits the map and its report back to main. Local test without uploading: `python3 tools/images/migrate.py <name> --dry-run` (files land in `_dryrun/`, ignored by git).
4. `git pull`, read the key from `map.json` and use `https://images.innerversepodcast.com/<key>/orig.<ext>` everywhere (Airtable, `songs.json`, code). The build and the page helper size it.

Safe to rerun: an image whose files are all in the bucket is skipped, and an existing file is never overwritten.

## History

Between 2026-10-30 and 2026-11-25 every image the old site served was copied here (958 images, about 1.26 GB) and every reference was switched over: the site build (2026-11-04), Airtable's link fields and the guest portraits inside the quote fields (2026-11-25), the frozen page snapshots in `innerverse-data`, the Inner Circle app, and finally the site's own code and records (2026-11-25). The step-by-step log, the first inventory, the old copy batches and their run reports, and the Airtable rollback list are in this repository's git history before 2026-11-25.

2026-11-25: the 191 episode thumbnails still served by Acast's image server (`assets.pippa.io`) were copied as they are (batch `acast-thumbs-2026-11-25`, 133 MB) and every reference switched over: 196 Airtable Episodes rows (rollback list `airtable-rollback-acast-2026-11-25.json`), the frozen snapshot and members' list in `innerverse-data`, and the homepage structured data.
