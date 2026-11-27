import sys, pathlib
W = pathlib.Path(sys.argv[1])
def rep(path, old, new, n=1):
    p = W / path; s = p.read_text()
    c = s.count(old)
    assert c == n, f'{path}: anchor found {c} times, want {n}: {old[:80]!r}'
    p.write_text(s.replace(old, new))

# ── 1. hull.js: the perpendiculars and the recorded port stations ──
rep('js/hull.js', '''/* ── MULLER LAYS THE GUN FROM ITS PORT (round 363)''', r'''/* ── STEEL'S PERPENDICULARS ON THE MODEL (round 364) ────────────────────────────────────
   Steel's tables give stations along a ship from her two perpendiculars: the foremost, at the
   stem's rabbet, and the after one, at the post's. The model has no perpendiculars; it has a loft
   whose u runs from the stem head to the stern. Steel's Folio XX gives the centres of the masts
   from the perpendiculars (on a 74: the fore 19 ft 6 in abaft the foremost, the main 99 ft 6 in
   abaft it, the mizzen 27 ft 3 in afore the after one), and the model's masts are drawn, so each
   mast gives one estimate of where the foremost perpendicular stands. A mast's foot is
   x = (u - 0.5) L + rake(u), the line buildMasts stands it on. The mizzen's estimate needs the
   length between the perpendiculars; a tier's port record closes it (the foremost port's
   distance, n ports, n - 1 spaces and the after port's distance add up to that length), so the
   record supplies it. Returned: fp and ap in x, the length, and each mast's residual. Where the
   residuals are large the masts and the record disagree, and the caller should say so. */
function steelPerpendiculars(S, H) {
  const P = S.perpendiculars;
  if (!P || !Array.isArray(S.masts) || S.masts.length < 3) return null;
  H = H || hullSurface(S);
  const L = S.lwl, ms = S.masts.map(m => m.at).sort((a, b) => a - b);
  const mx = ms.map(u => (u - 0.5) * L + H.rake(u));
  const T = (Array.isArray(S.tierPorts) ? S.tierPorts : []).find(t => t && t.foreM > 0 && t.aftM > 0 && t.nSide > 0);
  const lpp = T ? T.foreM + T.nSide * T.wM + (T.nSide - 1) * T.clearM + T.aftM : null;
  const est = [mx[0] - P.foreMastM, mx[1] - P.mainMastM];
  if (lpp) est.push(mx[ms.length - 1] + P.mizzenAftM - lpp);
  const fp = est.reduce((a, b) => a + b, 0) / est.length;
  return { fp, ap: lpp ? fp + lpp : null, lpp, mastX: mx.map(x => +x.toFixed(3)), resid: est.map(e => +(e - fp).toFixed(3)) };
}

/* ── A TIER'S PORTS ALONG THE SIDE, FROM THE RECORD (round 364) ─────────────────────────
   Until r364 the shader cut a port every L/26 along every tier (1.96 m on the 74, about 1.02 m
   wide), and buildGuns stood a gun in each of those between u 0.13 and the run. Steel's Folio
   XXXII gives a 74's upper-deck ports 2 ft 10 in fore and aft, 8 ft 1 in from each other, 15 a
   side, the foreside of the foremost 13 ft 1 in abaft the foremost perpendicular and the aftside
   of the after one 6 ft 9 in afore the after perpendicular. Those add up to 175 ft 6 in, the
   length between his perpendiculars, so "distance from each other" is the clear space between
   two ports and the centres stand 10 ft 11 in apart. A tier with that record gets its ports at
   those stations, each turned into u at the port's own height (the stem and the counter rake, so
   x is not linear in u near the ends). Returned per tier: null (the class pattern), or
   { ports: [{ x, u, uLo, uHi }], perp, from }. */
function tierPortStations(S) {
  const rec = Array.isArray(S.tierPorts) ? S.tierPorts : [];
  if (!rec.some(t => t && t.foreM > 0)) return [];
  const H = hullSurface(S), perp = steelPerpendiculars(S, H), rows = tierPortRows(S);
  const uAt = (x, v) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (surfacePoint(S, H, m, v)[0] < x) a = m; else b = m; } return (a + b) / 2; };
  return rows.map((row, d) => {
    const R = rec[d];
    if (!R || !(R.foreM > 0) || !perp) return null;
    const ports = [];
    for (let k = 0; k < R.nSide; k++) {
      const x0 = perp.fp + R.foreM + k * (R.wM + R.clearM), x1 = x0 + R.wM;
      ports.push({ x: +((x0 + x1) / 2).toFixed(4), u: uAt((x0 + x1) / 2, row.port), uLo: uAt(x0, row.port), uHi: uAt(x1, row.port) });
    }
    return { ports, perp, from: 'record' };
  });
}

/* ── MULLER LAYS THE GUN FROM ITS PORT (round 363)''')

# buildGuns: a recorded tier's guns stand in its recorded ports
rep('js/hull.js', '''  const rows = tierPortRows(S), house = gunHousing(len, r);
  for (let d = 0; d < decks; d++) {
    const tier = sideBands(S).tiers[d];                 // the shader's port centre, exactly (r341)
    if (!tier) continue;
    const row = rows[d], v = row.port;                  // r363: a recorded tier's port is Steel's
    if (v > 0.985) continue;
    for (let k = 0; k < 26; k++) {
      const u = (k + 0.5) / 26;
      /* ⚠ And no gun stands in the COUNTER. The flare pushes the topsides outboard over the
         after body, so a barrel placed there is thrown clear of the ship and reads as a spar.
         Real ports stop where the run begins for the same physical reason: there is no flat
         side left to cut one in. */
      const aftLimit = Math.min(0.88, 1 - (S.run || 0.3) - 0.02);
      if (u < 0.13 || u > aftLimit) continue;''', '''  const rows = tierPortRows(S), house = gunHousing(len, r), stations = tierPortStations(S);
  for (let d = 0; d < decks; d++) {
    const tier = sideBands(S).tiers[d];                 // the shader's port centre, exactly (r341)
    if (!tier) continue;
    const row = rows[d], v = row.port;                  // r363: a recorded tier's port is Steel's
    if (v > 0.985) continue;
    /* r364: a tier whose ports are recorded along the side has a gun in each recorded port, the
       stations the shader cuts (uRecPort); a tier without one keeps the class pattern below. */
    const st = stations[d];
    const us = st ? st.ports.map(p => p.u) : Array.from({ length: 26 }, (_, k) => (k + 0.5) / 26);
    for (const u of us) {
      /* ⚠ And no gun stands in the COUNTER. The flare pushes the topsides outboard over the
         after body, so a barrel placed there is thrown clear of the ship and reads as a spar.
         Real ports stop where the run begins for the same physical reason: there is no flat
         side left to cut one in. (A CLASS limit: a recorded tier's ports are where the record
         puts them, and are not filtered.) */
      const aftLimit = Math.min(0.88, 1 - (S.run || 0.3) - 0.02);
      if (!st && (u < 0.13 || u > aftLimit)) continue;''')

rep('js/hull.js', '''        bar.userData.tierGun = { deck: d, u, lenM: len };''',
    '''        bar.userData.tierGun = { deck: d, u, lenM: len, station: st ? 'record' : 'class' };''')

# uniforms
rep('js/hull.js', '''                 uTierPortLo: { value: pv4('lo') }, uTierPortHi: { value: pv4('hi') }, uTierSoft: { value: sideBands(S).soft } };''',
'''                 uTierPortLo: { value: pv4('lo') }, uTierPortHi: { value: pv4('hi') }, uTierSoft: { value: sideBands(S).soft },
                 ...(() => {
                   /* r364: a tier whose ports are recorded along the side is cut at those stations
                      (fore and after edges in u, at the port's height); the others keep fract(u·26) */
                   const st = tierPortStations(S), list = [];
                   st.forEach((t, d) => { if (t) t.ports.forEach(p => list.push(new THREE.Vector4(p.uLo, p.uHi, d, 0))); });
                   const n = Math.min(list.length, 32);
                   while (list.length < 32) list.push(new THREE.Vector4(0, 0, -1, 0));
                   return { uRecPort: { value: list.slice(0, 32) }, uRecPortN: { value: n },
                            uTierPortRec: { value: new THREE.Vector4(...[0, 1, 2, 3].map(i => (st[i] ? 1 : 0))) },
                            uRecPortSoft: { value: 0.04 / (S.lwl || 50) } };
                 })() };''')

rep('js/hull.js', '''window.SHIPS_HULL = { sideBands,''', '''window.SHIPS_HULL = { sideBands, tierPortStations, steelPerpendiculars,''')

# ── 2. the shader ──
rep('shaders/HULL_FRAG.frag.glsl', '''uniform vec4  uTierPortLo, uTierPortHi;''',
'''uniform vec4  uTierPortLo, uTierPortHi;
uniform vec4  uRecPort[32];   // r364: recorded ports, (u fore edge, u after edge, tier, 0)
uniform int   uRecPortN;
uniform vec4  uTierPortRec;   // 1 where a tier's ports are recorded along the side
uniform float uRecPortSoft;''')
rep('shaders/HULL_FRAG.frag.glsl', '''        float px = fract(u * 26.0);
        port = max(port, smoothstep(pl - 0.007, pl + 0.007, v) * smoothstep(ph + 0.007, ph - 0.007, v)
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));''',
'''        float px = fract(u * 26.0);
        float along = smoothstep(0.30, 0.22, abs(px - 0.5));
        /* r364: a tier with recorded ports is cut only at Steel's stations (tierPortStations) */
        if (uTierPortRec[d] > 0.5) {
          along = 0.0;
          for (int i = 0; i < 32; i++) {
            if (i >= uRecPortN) break;
            vec4 P = uRecPort[i];
            if (abs(P.z - float(d)) > 0.5) continue;
            along = max(along, smoothstep(P.x - uRecPortSoft, P.x + uRecPortSoft, u)
                             * smoothstep(P.y + uRecPortSoft, P.y - uRecPortSoft, u));
          }
        }
        port = max(port, smoothstep(pl - 0.007, pl + 0.007, v) * smoothstep(ph + 0.007, ph - 0.007, v) * along);''')
rep('js/hull.js', ''' *     ports along u    : fract(u * 26.0) == 0.5''', ''' *     ports along u    : fract(u * 26.0) == 0.5, or a recorded tier's stations (r364, tierPortStations)''')
print('edits applied')
