#!/usr/bin/env python3
"""Round 50 verification: the battle consumes the router's polar model.

Three measurements, all through the page's own functions:
  1. Break-and-restore for the two new audit rules (in-page mutation, no files touched).
  2. Old-formula vs new-formula speeds for both Armada fleets and both muscled hulls,
     at every campaign force, across the headings that matter.
  3. The battle actually sailed: open the Action unfrozen, step it, read ship speeds.

  "$STUDIO/.venv/bin/python" Research/measure-battle-r50.py
"""
import json, sys

def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/?frozen=1#v=ship", wait_until="load", timeout=60000)
        page.wait_for_function("window.__FRAME_READY === true", timeout=60000)

        # ── 1. break-and-restore ───────────────────────────────────────────────────
        proofs = page.evaluate("""async () => {
          const audit = await (await fetch('/audit-hulls.js')).text();
          const run = () => (0, eval)(audit).problems;
          const out = {};
          out.clean = run().length;

          /* fault 1: a consumer wind-scales the crew again — wrap the shared model */
          const orig = window.polarSpeed;
          window.polarSpeed = (P, t, a) => orig(P, 8, a) * (0.55 + t * 0.06);
          out.windScaled = run().filter(p => p.rule === 'a calm slows the muscled hull')
                                .map(p => p.id);
          window.polarSpeed = orig;

          /* fault 2: the second speed model comes back */
          window.btPolarSpeed = function () {};
          out.secondModel = run().filter(p => p.rule === 'a second speed model').length;
          delete window.btPolarSpeed;

          /* fault 3: the shared model stops being reachable */
          const beat = window.polarBeat;
          window.polarBeat = undefined;
          out.unreachable = run().filter(p => p.rule === 'shared polar model unreachable')
                                 .map(p => p.detail.split(' ')[0]);
          window.polarBeat = beat;

          out.cleanAfter = run().length;
          return out;
        }""")
        print("== break-and-restore ==")
        print(json.dumps(proofs, indent=1))

        # ── 2. old vs new speeds ──────────────────────────────────────────────────
        table = page.evaluate("""() => {
          const vs = APP.vessels.vessels || APP.vessels;
          const get = id => vs.find(v => v.id === id);
          const oldInterp = (curve, angDeg) => {
            const a = Math.min(180, Math.abs(angDeg));
            const ks = Object.keys(curve).map(Number).sort((x, y) => x - y);
            if (a <= ks[0]) return curve[ks[0]];
            for (let i = 1; i < ks.length; i++)
              if (a <= ks[i]) {
                const f = (a - ks[i-1]) / (ks[i] - ks[i-1]);
                return curve[ks[i-1]] + (curve[ks[i]] - curve[ks[i-1]]) * f;
              }
            return curve[ks[ks.length - 1]];
          };
          const rows = [];
          for (const id of ['carrack', 'fluyt', 'trireme', 'dugout']) {
            const v = get(id), P = compilePolar(v.polar);
            for (const f of [0, 3, 4, 5, 6, 7]) {
              const tws = 0.836 * Math.pow(f, 1.5);
              for (const rel of [0, 45, 80, 90, 95, 110, 135, 180]) {
                const oldKn = oldInterp(v.polar.curve, rel) * (0.55 + f * 0.09);
                const newKn = polarSpeed(P, tws, rel);
                rows.push([id, f, rel, +oldKn.toFixed(2), +newKn.toFixed(2)]);
              }
            }
          }
          return rows;
        }""")
        print("\\n== vessel / force / rel°: old kn -> new kn ==")
        for id_ in ['carrack', 'fluyt', 'trireme', 'dugout']:
            for f in [0, 3, 4, 5, 6, 7]:
                cells = [f"{r[2]}°:{r[3]}->{r[4]}" for r in table if r[0] == id_ and r[1] == f]
                print(f"{id_:9s} F{f}: " + "  ".join(cells))

        browser.close()

        # ── 3. the battle sailed ──────────────────────────────────────────────────
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:8149/#v=action", wait_until="load", timeout=60000)
        page.wait_for_function(
            "window.SHIPS_BT && window.SHIPS_BT.BT.on === true", timeout=60000)
        sail = page.evaluate("""async () => {
          const BT = window.SHIPS_BT.BT;
          const days = [];
          for (const day of [0, 3, 9]) {           // Lizard F6; Portland NE F4; Gravelines F6
            BT.day = day; BT.playing = false;
            window.SHIPS_BT.btFrame && (0, eval)('btSetDay()');
            await new Promise(r => setTimeout(r, 2500));
            const ships = BT.ships.map(s => ({
              side: s.side, kn: +(s.spd / 0.5144).toFixed(2),
              hd: +((s.hd * 180 / Math.PI) % 360).toFixed(0) }));
            const kns = ships.map(s => s.kn);
            days.push({ day, tws: +BT.tws.toFixed(2),
                        min: Math.min(...kns), max: Math.max(...kns),
                        moving: kns.filter(k => k > 0.05).length, of: kns.length });
          }
          return days;
        }""")
        print("\\n== the battle, unfrozen, per day: speeds over 2.5 s of sailing ==")
        print(json.dumps(sail, indent=1))
        browser.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
