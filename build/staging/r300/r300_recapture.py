import sys, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
p=fb.Paths(Path('/Users/augustgweon/Ships')); m=fb.load_manifest(p)
out=Path('/Users/augustgweon/Ships/build/staging/r300/run3-current')
for n in sys.argv[1:]: fb.capture_frames(p,m,out,only=n); print(n,'ok',flush=True)
