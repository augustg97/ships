#!/usr/bin/env python3
"""r165: the balcony wings run aft past the terrace floors - tierWings recorded.

The r161 read-3(a) residual (Research/QM2-PLATES.md): the side balcony wings
run aft PAST each terrace floor, so a terrace sits recessed between two
wings; the model ends the whole tier at one u. The 2016 aerial (plate 1)
shows the grammar at every level of the cascade and the wing tips were
measured this round (build/staging/r165/measure-wings.py, overlay-wings.png):
the enclosed wing structures are the multi-story blocks and galleries; the
longer lattice runs further aft read as deck-level balustrades, not wings,
and are NOT recorded.

The record: tierWings, keyed by tier index, each { aftU, depthM }:
  aftU   - the u the wing's tip reaches, aft of the tier's own recorded face
  depthM - the wing's inboard extent in metres from the deck edge

  2: aftU 0.971, depth 2.8  - the glazed gallery flanking the fantail
  4: aftU 0.883, depth 6.0  - the cabin block on the main-pool terrace
  5: aftU 0.883, depth 6.0  - its upper story (one tip, two tiers)
  7: aftU 0.840, depth 3.0  - the wing decks flanking the top terrace
"""
import json

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
assert S['houseAt'] == [0.079, 1.008], S['houseAt']
assert S['tierAftU'] == {'1': 1.008, '2': 0.959, '3': 0.934, '4': 0.869,
                         '5': 0.861, '6': 0.857, '7': 0.816, '8': 0.801}, S['tierAftU']
assert S['shellTiers'] == 2 and S['decks'] == 10
assert S['lwl'] == 318.2 and S['beam'] == 41.0
assert S['tierBands']['pitchM'] == 2.6
assert 'sternLivery' in S            # r164 stands; wings ride the same loft
assert 'tierWings' not in S, 'field already present; STOP'

WINGS = {
    '2': {'aftU': 0.971, 'depthM': 2.8},
    '4': {'aftU': 0.883, 'depthM': 6.0},
    '5': {'aftU': 0.883, 'depthM': 6.0},
    '7': {'aftU': 0.840, 'depthM': 3.0},
}

# every wing runs AFT of its own tier's recorded face...
aft = {int(k): v for k, v in S['tierAftU'].items()}
for k, w in WINGS.items():
    assert w['aftU'] > aft[int(k)] + 0.005, (k, w, aft[int(k)])
    assert 0 < w['depthM'] < S['beam'] / 2, (k, w)
# ...and stands on the roof below it: tier 2's wing on the fantail (t1 roof),
# t4's on the terrace (t3 roof), t5's on t4's own wing strip, t7's on t6's roof
assert WINGS['2']['aftU'] <= aft[1]
assert WINGS['4']['aftU'] <= aft[3]
assert WINGS['5']['aftU'] <= WINGS['4']['aftU']
assert WINGS['7']['aftU'] <= aft[6]

# ---- the change -------------------------------------------------------------
S['tierWings'] = dict(WINGS)
S['tierWings']['provenance'] = (
    'MEASURED off the 2016-10-01 aerial (Research/QM2-PLATES.md plate 1, '
    'read 3a; instrument build/staging/r165/measure-wings.py): the side '
    'balcony wings run aft past each terrace floor, so the terrace sits '
    'recessed between them. Wing tips in 2.6 m balcony bays aft of each '
    'tier\'s own recorded face, converted at 2.6/318.2 per bay: tier 4/5, '
    'the two-story cabin block on the main-pool terrace, 2.7 bays aft of the '
    'tier-5 face (port read, the starboard block corroborates), one tip for '
    'both stories, u 0.883; tier 7, the wing decks flanking the top terrace, '
    '3 bays (port and starboard reads disagree 2-5, split and capped by the '
    'tier-6 roof they stand on), u 0.840; tier 2, the glazed gallery '
    'flanking the fantail, 1.5 bays aft of the pavilion face to its stair, '
    'u 0.971. Every '
    'read +/-1 bay (u 0.008), tier 7 +/-2. depthM is the wing\'s inboard '
    'extent from the deck edge: the block reads ~6 m (one outboard cabin '
    'and balcony, +/-2 m), the fantail gallery ~2.8 m, the tier-7 wing '
    'decks ~3 m. The longer lattice-railed runs aft of the block are '
    'deck-level balustrades, not enclosed wings, and are not recorded. '
    'Wing tips are drawn with a one-bay chamfer at the inboard corner, the '
    'angled ends both plates show; the plates cannot adjudicate the exact '
    'cut, and the chamfer length is a drawing choice at plate resolution.')

tp = S['tierAftUProvenance']
OLD = ('Named residuals: balcony wings running aft past the terrace floors '
       'and curved terrace rails with fantail windscreen panels are still '
       'not drawn (r161 read 3).')
NEW = ('r165: the balcony wings are recorded (tierWings) and drawn. Named '
       'residual: curved terrace aft rails with the fantail windscreen '
       'panels are still not drawn (r161 read 3b).')
assert OLD in tp, 'tierAftUProvenance residual text not found'
S['tierAftUProvenance'] = tp.replace(OLD, NEW)

# ---- fleet untouched: every other vessel byte-identical ---------------------
before = json.loads(raw.decode('utf-8'))
for i, v in enumerate(data['vessels']):
    if v.get('id') != 'queen-mary-2':
        assert v == before['vessels'][i], v.get('id')

out = serialize(data)
assert out != raw
open(PATH, 'wb').write(out)
print('written; tierWings =',
      {k: (w['aftU'], w['depthM']) for k, w in WINGS.items()})
