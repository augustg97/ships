import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]; s = s.replace(a, b)
rep("const crossYard = (yy, yardLen, kind, hoist, listName, fracRec, courseRec) => {",
    "const crossYard = (yy, yardLen, kind, hoist, listName, fracRec, courseRec, hoistRec) => {   // r324: hoistRec, where a segment-rig hoisting yard hangs and why\n     ")
rep("      if (courseRec) ym.userData.courseAt = Object.assign(courseRec, { y: yY, yPlan: yy });\n",
    "      if (courseRec) ym.userData.courseAt = Object.assign(courseRec, { y: yY, yPlan: yy });\n"
    "      /* r324 (0y¹⁶⁶): a hoisting yard on a segment rig records where it is set, the record's read or the 0.88 atrip (A-HOIST-READ) */\n"
    "      if (hoistRec) ym.userData.hoistAt = Object.assign(hoistRec, { y: yY, yPlan: yy, setY: +setY.toFixed(3) });\n")
rep("""        crossYard(y + seg * (si === 0 ? courseAt : 0.88), yardLen,""",
"""        /* ── r324 (0y¹⁶⁶): THE RECORD MAY READ WHERE A HOISTING YARD IS SET ─────────────────────────
           Above the course every yard of a segment rig rides a tie and is set ATRIP, at 0.88 of the section it
           hoists on (Falconer's "atrip", the class figure below, which no plate set). Hocker's rig diagram of
           Vasa (1628) draws each of her five hoisting yards lower than that: the topsail yard just under the
           topmast's top, the topgallant yard just under the topgallant mast's top. A record carries such a read as
           `hoistRead.topmast` or `hoistRead.topgallantMast`, `ofFootToHead`: the yard's height over the mast's
           foot, over the height of that section's head (its cap) over the same foot. That is the measure a
           side-view plate gives directly, and the same two points the record's mastHeightsM already reads (the
           crosstrees on the topmast's head, the truck on the topgallant's). The furled build still lowers the
           yard onto the cap below: the plate shows the sails set. Without the field, byte-identical. */
        let hoistRec = null, hoistY = y + seg * 0.88;
        if (si >= 1 && tiers > 1 && !Array.isArray(mk.yards)) {
          const key = si === 1 ? 'topmast' : 'topgallantMast';
          const hr = mk.hoistRead && mk.hoistRead[key];
          if (hr && typeof hr.ofFootToHead === 'number') hoistY = base + hr.ofFootToHead * (y + seg - base);
          hoistRec = { mast: mi, section: key, si, base, head: y + seg, frac: hr && typeof hr.ofFootToHead === 'number' ? hr.ofFootToHead : null,
                       from: hr && typeof hr.ofFootToHead === 'number' ? 'record' : 'class' };
        }
        crossYard(si === 0 ? y + seg * courseAt : hoistY, yardLen,""")
rep("""                : isMizzen ? 'fixed' : S.iron ? 'fixed' : 'jeers', undefined, undefined, courseRec);""",
    """                : isMizzen ? 'fixed' : S.iron ? 'fixed' : 'jeers', undefined, undefined, courseRec, hoistRec);""")
open(P, 'w').write(s); print('ok')
