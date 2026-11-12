# Biofield Anatomy 3D

The interactive 3D body for the future `/biofield-anatomy` page. This folder holds
the model pipeline, the viewer source and the checks. Nothing here is wired into
the site build yet.

## What is here

- `pipeline/` builds the model. Order: `build_mh.py` (body), `extract_za.py` and
  `extract_refs.py` (organs and landmarks), `fit.py` (fits organs into the body),
  `assemble.py` (zones, mesh reduction, raw GLB), then `gltf-transform weld` and
  `gltf-transform meshopt --level medium`, then `make_data.py` (zones.json).
- `pipeline/zones.py` is the single place for the eight regions: names, colours,
  heights, which organ belongs to which region, and the leg gradient (`LEGS`).
- `pipeline/look.py` renders quick close views of the body alone, for checking a
  shape change before the full rebuild.
- `viewer/src/` is the viewer: plain Three.js modules, bundled with esbuild.
- `viewer/model/body.glb` is the finished model (1.6 MB, meshopt compressed).
- `checks/` holds the Playwright screenshot and interaction checks.

The scripts were written in a scratch workspace and still carry its paths
(`/home/claude/bfa`, plus clones of `makehumancommunity/makehuman` and
`LluisV/Z-Anatomy-Sample`). Point those at your own folders before a rebuild.

A fresh session rebuilds like this (about ten minutes, most of it downloads):
`pip install bpy numpy scipy pillow`; clone the two repos above into
`/home/claude/bfa/ext/`; copy `pipeline/*.py` to `/home/claude/bfa/src/`; then
`build_mh.py <makehuman>/makehuman/data work/mh.npz`,
`extract_za.py "<Z-Anatomy-Sample>/Assets/Models/1.0 Models/" work/za.npz`,
`fit.py`, `assemble.py work/body_raw.glb`, the two `gltf-transform` steps, and
`make_data.py viewer/src/zones.json`. The checks take the Chromium path from
the `PW_CHROME` environment variable when the installed Playwright and the
installed browser do not match.
Tools: Blender as the `bpy` Python module (5.3), numpy, scipy,
`@gltf-transform/cli`, `three`, `esbuild`, `playwright`.

## Model contents

- `skin`: the body shell. UV x carries the region coordinate (0 feet to 7 crown,
  divided by 7), UV y carries the arm fade (0 shoulder to 1 fingertips). The
  chest is flat and has no nipples (`flat_chest` in `build_mh.py`).
- Leg colour is not in the model: the viewer shades the legs by height, from the
  root colour at `legs.top` to the feet colour at `legs.bottom` (both in
  `zones.json`). The region coordinate still decides taps and highlights.
- `organ_*`: one mesh per organ, with `zone` and `label` in the node extras.
- `axis_spine`: the spine, coloured by height like the skin.

glTF axes: Y up, the figure faces +Z, +X is the figure's own left.

## Licences and credit

- Body: MakeHuman base mesh, shape targets and default rig weights, CC0.
- Organs and bones: Z-Anatomy (from `LluisV/Z-Anatomy-Sample`), CC BY-SA 4.0.
  The meshes were reshaped to fit the body and reduced, so `viewer/model/body.glb`
  is an adaptation and stays under CC BY-SA 4.0. `pipeline/z-anatomy-sources.json`
  lists the source meshes behind each organ.
- Page credit line: "Anatomy models: Z-Anatomy, CC BY-SA 4.0. Body: MakeHuman, CC0."
- The Biofield Anatomy is the work of Eileen Day McKusick. No book text lives in
  this repository.
