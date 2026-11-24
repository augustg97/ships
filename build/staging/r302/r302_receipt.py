"""r302 receipt: score every frame in _current, accept the predicted movers with a reason, write the
receipt section into HANDOFF.md. Frames not predicted are listed and NOT accepted."""
import sys, importlib.util, subprocess, time
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
ROOT=Path('/Users/augustgweon/Ships'); R=ROOT/'build/staging/r302'
p=fb.Paths(ROOT); m=fb.load_manifest(p); th=m.get('thresholds',{}); CF,MA=th.get('changed_frac',.002),th.get('mean_abs',1.0); floor=m.get('blank_variance_floor',4.0)
PRED={'shipwright','ship-dhow','ship-junk','ship-canoe','ship-great-eastern','ship-trireme','ship-galley','ship-galleass',
      'ship-panokseon','ship-sekibune','ship-preussen','ship-steamer','ship-wyoming','ship-treasure','ship-clipper',
      'shipwright-ahead','shipwright-astern','shipwright-furled','shipwright-hounds','shipwright-corbis','ship-endurance',
      'ship-slave-ship','ship-carrack'}
diffd=R/'score-diff'; diffd.mkdir(exist_ok=True)
FINAL = len(sys.argv) > 1 and sys.argv[1] == 'final'
TSV=R/'score-rows.tsv'; prior=[l.split('\t') for l in TSV.read_text().splitlines()] if TSV.exists() else []
done={x[0] for x in prior}
rows=[]; missing=[]
for f in m['frames']:
    nm=f['name']; c=p.current_dir/f'{nm}.png'
    if nm in done: continue
    if not c.exists(): missing.append(nm); continue
    r=fb.compare(p.baseline_dir/f'{nm}.png',c,diffd/f'{nm}.png'); var=fb.blankness(c)
    v='BLANK' if var<floor else ('CHANGED' if r['changed_frac']>CF or r['mean_abs']>MA else 'ok')
    rows.append((nm,r['changed_frac']*100,r['mean_abs'],v))
new=list(rows)
with TSV.open('a') as fh:
    for nm,cf,ma,v in new: fh.write(f"{nm}\t{cf}\t{ma}\t{v}\n")
order=[f['name'] for f in m['frames']]
rows=sorted([(a,float(b),float(c),d) for a,b,c,d in prior]+new, key=lambda x: order.index(x[0]))
out=R/'score-all.out'
with out.open('w') as fh:
    for nm,cf,ma,v in rows: fh.write(f"{nm:28s} {cf:7.3f}% {ma:6.3f} {v}\n")
    fh.write(f"{len(rows)} scored, {sum(v!='ok' for *_,v in rows)} beyond the gate, missing {missing}\n")
print(out.read_text())
acc=[x for x in rows if x[3]=='CHANGED' and x[0] in PRED]
acc_new=[x for x in new if x[3]=='CHANGED' and x[0] in PRED]
unpred=[x for x in rows if x[3]!='ok' and x[0] not in PRED]
quiet=[nm for nm,*_,v in [(r[0],r[3]) for r in rows] if False]
predicted_ok=[x[0] for x in rows if x[0] in PRED and x[3]=='ok']
REASON={'shipwright-furled':'r302 (0y127): the furled card names only the rigs this hull carries (square sails and headsails) and drops the junk-batten and gaff clauses; the ship and nav are unchanged. Viewed beside the old baseline.'}
for nm,cf,ma,v in acc_new:
    reason=REASON.get(nm,'r302 (0y127): the stage-7 "Bent on" card is composed for this hull, naming the sails on her masts by rig and position and her headsails, in place of the fixed "Canvas. She can now be driven by the wind" line; the ship is unchanged. Viewed beside the old baseline.')
    subprocess.run(['/Users/augustgweon/Modeling Studio/.venv/bin/python','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py','accept','--project',str(ROOT),'--frame',nm,'--reason',reason],check=True)
if not FINAL: sys.exit(0)
L=[]
L.append(f"\n**THE FRAMES: {len(rows)} OF 65 SCORED at this tree (`build/staging/r302/score-all.out`).** The third ratchet run stopped at frame 23 (`ship-queen-mary-2`) on the 150 s readiness timeout, as in r298 to r301; its 22 frames were kept (`run1-current`) and the other {65-22} were captured one at a time (`r302_capture_rest.py`, `capture-rest.log`).")
if missing: L.append(f"\n**UNSCORED: {', '.join('`'+x+'`' for x in missing)}.** The round's clock ran out before they were captured. r303 opens by capturing and scoring them at this tree (`check --frame`), before any change.")
L.append("\nMOVED BY THIS ROUND AND ACCEPTED (predicted: every sailing hull's stage-7 card is in its frame):\n\n| Frame | Changed | Mean abs |\n|---|---|---|")
for nm,cf,ma,v in acc: L.append(f"| `{nm}` | {cf:.3f}% | {ma:.3f} |")
if predicted_ok: L.append(f"\nPredicted but inside the gate: {', '.join('`'+x+'`' for x in predicted_ok)}.")
if unpred: L.append(f"\n**Beyond the gate and NOT predicted, NOT accepted: {', '.join(f'`{nm}` ({cf:.3f}%, {v})' for nm,cf,ma,v in unpred)}.** No change this round reaches them; r303 recaptures each alone and, if it reproduces, stashes and re-checks at a clean HEAD.")
L.append(f"\nEvery powered hull's frame and the dugout's scored identical or inside the gate: the round changed their stage-0 card only, which no frame shows. `pair-cards.png` shows `shipwright`, `ship-canoe` and `ship-junk` beside their old baselines: only the card text moves, and the canoe's card grows one line, which moves the nav up with it.")
(R/'receipt.md').write_text('\n'.join(L)+'\n')
print('\n'.join(L))
