#!/usr/bin/env python3
"""r171 pre-edit simulation: the pierced sash-wall builder and the four rule arms,
run on the three ships' REAL surface numbers (stern-dims.json, dumped from the r170
page) under three builders: faithful, severed (the old 3-slab row), and a dragged
record ([3,3] -> [1,1] on the 74). Every arm's verdict is asserted BEFORE hull.js
is touched — the r170 discipline that caught the fixed-SEG coverage bug."""
import json, sys

dims = json.load(open('stern-dims.json'))

BAR = 0.045
def build_faithful(ship, d, panes=(3, 3), pierF=0.26, pitchT=1.25):
    B, fb = d['beam'], d['fb']
    wh = fb * 0.16
    tiers = []
    for t in d['tiers']:
        hw = t['half'] * 0.84
        N = max(3, min(7, round((2 * hw) / pitchT)))
        pitch = (2 * hw) / N
        lw = pitch * (1 - pierF)
        gh = wh * 0.80
        pc, pr = panes
        pw = (lw - (pc - 1) * BAR) / pc
        ph = (gh - (pr - 1) * BAR) / pr
        holes = [(pw, ph)] * (N * pc * pr)
        tiers.append({
            'frame': {'outerX': d['xF'] + B * 0.002 + B * 0.012, 'holes': holes},
            'glassOuterX': d['xF'] + B * 0.004 + 0.006,
            'N': N, 'pitch': pitch, 'lw': lw, 'pw': pw, 'ph': ph})
    return tiers

def build_severed(ship, d):
    """the old drawn row: solid slabs, glass proud, mullion prouder"""
    B = d['beam']
    return [{'frame': None,
             'woodOuterX': d['xF'] + 0.014 * B,     # the mullion face
             'slabOuterX': d['xF'] + 0.012 * B,     # the frame slab face
             'glassOuterX': d['xF'] + 0.013 * B}
            for _ in d['tiers']]

def rule(ship, tiers, rec_panes=(3, 3)):
    """returns list of (arm, detail) convictions"""
    out = []
    pcpr = rec_panes[0] * rec_panes[1]
    for k, t in enumerate(tiers):
        fr = t['frame']
        if fr is None or not fr['holes']:
            out.append(('V-PIERCED', f'tier {k}: a glazed tier with no aperture'))
            continue
        n = len(fr['holes'])
        if n % pcpr != 0 or not (3 <= n // pcpr <= 7):
            out.append(('V-GRID', f'tier {k}: {n} holes, record grid {rec_panes}'))
        if t['glassOuterX'] > fr['outerX'] - 0.005:
            out.append(('V-BEHIND',
                        f'tier {k}: glass {t["glassOuterX"]:.3f} not behind frame '
                        f'{fr["outerX"]:.3f}'))
        for (pw, ph) in fr['holes']:
            if pw > 0.45 or ph > 0.45:
                out.append(('V-COUNTER',
                            f'tier {k}: an aperture {pw:.2f} x {ph:.2f} m — a pane '
                            'nobody could cast'))
                break
    return out

fails = 0
def check(name, cond, msg=''):
    global fails
    print(('  OK   ' if cond else '  FAIL ') + name + (' — ' + msg if msg else ''))
    if not cond: fails += 1

print('── faithful builder, every ship: all four arms silent, geometry sane')
for ship, d in dims.items():
    tiers = build_faithful(ship, d)
    conv = rule(ship, tiers)
    check(f'{ship} silent', not conv, str(conv))
    for t in tiers:
        check(f'{ship} pane positive', t['pw'] > 0.08 and t['ph'] > 0.08,
              f"pw {t['pw']:.3f} ph {t['ph']:.3f}")
        check(f'{ship} pane castable', t['pw'] <= 0.45 and t['ph'] <= 0.45,
              f"pw {t['pw']:.3f} ph {t['ph']:.3f}")
        check(f'{ship} glass margin', t['frame']['outerX'] - t['glassOuterX'] > 0.02,
              f"{t['frame']['outerX'] - t['glassOuterX']:.3f}")
        print(f"    {ship}: N {t['N']} pitch {t['pitch']:.2f} light {t['lw']:.2f} "
              f"pane {t['pw']:.2f}x{t['ph']:.2f}")

print('── severed builder (the old slab row): V-PIERCED convicts every tier, and the')
print('   old glass really is proud of its slab (the arithmetic the judgment names)')
for ship, d in dims.items():
    tiers = build_severed(ship, d)
    conv = rule(ship, tiers)
    check(f'{ship} convicted', bool(conv) and all(a == 'V-PIERCED' for a, _ in conv),
          str(conv))
    for t in tiers:
        check(f'{ship} glass proud of slab', t['glassOuterX'] > t['slabOuterX'],
              f"glass {t['glassOuterX']:.3f} slab {t['slabOuterX']:.3f}")

print('── dragged record on the 74 alone: panes [3,3] -> [1,1], faithful builder —')
print('   only record-blind V-COUNTER convicts, and only the 74')
for ship, d in dims.items():
    panes = (1, 1) if ship == 'ship-of-the-line' else (3, 3)
    tiers = build_faithful(ship, d, panes=panes)
    conv = rule(ship, tiers, rec_panes=panes)
    if ship == 'ship-of-the-line':
        check(f'{ship} V-COUNTER only',
              bool(conv) and all(a == 'V-COUNTER' for a, _ in conv), str(conv))
    else:
        check(f'{ship} silent', not conv, str(conv))

print(f'\n{fails} failures')
sys.exit(1 if fails else 0)
