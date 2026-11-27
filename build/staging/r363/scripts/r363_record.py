#!/usr/bin/env python3
"""r363: the 74's upper tier's ports, from Steel's Folio XXXII. Usage: r363_record.py <vessels.json>"""
import sys, json
p = sys.argv[1]; s = open(p).read()
i = s.index('"id": "ship-of-the-line"'); j = s.index('        "paintBands": {', i)
assert s.count('"tierPorts"') == 0
rec = {"tierPorts": [None, {
  "sillM": 0.610, "hM": 0.813, "wM": 0.864, "pitchM": 2.464, "nSide": 15,
  "provenance": "RECORDED, r363: Steel, Elements and Practice of Naval Architecture (1822), Folio XXXII (archive.org elementspractice00stee leaf 550; build/staging/r358/steel/leaf0550.jpg, about 1500 px across the table), the 74's column. Row Q, the height from the upper deck's plank to the port sills, 2 ft 0 in. Row S, ports deep, 2 ft 8 in. Row T, fore and aft, 2 ft 10 in. Row U, distance from each other, 8 ft 1 in. Row X, number, 30 (15 a side). Rows B and C give the lower and upper sills 6.5 in and 5.5 in deep. Index 0, the lower tier, is not recorded: the model draws no gun deck to measure its sill from.",
  "contested": "The depth and the sill are drawn. The width and the spacing are NOT: the shader cuts a port every L/26 (1.96 m) about 1.02 m wide, against Steel's 2.46 m and 0.864 m, so the model shows about 19 upper-deck ports a side where Steel has 15. The sill is placed over the deck at midships and the port follows the paint band along the length, so it stands 0.04-0.12 m off Steel's 2 ft 0 in toward the ends."}]}
line = '        "tierPorts": ' + json.dumps(rec["tierPorts"], ensure_ascii=False) + ',\n'
s = s[:j] + line + s[j:]
json.loads(s)
open(p, 'w').write(s); print('recorded')
