#!/usr/bin/env python3
"""build_tiles.py — cut the master fields into a pyramid the browser can afford.

WHY. A 16384x8192 16-bit depth raster is one 270 MB image. Nobody waits for that and a phone
cannot hold it. The pyramid ships a 2048x1024 world that paints in well under a second, then
replaces what is on screen with detail as the camera comes in.

  level 0   2048 x 1024    2 x 1 tiles    19.5 km/px   always loaded, and the fallback
  level 1   4096 x 2048    4 x 2 tiles     9.8 km/px
  level 2   8192 x 4096    8 x 4 tiles     4.9 km/px
  level 3  16384 x 8192   16 x 8 tiles     2.44 km/px  master

CHANNELS.  R = depth high byte, G = depth low byte, B = seabed roughness.
Depth is linear 16-bit over [-11000, +9000] m -> 0.305 m per step, finer than the source's own
vertical accuracy anywhere. `depth = (R*256 + G) / 65535 * 20000 - 11000`.

THE SKIRT. Tiles are cut 1026 px square for a 1024 px core: one pixel of the neighbour on every
side. Without it, LINEAR filtering at a tile edge samples the clamp colour instead of the
neighbour, and every boundary draws a visible seam — 24 vertical lines down the Pacific. The
skirt costs 0.4% in pixels and removes the class of bug entirely.

REDUCTION IS PER FIELD and getting it wrong is not subtle:
  * depth      -> area MEAN. A continuous quantity; the mean is the value.
  * roughness  -> area MEAN. It is already a statistic of the fine grid, and averaging it is
                  what makes it scale-invariant: a coarse tile then says "how rough is the
                  floor here", which is the same question at every zoom. Taking MAX instead
                  would paint every abyssal plain with the roughness of the nearest seamount.

⚠ THE ANTIMERIDIAN IS NOT AN EDGE. Longitude wraps, so a tile's left/right skirt at the seam
comes from the far side of the grid, not from a clamp. Latitude genuinely does end, so the
top/bottom skirt clamps. Getting this backwards draws a seam down the Pacific — which is the
one place in this particular project a seam is least affordable.

Run:  python3 build_tiles.py
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = os.path.join(HERE, "..", "data", "master")
OUT = os.path.join(HERE, "..", "web", "fields")

CORE = 1024
SKIRT = 1
LEVELS = 4                     # 0..3
ELEV_MIN, ELEV_MAX = -11000.0, 9000.0


def log(*a):
    print(*a, flush=True)


def _starts(n_in: int, n_out: int) -> np.ndarray:
    return (np.arange(n_out) * (n_in / n_out)).astype(np.int64)


def reduce_mean(a: np.ndarray, fh: int, fw: int) -> np.ndarray:
    """Halve-or-more by an exact integer factor, as an area mean."""
    h, w = a.shape
    assert h % fh == 0 and w % fw == 0
    return a.reshape(h // fh, fh, w // fw, fw).mean(axis=(1, 3))


def sample(field: np.ndarray, r0: int, r1: int, c0: int, c1: int) -> np.ndarray:
    """A window with a skirt: longitude WRAPS, latitude CLAMPS."""
    h, w = field.shape
    rows = np.clip(np.arange(r0, r1), 0, h - 1)          # latitude ends at the poles
    cols = np.mod(np.arange(c0, c1), w)                  # longitude does not end
    return field[np.ix_(rows, cols)]


def main() -> int:
    dpath = os.path.join(MASTER, "depth_16384.npy")
    spath = os.path.join(MASTER, "slope_16384.npy")
    if not os.path.exists(dpath):
        raise SystemExit("run build_fields.py first")

    depth = np.load(dpath).astype(np.float32)
    rough = np.load(spath).astype(np.float32)
    os.makedirs(OUT, exist_ok=True)

    manifest = {"core": CORE, "skirt": SKIRT, "levels": [],
                "elevMin": ELEV_MIN, "elevMax": ELEV_MAX}
    total_bytes = 0

    for lv in range(LEVELS - 1, -1, -1):
        f = 1 << (LEVELS - 1 - lv)                       # 8,4,2,1 for levels 0..3
        d = depth if f == 1 else reduce_mean(depth, f, f)
        g = rough if f == 1 else reduce_mean(rough, f, f)
        h, w = d.shape
        nx, ny = w // CORE, h // CORE
        assert nx * CORE == w and ny * CORE == h, f"level {lv}: {w}x{h} is not a whole tile grid"

        # 16-bit linear encode, done ONCE per level on the whole grid so that a tile and its
        # skirt can never disagree about a pixel's value.
        q = np.clip((d - ELEV_MIN) / (ELEV_MAX - ELEV_MIN), 0, 1)
        u16 = np.rint(q * 65535.0).astype(np.uint16)
        hi = (u16 >> 8).astype(np.uint8)
        lo = (u16 & 0xFF).astype(np.uint8)
        rb = np.clip(g, 0, 255).astype(np.uint8)

        lvdir = os.path.join(OUT, f"z{lv}")
        os.makedirs(lvdir, exist_ok=True)
        wrote = 0
        for ty in range(ny):
            for tx in range(nx):
                r0, c0 = ty * CORE - SKIRT, tx * CORE - SKIRT
                r1, c1 = r0 + CORE + 2 * SKIRT, c0 + CORE + 2 * SKIRT
                rgb = np.dstack([
                    sample(hi, r0, r1, c0, c1),
                    sample(lo, r0, r1, c0, c1),
                    sample(rb, r0, r1, c0, c1),
                ])
                p = os.path.join(lvdir, f"{tx}_{ty}.png")
                Image.fromarray(rgb).save(p, optimize=True)
                total_bytes += os.path.getsize(p)
                wrote += 1
        sz = sum(os.path.getsize(os.path.join(lvdir, x)) for x in os.listdir(lvdir))
        manifest["levels"].append({"level": lv, "w": w, "h": h, "nx": nx, "ny": ny,
                                   "tiles": wrote, "bytes": sz})
        log(f"  z{lv}  {w:>5} x {h:<5}  {nx:>2} x {ny:<2} = {wrote:>3} tiles  {sz/1e6:7.1f} MB"
            f"  {40075.0/w:6.2f} km/px")

    manifest["levels"].sort(key=lambda x: x["level"])
    with open(os.path.join(OUT, "tiles.json"), "w") as f:
        json.dump(manifest, f, indent=1)

    l0 = next(x for x in manifest["levels"] if x["level"] == 0)
    log(f"\ntotal {total_bytes/1e6:.1f} MB;  first paint blocks on z0 = {l0['bytes']/1e6:.2f} MB")

    # A decode round-trip on the SHIPPED bytes, not on the array in memory. This is the check
    # that catches an encoding that is wrong in a way the array never shows.
    t = np.asarray(Image.open(os.path.join(OUT, "z0", "0_0.png")))
    px = t[SKIRT:-SKIRT, SKIRT:-SKIRT]
    dec = (px[:, :, 0].astype(np.float32) * 256 + px[:, :, 1]) / 65535.0 * 20000.0 - 11000.0
    ref = reduce_mean(depth, 8, 8)[:CORE, :CORE]
    err = float(np.abs(dec - ref).max())
    log(f"round-trip through the shipped PNG: max error {err:.3f} m (quantum 0.305 m)")
    assert err < 0.4, "the shipped tile does not decode to the field it was made from"
    return 0


if __name__ == "__main__":
    sys.exit(main())
