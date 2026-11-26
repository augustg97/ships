"""r338: wind the furl roll outward. usage: <dir>"""
import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
a = """  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NR; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);"""
b = """  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NR; j++) {
      const a = i * row + j;
      /* r338: (a, a+row, a+1) has the normal axis x tangent, which points AT the axis, so every roll
         in the fleet was inside out: FrontSide drew the far wall's inner face, lit from behind. This
         order faces out from the axis (A-INSIDE-OUT) */
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);"""
assert s.count(a) == 1, s.count(a); open(p, 'w').write(s.replace(a, b)); print('furl wound', p)
