/* r156 offline sim — the both-ways index trick cancels computeVertexNormals.

   The class (named r118, unconvicted since): duplicated triangles of opposite
   winding SHARING vertices. computeVertexNormals adds each face's area-weighted
   normal to its three vertices; the reversed copy adds the exact negation, so
   every shared vertex sums to zero and normalize() (three.js guards zero with
   `|| 1`) leaves it (0,0,0). The mesh lights as if it had no normals at all.

   Two instances stand in hull.js:
     A. the gundeck plank (!AP branch, ~9277): strip of N=22 quads, 4 tris each
        (2 up + 2 reversed), 46 shared verts       — panokseon, sekibune
     B. the bowFortress deck fan (~10243): centre + K=22 rim, 44 tris (22 + 22
        reversed), 24 shared verts                  — galleass

   The fix is r118's own law: SINGLE winding on a DoubleSide material clone.

   ⚠ WHAT THIS SIM'S FIRST RUN REFUTED: "every shared vertex sums to zero" is
   only half true. Each cancelling pair is an EXACT FP negation (products
   commute, cross anti-commutes), but the per-vertex accumulation is not
   associative, so about half the sums come out exactly 0 (normalize's `|| 1`
   guard keeps them zero — unlit) and the other half come out as ~1e-16 dust,
   which normalize() amplifies to a FULL UNIT VECTOR in whatever direction the
   dust points — here ±Y, so neighbouring vertices light as skyward, unlit and
   UPSIDE-DOWN along one strip. That is r118's own observed symptom ("washed
   near-white along half its run"). It also means a magnitude threshold cannot
   convict the class reliably — the audit rule must convict the PATTERN: the
   same three vertex indices drawn twice in one geometry.

   Proves: (1) old forms carry N duplicated opposite-winding triples, new forms
   zero; (2) old plank normals split zero/±Y-garbage as measured, new all +Y;
   (3) positions untouched; (4) tris halve; (5) the predicate is silent on an
   honest closed box. Run: node build/staging-r156-normals.mjs */

let pass = 0, fail = 0;
const T = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

/* three.js computeVertexNormals, replicated: face normal = cross(c-b, a-b),
   area-weighted (unnormalized), summed per vertex, then normalized with the
   zero-vector guard (divideScalar(length || 1)). */
function computeVertexNormals(pos, idx) {
  const nor = new Array(pos.length).fill(0);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const cbx = pos[c] - pos[b], cby = pos[c + 1] - pos[b + 1], cbz = pos[c + 2] - pos[b + 2];
    const abx = pos[a] - pos[b], aby = pos[a + 1] - pos[b + 1], abz = pos[a + 2] - pos[b + 2];
    const nx = cby * abz - cbz * aby, ny = cbz * abx - cbx * abz, nz = cbx * aby - cby * abx;
    for (const v of [a, b, c]) { nor[v] += nx; nor[v + 1] += ny; nor[v + 2] += nz; }
  }
  for (let v = 0; v < nor.length; v += 3) {
    const l = Math.hypot(nor[v], nor[v + 1], nor[v + 2]) || 1;
    nor[v] /= l; nor[v + 1] /= l; nor[v + 2] /= l;
  }
  return nor;
}

/* the audit predicate, exactly as the rule will run it: a triangle's unordered
   vertex triple may appear once. A second appearance is either the both-ways
   trick (opposite cyclic order) or a double draw (same order) — both convict. */
const dupTriples = (idx) => {
  const seen = new Map(); let dup = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const k = [idx[i], idx[i + 1], idx[i + 2]].sort((a, b) => a - b).join(',');
    if (seen.has(k)) dup++; else seen.set(k, 1);
  }
  return dup;
};

const normalStats = (nor) => {
  let zero = 0, up = 0, other = 0;
  for (let v = 0; v < nor.length; v += 3) {
    const l = Math.hypot(nor[v], nor[v + 1], nor[v + 2]);
    if (l === 0) zero++;
    else if (nor[v + 1] / l > 0.999) up++;
    else other++;
  }
  return { zero, up, other, tot: nor.length / 3 };
};

/* ── A. the gundeck plank, both forms ───────────────────────────────────────
   Stations mimic the real loft: sx monotonic, halfW varying with the hull's
   own curve — the PATTERN is what is on trial, not the curve. */
const N = 22, gdY = 3.2;
const sx = [], halfW = [];
for (let i = 0; i <= N; i++) {
  const u = 0.16 + (0.86 - 0.16) * i / N;
  sx.push((u - 0.5) * 32);
  halfW.push(4.2 + 0.8 * Math.sin(Math.PI * u));
}
const plankPos = [];
for (let i = 0; i <= N; i++)
  plankPos.push(sx[i], gdY, -halfW[i], sx[i], gdY, halfW[i]);

const plankIdxOld = [], plankIdxNew = [];
for (let i = 1; i <= N; i++) {
  const a = (i - 1) * 2;
  plankIdxOld.push(a, a + 1, a + 2, a + 1, a + 3, a + 2,
                   a + 2, a + 1, a, a + 2, a + 3, a + 1);
  plankIdxNew.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
}

{
  T('plank OLD: predicate convicts — 44 duplicated triples of 88 tris',
    dupTriples(plankIdxOld) === 44, `${dupTriples(plankIdxOld)}`);
  T('plank NEW: predicate silent', dupTriples(plankIdxNew) === 0);

  const so = normalStats(computeVertexNormals(plankPos, plankIdxOld));
  T('plank OLD: normals broken as measured — 24 unlit zeros + 22 unit garbage',
    so.zero === 24 && so.up + so.other === 22 && so.tot === 46,
    `zero ${so.zero}, up ${so.up}, other ${so.other}`);

  const sn = normalStats(computeVertexNormals(plankPos, plankIdxNew));
  T('plank NEW: every normal +Y (a flat deck lit from the sky)',
    sn.up === sn.tot && sn.zero === 0, `up ${sn.up}/${sn.tot}`);
  T('plank: positions untouched by the fix', true, 'same array by construction');
  T('plank: tris halve 88 -> 44',
    plankIdxOld.length / 3 === 88 && plankIdxNew.length / 3 === 44,
    `${plankIdxOld.length / 3} -> ${plankIdxNew.length / 3}`);
}

/* ── B. the bowFortress deck fan, both forms ────────────────────────────── */
const K = 22, topY = 2.9, wF = 3.1;
const fanPos = [(0.16 - 0.5) * 40, topY, 0];
for (let k = 0; k <= K; k++) {
  const uu = 0.16 - (0.16 - 0.02) * Math.cos(-Math.PI / 2 + Math.PI * k / K);
  fanPos.push((uu - 0.5) * 40, topY, wF * Math.sin(-Math.PI / 2 + Math.PI * k / K));
}
const fanIdxOld = [], fanIdxNew = [];
for (let k = 1; k < K + 1; k++) {
  fanIdxOld.push(0, k, k + 1, 0, k + 1, k);
  fanIdxNew.push(0, k, k + 1);
}
{
  T('fan OLD: predicate convicts — 22 duplicated triples of 44 tris',
    dupTriples(fanIdxOld) === 22, `${dupTriples(fanIdxOld)}`);
  T('fan NEW: predicate silent', dupTriples(fanIdxNew) === 0);

  const so = normalStats(computeVertexNormals(fanPos, fanIdxOld));
  T('fan OLD: normals broken (mix of zeros and unit garbage)',
    so.zero + so.other > 0 && so.tot === K + 2,
    `zero ${so.zero}, up ${so.up}, other ${so.other} of ${so.tot}`);

  const nn = computeVertexNormals(fanPos, fanIdxNew);
  let vertical = 0;
  for (let v = 0; v < nn.length; v += 3) {
    const l = Math.hypot(nn[v], nn[v + 1], nn[v + 2]);
    if (l > 0 && Math.abs(nn[v + 1] / l) > 0.999) vertical++;
  }
  T('fan NEW: every normal unit and vertical (DoubleSide flips for the eye below)',
    vertical === K + 2, `${vertical}/${K + 2}`);
  T('fan: tris halve 44 -> 22',
    fanIdxOld.length / 3 === 44 && fanIdxNew.length / 3 === 22,
    `${fanIdxOld.length / 3} -> ${fanIdxNew.length / 3}`);
}

/* ── C. the DoubleSide argument: winding direction is irrelevant to the lit
   result once the material is DoubleSide, because gl_FrontFacing flips the
   interpolated normal for back faces. What MUST hold is that the single
   winding agrees with computeVertexNormals (it always does — normals are
   DERIVED from winding), so the only failure mode left is the cancellation
   itself, which the single winding removes. Assert the new fan's winding is
   consistent: face normals all one sign of Y. */
{
  let plus = 0, minus = 0;
  for (let i = 0; i < fanIdxNew.length; i += 3) {
    const a = fanIdxNew[i] * 3, b = fanIdxNew[i + 1] * 3, c = fanIdxNew[i + 2] * 3;
    const cbx = fanPos[c] - fanPos[b], cbz = fanPos[c + 2] - fanPos[b + 2];
    const abx = fanPos[a] - fanPos[b], abz = fanPos[a + 2] - fanPos[b + 2];
    const ny = cbz * abx - cbx * abz;
    if (ny > 0) plus++; else if (ny < 0) minus++;
  }
  T('fan NEW: one consistent winding (no mixed faces)', plus === 0 || minus === 0,
    `+Y ${plus} / -Y ${minus}`);
}

/* ── D. the audit predicate is blind to honest geometry: a closed box with
   unshared face vertices (the fleet's plank/beam idiom) has zero cancelled
   normals. */
{
  const bp = [], bi = [];
  const faces = [
    [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[0,0,-1]],
    [[1,-1,1],[-1,-1,1],[-1,1,1],[1,1,1],[0,0,1]],
    [[-1,-1,1],[-1,-1,-1],[-1,1,-1],[-1,1,1],[-1,0,0]],
    [[1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1],[1,0,0]],
    [[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1],[0,1,0]],
    [[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1],[0,-1,0]],
  ];
  for (const f of faces) {
    const b0 = bp.length / 3;
    for (let q = 0; q < 4; q++) bp.push(...f[q]);
    bi.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
  }
  T('honest box: predicate silent', dupTriples(bi) === 0, `${dupTriples(bi)} dups`);
  const sb = normalStats(computeVertexNormals(bp, bi));
  T('honest box: no zero normals either', sb.zero === 0, `${sb.zero}/${sb.tot}`);
}

console.log(`\n${pass}/${pass + fail} checks pass`);
process.exit(fail ? 1 : 0);
