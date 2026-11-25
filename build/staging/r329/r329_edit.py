"""r329 (0y171): the fluyt's three masts read off Hollar's 1647 etching of a fluyt, as shares of the distance between
her fore and mizzen masts' feet. Builder: a lateen mizzen with a recorded top takes its lower mast from it.
Audit: A-MAST-READ takes the span's magnitude (Hollar's bow is at the LEFT, Vasa's at the right); lowerOf follows the builder."""
import json, sys
ROOT = '/Users/augustgweon/Ships/'
WEB = sys.argv[1] if len(sys.argv) > 1 else ROOT + 'web'
AUD = sys.argv[2] if len(sys.argv) > 2 else ROOT + 'Research/audit-hulls.js'
SPACING_M = 21.53   # built fore-to-mizzen feet spacing, probe-before.json: footX -11.499 (fore), lateen spacing 8.489 from the main at 1.54
FEET = {'fore': [724, 902], 'main': [1143, 933], 'mizzen': [1501, 868]}
ROWS = {'fore': {'top': 600, 'crosstrees': 285, 'truck': 161},
        'main': {'top': 528, 'crosstrees': 192, 'truck': 47},
        'mizzen': {'top': 588}}
SPAN = abs(FEET['fore'][0] - FEET['mizzen'][0])     # 777 px
def shares(m):
    f = FEET[m][1]
    return {k: round((f - r) / SPAN, 4) for k, r in ROWS[m].items()}
PLATE = ("Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 (Wikimedia Commons File:Wenceslas Hollar - "
         "A Flute (State 2).jpg, read at the 1920 px thumbnail, build/staging/r328/dl/hollar-flute.jpg, about 36 px/m at the masts, bow at the left)")
DECK = {'fore': "the foot of the forecastle rail's lattice, where the mast stands on the forecastle deck (row 902, to about 8 px)",
        'main': "the waist rail, where the mast comes out from behind it (row 933). The waist deck is hidden behind the bulwark, and the men in "
                "the waist show only their heads over the rail, so the deck may lie up to about 30 px (0.8 m) lower",
        'mizzen': "row 868, between the row where the pole comes out of the poop rail (860) and the feet of the men on the poop (878), as r328 read it"}
NAMES = {'fore': 'foremast', 'main': 'mainmast', 'mizzen': 'mizzen'}
def prov(m, sh, MH):
    if m == 'mizzen':
        what = f"the top {MH['top']} m over the foot of the mast"
    else:
        what = (f"the top {MH['top']} m, the topmast's head {MH['crosstrees']} m and the head of the pole above it (built as the topgallant "
                f"mast) {MH['truck']} m over the foot of the mast")
    s = (f"READ, r329 (0y¹⁷¹): {what}. Each is a share of the distance between the fore and mizzen masts' feet "
         f"({', '.join(str(sh[k]) for k in ('top', 'crosstrees', 'truck') if k in sh)}), times that distance on this hull's built masts "
         f"({SPACING_M} m). Read off " + PLATE + ": the fore and mizzen masts meet the deck at columns 724 and 1501, 777 px apart; "
         f"the deck at this mast is taken at {DECK[m]}; the top platform is on row {ROWS[m]['top']}")
    if m != 'mizzen':
        s += (f", the topmast's head, where its shrouds meet under the cap, on row {ROWS[m]['crosstrees']}, and the head of the pole above "
              f"it on row {ROWS[m]['truck']}. Under sail Hollar draws that pole bare, with a pennant on it and no yard crossed; his second "
              "fluyt plate of 1647 (the fluyts at anchor, 'vulgo VLIETEN', build/staging/r328/dl/fleuten-1647.jpg, 644 px wide) draws "
              "topgallant masts with yards crossed on the fore and the main. So the pole is built as the topgallant mast, and the three "
              "tiers stand")
        if m == 'main':
            s += (". The pole's head is drawn against the plate's top border line (row 43), so it may stand a few pixels higher than "
                  "read")
    else:
        s += (". The topmast above the top keeps its own read (lateenTopmast, r328), which is a share of this height, so it comes down "
              "with it")
    s += (". The tops and caps are read to about 5 px, 0.006 of the span. The datum is the masts' feet, as on the East Indiaman and the "
          "slave ship (r322). CONTESTED datum: the plate's own spacing of the main between the fore and the mizzen (0.539 of the span) "
          "differs from this hull's stations (0.606), and Hollar draws the ship a little from forward of the beam, so the horizontal "
          "span is foreshortened and these heights may be a few per cent high. Until r329 the mast was Steel's 1794 proportions "
          "(lower mast a share of Steel's main, topmast 0.60, topgallant 0.50), a rule for warships 150 years later; the lower tops "
          "stood 4.4 to 5.7 m higher. The hull is dated 1620 and the plate 1647.")
    return s

# ── record ──
P = WEB + '/data/vessels.json'
raw = open(P).read(); d = json.loads(raw)
V = {x['id']: x for x in d['vessels']}
ms = V['fluyt']['hull']['masts']
for mi, m in enumerate(('fore', 'main', 'mizzen')):
    mk = ms[mi]
    assert 'mastHeightsM' not in mk, m
    assert mk['mastHeightsProvenance'].startswith('CLASS, r322'), m
    sh = shares(m)
    MH = {k: round(sh[k] * SPACING_M, 2) for k in sh}
    mk['mastHeightsM'] = MH
    mk['mastHeightsRead'] = {'ofForeMizzenSpacing': sh, 'spacingM': SPACING_M, 'rows': ROWS[m], 'foot': FEET[m],
                             'feetPx': [FEET['fore'][0], FEET['mizzen'][0]], 'boundOfSpacing': 0.006, 'boundM': 0.05,
                             'plate': 'build/staging/r328/dl/hollar-flute.jpg (Hollar 1647, 1920 px)',
                             'script': 'build/staging/r329/r329_edit.py'}
    mk['mastHeightsProvenance'] = prov(m, sh, MH)
    print(m, sh, MH)
indent = 2 if raw.startswith('{\n  "') else None
open(P, 'w').write(json.dumps(d, indent=indent, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))

# ── builder ──
H = WEB + '/js/hull.js'; s = open(H).read()
a = "  if (mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0) return mk.mastHeightsM.top / 0.90;\n  if (mk.rig === 'gaff'"
assert s.count(a) == 1, 'builder anchor'
s = s.replace(a, "  if (mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0) return mk.mastHeightsM.top / 0.90;\n"
  "  /* r329 (0y¹⁷¹): a lateen mizzen that carries a top (lateenTopmast, r328) and a recorded top height is drawn to it:\n"
  "     the top stands at its own topOfLower share of the lower pole, so the pole is the top's height over that share. */\n"
  "  if (mk.rig === 'lateen' && mk.lateenTopmast && mk.lateenTopmast.topOfLower > 0 && mk.mastHeightsM && mk.mastHeightsM.top > 0)\n"
  "    return mk.mastHeightsM.top / mk.lateenTopmast.topOfLower;\n  if (mk.rig === 'gaff'")
open(H, 'w').write(s)

# ── audit ──
A = AUD; t = open(A).read()
a1 = "      if (mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0) return mk.mastHeightsM.top / 0.90;   // r318\n"
assert t.count(a1) == 1, 'audit lowerOf anchor'
t = t.replace(a1, a1 + "      if (mk.rig === 'lateen' && mk.lateenTopmast && mk.lateenTopmast.topOfLower > 0 && mk.mastHeightsM && mk.mastHeightsM.top > 0)\n"
              "        return mk.mastHeightsM.top / mk.lateenTopmast.topOfLower;   // r329, hull.js mastLowerOf\n")
a2 = "const sh = rd.ofForeMizzenSpacing || {}, span = rd.feetPx[0] - rd.feetPx[1], MH = mk.mastHeightsM || {};"
assert t.count(a2) == 1, 'audit span anchor'
t = t.replace(a2, "const sh = rd.ofForeMizzenSpacing || {}, span = Math.abs(rd.feetPx[0] - rd.feetPx[1]), MH = mk.mastHeightsM || {};   /* r329: Hollar's bow is at the left */")
open(A, 'w').write(t)
print('edited')
