# Image move log (innerverse-site data/images/)

Running log for the move of the site's images off Squarespace into Cloudflare R2.
Brief: `claude/BRIEF-image-migration-2026-10-30.md` in Chance's Claude project.
Every stage adds a dated entry here: what was done, counts, commit ids, anything odd.

## Status (the only place it is kept)

Stage 0 done. Batch 0 done (one test image). Stage 1 done 2026-10-31: 910 images found, split into 12 batches (0 to 10 plus "last"). **Next: Stage 2, batch 1 (site-wide images), on Chance's go.** Update this line at the end of every stage.

## Files here

- `inventory.json`: every image found (address, every place it is used, copy group). Rebuilt by `tools/images/inventory.py`.
- `batches.json`: the copy batches, by name. Each has `what` and `images` (Squarespace addresses).
- `map.json`: one entry per copied image, keyed by its normalised Squarespace address (https, no query string, decoded): bucket `key`, original `ext`, `w` and `h`, the WebP `widths` that exist (never larger than the original), `files` and their `bytes`.
- `runs/<batch>-<UTC time>.json`: one report per workflow run: copied, skipped, failed (with reason), bytes added.

## How to run a batch

Actions tab, workflow "Copy images to R2", Run workflow, type the batch name. Or from a Claude session (the `gh workflow run` command does not work there, use the REST call):
`gh api -X POST repos/chance-garton/innerverse-site/actions/workflows/images.yml/dispatches -f ref=main -f 'inputs[batch]=<name>'`
The run commits the map and its report back to main. Local test without uploading: `python3 tools/images/migrate.py <name> --dry-run` (files land in `_dryrun/`, ignored by git).

## Log

### 2026-10-30 to 31: Stage 0, setup, done

- Bucket `innerverse-images` created by Chance (Standard, Eastern North America); temporary public r2.dev address switched on.
- R2 token created 2026-10-31. Its first values were pasted into a chat, so Chance replaced it and entered the new values in the five repository secrets himself before batch 0 ran (confirmed by Chance). Secret names were checked on the GitHub settings page; values never read.
- The final image address (`images.innerversepodcast.com`, needs Cloudflare to run the DNS) is still Chance's open decision; testing uses the r2.dev address.

### 2026-10-31: Stage 2, batch 0 (one test image), done

- Tool `tools/images/migrate.py` and workflow `.github/workflows/images.yml` added (commit c6411eb). `batches.json` holds only batch 0 for now; Stage 1 (inventory) adds the real batches and keeps batch 0.
- Test image: the site's Eye logo (`.../d086710b-58e4-42e3-bf40-2286d3f899a6/Eye-Logo.png`), a transparent PNG.
- Run 41205985083: copied 1, skipped 0, failed 0, 315,988 bytes added. Original came back as a true PNG (998 x 998, transparency intact), WebP made at 300, 500 and 750 (1000 and 1500 skipped, never enlarged).
- Checked from outside GitHub: all four files answer at `https://pub-d6456f3195384e739bb2ddc2ce445321.r2.dev/sq/d086710b-58e4-42e3-bf40-2286d3f899a6/eye-logo/` with the right content type and `Cache-Control: public, max-age=31536000, immutable`. So the R2 secrets are correct.
- Rerun 41206041220: copied 0, skipped 1, failed 0 (rerunning is safe).
- Bucket key pattern in use: `sq/<image id>/<clean name>/orig.<ext>` and `w<width>.webp`; `/s/` files go to `files/<clean name>/`.
- Batch 0 was run before Stage 1 on Chance's ask ("do a test image migration before we go about with the inventory").

### 2026-10-31: Stage 1, inventory, done

- Script `tools/images/inventory.py` (reads `normalise()` from `migrate.py`). Outputs `inventory.json` and `batches.json` (batch 0 kept). Nothing copied, nothing changed anywhere else.
- Found **910 images** (including the batch 0 test image): 884 on `images.squarespace-cdn.com`, 18 on `static1.squarespace.com`, 8 `/s/` Biofield chart files (linked as relative `/s/...` paths, so the scan matches those too).
- Sources scanned: the Airtable mirror (`innerverse-data`: all 586 per-episode files with their embedded guests and affiliates, plus the index files); every text file in `innerverse-site` and `innerverse-data`; `squarespace-posts.json`; the live pages `/`, `/episodes`, `/plus`, `/about`, `/biofield-tuning`, `/support`, `/contact` (all answered); `chance-garton/inner-circle` (34 images: song cover links in `songs/songs.json`, share pages and the app). No other `chance-garton` repo was checked: the session cannot list the account's repos, only this one was named in the project docs. Nothing was changed in any of them.
- Airtable was read two ways: the mirror above (it carries every episode field the site shows), and directly through the Airtable connector for the Guests and Promotions tables (the Promotions image is the one Airtable row not in the mirror). The direct rows are saved nowhere in the repo, so `inventory.py --extra` needs them again in Stage 4: the Stage 4 daily run must read Airtable itself (needs an Airtable token secret) or accept the mirror alone.
- Batches (no per-image size checks, no dead-image check; a dead image shows as a failure when its batch is copied): 1 site-wide 12, 2 hand-made pages 44 (includes the 8 chart files), 3 guest and host portraits 149, 4 to 10 episode images newest first (100 each, last 13; 613 in all), "last" leftovers 91 (affiliate book covers, promo art, song covers, images seen only on live pages). Every image is in one batch only.
