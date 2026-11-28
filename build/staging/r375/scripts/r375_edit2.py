import pathlib
R = pathlib.Path.home() / 'Ships'
def rep(path, old, new, count=1):
    p = R / path; s = p.read_text(); n = s.count(old)
    assert n == count, f'{path}: {n}x {old[:70]!r}'
    p.write_text(s.replace(old, new))

# 1. shared solver
rep('web/js/hull.js', "function tierPortRows(S) {",
r"""/* ── THE HAWSE-HOLES' STATIONS (round 375) ──────────────────────────────────────────────
   One solver for the builder (buildHead) and the hull shader's port pattern (uHawseU), so the
   holes and the ports cannot be placed by two formulas. hull.hawse.centresM are Steel's
   half-breadths from the middle line; each centre stands where the bow's half-breadth at the
   lower tier's port line is that figure. Returned: [{ c, u, v, p }], or [] without a record.
   aftU is the after hole's after edge in u plus 0.10 m: the class ports of the lower tier
   begin abaft it, since a 74's foremost gun-deck port stands abaft her hawse-holes. */
function hawseHoles(S, H) {
  const HW = S.hawse;
  if (!HW || !(HW.diaM > 0) || !Array.isArray(HW.centresM)) return { holes: [], aftU: 0 };
  H = H || hullSurface(S);
  const vPort = sideBands(S).tiers[0].port;
  const zAt = (u, y) => Math.abs(surfacePoint(S, H, u, vAtY(S, H, u, y))[2]);
  const holes = [];
  for (const c of HW.centresM) {
    let u = 0.03, y = surfacePoint(S, H, u, vPort)[1];
    for (let it = 0; it < 4; it++) {
      let a = 0.0005, b = 0.3;
      for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (zAt(m, y) < c) a = m; else b = m; }
      u = (a + b) / 2; y = surfacePoint(S, H, u, vPort)[1];
    }
    const v = vAtY(S, H, u, y);
    holes.push({ c, u, v, p: surfacePoint(S, H, u, v) });
  }
  const last = holes.reduce((m, h) => (h.u > m.u ? h : m), holes[0]);
  const dxdu = Math.abs(surfacePoint(S, H, last.u + 0.002, last.v)[0] - last.p[0]) / 0.002;
  const aftU = last.u + (HW.diaM / 2 + (HW.pipeThickM || 0.03) + 0.10) / dxdu;
  return { holes, aftU };
}

function tierPortRows(S) {""")

# 2. the builder uses it
rep('web/js/hull.js', r"""    const zAt = (u, y) => Math.abs(surfacePoint(S, H, u, vAtY(S, H, u, y))[2]);
    S.__hawse = [];
    for (const c of HW.centresM) {
      /* the station where the bow's half-breadth at the port line is the record's: bisect u, then re-read the height */
      let u = 0.03, y = surfacePoint(S, H, u, vPort)[1];
      for (let it = 0; it < 4; it++) {
        let a = 0.0005, b = 0.3;
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (zAt(m, y) < c) a = m; else b = m; }
        u = (a + b) / 2; y = surfacePoint(S, H, u, vPort)[1];
      }
      const v = vAtY(S, H, u, y), p = surfacePoint(S, H, u, v);
""", r"""    S.__hawse = [];
    for (const { c, u, v, p } of hawseHoles(S, H).holes) {
      const y = p[1];
""")
rep('web/js/hull.js', "    const vPort = sideBands(S).tiers[0].port;\n    const leadMat", "    const leadMat")

# 3. the uniform
rep('web/js/hull.js', "      uGunDecks: { value: S.gunDecks || 0 },\n",
    "      uGunDecks: { value: S.gunDecks || 0 },\n"
    "      uHawseU: { value: S.hawse ? hawseHoles(S).aftU : 0 },   // r375: the lower tier's class ports begin abaft the hawse-holes\n")

# 4. the shader
rep('web/shaders/HULL_FRAG.frag.glsl', "uniform float uGunDecks;\n", "uniform float uGunDecks;\nuniform float uHawseU;     // r375: no class port of the lower tier comes forward of this u (the hawse-holes)\n")
rep('web/shaders/HULL_FRAG.frag.glsl', "        float along = smoothstep(0.30, 0.22, abs(px - 0.5));\n",
    "        float along = smoothstep(0.30, 0.22, abs(px - 0.5));\n"
    "        /* r375: a class port whose fore edge would stand forward of the after hawse-hole is not cut */\n"
    "        if (d == 0) along *= step(uHawseU, (floor(u * 26.0) + 0.2) / 26.0);\n")
print('ok')
