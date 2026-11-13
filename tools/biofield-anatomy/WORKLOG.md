# Work log

## 2026-11-12, build step 2 (3D asset build)

- Body: MakeHuman base mesh at 50/50 female and male young-adult targets, arms
  lowered 20 degrees and elbows eased using the default rig weights, one level of
  subdivision. 53,514 vertices.
- Organs: 24 meshes from Z-Anatomy plus the spine. Fitted into the body by
  matching height landmarks (hip joint, top of sternum, chin, nose, eye, crown)
  and the width and depth of each skin cross section. A sample of every organ's
  points was tested against the body shell: all inside, apart from the eyes,
  which sit in the eye openings by design.
- Brain: 148 separate gyri fused with a voxel remesh, then reduced.
- Regions: height bands blended along the body, with overrides so ears, mouth
  and jaw read as throat, glutes as root, shoulder tops and arms as heart.
- Model: 124k organ triangles, 107k skin triangles, 1.6 MB compressed.
- Viewer: region list, tap the body to select, camera glide per region, organ
  chips that fly to one organ, all organs toggle, simple field shells, deep
  links (`#heart`), phone bottom sheet, reduced motion honoured.
- Checks (Playwright, 1440 and 390 wide): all eight regions select by button
  and by tapping the body, each shows exactly its own organs, deep link works,
  no console errors, no sideways scroll on the phone layout. Frame rate could
  only be measured on a software renderer here, so a real phone test is open.

Open for the content step: the stomach mesh sits in the solar plexus band but
is listed under the sacral region on the site, so it lights with sacral; small
intestine is assigned to sacral; no sexual organs are modelled; pineal and
pituitary light with the third eye; the feet colour is a placeholder.

## 2026-11-12, round 2 (Chance's first changes)

- Chest: flat and neutral, nipples gone. `build_mh.py` now applies MakeHuman's
  own smallest-cup shape, refills the nipple area as a smooth sheet and eases
  the rim. The breastbone and ribs are untouched (checked: the midline profile
  did not move). A first try that smoothed the whole breast area was dropped
  because it sank the breastbone by 4 cm.
- Organs refitted to the new chest: all still inside the body.
- Legs: one even gradient from the root red at the top of the thighs to a deep
  dark red at the soles (feet colour `#5c0b13`, was the placeholder `#c9623a`).
  Done in the skin shader by height, blended in display space so the darkening
  looks even. The feet entry in the list uses a lighter dot and text colour so
  it still reads on the dark panel (`dot` and `accent` in `zones.json`).
- Model size unchanged at 1.6 MB.

## 2026-11-12, build step 3 (experience build, with the model changes from the review)

- Model: large intestine now lights with the sacral, stomach with the solar plexus, pituitary with the crown.
  New meshes from the same Z-Anatomy source: diaphragm, sinuses and nasal cavity (frontal and sphenoid sinuses,
  ethmoid cells, nasal cavity lining), voice box (thyroid, cricoid and arytenoid cartilages, epiglottis), jaw,
  appendix (split from the colon), both sciatic nerves, the vagus nerve. The spine is five meshes, one per
  center: neck (C1 to C7), upper back (T1 to T6), mid-back (T7 to T12), low back and sacrum (L1 to L5, sacrum),
  tailbone. 37 part meshes, 1.8 MB.
- Fit: parts near the surface (jaw, voice box, sinuses, vagus, neck spine) are tucked under the skin by a smooth
  inward push (`tuck` in `fit.py`); the sciatic nerves follow the thigh line below the hip (`warp_leg`). Every
  part tests 100 percent inside the body, apart from the eyes, which sit in the eye openings by design.
- Reproductive organs: no meshes, by choice. The lower pelvis is a lit zone with a soft glow.
- Skin regions moved into the shader (33 named regions), each guarded by its weight so unlit regions cost
  nothing. Quadrants (front, back, left, right) are a filter on top.
- Viewer rebuilt: Chakras (default), Field, Organs and Zodiac views; chakra orbs on the body; spots placed in 3D
  around a center with leader lines; part isolation; field markers with a timeline age slider; zodiac view in
  one gold light on a neutral body; one search box (parts, feelings, signs, field, full text); feelings index;
  deep links by plain hash; phone bottom sheet with three heights; text-only fallback when WebGL is missing;
  sharpness steps down by itself on a struggling device.
- Checks (Playwright, 1440 and 390 wide): every line of wording is on screen in its node (about 660 lines),
  each node lights exactly its own meshes, list, labels, back, breadcrumbs, tabs, search and deep links work,
  tapping orbs, skin and organs works, no sideways scroll on the phone, no console errors. Frame rate on the
  software renderer is the same as the step 2 viewer measured the same way; a real phone test is still open.
- Not built: the narrated guided tour and the illustrated 2D fallback from the plan.

## 2026-11-13, changes round 1 (from Chance's read-through)

- Phone: the chip strip shows only in the Body Parts view; elsewhere the labels on the body do that job. An
  "A to Z" button sits beside Search. The four view tabs size to their words so all four fit.
- "Organs" view renamed "Body Parts". "Feelings A to Z" became "Biofield A to Z": one alphabetical index of
  every selectable thing (centers, leg parts, body parts, spots, field topics, signs, feelings) with filters.
- Spots that describe stuck energy read as imbalance: a node with `tone: imbalance` gets "imbalance" in its spot
  headers, and its compass carries one caption row in place of the their right / their left row.
- Side notes now include "the front as a whole" and "the back as a whole" (side keys F and B), shown before the
  left and right notes in a center and after them in a spot.
- Dots sit behind labels. Zodiac disclaimer lines removed from the panels (it lives in About).

## 2026-11-13, changes round 2 (interface only)
- Labels are solid in every state (front, back, dimmed), so a dot behind a label never shows through. Only the
  label's text and dot fade for back and dimmed spots.
- The left rail fits at every desktop width: the four view tabs share the row, the search hint is "Search the map",
  the bottom buttons do not clip. Checked at nine widths from 1000 to 1920.
- The frame rate readout is gone from the rail and from the About panel.
