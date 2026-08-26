#!/usr/bin/env python3
"""r164 injection (b): drag the sternLivery record to claims the ship cannot carry.

strakes 1 -> 3 (the shell has 2) and fromU 0.93 -> 1.02 (aft of the house's own
aft extremity is impossible for a knee that must sit forward of the rise's top).
The audit's arithmetic arm must convict EXACTLY queen-mary-2, two problems, with
the scene arm's strip still standing (the builder clamps, so the strip itself
stays legal — the RECORD is what lies here). Run, audit, then restore.
"""
import json, sys

PATH = 'web/data/vessels.json'
raw = open(PATH, 'rb').read()
data = json.loads(raw.decode('utf-8'))

def serialize(d):
    return json.dumps(d, ensure_ascii=False, indent=1).encode('utf-8')

assert serialize(data) == raw, 'serializer not byte-stable; STOP'

qm2 = [v for v in data['vessels'] if v.get('id') == 'queen-mary-2'][0]
S = qm2['hull']

if sys.argv[1:] == ['restore']:
    assert S['sternLivery']['strakes'] == 3 and S['sternLivery']['fromU'] == 1.02
    S['sternLivery']['strakes'] = 1
    S['sternLivery']['fromU'] = 0.93
else:
    assert S['sternLivery']['strakes'] == 1 and S['sternLivery']['fromU'] == 0.93
    S['sternLivery']['strakes'] = 3
    S['sternLivery']['fromU'] = 1.02

open(PATH, 'wb').write(serialize(data))
print('sternLivery now', S['sternLivery']['strakes'], S['sternLivery']['fromU'])
