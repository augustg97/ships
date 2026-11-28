import sys, json
W = sys.argv[1]
p = W + '/data/vessels.json'
s = open(p).read()
anchor = 'the stem sided at the head 2 ft 0 in; the bollard'
i = s.index('"hawse": {"diaM": 0.4318')
j = s.index('"},\n', i) + 3          # end of the 74's hawse record line
assert s[i:j].count(anchor) == 1
rec = {
  "stemGapM": 0.762, "armSideM": 3.581, "armKneeM": 1.905,
  "lower": {"sidedM": [0.3048, 0.1778], "mouldedM": [0.3556, 0.127]},
  "upper": {"sidedM": [0.2794, 0.1524], "mouldedM": [0.3302, 0.1207]},
  "boltsEach": 12, "boltDiaM": 0.0318,
  "heightsFt": {"lowerCheekLowerSideAtStem": [26, 3], "mainRailUpperSideAtStem": [34, 0]},
  "laidFrom": "hawse", "sourceYear": 1805,
  "kneeRisePerM": 0.12, "kneeCurve": 0.06,
  "kneeRiseFrom": "CLASS: the rise of the arms on the knee of the head (kneeRisePerM, kneeCurve) continues the bow's sheer, 0.12 m per m, and adds a lift of 0.06 m per m squared. Steel's Plan of the Head (Plate 38) would give it, and it is not online (r375).",
  "provenance": "RECORDED, r377. Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org elementspractice00stee), the 74-gun column. Folio XLIX (BookReader leaf 583, build/staging/r377/dl/leaf583.jpg, 3013 px across; crop l583-cheeks.png): CHEEKS in number on each side two; distance between the cheeks on a square at stem 2 ft 6 in; arms of the cheeks, length on the side 11 ft 9 in, length on the knee at least 6 ft 3 in; lower cheek sided at the after end 1 ft 0 in, fore end 0 ft 7 in, moulded along the side 1 ft 2 in, fore end 0 ft 5 in; upper cheek sided at the after end 0 ft 11 in, fore end 0 ft 6 in, moulded along the side 1 ft 1 in, at fore end 0 ft 4 3/4 in; cheeks to be bolted each with twelve bolts, 1 1/4 in. Folio XLVIII (leaf 581, crop l581-head.png), height from the upper edge of the rabbet of the keel to the lower side of the lower cheek at the stem 26 ft 3 in, to the upper side of the main rail at the stem 34 ft 0 in. A cheek is a knee whose two arms lie in one nearly level plane, so its siding is its depth and its moulding its standing-off from the side: Book II's sheer draught sets off 'the siding or depth of the cheek' on the sheer plan (djvu line 15826). Book II (line 15309), for the 80 and the 74: 'the situation of the hawse-holes may here determine the position of the upper edge of the lower cheek'; and (line 16546) the holes' 'diameter between the cheeks, leaving sufficient substance for the bolster'. The model centres the 2 ft 6 in gap on the holes' line at the stem. A 17 in hole in a 1 1/2 in pipe then has 5 in of bolster above and below it, the figure Steel gives for the bolster under the hawse-holes of a 64 (line 15332).",
  "contested": "The heights over the keel's rabbet are not used to place the cheeks, because they do not fit the model's bow. Steel's lower cheek stands 7 ft 9 in (2.362 m) under his main rail's upper side at the stem. The model's head rails are CLASS, and its main rail stands higher over the cheek than that (userData.headRead gives the figure). The cheeks are laid from the hawse-holes, whose height is itself CLASS (hawse.height). Registered on the taffrail (the r357 anchor), Steel's 26 ft 3 in puts the lower cheek's lower side 0.91 m above the waterline, about 1.8 m under the model's holes. Steel's sheer is higher aft and lower forward than the model's, and only his sheer draught (Plate 1, not online) would settle the bow."
}
ins = '        "cheeks": ' + json.dumps(rec, ensure_ascii=False) + ',\n'
s = s[:j] + ins + s[j:]
json.loads(s)
open(p, 'w').write(s)
print('vessels ok')
