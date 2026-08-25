#!/usr/bin/env python3
"""r142: panokseon oar-deck port record updates — sangjangProvenance says the belt's
port row is now cut through the drawn plank rather than painted on it, and the
existing card row "Sangjang wall, as drawn" carries the same fact."""
import json, sys

ADD = (" Since round 142 the port row is OPENINGS: each port is cut through the "
       "drawn belt with jamb, sill and head reveal faces the plank's own gauge "
       "deep and a dark board a hand inboard, so it reads into the oar deck's "
       "shadow from every outboard bearing; before that each was a dark plate "
       "laid proud on the belt's face.")

NEW_ROW = ("closed plank from the gunwale up to the fighting deck, sixteen small "
           "ports a side cut through it under the deck line — real openings "
           "through the drawn plank since round 142, not marks on it. The closed "
           "band is her own plate's; the port count is read off that drawing at "
           "about 12 px/m, good to ±2 (derived)")

path = sys.argv[1] if len(sys.argv) > 1 else "web/data/vessels.json"
d = json.load(open(path))
vs = d["vessels"] if isinstance(d, dict) and "vessels" in d else d
hit = {"prov": 0, "row": 0}
for v in vs:
    if isinstance(v, dict) and v.get("id") == "panokseon":
        prov = v["hull"]["sangjangProvenance"]
        assert "round 142" not in prov, "provenance already updated — check first"
        v["hull"]["sangjangProvenance"] = prov + ADD
        hit["prov"] += 1
        for r in v["rows"]:
            if r[0] == "Sangjang wall, as drawn":
                assert "round 142" not in r[1], "row already updated — check first"
                r[1] = NEW_ROW
                hit["row"] += 1
json.dump(d, open(path, "w"), ensure_ascii=False, indent=1)
print("updated", path, hit)
assert hit == {"prov": 1, "row": 1}, hit
