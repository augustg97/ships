#!/usr/bin/env python3
"""r188: treasure-ship ironAnchors — Penglai calibration, full-length convention."""
import json

import sys
P = sys.argv[1] if len(sys.argv) > 1 else 'web/data/vessels.json'
d = json.load(open(P))
vv = next(x for x in d['vessels'] if x.get('id') == 'treasure-ship')
v = vv['hull']

ia = v['ironAnchors']
for old, new, val in [('sheetShankM', 'sheetLenM', 1.86),
                      ('bowerShankM', 'bowerLenM', 1.57),
                      ('sternShankM', 'sternLenM', 1.57)]:
    assert old in ia, old
    del ia[old]
    ia[new] = val
v['ironAnchors'] = {k: ia[k] for k in ['sheetAtU', 'pairAtU', 'pairOffZ',
    'sheetLenM', 'bowerLenM', 'sternAtU', 'sternOffZ', 'sternLenM',
    'clawFrac', 'yaw']}

OLD = ("NO dimension is in any text: sheet shank 2.4 m is DERIVED (wrought iron "
       "summing to the recorded ~300 kg), the pair’s 300 catties an INFERENCE at "
       "the forging text’s own anvil threshold (scale 0.84 → shank 2.0 m), claw "
       "sweep a woodcut-proportion default — a measured surviving four-claw anchor "
       "would replace all three and this field says so.")
NEW = ("NO dimension is in any text; a measured surviving four-claw anchor now sets "
       "the scale (r188 — the replacement this field promised). 蓬莱水城出土 1984 "
       "— the complete excavated Ming four-claw anchor from the Penglai naval "
       "fortress, 全長 2.15 m at 456 kg (Matsui 2013 fig. 3 caption, after 王冠倬 "
       "2000: 149, 277–278; the paper local since r187, its fig. 3 read on the plate "
       "r188) — calibrates weight to length by cube-law within the one tradition: "
       "the 500-catty (~295 kg) sheet lands at 1.86 m full length; the pair’s 300 "
       "catties — still an INFERENCE at the forging text’s own anvil threshold, the "
       "text records only the sheet’s weight — at 1.57 m, carried to the stern pair "
       "whose weight is not recorded. The record fields carry the FULL crown-to-ring "
       "length a find’s 全長 measures (the r187 yotsume convention; the drawn ring "
       "top lands at the field’s value). Cross-check: 泉州四湖港出土 1981, 残高 "
       "2.68 m at 758.3 kg — incomplete, its missing parts dotted in the figure, "
       "weighing less than the ~880 kg cube-law gives a complete 2.68 m: a consistent "
       "lower bound. Sensitivity NAMED: fig. 3b, 山東省梁山県宋金河出土 1956, 全長 "
       "1.36 m, the shank inscribed 「甲字五百六十号 八十五斤 洪武五年」 — an "
       "as-made 85 catties (~50 kg) in 1372, the corpus’s slender small-craft build "
       "at less than half Penglai’s weight per length; a power law through both "
       "dated Ming points would give 1.96 m sheet (inside the audit’s 12% band) and "
       "1.77 m pair (at the band’s edge). Penglai — the naval-fortress find of the "
       "state build the forging text describes — is the calibrator for a state "
       "ship’s tackle; the choice moves the drawn anchor by a hand’s width and is "
       "recorded here. Claw sweep REMAINS a woodcut-proportion default — the "
       "excavated finds are not measured part-by-part.")
ap = v['ironAnchorProvenance']
assert OLD in ap, 'old derivation sentence not found'
v['ironAnchorProvenance'] = ap.replace(OLD, NEW)

# the card row gains the concrete sizes and their source
for r in vv['rows']:
    if r[0] == 'Ground tackle, as drawn':
        assert 'Penglai' not in r[1]
        r[1] = r[1].replace(
            'whichever way it lands a claw bites.',
            'whichever way it lands a claw bites. No text gives a size: the drawn '
            'lengths — 1.86 m the sheet, 1.57 m the rest — are scaled by weight '
            'from the complete Ming anchor excavated at the Penglai naval fortress '
            'in 1984, 2.15 m and 456 kg.')
        break
else:
    raise SystemExit('ground tackle row not found')

json.dump(d, open(P, 'w'), ensure_ascii=False, indent=1)
print('ok: fields', {k: v['ironAnchors'][k] for k in
      ['sheetLenM', 'bowerLenM', 'sternLenM']})
