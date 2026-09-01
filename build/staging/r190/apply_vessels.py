#!/usr/bin/env python3
"""r190 — treasure-ship record: anchor weights become record fields; provenance
and card row carry the mass solve and the 2005 caliper record."""
import json, sys

P = 'web/data/vessels.json'
d = json.load(open(P))
vs = d['vessels'] if isinstance(d, dict) else d
v = next(x for x in vs if x["id"] == "treasure-ship")
prov_holder = v["hull"]

ia = v["hull"]["ironAnchors"]
ia['sheetKg'] = 295
ia['bowerKg'] = 177
ia['sternKg'] = 177

OLD_TAIL = "Stow spots PLACEMENT INFERENCE, measured and iterated (r182/r183 method)."
assert prov_holder["ironAnchorProvenance"].endswith(OLD_TAIL), 'provenance tail moved'
prov_holder["ironAnchorProvenance"] += (
    " Member sections MASS-SOLVED r190: the r189 sections followed the plate's line"
    " weights and summed to 156 kg of wrought iron against the find's captioned 456 —"
    " a third of the record — so sections now come from the balance itself. The"
    " section RATIOS are a caliper record from the same harbour: the 2005 second"
    " dredge of the same basin raised a complete four-claw anchor, and the excavation"
    " brief (蓬莱3艘古船发掘简报 §7, haijiaoshi.com/archives/425, saved r190) measures"
    " it — shank 177 cm at ⌀8.5 cm, claws 73 cm at ⌀7 cm, one diameter over the"
    " claw's length, tips 144 cm apart, a head eye ⌀4.5, forge marks named on the"
    " surface. The absolute scale is solved per anchor so the drawn iron weighs the"
    " record's own mass at 7850 kg/m³ — the weight fields sheetKg 295 (RECORDED, the"
    " text's 500 catties), bowerKg/sternKg 177 (the standing 300-catty inference)."
    " At the calibrator, 456 kg draws shank ⌀15.5→11.9 cm and claw ⌀11.3→6.8 cm on"
    " 2.15 m; all three record anchors share one density class, so they solve to one"
    " proportion set and the r188 cube-law stands. The method checks itself against"
    " the calipers: the 2005 anchor's own members integrate to ~170 kg, and handing"
    " that mass and its ~1.94 m length back to the solve returns claw ⌀7.1 cm"
    " against the measured 7.0 and shank ⌀9.7 against 8.5. The claw centreline,"
    " crown ball and head eye stay the plate's (r189): a line drawing carries a"
    " silhouette, and only the sections were its line weights'. The audit holds each"
    " drawn anchor's integrated iron to its record's weight (V-MASS, 12%).")

row = v['rows'][9]
assert row[0] == 'Ground tackle, as drawn', 'row moved'
assert row[1].endswith('for the belay no text records.'), 'row tail moved'
row[1] += (
    " The drawn iron weighs what the record weighs: each anchor's member thickness"
    " is solved from its recorded weight — the sheet's 500 catties, the calibrator's"
    " 456 kg — with shank-to-claw proportions from a calipered anchor the same"
    " harbour's 2005 dredge raised. The solved sheet carries a shank 13 cm through"
    " at the crown and claws of 10 cm.")

json.dump(d, open(P, 'w'), indent=1, ensure_ascii=False)
print('vessels.json written: kg fields, provenance, card row')
