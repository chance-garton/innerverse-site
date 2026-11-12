"""Quick Cycles look at a body npz: python3 look.py in.npz prefix [center z] [scale]"""
import sys, numpy as np, bpy
sys.path.insert(0,"/home/claude/bfa/src"); import bl_util as U
src,prefix=sys.argv[1],sys.argv[2]; cz=float(sys.argv[3]) if len(sys.argv)>3 else 1.25; scale=float(sys.argv[4]) if len(sys.argv)>4 else 0.6
views=sys.argv[5].split(",") if len(sys.argv)>5 else ["front","side","q"]
U.reset(); d=np.load(src); ob=U.mesh_from_np("b",d["verts"].astype(float),d["quads"])
m=ob.modifiers.new("s","SUBSURF"); m.levels=1
for p in ob.data.polygons: p.use_smooth=True
U.setmat(ob,U.mat("m",(0.72,0.5,0.42)))
U.render_views(prefix,views=views,center=(0,0,cz),scale=scale,res=(600,600),samples=24)
