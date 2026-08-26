#!/usr/bin/env python3
"""r160: the bow stops standing 3.9 m above the plates.

Two independent broadsides (Research/AZZAM-PLATES.md, the r160 derivation) put Azzam's
stem head at 8.05-8.37 m over the waterline, below her own 9.0 m freeboard, the deck
sweeping UP into the house. The record drew sheerBow 3.0 -- a 12.0 m liner's bow.

sheerBow 3.0 -> -0.8, and the measured stem head becomes a record field (bowTopM 8.2)
so the audit can convict both directions of the r84 class forever.

Asserts before writing; writes web/data/vessels.json only. build_site copies to docs/.
"""
import json, math, pathlib

ROOT = pathlib.Path.home() / "Ships"
P = ROOT / "web" / "data" / "vessels.json"

doc = json.loads(P.read_text())
vs = doc["vessels"] if isinstance(doc, dict) else doc
az = [s for s in vs if s.get("id") == "azzam"]
assert len(az) == 1, "exactly one azzam record"
h = az[0]["hull"]

# the state this patch was written against
assert h["sheerBow"] == 3.0, h["sheerBow"]
assert h["freeboard"] == 9.0, h["freeboard"]
assert "bowTopM" not in h, "bowTopM already present -- patch already applied?"
assert h.get("houseRamp") is True and h.get("tierForeU"), \
    "the swept front needs houseRamp + tierForeU already in place (r97)"

h["sheerBow"] = -0.8
h["bowTopM"] = 8.2
h["sheerProvenance"] = (
    "MEASURED 2026-08-25 (round 160) off two independent broadsides, each with its scale: "
    "the Cadiz in-service broadside (Commons AzzamCadiz.jpg, 17.27 px/m re-anchored, stem "
    "tip x351 y1709, waterline fit y=1847.8+0.00162x) reads the stem head at 8.05-8.13 m "
    "and the foredeck cap 8.19-8.38 m rising to 8.84 at the house front; the kept Bremen "
    "broadside (azzam-broadside-fricke-2014.jpg, 8.96 px/m, anchors x332/x1950/y941) reads "
    "the same stem head at 8.37 m. Both refute the former sheerBow 3.0 (a 12.0 m bow) by "
    "~3.9 m: her sheer is INVERTED, the bow below the freeboard deck, one sweep rising aft "
    "into the house. bowTopM is the two-plate band's centre; sheerBow = bowTopM - freeboard. "
    "The 1343_Azzam.jpg fitting-out oblique was rejected as a witness: no local scale anchor "
    "at the bow (Research/AZZAM-PLATES.md, r160 section).")

# the arithmetic the audit will hold forever
assert abs((h["freeboard"] + h["sheerBow"]) - h["bowTopM"]) < 0.05

# the drawn sweep must land within the plate band at the checked stations
# (hull.js sheer(): fb + sheerBow * |2u-1|^2.8 forward of amidships)
for u, lo, hi in ((0.0, 7.9, 8.5), (0.05, 8.0, 8.6), (0.10, 8.1, 8.7), (0.27, 8.6, 9.1)):
    s = abs(2 * u - 1) ** 2.8
    y = h["freeboard"] + h["sheerBow"] * s
    assert lo - 0.31 <= y <= hi + 0.31, (u, y)

# no other hull moves: sheerBow elsewhere untouched (checked by count and by azzam identity)
others = sorted(s["id"] for s in vs if s.get("hull", {}).get("sheerBow") is not None
                and s["id"] != "azzam")
assert len(others) >= 20, "sanity: the fleet still carries its sheers"

# the file's own canonical form: indent=1, ensure_ascii=False, no trailing newline
P.write_text(json.dumps(doc, indent=1, ensure_ascii=False))

doc2 = json.loads(P.read_text())
vs2 = doc2["vessels"] if isinstance(doc2, dict) else doc2
h2 = [s for s in vs2 if s.get("id") == "azzam"][0]["hull"]
assert h2["sheerBow"] == -0.8 and h2["bowTopM"] == 8.2
print("azzam sheerBow 3.0 -> -0.8, bowTopM 8.2 recorded; fleet untouched")
