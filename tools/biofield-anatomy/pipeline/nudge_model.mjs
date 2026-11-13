// Small edits to the finished model without a full rebuild: move whole parts, drop unused meshes.
// usage: node nudge_model.mjs in.glb out.glb model.json   (run from a folder that holds node_modules)
// 2026-11-13: the kidneys sit nearly level (left about 4 mm higher), each adrenal moves with its kidney, the unused aura shells go.
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const MOVE = { kidney_l: [0, -0.007, 0], adrenal_l: [0, -0.007, 0], kidney_r: [0, 0.005, 0], adrenal_r: [0, 0.005, 0] };   // metres, glTF axes (y up)
const DROP = /^aura_/;
const [inp, outp, mj] = process.argv.slice(2);
const doc = await io.read(inp); const root = doc.getRoot(); const M = JSON.parse(fs.readFileSync(mj, 'utf8'));
for (const n of root.listNodes()) {
  const nm = n.getName();
  if (DROP.test(nm)) { const m = n.getMesh(); n.dispose(); if (m) { m.listPrimitives().forEach((p) => { [...p.listAttributes(), p.getIndices()].forEach((a) => a && a.dispose()); p.dispose(); }); m.dispose(); } console.log('dropped', nm); continue; }
  const d = MOVE[nm.replace(/^organ_/, '')]; if (!d) continue;
  const t = n.getTranslation(); n.setTranslation([t[0] + d[0], t[1] + d[1], t[2] + d[2]]);
  const o = M.organs[nm.replace(/^organ_/, '')]; for (const k of ['center', 'min', 'max']) o[k] = o[k].map((v, i) => +(v + d[i]).toFixed(4));
  console.log('moved', nm, d);
}
await io.write(outp, doc); fs.writeFileSync(mj, JSON.stringify(M, null, 1));
console.log('wrote', outp, fs.statSync(outp).size);
