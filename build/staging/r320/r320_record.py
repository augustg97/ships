"""r320 (0y157): the lateen mizzen of the East Indiaman and the slave ship crosses two square yards, the crossjack
under the top and the topsail; no topgallant. The crossjack hangs where the Vasa plate puts it."""
import json, sys
P = sys.argv[1]
v = json.load(open(P))
L = v if isinstance(v, list) else v.get('vessels', v)
L = L if isinstance(L, list) else list(L.values())
rows = {'deckRail': 944, 'deckHidden': 944, 'top': 700, 'yard': 737}
a = (rows['deckRail'] - rows['yard']) / (rows['deckRail'] - rows['top'])
READ = round(a, 3)
PLATE = ('Hocker, F. (ed.), Vasa II: Rigging and Sailing a Swedish Warship of 1628 (Vasamuseet / Nordic Academic Press, 2023), '
         'p. 31, the rig diagram, as Wikimedia Commons File:Vasa_rig_diagram.jpg (1920 px thumbnail, build/staging/r320/dl/vasa-rig.jpg)')
TIERS = ('PLATE READ, r320 (0y¹⁵⁷): the mizzen crosses two square yards, the crossjack under the top and the '
         'topsail on the topmast, and no topgallant. ' + PLATE + ' names the masts and spars of a 1628 ship: '
         '"(i) mizzenmast; (j) mizzen topmast", and the sails "(9) mizzen; (10) mizzen topsail". Fore and main each carry a '
         'topgallant mast, (e) and (h); the mizzen has none. This hull is dated {yr} and has no plate of its own; Vasa is the '
         'nearest ship of the period whose rig is recovered, and the rule is read from her.')
COURSE = ('PLATE READ, r320 (0y¹⁵⁷): the crossjack hangs at {r} of the height from the deck to the mizzen top, '
          'read off ' + PLATE + ' on the mizzen\'s own column: the mast meets the hull at row 944, the top is centred on row '
          '700 (its platform 697-703) and the crossjack crosses the mast at rows 736-738. The deck-to-top span is 244 px, so a '
          '3 px reading error is 0.012 of it. The drawing gives the hull as a silhouette and draws no deck under the poop '
          'rail, so both deck datums are the row where the mast meets the hull; a rail of 1 m would raise the share by '
          'about 0.014, and the bound is 0.03. Mainwaring\'s Seaman\'s Dictionary (c. 1620-23, NRS vol. 56 p. 135) agrees: '
          '"Cross-jack is a yard at the upper end of the mizen mast under the top ... the use whereof is to spread and haul '
          'on the mizen-topsail sheets". This hull is dated {yr}; the read is Vasa\'s, applied to it.')
n = 0
for x in L:
    if x.get('id') not in ('east-indiaman', 'slave-ship'): continue
    yr = '1620' if x['id'] == 'east-indiaman' else '1590'
    mz = x['hull']['masts'][2]
    assert mz.get('lateenMizzen') is True and mz.get('only') == 3 and mz.get('rig') == 'square', x['id']
    assert mz['courseAtProvenance'].startswith('UNREAD'), x['id']
    mz['only'] = 2
    mz['tiersProvenance'] = TIERS.format(yr=yr)
    mz['courseRead'] = {'ofDeckToTop': READ, 'boundPm': 0.03, 'rows': rows, 'plate': 'build/staging/r320/dl/vasa-rig.jpg (1920 px thumbnail of Commons File:Vasa_rig_diagram.jpg, Hocker 2023 p. 31)',
                        'cols': [[300, 330]], 'topAtOfLower': 0.9, 'spanPx': 244}
    mz['courseAtProvenance'] = COURSE.format(r=READ, yr=yr)
    n += 1
assert n == 2
open(P, 'w').write(json.dumps(v, indent=2, ensure_ascii=False) + '\n')
print('read', READ, 'edited', n)
