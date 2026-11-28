import json, sys
W = sys.argv[1]
p = W + '/js/hull.js'; s = open(p).read()
fn = open(sys.argv[2] + '/sweep_fn.js').read()
a = 'function hullSurface(S) {\n'
assert s.count(a) == 1; s = s.replace(a, fn + a)
b = "  const SR = S.sheerRead && Array.isArray(S.sheerRead.stations)"
assert s.count(b) == 1; s = s.replace(b, "  const STB = SR0 => SR0 ? null : sheerTableFn(S);\n" + b)
c = "    const base = SR ? SR(u) : S.freeboard + rise * Math.pow(s, 2.8);"
assert s.count(c) == 1; s = s.replace(c, "    const base = SR ? SR(u) : STF ? STF(u) : S.freeboard + rise * Math.pow(s, 2.8);")
d = "  const sheer = u => {\n    const s = Math.abs(2 * u - 1);"
assert s.count(d) == 1; s = s.replace(d, "  const STF = STB(SR);\n" + d)
e = "window.SHIPS_HULL = { cheekLines,"
assert s.count(e) == 1; s = s.replace(e, "window.SHIPS_HULL = { sheerTableFn, cheekLines,")
open(p, 'w').write(s); print('hull.js ok')
