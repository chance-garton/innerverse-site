"""Blender: pull chosen Z-Anatomy meshes (world space, triangles) into one npz. Read-only on the source."""
import sys, re, json, numpy as np, bpy
sys.path.insert(0,"/home/claude/bfa/src"); import bl_util as U
M, out = sys.argv[-2], sys.argv[-1]
def anc(o):
    a=[]
    while o.parent: o=o.parent; a.append(o.name)
    return a
def tris(o):
    me=o.data; me.calc_loop_triangles()
    t=np.empty(len(me.loop_triangles)*3,dtype=np.int32); me.loop_triangles.foreach_get("vertices",t)
    return U.world_verts(o), t.reshape(-1,3)
SKIP=re.compile(r"\.(j|t|s|i|g)$")
out_groups={}; sources={}
def add(group,objs):
    for o in objs:
        v,t=tris(o)
        if not len(t): continue
        out_groups.setdefault(group,[]).append((v,t)); sources.setdefault(group,[]).append(o.name)
def meshes(): return {o.name:o for o in bpy.data.objects if o.type=="MESH" and not SKIP.search(o.name)}
def take(group,d,names,optional=()):
    for n in names:
        if n in d: add(group,[d[n]])
        elif n not in optional: print("MISSING",group,n)
# --- viscera
U.reset(); U.import_fbx(M+"VisceralSystem100.fbx"); d=meshes()
take("lung_l",d,["Superior lobe of left lung","Inferior lobe of left lung"])
take("lung_r",d,["Superior lobe of right lung","Middle lobe of right lung","Inferior lobe of right lung"])
take("trachea",d,["Trachea","Left main bronchus","Right main bronchus"])
for g,n in [("liver","Liver"),("gallbladder","Gallbladder"),("stomach","Stomach"),("pancreas","Pancreas"),("kidney_l","Kidney.l"),("kidney_r","Kidney.r"),
            ("adrenal_l","Suprarenal gland.l"),("adrenal_r","Suprarenal gland.r"),("bladder","Urinary bladder"),("thyroid","Thyroid gland"),("pineal","Pineal gland")]:
    take(g,d,[n])
take("pituitary",d,["Adenohypophysis","Neurohypophysis"])
take("small_intestine",d,["Jejunum","Duodenum"])
take("large_intestine",d,["Ascending colon","Transverse colon","Descending colon","Sigmoid colon"])
take("appendix",d,["Vermiform appendix"])
take("sinuses",d,["Mucosa of nasal cavity"])
take("larynx",d,["Epiglottis"])
print("large intestine children:",[o.name for o in d.values() if "Large intestine.g" in anc(o)])
print("small intestine children:",[o.name for o in d.values() if "Small intestine.g" in anc(o)])
# --- diaphragm
U.reset(); U.import_fbx(M+"MuscularSystem100.fbx"); d=meshes(); take("diaphragm",d,["Diaphragm"])
# --- lymphoid
U.reset(); U.import_fbx(M+"LymphoidOrgans100.fbx"); d=meshes(); take("spleen",d,["Spleen"])
# --- heart
U.reset(); U.import_fbx(M+"CardioVascular41.fbx"); d=meshes()
take("heart",d,["Right atrium","Right ventricle","Left ventricle","Left atrium","Ascending aorta","Pulmonary trunk","Superior vena cava","Aortic arch","Arch of aorta"],optional=("Aortic arch","Arch of aorta"))
print("aort*:",[n for n in d if re.search(r"(?i)aort|arch",n)][:20])
# --- brain, eyes
U.reset(); U.import_fbx(M+"NervousSystem100.fbx"); d=meshes()
lobes=set()
for o in d.values():
    a=anc(o)
    if "Cerebrum.g" in a: lobes.add(a[0])
print("cerebrum parents:",sorted(lobes))
BAD=re.compile(r"(?i)white matter|commissure|pallidus|ventricle|hypothalamus|callosum|thalam|optic|nucle|striat|capsule|fornix|putamen|caudate|amygd|hippocamp|claustrum|peduncle|tract|aqueduct|septum|stria|geniculate|habenul|mammill|infundib|tuber|lamina|velum|plexus|fibres|fasciculus|radiation|genu|splenium|rostrum|body of")
brain=[]
for o in d.values():
    a=anc(o)
    if BAD.search(o.name): continue
    if "Cerebrum.g" in a and re.search(r"(?i)gyr|lobule|insula|cuneus|sulc|pole|operc|uncus|area",o.name): brain.append(o)
    elif "Cerebellum.g" in a: brain.append(o)
    elif o.name in ("Pons.l","Pons.r","Midbrain.l","Midbrain.r","Medulla oblongata.l","Medulla oblongata.r"): brain.append(o)
add("brain",brain); print("brain parts",len(brain))
take("eye_l",d,["Sclera.l","Cornea.l"]); take("eye_r",d,["Sclera.r","Cornea.r"])
take("sciatic_l",d,["Sciatic nerve.l"]); take("sciatic_r",d,["Sciatic nerve.r"])
take("vagus",d,["Vagus nerve (X).l","Vagus nerve (X).r"])
# --- bones
U.reset(); U.import_fbx(M+"SkeletalSystem100.fbx"); d=meshes()
sp=["Atlas (C1)","Axis (C2)"]+[f"Vertebra C{i}" for i in range(3,8)]+[f"Vertebra T{i}" for i in range(1,13)]+[f"Vertebra L{i}" for i in range(1,6)]+["Sacrum","Coccyx"]
take("hip_l",d,["Hip bone.l"]); take("hip_r",d,["Hip bone.r"])
# spine by level (Chance, Q32): neck throat, upper back heart, mid-back solar plexus, low back and sacrum sacral, tailbone root
take("spine_neck",d,["Atlas (C1)","Axis (C2)"]+[f"Vertebra C{i}" for i in range(3,8)])
take("spine_upper",d,[f"Vertebra T{i}" for i in range(1,7)])
take("spine_mid",d,[f"Vertebra T{i}" for i in range(7,13)])
take("spine_low",d,[f"Vertebra L{i}" for i in range(1,6)]+["Sacrum"])
take("spine_tail",d,["Coccyx"])
take("jaw",d,["Mandible"])
take("larynx",d,["Thyroid cartilage","Cricoid cartilage","Arytenoid cartilage.l","Arytenoid cartilage.r"])
take("sinuses",d,["Sinus of frontal bone","Sinus of sphenoid bone"]+[f"{a} cells of ethmoid bone.{s_}" for a in ("Anterior","Middle","Posterior") for s_ in "lr"])
for n in ["Femur.l","Patella.l","Tibia.l"]:
    if n in d:
        v,_=tris(d[n]); save_ref=sources.setdefault("_legrefs",{}); save_ref[n]=[v.min(0).round(4).tolist(),v.max(0).round(4).tolist(),v[v[:,2]>v[:,2].max()-0.03].mean(0).round(4).tolist(),v[v[:,2]<v[:,2].min()+0.03].mean(0).round(4).tolist()]
for n in ["Femur.l","Hip bone.l","Atlas (C1)","Sacrum","Humerus.l","Clavicle.l","Vertebra L5","Vertebra T1","Vertebra C7"]:
    if n in d:
        v,_=tris(d[n]); print("BONE",n,v.min(0).round(3),v.max(0).round(3))
# --- skin regions (reference shell)
U.reset(); U.import_fbx(M+"Regions of human body100.fbx"); d=meshes()
ARM=re.compile(r"(?i)arm\b|forearm|elbow|wrist|hand|palm|digits of hand|bicipital|cubital|^Nail plate\.|^Perionyx\.|Deltoid")
for n,o in d.items():
    if re.search(r"(?i)hair|eyelash",n): continue
    add("skin_arm" if ARM.search(n) else "skin_core",[o])
    v,_=tris(o); sources.setdefault("_regions",{})[n]=[v.min(0).round(4).tolist(),v.max(0).round(4).tolist()]
# --- write
save={}
for g,parts in out_groups.items():
    vs=[];ts=[];off=0
    for v,t in parts: vs.append(v);ts.append(t+off);off+=len(v)
    save[g+"__v"]=np.concatenate(vs).astype(np.float32); save[g+"__t"]=np.concatenate(ts).astype(np.int32)
    print(f"{g:16s} v={len(save[g+'__v']):7d} t={len(save[g+'__t']):7d} min={save[g+'__v'].min(0).round(3)} max={save[g+'__v'].max(0).round(3)}")
np.savez_compressed(out,**save); json.dump(sources,open(out.replace(".npz","_sources.json"),"w"),indent=1)
