"""r322 (0y164): the masts of the East Indiaman and the slave ship, read off Vasa's rig diagram as shares of the distance
between the fore and mizzen masts' feet. The fluyt's three masts keep Steel's shares and say why."""
import json, sys
P = sys.argv[1]; PROBE = json.load(open(sys.argv[2]))
v = json.load(open(P))
L = v if isinstance(v, list) else v.get('vessels', v)
FEET = {'fore': [1149.6, 1005], 'main': [655.6, 1012], 'mizzen': [323.7, 944]}
ROWS = {'fore': {'top': 683, 'crosstrees': 330, 'truck': 220, 'staff': 158},
        'main': {'top': 682, 'crosstrees': 298, 'truck': 132, 'staff': 50},
        'mizzen': {'top': 700, 'crosstrees': 459, 'staff': 366}}
SPAN = FEET['fore'][0] - FEET['mizzen'][0]          # 825.9 px
def shares(m):
    f = FEET[m][1]
    return {k: round((f - r) / SPAN, 4) for k, r in ROWS[m].items()}
PLATE = ('Hocker, F. (ed.), Vasa II: Rigging and Sailing a Swedish Warship of 1628 (Vasamuseet / Nordic Academic Press, 2023), '
         'p. 31, the rig diagram, as Wikimedia Commons File:Vasa_rig_diagram.jpg (1920 px thumbnail, build/staging/r320/dl/vasa-rig.jpg, '
         'about 24 px/m on Vasa\'s hull)')
NAMES = {'fore': 'foremast', 'main': 'mainmast', 'mizzen': 'mizzen'}
def prov(m, sh, MH, sp, yr):
    what = (f"the top {MH['top']} m, the topmast's head (cap) {MH['crosstrees']} m and the truck {MH['truck']} m over the foot of the mast"
            if m != 'mizzen' else
            f"the top {MH['top']} m and the topmast's head (cap) {MH['crosstrees']} m over the foot of the mast")
    s = (f"READ, r322 (0y¹⁶⁴): {what}. These are Vasa's {NAMES[m]} heights as shares of the distance between her fore and mizzen "
         f"masts' feet ({sh['top']}, {sh['crosstrees']}" + (f", {sh['truck']}" if m != 'mizzen' else '') +
         f"), times that distance on this hull's built masts ({sp} m). Read off " + PLATE + ": the fore and mizzen masts meet the hull at "
         f"columns 1149.6 and 323.7, 825.9 px apart; this mast meets it at row {FEET[m][1]}; the top platform is centred on row {ROWS[m]['top']}, "
         f"the cap of the topmast's head on row {ROWS[m]['crosstrees']}")
    if m != 'mizzen': s += (f", and the cap of the topgallant mast's head on row {ROWS[m]['truck']}. Above that cap Vasa's {NAMES[m]} carries "
                            f"a bare staff to row {ROWS[m]['staff']} ({sh['staff']}); no sail is set on it and it is not built")
    else: s += (f". Above the cap Vasa's mizzen carries a bare staff to row {ROWS[m]['staff']} ({sh['staff']}); no sail is set on it "
                "and it is not built (the mast is built in two pieces, `only` 2)")
    s += (". Each row is read to 3 px, which is 0.004 of the span. The heights are keyed to the masts' feet, the same datum as the "
          "mizzen lateen yard (r321), because the stations are a hull datum the builder carries. CONTESTED datum: keyed to the hull's "
          "length overall instead (taffrail to beakhead, 1447 px on the plate), the heights come out 0.86-0.88 of these. Until r322 the "
          "mast was Steel's 1794 proportions (lower mast a share of Steel's main, topmast 0.60, topgallant 0.50), a rule for warships "
          f"170 years later. This hull is dated {yr} and has no plate of its own; the read is Vasa's (1628), applied to it.")
    return s
FLUYT = ('CLASS, r322 (0y¹⁶⁴): Steel\'s 1794 shares (lower mast a share of Steel\'s main, topmast 0.60, topgallant 0.50). The East '
         'Indiaman and the slave ship take Vasa\'s mast heights off Hocker\'s rig diagram (Vasa II, 2023, p. 31). The fluyt does not yet, '
         'because her mizzen is one lateen pole with no topsail and Vasa\'s mizzen is two pieces with a topsail: which of Vasa\'s two '
         'heights her pole should take depends on whether she set a mizzen topsail, which is open as (0y¹⁶³). Her three masts wait on it together.')
YR = {'east-indiaman': '1620', 'slave-ship': '1590'}
n = 0
for x in L:
    i = x.get('id')
    if i == 'fluyt':
        for mk in x['hull']['masts']:
            assert 'mastHeightsM' not in mk; mk['mastHeightsProvenance'] = FLUYT; n += 1
        continue
    if i not in YR: continue
    ms = x['hull']['masts']; pm = PROBE[i]['masts']
    sp = round(pm[2]['footX'] - pm[0]['footX'], 3)
    for mi, m in enumerate(('fore', 'main', 'mizzen')):
        mk = ms[mi]
        assert mk['rig'] == 'square' and 'mastHeightsM' not in mk
        assert mk.get('only') == (2 if m == 'mizzen' else 3), (i, m)
        sh = shares(m)
        MH = {'top': round(sh['top'] * sp, 2), 'crosstrees': round(sh['crosstrees'] * sp, 2)}
        if m != 'mizzen': MH['truck'] = round(sh['truck'] * sp, 2)
        mk['mastHeightsM'] = MH
        mk['mastHeightsRead'] = {'ofForeMizzenSpacing': {k: sh[k] for k in ('top', 'crosstrees', 'truck') if k in sh and (m != 'mizzen' or k != 'truck')},
                                 'spacingM': sp, 'rows': ROWS[m], 'foot': FEET[m], 'feetPx': [FEET['fore'][0], FEET['mizzen'][0]],
                                 'boundOfSpacing': 0.004, 'staffOfSpacing': sh['staff'], 'boundM': 0.05,
                                 'plate': 'build/staging/r320/dl/vasa-rig.jpg (Hocker 2023 p. 31)', 'script': 'build/staging/r322/r322_read.py, r322_record.py'}
        mk['mastHeightsProvenance'] = prov(m, sh, MH, sp, YR[i])
        n += 1
        print(i, m, MH)
assert n == 9, n
open(P, 'w').write(json.dumps(v, indent=2, ensure_ascii=False) + '\n')
print('ok', n)
