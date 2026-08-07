#!/usr/bin/env python3
"""One polar per vessel: rig shape x the vessel's own recorded scale.

Derivation and sources: Research/POLARS.md. Until round 47 the 25 vessels shared 8
curves and the card printed the record's speed over a curve that said otherwise
(steamer 12.25 kn over a 9.6 curve; Preussen 20.5 over 5.8 shared with the corbita).

The SHAPE (normalized angular response) is the rig's, taken from the pre-r47 per-rig
curves, hardcoded here so the derivation reruns from any state of vessels.json. The
SCALE (max8: knots at the best angle in the reference 8 m/s breeze) is the vessel's,
anchored to a figure from its own record. route.js scales sail curves by sqrt(wind/8)
saturating at 1.55x, so a burst record anchors max8 = record/1.55; engine curves are
not wind-scaled and ARE the at-sea passage speed.

Run:  python3 Research/polars.py     (rewrites web/data/vessels.json in place)
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), '..')
PATH = os.path.join(ROOT, 'web', 'data', 'vessels.json')

ANGLES = ['0', '30', '45', '60', '75', '90', '110', '120', '135', '150', '180']

# the pre-r47 shared curves: the rig's angular response, researched when the router
# was built. Kept verbatim; each is normalized by its own max below.
OLD = {
    'oars':   [3.4, 3.6, 3.9, 4.2, 4.4, 4.6, 4.8, 4.9, 4.8, 4.6, 4.4],
    'crab':   [2.2, 2.4, 2.9, 3.4, 3.6, 4.2, 4.8, 4.9, 4.6, 4.0, 3.2],
    'square': [1.0, 1.4, 2.2, 3.0, 3.9, 4.8, 5.6, 5.8, 5.5, 4.9, 4.2],
    'lateen': [1.4, 2.0, 2.9, 3.6, 4.1, 4.5, 4.7, 4.6, 4.2, 3.6, 2.9],
    'junk':   [1.6, 2.4, 3.3, 4.0, 4.4, 4.7, 4.9, 4.8, 4.5, 3.9, 3.2],
    'gaff':   [1.0, 2.2, 4.4, 6.0, 7.0, 7.8, 8.2, 8.0, 7.2, 6.2, 5.0],
    'engine': [9.0, 9.0, 9.2, 9.4, 9.5, 9.6, 9.6, 9.6, 9.5, 9.3, 9.0],
}

# vessel id -> (shape, max8, anchor). anchor.kn is the record figure the scale is
# anchored to; kind names what KIND of figure it is, because a burst, a day's run and
# a service speed are not the same quantity and must not be compared as if they were.
V = {
    'dugout':          ('oars', 4.2, {'kn': 3.0, 'kind': 'passage',
        'source': 'Kaifu\'s Sugime crossing 2019: 225 km in 45 h ≈ 3 kn; Haddon & Hornell, Canoes of Oceania, for the fair-wind sail'}),
    'voyaging-canoe':  ('crab', 6.0, {'kn': 4.2, 'kind': 'passage',
        'source': "Finney, Hōkūleʻa Hawaiʻi→Tahiti 1976: ~100 nm/day, best days near 7 kn"}),
    'trireme':         ('oars', 5.4, {'kn': 8.3, 'kind': 'burst',
        'source': 'Olympias Final Report: 8.3 kn "achieved only momentarily", cruise 5.4 under oar'}),
    'corbita':         ('square', 5.7, {'kn': 6.2, 'kind': 'passage',
        'source': 'Casson, Ships and Seamanship: Puteoli→Alexandria ~9 d fair; favorable runs 4.5–6 kn'}),
    'dhow':            ('lateen', 5.2, {'kn': 5.5, 'kind': 'passage',
        'source': "Villiers, Sons of Sindbad: monsoon day's runs ~130 nm"}),
    'junk':            ('junk', 4.9, {'kn': 5.0, 'kind': 'passage',
        'source': 'Worcester, Junks and Sampans of the Yangtze: coastal passages in a fair breeze'}),
    'treasure-ship':   ('junk', 4.3, {'kn': 2.5, 'kind': 'passage',
        'source': 'Dreyer, Zheng He: fleet legs made good ~2–3 kn in company',
        'note': 'sail area per displacement far below the coaster; capability above the fleet figure'}),
    'cog':             ('square', 5.2, {'kn': 8.0, 'kind': 'burst',
        'source': 'Bremen cog replica sail trials (Ubena von Bremen, Kieler Hansekogge)'}),
    'caravel':         ('lateen', 6.3, {'kn': 7.6, 'kind': 'passage',
        'source': "Columbus's 1492 Diario: best day's run ~182 nm in the trades"}),
    'carrack':         ('square', 5.6, {'kn': 4.5, 'kind': 'passage',
        'source': "Carreira da Índia passage studies: typical fair-wind day's runs"}),
    'fluyt':           ('square', 5.5, {'kn': 4.5, 'kind': 'passage',
        'source': 'Unger, Dutch Shipbuilding before 1800; under-canvassed per ton by design'}),
    'east-indiaman':   ('square', 5.8, {'kn': 4.6, 'kind': 'passage',
        'source': "DAS-era accounts; Solar & de Zwart: mean day's run ~110 nm",
        'note': "pinned: the front page's 119-day Lisbon→Batavia test is computed on this curve"}),
    'ship-of-the-line': ('square', 7.2, {'kn': 11.2, 'kind': 'burst',
        'source': 'Boudriot, The Seventy-Four Gun Ship; RN sailing-quality reports: a good 74 logged 11–12 kn'}),
    'slave-ship':      ('square', 6.2, {'kn': 9.6, 'kind': 'burst',
        'source': 'chase accounts of the suppression era: sharp-built brigs at 9–10 kn'}),
    'wyoming':         ('gaff', 8.7, {'kn': 13.5, 'kind': 'burst',
        'source': 'Parker, The Great Coal Schooners of New England'}),
    'preussen':        ('square', 13.2, {'kn': 20.5, 'kind': 'burst',
        'source': "her own record: 20.5 kn at her fastest; best day 426 nm = 17.75 kn sustained (1904)"}),
    'great-eastern':   ('engine', 12.0, {'kn': 12.0, 'kind': 'sea service',
        'source': 'trials 1859–60 ~14 kn full speed; Atlantic crossings averaged ~11'}),
    'titanic':         ('engine', 21.0, {'kn': 21.0, 'kind': 'sea service',
        'source': "British Wreck Commissioner's Inquiry; Olympic-class service records: 21–22 kn at sea"}),
    'usv':             ('engine', 4.0, {'kn': 4.0, 'kind': 'sea service',
        'source': 'Saildrone / wave-glider published figures: 3–5 kn under wind and solar',
        'note': 'contested as a service figure — her own card row says so'}),
    'clipper':         ('square', 11.3, {'kn': 17.5, 'kind': 'burst',
        'source': 'Lubbock, The Log of the Cutty Sark: 17.5 kn logged; 363 nm/24 h sustained'}),
    'steamer':         ('engine', 10.0, {'kn': 10.0, 'kind': 'sea service',
        'source': 'her own rows: Atlantic passages of the early screw era under 10 kn; trial 12.25 stands as speedKn'}),
    'dreadnought':     ('engine', 19.0, {'kn': 19.0, 'kind': 'sea service',
        'source': 'trials 21.05 kn (1907); Jutland battle-line steaming 17–20'}),
    'yamato':          ('engine', 25.5, {'kn': 25.5, 'kind': 'sea service',
        'source': 'trials 27.46 kn (1941) stand as speedKn; sustained sea speed below trial'}),
    'carrier':         ('engine', 30.0, {'kn': 30.0, 'kind': 'sea service',
        'source': 'US Navy published figure for the class: "30+ knots"'}),
    'container':       ('engine', 20.0, {'kn': 20.0, 'kind': 'sea service',
        'source': 'class design service 21–25 kn; slow-steamed 16–18 since 2008 (Notteboom & Cariou)'}),
}

# r48 (MODEL-GAPS B9): muscle is not a sail. route.js scales sail curves by sqrt(wind/8),
# so for as long as the paddlers' cruise sat inside a sail curve, a calm slowed the oars
# and a gale sped them. polar.floor is thrust the router never wind-scales, less
# lossKnPerMs per m/s of head component — the wind only ever stands AGAINST a paddled
# hull; the fair-wind help is already in the curve. Olympias gives the one measured pair
# (5.4 kn cruise, ~2.9 into a head sea at the 8 m/s reference → 0.31 kn per m/s); the
# dugout has no measured headwind figure, so she inherits the fractional windage (46% of
# floor at 8 m/s → 0.17), stated as an inference in her source line.
FLOOR = {
    'dugout':  {'kn': 3.0, 'lossKnPerMs': 0.17,
        'source': "Kaifu's Sugime crossing for the floor. No measured logboat headwind figure exists; the loss is Olympias's fractional windage (46% of floor at 8 m/s) carried over — an inference, stated as one"},
    'trireme': {'kn': 5.4, 'lossKnPerMs': 0.31,
        'source': "Olympias sea trials: 5.4 kn oar cruise; ~2.9 kn into a head sea at force 4–5, taken at the polar's 8 m/s reference — (5.4 − 2.9)/8"},
}

# r48, second face of the same fault: the two muscled hulls carried beat angles of 30/45 —
# tighter than a modern sloop — a compensator from before the floor existed, when impossible
# pointing was the only way an oared hull could make windward ground at all. With the floor
# doing the upwind work the pair became a printed falsehood ("closest made good under sail:
# 30°" on a fair-wind square rig). The sail's beat angles are now the RIG's, the same
# principle the r47 curves stand on: the trireme's single square sail takes the ancient-square
# class pair already researched for the corbita (80/95 made good — Olympias's sail trials
# found her windward ability poor, consistent with the class and nowhere near 30); the
# dugout's occasional mat sail (Haddon & Hornell) is a fair-wind rig that claims no windward
# ground at all — 90/105, abaft the beam only.
BEAT = {
    'dugout':  (90, 105),
    'trireme': (80, 95),
}


def main():
    doc = json.load(open(PATH))
    vessels = doc['vessels']
    assert len(vessels) == len(V), (len(vessels), len(V))
    print(f"{'vessel':18s} {'was':>5s} {'now':>5s}  change")
    for v in vessels:
        shape_name, max8, anchor = V[v['id']]
        old_curve = v['polar']['curve']
        old_max = max(old_curve.values())
        base = OLD[shape_name]
        peak = max(base)
        curve = {a: round(base[i] / peak * max8, 1) for i, a in enumerate(ANGLES)}
        v['polar']['curve'] = curve
        v['polar']['anchor'] = anchor
        # popped before set so a stale floor never survives on a vessel that lost one
        v['polar'].pop('floor', None)
        if v['id'] in FLOOR:
            v['polar']['floor'] = FLOOR[v['id']]
        if v['id'] in BEAT:
            v['polar']['beatLight'], v['polar']['beatHard'] = BEAT[v['id']]

        if v['id'] == 'great-eastern':
            # she was routed as a pure gaff schooner that could not sail within 55°
            # of the wind — a steamer with a 7.3 m screw and 17 m paddle wheels.
            v['polar']['beatLight'] = 0
            v['polar']['beatHard'] = 0
            v['polar']['rig'] = 'steam — paddle, screw and six masts'
            v['polar']['rigNote'] = ('Paddle and screw together, six masts of sail above ' +
                'them as insurance. The wind decides little; coal and the size of her ' +
                'bunkers decide everything, which was the design argument.')
            v['speedKn'] = 14.0
        if v['id'] == 'dugout':
            # she carried the trireme's whole rigNote — "8.3 kn sprint", Olympias's own
            # measurement — for as long as the two shared a paddling curve. Her record is
            # her own, and it is a crossing, not a sprint.
            # 'paddles' alone let the card deny the mat sail her own beat rows describe —
            # name the fair-wind rig, the way the trireme's line names her square sail.
            v['polar']['rig'] = 'paddles, with a mat sail for fair winds'
            v['polar']['rigNote'] = ('Paddled. The one measured figure is a crossing, not ' +
                'a sprint: a 7.6 m cedar dugout took 225 km of the Kuroshio, Taiwan to ' +
                'Yonaguni, in 45 hours — very close to 3 kn held for two days, and that ' +
                'is the paddling floor the router holds in any wind, including a calm. ' +
                'The rise off the wind is the fair-wind mat sail of the Pacific logboats ' +
                '(Haddon & Hornell), set only when the wind serves; no mast is drawn, ' +
                'and none is attested this early.')
        if v['id'] == 'trireme':
            # r48: the note stated the oar figures; now the router believes them too.
            v['polar']['rigNote'] = ('A galley goes where it likes and not far, and the ' +
                'figure above is her SAILING speed — the sail is for fair winds only. ' +
                'Under oar: 8.3 kn sprint, 5.4 kn cruise, and about 2.9 kn into a ' +
                'headwind with a metre of sea — measured on the reconstruction Olympias, ' +
                'which fell short of what the ancient sources imply and is thought to be ' +
                '~10% too short in the hull. The router holds the 5.4 as her oar floor ' +
                'in any wind, falling to the measured 2.9 dead upwind in a fresh breeze.')
        if v['id'] == 'carrier':
            # 'diesel motorship' was the shared engine-class label, invisible while the
            # card keyed 'no sail' off her mastless hull. Now the line prints, and a
            # Ford-class is nothing of the kind: two A1B reactors, steam to four shafts.
            v['polar']['rig'] = 'nuclear steam, four shafts'
        if v['id'] == 'usv':
            v['polar']['rig'] = 'wind, wave and solar'
            v['polar']['rigNote'] = ('Harvests its drive from wind, wave and sun — slow ' +
                'everywhere rather than fast somewhere. The design axis is endurance: ' +
                'months at sea, no one to feed.')

        new_max = max(curve.values())
        d = new_max - old_max
        cls = 'unchanged' if abs(d) < 0.05 else ('raised' if d > 0 else 'lowered')
        print(f"{v['id']:18s} {old_max:5.1f} {new_max:5.1f}  {cls} — anchor {anchor['kn']} kn ({anchor['kind']})")

    # the east-indiaman curve is pinned: the front page's falsification test rides on it
    ei = next(v for v in vessels if v['id'] == 'east-indiaman')
    assert ei['polar']['curve'] == {a: OLD['square'][i] for i, a in enumerate(ANGLES)}, \
        'east-indiaman curve moved — the 119-day front-page test just silently changed'

    # every vessel now has its own curve: no two byte-identical
    seen = {}
    for v in vessels:
        key = json.dumps(v['polar']['curve'], sort_keys=True)
        assert key not in seen, f"{v['id']} shares a curve with {seen.get(key)}"
        seen[key] = v['id']

    with open(PATH, 'w') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
    print('\nwrote', PATH)


if __name__ == '__main__':
    main()
