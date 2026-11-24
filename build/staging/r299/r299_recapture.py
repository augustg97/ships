import sys, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('fb','/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb=importlib.util.module_from_spec(spec); sys.modules['fb']=fb; spec.loader.exec_module(fb)
p=fb.Paths(Path('/Users/augustgweon/Ships')); m=fb.load_manifest(p)
fb.capture_frames(p,m,Path('/Users/augustgweon/Ships/build/staging/r299/run3-current'),only=sys.argv[1]); print('done')
