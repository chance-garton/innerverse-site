"""Write viewer/src/model.json: zone colours, organ list with positions (glTF coords: x = figure's left, y up, z toward the viewer), body landmarks."""
import json, sys
sys.path.insert(0,"/home/claude/bfa/src"); import zones as Z
W="/home/claude/bfa/work/"; st=json.load(open(W+"organ_stats.json")); J=json.load(open(W+"mh_joints.json"))
def g(p): return [round(p[0],4),round(p[2],4),round(-p[1],4)]
organs={}
for k,v in st.items():
    mn,mx=g(v["min"]),g(v["max"]); lo=[min(a,b) for a,b in zip(mn,mx)]; hi=[max(a,b) for a,b in zip(mn,mx)]
    organs[k.replace("organ_","")]={"label":v["label"],"zone":v["zone"],"center":g(v["center"]),"min":lo,"max":hi,"size":round(max(b-a for a,b in zip(lo,hi)),4)}
zones=[{"index":i,"slug":s,"region":n,"chakra":c,"color":col,"y":h} for i,(s,n,c,col,h) in enumerate(Z.ZONES)]
zones[0].update({"accent":Z.FEET_ACCENT,"dot":Z.FEET_DOT})
data={"zones":zones,"neutral":"#cfc7b4","legs":Z.LEGS,"organs":organs,
      "joints":{k:g(J[k]) for k in ("l-ankle","l-knee","l-upper-leg","pelvis","neck","head","head-2","l-shoulder","l-elbow","l-hand","l-eye","jaw","l-clavicle")},
      "body":{"height":1.659,"mid":0.03,"frame":{"y":0.86,"w":0.95,"h":1.86,"tilt":2}},
      "credits":{"anatomy":"Anatomy models: Z-Anatomy, CC BY-SA 4.0","body":"Body: MakeHuman, CC0","map":"The Biofield Anatomy is the work of Eileen Day McKusick"}}
json.dump(data,open(sys.argv[1],"w"),indent=1); print("zones",len(zones),"organs",len(organs))
