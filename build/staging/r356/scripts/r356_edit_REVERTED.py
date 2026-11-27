#!/usr/bin/env python3
"""r356: the side a cover's parts stop short of is the ship's recorded side (hull.side), read off
Steel 1805/1822; a hull with no record keeps COVER_SIDE_M and the build says so (sideFrom 'class').
usage: r356_edit.py <web dir>"""
import sys, json, os
W = sys.argv[1]
p = os.path.join(W, 'js', 'hull.js')
s = open(p).read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:80])
    s = s.replace(old, new)

# deckCovers: the castle's side and its closed end from the record
rep("""  const C = S.castles; if (!C || !C.openToWaist || !C.openToWaist.length) return out.slice(0, 4);
  const L = S.lwl,""", """  const C = S.castles; if (!C || !C.openToWaist || !C.openToWaist.length) return out.slice(0, 4);
  const SD = coverSide(S);   // r356: the side's thickness at the deck and at the cover, recorded or the class default
  const L = S.lwl,""")
rep("""      (v.st = v.st || []).push([T.half((a + b) / 2) - COVER_SIDE_M, T.half((a + b) / 2) - COVER_SIDE_M, H.deck(cl((a + b) / 2))]);
    }
    v.endIn = COVER_SIDE_M;   // r354: the castle closes on the hull's own end, a wall a part's span stops short of""",
"""      (v.st = v.st || []).push([T.half((a + b) / 2) - SD.deck, T.half((a + b) / 2) - SD.cover, H.deck(cl((a + b) / 2))]);
    }
    v.endIn = T.end === 'aft' ? SD.stern : SD.bow;   // r354: the castle closes on the hull's own end, a wall a part's span stops short of
    v.sideFrom = SD.from; v.side = [SD.deck, SD.cover, v.endIn];   // r356""")

# the class default, and the reader of the record
rep("""const COVER_SIDE_M = 0.25;
""", """const COVER_SIDE_M = 0.25;
/* ⚠ THE SIDE IS THE SHIP'S OWN, WHERE HER RECORD GIVES IT (round 356). COVER_SIDE_M stood for every ship's side at
   every height. Steel's tables (1805; 1822 edition, Folios VI, VIII, XXXV and LI) give a 74's side layer by layer,
   and it is not one figure: at the upper deck it is the channel wale (5 in), the upper futtock (moulded 10 1/4 in at
   the upper deck) and the spirketting (5 in at its lower edge), 20 1/4 in in all (0.514 m); at the quarterdeck and
   forecastle it is the sheer strake (4 in), the top timber (moulded 7 in in the range of those decks) and the
   quickwork (3 in), 14 in (0.356 m). hull.side records atDeckM and atCoverM, and the ends: sternM, the counter
   timbers that frame the stern lights, and bowM. A part's span under a cover stops short of the inner face at each
   height, which the cover's per-station record (v.st) carries from the deck to the cover. A hull with no record
   keeps COVER_SIDE_M at every height, and its cover says so in sideFrom: 'class'. */
function coverSide(S) {
  const R = S.side;
  if (R && R.atDeckM > 0) {
    const cover = R.atCoverM > 0 ? R.atCoverM : R.atDeckM;
    return { deck: R.atDeckM, cover, stern: R.sternM > 0 ? R.sternM : cover, bow: R.bowM > 0 ? R.bowM : cover, from: 'record' };
  }
  return { deck: COVER_SIDE_M, cover: COVER_SIDE_M, stern: COVER_SIDE_M, bow: COVER_SIDE_M, from: 'class' };
}
""")

# islandCovers
rep("""  H = H || hullSurface(S);
  const L = S.lwl, railM = I.railM || 1.0, cl = u => Math.max(0, Math.min(1, u));""",
"""  H = H || hullSurface(S);
  const SD = coverSide(S);   // r356: the side's thickness at the deck and at the cover, recorded or the class default
  const L = S.lwl, railM = I.railM || 1.0, cl = u => Math.max(0, Math.min(1, u));""")
rep("""        (v.st = v.st || []).push([shellHalf(u, H.deck(cl(u))) - COVER_SIDE_M, shellHalf(u, top(u) - iRail) - COVER_SIDE_M, H.deck(cl(u))]);""",
"""        (v.st = v.st || []).push([shellHalf(u, H.deck(cl(u))) - SD.deck, shellHalf(u, top(u) - iRail) - SD.cover, H.deck(cl(u))]);""")
rep("""      v.endIn = ends.length === 2 ? 0 : COVER_SIDE_M;""",
"""      v.endIn = ends.length === 2 ? 0 : (w < 0 ? SD.stern : SD.bow);   // r356: the closed end is the stern (open forward) or the bow
      v.sideFrom = SD.from; v.side = [SD.deck, SD.cover, v.endIn];""")

# the deck material's record carries it, for the audit and the card
rep("""endLean: c.endLean || 0, from: c.from, name: c.name }));""",
"""endLean: c.endLean || 0, from: c.from, name: c.name, sideFrom: c.sideFrom || 'class', side: c.side || null }));""")

open(p, 'w').write(s)

# the record
vp = os.path.join(W, 'data', 'vessels.json')
raw = open(vp).read()
V = json.loads(raw)
vs = V['vessels']
sotl = [v for v in vs if v['id'] == 'ship-of-the-line'][0]
assert 'side' not in sotl['hull']
side = {
    "atDeckM": 0.514,
    "atCoverM": 0.356,
    "sternM": 0.25,
    "provenance": (
        "READ, r356, from Steel, The Elements and Practice of Naval Architecture (1805; the 1822 edition, "
        "archive.org elementspractice00stee, page scans at 2954-3013 x 3946 px, the 74-gun column of each table). "
        "AT THE UPPER DECK, 20 1/4 in (0.514 m): outside, the channel wale, 5 in thick (Folio VIII; its lower edge works "
        "down to the stops of the lower-deck ports, so the wale's 3 ft breadth spans the upper deck's height); the frame, "
        "the upper futtock moulded 10 1/4 in at the upper deck (Folio VI); inside, the upper deck's spirketting, 5 in at "
        "its lower edge (Folio XXXV). AT THE QUARTERDECK AND FORECASTLE, 14 in (0.356 m): outside, the sheer strake, 4 in "
        "(Folio VIII); the top timber moulded 7 in 'in the range of the Quarter Deck' and of the Forecastle (Folio VI); "
        "inside, the stuff between the ports or quickwork, 3 in (Folio XXXV). Steel tables no separate inside stuff for "
        "the quarterdeck, so the upper deck's quickwork is taken for it. THE STERN, 0.25 m: the right after counter "
        "timbers that form the stern lights, moulded 1 ft 1 in at their heels and 8 in at their heads (Folio LI); "
        "between the upper deck (39 ft 2 in over the rabbet of the keel, 3 ft 4 in under the lower balcony's "
        "breastrail at 42 ft 6 in) and the quarterdeck they are about 10 in, read on a straight taper between the lower "
        "counter (30 ft 9 in) and the taffrail (50 ft 6 in); that taper is an assumption, and Steel gives no plank for "
        "the stern. THE BOW at the forecastle takes the side's figure at the cover (the top timber in the range of the "
        "forecastle). Each figure is one 74 of Steel's tables, not read off Bellona or Asow."
    ),
}
i0 = raw.index('"id": "ship-of-the-line"')
i1 = raw.index('"islands":', i0)
assert raw.index('"id":', i0 + 10) > i1, 'islands key not inside the 74'
ls = raw.rfind('\n', 0, i1) + 1
ind = raw[ls:i1]
assert ind.strip() == ''
raw2 = raw[:i1] + '"side": ' + json.dumps(side, ensure_ascii=False) + ',\n' + ind + raw[i1:]
V2 = json.loads(raw2)
assert [v for v in V2['vessels'] if v['id'] == 'ship-of-the-line'][0]['hull']['side'] == side
open(vp, 'w').write(raw2)
print('ok')
