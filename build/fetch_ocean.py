#!/usr/bin/env python3
"""fetch_ocean.py — the measured ocean-surface fields.

NASA's Earth Observations archive is **public domain, needs no login**, and it is the only
global source of this shape that we may bake into a public static site without a licence
argument. Grids are plate carree, row 0 = +90, so no reprojection is required — the
coordinate-frame risk that dominates this kind of project is simply absent for this family.

WHAT EACH FIELD IS FOR. Every one has a job; none is decoration.

  AVHRR_CLIM_M    12-month sea-surface-temperature CLIMATOLOGY (1985 label = the climatology
                  year, not a real year). -> the water's own colour and the ice threshold.
                  NOTE FOR ANYONE ARRIVING FROM Mother Tongues: that project wired this in as
                  a *vegetation* climatology and saturated every land pixel. Its name is
                  misleading there and exactly right here: this IS sea surface temperature,
                  range about -2..32 degC, NaN over land.
  MY1DMM_CHLORA   monthly chlorophyll-a, 2023. -> the ocean is not one blue. Shelf and
                  upwelling water is green and turbid; the subtropical gyres are the clearest
                  water on Earth. Without this the sea reads as a flat blue plane, which is
                  the single most common way an ocean map fails.
  MODAL2_M_CLD_FR monthly cloud fraction, 2023. -> the ITCZ, the storm tracks and the
                  subtropical cloud-free deserts, drawn from measurement rather than invented.
                  The doldrums are visible in this field.
  NISE_D          near-real-time ice and snow extent, mid-month. -> a MEASURED ice margin. The
                  Northwest and Northeast Passages are a question about this field.

  GEBCO_BATHY     fetched only as an independent WITNESS for the bathymetry we ship from
                  ETOPO1. It is never composited into the surface; two bathymetries in one
                  render is the "two consumers of the terrain" bug by construction.

Run: python3 fetch_ocean.py
"""
from __future__ import annotations

import os
import ssl
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "ocean")
BASE = "https://neo.gsfc.nasa.gov/archive/geotiff.float"
UA = "Ships/1.0 (research atlas; augustgweon@gmail.com)"

MONTHS = [f"{m:02d}" for m in range(1, 13)]

WANT: list[tuple[str, str]] = []
for m in MONTHS:
    WANT.append((f"AVHRR_CLIM_M/AVHRR_CLIM_M_1985-{m}.FLOAT.TIFF", f"sst_{m}.tif"))
    WANT.append((f"MODAL2_M_CLD_FR/MODAL2_M_CLD_FR_2023-{m}.FLOAT.TIFF", f"cloud_{m}.tif"))

_CHL_END = {"01": "31", "02": "28", "03": "31", "04": "30", "05": "31", "06": "30",
            "07": "31", "08": "31", "09": "30", "10": "31", "11": "30", "12": "31"}
for m in MONTHS:
    fn = f"AQUA_MODIS.2023{m}01_2023{m}{_CHL_END[m]}.L3m.MO.CHL.chlor_a.4km.tif"
    WANT.append((f"MY1DMM_CHLORA/{fn}", f"chl_{m}.tif"))

# NISE is daily and its archive is gappy: 2019-01-15 and 2019-02-15 do not exist. Each month
# carries a list of candidate days and the first one that resolves wins, so a gap costs a
# neighbouring day rather than a missing month. A missing ice month would silently open the
# Northwest Passage in the month it is most firmly shut.
NISE_DAYS = {
    "01": ["2020-01-15", "2019-01-16", "2018-01-15"],
    "02": ["2020-02-15", "2019-02-16", "2018-02-15"],
    "03": ["2019-03-15", "2020-03-15"], "04": ["2019-04-15", "2020-04-15"],
    "05": ["2019-05-15", "2020-05-15"], "06": ["2019-06-15", "2020-06-15"],
    "07": ["2019-07-15", "2020-07-15"], "08": ["2019-08-15", "2020-08-15"],
    "09": ["2019-09-15", "2020-09-15"], "10": ["2019-10-15", "2020-10-15"],
    "11": ["2019-11-15", "2020-11-15"], "12": ["2019-12-15", "2020-12-15"],
}

WITNESS = [("GEBCO_BATHY/GEBCO_BATHY_2002.FLOAT.TIFF", "witness_gebco.tif")]


def get(rel: str, dest: str, tries: int = 3) -> bool:
    p = os.path.join(OUT, dest)
    if os.path.exists(p) and os.path.getsize(p) > 4096:
        return True
    url = f"{BASE}/{rel}"
    ctx = ssl.create_default_context()
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=300, context=ctx) as r, \
                    open(p + ".part", "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            if os.path.getsize(p + ".part") < 4096:
                raise OSError("suspiciously small")
            os.replace(p + ".part", p)
            print(f"  ok   {dest:22s} {os.path.getsize(p)/1e6:7.1f} MB")
            return True
        except Exception as e:  # noqa: BLE001 - a fetch failure is reported, never swallowed
            print(f"  retry{i+1} {dest:22s} {e}")
            time.sleep(2 + 3 * i)
    print(f"  FAIL {dest}")
    return False


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    bad = []
    for rel, dest in WANT:
        if not get(rel, dest):
            bad.append(dest)

    for m, days in NISE_DAYS.items():
        dest = f"ice_{m}.tif"
        if os.path.exists(os.path.join(OUT, dest)):
            continue
        for d in days:
            if get(f"NISE_D/NISE_D_{d}.FLOAT.TIFF", dest):
                break
        else:
            bad.append(dest)

    for rel, dest in WITNESS:
        get(rel, dest)

    if bad:
        print(f"\n{len(bad)} MISSING: {', '.join(bad)}")
        print("A missing month is not a cosmetic gap — the seasonal cycle is the argument.")
        return 1
    print(f"\nall present in {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
