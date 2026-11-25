#!/usr/bin/env python3
"""r319: capture only the named frames (ONLY=a,b,c) into a separate dir, with the tool's own capture_frames."""
import sys, os, importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('fb', '/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb = importlib.util.module_from_spec(spec); sys.modules['fb'] = fb; spec.loader.exec_module(fb)
out = Path(sys.argv[1]); only = [x for x in os.environ['ONLY'].split(',') if x]
p = fb.Paths(Path('/Users/augustgweon/Ships')); m = dict(fb.load_manifest(p))
m['frames'] = [f for f in m['frames'] if f['name'] in only]
print(len(m['frames']), 'frames to capture', flush=True)
names = fb.capture_frames(p, m, out)
print('captured', len(names), flush=True)
