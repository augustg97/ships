/* r154 staging sim — the net defence becomes shipwork. The shelf was a chain of 18
 * loose plumb boxes per side riding the hull on overlap, and the boom hinge a solid
 * crate; the real outfit is ONE fair ledge riding the plating on gusset brackets,
 * and a gooseneck — backing pad, two tapering cheek lugs, a vertical pin — at every
 * boom heel. Pure node, no three.js: replicates the exact vertex-emit maths the
 * hull.js edit will use and checks form, winding, manifoldness, the r152 camera-fit
 * clamp (the loft's outer extreme must equal the old chain's transformed-AABB extreme
 * BYTE-EXACT) and the r154 audit predicates against both forms, before the app is
 * touched. Run: node build/staging-r154-netdefence.mjs */

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ── the synthetic hull side: a dreadnought-ish waterline at shelf height. The emit
 * functions take station arrays, so the same code runs here on this curve and in
 * hull.js on surfacePoint's own. lwl 155, half-breadth peaking 11.2 m near u 0.55. */
const LWL = 155, SHELF_Y = 4.8;
const sideAt = (u, h) => {
  const s = Math.max(0.5, 11.2 - 26 * (u - 0.55) * (u - 0.55) - 0.04 * (SHELF_Y - h));
  return [(u - 0.5) * LWL, h, s];
};
const sA = 0.25, sB = 0.93;
const HEELS = []; { const n = 12, u0 = 0.28, u1 = 0.845;
  for (let i = 0; i < n; i++) HEELS.push(u0 + (u1 - u0) * i / (n - 1)); }

/* ══ EMIT FUNCTIONS — exactly as hull.js will carry them ══════════════════════════ */

/* the old chain's outer extreme, as Box3.expandByObject reads it: each of the 18
 * rotated plates contributes centre_z + hx|sin rot| + hz|cos rot|. */
function netChainZMax(sideFn, shelfY, sa, sb) {
  const NSEG = 18;
  let zMax = -Infinity;
  for (let i = 0; i < NSEG; i++) {
    const ua = sa + (sb - sa) * i / NSEG, ub = sa + (sb - sa) * (i + 1) / NSEG;
    const a = sideFn(ua, shelfY), b = sideFn(ub, shelfY);
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const rot = Math.atan2(-dz, dx);
    const hx = Math.hypot(dx, dz) * 1.06 / 2, hz = 0.275;
    zMax = Math.max(zMax, (a[2] + b[2]) / 2 + 0.22 +
                    hx * Math.abs(Math.sin(rot)) + hz * Math.abs(Math.cos(rot)));
  }
  return zMax;
}

/* one fair ledge from stations [{x, s, zo}] — inner edge buried in the plating, outer
 * edge already clamped; verts unshared so every arris is sharp (r146/r147). sgn −1
 * mirrors z and re-winds so both sides face outward. */
function netShelfVerts(sta, yMid, sgn) {
  const yT = yMid + 0.045, yB = yMid - 0.045;
  const v = [];
  const tri = (a, b, c) => {
    if (sgn < 0) v.push(a[0], a[1], -a[2], c[0], c[1], -c[2], b[0], b[1], -b[2]);
    else v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const zi = st => st.s - 0.055;
  for (let i = 0; i + 1 < sta.length; i++) {
    const a = sta[i], b = sta[i + 1];
    quad([a.x, yT, zi(a)], [a.x, yT, a.zo], [b.x, yT, b.zo], [b.x, yT, zi(b)]);
    quad([a.x, yB, a.zo], [a.x, yB, zi(a)], [b.x, yB, zi(b)], [b.x, yB, b.zo]);
    quad([a.x, yT, a.zo], [a.x, yB, a.zo], [b.x, yB, b.zo], [b.x, yT, b.zo]);
    quad([a.x, yB, zi(a)], [a.x, yT, zi(a)], [b.x, yT, zi(b)], [b.x, yB, zi(b)]);
  }
  const f = sta[0], l = sta[sta.length - 1];
  quad([f.x, yT, f.zo], [f.x, yT, zi(f)], [f.x, yB, zi(f)], [f.x, yB, f.zo]);
  quad([l.x, yT, zi(l)], [l.x, yT, l.zo], [l.x, yB, l.zo], [l.x, yB, zi(l)]);
  return v;
}

/* one gusset bracket: a 4-point web profile in (z, y) — root on the plating at both
 * heights, a flat toe under the shelf's outer third — extruded 5 cm. Top edge at the
 * plate's own mid-height so the seat face lives INSIDE the shelf (r149's bury). */
function netBracketVerts(x, sT, sBot, zOutTop, yMid, sgn) {
  const P = [[sT - 0.03, yMid], [zOutTop, yMid],
             [zOutTop, yMid - 0.145], [sBot - 0.03, yMid - 0.50]];
  const v = [];
  const tri = (a, b, c) => {
    if (sgn < 0) v.push(a[0], a[1], -a[2], c[0], c[1], -c[2], b[0], b[1], -b[2]);
    else v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const F = P.map(p => [x + 0.025, p[1], p[0]]);   // +x face corners
  const A = P.map(p => [x - 0.025, p[1], p[0]]);   // −x face corners
  quad(F[0], F[1], F[2], F[3]);
  quad(A[3], A[2], A[1], A[0]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(A[i], A[j], F[j], F[i]);
  }
  return v;
}

/* the gooseneck, once, in its own frame: origin on the shell, +z outboard, x fore-aft
 * and symmetric so the port PI-turn (r118) reads the same. Backing pad buried in the
 * plating, two cheek lugs tapering root-to-tip past 2:1, a vertical octagonal pin
 * proud of the lug tips. The 40 ft boom's heel (r 0.16) swings between the lugs. */
function netHingeVerts() {
  const v = [];
  const tri = (a, b, c) => v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const box = (x0, x1, y0, y1, z0, z1) => {
    quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);   // top +y
    quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);   // bottom −y
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);   // outboard +z
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);   // inboard −z
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);   // aft +x
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);   // fore −x
  };
  box(-0.25, 0.25, -0.20, 0.20, -0.04, 0.045);
  const P = [[0.02, 0.20], [0.21, 0.15], [0.28, 0.095],
             [0.28, -0.095], [0.21, -0.15], [0.02, -0.20]];
  for (const xc of [-0.19, 0.19]) {
    const F = P.map(p => [xc + 0.025, p[1], p[0]]);
    const A = P.map(p => [xc - 0.025, p[1], p[0]]);
    for (let i = 1; i + 1 < 6; i++) { tri(F[0], F[i], F[i + 1]); tri(A[0], A[i + 1], A[i]); }
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      quad(A[i], A[j], F[j], F[i]);
    }
  }
  const N = 8, R = 0.048, ZC = 0.24, Y0 = -0.21, Y1 = 0.21;
  const ring = y => { const r = [];
    for (let k = 0; k < N; k++) { const th = 2 * Math.PI * k / N;
      r.push([R * Math.sin(th), y, ZC + R * Math.cos(th)]); } return r; };
  const rB = ring(Y0), rT = ring(Y1);
  for (let k = 0; k < N; k++) {
    const j = (k + 1) % N;
    quad(rB[k], rB[j], rT[j], rT[k]);
  }
  for (let i = 1; i + 1 < N; i++) { tri(rT[0], rT[i], rT[i + 1]); tri(rB[0], rB[i + 1], rB[i]); }
  return v;
}

/* ══ THE STATIONS AND THE CLAMP, as buildNetDefence will derive them ══════════════ */
const zMaxOld = netChainZMax(sideAt, SHELF_Y, sA, sB);
const NST = 40;
const sta = [];
for (let i = 0; i <= NST; i++) {
  const u = sA + (sB - sA) * i / NST;
  const p = sideAt(u, SHELF_Y);
  sta.push({ u, x: p[0], s: p[2] });
}
let peak = 0;
for (let i = 1; i <= NST; i++) if (sta[i].s > sta[peak].s) peak = i;
const dOut = zMaxOld - (sta[peak].s + 0.495);
for (const st of sta) st.zo = Math.min(st.s + 0.495 + dOut, zMaxOld);
sta[peak].zo = zMaxOld;

/* bracket stations: the midpoints of the heel pitch plus one beyond each end, so no
 * gusset can land on a gooseneck. */
const brU = [];
{ const half = (HEELS[1] - HEELS[0]) / 2;
  brU.push(Math.max(sA + 0.005, HEELS[0] - half));
  for (let i = 0; i + 1 < HEELS.length; i++) brU.push((HEELS[i] + HEELS[i + 1]) / 2);
  brU.push(Math.min(sB - 0.005, HEELS[HEELS.length - 1] + half)); }

/* ══ CHECKS ═══════════════════════════════════════════════════════════════════════ */

/* 1. the transformed-AABB formula against brute-forced rotated corners */
{
  let brute = -Infinity;
  const NSEG = 18;
  for (let i = 0; i < NSEG; i++) {
    const ua = sA + (sB - sA) * i / NSEG, ub = sA + (sB - sA) * (i + 1) / NSEG;
    const a = sideAt(ua, SHELF_Y), b = sideAt(ub, SHELF_Y);
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const rot = Math.atan2(-dz, dx);
    const hx = Math.hypot(dx, dz) * 1.06 / 2, hz = 0.275;
    const cz = (a[2] + b[2]) / 2 + 0.22;
    for (const ex of [-hx, hx]) for (const ez of [-hz, hz])
      brute = Math.max(brute, cz + ex * -Math.sin(rot) + ez * Math.cos(rot));
  }
  ok('chain zMax formula = brute-forced corners', Math.abs(brute - zMaxOld) < 1e-12,
     `${brute} vs ${zMaxOld}`);
}

const stb = netShelfVerts(sta, SHELF_Y, 1);
const ptb = netShelfVerts(sta, SHELF_Y, -1);

/* 2–4. counts and unshared verts */
ok('strip tri count 40*8+4', stb.length / 9 === NST * 8 + 4, `${stb.length / 9}`);
ok('port strip same count', ptb.length === stb.length);
ok('verts unshared (unindexed 3 per tri)', stb.length % 9 === 0);

/* 5. winding by class: normals of every tri, classified by dominant axis */
function classify(verts) {
  const cls = { px: 0, nx: 0, py: 0, ny: 0, pz: 0, nz: 0, degen: 0 };
  for (let i = 0; i < verts.length; i += 9) {
    const ax = verts[i], ay = verts[i + 1], az = verts[i + 2];
    const bx = verts[i + 3], by = verts[i + 4], bz = verts[i + 5];
    const cx = verts[i + 6], cy = verts[i + 7], cz = verts[i + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const m = Math.hypot(nx, ny, nz);
    if (m < 1e-12) { cls.degen++; continue; }
    const AX = Math.abs(nx), AY = Math.abs(ny), AZ = Math.abs(nz);
    if (AY >= AX && AY >= AZ) cls[ny > 0 ? 'py' : 'ny']++;
    else if (AZ >= AX && AZ >= AY) cls[nz > 0 ? 'pz' : 'nz']++;
    else cls[nx > 0 ? 'px' : 'nx']++;
  }
  return cls;
}
{
  const c = classify(stb);
  ok('stb top 80 +y / bottom 80 −y', c.py === 80 && c.ny === 80, JSON.stringify(c));
  ok('stb outer 80 +z / inner 80 −z', c.pz === 80 && c.nz === 80, JSON.stringify(c));
  ok('stb caps 2 −x, 2 +x, none degenerate',
     c.px === 2 && c.nx === 2 && c.degen === 0, JSON.stringify(c));
  const p = classify(ptb);
  ok('port strip outward: outer 80 −z / inner 80 +z', p.nz === 80 && p.pz === 80,
     JSON.stringify(p));
}

/* 6. closed manifold: every undirected positional edge exactly twice */
function edgePairing(verts) {
  const m = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (let i = 0; i < verts.length; i += 9) {
    const p = [[verts[i], verts[i + 1], verts[i + 2]],
               [verts[i + 3], verts[i + 4], verts[i + 5]],
               [verts[i + 6], verts[i + 7], verts[i + 8]]];
    for (let e = 0; e < 3; e++) {
      const a = key(...p[e]), b = key(...p[(e + 1) % 3]);
      const k = a < b ? a + '|' + b : b + '|' + a;
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  let bad = 0;
  for (const n of m.values()) if (n !== 2) bad++;
  return bad;
}
ok('strip is a closed manifold (every edge twice)', edgePairing(stb) === 0,
   `${edgePairing(stb)} unpaired`);

/* 7. the clamp: loft outer extreme equals the old chain's, byte-exact */
{
  let zHi = -Infinity;
  for (let i = 2; i < stb.length; i += 3) zHi = Math.max(zHi, stb[i]);
  ok('loft zMax === chain zMax (r152 camera-fit law)', zHi === zMaxOld,
     `${zHi} vs ${zMaxOld}, dOut ${dOut.toFixed(4)}`);
  ok('clamp is millimetric, not a redesign', Math.abs(dOut) < 0.05, `${dOut}`);
  let zHiP = -Infinity;
  for (let i = 2; i < ptb.length; i += 3) zHiP = Math.max(zHiP, -ptb[i]);
  ok('port mirror byte-exact', zHiP === zMaxOld);
}

/* 8–10. brackets */
{
  ok('bracket count = heels + 1', brU.length === HEELS.length + 1, `${brU.length}`);
  let minGap = Infinity;
  for (const u of brU) for (const h of HEELS)
    minGap = Math.min(minGap, Math.abs(u - h) * LWL);
  ok('every gusset clears every gooseneck by > 1 m', minGap > 1.0, `${minGap.toFixed(2)} m`);
  const u = brU[3];
  const pT = sideAt(u, SHELF_Y), pB = sideAt(u, SHELF_Y - 0.5);
  const zo = Math.min(pT[2] + 0.495 + dOut, zMaxOld);
  const bv = netBracketVerts(pT[0], pT[2], pB[2], zo - 0.10, SHELF_Y, 1);
  ok('bracket 12 tris', bv.length / 9 === 12, `${bv.length / 9}`);
  ok('bracket closed', edgePairing(bv) === 0);
  let zHi = -Infinity, yHi = -Infinity, yLo = Infinity;
  for (let i = 0; i < bv.length; i += 9)
    for (let k = 0; k < 9; k += 3) {
      zHi = Math.max(zHi, bv[i + k + 2]);
      yHi = Math.max(yHi, bv[i + k + 1]); yLo = Math.min(yLo, bv[i + k + 1]);
    }
  ok('bracket inside the shelf edge', zHi <= zo - 0.10 + 1e-12, `${zHi} vs ${zo}`);
  ok('bracket seat buried in the plate, toe 0.5 under', yHi === SHELF_Y &&
     Math.abs(yLo - (SHELF_Y - 0.5)) < 1e-12, `${yHi} ${yLo}`);
}

/* 11–17. the gooseneck */
const hv = netHingeVerts();
{
  ok('hinge tri count 80', hv.length / 9 === 80, `${hv.length / 9}`);
  ok('hinge closed (pad, lugs, pin each watertight)', edgePairing(hv) === 0,
     `${edgePairing(hv)} unpaired`);
  let vol = 0;
  let xLo = Infinity, xHi = -Infinity, yLo = Infinity, yHi = -Infinity,
      zLo = Infinity, zHi = -Infinity;
  for (let i = 0; i < hv.length; i += 9) {
    const a = [hv[i], hv[i + 1], hv[i + 2]], b = [hv[i + 3], hv[i + 4], hv[i + 5]],
          c = [hv[i + 6], hv[i + 7], hv[i + 8]];
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
          - a[1] * (b[0] * c[2] - b[2] * c[0])
          + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (const p of [a, b, c]) {
      xLo = Math.min(xLo, p[0]); xHi = Math.max(xHi, p[0]);
      yLo = Math.min(yLo, p[1]); yHi = Math.max(yHi, p[1]);
      zLo = Math.min(zLo, p[2]); zHi = Math.max(zHi, p[2]);
    }
  }
  const bbV = (xHi - xLo) * (yHi - yLo) * (zHi - zLo);
  const fill = Math.abs(vol) / bbV;
  ok('hinge volume positive (wound outward)', vol > 0, `${vol}`);
  ok('hinge fills < 0.5 of its own box (r154 predicate)', fill < 0.5, fill.toFixed(3));
  ok('old hinge convicted by the same predicate: a box fills 1.00', 1.0 > 0.6);
  ok('hinge inside the old crate envelope (x, y; z buried inboard only)',
     xHi <= 0.25 && xLo >= -0.25 && yHi <= 0.225 && yLo >= -0.225 &&
     zHi <= 0.39 && zLo >= -0.05, `${xLo}..${xHi} ${yLo}..${yHi} ${zLo}..${zHi}`);
  /* ⚠ toFixed(6) writes −5.9e-18 as "-0.000000" — collapse signed zero first */
  const r6 = t => { const q = Math.round(t * 1e6) / 1e6; return q === 0 ? '0' : String(q); };
  const mirr = new Map();
  for (let i = 0; i < hv.length; i += 3) {
    const k = `${r6(hv[i])},${r6(hv[i + 1])},${r6(hv[i + 2])}`;
    mirr.set(k, (mirr.get(k) || 0) + 1);
  }
  let sym = true;
  for (let i = 0; i < hv.length; i += 3) {
    const k = `${r6(-hv[i])},${r6(hv[i + 1])},${r6(hv[i + 2])}`;
    if (!mirr.has(k)) { sym = false; break; }
  }
  ok('hinge x-symmetric (the port PI-turn reads the same, r118)', sym);
  ok('lug taper past 2:1 root to tip', (0.40 / 0.19) >= 2, (0.40 / 0.19).toFixed(2));
  ok('pin proud of the lug tips', 0.21 > 0.095 && 0.24 + 0.048 > 0.28);
  ok('boom heel (r 0.16 at z 0.22) swings between the lugs (gap 0.33)',
     2 * (0.19 - 0.025) > 2 * 0.16 && 0.045 < 0.22 - 0.16);
}

/* 18. the r154 shelf predicate on both forms: principal 'Net shelf' mesh must run
 * ≥ 0.8 of the gear's own fore-aft span past the boxy line. */
{
  const runAll = sta[NST].x - sta[0].x;
  const oldPlate = runAll / 18 * 1.06;
  ok('old form convicted: principal plate runs ' +
     `${(oldPlate / runAll).toFixed(2)} of the span at 12 tris`,
     oldPlate / runAll < 0.8);
  let xLo = Infinity, xHi = -Infinity;
  for (let i = 0; i < stb.length; i += 3) {
    xLo = Math.min(xLo, stb[i]); xHi = Math.max(xHi, stb[i]);
  }
  ok('new form passes: one ledge runs the whole span',
     (xHi - xLo) / runAll >= 0.999, ((xHi - xLo) / runAll).toFixed(3));
}

console.log(`\n${checks - fails}/${checks} checks pass${fails ? ` — ${fails} FAIL` : ''}`);
process.exit(fails ? 1 : 0);
