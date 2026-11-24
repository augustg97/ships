# r304 proofs: each fault is written into web/ (served live on :8149, nothing else running), the audit run,
# and the file restored from the round's own copy.
import subprocess, os, json
from collections import Counter
S = '/Users/augustgweon/Ships/'; R = S + 'build/staging/r304/'; PY = '/Users/augustgweon/Modeling Studio/.venv/bin/python'
HULL = S + 'web/js/hull.js'; VES = S + 'web/data/vessels.json'
fh = open(HULL).read(); fv = open(VES).read(); old_h = open(R + 'hull.before.js').read()
open(R + 'hull.after.js', 'w').write(fh); open(R + 'vessels.after.json', 'w').write(fv)
def run(tag):
    p = subprocess.run([PY, S + 'Research/run_audit.py'], capture_output=True, text=True)
    open(R + f'proof-{tag}.out', 'w').write(p.stdout); open(R + f'proof-{tag}.err', 'w').write(p.stderr)
    probs = json.loads(p.stdout or '[]')
    c = Counter(f"{q.get('id')}: {q.get('rule')}" for q in probs)
    line = f"{tag}: {p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '?'}; " + '; '.join(f'{k} x{n}' for k, n in sorted(c.items()))
    print(line, flush=True); open(R + 'proofs.log', 'a').write(line + '\n')
def ves(edit):
    d = json.loads(fv); edit(d); open(VES, 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
end = lambda d: [v for v in d['vessels'] if v['id'] == 'endurance'][0]['hull']
def hsub(a, b):
    assert fh.count(a) == 1, a; open(HULL, 'w').write(fh.replace(a, b))
try:
    open(HULL, 'w').write(old_h); run('OLDFILE'); open(HULL, 'w').write(fh)
    hsub("(mk.topmast ? [lower, gaffTopmastOf(mk, lower)] : [lower])", "[lower]"); run('SINGLEPOLE'); open(HULL, 'w').write(fh)
    hsub("? mk.truckM - 0.88 * lower : lower * 0.52;", "? lower * 0.52 : lower * 0.52;"); run('CLASSTOP'); open(HULL, 'w').write(fh)
    hsub("const gy = base + lower * (mk.rig === 'square' ? 0.55 : 0.86);", "const gy = base + lower * (mk.rig === 'square' ? 0.55 : 1.02);"); run('GAFFHIGH'); open(HULL, 'w').write(fh)
    def offread(d): end(d)['masts'][1]['capFrac'] = 0.70
    ves(offread); run('OFFREAD')
    def silence(d): del end(d)['masts'][2]['capFrac']
    ves(silence); run('SILENCE')
finally:
    open(HULL, 'w').write(fh); open(VES, 'w').write(fv)
run('FINAL')
