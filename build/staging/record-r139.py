#!/usr/bin/env python3
"""r139: sekibune yakata record updates — towerProvenance says the curtain is now
drawn and what about the opening is derived; the card row carries the same fact."""
import json, sys

OLD_TAIL = ("The scroll also hangs cloth in the wall openings of several cabins; "
            "the curtain is not drawn, and that simplification is recorded here.")
NEW_TAIL = ("The scroll also hangs cloth in the wall openings of several cabins; "
            "since round 139 one opening a side is drawn with the cloth hung in it. "
            "The OPENING's size and place are derived — no cabin interior is "
            "attested, and the scroll resolves the openings only to ship scale — "
            "the cloth itself is the scroll's.")

OLD_ROW = ("the commander's cabin abaft the mast — a closed plank house, "
           "4.5 × 2.8 m to 2.0 m eaves under a ridged plank roof. The form is the "
           "Busan scroll's; the dimensions are derived")
NEW_ROW = ("the commander's cabin abaft the mast — a closed plank house, "
           "4.5 × 2.8 m to 2.0 m eaves under a ridged plank roof, cloth hung in a "
           "wall opening each side as the scroll hangs it on several cabins. The "
           "form and the cloth are the Busan scroll's; the dimensions and the "
           "opening's place are derived")

path = sys.argv[1] if len(sys.argv) > 1 else "web/data/vessels.json"
d = json.load(open(path))
vs = d["vessels"] if isinstance(d, dict) and "vessels" in d else d
hit = {"prov": 0, "row": 0}
for v in vs:
    if isinstance(v, dict) and v.get("id") == "sekibune":
        tp = v["hull"]["towerProvenance"]
        assert tp.endswith(OLD_TAIL), "towerProvenance tail changed — check before editing"
        v["hull"]["towerProvenance"] = tp[: -len(OLD_TAIL)] + NEW_TAIL
        hit["prov"] += 1
        for row in v["rows"]:
            if row[0] == "Yakata, as drawn":
                assert row[1] == OLD_ROW, "card row changed — check before editing"
                row[1] = NEW_ROW
                hit["row"] += 1
json.dump(d, open(path, "w"), ensure_ascii=False, indent=1)
print("updated", path, hit)
