import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(process.argv[2]);
const out = {};
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const name = node.getName();
  if (name !== 'skin') { out[name] = { tris: mesh.listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0) }; continue; }
  const prim = mesh.listPrimitives()[0]; const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices();
  const P = [], U = []; const v = [0, 0, 0], u = [0, 0];
  const m = node.getWorldMatrix();
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); P.push(m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]); uv.getElement(i, u); U.push(u[0], u[1]); }
  fs.writeFileSync('/home/claude/bfa/work/skin.json', JSON.stringify({ P, U, I: Array.from(idx.getArray()) }));
  console.log('skin', pos.getCount(), 'verts', idx.getCount() / 3, 'tris', 'world', m.slice(12, 15), 'scale', m[0], m[5], m[10]);
}
console.log(Object.keys(out).length, 'other meshes; parents:', [...new Set(doc.getRoot().listNodes().map((n) => (n.getParentNode() ? n.getParentNode().getName() : 'ROOT')))]);
