#!/usr/bin/env python3
"""r161: Queen Mary 2's aft terraces stop wearing plate the plates refute.

deck.roofs false -> 'terraces' (the r159 word, second ship of the class): covering on
every exposed tier roof except the top tier's. Two witnesses at the era's two ends —
the 2016-10-01 Commons aerial and the 2004-07-20 Hamburg arrival set — both read laid
decking on every aft terrace and white coated plate on the crest (Research/QM2-PLATES.md,
reads 1). The r108 answer 'false' rested on "pale coated plate in every photograph",
which these photographs refute.

Asserts before writing; writes web/data/vessels.json only. build_site copies to docs/.
"""
import json, pathlib

ROOT = pathlib.Path.home() / "Ships"
P = ROOT / "web" / "data" / "vessels.json"

raw = P.read_bytes()
doc = json.loads(raw)
# the serializer must reproduce the file byte for byte before any edit is trusted
assert json.dumps(doc, indent=1, ensure_ascii=False).encode() == raw, "serializer not byte-stable"

vs = doc["vessels"] if isinstance(doc, dict) else doc
qm = [s for s in vs if s.get("id") == "queen-mary-2"]
assert len(qm) == 1, "exactly one queen-mary-2 record"
d = qm[0]["hull"]["deck"]

# the state this patch was written against
assert d["covering"] == "teak", d["covering"]
assert d["roofs"] is False, "roofs must be the r108 answer before this runs"
assert "pale coated plate" in d["roofsProvenance"], "provenance is the r108 claim"

# every other ship keeps its exact answer
others = {s["id"]: s["hull"]["deck"]["roofs"] for s in vs
          if s.get("hull", {}).get("deck", {}).get("roofs") is not None
          and s["id"] != "queen-mary-2"}
assert others == {"great-eastern": True, "titanic": True, "yamato": True,
                  "azzam": "terraces"}, others

d["roofs"] = "terraces"
d["roofsProvenance"] = (
    "TERRACES, NOT THE CREST: two plates at the era's two ends read laid decking on every "
    "aft terrace — the fantail and its pool, the cafe step, the main-pool terrace, the two "
    "shallow steps above — and white coated plate on the topmost roof where the dome and "
    "mast stand and on the large shell roof forward of the cascade. Plates: Commons "
    "20161001 Queen Mary Aerial 2 (CC BY-SA 4.0, 3888 px, ~3.4 px/m at the stern) and the "
    "2004-07-20 Hamburg arrival set (Arnold Schott, CC BY-SA 3.0, 1200 px, ~1.5 px/m) — "
    "colour-field reads, the fields metres wide, so both plates support them; scales and "
    "crops in Research/QM2-PLATES.md. Replaces the r108 'false', whose own sentence 'pale "
    "coated plate in every photograph' these photographs refute. The forward working "
    "deck's painted steel is still not drawn by this one-covering model.")

P.write_text(json.dumps(doc, indent=1, ensure_ascii=False))

# prove the write round-trips
doc2 = json.loads(P.read_text())
vs2 = doc2["vessels"] if isinstance(doc2, dict) else doc2
q2 = [s for s in vs2 if s.get("id") == "queen-mary-2"][0]
assert q2["hull"]["deck"]["roofs"] == "terraces"
print("queen-mary-2 deck.roofs -> 'terraces'; all other roofs answers untouched")
