#!/usr/bin/env python3
"""Bake a shore DEM patch for a battle from Terrain Tiles on AWS (Mapzen terrarium).

The round-83 Salamis patch was baked with an uncommitted one-off; this is that bake as a
tool, so the next coast (Gravelines, Lepanto, Myeongnyang) is a command and not an
archaeology project. The output is the app's own encoding — 16-bit metres in R/G,
v16 = (elev + 11000) / 20000 * 65535, R = v16 >> 8, G = v16 & 255 — the same numbers
web/shaders/BT_LAND_*.glsl and battle.js btShoreLoad decode.

  python3 Research/bake-shore.py --lon0 1.55 --lat0 50.85 --lon1 2.55 --lat1 51.15 \
      --out build/staging/gravelines.png [--mpp 30]

Treatments, both stated in ASSETS.json when the patch ships:
  * water cells (elev <= 0) floored to -8 m — terrarium's nearshore bathymetry gap
    encodes harbour water as 0 m, and a 0 m seabed breaks the rendered sea surface;
  * sub-2 m offshore specks despeckled to -8 m — raster noise renders as grey
    pancakes among a fleet (the round-83 Salamis lesson, 382 specks in the channel).

A speck is a connected component of land (elev > 0) with no cell reaching
--speck-max metres — shoal noise in the raster's nearshore gap. Real land
(Psyttaleia at Salamis, a dune line at Gravelines) contains ground above the bar
and survives whole, however low its skirts.
"""
import argparse, io, math, sys, urllib.request
from pathlib import Path

TILE = 256
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def merc_y(lat_deg, z):
    lat = math.radians(lat_deg)
    n = 2.0 ** z
    return (1.0 - math.log(math.tan(lat) + 1.0 / math.cos(lat)) / math.pi) / 2.0 * n


def fetch_tile(z, x, y, cache):
    p = cache / f"{z}_{x}_{y}.png"
    if not p.exists():
        with urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=30) as r:
            p.write_bytes(r.read())
    from PIL import Image
    return Image.open(io.BytesIO(p.read_bytes())).convert("RGB")


def main():
    from PIL import Image
    import numpy as np

    ap = argparse.ArgumentParser()
    ap.add_argument("--lon0", type=float, required=True)
    ap.add_argument("--lat0", type=float, required=True)
    ap.add_argument("--lon1", type=float, required=True)
    ap.add_argument("--lat1", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--zoom", type=int, default=12)
    ap.add_argument("--mpp", type=float, default=30.0, help="output metres per pixel")
    ap.add_argument("--speck-max", type=float, default=2.0)
    ap.add_argument("--cache", default="build/staging/tiles")
    a = ap.parse_args()

    z = a.zoom
    n = 2 ** z
    x0 = int((a.lon0 + 180) / 360 * n)
    x1 = int((a.lon1 + 180) / 360 * n)
    y0 = int(merc_y(a.lat1, z))          # north edge = smaller Mercator y
    y1 = int(merc_y(a.lat0, z))
    cache = Path(a.cache); cache.mkdir(parents=True, exist_ok=True)

    cols, rows = x1 - x0 + 1, y1 - y0 + 1
    print(f"tiles z{z} x{x0}-{x1} y{y0}-{y1} ({cols}x{rows} = {cols*rows})")
    mosaic = np.zeros((rows * TILE, cols * TILE, 3), dtype=np.uint8)
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            im = fetch_tile(z, tx, ty, cache)
            mosaic[(ty - y0) * TILE:(ty - y0 + 1) * TILE,
                   (tx - x0) * TILE:(tx - x0 + 1) * TILE] = np.asarray(im)
    elev_m = (mosaic[:, :, 0].astype(np.float64) * 256.0
              + mosaic[:, :, 1].astype(np.float64)
              + mosaic[:, :, 2].astype(np.float64) / 256.0) - 32768.0

    # output grid: equirectangular at ~mpp, bilinear from the Mercator mosaic
    lat_mid = (a.lat0 + a.lat1) / 2
    W = round((a.lon1 - a.lon0) * 111320 * math.cos(math.radians(lat_mid)) / a.mpp)
    H = round((a.lat1 - a.lat0) * 111132 / a.mpp)
    print(f"output {W}x{H} ({(a.lon1-a.lon0):.2f} x {(a.lat1-a.lat0):.2f} deg)")

    lons = a.lon0 + (np.arange(W) + 0.5) / W * (a.lon1 - a.lon0)
    lats = a.lat1 - (np.arange(H) + 0.5) / H * (a.lat1 - a.lat0)   # row 0 = north
    gx = ((lons + 180) / 360 * n - x0) * TILE - 0.5
    gy = (np.array([merc_y(la, z) for la in lats]) - y0) * TILE - 0.5
    gx = np.clip(gx, 0, mosaic.shape[1] - 1.001)
    gy = np.clip(gy, 0, mosaic.shape[0] - 1.001)
    xi = gx.astype(int); yi = gy.astype(int)
    fx = gx - xi; fy = (gy - yi)[:, None]
    E = (elev_m[yi][:, xi] * (1 - fx) * (1 - fy)
         + elev_m[yi][:, xi + 1] * fx * (1 - fy)
         + elev_m[yi + 1][:, xi] * (1 - fx) * fy
         + elev_m[yi + 1][:, xi + 1] * fx * fy)

    wet = E <= 0.0
    E[wet] = np.minimum(E[wet], -8.0)

    # despeckle: land is kept only where its connected component contains ground above
    # the bar. Reached-set grown from those anchors by 4-neighbour dilation within the
    # land mask (numpy only; the Studio venv has no scipy).
    land = E > 0
    reach = land & (E >= a.speck_max)
    while True:
        grown = reach.copy()
        grown[1:, :] |= reach[:-1, :]
        grown[:-1, :] |= reach[1:, :]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= land
        if (grown == reach).all():
            break
        reach = grown
    speck = land & ~reach
    E[speck] = -8.0
    print(f"despeckled {int(speck.sum())} land cells in components never reaching {a.speck_max} m")

    v16 = np.clip(np.round((E + 11000.0) / 20000.0 * 65535.0), 0, 65535).astype(np.uint32)
    out = np.zeros((H, W, 3), dtype=np.uint8)
    out[:, :, 0] = v16 >> 8
    out[:, :, 1] = v16 & 255
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGB").save(a.out, optimize=True)
    land_frac = float((E > 0).mean())
    print(f"wrote {a.out}  land {land_frac*100:.1f}%  elev {E.min():.0f}..{E.max():.0f} m")


if __name__ == "__main__":
    sys.exit(main())
