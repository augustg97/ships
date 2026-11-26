"""r338: the cog's carlings and the USV's wing were inside out (A-INSIDE-OUT). usage: <dir>"""
import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
reps = [
("""            if (k) { const a = (k - 1) * 4, b = k * 4; for (let f = 0; f < 4; f++) { const c = (f + 1) % 4; idx.push(a + f, b + f, a + c, a + c, b + f, b + c); } }""",
"""            /* r338: the ring (top -z, top +z, bottom +z, bottom -z) walked aft faces in under (a, b, a+1); this order faces out */
            if (k) { const a = (k - 1) * 4, b = k * 4; for (let f = 0; f < 4; f++) { const c = (f + 1) % 4; idx.push(a + f, a + c, b + f, a + c, b + c, b + f); } }"""),
("""        if (side === 0) wi.push(a, b, a + 1, a + 1, b, b + 1);
        else            wi.push(a, a + 1, b, a + 1, b + 1, b);""",
"""        /* r338: the +z face (side 0) takes (a, a+1, b) to face +z as the span rises; the two were swapped and the wing was inside out */
        if (side === 0) wi.push(a, a + 1, b, a + 1, b + 1, b);
        else            wi.push(a, b, a + 1, a + 1, b, b + 1);"""),
]
for a, b in reps:
    assert s.count(a) == 1, (s.count(a), a[:60]); s = s.replace(a, b)
open(p, 'w').write(s); print('carlings and wing wound', p)
