import bpy, numpy as np, math
from mathutils import Vector
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def import_fbx(path):
    before=set(bpy.data.objects)
    bpy.ops.wm.fbx_import(filepath=path)
    return [o for o in bpy.data.objects if o not in before]
def mesh_from_np(name, verts, faces):
    me=bpy.data.meshes.new(name); me.from_pydata(verts.tolist(), [], faces.tolist()); me.update()
    ob=bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); return ob
def world_verts(o):
    n=len(o.data.vertices); a=np.empty(n*3,dtype=np.float32); o.data.vertices.foreach_get("co",a); a=a.reshape(n,3)
    m=np.array(o.matrix_world); return a@m[:3,:3].T+m[:3,3]
def mat(name,color,alpha=1.0,emit=0.0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=(*color,1); b.inputs["Alpha"].default_value=alpha
    b.inputs["Roughness"].default_value=0.6
    if emit: b.inputs["Emission Color"].default_value=(*color,1); b.inputs["Emission Strength"].default_value=emit
    return m
def setmat(o,m):
    o.data.materials.clear(); o.data.materials.append(m)
def render_views(prefix, views=("front","side"), center=(0,0,0.85), scale=1.95, res=(700,1000), samples=12):
    sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=samples; sc.cycles.use_denoising=False
    sc.cycles.max_bounces=6; sc.cycles.transparent_max_bounces=12
    sc.render.resolution_x,sc.render.resolution_y=res; sc.render.film_transparent=False
    w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.75,0.75,0.78,1); w.node_tree.nodes["Background"].inputs[1].default_value=1.0
    cam=bpy.data.cameras.new("c"); cam.type="ORTHO"; cam.ortho_scale=scale; co=bpy.data.objects.new("c",cam); sc.collection.objects.link(co); sc.camera=co
    sun=bpy.data.lights.new("s","SUN"); sun.energy=2.5; so=bpy.data.objects.new("s",sun); sc.collection.objects.link(so)
    dirs={"front":(0,-5,0),"back":(0,5,0),"side":(5,0,0),"q":(3.5,-3.5,0.5)}
    for v in views:
        d=Vector(dirs[v]); c=Vector(center); co.location=c+d
        co.rotation_euler=(c-co.location).to_track_quat("-Z","Y").to_euler(); so.rotation_euler=co.rotation_euler
        sc.render.filepath=f"{prefix}_{v}.png"; bpy.ops.render.render(write_still=True)
