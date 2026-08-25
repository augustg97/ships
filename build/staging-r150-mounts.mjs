/* r150 staging sim — the ready battery's shields get their own form. A shielded gun
 * mount IS near-boxy in life, so the fix is chamfer and rake, not a loft for its own
 * sake: the high-angle gunhouse an eight-sided chamfered house (walls vertical to a
 * knuckle, then raking to a flat crown, top and bottom closed), the 25 mm shield an
 * open-backed faceted wrap raking inward, 5 cm plate with its edge grain closed.
 * Pure node, no three.js: replicates the exact vertex-emit maths the hull.js edit
 * will use and checks form, fit and the r150 audit property before the app is touched.
 * Run: node build/staging-r150-mounts.mjs */

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ── the high-angle gunhouse, exactly as hull.js will emit it ─────────────────────
 * Local frame: face outboard at +z, y up from the base at 0, x fore-aft. Old box:
 * BoxGeometry(2.4, 1.7, 2.0) centred at y 2.1 → x ±1.2, y 1.25..2.95, z ±1.0. */
const HOUSE_R0 = [[-0.78, 1.00], [0.78, 1.00], [1.20, 0.58], [1.20, -0.70],
                  [0.90, -1.00], [-0.90, -1.00], [-1.20, -0.70], [-1.20, 0.58]];
const HOUSE_R2 = [[-0.72, 0.62], [0.72, 0.62], [1.04, 0.34], [1.04, -0.62],
                  [0.78, -0.86], [-0.78, -0.86], [-1.04, -0.62], [-1.04, 0.34]];
const HOUSE_H = 1.70, HOUSE_KNUCKLE = 0.95;

function houseVerts() {
  const rings = [{ y: 0, p: HOUSE_R0 }, { y: HOUSE_KNUCKLE, p: HOUSE_R0 },
                 { y: HOUSE_H, p: HOUSE_R2 }];
  const v = [];
  const tri = (a, b, c) => v.push(a, b, c);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const n = HOUSE_R0.length;
  for (let r = 0; r + 1 < rings.length; r++)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, lo = rings[r], hi = rings[r + 1];
      quad([lo.p[i][0], lo.y, lo.p[i][1]], [lo.p[j][0], lo.y, lo.p[j][1]],
           [hi.p[j][0], hi.y, hi.p[j][1]], [hi.p[i][0], hi.y, hi.p[i][1]]);
    }
  const cen = ring => {
    let x = 0, z = 0;
    for (const p of ring.p) { x += p[0]; z += p[1]; }
    return [x / n, ring.y, z / n];
  };
  const top = rings[2], bot = rings[0], cT = cen(top), cB = cen(bot);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(cT, [top.p[i][0], top.y, top.p[i][1]], [top.p[j][0], top.y, top.p[j][1]]);
    tri(cB, [bot.p[j][0], bot.y, bot.p[j][1]], [bot.p[i][0], bot.y, bot.p[i][1]]);
  }
  return v;
}

/* ── the 25 mm shield wrap, exactly as hull.js will emit it ───────────────────────
 * Local frame: face outboard at +z. Old box: BoxGeometry(1.9, 1.25, 1.6) centred at
 * y 3.9 → x ±0.95, y 3.275..4.525, z ±0.8 (mesh base at 0 here, placed at 3.275). */
const SH_RX = 0.92, SH_RZ = 0.78, SH_T = 0.05, SH_H = 1.25, SH_TOP = 0.65, SH_N = 7;
const SH_TH0 = -Math.PI * 7 / 12, SH_TH1 = Math.PI * 7 / 12;   // ±105°

function shieldVerts() {
  const sta = [];
  for (let k = 0; k <= SH_N; k++) {
    const th = SH_TH0 + (SH_TH1 - SH_TH0) * k / SH_N;
    sta.push([Math.sin(th), Math.cos(th)]);
  }
  const pt = (k, s, rx, rz, y) => [sta[k][0] * rx * s, y, sta[k][1] * rz * s];
  const oB = k => pt(k, 1, SH_RX, SH_RZ, 0);
  const oT = k => pt(k, SH_TOP, SH_RX, SH_RZ, SH_H);
  const iB = k => pt(k, 1, SH_RX - SH_T, SH_RZ - SH_T, 0);
  const iT = k => pt(k, SH_TOP, SH_RX - SH_T, SH_RZ - SH_T, SH_H);
  const cls = { outer: [], inner: [], top: [], bottom: [], caps: [] };
  const quad = (arr, a, b, c, d) => arr.push([a, b, c], [a, c, d]);
  for (let k = 0; k < SH_N; k++) {
    quad(cls.outer,  oB(k), oB(k + 1), oT(k + 1), oT(k));
    quad(cls.inner,  iB(k + 1), iB(k), iT(k), iT(k + 1));
    quad(cls.top,    oT(k), oT(k + 1), iT(k + 1), iT(k));
    quad(cls.bottom, oB(k + 1), oB(k), iB(k), iB(k + 1));
  }
  quad(cls.caps, oB(0), oT(0), iT(0), iB(0));                       // θ0 end
  quad(cls.caps, oT(SH_N), oB(SH_N), iB(SH_N), iT(SH_N));           // θ1 end
  return cls;
}

/* ── shared geometry maths ────────────────────────────────────────────────────────── */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
                         a[0] * b[1] - a[1] * b[0]];
const norm = t => cross(sub(t[1], t[0]), sub(t[2], t[0]));
const mag = v => Math.hypot(v[0], v[1], v[2]);
const centroid = t => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3,
                       (t[0][2] + t[1][2] + t[2][2]) / 3];

const hv = houseVerts();
const houseTris = [];
for (let i = 0; i < hv.length; i += 3) houseTris.push([hv[i], hv[i + 1], hv[i + 2]]);
const sh = shieldVerts();
const shieldTris = [].concat(sh.outer, sh.inner, sh.top, sh.bottom, sh.caps);

/* 1 — counts and finiteness */
ok('house is 48 triangles (16 wall quads + 8 roof + 8 floor)', houseTris.length === 48,
   `${houseTris.length}`);
ok('shield is 60 triangles (28 plate quads + 2 end caps)', shieldTris.length === 60,
   `${shieldTris.length}`);
ok('all house coords finite',
   houseTris.every(t => t.every(p => p.every(Number.isFinite))));
ok('all shield coords finite',
   shieldTris.every(t => t.every(p => p.every(Number.isFinite))));

/* 2 — no degenerate triangles */
ok('no degenerate house tri', houseTris.every(t => mag(norm(t)) > 1e-8));
ok('no degenerate shield tri', shieldTris.every(t => mag(norm(t)) > 1e-8));

/* 3 — both planforms are simple polygons */
const segX = (a, b, c, d) => {
  const s = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = s(c, d, a), d2 = s(c, d, b), d3 = s(a, b, c), d4 = s(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
};
const simple = P => {
  for (let i = 0; i < P.length; i++)
    for (let j = i + 2; j < P.length; j++) {
      if (i === 0 && j === P.length - 1) continue;
      if (segX(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) return false;
    }
  return true;
};
ok('house base planform simple', simple(HOUSE_R0));
ok('house crown planform simple', simple(HOUSE_R2));

/* 4 — x-symmetry, so the port PI turn about y is the geometry's own mirror (r118) */
const xsym = P => P.every(p => P.some(q =>
  Math.abs(q[0] + p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9));
ok('house base is its own x-mirror', xsym(HOUSE_R0));
ok('house crown is its own x-mirror', xsym(HOUSE_R2));
ok('shield stations are their own x-mirror',
   Math.abs(Math.sin(SH_TH0) + Math.sin(SH_TH1)) < 1e-12 &&
   Math.abs(Math.cos(SH_TH0) - Math.cos(SH_TH1)) < 1e-12);

/* 5 — envelope: every vert inside the old box it replaces (insets only, no excursion) */
const inBox = (tris, hx, y0, y1, hz) => tris.every(t => t.every(p =>
  Math.abs(p[0]) <= hx + 1e-9 && p[1] >= y0 - 1e-9 && p[1] <= y1 + 1e-9 &&
  Math.abs(p[2]) <= hz + 1e-9));
ok('house inside the old 2.4 x 1.7 x 2.0 box', inBox(houseTris, 1.2, 0, 1.7, 1.0));
ok('shield inside the old 1.9 x 1.25 x 1.6 box', inBox(shieldTris, 0.95, 0, 1.25, 0.8));

/* 6 — the r150 audit property, computed the way the audit will: max z in the top
 *     quarter of the mesh's own height ≤ 0.9 x max z in the bottom quarter. The old
 *     boxes read 1.0 by the same test and are convicted. */
const rake = tris => {
  let yLo = Infinity, yHi = -Infinity;
  for (const t of tris) for (const p of t) { yLo = Math.min(yLo, p[1]); yHi = Math.max(yHi, p[1]); }
  const h = yHi - yLo;
  const maxZ = band => {
    let m = -Infinity;
    for (const t of tris) for (const p of t) if (band(p[1])) m = Math.max(m, p[2]);
    return m;
  };
  return maxZ(y => y > yHi - h * 0.25) / maxZ(y => y < yLo + h * 0.25);
};
const hRake = rake(houseTris), sRake = rake(shieldTris);
ok('house face rakes (top/bottom z ratio ≤ 0.9)', hRake <= 0.9, hRake.toFixed(3));
ok('shield rakes inward (ratio ≤ 0.9)', sRake <= 0.9, sRake.toFixed(3));
const boxTris = (hx, hy, hz) => {
  const c = [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz],
             [-hx, 2 * hy, -hz], [hx, 2 * hy, -hz], [hx, 2 * hy, hz], [-hx, 2 * hy, hz]];
  const f = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1],
             [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]];
  return f.map(t => t.map(i => c[i]));
};
ok('old high-angle box convicted by the same test', rake(boxTris(1.2, 0.85, 1.0)) > 0.9);
ok('old 25 mm box convicted by the same test', rake(boxTris(0.95, 0.625, 0.8)) > 0.9);

/* 7 — windings. The house is convex and closed: every face must point away from the
 *     mesh centroid. The wrap is open: each plate class has its own outward sense. */
let hC = [0, 0, 0];
for (const t of houseTris) { const c = centroid(t); hC = [hC[0] + c[0], hC[1] + c[1], hC[2] + c[2]]; }
hC = hC.map(x => x / houseTris.length);
ok('house closed and outward: all 48 normals point away from the centroid',
   houseTris.every(t => {
     const n = norm(t), c = centroid(t);
     return n[0] * (c[0] - hC[0]) + n[1] * (c[1] - hC[1]) + n[2] * (c[2] - hC[2]) > 0;
   }));
const radialDot = t => {
  const n = norm(t), c = centroid(t);
  return n[0] * c[0] + n[2] * c[2];             // radial in the x-z plane
};
ok('shield outer plates face outward', sh.outer.every(t => radialDot(t) > 0));
ok('shield inner plates face inward', sh.inner.every(t => radialDot(t) < 0));
ok('shield top grain faces up', sh.top.every(t => norm(t)[1] > 0));
ok('shield bottom grain faces down', sh.bottom.every(t => norm(t)[1] < 0));
/* each end cap faces along the arc tangent, away from the plate body */
const tang = th => { const d = [SH_RX * Math.cos(th), -SH_RZ * Math.sin(th)];
                     const m = Math.hypot(d[0], d[1]); return [d[0] / m, d[1] / m]; };
const t0 = tang(SH_TH0), t1 = tang(SH_TH1);
ok('θ0 end cap faces away from the plate',
   sh.caps.slice(0, 2).every(t => { const n = norm(t); return -(n[0] * t0[0] + n[2] * t0[1]) > 0; }));
ok('θ1 end cap faces away from the plate',
   sh.caps.slice(2).every(t => { const n = norm(t); return n[0] * t1[0] + n[2] * t1[1] > 0; }));

/* 8 — fits in the mount's own frame */
/* house: base at y 1.25 sits over the platform (top 0.35) with the pedestal (0.35..1.45)
 * entering its open… no — its CLOSED floor: pedestal top 1.45 vs house floor 1.25 →
 * the pedestal runs 0.20 up into the house, so the house stands ON structure. */
ok('pedestal enters the house floor (no float)', 1.45 - 1.25 >= 0.15);
/* house crown at 1.25+1.70 = 2.95 = the old box top: barrels still clear it */
ok('house crown at the old box top', Math.abs(1.25 + HOUSE_H - 2.95) < 1e-9);
/* 25 mm: the shield hangs on the carriage over the pedestal — the pedestal (y 2.6..3.4,
 * r ≤ 0.5) stands inside the wrap's inner radius at its base (0.73), through the open
 * bottom ring, and the wrap base 3.275 sits below the pedestal top 3.4 */
ok('pedestal inside the wrap and through its base ring',
   0.5 < SH_RZ - SH_T && 3.275 < 3.4);
/* barrels (z offset ±0.34 at the face) pass inside the wrap's half-width */
ok('the three barrels fit inside the wrap', 0.34 + 0.06 < (SH_RX - SH_T) * SH_TOP);

/* 9 — the wrap opens INBOARD: no plate crosses z < the arc's own rear reach */
const rear = SH_RZ * Math.cos(SH_TH1);          // -0.202
ok('the wrap is open-backed (no vert further inboard than the arc ends)',
   shieldTris.every(t => t.every(p => p[2] >= rear * 1.0001 - 1e-9)),
   `rear reach ${rear.toFixed(3)}`);

/* 10 — plate areas: real plates, not slivers */
const area = tris => tris.reduce((a, t) => a + mag(norm(t)) / 2, 0);
ok('house shell is real plate', area(houseTris) > 10, `${area(houseTris).toFixed(1)} m²`);
ok('shield wrap is real plate', area(shieldTris) > 4, `${area(shieldTris).toFixed(1)} m²`);

console.log(`\n${checks - fails}/${checks} checks pass${fails ? ` — ${fails} FAIL` : ''}`);
process.exit(fails ? 1 : 0);
