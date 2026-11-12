"""Warp Z-Anatomy organs (torso + head) into the MakeHuman body using matched skin profiles.
Pure numpy/scipy. Output npz with warped organ meshes + report of how much of each organ sits inside the body."""
import numpy as np, json, sys
from scipy.ndimage import gaussian_filter1d
W="/home/claude/bfa/work/"
mh=np.load(W+"mh.npz"); J=json.load(open(W+"mh_joints.json")); za=np.load(W+"za.npz")
MV=mh["verts"]; Q=mh["quads"]; MT=np.concatenate([Q[:,[0,1,2]],Q[:,[0,2,3]]])
ZV=za["skin_core__v"].astype(float); ZT=za["skin_core__t"]
def edges(T):
    e=np.concatenate([T[:,[0,1]],T[:,[1,2]],T[:,[2,0]]]); e.sort(1); return np.unique(e,axis=0)
def profile(V,T,zs,gap):
    E=edges(T); a=V[E[:,0]]; b=V[E[:,1]]
    out=np.full((len(zs),4),np.nan)   # xmin,xmax,yfront,yback of the central piece
    for i,z in enumerate(zs):
        m=(a[:,2]-z)*(b[:,2]-z)<0
        if m.sum()<6: continue
        t=((z-a[m,2])/(b[m,2]-a[m,2]))[:,None]; p=a[m]+t*(b[m]-a[m])
        o=np.argsort(p[:,0]); x=p[o,0]; y=p[o,1]
        cuts=np.where(np.diff(x)>gap)[0]; st=np.concatenate([[0],cuts+1]); en=np.concatenate([cuts+1,[len(x)]])
        for s,e in zip(st,en):
            if x[s]<=0.004 and x[e-1]>=-0.004:
                out[i]=[x[s],x[e-1],y[s:e].min(),y[s:e].max()]; break
    return out
dz=0.004
zm=np.arange(0.60,1.66,dz); zz=np.arange(0.60,1.712,dz)
ARMV=mh["arm"]>0.5; MTc=MT[~ARMV[MT].any(1)]   # torso/legs/head only, like the ZA core skin
PM=profile(MV,MTc,zm,0.03); PZ=profile(ZV,ZT,zz,0.02)
# ---- landmarks (z): ZA -> MH
def first_valid(P,zs): return zs[np.where(~np.isnan(P[:,0]))[0][0]]
crotch_m=first_valid(PM,zm)
hw_m=(PM[:,1]-PM[:,0])/2; hw_z=(PZ[:,1]-PZ[:,0])/2
# MH armpit: first level above the waist where the central piece suddenly includes the arms
armpit_m=J["l-shoulder"][2]-0.07
ZA_L={"hip":0.861,"sc":1.401,"eye":1.5907,"crown":1.7092}
MH_L={"hip":J["l-upper-leg"][2],"sc":J["l-clavicle"][2],"eye":J["l-eye"][2],"crown":float(MV[:,2].max())}
# chin + nose tip from the front midline of each skin, as extra head ties
def midline_front(V,zlo,zhi):
    m=(np.abs(V[:,0])<0.012)&(V[:,2]>zlo)&(V[:,2]<zhi); return V[m]
def nose_chin(V,sc,crown):
    P=midline_front(V,sc,crown); front=P[P[:,1]<np.median(P[:,1])]
    nose=front[np.argmin(front[:,1])]
    below=front[(front[:,2]<nose[2]-0.025)&(front[:,2]>sc+0.03)]
    # chin = lowest point still close to the face front
    face=below[below[:,1]<below[:,1].min()+0.02]; chin=face[np.argmin(face[:,2])]
    return nose,chin
nz,cz=nose_chin(ZV,ZA_L["sc"],ZA_L["crown"]); nm,cm=nose_chin(MV,MH_L["sc"],MH_L["crown"])
ZA_L.update(nose=float(nz[2]),chin=float(cz[2])); MH_L.update(nose=float(nm[2]),chin=float(cm[2]))
order=["hip","sc","chin","nose","eye","crown"]
za_z=np.array([ZA_L[k] for k in order]); mh_z=np.array([MH_L[k] for k in order])
print("landmarks ZA:",dict(zip(order,za_z.round(3)))); print("landmarks MH:",dict(zip(order,mh_z.round(3))))
print("MH crotch",round(crotch_m,3),"MH armpit",round(armpit_m,3), "ZA crotch(first central)",round(first_valid(PZ,zz),3))
assert np.all(np.diff(za_z)>0) and np.all(np.diff(mh_z)>0)
def zmap(z):
    z=np.asarray(z,float); out=np.interp(z,za_z,mh_z)
    lo=z<za_z[0]; s0=(mh_z[1]-mh_z[0])/(za_z[1]-za_z[0]); out[lo]=mh_z[0]+(z[lo]-za_z[0])*s0
    return out
def zinv(z): return np.interp(z,mh_z,za_z)
# ---- cap shoulder widths so arms do not count as torso
def capped(hw,zs,arm_z):
    hw=hw.copy(); ref=np.nanmax(hw[(zs>arm_z-0.06)&(zs<arm_z-0.01)])
    neck_i=np.where(zs>arm_z)[0]
    hw[neck_i]=np.minimum(hw[neck_i],ref); return hw,ref
hw_m,ref_m=capped(hw_m,zm,armpit_m); armpit_z=float(zinv(armpit_m)); hw_z,ref_z=capped(hw_z,zz,armpit_z)
print("torso half width at armpit: MH",round(ref_m,3),"ZA",round(ref_z,3),"| ZA armpit z",round(armpit_z,3))
def fill(a):
    i=np.arange(len(a)); ok=~np.isnan(a); return np.interp(i,i[ok],a[ok])
def sm(a,s=3.5): return gaussian_filter1d(fill(a),s,mode="nearest")
prof_m={"hw":sm(hw_m),"cx":sm((PM[:,0]+PM[:,1])/2*0),"f":sm(PM[:,2]),"b":sm(PM[:,3])}
prof_z={"hw":sm(hw_z),"f":sm(PZ[:,2]),"b":sm(PZ[:,3])}
def warp(P):
    P=np.asarray(P,float); z=P[:,2]; z2=zmap(z)
    hwz=np.interp(z,zz,prof_z["hw"]); fz=np.interp(z,zz,prof_z["f"]); bz=np.interp(z,zz,prof_z["b"])
    hwm=np.interp(z2,zm,prof_m["hw"]); fm=np.interp(z2,zm,prof_m["f"]); bm=np.interp(z2,zm,prof_m["b"])
    x2=P[:,0]*hwm/hwz
    y2=bm+(P[:,1]-bz)*(fm-bm)/(fz-bz)
    return np.stack([x2,y2,z2],1)
# ---- apply
A=MV[MT[:,0]]; E1=MV[MT[:,1]]-A; E2=MV[MT[:,2]]-A
def inside_frac(pts):
    d=np.array([0.5377,0.2113,0.8161]); d/=np.linalg.norm(d); h=np.cross(d,E2); a=(E1*h).sum(1); ok=np.abs(a)>1e-12; f=np.where(ok,1/np.where(ok,a,1),0)
    res=[]
    for p in pts:
        s_=p-A; u=f*(s_*h).sum(1); q=np.cross(s_,E1); v=f*(q@d); t=f*(q*E2).sum(1)
        res.append((ok&(u>=0)&(v>=0)&(u+v<=1)&(t>1e-9)).sum()%2==1)
    return np.array(res)
out={}; rep={}
names=sorted({k[:-3] for k in za.files if not k.startswith("skin")})
for n in names:
    v=warp(za[n+"__v"]); t=za[n+"__t"]
    if n.startswith("eye_"):
        j=np.array(J["l-eye" if n=="eye_l" else "r-eye"]); c=(v.min(0)+v.max(0))/2
        v=(v-c)+j+np.array([0,0.004,0])
    out[n+"__v"]=v.astype(np.float32); out[n+"__t"]=t
    s=v[np.random.default_rng(0).choice(len(v),min(len(v),1500),replace=False)]
    inside=inside_frac(s[:400]).mean()
    rep[n]={"inside":round(float(inside),3),"min":v.min(0).round(3).tolist(),"max":v.max(0).round(3).tolist()}
    print(f"{n:16s} inside={inside:5.1%}  z {v[:,2].min():.3f}..{v[:,2].max():.3f}  x {v[:,0].min():+.3f}..{v[:,0].max():+.3f}  y {v[:,1].min():+.3f}..{v[:,1].max():+.3f}")
out["refskin__v"]=warp(ZV).astype(np.float32); out["refskin__t"]=ZT
np.savez_compressed(W+"organs_fit.npz",**out)
json.dump({"landmarks_za":ZA_L,"landmarks_mh":MH_L,"crotch_mh":float(crotch_m),"armpit_mh":float(armpit_m),"report":rep,
           "profile_mh":{"z":zm.round(4).tolist(),"hw":prof_m["hw"].round(4).tolist(),"front":prof_m["f"].round(4).tolist(),"back":prof_m["b"].round(4).tolist()}},open(W+"fit.json","w"))
d=np.abs(out["refskin__v"][:,None,:2]-0).shape
