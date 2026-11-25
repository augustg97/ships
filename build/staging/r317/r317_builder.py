import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)
rep("""    let crabHead = null;
    if (mk.rig === 'lateen') {""",
"""    let crabHead = null;
    /* ── r317 (0y¹⁵²): A SQUARE MIZZEN OF THE SEVENTEENTH CENTURY SETS A LATEEN UNDER ITS TOPSAIL ──
       Waters, The Art of Navigation in England in Elizabethan and Early Stuart Times (1958): on the
       larger ships "the fore and main masts each carried a course and a top-sail ... the mizzen mast
       carried a lateen-sail. This rig remained typical of merchant ships well into the eighteenth"
       century. The East Indiaman (1620) and the slave ship (1590) cross a bare crossjack (r315) and
       square sails above it, and until r317 set nothing below it. `lateenMizzen` on a square mast's
       record builds the lateen block's yard, parrel and cloth against the square mast's own lower
       section: the pole is the square stack's, so no lateen pole is drawn and the shrouds are the
       square mast's. The yard's length, angle and sling are the mixed-hull lateen mizzen's (the
       carrack's and the fluyt's), read from no plate of either hull. */
    const lateenMizzen = mk.rig === 'square' && mk.lateenMizzen === true;
    if (mk.rig === 'lateen' || lateenMizzen) {""")
rep("""      const mh = mixed ? Math.max(slingY + headroom, hounds + headroom * 0.5) - base : slingY + headroom - base;""",
"""      const mh = lateenMizzen ? lower        // r317: the square stack's lower mast is the pole the yard is slung to
               : mixed ? Math.max(slingY + headroom, hounds + headroom * 0.5) - base : slingY + headroom - base;""")
rep("""      const mastRl = h => mRbot + (mRtop - mRbot) * Math.max(0, Math.min(1, (h - base) / mh));""",
"""      const mastRl = lateenMizzen ? mastRAt   // r317: the square mast's own radius at the sling
                   : h => mRbot + (mRtop - mRbot) * Math.max(0, Math.min(1, (h - base) / mh));""")
rep("""      group.add(tag(mm, 'mast'));
      lateenHead = { y: base + mh, hounds, x: mxL(hounds), rakeDeg: mk.rake || 0 };""",
"""      if (!lateenMizzen) {                    // r317: a square mizzen's pole is its own lower mast
        group.add(tag(mm, 'mast'));
        lateenHead = { y: base + mh, hounds, x: mxL(hounds), rakeDeg: mk.rake || 0 };
      }""")
rep("""        rakeDeg: mk.rake || 0, mastHeadX: +mxL(base + mh).toFixed(3),""",
"""        rakeDeg: mk.rake || 0, mastHeadX: +mxL(base + mh).toFixed(3),
        onSquareMast: lateenMizzen, mast: mi,  // r317: under a square mizzen's topsail (record `lateenMizzen`)""")
open(p, 'w', encoding='utf8').write(s)
print('ok')
