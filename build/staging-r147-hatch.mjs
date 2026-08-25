/* Round 147 offline sim — the stowage hatch becomes a cover dropped into a coaming.
 * This file holds the EXACT geometry code to be ported into buildDeckHatches, run
 * standalone against a stubbed deck so windings, envelope, NaN and the r147 passage
 * property are verified before hull.js is touched. Not shipped; deleted after reading.
 */

/* ── the geometry, as it will appear in hull.js ─────────────────────────────────────── */
/* One loft per hatch: a mitred coaming ring (outer face, chamfer, rim flat, inner
 * reveal) with the armoured cover set INSIDE it a reveal below the rim, section seams
 * as recessed grooves. Every vertex seated on the local deck via dY(dx, dz). Flat
 * per-quad normals (each quad owns its four verts), so every arris is sharp and the
 * r146 rim-sharing stripe mechanism cannot occur. Returns acc + the index count of
 * the coaming portion so the caller can addGroup two materials on one geometry. */
function hatchAcc(lenM, widM, dY) {
  const hx = lenM / 2, hz = widM / 2;
  const T = 0.14, RIM = 0.28, CH = 0.04, HEEL = 0.25, DROP = 0.10;
  const SW = 0.08, SD = 0.04;                       // seam groove width and depth
  const acc = { pos: [], nrm: [], idx: [] };
  const quad = (p1, p2, p3, p4) => {
    const b = acc.pos.length / 3;
    acc.pos.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
                 p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]);
    const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
    const vx = p4[0] - p1[0], vy = p4[1] - p1[1], vz = p4[2] - p1[2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const m = Math.hypot(n[0], n[1], n[2]) || 1;
    for (let k = 0; k < 4; k++) acc.nrm.push(n[0] / m, n[1] / m, n[2] / m);
    acc.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  /* the ring: section polyline from outer foot up over the rim and down to the cover
     land, run round all four sides at proportional stations so the corners mitre and
     every vertex rides its own patch of deck */
  const sect = [[0, -HEEL], [0, RIM - CH], [CH, RIM], [T, RIM], [T, RIM - DROP]];
  const NX = Math.max(2, Math.round(lenM / 2.5));
  const NZ = Math.max(2, Math.round(widM / 1.5));
  const P = (x, h, z) => [x, h + dY(x, z), z];
  for (let s = 0; s < sect.length - 1; s++) {
    const [i1, h1] = sect[s], [i2, h2] = sect[s + 1];
    for (const sg of [1, -1]) {
      for (let k = 0; k < NX; k++) {                // fore-and-aft sides, subdivided in x
        const xa1 = (k / NX * 2 - 1) * (hx - i1), xb1 = ((k + 1) / NX * 2 - 1) * (hx - i1);
        const xa2 = (k / NX * 2 - 1) * (hx - i2), xb2 = ((k + 1) / NX * 2 - 1) * (hx - i2);
        const A1 = P(xa1, h1, sg * (hz - i1)), B1 = P(xb1, h1, sg * (hz - i1));
        const A2 = P(xa2, h2, sg * (hz - i2)), B2 = P(xb2, h2, sg * (hz - i2));
        if (sg > 0) quad(A1, B1, B2, A2); else quad(B1, A1, A2, B2);
      }
      for (let k = 0; k < NZ; k++) {                // the ends, subdivided in z
        const za1 = (k / NZ * 2 - 1) * (hz - i1), zb1 = ((k + 1) / NZ * 2 - 1) * (hz - i1);
        const za2 = (k / NZ * 2 - 1) * (hz - i2), zb2 = ((k + 1) / NZ * 2 - 1) * (hz - i2);
        const A1 = P(sg * (hx - i1), h1, za1), B1 = P(sg * (hx - i1), h1, zb1);
        const A2 = P(sg * (hx - i2), h2, za2), B2 = P(sg * (hx - i2), h2, zb2);
        if (sg > 0) quad(B1, A1, A2, B2); else quad(A1, B1, B2, A2);
      }
    }
  }
  const coamIdx = acc.idx.length;
  /* the cover: a plate on the land inside the ring, its section seams recessed grooves */
  const cx = hx - T, cz = hz - T, yc = RIM - DROP;
  const seams = [-cx / 1.5, cx / 1.5];              // thirds — three armoured sections
  const edges = [-cx];
  for (const sc of seams) edges.push(sc - SW / 2, sc + SW / 2);
  edges.push(cx);
  const zrow = (x0, x1, yy, flip) => {              // a full-width row of top quads
    for (let k = 0; k < NZ; k++) {
      const z0 = (k / NZ * 2 - 1) * cz, z1 = ((k + 1) / NZ * 2 - 1) * cz;
      const q = [P(x0, yy, z0), P(x0, yy, z1), P(x1, yy, z1), P(x1, yy, z0)];
      if (flip) quad(q[3], q[2], q[1], q[0]); else quad(q[0], q[1], q[2], q[3]);
    }
  };
  for (let i = 0; i < edges.length; i += 2) zrow(edges[i], edges[i + 1], yc, false);
  for (const sc of seams) {
    const x0 = sc - SW / 2, x1 = sc + SW / 2;
    zrow(x0, x1, yc - SD, false);                   // groove floor
    for (let k = 0; k < NZ; k++) {                  // groove walls, facing each other
      const z0 = (k / NZ * 2 - 1) * cz, z1 = ((k + 1) / NZ * 2 - 1) * cz;
      quad(P(x0, yc - SD, z0), P(x0, yc - SD, z1), P(x0, yc, z1), P(x0, yc, z0));
      quad(P(x1, yc - SD, z1), P(x1, yc - SD, z0), P(x1, yc, z0), P(x1, yc, z1));
    }
    for (const sg of [1, -1]) {                     // groove ends, sealed against the ring
      const q = [P(x0, yc - SD, sg * cz), P(x1, yc - SD, sg * cz),
                 P(x1, yc, sg * cz), P(x0, yc, sg * cz)];
      if (sg > 0) quad(q[1], q[0], q[3], q[2]); else quad(q[0], q[1], q[2], q[3]);
    }
  }
  return { acc, coamIdx, T, RIM, HEEL, DROP };
}

/* ── the stubbed deck: Yamato-like sheer and camber near the quarterdeck ───────────── */
const L = 256.0, B = 38.9;
const bAt = u => (B / 2) * Math.max(0.15, 1 - Math.pow(Math.abs(u - 0.5) / 0.5, 2.2) * 0.75);
const sheer = u => 0.9 * Math.pow(Math.abs(u - 0.55) / 0.45, 2.4);
const deckAt = (u, z) => {
  const b = bAt(u), c = Math.min(1, Math.abs(z) / b);
  return sheer(u) + Math.cos(c * Math.PI / 2) * b * 0.035;
};

/* ── run the three recorded hatches through every check ────────────────────────────── */
const HATCHES = [
  { at: 0.795, z: 0.42, lenM: 9.5, widM: 3.0 },
  { at: 0.795, z: -0.42, lenM: 9.5, widM: 3.0 },
  { at: 0.825, z: 0, lenM: 12.0, widM: 4.6 },
];
let fail = 0;
const say = (ok, msg) => { console.log((ok ? '  ok  ' : '  FAIL ') + msg); if (!ok) fail++; };

for (const hc of HATCHES) {
  const u0 = hc.at, zP = hc.z * bAt(u0), y0 = deckAt(u0, zP);
  const dY = (dx, dz) => deckAt(u0 + dx / L, zP + dz) - y0;
  const { acc, coamIdx, T, RIM, HEEL, DROP } = hatchAcc(hc.lenM, hc.widM, dY);
  const nV = acc.pos.length / 3, nT = acc.idx.length / 3;
  console.log(`hatch at u=${u0} z=${hc.z}: ${nV} verts, ${nT} tris (coaming ${coamIdx / 3})`);

  let nan = 0;
  for (const v of acc.pos) if (!Number.isFinite(v)) nan++;
  say(nan === 0, `NaN/Inf in positions: ${nan}`);

  /* envelope: within the record footprint, heel to rim plus the deck's own relief */
  let dMin = Infinity, dMax = -Infinity;
  for (let i = 0; i < nV; i++) {
    const x = acc.pos[3 * i], z = acc.pos[3 * i + 2];
    const d = dY(Math.max(-hc.lenM / 2, Math.min(hc.lenM / 2, x)),
                 Math.max(-hc.widM / 2, Math.min(hc.widM / 2, z)));
    dMin = Math.min(dMin, d); dMax = Math.max(dMax, d);
  }
  let outXZ = 0, outY = 0;
  for (let i = 0; i < nV; i++) {
    const x = acc.pos[3 * i], y = acc.pos[3 * i + 1], z = acc.pos[3 * i + 2];
    if (Math.abs(x) > hc.lenM / 2 + 1e-6 || Math.abs(z) > hc.widM / 2 + 1e-6) outXZ++;
    if (y < -HEEL + dMin - 1e-6 || y > RIM + dMax + 1e-6) outY++;
  }
  say(outXZ === 0, `verts outside the record footprint: ${outXZ}`);
  say(outY === 0, `verts outside heel..rim + deck relief: ${outY}`);

  /* every triangle real */
  let degen = 0;
  for (let t = 0; t < nT; t++) {
    const [a, b2, c] = [acc.idx[3 * t], acc.idx[3 * t + 1], acc.idx[3 * t + 2]];
    const A = acc.pos.slice(3 * a, 3 * a + 3), Bp = acc.pos.slice(3 * b2, 3 * b2 + 3),
          C = acc.pos.slice(3 * c, 3 * c + 3);
    const u = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]],
          v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...n) / 2 < 1e-8) degen++;
  }
  say(degen === 0, `degenerate triangles: ${degen}`);

  /* windings, by face class: outer faces away from centre, tops up, reveal inward */
  const triAt = t => {
    const ids = [acc.idx[3 * t], acc.idx[3 * t + 1], acc.idx[3 * t + 2]];
    const pts = ids.map(i => acc.pos.slice(3 * i, 3 * i + 3));
    const u = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
    const v = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const m = Math.hypot(...n) || 1; n = n.map(q => q / m);
    const c = [(pts[0][0] + pts[1][0] + pts[2][0]) / 3, (pts[0][1] + pts[1][1] + pts[2][1]) / 3,
               (pts[0][2] + pts[1][2] + pts[2][2]) / 3];
    return { n, c };
  };
  let wBad = 0;
  for (let t = 0; t < nT; t++) {
    const { n, c } = triAt(t);
    const cLoc = c[1] - dY(Math.max(-hc.lenM / 2, Math.min(hc.lenM / 2, c[0])),
                           Math.max(-hc.widM / 2, Math.min(hc.widM / 2, c[2])));
    if (Math.abs(c[2]) > hc.widM / 2 - 0.001 && Math.abs(n[2]) > 0.8) {
      if (n[2] * Math.sign(c[2]) < 0) wBad++;               // outer fore-aft face
    } else if (Math.abs(c[0]) > hc.lenM / 2 - 0.001 && Math.abs(n[0]) > 0.8) {
      if (n[0] * Math.sign(c[0]) < 0) wBad++;               // outer end face
    } else if (cLoc > RIM - 0.001 && Math.abs(n[1]) > 0.8) {
      if (n[1] < 0) wBad++;                                 // rim flat
    } else if (Math.abs(cLoc - (RIM - DROP)) < 0.001 && Math.abs(n[1]) > 0.8
               && Math.abs(c[2]) < hc.widM / 2 - T + 0.001) {
      if (n[1] < 0) wBad++;                                 // cover top
    }
  }
  say(wBad === 0, `windings against their face class: ${wBad}`);

  /* the r147 passage property: every point of the cover's top sits BELOW the coaming
     rim at its own station — the cover is IN the coaming, camber included */
  const cx2 = hc.lenM / 2 - T, cz2 = hc.widM / 2 - T, yc2 = RIM - DROP;
  let proud = 0, margin = Infinity;
  const covStart = coamIdx > 0 ? acc.idx[coamIdx] : 0;   // first vertex of the cover
  for (let i = covStart; i < nV; i++) {
    const x = acc.pos[3 * i], y = acc.pos[3 * i + 1], z = acc.pos[3 * i + 2];
    if (Math.abs(y - (yc2 + dY(x, z))) > 0.001) continue;  // top verts only
    const sg = z >= 0 ? 1 : -1;
    const rimY = RIM + dY(x, sg * (hc.widM / 2 - T / 2));
    margin = Math.min(margin, rimY - y);
    if (y >= rimY - 0.02) proud++;
  }
  say(proud === 0, `cover verts proud of their own rim: ${proud} (worst margin ${margin.toFixed(3)} m)`);
}
console.log(fail ? `\n${fail} FAILURES` : '\nALL CHECKS PASS');
process.exit(fail ? 1 : 0);
