#!/usr/bin/env python3
"""r162: Queen Mary 2 tierAftU 2..6 re-derived off the pinned aft-quarter plates.

The r132 residual: seven near-equal drawn steps, deepest near the top, off the
Commons scale DRAWING. The plates (Research/QM2-PLATES.md) read five terraces
with the deep ones low and mid. This writes the measured cascade:

  tier   old     new    terrace on its roof (depth in 2.6 m bays)
  t2    0.984   0.959   fantail A: 6 bays measured tip->pavilion; drawn from
                        the t1 strake face, counter-sweep residual stated
  t3    0.959   0.934   cafe step B: 3 bays
  t4    0.922   0.869   main-pool terrace C: 8 bays (the second-deep one)
  t5    0.861   0.861   awning step D: 1 bay   (unchanged by coincidence)
  t6    0.839   0.857   inter-row strip: half a bay; top step E above: 5 bays
                        AS BUILT (open terrace, record year 2003; the 2016
                        refit cabin front would take about one bay of it)
  t7,t8,t9 kept 0.816 / 0.801 / 0.794 (crest block, not the residual's target)
  t1 kept 0.992 (shell strake face; the real fantail edge reads u~1.008 over
                 the counter - the 5 m shortfall is a named stern-loft residual)

Chain anchored at t7 = 0.816 and closed at the counter: predicted fantail edge
u 1.008 vs the drawn counter extremity 162.3 m (u 1.010) - closes within a bay.
"""
import json, sys

PATH = 'web/data/vessels.json'

# ---- prove the serializer is byte-stable BEFORE touching anything ----------
raw = open(PATH, 'rb').read()
data = json.loads(raw.decode('utf-8'))

def serialize(d):
    return json.dumps(d, ensure_ascii=False, indent=1).encode('utf-8')

assert serialize(data) == raw, 'serializer not byte-stable; STOP'

# ---- locate the one record --------------------------------------------------
qm2 = None
for v in data['vessels']:
    if v.get('id') == 'queen-mary-2':
        qm2 = v
assert qm2 is not None, 'queen-mary-2 not found'
S = qm2['hull']

# ---- assert the priors are exactly what this change was derived against ----
old = S['tierAftU']
assert old == {'1': 0.992, '2': 0.984, '3': 0.959, '4': 0.922,
               '5': 0.861, '6': 0.839, '7': 0.816, '8': 0.801}, old
assert S['houseCrest'] == [0.114, 0.794], S['houseCrest']
assert S['lwl'] == 318.2 and S['loa'] == 345.0
assert S['decks'] == 10 and S['deckM'] == 2.95 and S['shellTiers'] == 2
assert S['tierBands']['pitchM'] == 2.6, S['tierBands']
assert 'tierAftUProvenance' not in S

# ---- the change -------------------------------------------------------------
S['tierAftU'] = {'1': 0.992, '2': 0.959, '3': 0.934, '4': 0.869,
                 '5': 0.861, '6': 0.857, '7': 0.816, '8': 0.801}
S['tierAftUProvenance'] = (
    'TIERS 2-6 MEASURED off the aft-quarter plates (Research/QM2-PLATES.md), '
    'replacing the r97 scale-drawing spans the r132 residual convicted: the '
    'drawing dealt seven near-equal steps with the deepest near the top, the '
    'photographs read five terraces with the deep ones low and mid. Method: '
    'each terrace depth counted in 2.6 m tierBands balcony bays on the 2016-10-01 '
    'aerial (CC BY-SA 4.0, 3888 px; every gap measured between deck edges at the '
    'SAME height so the one-story parallax cancels), chained downward from the '
    'kept crest foot t7 0.816: fantail 6 bays, cafe step 3, main-pool terrace 8, '
    'awning step 1, inter-row strip half, top step 5 bays AS BUILT - the record '
    'year is 2003 and the 2004-07-20 Hamburg pair reads the open top step about '
    'a bay deeper than the 2016 frame, whose refit cabin front took that bay '
    '(only the top step changed in the 2016 remastering). Integer bay counts, '
    'error a half-bay per edge (1.3 m, u 0.004). Chain closure: the predicted '
    'fantail edge lands at u 1.008 against the drawn counter extremity u 1.010. '
    'Crest block t7-t9 kept from the r97 profile (not this residual). Named '
    'residuals: the drawn fantail stops at the t1 strake face 0.992, about 5 m '
    'short of the real edge over the counter (stern shell loft, its own round); '
    'balcony wings running aft past the terrace floors and curved terrace rails '
    'with fantail windscreen panels are still not drawn (r161 read 3).')

# amend the drawing-derivation claim so no reader takes tierAftU from it
hp = S['housePlateProvenance']
assert hp.startswith('MEASURED off the scale profile'), hp[:40]
assert 'tierAftU' in hp
S['housePlateProvenance'] = hp.replace(
    'houseAt, houseCrest, tierForeU, tierAftU, the funnel station',
    'houseAt, houseCrest, tierForeU, tierAftU 1 and 7-8, the funnel station'
) + (' r162: tierAftU 2-6 re-measured off the aft-quarter photographs; see '
     'tierAftUProvenance.')
assert S['housePlateProvenance'] != hp

# ---- fleet untouched: every other vessel byte-identical ---------------------
before = json.loads(raw.decode('utf-8'))
for i, v in enumerate(data['vessels']):
    if v.get('id') != 'queen-mary-2':
        assert v == before['vessels'][i], v.get('id')

out = serialize(data)
# the only changed bytes sit inside the queen-mary-2 record
assert out != raw
open(PATH, 'wb').write(out)
print('written; tierAftU =', S['tierAftU'])
