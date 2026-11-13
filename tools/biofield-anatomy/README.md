# Biofield Anatomy 3D

The interactive 3D body for the future `/biofield-anatomy` page: the model pipeline, the viewer and the checks.
Nothing here is wired into the site build yet.

## What is here

- `pipeline/` builds the model. Order: `build_mh.py` (body), `extract_za.py` (organs and other parts),
  `fit.py` (fits them into the body), `assemble.py` (mesh reduction, raw GLB), then `gltf-transform weld` and
  `gltf-transform meshopt --level medium`, then `make_data.py` (writes `viewer/src/model.json`).
- `pipeline/zones.py` is the single place for the eight colour zones and for which mesh lights with which center.
- `pipeline/build_content.py` turns the authoring files into the viewer's `content.json` and checks them
  (every reviewed item accounted for, no cut items, no dashes). The authoring files and the reviewed map are NOT
  in this repo: see "Wording" below.
- `viewer/src/` is the viewer: plain Three.js modules, bundled with esbuild.
  - `scene.js`: the 3D scene. Skin regions, organs, orbs, the field (edge, timeline rings, central channel,
    Sun Star, Earth Star, ancestral rivers, mother and father zones, adrenal field), camera moves, picking.
  - `app.js`: the page. Four views (Chakras, Field, Organs, Zodiac), lists, the detail panel, labels placed in
    the scene, search, the feelings index, deep links, the phone sheet.
  - `model.json`: zone colours, organ positions, body landmarks (written by `make_data.py`).
  - `content.sample.json`: the full structure of the content with placeholder wording, so the viewer runs here.
- `viewer/model/body.glb` is the finished model (1.8 MB, meshopt compressed).
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
