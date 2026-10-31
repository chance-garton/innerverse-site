# Image move log (innerverse-site data/images/)

Running log for the move of the site's images off Squarespace into Cloudflare R2.
Brief: `claude/BRIEF-image-migration-2026-10-30.md` in Chance's Claude project.
Every stage adds a dated entry here: what was done, counts, commit ids, anything odd.

## Status (the only place it is kept)

Stage 0 done. Batch 0 done (one test image). **Next: Stage 1, the inventory, on Chance's go.** Update this line at the end of every stage.

## Files here

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
