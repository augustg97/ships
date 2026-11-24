#!/usr/bin/env python3
"""r310: recapture the named frames alone into a separate directory, with the tool's own capture_frames."""
import sys, importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('fb', '/Users/augustgweon/Modeling Studio/tools/frame_baseline.py')
fb = importlib.util.module_from_spec(spec); sys.modules['fb'] = fb; spec.loader.exec_module(fb)
out = Path(sys.argv[1]); names = sys.argv[2:]
p = fb.Paths(Path('/Users/augustgweon/Ships')); m = dict(fb.load_manifest(p))
m['frames'] = [f for f in m['frames'] if f['name'] in names]
print(len(m['frames']), 'frames to capture', flush=True)
print('captured', len(fb.capture_frames(p, m, out)), flush=True)
