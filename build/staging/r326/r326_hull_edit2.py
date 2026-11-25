import sys
P = sys.argv[1]
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)
rep("""      mastDiscs.push({ x: mxA(yT), y: yT, r: B * 0.20 * mk.topmastTop.ofLowerTop, walled: (S.year || 0) < 1710, name: 'Topmast top' });""",
    """      mastDiscs.push({ x: mxA(yT), y: yT, r: B * 0.20 * mk.topmastTop.ofLowerTop, year: S.year || 0, mastR: null, name: 'Topmast top' });""")
rep("""          mastDiscs.push({ x: mxA(y + seg * 0.90), y: y + seg * 0.90, r: topR, walled: (S.year || 0) < 1710, name: 'Top' });""",
    """          mastDiscs.push({ x: mxA(y + seg * 0.90), y: y + seg * 0.90, r: topR, year: S.year || 0, mastR: headR, name: 'Top' });""")
# replace the disc model with the top's own outline
a = s.index("    for (const d of discs) {\n      const dx = d.x - x, dy = d.y - yTop;")
b = s.index("      if (!(any > 0)) continue;", a)
s = s[:a] + """    for (const d of discs) {
      const dx = d.x - x, dy = d.y - yTop;
      /* the top's own outline, point by point (topOutline mirrors buildTop), in the cloth's frame */
      const pts = topOutline(d.r, d.year, d.mastR).map(([px, py, pz, h0, h1]) => {
        const hx = dx + px, hz = pz;
        return { lx: hx * cA - hz * sA, lz: hx * sA + hz * cA, y0: dy + h0, y1: dy + h1, rho: CLR + py };
      }).filter(p => p.y0 <= 0 && p.y1 >= -height);
      if (!pts.length) continue;
      const P = new Float64Array(NS + 1), VA = new Float64Array(NS + 1).fill(1), VB = new Float64Array(NS + 1), X = new Float64Array(NS + 1);
      let any = 0, R = 0;
      for (const p of pts) R = Math.max(R, Math.abs(p.lx - pts[0].lx));
      R = Math.max(R * 0.5, d.r);                           // the ease across: one radius beyond the outermost point
      for (let k = 0; k <= NS; k++) {
        const u = k / NS, xw = cloth0(u, 0)[0], footY = cloth0(u, 1)[1];
        X[k] = xw;
        let need = 0;
        for (const p of pts) {
          const q = xw - p.lx;
          if (Math.abs(q) >= p.rho) continue;
          const va = Math.max(0, p.y1 / footY - 1 / NH), vb = Math.min(1, p.y0 / footY + 1 / NH);
          if (vb <= va) continue;
          if (va < VA[k]) VA[k] = va; if (vb > VB[k]) VB[k] = vb;
          const zFront = p.lz - Math.sqrt(p.rho * p.rho - q * q);   // forward NEGATIVE
          for (let t = 0; t <= 4; t++) {
            const v = va + (vb - va) * t / 4;
            need = Math.max(need, -cloth0(u, v)[2] - zFront);
          }
        }
        P[k] = need; if (need > any) any = need;
      }
      /* the columns the ease reaches take the band of the nearest column the top touches */
      let last = -1;
      for (let k = 0; k <= NS; k++) if (VB[k] > VA[k]) last = k; else if (last >= 0) { VA[k] = VA[last]; VB[k] = VB[last]; }
      last = -1;
      for (let k = NS; k >= 0; k--) if (VB[k] > VA[k]) last = k; else if (last >= 0) { VA[k] = VA[last]; VB[k] = VB[last]; }
""" + s[b:]
rep("""      drapes.push({ Ps, VA, VB, d, push: any, lx, lz, R });""", """      drapes.push({ Ps, VA, VB, d, push: any });""")
rep("""  m.userData.drape = drapes.map(dr => ({ name: dr.d.name, y: +dr.d.y.toFixed(3), r: +dr.d.r.toFixed(3), pushM: +dr.push.toFixed(3),
                                         clearM: 0.04, from: 'class: the cloth bears on the rim, 4 cm off it' }));""",
    """  m.userData.drape = drapes.map(dr => ({ name: dr.d.name, y: +dr.d.y.toFixed(3), r: +dr.d.r.toFixed(3), pushM: +dr.push.toFixed(3),
                                         clearM: 0.04, from: 'class: the cloth bears on the top, 4 cm off its outline' }));""")
rep("""     rim. So the cloth is cut here to stand clear of each top on its mast by 4 cm: across the sail, as far as
     the rim reaches at that station, pushed forward the least that clears every point of the top's platform,
     wall and crosstrees (radius 1.07 of the top's, from 0.23 of it under the platform to the wall's head);
     it holds that over the rows the top spans and eases back to its own belly at the head and at the foot,
     where it is made fast to its yards; across, it eases back over one more radius on each side. A sail no
     top reaches is not touched. */""", """     rim. So the cloth is cut here to stand 4 cm clear of each top on its mast: at each station across the
     sail it is pushed forward the least that clears every point of the top's own outline at the rows that
     point spans (topOutline: the platform's rim, the wall, the trestletrees and crosstrees under it, as
     buildTop draws them); it holds that over the rows the top spans and eases back to its own belly at the
     head and the foot, where it is made fast to its yards; across, it eases back over one more radius on
     each side. A sail no top reaches is not touched. */""")
rep("on 9 hulls 31 tops stood through the sail", "on 9 hulls 25 tops stood through the sail")
# topOutline beside buildTop
rep("""function buildTop(r, mat, mastR, year) {""", """/* r326 (0y¹⁶⁸): buildTop's outline as points [x, ρ, z, y0, y1] in the top's own frame (+x aft): each point
   stands for ρ of outline either side, between heights y0 and y1 over the top's centre. Kept beside buildTop
   so the two change together; makeSail cuts a sail set over a top to clear these. */
function topOutline(r, year, mastR) {
  const zT = mastR ? mastR + r * 0.055 : r * 0.13, thick = r * 0.09, out = [];
  const step = Math.max(0.03, r * 0.04), rho = step * 0.6;
  const edge = (x0, z0, x1, z1, h0, h1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
    for (let i = 0; i <= n; i++) out.push([x0 + (x1 - x0) * i / n, rho, z0 + (z1 - z0) * i / n, h0, h1]);
  };
  const walled = (year || 0) < 1710;
  const hTop = walled ? thick / 2 + r * 0.5 : thick / 2;
  const n = Math.ceil(2 * Math.PI * r / step);
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * i / n, px = r * Math.cos(a), pz = r * Math.sin(a);
    if (!walled && px > 0) continue;                       // the D: forward semicircle; its straight sides below
    out.push([px, rho, pz, -thick / 2, hTop]);
  }
  if (!walled) { edge(0, -r, r * 0.70, -r, -thick / 2, hTop); edge(0, r, r * 0.70, r, -thick / 2, hTop); edge(r * 0.70, -r, r * 0.70, r, -thick / 2, hTop); }
  for (const sz of [-1, 1]) {                              // the trestletrees, 1.5 r long, 0.11 r wide
    const z0 = sz * zT - r * 0.055, z1 = sz * zT + r * 0.055, h0 = -r * 0.22, h1 = -r * 0.09;
    edge(-r * 0.75, z0, r * 0.75, z0, h0, h1); edge(-r * 0.75, z1, r * 0.75, z1, h0, h1);
    edge(-r * 0.75, z0, -r * 0.75, z1, h0, h1); edge(r * 0.75, z0, r * 0.75, z1, h0, h1);
  }
  for (const sx of [-1, 1]) {                              // the crosstrees, 1.9 r long, 0.14 r wide
    const x0 = sx * r * 0.40 - r * 0.07, x1 = sx * r * 0.40 + r * 0.07, h0 = -r * 0.125, h1 = -r * 0.025;
    edge(x0, -r * 0.95, x0, r * 0.95, h0, h1); edge(x1, -r * 0.95, x1, r * 0.95, h0, h1);
    edge(x0, -r * 0.95, x1, -r * 0.95, h0, h1); edge(x0, r * 0.95, x1, r * 0.95, h0, h1);
  }
  return out;
}

function buildTop(r, mat, mastR, year) {""")
open(P, 'w').write(s)
print('ok')
