# r358: the 74's quarterdeck and forecastle take Steel's heights over the upper deck (Folio XXXII, 74-gun column)
# usage: python3 r358_record.py <vessels.json>
import sys, json
p = sys.argv[1]; raw = open(p).read(); D = json.loads(raw)
v = [x for x in D['vessels'] if x.get('id') == 'ship-of-the-line'][0]; h = v['hull']
I = h['islands']; L = {i['name']: i for i in I['list']}
fc, qd = L['Forecastle'], L['Quarterdeck']
assert 'overDeckM' not in qd
IN = 0.0254
# Steel gives the height from the upper deck plank's upper side to the beam's upper side; the deck plank (3 in) is added
qd['overDeckM'] = [round((6*12+10+3)*IN, 3), round((7*12+0+3)*IN, 3)]   # 2.159, 2.210
fc['overDeckM'] = [round((6*12+7+3)*IN, 3)] * 2                          # 2.083
for i in (qd, fc): i.pop('railM', None)
qd['what'] = "Quarterdeck: a deck over the after part of the ship, 2.16 m over the upper deck at its fore end and 2.21 m at the stern, behind a barricade 1.3 m over it"
fc['what'] = "Forecastle: a deck over the bow, 2.08 m over the upper deck, behind a barricade 1.1 m over it"
old = "Each deck is laid 0.5 m over the waist rail, 2.0 m over the upper deck, which is the class's height between decks on a 74 (6 ft 6 in to 7 ft, Steel 1794), and each top follows the sheer (overSheerM). The barricades: 1.5 m over the quarterdeck (Asow's 2.2 m less the 0.5 m, rounded down for the reading error) and 1.2 m over the forecastle, a CLASS figure because Asow's 1.3 m less 0.5 m would leave 0.8 m, lower than a man's waist, and the plate does not give the scale there."
assert I['provenance'].count(old) == 1
I['provenance'] = I['provenance'].replace(old,
  "Each top follows the sheer (overSheerM): the quarterdeck's 2.0 m over the waist rail is Asow's 2.2 m rounded down for the reading error, and the forecastle's 1.7 m is a CLASS figure (a deck 0.5 m over the rail and a 1.2 m barricade), because Asow's 1.3 m would leave a barricade lower than a man's waist and the plate does not give the scale there. "
  "DECKS (r358, overDeckM): Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org elementspractice00stee), Folio XXXII, Upper Deck continued, 74-gun column, read off the page scan (leaf 550, build/staging/r358/steel/leaf0550.jpg): the height from the upper side of the upper deck's plank to the upper side of the quarterdeck's beam in midships is 6 ft 10 in afore and 7 ft 0 in abaft; to the forecastle's beam 6 ft 7 in afore and abaft. Each deck is that height plus its plank, 3 in, which is the upper deck's plank in the same table (row A): the quarterdeck's own plank was not found in Folios XXXII-XL, so the 3 in is ASSUMED. Afore and abaft are put at the island's two ends. The barricade is what stands between that deck and the top: 1.34 m at the quarterdeck's fore end, 1.29 m at the stern, 1.12 m on the forecastle. Until r358 each deck was laid at the top less a recorded railM, 2.0 m over the upper deck, the class's figure (6 ft 6 in to 7 ft, Steel 1794). "
  "The same table gives the depth of the waist from the upper side of the plank at the lowest place as 6 ft 9 in (2.06 m); the model's waist is 1.5 m deep (deck.belowSheerM), from Asow's ports. That is not reconciled here.")
q = h['quarterGallery']
assert q['contested'] == "Steel's stern is narrower and his quarterdeck lower than the model's."
q['contested'] = "Steel's stern is narrower than the model's."
cp = q['contestedProvenance']; i = cp.index(' (2) ')
q['contestedProvenance'] = cp[:i] + " (2) r357 recorded the model's quarterdeck as laid 2.0 m over the upper deck (the class's), leaving the upper storey 1.25 m. r358 laid it at Steel's own height (Folio XXXII, islands.provenance), 2.21 m at the stern. On Steel's own figures the taffrail's top then stands 1.24 m over the quarterdeck, so the upper storey has 1.04 m under the roof's foot (a class 0.25 m) and its 3 ft 2 in lights stand on its floor with no sill. That height is Steel's, not a disagreement between Steel and the model, and it is no longer in contested. The stern's breadth was not changed."
# surgical: replace only the two values' text inside the 74's record, so the rest of the file keeps its bytes
dec = json.JSONDecoder(); i0 = raw.index('"id": "ship-of-the-line"')
for key, val in (('islands', I), ('quarterGallery', q)):
    k = raw.index('"' + key + '": ', i0) + len(key) + 4
    _, end = dec.raw_decode(raw, k)
    raw = raw[:k] + json.dumps(val, ensure_ascii=False) + raw[end:]
json.loads(raw)
open(p, 'w').write(raw)
print('ok', qd['overDeckM'], fc['overDeckM'])
