import sys, importlib.util, time
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
p=fb.Paths(Path('/Users/augustgweon/Ships')); m=fb.load_manifest(p)
out=Path('/Users/augustgweon/Ships/build/staging/r301/run3-current')
for n in sys.argv[1].split(','):
    t=time.time()
    try: fb.capture_frames(p,m,out,only=n); print(n,'ok',round(time.time()-t),'s',flush=True)
    except Exception as e: print(n,'FAILED',str(e)[:120],flush=True)
print('RECAPTURE DONE',time.strftime('%H:%M:%S'),flush=True)
