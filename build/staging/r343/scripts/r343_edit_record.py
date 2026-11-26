#!/usr/bin/env python3
"""r343: the 74's forecastle and quarterdeck (hull.islands)."""
import sys, json, pathlib
p = pathlib.Path(sys.argv[1]); D = json.loads(p.read_text())
v = next(x for x in D['vessels'] if x['id'] == 'ship-of-the-line')
h = v['hull']
assert 'islands' not in h
h['islands'] = {
  'finish': 'tarred',
  'railM': 1.5,
  'provenance': (
    "PLATE READS, r343. SPANS off SLR0338, the RMG contemporary model of Bellona (1760), a Slade 74 and the "
    "record's sub-type: quarter plate l5785_003 (1280 px; build/staging/r171/bellona-qtr-l5785_003.jpg). On the "
    "deck-level line the stem head stands at plate x 185 and the taffrail at x 1090. The forecastle's breastwork "
    "stands at x 405 and the quarterdeck's breast rail at x 555. The upper tier's port pitch grows from about 45 px "
    "at the bow to 55 px at the stern, so the plate is foreshortened about 20% along her length; x was corrected "
    "for that as a linear growth of scale, which puts the forecastle's end at u 0.26 and the quarterdeck's breast "
    "at u 0.43, each contested by about 0.02 u (1 m) for the correction. The model shows the waist open between "
    "them, with the jeer capstan in it. HEIGHTS: Bellona lays both decks about level with the top of the side. "
    "C. W. Eckersberg's Asow (1828, SMK; Commons GAP 1920 px thumb, build/staging/r312/plates/asow.jpg) shows "
    "the quarterdeck's black barricade standing about 2.2 m over the waist rail at plate column 640-700 (rows "
    "1800 to 1898 at about 44 px/m), and the forecastle's panelled barricade about 1.3 m over it at columns "
    "840-900 (rows 1865-1900, at a scale this far forward that the plate does not give; contested). Each deck is "
    "laid 0.5 m over the waist rail, 2.0 m over the upper deck, which is the class's height between decks on a "
    "74 (6 ft 6 in to 7 ft, Steel 1794), and each top follows the sheer (overSheerM). The barricades: 1.5 m over "
    "the quarterdeck (Asow's 2.2 m less the 0.5 m, rounded down for the reading error) and 1.2 m over the "
    "forecastle, a CLASS figure because Asow's 1.3 m less 0.5 m would leave 0.8 m, lower than a man's waist, "
    "and the plate does not give the scale there. The breast rail at each end facing the waist stands 1.0 m "
    "over its deck, a CLASS figure. FINISH: tarred black, as Asow paints both barricades; Bellona's open rails "
    "are the 1760 fashion, and the record's paint is Asow's. NOT DRAWN: the gangways along each side of the "
    "waist joining the two decks (both plates show them), the poop over the after part of the quarterdeck "
    "(Bellona shows one from about u 0.63; Asow hides it), and the quarterdeck's and forecastle's guns."),
  'list': [
    {'name': 'Forecastle', 'what': 'Forecastle: a deck over the bow, 2 m over the upper deck, behind a 1.2 m barricade',
     'u': [0.0, 0.26], 'overSheerM': [1.7, 1.7], 'railM': 1.2, 'breastM': 1.0, 'spritHeel': 'main'},
    {'name': 'Quarterdeck', 'what': 'Quarterdeck: a deck over the after part of the ship, 2 m over the upper deck, behind a 1.5 m barricade',
     'u': [0.43, 1.0], 'overSheerM': [2.0, 2.0], 'railM': 1.5, 'breastM': 1.0},
  ],
}
raw = p.read_text()
p.write_text(json.dumps(D, ensure_ascii=False, separators=(',', ':')) if '\n' not in raw[:2000] else json.dumps(D, ensure_ascii=False, indent=2))
print('record edited')
