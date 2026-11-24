#!/usr/bin/env python3
"""r300: Titanic's two trucks read off the 1911 side plan; each pole is derived from its truck and
the deck at its foot. Reads the *.before.* copies and writes web/ and Research/, so it re-runs clean.
Usage: r300_apply.py [ROOT]  (ROOT defaults to the repo; a :8150 copy can be named instead)."""
import json, sys
R = '/Users/augustgweon/Ships/build/staging/r300/'
W = (sys.argv[1] if len(sys.argv) > 1 else '/Users/augustgweon/Ships').rstrip('/') + '/'
def sub1(s, old, new, n=1):
    assert s.count(old) == n, (old[:90], s.count(old)); return s.replace(old, new)

PLATE = ("the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, "
         "'Olympic and Titanic Side Plan 1911.png', 3803 x 1052 px, bow at the right; "
         "build/staging/r295/plates/side-plan-1911.png)")
PX = 3505.5 / 269.1
tr = json.load(open(R + 'trucks.json'))

# ── RECORD ────────────────────────────────────────────────────────────────────────────────
d = json.load(open(R + 'vessels.before.json', encoding='utf8'))
h = next(x for x in d['vessels'] if x['id'] == 'titanic')['hull']
assert [m['heightM'] for m in h['masts']] == [52.2, 52.2]
for m, key, other in zip(h['masts'], ('fore', 'main'), ('main', 'fore')):
    t = tr[key]
    want = round((t['wlRow'] - t['topRow']) / PX, 2)
    assert abs(want - t['overWL']) < 0.011, (key, want, t)
    del m['heightM']
    m['truckWLM'] = want
    m['truckRead'] = {'col': t['col'], 'topRow': t['topRow'], 'wlRow': t['wlRow'], 'pxPerM': round(PX, 4)}
    m['truckProvenance'] = (
        f"PLATE READ, r300: the {key}mast's truck off {PLATE}. The plan draws each mast as two tapering "
        f"edges ending in a black knob, the truck, with a house flag flying from it. The mast's centre line "
        f"(r296's fit, leaning {('10.4' if key == 'fore' else '9.8')} degrees on the page) was followed up to "
        f"the highest row with ink within 3 px of it: row {t['topRow']} at column {t['col']}. The plan's "
        f"waterline stands on row {t['wlRow']} at that column, so the truck stands {want} m over the load "
        f"waterline at 13.03 px/m. The plan's bar scale reads 1% longer, which puts the bound at about "
        f"0.6 m; the read itself is good to about a row (0.1 m). The pole is not recorded: the builder "
        f"draws it from the deck at its foot up to this height, so it follows the deck when the deck moves. "
        f"Until r300 both poles carried a heightM of 52.2 m from the deck, set to put the trucks at the "
        f"record's 62.5 m (mastTopM), which stood the fore truck at 63.25 m once r299 raised the deck under it.")
h['mastTopMProvenance'] = (
    "CONTESTED. 62.5 m is 'approximately 205 ft above the maximum load line', the round figure that "
    "secondary accounts of her fitting-out in August 1911 give for the tops of both masts, with no drawing "
    "or measurement cited. "
    f"The 1911 side plan in Engineering draws the two trucks at different heights: the fore at "
    f"{tr['fore']['overWL']} m and the main at {tr['main']['overWL']} m over its waterline (r300; each mast "
    "carries its read as truckWLM). The masts are built to the plan's reads. This figure is kept as the "
    "printed one, and the audit holds the tallest built mast within 1.5 m of it.")
open(W + 'web/data/vessels.json', 'w', encoding='utf8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print('record written')

# ── BUILDER ───────────────────────────────────────────────────────────────────────────────
s = open(R + 'hull.before.js', encoding='utf8').read()
s = sub1(s, """function mastLowerOf(mk, steelMain) {
  if (mk.truckM !== undefined && mk.rig === 'square') {""",
"""/* ── r300: A POLE MAY BE RECORDED BY ITS TRUCK OVER THE WATER ──────────────────────────
   Titanic's side plan draws each truck at a height over the waterline, and nothing in reach
   gives either pole's length from her deck. `truckWLM` on a pole mast states that height, and
   the pole is the truck less the deck at its foot, so it follows the deck when the deck moves:
   r299 raised her C deck 0.6 m under the foremast and a recorded 52.2 m pole carried the truck
   up with it, 2.4 m over the plan. `footY` is the deck the pole steps on; a call that cannot
   name one gets no pole from a truck record. */
function mastLowerOf(mk, steelMain, footY) {
  if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))
    return footY !== undefined ? mk.truckWLM - footY : 0;
  if (mk.truckM !== undefined && mk.rig === 'square') {""")
s = sub1(s, "    const lower = mastLowerOf(mk, steelMain);\n",
            "    const lower = mastLowerOf(mk, steelMain, base);\n")
s = sub1(s, """    const mainLower = S.masts.reduce((mx, m2) =>
      Math.max(mx, mastLowerOf(m2, steelMain)), 0)""",
"""    const mainLower = S.masts.reduce((mx, m2) =>
      Math.max(mx, mastLowerOf(m2, steelMain, deckAt(m2.at))), 0)""")
s = sub1(s, """      const flower = mastLowerOf(fm, steelMain);
      const fx = (fm.at - 0.5) * L + H.rake(fm.at);
      const fbase = deckAt(fm.at);""",
"""      const fbase = deckAt(fm.at);
      const flower = mastLowerOf(fm, steelMain, fbase);
      const fx = (fm.at - 0.5) * L + H.rake(fm.at);""")
s = sub1(s, """        rigTruckFrom = (mk.truckM !== undefined && mk.rig === 'square') ? 'record: truckM ' + mk.truckM + ' m deck to flag-button, the stack solved for it'""",
"""        rigTruckFrom = (mk.truckWLM !== undefined && n === 1) ? 'record: truckWLM ' + mk.truckWLM + ' m over the load waterline, one pole from the deck at its foot'
                     : (mk.truckM !== undefined && mk.rig === 'square') ? 'record: truckM ' + mk.truckM + ' m deck to flag-button, the stack solved for it'""")
s = sub1(s, """                        lower: mk.heightM !== undefined ? 'record' : 'beam', truckM: mk.truckM, heightM: mk.heightM };""",
"""                        lower: (mk.heightM !== undefined || mk.truckWLM !== undefined) ? 'record' : 'beam', truckM: mk.truckM, heightM: mk.heightM, truckWLM: mk.truckWLM };""")
open(W + 'web/js/hull.js', 'w', encoding='utf8').write(s)
print('builder written')

# ── AUDIT ─────────────────────────────────────────────────────────────────────────────────
a = open(R + 'audit-hulls.before.js', encoding='utf8').read()
a = sub1(a, """    const lowerOf = mk => {
      if (mk.truckM !== undefined && mk.rig === 'square') {""",
"""    /* r300: a pole recorded by its truck over the water (`truckWLM`) is the truck less the deck at
       its foot, hull.js's own derivation */
    const HSlo = (H.masts || []).some(mk => mk.truckWLM !== undefined) ? SHIPS_HULL.hullSurface(H) : null;
    const lowerOf = mk => {
      if (mk.truckWLM !== undefined && (mk.rig === 'pole' || mk.rig === 'none'))
        return mk.truckWLM - HSlo.deck(mk.at);
      if (mk.truckM !== undefined && mk.rig === 'square') {""")
a = sub1(a, """        mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainD);""",
"""        lowerOf(mm));""")
a = sub1(a, """          const wantRecord = (mk.truckM !== undefined && mk.rig === 'square') || (tallest.n === 1 && mk.heightM !== undefined);""",
"""          const wantRecord = (mk.truckM !== undefined && mk.rig === 'square') || (tallest.n === 1 && (mk.heightM !== undefined || mk.truckWLM !== undefined));""")
anchor = "    /* ── A-SHEER-READ (round 299, Titanic):"
a = sub1(a, anchor, """    /* ── A-TRUCK-READ (round 300, Titanic): A POLE RECORDED BY ITS TRUCK IS ITS PLATE'S ROWS, AND
       THE BUILT POLE ENDS THERE. Titanic's two poles carried a class heightM of 52.2 m from the deck,
       so when r299 raised her deck 0.6 m under the foremast the fore truck rose with it to 63.25 m,
       2.4 m over the side plan's 60.81. On a hull whose masts were read off a plate (stationRead),
       every pole mast must carry truckWLM with its read (col, topRow, wlRow, pxPerM), the figure must
       equal (wlRow - topRow) / pxPerM within 0.05 m, and off the meshes the head of that mast's
       highest segment must stand at it within 0.15 m. A pole on such a hull with no truck read is
       convicted for the silence. Square masts (Preussen's) carry truckM and are not this rule's. */
    if (H.stationRead) {
      const headOf = mi => { let hd = -Infinity; g.traverse(o => { const sg = o.isMesh && o.userData.seg; if (sg && sg.mi === mi) hd = Math.max(hd, sg.headY); }); return hd; };
      (H.masts || []).forEach((mk, mi) => {
        if (!(mk.rig === 'pole' || mk.rig === 'none')) return;
        if (mk.truckWLM === undefined) { say(v.id, 'a pole with no truck read on a plate-read hull', `mast ${mi} at u ${mk.at}: the stations were read off the plate and the truck was not`); return; }
        const tr = mk.truckRead;
        if (!(tr && tr.pxPerM > 0 && typeof tr.topRow === 'number' && typeof tr.wlRow === 'number')) { say(v.id, 'a truck height with no rows', `mast ${mi}: truckWLM ${mk.truckWLM} m and no truckRead`); return; }
        const want = (tr.wlRow - tr.topRow) / tr.pxPerM;
        if (Math.abs(mk.truckWLM - want) > 0.05) say(v.id, 'a truck off its plate read', `mast ${mi}: truckWLM ${mk.truckWLM} m, the plate's row ${tr.topRow} over waterline row ${tr.wlRow} reads ${want.toFixed(2)} m`);
        const hd = headOf(mi);
        if (!(Math.abs(hd - mk.truckWLM) <= 0.15)) say(v.id, 'a pole built off its read truck', `mast ${mi}: the highest segment's head stands at ${isFinite(hd) ? hd.toFixed(2) : 'nothing'} m, the read ${mk.truckWLM} m`);
      });
    }

""" + anchor)
open(W + 'Research/audit-hulls.js', 'w', encoding='utf8').write(a)
open(W + 'web/audit-hulls.js', 'w', encoding='utf8').write(a)
print('audit written')
