#!/usr/bin/env python3
"""r125: measure every era track's contact with drawn land, finer than the router's own
sampling. Two readings per track: the audit's own (leg points + midpoints, ~2 km) and a
0.25 km walk of the drawn great circles that records each contiguous ashore GRAZE with
its chord length — the corner-clip class is sub-kilometre, so only a sub-kilometre walk
can see all of it. Also snapshots the router's global give-up counters per era.

  "$STUDIO/.venv/bin/python" build/staging/probe-clips-r125.py <out.json>
"""
import json, sys

JS = """
async () => {
  const RT = window.SHIPS_ROUTE;
  const out = { level: RT.FINE.level, w: RT.FINE.w, eras: [] };
  const drain = async () => {
    for (let w = 0; w < 4000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
      try { pumpFleetQueue(24); } catch (e) { break; }
      await new Promise(r => setTimeout(r, 0));
    }
  };
  const chs = APP.chapters.chapters || [];
  const c0 = { b: RT.FINE.blockedSeen, d: RT.FINE.detourFail, u: RT.FINE.unfixed };
  for (let e = 0; e < chs.length; e++) {
    selectEra(e); await drain();
    const rec = { era: e, datum: RT.FINE.datum, tracks: [] };
    for (const tr of eraTracks) {
      const legs = tr.legs || [];
      let ashorePts = 0, ashoreMid = 0;
      for (let i = 0; i < legs.length; i++) {
        if (!RT.fineIsWater(legs[i].lon, legs[i].lat)) ashorePts++;
        if (i < legs.length - 1) {
          const b = legs[i + 1], dl = ((b.lon - legs[i].lon + 540) % 360) - 180;
          if (!RT.fineIsWater(legs[i].lon + dl / 2, (legs[i].lat + b.lat) / 2)) ashoreMid++;
        }
      }
      const grazes = []; let cur = null;
      for (let i = 0; i < legs.length - 1; i++) {
        const A = legs[i], B = legs[i + 1], km = RT.gcKm(A, B);
        const n = Math.max(1, Math.ceil(km / 0.25));
        for (let k = 0; k < n; k++) {
          const p = RT.gcSlerp(A, B, k / n);
          if (!RT.fineIsWater(p.lon, p.lat)) {
            if (!cur) cur = { at: [p.lon, p.lat], km: 0 };
            cur.km += km / n;
          } else if (cur) { grazes.push(cur); cur = null; }
        }
      }
      if (cur) grazes.push(cur);
      const give = tr.give || null;
      if (grazes.length || ashorePts || ashoreMid || give)
        rec.tracks.push({ name: tr.name, ashorePts, ashoreMid, give,
          grazes: grazes.map(g => ({ at: [+g.at[0].toFixed(2), +g.at[1].toFixed(2)],
                                     km: +g.km.toFixed(2) })) });
    }
    rec.counters = { blockedSeen: RT.FINE.blockedSeen - c0.b,
                     detourFail: RT.FINE.detourFail - c0.d,
                     unfixed: RT.FINE.unfixed - c0.u };
    out.eras.push(rec);
  }
  return out;
}
"""

def main():
    out_path = sys.argv[1]
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=90000)
        out = page.evaluate(JS)
        browser.close()
    with open(out_path, "w") as f:
        json.dump(out, f, indent=1)
    ntr = sum(len(e["tracks"]) for e in out["eras"])
    ngr = sum(len(t["grazes"]) for e in out["eras"] for t in e["tracks"])
    print(f"level {out['level']} ({out['w']}px): {ntr} tracks with contact, {ngr} grazes")
    for e in out["eras"]:
        for t in e["tracks"]:
            gz = ", ".join(f"{g['km']}km@({g['at'][0]},{g['at'][1]})" for g in t["grazes"][:4])
            print(f"  era {e['era']} {t['name']}: pts {t['ashorePts']} mid {t['ashoreMid']} "
                  f"give {t['give']} grazes [{gz}{'…' if len(t['grazes']) > 4 else ''}]")
        c = e["counters"]
        print(f"  era {e['era']} counters: blocked {c['blockedSeen']} "
              f"detourFail {c['detourFail']} unfixed {c['unfixed']}")

if __name__ == "__main__":
    main()
