#!/bin/bash
# Build the preview into viewer/dist: the viewer bundle, the model and the content as four files.
# CONTENT points at the real content.json (kept outside this public repo); without it the placeholder sample is used.
set -e
B=${BFA:-/home/claude/bfa}; HERE=$(cd "$(dirname "$0")/.." && pwd); V=$HERE/viewer
CONTENT=${CONTENT:-$V/src/content.sample.json}
mkdir -p $V/dist
(cd $B && NODE_PATH=$B/node_modules node_modules/.bin/esbuild $V/src/app.js --bundle --format=esm --minify --target=es2020 --outfile=$V/dist/viewer.js --log-level=warning)
cp $V/src/index.html $V/dist/index.html
python3 - "$V" "$CONTENT" <<'PY'
import base64, json, sys
V, C = sys.argv[1], sys.argv[2]
open(V + '/dist/model.js', 'w').write('window.__BFA_MODEL_B64="' + base64.b64encode(open(V + '/model/body.glb', 'rb').read()).decode() + '";')
c = json.load(open(C, encoding='utf-8'))
open(V + '/dist/content.js', 'w', encoding='utf-8').write('window.__BFA_CONTENT=' + json.dumps(c, ensure_ascii=False, separators=(',', ':')) + ';')
PY
ls -la $V/dist
