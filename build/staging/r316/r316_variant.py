import sys
src, dst, mode = sys.argv[1:4]; s = open(src).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (mode, a[:60]); s = s.replace(a, b)
if mode == 'NOTATRIP':
    rep("const atrip = segHeads[sc] - 0.12 * segs[sc], floor", "const atrip = segHeads[sc] - 0.20 * segs[sc], floor")
elif mode == 'OFFCAP':
    rep("yy = fracRec.onCap + slingsD / 2 + 0.02;", "yy = fracRec.onCap + slingsD / 2 + 0.25;")
elif mode == 'NOROLLREC':
    rep("fm.userData.onYard = { x: +ym.position.x.toFixed(3), y: +yY.toFixed(3), mast: mi }; return fm;", "return fm;")
else: raise SystemExit('mode?')
open(dst, 'w').write(s); print('variant', mode)
