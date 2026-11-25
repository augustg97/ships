import sys
p='web/js/hull.js' if len(sys.argv)<2 else sys.argv[1]
s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1, ('anchor', a[:60], s.count(a))
    s=s.replace(a,b)
rep("""      const yardLen = mixed ? lower * 1.15 : L * mScale;""",
"""      /* ── r321 (0y¹⁵⁸): A MIZZEN LATEEN YARD READ OFF A PLATE ──────────────────────────
         The mixed-hull figures below (1.15 of the lower mast, 56° from the horizontal, slung a
         third of its length from the heel) were read from no plate. Hocker's Vasa rig diagram
         (Vasa II, 2023, p. 31) draws the mizzen lateen yard of a 1628 ship: 2.14 times the
         height from the deck to the mizzen top, at 42° from the horizontal, its heel on the deck
         0.72 of that height before the mast, crossing the mast at 0.72 of it. A mast whose record
         carries `lateenRead` takes those shares; the heel, the angle and the length fix the yard,
         and its crossing of this mast's own raked axis falls out of them (userData.lateen.slingOfD2T). */
      const lr = (mixed && mk.lateenRead && typeof mk.lateenRead.yardOfDeckToTop === 'number') ? mk.lateenRead : null;
      const d2t = lr ? lower * (lr.topAtOfLower || 0.90) : 0;
      const yardLen = lr ? lr.yardOfDeckToTop * d2t : mixed ? lower * 1.15 : L * mScale;""")
rep("""      const th = mixed ? 0.98 : 0.785;   // a mizzen is peaked up steeper than a dhow's main""",
"""      const th = lr ? lr.angleDeg * Math.PI / 180 : mixed ? 0.98 : 0.785;   // a mizzen is peaked up steeper than a dhow's main""")
rep("""      const heelX = x - dir[0] * yardLen / 3;""",
"""      const heelX = lr ? x - lr.heelAheadOfDeckToTop * d2t : x - dir[0] * yardLen / 3;""")
rep("""        onSquareMast: lateenMizzen, mast: mi,  // r317: under a square mizzen's topsail (record `lateenMizzen`)""",
"""        onSquareMast: lateenMizzen, mast: mi,  // r317: under a square mizzen's topsail (record `lateenMizzen`)
        /* r321 (0y¹⁵⁸): the yard as built, for A-LATEEN-READ */
        yardLen: +yardLen.toFixed(3), angleDeg: +(th * 180 / Math.PI).toFixed(2), baseY: +base.toFixed(3),
        heel: [+heel[0].toFixed(3), +heel[1].toFixed(3)], peak: [+peakPt[0].toFixed(3), +peakPt[1].toFixed(3)],
        d2t: lr ? +d2t.toFixed(3) : null, slingOfD2T: lr ? +((slingY - base) / d2t).toFixed(3) : null,
        yardFrom: lr ? 'record lateenRead' : (mixed ? 'class: mixed-hull lateen mizzen, read from no plate' : 'class: lateen main'),""")
open(p,'w').write(s); print('ok',p)
