"""Write viewer/src/zones.json: zones, colours, camera frames and organ list (glTF coords: x, up, toward viewer)."""
import json, sys
sys.path.insert(0,"/home/claude/bfa/src"); import zones as Z
W="/home/claude/bfa/work/"; st=json.load(open(W+"organ_stats.json")); J=json.load(open(W+"mh_joints.json"))
def g(p): return [round(p[0],4),round(p[2],4),round(-p[1],4)]
FR={ # zone -> (centre height, frame width, frame height, camera tilt deg above horizon)
 "feet":(0.29,0.70,0.70,4),"root":(0.85,0.62,0.50,2),"sacral":(0.97,0.58,0.46,2),"solar":(1.10,0.58,0.46,2),
 "heart":(1.25,0.74,0.50,2),"throat":(1.44,0.42,0.34,0),"mind":(1.56,0.36,0.32,0),"crown":(1.60,0.38,0.32,30)}
zones=[]
for i,(slug,name,chakra,color,h) in enumerate(Z.ZONES):
    cy,fw,fh,tilt=FR[slug]
    organs=[{"id":k.replace("organ_",""),"label":v["label"],"center":g(v["center"]),"size":round(max(b-a for a,b in zip(v["min"],v["max"])),4)} for k,v in st.items() if v["zone"]==i]
    zones.append({"index":i,"slug":slug,"name":name,"chakra":chakra,"color":color,"frame":{"y":cy,"w":fw,"h":fh,"tilt":tilt,"depth":-0.03},"organs":organs})
data={"zones":zones,"body":{"height":1.659,"frame":{"y":0.86,"w":0.95,"h":1.86,"tilt":2,"depth":-0.03}},
      "credits":{"anatomy":"Anatomy models: Z-Anatomy, CC BY-SA 4.0","body":"Body: MakeHuman, CC0","map":"The Biofield Anatomy is the work of Eileen Day McKusick"}}
json.dump(data,open(sys.argv[1],"w"),indent=1); print("zones",len(zones),"organs",sum(len(z["organs"]) for z in zones))
