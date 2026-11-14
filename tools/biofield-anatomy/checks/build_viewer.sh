#!/bin/bash
# Build the preview into viewer/dist: the viewer bundle, the model and the content as four files, plus the small version
# for the /biofield-tuning page (mini.html, mini.js, mini-poster.jpg).
# CONTENT points at the real content.json (kept outside this public repo); without it the placeholder sample is used.
# FULL is the address the small version's button opens (default: index.html beside it; on the site: /biofield-anatomy).
set -e
B=${BFA:-/home/claude/bfa}; HERE=$(cd "$(dirname "$0")/.." && pwd); V=$HERE/viewer
CONTENT=${CONTENT:-$V/src/content.sample.json}
mkdir -p $V/dist
(cd $B && NODE_PATH=$B/node_modules node_modules/.bin/esbuild $V/src/app.js --bundle --format=esm --minify --target=es2020 --outfile=$V/dist/viewer.js --log-level=warning)
(cd $B && NODE_PATH=$B/node_modules node_modules/.bin/esbuild $V/src/embed.js --bundle --format=esm --minify --target=es2020 --outfile=$V/dist/mini.js --log-level=warning)
cp $V/src/index.html $V/dist/index.html
[ -f $V/model/mini-poster.jpg ] && cp $V/model/mini-poster.jpg $V/dist/mini-poster.jpg
python3 - "$V" "$CONTENT" "${FULL:-index.html}" <<'PY'
import base64, html, json, sys
V, C, FULL = sys.argv[1], sys.argv[2], sys.argv[3]
open(V + '/dist/model.js', 'w').write('window.__BFA_MODEL_B64="' + base64.b64encode(open(V + '/model/body.glb', 'rb').read()).decode() + '";')
c = json.load(open(C, encoding='utf-8'))
open(V + '/dist/content.js', 'w', encoding='utf-8').write('window.__BFA_CONTENT=' + json.dumps(c, ensure_ascii=False, separators=(',', ':')) + ';')
# the small version: the seven centers from crown to root, each with its name, its one line (the center's heading) and the skin regions it lights
model = json.load(open(V + '/src/model.json', encoding='utf-8'))
ORDER = ['legs', 'root', 'sacral', 'solar', 'heart', 'throat', 'thirdeye', 'crown']
N = {n['id']: n for n in c['nodes']}
centers = [{'id': i, 'name': N[i]['name'], 'line': N[i].get('heading') or '', 'regions': (N[i].get('light') or {}).get('regions') or {}} for i in reversed(ORDER[1:])]
intro = (c['info'].get('mini') or c['info']['home']).get('lede') or ''
pills = ''.join('<button type="button" data-center="%s" aria-pressed="false" style="--c:%s"><i></i>%s</button>' % (x['id'], model['zones'][ORDER.index(x['id'])].get('accent') or model['zones'][ORDER.index(x['id'])]['color'], html.escape(x['name'])) for x in centers)
h = open(V + '/src/mini.html', encoding='utf-8').read()
for k, v in [('__BFA_MODEL_ATTR__', 'data-model-js="model.js"'), ('__BFA_INTRO__', html.escape(intro)), ('__BFA_PILLS__', pills), ('__BFA_FULL__', html.escape(FULL)),
             ('__BFA_MINI_JSON__', json.dumps({'centers': centers}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))]:
    assert h.count(k) == 1, k; h = h.replace(k, v)
open(V + '/dist/mini.html', 'w', encoding='utf-8').write(h)
PY
ls -la $V/dist
