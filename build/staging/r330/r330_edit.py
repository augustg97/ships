"""r330 (0y174): the fluyt's fore and main course yards read off Hollar's 1647 etching of a fluyt under sail, and the
fore top re-read. r329 put the fore top on row 600; that is the row where the fore course yard crosses the mast's
column 724 (the traced yard gives 600.5 there). The top is the dark band on rows 563-572, aft of the topsail, with the
topmast shrouds' deadeyes above it, drawn as the main top is (band 528-540, deadeyes above).
Audit: A-COURSE-READ holds a course read and a mast read off the same plate to the same top row, and convicts a course
read at 0.97 of the deck-to-top height or more.
Usage: r330_edit.py [WEB] [AUDIT ...]   every replace asserted."""
import json, sys
ROOT = '/Users/augustgweon/Ships/'
WEB = sys.argv[1] if len(sys.argv) > 1 else ROOT + 'web'
AUDS = sys.argv[2:] if len(sys.argv) > 2 else [ROOT + 'Research/audit-hulls.js', ROOT + 'web/audit-hulls.js']

SPAN, SPACING_M = 777, 21.53
PLATE_SHORT = 'build/staging/r328/dl/hollar-flute.jpg (Hollar 1647, 1920 px)'
PLATE = ("Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET', etching, 1647 (Wikimedia Commons File:Wenceslas Hollar - "
         "A Flute (State 2).jpg, read at the 1920 px thumbnail, build/staging/r328/dl/hollar-flute.jpg, about 36 px/m at the masts, bow at the left)")

# The course reads. Yard lines traced by build/staging/r330/r330_trace.py (dark-centroid per column, straight-line fit).
COURSE = {
  0: dict(name='fore', deckRail=902, deckHidden=902, top=563, yard=604, axisCol=708, cols=[660, 772], pts=29, rms=1.6,
          slope=-0.2005, icpt=745.63,
          deck="row 902, the foot of the forecastle rail's lattice, where the mast stands on the forecastle deck (r329's deck for this mast)",
          topTxt=("row 563, the upper edge of the top. The top shows as a dark band on rows 563-572 at columns 740-758, aft of the "
                  "topsail's leech, with the topmast shrouds' deadeyes above it, drawn as the main top is drawn. Its fore half is "
                  "behind the topsail"),
          axisTxt="the line from the mast's foot (column 724, row 902) to the topmast's cap (column 693, row 285)"),
  1: dict(name='main', deckRail=933, deckHidden=963, top=528, yard=576, axisCol=1159, cols=[1065, 1205], pts=36, rms=1.4,
          slope=-0.2995, icpt=922.97,
          deck=("row 933, the waist rail, where the mast comes out from behind it (r329's deck for this mast). The waist deck is "
                "hidden behind the bulwark and the men in the waist show only their heads over the rail, so the deck may lie up to "
                "30 px lower, at row 963; the read is the mean of the shares from the two rows"),
          topTxt=("row 528, the upper edge of the top, as r329 read it. The top shows as a dark band on rows 528-540 at columns "
                  "1165-1205, aft of the topsail's leech, with the topmast shrouds' deadeyes above it"),
          axisTxt="the line from the mast's foot (column 1143, row 933) to the topmast's cap (column 1176, row 192)"),
}

def share(r):
    a = (r['deckRail'] - r['yard']) / (r['deckRail'] - r['top'])
    b = (r['deckHidden'] - r['yard']) / (r['deckHidden'] - r['top'])
    return a, b, round((a + b) / 2, 3)

P = WEB + '/data/vessels.json'
raw = open(P).read(); d = json.loads(raw)
V = {x['id']: x for x in d['vessels']}
ms = V['fluyt']['hull']['masts']

# ── the fore top, re-read ──
fm = ms[0]; rd = fm['mastHeightsRead']
assert rd['rows']['top'] == 600 and fm['mastHeightsM']['top'] == 8.37, 'fore top already re-read?'
sh_top = round((rd['foot'][1] - 563) / SPAN, 4)
rd['rows']['top'] = 563
rd['ofForeMizzenSpacing']['top'] = sh_top
rd['script'] = 'build/staging/r329/r329_edit.py; the top row build/staging/r330/r330_edit.py'
fm['mastHeightsM']['top'] = round(sh_top * SPACING_M, 2)
pv = fm['mastHeightsProvenance']
for a, b in [("READ, r329 (0y¹⁷¹): the top 8.37 m,", f"READ, r329 (0y¹⁷¹), the top re-read r330 (0y¹⁷⁴): the top {fm['mastHeightsM']['top']} m,"),
             ("(0.3887, 0.7941, 0.9537)", f"({sh_top}, 0.7941, 0.9537)"),
             ("the top platform is on row 600,",
              "the top's upper edge is on row 563 (r329 read the top on row 600; that is the row where the course yard crosses the "
              "mast's column 724, and the top stands 37 px above it, a band on rows 563-572 aft of the topsail with the topmast "
              "shrouds' deadeyes above it, drawn as the main top is; from r329 to r330 the fore top stood 1.02 m too low),")]:
    assert pv.count(a) == 1, a
    pv = pv.replace(a, b)
fm['mastHeightsProvenance'] = pv
mm = ms[1]; a = "the top platform is on row 528,"
assert mm['mastHeightsProvenance'].count(a) == 1, 'main top wording'
mm['mastHeightsProvenance'] = mm['mastHeightsProvenance'].replace(a, "the top's upper edge is on row 528,")
print('fore top', sh_top, fm['mastHeightsM'])

# ── the course reads ──
for mi, r in COURSE.items():
    mk = ms[mi]
    assert mk['courseAtProvenance'].startswith('UNREAD'), mi
    assert 'courseRead' not in mk
    assert mk['mastHeightsRead']['rows']['top'] == r['top'], (mi, 'top row')
    a, b, s = share(r)
    span = r['deckRail'] - r['top']
    assert abs(r['slope'] * r['axisCol'] + r['icpt'] - r['yard']) < 0.6, (mi, 'yard row off its trace')
    mk['courseRead'] = {"ofDeckToTop": s, "boundPm": 0.03,
        "rows": {"deckRail": r['deckRail'], "deckHidden": r['deckHidden'], "top": r['top'], "yard": r['yard']},
        "plate": PLATE_SHORT, "cols": [r['cols']], "axisCol": r['axisCol'], "topAtOfLower": 0.9, "spanPx": span,
        "trace": {"slope": r['slope'], "intercept": r['icpt'], "points": r['pts'], "rmsPx": r['rms']},
        "script": "build/staging/r330/r330_trace.py, build/staging/r330/r330_edit.py"}
    two = f"the shares from rows {r['deckRail']} and {r['deckHidden']} are {a:.3f} and {b:.3f}. " if r['deckHidden'] != r['deckRail'] else ''
    mk['courseAtProvenance'] = (
        f"PLATE READ, r330 (0y¹⁷⁴): the {r['name']} course yard hangs at {s} of the height from the deck to the {r['name']} top, "
        f"read off {PLATE}. The deck at this mast is {r['deck']}. The top is {r['topTxt']}. "
        f"The course yard was traced from column {r['cols'][0]} to {r['cols'][1]} ({r['pts']} points, a straight line within "
        f"{r['rms']} px rms), and it crosses the mast's axis at row {r['yard']}. The axis there is taken at column {r['axisCol']}, on "
        f"{r['axisTxt']}; 8 px of error in that column moves the crossing by {abs(r['slope']) * 8:.1f} px. {two}"
        f"The yard is drawn sloping, its after yardarm higher, because it is braced round and the ship is seen from a little forward "
        f"of the beam; the model hangs it level at the crossing. The deck-to-top span is {span} px, so a 3 px reading error is "
        f"{3 / span:.3f} of it, and the bound is 0.03. Until r330 this course hung at the class 0.60 of the lower mast, 0.667 of the "
        f"deck-to-top height, which no plate set. The hull is dated 1620 and the plate 1647.")
    print(r['name'], a, b, s)

indent = 2 if raw.startswith('{\n  "') else None
open(P, 'w').write(json.dumps(d, indent=indent, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))

# ── audit ──
for A in AUDS:
    t = open(A).read()
    a1 = ("       height of that mast's own TOP mesh over the foot, stands within the read's bound of the read. */\n")
    assert t.count(a1) == 1, 'audit header anchor'
    t = t.replace(a1, "       height of that mast's own TOP mesh over the foot, stands within the read's bound of the read.\n"
      "       r330 (0y¹⁷⁴): r329 read the fluyt's fore top on the row where her course yard crosses the mast, and built the top\n"
      "       1.02 m low. A course read and a mast read are two reads of the same top: where a mast carries both off the same plate\n"
      "       file, their top rows agree within 1 px ('a course and a mast read that disagree on the top'). A course yard hangs\n"
      "       in its slings under the top, so a read at 0.97 of the deck-to-top height or more means one of the two rows is\n"
      "       the other feature ('a course read at its own top'). */\n")
    a2 = ("            say(v.id, 'a course read off its own rows', `${at}: rows give ${a.toFixed(3)} and ${b.toFixed(3)} (mean ${((a + b) / 2).toFixed(3)}) against ofDeckToTop ${R.ofDeckToTop}`);\n"
          "        }\n")
    assert t.count(a2) == 1, 'audit rows anchor'
    t = t.replace(a2, a2 +
      "        if (R && typeof R.ofDeckToTop === 'number' && R.ofDeckToTop >= 0.97)   // r330\n"
      "          say(v.id, 'a course read at its own top', `${at}: courseRead.ofDeckToTop ${R.ofDeckToTop}; a course yard hangs in slings under its top, so one of the two rows read is the other feature`);\n"
      "        {\n"
      "          const MR = mk.mastHeightsRead, file = s => String(s || '').split(' (')[0];\n"
      "          if (R && R.rows && MR && MR.rows && typeof MR.rows.top === 'number' && file(R.plate) === file(MR.plate) && Math.abs(R.rows.top - MR.rows.top) > 1)\n"
      "            say(v.id, 'a course and a mast read that disagree on the top', `${at}: courseRead puts the top on row ${R.rows.top} and mastHeightsRead on row ${MR.rows.top}, off the same plate (${file(R.plate)})`);\n"
      "        }\n")
    open(A, 'w').write(t)
print('edited', WEB, AUDS)
