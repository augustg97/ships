"""PREPARED BY r337 FOR r338, NOT APPLIED: wind each side's wale strip outward.
buildWaleGeometry pushes (a, a+1, a+2, a+2, a+1, a+3) for both sides. Lower vertex then upper, u increasing:
the face normal of that winding is -z, so the port (+z) strip faces inboard and FrontSide culls it from outside.
r337 found no wale on screen from either beam; a DoubleSide test material drew both (exp-dbl.png).
usage: r338_wale_winding.py <dir holding js/hull.js>"""
import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
a = """      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    base += (NU + 1) * 2;"""
b = """      /* r338: wound outward on each side. (a, a+1, a+2) faces -z, so the port (+z) strip takes the reverse
         order; until r338 the port wales faced inboard and FrontSide culled them from outside */
      if (sgn > 0) idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
      else idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    base += (NU + 1) * 2;"""
assert s.count(a) == 1, s.count(a); open(p, 'w').write(s.replace(a, b)); print('wound', p)
