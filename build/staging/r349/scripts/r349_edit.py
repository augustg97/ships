import sys
W = sys.argv[1]; p = W + '/js/hull.js'
s = open(p).read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:80])
    s = s.replace(old, new)

# 1. the function, after lowerHeadOf
rep("""function mastLowerOf(mk, steelMain, footY, S) {""",
"""/* ── r349: THE TOPMAST HEAD AND THE TOPGALLANT HOUNDS ARE STEEL'S SHARES TOO ─────────────────────────
   Steel 1794, "Proportional Lengths of Masts": "The head of the mizen-mast, and main and fore topmasts, 4 inches
   to every yard of the length. The head of the mizen topmast, and all topgallant-mast, 3 1/2 inches." Until r349
   every topmast stood its crosstrees at a class 0.97 of its length and the topgallant's heel at 0.88, so on the
   74's main the crosstrees stood 0.59 m under the topmast cap and the topgallant's heel 2.37 m under it: the heel
   hung 1.8 m below the crosstrees that hold it. A topmast's head is the doubling: its crosstrees stand at the
   head's foot, one head under the cap, and the topgallant's heel stands in it, 1.2 heads under the cap (the lower
   masthead's proportion, r348). Eckersberg's Asow (1828) puts the main topmast head, crosstrees to cap, at 0.155
   of the span from the main top to the crosstrees; Steel's rule gives 0.132, the class figure gave 0.032
   (build/staging/r349/). A topgallant mast's head is the pole above its hounds, where its shrouds set up.
   Like lowerHeadOf, this applies only where the hull records a step; every other mast keeps 0.97, 0.88, 0.95. */
function upperHeadsOf(S, mk, top, tg) {
  const stepM = mastStepOf(S, mk);
  if (!(stepM > 0) || mk.rig !== 'square' || !(top > 0))
    return { tm: { cross: 0.97, heel: 0.88, headM: top * 0.12, inPerYd: null, from: 'class' },
             tg: { hounds: 0.95, headM: (tg || 0) * 0.05, inPerYd: null, from: 'class' } };
  const ats = (S.masts || []).map(m2 => m2.at);
  const mizzen = ats.length >= 3 && mk.at === Math.max(...ats);
  const tmRate = mizzen ? 3.5 : 4, tmHead = top * tmRate / 36, tgHead = (tg || 0) * 3.5 / 36;
  return { tm: { cross: 1 - tmHead / top, heel: 1 - 1.2 * tmHead / top, headM: tmHead, inPerYd: tmRate, from: 'steel' },
           tg: { hounds: tg > 0 ? 1 - tgHead / tg : 0.95, headM: tgHead, inPerYd: 3.5, from: 'steel' } };
}
function mastLowerOf(mk, steelMain, footY, S) {""")

# 2. computed after squareStackOf
rep("""    const { top, tg } = squareStackOf(mk, lower, lower + stepM);   // r318: Steel's 0.60 and 0.50, or the record's heights
""", """    const { top, tg } = squareStackOf(mk, lower, lower + stepM);   // r318: Steel's 0.60 and 0.50, or the record's heights
    const UH = upperHeadsOf(S, mk, top, tg);   // r349: the topmast's crosstrees and the topgallant's heel and hounds
    const heelOf = si => si === 0 ? LF.heel : si === 1 ? UH.tm.heel : 0.88;   // where the NEXT section's heel stands, as a share of section si
""")
# 3. stacking sites
rep("""        y0 += segs[si] * (si === 0 ? LF.heel : 0.88);""", """        y0 += segs[si] * heelOf(si);""")
rep("""      y += seg * (si === 0 ? LF.heel : 0.88);
    });""", """      y += seg * heelOf(si);
    });""")
# 4. the topsail yard rides up to the topgallant's heel
rep("""        let hoistRec = null, hoistY = y + seg * 0.88;""",
    """        let hoistRec = null, hoistY = y + seg * (si === 1 ? UH.tm.heel : 0.88);   // r349: atrip under the heel of the section above""")
# 5. crosstrees and topgallant hounds
rep("""        const topHead = base + lower * LF.heel + top * 0.97;""",
    """        const topHead = base + lower * LF.heel + top * UH.tm.cross;   // r349: the topmast crosstrees, at the foot of its head""")
rep("""          const tgHead = base + lower * LF.heel + top * 0.88 + tg * 0.95;""",
    """          const tgHead = base + lower * LF.heel + top * UH.tm.heel + tg * UH.tg.hounds;   // r349: the topgallant's hounds""", 2)
# 6. records
rep("""      /* r287 (0y96): `mi` names the mast, so the loft's deck-to-truck""",
"""      /* r349: the topmast head and the topgallant hounds as built (A-TOPMAST-HEAD-STEEL) */
      if (si === 1 && mk.rig === 'square')
        m.userData.head = { headM: +UH.tm.headM.toFixed(3), crossY: +(y + seg * UH.tm.cross).toFixed(3), heelY: +(y + seg * UH.tm.heel).toFixed(3),
                            inPerYd: UH.tm.inPerYd, from: UH.tm.from === 'steel'
                              ? 'Steel 1794: ' + UH.tm.inPerYd + ' in to every yard of the topmast; the crosstrees one head under the cap, the topgallant heel 1.2 heads'
                              : 'class: the crosstrees at 0.97 and the topgallant heel at 0.88 of the topmast' };
      if (si === 2 && mk.rig === 'square')
        m.userData.head = { headM: +UH.tg.headM.toFixed(3), houndsY: +(y + seg * UH.tg.hounds).toFixed(3), inPerYd: UH.tg.inPerYd,
                            from: UH.tg.from === 'steel' ? 'Steel 1794: 3 1/2 in to every yard of the topgallant mast, over its hounds'
                                                         : 'class: the hounds at 0.95 of the topgallant mast' };
      /* r287 (0y96): `mi` names the mast, so the loft's deck-to-truck""")
rep("""        if (tgm) group.add(tag(tgm, 'shroud', 'Topgallant shrouds'));""",
    """        if (tgm) { tgm.userData.topgallantShrouds = { mast: mi }; group.add(tag(tgm, 'shroud', 'Topgallant shrouds')); }""")
rep("""          ct.userData.mast = mi;
          group.add(tag(ct, 'top', 'Crosstrees',""", """          ct.userData.mast = mi;
          ct.userData.crossY = +topHead.toFixed(4);   // r349
          group.add(tag(ct, 'top', 'Crosstrees',""")
open(p, 'w').write(s); print('ok', p)
