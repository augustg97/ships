#!/usr/bin/env python3
"""r311: capture the manifest's frames that a dead check run did not reach, with the tool's own
capture_frames, into a separate directory (so _current is not wiped). Frames already in the dirs
named after the output dir are skipped."""
import sys, json, importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('fb', '/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb = importlib.util.module_from_spec(spec); sys.modules['fb'] = fb; spec.loader.exec_module(fb)
out = Path(sys.argv[1]); have = set()
for d in sys.argv[2:]: have |= {q.stem for q in Path(d).glob('*.png')}
p = fb.Paths(Path('/Users/augustgweon/Ships')); m = fb.load_manifest(p)
import os
first = [x for x in os.environ.get('FIRST', '').split(',') if x]
m = dict(m); m['frames'] = [f for f in m['frames'] if f['name'] not in have or f['name'] in first]
m['frames'].sort(key=lambda f: (f['name'] not in first, first.index(f['name']) if f['name'] in first else 0))
print(len(m['frames']), 'frames to capture', flush=True)
names = fb.capture_frames(p, m, out)
print('captured', len(names), flush=True)
