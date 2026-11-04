# Image move log (innerverse-site data/images/)

Running log for the move of the site's images off Squarespace into Cloudflare R2.
Brief: `claude/BRIEF-image-migration-2026-10-30.md` in Chance's Claude project.
Every stage adds a dated entry here: what was done, counts, commit ids, anything odd.

## Status (the only place it is kept)

Stage 0 done. Stage 1 done (865 images, 12 batches). Stage 2 done (865 of 865, about 1.26 GB), plus batch gap-1 (14 images found in Stage 3, all copied). Stage 3 done 2026-10-31: the test address loads every image from R2 (zero from Squarespace on the 20 pages checked, both sizes). Stage 4 done 2026-11-04: an hourly workflow copies any new image by itself (see "Stage 4" in the log); the hand-run catch-up below is no longer needed. Final address and CORS done 2026-11-04: the site serves every image from `images.innerversepodcast.com`, and the bucket has its CORS rule. Stage 4b done 2026-11-04: the build sizes addresses on our own image host too. **Next: Stage 5, only when Chance starts the switch (the inner-circle app, chat page, logos, song art and song share pages are all on the image host, see the 2026-11-04 inner-circle entries; nothing left to fix there).** The temporary r2.dev address was switched off 2026-11-04. Update this line at the end of every stage.

## Files here

- `inventory.json`: every image found (address, every place it is used, copy group). Rebuilt by `tools/images/inventory.py`.
- `batches.json`: the copy batches, by name. Each has `what` and `images` (Squarespace addresses).
- `map.json`: one entry per copied image, keyed by its normalised Squarespace address (https, no query string, decoded): bucket `key`, original `ext`, `w` and `h`, the WebP `widths` that exist (never larger than the original), `files` and their `bytes`.
- `runs/<batch>-<UTC time>.json`: one report per workflow run: copied, skipped, failed (with reason), bytes added.

## How to run a batch

Actions tab, workflow "Copy images to R2", Run workflow, type the batch name. Or from a Claude session (the `gh workflow run` command does not work there, use the REST call):
`gh api -X POST repos/chance-garton/innerverse-site/actions/workflows/images.yml/dispatches -f ref=main -f 'inputs[batch]=<name>'`
The run commits the map and its report back to main. Local test without uploading: `python3 tools/images/migrate.py <name> --dry-run` (files land in `_dryrun/`, ignored by git).

## New episode catch-up (by hand; no longer needed since Stage 4, kept as a fallback)

Run after the episode's Airtable row exists. 1) Read the row's `Thumbnail URL` (and `Plus Thumbnail URL` if filled), and the `art` of its songs in `songs/songs.json` of `chance-garton/inner-circle` (the music cover, usually a different image). 2) If its `normalise()`d address is not in `map.json`, add a batch named `ep-<slug>` to `batches.json` (`{"what": ..., "images": [address]}`), commit and push. 3) Dispatch `images.yml` with that batch name (REST call above) and wait for success. 4) `git pull`, confirm the map has the key. The hourly site build picks it up; nothing else to do.

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

### 2026-10-31: Stage 2, batch 5 (episode images 101 to 200), done

- Run 41213866790: copied 100, skipped 0, failed 0, 209,661,608 bytes added (about 210 MB). Total image storage so far: about 557 MB (map totals), under the 5 GB stop line. Report `runs/5-20261031T151414.json`.
- Checked: a random 40 of the 561 files answer from the public address with the right type; all 100 are in the map.

### 2026-10-31: Stage 2, batch 6 (episode images 201 to 300), done

- Run 41214976971: copied 100, skipped 0, failed 0, 220,087,214 bytes added (about 220 MB). Total image storage so far: about 778 MB, under the 5 GB stop line. Report `runs/6-20261031T152810.json`.
- Checked: a random 40 of the 544 files answer from the public address with the right type; all 100 are in the map.

### 2026-10-31: Stage 2, batch 7 (episode images 301 to 400), done

- Run 41216175246: copied 100, skipped 0, failed 0, 209,126,598 bytes added (about 209 MB). Total image storage so far: about 987 MB, under the 5 GB stop line. Report `runs/7-20261031T154314.json`.
- Checked: a random 40 of the 504 files answer from the public address with the right type; all 100 are in the map.

### 2026-10-31: Stage 2, batch 8 (episode images 401 to 500), done

- Run 41226848098: copied 100, skipped 0, failed 0, 119,447,590 bytes added (about 119 MB; older thumbnails are smaller). Total image storage so far: about 1.11 GB, under the 5 GB stop line. Report `runs/8-20261031T175524.json`.
- Checked: a random 40 of the 502 files answer from the public address with the right type; all 100 are in the map.

### 2026-10-31: Stage 2, batch 9 (episode images 501 to 600), done

- Run 41228643234: copied 100, skipped 0, failed 0, 96,702,531 bytes added (about 97 MB). Total image storage so far: about 1.21 GB, under the 5 GB stop line. Report `runs/9-20261031T181716.json`.
- Checked: a random 40 of the 544 files answer from the public address with the right type; all 100 are in the map.

### 2026-10-31: Stage 2, batches 10 and last, done; Stage 2 complete

- Batch 10: run 41229617460, copied 4, failed 0, 2,851,889 bytes. Report `runs/10-20261031T182905.json`.
- Batch last: run 41229958559, copied 60, skipped 0, failed 0, 40,353,662 bytes (about 40 MB). Report `runs/last-20261031T183311.json`. The 8 episode addresses that have no file name in the old snapshot did copy fine, so there is no dead-image list: nothing failed in the final state (the only earlier failures were false entries in the first inventory, fixed on batches 1 and 2).
- Checked: all 865 inventory images are in `map.json`; a random sample of files from both batches answers from the public address with the right type (0 bad).
- Totals: 865 of 865 copied, about 1.26 GB of image data stored (original plus sizes), well under the 5 GB stop line. Run both batches back to back at Chance's word (2026-10-31), with a few minutes between them.
- Still open for later stages: Stage 3 lookup must apply `normalise()` twice (see the batch 2 note); the final image address is still Chance's open decision (r2.dev is testing only).

### 2026-10-31: Stage 3, the new site points at the copies (test address only), done

- Commit 99a5082 (code), on top of 705a2e1 and 31b4548 (batch gap-1). Live site, Airtable and Code Injection untouched.
- `iv_img` (build/common.py) and `window.ivImg` (head script) now look an address up in the map, with `normalise()` applied twice (the Python side imports it from `migrate.py`; the JavaScript side mirrors it). Found: the R2 WebP at the smallest width that is at least the one asked for, else the largest; the original file when an image has no WebP sizes. Not found: exactly as before. `window.ivImgR2` is the lookup alone, `window.ivImgSq` the old behaviour.
- The browser's lookup is `assets/img-map.js` (7.7 KB, cached, versioned with the other assets): one 9 character entry per image (32 bit hash of the bucket key, original type, widths). The build stops if two keys ever hash alike.
- Every finished page also swaps any copied Squarespace image address it carries (templates, episode bodies, JSON-LD) for its R2 file: the width it asked for with `format=`, or the largest WebP. Page data (`<script type="application/json">`) keeps the Squarespace addresses; the scripts map them through `ivImg` and keep them as a fallback. Share images (`og:image`, `twitter:image`) use the original file (PNG or JPEG), as crawlers expect.
- Fixed script images (logos, platform icons, homepage hero portraits, Plus logo) now go through the lookup too. The preconnect hint points at the image base instead of Squarespace.
- The eight Biofield Tuning `/s/` chart links point at their R2 originals (they fall back to the live site only if one is ever missing from the map).
- One setting for the image base: `IMAGE_BASE` in `build/common.py` (or the `IV_IMAGE_BASE` environment variable). Today the r2.dev address, testing only.
- `migrate.py` now imports Pillow only where it resizes, so the site build can import `normalise()` and `key_for()` without installing it.
- **Batch gap-1:** 14 images were never in the inventory because the code builds their address from pieces (`CDN + id + name + suffix`): ten platform icons, the InnerVerse logo, the quote card frame and the two homepage hero portraits. Run 41231568434: copied 14, failed 0, 11,135,651 bytes. (A first dispatch, 41231467674, started before the batch was pushed and failed harmlessly.) Stage 4's build check (Squarespace addresses in built pages not in the map) is what catches this kind of miss from now on; `inventory.py` still does not see addresses built from pieces.
- **CORS, needed before the switch:** the bucket sends no `Access-Control-Allow-Origin` header (Squarespace's CDN sends `*`). Normal images do not care, but the quote share card draws the frame, logo and portrait onto a canvas, which needs it. Until the bucket has a CORS rule (R2, bucket `innerverse-images`, Settings, CORS policy: allow GET from any origin), the card falls back to the Squarespace address for those three images only, on click. Once the rule exists the fallback never fires; it must exist before Squarespace is cancelled.
- Checked on the test address after the deploy: homepage, /episodes, /plus, /about, /biofield-tuning, 10 episode pages and 5 /plus pages, at 1440x900 and 390x844 (40 loads): 0 images from Squarespace, 0 failed or broken images, 0 script errors, same image count on every page as before. Built pages carry 0 Squarespace image addresses outside page data.
- Page weight, same 20 pages measured before and after in the same headless browser: images 33.1 MB down to 12.4 MB at 1440x900 and 38.5 MB down to 15.8 MB at 390x844; no page got heavier. Examples at 1440: homepage 2.1 MB to 0.9 MB, /episodes/thomas-zinser 2.8 MB to 0.8 MB, /biofield-tuning 4.9 MB to 2.9 MB. Side by side with the live site (/biofield-tuning, /episodes/thomas-zinser, homepage): no visible difference.

### 2026-11-01: new episode catch-up, Inner Whirled 32

- Thumbnail was still on Squarespace and not in the map. Batch `ep-inner-whirled-32` (commit on main), run 41328815411: copied 1, failed 0, 1,002,826 bytes. Report `runs/ep-inner-whirled-32-20261101T165600.json`. Plus Thumbnail URL on the row is empty, so nothing else to copy.
- Done on Chance's word ("whatever migration steps are needed to catch it up"), so this one needed no separate go. Stage 4 is still open.
- Same day, on Chance's ask ("what about its music thumb"): the two Inner Whirled 32 songs (Galatea, Loggia) share one cover, `IW-32.jpg`, also not in the map. Batch `ep-inner-whirled-32-music`, run 41329051302, copied 1, failed 0. The app and share pages still use the Squarespace address in `songs.json` until Stage 5.

### 2026-11-04: Stage 4, the hourly sync, done

- `tools/images/sync.py` scans the Airtable mirror (innerverse-data) and the songs file of chance-garton/inner-circle for Squarespace image addresses with no entry in `map.json`, and copies exactly those with `migrate.run` (which now also accepts a list of addresses). `.github/workflows/images-sync.yml` runs it every hour at :05, before the site build at :20, and commits the map and a report named `auto-<time>.json`. Nothing new means no commit. Commit dfe3181.
- First run (41848881717, by hand): copied 1, failed 0, 3,879,226 bytes (an Inner Whirled 32 image the Airtable mirror pointed at). Dry run beforehand listed the same single address (724 in use, 881 in the map).
- Not covered: addresses the code builds from pieces (see the gap-1 note above) and the 8 `/s/` chart files; those are fixed lists already in the map.
- Still open: the bucket CORS rule and the final image address.

### 2026-11-04: final image address and CORS rule, done

- Cloudflare now runs the domain's DNS (nameservers moved from GoDaddy the same day; registration stays at GoDaddy).
- Chance connected `images.innerversepodcast.com` to the bucket (R2, Custom Domains), added the CORS rule (allow GET and HEAD from any origin, max age 86400; the editor's `localhost:3000` text was Cloudflare's sample, not a rule) and set the `IMAGE_BASE_URL` secret to `https://images.innerversepodcast.com`.
- Checked from outside: files answer from the new address with the right type, `Access-Control-Allow-Origin: *` and the long cache header; 50 files from 25 random map entries all answer.
- `IMAGE_BASE` in `build/common.py` now defaults to `https://images.innerversepodcast.com` (commit 42d857b). Build passed.
- Browser check on the test address, the 5 hand-made pages plus 10 episode and 5 /plus pages, at 1440x900 and 390x844: 726 image loads from the new address, zero from Squarespace, zero from r2.dev, zero script errors. Two images on one page showed broken once and loaded fine on two reloads (a network blip). A canvas draw from the new address works, so the quote share card no longer needs its Squarespace fallback.
- Same day, on Chance's ask ("can you do it?"): the r2.dev address was switched off in the dashboard (R2, bucket, Settings, Public Development URL, Disable). It now answers 401; the new address still answers 200. Old run reports still name it; they are history only.

### 2026-11-04: gap found, handed off as Stage 4b

- `img_key()` in `build/common.py` only recognises Squarespace addresses, so once Stage 5 puts `images.innerversepodcast.com/<key>/orig.<ext>` links in Airtable, the build would print the full original instead of a sized WebP (images still load, pages get heavier). The browser lookup (`ikey()` in the head script) already handles those addresses. Chance asked for the fix before the switch; steps are in the brief, section "Stage 4b". Also decided: at the switch the domain is pointed at the new site before Airtable is rewritten, so the old Squarespace site never sees the new links.

### 2026-11-04: Stage 4b, the build sizes its own image addresses, done

- `img_key()` in `build/common.py` now also accepts an address on `IMAGE_BASE` (key = path between the base and the last slash, query and hash dropped), so `iv_img` returns the right `w<width>.webp` for R2 addresses. `_asked_width()` also reads a `/w<width>.webp` in the address, as the browser twin does. Squarespace handling unchanged.
- Gap found by the test and fixed: affiliate book covers in `build/episode.py` were written without `iv_img`, so they would have loaded originals after Stage 5. They now ask for 500.
- Test: local throwaway copy of `innerverse-data` (never pushed) with 10 episode files and the episodes index switched to R2 `orig.` addresses. Result: the same number of `<img>` tags carry an original as in the normal build (12, all intended, og:image stays original), every card, thumb and portrait loads a sized WebP, page tree the same size (34,568 KB both), the only page differences are the random quote order. Normal build with real data matches as before (regression check).
- Not done: a headless-browser pass (viewport sizes, `window.ivImg` call). The browser half was not changed; its `ikey()` already handles our own addresses.
- **Findings for Stage 5 (other repos, nothing changed):** `chance-garton/inner-circle` sizes Squarespace links with `?format=` in `worker/src/app.html` (`thumbAt` around line 1584, `songArt` around line 1611) and `app/index.html` (line 652), and the generated `songs/*/index.html` pages bake in `?format=300w` and `?format=750w`. After Stage 5 these would load originals (or break if the `?format=` is appended to an R2 address). They need the same key-and-width lookup, or a plain `images.innerversepodcast.com/<key>/w<width>.webp` address, before the Airtable links change. Logos in those files are fixed Squarespace addresses and keep working until Squarespace is cancelled.

### 2026-11-04: inner-circle sizing fixed (Stage 4b step 4 follow-up), done

- `chance-garton/inner-circle` commit d069d73: `img()` in `app/index.html` and `thumbAt`/`songArt` in `worker/src/app.html` (root `index.html` rebuilt with `worker/build-page.py`) now handle addresses on `images.innerversepodcast.com`: they ask for the small WebP for the width wanted, and if that size was never made (404) a page-wide image error handler swaps in the plain address. `app/sw.js` caches the image host like the Squarespace one; `app/version.txt` is 2026-11-04a. Squarespace addresses behave exactly as before, so nothing changes until Stage 5.
- Still open for Stage 5: the generated `songs/*/index.html` share pages have Squarespace addresses with `?format=300w` or `750w` written into them, and the fixed logos in `app/index.html`, `worker/src/app.html` and `app/index.html` `.spin` are plain Squarespace addresses. All of them must be rewritten to R2 addresses (the song pages by whatever generates them, then regenerated) before Squarespace is cancelled, or they break.

### 2026-11-04: inner-circle leftovers moved to the image host, done

- `chance-garton/inner-circle` commit 3d6d40d. Fixed logos in `app/index.html` and `worker/src/app.html` (and the app's loading spinner and show logos) now point at `w300.webp` on `images.innerversepodcast.com`. `songs/songs.json` `art` holds the plain original address for all 53 songs. `songs/build.py` handles both address kinds: pages ask for the small WebP with a plain-address fallback (`onerror`), `og:image`, `twitter:image` and the lock screen cover use the original, the page logo is `w300.webp`. All 53 share pages regenerated; the only differences are image addresses (checked by diff). `cover.jpg` files are untouched (their `cover.src` markers were rewritten to the new address so nothing was re-fetched). App version `2026-11-04b`.
- Checked: all 87 image addresses used in those files answer 200 (one blip, fine on retry); zero Squarespace addresses left in the song pages; the only Squarespace text left in `app/index.html` and `worker/src/app.html` is the code that still sizes Squarespace thumbnails of episodes, which stays until Stage 5 switches Airtable.
- New songs: a Squarespace cover link in `songs.json` still works until the switch, but copy the cover to R2 first (a one-image batch, as in "New episode catch-up") and use its R2 address. Written into the app doc in Claude's project.
- Stage 5 for this repo is now only: nothing to rewrite in files; the episode thumbnails the app and chat read from `innerverse-data` switch with Airtable and the new helpers size them.
