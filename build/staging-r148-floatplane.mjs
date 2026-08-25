/* r148 staging sim — the floatplane becomes one body (the r145 airframe law reaching
 * the catapult aircraft). Pure node, no three.js: replicates the loft and planform
 * maths the hull.js edit will use and checks them against the OLD meshes' own
 * envelope before the app is touched. Run: node build/staging-r148-floatplane.mjs */

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ── the old form's own envelope, from hull.js as it stands ──────────────────────────
 * cowl:   cylinder r 0.58, x −3.8..−2.8, centre y 2.35
 * barrel: cylinder r 0.52, x −2.9..3.7,  centre y 2.35
 * cone:   r 0.52→0.16,     x 3.7..5.2,   centre y 2.35                                */
const oldR = x => {
  let r = -Infinity;
  if (x >= -3.8 - 1e-6 && x <= -2.8 + 1e-6) r = Math.max(r, 0.58);
  if (x >= -2.9 - 1e-6 && x <= 3.7 + 1e-6) r = Math.max(r, 0.52);
  if (x >= 3.7 - 1e-6 && x <= 5.2 + 1e-6) r = Math.max(r, 0.52 + (0.16 - 0.52) * (x - 3.7) / 1.5);
  return r;
};

/* ── the new fuselage stations [x, halfW, halfH, yCentre] ──────────────────────────── */
const stations = [
  [-3.80, 0.55, 0.55, 2.35],
  [-3.45, 0.58, 0.58, 2.35],
  [-2.85, 0.56, 0.56, 2.35],
  [-2.20, 0.50, 0.52, 2.35],
  [-0.60, 0.46, 0.52, 2.35],
  [ 1.00, 0.40, 0.48, 2.37],
  [ 2.40, 0.30, 0.38, 2.40],
  [ 3.70, 0.19, 0.26, 2.42],
  [ 4.50, 0.10, 0.16, 2.42],
  [ 5.20, 0.03, 0.075, 2.42]];

ok('stations strictly increasing in x',
   stations.every((s, i) => !i || s[0] > stations[i - 1][0]));
ok('stations all finite and positive',
   stations.every(s => s.every(Number.isFinite) && s[1] > 0 && s[2] > 0));

let envBad = '';
for (const [x, w, h, yc] of stations) {
  const r = oldR(x), tol = 0.005;
  if (w > r + tol) envBad += `z ${w} > r ${r.toFixed(3)} at x ${x}; `;
  if (yc + h > 2.35 + r + tol) envBad += `top ${(yc + h).toFixed(3)} > ${(2.35 + r).toFixed(3)} at x ${x}; `;
  if (yc - h < 2.35 - r - tol) envBad += `belly ${(yc - h).toFixed(3)} < ${(2.35 - r).toFixed(3)} at x ${x}; `;
}
ok('every station inside the old cylinders\' own envelope', !envBad, envBad);

/* ── generate the loft exactly as the builder will: K=12, superellipse exp 2.5 ─────── */
const K = 12, pos = [], idx = [];
const se = (v, m) => m * Math.sign(v) * Math.pow(Math.abs(v), 2 / 2.5);
stations.forEach(([x, w, h, yc]) => {
  for (let k = 0; k < K; k++) {
    const th = (k / K) * 2 * Math.PI;
    pos.push([x, yc + se(Math.sin(th), h), se(Math.cos(th), w)]);
  }
});
/* cowl rows first (material group 0), then skin rows, caps with their groups */
const rows = [];
for (let s = 0; s < stations.length - 1; s++)
  for (let k = 0; k < K; k++) {
    const a = s * K + k, b = s * K + (k + 1) % K;
    rows.push([a, a + K, b], [b, a + K, b + K]);
  }
const nose = pos.length; pos.push([-3.80, 2.35, 0]);
const noseCap = [];
for (let k = 0; k < K; k++) noseCap.push([nose, k, (k + 1) % K]);
const tailC = pos.length; pos.push([5.20, 2.42, 0]);
const last = (stations.length - 1) * K;
const tailCap = [];
for (let k = 0; k < K; k++) tailCap.push([tailC, last + (k + 1) % K, last + k]);
const tris = rows.concat(noseCap, tailCap);

ok('0 NaN in the loft', pos.every(p => p.every(Number.isFinite)));

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = t => cross(sub(pos[t[1]], pos[t[0]]), sub(pos[t[2]], pos[t[0]]));
const mag = v => Math.hypot(v[0], v[1], v[2]);

ok('0 degenerate triangles', tris.every(t => mag(nrm(t)) > 1e-9));

/* windings: tube tris face outward from the section centre; caps face out the ends */
let wBad = 0;
for (const t of rows) {
  const n = nrm(t);
  const c = [(pos[t[0]][0] + pos[t[1]][0] + pos[t[2]][0]) / 3,
             (pos[t[0]][1] + pos[t[1]][1] + pos[t[2]][1]) / 3,
             (pos[t[0]][2] + pos[t[1]][2] + pos[t[2]][2]) / 3];
  /* radial from the local centreline at this x (yc interpolated station-to-station) */
  const yc = 2.35 + (2.42 - 2.35) * Math.max(0, (c[0] - 1.0) / 4.2);
  if (n[1] * (c[1] - yc) + n[2] * c[2] < 0) wBad++;
}
for (const t of noseCap) if (nrm(t)[0] > 0) wBad++;
for (const t of tailCap) if (nrm(t)[0] < 0) wBad++;
ok('every winding on its face class', wBad === 0, `${wBad} against`);

/* ── flying-surface planforms (x chord, s span/height), the r145 plate law ─────────── */
const wingHi = [[-2.075, 0.0], [-2.05, 2.0], [-1.98, 3.8], [-1.86, 4.9], [-1.62, 5.45],
                [-1.28, 5.60], [-0.95, 5.52], [-0.70, 5.18], [-0.55, 4.60], [-0.44, 3.40],
                [-0.35, 1.4], [-0.325, 0.0]];
const wingLo = [[-1.525, 0.0], [-1.505, 2.0], [-1.45, 3.6], [-1.34, 4.6], [-1.12, 5.15],
                [-0.80, 5.40], [-0.46, 5.32], [-0.22, 4.95], [-0.06, 4.40], [0.05, 3.2],
                [0.115, 1.2], [0.125, 0.0]];
const fin = [[3.95, 2.42], [4.02, 3.00], [4.18, 3.55], [4.45, 3.90], [4.80, 4.02],
             [5.12, 3.92], [5.30, 3.60], [5.34, 3.15], [5.30, 2.70], [5.28, 2.42]];
const stab = [[3.80, 0.0], [3.83, 0.9], [3.93, 1.35], [4.12, 1.60], [4.42, 1.70],
              [4.72, 1.60], [4.92, 1.30], [5.00, 0.8], [5.04, 0.0]];
const blade = [[-0.05, 0.14], [-0.10, 0.50], [-0.135, 0.85], [-0.11, 1.10], [-0.02, 1.235],
               [0.09, 1.13], [0.125, 0.88], [0.10, 0.50], [0.05, 0.14]];

/* a planform must be a simple polygon: no two non-adjacent edges intersect */
function simple(pts) {
  const n = pts.length;
  const segs = pts.map((p, i) => [p, pts[(i + 1) % n]]);
  const x = (a, b, c, d) => {
    const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    const d3 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]);
    const d4 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (x(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) return false;
    }
  return true;
}
const area = pts => Math.abs(pts.reduce((a, p, i) => {
  const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1];
}, 0)) / 2;

for (const [nm, pts] of [['upper wing', wingHi], ['lower wing', wingLo], ['fin', fin],
                         ['stab', stab], ['prop blade', blade]]) {
  ok(`${nm} planform simple`, simple(pts));
  ok(`${nm} planform has real area`, area(pts) > 0.05, area(pts).toFixed(3));
}

/* planforms inside the old boxes' own chord/span envelopes */
const inBox = (pts, x0, x1, s0, s1) =>
  pts.every(p => p[0] >= x0 - 1e-6 && p[0] <= x1 + 1e-6 && p[1] >= s0 - 1e-6 && p[1] <= s1 + 1e-6);
ok('upper wing inside its old box', inBox(wingHi, -2.075, -0.325, 0, 5.6));
ok('lower wing inside its old box', inBox(wingLo, -1.525, 0.125, 0, 5.4));
ok('fin inside its old box (root buried below it)', inBox(fin, 3.85, 5.35, 2.42, 4.025));
ok('stab inside its old box', inBox(stab, 3.725, 5.075, 0, 1.7));
ok('prop blade inside the old disc', blade.every(p => Math.hypot(p[0], p[1]) <= 1.25 + 0.02));

/* ── fit checks: what must touch, touches ──────────────────────────────────────────── */
const chordAt = (pts, s) => {
  /* walk the polygon edges, collect x where the edge crosses span s */
  const xs = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if ((a[1] - s) * (b[1] - s) <= 0 && a[1] !== b[1])
      xs.push(a[0] + (b[0] - a[0]) * (s - a[1]) / (b[1] - a[1]));
  }
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
};
/* interplane struts at z ±4.55, stations x −1.22 and −0.68: under BOTH wings */
for (const sx of [-1.22, -0.68]) {
  const hi = chordAt(wingHi, 4.55), lo = chordAt(wingLo, 4.55);
  ok(`interplane strut at ${sx} under both wings`,
     hi && lo && sx > hi[0] && sx < hi[1] && sx > lo[0] && sx < lo[1],
     `hi ${hi} lo ${lo}`);
}
/* cabane strut x −1.0 at z 0.6 under the upper wing; length reaches its underside */
{
  const hi = chordAt(wingHi, 0.6);
  ok('cabane strut under the upper wing', hi && -1.0 > hi[0] && -1.0 < hi[1], `hi ${hi}`);
  const top = 3.22 + 0.85 / 2, wingUnder = 3.65 - 0.06;
  ok('cabane strut reaches the upper wing underside', top > wingUnder,
     `${top.toFixed(3)} vs ${wingUnder}`);
}
/* wingtip float strut at x −0.70, z 4.7: under the lower wing, buried into it */
{
  const lo = chordAt(wingLo, 4.7);
  ok('tip-float strut under the lower wing', lo && -0.70 > lo[0] && -0.70 < lo[1], `lo ${lo}`);
  ok('tip-float strut buried into the wing', 1.6 + 0.375 > 1.95 - 0.06);
}
/* fin root buried: root y 2.42 below the fuselage top along the fin's whole run */
{
  const topAt = x => {
    for (let i = 0; i < stations.length - 1; i++) {
      const a = stations[i], b = stations[i + 1];
      if (x >= a[0] && x <= b[0]) {
        const t = (x - a[0]) / (b[0] - a[0]);
        return (a[3] + t * (b[3] - a[3])) + (a[2] + t * (b[2] - a[2]));
      }
    }
    return -Infinity;
  };
  let worst = Infinity, wx = 0;
  for (let x = 3.95; x <= 5.2; x += 0.05) {
    const m = topAt(x) - 2.42;
    if (m < worst) { worst = m; wx = x; }
  }
  ok('fin root buried under the fuselage top over its whole run', worst > 0.02,
     `worst margin ${worst.toFixed(3)} at x ${wx.toFixed(2)}`);
}
/* hinomaru discs: wing disc chord-contained at z 3.4; fuselage disc inside the section */
{
  const hi = chordAt(wingHi, 3.4);
  ok('wing roundel inside the wing chord', hi && -1.2 - 0.55 > hi[0] && -1.2 + 0.55 < hi[1],
     `hi ${hi}`);
  /* fuselage disc r 0.42 centred (1.6, 2.38): inside y-section, proud in z */
  const t = (1.6 - 1.0) / 1.4, hH = 0.48 + t * (0.38 - 0.48), yc = 2.37 + t * (2.40 - 2.37);
  ok('fuselage roundel inside the section depth',
     2.38 + 0.42 < yc + hH + 0.01 && 2.38 - 0.42 > yc - hH - 0.01,
     `disc 1.96..2.80 vs fus ${(yc - hH).toFixed(3)}..${(yc + hH).toFixed(3)}`);
}
/* canopy inside the old canopy box */
ok('canopy inside its old box',
   0.30 - 1.15 >= -0.85 - 1e-9 && 0.30 + 1.15 <= 1.45 + 1e-9 &&
   2.82 + 0.40 <= 3.225 + 1e-9 && 0.36 <= 0.375);

/* ── the r148 passage property: the fuselage IS the airframe ───────────────────────── */
{
  const fusRun = 5.20 - (-3.80);
  const groupRun = 5.34 - (-4.13);          // fin TE aft, prop hub forward
  ok('r148: principal mesh spans >= 0.8 of the airframe', fusRun / groupRun >= 0.8,
     (fusRun / groupRun).toFixed(3));
  const oldRun = 5.35 - (-3.935);
  ok('r148 convicts the old form', 6.6 / oldRun < 0.8, (6.6 / oldRun).toFixed(3));
}

console.log(`\n${checks - fails}/${checks} checks pass${fails ? ` — ${fails} FAIL` : ''}`);
process.exit(fails ? 1 : 0);
