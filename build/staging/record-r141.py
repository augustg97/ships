#!/usr/bin/env python3
"""r141: panokseon gun-port record updates — portProvenance says the battery's ports
are now cut through the drawn bulwark rather than painted on it, and a card row
carries what is attested against what is derived."""
import json, sys

PROV = ("The PORTS are attested for the class: the panokseon's chongtong stood on "
        "the fighting deck and fired through its plank bulwark — the gunners "
        "loading behind cover is the argument of the walled deck itself, and her "
        "card's Guns row carries the attested battery. The COUNT AT THE WALL, SIZE "
        "and SILL HEIGHT are derived: no example survives, the late-Joseon jeonseon "
        "plate on her card resolves the sangjang band's port row but not the "
        "fighting-deck wall's, and six a side is the drawn split of the recorded "
        "dozen-plus pieces. Each port is drawn 0.52 m square with its sill 0.14 m "
        "over the fighting deck — low, so the muzzle clears its own timber bed. "
        "Since round 141 the ports are OPENINGS cut through the drawn plank, with "
        "reveal faces the plank's own thickness deep and a dark board behind each "
        "so the port frames its muzzle in shadow; before that each was a dark "
        "plate laid on the wall's face with the barrel passing through solid "
        "plank.")

NEW_ROW = ["Gun ports, as drawn",
           "six a side, cut low through the fighting-deck bulwark with the muzzles "
           "standing out of them — real openings through the drawn plank since "
           "round 141, not marks on it. That the battery fired through the wall is "
           "attested; the count at the wall, the size and the sill height are "
           "derived — no example survives, and her plate does not resolve this "
           "port row"]

path = sys.argv[1] if len(sys.argv) > 1 else "web/data/vessels.json"
d = json.load(open(path))
vs = d["vessels"] if isinstance(d, dict) and "vessels" in d else d
hit = {"prov": 0, "row": 0}
for v in vs:
    if isinstance(v, dict) and v.get("id") == "panokseon":
        assert "portProvenance" not in v["hull"], "portProvenance exists — check before editing"
        v["hull"]["portProvenance"] = PROV
        hit["prov"] += 1
        rows = v["rows"]
        assert not any(r[0] == "Gun ports, as drawn" for r in rows), "row exists — check first"
        # the port row follows the Guns row it details
        for i, r in enumerate(rows):
            if r[0] == "Guns":
                rows.insert(i + 1, NEW_ROW)
                hit["row"] += 1
                break
json.dump(d, open(path, "w"), ensure_ascii=False, indent=1)
print("updated", path, hit)
assert hit == {"prov": 1, "row": 1}, hit
