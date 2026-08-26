#!/usr/bin/env python3
"""r167 — measure the no-rake sampling bias per ship, per tier, BEFORE re-lofting.

The r163 residual: linerHouse half() samples the shell at u as if x = (u-0.5)*lwl
(no rake), clamped 0.999, for every hull without a pin past the perpendicular.
Inside rake spans that reads the shell up to a rake's length from the wall it
sizes — always the narrower station, so the bias hides inboard. r163 fixed it for
a pin past u 1.0 (queen-mary-2); the fleet kept the old sampling, and this
instrument measures what the fleet-wide re-loft will actually move, in metres,
per ship and per tier, before any code changes.

Two quantities per sample u across each tier's own span:
  shellOld  = |surfacePoint(S, H, clamp(u, .001, .999), 1.0).z|   (the old sampling)
  shellTrue = |surfacePoint(S, H, qAtX((u-0.5)*lwl), 1.0).z|      (the true station)
  liveHalf  = tiers[i].half(u)                                    (what the code NOW draws)

bias = shellTrue - shellOld is the raw sampling error; liveHalf captured before
and after the edit is the applied change (the caps in half() can only shrink it).

  "$STUDIO/.venv/bin/python" build/staging/r167/measure-norake.py --out <json>
"""
import argparse, json, sys

JS = r"""
async () => {
  const list = (APP.vessels.vessels || APP.vessels);
  const out = {};
  for (const v of list) {
    const S = v.hull;
    if (!S || !S.decks) continue;
    const H = SHIPS_HULL.hullSurface(S);
    const L = S.lwl;
    const qAtX = (x) => {
      if (x <= -0.5 * L + H.rake(0)) return 0;
      if (x >=  0.5 * L + H.rake(1)) return 1;
      let lo = 0, hi = 1;
      for (let it = 0; it < 32; it++) {
        const q = (lo + hi) / 2;
        if ((q - 0.5) * L + H.rake(q) < x) lo = q; else hi = q;
      }
      return (lo + hi) / 2;
    };
    const T = SHIPS_HULL.linerHouse(S);
    const tiers = [];
    for (let i = 0; i < T.tiers.length; i++) {
      const t = T.tiers[i];
      const uHi = t.wingU !== undefined ? t.wingU : t.uB;
      let maxBias = 0, atU = null, rec = null;
      const marks = {};
      for (let k = 0; k <= 240; k++) {
        const u = t.uA + (uHi - t.uA) * k / 240;
        const so = Math.abs(SHIPS_HULL.surfacePoint(S, H,
                     Math.max(0.001, Math.min(0.999, u)), 1.0)[2]);
        const st = Math.abs(SHIPS_HULL.surfacePoint(S, H, qAtX((u - 0.5) * L), 1.0)[2]);
        if (Math.abs(st - so) > Math.abs(maxBias)) {
          maxBias = st - so; atU = u;
          rec = { shellOld: so, shellTrue: st, liveHalf: t.half(u) };
        }
      }
      for (const [name, u] of [['uA', t.uA], ['uB', t.uB], ['uHi', uHi]]) {
        marks[name] = { u,
          shellOld: Math.abs(SHIPS_HULL.surfacePoint(S, H,
                      Math.max(0.001, Math.min(0.999, u)), 1.0)[2]),
          shellTrue: Math.abs(SHIPS_HULL.surfacePoint(S, H, qAtX((u - 0.5) * L), 1.0)[2]),
          liveHalf: t.half(u) };
      }
      tiers.push({ i, uA: t.uA, uB: t.uB, wingU: t.wingU,
                   maxBiasM: maxBias, atU, atRec: rec, marks });
    }
    out[v.id] = { lwl: L, beam: S.beam, loa: S.loa,
                  forefoot: S.forefoot, run: S.run,
                  stemRake: S.stemRake, sternRake: S.sternRake,
                  rakeBowM: H.rake(0), rakeSternM: H.rake(1), tiers };
  }
  return out;
}
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load",
                      timeout=60000)
            page.wait_for_function("window.__FRAME_READY === true", timeout=60000)
            out = page.evaluate(JS)
        finally:
            browser.close()
    with open(a.out, 'w') as f:
        json.dump(out, f, indent=1, sort_keys=True)
    for sid, d in sorted(out.items()):
        worst = max((abs(t['maxBiasM']), t['i'], t['atU']) for t in d['tiers'])
        print(f"{sid:16s} rakeBow {d['rakeBowM']:7.2f} m  rakeStern {d['rakeSternM']:6.2f} m"
              f"  worst tier bias {worst[0]:6.3f} m (tier {worst[1]} at u {worst[2]:.3f})")
    return 0

if __name__ == '__main__':
    sys.exit(main())
