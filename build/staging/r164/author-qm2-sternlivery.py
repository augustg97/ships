#!/usr/bin/env python3
"""r164: the black paint rises over the counter - sternLivery recorded.

The r163 named residual: the 2011 Southampton astern plate (Research/
QM2-PLATES.md plate 3) reads the hull black rising over the counter so that
roughly ONE deck of white shows at the stern face - the name is painted on
black, the oval-row strake above it is the only white band below the fantail
rail - while the model paints both strake tiers shellTopside white all the
way around the sweep. The 2016 aerial (plate 1) and the 2004 Hamburg pair
(plate 2) read the same grammar at both ends of the era: the boundary leaves
the level 17 m sheer at the stern quarter and sweeps up around the round.

The record takes the SEMANTIC quantity the plates actually give - how many
of the white shell strakes the risen black swallows at the stern face - not
a metre height that could drift from the model's own floors:

  sternLivery: { strakes: 1, fromU: 0.93 }

strakes: the black covers the LOWEST 1 of the 2 shellTiers at the stern
face, so shellTiers - strakes = one deck of white shows (plate 3, ~16 px/m
at the stern face: the white band is one deck, +/- a quarter deck).
fromU: the knee where the line leaves the level sheer, read off the 2016
aerial at ~29 m forward of the drawn tip (the fantail's own 15.6 m span
scales the quarter at ~18.5 px/m along-axis), a couple of bays forward of
the fantail front 0.959; the oblique projection supports it to +/- 2 bays
(u +/- 0.016).
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
assert S['freeboard'] == 17.0 and S['deckM'] == 2.95
assert S['topside'] == '#1d1d1f' and S['shellTopside'] == '#e9e7df'
assert 'sternLivery' not in S, 'field already present; STOP'
# the pinned aft extremity the rise runs to, and the knee stays inside the house
assert 0.93 < 1.008 and 0.93 > S['houseAt'][0]
# the knee sits forward of the fantail front the rise wraps
assert 0.93 < S['tierAftU']['2'] == 0.959

# ---- the change -------------------------------------------------------------
S['sternLivery'] = {
    'strakes': 1,
    'fromU': 0.93,
    'provenance':
        'MEASURED off the aft-quarter plates (Research/QM2-PLATES.md). At the '
        'stern face the hull black rises over the counter to the foot of the '
        'oval-row strake: plate 3 (2011 Southampton astern, 3296 px) reads ONE '
        'deck of white below the fantail rail, the name painted on black, and '
        'plates 1 (2016 aerial) and 2 (2004 Hamburg, as built) read the same '
        'at both ends of the era - so the black swallows the lowest 1 of the '
        '2 white shell strakes (strakes), good to a quarter deck. fromU 0.93 '
        'is the knee where the line leaves the level 17 m sheer: ~29 m forward '
        'of the drawn tip on the 2016 aerial (the fantail\'s own 15.6 m span '
        'scales the quarter at ~18.5 px/m along-axis), a couple of bays '
        'forward of the fantail front 0.959, supported to +/- 2 bays '
        '(u +/- 0.016). The line is drawn straight in u from the sheer at '
        'fromU to the strake boundary at the stern extremity - the plates '
        'cannot adjudicate its exact curve - and the risen black is drawn '
        'unpierced: the plates show only sparse small lights in it.'
}

tp = S['tierAftUProvenance']
assert 'Named residuals: the black paint rising over the counter' in tp
S['tierAftUProvenance'] = tp.replace(
    'Named residuals: the black paint rising over the counter (the plate '
    'reads roughly one deck of white at the stern face where the model '
    'paints both strake tiers shellTopside white); balcony wings',
    'r164: the black paint rise is recorded (sternLivery) and drawn. Named '
    'residuals: balcony wings')
assert S['tierAftUProvenance'] != tp, 'tierAftUProvenance residual text not found'

# ---- fleet untouched: every other vessel byte-identical ---------------------
before = json.loads(raw.decode('utf-8'))
for i, v in enumerate(data['vessels']):
    if v.get('id') != 'queen-mary-2':
        assert v == before['vessels'][i], v.get('id')

out = serialize(data)
assert out != raw
open(PATH, 'wb').write(out)
print('written; sternLivery =', S['sternLivery']['strakes'], 'strake(s), fromU',
      S['sternLivery']['fromU'])
