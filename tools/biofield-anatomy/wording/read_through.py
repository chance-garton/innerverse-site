# Writes the read-through sheet: every word the Biofield Anatomy map shows, in reading order, from content.json.
# Usage: python3 read_through.py content.json out.md "<build note>"
# content.json is the live wording file with window.__BFA_CONTENT= and the final ; stripped. Never save it or the sheet in this repo.
import json, sys
src, out, note = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(src, encoding='utf-8'))
N = {n['id']: n for n in d['nodes']}
RULE = 'rule:Chance 2026-11-14'
L = []
w = L.append
def new(o): return ' **(changed 2026-11-14)**' if isinstance(o, dict) and RULE in (o.get('src') or []) else ''
def blocks(bl, ind=''):
    for b in bl: w(f"{ind}- {b['t']}{new(b)}")
def node(n, level):
    h = '#' * level
    tag = {'center': 'Energy center', 'stop': 'Part of the legs', 'part': 'Body part', 'field': 'Field topic', 'sign': 'Zodiac sign'}[n['kind']]
    w(f"\n{h} {n['name']}  ({tag})\n")
    for k, lab in [('heading', 'Heading'), ('short', 'Short line'), ('rules', 'Rules')]:
        if n.get(k): w(f"*{lab}:* {n[k]}  ")
    w(f"\n{n['summary']['t']}{new(n['summary'])}\n")
    if n.get('themes'): w('**Emotional and mental powers:** ' + ', '.join(t['t'] + new(t).replace('**', '') for t in n['themes']) + '\n')
    g = n.get('governs')
    if g: w('**Governs in the body:** ' + (', '.join(i['t'] for i in g['items']) if g.get('items') else g['t']) + '\n')
    for p in n.get('positions', []):
        w(f"**{p['title']}** ({p['short']})\n"); blocks(p['blocks']); w('')
    for s in n.get('sides', []):
        w(f"**{s['title']}**\n"); blocks(s['blocks']); w('')
    for s in n.get('sections', []):
        w(f"**{s['title']}**\n"); blocks(s['blocks']); w('')
    for k, v in (n.get('marks') or {}).items(): w(f"*Label on the model:* {v[0]}" + (f", {v[1]}" if len(v) > 1 and v[1] else '') + '  ')

w('# Biofield Anatomy 3D: read-through sheet\n')
w(f'{note}\n')
w('This is every word the map shows, in reading order, for Chance to read once before launch. Lines marked **(changed 2026-11-14)** were reworded or moved in the review sitting. Answer by quoting any line you want changed; anything not mentioned counts as approved, by your own review rule.\n')
w('The power pages and body pages near the end reuse lines that already stand on the center pages, so they are listed by where they lead, not printed twice.\n')

w('\n## 1. The opening panel\n')
h = d['info']['home']; w(h['lede'] + '\n'); w('**How to read the map**\n'); blocks(h['points'])

w('\n## 2. Energy centers, from crown to legs\n')
for cid in ['crown', 'thirdeye', 'throat', 'heart', 'solar', 'sacral', 'root', 'legs']:
    c = N[cid]; node(c, 3)
    for pid in c.get('parts') or []:
        if pid in N: node(N[pid], 4)

w('\n## 3. Whole body\n')
for n in d['nodes']:
    if n.get('parent') == 'whole': node(n, 3)

w('\n## 4. The field ("Biofield Structures")\n')
f = d['info']['field']; w(f"*Panel title:* {f['title']} **(changed 2026-11-14)**  \n*Intro:* {f['lede']}  \n*Invitation:* {f['invite']['t']} **(changed 2026-11-14)**\n")
w('*Under the age slider (the number follows the age, here at 40):* About 6 2/3 years to each foot of the field, counting the field as 6 feet deep. **(changed 2026-11-14)**  \n*Under that:* The rings mark where each age sits between the skin and the edge of the field.\n')
grp = ''
for n in d['nodes']:
    if n['kind'] == 'field':
        if n.get('group') != grp: grp = n.get('group'); w(f"\n### Group: {grp}")
        node(n, 4)

w('\n## 5. The zodiac body\n')
z = d['info']['zodiac']; w(z['lede'] + '\n'); w('*Legend title:* The signs (each cell shows the glyph and the name of its sign).  \n*Under the legend:* Leo and Libra sit on the back of the body: turn the figure to see them.\n')
for n in d['nodes']:
    if n['kind'] == 'sign': node(n, 3)

w('\n## 6. Feelings\n')
w('*Line at the top of a page with one feeling:* Where this emotion tends to show up in the body and biofield. Choose a spot to learn more. **(changed 2026-11-14)**  ')
w('*On a page shared by several feelings:* Where these emotions tend to show up in the body and biofield. Choose a spot to learn more. **(changed 2026-11-14)**\n')
def where(t):
    tn = N[t['node']]; p = t.get('pos'); pos = next((q['title'] for q in tn['positions'] if q['key'] == p), None)
    return t.get('label') or (tn['name'] + (': ' + (pos or {'LOW': 'out of balance', 'HEALTHY': 'in balance'}.get(p) or d['posNames'].get(p, p)).lower() if p else ''))
for fl in sorted(d['feelings'], key=lambda x: x['name'].lower()):
    w(f"\n**{fl['name']}**\n")
    for t in fl['targets']: w(f"- {where(t)}: {t['t']}{new(t)}")

w('\n## 7. Power pages (one per emotional and mental power)\n')
w('Each page says which center the power belongs to, then lists the lines it leads to, grouped as "When it flows" and "If it feels stuck or blocked". A power with no line of its own shows its center\'s whole reading and one label on the figure.\n')
for p in [x for x in d['powers'] if x['type'] != 'body']:
    homes = ' and '.join(N[i]['name'] for i in p['homes'])
    if p.get('general'): w(f"- **{p['name']}** (a power of the {homes}): shows the {N[p['homes'][0]]['name']}'s general reading, in balance and out of balance."); continue
    flow = [where(t) for t in p['targets'] if t.get('g') == 'flow']; stuck = [where(t) for t in p['targets'] if t.get('g') == 'stuck']; other = [where(t) for t in p['targets'] if t.get('g') not in ('flow', 'stuck')]
    line = f"- **{p['name']}** (a power of the {homes})."
    if flow: line += ' Flows: ' + '; '.join(dict.fromkeys(flow)) + '.'
    if stuck: line += ' Stuck: ' + '; '.join(dict.fromkeys(stuck)) + '.'
    if other: line += ' Lives: ' + '; '.join(dict.fromkeys(other)) + '.'
    w(line)
    if p.get('note'): w(f"  - *Note on the page:* {p['note']}")
    for t in p['targets']:
        if not any(t['t'].rstrip('.') == b['t'].rstrip('.') for n in d['nodes'] for coll in ([n['summary']], *[s['blocks'] for s in n['sections']], *[q['blocks'] for q in n['positions']], *[s['blocks'] for s in n['sides']]) for b in (coll if isinstance(coll, list) else [coll])):
            w(f"  - *Line written for this page:* {t['t']}")

w('\n## 8. Body pages\n')
for p in [x for x in d['powers'] if x['type'] == 'body']:
    w(f"- **{p['name']}** (governed by the {' and '.join(N[i]['name'] for i in p['homes'])}). Leads to: " + '; '.join(dict.fromkeys(where(t) for t in p['targets'])) + '.')
    if p.get('note'): w(f"  - *Note on the page:* {p['note']}")

w('\n## 9. About this map\n'); blocks(d['info']['about']['points'])
w('\n## 10. The small version on the Biofield Tuning page\n')
w(f"*Heading:* Biofield Anatomy  \n*Introduction:* {d['info']['mini']['lede']} **(new 2026-11-14, the short definition from item 48)**  \n*Each center shows its name and its heading, for example:* Heart: {N['heart']['heading']}  \n*Button:* Open the full map\n")
w('\n## 11. Buttons and small labels\n')
w('Tabs: Chakras, Field, Body Parts, Zodiac. Rail foot: Biofield A to Z, Feelings, About. Under the figure: Front view, Back view, Left view, Right view, Reset. Search box: Search the map. Entry endings: Keep exploring, Copy a link to this page. Booking button: ' + d['cta']['label'] + '. Credit: Biofield Anatomy by Eileen Day McKusick.\n')
txt = '\n'.join(L) + '\n'
assert chr(0x2014) not in txt and chr(0x2013) not in txt
open(out, 'w', encoding='utf-8').write(txt)
print(len(txt), txt.count('\n'))
