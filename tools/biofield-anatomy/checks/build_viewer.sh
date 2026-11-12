#!/bin/bash
set -e
V=/home/claude/bfa/viewer
NODE_PATH=/home/claude/bfa/tools/node_modules /home/claude/bfa/tools/node_modules/.bin/esbuild $V/src/main.js --bundle --format=esm --minify --target=es2020 --outfile=$V/dist/viewer.js --log-level=warning
cp $V/src/index.html $V/dist/index.html; cp /home/claude/bfa/work/body.glb $V/dist/body.glb
ls -la $V/dist
