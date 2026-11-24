#!/usr/bin/env python3
"""r308 (0y134): Endurance's mizzen gains furlStow 'brailed' and its provenance.
Usage: r308_record.py <vessels.json>"""
import json, sys
p = sys.argv[1]
raw = open(p).read()
V = json.loads(raw)
vs = V if isinstance(V, list) else V.get('vessels', V)
e = [v for v in vs if v.get('id') == 'endurance']
assert len(e) == 1
m = e[0]['hull']['masts'][2]
assert m['rig'] == 'gaff' and abs(m['at'] - 0.839) < 1e-9 and m.get('boomFootM') == 4.15
m['furlStow'] = 'brailed'
m['furlStowProvenance'] = (
    "PLATE READ, r308: when the mizzen sail is stowed, it is brailed in to the mast under a gaff that "
    "stays aloft, and the boom stays in place. Two plates of her in the ice show it. (1) Hurley's plate "
    "from the starboard quarter (Commons a090007, 1500x1124, about 24 px/m at the stern; crops "
    "build/staging/r308/a090007-mizzen-3x.png and a090007-mizzen-foot-4x.png): the gaff stands at its "
    "working angle with its vangs hanging from the peak, and the sail is a twisted bundle along the "
    "after side of the mast from the gaff's jaws down to the poop. (2) Hurley's beset broadside (RMG "
    "P00018, crop build/staging/r308/plate-mizzen-4x.png): the gaff stands at 37.7 degrees (r306's "
    "read) and the dark column of the lower mast under it is 10 px wide from the jaws to the rail, against 3 px "
    "for the topmast above (median over 70 and 65 rows, build/staging/r308/r308_widths.py). At the "
    "plate's 12.4 px/m that is 0.8 m, about twice the mast's own diameter. The main, which r306 read as "
    "brailed, measures 15 px against 4 px the same way. Neither plate shows cloth along the boom or a gaff lowered onto it. The boom itself is "
    "the record's boomFootM read off plate (1), and Hurley's plate of her heeled in the pressure "
    "(build/endurance-heeled.png) shows a spar out over the counter. Plate (1) does not show the boom "
    "clearly aft of the mast, so where it lay when this plate was taken is not read; the model keeps "
    "it on its topping lift. How the sail was set at sea is not read: the set build draws it on its "
    "gaff and boom as before."
)
open(p, 'w').write(json.dumps(V, indent=2, ensure_ascii=False) + '\n')
print('ok')
