"""r313 (0y143): the 74's crossjack read off the Asow plate; every other course under upper tiers names its silence."""
import json, sys
SRC = sys.argv[1]; DST = sys.argv[2]
d = json.load(open(SRC))
V = {v['id']: v for v in d['vessels']}
ROWS = {'deckRail': 1782, 'deckHidden': 1815, 'top': 1372, 'yard': 1438, 'yardHead': 1430, 'yardFoot': 1449, 'cap': 1283}
lo = (ROWS['deckRail'] - ROWS['yard']) / (ROWS['deckRail'] - ROWS['top'])
hi = (ROWS['deckHidden'] - ROWS['yard']) / (ROWS['deckHidden'] - ROWS['top'])
f = round((lo + hi) / 2, 3)
print('read', round(lo, 4), round(hi, 4), '->', f)
READ = ("PLATE READ, r313 (0y¹⁴³): the crossjack hangs at %.3f of the height from the deck to the mizzen top (bound +/-0.025). "
  "Plate: C. W. Eckersberg, 'The Russian Ship of the Line Asow and a Frigate at Anchor in the Roads of Elsinore', 1828 (Commons, Google Art Project copy, "
  "read off the 1920 px derivative, build/staging/r312/plates/asow.jpg; the mizzen lower rig at about 30 px/m, from the main yard's length). "
  "She is seen from abaft her starboard quarter with the eye near the water, so the masts stand upright on the canvas and heights along one mast keep their ratios. "
  "Rows on the derivative, read as brightness profiles in columns 330-370 and 600-640, either side of the mizzen and clear of the ensign: "
  "the crossjack, a pale yard, rows 1430-1449, centre 1438; the main yard, dark, crosses just above it at 1416-1428; the front edge of the mizzen top 1372 (+/-6); "
  "the mizzen cap 1283; the taffrail's top at the mast 1782. The poop deck at the mast is hidden behind the taffrail, so its row lies between 1782 and about 1815 "
  "(a 1 m rail at 30 px/m); the two datums give %.3f and %.3f, and the record takes their mean. The builder stands the top's centre at 0.90 of the lower mast, "
  "so the crossjack hangs at %.3f x 0.90 of the lower mast; the class figure it replaces was 0.60 of the lower mast, which put the yard at 0.665 of the deck-to-top height. "
  "CONTESTED: one painting of one ship, a Russian 74 launched in 1826, 46 years after this hull's 1780. The plate also shows the mizzen's proportions differ from the model's: "
  "its masthead, cap to top, is 0.18 of the deck-to-cap height and the model's is 0.12, so the read is taken against the top, where the yard's slings hang, and not against the cap.") % (f, lo, hi, f)
FORE_MAIN = ("UNREAD, r313: the class figure stands, the course yard at 0.60 of the lower mast from the deck. The Asow plate (r313) shows this mast's course yard close "
  "under its top too, but the stern hides this mast's deck, so its height over the deck is not read; a broadside of a working 74 would read it.")
OTHER = ("UNREAD, r313: the class figure stands, the course yard at %s of the lower mast from the deck (%s). No plate of this hull's course yard has been read.")
for vid, v in V.items():
    for mi, mk in enumerate((v.get('hull') or {}).get('masts') or []):
        if mk.get('rig') != 'square' or mk.get('yards'): continue
        tiers = mk.get('only') or 3
        if tiers < 2: continue
        if vid == 'ship-of-the-line' and mk.get('spanker'):
            mk['courseRead'] = {'ofDeckToTop': f, 'boundPm': 0.025, 'rows': ROWS,
                                'plate': 'build/staging/r312/plates/asow.jpg (1920 px derivative of the Google Art Project copy)',
                                'cols': [[330, 370], [600, 640]], 'topAtOfLower': 0.90}
            mk['courseAtProvenance'] = READ
        elif vid == 'ship-of-the-line':
            mk['courseAtProvenance'] = FORE_MAIN
        else:
            mk['courseAtProvenance'] = OTHER % ('0.60' if tiers == 3 else '0.72',
                'three tiers: a course under a topsail and a topgallant' if tiers == 3 else 'two tiers: a course under one topsail')
        print(vid, mi, tiers, mk['courseAtProvenance'][:10])
json.dump(d, open(DST, 'w'), indent=2, ensure_ascii=False)
