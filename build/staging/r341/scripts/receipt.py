import json, os, subprocess
F = json.load(open('/Users/augustgweon/Ships/Research/baselines/frames.json'))
F = F if isinstance(F, list) else F['frames']
names = [f['name'] for f in F]
got = set()
for d in ['run1', 'run2', 'run3']:
    if os.path.isdir(d): got |= {p[:-4] for p in os.listdir(d) if p.endswith('.png')}
miss = [n for n in names if n not in got]
print(len(got), 'captured;', len(miss), 'not captured:', ', '.join(miss))
