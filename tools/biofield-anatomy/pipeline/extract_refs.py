import sys, json, numpy as np, bpy
sys.path.insert(0,"/home/claude/bfa/src"); import bl_util as U
M,out=sys.argv[-2],sys.argv[-1]
U.reset(); U.import_fbx(M+"SkeletalSystem100.fbx"); d={o.name:o for o in bpy.data.objects if o.type=="MESH"}
save={}
for n in ["Femur.l","Humerus.l","Clavicle.l","Mandible","Manubrium of sternum","Tibia.l","Talus.l","Patella.l","Frontal bone","Occipital bone","Parietal bone.l"]:
    save[n]=U.world_verts(d[n])
np.savez(out,**save); print("ok",list(save))
