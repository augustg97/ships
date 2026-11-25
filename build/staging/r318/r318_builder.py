#!/usr/bin/env python3
"""r318 (0y154): a square mast may be recorded by the heights of its top, its topmast crosstrees and its
truck over the deck (`mastHeightsM`), and the stack is solved for them. Applies to hull.js and audit-hulls.js
under the directory given. Every replace is asserted."""
import sys
from pathlib import Path
root = Path(sys.argv[1])

def sub(path, old, new, count=1):
    p = root / path
    t = p.read_text()
    n = t.count(old)
    assert n == count, f'{path}: anchor found {n} times, wanted {count}: {old[:80]!r}'
    p.write_text(t.replace(old, new))

HULL = 'js/hull.js'

# 1. the solve, beside mastLowerOf
sub(HULL, """function mastLowerOf(mk, steelMain, footY) {
  if (mk.rig === 'gaff'""", """/* ── r318 (0y¹⁵⁴): A SQUARE MAST MAY BE RECORDED BY THE HEIGHTS OF ITS TOP, CROSSTREES AND TRUCK ──────────
   Steel 1794 sizes the topgallant mast at half its topmast, a spar for one sail with the royal set flying
   from its head. A clipper's topgallant mast is one stick carrying the topgallant, the royal and on the main
   the skysail, and Steel's half gave the clipper's fore 5.3 m of pole over the topmast cap for two yards:
   a topgallant 3.9 m deep and a royal 2.2 m, under topsails 9.1-9.3 m deep. Cutty Sark's tea rig, from
   the spar table in Lubbock's Log of the Cutty Sark (1924) as Sankey tabulates it, gives each mast's top,
   topgallant (crosstrees) and royal or skysail heights over the deck: fore 18.8 / 29.8 / 39.6 m. A record
   that carries those three figures (`mastHeightsM: {top, crosstrees, truck}`) is drawn to them: the top
   stands on the trestletrees at 0.90 of the lower mast (the platform's own rule, below), the crosstrees on
   the topmast's head, the truck on the topgallant mast's head, each heel at 0.88 of the segment below. So
     lower = top / 0.90;  topmast = crosstrees - 0.88 lower;  topgallant = truck - 0.88 (lower + topmast).
   The record keeps the source's three heights, not the solved lengths, for the reason the truckM note
   above gives. */
function squareStackOf(mk, lower) {
  const MH = mk.mastHeightsM;
  if (mk.rig === 'square' && MH && MH.top > 0 && MH.crosstrees > MH.top && MH.truck > MH.crosstrees) {
    const top = MH.crosstrees - 0.88 * lower;
    return { top, tg: MH.truck - 0.88 * (lower + top), from: 'mastHeightsM' };
  }
  return { top: lower * 0.60, tg: lower * 0.30, from: 'steel' };
}
function mastLowerOf(mk, steelMain, footY) {
  if (mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0) return mk.mastHeightsM.top / 0.90;
  if (mk.rig === 'gaff'""")

# 2. the stack in buildRig
sub(HULL, "    const top = lower * 0.60, tg = top * 0.50;\n",
    "    const { top, tg } = squareStackOf(mk, lower);   // r318: Steel's 0.60 and 0.50, or the record's heights\n")

# 3. the headsails' fore topmast head
sub(HULL, "                           : fm.rig === 'square' ? flower * 0.88 + flower * 0.60 * 0.72\n",
    "                           : fm.rig === 'square' ? flower * 0.88 + squareStackOf(fm, flower).top * 0.72\n")

# 4. the loft's truck provenance
sub(HULL, """                     : (mk.truckM !== undefined && mk.rig === 'square') ? 'record: truckM '""",
    """                     : (mk.mastHeightsM && mk.rig === 'square') ? 'record: mastHeightsM, top ' + mk.mastHeightsM.top + ', crosstrees ' + mk.mastHeightsM.crosstrees + ', truck ' + mk.mastHeightsM.truck + ' m over the deck, the stack solved for them'
                     : (mk.truckM !== undefined && mk.rig === 'square') ? 'record: truckM '""")
sub(HULL, "lower: (mk.heightM !== undefined || mk.truckWLM !== undefined || mk.truckM !== undefined) ? 'record' : 'beam'",
    "lower: (mk.heightM !== undefined || mk.truckWLM !== undefined || mk.truckM !== undefined || mk.mastHeightsM) ? 'record' : 'beam'")

# 5. the audit's mirror of mastLowerOf
AUD = 'audit-hulls.js'
sub(AUD, """    const lowerOf = mk => {
      if (mk.rig === 'gaff'""", """    const lowerOf = mk => {
      if (mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0) return mk.mastHeightsM.top / 0.90;   // r318
      if (mk.rig === 'gaff'""")
print('builder edits applied under', root)
