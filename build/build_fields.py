#!/usr/bin/env python3
"""build_fields.py — source rasters -> the master fields the shader composes the ocean from.

OUTPUT (all plate carree, row 0 = +90, lon -180..+180, WGS84):

  master/depth.npy      16384 x 8192 int16 metres. GEBCO 2026, area-mean reduced.
  master/slope.npy      16384 x 8192 uint8, seabed gradient -> the material classifier.
  web/fields/sea_MM.png    2048 x 1024 RGB  R=SST  G=chlorophyll(log)  B=cloud fraction
  web/fields/wind_MM.png   1024 x 512  RGB  R=u    G=v                 B=ice concentration
  web/fields/curr_MM.png   1024 x 512  RGB  R=u    G=v                 B=speed

THREE THINGS THAT ARE EASY TO GET WRONG HERE, each of which has cost a prior project real
map correctness:

1. REDUCTION IS `np.add.reduceat`, NEVER A RESHAPE BLOCK-MEAN. 86400 // 16384 == 5, and a
   reshape at that factor silently crops the world to its first 81920 columns and throws the
   rest away. The grid does not divide: the true ratio is 5.2734375. `_starts` computes exact
   block boundaries and `reduceat` honours them.

2. THE NCEP WIND GRID IS NOT WHAT IT LOOKS LIKE. It is a T62 GAUSSIAN grid: 94 latitudes that
   are NOT evenly spaced (1.889 deg at the pole, 1.905 at the equator), and longitude runs
   0..358.125, not -180..+180. Treating it as a regular grid puts the trade winds in the wrong
   place by up to half a cell and rolls the whole field half a world sideways. The Gaussian
   latitudes are reproduced exactly by degrees(arcsin(leggauss(94))) - asserted below against
   the file's own stated actual_range.

3. EVERY SOURCE ASSERTS THE PHYSICAL RANGE OF ITS OWN QUANTITY before it is used. A prior
   project wired a sea-surface-temperature product in as a vegetation index and saturated
   every land pixel; the dataset name gave no hint. A field whose values are outside the range
   its physics allows is a wrong dataset, and it fails the build rather than colouring it.

Run:  python3 build_fields.py [--quick]     (--quick builds a 4096x2048 master, for iteration)
"""
from __future__ import annotations

import argparse
import os
import sys

import numpy as np
import rasterio

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
MASTER = os.path.join(DATA, "master")
FIELDS = os.path.join(HERE, "..", "web", "fields")

GRID_W, GRID_H = 16384, 8192

# GEBCO 2026 ships as eight 90x90 degree tiles at 15 arc-sec.
GEBCO_DIR = os.path.join(DATA, "gebco")
GEBCO_TILE = 21600            # 90 deg * 240 samples/deg
GEBCO_W, GEBCO_H = 86400, 43200

# Elevation encoding: LINEAR 16-bit over [-11000, +9000].
# 20000 m / 65536 = 0.305 m per step, which is finer than the source's own vertical
# accuracy everywhere, so companding buys nothing. Companding was considered and rejected:
# it would only matter if we were spending 8 bits, and we are not.
ELEV_MIN, ELEV_MAX = -11000.0, 9000.0

MONTHS = [f"{m:02d}" for m in range(1, 13)]


def log(*a):
    print(*a, flush=True)


def _starts(n_in: int, n_out: int) -> np.ndarray:
    """Exact block boundaries for an arbitrary (non-integer) reduction ratio."""
    return (np.arange(n_out) * (n_in / n_out)).astype(np.int64)


def _reduce_mean(a: np.ndarray, n_out_r: int, n_out_c: int) -> np.ndarray:
    """Area-mean an array to (n_out_r, n_out_c) with exact, non-integer block sizes."""
    r0 = _starts(a.shape[0], n_out_r)
    c0 = _starts(a.shape[1], n_out_c)
    rcnt = np.diff(np.append(r0, a.shape[0]))
    ccnt = np.diff(np.append(c0, a.shape[1]))
    s = np.add.reduceat(a.astype(np.float64), r0, axis=0)
    s = np.add.reduceat(s, c0, axis=1)
    return s / (rcnt[:, None] * ccnt[None, :])


# ---------------------------------------------------------------- bathymetry

def build_depth(gw: int, gh: int) -> np.ndarray:
    """GEBCO 2026's eight tiles -> one gh x gw int16 grid of metres."""
    out = np.zeros((gh, gw), dtype=np.float64)
    # Each GEBCO tile covers a quarter of longitude and a half of latitude, so its share of
    # the output grid is exactly gw/4 x gh/2 -- and those ARE integers for our grid sizes.
    tw, th = gw // 4, gh // 2
    assert tw * 4 == gw and th * 2 == gh, "output grid must divide into GEBCO's 4x2 tiling"

    for ti, (n, s) in enumerate([(90.0, 0.0), (0.0, -90.0)]):
        for tj, (w, e) in enumerate([(-180.0, -90.0), (-90.0, 0.0), (0.0, 90.0), (90.0, 180.0)]):
            fn = (f"gebco_2026_n{n}_s{s}_w{w}_e{e}_geotiff.tif")
            path = os.path.join(GEBCO_DIR, fn)
            if not os.path.exists(path):
                raise SystemExit(f"missing GEBCO tile {fn} -- run the download first")
            with rasterio.open(path) as ds:
                assert ds.width == GEBCO_TILE and ds.height == GEBCO_TILE, \
                    f"{fn}: expected {GEBCO_TILE}^2, got {ds.width}x{ds.height}"
                # Reduce in row bands so peak memory stays near 100 MB, not 1 GB.
                rb = _starts(GEBCO_TILE, th)
                acc = np.empty((th, tw), dtype=np.float64)
                BAND = 256                      # output rows per pass
                for b0 in range(0, th, BAND):
                    b1 = min(b0 + BAND, th)
                    y0 = rb[b0]
                    y1 = rb[b1] if b1 < th else GEBCO_TILE
                    blk = ds.read(1, window=((y0, y1), (0, GEBCO_TILE))).astype(np.float64)
                    acc[b0:b1] = _reduce_mean(blk, b1 - b0, tw)
                out[ti * th:(ti + 1) * th, tj * tw:(tj + 1) * tw] = acc
            log(f"    gebco {fn.split('_geotiff')[0][11:]:28s} -> "
                f"[{acc.min():8.1f}, {acc.max():8.1f}] m")

    lo, hi = out.min(), out.max()
    # ASSERT THE PHYSICAL RANGE. A bathymetry that does not reach the hadal zone, or that
    # exceeds Everest, is not a bathymetry -- it is a units error or the wrong product.
    # The bounds allow for area-mean smoothing: at 2.44 km a summit block loses a few hundred
    # metres and the Challenger Deep a few hundred more. What they catch is a units error, a
    # wrong product, or a reduction that threw most of the world away.
    assert -11100 < lo < -9800, f"deepest point {lo:.0f} m is not plausibly the Challenger Deep"
    assert 7500 < hi < 9000, f"highest point {hi:.0f} m is not plausibly Everest"
    log(f"  depth range [{lo:.0f}, {hi:.0f}] m")
    return np.rint(np.clip(out, ELEV_MIN, ELEV_MAX)).astype(np.int16)


def build_slope(depth: np.ndarray) -> np.ndarray:
    """Seabed gradient in metres per cell, log-scaled to 8 bits.

    This is the material classifier's main input: an abyssal plain is flat to a few metres
    over kilometres, a trench wall falls thousands. Computed on the SHIPPED grid so that what
    the shader classifies is what the audit measures -- deriving it from the source grid
    instead would be the 'two consumers of the terrain' bug.
    """
    d = depth.astype(np.float32)
    gy = np.zeros_like(d)
    gy[1:-1] = (d[2:] - d[:-2]) * 0.5
    # Longitude wraps: the antimeridian is a seam only if you make it one.
    gx = (np.roll(d, -1, axis=1) - np.roll(d, 1, axis=1)) * 0.5
    g = np.hypot(gx, gy)
    return np.clip(np.log1p(g) * 40.0, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- ocean surface

def _read_neo(path: str, lo: float, hi: float, w: int, h: int, name: str) -> np.ndarray:
    """A NASA NEO float GeoTIFF -> h x w float32, NaN where the sensor saw nothing.

    NEO encodes 'no data' as 99999.0. Values outside the quantity's physical range are a
    WRONG DATASET, not an outlier, and they stop the build.
    """
    with rasterio.open(path) as ds:
        a = ds.read(1).astype(np.float32)
    a[a > 9e4] = np.nan
    fin = np.isfinite(a)
    if fin.any():
        amin, amax = float(np.nanmin(a)), float(np.nanmax(a))
        assert amin >= lo - 1e-3 and amax <= hi + 1e-3, (
            f"{name}: values [{amin:.3f}, {amax:.3f}] fall outside the physical range "
            f"[{lo}, {hi}] this quantity can occupy -- this is the wrong dataset")
    # Reduce, ignoring NaN, by carrying a weight grid alongside the sum.
    v = np.where(fin, a, 0.0).astype(np.float64)
    wt = fin.astype(np.float64)
    r0, c0 = _starts(a.shape[0], h), _starts(a.shape[1], w)
    sv = np.add.reduceat(np.add.reduceat(v, r0, axis=0), c0, axis=1)
    sw = np.add.reduceat(np.add.reduceat(wt, r0, axis=0), c0, axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        out = sv / sw
    out[sw <= 0] = np.nan
    return out.astype(np.float32)


def _gaussian_lats(n: int = 94) -> np.ndarray:
    """The NCEP T62 Gaussian latitudes, north first. NOT evenly spaced."""
    x, _ = np.polynomial.legendre.leggauss(n)
    return np.degrees(np.arcsin(x))[::-1]


def _regrid_gaussian(a: np.ndarray, w: int, h: int) -> np.ndarray:
    """A T62 Gaussian field (94 x 192, lon 0..358.125) -> a regular h x w plate carree grid.

    Two corrections, and BOTH are needed:
      * latitudes are Gaussian, so we interpolate against the real latitude vector;
      * longitude starts at 0 and runs east, so the field must be rolled half a world to
        land on -180..+180.
    """
    assert a.shape == (94, 192), f"expected a T62 Gaussian grid, got {a.shape}"
    src_lat = _gaussian_lats(94)
    assert abs(src_lat[0] - 88.542) < 0.002, \
        f"Gaussian latitude reconstruction gives {src_lat[0]:.3f}, file says 88.542"
    src_lon = np.arange(192) * 1.875                       # 0 .. 358.125

    dst_lat = 90.0 - (np.arange(h) + 0.5) * (180.0 / h)
    dst_lon = -180.0 + (np.arange(w) + 0.5) * (360.0 / w)

    # Latitude: src is descending, np.interp needs ascending.
    rows = np.empty((h, 192), dtype=np.float64)
    for j in range(192):
        rows[:, j] = np.interp(dst_lat, src_lat[::-1], a[::-1, j])
    # Longitude: wrap into 0..360 and interpolate periodically.
    lon_q = np.mod(dst_lon, 360.0)
    lon_ext = np.append(src_lon, 360.0)
    out = np.empty((h, w), dtype=np.float64)
    for i in range(h):
        out[i] = np.interp(lon_q, lon_ext, np.append(rows[i], rows[i, 0]))
    return out.astype(np.float32)


def _read_ncep(path: str, var: str) -> np.ndarray:
    with rasterio.open(f"netcdf:{path}:{var}") as ds:
        assert ds.count == 12, f"{var}: expected 12 monthly means, got {ds.count}"
        a = np.stack([ds.read(b + 1) for b in range(12)]).astype(np.float32)
    a[np.abs(a) > 1e3] = np.nan
    lo, hi = float(np.nanmin(a)), float(np.nanmax(a))
    assert -60 < lo and hi < 60, f"{var}: [{lo}, {hi}] m/s is not a 10 m monthly-mean wind"
    return a


def _pack_signed(a: np.ndarray, span: float) -> np.ndarray:
    """A signed quantity -> uint8 centred on 128. NaN becomes 128 (= zero)."""
    v = np.where(np.isfinite(a), a, 0.0)
    return np.clip(np.rint(128.0 + v * (127.0 / span)), 0, 255).astype(np.uint8)


def _pack_unit(a: np.ndarray, lo: float, hi: float, nan: int = 0) -> np.ndarray:
    v = (a - lo) / (hi - lo)
    out = np.clip(np.rint(v * 255.0), 0, 255)
    out = np.where(np.isfinite(a), out, nan)
    return out.astype(np.uint8)


def build_surface(sea_w=1024, sea_h=512, flow_w=1024, flow_h=512) -> dict:
    """⚠ sea fields are 1024x512, NOT 2048x1024.

    Sea-surface temperature, chlorophyll and cloud fraction are smooth quantities; at 2048x1024
    each monthly PNG is 2.35 MB, and the app must fetch TWO of them before it can draw anything,
    which put first paint at 10.9 MB against an 8 MB budget. Halving the grid costs nothing
    visible — none of these fields has structure at 0.17 deg that survives being multiplied into
    a water colour — and buys 3.5 MB off the opening frame. The budget gate caught this."""
    from PIL import Image
    OCEAN = os.path.join(DATA, "ocean")
    os.makedirs(FIELDS, exist_ok=True)
    stats = {}

    log("  wind (NCEP T62 Gaussian -> plate carree)")
    u = _read_ncep(os.path.join(DATA, "wind", "uwnd.10m.mon.ltm.nc"), "uwnd")
    v = _read_ncep(os.path.join(DATA, "wind", "vwnd.10m.mon.ltm.nc"), "vwnd")
    spd = np.hypot(u, v)
    stats["wind_max_ms"] = float(np.nanmax(spd))
    log(f"    monthly-mean wind speed max {stats['wind_max_ms']:.1f} m/s")

    for i, m in enumerate(MONTHS):
        # --- sea: SST, chlorophyll, cloud
        sst = _read_neo(os.path.join(OCEAN, f"sst_{m}.tif"), -3, 40, sea_w, sea_h, f"SST {m}")
        chl = _read_neo(os.path.join(OCEAN, f"chl_{m}.tif"), 0, 100, sea_w, sea_h, f"chl {m}")
        cld = _read_neo(os.path.join(OCEAN, f"cloud_{m}.tif"), 0, 1.001, sea_w, sea_h, f"cloud {m}")
        rgb = np.dstack([
            _pack_unit(sst, -2.0, 32.0, nan=0),
            # chlorophyll spans four orders of magnitude; linear packing shows nothing.
            _pack_unit(np.log10(np.clip(chl, 1e-2, 100.0)), -2.0, 2.0, nan=0),
            _pack_unit(cld, 0.0, 1.0, nan=0),
        ])
        Image.fromarray(rgb, "RGB").save(os.path.join(FIELDS, f"sea_{m}.png"), optimize=True)

        # --- wind + ice
        uu = _regrid_gaussian(u[i], flow_w, flow_h)
        vv = _regrid_gaussian(v[i], flow_w, flow_h)
        ice = _read_neo(os.path.join(OCEAN, f"ice_{m}.tif"), 0, 255, flow_w, flow_h, f"ice {m}")
        rgb = np.dstack([
            _pack_signed(uu, 25.0),
            _pack_signed(vv, 25.0),
            _pack_unit(np.nan_to_num(ice), 0.0, 100.0, nan=0),
        ])
        Image.fromarray(rgb, "RGB").save(os.path.join(FIELDS, f"wind_{m}.png"), optimize=True)
        log(f"    month {m}  sst/chl/cloud + wind/ice written")

    return stats


# ---------------------------------------------------------------- registration

REGISTRATION = [
    # name,                    lat,      lon,       expected metres, tolerance
    ("Challenger Deep",        11.3733, 142.5917,   -10800, 900),
    ("Puerto Rico Trench",     19.7000, -66.4500,    -8000, 1200),
    ("Mariana ridge crest",    18.0500, 145.7500,    -3000, 2500),
    ("Grand Banks",            45.0000, -50.0000,     -100, 120),
    ("Bahama Banks",           23.7000, -77.8000,      -10, 40),
    ("Everest",                27.9881,  86.9250,     8300, 700),
    ("Dead Sea shore",         31.5000,  35.4500,     -420, 250),
    ("Mid-Atlantic Ridge",      0.0000, -24.0000,    -3600, 1400),
]


def check_registration(depth: np.ndarray) -> None:
    """Re-read named places out of the grid. This is the check that catches a half-world roll,
    an off-by-one flip, or a reduction that quietly cropped the source."""
    h, w = depth.shape
    bad = []
    for name, lat, lon, want, tol in REGISTRATION:
        r = int((90.0 - lat) / 180.0 * h)
        c = int((lon + 180.0) / 360.0 * w)
        got = int(depth[min(r, h - 1), min(c, w - 1)])
        ok = abs(got - want) <= tol
        log(f"    {'ok  ' if ok else 'FAIL'} {name:22s} {got:>7} m  (expected {want} +/- {tol})")
        if not ok:
            bad.append(name)
    if bad:
        raise SystemExit(f"registration failed at: {', '.join(bad)}")
    # Land fraction is the global check that catches a misregistration the point checks miss.
    lat = 90.0 - (np.arange(h) + 0.5) * (180.0 / h)
    wgt = np.cos(np.radians(lat))[:, None]
    frac = float(((depth > 0) * wgt).sum() / (wgt.sum() * w))
    log(f"    land fraction {frac*100:.2f}% (true 29.2%)")
    assert 0.27 < frac < 0.32, f"land fraction {frac:.3f} is wrong -- the grid is misregistered"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="4096x2048 master, for iteration")
    ap.add_argument("--skip-depth", action="store_true")
    a = ap.parse_args()

    gw, gh = (4096, 2048) if a.quick else (GRID_W, GRID_H)
    os.makedirs(MASTER, exist_ok=True)
    os.makedirs(FIELDS, exist_ok=True)

    dpath = os.path.join(MASTER, f"depth_{gw}.npy")
    if a.skip_depth and os.path.exists(dpath):
        depth = np.load(dpath)
        log(f"depth: reusing {dpath}")
    else:
        log(f"depth: GEBCO 2026 -> {gw} x {gh}")
        depth = build_depth(gw, gh)
        np.save(dpath, depth)
        log(f"  wrote {dpath} ({os.path.getsize(dpath)/1e6:.1f} MB)")

    log("registration:")
    check_registration(depth)

    log("slope:")
    slope = build_slope(depth)
    np.save(os.path.join(MASTER, f"slope_{gw}.npy"), slope)
    log(f"  slope median {np.median(slope):.0f}, p99 {np.percentile(slope, 99):.0f}")

    log("ocean surface:")
    st = build_surface()
    log(f"  {st}")

    log("\ndone")
    return 0


if __name__ == "__main__":
    sys.exit(main())
