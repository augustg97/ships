#!/bin/bash
# Round 107 middle batch — runs AFTER the opening ratchet pass, BEFORE pass 2.
# Keeps the web/-edit window as short as possible. Edits are applied by the
# session (Edit tool) before this runs; this does the mechanical rest.
set -euo pipefail
STUDIO="/Users/augustgweon/Modeling Studio"
cd "$HOME/Ships"

echo "── saving the opening captures for before-measures"
rm -rf build/r107-before-frames
cp -R Research/baselines/_current build/r107-before-frames

echo "── GLSL check"
"$STUDIO/.venv/bin/python" "$STUDIO/tools/glsl.py" check --project "$HOME/Ships"

echo "── GLSL bundle"
"$STUDIO/.venv/bin/python" "$STUDIO/tools/glsl.py" bundle --project "$HOME/Ships" --global

echo "── fleet enumeration after the flip (deckCovering resolution must be unchanged)"
node -e "
const fs = require('fs');
const src = fs.readFileSync('$HOME/Ships/web/js/hull.js', 'utf8');
const a = src.indexOf('const DECK_COVERINGS');
const b = src.indexOf('function buildDeckGeometry');
eval(src.slice(a, b));
const vessels = JSON.parse(fs.readFileSync('$HOME/Ships/web/data/vessels.json', 'utf8'));
const list = vessels.vessels || vessels;
const rows = list.map(v => {
  const S = v.hull; if (!S) return { id: v.id, note: 'NO HULL' };
  const c = deckCovering(S);
  return { id: v.id, kind: c.kind, mode: c.mode, recorded: c.recorded };
});
fs.writeFileSync('$HOME/Ships/build/deck-flip-r107-after.json', JSON.stringify(rows, null, 1));
const before = JSON.parse(fs.readFileSync('$HOME/Ships/build/deck-flip-r107-before.json', 'utf8'));
const same = JSON.stringify(before) === JSON.stringify(rows);
console.log('deckCovering resolution unchanged across the flip:', same);
if (!same) process.exit(1);
"

echo "── audit"
"$STUDIO/.venv/bin/python" Research/run_audit.py

echo "── build site"
python3 build/build_site.py

echo "MIDBATCH DONE"
