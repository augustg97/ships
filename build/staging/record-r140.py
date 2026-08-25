#!/usr/bin/env python3
"""r140: sekibune sama record updates — samaProvenance says the slots are now cut
through the drawn tate-ita rather than painted on it, and a card row carries what
is attested against what is derived."""
import json, sys

PROV = ("The SLOTS are attested for the class: Japanese accounts of the sekibune "
        "have the so-yagura walled with tate-ita shield planks pierced by sama, "
        "firing slots for bow and arquebus — the wall's purpose on a hull that "
        "mounts no broadside. The COUNT, SIZE and HEIGHT are derived: no Sengoku "
        "sekibune survives, and the Busan scroll (~16 px/m) resolves the yagura "
        "band but not individual slots, so 13 a side is set from the oar-station "
        "rhythm the length itself is derived from, and each slot is drawn 0.10 m "
        "wide by 0.36 m tall, centred 0.90 m over the fighting deck — the height "
        "a man standing on that deck fires from. Since round 140 the slots are "
        "OPENINGS cut through the drawn plank, with reveal faces the plank's own "
        "thickness deep and a dark board behind each so the slot reads into the "
        "deck's shadow; before that each was a dark plate laid on the wall's face.")

NEW_ROW = ["Sama, as drawn",
           "13 a side, cut through the tate-ita in a row 0.90 m over the fighting "
           "deck — real openings through the drawn plank since round 140, not "
           "marks on it. The slots and their purpose are attested for the class; "
           "the count, size and height are derived — no Sengoku example survives, "
           "and the Busan scroll does not resolve individual slots"]

path = sys.argv[1] if len(sys.argv) > 1 else "web/data/vessels.json"
d = json.load(open(path))
vs = d["vessels"] if isinstance(d, dict) and "vessels" in d else d
hit = {"prov": 0, "row": 0}
for v in vs:
    if isinstance(v, dict) and v.get("id") == "sekibune":
        assert "samaProvenance" not in v["hull"], "samaProvenance exists — check before editing"
        v["hull"]["samaProvenance"] = PROV
        hit["prov"] += 1
        rows = v["rows"]
        assert not any(r[0] == "Sama, as drawn" for r in rows), "row exists — check first"
        # the sama row follows the fighting-deck row it details
        for i, r in enumerate(rows):
            if r[0] == "Fighting deck":
                rows.insert(i + 1, NEW_ROW)
                hit["row"] += 1
                break
json.dump(d, open(path, "w"), ensure_ascii=False, indent=1)
print("updated", path, hit)
assert hit == {"prov": 1, "row": 1}, hit
