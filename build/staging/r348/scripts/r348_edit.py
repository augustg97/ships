#!/usr/bin/env python3
"""r348: a Steel-length lower mast on a stepped hull takes Steel's masthead, a share of the WHOLE mast.
usage: r348_edit.py <web dir>   (run on r347's tree; every replace is asserted)"""
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / 'js' / 'hull.js'
s = p.read_text()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f'{n} != {count}: {old[:90]!r}'
    s = s.replace(old, new)

# 1. the function, after isSteelLength
rep("""function mastLowerOf(mk, steelMain, footY, S) {""",
"""/* ── r348: THE LOWER MASTHEAD IS STEEL'S SHARE OF THE WHOLE MAST ─────────────────────────────
   Steel 1794, "Proportional Lengths of Masts" (maritime.org, part 1): "The head of the main and fore masts,
   5 inches to every yard of the mast's length. The head of the mizen-mast, and main and fore topmasts, 4 inches
   to every yard of the length." The mast's length there is the whole mast, heel to head (r347). Until r348 the
   builder stood every top at 0.90 of the lower's span over the deck and every topmast heel at 0.88, so on the
   74 the main masthead, top to cap, was 2.5 m. Steel's rule gives 4.56 m, and Eckersberg's Asow (1828) reads
   4.2 m (build/staging/r348/). This rule applies only where the hull records a step (hull.mastStep), because
   that is where the record says the mast is Steel's whole length; every other mast keeps the class fractions.
   The topmast's heel keeps the class doubling's proportion to the head, 1.2 of it (0.12 against 0.10).
   The lower shrouds' eyes rest on the trestletrees, just over the top: on a Steel head they stand 0.15 of
   the head over the top; the class figure is 0.97 of the span (0.7 of the class head over the top). */
function lowerHeadOf(S, mk, lower) {
  const stepM = mastStepOf(S, mk);
  if (!(stepM > 0) || mk.rig !== 'square' || !(lower > 0))
    return { top: 0.90, heel: 0.88, shroud: 0.97, headM: lower * 0.10, inPerYd: null, from: 'class' };
  const ats = (S.masts || []).map(m2 => m2.at);
  const mizzen = ats.length >= 3 && mk.at === Math.max(...ats);
  const inPerYd = mizzen ? 4 : 5;
  const headM = (lower + stepM) * inPerYd / 36;
  return { top: 1 - headM / lower, heel: 1 - 1.2 * headM / lower, shroud: 1 - 0.85 * headM / lower,
           headM, inPerYd, from: 'steel' };
}
function mastLowerOf(mk, steelMain, footY, S) {""")

# 2. once per mast, after the step
rep("""    const stepM = mastStepOf(S, mk);
    /* ── A MAST IS AS THICK""",
"""    const stepM = mastStepOf(S, mk);
    const LF = lowerHeadOf(S, mk, lower);   // r348: where the lower's top, topmast heel and shroud eyes stand
    /* ── A MAST IS AS THICK""")

# 3. the topmast top's disc
rep("const tmH = base + lower * 0.88 + top, yT", "const tmH = base + lower * LF.heel + top, yT")
# 4. mastRAt's stack
rep("        y0 += segs[si] * 0.88;\n", "        y0 += segs[si] * (si === 0 ? LF.heel : 0.88);\n")
# 5. the lower top
rep("tp.position.set(mxA(y + seg * 0.90), y + seg * 0.90, 0);", "tp.position.set(mxA(y + seg * LF.top), y + seg * LF.top, 0);")
rep("mastDiscs.push({ x: mxA(y + seg * 0.90), y: y + seg * 0.90, r: topR,", "mastDiscs.push({ x: mxA(y + seg * LF.top), y: y + seg * LF.top, r: topR,")
rep("const topY = seg * 0.90 - topR * 0.22;       // the trestletrees' underside",
    "const topY = seg * LF.top - topR * 0.22;     // the trestletrees' underside (r348: LF.top)")
# 6. the course read against the top
rep("if (rd) courseAt = rd.ofDeckToTop * 0.90;", "if (rd) courseAt = rd.ofDeckToTop * LF.top;")
rep("frac: courseAt, topAt: 0.90, from:", "frac: courseAt, topAt: LF.top, from:")
# 7. the stack advance
rep("""      segHeads[si] = capY;
      y += seg * 0.88;""", """      segHeads[si] = capY;
      y += seg * (si === 0 ? LF.heel : 0.88);""")
# 8. the jeers and the top in the running gear
rep("const jb = base + L0 * 0.86;            // just under the top, the jeers' station",
    "const jb = base + L0 * (LF.top - 0.04); // just under the top, the jeers' station")
rep("const topY = base + L0 * 0.90;          // where the top stands (the rig's own placement)",
    "const topY = base + L0 * LF.top;        // where the top stands (the rig's own placement)")
# 9. the lower shrouds' head
rep("const topY = lateenHead ? lateenHead.hounds : base + lower * 0.97;",
    "const topY = lateenHead ? lateenHead.hounds : base + lower * LF.shroud;")
# 10. the upper standing rigging
rep("const platX = mxA(base + lower * 0.90);", "const platX = mxA(base + lower * LF.top);")
rep("const platY = base + lower * 0.90;", "const platY = base + lower * LF.top;")
rep("const topHead = base + lower * 0.88 + top * 0.97;", "const topHead = base + lower * LF.heel + top * 0.97;")
rep("const tmHeadY = base + lower * 0.88 + top;", "const tmHeadY = base + lower * LF.heel + top;")
rep("const tgHead = base + (lower + top) * 0.88 + tg * 0.95;", "const tgHead = base + lower * LF.heel + top * 0.88 + tg * 0.95;", 2)
# 11. the headsails' reach up the fore
rep(": fm.rig === 'square' ? flower * 0.88 + squareStackOf(",
    ": fm.rig === 'square' ? flower * lowerHeadOf(S, fm, flower).heel + squareStackOf(")
# 12. the builder records the head it built (A-MASTHEAD-STEEL)
rep("""          : { belowDeckM: 0, wholeM: +lower.toFixed(3), from: 'unknown (class fallback): the whole Steel length stands on the deck' };
""", """          : { belowDeckM: 0, wholeM: +lower.toFixed(3), from: 'unknown (class fallback): the whole Steel length stands on the deck' };
      /* r348: the lower masthead as built, top to cap, and its rule (A-MASTHEAD-STEEL) */
      if (si === 0 && mk.rig === 'square')
        m.userData.head = { headM: +LF.headM.toFixed(3), topY: +(y + seg * LF.top).toFixed(3), heelY: +(y + seg * LF.heel).toFixed(3),
                            inPerYd: LF.inPerYd, from: LF.from === 'steel'
                              ? 'Steel 1794: ' + LF.inPerYd + ' in to every yard of the whole mast, heel to head'
                              : 'class: the top at 0.90 and the topmast heel at 0.88 of the span over the deck' };
""")
rep("          tp.userData.mast = mi;\n", "          tp.userData.mast = mi; tp.userData.lowerTop = true;\n")
p.write_text(s)
print('r348_edit: ok')
