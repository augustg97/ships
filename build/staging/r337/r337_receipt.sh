#!/bin/zsh
cd /Users/augustgweon/Ships/build/staging/r337
pkill -f run-each.sh; pkill -f r330_capture.py; sleep 2
mkdir -p run45 run45-diff; cp run4/*.png run5/*.png run45/ 2>/dev/null
"/Users/augustgweon/Modeling Studio/.venv/bin/python" ../r277/score-offline.py run45 run45-diff > score-run45.out 2>&1
"/Users/augustgweon/Modeling Studio/.venv/bin/python" - <<'PY'
import re, json, sys, importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('fb', '/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb = importlib.util.module_from_spec(spec); sys.modules['fb'] = fb; spec.loader.exec_module(fb)
m = fb.load_manifest(fb.Paths(Path('/Users/augustgweon/Ships'))); allf = [f['name'] for f in m['frames']]
rows = {}
for fn in ['score-run1.out', 'score-run23.out', 'score-run45.out']:
    for l in open(fn):
        mm = re.match(r'\s+(\S+)\s+([\d.]+)%\s+([\d.]+)\s+(\S+)', l)
        if mm: rows[mm.group(1)] = (fn, float(mm.group(2)), float(mm.group(3)), mm.group(4))
final = {k: v for k, v in rows.items()}
ok = [k for k, v in final.items() if v[3] == 'ok']
bad = [k for k, v in final.items() if v[3] != 'ok']
missing = [f for f in allf if f not in final]
fails = [l.strip() for l in open('each.out') if 'FAILED' in l]
lines = [f"**THE FRAMES (receipt).** {len(allf)} frames in the manifest. Each frame's last capture is scored offline against its baseline with frame_baseline's own compare(): run1 (the opening run at 8932fc0) for the frames inside the gate, run2/run3a for the 7 recaptures, run4/run5 for the rest (one process per frame, `run-each.sh`; frames captured after 01:35:36 show the r337 tree, which draws what 8932fc0 draws).",
         f"- **Inside the gate: {len(ok)}.**",
         f"- **Beyond the gate: {len(bad)}**" + (': ' + ', '.join(f"`{k}` {final[k][1]:.3f}% / {final[k][2]:.3f} ({final[k][0]})" for k in bad) if bad else '.') ,
         f"- **Not captured this round: {len(missing)}**" + (': ' + ', '.join(f'`{k}`' for k in missing) if missing else '.') ,
         f"- Per-frame capture failures (150 s readiness timeouts): {len(fails)}" + (': ' + '; '.join(fails) if fails else '.'),
         "- **Correction to the entry above:** the first resume did not die for lack of `disown`. It kept running beside the second, because a `pgrep | head -5` listing was filled by Chrome processes and hid it, and it ended at a 150 s timeout on `aboard-carrier`. Three later timeouts on Sea frames came at load 3 to 5 with nothing else running, which is why the rest were captured one process per frame.",
         "No baseline was accepted this round."]
open('receipt.md', 'w').write('\n\n' + '\n'.join(lines) + '\n')
print('\n'.join(lines))
PY
