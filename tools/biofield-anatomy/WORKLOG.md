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
