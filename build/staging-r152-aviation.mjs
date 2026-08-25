/* r152 staging sim — the aviation deck's steelwork becomes steelwork, and the steel
 * rudder becomes a foil. A catapult is a truss in life, a launch rail is a girder, a
 * crane jib is a tapering lattice, and a balanced rudder is a streamlined foil — none
 * of them is a crate. Pure node, no three.js: replicates the exact vertex-emit maths
 * the hull.js edit will use and checks form, fit, winding and the r152 audit
 * properties before the app is touched.  Run: node build/staging-r152-aviation.mjs */

import { readFileSync } from 'node:fs';

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ── the one member helper hull.js will use ───────────────────────────────────────
 * A box member from end-face centre A to end-face centre B, section w × h; w lies
 * along nW = unit(axis × up) (or x̂ × axis for vertical members), h along
 * nH = unit(nW × axis). Emits 12 triangles, outward wound, verts unshared. */
function barTris(out, A, B, w, h, endX) {
  const ax = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const len = Math.hypot(ax[0], ax[1], ax[2]);
  const u = [ax[0] / len, ax[1] / len, ax[2] / len];
  /* nW = unit(u × ŷ); degenerate for vertical members, where x̂ serves */
  let nW = [u[2], 0, -u[0]];
  let m = Math.hypot(nW[0], nW[1], nW[2]);
  if (m < 1e-6) { nW = [1, 0, 0]; m = 1; }
  nW = [nW[0] / m, nW[1] / m, nW[2] / m];
  const nH = [u[1] * nW[2] - u[2] * nW[1], u[2] * nW[0] - u[0] * nW[2],
              u[0] * nW[1] - u[1] * nW[0]];
  const c = (P, sw, sh) => {
    const p = [P[0] + nW[0] * sw * w / 2 + nH[0] * sh * h / 2,
               P[1] + nW[1] * sw * w / 2 + nH[1] * sh * h / 2,
               P[2] + nW[2] * sw * w / 2 + nH[2] * sh * h / 2];
    /* endX: shear the corner back along the axis until the end face is a
       constant-x plane — a mitred member end, so a raking chord's cap cannot
       poke past the envelope its end-face centre sits on */
    if (endX && Math.abs(u[0]) > 1e-6) {
      const t = (P[0] - p[0]) / u[0];
      p[0] = P[0]; p[1] += u[1] * t; p[2] += u[2] * t;
    }
    return p;
  };
  /* 0..3 at A, 4..7 at B, corners (−,−)(+,−)(+,+)(−,+) in (w,h) */
  const v = [c(A, -1, -1), c(A, 1, -1), c(A, 1, 1), c(A, -1, 1),
             c(B, -1, -1), c(B, 1, -1), c(B, 1, 1), c(B, -1, 1)];
  const quad = (a, b, cc, d) => out.push(v[a], v[b], v[cc], v[a], v[cc], v[d]);
  quad(0, 3, 2, 1);          // A cap, outward = −u
  quad(4, 5, 6, 7);          // B cap, outward = +u
  quad(0, 1, 5, 4);          // −h side
  quad(2, 3, 7, 6);          // +h side
  quad(1, 2, 6, 5);          // +w side
  quad(3, 0, 4, 7);          // −w side
}

/* ── the catapult truss, exactly as hull.js will emit it ──────────────────────────
 * Local frame: geometry centred at the origin like the BoxGeometry(len, 0.9, 1.4)
 * it replaces — x along the beam, y ±0.45, z ±0.7; the mesh keeps position.y 1.45.
 * Two Warren-with-verticals side trusses, top cross-beams under the rail at every
 * panel point, bottom cross-struts at every other. */
const TR_D = 0.90, TR_W = 1.40, TR_C = 0.14, TR_V = 0.10, TR_G = 0.09, TR_X = 0.10;
function catapultTrussTris(len) {
  const out = [];
  const yB = -TR_D / 2 + TR_C / 2, yT = TR_D / 2 - TR_C / 2;   // chord centrelines
  const zS = TR_W / 2 - TR_C / 2;                              // side-truss planes
  const x0 = -len / 2, x1 = len / 2;
  for (const sz of [-1, 1]) {
    barTris(out, [x0, yB, sz * zS], [x1, yB, sz * zS], TR_C, TR_C);
    barTris(out, [x0, yT, sz * zS], [x1, yT, sz * zS], TR_C, TR_C);
  }
  const N = Math.max(6, Math.round(len / 1.62));
  const px = i => (x0 + TR_C / 2) + (i / N) * (len - TR_C);    // panel points, inset
  for (let i = 0; i <= N; i++) {
    for (const sz of [-1, 1])
      barTris(out, [px(i), yB, sz * zS], [px(i), yT, sz * zS], TR_V, TR_V);
    barTris(out, [px(i), yT, -zS], [px(i), yT, zS], TR_X, TR_X);
    if (i % 2 === 0 && i < N)
      barTris(out, [px(i), yB, -zS], [px(i), yB, zS], TR_G, TR_G);
  }
  for (let i = 0; i < N; i++)
    for (const sz of [-1, 1]) {
      const a = i % 2 ? [px(i), yT, sz * zS] : [px(i), yB, sz * zS];
      const b = i % 2 ? [px(i + 1), yB, sz * zS] : [px(i + 1), yT, sz * zS];
      barTris(out, a, b, TR_G, TR_G);
    }
  return out;
}

/* ── the launch rail girder, exactly as hull.js will emit it ──────────────────────
 * Local frame centred like the BoxGeometry(len·0.96, 0.18, 0.5) it replaces:
 * y ±0.09, z ±0.25. Foot flange full width, narrow web, and the head split into two
 * rail strips with the shuttle slot down the middle; the strip tops stay at +0.09 so
 * the floatplane's float still seats at 2.08 exactly. */
const RL_HH = 0.09, RL_HW = 0.25, RL_FT = 0.045, RL_WEB = 0.05, RL_HD = 0.06, RL_SLOT = 0.055;
function railGirderTris(len) {
  const out = [], L = len * 0.96, x0 = -L / 2, x1 = L / 2;
  const slab = (yLo, yHi, zLo, zHi) =>
    barTris(out, [x0, (yLo + yHi) / 2, (zLo + zHi) / 2],
                 [x1, (yLo + yHi) / 2, (zLo + zHi) / 2], zHi - zLo, yHi - yLo);
  slab(-RL_HH, -RL_HH + RL_FT, -RL_HW, RL_HW);                 // foot flange
  slab(-RL_HH + RL_FT, RL_HH - RL_HD, -RL_WEB, RL_WEB);        // web
  slab(RL_HH - RL_HD, RL_HH, RL_SLOT, RL_HW);                  // head strip, +z
  slab(RL_HH - RL_HD, RL_HH, -RL_HW, -RL_SLOT);                // head strip, −z
  return out;
}

/* ── the crane jib lattice, exactly as hull.js will emit it ───────────────────────
 * Local frame centred like the BoxGeometry(jibL, 0.6, 0.6) it replaces — heel at −x
 * against the post, head at +x over the stern. Four chords taper 0.60 → 0.24 outer
 * section; zig-zag lacing on all four faces; a square frame at each end; the sheave
 * housing at the head. */
const JB_H0 = 0.60, JB_H1 = 0.24, JB_C = 0.085, JB_L = 0.055;
function craneJibTris(jibL) {
  const out = [];
  const x0 = -jibL / 2, x1 = jibL / 2;
  const half = x => (JB_H0 + (JB_H1 - JB_H0) * (x - x0) / jibL) / 2 - JB_C / 2;
  const chord = (sy, sz, x) => [x, sy * half(x), sz * half(x)];
  for (const sy of [-1, 1]) for (const sz of [-1, 1])
    barTris(out, chord(sy, sz, x0), chord(sy, sz, x1), JB_C, JB_C, true);
  const M = Math.max(5, Math.round(jibL / 1.4));
  const px = i => x0 + (i / M) * jibL;
  /* zig-zag lacing on the two side faces — the faces a broadside reads; the top and
     bottom faces take transverse rungs, which stay their own z-mirror (a single
     zig-zag across z cannot) */
  for (let i = 0; i < M; i++) {
    const a = i % 2 ? 1 : -1, b = -a;
    for (const s of [-1, 1])
      barTris(out, chord(a, s, px(i)), chord(b, s, px(i + 1)), JB_L, JB_L, true);
  }
  for (let i = 1; i < M; i++)
    for (const sy of [-1, 1])
      barTris(out, chord(sy, -1, px(i)), chord(sy, 1, px(i)), JB_L, JB_L);
  for (const x of [x0 + JB_C / 2, x1 - JB_C / 2]) {
    for (const sy of [-1, 1])
      barTris(out, chord(sy, -1, x), chord(sy, 1, x), JB_L, JB_L);
    for (const sz of [-1, 1])
      barTris(out, chord(-1, sz, x), chord(1, sz, x), JB_L, JB_L);
  }
  barTris(out, [x1 - 0.30, 0, 0], [x1, 0, 0], 0.34, 0.18);     // sheave housing
  /* a raking chord's tilted section grazes micrometres past the envelope at the
     heel; clamp every corner to the old box's own faces, so the mesh's extreme
     points — which the Shipwright's camera fit reads — are EXACTLY the old box's.
     A 2 mm inset here moved the jib tip, refitted the camera by a sub-pixel and
     ghosted every silhouette in the frame (r152's own lesson). */
  for (const p of out) {
    p[1] = Math.max(-JB_H0 / 2, Math.min(JB_H0 / 2, p[1]));
    p[2] = Math.max(-JB_H0 / 2, Math.min(JB_H0 / 2, p[2]));
  }
  return out;
}

/* ── the steel rudder foil, exactly as hull.js will emit it ───────────────────────
 * The plate's own trapezoid planform — LE/TE lines unchanged, so the bounding box
 * cannot move — lofted as a closed foil: round nose, thickness peaking near 25% of
 * chord, tapering to a near-sharp trailing edge closed by its own thin face. */
const FOIL_S  = [0.00, 0.03, 0.10, 0.25, 0.45, 0.65, 0.82, 1.00];
const FOIL_F  = [0.00, 0.55, 0.85, 1.00, 0.92, 0.72, 0.45, 0.06];
function steelRudderTris(p0x, top, depth, w, chord) {
  const rows = [
    { y: top,   xLE: p0x - chord * 1.6,  xTE: p0x - chord * 0.6 },
    { y: depth, xLE: p0x - chord * 1.45, xTE: p0x - chord * 0.75 },
  ];
  const ring = r => {
    const pts = [];
    for (let i = FOIL_S.length - 1; i >= 0; i--)               // TE → nose, −z side
      pts.push([r.xLE + FOIL_S[i] * (r.xTE - r.xLE), r.y, -FOIL_F[i] * w]);
    for (let i = 1; i < FOIL_S.length; i++)                    // nose → TE, +z side
      pts.push([r.xLE + FOIL_S[i] * (r.xTE - r.xLE), r.y,  FOIL_F[i] * w]);
    return pts;                                                // closed loop of 15
  };
  const rT = ring(rows[0]), rB = ring(rows[1]), n = rT.length, out = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push(rT[i], rB[i], rB[j], rT[i], rB[j], rT[j]);        // wall, outward
  }
  const cen = r => r.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
  const cT = cen(rT), cB = cen(rB);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push(cT, rT[i], rT[j]);                                // top cap, +y out
    out.push(cB, rB[j], rB[i]);                                // bottom cap, −y out
  }
  return out;
}

/* ══ checks ══════════════════════════════════════════════════════════════════════ */
const V = tris => tris.length / 3;                             // triangle count
const bbox = tris => {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of tris) for (let k = 0; k < 3; k++) {
    lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]);
  }
  return { lo, hi };
};
const signedVol = tris => {
  let v = 0;
  for (let i = 0; i < tris.length; i += 3) {
    const [a, b, c] = [tris[i], tris[i + 1], tris[i + 2]];
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return v;
};
const noNaN = tris => tris.every(p => p.every(Number.isFinite));
const degenerate = tris => {
  let bad = 0;
  for (let i = 0; i < tris.length; i += 3) {
    const [a, b, c] = [tris[i], tris[i + 1], tris[i + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    if (Math.hypot(cr[0], cr[1], cr[2]) < 1e-9) bad++;
  }
  return bad;
};
/* r151's positional edge-pairing: on a properly wound closed surface every directed
   edge appears exactly once and its reverse exactly once. */
const edgePaired = tris => {
  const m = new Map(), key = p => p.map(x => x.toFixed(6)).join(',');
  for (let i = 0; i < tris.length; i += 3) {
    const t = [tris[i], tris[i + 1], tris[i + 2]];
    for (let e = 0; e < 3; e++) {
      const k = key(t[e]) + '|' + key(t[(e + 1) % 3]);
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  for (const [k, cnt] of m) {
    if (cnt !== 1) return false;
    const [a, b] = k.split('|');
    if ((m.get(b + '|' + a) || 0) !== 1) return false;
  }
  return true;
};
/* 0.1 mm tolerance: a raking member's normalised section frame differs from its
   mirror's by micrometres, which is not an asymmetry a viewer or a rule cares about */
const zMirrored = tris => {
  const s = new Set(), key = p => `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`;
  for (const p of tris) s.add(key(p));
  for (const p of tris) if (!s.has(key([p[0], p[1], -p[2]]))) return false;
  return true;
};

/* the record's own numbers */
const vs = JSON.parse(readFileSync(new URL('../web/data/vessels.json', import.meta.url)));
const vl = vs.vessels || vs;
const yam = vl.find(v => v.id === 'yamato').hull;
const LEN = yam.catapults.lenM;                                // 19.4
const JIBL = LEN * 0.65;

console.log('── bar helper ──');
{
  const t = []; barTris(t, [0, 0, 0], [3, 0, 0], 0.2, 0.1);
  ok('bar tris = 12', V(t) === 12);
  ok('bar volume = w·h·len', Math.abs(signedVol(t) - 3 * 0.2 * 0.1) < 1e-9,
     `${signedVol(t)}`);
  ok('bar edge-paired', edgePaired(t));
  const d = []; barTris(d, [0, 0, 0], [2, 1.5, 0], 0.1, 0.1);   // a diagonal
  ok('diagonal bar volume', Math.abs(signedVol(d) - Math.hypot(2, 1.5) * 0.01) < 1e-9);
  ok('diagonal bar edge-paired', edgePaired(d));
  const vv = []; barTris(vv, [1, 0, 2], [1, 3, 2], 0.1, 0.1);   // a vertical
  ok('vertical bar volume', Math.abs(signedVol(vv) - 3 * 0.01) < 1e-9);
}

console.log('── catapult truss ──');
{
  const t = catapultTrussTris(LEN);
  const N = Math.max(6, Math.round(LEN / 1.62));
  const members = 4 + 2 * (N + 1) + (N + 1) + Math.ceil(N / 2) + 2 * N;
  ok('member count as designed', V(t) === members * 12,
     `${V(t)} tris for ${members} members`);
  console.log(`  (truss: ${members} members, ${V(t)} tris, N=${N} panels)`);
  ok('no NaN', noNaN(t));
  ok('no degenerate tris', degenerate(t) === 0);
  const bb = bbox(t);
  ok('bbox = the old box exactly',
     Math.abs(bb.lo[0] + LEN / 2) < 1e-9 && Math.abs(bb.hi[0] - LEN / 2) < 1e-9 &&
     Math.abs(bb.lo[1] + 0.45) < 1e-9 && Math.abs(bb.hi[1] - 0.45) < 1e-9 &&
     Math.abs(bb.lo[2] + 0.70) < 1e-9 && Math.abs(bb.hi[2] - 0.70) < 1e-9,
     JSON.stringify(bb));
  ok('z-mirror symmetric', zMirrored(t));
  const ratio = Math.abs(signedVol(t)) / (LEN * TR_D * TR_W);
  ok('open web: volume ≤ 0.25 of bbox', ratio <= 0.25, ratio.toFixed(3));
  const oldBeam = []; barTris(oldBeam, [-LEN / 2, 0, 0], [LEN / 2, 0, 0], TR_W, TR_D);
  const oldRatio = Math.abs(signedVol(oldBeam)) / (LEN * TR_D * TR_W);
  ok('old beam convicted by the same test', V(oldBeam) <= 60 && oldRatio > 0.25,
     `${V(oldBeam)} tris, fill ${oldRatio.toFixed(3)}`);
  console.log(`  (fill ratio ${ratio.toFixed(3)}; the old box ${oldRatio.toFixed(3)}, convicted)`);
}

console.log('── launch rail girder ──');
{
  const t = railGirderTris(LEN);
  ok('4 slabs = 48 tris', V(t) === 48);
  ok('no NaN', noNaN(t));
  ok('no degenerate tris', degenerate(t) === 0);
  const bb = bbox(t);
  ok('bbox = the old rail exactly',
     Math.abs(bb.lo[0] + LEN * 0.48) < 1e-9 && Math.abs(bb.hi[0] - LEN * 0.48) < 1e-9 &&
     Math.abs(bb.lo[1] + 0.09) < 1e-9 && Math.abs(bb.hi[1] - 0.09) < 1e-9 &&
     Math.abs(bb.lo[2] + 0.25) < 1e-9 && Math.abs(bb.hi[2] - 0.25) < 1e-9,
     JSON.stringify(bb));
  ok('z-mirror symmetric', zMirrored(t));
  /* r152b: a launch rail carries its shuttle in a SLOT — in the head band (the top
     third of the rail's height) no triangle may cross the centreline. Vertex-band
     width reads are degenerate on an 8-vertex box (no vertex falls mid-height), so
     the property is asked of TRIANGLES, which is what the old box cannot dodge:
     its top face spans the full width. */
  const headCross = tris => {
    let yHi = -1e9;
    for (const p of tris) yHi = Math.max(yHi, p[1]);
    const yLim = yHi - 0.05;                    // the top 5 cm: the rail head alone
    for (let i = 0; i < tris.length; i += 3) {
      const tr = [tris[i], tris[i + 1], tris[i + 2]];
      if (tr.every(p => p[1] >= yLim - 1e-9) &&
          Math.min(...tr.map(p => p[2])) < -0.02 &&
          Math.max(...tr.map(p => p[2])) > 0.02) return true;
    }
    return false;
  };
  ok('slot: no head-band triangle crosses the centreline', !headCross(t));
  const oldRail = []; barTris(oldRail, [-LEN * 0.48, 0, 0], [LEN * 0.48, 0, 0], 0.5, 0.18);
  ok('old rail convicted by the same test', headCross(oldRail));
  /* the float seat is unmoved */
  let topY = -1e9;
  for (const p of t) topY = Math.max(topY, p[1]);
  ok('float seat: rail top at mesh +0.09 → world 2.08', Math.abs(topY - 0.09) < 1e-9 &&
     Math.abs(1.99 + topY - 2.08) < 1e-9);
}

console.log('── crane jib lattice ──');
{
  const t = craneJibTris(JIBL);
  const M = Math.max(5, Math.round(JIBL / 1.4));
  const members = 4 + 2 * M + 2 * (M - 1) + 8 + 1;
  ok('member count as designed', V(t) === members * 12,
     `${V(t)} tris for ${members} members, M=${M}`);
  console.log(`  (jib: ${members} members, ${V(t)} tris, M=${M} panels)`);
  ok('no NaN', noNaN(t));
  ok('no degenerate tris', degenerate(t) === 0);
  const bb = bbox(t);
  ok('bbox = the old box exactly (the camera fit reads these extremes)',
     Math.abs(bb.lo[0] + JIBL / 2) < 1e-9 && Math.abs(bb.hi[0] - JIBL / 2) < 1e-9 &&
     Math.abs(bb.lo[1] + 0.30) < 1e-9 && Math.abs(bb.hi[1] - 0.30) < 1e-9 &&
     Math.abs(bb.lo[2] + 0.30) < 1e-9 && Math.abs(bb.hi[2] - 0.30) < 1e-9,
     JSON.stringify(bb));
  ok('z-mirror symmetric', zMirrored(t));
  const ratio = Math.abs(signedVol(t)) / (JIBL * 0.6 * 0.6);
  ok('open web: volume ≤ 0.25 of bbox', ratio <= 0.25, ratio.toFixed(3));
  console.log(`  (fill ratio ${ratio.toFixed(3)}; old box = 1.000, convicted)`);
  /* the lattice tapers: outer section at the head 0.4 × the heel's */
  let heel = 0, head = 0;
  for (const p of t) {
    if (p[0] < -JIBL / 2 + 0.4 && Math.abs(p[0] - (-JIBL / 2)) < 0.4)
      heel = Math.max(heel, Math.abs(p[1]));
    if (p[0] > JIBL / 2 - 0.4 && Math.abs(p[2]) < 0.2)
      head = Math.max(head, Math.abs(p[1]));
  }
  ok('jib tapers to its head', head <= 0.55 * heel, `${head} vs ${heel}`);
}

console.log('── steel rudder foil ──');
for (const id of ['yamato', 'queen-mary-2', 'dreadnought']) {
  const h = vl.find(v => v.id === id).hull;
  /* hull.js: top = −draught·0.08, depth = −draught·0.95, w = 0.030·beam·0.45,
     chord = lwl·0.035; p0x at the stern — use lwl/2 (postLean is 0 below y=0). */
  const p0x = h.lwl / 2, top = -h.draught * 0.08, depth = -h.draught * 0.95;
  const w = 0.030 * h.beam * 0.45, chord = h.lwl * 0.035;
  const t = steelRudderTris(p0x, top, depth, w, chord);
  ok(`${id}: 60 tris`, V(t) === 60, `${V(t)}`);
  ok(`${id}: no NaN`, noNaN(t));
  ok(`${id}: no degenerate tris`, degenerate(t) === 0);
  ok(`${id}: edge-paired closed surface`, edgePaired(t));
  ok(`${id}: positive volume`, signedVol(t) > 0, `${signedVol(t)}`);
  const bb = bbox(t);
  const obb = { lo: [p0x - chord * 1.6, depth, -w], hi: [p0x - chord * 0.6, top, w] };
  ok(`${id}: bbox = the old plate exactly`,
     Math.abs(bb.lo[0] - obb.lo[0]) < 1e-9 && Math.abs(bb.hi[0] - obb.hi[0]) < 1e-9 &&
     Math.abs(bb.lo[1] - obb.lo[1]) < 1e-9 && Math.abs(bb.hi[1] - obb.hi[1]) < 1e-9 &&
     Math.abs(bb.lo[2] - obb.lo[2]) < 1e-9 && Math.abs(bb.hi[2] - obb.hi[2]) < 1e-9,
     `${JSON.stringify(bb)} vs ${JSON.stringify(obb)}`);
  /* r152c: a foil tapers to its trailing edge — the aft 10% of the chord run must
     be thin (a NACA00 section still carries 44% of max thickness at 80% chord, so
     the band is the last tenth, where the section really has closed). Old plate:
     full thickness at the TE, ratio 1.0, convicted. */
  let zAft = 0, zMax = 0;
  const xHi = bb.hi[0], xLo = bb.lo[0];
  for (const p of t) {
    zMax = Math.max(zMax, Math.abs(p[2]));
    if (p[0] > xHi - (xHi - xLo) * 0.10) zAft = Math.max(zAft, Math.abs(p[2]));
  }
  ok(`${id}: foil tapers aft (≤ 0.35 in the last tenth)`, zAft <= 0.35 * zMax,
     `${(zAft / zMax).toFixed(3)}`);
  if (id === 'yamato')
    console.log(`  (yamato foil: chord ${chord.toFixed(2)} m, max thickness ` +
      `${(2 * w).toFixed(2)} m = ${(2 * w / chord * 100).toFixed(0)}% t/c; ` +
      `TE ratio ${(zAft / zMax).toFixed(3)}, old plate 1.000, convicted)`);
}

console.log('── predicted probe deltas ──');
{
  const N = Math.max(6, Math.round(LEN / 1.62));
  const M = Math.max(5, Math.round(JIBL / 1.4));
  const truss = (4 + 2 * (N + 1) + (N + 1) + Math.ceil(N / 2) + 2 * N) * 12;
  const rail = 48, jib = (4 + 2 * M + 2 * (M - 1) + 8 + 1) * 12;
  const oldCat = 220;                          // probe r151: 8 meshes, 220 tris
  const nw = oldCat - 2 * 12 - 2 * 12 - 12 + 2 * (truss - 12) + 2 * (rail - 12) + (jib - 12);
  console.log(`  catapult class: 220 → ${oldCat - 5 * 12 + 2 * truss + 2 * rail + jib} tris ` +
    `(truss ${truss} ×2, rail ${rail} ×2, jib ${jib}); boxy 5 → 0`);
  console.log(`  rudder: 12 → 60 tris; boxy 1 → 0; ship boxy 6 → 0 (0%)`);
  void nw;
}

console.log(`\n${checks - fails}/${checks} checks passed${fails ? ' — ' + fails + ' FAILED' : ''}`);
process.exit(fails ? 1 : 0);
