import sys, json
p = sys.argv[1] + '/data/vessels.json'
raw = open(p).read()
i0 = raw.index('"id": "ship-of-the-line"'); i1 = raw.index('"side": {', i0); assert raw.index('"id":', i0 + 10) > i1
assert '"quarterGallery"' not in raw
QG = {
  "heightsFt": {"lowerCounter": [30, 9], "upperCounter": [34, 3], "lowerBreastrail": [42, 6],
                "breastrailOverDeck": [3, 4], "taffrailTop": [50, 6]},
  "storeys": [
    {"name": "lower", "rimFt": [13, 0], "lightsFt": [[3, 6], [2, 10]]},
    {"name": "upper", "rimFt": [10, 3], "lightsFt": [[3, 2], [2, 5]]}],
  "projectionM": 0.76,
  "projectionFrom": "class: Steel's table gives the balconies' projection aft of the side counter timber (3 ft 3 in) and not the gallery's off the side; 2 ft 6 in is taken",
  "pierM": 0.25,
  "registerOn": "taffrailTop",
  "provenance": "RECORDED, r357, from David Steel, The Elements and Practice of Naval Architecture (1805), 1822 edition, Folio LI, the 74-gun column, read off the page scan (archive.org elementspractice00stee, BookReader leaf 588, saved at 2/3 scale as build/staging/r356/steel/folioLI-stern.jpg, about 2000 px for the page; the figures are printed type and read without ambiguity). Heights over the upper side of the rabbet of the keel: touch of the lower counter at the middle line 30 ft 9 in, of the upper counter 34 ft 3 in, upper part of the lower balcony breastrail 42 ft 6 in (3 ft 4 in over the plank of the deck), upper part of the taffarel 50 ft 6 in. Length of the lower gallery rim from the aft part of the side counter timber 13 ft 0 in, of the upper 10 ft 3 in. Lower gallery lights 3 ft 6 in on the rake by 2 ft 10 in on the square; upper 3 ft 2 in by 2 ft 5 in. The heights are registered on the model by the taffrail's top (the island's top at the stern); the balcony's deck then falls at the model's upper deck. The projection off the side, the pier between lights and each light's sill over its floor are class figures; the table does not give them."
}
raw2 = raw[:i1] + '"quarterGallery": ' + json.dumps(QG, ensure_ascii=False) + ', ' + raw[i1:]
V = json.loads(raw2); assert [v for v in V['vessels'] if v['id'] == 'ship-of-the-line'][0]['hull']['quarterGallery'] == QG
open(p, 'w').write(raw2)
print('recorded')
