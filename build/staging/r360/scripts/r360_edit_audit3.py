import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)
rep("""      const faceAt = (u, y) => { let a = 0, b = 1; if (SHIPS_HULL.surfacePoint(H, HSg, u, 1)[1] <= y) return Math.abs(SHIPS_HULL.surfacePoint(H, HSg, u, 1)[2]);
        for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSg, u, m)[1] < y) a = m; else b = m; }
        return Math.abs(SHIPS_HULL.surfacePoint(H, HSg, u, (a + b) / 2)[2]); };""",
"""      /* the skin's point at height y on station u. A tier gun's station is found by bisecting u on THAT point's x: the
         stem and stern rake, so x at the port's height is not the deck line's x (the first r360 read put two of the
         Indiaman's bow guns at u 0.149 for 0.135, and read their face 0.4 m wrong) */
      const ptAt = (u, y) => { let a = 0, b = 1; if (SHIPS_HULL.surfacePoint(H, HSg, u, 1)[1] <= y) return SHIPS_HULL.surfacePoint(H, HSg, u, 1);
        for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSg, u, m)[1] < y) a = m; else b = m; }
        return SHIPS_HULL.surfacePoint(H, HSg, u, (a + b) / 2); };
      const faceAt = (u, y) => Math.abs(ptAt(u, y)[2]);
      const uOfXY = (x, y) => { let a = 0, b = 1; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (ptAt(m, y)[0] < x) a = m; else b = m; } return (a + b) / 2; };""")
rep("""        const yC = (b.min.y + b.max.y) / 2, gi = { u: uOfX((b.min.x + b.max.x) / 2) };""",
"""        const yC = (b.min.y + b.max.y) / 2, gi = { u: isl ? uOfX((b.min.x + b.max.x) / 2) : uOfXY((b.min.x + b.max.x) / 2, yC) };""")
p.write_text(s); print('ok')
