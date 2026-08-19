#!/usr/bin/env python3
"""Round 121: steering becomes a fact of the record.

Adds hull.steering to all 33 vessels — paddle | quarter | median | stern | steel —
plus steeringProvenance on the five ships whose drawn steering changes, and a
Steering card row on the four whose cards did not already carry one.

Run AFTER the opening ratchet pass completes (web/data is live to the harness).
"""
import json, sys

PATH = 'web/data/vessels.json'

STEERING = {
    'dugout': 'paddle', 'voyaging-canoe': 'paddle',
    'trireme': 'quarter', 'corbita': 'quarter', 'dhow': 'quarter',
    'junk': 'median', 'treasure-ship': 'median', 'panokseon': 'median',
    'cog': 'stern', 'caravel': 'stern', 'carrack': 'stern', 'galley': 'stern',
    'galleass': 'stern', 'sekibune': 'stern', 'fluyt': 'stern',
    'east-indiaman': 'stern', 'ship-of-the-line': 'stern', 'slave-ship': 'stern',
    'wyoming': 'stern', 'clipper': 'stern', 'endurance': 'stern',
    'preussen': 'steel', 'great-eastern': 'steel', 'titanic': 'steel',
    'usv': 'steel', 'steamer': 'steel', 'dreadnought': 'steel', 'yamato': 'steel',
    'carrier': 'steel', 'container': 'steel', 'ever-given': 'steel',
    'azzam': 'steel', 'queen-mary-2': 'steel',
}

PROVENANCE = {
    'dugout':
        'Steering is ATTESTED as a negative: the one measured performance row is a paddled '
        'crossing (Kaifu’s Sugime, Taiwan→Yonaguni, 2019), the polar’s own note reads '
        '“Paddled”, and nothing hung on the hull is attested anywhere this early. The '
        'paddle is crew gear, no crew is drawn, so the hull mounts nothing.',
    'voyaging-canoe':
        'ATTESTED by her own card row — “Steering: a long paddle, not a rudder” '
        '(Hōkūleʻa; Finney 1977, Polynesian Voyaging Society logs). The steering sweep '
        'is handled by the steersman over the quarter, not hung on the hull; no crew is drawn, '
        'so nothing is mounted. Before round 121 the model hung a pintled stern rudder on EACH hull.',
    'trireme':
        'A pair of pēdalia, one over each quarter, is the attested steering of the type: '
        'Morrison, Coates & Rankov, The Athenian Trireme, and the reconstruction Olympias, whose '
        'helmsman works both looms from one seat. DERIVED here in size: blade and loom are scaled '
        'off the hull’s own draught and beam, no ancient steering oar surviving to measure.',
    'corbita':
        'Roman seagoing ships steer with a pair of great quarter rudders — the Sidon and '
        'Portus reliefs and the Ostia mosaics draw them, and no Roman wreck or image shows a '
        'sternpost rudder (Casson, Ships and Seamanship in the Ancient World). DERIVED in size '
        'from the hull; the reliefs are profile carvings with no usable scale.',
    'dhow':
        'Her own construction row — coir stitching, no iron — refuses the pintle-and-'
        'gudgeon fitting the model hung before round 121: a pintle is an iron hinge. The Belitung '
        'hull (this card’s own row, c. AD 830) is reconstructed with twin lashed quarter '
        'rudders (Jewel of Muscat, 2010). The stern-hung rudder belongs to the ocean’s later '
        'big types — baghlah, ghanjah — whose rows here are burden figures, not fittings; '
        'the drawn ship is the sewn early type.',
}

ROWS = {
    'dugout': ['Steering', 'the paddle itself — nothing is hung on the hull'],
    'trireme': ['Steering, as drawn',
                'two pēdalia, one over each quarter — the pair Olympias steers with'],
    'corbita': ['Steering, as drawn',
                'a pair of great quarter rudders — the Sidon and Portus reliefs draw them; '
                'no Roman ship shows a sternpost rudder'],
    'dhow': ['Steering, as drawn',
             'twin lashed quarter rudders, as the Belitung hull is reconstructed — a sewn '
             'ship has no iron to hang a pintle on'],
}

def main():
    d = json.load(open(PATH))
    vs = d['vessels'] if isinstance(d, dict) and 'vessels' in d else d
    seen = set()
    for v in vs:
        vid = v['id']
        if vid not in STEERING:
            print(f'UNMAPPED vessel {vid} — refusing to write', file=sys.stderr)
            return 1
        v['hull']['steering'] = STEERING[vid]
        seen.add(vid)
        if vid in PROVENANCE:
            v['hull']['steeringProvenance'] = PROVENANCE[vid]
        if vid in ROWS and not any(r[0].startswith('Steering') for r in v.get('rows', [])):
            v['rows'].append(ROWS[vid])
    missing = set(STEERING) - seen
    if missing:
        print(f'vessels in map but not in file: {missing}', file=sys.stderr)
        return 1
    json.dump(d, open(PATH, 'w'), ensure_ascii=False, indent=1)
    print(f'wrote steering for {len(seen)} vessels')
    return 0

if __name__ == '__main__':
    sys.exit(main())
