#!/usr/bin/env python3
"""r163: the QM2 stern shell reaches the counter - t1 and the house aft end to u 1.008.

The r162 named residual: the drawn stern stops at the t1 strake face 0.992,
about 5 m short of the fantail edge the plates put over the counter. The r162
bay chain, anchored at the kept crest foot t7 0.816, predicts that edge at
u 1.008 against the drawn counter extremity u 1.010 (closure within a bay),
and the 2011 Southampton astern plate (Research/QM2-PLATES.md plate 3, the
counter-and-fantail witness) reads the stern as ONE continuous rounded shell
from the counter to the fantail rail - no square cut, no ledge. The strake
face u 0.992 was the scale DRAWING's stern column, the same weak link r162
convicted for tiers 2-6.

  houseAt[1]      0.994 -> 1.008   (t0, the lower strake: same continuous face)
  tierAftU['1']   0.992 -> 1.008   (t1, the upper strake: the fantail edge)

Both tiers land on the measured fantail edge because the plate reads one
vertical face; the loft (hull.js linerHouse, this round) inverts the true
deck-edge x for any house pinned past u 1.0, so the plan sweeps home with the
counter instead of freezing at the u 0.999 clamp.
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
assert S['houseAt'] == [0.079, 0.994], S['houseAt']
assert S['tierAftU'] == {'1': 0.992, '2': 0.959, '3': 0.934, '4': 0.869,
                         '5': 0.861, '6': 0.857, '7': 0.816, '8': 0.801}, S['tierAftU']
assert S['lwl'] == 318.2 and S['loa'] == 345.0
assert S['sternRake'] == 0.01 and S['stemRake'] == 0.0739
assert S['decks'] == 10 and S['shellTiers'] == 2
assert 'tierAftUProvenance' in S
# the record's own stern tip: rakeScale = (loa-lwl)/((stemRake+sternRake)*loa)
rake_scale = (S['loa'] - S['lwl']) / ((S['stemRake'] + S['sternRake']) * S['loa'])
tip_u = 0.5 + (0.5 * S['lwl'] + S['sternRake'] * rake_scale * S['loa']) / S['lwl']
assert abs(tip_u - 1.0100) < 0.0005, tip_u   # the drawn counter extremity
assert 1.008 < tip_u, 'the pinned edge must stay inside the drawn counter'

# ---- the change -------------------------------------------------------------
S['houseAt'] = [0.079, 1.008]
S['tierAftU'] = dict(S['tierAftU'], **{'1': 1.008})

tp = S['tierAftUProvenance']
assert 'the drawn fantail stops at the t1 strake face 0.992' in tp
S['tierAftUProvenance'] = tp.replace(
    'Named residuals: the drawn fantail stops at the t1 strake face 0.992, '
    'about 5 m short of the real edge over the counter (stern shell loft, its '
    'own round); balcony wings',
    'r163: t1 and houseAt[1] moved to the chain-predicted fantail edge u 1.008 '
    '- the 2011 Southampton astern plate reads one continuous rounded shell '
    'from counter to fantail rail, and the strake face 0.992 was the scale '
    'drawing\'s stern column (the same weak link as tiers 2-6); the loft rides '
    'the counter for any pin past u 1.0. Named residuals: the black paint '
    'rising over the counter (the plate reads roughly one deck of white at the '
    'stern face where the model paints both strake tiers shellTopside white); '
    'balcony wings')
assert S['tierAftUProvenance'] != tp

hp = S['housePlateProvenance']
assert 'tierAftU 1 and 7-8' in hp
S['housePlateProvenance'] = hp.replace(
    'houseAt, houseCrest, tierForeU, tierAftU 1 and 7-8',
    'houseAt fore end, houseCrest, tierForeU, tierAftU 7-8'
) + (' r163: tierAftU 1 and the houseAt aft end re-measured to the counter '
     '(the fantail edge, u 1.008); see tierAftUProvenance.')
assert S['housePlateProvenance'] != hp

# ---- fleet untouched: every other vessel byte-identical ---------------------
before = json.loads(raw.decode('utf-8'))
for i, v in enumerate(data['vessels']):
    if v.get('id') != 'queen-mary-2':
        assert v == before['vessels'][i], v.get('id')

out = serialize(data)
assert out != raw
open(PATH, 'wb').write(out)
print('written; houseAt =', S['houseAt'], 'tierAftU.1 =', S['tierAftU']['1'])
