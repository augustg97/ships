#!/usr/bin/env python3
"""r347: a Steel-rule lower mast stands its length less the depth from the deck down to its step.
usage: r347_edit.py <web dir> <audit-hulls.js>"""
import sys, re
web, audit = sys.argv[1], sys.argv[2]

def sub(src, old, new, label):
    n = src.count(old)
    assert n == 1, f'{label}: anchor found {n} times'
    return src.replace(old, new)

p = f'{web}/js/hull.js'
s = open(p).read()

s = sub(s, """function squareStackOf(mk, lower) {
  const MH = mk.mastHeightsM;""",
"""function squareStackOf(mk, lower, whole) {
  const MH = mk.mastHeightsM;""", 'stack sig')
s = sub(s, """  return { top: lower * 0.60, tg: lower * 0.30, from: 'steel' };
}
function mastLowerOf(mk, steelMain, footY) {""",
"""  /* r347: Steel's 3/5 and 3/10 are shares of the WHOLE mast, heel to head (`whole`), not of the part standing
     above the deck; the two differ by the step depth on a hull that records one (mastStepOf) */
  const W = whole !== undefined ? whole : lower;
  return { top: W * 0.60, tg: W * 0.30, from: 'steel' };
}
/* ── r347: STEEL'S LENGTH IS HEEL TO HEAD, AND THE HEEL STEPS ON THE KEELSON ──────────────
   "The length of the lower deck and extreme breadth being added together, the half is the length of the
   main-mast" gives the mast's whole length, as every mast table does: on a 74, 107 ft 6 in, which is
   the 108 ft the tables give her main mast. The heel stands in a step on the keelson, so the depth in
   hold and the height of the gun deck are inside that length, below the upper deck. Until r347 the
   builder stood the whole length on the deck, and the 74's main top stood 29.5 m over her upper deck.
   On Eckersberg's Asow (1828) it stands 22.0 m over it (r347, build/staging/r347/), and the corrected
   rule gives 22.5. `S.mastStep.belowDeckM` is the depth from the deck the mast stands on to the top of
   its step. It applies only where the mast's length comes from Steel's rule; a recorded height in metres
   is a height over the deck already. A hull with no step record stands its Steel length on the deck,
   and the mast carries userData.stepFrom 'unknown (class fallback)'. */
function mastStepOf(S, mk) {
  if (!S || !S.mastStep || !(S.mastStep.belowDeckM > 0) || !mk || !isSteelLength(mk)) return 0;
  return S.mastStep.belowDeckM;
}
function isSteelLength(mk) {
  if (mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0) return false;
  if (mk.rig === 'lateen' && mk.lateenTopmast && mk.lateenTopmast.topOfLower > 0 && mk.mastHeightsM && mk.mastHeightsM.top > 0) return false;
  if (mk.rig === 'gaff' && mk.topmast && mk.truckM !== undefined && mk.capFrac !== undefined) return false;
  if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none')) return false;
  if (mk.truckM !== undefined && mk.rig === 'square') return false;
  return mk.heightM === undefined;
}
function mastLowerOf(mk, steelMain, footY, S) {""", 'lower sig')
s = sub(s, """  return mk.heightM !== undefined ? mk.heightM : (mk.height || 0) * steelMain;
}
function buildRig(""",
"""  return mk.heightM !== undefined ? mk.heightM : (mk.height || 0) * steelMain - mastStepOf(S, mk);
}
function buildRig(""", 'lower return')
s = sub(s, """    const lower = mastLowerOf(mk, steelMain, base);""",
"""    const lower = mastLowerOf(mk, steelMain, base, S);
    const stepM = mastStepOf(S, mk);""", 'lower call')
s = sub(s, """      Math.max(mx, mastLowerOf(m2, steelMain, deckAt(m2.at))), 0)""",
"""      Math.max(mx, mastLowerOf(m2, steelMain, deckAt(m2.at), S)), 0)""", 'mainLower call')
s = sub(s, """    const { top, tg } = squareStackOf(mk, lower);""",
"""    const { top, tg } = squareStackOf(mk, lower, lower + stepM);""", 'stack call')
s = sub(s, """      const flower = mastLowerOf(fm, steelMain, fbase);""",
"""      const flower = mastLowerOf(fm, steelMain, fbase, S);""", 'head lower call')
s = sub(s, """squareStackOf(fm, flower).top * 0.72""",
"""squareStackOf(fm, flower, flower + mastStepOf(S, fm)).top * 0.72""", 'head stack call')
s = sub(s, """        const courseL = mk.courseYardM !== undefined ? mk.courseYardM : lower * 0.875;
        const yardLen = si === 0 ? courseL""",
"""        /* r347: Steel's 7/8 is of the whole mast, heel to head (his table: 7/8 x 112 ft = 98 ft) */
        const courseL = mk.courseYardM !== undefined ? mk.courseYardM : (lower + stepM) * 0.875;
        const yardLen = si === 0 ? courseL""", 'yard seg-rig')
s = sub(s, """         derived mast. */
      const courseL = mk.courseYardM !== undefined ? mk.courseYardM : lower * 0.875;""",
"""         derived mast. r347: of the whole mast, heel to head. */
      const courseL = mk.courseYardM !== undefined ? mk.courseYardM : (lower + stepM) * 0.875;""", 'yard plan-rig')
s = sub(s, """                         rakeDeg: mk.rake || 0, lengthM: segLen };""",
"""                         rakeDeg: mk.rake || 0, lengthM: segLen };
      /* r347: a Steel-length lower says where its heel steps (A-MAST-STEP) */
      if (si === 0 && isSteelLength(mk))
        m.userData.step = stepM > 0
          ? { belowDeckM: stepM, wholeM: +(lower + stepM).toFixed(3), from: 'record (hull.mastStep)' }
          : { belowDeckM: 0, wholeM: +lower.toFixed(3), from: 'unknown (class fallback): the whole Steel length stands on the deck' };""", 'seg step')
open(p, 'w').write(s)

a = open(audit).read()
a = sub(a, """      return mk.heightM !== undefined ? mk.heightM
                                      : (mk.height || 0) * (H.lwl + H.beam) / 2;""",
"""      /* r347: a Steel length is heel to head; the part over the deck is less the recorded step depth */
      return mk.heightM !== undefined ? mk.heightM
                                      : (mk.height || 0) * (H.lwl + H.beam) / 2
                                        - (H.mastStep && H.mastStep.belowDeckM > 0 ? H.mastStep.belowDeckM : 0);""", 'audit lowerOf')
open(audit, 'w').write(a)
print('ok')
