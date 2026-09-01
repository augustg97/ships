#!/usr/bin/env python3
"""r191 — sekibune record: the yotsume-ikari's mass becomes a record field;
provenance and card row carry the member record (Matsui 2013 表1) and the solve."""
import json

P = 'web/data/vessels.json'
d = json.load(open(P))
vs = d['vessels'] if isinstance(d, dict) else d
v = next(x for x in vs if x["id"] == "sekibune")
h = v["hull"]

ya = h["yotsumeAnchor"]
assert ya.get("lenM") == 2.0, 'lenM moved'
ya["kg"] = 122

OLD_TAIL = ("A measured Sengoku warship anchor, or the 1433 emaki plate in "
            "resolution, replaces the defaults and this field says so.")
assert h["anchorProvenance"].endswith(OLD_TAIL), 'provenance tail moved'
h["anchorProvenance"] += (
    " Member sections are the corpus's own record, read r191: 表1 of the same paper"
    " (Matsui 2013 p.38) measures all 49 anchors at member level, and the arms are"
    " RECTANGULAR forged bars — 最大幅×最大厚 at the root, a wide thin blade at the"
    " fluke tip. Corpus means for the 27 consistently-printed anchors ≥190 cm, as"
    " fractions of 全長: root 0.0346±0.0037 × 0.0198±0.0033, tip 0.0220±0.0052 ×"
    " 0.0058±0.0031. Both rings take the type anchor the class already cites"
    " (Onominato a: teardrop 44×19 cm of 3 cm bar, accessory ring ⌀36 of 4×4.5"
    " section, on 269 cm). The weight field kg 122 is DERIVED by cube-law from the"
    " corpus's one weighed anchor — the Kozushima wreck anchor, 2.8 m, 330–340 kg"
    " by forklift (約90貫), raised 1990 — 15.26 kg per m³ of 全長³. The shank is"
    " the one member 表1 does not record: its square side is SOLVED so the drawn"
    " iron weighs the record's kg at 7850 kg/m³ — at (2.0 m, 122 kg) it returns"
    " 9.4 cm at the crown tapering to 6.8. CONTESTED: the paper's own monument"
    " photographs read shanks slimmer (0.023–0.034 of 全長; fig 15-1, obliquity"
    " unbounded) than the solve's 0.047 — rust loss on century-exposed survivors,"
    " the forklift's precision and real working-vs-votive spread are the named"
    " suspects; a caliper record of the Kozushima members (國學院大學 1993 site"
    " report) would settle it. The audit holds the drawn anchor's integrated iron"
    " to the record's weight (V-YMASS, 12%).")

row = v['rows'][12]
assert row[0] == 'Ground tackle, as drawn', 'row moved'
OLD_ROW_TAIL = ("The count aboard and the foredeck stow are inferences, and the "
                "cable is coiled beside the head because no belay is attested")
assert row[1].endswith(OLD_ROW_TAIL), 'row tail moved'
row[1] += (
    ". The drawn iron weighs what the record weighs: the corpus's measurement table"
    " gives the arms as flat forged bars — about 7 cm wide and 4 thick at the root"
    " on her 2.0 m anchor, thinning to a blade at the point — and its one weighed"
    " anchor, the 2.8 m Kozushima wreck find at 330-340 kg, scales to 122 kg for"
    " hers. The shank, the one member the table leaves unmeasured, is solved to"
    " carry that mass: a square bar 9 cm through at the crown")

import os
json.dump(d, open(P + '.tmp', 'w'), indent=1, ensure_ascii=False)
os.replace(P + '.tmp', P)
print('applied: kg field, provenance, card row')
