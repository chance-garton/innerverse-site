import bpy, sys, json, os
from mathutils import Vector
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
try:
    bpy.ops.wm.fbx_import(filepath=src)
except Exception as e:
    print("new importer failed", e)
    bpy.ops.preferences.addon_enable(module="io_scene_fbx")
    bpy.ops.import_scene.fbx(filepath=src)
rows=[]
for o in bpy.data.objects:
    r={"name":o.name,"type":o.type,"parent":o.parent.name if o.parent else None}
    if o.type=="MESH":
        m=o.matrix_world
        cs=[m@Vector(c) for c in o.bound_box]
        r["min"]=[round(min(c[i] for c in cs),4) for i in range(3)]
        r["max"]=[round(max(c[i] for c in cs),4) for i in range(3)]
        r["v"]=len(o.data.vertices); r["f"]=len(o.data.polygons)
        r["mats"]=[s.material.name if s.material else None for s in o.material_slots]
    rows.append(r)
json.dump(rows,open(out,"w"))
print("objects",len(rows),"meshes",sum(1 for r in rows if r["type"]=="MESH"))
