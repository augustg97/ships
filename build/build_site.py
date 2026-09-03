#!/usr/bin/env python3
"""build_site.py — the ONLY publication route. web/ -> docs/, with the gate in front of it.

The gate, in order, and each item is here because something like it has silently shipped
broken before:

  1. the research selftests must pass                     (WORKING-RULES §11)
  2. every field the app binds must exist on disk
  3. the shipped raster must still register against named seafloor features — re-read from
     the PNG in docs/, not from the array that made it                     (§8, and TRAPS §A1)
  4. the data files must parse and carry the layers the app expects
  5. the byte budget                                                      (SCOPE §12)
  6. THE STAMP IS WRITTEN BEFORE THE APP FILE IS COPIED. A static host serves stale JSON after
     a successful push and the failure is silent — the app runs perfectly and shows yesterday's
     data.                                                                (WORKING-RULES §6)

Run: python3 build_site.py
"""
from __future__ import annotations

import json
import os, sys
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")
DOCS = os.path.join(HERE, "..", "docs")
RESEARCH = os.path.join(HERE, "..", "Research", "modeling")

# ── THE FIRST-PAINT BUDGET, AND WHY IT MOVED (2026-08-04) ─────────────────────────────
# 8.0 MB was set when the app had three views. It now has four: the Passage puts a full-detail
# hull on a real sea at a real position, and it arrives with a 2048x1024 land mask and an A*
# passage search in route.js, a wave model shared across every view, and the shader that draws
# water as water rather than as colour. The code that does all of that is 1.20 MB of the 8.00;
# the other 6.80 is unchanged raster and field data.
#
# Raised to 8.6, which is the same 0.6 MB of headroom the original figure carried, NOT a licence
# to grow: the level-0 tiles (4.86 MB) and the two month keyframes (1.68 MB) are still 82% of
# first paint and are still where any real saving has to come from. If this needs raising again,
# compress those rather than moving this line a third time.
BUDGET_FIRST_PAINT_MB = 8.6     # level-0 tiles + two month keyframes + app + data
BUDGET_TOTAL_MB = 460.0


def log(*a):
    print(*a, flush=True)


def fail(msg):
    log(f"\n  REFUSING TO PUBLISH: {msg}")
    sys.exit(1)


def gate_selftests():
    log("1. research selftests")
    ran = 0
    for fn in sorted(os.listdir(RESEARCH)):
        if not fn.endswith(".py") or fn.startswith("_") or fn == "audit_all.py":
            continue
        r = subprocess.run([sys.executable, fn], cwd=RESEARCH,
                           capture_output=True, text=True)
        ran += 1
        tag = "ok  " if r.returncode == 0 else "FAIL"
        log(f"   {tag} {fn}")
        if r.returncode != 0:
            log(r.stdout[-1500:]); log(r.stderr[-800:])
            fail(f"{fn} selftest failed")
    if ran == 0:
        fail("no research selftests found — the gate would be empty")
    log(f"   {ran} selftests passed")


def gate_fields():
    log("2. fields present")
    tj = os.path.join(WEB, "fields", "tiles.json")
    if not os.path.exists(tj):
        fail("web/fields/tiles.json missing — run build_tiles.py")
    man = json.load(open(tj))
    for lv in man["levels"]:
        d = os.path.join(WEB, "fields", f"z{lv['level']}")
        n = len([f for f in os.listdir(d) if f.endswith(".png")])
        if n != lv["tiles"]:
            fail(f"level {lv['level']}: manifest says {lv['tiles']} tiles, found {n}")
    for m in range(1, 13):
        for kind in ("sea", "wind"):
            p = os.path.join(WEB, "fields", f"{kind}_{m:02d}.png")
            if not os.path.exists(p):
                fail(f"missing monthly field {kind}_{m:02d}.png — "
                     f"a missing month is not a cosmetic gap, the seasonal cycle IS the argument")
    log(f"   {sum(l['tiles'] for l in man['levels'])} tiles, 24 monthly fields")
    return man


# ⚠ THESE TOLERANCES ARE FOR LEVEL 0, WHICH IS AN AREA MEAN OVER ~19.5 km.
# That smoothing is not an error, it is what a level-0 tile IS: the Challenger Deep reads
# -10,873 m on the 2.44 km master and -9,802 m here, and Everest 8,023 m against 6,228 m.
# Asserting the master's peaks against the coarse level fails a correct build — which it did,
# and this comment is why it will not do so again.
#
# What this gate is actually for is POSITION: a half-world longitude roll, a vertical flip, or
# a reduction that cropped the source. All three of those move a place from ocean to land or
# across a hemisphere, and none of them is visible by looking at the globe. So the test is
# whether each named place is the right KIND of place at the right depth ORDER, plus the
# land-fraction check below, which is the one that catches a subtle roll.
REGISTRATION = [
    ("Challenger Deep",       11.3733, 142.5917, -9800, 1400),
    ("Grand Banks",           45.0000, -50.0000,   -58,  140),
    ("Mid-Atlantic Ridge",     0.0000, -24.0000, -3430, 1500),
    ("Everest / High Himalaya", 27.9881, 86.9250,  6228, 1500),
    ("Sargasso (open ocean)",  30.0000, -55.0000, -5300, 1400),
    ("Sahara (interior)",      25.0000,  10.0000,   500,  700),
    ("mid-Pacific",             0.0000, -150.000, -4300, 1500),
    ("Bay of Bengal",          15.0000,  88.0000, -2400, 1800),
]


def gate_registration(man):
    """Re-read named places out of the SHIPPED png. This is the check that catches a half-world
    roll, a vertical flip, or a reduction that quietly cropped the source — all of which have
    happened, and none of which is visible by looking at the globe."""
    log("3. registration, re-read from the shipped raster")
    from PIL import Image
    import numpy as np
    lv = next(l for l in man["levels"] if l["level"] == 0)
    core, sk = man["core"], man["skirt"]
    W, H = lv["w"], lv["h"]
    grid = np.zeros((H, W), dtype=np.float64)
    for ty in range(lv["ny"]):
        for tx in range(lv["nx"]):
            a = np.asarray(Image.open(os.path.join(WEB, "fields", "z0", f"{tx}_{ty}.png")))
            px = a[sk:sk + core, sk:sk + core]
            u16 = px[:, :, 0].astype(np.float64) * 256 + px[:, :, 1]
            grid[ty * core:(ty + 1) * core, tx * core:(tx + 1) * core] = \
                u16 / 65535.0 * 20000.0 - 11000.0
    bad = []
    for name, lat, lon, want, tol in REGISTRATION:
        r = int((90.0 - lat) / 180.0 * H)
        c = int((lon + 180.0) / 360.0 * W)
        got = grid[min(r, H - 1), min(c, W - 1)]
        ok = abs(got - want) <= tol
        log(f"   {'ok  ' if ok else 'FAIL'} {name:20s} {got:8.0f} m (want {want} ± {tol})")
        if not ok:
            bad.append(name)
    if bad:
        fail("registration failed at " + ", ".join(bad))
    lat = 90.0 - (np.arange(H) + 0.5) * (180.0 / H)
    w = np.cos(np.radians(lat))[:, None]
    frac = float(((grid > 0) * w).sum() / (w.sum() * W))
    log(f"   land fraction {frac*100:.2f}% (true 29.2%)")
    if not 0.27 < frac < 0.32:
        fail(f"land fraction {frac:.3f} — the grid is misregistered")


def gate_data():
    log("4. data layers")
    need = {"ports.json": "ports", "vessels.json": "vessels",
            "chapters.json": "chapters", "battles.json": "battles", "about.json": "html"}
    counts = {}
    for fn, key in need.items():
        p = os.path.join(WEB, "data", fn)
        if not os.path.exists(p):
            fail(f"web/data/{fn} missing — run build_data.py")
        d = json.load(open(p))
        if key not in d:
            fail(f"{fn} has no '{key}'")
        counts[fn] = len(d[key])
    # every vessel must carry a polar, or the routing engine has nothing to route with
    ves = json.load(open(os.path.join(WEB, "data", "vessels.json")))["vessels"]
    for v in ves:
        if "polar" not in v or "curve" not in v["polar"]:
            fail(f"vessel {v.get('id')} has no polar — it cannot be routed")
        if not v.get("cite"):
            fail(f"vessel {v.get('id')} has no citation")
    # every battle and chapter must carry a citation. Rule 9: say what is contested.
    for fn, key in (("battles.json", "battles"), ("chapters.json", "chapters")):
        for it in json.load(open(os.path.join(WEB, "data", fn)))[key]:
            if not it.get("cite"):
                fail(f"{fn}: '{it.get('name') or it.get('title')}' has no citation")
    # every vessel carries a plate, every plate an era card names exists, and every plate
    # entry has its file. The card's onerror removes the figure, so a missing image looks
    # like a design choice — corbita/dugout/dhow/cog shipped that way from r43 to r66.
    import re
    plates = json.load(open(os.path.join(WEB, "data", "plates.json")))
    for v in ves:
        if v["id"] not in plates:
            fail(f"vessel {v['id']} has no plate — add it to build/fetch_images.py PLATES")
    m = re.search(r"ERA_PLATE\s*=\s*\{([^}]*)\}",
                  open(os.path.join(WEB, "js", "app.js")).read())
    if not m:
        fail("app.js: ERA_PLATE literal not found — this gate needs re-pointing")
    for slug in re.findall(r":\s*'([a-z0-9-]+)'", m.group(1)):
        if slug not in plates:
            fail(f"era plate '{slug}' has no plates.json entry")
    for slug in plates:
        if not os.path.exists(os.path.join(WEB, "data", "assets", "ships", slug + ".jpg")):
            fail(f"plate '{slug}' is in plates.json but its jpg is missing")
    log(f"   ports {counts['ports.json']} · vessels {len(ves)} · "
        f"chapters {counts['chapters.json']} · battles {counts['battles.json']} · "
        f"plates {len(plates)}")


def gate_budget(man, root=None):
    """⚠ MEASURED ON WHAT IS SERVED, NOT ON THE SOURCE. This gate exists to answer one
    question — what does a visitor pay for first paint — and the answer is whatever docs/
    contains, because that is the directory GitHub Pages serves. Measuring web/ was an exact
    proxy while the two were byte-identical, and stopped being one the moment the published
    copy started being minified. Same budget, same purpose, measured in the right place; run
    against web/ before the copy exists so an early build still gets a reading."""
    log("5. byte budget")
    W = root or WEB
    lv0 = next(l for l in man["levels"] if l["level"] == 0)["bytes"]
    app = sum(os.path.getsize(os.path.join(W, p)) for p in
              ("index.html", "js/app.js", "js/route.js", "js/hull.js", "js/yard.js",
               "js/shipwright.js", "js/battle.js", "js/sea.js", "js/passage.js", "js/shaders.js", "js/three.min.js", "css/styles.css"))
    data = sum(os.path.getsize(os.path.join(W, "data", f))
               for f in os.listdir(os.path.join(W, "data")))
    months = sum(os.path.getsize(os.path.join(W, "fields", f"{k}_{m:02d}.png"))
                 for k in ("sea", "wind") for m in (1, 2))
    first = (lv0 + app + data + months) / 1e6
    total = sum(os.path.getsize(os.path.join(r, f))
                for r, _, fs in os.walk(W) for f in fs) / 1e6
    log(f"   first paint {first:.2f} MB (budget {BUDGET_FIRST_PAINT_MB})")
    log(f"   total       {total:.1f} MB (budget {BUDGET_TOTAL_MB})")
    if first > BUDGET_FIRST_PAINT_MB:
        fail(f"first paint {first:.2f} MB over budget")
    if total > BUDGET_TOTAL_MB:
        fail(f"total {total:.1f} MB over budget")


def stamp_and_copy():
    """⚠ THE STAMP IS WRITTEN INTO web/ BEFORE web/ IS COPIED TO docs/.
    Doing it the other way round publishes the old stamp with the new data, and the failure is
    completely silent: the site loads, runs, and serves yesterday's fields from cache."""
    log("6. stamp, then copy")
    stamp = str(int(time.time()))
    idx = os.path.join(WEB, "index.html")
    html = open(idx).read()
    import re
    html = re.sub(r'<meta name="data-version"[^>]*>\n?', '', html)
    html = html.replace("</head>", f'<meta name="data-version" content="{stamp}">\n</head>')
    for asset in ("css/styles.css", "js/app.js", "js/route.js", "js/hull.js", "js/yard.js",
                  "js/shipwright.js", "js/battle.js", "js/sea.js", "js/passage.js", "js/shaders.js"):
        html = re.sub(rf'({re.escape(asset)})(\?v=\d+)?', rf'\1?v={stamp}', html)
    open(idx, "w").write(html)
    log(f"   stamp {stamp}")

    if os.path.exists(DOCS):
        shutil.rmtree(DOCS)
    # ⚠ z3 is BUILT but not PUBLISHED. The renderer currently walks the pyramid to level 2
    # (4.9 km/px) and never requests level 3, so shipping it would put 262 MB into the repo
    # that nothing fetches — and the working copy in web/ is regenerable from build_tiles.py
    # in a few minutes. When the detail-patch loader lands, publish it and delete this.
    shutil.copytree(WEB, DOCS, ignore=shutil.ignore_patterns("z3"))
    open(os.path.join(DOCS, ".nojekyll"), "w").close()

    # ── MINIFY THE PUBLISHED COPY ONLY ────────────────────────────────────────────────
    # web/ keeps every comment: they are the record of what was tried and why, and several
    # are the only place a hard-won fact is written down. Measured, they are about half the
    # bytes shipped. Comments and indentation only — nothing is renamed, no semicolon is
    # removed — because those are the transformations that break code, and the saving that
    # matters is already here. See build/minify.py for why it is a scanner and not a regex.
    sys.path.insert(0, HERE)
    from minify import minify_js, minify_css
    mb = ma = 0
    for root, _, fs in os.walk(DOCS):
        for f in fs:
            if not f.endswith((".js", ".css")):
                continue
            fp = os.path.join(root, f)
            raw = open(fp, encoding="utf-8").read()
            out = minify_css(raw) if f.endswith(".css") else minify_js(raw)
            open(fp, "w", encoding="utf-8").write(out)
            mb += len(raw.encode()); ma += len(out.encode())
    log(f"   minified docs/ {mb/1e6:.2f} MB -> {ma/1e6:.2f} MB "
        f"({100*(mb-ma)/max(1,mb):.0f}% of script and style bytes)")
    # ── COMPACT THE PUBLISHED DATA ────────────────────────────────────────────────────
    # r208: the first-paint budget refused at 8.60 against 8.6 with one card row added, and
    # the fat was indentation — web/data/*.json is written pretty-printed so diffs read, and
    # was copied to docs/ as-is. The app only ever JSON.parses it. Same rule as the scripts:
    # web/ keeps the readable form, docs/ ships the compact one. json.load → json.dump is a
    # parse and a re-serialise, so the published value is the source value exactly; the
    # keys, the order and every string are untouched, and ensure_ascii=False keeps the
    # Korean and the diacritics as UTF-8 rather than six-byte escapes.
    jb = ja = 0
    for root, _, fs in os.walk(os.path.join(DOCS, "data")):
        for f in fs:
            if not f.endswith(".json"):
                continue
            fp = os.path.join(root, f)
            raw = open(fp, encoding="utf-8").read()
            out = json.dumps(json.loads(raw), separators=(",", ":"), ensure_ascii=False)
            open(fp, "w", encoding="utf-8").write(out)
            jb += len(raw.encode()); ja += len(out.encode())
    log(f"   compacted docs/data {jb/1e6:.2f} MB -> {ja/1e6:.2f} MB "
        f"({100*(jb-ja)/max(1,jb):.0f}% of data bytes)")
    n = sum(len(fs) for _, _, fs in os.walk(DOCS))
    log(f"   docs/ written, {n} files")
    return stamp


def main():
    log("build_site.py — the gate\n")
    gate_selftests()
    man = gate_fields()
    gate_registration(man)
    gate_data()
    stamp = stamp_and_copy()
    gate_budget(man, DOCS)          # on the served copy — see the note on gate_budget
    log(f"\nPUBLISHED. data-version {stamp}")
    log("Verify the LIVE stamp after pushing — a successful push is not a successful deploy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
