/* r149 staging sim — the searchlight platform bracket becomes the gusset a cantilevered
 * wing platform actually stands on. Pure node, no three.js: replicates the web planform
 * and placement maths the hull.js edit will use and checks the fits against the tower's
 * own levels (Yamato record numbers) before the app is touched.
 * Run: node build/staging-r149-bracket.mjs */

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ── the record, and the tower derivation as hull.js computes it ─────────────────── */
const B = 38.9, towerH = 30.0, searchlights = 8;
const K = Math.max(2, Math.min(6, Math.round(towerH / (B * 0.11))));   // 6
const dh = B * 0.080;                                                  // 3.112
const lh = (towerH - dh) / K;            // (base+towerH-tierTop[0])/K, tierTop[0]=base+dh
const nPairs = Math.min(Math.ceil(searchlights / 2), Math.max(1, K - 2));
const lvW = k => B * (0.34 - 0.20 * (k / (K - 1)));                    // level width
ok('K = 6 tower levels, 4 platform pairs = 8 brackets', K === 6 && nPairs === 4);
ok('level height holds the buried root with room', lh > 2.0, `lh ${lh.toFixed(2)}`);

/* ── the web planform, starboard local frame: z outboard (tower face at −1.25),
 *    y up (platform underside at −0.14, level floor at −0.55) ───────────────────── */
const P = [
  [-1.45, -0.10],   // root top, buried 0.20 into the tower face
  [ 0.90, -0.10],   // top edge outboard, buried 0.04 up into the platform
  [ 0.90, -0.30],   // toe under the platform rim
  [ 0.31, -0.34],   // hollow free edge raking back to the root …
  [-0.28, -0.47],
  [-0.86, -0.68],
  [-1.45, -0.98],   // root bottom
];
const WEB_X = [-0.51, 0, 0.51], WEB_T = 0.08;

ok('planform coords all finite', P.every(p => p.every(Number.isFinite)));

/* simple polygon: no two non-adjacent edges intersect */
const segX = (a, b, c, d) => {
  const s = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = s(c, d, a), d2 = s(c, d, b), d3 = s(a, b, c), d4 = s(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
};
let cross = false;
for (let i = 0; i < P.length; i++)
  for (let j = i + 2; j < P.length; j++) {
    if (i === 0 && j === P.length - 1) continue;
    if (segX(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) cross = true;
  }
ok('planform is a simple polygon', !cross);

const area = Math.abs(P.reduce((a, p, i) =>
  a + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0)) / 2;
ok('web is a real plate, not a sliver', area > 0.8, `area ${area.toFixed(2)} m²`);

const tris = WEB_X.length * (2 * (P.length - 2) + 2 * P.length);
ok('bracket is lofted past the boxy line', tris > 12, `${tris} tris`);

/* ── the r149 property: a cantilever web TAPERS — deep at the tower, thin at the toe */
const zs = P.map(p => p[0]);
const zMin = Math.min(...zs), zMax = Math.max(...zs), span = zMax - zMin;
const depthAt = zBand => {
  const ys = P.filter(p => zBand(p[0])).map(p => p[1]);
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
};
const dRoot = depthAt(z => z < zMin + span * 0.15);
const dToe  = depthAt(z => z > zMax - span * 0.15);
ok('web tapers ≥2x root to toe (the r149 audit property)', dRoot >= 2 * dToe,
   `root ${dRoot.toFixed(2)}, toe ${dToe.toFixed(2)}`);
ok('the OLD box is convicted by the same property', !(0.9 >= 2 * 0.9),
   'box ends 0.90/0.90, ratio 1.0');

/* ── fits, per platform level, real numbers ──────────────────────────────────────── */
ok('root buried into the tower face', zMin < -1.25 && zMin > -2.0, `zMin ${zMin}`);
ok('top edge buried up into the platform underside',
   Math.max(...P.map(p => p[1])) > -0.14 && Math.max(...P.map(p => p[1])) < 0.14);
/* toe under the 12-gon bottom rim of the platform (r 1.35, apothem cos π/12) */
const toeR = Math.hypot(WEB_X[2] + WEB_T / 2, zMax);
ok('toe corner under the platform disc', toeR <= 1.35 * Math.cos(Math.PI / 12) + 1e-9,
   `toe radius ${toeR.toFixed(3)} vs apothem ${(1.35 * Math.cos(Math.PI / 12)).toFixed(3)}`);
ok('webs inside the old box\'s own fore-aft envelope',
   WEB_X[2] + WEB_T / 2 <= 0.55 + 1e-9 && WEB_X[0] - WEB_T / 2 >= -0.55 - 1e-9);
ok('web x offsets are their own mirror (r118 PI-turn serves port)',
   JSON.stringify(WEB_X) === JSON.stringify(WEB_X.map(x => -x).reverse()));

/* the part of the web below its level's floor (local y < −0.55) must stay INSIDE the
   wider level below — buried in structure, not hanging in air past its face */
const densify = [];
for (let i = 0; i < P.length; i++) {
  const a = P[i], b = P[(i + 1) % P.length];
  for (let t = 0; t < 1; t += 0.02)
    densify.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
}
for (let p = 0; p < nPairs; p++) {
  const k = Math.min(1 + p, K - 1);
  const zc = lvW(k) / 2 + 1.25;
  const wBelowHalf = lvW(k - 1) / 2;
  let worst = -Infinity;
  for (const [z, y] of densify)
    if (y < -0.55) worst = Math.max(worst, zc + z);
  ok(`level ${k}: buried root inside the level below`, worst < wBelowHalf - 1e-6,
     `outermost buried point ${worst.toFixed(3)} vs face ${wBelowHalf.toFixed(3)}`);
  ok(`level ${k}: root bottom above the level below's floor`, 0.55 - 0.98 > -lh);
}

/* the deliberate outboard extension past the old box (0.90 vs 0.60): it must be under
   the platform, and nothing else lives there — the drum sits 1.35 above */
ok('outboard extension is under the platform only', zMax <= 1.35 && zMax > 0.6,
   `zMax ${zMax}`);

console.log(`\n${checks - fails}/${checks} checks passed${fails ? ` — ${fails} FAILED` : ''}`);
process.exit(fails ? 1 : 0);
