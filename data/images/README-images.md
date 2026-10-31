# Image move log (innerverse-site data/images/)

Running log for the move of the site's images off Squarespace into Cloudflare R2.
Brief: `claude/BRIEF-image-migration-2026-10-30.md` in Chance's Claude project.
Every stage adds a dated entry here: what was done, counts, commit ids, anything odd.

## Status (the only place it is kept)

Stage 0 done. Stage 1 done (865 images, 12 batches). Batches 0 to 4 done (about 350 MB stored). **Next: Stage 2, batch 5 (episode images, 100), on Chance's go (one batch per go).** Update this line at the end of every stage.

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
- Found **868 images** after the batch 1 clean-up below (including the batch 0 test image): `images.squarespace-cdn.com`, `static1.squarespace.com` and 8 `/s/` Biofield chart files (linked as relative `/s/...` paths, so the scan matches those too).
- Sources scanned: the Airtable mirror (`innerverse-data`: all 586 per-episode files with their embedded guests and affiliates, plus the index files); every text file in `innerverse-site` and `innerverse-data`; `squarespace-posts.json`; the live pages `/`, `/episodes`, `/plus`, `/about`, `/biofield-tuning`, `/support`, `/contact` (all answered); `chance-garton/inner-circle` (34 images: song cover links in `songs/songs.json`, share pages and the app). No other `chance-garton` repo was checked: the session cannot list the account's repos, only this one was named in the project docs. Nothing was changed in any of them.
- Airtable was read two ways: the mirror above (it carries every episode field the site shows), and directly through the Airtable connector for the Guests and Promotions tables (the Promotions image is the one Airtable row not in the mirror). The direct rows are saved nowhere in the repo, so `inventory.py --extra` needs them again in Stage 4: the Stage 4 daily run must read Airtable itself (needs an Airtable token secret) or accept the mirror alone.
- Batches (no per-image size checks, no dead-image check; a dead image shows as a failure when its batch is copied): 1 site-wide 11, 2 hand-made pages 43 (includes the 8 chart files), 3 guest and host portraits 149, 4 to 10 episode images newest first (100 each, last 5; 605 in all), "last" leftovers 59 (affiliate book covers, promo art, song covers, images seen only on live pages). Every image is in one batch only.

### 2026-10-31: Stage 2, batch 1 (site-wide images), done

- Run 41207835145: copied 11, skipped 0, failed 1, 18,823,378 bytes added (about 18 MB). The 1 failure was not an image: the first inventory had mistaken a bare folder address in the code (`.../content/<site id>/`) for one (HTTP 400). Report kept as `runs/1-20261031T135654.json`.
- That showed the inventory scan had flaws, so it was fixed and rerun the same day: folder-style and code-prefix addresses are no longer counted, a stray slash after a file name on the live pages is dropped, and file names with spaces are kept whole instead of cut at the first space. Result: 868 images (was 910); batch 1 is now exactly the 11 that copied, so it counts as 11 of 11. Batches 2 onward were rebuilt from the corrected list; none of them had been copied yet. 8 episode-snapshot addresses with no file name stay in "last" and will fail when that batch runs (they are the dead-image list).
- Checked: all 60 files from the 12 map entries answer from the public address (HEAD, no failures).

### 2026-10-31: Stage 2, batch 2 (hand-made pages), done

- Run 41211870168: copied 40, skipped 0, failed 3, 54,821,719 bytes added (about 55 MB). All 8 Biofield chart files are in (largest original about 3 MB). The 3 failures were Squarespace's own site style and script files (not images) that the live pages link from the same address host; the scan was fixed to ignore css, js and similar files. Report: `runs/2-20261031T144905.json`.
- Checked: all 179 files of the batch answer from the public address with the right type (jpeg, png, webp).
- Second scan fix: one file name has a literal plus sign (`chance+garton+biofield+tuning+sessions...png`, a `%2B` in the page). `normalise()` changes a plus to a space, so the inventory now applies it twice, as `migrate.py` does, so inventory and map keys match. **For Stage 3:** the lookup of a page's image address in the map must apply `normalise()` twice as well, or that one image will not be found.
- Inventory rebuilt: 865 images. Batches 1 and 2 are exactly what was copied (11 and 40, all in the map); batches 3 onward are unchanged apart from this rebuild. Chance's pace (2026-10-31): one batch per go.

### 2026-10-31: Stage 2, batch 3 (guest and host portraits), done

- Run 41212597140: copied 149, skipped 0, failed 0, 14,960,035 bytes added (about 15 MB). Report `runs/3-20261031T145841.json`. Most portraits are small, so many have only one WebP size besides the original (321 files in all).
- Checked: a random 40 of the 321 files answer from the public address with the right type; all 149 are in the map.

### 2026-10-31: Stage 2, batch 4 (newest 100 episode images), done

- Run 41213035698: copied 100, skipped 0, failed 0, 258,832,570 bytes added (about 259 MB; episode thumbnails are large PNGs, about 2.6 MB each, so the rest of the episode batches should add roughly 1.3 GB). Total in the bucket for images so far: about 350 MB, well under the 5 GB stop line. Report `runs/4-20261031T150404.json`.
- Checked: a random 40 of the 586 files answer from the public address with the right type; all 100 are in the map.
