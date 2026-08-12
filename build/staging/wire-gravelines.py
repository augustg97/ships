#!/usr/bin/env python3
"""Round 84: wire the Gravelines shore patch into the armada record.

Adds the shore block (bounds + witnesses + cite), re-lays days 7 and 8 into validated
water (day 7's English fleet was on the beach west of Calais at 2.1 m, day 8's anchor
6.0 m up the sand east of the town — the Salamis day-5 class, caught by probing the
staged patch before wiring), copies the baked PNG into web/data/terrain/, and appends
the ASSETS.json provenance entry. Compact single-line JSON, ensure_ascii=False — the
r80 authoring script buried its one real change in a whole-file escape rewrite.
"""
import json, shutil
from pathlib import Path

root = Path(__file__).resolve().parents[2]

bp = root / "web/data/battles.json"
data = json.loads(bp.read_text())
armada = next(b for b in data["battles"] if b["id"] == "armada")

d7 = armada["campaign"][7]
assert d7["d"] == "6 Aug" and d7["lon"] == 1.85 and d7["lat"] == 50.97
d7["lon"], d7["lat"] = 1.87, 51.00          # Calais Roads proper; both fleets afloat

d8 = armada["campaign"][8]
assert d8["d"] == "7 Aug" and d8["lon"] == 1.9 and d8["lat"] == 50.98
d8["lon"], d8["lat"] = 1.87, 50.99          # the anchorage the fireships came into

armada["shore"] = {
    "src": "data/terrain/gravelines.png",
    "lon0": 1.55, "lat0": 50.85, "lon1": 2.55, "lat1": 51.15,
    "probes": [
        {"n": "Cap Blanc-Nez", "lon": 1.71, "lat": 50.925, "land": True},
        {"n": "Calais town", "lon": 1.855, "lat": 50.948, "land": True},
        {"n": "Gravelines town", "lon": 2.126, "lat": 50.987, "land": True},
        {"n": "Calais Roads", "lon": 1.87, "lat": 50.99, "land": False},
        {"n": "off Gravelines, the action's water", "lon": 2.10, "lat": 51.04, "land": False},
        {"n": "the strait toward Dover", "lon": 2.0, "lat": 51.10, "land": False},
    ],
    "cite": "Terrain Tiles on AWS (Mapzen terrarium, zoom 12, ~30 m/px; land from "
            "SRTM/EU-DEM, offshore from ETOPO1). Water cells floored to -8 m; land "
            "components never reaching 2 m despeckled (shoal noise in the raster's "
            "nearshore gap; the Flemish banks are tidal and drawn as water). The "
            "coastline (the 0-crossing) is the raster's own.",
}
bp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))

(root / "web/data/terrain").mkdir(exist_ok=True)
shutil.copyfile(root / "build/staging/gravelines.png",
                root / "web/data/terrain/gravelines.png")

ap = root / "web/data/assets/ASSETS.json"
assets = json.loads(ap.read_text())
if not any(a.get("path") == "web/data/terrain/gravelines.png" for a in assets["assets"]):
    assets["assets"].append({
        "path": "web/data/terrain/gravelines.png",
        "what": "Elevation patch for the Calais-Gravelines-Dunkirk coast (lon 1.55-2.55, "
                "lat 50.85-51.15, 2335x1111, ~30 m/px), 16-bit metres in the app's own "
                "(elev+11000)/20000 R/G encoding",
        "source": "Terrain Tiles on AWS (Mapzen 'terrarium' tiles, zoom 12, tiles "
                  "x2065-2077 y1368-1373), an AWS Open Data set; land heights from "
                  "SRTM/EU-DEM, offshore from ETOPO1",
        "license": "Public domain / CC0-equivalent per the Terrain Tiles on AWS "
                   "attribution terms; underlying SRTM is US government public domain",
        "fetched": "2026-08-11",
        "treatment": "Mercator tiles mosaicked and resampled to an equirectangular grid "
                     "by Research/bake-shore.py; water cells (elev <= 0) floored to -8 m; "
                     "land components never reaching 2 m drowned as shoal noise (8368 "
                     "cells, mostly the tidal Flemish banks, which the sea surface owns). "
                     "The coastline - the 0-crossing - is the raster's own.",
    })
    ap.write_text(json.dumps(assets, ensure_ascii=False, indent=2) + "\n")
print("wired: shore block, day 7 -> (1.87, 51.00), day 8 -> (1.87, 50.99), PNG, ASSETS")
