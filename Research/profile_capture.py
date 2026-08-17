#!/usr/bin/env python3
"""A MEASURED profile of one hull — the plate you can hold beside a photograph.

The spin survey answers "is anything broken from any angle". It cannot answer "is this
tier edge at u 0.62", because its 34° lens magnifies the near half of a 345 m ship by a
third and a pixel measurement off it is off by a quarter of the ship. Three attempts at
Queen Mary 2 were judged on frames like that.

This drops the field of view to 3° and pushes the camera back by the same factor, which is
orthographic to within a percent over the ship's length, hides the UI, and paints a u-scale
along the waterline so a feature's position can be READ rather than estimated.

  "$STUDIO/.venv/bin/python" Research/profile_capture.py --ship queen-mary-2
  → Research/baselines/_profile/queen-mary-2/{port,starboard,bow,quarter}.png
"""
import argparse, pathlib, sys

# ⚠ Hiding a NAMED list of panels is a guess that goes stale the first time a panel is
# renamed, and the first run of this produced a "profile" with six cards across it. Keep
# the canvas and its ancestors; hide everything else, with !important because several of
# these panels are shown by a rule that already carries one.
HIDE = """() => {
  const keep = new Set();
  document.querySelectorAll('canvas').forEach(c => {
    for (let e = c; e && e !== document.documentElement; e = e.parentElement) keep.add(e);
  });
  document.querySelectorAll('body *').forEach(e => {
    if (keep.has(e)) return;
    e.style.setProperty('display', 'none', 'important');
  });
}"""

# a u-ruler drawn over the canvas: ticks every 0.05 of LOA, decades labelled
RULER = """([spinDeg]) => {
  const old = document.getElementById('__ruler'); if (old) old.remove();
  /* ⚠ `const SW = …` at the top level of a classic script is a global BINDING and not a
     property of window, so `window.SW` is undefined while `SW` resolves. Testing the wrong
     one is why the first run of this drew no ruler and reported 'no spec'. */
  const S = (typeof SW === 'undefined') ? null : SW.spec; if (!S) return 'no spec';
  const c = document.createElement('canvas');
  c.id = '__ruler';
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  Object.assign(c.style, {position:'fixed', left:0, top:0, width:innerWidth+'px',
    height:innerHeight+'px', pointerEvents:'none', zIndex:9999});
  document.body.appendChild(c);
  const g = c.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  /* u is the HULL SURFACE's parameter and hull.js lays it over LWL (`x = (u−0.5)·S.lwl`),
     so a ruler drawn over LOA would mis-read every recorded u by the overhang. */
  const L = S.hull.lwl || S.hull.loa;
  const obj = SW.layout && SW.layout.find(e => e.id === S.id);
  const root = obj ? obj.obj : null; if (!root) return 'no root';
  const v = new THREE.Vector3();
  g.font = '11px monospace'; g.textAlign = 'center';
  for (let k = 0; k <= 20; k++) {
    const u = k / 20;
    // hull space: bow at -L/2, stern at +L/2, y = 0 at the load waterline
    v.set((u - 0.5) * L, 0, 0); root.localToWorld(v); v.project(SW.cam);
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    const big = k % 4 === 0;
    g.strokeStyle = big ? '#c0392b' : 'rgba(0,0,0,0.45)';
    g.lineWidth = big ? 1.6 : 0.8;
    g.beginPath(); g.moveTo(x, y - (big ? 26 : 14)); g.lineTo(x, y + (big ? 26 : 14)); g.stroke();
    if (big) { g.fillStyle = '#c0392b'; g.fillText('u ' + u.toFixed(2), x, y + 42); }
  }
  g.fillStyle = '#c0392b'; g.textAlign = 'left';
  g.fillText(S.name + '   LWL ' + L.toFixed(1) + ' m   bearing ' + spinDeg + '\\u00b0'
             + '   u 0 = BOW', 14, 22);
  return 'ok';
}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ship", required=True)
    ap.add_argument("--url", default="http://localhost:8149")
    ap.add_argument("--out", default=None)
    ap.add_argument("--fov", type=float, default=3.0)
    ap.add_argument("--no-ruler", action="store_true")
    args = ap.parse_args()

    out = pathlib.Path(args.out or
        pathlib.Path(__file__).parent / "baselines" / "_profile" / args.ship)
    out.mkdir(parents=True, exist_ok=True)

    from playwright.sync_api import sync_playwright
    url = f"{args.url}/?frozen=1#v=ship&s={args.ship}"
    # bearing, latitude, name.  A profile wants the eye ON the waterline.
    shots = [("port", 90, 0.010), ("starboard", 270, 0.010),
             ("bow", 0, 0.010), ("stern", 180, 0.010),
             ("quarter", 300, 0.090), ("plan", 90, 1.520)]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb",
                                           "--disable-lcd-text"])
        page = browser.new_page(viewport={"width": 1800, "height": 620},
                                device_scale_factor=2)
        page.goto(url, wait_until="load", timeout=60000)
        page.wait_for_function(
            "window.__FRAME_READY === true && (!document.fonts || document.fonts.status === 'loaded')",
            timeout=60000)
        page.wait_for_timeout(600)
        page.evaluate(HIDE)
        # Long lens. ⚠ Do NOT also push the camera back: swFrame derives SW.fit from
        # tan(fov/2) every frame, so the distance (fit·dist) already grows by exactly the
        # factor the fov shrank. Scaling dist as well backed off twice and framed the whole
        # fleet at postage-stamp size.
        page.evaluate("(fov) => { SW.cam.fov = fov; SW.cam.updateProjectionMatrix(); }",
                      args.fov)
        for name, deg, lat in shots:
            page.evaluate("([deg, lat]) => { SW.shipSpin = deg * Math.PI / 180; SW.lat = lat; }",
                          [deg, lat])
            page.wait_for_timeout(500)
            if not args.no_ruler and name in ("port", "starboard"):
                print("   ruler:", page.evaluate(RULER, [deg]))
            else:
                page.evaluate("() => { const o = document.getElementById('__ruler'); if (o) o.remove(); }")
            page.wait_for_timeout(150)
            page.screenshot(path=str(out / f"{name}.png"), type="png")
            print(f"  {name}.png  bearing {deg}deg  lat {lat}")
        browser.close()
    print(f"-> {out}")


if __name__ == "__main__":
    sys.exit(main())
