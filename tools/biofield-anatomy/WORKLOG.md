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

## 2026-11-13, polish round (the look, the interface language, first ease-of-use fixes)

Branch `biofield-anatomy-polish-2026-11-13`, cut from `ae5bd65` on `biofield-anatomy-3d-2026-11-12`, which is left as it was.

- Skin: lit for form (soft key light, dimmer core, luminous edge). Zone colours blend across the whole gap between
  centres. The legs sit back a little when nothing is chosen. Only the hands ease toward a pale neutral.
- Leg bands fixed: the four leg regions are added and clamped, where before `max` left each border at half strength.
- Aura: three smooth shells around the body (`aura_1` to `aura_3` in the model, 19k triangles together). Built by
  `pipeline/aura_shell.py` from the skin (voxel remesh, offset, remesh, smooth, reduce; the chakra coordinate is
  carried over from the nearest skin points and eased across the shell) and added by `pipeline/add_aura.mjs`.
  A first try that pushed the skin out along its normals broke up at hands, ears and toes. Model is now 1.94 MB.
- Parts: shadow side leans deeper in hue, soft highlight, wider tint spread between neighbours; nerves carry a soft
  halo so they never shrink to a hairline; hip bones sit closer to the root's hue.
- Glow pass (`EffectComposer`, `UnrealBloomPass`, antialiased half-float target). The canvas is opaque now and the
  backdrop is drawn in the scene. A struggling device loses the glow pass first, then sharpness.
- Backdrop: fine dust and one slow, faint astrolabe ring. The old colour card behind the body is nearly off.
- Orbs: brighter core with a fine ring. The legs orb is gone; the Legs label points at the thigh.
- At rest the scene draws a third of the frames; any input or movement brings it back to full rate.
- Camera: zoom follows the pointer, double click resets, a gentle idle turn on the opening view until first touch.
- View controls under the figure: which side faces the viewer (press to turn around), zoom, reset. The figure keeps
  clear of them.
- Pointing at the body lifts that zone and names it beside the cursor (mouse only, Chakras view).
- Interface language moved to the site's Astrolabe tokens: Libre Caslon Display, Libre Franklin, Fjalla One for the
  mark, warm ivory ink, hairlines, lapis focus rings. Gold is no longer used in the interface. Nothing is set below
  12px. Controls are at least 36px with a mouse and 44px on touch screens (labels on the model 36px on phones so
  eight of them fit beside the figure). Themes run as a quiet line of words; only things that go somewhere are pills.
- Each selection is a step in the browser's history. One tab is always lit. Whole body parts have a group in the
  Chakras list. The opening panel leads with the ways in. Timeline age labels alternate above and below their ring.
  Search marks the matched words and keeps each result on one line.
- Loading shows a ring in the seven colours.

## 2026-11-13, polish round 3 (finding your way) with Chance's four notes

Branch `biofield-anatomy-polish-r3-2026-11-13`, cut from `930cff4` on `biofield-anatomy-polish-2026-11-13`, which is left as it was.

- Glow: lower, wider and with a soft knee (`UnrealBloomPass(0.15, 0.9, 0.42)`, `smoothWidth 0.5`, where before a hard brightness line
  switched it on). Skin rim and the lit zone are less bright. The aura shells are about 40% quieter, fade out before the silhouette
  edge and stay quiet at the hands. At rest the scene draws every other frame (was every third), so the slow motion stays even.
- The astrolabe rings are gone. In their place: a torus of 27 fine threads around the body, all meeting at the Sun Star above the
  head and the Earth Star below the feet. Half carry a warm pulse down the outside (the descending current), half a cool pulse up
  (the ascending current), with a small waver. It is built in the room, not on the screen, so it keeps its place as the body turns.
  Threads between the eye and the body, and anything close to the lens, step back so the figure is never veiled. It dims in the
  field view, behind a selection and in the all-parts view; still in reduced motion. The dust is in the room too. The whole-body
  views frame a little wider so both stars show (phones keep the figure larger).
- Zodiac body: every sign paints its own regions in its own colour. Element by hue (fire red, earth green, air yellow, water blue),
  mode by shade (cardinal light, mutable pure, fixed deep). The colours live in `app.js` (`ELEMENT`, `ELEMENT_COLOR`, `ELEMENT_INK`);
  the regions are each sign's `light.regions` from the content. Signs paint in `ZPAINT` order, broad areas first, so a smaller area
  sits on top of a larger one (Cancer's whole torso under Virgo, Libra, Leo, Scorpio and Gemini). A chosen sign glows in its own
  colour, the other eleven stay as a faint tint. The region masks are now data (`MASK` in `scene.js`), shared by the selection light
  and the zodiac layer. Legend grid in the Zodiac panel. Sign frames have a margin (defect 9).
- No dead ends (D5, D3, D7): the names of parts, centers, field topics, signs and feelings in the wording are links (quiet buttons,
  one per destination per panel, built only from the entries' own names and their plain singular and plural forms). Every entry,
  spot and feeling closes with "Keep exploring": Follow the thread (what the wording names), Feelings that may live here, Also
  mentioned in (entries that name this one), Previous and Next (Above and Below for centers), and Copy a link. One plain anatomy
  word stands for several parts: digestion offers Stomach, Small intestine and Large intestine (`CONCEPTS`; for Chance to confirm).
  About, Field, Body Parts and Zodiac openings all carry ways in.
- Feelings is a fifth view (D1) with its own list; a feeling keeps that tab lit and its breadcrumb says Feelings. The five tabs sit
  in two rows on desktop and one row on phones. A to Z and About keep the view they were opened from.
- Tapping the body still opens the center at once, then offers what lies deeper at that point in a small menu: the part under the
  finger and the spot on that side (C4).
- Keys (C7): `/` search, up and down for previous and next, left and right to turn, Escape back, `?` for the list (also a button
  under the figure). The search box is the first Tab stop.
- Search (C5): recent searches and a few feelings on focus, the closest entry on a near miss, A to Z when nothing fits.
- Age (C8): a typed box beside a larger slider, remembered on the device. Opened sections stay open from entry to entry (C9).
  The opening panel offers "Pick up where you left off" on a return visit (D9). On desktop the rail is the map of a center's parts
  and the panel drops its copy; phones keep it (C3).
- Checks: 112 pass at 1440 and 390 wide, 26 of them new (every entry has at least two ways onward and no link to nowhere or to
  itself, skin leads to the liver and digestion, Feelings view, twelve colours by element and shade, keys, age box, search help,
  the deeper menu, return visit). Frame rate on the software renderer with the glow on: 1 to 2 a second, the same as round 1.
- Not built from round 3: the phone sheet changes in C6 (they belong with the phone pass in round 4).

## 2026-11-13, round 3 follow-up (Chance's eye on the preview)

His notes: the glow doubles where two zones overlap (the arm glow over the torso glow); the threads waver oddly; their shape is
an onion, not a torus; the field view has the better shape but at another scale.

- Aura rebuilt. The three shell meshes are no longer drawn. The skin is drawn alone into a small buffer (a third of the page size),
  blurred wide in three passes, and laid behind the figure (`renderAura` in `scene.js`). One blur of one picture cannot stack, so
  there is no brighter patch between an arm and the torso or between the legs, and each stretch of halo takes the colour of the skin
  beside it. It follows whatever is lit: a chosen center glows, the dimmed rest does not, and the zodiac body has a halo in the
  signs' colours. A struggling device drops the glow pass, then sharpness, then this. `aura_1..3` are still in the model
  (about 340 KB) and can go at the next model rebuild.
- Threads: no waver and no crackle; only the pulses move, at an even pace measured in metres along the thread.
- One torus, one scale. Each family of threads is the field shell's own apple profile. The outermost family lies on the field's
  edge (5.5 ft out), and the family at 54% of that size is the same shape with its two dimples exactly on the Sun Star and the
  Earth Star. Larger families reach the stars through a funnel, so every thread leaves one star, rounds the outside and enters the
  other. Families at 38%, 54%, 76% and 100% of the field (`FAMILIES`); the inmost is stretched a little taller, since a true-shape
  copy that small would stop short of the stars. In the body views the camera sits inside the torus; the Field view shows all of it
  with the shell as its skin, and the threads stay lit there.
- "Keep exploring" is one plain row of pills with no sub-headings and no previous and next buttons (his word). Order: what the
  wording names, entries that name this one, then feelings. An entry with fewer than three gets its neighbours added, so nothing is a
  dead end. The arrow keys still step up and down.
- The view button says only Front view, Back view, Left view or Right view (the figure's own left and right); the "their right is
  on your left" line is gone.
- `checks/single_file.py` writes the built preview as one self-contained HTML file that opens straight from disk, so it can be seen
  full screen with no host page around it. With the real wording inside, that file stays out of this repo.
- Feelings is no longer a tab (his word). It is a button in the foot row of the rail, between Biofield A to Z and About, and opens
  the feelings index the way those two open theirs; the tab of the view it was opened from stays lit. The four view tabs are back
  in one row and wrap to two only when the rail is too narrow for them. Below 1320 wide the first button reads "A to Z". Phones have
  no foot row, so there the feelings index is reached from the opening panel and from A to Z.
- The Legs open as four clearly separate pieces (thighs, knees, ankles with the shins, feet): a dark seam on the model where one
  piece meets the next, a label on each piece with its heading, the piece under the pointer lifting on its own, and four cards in
  the panel under "Parts of the leg" on every screen size. Tapping a piece, its label or its card opens it. The seam heights are the
  same breaks the tap already used (`LEG_BAND` in `app.js`, the seam lines in the skin shader).

## 2026-11-13, last polish round (Chance's list of 15:05 and his notes while it was built)

- Chakra lights: the seven sit inside the body on the central line (x 0, the mid-plane depth) and are drawn over it, so they stay in
  one vertical column however the figure is turned. The fade when seen from behind is gone. Labels lead to the same points.
- Kidneys: the left sits about 4 mm above the right (it was 16 mm). Each adrenal moved with its kidney. Done with
  `pipeline/nudge_model.mjs`, which also dropped the unused `aura_1..3` shells (model 1.94 MB to 1.79 MB).
- Side cards read "Right" and "Left"; no "their" is left anywhere in the interface.
- Opening panel: no eyebrow and no repeated title; the lede is a definition of the biofield (in the content file); "Pick up where you
  left off" is gone; the A to Z and About pills show on phones only. On a desktop the panel never scrolls: `fitHome()` tightens it in
  three steps when it would overflow (spacing, then the reading rules fold to one line that opens on a click, then the type).
- Legs: the dark seams are gone. Each of the four pieces has a light outline all the way round (a fine line above and below each
  joint, the top of the thigh, a lit silhouette), and the piece under the pointer glows much more strongly.
- Zodiac colours (his pick from three stills): one spectrum from head to feet, Aries scarlet to Pisces crimson, with a fine light line
  where each sign's area ends (`SIGN_COLOR`, `SIGN_INK`, `ZOD_EDGE` in `app.js`; `uZodEdge` in the skin shader). Element and mode stay
  as words on each sign's page. The legend lists the twelve in body order.
- Fonts (his pick): Marcellus for the main heading and every panel title; the small capital labels are Fjalla One at 0.15em, a little
  tighter than the INNERVERSE mark at 0.2em (`--display`, `--label` in `index.html`).
- Nothing is folded behind "+N more": powers, parts and "Keep exploring" are always shown in full.
- A center's powers and what it governs sit under small titles in the center's colour, every word its own button. A button goes to
  the feeling or entry it names, else to the one place that speaks of it, else it opens the search on the places that do. With
  nowhere to go it shows as a plain word (`wordDest`, `wordChip`, `governsList` in `app.js`). The governs sentence is split into its
  own phrases; a check proves no word of it is lost.
- Feelings: one feeling per button everywhere (index, A to Z, search, opening panel, "Keep exploring"). An entry whose name rolls
  several together is offered as one button per feeling, each opening the same shared page (`FEEL_ONE`, `feelChips`). Links by a
  single feeling's name work (`#feeling-joy`), and the old joined link still opens its page.
- Checks: section 5b added for all of the above.

## 2026-11-13, powers and body pages (Chance's notes on the last polish preview)

- Every power and every governed body item is a button with a page of its own. Nothing is greyed out, nothing fills the search box,
  and no power jumps straight to a zone. The content file carries the pages as `powers` (name, type `power` or `body`, home centers,
  and targets that are existing reviewed lines grouped as flow, stuck or where) and each center's `governs.items` (label and
  destination: a part id, or `@Name` for a body page). `content.sample.json` has neither, so the sample build shows plain words.
- A power page (`renderPower` in `app.js`): its centers, "When it flows", "If it feels stuck or blocked", each line a button to its
  zone. Power and body pages share the feeling pages' plumbing (`S.feeling` holds the name; `topicOf`, `isPower`); links are
  `#power-name` and `#body-name`; they are in the search under "Feelings and powers", not in A to Z.
- A power that is also a feeling (Love, Joy, Gratitude) opens the feeling page.
- Legs: one fine line at each joint in place of the double line.
- Removed: `wordDest`, `governsList`, the search-on-click chips.
- A power page can carry a short note of its own (`note`), shown under the opening line. A power with no line of its own carries its
  center's reading, in balance and out of balance (`general`), so no page is empty and no page says the map is unfinished.
- Chance's rule, 2026-11-13: no wording that makes the map feel incomplete ("for now", "carry no meaning" and the like). The content
  file was swept and a check guards it.

## 2026-11-13, evening: first look on a real phone (Chance's screenshot from the Claude iOS app, about 395 by 745)

- Center labels slid under the tabs: the label column had no upper bound when eight labels were taller than the stage. Now it closes
  up evenly inside the stage (`place` in `app.js`), labels are 30px tall on screens under 800 tall, and the half sheet leaves the
  stage at least 330px (`SHEETS.half`).
- Stair-stepped body edge: the glow pass drew a 3x phone at 2x with no smoothing, and the slow-device ladder could fall to 1x. Now
  the glow target is multisampled whenever it is drawn below the screen's density, the aura goes before the last step of
  sharpness, and a 3x phone never drops below 1.5x. Not verifiable on the software renderer: needs his eye.
- No A to Z on phones (his word): the top bar is the title and one search bubble that opens the search ready to type. The opening
  panel and the search's no-match row do not offer A to Z on phones.
- The sheet text fades at its bottom edge.
- Narrating lines cut (his word): the A to Z count line, the feelings index tagline, the zodiac legend's spectrum sentence.

## 2026-11-14: the review sitting (every open item put to Chance and ruled; this is the build of what he ruled in)

- One label per place on the figure for feeling, power and body pages (`applyScene` in `app.js`): lines that point to the same
  place share one label, and lines that differ only in balance share the center's label with no second line. A power with no line of
  its own showed ten labels on its center; it shows one.
- A to Z lists every power and body page, with a Powers filter.
- The timeline: under the age slider, the years to each foot of the field, the age over a field counted as 6 feet deep, as a whole
  number and a simple fraction (`perFoot`). The Field view's opening panel takes its title and an invitation to the timeline from
  the content file (`info.field.title`, `info.field.invite`); the breadcrumb and the back button follow that title.
- Zodiac glyphs are drawn (`GLYPH` in `app.js`, twelve small stroke drawings), so they look the same on every device.
- Lines cut on his word: the drag hint under the figure, the "choose a spot" caption on center panels, the Body Parts opening line.
  The feeling page opens with his own line, singular or plural as the page needs.
- Field view: the shell fades when the view is too close to hold it, so no arcs of its rim cross the corners; its rim is a cool
  pearl; the ancestral rivers and the left-hand ditch are soft ribbons that taper at both ends and face the viewer (`ribbon` in
  `scene.js`); field labels take the side their mark is on, and the ones on the central line go to the side with room.
- Phone sheet: the way back sits in the sheet header (`#sheethead`; `placeChrome` moves the button in and out); the booking bar is a
  slim line while reading and grows into the full button at the end of an entry (`atEnd`); a quick flick carries the sheet to the
  next stop; the feelings index opens at full height; a soft ripple shows where the body was pressed (touch only, off in reduced
  motion). Every pick from the scene now carries its screen point and pointer type.
- The small version for `/biofield-tuning` (`embed.js`, `mini.html`). The scene takes `opts.embed` (no zoom, a fixed tilt, the page
  still scrolls under a finger, `setPaused` while off screen) and `opts.turn` (a slow turn that waits five seconds after a touch).
- Ruled out and not built: the guided tour, the Airtable table, the "where in the body" inset, the label line changes, legends on
  the opening panels. The zoom buttons beside Front and Reset were already on the desktop layout and were left as they are.
- Labels behind the body (his word, the same morning): in a center, a leg stop, and on feeling, power and body pages, the labels,
  dots and lines on the far side go behind the body where it overlaps them, so front and back read at a glance. The labels stay
  ordinary buttons. Each frame the scene draws the body's outline to the screen buffer (`renderMask`), the page copies the small
  boxes around the far labels from it, the real frame is drawn over it, and the page copies the same boxes again through the outline
  (`occMask`, `occAfter` in `app.js`) onto `#occ`, a canvas that lies over the far labels and under the near ones. Far lines move to
  `#leaders`, near lines live in `#leadersTop`. A press that lands on the body where it covers a far label goes to the body
  (`scene.pickAt`). A device where the copying costs more than 7 ms a frame drops back to plain dimmed labels. A single part shown
  alone is left as it was, because the body is only a ghost there.
- Checks: section 5c in `checks/checks.mjs`.
