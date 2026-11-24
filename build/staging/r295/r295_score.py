import sys, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
p=fb.Paths(Path('/Users/augustgweon/Ships')); m=fb.load_manifest(p); th=m.get('thresholds',{}); CF,MA=th.get('changed_frac',.002),th.get('mean_abs',1.0); floor=m.get('blank_variance_floor',4.0)
R=Path('/Users/augustgweon/Ships/build/staging/r295'); diffd=R/'score-diff'; diffd.mkdir(exist_ok=True)
n=mov=0; missing=[]
for f in m['frames']:
    nm=f['name']; c=next((d/f'{nm}.png' for d in (R/'run2-current',R/'run1-current') if (d/f'{nm}.png').exists()),None)
    if c is None: missing.append(nm); continue
    r=fb.compare(p.baseline_dir/f'{nm}.png',c,diffd/f'{nm}.png'); var=fb.blankness(c)
    v='BLANK' if var<floor else ('CHANGED' if r['changed_frac']>CF or r['mean_abs']>MA else 'ok'); n+=1; mov+=v!='ok'
    print(f"{nm:28s} {r['changed_frac']*100:7.3f}% {r['mean_abs']:6.3f} {v}",flush=True)
print(f'{n} scored, {mov} beyond the gate (changed_frac {CF}, mean_abs {MA}), missing {missing}')
