#!/usr/bin/env python3
"""r159: Azzam's crest top stops wearing teak the plate refutes.

deck.roofs learns the answer "terraces" — covering on the exposed tier terraces, coated
plate on the top tier's roof — and Azzam's record carries it with the Klaus Jordan
delivery-trials aerial in the provenance (Research/AZZAM-PLATES.md, plate 2).

Asserts before writing; writes web/data/vessels.json only. build_site copies to docs/.
"""
import json, sys, pathlib

ROOT = pathlib.Path.home() / "Ships"
P = ROOT / "web" / "data" / "vessels.json"

doc = json.loads(P.read_text())
vs = doc["vessels"] if isinstance(doc, dict) else doc
az = [s for s in vs if s.get("id") == "azzam"]
assert len(az) == 1, "exactly one azzam record"
az = az[0]
d = az["hull"]["deck"]

# the state this patch was written against
assert d["covering"] == "teak", d["covering"]
assert d["roofs"] is True, "roofs must be the r108 blanket answer before this runs"
assert "2,200" in d["roofsProvenance"], "provenance is the r108 area argument"

# every other ship keeps its exact answer
others = {s["id"]: s["hull"]["deck"]["roofs"] for s in vs
          if s.get("hull", {}).get("deck", {}).get("roofs") is not None
          and s["id"] != "azzam"}
assert others == {"great-eastern": True, "titanic": True, "yamato": True,
                  "queen-mary-2": False}, others

d["roofs"] = "terraces"
d["roofsProvenance"] = (
    "TERRACES, NOT THE CREST: the 2,200 m2 of laid teak in the builder-sourced copy is far "
    "more area than her weather deck alone can carry on a 180.6 x 20.8 m hull, so her tier "
    "terraces carry the rest — which her photographs show. But the crest top is not among "
    "them: on the Klaus Jordan delivery-trials aerial (Lurssen press 2013, via CharterWorld "
    "wp-content, 960x640 copy, ~4.4 px/m locally at the crest — a colour-field read only, "
    "stated in Research/AZZAM-PLATES.md) the roof the radome cluster and mast stand on reads "
    "unbroken white coated plate, with the teak one level down on the ringing terraces. "
    "Pedestal base-plate detail is below that plate's resolution and is not claimed.")

# the file's own canonical form: indent=1, ensure_ascii=False, no trailing newline
P.write_text(json.dumps(doc, indent=1, ensure_ascii=False))

# prove the write round-trips
doc2 = json.loads(P.read_text())
vs2 = doc2["vessels"] if isinstance(doc2, dict) else doc2
az2 = [s for s in vs2 if s.get("id") == "azzam"][0]
assert az2["hull"]["deck"]["roofs"] == "terraces"
print("azzam deck.roofs -> 'terraces'; all other roofs answers untouched")
