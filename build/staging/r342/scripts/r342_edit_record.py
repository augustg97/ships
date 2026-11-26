import json, sys
p = sys.argv[1] + '/data/vessels.json'
raw = open(p).read(); d = json.loads(raw)
v = next(x for x in d['vessels'] if x['id'] == 'ship-of-the-line')
h = v['hull']
assert 'deck' not in h and 'fifeRail' not in h
h['deck'] = {
  'covering': 'wood',
  'belowSheerM': 1.5,
  'provenance': (
    "DERIVED, r342, from the upper tier of ports, which r341 placed off Eckersberg's Asow (1828; Commons GAP 1920 px thumb, "
    "build/staging/r312/plates/asow.jpg, about 30 px/m at the mizzen, 44 px/m on the side near the quarter). On a two-decker the "
    "deck in the waist is the UPPER GUN DECK, and the upper tier's ports open over it. The model's upper port is centred at 0.89 of "
    "the freeboard (4.81 m over the load waterline amidships) and stands 0.65 m tall, so its sill is at 4.48 m. The plate's sills, "
    "read up the upper ochre band at plate column 778 (band rows 1900-1950, sill about row 1933), stand about 4.6 m. A port's sill "
    "stood about two feet (0.61 m) over the deck it served: that is a CLASS figure, not read off Asow. 4.48 - 0.61 = 3.87 m and "
    "4.6 - 0.61 = 4.0 m; the record takes 3.9 m, 1.5 m under the rail at the top of the side (5.4 m), contested by about 0.1 m. "
    "The side above the deck is the waist's bulwark, open to the sky on the plate between the forecastle and quarterdeck barricades. "
    "The deck is wood: a ship of this date was laid with fir or oak plank; the species is not read. "
    "NOT MODELLED: the forecastle and the quarterdeck, which Asow draws as barricades standing above the waist rail at the bow and "
    "the quarter. The deck here follows the sheer 1.5 m under it the whole length, so at the bow and the stern it lies where those "
    "decks' barricades should be, not at those decks' own height.")}
h['fifeRail'] = {
  'provenance': (
    "NO PLATE SHOWS THE FOOT OF ANY OF HER MASTS; the fife rails are drawn to CLASS figures (the rail 0.10 m over the pin rail; "
    "0.55 m before the mast and 0.85 m abaft it; 0.70 m off each side; a pin every 0.25 m; a U open aft), and the card says so. "
    "Asow (1828) is seen from the starboard quarter and her waist bulwark hides the deck; no deck plan or model plate of a 74's "
    "upper deck has been read.")}
s = json.dumps(d, ensure_ascii=False, separators=(',', ':')) if '\n' not in raw[:2000] else json.dumps(d, ensure_ascii=False, indent=2)
open(p, 'w').write(s)
print('record edited; indent' if '\n' in raw[:2000] else 'record edited; compact')
