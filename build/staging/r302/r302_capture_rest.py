import sys, importlib.util, time
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
p=fb.Paths(Path('/Users/augustgweon/Ships')); m=fb.load_manifest(p)
out=Path('/Users/augustgweon/Ships/build/staging/r302/run2-current'); have={x.stem for x in Path('/Users/augustgweon/Ships/build/staging/r302/run1-current').glob('*.png')}
todo=[f['name'] for f in m['frames'] if f['name'] not in have]
print('to capture',len(todo),flush=True)
for n in todo:
    for attempt in (1,2):
        t=time.time()
        try:
            fb.capture_frames(p,m,out,only=n); print(n,'ok',round(time.time()-t),'s attempt',attempt,flush=True); break
        except Exception as e:
            print(n,'FAILED attempt',attempt,str(e)[:120],flush=True)
print('CAPTURE DONE',time.strftime('%H:%M:%S'),flush=True)
