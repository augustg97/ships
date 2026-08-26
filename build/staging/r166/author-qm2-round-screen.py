#!/usr/bin/env python3
"""r166: the jacuzzi step's aft rail curves, and the fantail rail is a glass
windscreen - tierRound and fantailScreen recorded. Closes r161 read 3(b).

The measuring round (build/staging/r166/measure-round.py, overlays
z-t2-marked.png / z-t7-marked.png) refined the r161 read: of the terrace aft
rails, exactly ONE curves in plan at the plate's own resolution - tier 7's,
the jacuzzi step sweeping between the r165 wing decks, sagitta 2.9 m. Tiers
2 and 3 MEASURE STRAIGHT against their corner chords (-0.1 m both; the r161
'curved' impression at tier 2 was the arch's fan roof, a roof form, not the
plan). Tiers 4-6 bunch within 4 m along-axis and tier 6's rail hides under
its own awnings - unresolved, not recorded. The fantail's deck edge has been
drawn curved since r163; what it lacked is the SCREEN: both plates read a
continuous translucent windscreen band under a dark top rail ringing the
sweep, not an open three-bar rail.

The record:
  tierRound, keyed by tier index: { sagittaM } - how far the tier's aft face
  bulges aft of the straight chord between its notch corners, at centreline.
  fantailScreen: { tier, hM, leanDeg } - which tier's exposed aft roof edge
  carries the screen, its height over the deck, its outward lean.
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
assert S['tierWings']['7'] == {'aftU': 0.840, 'depthM': 3.0}, S['tierWings']['7']
assert S['tierWings']['2'] == {'aftU': 0.971, 'depthM': 2.8}, S['tierWings']['2']
assert S['shellTiers'] == 2 and S['decks'] == 10
assert S['lwl'] == 318.2 and S['beam'] == 41.0
assert 'sternLivery' in S
assert 'tierRound' not in S and 'fantailScreen' not in S, 'field present; STOP'

ROUND = {'7': {'sagittaM': 2.9}}
SCREEN = {'tier': 1, 'hM': 1.2, 'leanDeg': 12}

# the arc's apex must stay forward of the tier's own wing chamfer: the bulge
# lives INSIDE the notch the r165 wings frame
bay = 2.6 / S['lwl']
apexU = S['tierAftU']['7'] + ROUND['7']['sagittaM'] / S['lwl']
assert apexU < S['tierWings']['7']['aftU'] - bay, (apexU, S['tierWings']['7'])
# and the screen's tier is a real tier with an exposed aft strip: tier 1 runs
# to the counter (1.008) and tier 2 above it starts back at its wing tip 0.971
assert S['tierAftU']['1'] > S['tierWings']['2']['aftU'] + 0.005
assert 0.9 <= SCREEN['hM'] <= 2.0 and 0 <= SCREEN['leanDeg'] <= 25

# ---- the change -------------------------------------------------------------
S['tierRound'] = dict(ROUND)
S['tierRound']['provenance'] = (
    'MEASURED off the 2016-10-01 aerial (Research/QM2-PLATES.md plate 1, '
    'read 3b; instrument build/staging/r166/measure-round.py, overlay '
    'z-t7-marked.png): the jacuzzi step\'s aft rail at tier 7 sweeps '
    'convex-aft between the r165 wing decks - apex 25 px aft of the chord '
    'through the notch corners at ~8.4 px/m along-axis, 2.9 m, +/-1.0 m '
    '(apex candidates spread 2.8-3.0 m; the image apex lands 60% along the '
    'chord, which is where an arc symmetric about the centreline lands seen '
    'obliquely). The SAME instrument reads tier 2 at -0.1 m and tier 3 at '
    '-0.1 m: those faces are STRAIGHT within the plate\'s support, and the '
    'r161 impression of curvature at tier 2 was the arch\'s fan ROOF, not '
    'the plan. Tiers 4-6 bunch within 4 m along-axis and tier 6\'s rail '
    'hides under its awnings - unresolved on this plate, not recorded. The '
    'fantail edge itself sweeps with the counter since r163.')
S['fantailScreen'] = dict(SCREEN)
S['fantailScreen']['provenance'] = (
    'READ off both era ends (Research/QM2-PLATES.md): the fantail rail is '
    'not an open rail but a continuous translucent WINDSCREEN band under a '
    'dark top rail, ringing the swept deck edge. Plate 3 (2011 Southampton '
    'astern, 3296 px) resolves panel posts, five horizontal framing lines '
    'and a person leaning with elbows on the top rail - the height witness: '
    '1.2 m over the deck, +/-0.2 (regulation floor 1.0 m). Plate 1 (2016 '
    'aerial) carries the same band around the sweep at both quarters. The '
    'panels lean OUTBOARD (r161 read, both plates); neither plate resolves '
    'the angle - 12 deg +/-8 is the drawn lean, an attested direction with '
    'a stated bound, not a measured quantity.')

tp = S['tierAftUProvenance']
OLD = ('r165: the balcony wings are recorded (tierWings) and drawn. Named '
       'residual: curved terrace aft rails with the fantail windscreen '
       'panels are still not drawn (r161 read 3b).')
NEW = ('r165: the balcony wings are recorded (tierWings) and drawn. r166: '
       'read 3b measured and closed - tier 7\'s aft rail curves (tierRound, '
       '2.9 m sagitta), tiers 2/3 measure straight, 4-6 unresolved at plate '
       'resolution, and the fantail windscreen is recorded (fantailScreen).')
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
print('written; tierRound =', ROUND, '; fantailScreen =', SCREEN)
