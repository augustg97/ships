#!/usr/bin/env python3
"""r347: the 74 records where her masts' heels step, below the upper deck.
usage: r347_edit_record.py <web dir>"""
import sys, pathlib, json
p = pathlib.Path(sys.argv[1]) / 'data' / 'vessels.json'
s = p.read_text()
i = s.find('"id": "ship-of-the-line"')
assert i >= 0
k = s.find('"id": "', i + 10)
j = s.find('"masts": [', i)
assert j > 0 and (k < 0 or j < k), (j, k)
line0 = s.rfind('\n', 0, j) + 1
indent = s[line0:j]
assert indent.strip() == '', repr(indent)
assert '"mastStep"' not in s[i:k]
PROV = ("DERIVED, r347. Steel's rule (1794) gives the length of the main mast from its heel to its head: half of the "
        "lower deck's length plus the extreme breadth, 107 ft 6 in on this hull. The heel steps on the keelson, so part "
        "of that length is below the upper deck, the deck the masts are drawn on. The depth from the upper deck to the "
        "top of the step is 7.85 m: the depth in hold of a Bellona-class 74, 19 ft 9 in (6.02 m, attested), plus 2.13 m "
        "from the lower gun deck to the upper deck (7 ft, a class figure, CONTESTED), less 0.30 m for the keelson's height "
        "over the ceiling (a class figure). The same depth is taken at all three masts; on a real 74 the floors rise "
        "toward the ends, so the fore and mizzen steps stand somewhat higher, by an amount no source here gives. "
        "CHECK, on Eckersberg's Asow (1828; build/staging/r312/plates/asow.jpg, 1920 px thumb; rows in "
        "build/staging/r347/): the main top stands at row 1318, the topmast crosstrees at 848 and the quarterdeck's "
        "barricade top at the main at 1776. Taking the drawn span from the main top to the topmast crosstrees, 18.6 m, as "
        "the scale (25.3 px/m at the main), the main top stands 21.6 m over the upper deck, about 1 m either way for the "
        "deck's row, which is taken 3.5 m under the barricade top. Drawn with this step it stands 22.5 m over "
        "it; drawn with the whole length on the deck it stood 29.5 m. The mizzen's top (row 1372, about 30 px/m) reads "
        "17.2 m over the upper deck; drawn with the step it stands 18.2 m, and without it 25.3 m.")
ins = ('"mastStep": ' + json.dumps({"belowDeckM": 7.85, "provenance": PROV}, ensure_ascii=False) + ',\n' + indent)
s = s[:j] + ins + s[j:]
json.loads(s)
p.write_text(s)
print('ok', p)
