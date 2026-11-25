"""r321 (0y158): the mizzen lateen yard of the fluyt, the East Indiaman and the slave ship, read off Vasa's rig diagram.
The carrack keeps the class figures and says so."""
import json, sys
P = sys.argv[1]
v = json.load(open(P))
L = v if isinstance(v, list) else v.get('vessels', v)
rows = {'mastFoot': 944, 'top': 700, 'peak': [112, 599], 'heel': [500, 950], 'crossing': [300, 769]}
D = 244.0
READ = {'yardOfDeckToTop': 2.143, 'angleDeg': 42.1, 'heelAheadOfDeckToTop': 0.723, 'slingOfDeckToTop': 0.717,
        'slingFromHeelOfYard': 0.516, 'topAtOfLower': 0.9, 'boundPm': 0.03, 'boundAngleDeg': 1.0, 'spanPx': 244,
        'rows': rows, 'plateRakeDeg': 7.8,
        'plate': 'build/staging/r320/dl/vasa-rig.jpg (1920 px thumbnail of Commons File:Vasa_rig_diagram.jpg, Hocker 2023 p. 31)',
        'script': 'build/staging/r321/r321_read.py'}
PLATE = ('Hocker, F. (ed.), Vasa II: Rigging and Sailing a Swedish Warship of 1628 (Vasamuseet / Nordic Academic Press, 2023), '
         'p. 31, the rig diagram, as Wikimedia Commons File:Vasa_rig_diagram.jpg (1920 px thumbnail, build/staging/r320/dl/vasa-rig.jpg, '
         'about 24 px/m on Vasa\'s 61 m hull)')
YARD = ('PLATE READ, r321 (0y¹⁵⁸): the mizzen lateen yard is 2.143 times the height from the deck to the mizzen top, '
        'lies at 42.1° from the horizontal, has its heel on the deck 0.723 of that height before the mast, and crosses the mast at '
        '0.717 of it, 0.516 of the yard\'s length from the heel. Read off ' + PLATE + ': the yard\'s brown line was fitted on 346 '
        'columns (slope 0.904, rms 1.3 px); its peak is at column 112 row 599 over the taffrail, where the spar tapers to a grey hairline, '
        'and its heel at column 500 row 950 on the hull\'s upper edge; the mast meets the hull at row 944 and its top is centred on row 700, '
        'so the deck-to-top span is 244 px and the yard 523 px. A 5 px error at the faint peak is 0.02 of the span; the bound on each '
        'share is 0.03 and on the angle 1°. The drawing rakes the mizzen 7.8° and this hull {rake}°, so the crossing of this mast\'s '
        'own axis is built where the heel, the angle and the length put it, and the record of the crossing is checked against 0.717 '
        'within the bound. The sheet\'s clew is still the class 0.62 of the yard abaft the tack. This hull is dated {yr} and has no '
        'plate of its own; the read is Vasa\'s, applied to it.')
CARRACK = ('CLASS, r321 (0y¹⁵⁸): the lateen yard is 1.15 of the lower mast, 56° from the horizontal, slung a third of its length '
           'from the heel; these are the builder\'s mixed-hull figures and were read from no plate. The fluyt, the East Indiaman and the '
           'slave ship take Hocker\'s Vasa diagram of 1628 (Vasa II, 2023, p. 31) instead. This hull is dated 1450-1600, a century '
           'before Vasa, and no plate of a carrack\'s mizzen yard has been read, so the Vasa read is not applied to her.')
OLD_TAIL = ("The yard's length (1.15 of the lower mast), its angle (56° from the horizontal) and its sling a third of its length "
            "from the heel are the builder's mixed-hull lateen mizzen, the same figures the carrack and the fluyt take, read from no plate of this hull.")
NEW_TAIL = "The yard's length, angle and heel are read off Vasa's rig diagram (lateenYardProvenance, r321)."
n = 0
for x in L:
    i = x.get('id')
    if i not in ('east-indiaman', 'slave-ship', 'fluyt', 'carrack'): continue
    mz = x['hull']['masts'][2]
    if i == 'carrack':
        assert mz['rig'] == 'lateen' and 'lateenRead' not in mz
        mz['lateenYardProvenance'] = CARRACK; n += 1; continue
    yr = {'east-indiaman': '1620', 'slave-ship': '1590', 'fluyt': '1595-1700'}[i]
    if i == 'fluyt': assert mz['rig'] == 'lateen'
    else:
        assert mz.get('lateenMizzen') is True
        assert mz['mizzenSailProvenance'].count(OLD_TAIL) == 1, i
        mz['mizzenSailProvenance'] = mz['mizzenSailProvenance'].replace(OLD_TAIL, NEW_TAIL)
    mz['lateenRead'] = dict(READ)
    mz['lateenYardProvenance'] = YARD.format(rake=mz.get('rake', 0), yr=yr)
    n += 1
assert n == 4, n
open(P, 'w').write(json.dumps(v, indent=2, ensure_ascii=False) + '\n')
print('ok', n)
