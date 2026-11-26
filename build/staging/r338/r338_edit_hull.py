"""r338: wind the frames and the posts outward. Apply after ../r337/r338_wale_winding.py. usage: r338_edit_hull.py <dir>"""
import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
reps = [
("""          const a = base + j * 2;
          idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);""",
"""          const a = base + j * 2;
          /* r338: wound outward on each side. (a, a+1, a+2) faces +z, so the starboard (-z) ribbon
             takes the reverse order; until r338 the starboard frames faced inboard and FrontSide
             culled them from outside in every skeleton stage */
          if (sgn > 0) idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
          else idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);"""),
("""  for (let i = 0; i < N; i++) {
    const a = i * 4, b = a + 4;
    for (let f = 0; f < 4; f++) {
      const c = (f + 1) % 4;
      idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
    }
  }""",
"""  /* r338: the ring order (x0,-s) (x0,+s) (x1,+s) (x1,-s) faces out only when the post is drawn
     downward. The class stem runs sheer to keel and the class sternpost keel to sheer, and a
     straight post's line runs foot to head, so one post on every hull was inside out: its faces
     turned in, FrontSide drew the far side's inner face and the light fell on it backwards. Each
     segment is wound by the direction its own rings run. */
  for (let i = 0; i < N; i++) {
    const a = i * 4, b = a + 4;
    const up = pos[b * 3 + 1] > pos[a * 3 + 1];
    for (let f = 0; f < 4; f++) {
      const c = (f + 1) % 4;
      if (up) idx.push(a + f, a + c, b + f, a + c, b + c, b + f);
      else idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
    }
  }"""),
]
for a, b in reps:
    assert s.count(a) == 1, (s.count(a), a[:60])
    s = s.replace(a, b)
open(p, 'w').write(s); print('frames and posts wound', p)
