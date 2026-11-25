import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, ('anchor', a[:60], s.count(a)); s = s.replace(a, b)
rep("const crossYard = (yy, yardLen, kind, hoist, listName, fracRec) => {",
    "const crossYard = (yy, yardLen, kind, hoist, listName, fracRec, courseRec) => {   // r313: courseRec, where a segment-rig course hangs and why\n    /* (r283/r285 signature notes follow) */ {")
# close the extra block at the function's end would be fragile; undo: keep signature simple
s = s.replace("const crossYard = (yy, yardLen, kind, hoist, listName, fracRec, courseRec) => {   // r313: courseRec, where a segment-rig course hangs and why\n    /* (r283/r285 signature notes follow) */ {",
              "const crossYard = (yy, yardLen, kind, hoist, listName, fracRec, courseRec) => {   // r313: courseRec, where a segment-rig course hangs and why")
rep("      if (fracRec) ym.userData.yardFrac = Object.assign(fracRec, { y: yY, yPlan: yy });\n",
    "      if (fracRec) ym.userData.yardFrac = Object.assign(fracRec, { y: yY, yPlan: yy });\n"
    "      /* r313 (0y¹⁴³): a course on a segment rig records where it hangs, the record's read or the class figure (A-COURSE-READ) */\n"
    "      if (courseRec) ym.userData.courseAt = Object.assign(courseRec, { y: yY, yPlan: yy });\n")
rep("""        crossYard(y + seg * (si === 0 ? courseAt : 0.88), yardLen,""",
"""        /* ── r313 (0y¹⁴³): THE RECORD MAY READ WHERE THE COURSE HANGS ──────────────────────
           A course under upper tiers hangs in its slings under the top, and the 0.60 above is a
           class figure that no plate set. Eckersberg's 1828 painting of the Russian 74 Asow puts
           her crossjack at 0.845 of the height from the deck to the mizzen top, where 0.60 of the
           lower mast puts it at 0.667. The record carries such a read as `courseRead.ofDeckToTop`,
           a share of the deck-to-top height because that is what a plate shows (the slings hang
           from the masthead over the top), and the top's centre stands at 0.90 of the lower mast
           (buildTop's own height, below). Every other course keeps the class figure, and its mast
           says so in `courseAtProvenance`. Without the field, byte-identical. */
        let courseRec = null;
        if (si === 0 && tiers > 1) {
          const rd = (mk.courseRead && typeof mk.courseRead.ofDeckToTop === 'number') ? mk.courseRead : null;
          if (rd) courseAt = rd.ofDeckToTop * 0.90;
          courseRec = { mast: mi, base: y, seg, frac: courseAt, topAt: 0.90, from: rd ? 'record' : 'class' };
        }
        crossYard(y + seg * (si === 0 ? courseAt : 0.88), yardLen,""")
rep("""                : isMizzen ? 'fixed' : S.iron ? 'fixed' : 'jeers');
      }""", """                : isMizzen ? 'fixed' : S.iron ? 'fixed' : 'jeers', undefined, undefined, courseRec);
      }""")
open(p, 'w').write(s); print('ok')
