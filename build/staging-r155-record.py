#!/usr/bin/env python3
"""r155 — Preussen's mast record states what the source states: the flag-button.

Replaces the five heightM guesses (27/30/30/29/25 — the model's own taper, no
source) with the record's own figures: truckM 58.0 on every mast (de.wikipedia
infobox, 'Masthöhe: 68 m (Kiel-Flaggenknopf), 58 m (Deck-Flaggenknopf)' — one
figure for all five, the Standardrigg's interchangeable spars) and
courseYardM 32.0 ('Länge Großrah: 32 m (!); Royalrah: 16 m' — and 16/32 is
exactly the royal's 0.50 plan share, the record confirming the fractions).
Adds mastProvenance saying which numbers are attested and which derived, and a
card row carrying the figures. Idempotent."""
import json, sys

P = '/Users/augustgweon/Ships/web/data/vessels.json'
d = json.load(open(P))
vs = d['vessels'] if isinstance(d, dict) and 'vessels' in d else d
ship = next(s for s in vs if s['id'] == 'preussen')
h = ship['hull']

for mk in h['masts']:
    mk.pop('heightM', None)
    mk['truckM'] = 58.0
    mk['courseYardM'] = 32.0

h['mastProvenance'] = (
    'Deck-to-truck 58 m and keel-to-truck 68 m are ATTESTED (de.wikipedia '
    'Preußen (Schiff, 1902) infobox: "Masthöhe: 68 m (Kiel-Flaggenknopf), '
    '58 m (Deck-Flaggenknopf)") — one figure for all five masts, because the '
    'Laeisz Standardrigg cut interchangeable spars; lower masts and topmasts '
    'were one steel tube, only the topgallant stenge fids above. Course yard '
    '32 m and royal 16 m attested in the same source ("Länge Großrah: 32 m; '
    'Royalrah: 16 m") — the royal\'s 0.50 share of the course is the drawn '
    'plan\'s own fraction, an independent cross-check. The lower-mast lengths '
    'behind the drawn stack are DERIVED from truckM in hull.js; no lower-mast '
    'length is attested in reach. A per-mast spar table (Hamecher 1993) would '
    'beat the single figure if it surfaces.')

row = ['Masts',
       '58 m deck to truck (68 m from the keel), one figure for all five — '
       'the standard rig cut interchangeable spars. Main course yard 32 m, '
       'royal 16 m.']
rows = ship['rows']
for i, r in enumerate(rows):
    if r[0] == 'Masts':
        rows[i] = row
        break
else:
    rows.insert(next(i for i, r in enumerate(rows) if r[0] == 'Rig') + 1, row)

json.dump(d, open(P, 'w'), ensure_ascii=False, indent=1)
print('preussen masts:', json.dumps(h['masts'][0]), '... x5')
print('rows now:', [r[0] for r in rows])
