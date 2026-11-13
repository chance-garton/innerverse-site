"""Build the display content for the Biofield Anatomy viewer from the authoring files (content/*.bfa).

The authoring files and the output hold wording drawn from the reviewed biofield map. They live OUTSIDE the
public repo (project docs / Airtable). This script only parses, checks and reports:
  content.json      what the viewer loads
  coverage.txt      every reviewed item ID accounted for (shown, or left out with a reason)
  copy-sheet.md     every line of wording, grouped by screen, for Chance to read through
Usage: build_content.py <content dir> <reviewed export json> <out dir>
"""
import sys, os, re, json, glob

SRC, MAP, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
POS_NAMES = {"LF": "Left front", "LB": "Left back", "RF": "Right front", "RB": "Right back", "L": "Left side", "R": "Right side", "B": "Back", "F": "Front", "C": "Center"}
CITE = re.compile(r"\s*\{([^{}]*)\}\s*$")
errors = []


def split_cite(text):
    m = CITE.search(text)
    if not m:
        return text.strip(), []
    ids = [x.strip() for x in m.group(1).split(",") if x.strip()]
    return text[: m.start()].strip(), ids


def parse_light(v):
    out = {"regions": {}, "organs": {}, "glow": None}
    for part in v.split(";"):
        part = part.strip()
        if not part:
            continue
        k, _, val = part.partition("=")
        k = k.strip()
        if k == "glow":
            out["glow"] = val.strip()
            continue
        for item in val.split(","):
            item = item.strip()
            if not item:
                continue
            name, _, w = item.partition(":")
            out[k][name.strip()] = float(w) if w else 1.0
    return out


def nums(v):
    return [float(x) for x in re.split(r"[,\s]+", v.strip()) if x]


nodes, feelings, infos = [], [], {}
cur = None
block_target = None  # list that paragraph lines append to
mode = None

for path in sorted(glob.glob(os.path.join(SRC, "*.bfa"))):
    for ln, raw in enumerate(open(path, encoding="utf-8"), 1):
        line = raw.rstrip("\n")
        where = f"{os.path.basename(path)}:{ln}"
        if not line.strip():
            continue
        if line.startswith("@node "):
            cur = {"id": line.split()[1], "sections": [], "positions": [], "sides": [], "themes": [], "src": []}
            nodes.append(cur); mode = "node"; block_target = None
            continue
        if line.startswith("@feeling "):
            cur = {"name": line[9:].strip(), "also": [], "targets": []}
            feelings.append(cur); mode = "feeling"; block_target = None
            continue
        if line.startswith("@info "):
            cur = {"id": line.split()[1], "points": []}
            infos[cur["id"]] = cur; mode = "info"; block_target = None
            continue
        if mode == "feeling":
            if line.startswith("also:"):
                cur["also"] = [x.strip() for x in line[5:].split(",") if x.strip()]
            elif line.startswith(">"):
                head, _, text = line[1:].partition("|")
                text, ids = split_cite(text)
                label = None
                if "@" in head:
                    head, _, label = head.partition("@")
                    label = label.strip()
                bits = head.split()
                cur["targets"].append({"node": bits[0], "pos": bits[1] if len(bits) > 1 else None, "label": label, "t": text, "src": ids})
            else:
                errors.append(f"{where}: unexpected line in feeling")
            continue
        if mode == "info":
            if line.startswith("- "):
                t, ids = split_cite(line[2:]); cur["points"].append({"t": t, "src": ids})
            else:
                k, _, v = line.partition(":"); cur[k.strip()] = v.strip()
            continue
        # node mode
        m = re.match(r"^\[(sec|pos|side) ([^\]]+)\]\s*(.*)$", line)
        if m:
            kind, key, rest = m.groups()
            if kind == "sec":
                s = {"key": key, "title": rest.strip(), "blocks": []}; cur["sections"].append(s); block_target = s["blocks"]
            elif kind == "pos":
                title, _, short = rest.partition("|")
                s = {"key": key, "title": title.strip(), "short": short.strip(), "blocks": []}; cur["positions"].append(s); block_target = s["blocks"]
            else:
                s = {"key": key, "title": rest.strip(), "blocks": []}; cur["sides"].append(s); block_target = s["blocks"]
            continue
        if block_target is not None:
            bullet = line.startswith("- ")
            t, ids = split_cite(line[2:] if bullet else line)
            if not ids:
                errors.append(f"{where}: block has no source ids: {t[:60]}")
            block_target.append({"t": t, "src": ids, **({"li": 1} if bullet else {})})
            continue
        k, _, v = line.partition(":")
        k, v = k.strip(), v.strip()
        if k == "summary" or k == "governs":
            t, ids = split_cite(v); cur[k] = {"t": t, "src": ids}
            if not ids: errors.append(f"{where}: {k} has no source ids")
        elif k == "themes":
            for item in v.split(";"):
                t, ids = split_cite(item)
                if t: cur["themes"].append({"t": t, "src": ids})
        elif k == "light": cur["light"] = parse_light(v)
        elif k == "frame":
            f = nums(v); cur["frame"] = {"y": f[0], "w": f[1], "h": f[2], "az": f[3] if len(f) > 3 else 0, "tilt": f[4] if len(f) > 4 else 2}
        elif k == "anchor":
            f = nums(v); cur["anchor"] = {"y": f[0], "rx": f[1], "rz": f[2]}
        elif k in ("config", "parts", "signs", "centers"): cur[k] = v.split()
        elif k == "search": cur["search"] = [x.strip() for x in v.split(",") if x.strip()]
        elif k == "color": cur["color"] = int(v)
        elif k == "az": cur["az"] = float(v)
        elif k == "marks": cur["marks"] = {x.split("=")[0].strip(): x.split("=")[1].strip().split("|") for x in v.split(";") if x.strip()}
        elif k in ("kind", "name", "heading", "eyebrow", "parent", "glyph", "rules", "marker", "short", "group", "tone"): cur[k] = v
        else: errors.append(f"{where}: unknown key {k}")

# ---------- the reviewed export
m = json.load(open(MAP, encoding="utf-8"))
REC = {}
for f in m["field"]: REC[f["id"]] = f
for c in m["centers"]:
    for k, v in c["sections"].items():
        for r in v: REC[r["id"]] = r
for p in m["parts"]:
    for r in p["records"]: REC[r["id"]] = r
for e in m["emotions"]:
    for r in e["records"]: REC[r["id"]] = r

EXCLUDE = {}
for line in open(os.path.join(SRC, "exclude.txt"), encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#"): continue
    i, _, why = line.partition("|"); EXCLUDE[i.strip()] = why.strip()

# ---------- checks
by_id = {n["id"]: n for n in nodes}
cited = {}
def cite(ids, where):
    for i in ids:
        if i.startswith("rule:"): continue
        if i not in REC: errors.append(f"{where}: cites unknown id {i}")
        else:
            cited.setdefault(i, []).append(where)
            d = (REC[i].get("display") or "")
            if d.startswith("internal only"): errors.append(f"{where}: cites internal-only item {i}")
def walk_node(n):
    w = n["id"]
    for k in ("summary", "governs"):
        if k in n: cite(n[k]["src"], w + "/" + k)
    for t in n["themes"]: cite(t["src"], w + "/themes")
    for grp in ("sections", "positions", "sides"):
        for s in n[grp]:
            for b in s["blocks"]: cite(b["src"], f"{w}/{s['key']}")
for n in nodes:
    walk_node(n)
    if "summary" not in n: errors.append(f"{n['id']}: no summary")
    for p in n.get("parts", []):
        if p not in by_id: errors.append(f"{n['id']}: part {p} is not a node")
    for p in n.get("signs", []) + n.get("centers", []):
        if p not in by_id: errors.append(f"{n['id']}: link {p} is not a node")
    if n.get("parent") and n["parent"] not in by_id and n["parent"] != "whole": errors.append(f"{n['id']}: parent {n['parent']} missing")
    cfg = n.get("config", [])
    have = [p["key"] for p in n["positions"]]
    if sorted(cfg) != sorted(have): errors.append(f"{n['id']}: config {cfg} does not match positions {have}")
    for p in n["positions"]:
        if not p["blocks"]: errors.append(f"{n['id']}/{p['key']}: empty position (no empty-looking spots allowed)")
        if not p["short"]: errors.append(f"{n['id']}/{p['key']}: no short label")
for f in feelings:
    if not f["targets"]: errors.append(f"feeling {f['name']}: no targets")
    for t in f["targets"]:
        cite(t["src"], "feeling/" + f["name"])
        if t["node"] not in by_id: errors.append(f"feeling {f['name']}: target {t['node']} is not a node")
for i in infos.values():
    for p in i["points"]: cite(p["src"], "info/" + i["id"])

alltext = json.dumps([nodes, feelings, infos], ensure_ascii=False)
for bad, name in (("—", "em dash"), ("–", "en dash")):
    if bad in alltext: errors.append(f"{name} found in content")
BANNED = re.compile(r"(?i)\b(immun\w*|infection\w*|contagio\w*|lymph\w*|tonsil\w*|autoimmune)\b")
for mm in BANNED.finditer(alltext): errors.append(f"no-immunity rule: found '{mm.group(0)}'")
for bad in ("worry wheel", "busy body", "throat filter", "regret wheel"):
    if bad in alltext.lower(): errors.append(f"cut item found in content: {bad}")

missing = [i for i in REC if i not in cited and i not in EXCLUDE]
stale = [i for i in EXCLUDE if i not in REC]
both = [i for i in EXCLUDE if i in cited]

# ---------- outputs
os.makedirs(OUT, exist_ok=True)
for n in nodes: n.pop("src", None)
content = {"nodes": nodes, "feelings": feelings, "info": infos, "posNames": POS_NAMES,
           "cta": {"label": "Book a Tuning with Chance", "url": "https://innerversepodcast.com/biofield-tuning"}}
json.dump(content, open(os.path.join(OUT, "content.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

with open(os.path.join(OUT, "coverage.txt"), "w", encoding="utf-8") as f:
    f.write(f"reviewed items: {len(REC)}\nshown: {len(cited)}\nleft out with a reason: {len(EXCLUDE)}\nunaccounted: {len(missing)}\n\n")
    for i in missing: f.write(f"UNACCOUNTED {i}: {REC[i]['text'][:110]}\n")
    f.write("\nLeft out, with reasons\n")
    for i, why in EXCLUDE.items(): f.write(f"  {i}: {why}\n")
    f.write("\nWhere each shown item appears\n")
    for i in REC:
        if i in cited: f.write(f"  {i}: {', '.join(sorted(set(cited[i])))}\n")

def blocks_md(bl):
    return "".join(("- " if b.get("li") else "") + b["t"] + "\n" + ("" if b.get("li") else "\n") for b in bl) + "\n"
with open(os.path.join(OUT, "copy-sheet.md"), "w", encoding="utf-8") as f:
    f.write("# Biofield Anatomy 3D: every line of wording, by screen\n\nRead-through sheet for Chance. Generated from the content file; do not edit by hand.\n\n")
    for n in nodes:
        f.write(f"## {n['name']}" + (f": {n['heading']}" if n.get("heading") else "") + f"  ({n['kind']})\n\n")
        if n.get("rules"): f.write(f"Rules: {n['rules']}\n\n")
        f.write(n["summary"]["t"] + "\n\n")
        if n["themes"]: f.write("Themes: " + ", ".join(t["t"] for t in n["themes"]) + "\n\n")
        if "governs" in n: f.write("Governs: " + n["governs"]["t"] + "\n\n")
        order = {s["key"]: s for s in n["sides"]}
        for p in n["positions"]:
            f.write(f"**{p['title']}{' imbalance' if n.get('tone') == 'imbalance' else ''}** (label on the model: {p['short']})\n\n" + blocks_md(p["blocks"]))
        for s in n["sides"]: f.write(f"**{s['title']}**\n\n" + blocks_md(s["blocks"]))
        for s in n["sections"]: f.write(f"**{s['title']}**\n\n" + blocks_md(s["blocks"]))
    f.write("## Feelings index\n\n")
    for fe in feelings:
        f.write(f"**{fe['name']}** (also: {', '.join(fe['also'])})\n\n")
        for t in fe["targets"]:
            where = t["label"] or (by_id[t["node"]]["name"] + (", " + POS_NAMES.get(t["pos"], {"LOW": "out of balance", "HEALTHY": "in balance"}.get(t["pos"], t["pos"])).lower() if t["pos"] else ""))
            f.write(f"- {where}: {t['t']}\n")
        f.write("\n")
    f.write("## Intro and about text\n\n")
    for i in infos.values():
        f.write(f"**{i.get('title','')}**\n\n" + (i.get("lede", "") + "\n\n" if i.get("lede") else "") + "".join("- " + p["t"] + "\n" for p in i["points"]) + "\n")

print(f"nodes {len(nodes)} feelings {len(feelings)} | reviewed {len(REC)} shown {len(cited)} excluded {len(EXCLUDE)} unaccounted {len(missing)}")
for e in errors: print("ERROR", e)
for i in stale: print("STALE exclude", i)
for i in both: print("NOTE excluded but also cited", i)
for i in missing: print("UNACCOUNTED", i, "|", REC[i]["text"][:100])
sys.exit(1 if (errors or missing) else 0)
