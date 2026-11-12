"""Build an androgynous MakeHuman CC0 body (numpy only), arms lowered, with semantic vertex masks.
Output npz: verts (m, Z up, facing -Y, feet on z=0), quads, masks; json: joints."""
import numpy as np, sys, os, json, glob, math
D = sys.argv[1]; out = sys.argv[2]; ARM_DEG = float(sys.argv[3]) if len(sys.argv)>3 else 20.0; ELBOW = float(sys.argv[4]) if len(sys.argv)>4 else 0.7
V=[]; groups={}; cur=None
for line in open(os.path.join(D,"3dobjs/base.obj")):
    if line.startswith("v "): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith("g "): cur=line.split()[1]; groups.setdefault(cur,[])
    elif line.startswith("f "): groups[cur].append([int(p.split("/")[0])-1 for p in line.split()[1:]])
V=np.array(V); NV=len(V)
def target(path):
    d=np.zeros((NV,3))
    for line in open(path):
        if line.startswith("#") or not line.strip(): continue
        p=line.split(); d[int(p[0])]=[float(p[1]),float(p[2]),float(p[3])]
    return d
T=os.path.join(D,"targets")
for g in ("female","male"):
    V=V+0.5*target(f"{T}/macrodetails/universal-{g}-young-averagemuscle-averageweight.target")
    for race in ("caucasian","asian","african"):
        V=V+0.5*(1/3)*target(f"{T}/macrodetails/{race}-{g}-young.target")
# semantic masks from the shape targets that touch each feature
def tmask(pattern, thr=0.2):
    m=np.zeros(NV,bool)
    for p in glob.glob(os.path.join(T,pattern)):
        n=np.linalg.norm(target(p),axis=1)
        if n.max()>0: m|= n>thr*n.max()
    return m
masks={"ears":tmask("ears/*.target",0.25),"mouth":tmask("mouth/*.target",0.3),"chin":tmask("chin/*.target",0.3),"buttocks":tmask("buttocks/*.target",0.3)}
# skeleton joints and arm weights (CC0 default rig)
sk=json.load(open(os.path.join(D,"rigs/default.mhskel"))); wt=json.load(open(os.path.join(D,"rigs/default_weights.mhw")))["weights"]
def jpos(name): return V[sk["joints"][name]].mean(0)
def descendants(root):
    kids={}
    for b,i in sk["bones"].items(): kids.setdefault(i["parent"],[]).append(b)
    out=[root]; st=[root]
    while st:
        for k in kids.get(st.pop(),[]): out.append(k); st.append(k)
    return out
armw={}
for side,sgn in (("L",1),("R",-1)):
    w=np.zeros(NV)
    for b in descendants(f"upperarm01.{side}"):
        for i,x in wt.get(b,[]): w[i]+=x
    w=np.clip(w,0,1); armw[side]=w
    piv=jpos(sk["bones"][f"upperarm01.{side}"]["head"])
    a=math.radians(ARM_DEG)*sgn      # MakeHuman space: Y up, Z front; lower the arm by rotating about Z
    c,s=math.cos(a),math.sin(a)
    P=V-piv; R=np.stack([P[:,0]*c+P[:,1]*s, -P[:,0]*s+P[:,1]*c, P[:,2]],1)+piv
    V=V+w[:,None]*(R-V)
    # ease the elbow so the forearm hangs with the upper arm instead of reaching forward
    sh=jpos(sk["bones"][f"upperarm01.{side}"]["head"]); el=jpos(sk["bones"][f"lowerarm01.{side}"]["head"]); ha=jpos(sk["bones"][f"wrist.{side}"]["head"])
    u=(el-sh)/np.linalg.norm(el-sh); f=(ha-el)/np.linalg.norm(ha-el)
    ax=np.cross(f,u); ax/=np.linalg.norm(ax); ang=math.acos(float(np.clip(f@u,-1,1)))*ELBOW
    w2=np.zeros(NV)
    for b in descendants(f"lowerarm01.{side}"):
        for i,x in wt.get(b,[]): w2[i]+=x
    w2=np.clip(w2,0,1); P=V-el; c,s=math.cos(ang),math.sin(ang)
    R=P*c+np.cross(ax,P)*s+np.outer(P@ax,ax)*(1-c)+el
    V=V+w2[:,None]*(R-V)
    print(side,"elbow eased by",round(math.degrees(ang),1),"deg")
body=groups["body"]; used=sorted({i for f in body for i in f}); remap={o:n for n,o in enumerate(used)}
quads=np.array([[remap[i] for i in f] for f in body])
def conv(P): return np.stack([P[:,0]*0.1,-P[:,2]*0.1,P[:,1]*0.1],1)
verts=conv(V[used]); zmin=verts[:,2].min(); verts[:,2]-=zmin
joints={}
for k,fs in groups.items():
    if k.startswith("joint-"):
        p=conv(V[sorted({i for f in fs for i in f})]).mean(0); p[2]-=zmin; joints[k[6:]]=p.round(5).tolist()
save={"verts":verts,"quads":quads,"arm":(armw["L"]+armw["R"])[used]}
for k,m in masks.items(): save[k]=m[used]
np.savez(out,**save); json.dump(joints,open(out.replace(".npz","_joints.json"),"w"))
print("verts",len(verts),"quads",len(quads),"bounds",verts.min(0).round(3),verts.max(0).round(3))
print({k:int(m[used].sum()) for k,m in masks.items()}, "arm verts",int((save["arm"]>0.5).sum()))
for k,m in masks.items(): print(k, verts[m[used]].min(0).round(3), verts[m[used]].max(0).round(3))
for k in ["l-shoulder","l-elbow","l-hand","l-upper-leg","l-clavicle","l-eye","head","neck"]: print(k,joints[k])
