# Biofield Anatomy 3D

The interactive 3D body for the future `/biofield-anatomy` page: the model pipeline, the viewer and the checks.
Nothing here is wired into the site build yet.

## What is here

- `pipeline/` builds the model. Order: `build_mh.py` (body), `extract_za.py` (organs and other parts),
  `fit.py` (fits them into the body), `assemble.py` (mesh reduction, raw GLB), then `gltf-transform weld` and
  `gltf-transform meshopt --level medium`, then `make_data.py` (writes `viewer/src/model.json`).
- `pipeline/zones.py` is the single place for the eight colour zones and for which mesh lights with which center.
- `pipeline/aura_shell.py` and `pipeline/add_aura.mjs` build the three aura shells from the finished model's skin and
  add them to it: `node extract_skin.mjs body.glb` (writes `skin.json` into the scratch `work/` folder), `python3 aura_shell.py skin.json aura.json`,
  `node add_aura.mjs body.glb aura.json raw.glb`, then `gltf-transform meshopt --level medium raw.glb body.glb`.
  Run the node scripts from a folder that holds `node_modules` (they import `@gltf-transform/core`).
- `pipeline/build_content.py` turns the authoring files into the viewer's `content.json` and checks them
  (every reviewed item accounted for, no cut items, no dashes). The authoring files and the reviewed map are NOT
  in this repo: see "Wording" below.
- `viewer/src/` is the viewer: plain Three.js modules, bundled with esbuild.
  - `scene.js`: the 3D scene. Skin regions, organs, orbs, the field (edge, timeline rings, central channel,
    Sun Star, Earth Star, ancestral rivers, mother and father zones, adrenal field), camera moves, picking.
    Also the torus of fine threads around the body (between the Sun Star and the Earth Star, fixed in the room) and the
    zodiac colour layer. Region masks are data (`MASK`), one GLSL expression per name in `REGIONS`.
  - `app.js`: the page. Five views (Chakras, Feelings, Field, Body Parts, Zodiac), lists, the detail panel, labels placed in
    the scene, search, deep links, the phone sheet, the links in the wording and the "Keep exploring" block that closes
    every entry, the zodiac colours (one spectrum from Aries at the head to Pisces at the feet), one button per feeling, and the
    powers and governed parts of a center as buttons.
  - `model.json`: zone colours, organ positions, body landmarks (written by `make_data.py`).
  - `content.sample.json`: the full structure of the content with placeholder wording, so the viewer runs here.
- `viewer/model/body.glb` is the finished model (1.79 MB, meshopt compressed). The aura shells were dropped on 2026-11-13: the aura is a
  blur of the body's own light, drawn by the viewer.
- `pipeline/nudge_model.mjs` makes small edits to the finished model with no full rebuild (move whole parts, drop meshes) and keeps
  `viewer/src/model.json` in step. Used on 2026-11-13 to set the kidneys nearly level.
- `checks/` holds the Playwright checks (`checks.mjs`), a screenshot helper (`shot.mjs`) and the preview build.

## Wording

All wording on the page comes from one content file, `content.json`, which the viewer reads as
`window.__BFA_CONTENT`. That file is built from the reviewed biofield map and paraphrases copyrighted books, so
neither it nor its authoring files live in this public repo. They are kept in the project docs, and the live page
will get its wording from the Airtable table `Biofield Anatomy`. Build a real preview with
`CONTENT=/path/to/content.json checks/build_viewer.sh`; without `CONTENT` the placeholder sample is used.

A content node carries its own display settings beside its wording: `light` (which skin regions and meshes it
lights), `frame` (camera), `config` and `anchor` (which spots sit around the body and where), `parts`, `signs`.
Region names are listed at the top of `scene.js`.

## Rebuild

The scripts still carry the scratch workspace paths (`/home/claude/bfa`, with clones of
`makehumancommunity/makehuman` and `LluisV/Z-Anatomy-Sample` under `ext/`). A fresh session:
`pip install bpy numpy scipy pillow`; `npm i @gltf-transform/cli three esbuild playwright`; copy `pipeline/*.py`
to `/home/claude/bfa/src/`; then
`build_mh.py <makehuman>/makehuman/data work/mh.npz`, `extract_za.py "<za>/Assets/Models/1.0 Models/" work/za.npz`,
`fit.py`, `assemble.py work/body_raw.glb`, the two `gltf-transform` steps, `make_data.py viewer/src/model.json`.
Tools: Blender as the `bpy` Python module (5.3), numpy, scipy, `@gltf-transform/cli`, `three`, `esbuild`,
`playwright` (use the installed Chrome through `PW_CHROME`).

## Model contents

- `skin`: the body shell. UV x carries the chakra coordinate (0 legs to 7 crown, divided by 7), UV y carries the
  arm fade (0 shoulder to 1 fingertips). Named skin regions (knees, shoulders, lower back and so on) are worked
  out in the skin shader from that coordinate and the position, so they can be tuned without a rebuild.
- `organ_*`: one mesh per part, with `zone` (colour slot) and `label` in the node extras. Since 2026-11-12 this
  includes the diaphragm, sinuses and nasal cavity, voice box, jaw, appendix, both sciatic nerves, the vagus
  nerve, and the spine in five stretches (`spine_neck`, `spine_upper`, `spine_mid`, `spine_low`, `spine_tail`).
- There are no reproductive organ meshes by choice: that area is a lit zone.
- Leg colour is not in the model: the viewer shades the legs by height.

glTF axes: Y up, the figure faces +Z, +X is the figure's own left.

## Licences and credit

- Body: MakeHuman base mesh, shape targets and default rig weights, CC0.
- Organs, nerves and bones: Z-Anatomy (from `LluisV/Z-Anatomy-Sample`), CC BY-SA 4.0. The meshes were reshaped to
  fit the body and reduced, so `viewer/model/body.glb` is an adaptation and stays under CC BY-SA 4.0.
  `pipeline/z-anatomy-sources.json` lists the source meshes behind each part.
- Page credit line: "Anatomy models: Z-Anatomy, CC BY-SA 4.0. Body: MakeHuman, CC0."
- The Biofield Anatomy is the work of Eileen Day McKusick. No book text lives in this repository.
