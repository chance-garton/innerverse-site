// Adds the aura shells (from aura_shell.py) to the model as meshes aura_1..3. usage: node add_aura.mjs in.glb aura.json out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [inp, aj, outp] = process.argv.slice(2);
const doc = await io.read(inp); const root = doc.getRoot(); const buf = root.listBuffers()[0]; const scene = root.listScenes()[0];
root.listNodes().filter((n) => /^aura_/.test(n.getName())).forEach((n) => { const m = n.getMesh(); n.dispose(); if (m) m.dispose(); });
const A = JSON.parse(fs.readFileSync(aj, 'utf8'));
for (const [name, a] of Object.entries(A)) {
  const acc = (arr, type, T) => doc.createAccessor().setArray(new T(arr)).setType(type).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute('POSITION', acc(a.P, 'VEC3', Float32Array)).setAttribute('NORMAL', acc(a.N, 'VEC3', Float32Array)).setAttribute('TEXCOORD_0', acc(a.U, 'VEC2', Float32Array)).setIndices(acc(a.I, 'SCALAR', Uint16Array));
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)); node.setExtras({ aura: a.offset }); scene.addChild(node);
}
await io.write(outp, doc);
console.log('wrote', outp, fs.statSync(outp).size);
