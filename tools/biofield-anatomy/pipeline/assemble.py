"""Blender: build the final scene (skin + organs + spine) and export a raw GLB. Y-up, facing +Z in glTF."""
import sys, json, numpy as np, bpy, bmesh
sys.path.insert(0,"/home/claude/bfa/src"); import bl_util as U, zones as Z
W="/home/claude/bfa/work/"; OUT=sys.argv[-1]
U.reset(); sc=bpy.context.scene
d=np.load(W+"mh.npz"); J=json.load(open(W+"mh_joints.json"))
V=d["verts"].astype(float); Q=d["quads"]
coord,fade=Z.skin_coord(V,Q,{k:d[k] for k in ("ears","mouth","chin","buttocks")},d["arm"],J)
def finish(ob,zone_uv=None):
    me=ob.data
    for p in me.polygons: p.use_smooth=True
    me.update()
def set_uv(me,u,v):
    """u,v per vertex -> UV layer (V is flipped by the exporter, so store 1-v)."""
    uv=me.uv_layers.new(name="zone"); li=np.empty(len(me.loops),dtype=np.int32); me.loops.foreach_get("vertex_index",li)
    data=np.stack([u[li],1.0-v[li]],1).astype(np.float32).ravel(); uv.data.foreach_set("uv",data)
def eval_mesh(ob,name):
    dg=bpy.context.evaluated_depsgraph_get(); me=bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); me.name=name
    nob=bpy.data.objects.new(name,me); sc.collection.objects.link(nob); bpy.data.objects.remove(ob); return nob
# ---- skin
skin=U.mesh_from_np("skin_src",V,Q)
a=skin.data.attributes.new("zc","FLOAT","POINT"); a.data.foreach_set("value",coord.astype(np.float32))
a=skin.data.attributes.new("fade","FLOAT","POINT"); a.data.foreach_set("value",fade.astype(np.float32))
m=skin.modifiers.new("sub","SUBSURF"); m.levels=1; m.subdivision_type="CATMULL_CLARK"
skin=eval_mesh(skin,"skin")
n=len(skin.data.vertices); zc=np.empty(n,np.float32); fd=np.empty(n,np.float32)
skin.data.attributes["zc"].data.foreach_get("value",zc); skin.data.attributes["fade"].data.foreach_get("value",fd)
skin.data.attributes.remove(skin.data.attributes["zc"]); skin.data.attributes.remove(skin.data.attributes["fade"])
set_uv(skin.data,zc/7.0,fd); finish(skin); skin["kind"]="skin"
print("skin verts",n,"faces",len(skin.data.polygons))
# ---- organs
o=np.load(W+"organs_fit.npz"); stats={}
for name,(zi,label,target) in Z.ORGANS.items():
    v=o[name+"__v"].astype(float); t=o[name+"__t"]
    ob=U.mesh_from_np(name+"_src",v,t)
    bm=bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=2e-5); bm.to_mesh(ob.data); bm.free()
    nt=len(ob.data.polygons)
    if name=="brain":   # many separate gyri: fuse into one clean outer surface before reducing
        rm=ob.modifiers.new("rm","REMESH"); rm.mode="VOXEL"; rm.voxel_size=0.0013; rm.use_smooth_shade=True
        ob=eval_mesh(ob,name+"_src"); nt=len(ob.data.polygons)*2
        sm=ob.modifiers.new("sm","SMOOTH"); sm.factor=0.5; sm.iterations=2
        md=ob.modifiers.new("dec","DECIMATE"); md.ratio=target/nt
    elif nt>target*1.15:
        md=ob.modifiers.new("dec","DECIMATE"); md.ratio=target/nt
    ob=eval_mesh(ob,("axis_" if zi<0 else "organ_")+name)
    vv=U.world_verts(ob)
    u=(Z.height_coord(vv[:,2]) if zi<0 else np.full(len(vv),float(zi)))/7.0
    set_uv(ob.data,u.astype(np.float32),np.zeros(len(vv),np.float32)); finish(ob)
    ob["kind"]="axis" if zi<0 else "organ"; ob["zone"]=zi; ob["label"]=label
    stats[ob.name]={"zone":zi,"label":label,"tris":len(ob.data.polygons),"verts":len(vv),"center":((vv.min(0)+vv.max(0))/2).round(4).tolist(),"min":vv.min(0).round(4).tolist(),"max":vv.max(0).round(4).tolist()}
    print(f"{ob.name:24s} {nt:7d} -> {len(ob.data.polygons):6d} tris")
json.dump(stats,open(W+"organ_stats.json","w"),indent=1)
bpy.ops.export_scene.gltf(filepath=OUT,export_format="GLB",export_yup=True,export_normals=True,export_texcoords=True,
    export_materials="NONE",export_extras=True,export_apply=False,export_animations=False,export_skins=False,export_morph=False,export_cameras=False,export_lights=False)
print("exported",OUT)
