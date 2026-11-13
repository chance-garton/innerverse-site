"""Single source for the eight zones: names (as on /biofield-tuning), colours, heights, organ assignment."""
import numpy as np
ZONES=[  # slug, short region name, chakra label, colour, centre height on the MakeHuman body (m)
 ("legs",   "Thighs, Knees, Ankles & Feet",              "Legs",         "#5c0b13", 0.50),   # darkest red, reached at the soles (see LEGS)
 ("root",   "Hips, Pelvis & Glutes",                     "Root",         "#e0232f", 0.86),
 ("sacral", "Reproductive Organs, Bladder & Intestines", "Sacral",       "#f57a1e", 0.96),
 ("solar",  "Solar Plexus, Kidneys & Liver",             "Solar Plexus", "#f7cf2a", 1.10),
 ("heart",  "Heart, Lungs & Shoulders",                  "Heart",        "#33c26b", 1.25),
 ("throat", "Throat, Ears, Jaw, Mouth & Thyroid",        "Throat",       "#2f9be8", 1.42),
 ("thirdeye","Mind, Eyes, Brain & Head",                 "Third Eye",    "#4a4bd8", 1.56),
 ("crown",  "Crown",                                     "Crown",        "#a45cf0", 1.648),
]
# Leg colour (Chance, 2026-11-12): one even gradient from the root red at the top of the thighs down to the
# feet colour at the soles. The viewer shades the legs by height between these two levels; the region
# coordinate above still decides which region a tap selects and what lights up.
LEGS={"top":0.86,"bottom":0.0}
FEET_ACCENT="#d8434c"   # the feet colour is too dark for small text on the dark panel; the panel text uses this instead
FEET_DOT="#9a1520"      # and the dot in the region list uses this, so it still shows on the dark panel
WHOLE=8   # colour slot for whole-body structures (the vagus nerve): a neutral pearl, set in the viewer
ORGANS={ # mesh -> (zone index, label, target triangles). Zone moves from the review: large intestine to sacral (Q2),
         # stomach to solar plexus (Q3), pituitary to crown (Q5); spine split by level (Q32); appendix sacral (Q34).
 "hip_l":(1,"Left hip bone",3000),"hip_r":(1,"Right hip bone",3000),"spine_tail":(1,"Tailbone",600),
 "sciatic_l":(1,"Left sciatic nerve",1400),"sciatic_r":(1,"Right sciatic nerve",1400),
 "large_intestine":(2,"Large intestine",14000),"small_intestine":(2,"Small intestine",12000),"bladder":(2,"Bladder",1000),
 "appendix":(2,"Appendix",440),"spine_low":(2,"Lower back and sacrum",7000),
 "stomach":(3,"Stomach",3000),"liver":(3,"Liver",4000),"gallbladder":(3,"Gallbladder",700),"kidney_l":(3,"Left kidney",1500),"kidney_r":(3,"Right kidney",1500),
 "adrenal_l":(3,"Left adrenal gland",600),"adrenal_r":(3,"Right adrenal gland",600),"spleen":(3,"Spleen",1300),"pancreas":(3,"Pancreas",1500),
 "spine_mid":(3,"Mid-back spine",4500),
 "heart":(4,"Heart",7000),"lung_l":(4,"Left lung",5000),"lung_r":(4,"Right lung",5000),"diaphragm":(4,"Diaphragm",6000),"spine_upper":(4,"Upper back spine",4500),
 "thyroid":(5,"Thyroid",1000),"trachea":(5,"Windpipe",1500),"larynx":(5,"Voice box",3000),"jaw":(5,"Jaw",4000),"spine_neck":(5,"Neck spine",5000),
 "brain":(6,"Brain",36000),"eye_l":(6,"Left eye",800),"eye_r":(6,"Right eye",800),"pineal":(6,"Pineal gland",400),"sinuses":(6,"Sinuses and nasal cavity",5000),
 "pituitary":(7,"Pituitary gland",400),
 "vagus":(WHOLE,"Vagus nerve",7000),
}
ZH=np.array([z[4] for z in ZONES]); ZI=np.arange(len(ZONES),dtype=float)
def height_coord(z): return np.interp(z,ZH,ZI)
def smoothstep(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def skin_coord(V,quads,masks,armw,joints,iters=8):
    """Continuous zone coordinate (0..7) for every skin vertex + arm fade (0 shoulder .. 1 fingertips)."""
    z=V[:,2]; ax=np.abs(V[:,0]); c=height_coord(z)
    sh=joints["l-shoulder"][2]
    s=smoothstep(0.055,0.10,ax)*(z<1.44)*(z>1.20); c=c*(1-s)+np.minimum(c,4.0)*s          # shoulder tops stay heart
    c=c*(1-armw)+4.0*armw                                                                    # arms carry the heart zone
    ear=masks["ears"]&(ax>0.062); c[ear]=5.0
    jaw=(masks["mouth"]|masks["chin"])&(z<1.53); c[jaw]=5.0
    c[masks["buttocks"]]=1.0
    nb=[[] for _ in range(len(V))]
    for q in quads:
        for i in range(4): a,b=q[i],q[(i+1)%4]; nb[a].append(b); nb[b].append(a)
    idx=np.concatenate([np.array(n) for n in nb]); cnt=np.array([len(n) for n in nb]); own=np.repeat(np.arange(len(V)),cnt)
    for _ in range(iters):
        avg=np.bincount(own,weights=c[idx],minlength=len(V))/np.maximum(cnt,1); c=0.5*c+0.5*avg
    tip=V[armw>0.5][:,2].min()
    fade=np.clip((sh-z)/(sh-tip),0,1)*smoothstep(0.3,0.9,armw)
    return c,fade
