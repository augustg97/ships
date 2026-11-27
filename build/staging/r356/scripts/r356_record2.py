#!/usr/bin/env python3
"""r356: the 74's side record gains the waterway's place (Steel) and a contested field saying the model does not draw it.
usage: r356_record2.py <vessels.json>"""
import sys, json
vp = sys.argv[1]; raw = open(vp).read()
i0 = raw.index('"id": "ship-of-the-line"'); i1 = raw.index('"side": {', i0); assert raw.index('"id":', i0 + 10) > i1
dec = json.JSONDecoder(); side, end = dec.raw_decode(raw, i1 + len('"side": '))
assert side['atDeckM'] == 0.514 and 'contested' not in side
new = {"atDeckM": 0.514, "atCoverM": 0.356, "sternM": 0.25, "waterwayFromSkinM": 0.387, "waterwayBroadM": 0.279,
       "provenance": side['provenance'] + (" THE WATERWAY: 5 in thick and 11 in broad at the upper deck (Folio XXXV). Steel's "
       "spirketting is 'wrought within side upon the ends of the beams or waterways' (his glossary), so the waterway runs "
       "under the spirketting to the frame: its outboard edge stands 15 1/4 in (0.387 m, the wale and the futtock) inside "
       "the outer plank, and its inboard edge 26 1/4 in (0.667 m)."),
       "contested": ("The model does not draw this side. It draws the 74's side as one skin with no thickness. Measured "
       "on the built hull in r356 (r356_inset.js): the waterway lies 0.00-0.36 m inside the skin, where Steel puts it "
       "0.39-0.67 m in; the bulwark stanchions reach 0.21 m in; the pin rail stands 0.20-0.36 m in. The parts under the "
       "forecastle and quarterdeck are lit as covered from 0.25 m inside the skin (COVER_SIDE_M, a tolerance for the "
       "drawn skin), not from Steel's 0.514 m: taken at 0.514 m, the drawn waterway under the quarterdeck would be lit "
       "as open sky (292 of its 728 vertices counted under a cover fall to 4). Drawing the side at Steel's thickness, "
       "with the waterway, spirketting and port linings at their places, is not done.")}
raw2 = raw[:i1] + '"side": ' + json.dumps(new, ensure_ascii=False) + raw[end:]
V = json.loads(raw2); assert [v for v in V['vessels'] if v['id'] == 'ship-of-the-line'][0]['hull']['side'] == new
open(vp, 'w').write(raw2); print('ok')
