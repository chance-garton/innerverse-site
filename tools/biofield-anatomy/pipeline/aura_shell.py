# Builds the aura shells: smooth, inflated copies of the skin (voxel remesh so thin parts fuse cleanly).
# usage: python3 aura_shell.py skin.json aura.json
import bpy, json, sys, numpy as np
from scipy.spatial import cKDTree
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src)); P = np.array(d['P'], np.float64).reshape(-1, 3); U = np.array(d['U'], np.float64).reshape(-1, 2); I = np.array(d['I'], np.int64).reshape(-1, 3)
# glTF (Y up) -> Blender (Z up)
Pb = np.stack([P[:, 0], -P[:, 2], P[:, 1]], 1)
tree = cKDTree(P)
bpy.ops.wm.read_factory_settings(use_empty=True)
def obj_from(verts, faces, name):
    me = bpy.data.meshes.new(name); me.from_pydata(verts.tolist(), [], faces.tolist()); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); return ob
def baked(ob):
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev, depsgraph=dg)
    me.calc_loop_triangles(); v = np.array([x.co[:] for x in me.vertices]); f = np.array([t.vertices[:] for t in me.loop_triangles]); return v, f
base = obj_from(Pb, I, 'skin')
m = base.modifiers.new('r', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = 0.009; m.use_smooth_shade = True
v0, f0 = baked(base)
out = {}; SMOOTH = [14, 30, 50]
for k, (off, vox, tris) in enumerate([(0.020, 0.012, 9000), (0.055, 0.018, 6000), (0.110, 0.026, 4000)], 1):
    ob = obj_from(v0, f0, 'a%d' % k)
    dm = ob.modifiers.new('d', 'DISPLACE'); dm.direction = 'NORMAL'; dm.strength = off; dm.mid_level = 0.0
    rm = ob.modifiers.new('r', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = vox; rm.use_smooth_shade = True
    sm = ob.modifiers.new('s', 'SMOOTH'); sm.factor = 0.6; sm.iterations = 12
    v, f = baked(ob)
    ob2 = obj_from(v, f, 'b%d' % k); dc = ob2.modifiers.new('c', 'DECIMATE'); dc.ratio = min(1.0, tris / max(1, len(f)))
    v, f = baked(ob2)
    me = bpy.data.meshes.new('n%d' % k); me.from_pydata(v.tolist(), [], f.tolist()); me.update()
    for p in me.polygons: p.use_smooth = True
    n = np.array([x.normal[:] for x in me.vertices])
    g = np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1); gn = np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1)   # back to glTF axes
    # carry the chakra coordinate over from the nearest few skin points
    dist, idx = tree.query(g, k=6); w = 1.0 / (dist + 1e-4); uv = (U[idx] * w[..., None]).sum(1) / w.sum(1)[:, None]
    # ease the carried colour across the shell, so where an arm's glow meets the hip's there is a blend and not an edge
    nv = len(g); nb = np.zeros((nv, 2)); cnt = np.zeros(nv)
    e = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]]); e = np.concatenate([e, e[:, ::-1]])
    for _ in range(SMOOTH[k - 1]):
        nb[:] = 0; cnt[:] = 0; np.add.at(nb, e[:, 0], uv[e[:, 1]]); np.add.at(cnt, e[:, 0], 1); uv = 0.5 * uv + 0.5 * nb / np.maximum(cnt, 1)[:, None]
    out['aura_%d' % k] = {'P': np.round(g, 5).ravel().tolist(), 'N': np.round(gn, 4).ravel().tolist(), 'U': np.round(uv, 4).ravel().tolist(), 'I': f.ravel().tolist(), 'offset': off}
    print('aura_%d' % k, len(v), 'verts', len(f), 'tris', 'y', g[:, 1].min().round(3), g[:, 1].max().round(3), 'x', g[:, 0].min().round(3), g[:, 0].max().round(3))
json.dump(out, open(dst, 'w'))
