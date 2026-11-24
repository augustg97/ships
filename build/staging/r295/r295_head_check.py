import sys, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
p=fb.Paths(Path('/Users/augustgweon/Ships')); m=fb.load_manifest(p); m=dict(m,base_url='http://localhost:8151')
R=Path('/Users/augustgweon/Ships/build/staging/r295'); out=R/'head-current'; dd=R/'head-diff'; dd.mkdir(exist_ok=True)
for n in sys.argv[1:]:
    fb.capture_frames(p,m,out,only=n)
    a=fb.compare(p.baseline_dir/f'{n}.png',out/f'{n}.png',dd/f'{n}-vs-baseline.png')
    mine=next((d/f'{n}.png' for d in (R/'run2-current',R/'run1-current') if (d/f'{n}.png').exists()),None)
    b=fb.compare(out/f'{n}.png',mine,dd/f'{n}-vs-r295.png') if mine else None
    print(f"{n:22s} clean HEAD vs baseline {a['changed_frac']*100:.3f}% / {a['mean_abs']:.3f}   r295 vs clean HEAD "+(f"{b['changed_frac']*100:.3f}% / {b['mean_abs']:.3f}" if b else 'no capture'),flush=True)
