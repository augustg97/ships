'use strict';
function superellipseFullness(n) {
const N = 256;
let a = 0;
for (let i = 0; i < N; i++) {
const y = (i + 0.5) / N;
a += Math.pow(Math.max(0, 1 - Math.pow(y, n)), 1 / n);
}
return a / N;
}
function exponentForCm(cm) {
let lo = 0.6, hi = 24.0;
for (let i = 0; i < 40; i++) {
const mid = (lo + hi) / 2;
if (superellipseFullness(mid) < cm) lo = mid; else hi = mid;
}
return (lo + hi) / 2;
}
function fullness(u, p, endF, endA) {
const s = Math.abs(2 * u - 1);
const f = 1 - Math.pow(s, p);
const end = u < 0.5 ? endF : endA;
return end + (1 - end) * f;
}
function ropeMesh(segs, r, mat) {
const pos = [], idx = [];
const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
segs.forEach(([a, b]) => {
const d = tmp.copy(b).sub(a);
if (d.lengthSq() < 1e-9) return;
d.normalize();
const n1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up).normalize();
const n2 = new THREE.Vector3().crossVectors(d, n1).normalize();
const base0 = pos.length / 3;
for (const P of [a, b])
for (const [s1, s2] of [[1, 1], [1, -1], [-1, -1], [-1, 1]])
pos.push(P.x + (n1.x * s1 + n2.x * s2) * r,
P.y + (n1.y * s1 + n2.y * s2) * r,
P.z + (n1.z * s1 + n2.z * s2) * r);
for (let f = 0; f < 4; f++) {
const c = (f + 1) % 4;
idx.push(base0 + f, base0 + 4 + f, base0 + c, base0 + c, base0 + 4 + f, base0 + 4 + c);
}
});
if (!pos.length) return null;
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return new THREE.Mesh(g, mat);
}
function ringMesh(rings, mat) {
const pos = [], idx = [], N = 14;
rings.forEach(({ cx, cy, r, h, tilt }) => {
const s = Math.sin(tilt || 0), c = Math.cos(tilt || 0);
const base0 = pos.length / 3;
for (const dy of [-h / 2, h / 2])
for (let k = 0; k < N; k++) {
const a = k / N * Math.PI * 2;
const lx = Math.cos(a) * r;
pos.push(cx + lx * c - dy * s, cy + lx * s + dy * c, Math.sin(a) * r);
}
for (let k = 0; k < N; k++) {
const k2 = (k + 1) % N;
idx.push(base0 + k, base0 + N + k, base0 + k2,
base0 + k2, base0 + N + k, base0 + N + k2);
}
});
if (!pos.length) return null;
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return new THREE.Mesh(g, mat);
}
function hullSurface(S) {
const nExp = exponentForCm(S.cm);
const halfB = S.beam / 2;
const wl = u => fullness(u, S.wlPower, S.stemFineness, S.sternFineness);
const keel = u => {
const fore = 1 - Math.pow(Math.max(0, (S.forefoot - u) / S.forefoot), 2) * S.riseF;
const aft = 1 - Math.pow(Math.max(0, (u - (1 - S.run)) / S.run), 2) * S.riseA;
return Math.max(0.06, Math.min(fore, aft));
};
const sheer = u => {
const s = Math.abs(2 * u - 1);
const rise = u < 0.5 ? S.sheerBow : S.sheerStern;
const base = S.freeboard + rise * Math.pow(s, 2.8);
if (S.sternSteps)
for (const st of S.sternSteps.steps)
if (u >= st.u[0] && u <= st.u[1] && st.deckM !== undefined)
return Math.min(base, st.deckM);
return base;
};
const stepTop = u => {
if (!S.sternSteps) return null;
for (const st of S.sternSteps.steps)
if (u >= st.u[0] && u <= st.u[1]) {
const t = (u - st.u[0]) / (st.u[1] - st.u[0]);
return st.topM[0] + (st.topM[1] - st.topM[0]) * t;
}
return null;
};
const tumble = u => S.tumblehome * fullness(u, 1.4, 0.55, 0.7);
const rakeAllow = ((S.stemRake || 0) + (S.sternRake || 0)) * S.loa;
const rakeScale = rakeAllow > 0
? Math.min(1, Math.max(0, S.loa - S.lwl) / rakeAllow) : 1;
const rake = u => {
if (u < S.forefoot) {
const k = (S.forefoot - u) / S.forefoot;
return -S.stemRake * rakeScale * k * k * S.loa;
}
if (u > 1 - S.run) {
const k = (u - (1 - S.run)) / S.run;
return S.sternRake * rakeScale * k * k * S.loa;
}
return 0;
};
return { nExp, halfB, wl, keel, sheer, tumble, rake, stepTop };
}
function hullStations(S, NU) {
const us = [];
for (let i = 0; i <= NU; i++) us.push(i / NU);
if (S.sternSteps) {
const E = 1e-5;
for (const st of S.sternSteps.steps) {
const b = st.u[0];
if (b > 0 && b < 1) us.push(b - E, b + E);
}
us.sort((a, b) => a - b);
}
return us;
}
function buildKeelGeometry(S) {
const H = hullSurface(S);
const pos = [], idx = [];
const NU = 96, sided = 0.055 * S.beam / 2;
for (let i = 0; i <= NU; i++) {
const u = i / NU;
const p = surfacePoint(S, H, u, 0);
const depth = i === 0 || i === NU ? 0.02 : 0.055 * S.draught + 0.02;
pos.push(p[0], p[1] - depth, -sided, p[0], p[1] - depth, sided,
p[0], p[1] + 0.01, sided, p[0], p[1] + 0.01, -sided);
}
for (let i = 0; i < NU; i++) {
const a = i * 4, b = a + 4;
for (let f = 0; f < 4; f++) {
const c = (f + 1) % 4;
idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return g;
}
function buildFramesGeometry(S, NF = 26, onlyU) {
const H = hullSurface(S);
const pos = [], idx = [];
const NV = 26, half = 0.016 * S.lwl / 2;
if (NF === 1 && onlyU === undefined) NF = 1;
let base = 0;
for (let f = 0; f < NF; f++) {
const u = onlyU !== undefined ? onlyU : 0.055 + (f / (NF - 1)) * 0.89;
for (let sgn = -1; sgn <= 1; sgn += 2) {
for (let j = 0; j <= NV; j++) {
const v = j / NV;
const p = surfacePoint(S, H, u, v);
const plank = S.beam * 0.020;
const inset = plank + S.beam * 0.006;
const z = Math.max(0, Math.abs(p[2]) - inset);
for (let e = -1; e <= 1; e += 2)
pos.push(p[0] + e * half, p[1], sgn * z);
}
for (let j = 0; j < NV; j++) {
const a = base + j * 2;
idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
}
base += (NV + 1) * 2;
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return g;
}
function buildStemGeometry(S, aft) {
const H = hullSurface(S);
const pos = [], idx = [];
const N = 26, sided = 0.055 * S.beam / 2;
const STEEL = S.build === 'steel' || S.build === 'iron';
const inset = STEEL ? (aft ? -1.05 : 1.05) : 0;
for (let i = 0; i <= N; i++) {
const f = i / N;
const u = aft ? 1 - (1 - f) * 0.10 : f * 0.10;
const v = aft ? f : 1 - f;
const p = surfacePoint(S, H, u, Math.max(0, Math.min(1, v)));
const t = 0.05 * S.draught;
const x0 = p[0] + (inset - 1) * t, x1 = p[0] + (inset + 1) * t;
let sF = sided, sA = sided;
if (STEEL) {
const vv = Math.max(0, Math.min(1, v));
const bF = Math.abs(surfacePoint(S, H,
Math.max(0, Math.min(1, u + (x0 - p[0]) / S.lwl)), vv)[2]);
const bA = Math.abs(surfacePoint(S, H,
Math.max(0, Math.min(1, u + (x1 - p[0]) / S.lwl)), vv)[2]);
sF = Math.min(sided, Math.max(0.015, bF * 0.5));
sA = Math.min(sided, Math.max(0.015, bA * 0.5));
}
pos.push(x0, p[1], -sF, x0, p[1], sF,
x1, p[1], sA,  x1, p[1], -sA);
}
for (let i = 0; i < N; i++) {
const a = i * 4, b = a + 4;
for (let f = 0; f < 4; f++) {
const c = (f + 1) % 4;
idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return g;
}
function buildWaleGeometry(S, v0, thick) {
const H = hullSurface(S);
const pos = [], idx = [];
const NU = 120;
let base = 0;
for (let sgn = -1; sgn <= 1; sgn += 2) {
for (let i = 0; i <= NU; i++) {
const u = 0.012 + (i / NU) * 0.976;
for (let k = -1; k <= 1; k += 2) {
const p = surfacePoint(S, H, u, v0 + k * 0.5 * thick);
const out = 1.018;
pos.push(p[0], p[1], sgn * p[2] * out);
}
}
for (let i = 0; i < NU; i++) {
const a = base + i * 2;
idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
}
base += (NU + 1) * 2;
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return g;
}
function steeringOf(S) {
if (S.steering) return S.steering;
return (S.build === 'steel' || S.build === 'iron') ? 'steel'
: S.build === 'bulkhead' ? 'median' : 'stern';
}
function buildQuarterRudderGeometry(S, sgn) {
const H = hullSurface(S);
const uM = 0.945;
const pm = surfacePoint(S, H, uM, 1.0);
const chord = Math.max(0.35, S.draught * 0.38);
const r = chord * 0.16;
const rake = 0.22;
const yHead = pm[1] + Math.max(0.8, pm[1] * 0.55);
const yHeel = -S.draught * 0.92;
const yT = 0.12 * pm[1];
const xAt = y => pm[0] + rake * (y - pm[1]);
const uOf = x => Math.min(1, Math.max(0.8, x / S.lwl + 0.5));
const uLo = uOf(xAt(yHeel) - chord * 0.55), uHi = uOf(xAt(yT) + chord * 0.55);
let zClear = 0;
for (let i = 0; i <= 12; i++) for (let j = 0; j <= 8; j++)
zClear = Math.max(zClear, Math.abs(
surfacePoint(S, H, uLo + (uHi - uLo) * i / 12, j / 8)[2]));
const w = chord * 0.05;
const zP = sgn * Math.max(pm[2] + r * 0.55, zClear + w + r * 0.6);
const pos = [], idx = [];
const N = 8;
const ringY = (y, rr) => { const b = pos.length / 3;
for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2;
pos.push(xAt(y) + Math.cos(a) * rr, y, zP + Math.sin(a) * rr); }
return b; };
const ringZ = (z, rr) => { const b = pos.length / 3;
for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2;
pos.push(xAt(yHead) + Math.cos(a) * rr, yHead + Math.sin(a) * rr, z); }
return b; };
const tube = (a, b2, flip) => { for (let i = 0; i < N; i++) { const j = (i + 1) % N;
if (flip) idx.push(a + i, b2 + i, a + j, a + j, b2 + i, b2 + j);
else      idx.push(a + i, a + j, b2 + i, a + j, b2 + j, b2 + i); } };
const rHead = ringY(yHead, r * 0.85), rHeel = ringY(yHeel + chord * 0.25, r * 0.8);
tube(rHead, rHeel, false);
for (let i = 1; i + 1 < N; i++) idx.push(rHead, rHead + i + 1, rHead + i);
for (let i = 1; i + 1 < N; i++) idx.push(rHeel, rHeel + i, rHeel + i + 1);
const tLen = Math.min(Math.max(0.8, S.beam * 0.22), Math.abs(zP) * 0.8);
const t0 = ringZ(zP, r * 0.5);
const t1 = ringZ(zP - sgn * tLen, r * 0.45);
tube(t0, t1, sgn > 0);
for (let i = 1; i + 1 < N; i++)
if (sgn > 0) idx.push(t1, t1 + i + 1, t1 + i);
else         idx.push(t1, t1 + i, t1 + i + 1);
const prism = (pts, zA, zB) => {
const b0 = pos.length / 3;
const lo = Math.min(zA, zB), hi = Math.max(zA, zB);
pts.forEach(q => pos.push(q[0], q[1], lo, q[0], q[1], hi));
const n = pts.length;
for (let i = 0; i < n; i++) {
const a = b0 + i * 2, b2 = b0 + ((i + 1) % n) * 2;
idx.push(a, a + 1, b2, b2, a + 1, b2 + 1);
}
for (let i = 1; i + 1 < n; i++)
idx.push(b0, b0 + i * 2, b0 + (i + 1) * 2, b0 + 1, b0 + (i + 1) * 2 + 1, b0 + i * 2 + 1);
};
prism([[xAt(yT), yT],
[xAt(yT) + chord * 0.50, yT - chord * 0.35],
[xAt(yHeel) + chord * 0.55, yHeel + chord * 0.30],
[xAt(yHeel), yHeel],
[xAt(yHeel) - chord * 0.45, yHeel + chord * 0.30],
[xAt(yT) - chord * 0.40, yT - chord * 0.35]],
zP - w, zP + w);
const yB = pm[1] - 0.10;
prism([[xAt(yB) - chord * 0.15, yB + chord * 0.11],
[xAt(yB) + chord * 0.15, yB + chord * 0.11],
[xAt(yB) + chord * 0.15, yB - chord * 0.11],
[xAt(yB) - chord * 0.15, yB - chord * 0.11]],
sgn * (pm[2] - 0.10), zP);
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return g;
}
function buildRudderGeometry(S) {
const H = hullSurface(S);
const p = surfacePoint(S, H, 1.0, 0);
const kind = steeringOf(S);
const STEEL = kind === 'steel';
const BULK = kind === 'median';
const top = STEEL ? -S.draught * 0.08 : H.sheer(1.0) * (BULK ? 0.60 : 0.35);
const depth = -S.draught * (STEEL ? 0.95 : BULK ? 1.25 : 0.92);
const w = 0.030 * S.beam * (STEEL ? 0.45 : 1.0);
const chord = S.lwl * (STEEL ? 0.035 : BULK ? 0.095 : 0.055);
if (STEEL) {
const FS = [0.00, 0.03, 0.10, 0.25, 0.45, 0.65, 0.82, 1.00];
const FF = [0.00, 0.55, 0.85, 1.00, 0.92, 0.72, 0.45, 0.06];
const rows = [
{ y: top,   xLE: p[0] - chord * 1.6,  xTE: p[0] - chord * 0.6 },
{ y: depth, xLE: p[0] - chord * 1.45, xTE: p[0] - chord * 0.75 },
];
const ring = r => {
const q = [];
for (let i = FS.length - 1; i >= 0; i--)
q.push([r.xLE + FS[i] * (r.xTE - r.xLE), r.y, -FF[i] * w]);
for (let i = 1; i < FS.length; i++)
q.push([r.xLE + FS[i] * (r.xTE - r.xLE), r.y,  FF[i] * w]);
return q;
};
const rT = ring(rows[0]), rB = ring(rows[1]), n = rT.length, tri = [];
for (let i = 0; i < n; i++) {
const j = (i + 1) % n;
tri.push(rT[i], rB[i], rB[j], rT[i], rB[j], rT[j]);
}
const cen = r => r.reduce((a, q2) => [a[0] + q2[0] / n, a[1] + q2[1] / n,
a[2] + q2[2] / n], [0, 0, 0]);
const cT = cen(rT), cB = cen(rB);
for (let i = 0; i < n; i++) {
const j = (i + 1) % n;
tri.push(cT, rT[i], rT[j]);
tri.push(cB, rB[j], rB[i]);
}
const flat = [];
for (const q of tri) flat.push(q[0], q[1], q[2]);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
geo.computeVertexNormals();
return geo;
}
const pos = [], idx = [];
const pts = BULK
? [[p[0] + chord * 0.02, top], [p[0] + chord * 0.42, top],
[p[0] + chord * 0.92, -S.draught * 0.10], [p[0] + chord * 0.92, depth],
[p[0] + chord * 0.02, depth]]
: [[p[0], top], [p[0] + chord * 0.55, top],
[p[0] + chord, depth], [p[0], depth]];
const postLean = q => q[1] > 0 ? H.rake(1.0) * Math.min(1, q[1] / H.sheer(1.0)) : 0;
pts.forEach(q => pos.push(q[0] + postLean(q), q[1], -w, q[0] + postLean(q), q[1], w));
const n = pts.length;
for (let i = 0; i < n; i++) {
const a = i * 2, b = ((i + 1) % n) * 2;
idx.push(a, a + 1, b, b, a + 1, b + 1);
}
for (let i = 1; i + 1 < n; i++)
idx.push(0, i * 2, (i + 1) * 2, 1, (i + 1) * 2 + 1, i * 2 + 1);
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
return g;
}
function surfacePoint(S, H, u, v) {
const L = S.lwl;
const b = Math.max(H.halfB * H.wl(u),
0.4 * 0.055 * S.beam / 2 * Math.max(0, 1 - u / 0.05));
const t = S.draught * H.keel(u);
const deckHalf = b * (1 - H.tumble(u));
const fb = H.sheer(u);
let y, z, rakeF = 0;
if (v <= 0.62) {
const k = v / 0.62;
z = -t * (1 - k);
const yy = Math.pow(Math.max(0, 1 - Math.pow(1 - k, H.nExp)), 1 / H.nExp);
y = b * yy;
} else {
const k = (v - 0.62) / 0.38;
z = fb * k;
rakeF = k;
y = b + (deckHalf - b) * Math.pow(k, 0.9);
if (S.transom) {
const runStart = 1 - S.run;
if (u > runStart) {
const t = (u - runStart) / S.run;
y += (S.beam / 2) * S.transom * t * t * Math.pow(k, 0.75);
}
}
if (S.bowFlare) {
const span = Math.max(S.forefoot, 0.18);
if (u < span) {
const kb = (span - u) / span;
y += (S.beam / 2) * S.bowFlare * Math.pow(kb, 1.7) * Math.pow(k, 1.3);
}
}
if (S.sternRound) {
const runStart = 1 - S.run;
if (u > runStart) {
const t = (u - runStart) / S.run;
y *= 1 - S.sternRound * Math.pow(t, 2.0) * Math.pow(k, 1.5);
}
}
}
return [(u - 0.5) * L + H.rake(u) * rakeF, z, y];
}
function buildHullGeometry(S, NU = 120, NV = 34) {
const H = hullSurface(S);
const pos = [], nor = [], uvs = [], idx = [];
const pointAt = (u, v) => surfacePoint(S, H, u, v);
const US = hullStations(S, NU);
const brks = S.sternSteps ? S.sternSteps.steps.map(st => st.u[0]).filter(b => b > 0 && b < 1) : [];
const nearBrk = u => { for (const b of brks) if (Math.abs(u - b) < 1e-4) return b; return null; };
for (let i = 0; i < US.length; i++) {
const u = US[i];
for (let j = 0; j <= NV; j++) {
const v = j / NV;
const [x, z, y] = pointAt(u, v);
pos.push(x, z, y);
uvs.push(u, v);
const e = 1 / (NU * 2), f = 1 / (NV * 2);
let uF = Math.min(1, u + e), uB = Math.max(0, u - e);
const bk = nearBrk(u);
if (bk !== null) { if (u <= bk) uF = u; else uB = u; }
const a  = pointAt(uF, v), a2 = pointAt(uB, v);
const c  = pointAt(u, Math.min(1, v + f)), c2 = pointAt(u, Math.max(0, v - f));
const du = [a[0] - a2[0], a[1] - a2[1], a[2] - a2[2]];
const dv = [c[0] - c2[0], c[1] - c2[1], c[2] - c2[2]];
let nx = du[1] * dv[2] - du[2] * dv[1];
let ny = du[2] * dv[0] - du[0] * dv[2];
let nz = du[0] * dv[1] - du[1] * dv[0];
const ln = Math.hypot(nx, ny, nz) || 1;
nor.push(nx / ln, ny / ln, nz / ln);
}
}
const row = NV + 1;
for (let i = 0; i < US.length - 1; i++) {
for (let j = 0; j < NV; j++) {
const a = i * row + j, b = a + row, c = a + 1, d = b + 1;
idx.push(a, b, c, c, b, d);
}
}
const n0 = pos.length / 3;
for (let i = 0; i < n0; i++) {
pos.push(pos[i * 3], pos[i * 3 + 1], -pos[i * 3 + 2]);
nor.push(nor[i * 3], nor[i * 3 + 1], -nor[i * 3 + 2]);
uvs.push(uvs[i * 2], uvs[i * 2 + 1]);
}
const m = idx.length;
for (let i = 0; i < m; i += 3) {
idx.push(idx[i] + n0, idx[i + 2] + n0, idx[i + 1] + n0);
}
for (const end of [0, 1]) {
const nx = end === 0 ? -1 : 1;
const base = pos.length / 3;
for (let j = 0; j <= NV; j++) {
const [x, z, y] = pointAt(end, j / NV);
pos.push(x, z, y);   nor.push(nx, 0, 0); uvs.push(end, j / NV);
pos.push(x, z, -y);  nor.push(nx, 0, 0); uvs.push(end, j / NV);
}
for (let j = 0; j < NV; j++) {
const a = base + j * 2;
if (end === 0) idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
else           idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
g.setIndex(idx);
return g;
}
const DECK_COVERINGS = {
teak:   { mode: 1, col: 0x8a7250, plankW: 0.09, buttL: 2.4,
name: 'Weather deck — laid teak' },
hinoki: { mode: 1, col: 0xb3a17c, plankW: 0.127, buttL: 7.0,
name: 'Weather deck — laid hinoki' },
pine:   { mode: 1, col: 0xc0ad84, plankW: 0.127, buttL: 6.5,
name: 'Weather deck — laid pine' },
wood:   { mode: 1, col: 0xa08a66, plankW: 0.15, buttL: 6.5,
name: 'Weather deck — laid planking' },
steel:  { mode: 2, col: 0x494e54, plankW: 0, buttL: 1,
name: 'Weather deck — painted steel' },
bare:   { mode: 0, col: 0xa08a66, plankW: 0, buttL: 1,
name: 'Deck — bare timber' },
};
function deckCovering(S) {
const rec = S.deck && S.deck.covering;
if (rec && DECK_COVERINGS[rec])
return Object.assign({ kind: rec, recorded: true,
what: DECK_COVERINGS[rec].name.replace('Weather deck — ', 'The covering is ')
+ ', from the record. ' + (S.deck.provenance || '') }, DECK_COVERINGS[rec]);
const heurSteel = (S.build === 'steel' || S.build === 'iron')
&& (S.deckSteel !== undefined ? S.deckSteel : !!(S.flightDeck || S.containers));
const kind = heurSteel ? 'steel' : S.deckLaid === false ? 'bare' : 'wood';
return Object.assign({ kind, recorded: false,
what: 'INFERRED — no recorded covering: ' + (heurSteel
? 'a working steel motor ship’s weather deck is bare painted plate.'
: kind === 'bare' ? 'this hull carries no laid deck at all.'
: 'a planked ship’s weather deck is laid fore-and-aft. Plank dimensions are '
+ 'class defaults, below what the sources can resolve.') }, DECK_COVERINGS[kind]);
}
function buildDeckGeometry(S, NU = 120) {
const H = hullSurface(S);
const pos = [], nor = [], uvs = [], idx = [];
const US = hullStations(S, NU);
for (let i = 0; i < US.length; i++) {
const u = US[i];
const edge = surfacePoint(S, H, u, 1);
const b = edge[2], fb = edge[1], x = edge[0];
for (let j = 0; j <= 8; j++) {
const k = j / 8;
const y = b * (1 - 2 * k);
const camber = Math.cos((k - 0.5) * Math.PI) * b * 0.035;
pos.push(x, fb + camber, y);
nor.push(0, 1, 0);
uvs.push(u, k);
}
}
for (let i = 0; i < US.length - 1; i++) {
if (US[i + 1] - US[i] < 1e-4) continue;
for (let j = 0; j < 8; j++) {
const a = i * 9 + j, b = a + 9, c = a + 1, d = b + 1;
idx.push(a, b, c, c, b, d);
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
g.setIndex(idx);
return g;
}
function buildOpenHullGeometry(S, NU = 96, which) {
const H = hullSurface(S);
const tw = S.build === 'dugout' ? Math.max(0.03, S.beam * 0.045)
: Math.max(0.02, S.beam * 0.020);
const tb = S.build === 'dugout' ? tw * 1.8
: Math.max(0.04, S.draught * 0.06);
const NV = 7;
const K = NV + 3;
const pos = [], idx = [];
const US = hullStations(S, NU);
const wantRim = which !== 'cavity', wantCav = which !== 'rim';
const eligible = u => u > 0.05 && u < 0.95
&& S.draught * H.keel(u) > tb * 1.4
&& surfacePoint(S, H, u, 1)[2] - tw > 0.01;
let i0 = -1, i1 = -1;
for (let i = 0; i < US.length; i++)
if (eligible(US[i])) { if (i0 < 0) i0 = i; i1 = i; }
if (i0 < 0 || i1 - i0 < 4)
return wantRim ? buildDeckGeometry(S, NU) : new THREE.BufferGeometry();
const section = i => {
const u = US[i];
const s = (i - i0) / (i1 - i0);
const ss = t => { const c = Math.min(1, Math.max(0, t / 0.12)); return c * c * (3 - 2 * c); };
const a = ss(s) * ss(1 - s);
const t = S.draught * H.keel(u);
const vF = 0.62 * tb / t;
const edge = surfacePoint(S, H, u, 1);
const yiTop = Math.max(0, edge[2] - tw);
const open = [];
for (let j = 0; j <= NV; j++) {
const p = surfacePoint(S, H, u, 1 - (1 - vF) * j / NV);
open.push([p[0], p[1], Math.max(0, p[2] - tw)]);
}
const fl = open[NV];
open.push([fl[0], fl[1], fl[2] * 0.5], [fl[0], fl[1], 0]);
const out = [];
for (let k = 0; k < K; k++) {
const cz = yiTop * (1 - k / (K - 1));
out.push([edge[0] + (open[k][0] - edge[0]) * a,
edge[1] + (open[k][1] - edge[1]) * a,
cz + (open[k][2] - cz) * a]);
}
out.rimInner = yiTop; out.edge = edge;
return out;
};
const quad = (sgn, a, b, c, d) => {
if (sgn > 0) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, b, c, d);
};
for (const sgn of [1, -1]) {
if (wantRim) {
const base = pos.length / 3;
for (let i = 0; i < US.length; i++) {
const e = surfacePoint(S, H, US[i], 1);
const inner = (i >= i0 && i <= i1) ? Math.max(0, e[2] - tw) : 0;
pos.push(e[0], e[1], sgn * e[2], e[0], e[1], sgn * inner);
}
for (let i = 0; i < US.length - 1; i++) {
if (US[i + 1] - US[i] < 1e-4) continue;
const a = base + i * 2;
quad(sgn, a, a + 2, a + 1, a + 3);
}
}
if (wantCav) {
const cav = pos.length / 3;
for (let i = i0; i <= i1; i++) {
const row = section(i);
for (const p of row) pos.push(p[0], p[1], sgn * p[2]);
}
for (let i = 0; i < i1 - i0; i++) {
if (US[i0 + i + 1] - US[i0 + i] < 1e-4) continue;
for (let k = 0; k < K - 1; k++) {
const a = cav + i * K + k;
quad(sgn, a, a + K, a + 1, a + K + 1);
}
}
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx);
g.computeVertexNormals();
return g;
}
function buildSternTerraces(S, group, hullMat) {
if (!S.sternSteps) return;
const H = hullSurface(S);
const g = new THREE.Group();
const E = 1e-5, TH = 0.15;
const capH = S.capM || 0.2;
const steel = hex => new THREE.ShaderMaterial({
vertexShader: SHADERS['STEEL_VERT.vert'], fragmentShader: SHADERS['STEEL_FRAG.frag'],
side: THREE.DoubleSide,
uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam,
uCol: { value: new THREE.Color(hex) } } });
const white = steel(S.topside || '#e4e2dc');
const capMat = steel('#4a5057');
const cover = deckCovering(S);
const tread = cover.recorded && cover.mode === 1 ? steel(cover.col) : white;
const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.60,
side: THREE.DoubleSide });
const gLo = new THREE.Color(0x272e35), gHi = new THREE.Color(0x4a545d);
const glassQuad = (x, z0, z1, y0, y1) => {
const gg = new THREE.BufferGeometry();
gg.setAttribute('position', new THREE.Float32BufferAttribute(
[x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
gg.setAttribute('color', new THREE.Float32BufferAttribute(
[gLo.r, gLo.g, gLo.b, gLo.r, gLo.g, gLo.b,
gHi.r, gHi.g, gHi.b, gHi.r, gHi.g, gHi.b], 3));
gg.setIndex([0, 1, 2, 0, 2, 3]); gg.computeVertexNormals();
return new THREE.Mesh(gg, glassMat);
};
const loft = (secs, mat, wrap, ends) => {
const pos = [], idx = [];
const P = secs[0].length;
for (const sec of secs) for (const p of sec) pos.push(p[0], p[1], p[2]);
for (let i = 0; i < secs.length - 1; i++)
for (let f = 0; f < (wrap ? P : P - 1); f++) {
const c = (f + 1) % P;
idx.push(i * P + f, (i + 1) * P + f, i * P + c,
i * P + c, (i + 1) * P + f, (i + 1) * P + c);
}
if (ends) {
const l = (secs.length - 1) * P;
idx.push(0, 1, 2, 0, 2, 3, l, l + 2, l + 1, l, l + 3, l + 2);
}
const gg = new THREE.BufferGeometry();
gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
gg.setIndex(idx); gg.computeVertexNormals();
return new THREE.Mesh(gg, mat);
};
const edgeAt = u => surfacePoint(S, H, u, 1);
for (let si = 0; si < S.sternSteps.steps.length; si++) {
const st = S.sternSteps.steps[si];
const u0 = st.u[0] + E, u1 = st.u[1] - E;
const N = Math.max(2, Math.ceil((u1 - u0) * S.lwl / 2));
for (const sgn of [-1, 1]) {
const wall = [], cap = [];
for (let i = 0; i <= N; i++) {
const u = u0 + (i / N) * (u1 - u0);
const p = edgeAt(u);
const x = p[0], fb = p[1], ye = Math.abs(p[2]);
const top = H.stepTop(u);
wall.push([[x, fb - 0.3, sgn * (ye - TH)], [x, top - capH, sgn * (ye - TH)],
[x, top - capH, sgn * ye],      [x, fb - 0.3, sgn * ye]]);
cap.push([[x, top - capH, sgn * (ye - TH - 0.02)], [x, top, sgn * (ye - TH - 0.02)],
[x, top, sgn * (ye + 0.03)],             [x, top - capH, sgn * (ye + 0.03)]]);
}
g.add(tag(loft(wall, white, true, true), 'terrace'));
g.add(tag(loft(cap, capMat, true, true), 'terrace'));
}
const b = st.u[0];
const dF = H.sheer(b - E), dA = H.sheer(b + E);
if (dF - dA > 0.02) {
const eF = edgeAt(b - E), eA = edgeAt(b + E);
const rows = [[], []];
for (let k = 0; k <= 8; k++) {
const kk = k / 8;
rows[0].push([eF[0], eF[1] + Math.cos((kk - 0.5) * Math.PI) * eF[2] * 0.035,
eF[2] * (1 - 2 * kk)]);
rows[1].push([eA[0], eA[1] + Math.cos((kk - 0.5) * Math.PI) * eA[2] * 0.035,
eA[2] * (1 - 2 * kk)]);
}
g.add(tag(loft(rows, white, false, false), 'terrace'));
const zwA = Math.abs(eA[2]), zwF = Math.abs(eF[2]);
const crownAt = (z, edgeY, zw) => edgeY + 0.035 * zw * Math.cos(z * Math.PI / (2 * zw));
if (dF - dA > 2.0) {
const xg = eA[0] + 0.025;
const head = dF - 0.45;
const sill = crownAt(0, dA, zwA) + 1.0;
const zBand = zwA * 0.72;
const doorTag = (m, nm, what) => tag(m, 'terrace', nm, what);
g.add(doorTag(glassQuad(xg, -zBand, -1.55, sill, head), 'Terrace glazing',
'The tinted band across the house’s aft face, looking down the terraces. '
+ 'The delivery photograph reads this wall dark against the white; the pane '
+ 'arrangement is inferred — the plate’s scale cannot place it.'));
g.add(doorTag(glassQuad(xg, 1.55, zBand, sill, head), 'Terrace glazing',
'The tinted band across the house’s aft face, looking down the terraces. '
+ 'The delivery photograph reads this wall dark against the white; the pane '
+ 'arrangement is inferred — the plate’s scale cannot place it.'));
for (const sgn of [-1, 1])
g.add(doorTag(glassQuad(xg, sgn * 0.10, sgn * 1.45,
crownAt(sgn * 0.8, dA, zwA) + 0.02, head),
'Terrace doors',
'Glazed doors from the saloon onto the highest terrace, glass to the sill. '
+ 'Attested by the dark aft face in the delivery photograph; their exact '
+ 'width is inferred.'));
} else if (dF - dA > 0.25) {
for (const sgn of [-1, 1]) {
const zs = sgn * (zwA - 1.75);
const yb = crownAt(zs, dA, zwA), yt = crownAt(zs, dF, zwF);
const dl = yt - yb;
const n = Math.max(2, Math.round(dl / 0.19)), rise = dl / n, treadD = 0.28;
const flight = new THREE.Group();
for (let j = 0; j < n; j++) {
const hgt = (yt - j * rise) - yb;
const step = new THREE.Mesh(new THREE.BoxGeometry(treadD, hgt, 1.3), tread);
step.position.set(eA[0] + 0.02 + (j + 0.5) * treadD, yb + hgt / 2, zs);
flight.add(step);
}
g.add(tag(flight, 'stair', 'Terrace stair',
cover.recorded && cover.mode === 1
? 'Twin flights closing each terrace break, trodden in the deck’s own '
+ 'recorded covering — a yacht’s flights match the floors they join. '
+ 'Tread and rise are the builder’s convention; no plate resolves them.'
: undefined));
}
}
}
}
const pT = edgeAt(1 - E);
const xT = pT[0], fbT = pT[1], bT = Math.abs(pT[2]), topT = H.stepTop(1);
if (topT !== null && topT > fbT + 0.1) {
const secs = [];
for (let k = 0; k <= 8; k++) {
const y = bT * (1 - 2 * k / 8);
secs.push([[xT - TH, fbT - 0.3, y], [xT - TH, topT - capH, y],
[xT, topT - capH, y],    [xT, fbT - 0.3, y]]);
}
g.add(tag(loft(secs, white, true, true), 'terrace'));
const capS = [];
for (let k = 0; k <= 8; k++) {
const y = bT * (1 - 2 * k / 8);
capS.push([[xT - TH - 0.02, topT - capH, y], [xT - TH - 0.02, topT, y],
[xT + 0.03, topT, y],             [xT + 0.03, topT - capH, y]]);
}
g.add(tag(loft(capS, capMat, true, true), 'terrace'));
}
group.add(g);
}
const HULL_VERT = SHADERS['HULL_VERT.vert'];
const HULL_FRAG = SHADERS['HULL_FRAG.frag'];
function mastLowerOf(mk, steelMain) {
if (mk.truckM !== undefined && mk.rig === 'square') {
const K = mk.only === 1 ? 1.0
: mk.only === 2 ? 0.88 + 0.60
: 0.88 * (1 + 0.60) + 0.30;
return mk.truckM / K;
}
return mk.heightM !== undefined ? mk.heightM : (mk.height || 0) * steelMain;
}
function buildRig(S, group, mats, FINE, FURLED) {
const L = S.lwl, B = S.beam;
const H = hullSurface(S);
const deckAt = u => H.sheer(u);
const deckMax = (uA, uB) => {
const a = Math.max(0, Math.min(uA, uB)), b = Math.min(1, Math.max(uA, uB));
let m = -Infinity;
for (let k = 0; k <= 8; k++) m = Math.max(m, deckAt(a + (b - a) * k / 8));
return m;
};
const triA2 = (P, Q, R) =>
Math.abs((Q[0] - P[0]) * (R[1] - P[1]) - (R[0] - P[0]) * (Q[1] - P[1])) / 2;
const woodDark = mats.spar, canvas = mats.canvas;
const ropeMat = mats.ropeSolid || woodDark;
const cyl = (x, y0, y1, r0, r1, mat, tiltZ = 0) => {
const h = y1 - y0;
const g = new THREE.CylinderGeometry(r1, r0, h, 9, 1, true);
const m = new THREE.Mesh(g, mat);
m.position.set(x, y0 + h / 2, 0);
m.rotation.z = tiltZ;
group.add(tag(m, 'mast'));
return m;
};
const TRIM = S.trim !== undefined ? S.trim : 0.34;
const sails = [], spars = [], mastTops = [], stayMasts = [];
S.masts.forEach((mk, mi) => {
const u = mk.at;
const nextAt = (S.masts[mi + 1] || {}).at;
let obstruct = nextAt !== undefined ? nextAt : Infinity;
drawnFunnelStations(S).forEach(fu => {
if (fu > u + 1e-4 && fu < obstruct) obstruct = fu;
});
const openAft = obstruct === Infinity;
const gapAft = (Math.min(obstruct, 1.04) - u) * L;
const x = (u - 0.5) * L + H.rake(u);
let base = deckAt(u);
if (S.mastStep === 'house' && S.decks) {
const HT = linerHouse(S);
for (const t of HT.tiers) if (u >= t.uA && u <= t.uB) base = Math.max(base, t.y1);
}
const rakeRad = (mk.rake || 0) * Math.PI / 180;
const steelMain = (S.lwl + S.beam) / 2;
const lower = mastLowerOf(mk, steelMain);
const mainLower = S.masts.reduce((mx, m2) =>
Math.max(mx, mastLowerOf(m2, steelMain)), 0)
|| lower || 1;
const isMizzen = mk.at === Math.max(...S.masts.map(m2 => m2.at)) && S.masts.length >= 3
&& !S.iron && S.masts.some(m2 => m2.rig === 'square') && lower < mainLower * 0.95
&& (mk.rig === 'square' || mk.rig === 'gaff' || mk.rig === 'lateen');
const mScale = lower / mainLower;
const dScale = [isMizzen ? Math.min(mScale, 0.60) : mScale,
isMizzen ? Math.min(mScale, 0.70) : mScale,
isMizzen ? Math.min(mScale, 0.70) : mScale];
const top = lower * 0.60, tg = top * 0.50;
let y = base;
let capY = base;
const mastYards = [];
const segHeads = [];
let prevYard = deckMax(u - 0.10, u + 0.10) + lower * 0.13;
const crossYard = (yy, yardLen, kind, hoist) => {
const RATE = { course: 0.700, topsail: 0.625, topgallant: 0.600, royal: 0.600 };
const slingsD = S.iron ? yardLen / 50
: yardLen * (RATE[kind] || 0.625) / 36;
const yg = new THREE.CylinderGeometry(slingsD / 2, slingsD / 2, yardLen, 16, 8);
const ym = new THREE.Mesh(yg, woodDark);
const yp = yg.attributes.position;
for (let i = 0; i < yp.count; i++) {
const t = Math.abs(yp.getY(i)) / (yardLen / 2);
const k = S.iron
? (t < 0.5 ? 1.0 : 1.0 - ((t - 0.5) / 0.5) * 0.5)
: (t < 0.25 ? 1.0 - 0.144 * (t / 0.25)
: t < 0.75 ? 0.856 - 0.256 * ((t - 0.25) / 0.5)
: 0.600 - 0.200 * ((t - 0.75) / 0.25));
yp.setX(i, yp.getX(i) * k); yp.setZ(i, yp.getZ(i) * k);
}
yg.computeVertexNormals();
ym.quaternion
.setFromAxisAngle(new THREE.Vector3(0, 1, 0), TRIM)
.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
ym.position.set(x + Math.sin(rakeRad) * (yy - base), yy, 0);
group.add(tag(ym, 'yard'));
if (S.iron) ym.userData.part = { ...ym.userData.part,
what: 'A rolled ' + (S.build === 'steel' ? 'steel' : 'iron') + ' tube, parallel '
+ 'through its middle half and coned to half its slings diameter at the arms. '
+ 'Cut at length/50 at the slings, length/100 at the arms — the rate the Peking '
+ 're-masting cut every steel yard to in 2017, and Great Eastern\'s 1858 iron '
+ 'lower yard holds at 50.4. An attested rate applied to this spar\'s own '
+ 'length: the rate is the record\'s, the figure DERIVED from it.' };
spars.push({ u, x: ym.position.x, y: yy, half: yardLen / 2,
armX: Math.sin(TRIM) * yardLen / 2, armZ: Math.cos(TRIM) * yardLen / 2 });
const drop = yy - prevYard;
prevYard = yy;
mastYards.push({ yy, cx: ym.position.x, half: yardLen / 2, drop, hoist });
if (FURLED) {
const sT2 = Math.sin(TRIM), cT2 = Math.cos(TRIM), w2 = yardLen * 0.48;
sails.push(makeFurl(
new THREE.Vector3(ym.position.x - sT2 * w2, yy, -cT2 * w2),
new THREE.Vector3(ym.position.x + sT2 * w2, yy, cT2 * w2),
(yardLen * 0.96) * (drop * 0.97), furlMat(mats), group, { bunt: true }));
} else {
sails.push(makeSail(x + Math.sin(rakeRad) * (yy - base), yy,
yardLen * 0.96, drop * 0.97, canvas, group, 'square', TRIM));
}
};
const segs = mk.rig === 'lateen' ? []
: (mk.rig === 'pole' || mk.rig === 'none') ? [lower]
: (mk.rig === 'crabclaw' || mk.rig === 'junk') ? [lower]
: mk.rig === 'gaff' ? (mk.topmast ? [lower, lower * 0.52] : [lower])
: [lower, top, tg];
const poleM = segs.reduce((a2, s2) => a2 + s2, 0);
let segR;
if (S.iron && mk.rig !== 'lateen') {
const tubeDia = mk.diaM !== undefined ? mk.diaM : poleM / 55;
const r0 = tubeDia / 2;
const oneTube = mk.rig === 'square' && (S.year || 0) >= 1890;
segR = segs.map((s2, si2) =>
si2 === 0 ? (segs.length > 1 ? { a: r0, b: r0 * 0.96 }
: { a: r0, b: r0 * 0.38 })
: si2 === 1 ? (oneTube ? { a: r0 * 0.96, b: r0 * 0.58 }
: { a: r0 * 0.52, b: r0 * 0.36 })
: { a: r0 * 0.48, b: r0 * 0.14 });
} else {
segR = segs.map((s2, si2) => {
const rr = [B * 0.030 * dScale[0], B * 0.020 * dScale[1],
B * 0.013 * dScale[2]][si2];
return { a: rr, b: rr * 0.7 };
});
}
const radii = segR.map(s2 => s2.a);
segs.forEach((seg, si) => {
if (mk.only && si >= mk.only) return;
const mastMat = S.mastLivery === 'buff'
? (mats.mastBuff || (mats.mastBuff = new THREE.MeshStandardMaterial(
{ color: new THREE.Color(S.buff || 0xd8cfbb), roughness: 0.60 })))
: (typeof S.mastLivery === 'string' && S.mastLivery[0] === '#')
? (mats.mastOwn || (mats.mastOwn = new THREE.MeshStandardMaterial(
{ color: new THREE.Color(S.mastLivery), roughness: 0.55, metalness: 0.15 })))
: S.mastLivery
? (si === 0 ? (mats.mastWhite || (mats.mastWhite = new THREE.MeshStandardMaterial(
{ color: 0xdedad0, roughness: 0.58 })))
: (mats.mastBlack || (mats.mastBlack = new THREE.MeshStandardMaterial(
{ color: 0x1e2022, roughness: 0.52, metalness: 0.20 }))))
: S.turrets ? (mats.mastGrey || (mats.mastGrey = new THREE.MeshStandardMaterial(
{ color: 0x5a6067, roughness: 0.55, metalness: 0.30 })))
: woodDark;
const m = cyl(x - Math.sin(rakeRad) * (y - base), y, y + seg,
segR[si].a, segR[si].b, mastMat, -rakeRad);
m.position.x = x + Math.sin(rakeRad) * (y + seg / 2 - base);
if (S.iron) m.userData.part = { ...m.userData.part,
name: mk.wood ? 'Wooden mast' : S.build === 'steel' ? 'Steel mast' : 'Iron mast',
what: mk.diaM !== undefined
? (mk.wood
? 'The one wooden mast on the ship, and it is wooden for a reason: the standard '
+ 'compass stood near it, and a wrought-iron tube alongside would have pulled '
+ 'the needle. Her diameter is the record\'s — 2 ft 9 in — and her stays were '
+ 'hemp where every iron mast carried 7½-inch wire.'
: 'A wrought-iron tube, not a tree: two half-round plates butt-riveted, with '
+ 'iron discs riveted inside for stiffness. The diameter drawn here is the '
+ 'recorded one — Great Eastern\'s six masts, named Monday to Saturday, are '
+ 'on the record at 2 ft 9 in to 3 ft 6 in through. The wooden topmast above '
+ 'the tube is a sending-down spar, and the white-to-black paint joint marks '
+ 'where the iron ends and the wood begins.')
: (mk.rig === 'square' && (S.year || 0) >= 1890)
? 'A rolled steel tube. Lower mast and topmast are one piece — Preussen\'s record: '
+ 'all masts and spars of steel tube except the wooden spanker gaff — and only '
+ 'the topgallant stenge above the doubling steps down and can be struck. No '
+ 'record of this tube\'s diameter was in reach, so it is DERIVED at pole '
+ 'length / 55, the proportion Great Eastern\'s attested tubes hold.'
: 'A riveted ' + (S.build === 'steel' ? 'steel' : 'iron') + ' tube. No record of '
+ 'its diameter was in reach of this model, so the drawn figure is DERIVED at '
+ 'pole length / 55, the proportion held by the one attested set of iron tubes '
+ '(Great Eastern\'s, 1858). A derived figure, labelled as one.' };
if (FINE && si === 0 && mk.rig === 'square' && !S.iron && radii[0] * 2 > 0.55) {
const ironHoops = (S.year || 0) >= 1800;
const rings = [], hoops = [];
const lo = seg * 0.14, hi = seg * 0.76;
const n = Math.max(4, Math.round((hi - lo) / 2.6));
for (let i = 0; i < n; i++) {
const t = (lo + (hi - lo) * (i + 0.5) / n) / seg;
const rT = radii[0] * (1 - 0.3 * t);
const cx = x + Math.sin(rakeRad) * seg * t, cyy = y + seg * t;
if (ironHoops)
rings.push({ cx, cy: cyy, r: rT + 0.013, h: 0.10, tilt: -rakeRad });
else {
rings.push({ cx, cy: cyy, r: rT + 0.028, h: 0.30, tilt: -rakeRad });
for (const sg of [-1, 1])
hoops.push({ cx: cx + Math.sin(rakeRad) * sg * 0.21, cy: cyy + sg * 0.21,
r: rT + 0.035, h: 0.06, tilt: -rakeRad });
}
}
const rm = ringMesh(rings, ironHoops
? (mats.ironBand || (mats.ironBand = new THREE.MeshStandardMaterial(
{ color: 0x23262a, roughness: 0.45, metalness: 0.55 })))
: ropeMat);
if (rm) group.add(tag(rm, ironHoops ? 'mastband' : 'woolding'));
const hm = ringMesh(hoops, mats.woodPale || woodDark);
if (hm) group.add(tag(hm, 'woolding', 'Woolding hoops'));
}
if (FINE && si === 0 && mk.rig === 'junk' && !S.iron && radii[0] * 2 > 0.55) {
const rings = [];
const lo = seg * 0.10, hi = seg * 0.86;
const n = Math.max(3, Math.round((hi - lo) / 2.6));
for (let i = 0; i < n; i++) {
const t = (lo + (hi - lo) * (i + 0.5) / n) / seg;
const rT = radii[0] * (1 - 0.3 * t);
rings.push({ cx: x + Math.sin(rakeRad) * seg * t, cy: y + seg * t,
r: rT + 0.015, h: 0.14, tilt: -rakeRad });
}
const rm = ringMesh(rings, mats.ironBand || (mats.ironBand =
new THREE.MeshStandardMaterial(
{ color: 0x23262a, roughness: 0.45, metalness: 0.55 })));
if (rm) group.add(tag(rm, 'mastband', 'Iron mast straps',
'A great junk\'s mast is compound — no single fir yields a pole a metre through, '
+ 'so several spars are bound together with flat iron straps, the usual fitting '
+ 'on a working junk\'s mast. An 1842 Shanghai junk\'s mainmast measured 1.12 m '
+ 'through a little above the deck, and carried no shrouds or stays at all: the '
+ 'unstayed pole and its straps take the whole thrust of the sail. Strap spacing '
+ 'here is derived from the structural interval; the straps themselves are the '
+ 'record\'s (Needham, Science and Civilisation in China IV:3).'));
}
if (FINE && mk.rig === 'pole' && mk.crowsNest && si === 0) {
const nest = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.028, B * 0.024, B * 0.045, 12, 1, true),
mats.woodPale || woodDark);
nest.position.set(x + Math.sin(rakeRad) * (seg * 0.66), y + seg * 0.66, 0);
group.add(tag(nest, 'mast', "Crow's nest",
'The lookout station, about two thirds up the foremast. Fleet and Lee were in Titanic\'s when they sighted the iceberg — without binoculars, the ship\'s glasses having been locked in a cabinet whose key left with an officer reassigned at Southampton.'));
}
if (FINE && mk.rig === 'square' && si === 0 && (S.year || 0) >= 1100) {
const topR = B * 0.20, headR = radii[0] * 0.7;
const tp = buildTop(topR, mats.woodPale, headR, S.year);
tp.position.set(x + Math.sin(rakeRad) * (y + seg - base), y + seg * 0.90, 0);
group.add(tp);
if (mk.only !== 1) {
const chH = seg * 0.085, chD = radii[0] * 2.1, chW = radii[0] * 0.5;
const topY = seg * 0.90 - topR * 0.22;
for (const sz of [-1, 1]) {
const cg = new THREE.BoxGeometry(chD, chH, chW);
const cp = cg.attributes.position;
for (let i = 0; i < cp.count; i++)
if (cp.getY(i) < 0) cp.setX(i, cp.getX(i) * 0.35);
cg.computeVertexNormals();
const ck = new THREE.Mesh(cg, mastMat);
const hy = topY - chH / 2;
ck.position.set(x + Math.sin(rakeRad) * hy, y + hy, sz * (headR + chW * 0.5));
ck.rotation.z = -rakeRad;
group.add(tag(ck, 'cheek'));
}
}
}
if (FINE && mk.rig === 'square' && si === 0 && mk.only === 1
&& S.year !== undefined && S.year < 1100) {
const hR = radii[0] * 0.7;
const kg = new THREE.Group();
const blkH = hR * 4.2, blkW = hR * 3.0, blkD = hR * 2.2;
const blk = new THREE.Mesh(new THREE.BoxGeometry(blkD, blkH, blkW), mastMat);
kg.add(blk);
const lip = new THREE.Mesh(
new THREE.BoxGeometry(blkD * 1.18, hR * 0.7, blkW * 1.18), mastMat);
lip.position.y = blkH / 2 - hR * 0.35;
kg.add(lip);
const slotMat = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
{ color: 0x17120c, roughness: 0.95 }));
const slot = new THREE.Mesh(
new THREE.BoxGeometry(blkD * 1.02, blkH * 0.52, hR * 0.42), slotMat);
slot.position.y = -hR * 0.3;
kg.add(slot);
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(hR * 0.26, hR * 0.26, blkW * 1.12, 8), slotMat);
pin.rotation.x = Math.PI / 2;
pin.position.y = -hR * 0.3;
kg.add(pin);
const hY = y + seg - blkH / 2;
kg.position.set(x + Math.sin(rakeRad) * (hY - base), hY, 0);
kg.rotation.z = -rakeRad;
group.add(tag(kg, 'karchesion'));
}
if (FINE && mk.rig === 'junk' && si === 0) {
const hR = segR[0].b;
const sg2 = new THREE.Group();
const slotMat2 = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
{ color: 0x17120c, roughness: 0.95 }));
for (const zz of [1, -1]) {
const slot = new THREE.Mesh(
new THREE.BoxGeometry(hR * 3.4, hR * 1.5, hR * 0.42), slotMat2);
slot.position.z = zz * hR * 0.33;
sg2.add(slot);
}
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(hR * 0.26, hR * 0.26, hR * 2.9, 8), slotMat2);
pin.rotation.x = Math.PI / 2;
sg2.add(pin);
const hY = y + seg * 0.965;
sg2.position.set(x + Math.sin(rakeRad) * (hY - base), hY, 0);
sg2.rotation.z = -rakeRad;
group.add(tag(sg2, 'sheave'));
}
if (FINE && S.corbis && si === 0 && lower === mainLower) {
const wicker = mats.wicker || (mats.wicker = new THREE.MeshStandardMaterial(
{ color: 0x8a7148, roughness: 0.92, side: THREE.DoubleSide }));
const cb = new THREE.Group();
const bk = new THREE.Mesh(
new THREE.CylinderGeometry(0.34, 0.25, 0.52, 12, 1, true), wicker);
const bt = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), wicker);
bt.rotation.x = -Math.PI / 2; bt.position.y = -0.26;
bk.add(bt);
const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 16), wicker);
rim.rotation.x = Math.PI / 2; rim.position.y = 0.26;
bk.add(rim);
cb.add(bk);
const hang = radii[0] * 0.7 + 0.42;
const lan = new THREE.Mesh(
new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), ropeMat);
lan.position.set(0, 0.54, -hang * 0.5);
lan.rotation.x = -0.96;
cb.add(lan);
cb.position.set(x + Math.sin(rakeRad) * (y + seg - base), y + seg * 0.94, hang);
group.add(tag(cb, 'corbis'));
}
if (mk.rig === 'square' && !mk.yards) {
const courseL = mk.courseYardM !== undefined ? mk.courseYardM : lower * 0.875;
const yardLen = si === 0 ? courseL
: si === 1 ? courseL * 0.714
: courseL * 0.714 * 0.667;
const tiers = mk.only || 3;
const courseAt = tiers === 1 ? 0.90 : tiers === 2 ? 0.72 : 0.60;
crossYard(y + seg * (si === 0 ? courseAt : 0.88), yardLen,
si === 0 ? (isMizzen ? 'topsail' : 'course')
: si === 1 ? 'topsail' : 'topgallant',
si > 0 || tiers === 1 ? { tie: si }
: isMizzen ? 'fixed' : S.iron ? 'fixed' : 'jeers');
}
capY = y + seg;
segHeads[si] = capY;
y += seg * 0.88;
});
if (mk.rig === 'square' && mk.yards) {
const T = y - base;
const PLAN = {
course: [0.36, 1.000, 'course'],
ltop:   [0.50, 0.93, 'topsail'],
utop:   [0.62, 0.85, 'topsail'],
top:    [0.55, 0.88, 'topsail'],
ltg:    [0.73, 0.73, 'topgallant'],
utg:    [0.83, 0.62, 'topgallant'],
tg:     [0.76, 0.68, 'topgallant'],
royal:  [0.92, 0.50, 'royal'],
};
const HOIST = { course: 'fixed', ltop: 'fixed', ltg: 'fixed',
top: { tie: 1 }, utop: { tie: 1 },
tg: { tie: 2 }, utg: { tie: 2 }, royal: { tie: 2 } };
const courseL = mk.courseYardM !== undefined ? mk.courseYardM : lower * 0.875;
mk.yards.filter(nm => PLAN[nm])
.sort((a, b) => PLAN[a][0] - PLAN[b][0])
.forEach(nm => { const [f, r, kind] = PLAN[nm];
crossYard(base + T * f, courseL * r,
kind === 'course' && isMizzen ? 'topsail' : kind, HOIST[nm]); });
}
if (FINE && mk.rig === 'square' && mastYards.length) {
const mx = h => x + Math.sin(rakeRad) * (h - base);
const sT = Math.sin(TRIM), cT = Math.cos(TRIM);
const V3 = (px, py, pz) => new THREE.Vector3(px, py, pz);
const rail = (uu, sgn) => {
const uc = Math.max(0.03, Math.min(0.965, uu));
const hz = Math.abs(surfacePoint(S, H, uc, 1)[2]) * 0.96;
return V3((uc - 0.5) * L, deckAt(uc) + B * 0.012, sgn * hz);
};
const lifts = [], sheets = [], tacks = [], hals = [], jeers = [];
mastYards.forEach((yd, k) => {
const above = mastYards[k + 1];
const hL = above ? above.yy : Math.min(capY, yd.yy + yd.half * 0.9);
for (const sgn of [1, -1])
lifts.push([V3(yd.cx + sgn * sT * yd.half, yd.yy, sgn * cT * yd.half),
V3(mx(hL), hL, 0)]);
const w2 = yd.half * (FURLED ? 0.45 : 0.96);
const clewY = FURLED ? yd.yy - 0.4 : yd.yy - yd.drop * 0.97;
for (const sgn of [1, -1]) {
const clew = V3(yd.cx + sgn * sT * w2, clewY, sgn * cT * w2);
if (k === 0) {
sheets.push([clew, rail(u + 0.17, sgn)]);
tacks.push([clew, rail(u - 0.15, sgn)]);
} else {
const below = mastYards[k - 1];
sheets.push([clew, V3(below.cx + sgn * sT * below.half, below.yy,
sgn * cT * below.half)]);
}
}
if (yd.hoist && yd.hoist.tie !== undefined) {
const sgn = k % 2 ? 1 : -1;
const hy = segHeads[yd.hoist.tie] !== undefined ? segHeads[yd.hoist.tie] : capY;
const hd = V3(mx(hy), hy, 0);
hals.push([V3(mx(yd.yy) + B * 0.02, yd.yy, 0), hd],
[hd, rail(u + 0.05 + 0.015 * k, sgn)]);
} else if (yd.hoist === 'jeers' && segHeads[0] !== undefined) {
const jb = base + (segHeads[0] - base) * 0.86;
const zo = Math.max(0.25, B * 0.03);
const dY = deckAt(u) + B * 0.012;
for (const sgn of [1, -1]) {
const blk = V3(yd.cx + sgn * sT * zo * 1.5, yd.yy, sgn * cT * zo * 1.5);
jeers.push([V3(mx(jb), jb, sgn * zo), blk],
[blk, V3((u + 0.02 - 0.5) * L, dY, sgn * zo)]);
}
}
});
const rr = B * 0.0004;
const lm = ropeMesh(lifts, 0.012 + rr, ropeMat);  if (lm) group.add(tag(lm, 'lift'));
const sm = ropeMesh(sheets, 0.013 + rr, ropeMat); if (sm) group.add(tag(sm, 'sheet'));
const tm = ropeMesh(tacks, 0.013 + rr, ropeMat);  if (tm) group.add(tag(tm, 'tack'));
const hm = ropeMesh(hals, 0.011 + rr, ropeMat);   if (hm) group.add(tag(hm, 'halyard'));
const jm2 = ropeMesh(jeers, 0.015 + rr, ropeMat); if (jm2) group.add(tag(jm2, 'jeers'));
}
const segL = segHeads.length ? (segs[segHeads.length - 1] || 0) : 0;
const cosR = Math.cos(rakeRad), sinR = Math.sin(rakeRad);
const truckY = segHeads.length
? segHeads[segHeads.length - 1] - (1 - cosR) * segL / 2 - cosR * segL * 0.04
: y + (lower * 0.14);
const truckX = segHeads.length
? x + sinR * (segHeads[segHeads.length - 1] - base) - sinR * segL * 0.04
: x + sinR * (truckY - base);
if (mk.rig === 'square') {
mastTops.push({ u, x: truckX, y: truckY });
stayMasts[mi] = { x, base, T: y - base };
}
else if (mk.rig === 'gaff' && segs.length)
mastTops.push({ u, x: truckX, y: truckY, gaff: true });
if (mk.tripod && (mk.rig === 'none' || mk.rig === 'pole')) {
const legMat = S.turrets
? (mats.mastGrey || (mats.mastGrey = new THREE.MeshStandardMaterial(
{ color: 0x5a6067, roughness: 0.55, metalness: 0.30 })))
: woodDark;
const yJoin = base + lower * 0.62;
const dirn = mk.tripod === -1 ? -1 : 1;
const legRun = dirn * Math.tan((mk.tripodRake !== undefined ? mk.tripodRake : 26)
* Math.PI / 180) * (lower * 0.62);
const spread = Math.min(B * 0.13, lower * 0.10);
for (const sgn of [1, -1]) {
const uFoot = Math.max(0.02, Math.min(0.98, u + legRun / L));
const foot = new THREE.Vector3(x + legRun, deckAt(uFoot) - 0.4, sgn * spread);
const head = new THREE.Vector3(x, yJoin, 0);
const dir = new THREE.Vector3().subVectors(head, foot);
const len = dir.length();
const leg = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.011, B * 0.014, len, 8), legMat);
leg.position.copy(foot).addScaledVector(dir, 0.5);
leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
group.add(tag(leg, 'mast', 'Tripod leg',
'One of the two struts that brace the pole. A pole mast on a turbine ship vibrates too much to hold a rangefinder steady, so the fire-control top stands on three legs.'));
}
const stp = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.085, B * 0.072, 2.1, 14), legMat);
stp.position.set(x, yJoin + 1.05, 0);
group.add(tag(stp, 'mast', 'Spotting top',
'The fire-control position at the masthead: observers here spot the fall of shot and correct the guns. On Dreadnought this mast stood abaft the fore funnel, so at speed the top filled with hot smoke — the famous flaw that her successors inherited for a decade.'));
}
if (mk.rig === 'lateen') {
const mixed = (S.masts || []).some(m => m.rig === 'square');
const yardLen = mixed ? lower * 1.15 : L * mScale;
const th = mixed ? 0.98 : 0.785;
const dir = [Math.cos(th), Math.sin(th)];
const sling = [x, base + dir[1] * yardLen / 3];
const heelX = x - dir[0] * yardLen / 3;
const heelU = Math.max(0, Math.min(1, heelX / L + 0.5));
const heel = [heelX, deckMax(heelU, u) + B * 0.045];
const peakPt = [heel[0] + dir[0] * yardLen, heel[1] + dir[1] * yardLen];
const mh = sling[1] - base;
const mm = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.020 * dScale[0], B * 0.032 * dScale[0], mh, 18),
woodDark);
mm.position.set(x, (base + sling[1]) / 2, 0);
group.add(tag(mm, 'mast'));
const ylen = Math.hypot(peakPt[0] - heel[0], peakPt[1] - heel[1]);
const mzD = mixed ? (mainLower * 0.875 * 0.700 / 36) * 2 / 3 : 0;
const ym = new THREE.Mesh(
new THREE.CylinderGeometry(mixed ? mzD * 0.21 : B * 0.005,
mixed ? mzD * 0.50 : B * 0.011, ylen, 14), woodDark);
ym.position.set((heel[0] + peakPt[0]) / 2, (heel[1] + peakPt[1]) / 2, 0);
ym.rotation.z = -Math.atan2(peakPt[0] - heel[0], peakPt[1] - heel[1]);
group.add(tag(ym, 'yard', 'Lateen yard'));
const xStem = -0.455 * L;
const along = Math.max(0, Math.min(yardLen * 0.5, (xStem - heel[0]) / dir[0]));
const tack = [heel[0] + dir[0] * along, heel[1] + dir[1] * along];
const clewX = tack[0] + yardLen * 0.62;
const clewU = Math.max(0, Math.min(1, clewX / L + 0.5));
const clew = [clewX, deckMax(u, clewU) + Math.max(H.sheer(0.5) * 0.10, B * 0.10)];
if (FURLED) {
const area = S.settee
? triA2(tack, peakPt, clew) * (1 - S.settee * 0.35)
: triA2(tack, peakPt, clew);
sails.push(makeFurl(new THREE.Vector3(tack[0], tack[1], 0),
new THREE.Vector3(peakPt[0], peakPt[1], 0),
area, furlMat(mats), group, {}));
} else if (S.settee) {
const throat = [tack[0] + (peakPt[0] - tack[0]) * S.settee,
tack[1] + (peakPt[1] - tack[1]) * S.settee];
const foreft = [tack[0] + (clew[0] - tack[0]) * S.settee * 0.55,
tack[1] + (clew[1] - tack[1]) * S.settee * 0.55];
sails.push(makeQuadSail(foreft, throat, peakPt, clew, group, 0.075));
} else {
sails.push(makeTriSail(tack, peakPt, clew, group, 0.055));
}
}
if (mk.rig === 'crabclaw') {
const spread = 1.19 - 0.46;
const LEECH = 0.640;
const sparLen = S.sailAreaEach
? Math.sqrt(2 * S.sailAreaEach / (Math.sin(spread) * LEECH))
: L * 0.98;
const tack = [x - L * 0.22, base];
const aB = FURLED ? 1.09 : 0.46;
const tipY = [tack[0] + Math.cos(1.19) * sparLen, tack[1] + Math.sin(1.19) * sparLen];
const tipB = [tack[0] + Math.cos(aB) * sparLen, tack[1] + Math.sin(aB) * sparLen];
[[tipY, 'Yard'], [tipB, 'Boom']].forEach(([tip, nm]) => {
const len2 = Math.hypot(tip[0] - tack[0], tip[1] - tack[1]);
const g2 = new THREE.CylinderGeometry(B * 0.007, B * 0.014, len2, 14);
const m2 = new THREE.Mesh(g2, woodDark);
m2.position.set((tack[0] + tip[0]) / 2, (tack[1] + tip[1]) / 2, 0);
m2.rotation.z = -Math.atan2(tip[0] - tack[0], tip[1] - tack[1]);
group.add(tag(m2, 'yard', nm));
});
if (FURLED) {
const area = S.sailAreaEach || 0.5 * sparLen * sparLen * Math.sin(spread) * LEECH;
const mid = [(tipY[0] + tipB[0]) / 2, (tipY[1] + tipB[1]) / 2];
sails.push(makeFurl(new THREE.Vector3(tack[0], tack[1], 0),
new THREE.Vector3(mid[0], mid[1], 0),
area, furlMat(mats), group, {}));
} else {
sails.push(makeTriSail(tack, tipY, tipB, group, 0.075, S.leechPull || 0.46));
}
}
if (mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker)) {
const boomL = openAft
? Math.max(lower * 0.16, Math.min(lower * 0.62, gapAft * 1.6))
: Math.max(lower * 0.16, Math.min(lower * 0.62, gapAft * 0.78));
const gaffL = Math.min(lower * 0.42, boomL * 0.72);
const peak = 0.62;
const footY = base + lower * 0.11;
const bm2 = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.012, B * 0.016, boomL, 14), woodDark);
bm2.rotation.z = Math.PI / 2;
bm2.position.set(x + boomL / 2, footY, 0);
group.add(tag(bm2, 'yard', 'Boom'));
const gy = base + lower * (mk.rig === 'square' ? 0.55 : 0.86);
const setThroat = [x, gy];
const setPeak = [x + Math.cos(peak) * gaffL, gy + Math.sin(peak) * gaffL];
const tack = [x, footY], clew = [x + boomL, footY];
const quadArea = triA2(tack, setThroat, setPeak) + triA2(tack, setPeak, clew);
if (FURLED) {
const r = Math.max(0.05, Math.sqrt((quadArea * 0.035) / (Math.PI * Math.max(boomL, 0.1))));
sails.push(makeFurl(new THREE.Vector3(x, footY + r * 1.1, 0),
new THREE.Vector3(x + boomL, footY + r * 1.1, 0),
quadArea, furlMat(mats), group, { radius: r }));
const rest = 0.13;
const gm = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.008, B * 0.012, gaffL, 14), woodDark);
gm.rotation.z = -(Math.PI / 2 - rest);
gm.position.set(x + Math.cos(rest) * gaffL / 2,
footY + r * 2.2 + Math.sin(rest) * gaffL / 2, 0);
group.add(tag(gm, 'yard', 'Gaff'));
} else {
const gm = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.008, B * 0.012, gaffL, 14), woodDark);
gm.rotation.z = -(Math.PI / 2 - peak);
gm.position.set(x + Math.cos(peak) * gaffL / 2, gy + Math.sin(peak) * gaffL / 2, 0);
group.add(tag(gm, 'yard', 'Gaff'));
sails.push(makeQuadSail(tack, setThroat, setPeak, clew, group, 0.075));
if (mk.topmast && mk.topsail) {
const topSeg = lower * 0.52;
const truckY = base + lower * 0.88 + topSeg * 0.96;
sails.push(makeTriSail([x, gy + lower * 0.015], [x, truckY], setPeak, group, 0.035, 0.92));
}
}
}
if (mk.rig === 'junk') {
const nb = 5;
const THB = 26 * Math.PI / 180;
const THY = 60 * Math.PI / 180;
const castleTop = (S.poop && S.poop.length === 3 &&
u >= S.poop[0] - 0.02 && u <= S.poop[1] + 0.02)
? B * 0.115 * S.poop[2] * 1.10 : 0;
const footY = base + lower * 0.14 + castleTop;
const boom = Math.min(lower * 0.66, (base + lower * 0.97 - footY) / 1.244);
const luffH = boom * (2 / 3);
const yardL = boom * (2 / 3);
const xF = -0.08 * boom;
const lug = new THREE.Group();
lug.position.set(x, 0, 0);
lug.rotation.y = -TRIM * 1.5;
group.add(lug);
const fwd = [], aft = [];
if (FURLED) {
const dyS = B * 0.014;
for (let k = 0; k <= nb; k++) {
fwd.push([xF, footY + k * dyS]);
aft.push([xF + boom, footY + k * dyS]);
}
fwd.push([xF, footY + (nb + 1) * dyS]);
aft.push([xF + yardL, footY + (nb + 1) * dyS]);
} else {
for (let k = 0; k <= nb; k++) {
const a = THB * Math.pow(k / nb, 1.4);
const f = [xF, footY + luffH * (k / (nb + 1))];
fwd.push(f);
aft.push([f[0] + boom * Math.cos(a), f[1] + boom * Math.sin(a)]);
}
fwd.push([xF, footY + luffH]);
aft.push([xF + yardL * Math.cos(THY), footY + luffH + yardL * Math.sin(THY)]);
}
for (let k = 0; k < fwd.length; k++) {
const dx = aft[k][0] - fwd[k][0], dy = aft[k][1] - fwd[k][1];
const len = Math.hypot(dx, dy);
const r = B * (k === 0 ? 0.0050 : k === nb + 1 ? 0.0042 : 0.0032);
const bg = new THREE.CylinderGeometry(r, r, len, 12);
const bm = new THREE.Mesh(bg, woodDark);
bm.rotation.z = Math.PI / 2 + Math.atan2(dy, dx);
bm.position.set((fwd[k][0] + aft[k][0]) / 2, (fwd[k][1] + aft[k][1]) / 2, 0);
lug.add(tag(bm, 'yard', k === 0 ? 'Boom' : (k === nb + 1 ? 'Yard' : 'Batten ' + k)));
}
if (FURLED) {
const dyS = B * 0.014;
for (let k = 0; k <= nb; k++) {
const y0 = (fwd[k][1] + fwd[k + 1][1]) / 2;
const lenK = Math.min(aft[k][0], aft[k + 1][0]) - xF;
sails.push(makeFurl(new THREE.Vector3(xF, y0, 0),
new THREE.Vector3(xF + lenK, y0, 0),
0, furlMat(mats), lug, { radius: dyS * 0.85 }));
}
} else {
for (let k = 0; k <= nb; k++)
sails.push(makeQuadSail(fwd[k], fwd[k + 1], aft[k + 1], aft[k], lug, 0.030));
}
const shX = xF + Math.min(boom * 1.16, gapAft * 0.90);
const sheetPt = new THREE.Vector3(shX, base + castleTop + B * 0.012, 0);
const shSegs = [];
for (let k = 0; k <= nb; k++)
shSegs.push([new THREE.Vector3(aft[k][0], aft[k][1], 0), sheetPt]);
const sh = ropeMesh(shSegs, 0.012 + B * 0.0005, ropeMat);
if (sh) lug.add(tag(sh, 'sheet'));
const slings = new THREE.Vector3(
(fwd[nb + 1][0] + aft[nb + 1][0]) / 2, (fwd[nb + 1][1] + aft[nb + 1][1]) / 2, 0);
const shv = new THREE.Vector3(0, base + lower * 0.965, 0);
const hal = ropeMesh([[slings, shv],
[shv, new THREE.Vector3(B * 0.05, base + castleTop + B * 0.012,
B * 0.03)]],
0.016 + B * 0.0005, ropeMat);
if (hal) lug.add(tag(hal, 'halyard'));
}
if (mk.shrouds) {
const half = Math.abs(surfacePoint(S, H, u, 1)[2]);
const topY = base + lower * 0.97;
const shroudPts = [[], []];
const shroudSegs = [], ratSegs = [];
for (let s = 0; s < mk.shrouds; s++) {
const f = (s + 1) / (mk.shrouds + 1);
const chX = x + (f - 0.5) * L * 0.055;
[1, -1].forEach((side, si2) => {
const a = new THREE.Vector3(chX, base, side * half * 1.06);
const b = new THREE.Vector3(x + Math.sin(rakeRad) * lower, topY, side * B * 0.03);
shroudSegs.push([a, b]);
shroudPts[si2].push([a, b]);
});
}
const shr = ropeMesh(shroudSegs, 0.018 + B * 0.0009, ropeMat);
if (shr) group.add(tag(shr, 'shroud'));
const RAT = 0.3302;
if (mk.rig === 'square') shroudPts.forEach(side => {
if (side.length < 2) return;
const rise = topY - base;
for (let h = RAT; h < rise * 0.86; h += RAT) {
const t = h / rise;
const pts = side.map(([a, b]) => new THREE.Vector3(
a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t));
for (let i = 0; i < pts.length - 1; i++) ratSegs.push([pts[i], pts[i + 1]]);
}
});
const rats = ropeMesh(ratSegs, 0.017 + B * 0.0006, ropeMat);
if (rats) group.add(tag(rats, 'ratline'));
const tiersDrawn = mk.rig === 'square'
? (mk.only ? Math.min(mk.only, segs.length) : segs.length) : 1;
if (FINE && mk.rig === 'square' && tiersDrawn >= 2) {
const platX = x + Math.sin(rakeRad) * lower;
const platY = base + lower * 0.90;
const platR = B * 0.20;
const mxAt = h => x + Math.sin(rakeRad) * (h - base);
const topHead = base + lower * 0.88 + top * 0.97;
const futt = [], upPts = [[], []], upSegs = [], upRats = [], tgSegs = [];
for (let s = 0; s < mk.shrouds; s++) {
const f = (s + 1) / (mk.shrouds + 1);
[1, -1].forEach((side, si2) => {
const [a, b] = shroudPts[si2][s];
const stave = new THREE.Vector3().lerpVectors(a, b, 0.80);
futt.push([stave, new THREE.Vector3(platX + (f - 0.5) * platR * 0.9,
platY, side * platR * 0.85)]);
});
}
const nT = Math.max(2, Math.round(mk.shrouds * 0.6));
for (let s = 0; s < nT; s++) {
const f = (s + 1) / (nT + 1);
[1, -1].forEach((side, si2) => {
const a = new THREE.Vector3(platX + (f - 0.5) * platR * 1.0,
platY + B * 0.01, side * platR * 0.85);
const b = new THREE.Vector3(mxAt(topHead), topHead, side * B * 0.022);
upSegs.push([a, b]);
upPts[si2].push([a, b]);
});
}
upPts.forEach(side => {
if (side.length < 2) return;
const rise = topHead - platY;
for (let h = RAT; h < rise * 0.86; h += RAT) {
const t = h / rise;
const pts = side.map(([a, b]) => new THREE.Vector3().lerpVectors(a, b, t));
for (let i = 0; i < pts.length - 1; i++) upRats.push([pts[i], pts[i + 1]]);
}
});
if (tiersDrawn >= 3) {
const ctR = B * 0.085;
const ct = new THREE.Group();
for (const dx of [-1, 1]) {
const bar = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.022, B * 0.014, ctR * 2.3),
mats.woodPale || woodDark);
bar.position.set(mxAt(topHead) + dx * B * 0.020, topHead, 0);
ct.add(bar);
}
group.add(tag(ct, 'top', 'Crosstrees',
'The light spreaders at the topmast head — trestletrees and crosstrees without '
+ 'a platform. They spread the topgallant shrouds the way the top spreads the '
+ "topmast's, one storey further up."));
const tgHead = base + (lower + top) * 0.88 + tg * 0.95;
const nG = Math.max(2, Math.round(mk.shrouds * 0.35));
for (let s = 0; s < nG; s++) {
const f = (s + 1) / (nG + 1);
for (const side of [1, -1])
tgSegs.push([new THREE.Vector3(mxAt(topHead) + (f - 0.5) * ctR,
topHead + B * 0.008, side * ctR * 0.9),
new THREE.Vector3(mxAt(tgHead), tgHead, side * B * 0.014)]);
}
}
const fu = ropeMesh(futt, 0.014 + B * 0.0006, ropeMat);
if (fu) group.add(tag(fu, 'shroud', 'Futtock shrouds'));
const up = ropeMesh(upSegs, 0.014 + B * 0.0007, ropeMat);
if (up) group.add(tag(up, 'shroud', 'Topmast shrouds'));
const ur = ropeMesh(upRats, 0.014 + B * 0.0005, ropeMat);
if (ur) group.add(tag(ur, 'ratline', 'Topmast ratlines'));
const tgm = ropeMesh(tgSegs, 0.010 + B * 0.0004, ropeMat);
if (tgm) group.add(tag(tgm, 'shroud', 'Topgallant shrouds'));
}
}
});
S.masts.forEach((mk, mi) => {
if (!mk.staysails || !mi) return;
const aftM = stayMasts[mi], fwdM = stayMasts[mi - 1];
if (!aftM || !fwdM) return;
for (let k = 0; k < mk.staysails; k++) {
const t = mk.staysails === 1 ? 0.5 : k / (mk.staysails - 1);
const hi = [aftM.x, aftM.base + aftM.T * (0.55 + 0.38 * t)];
const lo = [fwdM.x, fwdM.base + fwdM.T * (0.33 + 0.38 * t)];
const st = ropeMesh([[new THREE.Vector3(lo[0], lo[1], 0),
new THREE.Vector3(hi[0], hi[1], 0)]], 0.016 + B * 0.0005, ropeMat);
if (st) group.add(tag(st, 'stay'));
const at = f => [lo[0] + (hi[0] - lo[0]) * f, lo[1] + (hi[1] - lo[1]) * f];
const tack = at(0.08), head = at(0.90);
const clew = [hi[0] - (hi[0] - lo[0]) * 0.24, lo[1] + (hi[1] - lo[1]) * 0.10];
const ss = FURLED
? makeFurl(new THREE.Vector3(at(0.04)[0], at(0.04)[1], 0),
new THREE.Vector3(at(0.28)[0], at(0.28)[1], 0),
triA2(tack, head, clew), furlMat(mats), group, {})
: makeTriSail(tack, head, clew, group, 0.028, 0.96);
if (ss) ss.position.z = (k - (mk.staysails - 1) / 2) * B * 0.020;
}
});
if (S.bowsprit) {
const u0 = 0.02;
const x0 = -L / 2 + H.rake(u0);
const len = L * S.bowsprit;
const steeve = (S.steeve || 22) * Math.PI / 180;
const bg = new THREE.CylinderGeometry(B * 0.010, B * 0.020, len, 16);
const bm = new THREE.Mesh(bg, woodDark);
bm.rotation.z = Math.PI / 2 - steeve;
bm.position.set(x0 - Math.cos(steeve) * len / 2,
deckAt(u0) + Math.sin(steeve) * len / 2, 0);
group.add(tag(bm, 'bowsprit'));
const spritAt = f => [x0 - Math.cos(steeve) * len * f,
deckAt(u0) + Math.sin(steeve) * len * f];
if (S.headsails) {
const stemFoot = new THREE.Vector3(x0 + B * 0.03, 0.5, 0);
const bobSegs = [0.52, 0.93].map(f => {
const p = spritAt(f);
return [stemFoot, new THREE.Vector3(p[0], p[1] - B * 0.012, 0)];
});
const bob = ropeMesh(bobSegs, 0.030 + B * 0.0008, ropeMat);
if (bob) group.add(tag(bob, 'stay', 'Bobstay',
'The chain from the stem at the waterline that holds the bowsprit DOWN. Every '
+ 'headsail stay pulls up on the spar; this is the counter-pull that keeps it in '
+ 'the ship.'));
}
if (S.headsails && S.masts && S.masts.length) {
const fm = S.masts[0];
const steelMain = (S.lwl + S.beam) / 2;
const flower = mastLowerOf(fm, steelMain);
const fx = (fm.at - 0.5) * L + H.rake(fm.at);
const fbase = deckAt(fm.at);
const hounds = fbase + flower * 0.78;
const truck = fbase + (fm.topmast ? flower * 0.88 + flower * 0.52 * 0.80
: fm.rig === 'square' ? flower * 0.88 + flower * 0.60 * 0.72
: flower * 0.94);
const n = S.headsails;
for (let k = 0; k < n; k++) {
const t = n === 1 ? 0.6 : k / (n - 1);
const tack = spritAt(0.10 + 0.86 * t);
const head = [fx, hounds + (truck - hounds) * t];
const staySeg = [new THREE.Vector3(tack[0], tack[1], 0),
new THREE.Vector3(head[0], head[1], 0)];
const st = ropeMesh([staySeg], 0.020 + B * 0.0006, ropeMat);
if (st) group.add(tag(st, 'stay'));
const luff = Math.hypot(head[0] - tack[0], head[1] - tack[1]);
const clew = [tack[0] + (fx - tack[0]) * 0.52, tack[1] + luff * 0.13];
let hs;
if (FURLED) {
const luff2 = Math.hypot(head[0] - tack[0], head[1] - tack[1]);
const halfF = Math.min(0.14, (luff2 * 0.075) / len);
const fT = 0.10 + 0.86 * t;
const bA = spritAt(Math.max(0.02, fT - halfF)), bB = spritAt(Math.min(0.98, fT + halfF));
hs = makeFurl(new THREE.Vector3(bA[0], bA[1] + B * 0.012, 0),
new THREE.Vector3(bB[0], bB[1] + B * 0.012, 0),
triA2(tack, head, clew), furlMat(mats), group, {});
} else {
hs = makeTriSail(tack, head, clew, group, 0.020, 0.97);
}
if (hs) hs.position.z = (k - (n - 1) / 2) * B * 0.032;
}
}
}
S.__spars = spars; S.__mastTops = mastTops;
return sails;
}
const SAIL_VERT = SHADERS['SAIL_VERT.vert'];
const SAIL_FRAG = SHADERS['SAIL_FRAG.frag'];
function makeSail(x, yTop, width, height, mat, group, kind, trim) {
const NW = 28, NH = 20;
const pos = [], uvs = [], idx = [];
const roach = kind === 'square' ? 0.085 : 0.03;
const hollow = 0.022;
for (let i = 0; i <= NW; i++) {
const u = i / NW;
const arch = Math.sin(Math.PI * u);
const xw = (u - 0.5) * width * (1 - hollow * arch * 0.55);
const footY = -height + roach * height * arch;
for (let j = 0; j <= NH; j++) {
const v = j / NH;
const y = footY * v;
const chord = Math.pow(arch, 0.72) * (1.0 + 0.30 * Math.cos(Math.PI * (u - 0.40)));
const depth = width * 0.115 * (0.35 + 0.65 * Math.pow(v, 0.75));
let z = Math.max(0, chord) * depth;
const cx = Math.min(u, 1 - u) * 2.0;
const cy = v;
const corner = Math.exp(-cx * 3.4) * Math.exp(-Math.abs(cy - 1.0) * 2.2)
+ Math.exp(-cx * 3.4) * Math.exp(-cy * 3.0);
const crease = Math.sin((u * 9.0 + v * 5.0) * Math.PI) * corner * width * 0.016;
const roband = Math.sin(u * Math.PI * (NW / 3)) * Math.exp(-v * 14.0) * width * 0.008;
const slack = Math.sin(u * Math.PI * 5.0 + v * 7.0) * Math.pow(v, 2.0) * width * 0.010;
z += crease + roband + slack;
pos.push(xw, y, -z);
uvs.push(u, v);
}
}
const row = NH + 1;
for (let i = 0; i < NW; i++)
for (let j = 0; j < NH; j++) {
const a = i * row + j;
idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
g.setIndex(idx);
g.computeVertexNormals();
const sailMat = new THREE.ShaderMaterial({
vertexShader: SAIL_VERT, fragmentShader: SAIL_FRAG, side: THREE.DoubleSide,
uniforms: { uPanels: { value: Math.max(4, Math.round(width / 0.61)) },
uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
});
const m = new THREE.Mesh(g, sailMat);
m.position.set(x, yTop, 0);
if (kind === 'square') m.rotation.y = Math.PI / 2 + (trim || 0);
m.userData.kind = kind;
group.add(tag(m, 'sail'));
return m;
}
function makeTriSail(A, B, C, group, belly, leechPull) {
const N = 30, pos = [], uvs = [], idx = [];
const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
const head = Math.hypot(B[0] - A[0], B[1] - A[1]);
const pull = leechPull === undefined ? 1.0 : leechPull;
const ctrl = [A[0] + ((B[0] + C[0]) / 2 - A[0]) * pull,
A[1] + ((B[1] + C[1]) / 2 - A[1]) * pull];
const DEPTH = 1.15;
for (let i = 0; i <= N; i++) {
const sA = i / N;
const w = [(1 - sA) * (1 - sA) * B[0] + 2 * sA * (1 - sA) * ctrl[0] + sA * sA * C[0],
(1 - sA) * (1 - sA) * B[1] + 2 * sA * (1 - sA) * ctrl[1] + sA * sA * C[1]];
const Hd = w;
const span = Math.sin(Math.PI * Math.pow(sA, 0.62));
for (let j = 0; j <= N; j++) {
const t = 1 - j / N;
const P = lerp(A, Hd, t);
const draft = Math.sin(Math.PI * Math.pow(t, 0.72));
const sag = Math.pow(t, 2.2) * (0.55 + 0.80 * Math.pow(1 - sA, 1.4));
const prof = draft * 0.82 + sag * 0.40;
let z = prof * span * head * belly * DEPTH;
const slack = Math.min(1.0, belly / 0.055);
const dA = t, dB = Math.hypot(sA, 1 - t), dC = Math.hypot(1 - sA, 1 - t);
const corner = Math.exp(-dA * 3.0) + Math.exp(-dB * 3.4) + Math.exp(-dC * 3.4);
z += Math.sin((sA * 7.0 + t * 11.0) * Math.PI) * corner * head * 0.016 * slack;
z += Math.sin(t * Math.PI * 9.0) * Math.exp(-sA * 14.0) * head * 0.011 * slack;
z += Math.sin(t * Math.PI * 5.0) * Math.exp(-(1 - sA) * 10.0) * head * 0.009 * slack;
z += Math.sin(sA * 9.0 + t * 6.0) * span * Math.pow(t, 1.5) * head * 0.011 * slack;
pos.push(P[0], P[1], z);
uvs.push(sA, t);
}
}
const row = N + 1;
for (let i = 0; i < N; i++)
for (let j = 0; j < N; j++) {
const a = i * row + j;
idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
g.setIndex(idx);
g.computeVertexNormals();
const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
vertexShader: SAIL_VERT, fragmentShader: SAIL_FRAG, side: THREE.DoubleSide,
uniforms: { uPanels: { value: Math.max(4, Math.round(head / 0.61)) },
uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
}));
m.userData.kind = 'tri';
group.add(tag(m, 'sail'));
return m;
}
function makeQuadSail(A, B, C, D, group, belly) {
const N = 30, pos = [], uvs = [], idx = [];
const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
const chord = Math.hypot(D[0] - A[0], D[1] - A[1]);
const DEPTH = 1.15;
for (let i = 0; i <= N; i++) {
const su = i / N;
const foot = lerp(A, D, su), head = lerp(B, C, su);
for (let j = 0; j <= N; j++) {
const sv = j / N;
const P = lerp(foot, head, sv);
const draft = Math.sin(Math.PI * Math.pow(su, 0.72));
const vert = Math.sin(Math.PI * Math.pow(sv, 0.62));
const sag = Math.pow(su, 2.2) * (0.50 + 0.70 * Math.pow(sv, 1.4)) *
Math.sin(Math.PI * Math.pow(sv, 0.75));
let z = (draft * vert * 0.82 + sag * 0.40) * chord * belly * DEPTH;
const dA = Math.hypot(su, sv),         dB = Math.hypot(su, 1 - sv),
dC = Math.hypot(1 - su, 1 - sv), dD = Math.hypot(1 - su, sv);
const corner = Math.exp(-dA * 3.0) + Math.exp(-dB * 3.4) +
Math.exp(-dC * 3.4) + Math.exp(-dD * 3.0);
z += Math.sin((su * 7.0 + sv * 11.0) * Math.PI) * corner * chord * 0.014;
z += Math.sin(sv * Math.PI * 9.0) * Math.exp(-su * 14.0) * chord * 0.010;
z += Math.sin(su * Math.PI * 7.0) * Math.exp(-(1 - sv) * 12.0) * chord * 0.008;
z += Math.sin(su * Math.PI * 5.0) * Math.exp(-sv * 10.0) * chord * 0.008;
z += Math.sin(su * 9.0 + sv * 6.0) * draft * vert * chord * 0.010;
pos.push(P[0], P[1], z);
uvs.push(su, su);
}
}
const row = N + 1;
for (let i = 0; i < N; i++)
for (let j = 0; j < N; j++) {
const a = i * row + j;
idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
g.setIndex(idx);
g.computeVertexNormals();
const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
vertexShader: SAIL_VERT, fragmentShader: SAIL_FRAG, side: THREE.DoubleSide,
uniforms: { uPanels: { value: Math.max(4, Math.round(chord / 0.61)) },
uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
}));
m.userData.kind = 'quad';
group.add(tag(m, 'sail'));
return m;
}
function makeFurl(A, B, area, mat, group, o) {
o = o || {};
const axis = new THREE.Vector3().subVectors(B, A);
const len = axis.length();
if (len < 0.05) return null;
axis.multiplyScalar(1 / len);
const r0 = o.radius !== undefined ? o.radius
: Math.max(0.05, Math.sqrt((area * 0.055) / (Math.PI * Math.max(len, 0.1))));
const up = Math.abs(axis.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
const e1 = new THREE.Vector3().crossVectors(up, axis).normalize();
const e2 = new THREE.Vector3().crossVectors(axis, e1).normalize();
const NA = Math.max(24, Math.min(64, Math.round(len / 0.5))), NR = 12;
const nG = Math.max(3, Math.round(len / 2.0));
const pos = [], idx = [];
for (let i = 0; i <= NA; i++) {
const t = i / NA;
let R = r0 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.30);
if (o.bunt) R *= 0.72 + 0.68 * Math.exp(-Math.pow((t - 0.5) / 0.16, 2));
R *= 1 - 0.24 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * t * nG), 5.0);
const P = new THREE.Vector3().copy(A).addScaledVector(axis, t * len)
.addScaledVector(e2, -r0 * 0.30);
for (let j = 0; j <= NR; j++) {
const th = (j / NR) * Math.PI * 2;
const rr = R * (1 + 0.05 * Math.sin(th * 5 + t * 31) + 0.035 * Math.sin(th * 9 - t * 57));
pos.push(P.x + (e1.x * Math.cos(th) + e2.x * Math.sin(th)) * rr,
P.y + (e1.y * Math.cos(th) + e2.y * Math.sin(th)) * rr,
P.z + (e1.z * Math.cos(th) + e2.z * Math.sin(th)) * rr);
}
}
const row = NR + 1;
for (let i = 0; i < NA; i++)
for (let j = 0; j < NR; j++) {
const a = i * row + j;
idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx);
g.computeVertexNormals();
const m = new THREE.Mesh(g, mat);
m.userData.kind = 'furl';
group.add(tag(m, 'sail', o.name || 'Furled sail',
'The canvas stowed: rolled along the spar it is bent to and lashed with gaskets. The '
+ 'roll\'s girth is the sail\'s own area put back on the spar, which is why a course '
+ 'stows fat and a royal thin.'));
return m;
}
function furlMat(mats) {
return mats.furl || (mats.furl = new THREE.MeshStandardMaterial(
{ color: new THREE.Color(0.185, 0.163, 0.118), roughness: 0.94 }));
}
const PARTS = {
boat:     { stage: 6, name: "Ship's boat",
what: 'Stowed under curved davits on the boat deck. The davits curve because the '
+ 'boat must clear a side that flares or tumbles home on the way down. The '
+ 'NUMBER of them was set by Board of Trade rules scaling boats to tonnage '
+ 'rather than to people, unrevised as ships grew — which is how Titanic '
+ 'sailed legally with 20 boats for 2,224 aboard.' },
stowage:  { stage: 7, name: 'Stowed gear',
what: 'Gear lying on the floor of an open hull. A hull with no deck hides '
+ 'nothing: what she carries sits in the bottom, in sight over the rail.' },
vent:     { stage: 4, name: 'Cowl ventilator',
what: 'Turned into the wind to drive air below decks. Before mechanical '
+ 'ventilation, a coal-fired boiler room, a galley and several hundred people '
+ 'all breathed through fittings like these — which is why a period deck '
+ 'photograph looks crowded with enormous trumpets.' },
flightdeck: { stage: 4, name: 'Flight deck',
what: 'The one warship surface whose shape is set by something other than the sea. '
+ 'It overhangs the hull on both sides, and the landing strip is angled to port '
+ 'so a pilot who misses the wires flies off and goes round again.' },
island:   { stage: 4, name: 'The island',
what: 'Everything that cannot go under the flight deck: bridge, flying control, '
+ 'uptakes and radar. Small, and to starboard, because a going-around aircraft '
+ 'swings to port.' },
hangar:   { stage: 4, name: 'Hangar and gallery decks',
what: 'The space between the hull and the flight deck is built, not air: the '
+ 'hangar bays and the gallery decks around them. The deck-edge lifts open '
+ 'into it, which is why its sides are doors.' },
aircraft: { stage: 7, name: 'Deck park',
what: 'The air wing is what the ship is FOR, and some of it lives on deck: '
+ 'parked with wings folded, clear of the angled deck and the foul line, '
+ 'because a landing aircraft owns everything inside them.' },
screw:    { stage: 3, name: 'Screw',
what: 'Manganese bronze, below the waterline — the one golden thing on a grey '
+ 'hull, and what she has instead of everything the sailing fleet carried '
+ 'aloft. Visible only in dry dock, which is where the Shipwright builds her.' },
turret:   { stage: 4, name: 'Main battery',
what: 'The turret revolves on a barbette — an armoured cylinder running down to the '
+ 'magazine. Mounted on the centreline and superfiring, one raised behind '
+ 'another, so both can bear ahead.' },
aa:       { stage: 4, name: 'High-angle battery',
what: 'Twin high-angle guns on open mounts along the superstructure edge, barrels '
+ 'elevated the way no surface gun ever points. By the time this ship was laid '
+ 'down the fight she was built for had moved into the air, and her upperworks '
+ 'grew the guns to answer it.' },
catapult: { stage: 4, name: 'Aircraft catapult',
what: 'The quarterdeck is a runway eighteen metres long. A cordite charge throws a '
+ 'floatplane off the beam before the deck ends; the crane at the stern lifts '
+ 'it back aboard after it lands on the sea. Every battleship carried her own '
+ 'eyes — over the horizon is where the guns outrange the rangefinder.' },
floatplane: { stage: 7, name: 'Floatplane',
what: 'The ship\'s reconnaissance aircraft, on a single main float so it can land '
+ 'on the open sea and be craned back aboard. It spots the fall of shot beyond '
+ 'the horizon — the guns outrange the rangefinder, and until radar this was '
+ 'the only answer.' },
aaLight:  { stage: 4, name: 'Light anti-aircraft battery',
what: 'Triple 25 mm automatic guns in shielded mounts on raised bandstands along '
+ 'the amidships structure — the close-in layer under the heavy high-angle '
+ 'battery. She completed with eight of these mounts; by 1945 refits had '
+ 'multiplied the barrels sixfold, which is a fair record of how the war at '
+ 'sea actually went.' },
searchlight: { stage: 4, name: 'Searchlight platform',
what: 'Arc searchlights on platforms winged out from the tower. Night action was '
+ 'doctrine — the battle line trained to fight in the dark, and before radar '
+ 'the only way to lay guns at night was to hold the enemy in one of these '
+ 'beams. A metre and a half of carbon-arc mirror, worked from a director.' },
hatch:    { stage: 4, name: 'Stowage hatch',
what: 'On a big-gun ship the quarterdeck gear lives BELOW. The muzzle blast of the '
+ 'main battery would wreck an open boat or a parked aircraft, so boats and '
+ 'floatplanes stow under the deck and come up through these flush hatches to '
+ 'the crane — which is why her decks look so strangely empty for a ship with '
+ 'a crew of three thousand.' },
net:      { stage: 4, name: 'Torpedo net defence',
what: 'A moored battleship\'s answer to the locomotive torpedo: steel booms forty '
+ 'feet long, hinged along the side, swung out at anchor to hang a steel-wire '
+ 'net clear of the hull. At sea the booms stow in a row of diagonals against '
+ 'the plating with the net rolled on its shelf — the row is most of what '
+ 'dates a photograph of her. Fitted from completion; landed early in the '
+ 'war, when net-cutting pistols and the drag on speed had beaten the idea.' },
wing:     { stage: 6, name: 'Wing sail',
what: 'A rigid aerofoil in place of canvas. Nothing to sheet, nothing to reef and '
+ 'nothing to tear, which is what lets the vessel sail for months uncrewed. '
+ 'The tail vane behind it works as a weathervane: the wing pivots freely and '
+ 'the tail holds it at a set angle to the apparent wind, so it finds and '
+ 'keeps its own trim through every windshift.' },
solar:    { stage: 6, name: 'Solar array',
what: 'Power for the instruments, the computer and the satellite link. With wind '
+ 'for propulsion and sun for electricity, the endurance limit stops being '
+ 'fuel or food and becomes fouling and machinery.' },
sensor:   { stage: 6, name: 'Instrument mast',
what: 'Anemometer, satellite antenna and cameras above; echo sounders and a CTD '
+ 'below the waterline. The cargo of this vessel is data.' },
keel:     { stage: 0, name: 'Keel',
what: 'The backbone: one continuous timber from stem to sternpost, and the first '
+ 'thing laid down. Everything else is measured from it. Its depth below the '
+ 'planking also resists leeway — a hull without one slides sideways.' },
stempost: { stage: 0, name: 'Stem and sternpost',
what: 'The curved timbers rising from each end of the keel. The rake of the stem '
+ 'is one of the strongest signals of period and of where a ship was built.' },
frames:   { stage: 1, name: 'Frames',
what: 'The ribs. Each is a composite of several curved timbers scarfed together, '
+ 'raised on the keel at a fixed interval called the room and space. In a '
+ 'carvel ship these decide the shape BEFORE any plank is cut.' },
planking: { stage: 2, name: 'Planking',
what: 'The skin. In carvel work the planks meet edge to edge on the frames and the '
+ 'seams are caulked; in clinker work they overlap and are riveted to each '
+ 'other, and the shell is built first. Carvel can be scaled up; clinker cannot.' },
crossbeam:{ stage: 3, name: 'Crossbeams',
what: 'The lashed beams that tie the two hulls into one vessel. They are lashed, '
+ 'not fastened rigid, on purpose: the joint has to WORK in a seaway, and a '
+ 'rigid one would tear the hulls apart. Coir lashing can be re-served at sea; '
+ 'a broken iron bolt cannot.' },
platform: { stage: 3, name: 'Platform',
what: 'The deck between the hulls, and the only flat space aboard. It carries the '
+ 'crew, the water, the fire hearth, the breeding pigs and the seed stock — '
+ 'and it is what made the Pacific settleable rather than merely crossable.' },
container:{ stage: 3, name: 'Containers',
what: 'The cargo IS the architecture. Eight feet by eight foot six by twenty or '
+ 'forty, with corner castings identical everywhere on earth since 1968 — and '
+ 'that standard, not the ship, is the invention. The hull is a rack built to '
+ 'fit it. Loading a break-bulk freighter took a gang of dockers several days; '
+ 'the same tonnage in boxes takes hours.' },
superstructure: { stage: 3, name: 'Superstructure',
what: 'On a passenger ship the HULL is the smaller half. Titanic\'s boat deck stands '
+ '19 m above the waterline and the accommodation below it is most of what she '
+ 'is — 46,328 tons of which comparatively little is hold. Each tier steps in '
+ 'fore and aft, because the decks must taper as the hull does and because a '
+ 'stepped profile sheds the wind that a slab would catch.' },
bulb:     { stage: 2, name: 'Bulbous bow',
what: 'A bulb below the waterline forward, making its own wave a little ahead of '
+ 'the bow wave and out of phase with it, so the two partly cancel. Worth '
+ 'several per cent on a hull burning a hundred tonnes of fuel a day, which '
+ 'is the entire reason every ship of this kind built since the 1960s has one.' },
forecast: { stage: 3, name: 'Forecastle',
what: 'The raised deck right forward, carrying the windlass and the mooring gear. '
+ 'It also keeps green water off the forward container stack — which is the '
+ 'stack that goes overboard when one does.' },
lashing:  { stage: 7, name: 'Lashing bridge',
what: 'A steel gantry between bays that the deck stacks are lashed to. Without it '
+ 'the rods can only reach the second tier, and everything above that is held '
+ 'down by the corner castings and hope.' },
bridge:   { stage: 3, name: 'Accommodation and bridge',
what: 'Pushed to one end so nothing blocks the crane runs. The bridge has to see '
+ 'over a stack that may be twelve boxes high, which is why it stands where it '
+ 'does — and why the newest ships have moved it FORWARD of the boxes instead.' },
livery:   { stage: 7, name: 'Livery',
what: 'The operator’s name painted on the shell and the ship’s own name and port '
+ 'on the stern. On a ship whose hull is a fifteen-metre wall of plate, the '
+ 'lettering is the largest single mark on her — sized to be read from another '
+ 'ship, not from a quay.' },
paddle:   { stage: 4, name: 'Paddle wheels',
what: 'Great Eastern\'s are 17 m across — taller than a house — each wheel hanging '
+ 'thirty flat boards of 13 feet by 3 on its radial arms. She carried a 7.3 m '
+ 'SCREW as well, and that is why she is such an odd ship: paddles are '
+ 'efficient in smooth water and useless the moment a roll lifts one clear, a '
+ 'screw works in any sea but was unproven at that size, so Brunel fitted both '
+ 'and let them share the work.' },
paddlebox:{ stage: 4, name: 'Paddle box',
what: 'The housing over the top half of the wheel. A 17 m wheel turning at speed '
+ 'throws a continuous sheet of water and coal-dirty spray that would sweep '
+ 'the deck clean; the box contains it. Being the largest object on the '
+ 'ship\'s side, it is also the one owners decorated — fluted, vented, '
+ 'gilded, and lettered with the company\'s name.' },
oar:      { stage: 4, name: 'Oars',
what: 'The sail is for fair winds; the OARS are what she is. A trireme pulls 170 '
+ 'of them on three levels, and the whole hull exists to hold them at the '
+ 'right height above the water — which is why she is 37 m long, 3.8 m wide '
+ 'at the waterline, and carries almost no cargo. The outrigger takes the top '
+ 'bank outboard, and is why her famous 5.5 m beam is measured over the '
+ 'outriggers rather than over the planking.' },
spur:     { stage: 3, name: 'Spur',
what: 'The long beak at the bow, riding above the water. It is NOT a ram: the '
+ 'underwater bronze ram died with antiquity, and what replaced it is a '
+ 'boarding bridge — the spur crosses the enemy\'s rail, locks the two hulls '
+ 'together, and the soldiers go over it. Its length also fixes the gun\'s '
+ 'minimum range: the courser fires past it at a target the spur is about '
+ 'to touch.' },
apostis:  { stage: 3, name: 'Rowing frame',
what: 'The rectangular frame the oars actually pivot on, standing well outboard '
+ 'of the planking on crossbeams — the reason a galley\'s fighting beam is '
+ 'nearly two metres more than her hull\'s. The hull is a canoe; the frame '
+ 'is the engine room bolted on top of it. Between the benches runs the '
+ 'corsia, the raised central gangway, the only way fore and aft.' },
bench:    { stage: 4, name: 'Rowing bench',
what: 'One bench, one great oar, three to four men — rowing a scaloccio, standing '
+ 'into the stroke and falling back. The older way, alla sensile, put three '
+ 'separate oars on each bench with one skilled man on each; a scaloccio '
+ 'needs only the inboard man to be a rower, and the rest to pull. That is '
+ 'why every fleet converted to it, and why chained men could row it.' },
gundeck:  { stage: 5, name: 'Gun deck',
what: 'The deck built across the rowing frame, over the rowers\' heads — the '
+ 'reason the galleass exists. Guns stand on it and fire outboard over the '
+ 'oars, the broadside a war galley structurally cannot mount because her '
+ 'sides at gun height are full of oars. At Lepanto the fire from six of '
+ 'these decks broke up the Ottoman line\'s order before the fleets '
+ 'touched, which is why the galleasses were stationed ahead of the line.' },
sangjang: { stage: 5, name: 'Sangjang wall',
what: 'The heavy plank belt between the hull\'s gunwale and the fighting deck '
+ 'above it. The rowers on the oar deck work behind it, under cover; a '
+ 'boarding party that has climbed the two metres of hull side finds another '
+ 'storey of timber standing over the rail. The old drawings paint a dragon '
+ 'along this belt and cut a row of small ports just under the deck line.' },
maku:     { stage: 5, name: 'Maku',
what: 'The cloth band hung from the fighting deck\'s overhung edge over the '
+ 'oar band — white under a dark scalloped hem in the Busan scroll, which '
+ 'dresses hull after hull of the anchored fleet in it and hangs the '
+ 'atakebune\'s in the same cut, inverted, under sail. Dress and '
+ 'concealment both: an arquebusier behind it cannot be counted.' },
sama:     { stage: 5, name: 'Sama',
what: 'A loophole cut in the shield wall, one of a row down each side — the '
+ 'arquebus and the bow fire from behind the planking. On a hull too light '
+ 'to bear cannon recoil, these slots are the broadside.' },
tower:    { stage: 5, name: 'Commander\'s tower',
what: 'The janggundae, the roofed pavilion standing on the fighting deck '
+ 'amidships. The commander fights the ship from it, in sight of his own '
+ 'crew and the rest of the squadron — a Joseon fleet was signalled by '
+ 'flag and drum from these towers. Every surviving drawing of a '
+ 'panokseon shows it standing clear above the bulwarks.' },
arrumbada: { stage: 3, name: 'Bow platform',
what: 'The fighting platform over the bow, spanning the full width of the rowing '
+ 'frame. The guns stand on it and the boarding party masses on it, over the '
+ 'heel of the spur. All of a galley\'s violence is concentrated on these few '
+ 'square metres of deck; everything abaft it is propulsion.' },
fortress: { stage: 3, name: 'Bow fortress',
what: 'The round fighting deck the Arsenal built over the bow in the 1570–71 '
+ 'conversions, its parapet sweeping from one rail around the stem to the '
+ 'other. The heavy battery stands on it and fires ahead and on both bows '
+ 'through ports in the curve — an arc of fire, not a single axis, which is '
+ 'why an Ottoman line could not row past without losing its dressing.' },
canopy:   { stage: 7, name: 'Stern awning',
what: 'Canvas arched over the poop, where the captain and the officers live — '
+ 'the only cover aboard a ship whose entire deck is benches. Struck before '
+ 'action, like the rig.' },
anchor:   { stage: 3, name: 'Bower anchor',
what: 'A 74\'s best bower weighs about 3.7 tonnes, and half the machinery in her '
+ 'bow exists to move it: cathead, fish davit, capstan, and a 24-inch cable too '
+ 'thick to pass round the capstan at all — it has to be nipped to a lighter '
+ 'messenger line. The STOCK is set at right angles to the arms, and that 90° '
+ 'is the whole invention: it rolls the anchor over until a fluke bites. '
+ 'Without it the thing lies flat and drags.' },
grapnel:  { stage: 3, name: 'Grapnel anchor',
what: 'The Indian Ocean\'s own ground tackle, and the one anchor in this fleet '
+ 'lifted from its own ship\'s wreck: a wooden shank carrying four wrought-'
+ 'iron arms that cross at two levels, with a heavy cast-iron bell between '
+ 'them for weight — the Belitung ship\'s anchor, drawn to the excavation '
+ 'drawing\'s own scale. A grapnel needs no stock: whichever way it lands, '
+ 'an arm points down and bites. It lives loose on deck at the bow, a coir '
+ 'cable bent to the shank head, and the crew works it by direct pull.' },
stoneAnchor: { stage: 3, name: 'Stone anchor',
what: 'The Chinese sea-ship\'s ground tackle in an eyewitness\'s one sentence '
+ '(Xu Jing, 1124): below the bow winch hangs the anchor-stone, clamped on '
+ 'its two sides by two wooden hooks, on a rattan cable thick as a rafter '
+ 'and five hundred feet long. The form drawn here is that sentence\'s own '
+ 'object as excavation recovered it: two shank timbers pegged together '
+ 'with cross battens, each sweeping out to a curved fluke point, and the '
+ 'stone wedged crosswise through the gap between them — its ends standing '
+ 'out both sides as the stock, so a fluke always points down to bite. One '
+ 'such anchor came up off the Korean coast still jointed, stone and arm '
+ 'together, from the sea road Chinese traders sailed to Goryeo. There is '
+ 'no iron in it anywhere; the wood rotted off every other stone found.' },
ironAnchors: { stage: 3, name: 'Four-claw anchor',
what: 'The Chinese sea anchor as the Tiangong kaiwu forges it: four claws '
+ 'made first, then joined section by section to a wrought-iron shank — '
+ 'the largest single thing under furnace and hammer, welded by crews '
+ 'on a timber stage with chain slings. No stock and no wood anywhere: '
+ 'whichever way it lands, a claw points down and bites. A state grain '
+ 'ship carried five or six; the mightiest, the "house-guarding anchor" '
+ 'of about 500 catties, went down only in the last extremity, and the '
+ 'crew\'s name for its cable — ben shen, the ship\'s own life — says '
+ 'what hung on it. The cables themselves are split green bamboo, '
+ 'boiled and twisted.' },
woodAnchor: { stage: 3, name: 'Wooden anchor and its stone',
what: 'The Korean tradition\'s ground tackle: an oak shank — the 닻채 — with '
+ 'hook-arms spread from it like branches, usually four, two hung to a '
+ 'side; a crossbar fixed through the head where the cable bends on; and '
+ 'a long rectangular stone lashed across the frame, because oak alone '
+ 'will not sink — the stone carries the anchor down and drives the hooks '
+ 'into the tidal mud. The West Sea keeps the record of the type: 154 '
+ 'anchor stones lifted off Taean and Incheon since 2008, rope grooves '
+ 'still cut in them, the largest over two metres and 300 to 700 kg, and '
+ 'the wooden anchors found beside them carbon-dated from the second '
+ 'century BC into this ship\'s own dynasty. Her navy\'s album draws the '
+ 'anchor on the warship plate beside mast, oars and rudder.' },
yotsumeAnchor: { stage: 3, name: 'Yotsume-ikari',
what: 'The wasen tradition\'s ground tackle: the four-claw forged iron anchor, '
+ 'named for its making — a square iron bar split at the foot and the '
+ 'quarters bent outward into claws, an elongated ring at the head carrying '
+ 'the free ring the cable bends to. No stock and no wood: whichever way it '
+ 'lands, a claw points down and bites. Iron on a warship is the era\'s own '
+ 'pattern — from the early 15th century the warships and special ships '
+ 'carried the four-claw iron anchor alongside the wood-stone anchors that '
+ 'stayed the ordinary ships\' mainstay into the mid-1600s — and the Busan '
+ 'scroll of 1593 draws the anchored barrier fleet riding to its cables, '
+ 'the anchor itself at the line\'s end, claws recurved. Forty-nine survive '
+ 'in one measured corpus, 1.05 to 3.03 m; none of them a Sengoku '
+ 'warship\'s. The corpus measures its members: the arms are flat forged '
+ 'bars, about a thirtieth of the length wide at the root and thinning to '
+ 'a blade at the point, and its one weighed anchor — 2.8 m, raised off '
+ 'Kozushima, 330-340 kg on a forklift — sets the class\'s weight. The '
+ 'drawn iron weighs that record: the shank, the one member the corpus '
+ 'table leaves unmeasured, is solved to carry the recorded mass.' },
cathead:  { stage: 3, name: 'Cathead',
what: 'The beam standing out over the bow that the anchor hangs from. Weighing '
+ 'is a tackle problem: the ring must be caught, lifted clear of the water '
+ 'and swung outboard of the planking, and the cathead is the crane that '
+ 'does it — its sheaves take the cat tackle, and the anchor rides fished '
+ 'along the topside from its tip until the next letting-go.' },
head:     { stage: 4, name: 'Head and beakhead',
what: 'A working platform carried out beyond the stem, and the rails that sweep up '
+ 'to it are STRUCTURE, not ornament: they stay the bowsprit sideways against '
+ "the forestays' pull, which is the load that would otherwise tear it out of "
+ 'the ship. The gammoning lashes it down to the stem. And the crew\'s heads '
+ 'were out here, over the water, which is where the word comes from.' },
transom:  { stage: 2, name: 'Transom',
what: 'The square tuck closing the hull across the stern above the waterline. It '
+ 'flares as it rises, so a square-sterned ship is widest at her taffrail — '
+ 'which is also what gives her the flat canvas for a stern that could be '
+ 'recognised at a mile.' },
bowtransom: { stage: 2, name: 'Bow transom',
what: 'A bulkhead-built hull does not come to a stem. The forwardmost bulkhead is '
+ 'the bow, planked straight across — the flat face that makes a junk '
+ 'unmistakable from ahead, and the reason the build needs no keel-and-stem '
+ 'backbone to hang the planking on.' },
sterntransom: { stage: 2, name: 'Stern transom',
what: 'The aftermost bulkhead, planked across and carried up with the sheer. The '
+ 'rudder hangs just abaft it on the centreline, working in the open notch '
+ 'the two quarters leave between them.' },
poop:     { stage: 4, name: 'Aft castle',
what: 'The tiered quarters over the after deck. On the treasure ships this was '
+ 'the embassy itself: envoys, clerks, pilots and the shrine to Tianfei, the '
+ 'sailors\' goddess, all lived here above the helm.' },
sheet:    { stage: 6, name: 'Sheets',
what: 'The rope at each clew — a sail\'s lower corner — that trims it to the '
+ 'wind. Each square sail sheets to the arms of the yard below it (the '
+ 'sheave in the yardarm is what the arm is for); the course sheets aft to '
+ 'the rail. A battened lug carries a sheetlet to every batten end, gathered '
+ 'through blocks to a single fall — the whole sail worked by a few hands on '
+ 'deck, which is why no junk ever needed men aloft.' },
halyard:  { stage: 6, name: 'Halyard',
what: 'The line that hoists the yard, and it must go over a masthead to do it: '
+ 'the tie leads up from the yard\'s slings, through the sheave in the head '
+ 'of the yard\'s own mast section — Falconer\'s 1780 dictionary keeps a '
+ 'word just for the topmast\'s, the encornail, "the sheave-hole in a '
+ 'top-mast-head, through which the top-sail-tye is reeved" — and only then '
+ 'falls to the rail. On a junk it is the one heavy lift aboard: sail, '
+ 'battens, boom and yard all rise on it over the sheave in the pole\'s own '
+ 'head, and reefing is simply letting it go.' },
jeers:    { stage: 6, name: 'Jeers',
what: 'The heaviest purchase on the ship. Falconer, 1780: "an assemblage of '
+ 'tackles, by which the lower yards of a ship are hoisted up along the '
+ 'mast" — in a ship of war "two strong tackles, each of which has two '
+ 'blocks, viz. one fastened to the lower-mast-head, and the other to the '
+ 'middle of the yard", the falls leading down to the deck. The course '
+ 'yard, tons of timber, hangs in these; the drawing leads both falls down '
+ 'their own side where Falconer crosses them behind the mast.' },
sheave:   { stage: 4, name: 'Masthead sheave',
what: 'The Chinese masthead: no top, no block, no fitting at all — the sheave '
+ 'turns in a slot cut through the head of the pole itself, on a pin '
+ 'through both cheeks. Needham records junk halyards running through '
+ '"sheave pins passing through both masts and securing double halyard '
+ 'sheaves", so two slots are drawn. Sizes are DERIVED from the pole; no '
+ 'measured junk masthead was in reach of this model.' },
sternlight:{ stage: 3, name: 'Stern lights',
what: 'The great windows across the transom, and the only real glazing in the ship. '
+ 'Everywhere else light comes through a gunport or a grating, so the captain\'s '
+ 'cabin is the one place aboard you can read without a candle. Each tier is a '
+ 'pierced sash wall: lights nearly shoulder to shoulder, each a grid of small '
+ 'panes set behind its glazing bars — crown glass cast no metre sheet. Grid, '
+ 'pier and pitch are record fields; on the 74 they are read off the RMG Bellona '
+ 'model (SLR0338) at ~55 px/m, and the record says which ships carry a class '
+ 'default instead.' },
taffrail: { stage: 3, name: 'Taffrail',
what: 'The rail crowning the stern, carried up over the sheer and rising toward the '
+ 'centre with the poop\'s own camber. It is the highest timber of the hull '
+ 'proper, and on a man-of-war it carried the carved work and the stern '
+ 'lanterns by which one ship knew another at night.' },
gallery:  { stage: 3, name: 'Quarter galleries',
what: 'Cantilevered out at the after corners, where the hull has narrowed to nothing '
+ 'and there is no side left to put a window in. Light and air for the officers '
+ '— and the ship\'s only private necessary house.' },
funnel:   { stage: 3, name: 'Funnel',
what: 'Not decoration and not arbitrary: its HEIGHT is set by the draught a boiler '
+ 'needs, because the taller the stack the harder it pulls air through the '
+ 'grate. That is why early steamers carry a funnel out of all proportion to '
+ 'the ship, and why forced draught later let them shrink. The rig alongside '
+ 'is not vestigial either — until compound engines cut coal consumption '
+ 'threefold, sail is what got you home when the bunkers ran dry.' },
cluster:  { stage: 3, name: 'Mast and stack cluster',
what: 'The exhaust rank, signal mast and communications radomes, packed amidships '
+ 'in one sculpted cluster — a modern motor vessel’s whole topside identity '
+ 'in one place, as much her silhouette as four buff funnels were Titanic’s. '
+ 'No published drawing gives these heights: every figure is DERIVED from the '
+ 'photograph on this card, scaled against the recorded length. Derived '
+ 'figures, labelled as such.' },
gun:      { stage: 3, name: 'Great guns',
what: 'A 32-pounder is three metres long and weighs 2.7 tonnes; run out, a third '
+ 'of the barrel stands outside the ship. They cannot be aimed — only the ship '
+ 'can — which is the whole reason fleets learned to fight in line. And they '
+ 'are why she fights on one tack at a time: the lee ports must stay shut or '
+ 'she floods through them.' },
stay:     { stage: 5, name: 'Stays and backstays',
what: 'Standing rigging in the fore-and-aft plane. Stays run FORWARD from each '
+ 'masthead and stop it falling aft; backstays run aft and take the forward '
+ 'push of a following wind. The foremast stays lead to the bowsprit — which '
+ 'is the entire reason a bowsprit exists.' },
brace:    { stage: 6, name: 'Braces',
what: 'Running rigging from each yard ARM, leading aft. Hauling one brace and '
+ 'easing the other swings the yard round to meet the wind at an angle. They '
+ 'are the reason a square-rigger can sail anything other than dead downwind.' },
rail:     { stage: 3, name: 'Rail',
what: 'The capping timber round the deck edge, following the sheer. It finishes '
+ 'the tops of the frames and is what everyone aboard actually holds on to.' },
terrace:  { stage: 3, name: 'Stern terraces',
what: 'The stepped after decks and their solid bulwarks, descending from the main '
+ 'deck to a low platform at the transom. Each step is a deck you can stand '
+ 'on, walled by a faired steel parapet whose cap line is what the broadside '
+ 'photograph actually shows.' },
stair:    { stage: 3, name: 'Terrace stair',
what: 'Twin flights against the riser at each break, closed risers in the yacht '
+ 'manner, tops flush with the deck above. They stand behind the next '
+ 'bulwark aft, which is why a broadside cannot see them.' },
waterway: { stage: 3, name: 'Waterway',
what: 'The margin plank at the deck edge, thicker than the deck it borders and '
+ 'standing a little proud of it. The gutter its inboard edge makes against '
+ 'the deck carries shipped water aft along the bulwark to the scuppers, '
+ 'which is what names it. It is tarred with the seams, so it reads as a '
+ 'dark band framing the deck — on a teak-decked liner as much as on a '
+ 'seventy-four.' },
grating:  { stage: 3, name: 'Grating',
what: 'A lattice hatch cover. It has to be open, because the only ventilation for '
+ 'the decks below comes through it — and it has to be strong enough to walk '
+ 'on and to take a sea aboard. In heavy weather they were battened down under '
+ 'tarpaulin, which is where the phrase comes from.' },
capstan:  { stage: 3, name: 'Capstan',
what: 'A vertical winch turned by bars, drawn from the record: whelp timbers run '
+ 'from drumhead to deck, flaring like buttresses to enlarge the sweep, with '
+ 'chocks wedged between and two iron pawls on deck to stop the recoil '
+ '(Falconer 1769). The bars ship through square holes at breast height — '
+ 'the whole machine is sized to the men who walk it round. Hulls whose '
+ 'traditions used other gear carry no capstan.' },
windlass: { stage: 3, name: 'Windlass',
what: 'A horizontal winch: an eight-square barrel turned by handspikes '
+ 'thrust into holes bored through its body, the crew rising together on '
+ 'the bars to a song. On the cog it lies athwartships at the aftcastle, '
+ 'forward of the helm — the reconstructed Bremen ship carries it there. '
+ 'On the Chinese seagoing tradition it lies at the bow between the two '
+ 'mooring posts: Xu Jing watched one worked in 1124, winding a rattan '
+ 'cable as thick as a rafter, and the Tiangong Kaiwu of 1637 names the '
+ 'machine that breaks out the iron anchors. The Korean horong is the '
+ 'same machine at the bow with its own working: two long bars pass '
+ 'clean through the drum, crossed, and four men heave at the four '
+ 'ends — the album of the Joseon navy drew it around 1797, and the '
+ 'rebuilt grain ship of 2011 works it still. On the Roman grain run '
+ 'the machines stand in a gear list: Lucian\'s visitor, walking the '
+ 'giant Isis at Piraeus around AD 165, counts the anchors and their '
+ 'winding machines among the ship\'s wonders. Drawn only where the '
+ 'record attests one.' },
castle:   { stage: 4, name: 'Aftcastle',
what: 'The raised fighting and command deck over the stern — an open platform '
+ 'on posts, not a walled house. The Bremen cog\'s is preserved to its '
+ 'highest rail: a castle deck with a windlass in its middle and a capstan '
+ 'on its top, and beneath it the helmsman stood between the two long side '
+ 'cabins, behind the windlass, unable to see his own sail — which is why '
+ 'the skipper moved up to the castle deck and command separated from '
+ 'steering. Drawn only where the record attests one; this hull has no '
+ 'forecastle because the wreck has none.' },
boat:     { stage: 3, name: "Ship's boat",
what: 'Stowed on the beams amidships. It is the tender, the anchor-laying boat, '
+ 'the water carrier — and the only thing between the crew and the sea if the '
+ 'ship is lost. Bligh sailed one 6,700 km after the Bounty mutiny.' },
top:      { stage: 4, name: 'Top',
what: 'The platform at the head of the lower mast, carried on trestletrees and '
+ 'crosstrees. It spreads the topmast shrouds — giving the upper mast a wide '
+ 'enough base to be stayed at all — and doubles as a fighting platform for '
+ 'musketeers. Nelson was shot by a man in one. It is a medieval invention: '
+ 'no classical ship carried one, and the earliest among these types are on '
+ 'the 13th-century seals of the cog towns. Its form is dated: round and '
+ 'walled like a basket while it was a fighting position, and from about 1710 '
+ 'a planked platform, rounded forward and square aft, with the lubber\'s hole '
+ 'cut round the masthead.' },
corbis:   { stage: 4, name: 'The corbis',
what: 'The basket hung at the mainmast head — the thing that named the ship. '
+ 'Festus: cargo ships are called corbitae "because baskets used to be hung '
+ 'at the top of their mast as their sign". Roman merchantmen carried no '
+ 'masthead platform at all; the lookout stood at the bow, and the masthead '
+ 'carried the halyard sheaves, the lifts — and, on this type, its own name '
+ 'in wicker.' },
karchesion:{ stage: 4, name: 'Karchesion',
what: 'The masthead itself, by its ancient name. Asclepiades of Myrlea, quoted '
+ 'by Athenaeus: the foot of the mast is the heel, the middle is the neck, '
+ 'and the head is the karchesion — the same word as a two-handled drinking '
+ 'cup, which is roughly its shape. It is the block the yard hoists to: a '
+ 'sheave turns on a pin through the head, the halyard runs over it and '
+ 'falls to the rail. No ancient masthead survives, so the block\'s form and '
+ 'size here are DERIVED from the pole; the reconstruction Olympias carries '
+ 'the same gear in the same place.' },
deadeye:  { stage: 5, name: 'Deadeyes',
what: 'Blocks with three holes, in pairs, rove with lanyards. They are how a shroud '
+ 'is SET UP: hemp stretches, so standing rigging needs constant re-tensioning, '
+ 'and a deadeye pair is a hand-powered turnbuckle you can adjust at sea.' },
channel:  { stage: 5, name: 'Channels',
what: 'Shelves bolted to the outside of the hull at deck level. They exist to push '
+ 'the shrouds OUTBOARD, widening the angle at which the standing rigging '
+ 'pulls down on the masthead. A wider base means a mast that can carry more '
+ 'sail without being wrung out of the ship.' },
wale:     { stage: 2, name: 'Wales',
what: 'Thickened longitudinal strakes running the length of the hull — the girders '
+ 'that stop a long wooden ship from hogging, drooping at the ends under its '
+ 'own buoyancy distribution.' },
deck:     { stage: 3, name: 'Deck',
what: 'Not just a floor: the deck ties the two sides of the hull together against '
+ 'the sea trying to squeeze them in, and it is the platform the guns stand on. '
+ 'Its camber sheds water to the sides.' },
logtop:   { stage: 1, name: 'The log, before hollowing',
what: 'The felled trunk\'s upper face. The hollowing stage removes it — burning '
+ 'and adze work take everything inside the rim, and what remains of this '
+ 'surface afterwards is the rim itself.' },
quarterRudder: { stage: 3, name: 'Quarter rudders',
what: 'A steering oar grown into a fitting: one over each quarter, its loom '
+ 'working against a through-beam at the rail, its blade standing down '
+ 'beside the run. The whole ancient Mediterranean steered this way — a '
+ 'pair, handled together by one helmsman — and the sewn ships of the '
+ 'Indian Ocean lashed theirs on, having no iron to hang a pintle with. '
+ 'It is not a lesser rudder: it balances about its own shaft, so it turns '
+ 'light in the hand, and it lifts clear in shoal water. What replaced it '
+ 'was cheaper to build heavy — a sternpost hinge grows with the ship.' },
rudder:   { stage: 3, name: 'Rudder',
what: 'Hung on pintles down the sternpost. The stern-hung rudder reached northern '
+ 'Europe about 1200 and replaced the steering oar; it is what let ships grow '
+ 'beyond the size one person could steer with an oar over the quarter. China '
+ 'was there a millennium earlier: the Han pottery boat models of the first '
+ 'century show an axial rudder at the transom, slung on tackles in a trunk '
+ 'rather than hung on pintles, so it could be raised in shoal water — and on '
+ 'the great junks lowered below the bottom, where it is also the leeway board '
+ 'of a hull that has no deep keel to grip the water.' },
mast:     { stage: 4, name: 'Mast',
what: 'Built in stepped sections — lower mast, topmast, topgallant — each fidded '
+ 'alongside the head of the one below through the doubling, so it can be sent '
+ 'down in heavy weather. Steel 1794: the main mast is half the sum of the '
+ 'lower deck length and the extreme breadth.' },
woolding: { stage: 4, name: 'Wooldings',
what: 'Rope bands hooped round the lower mast. No single tree yields a mast most '
+ 'of a metre through, so a big ship\'s lower mast is MADE — several timbers '
+ 'coaked together — and the assembly must be bound or it works apart at sea. '
+ 'Each woolding is about a dozen turns of tarred rope hove taut and nailed, '
+ 'pinched between two thin wooden hoops. Iron hoops replaced them from about '
+ '1800.' },
mastband: { stage: 4, name: 'Mast hoops',
what: 'Iron hoops shrunk onto a made wooden mast — driven on hot, they grip as '
+ 'they cool. They do the work rope wooldings did before about 1800: binding '
+ 'the separate timbers of a built-up lower mast into one spar.' },
cheek:    { stage: 4, name: 'Cheeks',
what: 'Timber knees bolted to either side of the masthead at the hounds. Their '
+ 'upper faces carry the trestletrees, and everything above — crosstrees, top '
+ 'platform, the fidded heel of the topmast, the men stationed aloft — bears '
+ 'on those two faces.' },
bowsprit: { stage: 4, name: 'Bowsprit',
what: 'A mast lying almost flat, projecting over the bow. It is what the forestays '
+ 'lead to — without it the foremast has nothing pulling it forward, and the '
+ 'whole rig falls aft.' },
shroud:   { stage: 5, name: 'Shrouds',
what: 'Standing rigging: fixed ropes from the masthead down to the channels on the '
+ "hull's side, taking the sideways pull of the sails. Tarred against rot — "
+ 'reddish-brown, not black; black tar is petroleum and a century too late.' },
ratline:  { stage: 5, name: 'Ratlines',
what: 'Light lines seized across the shrouds to make a ladder aloft. Steel 1794 '
+ 'gives the spacing outright: thirteen inches, one comfortable rung.' },
lift:     { stage: 6, name: 'Lifts',
what: 'The ropes from each yardarm up to the masthead that carry the yard\'s '
+ 'weight and hold it square. With the sail furled they are all that holds '
+ 'the arms up, and they are why every sail plan ever drawn shows a V of '
+ 'rope over each tier of canvas.' },
tack:     { stage: 6, name: 'Tacks',
what: 'The rope that hauls a course\'s clew forward and down. On the wind the '
+ 'weather tack is hauled hard to the bow: it gives the lowest sail a taut '
+ 'leading edge, which is what turns loose canvas into something that can '
+ 'drive a ship across the wind rather than only before it.' },
yard:     { stage: 6, name: 'Yard',
what: 'The spar a square sail hangs from, slung across the mast and braced round to '
+ 'trim the sail to the wind. Steel 1794: the main yard is seven eighths of the '
+ 'main mast, and as thick as its own length asks — seven tenths of an inch to '
+ 'every yard of length at the slings for a course yard, lighter rates aloft. '
+ 'It is octagonal amidships and tapers to two fifths at the arms.' },
sail:     { stage: 7, name: 'Sail',
what: 'Flax canvas, sewn from bolts twenty-four inches wide — the standard enacted '
+ 'in 1746 — so the cloths themselves scale the sail for you. Square sails drive '
+ 'a ship downwind; fore-and-aft sails let it work up to windward.' },
deckhouse: { stage: 5, name: 'Deckhouse',
what: 'On a big wooden ship the hold is cargo, all of it, so the crew lives on '
+ 'deck: galley, cabins and the engine room stand in white houses on the '
+ 'weather deck. The forward house holds the donkey boiler and hoisting '
+ 'engine — the machinery that let thirteen hands work a six-master\'s gear.' },
helm:     { stage: 5, name: 'The wheel',
what: 'Right aft, in the open, where the helmsman can watch the leeches and the '
+ 'sea coming up astern. On the great schooners it drove the rudder through a '
+ 'screw gear under the wheel box — one man could hold a ship of nearly four '
+ 'thousand tons.' },
};
function tag(o, key, extra, what) {
if (!o) return o;
const P = PARTS[key];
o.userData.part = { key, stage: P.stage, name: extra || P.name, what: what || P.what };
return o;
}
function buildFittings(S, group, mats) {
const timberShip = !(S.build === 'iron' || S.build === 'steel');
const laidDeck = deckCovering(S).mode === 1;
const openHull = deckCovering(S).mode === 0;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const deckAtU = u => H.sheer(u);
const halfAtU = u => Math.abs(surfacePoint(S, H, u, 1)[2]);
const wood = mats.woodDark, pale = mats.woodPale || mats.woodDark;
if (!openHull) {
const pos = [], idx = [];
const NU = 90; let base = 0;
const T = S.decks ? linerHouse(S) : null;
const t0 = T && T.tiers.length ? T.tiers[0] : null;
const open = (u) => {
if (H.stepTop(u) !== null) return false;
if (!t0 || u < t0.uA || u > t0.uB) return true;
return halfAtU(u) - t0.half(u) > B * 0.045;
};
for (const sgn of [-1, 1]) {
let run = [];
const flush = () => {
if (run.length < 2) { run = []; return; }
const start = base;
for (const q of run) {
const r = S.capM ? S.capM / 1.6 : B * 0.016;
pos.push(q.x, q.y, sgn * (q.hb - r), q.x, q.y + r * 1.6, sgn * (q.hb - r),
q.x, q.y + r * 1.6, sgn * (q.hb + r * 0.3), q.x, q.y, sgn * (q.hb + r * 0.3));
}
for (let i = 0; i < run.length - 1; i++) {
const a = start + i * 4, b = a + 4;
for (let f = 0; f < 4; f++) {
const c = (f + 1) % 4;
idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
}
}
base += run.length * 4;
run = [];
};
for (let i = 0; i <= NU; i++) {
const u = 0.035 + (i / NU) * 0.93;
if (!open(u)) { flush(); continue; }
run.push({ x: (u - 0.5) * L + H.rake(u), y: deckAtU(u), hb: halfAtU(u) });
}
flush();
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
const railMat = (S.build === 'steel' || S.build === 'iron')
? new THREE.MeshStandardMaterial({ color: 0x4a5057, roughness: 0.58, metalness: 0.42 })
: pale;
group.add(tag(new THREE.Mesh(g, railMat), 'rail'));
}
if (deckCovering(S).mode === 1) {
const pos = [], idx = [];
const NU = 90; let vbase = 0;
const w = Math.min(Math.max(B * 0.02, 0.15), 0.45);
for (const sgn of [-1, 1]) {
for (let i = 0; i <= NU; i++) {
const u = 0.035 + (i / NU) * 0.93;
const e = surfacePoint(S, H, u, 1);
const x = e[0], fb = e[1], hb = e[2];
const wu = Math.min(w, hb * 0.55);
const yT = fb + 0.034, yB = fb - 0.012;
pos.push(x, yT, sgn * (hb - wu), x, yT, sgn * hb,
x, yB, sgn * hb,       x, yB, sgn * (hb - wu));
}
for (let i = 0; i < NU; i++) {
const a = vbase + i * 4, b = a + 4;
for (let f = 0; f < 4; f++) {
const c = (f + 1) % 4;
idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
}
}
vbase += (NU + 1) * 4;
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
const wwMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 0.88 });
group.add(tag(new THREE.Mesh(g, wwMat), 'waterway'));
}
const hatchVoid = new THREE.MeshStandardMaterial({ color: 0x0b0906, roughness: 1.0 });
const quadInto = (acc, p1, p2, p3, p4) => {
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
const accMesh = (acc, mat) => {
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nrm, 3));
g.setIndex(acc.idx);
return new THREE.Mesh(g, mat);
};
const gratingAt = (u, w, l) => {
const gg = new THREE.Group();
const y = deckAtU(u) + B * 0.004;
const x = (u - 0.5) * L;
const t = B * 0.013;
const BAR = 0.06, PITCH = 0.135;
const depth = Math.min(0.075, t + B * 0.004);
const yT = y + t, yB = yT - depth;
const nx = Math.max(2, Math.round((l - BAR) / PITCH));
const nz = Math.max(2, Math.round((w - BAR) / PITCH));
const px = (l - BAR) / nx, pz = (w - BAR) / nz;
const X0 = x - l / 2, Z0 = -w / 2;
const A = { pos: [], nrm: [], idx: [] };
const topQ = (x0, x1, z0, z1, yy) =>
quadInto(A, [x0, yy, z0], [x0, yy, z1], [x1, yy, z1], [x1, yy, z0]);
for (let j = 0; j <= nz; j++) {
const za = Z0 + j * pz;
topQ(X0, X0 + l, za, za + BAR, yT);
}
for (let j = 0; j < nz; j++) {
const za = Z0 + j * pz + BAR, zb = Z0 + (j + 1) * pz;
for (let k = 0; k <= nx; k++) {
const xa = X0 + k * px;
topQ(xa, xa + BAR, za, zb, yT);
}
}
for (let j = 0; j < nz; j++) {
const za = Z0 + j * pz + BAR, zb = Z0 + (j + 1) * pz;
for (let k = 0; k < nx; k++) {
const xa = X0 + k * px + BAR, xb = X0 + (k + 1) * px;
quadInto(A, [xa, yB, za], [xa, yT, za], [xa, yT, zb], [xa, yB, zb]);
quadInto(A, [xb, yB, zb], [xb, yT, zb], [xb, yT, za], [xb, yB, za]);
quadInto(A, [xb, yB, za], [xb, yT, za], [xa, yT, za], [xa, yB, za]);
quadInto(A, [xa, yB, zb], [xa, yT, zb], [xb, yT, zb], [xb, yB, zb]);
}
}
gg.add(accMesh(A, wood));
const C = { pos: [], nrm: [], idx: [] };
const sect = [[0.45 * t, y - 0.4 * t],
[0.45 * t, y + 1.2 * t],
[0.15 * t, y + 1.5 * t],
[-0.45 * t, y + 1.5 * t],
[-0.45 * t, y + 0.7 * t]];
const hx = l / 2, hz = w / 2;
for (let s = 0; s < sect.length - 1; s++) {
const [d1, h1] = sect[s], [d2, h2] = sect[s + 1];
for (const sg of [1, -1]) {
{
const A1 = [x + sg * (hx + d1), h1, -(hz + d1)],
B1 = [x + sg * (hx + d1), h1, +(hz + d1)],
A2 = [x + sg * (hx + d2), h2, -(hz + d2)],
B2 = [x + sg * (hx + d2), h2, +(hz + d2)];
if (sg > 0) quadInto(C, B1, A1, A2, B2);
else        quadInto(C, A1, B1, B2, A2);
}
{
const A1 = [x - (hx + d1), h1, sg * (hz + d1)],
B1 = [x + (hx + d1), h1, sg * (hz + d1)],
A2 = [x - (hx + d2), h2, sg * (hz + d2)],
B2 = [x + (hx + d2), h2, sg * (hz + d2)];
if (sg > 0) quadInto(C, A1, B1, B2, A2);
else        quadInto(C, B1, A1, A2, B2);
}
}
}
gg.add(accMesh(C, pale));
const V = { pos: [], nrm: [], idx: [] };
quadInto(V, [X0, yB + 0.004, Z0], [X0, yB + 0.004, Z0 + w],
[X0 + l, yB + 0.004, Z0 + w], [X0 + l, yB + 0.004, Z0]);
gg.add(accMesh(V, hatchVoid));
return tag(gg, 'grating');
};
if (timberShip && laidDeck) [0.30, 0.50, 0.70].forEach(u => {
const w = halfAtU(u) * 0.85;
group.add(gratingAt(u, w, L * 0.055));
});
if (S.capstan) {
const u = 0.62, y = deckAtU(u);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const D = S.capstan.drumDiaM || clampN(B * 0.11, 0.95, 1.55);
const H = clampN(0.86 * D, 1.15, 1.35);
const headT = 0.30 * H, whelpH = H - headT;
const nW = S.capstan.whelps || 6, nB = S.capstan.bars || 6;
const body = S.capstan.paint === 'red'
? (mats.capRed || (mats.capRed = new THREE.MeshStandardMaterial(
{ color: 0x7a3226, roughness: 0.72 })))
: wood;
const iron = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
{ color: 0x2a2d31, roughness: 0.52, metalness: 0.55 }));
const cg = new THREE.Group();
const core = new THREE.Mesh(new THREE.CylinderGeometry(D * 0.16, D * 0.16, whelpH, 12), body);
core.name = 'cap-core'; core.position.y = y + whelpH / 2; cg.add(core);
const wp = new THREE.Shape();
wp.moveTo(D * 0.13, 0); wp.lineTo(D * 0.50, 0);
wp.lineTo(D * 0.455, whelpH * 0.38); wp.lineTo(D * 0.41, whelpH);
wp.lineTo(D * 0.13, whelpH); wp.closePath();
const wGeo = new THREE.ExtrudeGeometry(wp, { depth: D * 0.15, bevelEnabled: false });
wGeo.translate(0, 0, -D * 0.075);
for (let i = 0; i < nW; i++) {
const w = new THREE.Mesh(wGeo, body);
w.name = 'cap-whelp'; w.position.y = y; w.rotation.y = -(i / nW) * Math.PI * 2;
cg.add(w);
}
const ch = new THREE.Shape();
ch.moveTo(D * 0.16, 0); ch.lineTo(D * 0.40, 0);
ch.lineTo(D * 0.37, whelpH * 0.14); ch.lineTo(D * 0.16, whelpH * 0.14); ch.closePath();
const chGeo = new THREE.ExtrudeGeometry(ch, { depth: D * 0.13, bevelEnabled: false });
chGeo.translate(0, 0, -D * 0.065);
for (let i = 0; i < nW; i++) {
const a = ((i + 0.5) / nW) * Math.PI * 2;
for (const yy of [y + whelpH * 0.02, y + whelpH * 0.82]) {
const c = new THREE.Mesh(chGeo, body);
c.name = 'cap-chock'; c.position.y = yy; c.rotation.y = -a;
cg.add(c);
}
}
const head = new THREE.Mesh(
new THREE.CylinderGeometry(D * 0.50, D * 0.46, headT, 20), body);
head.name = 'cap-head'; head.position.y = y + whelpH + headT / 2; cg.add(head);
const barY = y + H - headT / 2;
for (let i = 0; i < nB; i++) {
const a = (i / nB) * Math.PI * 2;
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(D * 0.020, D * 0.026, D * 2.1, 8), pale);
bar.name = 'cap-bar';
bar.rotation.z = Math.PI / 2; bar.rotation.y = a;
bar.position.set(Math.cos(a) * D * 1.35, barY, Math.sin(a) * D * 1.35);
cg.add(bar);
}
for (const sgn of [1, -1]) {
const p = new THREE.Mesh(new THREE.BoxGeometry(D * 0.22, D * 0.05, D * 0.06), iron);
p.name = 'cap-pawl';
const a = (0.5 / nW) * Math.PI * 2 + (sgn > 0 ? 0 : Math.PI);
p.position.set(Math.cos(a) * D * 0.52, y + D * 0.025, Math.sin(a) * D * 0.52);
p.rotation.y = -a;
cg.add(p);
}
cg.position.x = (u - 0.5) * L;
group.add(tag(cg, 'capstan'));
}
if (S.windlass) {
const u = S.windlass.atU || 0.5, y = deckAtU(u);
const clampW = (v, a, b) => Math.max(a, Math.min(b, v));
const len = S.windlass.barrelLenM || B * 0.55;
const D = S.windlass.barrelDiaM || 0.5;
const axisY = y + clampW(0.30 + D / 2, 0.45, 0.90);
const wg = new THREE.Group();
const bGeo = new THREE.CylinderGeometry(D / 2, D / 2, len, 8, 1).toNonIndexed();
bGeo.computeVertexNormals();
const bar = new THREE.Mesh(bGeo, wood);
bar.name = 'win-barrel'; bar.rotation.x = Math.PI / 2;
bar.position.y = axisY; wg.add(bar);
const stH = S.windlass.postHM || (axisY - y) + D * 0.42;
for (const sg of [1, -1]) {
const st = new THREE.Mesh(new THREE.BoxGeometry(0.30, stH, 0.26), wood);
st.name = 'win-standard';
st.position.set(0, y + stH / 2, sg * (len / 2 + 0.13));
wg.add(st);
const j = new THREE.Mesh(
new THREE.CylinderGeometry(D * 0.18, D * 0.18, 0.32, 10), wood);
j.name = 'win-journal'; j.rotation.x = Math.PI / 2;
j.position.set(0, axisY, sg * (len / 2 + 0.10));
wg.add(j);
}
if (S.windlass.throughBars) {
for (const [zf, ang] of [[-0.20, 1.15], [0.28, -1.15]]) {
const spL = 2.0;
const sp = new THREE.Mesh(
new THREE.CylinderGeometry(0.028, 0.028, spL, 8), pale);
sp.name = 'win-bar';
sp.rotation.z = ang;
sp.position.set(0, axisY, zf * len);
wg.add(sp);
}
} else {
const underCastle = S.castle && u > S.castle.fromU && u < S.castle.toU;
const restAngs = underCastle ? [[-0.22, 1.18], [0.30, -1.18]]
: [[-0.22, 0.55], [0.30, -0.35]];
for (const [zf, ang] of restAngs) {
const spL = 1.7, seat = 0.22;
const sp = new THREE.Mesh(
new THREE.CylinderGeometry(0.022, 0.030, spL, 8), pale);
sp.name = 'win-spike';
sp.rotation.z = ang;
const dx = -Math.sin(ang), dy = Math.cos(ang);
sp.position.set(dx * (spL / 2 - seat), axisY + dy * (spL / 2 - seat), zf * len);
wg.add(sp);
}
}
wg.position.x = (u - 0.5) * L;
group.add(tag(wg, 'windlass'));
}
if (S.castle && S.castle.fromU != null && S.castle.toU != null) {
const cF = S.castle.fromU, cT = S.castle.toU;
const dH = S.castle.deckHM || 1.95, rH = S.castle.railHM || 1.0;
const cg = new THREE.Group();
const xAt = u => (u - 0.5) * L + H.rake(u);
const wAt = u => halfAtU(u) - 0.06;
const dY = u => deckAtU(u) + dH;
const NS = Math.max(6, Math.round((cT - cF) * L / 0.8));
const base = new THREE.Color(deckCovering(S).col).multiplyScalar(0.88);
const wMax = wAt(cF), plankW = 0.30;
let pi = 0;
for (let zc = -wMax + plankW / 2; zc < wMax; zc += plankW, pi++) {
const dp = [], di = []; let n = 0;
for (let k = 0; k <= NS; k++) {
const u = cF + (cT - cF) * k / NS, w = wAt(u);
const z0 = Math.max(-w, Math.min(w, zc - plankW / 2));
const z1 = Math.max(-w, Math.min(w, zc + plankW / 2 - 0.012));
dp.push(xAt(u), dY(u), z0, xAt(u), dY(u), z1); n++;
}
for (let k = 0; k + 1 < n; k++) { const a = k * 2, b = a + 2; di.push(a, b, a + 1, a + 1, b, b + 1); }
const dg = new THREE.BufferGeometry();
dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
dg.setIndex(di); dg.computeVertexNormals();
const tone = base.clone().multiplyScalar(0.90 + 0.18 * ((pi * 7) % 5) / 4);
const pm = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({
color: tone, roughness: 0.86, side: THREE.DoubleSide }));
pm.name = 'castle-deck'; cg.add(pm);
}
const NB = Math.max(4, Math.round((cT - cF) * L / 1.2));
for (let k = 0; k <= NB; k++) {
const u = cF + (cT - cF) * k / NB;
const bm = new THREE.Mesh(
new THREE.BoxGeometry(0.20, 0.20, 2 * (halfAtU(u) + 0.18)), wood);
bm.name = 'castle-beam';
bm.position.set(xAt(u), dY(u) - 0.11, 0); cg.add(bm);
for (const sg of [1, -1]) {
const pH = dY(u) - 0.20 - deckAtU(u);
const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, pH, 0.18), wood);
post.name = 'castle-post';
post.position.set(xAt(u), deckAtU(u) + pH / 2, sg * (wAt(u) - 0.16)); cg.add(post);
}
}
for (const sg of [1, -1]) {
for (const frac of [0.5, 1.0]) {
const rp = [], ri = [];
for (let k = 0; k <= NS; k++) {
const u = cF + (cT - cF) * k / NS, z = sg * (wAt(u) - 0.08);
rp.push(xAt(u), dY(u) + rH * frac - 0.045, z, xAt(u), dY(u) + rH * frac + 0.045, z);
}
for (let k = 0; k < NS; k++) { const a = k * 2, b = a + 2; ri.push(a, b, a + 1, a + 1, b, b + 1); }
const rg = new THREE.BufferGeometry();
rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
rg.setIndex(ri); rg.computeVertexNormals();
const rm = new THREE.Mesh(rg, wood); rm.material = wood.clone();
rm.material.side = THREE.DoubleSide; rm.name = 'castle-rail'; cg.add(rm);
}
const NR = Math.max(6, Math.round((cT - cF) * L / 0.7));
for (let k = 0; k <= NR; k++) {
const u = cF + (cT - cF) * k / NR;
const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, rH, 0.07), wood);
st.name = 'castle-stanchion';
st.position.set(xAt(u), dY(u) + rH / 2, sg * (wAt(u) - 0.08)); cg.add(st);
}
}
for (const [u, nm] of [[cF + 0.004, 'castle-breastrail'], [cT - 0.004, 'castle-taffrail']]) {
const rl = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 2 * (wAt(u) - 0.08)), wood);
rl.name = nm; rl.position.set(xAt(u), dY(u) + rH, 0); cg.add(rl);
const NC = Math.max(3, Math.round(2 * wAt(u) / 0.7));
for (let k = 0; k <= NC; k++) {
const z = -(wAt(u) - 0.08) + k * (2 * (wAt(u) - 0.08)) / NC;
const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, rH, 0.07), wood);
st.name = 'castle-stanchion';
st.position.set(xAt(u), dY(u) + rH / 2, z); cg.add(st);
}
}
const winU = S.windlass ? (S.windlass.atU || 0.5) : cF;
const cbF = Math.min(cT - 0.03, Math.max(cF + 0.02, winU + 0.025));
const cbT = cT - 0.01, zIn = 0.75;
for (const sg of [1, -1]) {
const cp = [], ci = []; const NW = Math.max(3, Math.round((cbT - cbF) * L / 0.8));
for (let k = 0; k <= NW; k++) {
const u = cbF + (cbT - cbF) * k / NW;
cp.push(xAt(u), deckAtU(u) - 0.02, sg * zIn, xAt(u), dY(u) - 0.02, sg * zIn);
}
for (let k = 0; k < NW; k++) { const a = k * 2, b = a + 2; ci.push(a, b, a + 1, a + 1, b, b + 1); }
const cw = new THREE.BufferGeometry();
cw.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
cw.setIndex(ci); cw.computeVertexNormals();
const cm = new THREE.Mesh(cw, wood); cm.material = wood.clone();
cm.material.side = THREE.DoubleSide; cm.name = 'castle-cabin'; cg.add(cm);
for (const [u, nm] of [[cbF, 'castle-cabin-fwd'], [cbT, 'castle-cabin-aft']]) {
const wOut = wAt(u) - 0.02, hW = dY(u) - deckAtU(u);
const ew = new THREE.Mesh(new THREE.BoxGeometry(0.05, hW - 0.04, wOut - zIn), wood);
ew.name = nm;
ew.position.set(xAt(u), deckAtU(u) + hW / 2 - 0.02, sg * (zIn + (wOut - zIn) / 2));
cg.add(ew);
}
const door = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 0.04),
new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.95 }));
door.name = 'castle-door';
door.position.set(xAt(cbF + 0.012), deckAtU(cbF + 0.012) + 0.7, sg * (zIn - 0.005));
cg.add(door);
}
group.add(tag(cg, 'castle'));
}
if (S.grapnel) {
const gp = S.grapnel;
const u = gp.atU || 0.10, yD = deckAtU(u);
const span = gp.spanM || 1.72;
const bellD = gp.bellDiaM || 0.55, bellH = gp.bellHM || 0.13;
const shankL = gp.shankM || 1.8;
const armD = gp.armDiaM || 0.10, shD = gp.shankDiaM || 0.16;
const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
{ color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
const g = new THREE.Group();
for (const [lvl, dirZ] of [[1, false], [-1, true]]) {
const yA = lvl * (bellH / 2 + armD * 0.55);
for (const sg of [1, -1]) {
const arm = new THREE.Mesh(
new THREE.CylinderGeometry(armD * 0.40, armD * 0.50, span / 2, 10), ironG);
arm.name = 'grap-arm';
if (dirZ) { arm.rotation.x = Math.PI / 2; arm.position.set(0, yA, sg * span / 4); }
else      { arm.rotation.z = Math.PI / 2; arm.position.set(sg * span / 4, yA, 0); }
g.add(arm);
const tip = new THREE.Mesh(new THREE.SphereGeometry(armD * 0.62, 10, 8), ironG);
tip.name = 'grap-tip';
tip.position.set(dirZ ? 0 : sg * span / 2, yA, dirZ ? sg * span / 2 : 0);
g.add(tip);
}
}
const bell = new THREE.Mesh(
new THREE.CylinderGeometry(shD * 0.62, bellD / 2, bellH, 16), ironG);
bell.name = 'grap-bell';
g.add(bell);
const yLo = -(bellH / 2 + armD + 0.12);
const sh = new THREE.Mesh(
new THREE.CylinderGeometry(shD * 0.44, shD * 0.50, shankL, 12), wood);
sh.name = 'grap-shank';
sh.position.y = yLo + shankL / 2;
g.add(sh);
const hC = span / 2 * 0.707 + armD * 0.62;
const tilt = Math.asin(Math.max(0, Math.min(0.6, (hC - shD / 2) / shankL)));
const q = new THREE.Quaternion()
.setFromAxisAngle(new THREE.Vector3(0, 1, 0), gp.yaw != null ? gp.yaw : 0.30);
q.multiply(new THREE.Quaternion()
.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(Math.PI / 2 + tilt)));
q.multiply(new THREE.Quaternion()
.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4));
g.quaternion.copy(q);
g.position.set((u - 0.5) * L, yD, gp.offZ || 0);
g.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(g);
g.position.y += (yD - bb.min.y);
g.updateMatrixWorld(true);
const headW = new THREE.Vector3(0, yLo + shankL, 0).applyMatrix4(g.matrixWorld);
const coilC = new THREE.Vector3(headW.x + 0.10, 0, headW.z - 0.45);
coilC.y = deckAtU(coilC.x / L + 0.5) + 0.055;
const coil = new THREE.Mesh(
new THREE.TorusGeometry(0.26, 0.055, 8, 20), mats.ropeSolid || wood);
coil.name = 'grap-coil';
coil.rotation.x = Math.PI / 2;
coil.position.copy(coilC);
const mid = headW.clone().lerp(coilC, 0.5);
mid.y = deckAtU(mid.x / L + 0.5) + 0.06;
const cable = ropeMesh([[headW, mid], [mid, coilC.clone().add(new THREE.Vector3(0, 0.03, 0))]],
0.028, mats.ropeSolid || wood);
const ag = new THREE.Group();
ag.add(g); ag.add(coil);
if (cable) { cable.name = 'grap-cable'; ag.add(cable); }
group.add(tag(ag, 'grapnel'));
}
if (S.stoneAnchor) {
const sa = S.stoneAnchor;
const u = (sa.atU != null) ? sa.atU : -0.02;
const armL = sa.armLenM || 1.49, armW = sa.armWM || 0.16,
armD = sa.armDM || 0.15;
const hornM = sa.hornM || 0.81, hornOff = sa.hornOffM || 0.285;
const seatM = sa.seatM || 1.15;
const batt = sa.battenM || [0.58, 0.90, 1.37];
const stoneL = sa.stoneLenM || 1.09, stoneW = sa.stoneWM || 0.29,
stoneT = sa.stoneTM || 0.10;
const cabR = (sa.cableDiaM || 0.10) / 2;
const offZ = sa.offZ || 0;
const stoneM = mats.anchStone || (mats.anchStone = new THREE.MeshStandardMaterial(
{ color: 0x7d7a70, roughness: 0.92, metalness: 0.02 }));
const g = new THREE.Group();
const bodyL = armL - hornM;
for (const sg of [1, -1]) {
const zc = sg * (stoneT + armD) / 2;
const body = new THREE.Mesh(new THREE.BoxGeometry(armW, bodyL, armD), wood);
body.name = 'st-cheek';
body.position.set(0, -(hornM + bodyL / 2), zc);
g.add(body);
const NSEG = 5, tipL = 0.12;
const zAt = t => zc + sg * hornOff * t * t;
const yAt = t => -hornM * (1 - t);
const dAt = t => armD * (1 - t) + 0.07 * t;
const tCap = 1 - tipL / hornM;
for (let i = 0; i < NSEG; i++) {
const t0 = tCap * i / NSEG, t1 = tCap * (i + 1) / NSEG;
const dy = yAt(t1) - yAt(t0), dz = zAt(t1) - zAt(t0);
const seg = new THREE.Mesh(
new THREE.BoxGeometry(armW, Math.hypot(dy, dz) + 0.02,
dAt((t0 + t1) / 2)), wood);
seg.name = 'st-cheek';
seg.rotation.x = Math.atan2(dz, dy);
seg.position.set(0, (yAt(t0) + yAt(t1)) / 2, (zAt(t0) + zAt(t1)) / 2);
g.add(seg);
}
const dyT = yAt(1) - yAt(tCap), dzT = zAt(1) - zAt(tCap);
const tip = new THREE.Mesh(
new THREE.ConeGeometry(dAt(tCap) * 0.5, tipL, 10), wood);
tip.name = 'st-tip';
tip.rotation.x = Math.atan2(dzT, dyT);
tip.position.set(0, (yAt(tCap) + yAt(1)) / 2, (zAt(tCap) + zAt(1)) / 2);
g.add(tip);
}
const stone = new THREE.Mesh(
new THREE.BoxGeometry(stoneL, stoneW, stoneT), stoneM);
stone.name = 'st-stone';
stone.position.set(0, -seatM, 0);
g.add(stone);
for (const by of batt) {
const b = new THREE.Mesh(
new THREE.BoxGeometry(0.06, 0.055, stoneT + 2 * armD + 0.04), wood);
b.name = 'st-batten';
b.position.set(0, -by, 0);
g.add(b);
}
const uH = Math.max(0, u), uT = Math.max(0, u - (armL + 0.6) / L);
const slope = (uH - uT) > 1e-6
? (deckAtU(uH) - deckAtU(uT)) / ((uH - uT) * L) : 0;
g.rotation.z = -Math.PI / 2 + Math.atan(slope);
g.rotation.x = 0.87;
const yD = deckAtU(uH);
g.position.set((u - 0.5) * L, yD, offZ);
g.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(g);
g.position.y += (yD - bb.min.y);
g.updateMatrixWorld(true);
const yBend = -(batt.length > 1 ? batt[1] : 0.90);
const wrap = new THREE.Mesh(
new THREE.TorusGeometry(0.055 + cabR, cabR, 8, 20), mats.ropeSolid || wood);
wrap.name = 'st-cable';
wrap.position.set(0, yBend, 0);
g.add(wrap);
g.updateMatrixWorld(true);
const bend = new THREE.Vector3(0, yBend + 0.09, 0).applyMatrix4(g.matrixWorld);
const wl = S.windlass;
const uW = wl ? (wl.atU || 0.10) : 0.10;
const barrelPt = new THREE.Vector3(
(uW - 0.5) * L - (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2,
deckAtU(uW) + 0.30 + (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2, offZ * 0.4);
const cable = ropeMesh([[bend, barrelPt]], cabR, mats.ropeSolid || wood);
const ag = new THREE.Group();
ag.add(g);
if (cable) { cable.name = 'st-cable'; ag.add(cable); }
group.add(tag(ag, 'stoneAnchor'));
}
if (S.ironAnchors) {
const ia = S.ironAnchors;
const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
{ color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
const ag = new THREE.Group();
const wl = S.windlass;
const uW = wl ? (wl.atU || 0.10) : 0.10;
const wLen = wl ? (wl.barrelLenM || B * 0.55) : B * 0.55;
const wDia = wl ? (wl.barrelDiaM || 0.5) : 0.5;
const IA_P = {
crownR: 0.0391,
ringR: 0.0216, ringT: 0.0095,
claw: [[0.000, 0.035], [0.140, 0.060],
[0.260, 0.135], [0.315, 0.180]],
tip: [0.339, 0.201],
shTop: 0.01932, shBot: 0.0253,
clawS: [0.01838, 0.01838, 0.01562, 0.01103]
};
const iaFrus = (r0, r1, h) => Math.PI * h / 3 * (r0 * r0 + r0 * r1 + r1 * r1);
const iaVolF = (t) => {
let v = 4 / 3 * Math.PI * Math.pow(IA_P.crownR, 3)
+ 2 * Math.PI * Math.PI * IA_P.ringR * IA_P.ringT * IA_P.ringT;
const ringC = 1 - IA_P.crownR - IA_P.ringR - IA_P.ringT;
v += iaFrus(IA_P.shBot * t, IA_P.shTop * t, ringC - IA_P.ringR);
let c = 0;
for (let s = 0; s + 1 < IA_P.claw.length; s++)
c += iaFrus(IA_P.clawS[s] * t, IA_P.clawS[s + 1] * t,
Math.hypot(IA_P.claw[s + 1][0] - IA_P.claw[s][0],
IA_P.claw[s + 1][1] - IA_P.claw[s][1]));
const last = IA_P.claw[IA_P.claw.length - 1];
c += Math.PI * Math.pow(IA_P.clawS[3] * t, 2)
* Math.hypot(IA_P.tip[0] - last[0], IA_P.tip[1] - last[1]) / 3;
return v + 4 * c;
};
const makeAnchor = (fullL, kg) => {
const need = kg / (7850 * fullL * fullL * fullL);
let lo = 0.2, hi = 6;
for (let i = 0; i < 48; i++) {
const mid = (lo + hi) / 2;
if (iaVolF(mid) < need) lo = mid; else hi = mid;
}
const t = (lo + hi) / 2;
const g2 = new THREE.Group();
g2.name = 'ia-grp';
const crown = new THREE.Mesh(
new THREE.SphereGeometry(fullL * IA_P.crownR, 10, 8), ironG);
crown.name = 'ia-crown'; g2.add(crown);
const ringC = fullL * (1 - IA_P.crownR - IA_P.ringR - IA_P.ringT);
const shankL = ringC - fullL * IA_P.ringR;
const sh = new THREE.Mesh(
new THREE.CylinderGeometry(fullL * IA_P.shTop * t, fullL * IA_P.shBot * t,
shankL, 10), ironG);
sh.name = 'ia-shank'; sh.position.y = shankL / 2; g2.add(sh);
const ring = new THREE.Mesh(
new THREE.TorusGeometry(fullL * IA_P.ringR, fullL * IA_P.ringT, 8, 18), ironG);
ring.name = 'ia-ring'; ring.position.y = ringC; g2.add(ring);
for (let k = 0; k < 4; k++) {
const cg2 = new THREE.Group();
cg2.rotation.y = k * Math.PI / 2;
const P = IA_P.claw.map((p, pi) =>
[p[0] * fullL, p[1] * fullL, IA_P.clawS[pi] * t * fullL]);
for (let s = 0; s + 1 < P.length; s++) {
const [x0, y0, r0] = P[s], [x1, y1, r1] = P[s + 1];
const dl = Math.hypot(x1 - x0, y1 - y0);
const seg = new THREE.Mesh(
new THREE.CylinderGeometry(r1, r0, dl, 8), ironG);
seg.name = 'ia-claw';
seg.rotation.z = -Math.atan2(x1 - x0, y1 - y0);
seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
cg2.add(seg);
}
const [xb, yb, rb] = P[P.length - 1];
const xt = IA_P.tip[0] * fullL, yt = IA_P.tip[1] * fullL;
const ch = Math.hypot(xt - xb, yt - yb);
const tip = new THREE.Mesh(new THREE.ConeGeometry(rb, ch, 8), ironG);
tip.name = 'ia-tip';
tip.rotation.z = -Math.atan2(xt - xb, yt - yb);
tip.position.set((xb + xt) / 2, (yb + yt) / 2, 0);
cg2.add(tip);
g2.add(cg2);
}
return g2;
};
const stow = (g2, fullL, u, offZ, surf) => {
const sAt = surf || deckAtU;
const uA = Math.min(1, u + fullL / L);
const s = (uA - u) > 1e-6
? (sAt(uA) - sAt(u)) / ((uA - u) * L) : 0;
const q = new THREE.Quaternion()
.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ia.yaw || 0);
q.multiply(new THREE.Quaternion().setFromAxisAngle(
new THREE.Vector3(0, 0, 1), -Math.PI / 2 + Math.atan(s)));
q.multiply(new THREE.Quaternion().setFromAxisAngle(
new THREE.Vector3(0, 1, 0), Math.PI / 4));
g2.quaternion.copy(q);
const yD = sAt(u);
g2.position.set((u - 0.5) * L, yD, offZ);
g2.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(g2);
g2.position.y += (yD - bb.min.y);
g2.updateMatrixWorld(true);
return new THREE.Vector3(
0, fullL * (1 - IA_P.crownR - IA_P.ringR - IA_P.ringT), 0)
.applyMatrix4(g2.matrixWorld);
};
const cableTo = (from, to, r) => {
const mid = from.clone().lerp(to, 0.5);
mid.y = deckAtU(Math.max(0, Math.min(1, mid.x / L + 0.5))) + 0.07;
const c = ropeMesh([[from, mid], [mid, to]], r, mats.ropeSolid || wood);
if (c) { c.name = 'ia-cable'; ag.add(c); }
};
if (ia.sheetLenM !== 0) {
const fL = ia.sheetLenM || 1.86;
const g2 = makeAnchor(fL, ia.sheetKg || 295);
const ringP = stow(g2, fL, ia.sheetAtU != null ? ia.sheetAtU : 0.030, 0);
ag.add(g2);
const barrelPt = new THREE.Vector3(
(uW - 0.5) * L - wLen * 0.18, deckAtU(uW) + 0.30 + wDia / 2, 0);
cableTo(ringP, barrelPt, 0.035);
}
if (ia.bowerLenM !== 0) {
const fL = ia.bowerLenM || 1.57;
for (const sg of [1, -1]) {
const g2 = makeAnchor(fL, ia.bowerKg || 177);
const ringP = stow(g2, fL, ia.pairAtU != null ? ia.pairAtU : 0.060,
sg * (ia.pairOffZ || 2.4));
ag.add(g2);
const postPt = new THREE.Vector3(
(uW - 0.5) * L, deckAtU(uW) + 0.55, sg * (wLen / 2 + 0.13));
cableTo(ringP, postPt, 0.030);
}
}
if (ia.sternAtU != null && ia.sternLenM !== 0 && S.poop && S.poop.length === 3) {
const fL = ia.sternLenM || 1.57;
const dhP = B * 0.115;
const poopTop = u => deckAtU(u) + dhP * (S.poop[2] + 0.02);
const ropeM = mats.ropeSolid || wood;
for (const sg of [1, -1]) {
const g2 = makeAnchor(fL, ia.sternKg || 177);
const zA = sg * (ia.sternOffZ || 2.4);
const ringP = stow(g2, fL, ia.sternAtU, zA, poopTop);
ag.add(g2);
const cu = ia.sternAtU + (fL + 0.55) / L;
const coilC = new THREE.Vector3(
(cu - 0.5) * L, poopTop(cu) + 0.055, sg * ((ia.sternOffZ || 2.4) - 0.55));
const segs = [];
for (let k = 0; k < 10; k++) {
const a1 = (k / 10) * 2 * Math.PI, a2 = ((k + 1) / 10) * 2 * Math.PI;
for (const [rr, dy] of [[0.33, 0], [0.24, 0.055]])
segs.push([new THREE.Vector3(coilC.x + Math.cos(a1) * rr, coilC.y + dy,
coilC.z + Math.sin(a1) * rr),
new THREE.Vector3(coilC.x + Math.cos(a2) * rr, coilC.y + dy,
coilC.z + Math.sin(a2) * rr)]);
}
const coil = ropeMesh(segs, 0.030, ropeM);
if (coil) { coil.name = 'ia-coil'; ag.add(coil); }
const cEnd = new THREE.Vector3(coilC.x, coilC.y + 0.09, coilC.z + sg * 0.33);
const cMid = ringP.clone().lerp(cEnd, 0.5);
cMid.y = Math.max(cEnd.y + 0.05, ringP.y - 0.18);
const cb = ropeMesh([[ringP, cMid], [cMid, cEnd]], 0.030, ropeM);
if (cb) { cb.name = 'ia-cable'; ag.add(cb); }
}
}
group.add(tag(ag, 'ironAnchors'));
}
if (S.woodAnchor) {
const wa = S.woodAnchor;
const u = (wa.atU != null) ? wa.atU : 0.05;
const stoneL = wa.stoneLenM || 2.0;
const stoneH = wa.stoneWM || (wa.stoneSecM || 0.30) * 0.83;
const stoneT = wa.stoneTM || wa.stoneSecM || 0.30;
const ST_RATIO = 0.51;
const shankL = wa.shankM || stoneL / ST_RATIO, shD = 0.20;
const ARM_LEN = 1.90, ARM_SEC = 0.196;
const armD = wa.armSecM || ARM_SEC;
const nArms = wa.arms || 2;
const cabR = (wa.cableDiaM || 0.10) / 2;
const offZ = wa.offZ || 0;
const stoneM = mats.anchStone || (mats.anchStone = new THREE.MeshStandardMaterial(
{ color: 0x7d7a70, roughness: 0.92, metalness: 0.02 }));
const ropeM = mats.ropeSolid || wood;
const ai = new THREE.Group();
const shank = new THREE.Mesh(
new THREE.CylinderGeometry(shD * 0.42, shD * 0.55, shankL, 10), wood);
shank.name = 'wa-shank';
shank.position.y = -shankL / 2;
ai.add(shank);
for (const yS of [-0.05, -0.10, -0.15]) {
const sz = new THREE.Mesh(
new THREE.TorusGeometry(shD * 0.53, 0.022, 8, 20), ropeM);
sz.name = 'wa-seize';
sz.rotation.x = Math.PI / 2;
sz.position.set(0, yS, 0);
ai.add(sz);
}
const ST_FRAC = 0.55;
const yStone = -shankL * (1 - ST_FRAC);
const zStone = shD * 0.55 + stoneT / 2;
const stone = new THREE.Mesh(
new THREE.BoxGeometry(stoneL, stoneH, stoneT), stoneM);
stone.name = 'wa-stone';
stone.position.set(0, yStone, zStone);
ai.add(stone);
const TH = 0.38;
const XA_FRAC = 0.35;
const yX = -shankL * (1 - XA_FRAC);
const BL = (yStone - stoneH / 2 - yX) / Math.cos(TH) + armD * 0.4;
const HL = wa.armM || Math.max(ARM_LEN - BL - 1.1 * armD, armD * 2);
const SEP = shankL * 0.058;
const pairs = (nArms >= 4)
? [[0, SEP, [1, -1]], [Math.PI / 2, -SEP, [1, -1]]]
: [[0, SEP, [1]], [0, -SEP, [-1]]];
for (const [ph, st, sgs] of pairs) for (const sg of sgs) {
const yXp = yX + st;
const dir = new THREE.Vector3(
sg * Math.sin(TH) * Math.cos(ph), Math.cos(TH),
sg * Math.sin(TH) * Math.sin(ph));
const timber = new THREE.Mesh(
new THREE.CylinderGeometry(armD * 0.45, armD * 0.55, BL + HL, 10), wood);
timber.name = 'wa-arm';
timber.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
timber.position.set(0, yXp, 0);
timber.position.addScaledVector(dir, (BL - HL) / 2);
ai.add(timber);
const tip = new THREE.Mesh(
new THREE.ConeGeometry(armD * 0.42, armD * 1.2, 10), wood);
tip.name = 'wa-tip';
tip.quaternion.setFromUnitVectors(
new THREE.Vector3(0, 1, 0), dir.clone().negate());
tip.position.set(0, yXp, 0);
tip.position.addScaledVector(dir, -(HL + armD * 0.5));
ai.add(tip);
}
for (const yW of [yX + SEP, yX - SEP]) {
const whip = new THREE.Mesh(
new THREE.TorusGeometry(shD * 0.8, 0.025, 8, 20), ropeM);
whip.name = 'wa-whip';
whip.rotation.x = Math.PI / 2;
whip.position.set(0, yW, 0);
ai.add(whip);
}
for (const [ph, st] of pairs) {
const nrm = new THREE.Vector3(-Math.sin(ph), 0, Math.cos(ph));
for (const dy of [0.07, -0.07]) {
const peg = new THREE.Mesh(
new THREE.CylinderGeometry(0.018, 0.018, shD + 0.16, 8), wood);
peg.name = 'wa-peg';
peg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
peg.position.set(0, yX + st + dy, 0);
ai.add(peg);
}
}
const spread = new THREE.Mesh(
new THREE.BoxGeometry(Math.min(1.35, stoneL * 0.68), 0.05, 0.16), wood);
spread.name = 'wa-spread';
spread.rotation.z = 0.14; spread.rotation.y = 0.25;
spread.position.set(0.05, yX - 0.28, 0.05);
ai.add(spread);
const zHalfAll = (zStone + stoneT / 2 + shD * 0.55) / 2;
const addTurn = (x, tilt, wrapShank) => {
const holder = new THREE.Group();
const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 24), ropeM);
t.name = 'wa-band';
t.rotation.y = Math.PI / 2;
if (wrapShank) {
t.scale.set(zHalfAll + 0.03, stoneH * 0.63, 1);
t.position.z = zHalfAll - shD * 0.55;
} else {
t.scale.set(stoneT * 0.62, stoneH * 0.63, 1);
t.position.z = zStone;
}
holder.add(t);
holder.rotation.z = tilt;
holder.position.set(x, yStone, 0);
ai.add(holder);
};
for (const sgx of [1, -1]) {
addTurn(sgx * stoneL * 0.280, 0, false);
addTurn(sgx * stoneL * 0.335, 0, false);
addTurn(sgx * stoneL * 0.150, sgx * 0.42, true);
addTurn(sgx * stoneL * 0.050, -sgx * 0.42, true);
}
ai.rotation.y = Math.PI / 4;
const g = new THREE.Group();
g.add(ai);
const cosYaw = Math.cos(wa.yaw || 0);
const uH = Math.max(0, u), uT = Math.max(0, u - (shankL + 0.6) * cosYaw / L);
const slope = (uH - uT) > 1e-6
? (deckAtU(uH) - deckAtU(uT)) / ((uH - uT) * L) : 0;
g.rotation.z = -Math.PI / 2 + Math.atan(slope * cosYaw);
if (wa.yaw) g.rotation.y = wa.yaw;
const yD = deckAtU(uH);
g.position.set((u - 0.5) * L, yD, offZ);
g.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(g);
g.position.y += (yD - bb.min.y);
g.updateMatrixWorld(true);
const head = new THREE.Vector3(0, 0, 0).applyMatrix4(g.matrixWorld)
.add(new THREE.Vector3(0.05, 0.06, 0));
const wl = S.windlass;
const uW = wl ? (wl.atU || 0.10) : 0.10;
const barrelPt = new THREE.Vector3(
(uW - 0.5) * L - (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2 + 0.18,
deckAtU(uW) + 0.30 + (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2, offZ * 0.4);
const cable = ropeMesh([[head, barrelPt]], cabR, mats.ropeSolid || wood);
const ag = new THREE.Group();
ag.add(g);
if (cable) { cable.name = 'wa-cable'; ag.add(cable); }
group.add(tag(ag, 'woodAnchor'));
}
if (S.yotsumeAnchor) {
const ya = S.yotsumeAnchor;
const lenM = ya.lenM || 2.0;
const u = (ya.atU != null) ? ya.atU : 0.045;
const offZ = ya.offZ || 0;
const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
{ color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
const ag = new THREE.Group();
const YA_P = {
arW0: 0.0346, arT0: 0.0198,
arW1: 0.0220, arT1: 0.0058,
rSemiV: 0.0818, rSemiH: 0.0353, rBar: 0.0056,
acR: 0.0590, acBar: 0.0079,
shRw: 0.0491, shRt: 0.0764,
shMw: 0.0214, shMt: 0.0303
};
const armF = ya.armFrac || 0.30;
const yaW = (f) => YA_P.arW0 + (YA_P.arW1 - YA_P.arW0) * f;
const yaT = (f) => YA_P.arT0 + (YA_P.arT1 - YA_P.arT0) * f;
const F1 = 0.62 / 1.04, F2 = 0.88 / 1.04;
const w0 = yaW(0), w1 = yaW(F1), w2 = yaW(F2);
const zs1 = (yaT(0) / w0 + yaT(F1) / w1) / 2;
const zs2 = (yaT(F1) / w1 + yaT(F2) / w2) / 2;
const zsT = yaT(F2) / w2;
const shankL = lenM * (1 - 2 * YA_P.rSemiV);
const yaKg = ya.kg || Math.round(335 * Math.pow(lenM / 2.8, 3));
const sqFrus = (wa, wb, h) => h / 3 * (wa * wa + wa * wb + wb * wb);
let vOther = 4 * (zs1 * sqFrus(w0, w1, 0.62 * armF)
+ zs2 * sqFrus(w1, w2, 0.26 * armF)
+ zsT * w2 * w2 * 0.16 * armF / 3)
+ 2 * Math.PI * Math.PI * (YA_P.rSemiH - YA_P.rBar) * YA_P.rBar * YA_P.rBar
* (YA_P.rSemiV / YA_P.rSemiH)
+ 2 * Math.PI * Math.PI * YA_P.acR * YA_P.acBar * YA_P.acBar;
vOther *= lenM * lenM * lenM;
const shWr = YA_P.shRw * lenM, shTr = YA_P.shRt * lenM;
const shWm = YA_P.shMw * lenM, shTm = YA_P.shMt * lenM;
const shRr = shTr / shWr, shRm = shTm / shWm;
const shWmid = (shWr + shWm) / 2, shRmid = (shRr + shRm) / 2;
const zsA = (shRr + shRmid) / 2, zsB = (shRmid + shRm) / 2;
const vPrism = shRm * shWm * shWm * shankL;
const vTaper = zsA * sqFrus(shWr, shWmid, shankL / 2)
+ zsB * sqFrus(shWmid, shWm, shankL / 2);
const shH = shankL * Math.max(0.05, Math.min(1,
(yaKg / 7850 - vOther - vPrism) / (vTaper - vPrism)));
const ai = new THREE.Group();
ai.name = 'ya-grp';
const shBar = (wa, wb, h, zs) => {
const geo = new THREE.CylinderGeometry(wb / Math.SQRT2, wa / Math.SQRT2, h, 4);
geo.rotateY(Math.PI / 4);
const m = new THREE.Mesh(geo, ironG);
m.scale.x = zs;
m.name = 'ya-shank';
return m;
};
const shA = shBar(shWr, shWmid, shH / 2, zsA);
shA.position.y = shH / 4;
const shB = shBar(shWmid, shWm, shH / 2, zsB);
shB.position.y = shH * 0.75;
const shC = shBar(shWm, shWm, shankL - shH, shRm);
shC.position.y = shH + (shankL - shH) / 2;
ai.add(shA); ai.add(shB); ai.add(shC);
const arR = lenM * (YA_P.rSemiH - YA_P.rBar), arBar = lenM * YA_P.rBar;
const ring = new THREE.Mesh(
new THREE.TorusGeometry(arR, arBar, 8, 20), ironG);
ring.name = 'ya-ring';
ring.scale.y = YA_P.rSemiV / YA_P.rSemiH;
ring.position.y = lenM - lenM * YA_P.rSemiV - lenM * 0.01;
ai.add(ring);
const acR = lenM * YA_P.acR, acBar = lenM * YA_P.acBar;
const acr = new THREE.Mesh(
new THREE.TorusGeometry(acR, acBar, 8, 20), ironG);
acr.name = 'ya-acring';
acr.rotation.y = Math.PI / 2;
acr.position.y = lenM - acR - 2 * acBar;
ai.add(acr);
const armL = lenM * armF;
const rectSeg = (wa, wb, h, zs) => {
const geo = new THREE.CylinderGeometry(
wb / Math.SQRT2, wa / Math.SQRT2, h, 4);
geo.rotateY(Math.PI / 4);
const m = new THREE.Mesh(geo, ironG);
m.scale.x = zs;
return m;
};
for (let k = 0; k < 4; k++) {
const cg2 = new THREE.Group();
cg2.rotation.y = k * Math.PI / 2 + Math.PI / 4;
const a1 = 1.62, l1 = armL * 0.62;
const s1 = rectSeg(w0 * lenM, w1 * lenM, l1, zs1);
s1.name = 'ya-arm'; s1.rotation.z = -a1;
s1.position.set(Math.sin(a1) * l1 / 2, Math.cos(a1) * l1 / 2, 0);
cg2.add(s1);
const P1x = Math.sin(a1) * l1, P1y = Math.cos(a1) * l1;
const a2 = 0.90, l2 = armL * 0.26;
const s2 = rectSeg(w1 * lenM, w2 * lenM, l2, zs2);
s2.name = 'ya-arm'; s2.rotation.z = -a2;
s2.position.set(P1x + Math.sin(a2) * l2 / 2, P1y + Math.cos(a2) * l2 / 2, 0);
cg2.add(s2);
const ch = armL * 0.16;
const tipGeo = new THREE.ConeGeometry(w2 * lenM / Math.SQRT2, ch, 4);
tipGeo.rotateY(Math.PI / 4);
const tip = new THREE.Mesh(tipGeo, ironG);
tip.scale.x = zsT;
tip.name = 'ya-tip'; tip.rotation.z = -a2;
tip.position.set(P1x + Math.sin(a2) * (l2 + ch / 2 - 0.01),
P1y + Math.cos(a2) * (l2 + ch / 2 - 0.01), 0);
cg2.add(tip);
ai.add(cg2);
}
const g = new THREE.Group();
g.add(ai);
const cosYaw = Math.cos(ya.yaw || 0);
const uH2 = Math.min(1, u + lenM * cosYaw / L);
const slope = (uH2 - u) > 1e-6
? (deckAtU(uH2) - deckAtU(u)) / ((uH2 - u) * L) : 0;
const q = new THREE.Quaternion()
.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ya.yaw || 0);
q.multiply(new THREE.Quaternion().setFromAxisAngle(
new THREE.Vector3(0, 0, 1), -Math.PI / 2 + Math.atan(slope * cosYaw)));
q.multiply(new THREE.Quaternion().setFromAxisAngle(
new THREE.Vector3(0, 1, 0), Math.PI / 4));
g.quaternion.copy(q);
const yD = deckAtU(u);
g.position.set((u - 0.5) * L, yD, offZ);
g.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(g);
g.position.y += (yD - bb.min.y);
g.updateMatrixWorld(true);
const NOBEAR = { stay: 1, shroud: 1, halyard: 1, brace: 1, lift: 1,
sheet: 1, tack: 1, ratline: 1, oar: 1 };
group.updateMatrixWorld(true);
const bb2 = new THREE.Box3().setFromObject(g);
const bbc = bb2.getCenter(new THREE.Vector3());
const rc = new THREE.Raycaster();
rc.set(new THREE.Vector3(bbc.x, bb2.max.y + 2, bbc.z), new THREE.Vector3(0, -1, 0));
const seat = rc.intersectObject(group, true).filter(h => {
for (let e = h.object; e; e = e.parent) if (e === g) return false;
for (let e = h.object; e; e = e.parent)
if (e.userData && e.userData.part) return !NOBEAR[e.userData.part.key];
return true;
});
if (seat.length) {
g.position.y += (seat[0].point.y - bb2.min.y);
g.updateMatrixWorld(true);
}
const ringP = new THREE.Vector3(0, lenM - acR - 2 * acBar, 0)
.applyMatrix4(ai.matrixWorld);
const cabR = (ya.cableDiaM || 0.06) / 2;
const ropeM = mats.ropeSolid || wood;
const cu = Math.max(0, Math.min(1, (ringP.x / L) + 0.5));
const coilZ = ringP.z - Math.sign(ringP.z || 1) * 0.75;
const coilC = new THREE.Vector3(
(cu - 0.5) * L, deckAtU(cu) + 0.05, coilZ);
rc.set(new THREE.Vector3(coilC.x, coilC.y + 3, coilC.z), new THREE.Vector3(0, -1, 0));
const cSeat = rc.intersectObject(group, true).filter(h => {
for (let e = h.object; e; e = e.parent) if (e === g) return false;
for (let e = h.object; e; e = e.parent)
if (e.userData && e.userData.part) return !NOBEAR[e.userData.part.key];
return true;
});
if (cSeat.length) coilC.y = cSeat[0].point.y + 0.05;
const segs = [];
for (let k = 0; k < 10; k++) {
const b1 = (k / 10) * 2 * Math.PI, b2 = ((k + 1) / 10) * 2 * Math.PI;
for (const [rr, dy] of [[0.30, 0], [0.22, 0.05]])
segs.push([new THREE.Vector3(coilC.x + Math.cos(b1) * rr, coilC.y + dy,
coilC.z + Math.sin(b1) * rr),
new THREE.Vector3(coilC.x + Math.cos(b2) * rr, coilC.y + dy,
coilC.z + Math.sin(b2) * rr)]);
}
const coil = ropeMesh(segs, cabR, ropeM);
if (coil) { coil.name = 'ya-coil'; ag.add(coil); }
const cEnd = new THREE.Vector3(coilC.x, coilC.y + 0.08, coilC.z);
const cMid = ringP.clone().lerp(cEnd, 0.5);
cMid.y = Math.max(cEnd.y + 0.04, ringP.y - 0.15);
const cb = ropeMesh([[ringP, cMid], [cMid, cEnd]], cabR, ropeM);
if (cb) { cb.name = 'ya-cable'; ag.add(cb); }
ag.add(g);
group.add(tag(ag, 'yotsumeAnchor'));
}
if (S.deckhouses && S.deckhouses.length) {
const white = mats.houseWhite || (mats.houseWhite = new THREE.MeshStandardMaterial(
{ color: 0xd8d3c5, roughness: 0.68 }));
const glass = mats.houseGlass || (mats.houseGlass = new THREE.MeshStandardMaterial(
{ color: 0x22262c, roughness: 0.35, metalness: 0.15 }));
for (const hs of S.deckhouses) {
const um = (hs.a + hs.b) / 2;
const hx = (um - 0.5) * L;
const hl = (hs.b - hs.a) * L;
const hw = halfAtU(um) * 2 * (hs.wF || 0.66);
const yb = Math.min(deckAtU(hs.a), deckAtU(um), deckAtU(hs.b)) - 0.5;
const hh = hs.hM + 0.5;
const hg = new THREE.Group();
const walls = new THREE.Mesh(new THREE.BoxGeometry(hl, hh, hw), white);
walls.position.set(hx, yb + hh / 2, 0);
hg.add(walls);
const roof = new THREE.Mesh(
new THREE.BoxGeometry(hl + B * 0.024, B * 0.012, hw + B * 0.024), pale);
roof.position.set(hx, yb + hh + B * 0.006, 0);
hg.add(roof);
const nw = Math.max(2, Math.round(hl / 2.6));
for (let i = 0; i < nw; i++) {
const wx = hx - hl / 2 + (i + 0.5) * (hl / nw);
for (const sgn of [-1, 1]) {
const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.06), glass);
win.position.set(wx, yb + hh * 0.68, sgn * (hw / 2 + 0.01));
hg.add(win);
}
}
group.add(tag(hg, 'deckhouse'));
}
}
if (S.helmAt !== undefined) {
const u = S.helmAt, y = deckAtU(u), x = (u - 0.5) * L;
const R = Math.max(0.55, B * 0.048);
const hg = new THREE.Group();
const box = new THREE.Mesh(new THREE.BoxGeometry(R * 1.6, R * 0.9, R * 0.9), pale);
box.position.set(x + R * 0.9, y + R * 0.45, 0);
hg.add(box);
const wg = new THREE.Group();
wg.position.set(x, y + R * 1.35, 0);
wg.rotation.y = Math.PI / 2;
const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, R * 0.055, 10, 26), wood);
wg.add(rim);
for (let i = 0; i < 5; i++) {
const a = i * Math.PI / 5;
const sp = new THREE.Mesh(
new THREE.CylinderGeometry(R * 0.035, R * 0.035, R * 1.5, 8), wood);
sp.rotation.z = a;
wg.add(sp);
}
hg.add(wg);
group.add(tag(hg, 'helm'));
}
if (timberShip && laidDeck && S.lwl > 25) {
const bl = L * 0.17, u = 0.46;
const boatSpec = {
loa: bl, lwl: bl * 0.94, beam: bl / 3.4, draught: bl * 0.075, freeboard: bl * 0.105,
cm: 0.62, wlPower: 2.6, stemFineness: 0.06, sternFineness: 0.42, transom: 0.20,
forefoot: 0.26, run: 0.30, riseF: 0.55, riseA: 0.30, sheerBow: 0.9, sheerStern: 0.6,
tumblehome: 0.0, stemRake: 0.06, sternRake: 0.02, strakes: 9, masts: [],
};
const bm = new THREE.Mesh(buildHullGeometry(boatSpec, 40, 14), pale);
bm.position.set((u - 0.5) * L, deckAtU(u) + bl * 0.060, 0);
group.add(tag(bm, 'boat'));
for (const d of [-0.30, 0.30]) {
const sk = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.030, B * 0.022, bl / 3.4 * 1.5), wood);
sk.position.set((u - 0.5) * L + d * bl, deckAtU(u) + bl * 0.012, 0);
group.add(tag(sk, 'boat', 'Boat skids'));
}
}
if (S.davitBoats && S.davitBoats.length) {
const iron = new THREE.MeshStandardMaterial(
{ color: 0x2a2723, roughness: 0.55, metalness: 0.45 });
for (const db of S.davitBoats) {
const bl = db.lM;
const bb = bl / 3.4;
const qSpec = {
loa: bl, lwl: bl * 0.94, beam: bb, draught: bl * 0.075, freeboard: bl * 0.105,
cm: 0.62, wlPower: 2.6, stemFineness: 0.06, sternFineness: 0.42, transom: 0.20,
forefoot: 0.26, run: 0.30, riseF: 0.55, riseA: 0.30, sheerBow: 0.9, sheerStern: 0.6,
tumblehome: 0.0, stemRake: 0.06, sternRake: 0.02, strakes: 9, masts: [],
};
const qGeo = buildHullGeometry(qSpec, 40, 14);
for (const sgn of [-1, 1]) {
const [bx, railY, railZ] = surfacePoint(S, H, db.u, 1);
const bz = sgn * (railZ + bb * 0.55);
const keelY = railY + 0.25;
const bm = new THREE.Mesh(qGeo, pale);
bm.position.set(bx, keelY + bl * 0.075, bz);
group.add(tag(bm, 'boat', 'Quarter boat',
'The sea boat, swung outboard in radial davits and kept there at sea: a boat '
+ 'stowed inboard takes minutes of tackle work to launch, and a man overboard '
+ 'has seconds. Canvas-covered against spray and, down here, against ice.'));
const headY = keelY + bl * 0.075 + bl * 0.105 + 0.55;
const reach = Math.abs(bz) - (railZ - 0.12);
for (const e of [-1, 1]) {
const dx = bx + e * bl * 0.46;
const postZ = sgn * (railZ - 0.12);
const hp = headY - (railY - 0.5);
const post = new THREE.Mesh(
new THREE.CylinderGeometry(0.055, 0.068, hp, 10), iron);
post.position.set(dx, railY - 0.5 + hp / 2, postZ);
group.add(tag(post, 'boat', 'Davit'));
const arc = new THREE.Mesh(
new THREE.TorusGeometry(reach, 0.052, 8, 14, Math.PI / 2), iron);
arc.rotation.y = sgn * Math.PI / 2;
arc.position.set(dx, headY, postZ + sgn * reach);
group.add(tag(arc, 'boat', 'Davit'));
const tipY = headY + reach;
const endY = keelY + bl * 0.075 + bl * 0.105;
const fall = new THREE.Mesh(
new THREE.CylinderGeometry(0.018, 0.018, tipY - endY, 6), iron);
fall.position.set(dx, (tipY + endY) / 2, bz);
group.add(tag(fall, 'boat', 'Davit fall'));
}
}
}
}
}
function buildTop(r, mat, mastR, year) {
const g = new THREE.Group();
const zT = mastR ? mastR + r * 0.055 : r * 0.13;
const thick = r * 0.09;
if ((year || 0) >= 1710) {
const aft = r * 0.70;
const sh = new THREE.Shape();
sh.moveTo(aft, -r);
sh.lineTo(0, -r);
sh.absarc(0, 0, r, Math.PI * 1.5, Math.PI * 0.5, true);
sh.lineTo(aft, r);
sh.lineTo(aft, -r);
const hx = r * 0.32, hz = Math.max(r * 0.07, zT - r * 0.055);
const hole = new THREE.Path();
hole.moveTo(-hx, -hz); hole.lineTo(hx, -hz); hole.lineTo(hx, hz); hole.lineTo(-hx, hz);
hole.lineTo(-hx, -hz);
sh.holes.push(hole);
const plat = new THREE.Mesh(
new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false, curveSegments: 14 }), mat);
plat.rotation.x = Math.PI / 2;
plat.position.y = thick / 2;
g.add(plat);
} else {
const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, thick, 14), mat);
g.add(plat);
const ring = new THREE.Shape();
ring.absarc(0, 0, r, 0, Math.PI * 2, false);
const inner = new THREE.Path();
inner.absarc(0, 0, r * 0.94, 0, Math.PI * 2, true);
ring.holes.push(inner);
const wall = new THREE.Mesh(
new THREE.ExtrudeGeometry(ring, { depth: r * 0.5, bevelEnabled: false, curveSegments: 14 }), mat);
wall.rotation.x = -Math.PI / 2;
wall.position.y = thick / 2;
g.add(wall);
}
for (const sz of [-1, 1]) {
const t = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, r * 0.13, r * 0.11), mat);
t.position.set(0, -r * 0.155, sz * zT);
g.add(t);
}
for (const sx of [-1, 1]) {
const t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.14, r * 0.10, r * 1.9), mat);
t.position.set(sx * r * 0.40, -r * 0.075, 0);
g.add(t);
}
return tag(g, 'top');
}
function buildDeadeyes(n, r, mat) {
const g = new THREE.Group();
for (let i = 0; i < n; i++) {
const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.5, 16), mat);
d.rotation.x = Math.PI / 2;
d.position.z = (i - (n - 1) / 2) * r * 2.4;
g.add(d);
}
return tag(g, 'deadeye');
}
function buildGuns(S, group, mat) {
const H = hullSurface(S);
const decks = S.gunDecks || 0;
if (!decks) return;
const g = new THREE.Group();
const len = S.beam * 0.19, r = S.beam * 0.017;
for (let d = 0; d < decks; d++) {
const v = 0.62 + 0.10 + d * 0.115;
if (v > 0.985) continue;
for (let k = 0; k < 26; k++) {
const u = (k + 0.5) / 26;
const aftLimit = Math.min(0.88, 1 - (S.run || 0.3) - 0.02);
if (u < 0.13 || u > aftLimit) continue;
const p = surfacePoint(S, H, u, v);
for (const sgn of [-1, 1]) {
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(r * 0.72, r, len, 16), mat);
bar.rotation.x = Math.PI / 2;
bar.position.set(p[0], p[1], sgn * (p[2] + len * 0.30));
g.add(bar);
}
}
}
group.add(tag(g, 'gun'));
}
function buildRigging(S, group, mats, spars, mastTops) {
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const ropeMat = mats.ropeSolid || mats.spar;
const staySegs = [], braceSegs = [];
const line = (a, b) => [new THREE.Vector3(a[0], a[1], a[2] || 0),
new THREE.Vector3(b[0], b[1], b[2] || 0)];
const deckAt = u => H.sheer(u);
mastTops.forEach((m, i) => {
if (m.gaff) {
const prev = mastTops[i - 1];
if (prev) staySegs.push(line([m.x, m.y], [prev.x, prev.y - 0.4]));
else if (S.bowsprit && !S.headsails) {
const stv = (S.steeve || 22) * Math.PI / 180;
const blen = L * S.bowsprit;
staySegs.push(line([m.x, m.y],
[-L / 2 - Math.cos(stv) * blen * 0.9, deckAt(0.02) + Math.sin(stv) * blen * 0.9]));
}
return;
}
const aheadU = i === 0 ? 0.03 : mastTops[i - 1].u;
const ax = (aheadU - 0.5) * L;
const ay = i === 0 ? deckAt(0.06) + (S.bowsprit ? S.beam * 0.20 : 0) : deckAt(aheadU);
staySegs.push(line([m.x, m.y], [ax, ay]));
const bu = Math.min(0.96, m.u + 0.20);
const bx = (bu - 0.5) * L, by = deckAt(bu);
const hb = Math.abs(surfacePoint(S, H, bu, 1)[2]);
for (const sgn of [-1, 1]) staySegs.push(line([m.x, m.y, 0], [bx, by, sgn * hb]));
});
spars.forEach(sp => {
const bu = Math.min(0.97, sp.u + 0.26);
const bx = (bu - 0.5) * L, by = deckAt(bu);
for (const sgn of [-1, 1])
braceSegs.push(line([sp.x + sgn * (sp.armX || 0), sp.y, sgn * (sp.armZ !== undefined ? sp.armZ : sp.half)],
[bx, by + sp.half * 0.10, sgn * sp.half * 0.30]));
});
const st = ropeMesh(staySegs, 0.020 + B * 0.0009, ropeMat);
if (st) group.add(tag(st, 'stay'));
const br = ropeMesh(braceSegs, 0.010 + B * 0.0004, ropeMat);
if (br) group.add(tag(br, 'brace'));
}
function linerHouse(S) {
const n = S.decks || 0;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const base = H.sheer(0.5), dh = S.deckM || Math.min(B * 0.105, 3.0), inset = B * 0.055;
const [hA, hB] = (S.houseAt && S.houseAt.length === 2) ? S.houseAt : [0.10, 0.90];
const crest = (S.houseCrest && S.houseCrest.length === 2) ? S.houseCrest
: [hA + 0.024 * (n - 1) / n, hB - 0.14 * (n - 1) / n];
const mkPin = (edge, first, last, rec) => {
const pin = { 0: first, [n - 1]: last };
for (const k in (rec || {})) {
const ti = +k;
if (ti > 0 && ti < n - 1) pin[ti] = rec[k];
}
const idx = Object.keys(pin).map(Number).sort((a, b) => a - b);
return i => {
if (pin[i] !== undefined) return pin[i];
let lo = idx[0], hi = idx[idx.length - 1];
for (const q of idx) if (q < i) lo = q;
for (let j = idx.length - 1; j >= 0; j--) if (idx[j] > i) hi = idx[j];
return pin[lo] + (pin[hi] - pin[lo]) * (i - lo) / (hi - lo);
};
};
const aftAt  = mkPin('aft',  hB, crest[1], S.tierAftU);
const foreAt = mkPin('fore', hA, crest[0], S.tierForeU);
const floorY = i => (i >= n) ? (S.houseTopM !== undefined ? S.houseTopM : base + dh * n)
: (i <= 0) ? base
: (S.tierFloorsM && S.tierFloorsM[i - 1] !== undefined) ? S.tierFloorsM[i - 1]
: base + dh * i;
const tiers = [];
const ns = S.shellTiers || 0;
const recessTier = (S.boatsRecessed && S.boats) ? ns : -1;
const taper = S.houseTaper !== undefined ? S.houseTaper : 0.16;
const qAtX = (x) => {
if (x <= -0.5 * L + H.rake(0)) return 0;
if (x >= 0.5 * L + H.rake(1)) return 1;
let lo = 0, hi = 1;
for (let it = 0; it < 32; it++) {
const q = (lo + hi) / 2;
if ((q - 0.5) * L + H.rake(q) < x) lo = q; else hi = q;
}
return (lo + hi) / 2;
};
for (let i = 0; i < n; i++) {
const shell = i < ns;
const wid = shell ? B : B * (1 - taper * (0.5 + i / n));
const ins = shell ? B * 0.015 : (taper < 0.06 ? B * 0.015 : inset);
const f = n > 1 ? i / (n - 1) : 0;
const uA = foreAt(i), uB = aftAt(i);
const half = (u) => {
const uu = qAtX((u - 0.5) * L);
return Math.max(B * 0.06, Math.min(wid / 2,
Math.abs(surfacePoint(S, H, uu, 1.0)[2]) - ins));
};
const uAHead = S.houseRamp
? (i < n - 1 ? foreAt(i + 1)
: Math.min(uA + (n > 1 ? uA - foreAt(n - 2) : 0.02),
uA + (uB - uA) * 0.45))
: undefined;
const wr = S.tierWings ? S.tierWings[i] : undefined;
const rr = S.tierRound ? S.tierRound[i] : undefined;
const wingUi = (wr && wr.aftU > uB + 1e-6) ? wr.aftU : undefined;
const pitchU = ((S.tierBands && S.tierBands.pitchM) || 2.6) / L;
const rrOK = rr && rr.sagittaM > 0.01 &&
uB + rr.sagittaM / L <
(wingUi !== undefined ? wingUi : (i ? tiers[i - 1].uB : uB)) - pitchU;
tiers.push({ uA, uB, uAHead, y0: floorY(i), y1: floorY(i + 1), half, shell,
recess: i === recessTier,
wingU: wingUi,
wingDepth: wr ? wr.depthM : undefined,
roundM: rrOK ? rr.sagittaM : undefined });
}
return { n, base, dh, top: floorY(n), tiers,
recorded: !!(S.houseAt && S.houseAt.length === 2) };
}
function buildSuperstructure(S, group, hullMat) {
const n = S.decks || 0;
if (!n) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const white = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
const g = new THREE.Group();
const T = linerHouse(S);
const cover = deckCovering(S);
const roofsLaid = !!(S.deck && S.deck.roofs);
const roofsBareTop = !!(S.deck && S.deck.roofs === 'terraces');
const roofDeckMat = (hullMat && roofsLaid && cover.recorded && cover.mode === 1)
? new THREE.ShaderMaterial({
vertexShader: SHADERS['DECK_VERT.vert'], fragmentShader: SHADERS['DECK_FRAG.frag'],
uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam,
uCol:    { value: new THREE.Color(cover.col) },
uMode:   { value: cover.mode },
uPlankW: { value: cover.plankW || 1 },
uButtL:  { value: cover.buttL || 1 } } })
: null;
const paneW = B * 0.075;
const face = new THREE.Color(0xe4e2dc);
const glass = new THREE.Color(0x6d7a86);
const wallMat = new THREE.MeshStandardMaterial({
vertexColors: true, roughness: 0.60, side: THREE.DoubleSide });
const plateMat = new THREE.MeshStandardMaterial({
color: 0xe4e2dc, roughness: 0.60, side: THREE.DoubleSide });
const wallLoft = (path, y0, y1, rows, band, pw, mulFrac, faceCol, glassSpec, shear, grp) => {
const tp = [], tc = [], ti = [];
const R = rows.length;
const fc = faceCol || face;
let s = 0;
for (let k = 0; k < path.length; k++) {
if (k) s += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
const frac = ((s / pw) % 1 + 1) % 1;
const isMul = frac < mulFrac;
for (const rf of rows) {
const inBand = rf > band[0] && rf < band[1];
let glazed = !isMul;
if (grp) {
const uu = (path[k].x + (shear ? shear(path[k], rf) : 0)) / grp.L + 0.5;
glazed = false;
for (const gr of grp.groups) {
const relM = (uu - gr[0]) * grp.L;
const spanM = (gr[1] - gr[0]) * grp.L;
if (relM > 2e-4 && relM < spanM - 2e-4) {
const p = gr[2] || 0;
glazed = !p || relM % p <= p * (1 - (gr[3] || 0)) + 1e-3;
break;
}
}
}
const c = (inBand && glazed)
? (glassSpec
? glassSpec.lo.clone().lerp(glassSpec.hi,
(rf - band[0]) / Math.max(0.001, band[1] - band[0]))
: glass)
: fc;
tp.push(path[k].x + (shear ? shear(path[k], rf) : 0),
y0 + rf * (y1 - y0), path[k].z);
tc.push(c.r, c.g, c.b);
}
}
for (let k = 0; k + 1 < path.length; k++)
for (let r = 0; r + 1 < R; r++) {
const a = k * R + r, b = (k + 1) * R + r;
ti.push(a, b, a + 1, a + 1, b, b + 1);
}
const gg = new THREE.BufferGeometry();
gg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
gg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
gg.setIndex(ti); gg.computeVertexNormals();
return new THREE.Mesh(gg, wallMat);
};
const capPts = (t, h, st) => {
const xF = (t.uB - 0.5) * L;
const s = t.roundM || 0;
const N = Math.max(6, Math.round(2 * h / st));
const out = [];
if (s > 0.01 && s < h * 0.9) {
const R = (h * h + s * s) / (2 * s);
const xc = xF + s - R;
for (let k = 1; k <= N; k++) {
const z = h - 2 * h * k / N;
out.push({ x: xc + Math.sqrt(Math.max(0, R * R - z * z)), z });
}
} else {
for (let k = 1; k <= N; k++) out.push({ x: xF, z: h - 2 * h * k / N });
}
return out;
};
const perim = (t, step) => {
const st = step || paneW * 0.5;
const pts = [];
if (t.wingU !== undefined) {
const dep = t.wingDepth || B * 0.1;
const inz = (u) => Math.max(B * 0.04, t.half(u) - dep);
const chU = Math.min((S.tierBands && S.tierBands.pitchM) || paneW * 2,
(t.wingU - t.uB) * L * 0.6) / L;
const leg = (u0, u1, zf) => {
const N = Math.max(8, Math.round(Math.abs(u1 - u0) * L / st));
for (let k = pts.length ? 1 : 0; k <= N; k++) {
const u = u0 + (u1 - u0) * k / N;
pts.push({ x: (u - 0.5) * L, z: zf(u) });
}
};
leg(t.uA, t.wingU, u => t.half(u));
pts.push({ x: (t.wingU - chU - 0.5) * L, z: inz(t.wingU - chU) });
leg(t.wingU - chU, t.uB, u => inz(u));
for (const q of capPts(t, inz(t.uB), st)) pts.push(q);
leg(t.uB, t.wingU - chU, u => -inz(u));
pts.push({ x: (t.wingU - 0.5) * L, z: -t.half(t.wingU) });
leg(t.wingU, t.uA, u => -t.half(u));
const hf = t.half(t.uA), NF = Math.max(6, Math.round(2 * hf / st));
for (let k = 1; k <= NF; k++)
pts.push({ x: (t.uA - 0.5) * L, z: -hf + 2 * hf * k / NF });
return pts;
}
const NU = Math.max(60, Math.round((t.uB - t.uA) * L / st));
for (let k = 0; k <= NU; k++) {
const u = t.uA + (t.uB - t.uA) * k / NU;
pts.push({ x: (u - 0.5) * L, z: t.half(u) });
}
for (const q of capPts(t, t.half(t.uB), st)) pts.push(q);
for (let k = 1; k <= NU; k++) {
const u = t.uB - (t.uB - t.uA) * k / NU;
pts.push({ x: (u - 0.5) * L, z: -t.half(u) });
}
const hf = t.half(t.uA), NF = Math.max(6, Math.round(2 * hf / st));
for (let k = 1; k <= NF; k++)
pts.push({ x: (t.uA - 0.5) * L, z: -hf + 2 * hf * k / NF });
return pts;
};
const snapBand = (pts, pitch, pierFrac) => {
if (!pitch || pitch <= 0) return pts;
const eps = 0.001;
const out = [pts[0]];
let s = 0;
for (let k = 1; k < pts.length; k++) {
const a = pts[k - 1], b = pts[k];
const seg = Math.hypot(b.x - a.x, b.z - a.z);
if (seg > 1e-9) {
const n0 = Math.floor(s / pitch);
for (let n = n0; n <= Math.floor((s + seg) / pitch) + 1; n++) {
for (const f of [0, pierFrac]) {
const sb = (n + f) * pitch;
if (sb <= s + eps || sb >= s + seg - eps) continue;
for (const d of [-eps, +eps]) {
const t2 = (sb + d - s) / seg;
out.push({ x: a.x + (b.x - a.x) * t2, z: a.z + (b.z - a.z) * t2 });
}
}
}
s += seg;
}
out.push(b);
}
return out;
};
const snapGroupsX = (pts, groups, spanL) => {
const edges = [];
for (const gr of groups) {
const x0 = (gr[0] - 0.5) * spanL, x1 = (gr[1] - 0.5) * spanL;
edges.push(x0, x1);
const pitch = gr[2] || 0;
if (pitch > 0) {
const light = pitch * (1 - (gr[3] || 0));
const span = (gr[1] - gr[0]) * spanL;
for (let sM = 0; sM <= span; sM += pitch) {
if (sM > 0) edges.push(x0 + sM);
if (sM + light < span) edges.push(x0 + sM + light);
}
}
}
const eps = 0.001, out = [pts[0]];
for (let k = 1; k < pts.length; k++) {
const a = pts[k - 1], b = pts[k];
const dx = b.x - a.x;
if (Math.abs(dx) > 1e-9) {
const cross = edges
.map(xe => (xe - a.x) / dx)
.filter(t2 => t2 > 1e-6 && t2 < 1 - 1e-6)
.sort((p, q) => p - q);
for (const t2 of cross) {
for (const d of [-eps, +eps]) {
const tt = t2 + d / Math.abs(dx);
if (tt <= 0 || tt >= 1) continue;
out.push({ x: a.x + dx * tt, z: a.z + (b.z - a.z) * tt });
}
}
}
out.push(b);
}
return out;
};
const roofPlate = (t, y, bare) => {
const pts = perim(t);
const sh = new THREE.Shape();
sh.moveTo(pts[0].x, pts[0].z);
for (let k = 1; k < pts.length; k++) sh.lineTo(pts[k].x, pts[k].z);
const gg = new THREE.ShapeGeometry(sh);
gg.rotateX(Math.PI / 2);
gg.translate(0, y, 0);
if (roofDeckMat && !bare) {
const ix = gg.getIndex().array;
for (let k = 0; k + 2 < ix.length; k += 3) {
const t2 = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t2;
}
const na = gg.getAttribute('normal');
for (let k = 0; k < na.count; k++) na.setXYZ(k, 0, 1, 0);
return tag(new THREE.Mesh(gg, roofDeckMat), 'superstructure',
cover.name.replace('Weather deck', 'House deck'), cover.what);
}
return new THREE.Mesh(gg, plateMat);
};
const up = new THREE.Vector3(0, 1, 0);
const railRun = (pts, y) => {
const step = B * 0.22, Q = [];
let acc = 0;
Q.push(pts[0]);
for (let k = 1; k < pts.length; k++) {
acc += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
if (acc >= step || k === pts.length - 1) { Q.push(pts[k]); acc = 0; }
}
const dh = T.dh;
for (const q of Q) {
const st = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.004, B * 0.004, dh * 0.30, 5), white);
st.position.set(q.x, y + dh * 0.15, q.z);
g.add(st);
}
for (let k = 0; k + 1 < Q.length; k++) {
const a = Q[k], b = Q[k + 1];
const len = Math.hypot(b.x - a.x, b.z - a.z);
if (len < 0.01) continue;
const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
for (const h of [0.10, 0.20, 0.30]) {
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, len, 5), white);
bar.position.set((a.x + b.x) / 2, y + dh * h, (a.z + b.z) / 2);
bar.quaternion.setFromUnitVectors(up, dir);
g.add(bar);
}
}
};
const screen = S.fantailScreen;
const glassMat = screen ? new THREE.MeshStandardMaterial({
color: 0xaebfca, roughness: 0.22, metalness: 0.08,
transparent: true, opacity: 0.42, depthWrite: false,
side: THREE.DoubleSide }) : null;
const screenRailMat = screen ? new THREE.MeshStandardMaterial({
color: 0x4a3826, roughness: 0.55 }) : null;
const windscreen = (pts, y) => {
const hM = screen.hM, lean = Math.tan(screen.leanDeg * Math.PI / 180) * hM;
const off = pts.map((p, k) => {
const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
let nx = -(b.z - a.z), nz = b.x - a.x;
const nl = Math.hypot(nx, nz) || 1;
return { x: nx / nl * lean, z: nz / nl * lean };
});
const sp = [], si = [];
for (let k = 0; k < pts.length; k++)
sp.push(pts[k].x, y, pts[k].z,
pts[k].x + off[k].x, y + hM, pts[k].z + off[k].z);
for (let k = 0; k + 1 < pts.length; k++)
si.push(2 * k, 2 * k + 2, 2 * k + 1, 2 * k + 1, 2 * k + 2, 2 * k + 3);
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
sg.setIndex(si); sg.computeVertexNormals();
const strip = new THREE.Mesh(sg, glassMat);
strip.name = 'fantailScreen';
g.add(strip);
const post = k => {
const d = new THREE.Vector3(off[k].x, hM, off[k].z);
const len = d.length();
const st2 = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.003, B * 0.003, len, 5), white);
st2.position.set(pts[k].x + off[k].x / 2, y + hM / 2, pts[k].z + off[k].z / 2);
st2.quaternion.setFromUnitVectors(up, d.normalize());
g.add(st2);
};
let acc = 0;
post(0);
for (let k = 1; k < pts.length; k++) {
acc += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
if (acc >= 2.0 || k === pts.length - 1) { post(k); acc = 0; }
}
for (let k = 0; k + 1 < pts.length; k++) {
const ax = pts[k].x + off[k].x, az = pts[k].z + off[k].z;
const bx = pts[k + 1].x + off[k + 1].x, bz = pts[k + 1].z + off[k + 1].z;
const len = Math.hypot(bx - ax, bz - az);
if (len < 0.01) continue;
const dir = new THREE.Vector3(bx - ax, 0, bz - az).normalize();
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.0045, B * 0.0045, len, 6), screenRailMat);
bar.position.set((ax + bx) / 2, y + hM, (az + bz) / 2);
bar.quaternion.setFromUnitVectors(up, dir);
g.add(bar);
}
};
const rows = [0.0, 0.46, 0.475, 0.665, 0.68, 1.0];
const shellCol = new THREE.Color(S.shellTopside || S.topside || '#3a3a3c');
const recessCol = new THREE.Color(0x24272b);
const TB = S.tierBands;
const SB = S.shellBands;
for (let i = 0; i < T.n; i++) {
const t = T.tiers[i];
const bandRec = (TB && !t.recess && i >= TB.from && i <= TB.to) ? TB
: ((SB && t.shell && !t.recess) ? SB : null);
const xF = (t.uA - 0.5) * L;
const rampShear = t.uAHead !== undefined
? (pt, rf) => (Math.abs(pt.x - xF) < 1e-6 ? rf * (t.uAHead - t.uA) * L : 0)
: null;
const tCeil = t.uAHead !== undefined
? { uA: t.uAHead, uB: t.uB, half: t.half,
wingU: t.wingU, wingDepth: t.wingDepth, roundM: t.roundM } : t;
if (bandRec) {
const lo = new THREE.Color(bandRec.kind === 'balcony' ? 0x20262b : 0x272e35);
const hi = new THREE.Color(bandRec.kind === 'balcony' ? 0x424c54 : 0x4a545d);
const bm = bandRec.bandsM ? bandRec.bandsM[i] : null;
const tierH = t.y1 - t.y0;
const bBot = bm ? Math.max(0.02, (bm[0] - t.y0) / tierH) : bandRec.bot;
const bTop = bm ? Math.min(0.98, (bm[1] - t.y0) / tierH) : bandRec.top;
const bRows = [0.0, bBot, bBot + 0.02, bTop - 0.02, bTop, 1.0];
const pf = bandRec.pierFrac !== undefined ? bandRec.pierFrac : 0.16;
const pitch = bandRec.pitchM || paneW;
const bStep = Math.max(0.6, pitch * 0.5);
const grpList = bandRec.groups ? bandRec.groups[i] : null;
if (grpList) {
g.add(wallLoft(snapGroupsX(perim(t, bStep), grpList, L), t.y0, t.y1, bRows,
[bBot, bTop], pitch, pf,
t.shell ? shellCol : null, { lo, hi }, rampShear,
{ L, groups: grpList }));
} else {
g.add(wallLoft(snapBand(perim(t, bStep), pitch, pf), t.y0, t.y1, bRows,
[bBot, bTop], pitch, pf,
t.shell ? shellCol : null, { lo, hi }, rampShear));
}
} else {
g.add(wallLoft(perim(t), t.y0, t.y1, rows, t.recess ? [2, 3] : [0.46, 0.68], paneW, 0.52,
t.recess ? recessCol : (t.shell ? shellCol : null), null, rampShear));
}
g.add(roofPlate(tCeil, t.y1, roofsBareTop && i === T.n - 1));
if (i === T.n - 1) {
railRun(perim(tCeil), t.y1);
} else {
const tAbove = T.tiers[i + 1];
const promPath = (uEnd, uStart, capAt) => {
const pr = [];
const NP = Math.max(4, Math.round(Math.abs(uStart - uEnd) * L / (paneW * 0.5)));
for (let k = 0; k <= NP; k++) {
const u = uEnd + (uStart - uEnd) * k / NP;
pr.push({ x: (u - 0.5) * L, z: t.half(u) });
}
if (t.roundM !== undefined && capAt === t.uB) {
for (const q of capPts(t, t.half(capAt), paneW * 0.5)) pr.push(q);
} else {
pr.push({ x: (capAt - 0.5) * L, z: -t.half(capAt) });
}
for (let k = NP; k >= 0; k--) {
const u = uEnd + (uStart - uEnd) * k / NP;
pr.push({ x: (u - 0.5) * L, z: -t.half(u) });
}
return pr;
};
const promenade = (uEnd, uStart, capAt) => railRun(promPath(uEnd, uStart, capAt), t.y1);
const aStart = tAbove.wingU !== undefined ? tAbove.wingU : tAbove.uB;
if (t.wingU !== undefined) {
if (t.wingU > aStart + 0.012) {
const dep = t.wingDepth || B * 0.1;
const inz = (u) => Math.max(B * 0.04, t.half(u) - dep);
const chU = Math.min((S.tierBands && S.tierBands.pitchM) || paneW * 2,
(t.wingU - t.uB) * L * 0.6) / L;
const wp = [];
const wleg = (u0, u1, zf) => {
const N = Math.max(4, Math.round(Math.abs(u1 - u0) * L / (paneW * 0.5)));
for (let k = wp.length ? 1 : 0; k <= N; k++) {
const u = u0 + (u1 - u0) * k / N;
wp.push({ x: (u - 0.5) * L, z: zf(u) });
}
};
wleg(aStart, t.wingU, u => t.half(u));
wp.push({ x: (t.wingU - chU - 0.5) * L, z: inz(t.wingU - chU) });
wleg(t.wingU - chU, Math.max(t.uB, aStart), u => inz(u));
const capAt = Math.max(t.uB, aStart), hn = inz(capAt);
if (t.roundM !== undefined && capAt === t.uB) {
for (const q of capPts(t, hn, paneW * 0.5)) wp.push(q);
} else {
wp.push({ x: (capAt - 0.5) * L, z: -hn });
}
wleg(Math.max(t.uB, aStart), t.wingU - chU, u => -inz(u));
wp.push({ x: (t.wingU - 0.5) * L, z: -t.half(t.wingU) });
wleg(t.wingU, aStart, u => -t.half(u));
railRun(wp, t.y1);
}
} else if (t.uB > aStart + 0.012) {
if (screen && screen.tier === i) windscreen(promPath(aStart, t.uB, t.uB), t.y1);
else promenade(aStart, t.uB, t.uB);
}
const fFront = t.uAHead !== undefined ? t.uAHead : t.uA;
if (fFront < tAbove.uA - 0.012) promenade(tAbove.uA, fFront, fFront);
}
}
const livery = S.sternLivery;
const shellsN = T.tiers.filter(t => t.shell).length;
if (livery && livery.strakes > 0 && shellsN > 0) {
const kL = Math.min(livery.strakes, shellsN);
const topY = T.tiers[kL - 1].y1;
const t0 = T.tiers[0];
const xTip = (t0.uB - 0.5) * L;
const xKnee = Math.max((livery.fromU - 0.5) * L, (t0.uA - 0.5) * L + 1);
const yAt = x => T.base + (topY - T.base) *
Math.min(1, Math.max(0, (x - xKnee) / Math.max(1e-6, xTip - xKnee)));
const liveryCol = new THREE.Color(S.topside || '#1d1d1f');
for (let i = 0; i < kL; i++) {
const t = T.tiers[i];
const xA = xKnee + (t.y0 - T.base) / Math.max(1e-6, topY - T.base) * (xTip - xKnee);
const uA = Math.max(t.uA, xA / L + 0.5), uB = t.uB;
if (uB - uA < 1e-4) continue;
const pts = [];
const NU = Math.max(12, Math.round((uB - uA) * L));
for (let q = 0; q <= NU; q++) {
const u = uA + (uB - uA) * q / NU;
pts.push({ x: (u - 0.5) * L, z: t.half(u) });
}
const hb = t.half(uB), NB = Math.max(8, Math.round(2 * hb));
for (let q = 1; q <= NB; q++)
pts.push({ x: (uB - 0.5) * L, z: hb - 2 * hb * q / NB });
for (let q = 1; q <= NU; q++) {
const u = uB - (uB - uA) * q / NU;
pts.push({ x: (u - 0.5) * L, z: -t.half(u) });
}
const sp = [], sc = [], si = [];
for (let q = 0; q < pts.length; q++) {
const a = pts[Math.max(0, q - 1)], b = pts[Math.min(pts.length - 1, q + 1)];
let nx = -(b.z - a.z), nz = b.x - a.x;
const nl = Math.hypot(nx, nz) || 1;
nx = nx / nl * 0.03; nz = nz / nl * 0.03;
const yTop = Math.min(t.y1, yAt(pts[q].x));
sp.push(pts[q].x + nx, t.y0, pts[q].z + nz,
pts[q].x + nx, yTop, pts[q].z + nz);
sc.push(liveryCol.r, liveryCol.g, liveryCol.b,
liveryCol.r, liveryCol.g, liveryCol.b);
}
for (let q = 0; q + 1 < pts.length; q++)
si.push(2 * q, 2 * q + 2, 2 * q + 1, 2 * q + 1, 2 * q + 2, 2 * q + 3);
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
sg.setIndex(si); sg.computeVertexNormals();
const strip = new THREE.Mesh(sg, wallMat);
strip.name = 'sternLivery';
g.add(strip);
}
}
const top = T.tiers[T.n - 1];
if (S.cluster && S.cluster.blockU) { group.add(tag(g, 'superstructure')); return; }
const bg = new THREE.Group();
const uW0 = top.uA + 0.004;
const uW1 = Math.min(top.uB, uW0 + (S.bridgeM ? S.bridgeM / L : 0.030));
const whHalf = Math.min(B * (S.bridgeHalf || 0.27), top.half(uW0) - B * 0.01);
const whT = {
uA: uW0, uB: uW1, half: () => whHalf,
};
const whH = T.dh * 0.92;
bg.add(wallLoft(perim(whT), T.top, T.top + whH,
[0.0, 0.30, 0.33, 0.82, 0.85, 1.0], [0.30, 0.85], paneW * 1.5, 0.30));
bg.add(roofPlate(whT, T.top + whH, roofsBareTop));
const wingBeam = S.bridgeBeamM || 0;
for (const sgn of [-1, 1]) {
const uMid = (uW0 + uW1) / 2;
const hullHalf = wingBeam ? wingBeam / 2
: Math.abs(surfacePoint(S, H, uMid, 1.0)[2]);
if (hullHalf > whHalf + B * 0.02) {
const wing = new THREE.Mesh(
new THREE.BoxGeometry((uW1 - uW0) * L, T.dh * 0.06, hullHalf - whHalf), plateMat);
wing.position.set((uMid - 0.5) * L, T.top + T.dh * 0.03, sgn * (whHalf + hullHalf) / 2);
bg.add(wing);
const wx0 = (uW0 - 0.5) * L, wx1 = (uW1 - 0.5) * L;
const wpts = [{ x: wx0, z: sgn * whHalf }, { x: wx0, z: sgn * hullHalf },
{ x: wx1, z: sgn * hullHalf }, { x: wx1, z: sgn * whHalf }];
if (wingBeam > 0) {
const par = new THREE.Mesh(
new THREE.BoxGeometry((uW1 - uW0) * L, T.dh * 0.34, B * 0.012), plateMat);
par.position.set((uMid - 0.5) * L, T.top + T.dh * 0.23, sgn * hullHalf);
bg.add(par);
const end = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.012, T.dh * 0.34, hullHalf - whHalf), plateMat);
end.position.set((uW0 - 0.5) * L, T.top + T.dh * 0.23, sgn * (whHalf + hullHalf) / 2);
bg.add(end);
} else {
railRun(wpts, T.top + T.dh * 0.06);
}
}
}
const bTag = tag(bg, 'bridge', 'Navigating bridge');
bTag.userData.part.what =
'The ship is conned from here: a wheelhouse at the forward end of the boat deck, more '
+ 'glass than wall, with wings running out to — and on a modern ship past — her sides, '
+ 'because a beam this wide is brought alongside a pier by an officer standing at its '
+ 'very edge, watching the plating go home.';
g.add(bTag);
const works = S.topWorks || [];
if (works.length) {
const wg = new THREE.Group();
const dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.62, metalness: 0.30 });
for (const w of works) {
const uM = (w.u0 + w.u1) / 2;
const len = Math.max(1, (w.u1 - w.u0) * L);
const half = Math.max(B * 0.05, top.half(uM) * (w.half !== undefined ? w.half : 0.55));
const x = (uM - 0.5) * L, h = w.hM;
if (w.kind === 'dome') {
const d = new THREE.Mesh(
new THREE.SphereGeometry(Math.min(h, len / 2), 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
plateMat);
d.position.set(x, T.top, 0);
wg.add(tag(d, 'bridge', 'Radome',
'A radar scanner under a weatherproof shell. She carries more than one because a '
+ 'single set blind astern of her own funnel is no use in the Western Approaches.'));
} else if (w.kind === 'uptake') {
const c = new THREE.Mesh(
new THREE.CylinderGeometry(len * 0.34, len * 0.40, h, 14), dark);
c.position.set(x, T.top + h / 2, 0);
wg.add(tag(c, 'funnel', 'Gas turbine uptake',
'The gas turbines do not sit in the machinery spaces at all — they are in a housing '
+ 'abaft the funnel, because their intake and exhaust are too big to trunk that far '
+ 'down through a passenger ship.'));
} else {
const wt = { uA: w.u0, uB: w.u1, half: () => half };
const band = w.kind === 'casing' ? null : [0.34, 0.80];
wg.add(wallLoft(perim(wt, Math.max(0.6, paneW * 0.5)), T.top, T.top + h,
band ? [0.0, band[0], band[0] + 0.03, band[1] - 0.03, band[1], 1.0]
: [0.0, 0.5, 1.0],
band || [2, 3], paneW * 1.3, 0.42));
wg.add(roofPlate(wt, T.top + h, roofsBareTop));
}
}
const wTag = tag(wg, 'superstructure', 'Deck works');
wTag.userData.part.what =
'What stands on the open top deck: machinery casings, the funnel housing, radar, and '
+ 'the deckhouses over the public rooms. Their positions and heights are read off a '
+ 'scale profile of the ship, one structure at a time.';
g.add(wTag);
}
if (S.funnels && !(S.year >= 1950)) {
const cowl = new THREE.MeshStandardMaterial({ color: 0xb8483a, roughness: 0.55, metalness: 0.15 });
const fst = drawnFunnelStations(S);
const caseR = S.beam * 0.115 * 1.34;
for (const f of [0.16, 0.30, 0.44, 0.58, 0.72, 0.86]) {
const u = top.uA + f * (top.uB - top.uA);
if (fst.some(uf => Math.abs(u - uf) * L < caseR + B * 0.06)) continue;
for (const side of [-1, 1]) {
const z = side * top.half(u) * 0.62;
const stem = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.017, B * 0.019, B * 0.15, 10), white);
stem.position.set((u - 0.5) * L, T.top + B * 0.075, z);
g.add(tag(stem, 'vent', 'Cowl ventilator'));
const bell = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.038, B * 0.017, B * 0.055, 12, 1, true), cowl);
bell.position.set((u - 0.5) * L, T.top + B * 0.165, z);
bell.rotation.z = side * 0.55;
g.add(tag(bell, 'vent', 'Cowl ventilator',
'Turned into the wind to drive air below. With a coal-fired boiler room, a galley and several hundred people under the deck and no mechanical ventilation at all, a ship needed a great many of them.'));
}
}
}
group.add(tag(g, 'superstructure'));
}
function buildRaisedEnds(S, group) {
if (!(S.wellM && S.houseAt && S.houseAt.length === 2 && S.decks)) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam, dh = S.deckM || B * 0.105;
const wellU = S.wellM / L;
const wallMat = new THREE.MeshStandardMaterial({
color: new THREE.Color(S.topside || '#3a3a3c'), roughness: 0.58, metalness: 0.22,
side: THREE.DoubleSide });
const deckMat = new THREE.MeshStandardMaterial({ color: 0xd3c9b4, roughness: 0.72, side: THREE.DoubleSide });
const railMat = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
const halfAt = u => Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]) - B * 0.015;
const up = new THREE.Vector3(0, 1, 0);
const mk = (u0, u1, label, what) => {
const g = new THREE.Group();
const N = Math.max(10, Math.round((u1 - u0) * L / 1.6));
const path = [];
for (let k = 0; k <= N; k++) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L, z: halfAt(u) }); }
path.push({ u: u1, x: (u1 - 0.5) * L, z: -halfAt(u1) });
for (let k = N; k >= 0; k--) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L, z: -halfAt(u) }); }
path.push({ u: u0, x: (u0 - 0.5) * L, z: halfAt(u0) });
const tp = [], ti = [];
for (const p of path) {
const ys = H.sheer(p.u);
tp.push(p.x, ys - dh * 0.15, p.z, p.x, ys + dh, p.z);
}
for (let k = 0; k + 1 < path.length; k++) {
const a = k * 2, b = a + 2;
ti.push(a, b, a + 1, a + 1, b, b + 1);
}
const wg = new THREE.BufferGeometry();
wg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
wg.setIndex(ti); wg.computeVertexNormals();
g.add(new THREE.Mesh(wg, wallMat));
const dp = [], di = [];
for (let k = 0; k <= N; k++) {
const u = u0 + (u1 - u0) * k / N, y = H.sheer(u) + dh, h = halfAt(u);
dp.push((u - 0.5) * L, y, -h, (u - 0.5) * L, y, h);
}
for (let k = 0; k < N; k++) { const a = k * 2, b = a + 2; di.push(a, b, a + 1, a + 1, b, b + 1); }
const dg = new THREE.BufferGeometry();
dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
dg.setIndex(di); dg.computeVertexNormals();
g.add(new THREE.Mesh(dg, deckMat));
const step = B * 0.22, Q = [];
let acc = 0; Q.push(path[0]);
for (let k = 1; k < path.length; k++) {
acc += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
if (acc >= step || k === path.length - 1) { Q.push(path[k]); acc = 0; }
}
for (const q of Q) {
const st = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.004, B * 0.004, dh * 0.30, 5), railMat);
st.position.set(q.x, H.sheer(q.u) + dh + dh * 0.15, q.z);
g.add(st);
}
for (let k = 0; k + 1 < Q.length; k++) {
const a = Q[k], b = Q[k + 1];
const len = Math.hypot(b.x - a.x, b.z - a.z);
if (len < 0.01) continue;
const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
const ym = (H.sheer(a.u) + H.sheer(b.u)) / 2 + dh;
for (const hf of [0.10, 0.20, 0.30]) {
const bar = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, len, 5), railMat);
bar.position.set((a.x + b.x) / 2, ym + dh * hf, (a.z + b.z) / 2);
bar.quaternion.setFromUnitVectors(up, dir);
g.add(bar);
}
}
group.add(tag(g, 'forecast', label, what));
};
const [hA, hB] = S.houseAt;
mk(0.004, hA - wellU, 'Forecastle',
'The shell carried one deck higher at the bow: anchor gear, windlass and the break of the deck. Between here and the bridge superstructure lies the forward well deck — on Titanic it was Third Class open space, and the first place the sea came aboard.');
mk(hB + wellU, 0.996, 'Poop deck',
'The raised aft deck, and on Titanic the last of her to stay dry. The aft well deck between the poop and the superstructure was Third Class promenade; the docking bridge stood here, from which she was conned going astern.');
}
function funnelStations(S) {
if (S.funnelAt && S.funnelAt.length) return S.funnelAt.slice();
const mu = (S.masts || []).map(m => m.at).sort((a, b) => a - b);
const slots = [];
if (!mu.length) return slots;
for (let i = 0; i < mu.length - 1; i++) slots.push((mu[i] + mu[i + 1]) / 2);
slots.push(Math.min(0.92, mu[mu.length - 1] + 0.14));
return slots;
}
function drawnFunnelStations(S) {
const n = S.funnels || 0;
if (!n) return [];
const slots = funnelStations(S), out = [];
for (let i = 0; i < n; i++)
out.push(slots.length ? (slots[i % slots.length] || 0.50)
: (n === 1 ? 0.50 : 0.42 + i * (0.20 / (n - 1))));
return out;
}
function buildFunnel(S, group) {
const n = S.funnels || 0;
if (!n) return;
const H = hullSurface(S);
const h = S.funnelH !== undefined ? S.funnelH : S.beam * 1.55;
const r = S.beam * 0.115;
const black = new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.62, metalness: 0.30 });
const band = new THREE.MeshStandardMaterial({ color: 0x8a3820, roughness: 0.55, metalness: 0.18 });
const stations = drawnFunnelStations(S);
const T = (S.decks && !S.turrets && !S.flightDeck) ? linerHouse(S) : null;
const rakeDeg = S.funnelRake !== undefined ? S.funnelRake : 4.87;
const th = rakeDeg * Math.PI / 180;
for (let i = 0; i < n; i++) {
const u = stations[i];
let y = H.sheer(u);
if (T && T.recorded)
for (const t of T.tiers) if (u >= t.uA && u <= t.uB) y = Math.max(y, t.y1);
const g = new THREE.Group();
const ri = r * ((S.funnelScale || [])[i] || 1);
const oval = S.funnelOval || 1;
const caseH = h * 0.085, caseR = ri * 1.34;
const casing = new THREE.Mesh(
new THREE.CylinderGeometry(caseR * 0.94, caseR, caseH, 20), black);
if (oval !== 1) casing.scale.x = oval;
casing.position.y = caseH / 2 - caseH * 0.35;
g.add(tag(casing, 'funnel', 'Boiler casing',
'The deckhouse over the fiddley. The uptakes from the boilers come up inside it.'));
const rootY = -caseH * 0.30, topY = caseH * 0.55 + h, L = topY - rootY;
const sg = new THREE.CylinderGeometry(ri * 0.93, ri, L, 24, 24);
const spos = sg.attributes.position, scol = [];
const warship = !!S.turrets;
const buff = new THREE.Color(warship ? 0x596066 : (S.buff || 0xd8cfbb)), cap = new THREE.Color(0x1b1b1d);
const capFrom = topY - (warship ? 0.12 : 0.20) * h;
for (let j = 0; j < spos.count; j++) {
const ya = spos.getY(j) + (topY + rootY) / 2;
const c = ya > capFrom ? cap : buff;
scol.push(c.r, c.g, c.b);
}
sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
if (oval !== 1) sg.scale(oval, 1, 1);
const shear = Math.tan(th);
sg.applyMatrix4(new THREE.Matrix4().set(
1, shear, 0, shear * L / 2,
0, 1,     0, 0,
0, 0,     1, 0,
0, 0,     0, 1));
const stack = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({
vertexColors: true, roughness: 0.66, metalness: 0.10 }));
stack.position.y = (topY + rootY) / 2;
g.add(tag(stack, 'funnel', 'Funnel',
'Buff with a black top. Funnel colours were a shipping line\'s registered trademark: at sea a hull is a silhouette long before a name can be read, so the livery at the head of the funnel is how a ship was known hull-down on the horizon.'));
const Lp = L - h * 0.08;
const pgeo = new THREE.CylinderGeometry(ri * 0.13, ri * 0.13, Lp, 16);
pgeo.applyMatrix4(new THREE.Matrix4().set(
1, shear, 0, shear * Lp / 2,
0, 1,     0, 0,
0, 0,     1, 0,
0, 0,     0, 1));
const pipe = new THREE.Mesh(pgeo, black);
pipe.position.set(-ri * 1.25, rootY + Lp / 2, 0);
g.add(tag(pipe, 'funnel', 'Steam pipe',
'The waste-steam pipe alongside the uptake — what actually roars when the safety '
+ 'valves lift.'));
g.position.set((u - 0.5) * S.lwl, y, 0);
group.add(tag(g, 'funnel'));
}
}
function buildCluster(S, group) {
const C = S.cluster;
if (!C) return;
const L = S.lwl, B = S.beam;
const T = S.decks ? linerHouse(S) : null;
const roof = T ? T.top : hullSurface(S).sheer(0.5);
const X = u => (u - 0.5) * L;
const g = new THREE.Group();
const white  = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60,
side: THREE.DoubleSide });
const glass  = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.22,
metalness: 0.55 });
const domeMt = new THREE.MeshStandardMaterial({ color: 0xeae8e2, roughness: 0.45 });
const finMt  = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.32,
metalness: 0.45 });
const wLower = B * 0.62, wUpper = B * 0.40;
const tierRoof = ti => (T && T.tiers[ti]) ? T.tiers[ti].y1 : roof;
const fairFootY = (C.fairFootTier !== undefined ? tierRoof(C.fairFootTier) : roof) - 0.25;
const supportAt = u => {
if (!C.blockU) return roof;
if (u <= C.blockU[1]) return C.blockTopM;
if (C.fairAftU !== undefined && u <= C.fairAftU) {
const s = (u - C.blockU[1]) / (C.fairAftU - C.blockU[1]);
return C.blockTopM + (fairFootY - C.blockTopM) * s;
}
return C.fairFootTier !== undefined ? tierRoof(C.fairFootTier) : roof;
};
const spineHalfAt = u => {
if (!C.blockU || C.fairAftU === undefined) return 0;
if (u <= C.blockU[1]) return wLower / 2;
if (u >= C.fairAftU) return 0;
const s = (u - C.blockU[1]) / (C.fairAftU - C.blockU[1]);
return 0.9 + (wLower * 0.42 - 0.9) * (1 - s) * (1 - s);
};
if (C.blockU && C.blockTopM - roof > 0.05) {
const [uA, uB] = C.blockU;
const h = C.blockTopM - roof;
const blk = new THREE.Mesh(new THREE.BoxGeometry((uB - uA) * L, h + 0.3, wLower), white);
blk.position.set((X(uA) + X(uB)) / 2, roof - 0.3 + (h + 0.3) / 2, 0);
g.add(tag(blk, 'cluster', 'Equipment block',
'The raised tier the cluster stands on. Its extent and height are derived from the plate; its width from the beam, a profile photograph having no width in it.'));
}
if (C.upperU) {
const [uA, uB] = C.upperU;
const h = C.upperTopM - C.blockTopM;
const blk = new THREE.Mesh(new THREE.BoxGeometry((uB - uA) * L, h + 0.2, wUpper), white);
blk.position.set((X(uA) + X(uB)) / 2, C.blockTopM - 0.2 + (h + 0.2) / 2, 0);
g.add(tag(blk, 'cluster', 'Mast block',
'The upper block the mast and forward radomes stand on. Derived from the plate.'));
}
if (C.glassFootU !== undefined && C.upperU) {
const x0 = X(C.glassFootU), y0 = C.blockTopM;
const x1 = X(C.upperU[0]),  y1 = C.upperTopM;
const run = x1 - x0, rise = y1 - y0, len = Math.hypot(run, rise);
const sheet = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.18, wUpper * 0.98), glass);
sheet.rotation.z = Math.atan2(rise, run);
sheet.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.05, 0);
g.add(tag(sheet, 'cluster', 'Glass sweep',
'The raked dark-glass sheet forward of the mast block. Angle and extent derived from the plate.'));
}
if (C.fairAftU !== undefined && C.blockU) {
const x0 = X(C.blockU[1]), x1 = X(C.fairAftU);
const hw = wLower * 0.42;
const sTop = s => C.blockTopM + (fairFootY - C.blockTopM) * s;
const sHalf = s => 0.9 + (hw - 0.9) * (1 - s) * (1 - s);
const N = 12, v = [];
const quad = (a, b, c, d) => { v.push(...a, ...b, ...c, ...a, ...c, ...d); };
for (let i = 0; i < N; i++) {
const s0 = i / N, s1 = (i + 1) / N;
const xA = x0 + (x1 - x0) * s0, xB = x0 + (x1 - x0) * s1;
const wA = sHalf(s0), wB = sHalf(s1);
const tA = sTop(s0), tB = sTop(s1);
quad([xA, tA, -wA], [xB, tB, -wB], [xB, fairFootY, -wB], [xA, fairFootY, -wA]);
quad([xA, fairFootY, wA], [xB, fairFootY, wB], [xB, tB, wB], [xA, tA, wA]);
quad([xA, tA, wA], [xB, tB, wB], [xB, tB, -wB], [xA, tA, -wA]);
quad([xA, fairFootY, -wA], [xB, fairFootY, -wB], [xB, fairFootY, wB], [xA, fairFootY, wA]);
}
quad([x0, fairFootY, -hw], [x0, C.blockTopM, -hw], [x0, C.blockTopM, hw], [x0, fairFootY, hw]);
const wg = new THREE.BufferGeometry();
wg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
wg.computeVertexNormals();
g.add(tag(new THREE.Mesh(wg, white), 'cluster', 'Stack fairing',
'The swept tail running the block roof down to the aft terrace. Profile derived from the plate — it crosses 22 m at u 0.679 and lands at the recorded foot; the plan taper is derived, the radome pairs standing either side of the spine.'));
}
if (C.stack) {
const K = C.stack;
const rakeF = -Math.tan((K.rakeFwdDeg || 0) * Math.PI / 180);
if (K.finU !== undefined) {
const finRoot = supportAt(K.finU) - 1.8;
const finH = K.finTopM - finRoot;
const fg = new THREE.BoxGeometry(K.finChordM || 4.2, finH, 3.4);
fg.applyMatrix4(new THREE.Matrix4().set(
1, rakeF, 0, rakeF * finH / 2,
0, 1,     0, 0,
0, 0,     1, 0,
0, 0,     0, 1));
const fin = new THREE.Mesh(fg, finMt);
fin.position.set(X(K.finU), finRoot + finH / 2, 0);
g.add(tag(fin, 'cluster', 'Stack casing',
'The dark raked casing the uptakes rise through. Height and rake derived from the plate.'));
}
const n = K.pipes || 4;
const [u0, u1] = K.uBase;
const steel = new THREE.Color(0xb9bcbf),
band = K.bandCol ? new THREE.Color(K.bandCol) : null,
rim = new THREE.Color(0x2a2c2e);
for (let i = 0; i < n; i++) {
const f = n === 1 ? 0 : i / (n - 1);
const u = u0 + (u1 - u0) * f;
const top = K.topFwdM + (K.topAftM - K.topFwdM) * f;
const rootY = supportAt(u) - 1.2;
const Lp = top - rootY, r = (K.pipeDiaM || 1.4) / 2;
const pg = new THREE.CylinderGeometry(r * 0.96, r, Lp, 20, 24);
const pos = pg.attributes.position, col = [];
for (let j = 0; j < pos.count; j++) {
const ya = pos.getY(j) + Lp / 2;
const c = ya > Lp - 0.25 ? rim
: (band && ya > Lp - 1.6 && ya < Lp - 0.9) ? band : steel;
col.push(c.r, c.g, c.b);
}
pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
pg.applyMatrix4(new THREE.Matrix4().set(
1, rakeF, 0, rakeF * Lp / 2,
0, 1,     0, 0,
0, 0,     1, 0,
0, 0,     0, 1));
const pipe = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({
vertexColors: true, roughness: 0.30, metalness: 0.85 }));
pipe.position.set(X(u), rootY + Lp / 2, 0);
g.add(tag(pipe, 'cluster', 'Exhaust pipe',
'One of the polished uptakes, raked forward as the plate shows — the lean measured off the photograph at about fifteen degrees, drawn as a shear so the base sits flat in its casing and the head stands at the derived height. The heights are derived; no drawing of this plant is published.'));
}
}
for (const d of C.domes || []) {
const base = d.upper ? C.upperTopM : (d.onTier !== undefined ? tierRoof(d.onTier) : roof);
const spine = (!d.upper && supportAt(d.u) > base + 0.1) ? spineHalfAt(d.u) : 0;
const off = Math.max(d.dM / 2 + 0.25, spine + d.dM / 2 + 0.5);
const stations = d.pair ? [[off, 0.55], [-off, -0.55]] : [[0, 0]];
for (const [dz, dx] of stations) {
const ped = new THREE.Mesh(
new THREE.CylinderGeometry(d.dM * 0.16, d.dM * 0.19, 0.9, 12), white);
ped.position.set(X(d.u) + dx, base + 0.2, dz);
g.add(tag(ped, 'cluster', 'Radome pedestal',
'Stands the dome clear of the deck wash. Derived from the plate.'));
const dome = new THREE.Mesh(new THREE.SphereGeometry(d.dM / 2, 24, 16), domeMt);
dome.position.set(X(d.u) + dx, base + 0.3 + d.dM / 2, dz);
g.add(tag(dome, 'cluster', 'Radome',
'A weatherproof shell over a stabilised satellite dish — the sphere is the cheapest shape that lets the antenna inside slew freely. Diameter, station and base height derived from the plate against the recorded length.'));
}
}
if (C.mast) {
const M = C.mast;
const rakeA = Math.tan((M.rakeAftDeg || 0) * Math.PI / 180);
const baseY = C.upperTopM - 0.4, headY = M.topM;
const Lm = headY - baseY, r0 = (M.baseDiaM || 2.7) / 2;
const mg = new THREE.CylinderGeometry(r0 * 0.22, r0, Lm, 20, 16);
mg.applyMatrix4(new THREE.Matrix4().set(
1, rakeA, 0, rakeA * Lm / 2,
0, 1,     0, 0,
0, 0,     1, 0,
0, 0,     0, 1));
const mastMesh = new THREE.Mesh(mg, white);
mastMesh.position.set(X(M.u), baseY + Lm / 2, 0);
g.add(tag(mastMesh, 'mast', 'Signal mast',
'The communications tower: no sail ever hung here. Height over water and the aft rake are derived from the plate — no published drawing gives them. A derived figure, labelled as one.'));
const axisX = y => X(M.u) + rakeA * (y - baseY);
(M.yardsM || []).forEach((yh, i) => {
const chord = 1.1 - i * 0.15, span = 7.5 - i * 1.5;
const plat = new THREE.Mesh(new THREE.BoxGeometry(chord, 0.14, span), white);
plat.position.set(axisX(yh), yh, 0);
g.add(tag(plat, 'mast', 'Spreader platform',
'Carries the aerials that must see past the mast. Heights derived from the plate.'));
if (i === (M.yardsM || []).length - 1) {
for (const dz of [-1.4, 1.4]) {
const sm = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), domeMt);
sm.position.set(axisX(yh), yh + 0.6, dz);
g.add(tag(sm, 'mast', 'Aerial dome', 'Small radome on the upper spreader. Derived.'));
}
}
});
if (M.whipM) {
const Lw = M.whipM - (headY - 0.3);
const wg2 = new THREE.CylinderGeometry(0.025, 0.05, Lw, 8);
wg2.applyMatrix4(new THREE.Matrix4().set(
1, rakeA, 0, rakeA * Lw / 2,
0, 1,     0, 0,
0, 0,     1, 0,
0, 0,     0, 1));
const whip = new THREE.Mesh(wg2, white);
whip.position.set(axisX(headY - 0.3), (headY - 0.3) + Lw / 2, 0);
g.add(tag(whip, 'mast', 'Masthead whip',
'The HF whip at the truck — the highest fitting aboard. Derived from the plate.'));
}
}
group.add(tag(g, 'cluster'));
}
function buildBoats(S, group, mats) {
if (S.boatsInboard) return;
const n = S.boats || 0;
if (!n) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const white = new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.62 });
const dark = new THREE.MeshStandardMaterial({ color: 0x2f3336, roughness: 0.55, metalness: 0.25 });
const boatL = S.boatLM || Math.min(B * 0.42, 9.0), boatB = boatL * 0.30;
const perSide = Math.max(1, Math.round(n / 2));
let gapPitch = boatL * 1.38;
const T = S.decks ? linerHouse(S) : null;
const recT = T ? T.tiers.find(t => t.recess) : null;
const topT = recT || (T ? T.tiers[T.n - 1] : null);
const u0A = topT ? topT.uA + 0.045 : null, u0B = topT ? topT.uB - 0.025 : null;
let ps = perSide;
if (topT) {
const avail = (u0B - u0A) * L;
if ((ps - 1) * gapPitch > avail)
gapPitch = Math.max(boatL * 1.30, avail / Math.max(1, ps - 1));
if ((ps - 1) * gapPitch > avail) ps = Math.floor(avail / gapPitch) + 1;
}
const span = topT ? (ps - 1) * gapPitch / L
: Math.min(0.58, (ps - 1) * gapPitch / L);
const uMid = topT ? (u0A + u0B) / 2 : 0.5;
for (let i = 0; i < ps; i++) {
const u = uMid - span / 2 + (i / Math.max(1, ps - 1)) * span;
const deckY = recT ? recT.y0 + 0.15 : (topT ? topT.y1 : H.sheer(u));
const half = topT ? topT.half(u)
: Math.abs(surfacePoint(S, H, Math.max(0.01, Math.min(0.99, u)), 1.0)[2]);
for (const sgn of [-1, 1]) {
const z = sgn * (recT ? half - boatB * 0.35 : half - B * 0.045);
const bg = new THREE.SphereGeometry(boatL / 2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
bg.scale(1.0, 0.42, boatB / boatL);
bg.rotateX(Math.PI);
const bt = new THREE.Mesh(bg, white);
bt.position.set((u - 0.5) * L, deckY + boatL * 0.21 + 0.10, z);
group.add(tag(bt, 'boat', 'Ship\'s boat',
recT
? 'Stowed in an open gallery cut into the superstructure — SOLAS pushed a modern liner\'s boats down from the roof to where the sea is nearer and the embarkation shorter. On Queen Mary 2 the drop is still about 24 m, among the longest afloat, and she carries a rating for it.'
: 'Stowed under davits on the boat deck. Board of Trade rules scaled boats to TONNAGE rather than to the number of people aboard, and were not revised as ships grew — which is why Titanic sailed legally with 20 boats for 2,224 souls.'));
if (recT) continue;
for (const d of [-0.34, 0.34]) {
const pts = [];
for (let k = 0; k <= 8; k++) {
const t = k / 8;
pts.push(new THREE.Vector3(0, t * B * 0.16, Math.pow(t, 2.2) * B * 0.085));
}
const dg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, B * 0.007, 5, false);
const dv = new THREE.Mesh(dg, dark);
dv.position.set((u - 0.5) * L + d * boatL, deckY, z);
dv.scale.z = sgn;
group.add(tag(dv, 'boat', 'Davit',
'Curved, because the boat has to clear a ship\'s side that flares or tumbles home on its way down. A straight arm would foul the hull or have to be absurdly long.'));
}
}
}
}
function buildScrews(S, group) {
const n = S.screws || 0;
if (!n) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam, D = S.draught;
const p = surfacePoint(S, H, 1.0, 0);
const bronze = new THREE.MeshStandardMaterial({ color: 0xa8845c, roughness: 0.38,
metalness: 0.82 });
const r = Math.min(D * 0.55, B * 0.20) / 2;
const y = -D * 0.62;
const zs = n === 1 ? [0]
: n === 2 ? [-B * 0.16, B * 0.16]
: n === 3 ? [0, -B * 0.18, B * 0.18]
:           [-B * 0.10, B * 0.10, -B * 0.23, B * 0.23];
const bladeGeo = new THREE.SphereGeometry(1, 8, 6);
zs.forEach((z, i) => {
const scr = new THREE.Group();
const x = p[0] - L * (Math.abs(z) > B * 0.12 ? 0.085 : 0.060);
const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.20, r * 0.55, 8),
bronze);
hub.rotation.z = Math.PI / 2;
scr.add(hub);
for (let b = 0; b < 5; b++) {
const arm = new THREE.Group();
const bl = new THREE.Mesh(bladeGeo, bronze);
bl.scale.set(r * 0.16, r * 0.52, r * 0.34);
bl.position.y = r * 0.55;
bl.rotation.y = 0.55;
arm.add(bl);
arm.rotation.x = b * Math.PI * 2 / 5;
scr.add(arm);
}
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.10, r * 0.10, L * 0.035, 6),
bronze);
shaft.rotation.z = Math.PI / 2;
shaft.position.x = -L * 0.0175;
scr.add(shaft);
scr.position.set(x, y, z);
group.add(tag(scr, 'screw', 'Screw',
'Manganese bronze, below the waterline. What she has instead of everything the sailing fleet carries aloft.'));
});
}
function landingStrip(S) {
const L = S.lwl, deckW = S.flightDeck;
return { cx: L * 0.14, cz: -deckW * 0.177, rot: -0.157,
halfLen: L * 0.31, halfW: deckW * 0.105 };
}
function buildFlightDeck(S, group, mats) {
if (!S.flightDeck) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const deckW = S.flightDeck;
const HAZE = 0x848a8e;
const grey = new THREE.MeshStandardMaterial({ color: 0x4e5357, roughness: 0.99, metalness: 0.0 });
const dark = new THREE.MeshStandardMaterial({ color: HAZE, roughness: 0.70, metalness: 0.15 });
const line = new THREE.MeshStandardMaterial({ color: 0xd6d2c4, roughness: 0.85, metalness: 0.0 });
const y = H.sheer(0.5) + B * 0.10;
const dkL = S.flightDeckLen || L * 1.02;
const dkCx = S.flightDeckLen ? (-L / 2 + H.rake(0) + S.loa - dkL / 2) : 0;
const fd = new THREE.Mesh(new THREE.BoxGeometry(dkL, B * 0.045, deckW), grey);
fd.position.set(dkCx, y, 0);
group.add(tag(fd, 'flightdeck', 'Flight deck',
'It overhangs the hull on both sides — which is why a carrier\'s waterline beam and its flight-deck beam are entirely different numbers.'));
const caseMat = new THREE.MeshStandardMaterial({ color: HAZE, roughness: 0.62,
metalness: 0.25, side: THREE.DoubleSide });
const hg = new THREE.Group();
const NUH = 36, u0 = 0.05, u1 = 0.95;
const yTopC = y - B * 0.020;
const hzAt = u => Math.abs(surfacePoint(S, H, u, 1.0)[2]) * 0.995;
for (const sgn of [-1, 1]) {
const pos2 = [], idx2 = [];
for (let i = 0; i <= NUH; i++) {
const u = u0 + (i / NUH) * (u1 - u0);
const sp = surfacePoint(S, H, u, 1.0);
pos2.push(sp[0], sp[1] - B * 0.012, sgn * hzAt(u),
sp[0], yTopC,             sgn * hzAt(u));
}
for (let i = 0; i < NUH; i++) {
const a = i * 2;
idx2.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
}
const wg = new THREE.BufferGeometry();
wg.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
wg.setIndex(idx2); wg.computeVertexNormals();
hg.add(new THREE.Mesh(wg, caseMat));
}
for (const ue of [u0, u1]) {
const spe = surfacePoint(S, H, ue, 1.0);
const cap = new THREE.Mesh(
new THREE.BoxGeometry(L * 0.004, yTopC - (spe[1] - B * 0.012), 2 * hzAt(ue)), caseMat);
cap.position.set(spe[0], (yTopC + spe[1] - B * 0.012) / 2, 0);
hg.add(cap);
}
const openMat = new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.92 });
for (const [uo, sgn] of [[0.30, 1], [0.62, 1], [0.44, -1]]) {
const spo = surfacePoint(S, H, uo, 1.0);
const gapH = yTopC - (spo[1] - B * 0.012);
const door = new THREE.Mesh(
new THREE.BoxGeometry(L * 0.045, gapH * 0.55, B * 0.006), openMat);
door.position.set(spo[0], spo[1] + gapH * 0.42, sgn * (hzAt(uo) + B * 0.002));
hg.add(door);
}
group.add(tag(hg, 'hangar', 'Hangar and gallery decks',
'The space between the hull and the flight deck is built, not air: the hangar bays and the gallery decks around them. The deck-edge lifts open into it, which is why its sides are doors.'));
const LS = landingStrip(S);
const aftX = Math.cos(LS.rot), aftZ = -Math.sin(LS.rot);
for (const edge of [-1, 1]) {
const ang = new THREE.Mesh(new THREE.BoxGeometry(L * 0.62, B * 0.004, deckW * 0.010), line);
ang.position.set(LS.cx, y + B * 0.025, LS.cz + edge * LS.halfW);
ang.rotation.y = LS.rot;
group.add(tag(ang, 'flightdeck', 'Angled landing area',
'Angled about nine degrees to port so an aircraft that misses the arrestor wires flies off the bow and goes round again, instead of into the aircraft parked forward. It is what made jet operation possible.'));
}
const isl = new THREE.Group();
const glassI = new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
const radarM = new THREE.MeshStandardMaterial({ color: 0x6f7780, roughness: 0.85 });
const islW = deckW * 0.105;
const tiers = [[L * 0.115, islW,        B * 0.155, 0.0],
[L * 0.090, islW * 0.90, B * 0.105, -L * 0.006],
[L * 0.052, islW * 0.78, B * 0.080, -L * 0.014]];
const CANT = 0.10, CHAM = 1.1, NP = 11, PIER = 0.15, REV = 0.28;
let yB = 0;
const lv = tiers.map(t => {
const o = { y0: yB, h: t[2], a: t[0] / 2, b: t[1] / 2, cx: t[3] };
o.run = Math.min(t[0] * 0.47, o.a - o.h * CANT - CHAM - PIER);
yB += t[2];
return o;
});
const sta = [];
lv.forEach((v, ti) => {
sta.push({ v, y: v.y0, d: 0 });
if (ti >= 1) {
const lo = v.y0 + v.h * 0.49, hi = v.y0 + v.h * 0.79;
sta.push({ v, y: lo, d: 0 }, { v, y: lo + 0.02, d: REV },
{ v, y: hi - 0.02, d: REV }, { v, y: hi, d: 0 });
}
sta.push({ v, y: v.y0 + v.h, d: 0 });
});
const ring = (st) => {
const v = st.v, sh = v.h * CANT * ((st.y - v.y0) / v.h);
const a = v.a - sh, b = v.b - sh, c = v.cx, d = st.d;
const pts = [];
const P = (x, z, w) => pts.push([x, z, !!w]);
const edges = [];
for (let j = 0; j <= NP; j++) {
const xj = v.run - (j / NP) * 2 * v.run;
edges.push([xj + PIER, j > 0], [xj + PIER, false],
[xj - PIER, false], [xj - PIER, j < NP]);
}
P(c + a, -(b - CHAM)); P(c + a, -(b - CHAM));
P(c + a, b - CHAM);    P(c + a, b - CHAM);
P(c + a - CHAM, b);    P(c + a - CHAM, b);
edges.forEach(([x, w]) => P(c + x, b - (w ? d : 0), w));
P(c - a + CHAM, b);    P(c - a + CHAM, b);
P(c - a, b - CHAM);    P(c - a, b - CHAM);
P(c - a, -(b - CHAM)); P(c - a, -(b - CHAM));
P(c - a + CHAM, -b);   P(c - a + CHAM, -b);
edges.slice().reverse().forEach(([x, w]) => P(c + x, -(b - (w ? d : 0)), w));
P(c + a - CHAM, -b);   P(c + a - CHAM, -b);
return pts;
};
const K = 16 + 8 * (NP + 1), pos = [], flag = [];
const rings = sta.map(st => ring(st));
const addRing = (r, ya) => { const base = pos.length / 3;
r.forEach(([x, z, w]) => { pos.push(x, ya, z); flag.push(w); }); return base; };
const bases = sta.map((st, i) => addRing(rings[i], st.y));
const iDark = [], iGlass = [];
const row = (A, Bq, glassRow) => {
for (let k = 0; k < K; k++) {
const a2 = A + k, b2 = A + (k + 1) % K;
const pane = glassRow && flag[a2] && flag[b2];
(pane ? iGlass : iDark).push(a2, Bq + k, b2, b2, Bq + k, Bq + (k + 1) % K);
}
};
const shared = s => sta[s].v === sta[s + 1].v && sta[s].d === sta[s + 1].d;
for (let s = 0; s < sta.length - 1; s++)
if (shared(s))
row(bases[s], bases[s + 1], sta[s].d > 0);
for (let s = 0; s < sta.length - 1; s++)
if (!shared(s))
row(addRing(rings[s], sta[s].y), addRing(rings[s + 1], sta[s + 1].y), false);
const R0 = addRing(rings[0], 0);
const c0 = pos.length / 3; pos.push(lv[0].cx, 0, 0); flag.push(false);
for (let k = 0; k < K; k++) iDark.push(c0, R0 + k, R0 + (k + 1) % K);
const RT = addRing(rings[sta.length - 1], yB);
const cT = pos.length / 3; pos.push(lv[2].cx, yB, 0); flag.push(false);
for (let k = 0; k < K; k++) iDark.push(cT, RT + (k + 1) % K, RT + k);
const tg = new THREE.BufferGeometry();
tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
tg.setIndex(iDark.concat(iGlass));
tg.addGroup(0, iDark.length, 0);
tg.addGroup(iDark.length, iGlass.length, 1);
tg.computeVertexNormals();
isl.add(new THREE.Mesh(tg, [dark, glassI]));
for (const zz of [-islW * 0.22, islW * 0.22]) {
const up = new THREE.Mesh(
new THREE.BoxGeometry(L * 0.020, B * 0.115, islW * 0.34), dark);
up.position.set(L * 0.038, tiers[0][2] + B * 0.0575, zz);
isl.add(up);
}
for (const f of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
const pan = new THREE.Mesh(
new THREE.BoxGeometry(f[0] ? L * 0.008 : L * 0.016, B * 0.058,
f[0] ? islW * 0.55 : islW * 0.06), radarM);
const py = tiers[0][2] + B * 0.052;
const vv = lv[1], sh2 = vv.h * CANT * ((py - vv.y0) / vv.h);
if (f[0]) {
pan.position.set(vv.cx + f[0] * (vv.a - sh2 - L * 0.004 + 0.19), py, 0);
pan.rotation.z = f[0] * CANT;
} else {
pan.position.set(vv.cx, py, f[1] * (vv.b - sh2 + islW * 0.006));
pan.rotation.x = -f[1] * CANT;
}
isl.add(pan);
}
const mastTop = tiers.reduce((a, t) => a + t[2], 0);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.005, B * 0.011, B * 0.26, 8), dark);
mast.position.set(-L * 0.014, mastTop + B * 0.13, 0);
isl.add(mast);
for (const yq of [0.10, 0.19]) {
const yard = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, islW * (1.05 - yq * 2.0), 6), dark);
yard.rotation.x = Math.PI / 2;
yard.position.set(-L * 0.014, mastTop + B * yq, 0);
isl.add(yard);
}
isl.position.set(L * 0.06, y + B * 0.022, deckW * 0.40);
group.add(tag(isl, 'island', 'The island',
'Everything that cannot be under the deck: bridge, flying control, uptakes and radar. It is to starboard because a going-around aircraft swings to port.'));
for (const u of [0.30, 0.62]) {
const lift = new THREE.Mesh(new THREE.BoxGeometry(L * 0.055, B * 0.008, deckW * 0.13), grey);
lift.position.set((u - 0.5) * L, y + B * 0.0225, deckW * 0.44);
group.add(tag(lift, 'flightdeck', 'Deck-edge lift',
'Aircraft come up from the hangar on the deck edge rather than through the middle, so a lift out of action does not cut the flight deck in half. Flush with the deck when raised — it is a piece of the deck that moves.'));
}
const paintW = new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.95 });
const paintY = new THREE.MeshStandardMaterial({ color: 0xc8a63a, roughness: 0.95 });
const yTop = y + B * 0.024;
const cl = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, B * 0.003, deckW * 0.012), paintW);
cl.position.set(LS.cx, yTop, LS.cz);
cl.rotation.y = LS.rot;
group.add(tag(cl, 'flightdeck', 'Landing centreline',
'The line a pilot flies down on approach. It runs along the angled deck, not the ship.'));
const fl = new THREE.Mesh(new THREE.BoxGeometry(L * 0.52, B * 0.003, deckW * 0.008), paintY);
fl.position.set(LS.cx - L * 0.01, yTop, LS.cz + deckW * 0.16);
fl.rotation.y = LS.rot;
group.add(tag(fl, 'flightdeck', 'Foul line',
'Nothing and nobody may be inside this line while an aircraft is coming aboard.'));
for (let w = 0; w < 3; w++) {
const along = L * (0.185 + w * 0.04);
const wire = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.0025, B * 0.0025, deckW * 0.24, 5),
new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.6, metalness: 0.5 }));
wire.rotation.x = Math.PI / 2;
wire.rotation.y = LS.rot;
wire.position.set(LS.cx + along * aftX, yTop + B * 0.002, LS.cz + along * aftZ);
group.add(tag(wire, 'flightdeck', 'Arrestor wire',
'A hook catches one of three and pays it out against the arresting engine below decks: about 240 km/h to a stop in roughly a hundred metres.'));
}
for (const c of [[-0.30, -deckW * 0.22], [-0.30, deckW * 0.10], [-0.06, -deckW * 0.26]]) {
const cat = new THREE.Mesh(new THREE.BoxGeometry(L * 0.28, B * 0.003, deckW * 0.020), paintW);
cat.position.set(c[0] * L, yTop, c[1]);
if (c[0] > -0.2) cat.rotation.y = LS.rot;
group.add(tag(cat, 'flightdeck', 'Catapult track',
'Electromagnetic on this class rather than steam. A linear motor can be tuned to the aircraft, so it will throw something light without tearing it apart.'));
}
if (S.deckPark) buildDeckPark(S, group, y);
}
function airframeGeometries() {
const stations = [
[-11.0, 0.10, 0.10, 1.55],
[ -9.2, 0.52, 0.50, 1.55],
[ -6.0, 0.95, 0.72, 1.52],
[ -3.0, 0.95, 0.75, 1.55],
[  0.5, 0.95, 0.72, 1.52],
[  4.0, 0.85, 0.62, 1.47],
[  7.5, 0.48, 0.38, 1.42]];
const K = 12, pos = [], idx = [];
const se = (v, m) => m * Math.sign(v) * Math.pow(Math.abs(v), 2 / 2.5);
stations.forEach(([x, w, h, yc]) => {
for (let k = 0; k < K; k++) { const th = (k / K) * 2 * Math.PI;
pos.push(x, yc + se(Math.sin(th), h), se(Math.cos(th), w)); }
});
for (let s = 0; s < stations.length - 1; s++)
for (let k = 0; k < K; k++) {
const a = s * K + k, b = s * K + (k + 1) % K;
idx.push(a, a + K, b, b, a + K, b + K);
}
const c0 = pos.length / 3; pos.push(-11.0, 1.55, 0);
for (let k = 0; k < K; k++) idx.push(c0, k, (k + 1) % K);
const c1 = pos.length / 3; pos.push(7.5, 1.42, 0);
const last = (stations.length - 1) * K;
for (let k = 0; k < K; k++) idx.push(c1, last + (k + 1) % K, last + k);
const fus = new THREE.BufferGeometry();
fus.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
fus.setIndex(idx); fus.computeVertexNormals();
const plate = (pts, t) => {
const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
g.translate(0, 0, -t / 2);
return g;
};
return {
fus,
canopy: new THREE.SphereGeometry(1, 8, 6),
wing: plate([[-4.2, 1.0], [-2.4, 1.6], [-0.6, 4.3], [1.4, 4.3], [1.6, 1.0]], 0.15),
tip: plate([[-0.6, 0.0], [1.4, 0.0], [1.05, 1.9], [0.5, 2.4], [-0.3, 2.4]], 0.13),
fin: plate([[3.6, 0.0], [5.2, 2.9], [6.5, 2.9], [6.7, 1.0], [6.3, 0.0]], 0.16),
stab: plate([[5.3, 0.5], [6.5, 2.3], [7.4, 2.3], [7.8, 1.2], [7.6, 0.5]], 0.12),
};
}
function buildAircraft(mats, G) {
const ac = new THREE.Group();
ac.add(new THREE.Mesh(G.fus, mats.acSkin));
const can = new THREE.Mesh(G.canopy, mats.acGlass);
can.scale.set(1.5, 0.55, 0.62); can.position.set(-4.6, 2.30, 0);
ac.add(can);
for (const s of [-1, 1]) {
const wing = new THREE.Mesh(G.wing, mats.acSkin);
wing.rotation.x = s * Math.PI / 2;
wing.position.y = 2.0;
ac.add(wing);
const tip = new THREE.Mesh(G.tip, mats.acSkin);
tip.rotation.x = s * 0.25;
tip.position.set(0, 2.0, s * 4.3);
ac.add(tip);
const fin = new THREE.Mesh(G.fin, mats.acSkin);
fin.rotation.x = s * 0.30;
fin.position.set(0, 2.05, s * 0.78);
ac.add(fin);
const stab = new THREE.Mesh(G.stab, mats.acSkin);
stab.rotation.x = s * Math.PI / 2;
stab.position.y = 1.5;
ac.add(stab);
const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.25, 6), mats.acDark);
mg.position.set(1.1, 0.62, s * 0.92); ac.add(mg);
}
const ng = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 6), mats.acDark);
ng.position.set(-6.3, 0.43, 0); ac.add(ng);
return ac;
}
function buildDeckPark(S, group, yDeck) {
const L = S.lwl, deckW = S.flightDeck;
const mats = {
acSkin:  new THREE.MeshStandardMaterial({ color: 0x646b71, roughness: 0.88, metalness: 0.10 }),
acGlass: new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 }),
acDark:  new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.70, metalness: 0.20 }),
};
const spots = [
[-0.43, 0.30, 2.45], [-0.38, 0.30, 2.30], [-0.33, 0.30, 2.55], [-0.28, 0.30, 2.40],
[ 0.19, 0.33, 1.85], [ 0.245, 0.33, 2.05], [ 0.30, 0.33, 1.90], [ 0.355, 0.33, 2.10],
[ 0.40, 0.23, 2.95], [ 0.455, 0.23, 3.05], [ 0.40, 0.32, 2.90], [ 0.455, 0.32, 3.10],
];
const yTop = yDeck + S.beam * 0.0225;
const G = airframeGeometries();
for (let i = 0; i < Math.min(S.deckPark, spots.length); i++) {
const ac = buildAircraft(mats, G);
ac.position.set(spots[i][0] * L, yTop, spots[i][1] * deckW);
ac.rotation.y = spots[i][2];
group.add(tag(ac, 'aircraft'));
}
}
function turretStations(S) {
const n = S.turrets || 0;
if (S.turretAt && S.turretAt.length) return S.turretAt.slice(0, n);
return (n === 3 ? [0.24, 0.34, 0.78] : [0.22, 0.32, 0.70, 0.80]).slice(0, n);
}
function turretRadius(S) {
return Math.min(S.beam * 0.22, (S.calibre || 0.40) * 15.4);
}
function gunhouse(S, R, cal, barrels, riser, mats) {
const B = S.beam;
const steel = mats.turretSteel || (mats.turretSteel =
new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
const dark = mats.turretDark || (mats.turretDark =
new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
const g = new THREE.Group();
const barbH = R * 0.55 + riser + 0.5;
const barb = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, barbH, 20), dark);
barb.position.y = R * 0.55 - barbH / 2;
g.add(tag(barb, 'turret', 'Barbette',
'The armoured cylinder running down to the magazine. The turret revolves on top of it; this is the part that actually carries the load and the armour.'));
const tur = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.78, R * 1.05, R * 0.62, 20), steel);
tur.position.y = R * 0.83;
tur.scale.x = 1.28;
g.add(tag(tur, 'turret', 'Turret',
'Gunhouse for the main battery. Its face carries the heaviest armour on the ship, because that is what an enemy shell is aimed at.'));
const barrelL = cal * (S.calLen || 45);
for (let b = 0; b < barrels; b++) {
const off = (b - (barrels - 1) / 2) * cal * 2.6;
const gun = new THREE.Mesh(
new THREE.CylinderGeometry(cal * 0.52, cal * 0.62, barrelL, 12), dark);
gun.rotation.z = Math.PI / 2;
gun.position.set(-(R * 0.85 + barrelL / 2 - R * 0.45), R * 0.90, off);
g.add(tag(gun, 'turret', 'Main gun',
'The calibre is the ship. Everything else — the armour, the beam, the displacement — is arranged around carrying these and surviving their equals.'));
}
if (cal >= 0.2) {
const rf = new THREE.Mesh(
new THREE.CylinderGeometry(cal * 0.55, cal * 0.55, R * 2 + cal * 2, 10), dark);
rf.rotation.x = Math.PI / 2;
rf.position.set(R * 0.72, R * 1.05, 0);
g.add(tag(rf, 'turret', 'Turret rangefinder',
'The optical rangefinder across the rear of the gunhouse — its ears stick out both sides. Yamato\'s were 15 m across, the largest ever put in a turret.'));
}
return g;
}
function buildTurrets(S, group, mats) {
const n = S.turrets || 0;
if (!n) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const cal = S.calibre || 0.40;
const barrels = S.barrels || 3;
const stations = turretStations(S);
const raise = S.turretRaise || stations.map((u, i) => (n >= 3 && i === 1) ? 1 : 0);
const sides = S.turretSide || [];
stations.forEach((u, i) => {
const base = H.sheer(u);
const raised = raise[i] ? B * 0.085 : 0;
const R = turretRadius(S);
const side = sides[i] || 0;
const g = gunhouse(S, R, cal, barrels, raised, mats);
const z = side ? side * (Math.abs(surfacePoint(S, H, u, 1.0)[2]) - R * 1.02) : 0;
g.position.set((u - 0.5) * L, base + raised, z);
if (!side && u > 0.5) g.rotation.y = Math.PI;
group.add(tag(g, 'turret'));
});
}
function buildCitadel(S, group, mats) {
if (!S.turrets) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const stations = turretStations(S);
const R = turretRadius(S);
const tSides = S.turretSide || [];
const centre = stations.filter((u, i) => !tSides[i]);
const wings = stations.map((u, i) => ({ u, s: tSides[i] || 0 })).filter(w => w.s)
.map(w => ({ u: w.u, z: Math.abs(surfacePoint(S, H,
Math.max(0.001, Math.min(0.999, w.u)), 1.0)[2]) - R * 1.02 }));
const fwd = centre.filter(u => u < 0.5), aft = centre.filter(u => u >= 0.5);
const m = (R * 1.40) / L;
let uA = fwd.length ? Math.max(...fwd) + m : 0.36;
let uB = aft.length ? Math.min(...aft) - m : 0.68;
const towerU = S.towerAt !== undefined ? S.towerAt
: (S.masts && S.masts[0]) ? S.masts[0].at : (uA + 0.03);
uA = Math.min(uA, towerU - (B * 0.20) / L);
const wall = new THREE.MeshStandardMaterial({ color: 0x666c73, roughness: 0.60, metalness: 0.22,
side: THREE.DoubleSide });
const dark = new THREE.MeshStandardMaterial({ color: 0x4b5157, roughness: 0.58, metalness: 0.25 });
const glaze = new THREE.MeshStandardMaterial({ color: 0x171b1f, roughness: 0.35, metalness: 0.30 });
(S.secondaries || []).forEach(sec => {
if (sec.wing) return;
const rB = (B * (sec.scale || 0.085) * 1.15) / L;
uA = Math.min(uA, sec.at - rB);
uB = Math.max(uB, sec.at + rB);
});
const g = new THREE.Group();
const base = H.sheer((uA + uB) / 2);
const dh = B * 0.080;
const tierHalf = (u, t) => {
const full = Math.max(B * 0.06,
Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]) - B * 0.06
- t * B * 0.045);
let half = full;
for (const w of wings) {
const du = Math.abs(u - w.u) * L, hard = R * 1.40, reach = R * 1.75;
if (du >= reach) continue;
const capW = Math.max(B * 0.055, w.z - R * 1.12);
const e = Math.max(0, (du - hard) / (reach - hard));
half = Math.min(half, capW + (full - capW) * e * e);
}
return half;
};
const tiers = [[uA, uB], [uA + 0.012, uB - 0.045]];
const tierTop = [];
tiers.forEach(([a, b], t) => {
const NU = 40;
const y0 = base + dh * t - (t === 0 ? 0.4 : 0);
const y1 = base + dh * (t + 1);
const tp = [], ti = [];
for (let k = 0; k <= NU; k++) {
const u = a + (b - a) * k / NU;
const half = tierHalf(u, t);
const x = (u - 0.5) * L;
tp.push(x, y0, -half,  x, y0, half,  x, y1, -half,  x, y1, half);
}
for (let k = 0; k < NU; k++) {
const A0 = k * 4, B0 = A0 + 4;
ti.push(A0, B0, A0 + 2,  A0 + 2, B0, B0 + 2);
ti.push(A0 + 1, A0 + 3, B0 + 1,  A0 + 3, B0 + 3, B0 + 1);
ti.push(A0 + 2, B0 + 2, A0 + 3,  A0 + 3, B0 + 2, B0 + 3);
}
for (const e of [0, NU * 4]) ti.push(e, e + 2, e + 1,  e + 1, e + 2, e + 3);
const tg = new THREE.BufferGeometry();
tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
tg.setIndex(ti); tg.computeVertexNormals();
g.add(tag(new THREE.Mesh(tg, wall), 'superstructure',
t === 0 ? 'Citadel deck' : 'Shelter deck'));
tierTop.push(y1);
});
const towerH = S.towerH !== undefined ? S.towerH : B * 0.55;
const K = Math.max(2, Math.min(6, Math.round(towerH / (B * 0.11))));
const tx = (towerU - 0.5) * L;
const levels = [];
let y = tierTop[0];
for (let k = 0; k < K; k++) {
const f = k / Math.max(1, K - 1);
const w = B * (0.34 - 0.20 * f), d = B * (0.40 - 0.22 * f);
const lh = (base + towerH - tierTop[0]) / K;
levels.push({ y0: y, lh, w, d });
y += lh;
}
{
const PIER = 0.15, REV = 0.28, HEEL = 0.30;
const sec = levels.map((lv, k) => {
const a = lv.d / 2, b = lv.w / 2;
const cf = b * 0.42, cb = b * 0.22;
return {
y0: lv.y0, y1: lv.y0 + lv.lh, a, b, cf, cb,
xr: Math.min(a * 0.45, a - cf - PIER - 0.10, a - cb - PIER - 0.10),
zr: Math.max(0.30, b - cf - PIER - 0.10),
win: k >= K - 2
};
});
const NS = Math.max(2, Math.round(sec[K - 1].xr / 0.55));
const NF = Math.max(2, Math.round(sec[K - 1].zr / 0.55));
const sta = [];
sec.forEach((v, k) => {
sta.push({ v, y: k ? v.y0 : v.y0 - HEEL, d: 0 });
if (v.win) {
const lo = v.y0 + (v.y1 - v.y0) * 0.47, hi = v.y0 + (v.y1 - v.y0) * 0.77;
sta.push({ v, y: lo, d: 0 }, { v, y: lo + 0.02, d: REV },
{ v, y: hi - 0.02, d: REV }, { v, y: hi, d: 0 });
}
sta.push({ v, y: v.y1, d: 0 });
});
const ring = (st) => {
const v = st.v, a = v.a, b = v.b, cf = v.cf, cb = v.cb, d = st.d;
const pts = [];
const P = (x, z, w) => pts.push([x, z, !!w]);
const runE = (r, n) => {
const e = [];
for (let j = 0; j <= n; j++) {
const t = r - (j / n) * 2 * r;
e.push([t + PIER, j > 0], [t + PIER, false],
[t - PIER, false], [t - PIER, j < n]);
}
return e;
};
const sE = runE(v.xr, NS), fE = runE(v.zr, NF);
P(a, -(b - cb)); P(a, -(b - cb));
P(a, b - cb);    P(a, b - cb);
P(a - cb, b);    P(a - cb, b);
sE.forEach(([x, w]) => P(x, b - (w ? d : 0), w));
P(-a + cf, b);   P(-a + cf, b);
P(-a, b - cf);   P(-a, b - cf);
fE.forEach(([z, w]) => P(-a + (w ? d : 0), z, w));
P(-a, -(b - cf)); P(-a, -(b - cf));
P(-a + cf, -b);   P(-a + cf, -b);
sE.slice().reverse().forEach(([x, w]) => P(x, -(b - (w ? d : 0)), w));
P(a - cb, -b);   P(a - cb, -b);
return pts;
};
const pos = [], flag = [];
const rings = sta.map(st => ring(st));
const KP = rings[0].length;
const addRing = (r, ya) => {
const b0 = pos.length / 3;
r.forEach(([x, z, w]) => { pos.push(x, ya, z); flag.push(w); });
return b0;
};
const bases = sta.map((st, i) => addRing(rings[i], st.y));
const iWall = [], iGlass = [];
const row = (A, Bq, glassRow) => {
for (let k = 0; k < KP; k++) {
const a2 = A + k, b2 = A + (k + 1) % KP;
const pane = glassRow && flag[a2] && flag[b2];
(pane ? iGlass : iWall).push(a2, Bq + k, b2, b2, Bq + k, Bq + (k + 1) % KP);
}
};
const shared = s => sta[s].v === sta[s + 1].v && sta[s].d === sta[s + 1].d;
for (let s = 0; s < sta.length - 1; s++)
if (shared(s)) row(bases[s], bases[s + 1], sta[s].d > 0);
for (let s = 0; s < sta.length - 1; s++)
if (!shared(s))
row(addRing(rings[s], sta[s].y), addRing(rings[s + 1], sta[s + 1].y), false);
const R0 = addRing(rings[0], sta[0].y);
const c0 = pos.length / 3; pos.push(0, sta[0].y, 0); flag.push(false);
for (let k = 0; k < KP; k++) iWall.push(c0, R0 + k, R0 + (k + 1) % KP);
const RT = addRing(rings[sta.length - 1], sta[sta.length - 1].y);
const cT = pos.length / 3; pos.push(0, sta[sta.length - 1].y, 0); flag.push(false);
for (let k = 0; k < KP; k++) iWall.push(cT, RT + (k + 1) % KP, RT + k);
const tg = new THREE.BufferGeometry();
tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
tg.setIndex(iWall.concat(iGlass));
tg.addGroup(0, iWall.length, 0);
tg.addGroup(iWall.length, iGlass.length, 1);
tg.computeVertexNormals();
const tw = new THREE.Mesh(tg, [wall, glaze]);
tw.position.set(tx, 0, 0);
g.add(tag(tw, 'superstructure', 'Bridge tower',
'The tower foremast, one welded structure: the compass platform at its head behind rows of glazing let into the face, and beneath it fire control, flag space and the searchlight platforms, stacked because the centreline is the only real estate there is.'));
}
const rf = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.016, B * 0.016, B * 0.40, 10), dark);
rf.rotation.x = Math.PI / 2;
rf.position.set(tx, y + B * 0.020, 0);
g.add(tag(rf, 'superstructure', 'Main rangefinder',
'The primary optical rangefinder for the main battery, at the highest point that will hold one: range accuracy is baseline times height.'));
if (S.searchlights) {
const nPairs = Math.min(Math.ceil(S.searchlights / 2), Math.max(1, K - 2));
const webShape = new THREE.Shape(
[[-1.45, -0.10], [0.90, -0.10], [0.90, -0.30],
[0.31, -0.34], [-0.28, -0.47], [-0.86, -0.68], [-1.45, -0.98]]
.map(p => new THREE.Vector2(p[0], p[1])));
const web = new THREE.ExtrudeGeometry(webShape, { depth: 0.08, bevelEnabled: false });
web.translate(0, 0, -0.04);
web.rotateY(-Math.PI / 2);
const wp = (web.index ? web.toNonIndexed() : web).attributes.position;
const bkPos = [];
for (const wx of [-0.51, 0, 0.51])
for (let i = 0; i < wp.count; i++)
bkPos.push(wp.getX(i) + wx, wp.getY(i), wp.getZ(i));
const bkGeo = new THREE.BufferGeometry();
bkGeo.setAttribute('position', new THREE.Float32BufferAttribute(bkPos, 3));
bkGeo.computeVertexNormals();
for (let p = 0; p < nPairs; p++) {
const lv = levels[Math.min(1 + p, K - 1)];
for (const sgn of [1, -1]) {
const zc = sgn * (lv.w / 2 + 1.25);
const sl = new THREE.Group();
const bk = new THREE.Mesh(bkGeo, dark);
if (sgn < 0) bk.rotation.y = Math.PI;
sl.add(tag(bk, 'searchlight', 'Platform bracket'));
const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.35, 0.28, 12), dark);
sl.add(tag(plat, 'searchlight', 'Searchlight platform'));
const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.65, 10), dark);
ped.position.y = 0.45;
sl.add(ped);
const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.95, 14), wall);
dr.rotation.x = Math.PI / 2;
dr.position.y = 1.35;
sl.add(tag(dr, 'searchlight', 'Searchlight'));
const face = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.70, 0.10, 14), glaze);
face.rotation.x = Math.PI / 2;
face.position.set(0, 1.35, sgn * 0.50);
sl.add(tag(face, 'searchlight', 'Searchlight mirror'));
sl.position.set(tx, lv.y0 + 0.55, zc);
g.add(tag(sl, 'searchlight'));
}
}
}
(S.secondaries || []).forEach(sec => {
const R2 = B * (sec.scale || 0.085);
const lvl = sec.deck || 0;
const posns = sec.wing
? [1, -1].map(sgn => ({ z: sgn * (tierHalf(sec.at, 1) - R2 * 1.15),
y: tierTop[1] - 0.15,
rot: sec.at > towerU ? Math.PI : 0, riser: 0 }))
: [{ z: 0, y: tierTop[0] + dh * lvl - 0.15,
rot: sec.at > towerU ? Math.PI : 0, riser: dh * lvl }];
posns.forEach(p => {
const sg = gunhouse(S, R2, sec.cal || 0.15, sec.barrels || 3, p.riser, mats);
sg.position.set((sec.at - 0.5) * L, p.y, p.z);
sg.rotation.y = p.rot;
g.add(tag(sg, 'turret', 'Secondary battery'));
});
});
buildAA(S, g, { tierTop, tierHalf, dh }, mats);
buildAALight(S, g, { tierTop, tierHalf, dh }, mats);
group.add(tag(g, 'superstructure'));
}
function aaHouseGeometry() {
const R0 = [[-0.78, 1.00], [0.78, 1.00], [1.20, 0.58], [1.20, -0.70],
[0.90, -1.00], [-0.90, -1.00], [-1.20, -0.70], [-1.20, 0.58]];
const R2 = [[-0.72, 0.62], [0.72, 0.62], [1.04, 0.34], [1.04, -0.62],
[0.78, -0.86], [-0.78, -0.86], [-1.04, -0.62], [-1.04, 0.34]];
const rings = [{ y: 0, p: R0 }, { y: 0.95, p: R0 }, { y: 1.70, p: R2 }];
const v = [];
const tri = (a, b, c) => v.push(...a, ...b, ...c);
const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
const n = R0.length;
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
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
geo.computeVertexNormals();
return geo;
}
function aaLightShieldGeometry() {
const RX = 0.92, RZ = 0.78, T = 0.05, H = 1.25, TOP = 0.65, N = 7;
const th0 = -Math.PI * 7 / 12, th1 = Math.PI * 7 / 12;
const sta = [];
for (let k = 0; k <= N; k++) {
const th = th0 + (th1 - th0) * k / N;
sta.push([Math.sin(th), Math.cos(th)]);
}
const pt = (k, s, rx, rz, y) => [sta[k][0] * rx * s, y, sta[k][1] * rz * s];
const oB = k => pt(k, 1, RX, RZ, 0),       oT = k => pt(k, TOP, RX, RZ, H);
const iB = k => pt(k, 1, RX - T, RZ - T, 0), iT = k => pt(k, TOP, RX - T, RZ - T, H);
const v = [];
const tri = (a, b, c) => v.push(...a, ...b, ...c);
const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
for (let k = 0; k < N; k++) {
quad(oB(k), oB(k + 1), oT(k + 1), oT(k));
quad(iB(k + 1), iB(k), iT(k), iT(k + 1));
quad(oT(k), oT(k + 1), iT(k + 1), iT(k));
quad(oB(k + 1), oB(k), iB(k), iB(k + 1));
}
quad(oB(0), oT(0), iT(0), iB(0));
quad(oT(N), oB(N), iB(N), iT(N));
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
geo.computeVertexNormals();
return geo;
}
function buildAA(S, g, T, mats) {
if (!S.aa || !S.aa.length) return;
const B = S.beam, L = S.lwl;
const steel = mats.turretSteel || (mats.turretSteel =
new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
const dark = mats.turretDark || (mats.turretDark =
new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
const houseGeo = aaHouseGeometry();
S.aa.forEach(m => {
const cal = m.cal || 0.127;
const barrelL = cal * (m.calLen || 40);
for (const sgn of [1, -1]) {
const z = sgn * (T.tierHalf(m.at, 1) - 2.0);
const mount = new THREE.Group();
const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.35, 16), dark);
plat.position.y = 0.175;
mount.add(tag(plat, 'aa', 'Gun platform'));
const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 1.1, 12), dark);
ped.position.y = 0.9;
mount.add(ped);
const shield = new THREE.Mesh(houseGeo, steel);
shield.position.y = 1.25;
if (sgn < 0) shield.rotation.y = Math.PI;
mount.add(tag(shield, 'aa', 'High-angle mount'));
for (const off of [-0.55, 0.55]) {
const gun = new THREE.Mesh(
new THREE.CylinderGeometry(cal * 0.55, cal * 0.7, barrelL, 8), dark);
gun.rotation.x = sgn * (Math.PI / 2 - 0.7);
gun.position.set(off, 2.6 + Math.cos(0.7) * barrelL * 0.30,
sgn * Math.sin(0.7) * barrelL * 0.35);
mount.add(tag(gun, 'aa', 'High-angle gun'));
}
mount.position.set((m.at - 0.5) * L, T.tierTop[1], z);
g.add(tag(mount, 'aa'));
}
});
}
function buildAALight(S, g, T, mats) {
if (!S.aaLight || !S.aaLight.length) return;
const B = S.beam, L = S.lwl;
const steel = mats.turretSteel || (mats.turretSteel =
new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
const dark = mats.turretDark || (mats.turretDark =
new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
const wrapGeo = aaLightShieldGeometry();
S.aaLight.forEach(m => {
for (const sgn of [1, -1]) {
const mount = new THREE.Group();
const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 2.4, 14), dark);
drum.position.y = 1.0;
mount.add(tag(drum, 'aaLight', 'Bandstand'));
const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 14), dark);
tub.position.y = 2.4;
mount.add(tag(tub, 'aaLight', 'Gun tub'));
const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.8, 10), dark);
ped.position.y = 3.0;
mount.add(ped);
const shield = new THREE.Mesh(wrapGeo, steel);
shield.position.y = 3.275;
if (sgn < 0) shield.rotation.y = Math.PI;
mount.add(tag(shield, 'aaLight', 'Triple 25 mm mount'));
for (const off of [-0.34, 0, 0.34]) {
const gun = new THREE.Mesh(
new THREE.CylinderGeometry(0.045, 0.06, 2.1, 6), dark);
gun.rotation.x = sgn * (Math.PI / 2 - 0.8);
gun.position.set(off, 4.35 + Math.cos(0.8) * 0.65,
sgn * Math.sin(0.8) * 0.85);
mount.add(tag(gun, 'aaLight', '25 mm gun'));
}
mount.position.set((m.at - 0.5) * L, T.tierTop[1],
sgn * (T.tierHalf(m.at, 1) - 1.7));
g.add(tag(mount, 'aaLight'));
}
});
}
function floatplaneGeometries() {
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
const K = 12, pos = [], idx = [];
const se = (v, m) => m * Math.sign(v) * Math.pow(Math.abs(v), 2 / 2.5);
stations.forEach(([x, w, h, yc]) => {
for (let k = 0; k < K; k++) { const th = (k / K) * 2 * Math.PI;
pos.push(x, yc + se(Math.sin(th), h), se(Math.cos(th), w)); }
});
const row = s => { for (let k = 0; k < K; k++) {
const a = s * K + k, b = s * K + (k + 1) % K;
idx.push(a, a + K, b, b, a + K, b + K); } };
row(0); row(1);
const c0 = pos.length / 3; pos.push(-3.80, 2.35, 0);
for (let k = 0; k < K; k++) idx.push(c0, k, (k + 1) % K);
const cowlEnd = idx.length;
for (let s = 2; s < stations.length - 1; s++) row(s);
const c1 = pos.length / 3; pos.push(5.20, 2.42, 0);
const last = (stations.length - 1) * K;
for (let k = 0; k < K; k++) idx.push(c1, last + (k + 1) % K, last + k);
const fus = new THREE.BufferGeometry();
fus.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
fus.setIndex(idx);
fus.addGroup(0, cowlEnd, 0);
fus.addGroup(cowlEnd, idx.length - cowlEnd, 1);
fus.computeVertexNormals();
const plate = (pts, t) => {
const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
g.translate(0, 0, -t / 2);
return g;
};
const blade = plate([[-0.05, 0.14], [-0.10, 0.50], [-0.135, 0.85], [-0.11, 1.10],
[-0.02, 1.235], [0.09, 1.13], [0.125, 0.88], [0.10, 0.50],
[0.05, 0.14]], 0.055);
blade.rotateY(Math.PI / 2);
return {
fus,
canopy: new THREE.SphereGeometry(1, 8, 6),
wingHi: plate([[-2.075, 0.0], [-2.05, 2.0], [-1.98, 3.8], [-1.86, 4.9],
[-1.62, 5.45], [-1.28, 5.60], [-0.95, 5.52], [-0.70, 5.18],
[-0.55, 4.60], [-0.44, 3.40], [-0.35, 1.4], [-0.325, 0.0]], 0.12),
wingLo: plate([[-1.525, 0.0], [-1.505, 2.0], [-1.45, 3.6], [-1.34, 4.6],
[-1.12, 5.15], [-0.80, 5.40], [-0.46, 5.32], [-0.22, 4.95],
[-0.06, 4.40], [0.05, 3.2], [0.115, 1.2], [0.125, 0.0]], 0.12),
fin: plate([[3.95, 2.42], [4.02, 3.00], [4.18, 3.55], [4.45, 3.90], [4.80, 4.02],
[5.12, 3.92], [5.30, 3.60], [5.34, 3.15], [5.30, 2.70], [5.28, 2.42]],
0.10),
stab: plate([[3.80, 0.0], [3.83, 0.9], [3.93, 1.35], [4.12, 1.60], [4.42, 1.70],
[4.72, 1.60], [4.92, 1.30], [5.00, 0.8], [5.04, 0.0]], 0.10),
blade,
};
}
function buildFloatplane(fm, G) {
const ac = new THREE.Group();
const flt = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.30, 6.2, 10), fm.skin);
flt.rotation.z = Math.PI / 2;
flt.position.set(-0.6, 0.42, 0);
ac.add(tag(flt, 'floatplane', 'Main float'));
for (const sx of [-2.1, 0.6])
for (const sz of [-0.28, 0.28]) {
const st = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.35, 6), fm.dark);
st.position.set(sx, 1.45, sz);
ac.add(st);
}
const fus = new THREE.Mesh(G.fus, [fm.dark, fm.skin]);
ac.add(tag(fus, 'floatplane', 'Floatplane'));
for (let b = 0; b < 3; b++) {
const bl = new THREE.Mesh(G.blade, fm.dark);
bl.rotation.x = b * 2 * Math.PI / 3 + 0.5;
bl.position.set(-3.90, 2.35, 0);
ac.add(bl);
}
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.30, 8), fm.dark);
hub.rotation.z = Math.PI / 2;
hub.position.set(-3.98, 2.35, 0);
ac.add(hub);
const can = new THREE.Mesh(G.canopy, fm.glass);
can.scale.set(1.15, 0.40, 0.36);
can.position.set(0.30, 2.82, 0);
ac.add(tag(can, 'floatplane', 'Canopy'));
const fin = new THREE.Mesh(G.fin, fm.skin);
ac.add(tag(fin, 'floatplane', 'Fin'));
for (const s of [-1, 1]) {
const wHi = new THREE.Mesh(G.wingHi, fm.skin);
wHi.rotation.x = s * Math.PI / 2;
wHi.position.y = 3.65;
ac.add(tag(wHi, 'floatplane', 'Upper wing'));
const wLo = new THREE.Mesh(G.wingLo, fm.skin);
wLo.rotation.x = s * Math.PI / 2;
wLo.position.y = 1.95;
ac.add(tag(wLo, 'floatplane', 'Lower wing'));
const stab = new THREE.Mesh(G.stab, fm.skin);
stab.rotation.x = s * Math.PI / 2;
stab.position.y = 2.60;
ac.add(stab);
for (const sx of [-1.22, -0.68]) {
const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.72, 6), fm.dark);
st.position.set(sx, 2.8, s * 4.55);
ac.add(st);
}
const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), fm.dark);
cb.position.set(-1.0, 3.22, s * 0.6);
ac.add(cb);
const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 1.5, 8), fm.skin);
tf.rotation.z = Math.PI / 2;
tf.position.set(-0.70, 1.05, s * 4.7);
ac.add(tag(tf, 'floatplane', 'Wingtip float'));
const ts = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), fm.dark);
ts.position.set(-0.70, 1.6, s * 4.7);
ac.add(ts);
const wd = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), fm.red);
wd.position.set(-1.2, 3.65, s * 3.4);
ac.add(wd);
}
const fd = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.10, 16), fm.red);
fd.rotation.x = Math.PI / 2;
fd.position.set(1.6, 2.38, 0);
ac.add(fd);
return ac;
}
function emitBar(out, A, B, w, h, endX) {
const ax = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
const len = Math.hypot(ax[0], ax[1], ax[2]);
const u = [ax[0] / len, ax[1] / len, ax[2] / len];
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
if (endX && Math.abs(u[0]) > 1e-6) {
const t = (P[0] - p[0]) / u[0];
p[0] = P[0]; p[1] += u[1] * t; p[2] += u[2] * t;
}
return p;
};
const v = [c(A, -1, -1), c(A, 1, -1), c(A, 1, 1), c(A, -1, 1),
c(B, -1, -1), c(B, 1, -1), c(B, 1, 1), c(B, -1, 1)];
const quad = (a, b, cc, d) => out.push(v[a], v[b], v[cc], v[a], v[cc], v[d]);
quad(0, 3, 2, 1); quad(4, 5, 6, 7);
quad(0, 1, 5, 4); quad(2, 3, 7, 6);
quad(1, 2, 6, 5); quad(3, 0, 4, 7);
}
function trisGeometry(tris) {
const pos = new Float32Array(tris.length * 3);
for (let i = 0; i < tris.length; i++) {
pos[i * 3] = tris[i][0]; pos[i * 3 + 1] = tris[i][1]; pos[i * 3 + 2] = tris[i][2];
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
g.computeVertexNormals();
return g;
}
const TR_D = 0.90, TR_W = 1.40, TR_C = 0.14, TR_V = 0.10, TR_G = 0.09, TR_X = 0.10;
function catapultTrussTris(len) {
const out = [];
const yB = -TR_D / 2 + TR_C / 2, yT = TR_D / 2 - TR_C / 2;
const zS = TR_W / 2 - TR_C / 2;
const x0 = -len / 2, x1 = len / 2;
for (const sz of [-1, 1]) {
emitBar(out, [x0, yB, sz * zS], [x1, yB, sz * zS], TR_C, TR_C);
emitBar(out, [x0, yT, sz * zS], [x1, yT, sz * zS], TR_C, TR_C);
}
const N = Math.max(6, Math.round(len / 1.62));
const px = i => (x0 + TR_C / 2) + (i / N) * (len - TR_C);
for (let i = 0; i <= N; i++) {
for (const sz of [-1, 1])
emitBar(out, [px(i), yB, sz * zS], [px(i), yT, sz * zS], TR_V, TR_V);
emitBar(out, [px(i), yT, -zS], [px(i), yT, zS], TR_X, TR_X);
if (i % 2 === 0 && i < N)
emitBar(out, [px(i), yB, -zS], [px(i), yB, zS], TR_G, TR_G);
}
for (let i = 0; i < N; i++)
for (const sz of [-1, 1]) {
const a = i % 2 ? [px(i), yT, sz * zS] : [px(i), yB, sz * zS];
const b = i % 2 ? [px(i + 1), yB, sz * zS] : [px(i + 1), yT, sz * zS];
emitBar(out, a, b, TR_G, TR_G);
}
return out;
}
const RL_HH = 0.09, RL_HW = 0.25, RL_FT = 0.045, RL_WEB = 0.05, RL_HD = 0.06, RL_SLOT = 0.055;
function railGirderTris(len) {
const out = [], L = len * 0.96, x0 = -L / 2, x1 = L / 2;
const slab = (yLo, yHi, zLo, zHi) =>
emitBar(out, [x0, (yLo + yHi) / 2, (zLo + zHi) / 2],
[x1, (yLo + yHi) / 2, (zLo + zHi) / 2], zHi - zLo, yHi - yLo);
slab(-RL_HH, -RL_HH + RL_FT, -RL_HW, RL_HW);
slab(-RL_HH + RL_FT, RL_HH - RL_HD, -RL_WEB, RL_WEB);
slab(RL_HH - RL_HD, RL_HH, RL_SLOT, RL_HW);
slab(RL_HH - RL_HD, RL_HH, -RL_HW, -RL_SLOT);
return out;
}
const JB_H0 = 0.60, JB_H1 = 0.24, JB_C = 0.085, JB_L = 0.055;
function craneJibTris(jibL) {
const out = [];
const x0 = -jibL / 2, x1 = jibL / 2;
const half = x => (JB_H0 + (JB_H1 - JB_H0) * (x - x0) / jibL) / 2 - JB_C / 2;
const chord = (sy, sz, x) => [x, sy * half(x), sz * half(x)];
for (const sy of [-1, 1]) for (const sz of [-1, 1])
emitBar(out, chord(sy, sz, x0), chord(sy, sz, x1), JB_C, JB_C, true);
const M = Math.max(5, Math.round(jibL / 1.4));
const px = i => x0 + (i / M) * jibL;
for (let i = 0; i < M; i++) {
const a = i % 2 ? 1 : -1, b = -a;
for (const s of [-1, 1])
emitBar(out, chord(a, s, px(i)), chord(b, s, px(i + 1)), JB_L, JB_L, true);
}
for (let i = 1; i < M; i++)
for (const sy of [-1, 1])
emitBar(out, chord(sy, -1, px(i)), chord(sy, 1, px(i)), JB_L, JB_L);
for (const x of [x0 + JB_C / 2, x1 - JB_C / 2]) {
for (const sy of [-1, 1])
emitBar(out, chord(sy, -1, x), chord(sy, 1, x), JB_L, JB_L);
for (const sz of [-1, 1])
emitBar(out, chord(-1, sz, x), chord(1, sz, x), JB_L, JB_L);
}
emitBar(out, [x1 - 0.30, 0, 0], [x1, 0, 0], 0.34, 0.18);
for (const p of out) {
p[1] = Math.max(-JB_H0 / 2, Math.min(JB_H0 / 2, p[1]));
p[2] = Math.max(-JB_H0 / 2, Math.min(JB_H0 / 2, p[2]));
}
return out;
}
function buildSternAviation(S, group) {
if (!S.catapults) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const dark = new THREE.MeshStandardMaterial({ color: 0x4b5157, roughness: 0.58, metalness: 0.25 });
const steel = new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 });
const u = S.catapults.at || 0.92;
const len = S.catapults.lenM || B * 0.5;
const deckY = H.sheer(u);
const half = Math.abs(surfacePoint(S, H, u, 1.0)[2]);
const trussGeo = trisGeometry(catapultTrussTris(len));
const railGeo = trisGeometry(railGirderTris(len));
let portCat = null;
for (const sgn of [1, -1]) {
const g = new THREE.Group();
const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.0, 14), dark);
ped.position.y = 0.5;
g.add(tag(ped, 'catapult', 'Catapult turntable'));
const beam = new THREE.Mesh(trussGeo, steel);
beam.position.y = 1.45;
g.add(tag(beam, 'catapult'));
const rail = new THREE.Mesh(railGeo, dark);
rail.position.y = 1.99;
g.add(tag(rail, 'catapult', 'Launch rail'));
g.position.set((u - 0.5) * L, deckY, sgn * (half - 2.6));
g.rotation.y = -sgn * 0.6;
group.add(tag(g, 'catapult'));
if (sgn === 1) portCat = g;
}
if (S.sternCrane) {
const g = new THREE.Group();
const uC = Math.min(0.985, u + len * 0.75 / L);
const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 9.0, 12), dark);
post.position.y = 4.5;
g.add(tag(post, 'catapult', 'Crane post'));
const jibL = len * 0.65;
const jib = new THREE.Mesh(trisGeometry(craneJibTris(jibL)), steel);
jib.position.set(Math.cos(0.6) * jibL / 2, 9.0 + Math.sin(0.6) * jibL / 2, 0);
jib.rotation.z = 0.6;
g.add(tag(jib, 'catapult', 'Aircraft crane'));
g.position.set((uC - 0.5) * L, H.sheer(uC), 0);
group.add(tag(g, 'catapult'));
}
if (S.floatplanes) {
const fm = {
skin:  new THREE.MeshStandardMaterial({ color: 0x82877e, roughness: 0.85, metalness: 0.08 }),
dark:  new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.70, metalness: 0.20 }),
glass: new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 }),
red:   new THREE.MeshStandardMaterial({ color: 0x9c2f28, roughness: 0.60, metalness: 0.05 }),
};
const G = floatplaneGeometries();
if (portCat) {
const p0 = buildFloatplane(fm, G);
p0.position.y = 2.08;
p0.rotation.y = Math.PI;
portCat.add(tag(p0, 'floatplane'));
}
for (let i = portCat ? 1 : 0; i < S.floatplanes; i++) {
const p = buildFloatplane(fm, G);
const uP = u - 0.045 - 0.042 * (i - 1);
const bC = Math.abs(surfacePoint(S, H, uP, 1.0)[2]);
p.position.set((uP - 0.5) * L, H.sheer(uP) + bC * 0.035, 0);
p.rotation.y = (i % 2 ? -1 : 1) * 0.28;
group.add(tag(p, 'floatplane'));
}
}
}
function buildDeckHatches(S, group) {
if (!S.deckHatches || !S.deckHatches.length) return;
const H = hullSurface(S);
const L = S.lwl;
const dark = new THREE.MeshStandardMaterial({ color: 0x3f444a, roughness: 0.66, metalness: 0.25 });
const cover = new THREE.MeshStandardMaterial({ color: 0x565c61, roughness: 0.72, metalness: 0.22 });
const deckAt = (u, z) => {
const b = Math.abs(surfacePoint(S, H, u, 1.0)[2]) || 1e-6;
return H.sheer(u) + Math.cos(Math.min(1, Math.abs(z) / b) * Math.PI / 2) * b * 0.035;
};
S.deckHatches.forEach(hc => {
const u0 = hc.at, zP = (hc.z || 0) * Math.abs(surfacePoint(S, H, u0, 1.0)[2]);
const y0 = deckAt(u0, zP);
const dY = (dx, dz) => deckAt(u0 + dx / L, zP + dz) - y0;
const hx = hc.lenM / 2, hz = hc.widM / 2;
const T = 0.14, RIM = 0.28, CH = 0.04, HEEL = 0.25, DROP = 0.10;
const GW = 0.08, GD = 0.04;
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
const sect = [[0, -HEEL], [0, RIM - CH], [CH, RIM], [T, RIM], [T, RIM - DROP]];
const NX = Math.max(2, Math.round(hc.lenM / 2.5));
const NZ = Math.max(2, Math.round(hc.widM / 1.5));
const P = (x, h, z) => [x, h + dY(x, z), z];
for (let s = 0; s < sect.length - 1; s++) {
const [i1, h1] = sect[s], [i2, h2] = sect[s + 1];
for (const sg of [1, -1]) {
for (let k = 0; k < NX; k++) {
const xa1 = (k / NX * 2 - 1) * (hx - i1), xb1 = ((k + 1) / NX * 2 - 1) * (hx - i1);
const xa2 = (k / NX * 2 - 1) * (hx - i2), xb2 = ((k + 1) / NX * 2 - 1) * (hx - i2);
const A1 = P(xa1, h1, sg * (hz - i1)), B1 = P(xb1, h1, sg * (hz - i1));
const A2 = P(xa2, h2, sg * (hz - i2)), B2 = P(xb2, h2, sg * (hz - i2));
if (sg > 0) quad(A1, B1, B2, A2); else quad(B1, A1, A2, B2);
}
for (let k = 0; k < NZ; k++) {
const za1 = (k / NZ * 2 - 1) * (hz - i1), zb1 = ((k + 1) / NZ * 2 - 1) * (hz - i1);
const za2 = (k / NZ * 2 - 1) * (hz - i2), zb2 = ((k + 1) / NZ * 2 - 1) * (hz - i2);
const A1 = P(sg * (hx - i1), h1, za1), B1 = P(sg * (hx - i1), h1, zb1);
const A2 = P(sg * (hx - i2), h2, za2), B2 = P(sg * (hx - i2), h2, zb2);
if (sg > 0) quad(B1, A1, A2, B2); else quad(A1, B1, B2, A2);
}
}
}
const coamIdx = acc.idx.length;
const cx = hx - T, cz = hz - T, yc = RIM - DROP;
const seams = [-cx / 1.5, cx / 1.5];
const edges = [-cx];
for (const sc of seams) edges.push(sc - GW / 2, sc + GW / 2);
edges.push(cx);
const zrow = (x0, x1, yy) => {
for (let k = 0; k < NZ; k++) {
const z0 = (k / NZ * 2 - 1) * cz, z1 = ((k + 1) / NZ * 2 - 1) * cz;
quad(P(x0, yy, z0), P(x0, yy, z1), P(x1, yy, z1), P(x1, yy, z0));
}
};
for (let i = 0; i < edges.length; i += 2) zrow(edges[i], edges[i + 1], yc);
for (const sc of seams) {
const x0 = sc - GW / 2, x1 = sc + GW / 2;
zrow(x0, x1, yc - GD);
for (let k = 0; k < NZ; k++) {
const z0 = (k / NZ * 2 - 1) * cz, z1 = ((k + 1) / NZ * 2 - 1) * cz;
quad(P(x0, yc - GD, z0), P(x0, yc - GD, z1), P(x0, yc, z1), P(x0, yc, z0));
quad(P(x1, yc - GD, z1), P(x1, yc - GD, z0), P(x1, yc, z0), P(x1, yc, z1));
}
for (const sg of [1, -1]) {
const q = [P(x0, yc - GD, sg * cz), P(x1, yc - GD, sg * cz),
P(x1, yc, sg * cz), P(x0, yc, sg * cz)];
if (sg > 0) quad(q[1], q[0], q[3], q[2]); else quad(q[0], q[1], q[2], q[3]);
}
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nrm, 3));
geo.setIndex(acc.idx);
geo.addGroup(0, coamIdx, 0);
geo.addGroup(coamIdx, acc.idx.length - coamIdx, 1);
const g = new THREE.Group();
g.add(tag(new THREE.Mesh(geo, [dark, cover]), 'hatch', 'Stowage hatch'));
g.position.set((u0 - 0.5) * L, y0, zP);
group.add(tag(g, 'hatch'));
});
}
function netDefenceGeom(S) {
if (!S.netDefence) return null;
const nd = S.netDefence;
const u0 = nd.from !== undefined ? nd.from : 0.28;
const u1 = nd.to !== undefined ? nd.to : 0.92;
const boomM = 12.2;
const slant = 14 * Math.PI / 180;
const du = boomM * Math.cos(slant) / S.lwl;
const drop = boomM * Math.sin(slant);
const shelfY = hullSurface(S).sheer(0.5) * 0.58;
const lastHeel = u1 - du;
const n = Math.max(3, Math.round((lastHeel - u0) * S.lwl / 8.3) + 1);
const heels = [];
for (let i = 0; i < n; i++) heels.push(u0 + (lastHeel - u0) * i / (n - 1));
return { u0, u1, boomM, du, drop, shelfY, heels };
}
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
function netBracketVerts(x, sT, sBot, zOutTop, yMid, sgn) {
const P = [[sT - 0.03, yMid], [zOutTop, yMid],
[zOutTop, yMid - 0.145], [sBot - 0.03, yMid - 0.50]];
const v = [];
const tri = (a, b, c) => {
if (sgn < 0) v.push(a[0], a[1], -a[2], c[0], c[1], -c[2], b[0], b[1], -b[2]);
else v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
};
const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
const F = P.map(p => [x + 0.025, p[1], p[0]]);
const A = P.map(p => [x - 0.025, p[1], p[0]]);
quad(F[0], F[1], F[2], F[3]);
quad(A[3], A[2], A[1], A[0]);
for (let i = 0; i < 4; i++) {
const j = (i + 1) % 4;
quad(A[i], A[j], F[j], F[i]);
}
return v;
}
function netHingeVerts() {
const v = [];
const tri = (a, b, c) => v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
const box = (x0, x1, y0, y1, z0, z1) => {
quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);
quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
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
function buildNetDefence(S, group) {
const G = netDefenceGeom(S);
if (!G) return;
const H = hullSurface(S);
const steel = new THREE.MeshStandardMaterial({ color: 0x363b41, roughness: 0.50, metalness: 0.60 });
const shelfMat = new THREE.MeshStandardMaterial({ color: 0x4a5057, roughness: 0.62, metalness: 0.45 });
const netMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.90, metalness: 0.15 });
const sideAt = (u, h) => {
const k = Math.max(0, Math.min(1, h / H.sheer(u)));
return surfacePoint(S, H, u, 0.62 + 0.38 * k);
};
const sA = G.u0 - 0.03, sB = Math.min(0.97, G.u1 + 0.01);
const NSEG = 18;
let zMaxOld = -Infinity;
for (let i = 0; i < NSEG; i++) {
const ua = sA + (sB - sA) * i / NSEG, ub = sA + (sB - sA) * (i + 1) / NSEG;
const a = sideAt(ua, G.shelfY), b = sideAt(ub, G.shelfY);
const dx = b[0] - a[0], dz = b[2] - a[2];
const rot = Math.atan2(-dz, dx);
const hx = Math.hypot(dx, dz) * 1.06 / 2, hz = 0.275;
zMaxOld = Math.max(zMaxOld, (a[2] + b[2]) / 2 + 0.22 +
hx * Math.abs(Math.sin(rot)) + hz * Math.abs(Math.cos(rot)));
}
const NST = 40;
const sta = [];
for (let i = 0; i <= NST; i++) {
const u = sA + (sB - sA) * i / NST;
const p = sideAt(u, G.shelfY);
sta.push({ u, x: p[0], s: p[2] });
}
let peak = 0;
for (let i = 1; i <= NST; i++) if (sta[i].s > sta[peak].s) peak = i;
const dOut = zMaxOld - (sta[peak].s + 0.495);
for (const st of sta) st.zo = Math.min(st.s + 0.495 + dOut, zMaxOld);
sta[peak].zo = zMaxOld;
const brU = [];
{
const half = (G.heels[1] - G.heels[0]) / 2;
brU.push(Math.max(sA + 0.005, G.heels[0] - half));
for (let i = 0; i + 1 < G.heels.length; i++) brU.push((G.heels[i] + G.heels[i + 1]) / 2);
brU.push(Math.min(sB - 0.005, G.heels[G.heels.length - 1] + half));
}
const shelfVerts = [];
for (const sgn of [1, -1]) {
for (const f of netShelfVerts(sta, G.shelfY, sgn)) shelfVerts.push(f);
for (const u of brU) {
const pT = sideAt(u, G.shelfY), pB = sideAt(u, G.shelfY - 0.5);
const zo = Math.min(pT[2] + 0.495 + dOut, zMaxOld);
for (const f of netBracketVerts(pT[0], pT[2], pB[2], zo - 0.10, G.shelfY, sgn))
shelfVerts.push(f);
}
}
const shelfGeo = new THREE.BufferGeometry();
shelfGeo.setAttribute('position', new THREE.Float32BufferAttribute(shelfVerts, 3));
shelfGeo.computeVertexNormals();
group.add(tag(new THREE.Mesh(shelfGeo, shelfMat), 'net', 'Net shelf'));
const hingeGeo = new THREE.BufferGeometry();
hingeGeo.setAttribute('position', new THREE.Float32BufferAttribute(netHingeVerts(), 3));
hingeGeo.computeVertexNormals();
for (const sgn of [1, -1]) {
const pts = [];
for (let i = 0; i <= 40; i++) {
const u = sA + (sB - sA) * i / 40;
const p = sideAt(u, G.shelfY);
pts.push(new THREE.Vector3(p[0], G.shelfY + 0.23, sgn * (p[2] + 0.30)));
}
const roll = new THREE.Mesh(
new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.18, 8, false), netMat);
group.add(tag(roll, 'net', 'Torpedo net, rolled'));
for (const uh of G.heels) {
const hy = G.shelfY - 0.25;
const a = sideAt(uh, hy), b = sideAt(uh + G.du, hy - G.drop);
const A = new THREE.Vector3(a[0], hy, sgn * (a[2] + 0.22));
const B = new THREE.Vector3(b[0], hy - G.drop, sgn * (b[2] + 0.22));
const dir = B.clone().sub(A);
const boom = new THREE.Mesh(
new THREE.CylinderGeometry(0.13, 0.16, dir.length(), 10), steel);
boom.position.copy(A).add(B).multiplyScalar(0.5);
boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
group.add(tag(boom, 'net', 'Net boom'));
const e = 0.01;
const t0 = sideAt(uh - e, hy), t1 = sideAt(uh + e, hy);
const th = Math.atan2(-(t1[2] - t0[2]), t1[0] - t0[0]);
const hinge = new THREE.Mesh(hingeGeo, steel);
hinge.position.set(a[0], hy, sgn * a[2]);
hinge.rotation.y = sgn > 0 ? th : Math.PI - th;
group.add(tag(hinge, 'net', 'Boom hinge'));
}
}
}
function buildWingSail(S, group, mats) {
if (!S.wingSail) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const u = S.wingAt || 0.46;
const base = H.sheer(u);
const x = (u - 0.5) * L;
const span = L * S.wingSail;
const chord = span * 0.27;
const white = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.42, metalness: 0.05 });
const dark  = new THREE.MeshStandardMaterial({ color: 0x1b2530, roughness: 0.30, metalness: 0.15 });
const wing = new THREE.Group();
const NC = 18, NSp = 10, wp = [], wi = [];
for (let j = 0; j <= NSp; j++) {
const v = j / NSp;
const taper = 1.0 - 0.32 * v * v;
const yy = v * span;
for (let side = 0; side < 2; side++) {
for (let i = 0; i <= NC; i++) {
const t = i / NC;
const th = 0.115 * chord * taper * Math.sin(Math.PI * Math.pow(t, 0.58));
wp.push((t - 0.5) * chord * taper, yy, (side ? -1 : 1) * th);
}
}
}
const rowW = (NC + 1) * 2;
for (let j = 0; j < NSp; j++)
for (let side = 0; side < 2; side++)
for (let i = 0; i < NC; i++) {
const a = j * rowW + side * (NC + 1) + i, b = a + rowW;
if (side === 0) wi.push(a, b, a + 1, a + 1, b, b + 1);
else            wi.push(a, a + 1, b, a + 1, b + 1, b);
}
const wg = new THREE.BufferGeometry();
wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
wg.setIndex(wi);
wg.computeVertexNormals();
const wm = new THREE.Mesh(wg, white);
wing.add(tag(wm, 'wing', 'Wing sail',
'A rigid aerofoil in place of canvas. Nothing to sheet, nothing to reef, nothing to tear — which is what lets the vessel sail for months with nobody aboard.'));
const boom = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.010, B * 0.010, chord * 2.6, 8), dark);
boom.rotation.x = Math.PI / 2;
boom.position.set(0, span * 0.46, -chord * 1.5);
wing.add(boom);
const vane = new THREE.Mesh(new THREE.BoxGeometry(chord * 0.045, span * 0.34, chord * 0.95), white);
vane.position.set(0, span * 0.46, -chord * 2.7);
wing.add(tag(vane, 'wing', 'Tail vane',
'A weathervane for the wing. The wing pivots freely on its post and the tail holds it at a set angle to the apparent wind, so it finds and keeps its own trim with no crew.'));
const post = new THREE.Mesh(new THREE.CylinderGeometry(chord * 0.075, chord * 0.095, B * 0.12, 14), dark);
post.position.set(x, base + B * 0.06, 0);
group.add(tag(post, 'wing', 'Wing bearing',
'The wing turns freely on this post. Nothing drives it: the tail vane sets the angle and the wind does the rest.'));
wing.position.set(x, base + B * 0.115, 0);
wing.rotation.y = 0.56;
group.add(tag(wing, 'wing'));
const pv = new THREE.MeshStandardMaterial({ color: 0x141d2b, roughness: 0.22, metalness: 0.45 });
for (const uu of [0.24, 0.32, 0.62, 0.70, 0.78]) {
const p = new THREE.Mesh(new THREE.BoxGeometry(L * 0.055, B * 0.008, B * 0.42), pv);
p.position.set((uu - 0.5) * L, H.sheer(uu) + B * 0.010, 0);
group.add(tag(p, 'solar', 'Solar array',
'Power for the instruments, the computer and the satellite link. With wind for propulsion and sun for electricity, the endurance limit stops being fuel and becomes fouling.'));
}
const pod = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.05, B * 0.06, B * 0.20, 12), dark);
pod.position.set((0.84 - 0.5) * L, H.sheer(0.84) + B * 0.10, 0);
group.add(tag(pod, 'sensor', 'Instrument mast',
'Anemometer, satellite antenna and cameras. Below the waterline the same vessel carries echo sounders and a CTD.'));
}
function buildContainers(S, group, coarse) {
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const TEU_L = 12.19, TEU_W = 2.44, TEU_H = 2.59;
const pal = [0xb0442e, 0x2f5f86, 0x8a8f93, 0x3f7a55, 0xa8792c, 0x6a4a72];
const mats = pal.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.74, metalness: 0.14 }));
const box = new THREE.BoxGeometry(TEU_L * 0.97, TEU_H * 0.95, TEU_W * 0.94);
const stack = new THREE.Group();
const deckHalfAt = x => {
const u = Math.max(0.001, Math.min(0.999, 0.5 + x / L));
return Math.abs(surfacePoint(S, H, u, 1.0)[2]);
};
const deckY = H.sheer(0.5);
const DK = 2.9;
const N_DECKS = S.deckHouseDecks || 8;
const accU = (S.bridgeU !== undefined) ? S.bridgeU : 0.845;
const accX = L * (accU - 0.5), accL = L * 0.050, accW = B * 0.70;
const casL = L * 0.042, casW = B * 0.34;
const casX = (S.funnelU !== undefined) ? L * (S.funnelU - 0.5)
: accX + accL / 2 + casL / 2;
const twin = casX - accX > accL;
const hatch = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.85, metalness: 0.2 });
const lash = new THREE.MeshStandardMaterial({ color: 0x6d7176, roughness: 0.7, metalness: 0.45 });
const pitch = TEU_L * 1.06;
const lashM = B * 0.02;
const bays = [];
for (let x = -L * 0.44 + pitch / 2; x + pitch / 2 < L * 0.48; x += pitch) {
const half = Math.min(B * (S.stowBeamF || 0.43),
deckHalfAt(x - pitch / 2), deckHalfAt(x + pitch / 2)) - lashM;
const nc = Math.floor((half * 2) / (TEU_W * 1.02));
if (nc < 6) continue;
const aftGapX = twin ? accX + accL / 2 + 3 : casX + casL / 2 + 3;
if (x + pitch / 2 > accX - accL / 2 - 3 && x - pitch / 2 < aftGapX) continue;
if (twin && x + pitch / 2 > casX - casL / 2 - 3 && x - pitch / 2 < casX + casL / 2 + 3) continue;
bays.push([x, nc]);
}
const foreBays = bays.filter(b => b[0] < accX).length;
bays.forEach(([x, nc], i) => {
const peak = S.stowTiers || 8;
let centreHigh;
if (twin) {
if (x < accX) centreHigh = Math.max(4, peak - 1 - Math.max(0, 2 - i));
else {
centreHigh = peak;
if (Math.abs(x - casX) < casL / 2 + pitch) centreHigh = peak - 1;
if (i === bays.length - 1) centreHigh = peak - 2;
}
} else {
const t = i / Math.max(1, foreBays - 1);
centreHigh = x > accX ? 5
: Math.max(3, Math.round((peak - 4) + 4 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.68)));
}
const stowHalf = nc * TEU_W * 1.02 / 2;
const bayY = Math.max(H.sheer(Math.max(0.001, 0.5 + (x - pitch / 2) / L)),
H.sheer(Math.min(0.999, 0.5 + (x + pitch / 2) / L)));
const hc = new THREE.Mesh(
new THREE.BoxGeometry(TEU_L * 1.00, TEU_H * 0.22, stowHalf * 2 + 1.0), hatch);
hc.position.set(x, bayY + TEU_H * 0.11, 0);
stack.add(hc);
const highAt = c => {
const wing = Math.abs(c - (nc - 1) / 2) / ((nc - 1) / 2 || 1);
return Math.max(2, Math.round(centreHigh - wing * wing * (twin ? 1.2 : 2.6)));
};
if (coarse) {
for (let hI = 0; hI < centreHigh; hI++) {
let n = 0;
for (let c = 0; c < nc; c++) if (highAt(c) > hI) n++;
if (!n) continue;
const w = n * TEU_W * 1.02;
const m = new THREE.Mesh(
new THREE.BoxGeometry(TEU_L * 0.97, TEU_H * 0.95, w),
mats[(i * 7 + hI * 3) % mats.length]);
m.position.set(x, bayY + TEU_H * (0.22 + hI + 0.5), 0);
stack.add(m);
}
} else {
for (let c = 0; c < nc; c++) {
const high = highAt(c);
for (let h = 0; h < high; h++) {
const m = new THREE.Mesh(box, mats[(i * 7 + c * 3 + h) % mats.length]);
m.position.set(x, bayY + TEU_H * (0.22 + h + 0.5),
(c - (nc - 1) / 2) * TEU_W * 1.02);
stack.add(m);
}
}
}
if (i % 3 === 2 && x < accX) {
const lb = new THREE.Mesh(
new THREE.BoxGeometry(TEU_L * 0.10, TEU_H * 2.1, stowHalf * 2 + 1.2), lash);
lb.position.set(x + TEU_L * 0.55, bayY + TEU_H * 1.3, 0);
stack.add(lb);
}
});
group.add(tag(stack, 'container'));
const bulbMat = new THREE.MeshStandardMaterial({ color: 0x8d2f26, roughness: 0.7, metalness: 0.2 });
const bulbR = S.beam * 0.115;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbR, 18, 12), bulbMat);
bulb.scale.set(2.5, 1.0, 1.0);
bulb.position.set(-L * 0.495, Math.max(-S.draught * 0.62, bulbR - S.draught), 0);
group.add(tag(bulb, 'bulb'));
const steelPale = new THREE.MeshStandardMaterial({ color: 0xc8c4bb, roughness: 0.62 });
const fcX = -L * 0.46;
const fcY = H.sheer(Math.max(0.001, 0.5 + fcX / L));
const fcHalf = Math.min(deckHalfAt(fcX - L * 0.022), deckHalfAt(fcX + L * 0.022)) - B * 0.012;
const fc = new THREE.Mesh(new THREE.BoxGeometry(L * 0.044, TEU_H * 1.1, fcHalf * 2), steelPale);
fc.position.set(fcX, fcY + TEU_H * 0.55, 0);
group.add(tag(fc, 'forecast'));
const white = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.55 });
const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6, metalness: 0.25 });
const fm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 12, 8), white);
fm.position.set(fcX, fcY + TEU_H * 1.1 + 6, 0);
group.add(tag(fm, 'mast', 'Foremast'));
const hs = deckY;
const glassM = new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
const houseG = new THREE.Group();
const blockH = N_DECKS * DK;
const blk = new THREE.Mesh(new THREE.BoxGeometry(accL, blockH, accW), white);
blk.position.set(accX, hs + blockH / 2, 0);
houseG.add(blk);
const bandG = new THREE.BoxGeometry(0.28, DK * 0.30, accW * 0.86);
const mullG = new THREE.BoxGeometry(0.34, DK * 0.32, 0.42);
const nMull = Math.round(accW * 0.86 / 2.3);
for (let d = 1; d < N_DECKS; d++) {
const wy = hs + d * DK + DK * 0.62;
for (const side of [-1, 1]) {
const fx = accX + side * accL / 2;
const band = new THREE.Mesh(bandG, glassM);
band.position.set(fx, wy, 0);
houseG.add(band);
for (let m = 0; m <= nMull; m++) {
const mull = new THREE.Mesh(mullG, white);
mull.position.set(fx, wy, -accW * 0.43 + (m / nMull) * accW * 0.86);
houseG.add(mull);
}
}
}
const stairG = new THREE.BoxGeometry(2.2, blockH * 0.82, 0.28);
for (const side of [-1, 1]) {
const st = new THREE.Mesh(stairG, glassM);
st.position.set(accX - accL * 0.28, hs + blockH * 0.47, side * accW / 2);
houseG.add(st);
}
const whH = DK * 1.15, whY = hs + blockH;
const wh = new THREE.Mesh(new THREE.BoxGeometry(accL * 0.80, whH, accW), white);
wh.position.set(accX, whY + whH / 2, 0);
houseG.add(wh);
const whGlass = new THREE.Mesh(new THREE.BoxGeometry(0.28, whH * 0.44, accW * 0.92), glassM);
whGlass.position.set(accX - accL * 0.40, whY + whH * 0.60, 0);
houseG.add(whGlass);
const nWm = Math.round(accW * 0.92 / 1.7);
for (let m = 0; m <= nWm; m++) {
const mull = new THREE.Mesh(mullG, white);
mull.position.set(accX - accL * 0.40, whY + whH * 0.60, -accW * 0.46 + (m / nWm) * accW * 0.92);
houseG.add(mull);
}
const wingSpan = B * 1.05;
const wing = new THREE.Mesh(new THREE.BoxGeometry(accL * 0.34, 0.4, wingSpan), white);
wing.position.set(accX - accL * 0.23, whY + 0.2, 0);
houseG.add(wing);
for (const side of [-1, 1]) {
const scr = new THREE.Mesh(new THREE.BoxGeometry(accL * 0.30, 1.15, 0.25), glassM);
scr.position.set(accX - accL * 0.23, whY + 1.0, side * (wingSpan / 2 - 0.3));
houseG.add(scr);
const run = wingSpan / 2 - accW / 2;
const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, Math.hypot(run, DK) * 1.02, 6), white);
strut.position.set(accX - accL * 0.23, whY - DK / 2, side * (accW / 2 + run / 2));
strut.rotation.x = side * Math.atan2(run, DK);
houseG.add(strut);
}
group.add(tag(houseG, 'bridge'));
const mastG = new THREE.Group();
const mastX = accX + accL * 0.10, mastB = whY + whH;
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 8, 8), white);
pole.position.set(mastX, mastB + 4, 0);
mastG.add(pole);
const barG = new THREE.BoxGeometry(0.35, 0.28, 3.6);
const bar1 = new THREE.Mesh(barG, dark); bar1.position.set(mastX, mastB + 8.2, 0); mastG.add(bar1);
const bar2 = new THREE.Mesh(barG, dark); bar2.position.set(mastX, mastB + 6.4, 0);
bar2.rotation.y = 0.6; mastG.add(bar2);
const yardM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7, 6), white);
yardM.rotation.x = Math.PI / 2;
yardM.position.set(mastX, mastB + 5.2, 0);
mastG.add(yardM);
group.add(tag(mastG, 'mast', 'Radar mast'));
const boatM = new THREE.MeshStandardMaterial({ color: 0xcc5a24, roughness: 0.5 });
for (const side of [-1, 1]) {
const bG = new THREE.Group();
const by = hs + DK * 2.2, bz = side * (accW / 2 + 1.35);
const boat = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 6.2, 4, 10), boatM);
boat.rotation.z = Math.PI / 2;
boat.position.set(accX + accL * 0.06, by, bz);
bG.add(boat);
for (const dx of [-2.6, 2.6]) {
const dav = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), white);
dav.position.set(accX + accL * 0.06 + dx, by + 1.7, side * (accW / 2 + 0.65));
dav.rotation.x = side * 0.38;
bG.add(dav);
}
group.add(tag(bG, 'boat', 'Lifeboat'));
}
const casH = twin ? TEU_H * ((S.stowTiers || 8) + 0.9) : DK * 4;
const casMat = twin
? new THREE.MeshStandardMaterial({ color: S.topside || '#2a4038', roughness: 0.62, metalness: 0.22 })
: white;
const casing = new THREE.Mesh(new THREE.BoxGeometry(casL, casH, casW), casMat);
casing.position.set(casX, hs + casH / 2, 0);
if (twin) group.add(tag(casing, 'funnel', 'Engine casing',
'The funnel’s own island: the uptake from the semi-aft engine room, carried '
+ 'through the height of the stow it stands among. On a twin-island ship the bridge '
+ 'no longer marks where the engine is — this does.'));
else group.add(tag(casing, 'bridge'));
const fnG = new THREE.Group();
const fnH = twin ? 6 : 13;
const fn = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.6, fnH, 20), dark);
fn.scale.x = 1.6;
fn.position.set(casX, hs + casH + fnH / 2 - 1, 0);
fn.rotation.z = -0.05;
fnG.add(fn);
const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.9, 20), lash);
cap.scale.x = 1.6;
cap.position.set(casX + 0.6, hs + casH + fnH - 1.2, 0);
cap.rotation.z = -0.05;
fnG.add(cap);
for (const dz of [-1.0, 1.0]) {
const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 8), dark);
pipe.position.set(casX + 0.7, hs + casH + fnH - 0.4, dz);
fnG.add(pipe);
}
group.add(tag(fnG, 'funnel', 'Funnel',
'The uptake from the main engine, carried high enough to keep exhaust clear of the bridge and the deck. On a box boat it stands abaft the accommodation because everything forward of that is cargo.'));
}
function buildLivery(S, group) {
const H = hullSurface(S);
const L = S.lwl, lv = S.livery;
if (!lv) return;
const paint = '#eef0ec';
const makeTex = (lines) => {
const cv = document.createElement('canvas');
cv.width = 2048;
cv.height = lines.length > 1 ? 512 : 256;
const cx = cv.getContext('2d');
cx.fillStyle = paint;
cx.textBaseline = 'alphabetic';
const rowH = cv.height / lines.length;
lines.forEach((text, r) => {
const fs = Math.round(rowH * (lines.length > 1 ? 0.62 : 0.86));
cx.font = '700 ' + fs + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
const ws = Array.from(text, ch => cx.measureText(ch).width);
const tot = ws.reduce((a, b) => a + b, 0);
const run = cv.width * (lines.length > 1 ? 0.42 + 0.4 * (tot / cv.width) : 0.98);
const gap = (Math.min(run, cv.width * 0.98) - tot) / Math.max(1, text.length - 1);
let x = (cv.width - Math.min(run, cv.width * 0.98)) / 2;
const y = rowH * r + rowH * 0.82;
Array.from(text).forEach((ch, i) => { cx.fillText(ch, x, y); x += ws[i] + Math.max(0, gap); });
});
const tex = new THREE.CanvasTexture(cv);
tex.colorSpace = THREE.SRGBColorSpace;
tex.anisotropy = 4;
return tex;
};
const mkMat = tex => new THREE.MeshStandardMaterial({
map: tex, transparent: true, roughness: 0.55, metalness: 0.05,
polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const deckY = H.sheer(0.5);
if (lv.side) {
const wM = L * (lv.sideRun || 0.30);
const hM = lv.sideH || Math.max(4, S.freeboard * 0.45);
const uC = (lv.sideU !== undefined) ? lv.sideU : 0.48;
const xC = L * (uC - 0.5);
const half = Math.abs(surfacePoint(S, H, uC, 1.0)[2]);
const yC = deckY - hM * 0.5 - (lv.sideDrop !== undefined ? lv.sideDrop : 1.6);
for (const side of [1, -1]) {
const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM),
mkMat(makeTex([lv.side])));
m.position.set(xC, yC, side * (half + 0.15));
if (side < 0) m.rotation.y = Math.PI;
group.add(tag(m, 'livery'));
}
}
if (lv.stern && lv.stern.length) {
const wM = S.beam * 0.42, hM = wM * 0.25;
const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mkMat(makeTex(lv.stern)));
m.position.set(L * 0.5 + 0.15, deckY - S.freeboard * 0.42, 0);
m.rotation.y = Math.PI / 2;
group.add(tag(m, 'livery', 'Stern name',
'Name and port of registry, white on the transom — the address every ship carries.'));
}
}
function buildHead(S, group, mats) {
S.__catheads = null;
if (!S.bowsprit || S.iron) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
if (S.build === 'frame') {
const uc = 0.105;
const pd = surfacePoint(S, H, uc, 1.0);
const blen = B * 0.26, sq = B * 0.042, ang = 0.70;
S.__catheads = [];
for (const sgn of [-1, 1]) {
const cg = new THREE.Group();
const beam = new THREE.Mesh(new THREE.BoxGeometry(sq, sq, blen), mats.woodDark);
beam.position.z = blen / 2;
cg.add(beam);
const kn = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.7, B * 0.06, sq * 0.7), mats.woodDark);
kn.position.set(0, -B * 0.038, blen * 0.30);
cg.add(kn);
cg.position.set(pd[0], pd[1] + B * 0.012, sgn * pd[2] * 0.55);
cg.rotation.y = sgn > 0 ? -ang : Math.PI + ang;
cg.rotation.x = -sgn * 0.06;
group.add(tag(cg, 'cathead'));
const tip = new THREE.Vector3(0, 0, blen).applyEuler(cg.rotation).add(cg.position);
S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z });
}
}
const grade = S.head || 0;
if (!grade) return;
const g = new THREE.Group();
const x0 = -L / 2 + H.rake(0.02);
const y0 = H.sheer(0.02);
const steeve = (S.steeve || 22) * Math.PI / 180;
const spritY = x => y0 + Math.tan(steeve) * (x0 - x);
const stemEdge = v => surfacePoint(S, H, 0.004, v);
const base = stemEdge(0.66);
const top = stemEdge(1.0);
const kneeX = top[0] - L * (grade >= 2 ? 0.050 : 0.034);
const kneeTopY = spritY(kneeX) - B * 0.020;
const shape = new THREE.Shape();
shape.moveTo(base[0], base[1]);
for (const v of [0.75, 0.85, 0.93, 1.0]) {
const p = stemEdge(v);
shape.lineTo(p[0], p[1]);
}
shape.lineTo(top[0] - L * 0.004, kneeTopY);
shape.lineTo(kneeX, kneeTopY);
shape.quadraticCurveTo(kneeX - L * 0.014, kneeTopY - B * 0.10,
base[0] - L * 0.012, base[1] + B * 0.04);
shape.quadraticCurveTo(base[0] - L * 0.004, base[1] + B * 0.01, base[0], base[1]);
const kneeTh = B * 0.035;
const knee = new THREE.Mesh(
new THREE.ExtrudeGeometry(shape, { depth: kneeTh, bevelEnabled: false }), mats.woodPale);
knee.position.z = -kneeTh / 2;
g.add(knee);
const railR = B * 0.013;
const rails = [];
const pairs = grade >= 2 ? 2 : 1;
for (const sgn of [-1, 1]) {
const side = [];
for (let r = 0; r < pairs; r++) {
const aftU = r === 0 ? 0.085 : 0.050;
const aftV = r === 0 ? 0.96 : 0.86;
const dropY = r === 0 ? 0.04 : 0.05;
const a = surfacePoint(S, H, aftU, aftV);
const land = new THREE.Vector3(kneeX + L * 0.006, kneeTopY - B * (0.030 + r * 0.095),
sgn * (kneeTh / 2 + railR * 0.4));
const p0 = new THREE.Vector3(a[0], a[1], sgn * (a[2] + railR * 0.4));
const mid1 = new THREE.Vector3(
p0.x + (land.x - p0.x) * 0.38, p0.y + (land.y - p0.y) * 0.30 - B * dropY,
sgn * ((a[2] + railR * 0.4) * 0.62 + Math.abs(land.z) * 0.38));
const mid2 = new THREE.Vector3(
p0.x + (land.x - p0.x) * 0.74, p0.y + (land.y - p0.y) * 0.72 - B * dropY * 0.5,
sgn * ((a[2] + railR * 0.4) * 0.24 + Math.abs(land.z) * 0.76));
const curve = new THREE.CatmullRomCurve3([p0, mid1, mid2, land]);
g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, railR, 6, false), mats.woodPale));
side.push(curve);
}
rails.push(side);
}
if (grade >= 2) {
let fStem = 0.5;
for (let i = 0; i <= 40; i++)
if (rails[0][0].getPoint(i / 40).x < top[0]) { fStem = i / 40; break; }
for (let k = 0; k < 3; k++) {
const f = fStem + (0.92 - fStem) * (0.18 + k * 0.32);
for (const side of rails) {
const a = side[0].getPoint(f), b = side[1].getPoint(f);
const d = b.clone().sub(a);
const t = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.009, B * 0.009, d.length(), 6), mats.woodPale);
t.position.copy(a).addScaledVector(d, 0.5);
t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
g.add(t);
}
}
for (let k = 0; k < 4; k++) {
const f = fStem + (0.90 - fStem) * (0.12 + k * 0.25);
const pp = rails[0][0].getPoint(f), ps = rails[1][0].getPoint(f);
const plank = new THREE.Mesh(
new THREE.BoxGeometry(L * 0.014, B * 0.010, Math.abs(pp.z - ps.z) * 0.98 + B * 0.02),
mats.woodPale);
plank.position.set((pp.x + ps.x) / 2, (pp.y + ps.y) / 2 - railR * 0.8, (pp.z + ps.z) / 2);
g.add(plank);
}
}
const gx = top[0] - L * 0.012;
const gy = spritY(gx) + B * 0.032;
const gBot = kneeTopY - B * 0.13;
const cy = (gy + gBot) / 2, semiY = (gy - gBot) / 2, semiZ = B * 0.030;
const gpts = [];
const TURNS = 3, SEG = 22;
for (let i = 0; i <= TURNS * SEG; i++) {
const t = (i / SEG) * Math.PI * 2;
gpts.push(new THREE.Vector3(
gx - B * 0.022 + (i / (TURNS * SEG)) * B * 0.055,
cy + semiY * Math.cos(t), semiZ * Math.sin(t)));
}
g.add(new THREE.Mesh(
new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gpts), TURNS * SEG, B * 0.008, 5, false),
mats.ropeSolid));
group.add(tag(g, 'head'));
}
function buildStern(S, group, mats) {
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const g = new THREE.Group();
const fb = H.sheer(1.0);
const xF = surfacePoint(S, H, 1.0, 1.0)[0];
const atH = zH => surfacePoint(S, H, 1.0, 0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
const halfAt = zH => atH(zH)[2];
const glass = new THREE.MeshStandardMaterial({
color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
const rows = S.sternLights || 0;
const rowZ = [];
for (let r = 0; r < rows; r++)
rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));
const wh = fb * 0.16;
const [plC, plR] = S.sternLightPanes || [3, 3];
const pierF = S.sternLightPierFrac !== undefined ? S.sternLightPierFrac : 0.26;
const pitchT = S.sternLightPitchM || 1.25;
const barW = 0.045, sashT = B * 0.012;
for (const zc of rowZ) {
const hw = halfAt(zc) * 0.84;
const N = Math.max(3, Math.min(7, Math.round((2 * hw) / pitchT)));
const pitch = (2 * hw) / N, lw = pitch * (1 - pierF), gh = wh * 0.80;
const pw = (lw - (plC - 1) * barW) / plC, ph = (gh - (plR - 1) * barW) / plR;
const sash = new THREE.Shape();
sash.moveTo(-hw, zc - wh / 2); sash.lineTo(hw, zc - wh / 2);
sash.lineTo(hw, zc + wh / 2); sash.lineTo(-hw, zc + wh / 2); sash.closePath();
for (let i = 0; i < N; i++) {
const zi = -hw + pitch * (i + 0.5);
for (let cx = 0; cx < plC; cx++) for (let cy = 0; cy < plR; cy++) {
const h0 = zi - lw / 2 + cx * (pw + barW), v0 = zc - gh / 2 + cy * (ph + barW);
const hole = new THREE.Path();
hole.moveTo(h0, v0); hole.lineTo(h0 + pw, v0);
hole.lineTo(h0 + pw, v0 + ph); hole.lineTo(h0, v0 + ph); hole.closePath();
sash.holes.push(hole);
}
}
const fr = new THREE.Mesh(
new THREE.ExtrudeGeometry(sash, { depth: sashT, bevelEnabled: false }),
mats.woodPale);
fr.rotation.y = Math.PI / 2;
fr.position.set(xF + B * 0.002, 0, 0);
g.add(tag(fr, 'sternlight'));
const gl = new THREE.Mesh(new THREE.BoxGeometry(0.012, gh, 2 * hw), glass);
gl.position.set(xF + B * 0.004, zc, 0);
g.add(tag(gl, 'sternlight'));
for (const zm of [zc - wh * 0.80, zc + wh * 0.80]) {
const w2 = halfAt(zm) * 0.94;
const rail = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.008, B * 0.008, w2 * 2, 6), mats.woodDark);
rail.rotation.x = Math.PI / 2;
rail.position.set(xF + B * 0.004, zm, 0);
g.add(tag(rail, 'transom'));
}
}
if (rows || S.gunDecks) {
const halfT = halfAt(fb) * 0.97;
const hR = B * 0.055;
const arc = new THREE.CatmullRomCurve3([
new THREE.Vector3(xF, fb + hR, -halfT),
new THREE.Vector3(xF, fb + hR * 1.35, 0),
new THREE.Vector3(xF, fb + hR, halfT)]);
g.add(tag(new THREE.Mesh(
new THREE.TubeGeometry(arc, 16, B * 0.011, 6, false), mats.woodDark), 'taffrail'));
const NB = 5;
for (let i = 0; i < NB; i++) {
const p = arc.getPoint(i / (NB - 1));
const h = p.y - fb;
const bal = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.005, B * 0.005, h, 5), mats.woodPale);
bal.position.set(xF, fb + h / 2, p.z);
g.add(tag(bal, 'taffrail'));
}
}
if (S.gunDecks) {
const zG0 = fb * 0.30, zG1 = fb * (rows >= 2 ? 0.88 : 0.62);
const NZ = 8, NA = 5, rMax = B * 0.052;
const rAt = zH => {
const t = (zH - zG0) / (zG1 - zG0);
return rMax * Math.pow(Math.min(1, t / 0.30), 0.8);
};
for (const sgn of [-1, 1]) {
const gp = [], gi = [];
for (let j = 0; j <= NZ; j++) {
const zH = zG0 + (zG1 - zG0) * (j / NZ);
const c = atH(zH);
const cz = sgn * c[2] * 0.995, r = rAt(zH);
for (let i = 0; i <= NA; i++) {
const a = (i / NA) * Math.PI / 2;
gp.push(xF + r * Math.cos(a), zH, cz + sgn * r * Math.sin(a));
}
}
for (let j = 0; j < NZ; j++)
for (let i = 0; i < NA; i++) {
const a = j * (NA + 1) + i;
if (sgn > 0) gi.push(a, a + 1, a + NA + 1, a + 1, a + NA + 2, a + NA + 1);
else         gi.push(a, a + NA + 1, a + 1, a + 1, a + NA + 1, a + NA + 2);
}
const gg = new THREE.BufferGeometry();
gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
gg.setIndex(gi); gg.computeVertexNormals();
const bay = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({
color: 0x9c8259, roughness: 0.68, side: THREE.DoubleSide }));
g.add(tag(bay, 'gallery'));
const cT = atH(zG1);
const lid = new THREE.Mesh(
new THREE.CylinderGeometry(rMax * 1.12, rMax * 1.12, B * 0.012, 10), mats.woodDark);
lid.position.set(xF, zG1 + B * 0.006, sgn * cT[2] * 0.995);
g.add(tag(lid, 'gallery'));
for (const zc of (rowZ.length ? rowZ : [(zG0 + zG1) / 2])) {
if (zc < zG0 + wh * 0.5 || zc > zG1 - wh * 0.4) continue;
const c = atH(zc), r = rAt(zc);
const pane = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.010, wh * 0.8, B * 0.045), glass);
pane.position.set(xF + (r + B * 0.004) * Math.SQRT1_2,
zc, sgn * (c[2] * 0.995 + (r + B * 0.004) * Math.SQRT1_2));
pane.rotation.y = -sgn * Math.PI / 4;
g.add(tag(pane, 'gallery'));
}
}
}
group.add(g);
}
function buildJunkEnds(S, group) {
const H = hullSurface(S);
const L = S.lwl;
const plank = new THREE.MeshStandardMaterial({
color: 0x4a3620, roughness: 0.88, side: THREE.DoubleSide });
for (const bow of [true, false]) {
const u0 = bow ? 0.002 : 0.998;
const pos = [], idx = [];
const NV = 16, NW = 8;
for (let j = 0; j <= NV; j++) {
const v = j / NV;
const p = surfacePoint(S, H, u0, v);
const lip = (bow ? -1 : 1) * L * 0.004;
for (let i = 0; i <= NW; i++) {
const t = (i / NW) * 2 - 1;
pos.push(p[0] + (1 - Math.abs(t)) * lip, p[1], t * p[2] * 0.996);
}
}
for (let j = 0; j < NV; j++)
for (let i = 0; i < NW; i++) {
const a = j * (NW + 1) + i;
idx.push(a, a + NW + 1, a + 1, a + 1, a + NW + 1, a + NW + 2);
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setIndex(idx); g.computeVertexNormals();
group.add(tag(new THREE.Mesh(g, plank), bow ? 'bowtransom' : 'sterntransom'));
}
}
function buildJunkCastle(S, group) {
if (!(S.poop && S.poop.length === 3)) return;
const [pA, pB, tiers] = S.poop;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const dh = B * 0.115;
const wall = new THREE.MeshStandardMaterial({
color: 0x6a4d28, roughness: 0.82, side: THREE.DoubleSide });
const roofM = new THREE.MeshStandardMaterial({
color: 0x35281a, roughness: 0.90, side: THREE.DoubleSide });
const lattice = new THREE.MeshStandardMaterial({ color: 0x271c10, roughness: 0.94 });
const g = new THREE.Group();
for (let t = 0; t < tiers; t++) {
const u0 = pA + 0.030 * t, u1 = pB - 0.012 * t;
const inset = B * (0.030 + 0.055 * t);
const half = u => Math.max(B * 0.10,
Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]) - inset);
const y0 = u => H.sheer(u) + dh * t, y1 = u => H.sheer(u) + dh * (t + 1);
const N = Math.max(8, Math.round((u1 - u0) * L / 1.8));
const path = [];
for (let k = 0; k <= N; k++) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L + H.rake(u), z: half(u) }); }
for (let k = N; k >= 0; k--) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L + H.rake(u), z: -half(u) }); }
path.push(path[0]);
const tp = [], ti = [];
for (const p of path)
tp.push(p.x, y0(p.u) - dh * 0.10, p.z, p.x, y1(p.u), p.z);
for (let k = 0; k + 1 < path.length; k++) {
const a = k * 2, b = a + 2;
ti.push(a, b, a + 1, a + 1, b, b + 1);
}
const wg = new THREE.BufferGeometry();
wg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
wg.setIndex(ti); wg.computeVertexNormals();
g.add(new THREE.Mesh(wg, wall));
const ov = B * 0.045;
const rp = [], ri = [];
for (let k = 0; k <= N; k++) {
const u = u0 + (u1 - u0) * k / N;
const ext = (k === 0 ? -1 : k === N ? 1 : 0) * L * 0.006;
rp.push((u - 0.5) * L + H.rake(u) + ext, y1(u) + dh * 0.02, -(half(u) + ov),
(u - 0.5) * L + H.rake(u) + ext, y1(u) + dh * 0.02, (half(u) + ov));
}
for (let k = 0; k < N; k++) { const a = k * 2, b = a + 2; ri.push(a, b, a + 1, a + 1, b, b + 1); }
const rg = new THREE.BufferGeometry();
rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
rg.setIndex(ri); rg.computeVertexNormals();
g.add(new THREE.Mesh(rg, roofM));
const K = Math.max(2, Math.round((u1 - u0) * L / 3.2));
for (let k = 1; k < K; k++) {
const u = u0 + (u1 - u0) * (k / K);
for (const sgn of [-1, 1]) {
const w = new THREE.Mesh(
new THREE.BoxGeometry(L * 0.012, dh * 0.44, B * 0.006), lattice);
w.position.set((u - 0.5) * L + H.rake(u),
(y0(u) + y1(u)) / 2 + dh * 0.06, sgn * half(u));
g.add(w);
}
}
}
group.add(tag(g, 'poop'));
}
function buildAnchor(S, group, mats) {
if (!S.bowsprit) return;
const mat = mats.iron || mats.woodDark;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const shank = Math.min(L, 48) * 0.115 + Math.max(0, L - 48) * 0.004;
for (const sgn of [-1, 1]) {
const g = new THREE.Group();
const sh = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.011, B * 0.016, shank, 14), mat);
g.add(sh);
for (const a of [-1, 1]) {
const arm = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.008, B * 0.012, shank * 0.52, 14), mat);
arm.rotation.z = a * 1.05;
arm.position.set(a * shank * 0.20, -shank * 0.42, 0);
g.add(arm);
const fluke = new THREE.Mesh(
new THREE.ConeGeometry(B * 0.030, shank * 0.24, 4), mat);
fluke.rotation.z = a * 1.05;
fluke.position.set(a * shank * 0.40, -shank * 0.60, 0);
g.add(fluke);
}
const stock = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.020, B * 0.020, shank * 0.82), mat);
stock.position.y = shank * 0.42;
g.add(stock);
const ring = new THREE.Mesh(
new THREE.TorusGeometry(B * 0.026, B * 0.007, 5, 10), mat);
ring.position.y = shank * 0.52;
g.add(ring);
const cat = S.__catheads && S.__catheads[sgn > 0 ? 1 : 0];
if (cat) {
const ring = new THREE.Vector3(cat.x, cat.y - B * 0.035, cat.z);
const uT = Math.min(0.32, 0.105 + (shank * 1.05) / L);
const fb = H.sheer(uT);
const vT = Math.max(0.70, Math.min(0.95,
0.62 + 0.38 * ((ring.y - B * 0.10) / Math.max(0.01, fb))));
const tpv = surfacePoint(S, H, uT, vT);
const tp = new THREE.Vector3(tpv[0], tpv[1], sgn * (tpv[2] + B * 0.030));
const d = tp.clone().sub(ring).normalize();
const nu = surfacePoint(S, H, Math.min(1, uT + 0.01), vT);
const nv = surfacePoint(S, H, uT, Math.min(0.99, vT + 0.02));
const tU = new THREE.Vector3(nu[0] - tpv[0], nu[1] - tpv[1], nu[2] - tpv[2]);
const tV = new THREE.Vector3(nv[0] - tpv[0], nv[1] - tpv[1], nv[2] - tpv[2]);
const nrm = tU.cross(tV).normalize();
if (nrm.z < 0) nrm.negate();
nrm.z *= sgn;
const yA = d.clone().negate();
const xA = new THREE.Vector3().crossVectors(yA, nrm).normalize();
const zA = new THREE.Vector3().crossVectors(xA, yA).normalize();
g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
g.position.copy(ring).addScaledVector(d, shank * 0.52);
const pend = ropeMesh([[new THREE.Vector3(cat.x, cat.y, cat.z), ring]],
0.018 + B * 0.0006, mats.ropeSolid || mat);
if (pend) group.add(tag(pend, 'anchor', 'Cat pendant'));
group.add(tag(g, 'anchor'));
continue;
}
const p = surfacePoint(S, H, 0.09, 0.94);
g.position.set(p[0], p[1] - shank * 0.12, sgn * (p[2] + B * 0.05));
g.rotation.x = sgn * 0.30;
g.rotation.z = 0.42;
group.add(tag(g, 'anchor'));
}
}
function buildOars(S, group, mat) {
const n = S.oarBanks || 0;
if (!n) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const g = new THREE.Group();
const perBankArr = S.oarsPerBank;
const perBankOf = b => Array.isArray(perBankArr) ? perBankArr[b]
: (perBankArr || 27);
const INTERSCALMIUM = S.interscalmium || 0.98;
const oarLen = S.oarLen || 4.2;
const AP = S.apostis;
const pdMid = AP && surfacePoint(S, H, 0.5, 1.0);
const apZ = AP && Math.abs(pdMid[2]) + AP.out;
const apY = AP && pdMid[1] + B * 0.115;
const RO = S.oarStyle === 'ro';
const roInb = oarLen * 0.38, roOutb = oarLen * 0.62;
const bladeLoft = (prof, runLen) => {
const bp = { pos: [], idx: [] };
const quadB = (a2, b2, c2, d2) => { const k = bp.pos.length / 3;
bp.pos.push(...a2, ...b2, ...c2, ...d2);
bp.idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
const rings = prof.map(([f, w, d2, y]) => { const z = f * runLen,
xw = w * B, yd = d2 * B, yc = y * B;
return [[-xw, yc - yd, z], [xw, yc - yd, z],
[xw, yc + yd, z], [-xw, yc + yd, z]]; });
for (let s = 0; s < rings.length - 1; s++)
for (let e = 0; e < 4; e++) {
const e2 = (e + 1) % 4;
quadB(rings[s][e], rings[s + 1][e], rings[s + 1][e2], rings[s][e2]);
}
quadB(...rings[0]);
quadB(...[...rings[rings.length - 1]].reverse());
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(bp.pos, 3));
geo.setIndex(bp.idx); geo.computeVertexNormals();
return geo;
};
let bladeRo = null, matRo = null;
if (RO) {
matRo = mat.clone(); matRo.side = THREE.DoubleSide;
bladeRo = bladeLoft([
[0.00, 0.0050, 0.0165,  0.0000],
[0.20, 0.0049, 0.0180, -0.0010],
[0.42, 0.0046, 0.0215, -0.0025],
[0.62, 0.0043, 0.0250, -0.0038],
[0.82, 0.0039, 0.0260, -0.0040],
[1.00, 0.0033, 0.0205, -0.0040]], roOutb);
}
let bladeSw = null, matSw = null, loomSwGeo = null;
const swInb = oarLen * 0.26, swOutb = oarLen * 0.74;
if (!RO && n) {
matSw = mat.clone(); matSw.side = THREE.DoubleSide;
bladeSw = bladeLoft([
[0.70, 0.0100, 0.0100, 0],
[0.78, 0.0070, 0.0200, 0],
[0.86, 0.0050, 0.0300, 0],
[0.93, 0.0042, 0.0365, 0],
[0.97, 0.0038, 0.0375, 0],
[1.00, 0.0028, 0.0260, 0]], swOutb);
loomSwGeo = new THREE.CylinderGeometry(B * 0.010, B * 0.014, swInb + swOutb * 0.72, 6);
}
for (let bank = 0; bank < n; bank++) {
const v = RO ? 0.96 : 0.70 + bank * 0.11;
const out = 1.0 + bank * 0.22;
const perBank = perBankOf(bank);
const spread = 0.62 + bank * 0.05;
for (let i = 0; i < perBank; i++) {
const span = (perBank - 1) * INTERSCALMIUM / L;
const uc = AP ? (AP.from + AP.to) / 2 : 0.5;
const u = uc - span / 2 + (i / (perBank - 1)) * span + bank * 0.006;
const p = surfacePoint(S, H, u, Math.min(0.99, v));
for (const sgn of [-1, 1]) {
const o = new THREE.Group();
if (RO) {
const inb = roInb, outb = roOutb;
const DOG = 0.35;
o.add(new THREE.Mesh(bladeRo, matRo));
const loom = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.011, B * 0.014, inb, 6), mat);
loom.rotation.x = Math.PI / 2 + DOG;
loom.position.set(0, inb * 0.5 * Math.sin(DOG), -inb * 0.5 * Math.cos(DOG));
o.add(loom);
o.position.set(p[0], p[1], sgn * p[2]);
let psi = 0.62 + 0.55 * Math.pow(2 * Math.abs(u - 0.5), 2);
const spanIn = inb * Math.cos(DOG), lim = Math.abs(p[2]) * 0.85;
if (spanIn * Math.cos(psi) > lim) psi = Math.acos(lim / spanIn);
const hyp = Math.hypot(outb, p[1] + 0.5), c = outb / hyp;
const dir = new THREE.Vector3(Math.sin(psi) * c, -(p[1] + 0.5) / hyp,
sgn * Math.cos(psi) * c);
o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
o.userData.oar = { sgn, bank, style: 'ro', qRest: o.quaternion.clone(),
ph: (i * 0.618 + (sgn > 0 ? 0 : 0.31)) % 1, outb };
g.add(o);
continue;
}
const inb = swInb, outb = swOutb;
const shaft = new THREE.Mesh(loomSwGeo, mat);
shaft.rotation.x = Math.PI / 2;
shaft.position.z = (outb * 0.72 - inb) / 2;
o.add(shaft);
o.add(new THREE.Mesh(bladeSw, matSw));
if (AP) o.position.set(p[0], apY, sgn * apZ);
else o.position.set(p[0], p[1], sgn * p[2] * out);
o.rotation.y = sgn > 0 ? 0 : Math.PI;
const restX = AP ? -Math.atan2(apY + B * 0.02, outb)
: -Math.atan2(Math.max(0.15, p[1]) + B * 0.02, outb);
o.rotation.x = restX;
o.userData.oar = { sgn, restY: o.rotation.y, restX, bank };
g.add(o);
}
}
}
group.add(tag(g, 'oar'));
}
function buildGalleyWorks(S, group, mats) {
const AP = S.apostis;
if (!S.spur && !AP && !S.gunDeck && !S.tower) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const timber = mats.woodDark, pale = mats.woodPale;
const beamAB = (a, b, w, h, mat) => {
const d = b.clone().sub(a), len = d.length();
const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, h), mat);
m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
m.position.copy(a).addScaledVector(d, len / 2);
return m;
};
const sparAB = (a, b, rFoot, rTip, mat) => {
const d = b.clone().sub(a), len = d.length();
const m = new THREE.Mesh(new THREE.CylinderGeometry(rTip, rFoot, len, 4, 1), mat);
m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
m.rotateY(Math.PI / 4);
m.position.copy(a).addScaledVector(d, len / 2);
return m;
};
const plankGeo = (w, h, len) => {
const c = Math.min(w, h) * 0.28, hw = w / 2, hh = h / 2;
const s = new THREE.Shape();
s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.lineTo(hw, -hh + c);
s.lineTo(hw, hh - c); s.lineTo(hw - c, hh); s.lineTo(-hw + c, hh);
s.lineTo(-hw, hh - c); s.lineTo(-hw, -hh + c); s.closePath();
const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
g.translate(0, 0, -len / 2);
return g;
};
const deckGeo = (width, t, len, pitch) => {
const hw = width / 2, hh = t / 2, c = t * 0.35;
const g = 0.007, d = t * 0.40;
const s = new THREE.Shape();
s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.lineTo(hw, -hh + c);
s.lineTo(hw, hh - c); s.lineTo(hw - c, hh);
const n = Math.max(1, Math.round(width / pitch));
for (let k = n - 1; k >= 1; k--) {
const z = -hw + (k / n) * width;
s.lineTo(z + g, hh); s.lineTo(z, hh - d); s.lineTo(z - g, hh);
}
s.lineTo(-hw + c, hh); s.lineTo(-hw, hh - c); s.lineTo(-hw, -hh + c);
s.closePath();
const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
geo.translate(0, 0, -len / 2);
return geo;
};
const pdMid = surfacePoint(S, H, 0.5, 1.0);
const deckY = pdMid[1];
const apZ = AP ? Math.abs(pdMid[2]) + AP.out : Math.abs(pdMid[2]);
const apY = deckY + B * 0.115;
if (S.spur) {
const p0 = surfacePoint(S, H, 0.002, 1.0);
const heel = new THREE.Vector3(p0[0] + B * 0.20, p0[1] * 0.62, 0);
const tip = new THREE.Vector3(p0[0] - S.spur, p0[1] * 0.62 + S.spur * 0.10, 0);
const dir = tip.clone().sub(heel).normalize();
const slen = heel.distanceTo(tip);
const sg = new THREE.CylinderGeometry(B * 0.020, B * 0.042, slen, 4, 1);
const spar = new THREE.Mesh(sg, timber);
spar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
spar.rotation.z += 0; spar.rotateY(Math.PI / 4);
spar.position.copy(heel).addScaledVector(dir, slen / 2);
group.add(tag(spar, 'spur'));
const shoe = new THREE.Mesh(new THREE.ConeGeometry(B * 0.018, B * 0.10, 4), mats.iron);
shoe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
shoe.position.copy(tip).addScaledVector(dir, B * 0.04);
group.add(tag(shoe, 'spur', 'Spur shoe'));
for (const sgn of [-1, 1]) {
const pk = surfacePoint(S, H, 0.030, 0.90);
const a = new THREE.Vector3(pk[0], pk[1], sgn * pk[2]);
const b = heel.clone().addScaledVector(dir, slen * 0.30);
group.add(tag(beamAB(a, b, B * 0.026, B * 0.030, timber), 'spur', 'Cheek knee'));
}
}
if (AP) {
const xF = (AP.from - 0.5) * L, xT = (AP.to - 0.5) * L;
const inter = S.interscalmium || 0.98;
const perBank = Array.isArray(S.oarsPerBank) ? S.oarsPerBank[0] : (S.oarsPerBank || 24);
const railH = B * 0.040;
const benchT = B * 0.014;
const benchY = deckY + B * 0.073;
const bUnder = benchY - benchT / 2;
const footZ0 = Math.abs(pdMid[2]) - B * 0.020;
const headY = apY - B * 0.026, headZ = apZ + B * 0.020;
const beamHalf = B * 0.019;
const bandaD = B * 0.016, bandaW = B * 0.050;
const tB = (bUnder - bandaD - (deckY + beamHalf)) / (headY - deckY);
const bandaZ = footZ0 + Math.max(0.15, Math.min(0.92, tB)) * (headZ - footZ0);
const span = (perBank - 1) * inter / L;
const uc = (AP.from + AP.to) / 2;
for (const sgn of [-1, 1]) {
const rail = new THREE.Mesh(
new THREE.BoxGeometry(xT - xF, railH, B * 0.034), timber);
rail.position.set((xF + xT) / 2, apY, sgn * apZ);
group.add(tag(rail, 'apostis'));
const banda = new THREE.Mesh(
new THREE.BoxGeometry(xT - xF, bandaD, bandaW), timber);
banda.position.set((xF + xT) / 2, bUnder - bandaD / 2, sgn * bandaZ);
group.add(tag(banda, 'apostis', 'Banda',
'The stringer along the beams that the benches’ outboard ends rest on.'));
for (let i = 0; i < perBank; i++) {
const u = uc - span / 2 + (i / (perBank - 1)) * span;
const pd = surfacePoint(S, H, u, 1.0);
const a = new THREE.Vector3(pd[0], pd[1], sgn * (Math.abs(pd[2]) - B * 0.020));
const b = new THREE.Vector3(pd[0], headY, sgn * headZ);
group.add(tag(sparAB(a, b, B * 0.017, B * 0.011, timber), 'apostis', 'Baccalaro',
'The cantilever from the gunwale that carries the rowing frame.'));
const pin = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.008, B * 0.008, B * 0.055, 6), timber);
pin.position.set(pd[0] - 0.06, apY + railH / 2 + B * 0.018, sgn * apZ);
group.add(tag(pin, 'apostis', 'Thole'));
const bLen = apZ - B * 0.010 - B * 0.088;
const bench = new THREE.Mesh(plankGeo(B * 0.055, benchT, bLen), pale);
bench.position.set(pd[0], benchY, sgn * (B * 0.088 + bLen / 2));
bench.rotation.y = sgn * 0.17;
group.add(tag(bench, 'bench'));
const pLen = bLen * 0.62;
const ped = new THREE.Mesh(plankGeo(B * 0.032, B * 0.010, pLen), pale);
ped.position.set(pd[0] + inter * 0.5, deckY + B * 0.008,
sgn * (B * 0.080 + pLen / 2));
ped.rotation.set(0, sgn * 0.17, 0.6);
group.add(tag(ped, 'bench', 'Pedagna',
'The footboard. A scaloccio stroke is climb-and-fall: step up, drop back.'));
}
}
const corsia = new THREE.Mesh(
new THREE.BoxGeometry(xT - xF, B * 0.086, B * 0.17), timber);
corsia.position.set((xF + xT) / 2, deckY + B * 0.043, 0);
group.add(tag(corsia, 'apostis', 'Corsia',
'The raised gangway down the centreline, the only way fore and aft on a deck that '
+ 'is otherwise benches. The boatswain walks it; so does everyone going forward to fight.'));
}
if (S.gunDeck && !AP) {
const GD = S.gunDeck;
const gdY = deckY + GD.height;
const over = GD.over !== undefined ? GD.over : B * 0.045;
const N = 22;
const sx = [], railY = [], halfW = [];
for (let i = 0; i <= N; i++) {
const u = GD.from + (GD.to - GD.from) * i / N;
const pd = surfacePoint(S, H, u, 1.0);
sx.push(pd[0]); railY.push(pd[1]); halfW.push(Math.abs(pd[2]) + over);
}
const pos = [], idx = [];
for (let i = 0; i <= N; i++) {
pos.push(sx[i], gdY, -halfW[i], sx[i], gdY, halfW[i]);
if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
}
const dg = new THREE.BufferGeometry();
dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
dg.setIndex(idx); dg.computeVertexNormals();
const paleDS = pale.clone(); paleDS.side = THREE.DoubleSide;
group.add(tag(new THREE.Mesh(dg, paleDS), 'gundeck', GD.name, GD.what));
const surfY = gdY + B * 0.007;
const shH = GD.screenH !== undefined ? GD.screenH : B * 0.042;
const nSama = Math.max(0, GD.loops | 0);
const nG = Math.max(0, GD.gunsPerSide | 0);
const timberC = timber.clone(); timberC.side = THREE.DoubleSide;
for (const sgn of [-1, 1]) {
for (let i = 0; i <= N; i += 2) {
const a = new THREE.Vector3(sx[i], railY[i], sgn * (halfW[i] - over));
const b = new THREE.Vector3(sx[i], gdY, sgn * (halfW[i] - B * 0.020));
group.add(tag(beamAB(a, b, B * 0.020, B * 0.020, timber), 'gundeck', 'Stanchion'));
}
{
const cvh = B * 0.015, cah = B * 0.014, cyC = gdY - B * 0.016;
const zCl = i => halfW[i] - B * 0.014;
const cp = { pos: [], idx: [] };
const quadCl = (a2, b2, c2, d2) => { const k = cp.pos.length / 3;
cp.pos.push(...a2, ...b2, ...c2, ...d2);
cp.idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
for (let i = 0; i < N; i++) {
const xA = sx[i], xB = sx[i + 1], zA = zCl(i), zB = zCl(i + 1);
quadCl([xA, cyC + cvh, sgn * (zA - cah)], [xB, cyC + cvh, sgn * (zB - cah)],
[xB, cyC + cvh, sgn * (zB + cah)], [xA, cyC + cvh, sgn * (zA + cah)]);
quadCl([xA, cyC - cvh, sgn * (zA - cah)], [xB, cyC - cvh, sgn * (zB - cah)],
[xB, cyC - cvh, sgn * (zB + cah)], [xA, cyC - cvh, sgn * (zA + cah)]);
quadCl([xA, cyC - cvh, sgn * (zA + cah)], [xB, cyC - cvh, sgn * (zB + cah)],
[xB, cyC + cvh, sgn * (zB + cah)], [xA, cyC + cvh, sgn * (zA + cah)]);
quadCl([xA, cyC - cvh, sgn * (zA - cah)], [xB, cyC - cvh, sgn * (zB - cah)],
[xB, cyC + cvh, sgn * (zB - cah)], [xA, cyC + cvh, sgn * (zA - cah)]);
}
for (const iE of [0, N])
quadCl([sx[iE], cyC - cvh, sgn * (zCl(iE) - cah)],
[sx[iE], cyC - cvh, sgn * (zCl(iE) + cah)],
[sx[iE], cyC + cvh, sgn * (zCl(iE) + cah)],
[sx[iE], cyC + cvh, sgn * (zCl(iE) - cah)]);
const cg2 = new THREE.BufferGeometry();
cg2.setAttribute('position', new THREE.Float32BufferAttribute(cp.pos, 3));
cg2.setIndex(cp.idx); cg2.computeVertexNormals();
group.add(tag(new THREE.Mesh(cg2, timberC), 'gundeck', 'Deck clamp'));
}
if (!nSama && !nG) for (let i = 0; i < N; i++) {
const ba = new THREE.Vector3(sx[i], surfY + shH / 2, sgn * (halfW[i] - B * 0.006));
const bb = new THREE.Vector3(sx[i + 1], surfY + shH / 2, sgn * (halfW[i + 1] - B * 0.006));
group.add(tag(beamAB(ba, bb, shH, B * 0.012, timber), 'gundeck', 'Bulwark',
'Heavy plank, chest-high, around the whole fighting deck — the rowers below it, '
+ 'the marines behind it, and the reason boarding a panokseon means climbing.'));
}
}
for (const uE of [GD.from, GD.to]) {
const pd = surfacePoint(S, H, uE, 1.0);
const hwE = Math.abs(pd[2]) + over;
const panel = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.012, shH, hwE * 2 - B * 0.012), timber);
panel.position.set(pd[0], surfY + shH / 2, 0);
group.add(tag(panel, 'gundeck', 'End bulwark'));
}
const portMat = new THREE.MeshStandardMaterial({ color: 0x17120c, roughness: 0.95 });
if (GD.walls) {
const wIn = B * 0.006;
const headY = gdY - B * 0.016;
const timberDS = timber.clone(); timberDS.side = THREE.DoubleSide;
const tS = B * 0.012;
const nP = Math.max(0, GD.wallPorts | 0);
const duP = 0.26 / L;
const yPc = headY - 0.42, ypS = yPc - 0.25, ypH = yPc + 0.25;
const portDSS = portMat.clone(); portDSS.side = THREE.DoubleSide;
const usS = [], portsS = [];
for (let i = 0; i <= N; i++) usS.push(GD.from + (GD.to - GD.from) * i / N);
for (let j = 0; j < nP; j++) {
const uj = GD.from + (GD.to - GD.from) * (j + 0.5) / nP;
portsS.push([uj - duP, uj + duP]); usS.push(uj - duP, uj + duP);
}
usS.sort((a, b) => a - b);
const inPort = u => portsS.some(s => u > s[0] + 1e-9 && u < s[1] - 1e-9);
const stS = u => {
const p = surfacePoint(S, H, u, 1.0);
const footY = p[1] - B * 0.010;
const footZ = Math.abs(p[2]) - wIn;
const headZ = Math.abs(p[2]) + over - B * 0.020 - wIn;
return { x: p[0], footY,
z: y => footZ + (headZ - footZ) * (y - footY) / (headY - footY) };
};
for (const sgn of [-1, 1]) {
const wallS = { pos: [], idx: [] }, revS = { pos: [], idx: [] };
const quadS = (gq, a, b, c, d) => {
const k = gq.pos.length / 3;
gq.pos.push(...a, ...b, ...c, ...d);
gq.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
};
for (let i = 0; i < usS.length - 1; i++) {
if (usS[i + 1] - usS[i] < 1e-7) continue;
const a = stS(usS[i]), b = stS(usS[i + 1]);
const oA = y => sgn * a.z(y), oB = y => sgn * b.z(y);
const iA = y => sgn * (a.z(y) - tS), iB = y => sgn * (b.z(y) - tS);
quadS(wallS, [a.x, a.footY, oA(a.footY)], [b.x, b.footY, oB(b.footY)],
[b.x, ypS, oB(ypS)], [a.x, ypS, oA(ypS)]);
quadS(wallS, [a.x, a.footY, iA(a.footY)], [b.x, b.footY, iB(b.footY)],
[b.x, ypS, iB(ypS)], [a.x, ypS, iA(ypS)]);
quadS(wallS, [a.x, ypH, oA(ypH)], [b.x, ypH, oB(ypH)],
[b.x, headY, oB(headY)], [a.x, headY, oA(headY)]);
quadS(wallS, [a.x, ypH, iA(ypH)], [b.x, ypH, iB(ypH)],
[b.x, headY, iB(headY)], [a.x, headY, iA(headY)]);
quadS(wallS, [a.x, headY, iA(headY)], [b.x, headY, iB(headY)],
[b.x, headY, oB(headY)], [a.x, headY, oA(headY)]);
quadS(wallS, [a.x, a.footY, oA(a.footY)], [b.x, b.footY, oB(b.footY)],
[b.x, b.footY, iB(b.footY)], [a.x, a.footY, iA(a.footY)]);
if (!inPort((usS[i] + usS[i + 1]) / 2)) {
quadS(wallS, [a.x, ypS, oA(ypS)], [b.x, ypS, oB(ypS)],
[b.x, ypH, oB(ypH)], [a.x, ypH, oA(ypH)]);
quadS(wallS, [a.x, ypS, iA(ypS)], [b.x, ypS, iB(ypS)],
[b.x, ypH, iB(ypH)], [a.x, ypH, iA(ypH)]);
}
}
for (const uE of [usS[0], usS[usS.length - 1]]) {
const e = stS(uE);
quadS(wallS, [e.x, e.footY, sgn * (e.z(e.footY) - tS)],
[e.x, e.footY, sgn * e.z(e.footY)],
[e.x, headY, sgn * e.z(headY)],
[e.x, headY, sgn * (e.z(headY) - tS)]);
}
for (const [uL2, uR2] of portsS) {
const l = stS(uL2), r = stS(uR2);
const oL = y => sgn * l.z(y), iL = y => sgn * (l.z(y) - tS);
const oR = y => sgn * r.z(y), iR = y => sgn * (r.z(y) - tS);
quadS(revS, [l.x, ypS, oL(ypS)], [l.x, ypS, iL(ypS)],
[l.x, ypH, iL(ypH)], [l.x, ypH, oL(ypH)]);
quadS(revS, [r.x, ypS, oR(ypS)], [r.x, ypS, iR(ypS)],
[r.x, ypH, iR(ypH)], [r.x, ypH, oR(ypH)]);
quadS(revS, [l.x, ypS, oL(ypS)], [r.x, ypS, oR(ypS)],
[r.x, ypS, iR(ypS)], [l.x, ypS, iL(ypS)]);
quadS(revS, [l.x, ypH, oL(ypH)], [r.x, ypH, oR(ypH)],
[r.x, ypH, iR(ypH)], [l.x, ypH, iL(ypH)]);
}
const mkS = (gq, mat, name, what) => {
const bg = new THREE.BufferGeometry();
bg.setAttribute('position', new THREE.Float32BufferAttribute(gq.pos, 3));
bg.setIndex(gq.idx); bg.computeVertexNormals();
group.add(tag(new THREE.Mesh(bg, mat), 'sangjang', name, what));
};
mkS(wallS, timberDS, 'Sangjang belt',
'The closed plank belt between the gunwale and the fighting deck — the '
+ 'oar deck\'s own protection. The rowers work behind it, and the ro '
+ 'reach out under its foot seam.');
mkS(revS, timberDS, 'Oar-deck port',
'The row of small square ports her plate draws under the deck line, cut '
+ 'through the belt — from outside each is a dark square in the plank, '
+ 'reading into the oar deck\'s own shadow.');
const brdS = { pos: [], idx: [] };
const mrgS = 0.06;
for (const [uL2, uR2] of portsS) {
const l = stS(uL2), r = stS(uR2);
const zb = sgn * (Math.min(l.z(ypS - mrgS), r.z(ypS - mrgS)) - tS - 0.08);
const x0 = Math.min(l.x, r.x) - mrgS, x1 = Math.max(l.x, r.x) + mrgS;
const k = brdS.pos.length / 3;
brdS.pos.push(x0, ypS - mrgS, zb, x1, ypS - mrgS, zb,
x1, ypH + mrgS, zb, x0, ypH + mrgS, zb);
brdS.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
}
mkS(brdS, portDSS, 'Oar-deck port');
}
for (const uE of [GD.from, GD.to]) {
const pd = surfacePoint(S, H, uE, 1.0);
const zf = Math.abs(pd[2]) - wIn, zh = Math.abs(pd[2]) + over - B * 0.020 - wIn;
const ep = [pd[0], pd[1] - B * 0.010, -zf,  pd[0], pd[1] - B * 0.010, zf,
pd[0], headY, zh,               pd[0], headY, -zh];
const eg = new THREE.BufferGeometry();
eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
eg.setIndex([0, 1, 2, 0, 2, 3]);
eg.computeVertexNormals();
group.add(tag(new THREE.Mesh(eg, timberDS), 'sangjang',
uE === GD.from ? 'Oar-deck end wall, forward' : 'Oar-deck end wall, aft'));
}
}
if (GD.maku) {
const clothMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.94,
side: THREE.DoubleSide });
const valMat = new THREE.MeshStandardMaterial({ color: 0x252a38, roughness: 0.94,
side: THREE.DoubleSide });
const lipIn = B * 0.010;
const tuck = 0.10;
const clear = 0.15;
const headYc = gdY - B * 0.016;
const atCloth = (f, s, sgn) => {
const t = Math.min(1, Math.max(0, f)) * N;
const i = Math.min(N - 1, Math.floor(t)), w = t - i;
const xx = sx[i] + (sx[i + 1] - sx[i]) * w;
const ry = railY[i] + (railY[i + 1] - railY[i]) * w;
const hw = halfW[i] + (halfW[i + 1] - halfW[i]) * w;
return [xx, headYc + (ry + clear - headYc) * s, sgn * (hw - lipIn - tuck * s)];
};
const depCloth = f => {
const t = Math.min(1, Math.max(0, f)) * N;
const i = Math.min(N - 1, Math.floor(t)), w = t - i;
return headYc - (railY[i] + (railY[i + 1] - railY[i]) * w + clear);
};
const bayM = GD.makuBayM !== undefined ? GD.makuBayM : 0.7;
const bandLen = Math.abs(sx[N] - sx[0]);
const nSc = Math.max(4, Math.round(bandLen / bayM));
const pitchF = 1 / nSc, rM = bandLen / nSc / 2;
const SEG = Math.max(12, Math.ceil(Math.PI * rM / 0.07));
const lay = 0.008;
for (const sgn of [-1, 1]) {
const cpos = [], cidx = [];
for (let i = 0; i <= N; i++) {
cpos.push(sx[i], headYc,           sgn * (halfW[i] - lipIn),
sx[i], railY[i] + clear, sgn * (halfW[i] - lipIn - tuck));
if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
}
const cg = new THREE.BufferGeometry();
cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
cg.setIndex(cidx); cg.computeVertexNormals();
group.add(tag(new THREE.Mesh(cg, clothMat), 'maku', 'Maku',
'The cloth band the Busan scroll hangs along the yagura band on hull after '
+ 'hull of the anchored fleet — white, under a dark scalloped hem. Dress and '
+ 'concealment both: an arquebusier behind it cannot be counted.'));
const vpos = [], vidx = [];
for (let j = 0; j < nSc; j++) {
const fc = (j + 0.5) * pitchF;
const base = vpos.length / 3;
const ap = atCloth(fc, 0, sgn);
vpos.push(ap[0], ap[1], ap[2] + sgn * lay);
for (let k = 0; k <= SEG; k++) {
const th = Math.PI + Math.PI * k / SEG;
const f = fc + Math.cos(th) * pitchF / 2;
const d = -Math.sin(th) * rM;
const p = atCloth(f, Math.min(1, d / Math.max(depCloth(f), 1e-6)), sgn);
vpos.push(p[0], p[1], p[2] + sgn * lay);
if (k) vidx.push(base, base + k, base + k + 1);
}
}
const vg = new THREE.BufferGeometry();
vg.setAttribute('position', new THREE.Float32BufferAttribute(vpos, 3));
vg.setIndex(vidx); vg.computeVertexNormals();
group.add(tag(new THREE.Mesh(vg, valMat), 'maku', 'Maku valance',
'The dark scalloped border at the cloth band\'s head — tangent semicircles '
+ 'cut from one strip, hanging from the line the cloth itself hangs from, as '
+ 'the scroll draws them on hull after hull. Until round 170 the scallops '
+ 'were drawn spaced apart and off the band\'s foot; the plate hangs them '
+ 'touching, at the head.'));
}
}
if (nSama || nG) {
const t = B * 0.012;
const nOp = nSama || nG;
const opHalf = nSama ? 0.05 : B * 0.0275;
const du = opHalf / L;
const yB2 = surfY, yT2 = surfY + shH;
const yAx = surfY + B * 0.042;
const yS = nSama ? surfY + shH * 0.48 : yAx - opHalf;
const yH2 = nSama ? surfY + shH * 0.72 : yAx + opHalf;
const timberDS2 = timber.clone(); timberDS2.side = THREE.DoubleSide;
const portDS = portMat.clone(); portDS.side = THREE.DoubleSide;
const us = [], slots = [];
for (let i = 0; i <= N; i++) us.push(GD.from + (GD.to - GD.from) * i / N);
for (let j = 0; j < nOp; j++) {
const uj = GD.from + (GD.to - GD.from) * (j + 0.5) / nOp;
slots.push([uj - du, uj + du]); us.push(uj - du, uj + du);
}
us.sort((a, b) => a - b);
const inSlot = u => slots.some(s => u > s[0] + 1e-9 && u < s[1] - 1e-9);
const st = u => { const p = surfacePoint(S, H, u, 1.0);
return { x: p[0], w: Math.abs(p[2]) + over - B * 0.006 }; };
for (const sgn of [-1, 1]) {
const wall = { pos: [], idx: [] }, rev = { pos: [], idx: [] };
const quad = (g, a, b, c, d) => {
const k = g.pos.length / 3;
g.pos.push(...a, ...b, ...c, ...d);
g.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
};
for (let i = 0; i < us.length - 1; i++) {
if (us[i + 1] - us[i] < 1e-7) continue;
const a = st(us[i]), b = st(us[i + 1]);
const zoA = sgn * (a.w + t / 2), zoB = sgn * (b.w + t / 2);
const ziA = sgn * (a.w - t / 2), ziB = sgn * (b.w - t / 2);
quad(wall, [a.x, yB2, zoA], [b.x, yB2, zoB], [b.x, yS, zoB], [a.x, yS, zoA]);
quad(wall, [a.x, yB2, ziA], [b.x, yB2, ziB], [b.x, yS, ziB], [a.x, yS, ziA]);
quad(wall, [a.x, yH2, zoA], [b.x, yH2, zoB], [b.x, yT2, zoB], [a.x, yT2, zoA]);
quad(wall, [a.x, yH2, ziA], [b.x, yH2, ziB], [b.x, yT2, ziB], [a.x, yT2, ziA]);
quad(wall, [a.x, yT2, ziA], [b.x, yT2, ziB], [b.x, yT2, zoB], [a.x, yT2, zoA]);
if (!inSlot((us[i] + us[i + 1]) / 2)) {
quad(wall, [a.x, yS, zoA], [b.x, yS, zoB], [b.x, yH2, zoB], [a.x, yH2, zoA]);
quad(wall, [a.x, yS, ziA], [b.x, yS, ziB], [b.x, yH2, ziB], [a.x, yH2, ziA]);
}
}
for (const uE of [us[0], us[us.length - 1]]) {
const e = st(uE);
quad(wall, [e.x, yB2, sgn * (e.w - t / 2)], [e.x, yB2, sgn * (e.w + t / 2)],
[e.x, yT2, sgn * (e.w + t / 2)], [e.x, yT2, sgn * (e.w - t / 2)]);
}
for (const [uL2, uR2] of slots) {
const l = st(uL2), r = st(uR2);
quad(rev, [l.x, yS, sgn * (l.w + t / 2)], [l.x, yS, sgn * (l.w - t / 2)],
[l.x, yH2, sgn * (l.w - t / 2)], [l.x, yH2, sgn * (l.w + t / 2)]);
quad(rev, [r.x, yS, sgn * (r.w + t / 2)], [r.x, yS, sgn * (r.w - t / 2)],
[r.x, yH2, sgn * (r.w - t / 2)], [r.x, yH2, sgn * (r.w + t / 2)]);
quad(rev, [l.x, yS, sgn * (l.w + t / 2)], [r.x, yS, sgn * (r.w + t / 2)],
[r.x, yS, sgn * (r.w - t / 2)], [l.x, yS, sgn * (l.w - t / 2)]);
quad(rev, [l.x, yH2, sgn * (l.w + t / 2)], [r.x, yH2, sgn * (r.w + t / 2)],
[r.x, yH2, sgn * (r.w - t / 2)], [l.x, yH2, sgn * (l.w - t / 2)]);
}
const mk = (g, mat, name, what) => {
const bg = new THREE.BufferGeometry();
bg.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
bg.setIndex(g.idx); bg.computeVertexNormals();
group.add(tag(new THREE.Mesh(bg, mat),
name === 'Tate-ita' || name === 'Bulwark' ? 'gundeck'
: nSama ? 'sama' : 'gun',
name, what));
};
if (nSama) {
mk(wall, timberDS2, 'Tate-ita',
'The shield planking around the fighting deck, pierced by the sama — thinner '
+ 'than an atakebune\'s, and the storey a boarding party has to climb.');
mk(rev, timberDS2, 'Sama',
'Firing slots for bow and arquebus, cut through the tate-ita — the wall\'s '
+ 'whole purpose on a hull that mounts no broadside.');
} else {
mk(wall, timberDS2, 'Bulwark',
'Heavy plank, chest-high, around the whole fighting deck — the rowers below it, '
+ 'the marines behind it, and the reason boarding a panokseon means climbing.');
mk(rev, timberDS2, 'Gun port',
'A square port for each chongtong, cut low through the bulwark so the muzzle '
+ 'clears its own bed and stands out of the plank. The gunners reload behind '
+ 'the wall; from outside the broadside is a row of dark squares under an '
+ 'unbroken wall top.');
}
const brd = { pos: [], idx: [] };
const quadB = (a, b, c, d) => {
const k = brd.pos.length / 3;
brd.pos.push(...a, ...b, ...c, ...d);
brd.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
};
const mrg = 0.06;
for (const [uL2, uR2] of slots) {
const l = st(uL2), r = st(uR2);
const zb = sgn * ((l.w + r.w) / 2 - t / 2 - 0.08);
const x0 = Math.min(l.x, r.x) - mrg, x1 = Math.max(l.x, r.x) + mrg;
quadB([x0, yS - mrg, zb], [x1, yS - mrg, zb],
[x1, yH2 + mrg, zb], [x0, yH2 + mrg, zb]);
}
mk(brd, portDS, nSama ? 'Sama' : 'Gun port', undefined);
}
}
for (const sgn of [-1, 1]) for (let j = 0; j < nG; j++) {
const u = GD.from + (GD.to - GD.from) * (j + 0.5) / nG;
const pd = surfacePoint(S, H, u, 1.0);
const hw = Math.abs(pd[2]) + over;
const len = B * 0.22, r = B * 0.014;
const g = new THREE.Group();
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(r * 0.72, r, len, 12), mats.iron);
bar.rotation.x = sgn * Math.PI / 2;
g.add(bar);
const carr = new THREE.Mesh(
new THREE.BoxGeometry(r * 3.2, r * 2.4, len * 0.48), timber);
carr.position.set(0, -r * 2.0, -sgn * len * 0.18);
g.add(carr);
g.position.set((u - 0.5) * L, surfY + r * 3.0, sgn * (hw - len * 0.30));
group.add(tag(g, 'gun', 'Deck piece',
'A bronze chongtong — cheonja, jija, hyeonja or hwangja, "heaven, earth, black, '
+ 'yellow", by size — on a timber bed, firing iron shot or the daejanggunjeon '
+ 'heavy arrow over the bulwark. The Joseon navy fought at range with these; '
+ 'the Japanese fleet it faced carried almost no shipboard cannon at all.'));
}
}
if (S.gunDeck && AP) {
const GD = S.gunDeck;
const xF = (GD.from - 0.5) * L, xT = (GD.to - 0.5) * L;
const gdY = deckY + GD.height;
const width = 2 * apZ + B * 0.05;
const deckT = B * 0.014;
const deck = new THREE.Mesh(deckGeo(width, deckT, xT - xF, 0.30), pale);
deck.rotation.y = Math.PI / 2;
deck.position.set((xF + xT) / 2, gdY, 0);
group.add(tag(deck, 'gundeck'));
const surfY = gdY + B * 0.007;
const bmD = B * 0.026, bmW = B * 0.030;
const clH = B * 0.032, clW = B * 0.030;
const bmTop = gdY - deckT / 2;
const clTop = bmTop - bmD;
const nPost = 12;
for (let i = 0; i <= nPost; i++) {
const x = xF + (xT - xF) * i / nPost;
const beam = new THREE.Mesh(plankGeo(bmW, bmD, width - B * 0.004), timber);
beam.position.set(x, bmTop - bmD / 2, 0);
group.add(tag(beam, 'gundeck', 'Deck beam',
'Athwartships from clamp to clamp, one at every stanchion — the rowers pull '
+ 'under these, and the guns recoil over them.'));
}
for (const sgn of [-1, 1]) {
const clZ = sgn * (width / 2 - B * 0.025);
const clamp = new THREE.Mesh(plankGeo(clW, clH, xT - xF), timber);
clamp.rotation.y = Math.PI / 2;
clamp.position.set((xF + xT) / 2, clTop - clH / 2, clZ);
group.add(tag(clamp, 'gundeck', 'Deck clamp'));
for (let i = 0; i <= nPost; i++) {
const x = xF + (xT - xF) * i / nPost;
const a = new THREE.Vector3(x, apY, sgn * apZ);
const b = new THREE.Vector3(x, clTop - clH + B * 0.004, clZ);
group.add(tag(sparAB(a, b, B * 0.013, B * 0.010, timber), 'gundeck', 'Stanchion'));
}
const shH = B * 0.042, capH = B * 0.010;
const scr = new THREE.Mesh(plankGeo(B * 0.012, shH - capH, xT - xF), timber);
scr.rotation.y = Math.PI / 2;
scr.position.set((xF + xT) / 2, surfY + (shH - capH) / 2, sgn * (width / 2 - B * 0.006));
group.add(tag(scr, 'gundeck', 'Screen'));
const cap = new THREE.Mesh(plankGeo(B * 0.020, capH, xT - xF), timber);
cap.rotation.y = Math.PI / 2;
cap.position.set((xF + xT) / 2, surfY + shH - capH / 2, sgn * (width / 2 - B * 0.006));
group.add(tag(cap, 'gundeck', 'Screen cap'));
}
const nG = Math.max(0, GD.gunsPerSide | 0);
for (const sgn of [-1, 1]) for (let j = 0; j < nG; j++) {
const u = GD.from + (GD.to - GD.from) * (j + 0.5) / nG;
const x = (u - 0.5) * L;
const len = B * 0.42, r = B * 0.017;
const g = new THREE.Group();
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(r * 0.72, r, len, 12), mats.iron);
bar.rotation.x = sgn * Math.PI / 2;
g.add(bar);
const carr = new THREE.Mesh(
new THREE.BoxGeometry(r * 3.2, r * 2.4, len * 0.48), timber);
carr.position.set(0, -r * 2.0, -sgn * len * 0.18);
g.add(carr);
g.position.set(x, surfY + r * 3.0, sgn * (width / 2 - len * 0.30));
group.add(tag(g, 'gun', 'Broadside piece',
'A sacre or demi-culverin on the gun deck, firing over the oars. Eight or nine '
+ 'a side is a weight of metal no galley can answer: her guns all face forward.'));
}
}
if (S.tower) {
const T = S.tower;
const xC = (T.at - 0.5) * L;
const baseY = S.gunDeck ? deckY + S.gunDeck.height + B * 0.007 : deckY;
const platY = baseY + T.h;
const hw = T.w / 2;
const tg = new THREE.Group();
if (T.walls) {
const hl = (T.len || T.w) / 2;
const eaveY = baseY + T.h;
const wt = 0.06;
const sillH = 0.07, plateH = 0.08;
const bandLo = baseY + sillH, bandHi = eaveY - plateH;
for (const sgn of [-1, 1]) {
const sill = new THREE.Mesh(plankGeo(0.10, sillH, hl * 2), timber);
sill.rotation.y = Math.PI / 2;
sill.position.set(xC, baseY + sillH / 2, sgn * (hw - wt / 2));
tg.add(sill);
const plate = new THREE.Mesh(plankGeo(0.10, plateH, hl * 2 + 0.06), timber);
plate.rotation.y = Math.PI / 2;
plate.position.set(xC, eaveY - plateH / 2, sgn * (hw - wt / 2));
tg.add(plate);
}
for (const sgn of [-1, 1]) {
const sill = new THREE.Mesh(plankGeo(0.10, sillH, hw * 2 - wt * 2), timber);
sill.position.set(xC + sgn * (hl - wt / 2), baseY + sillH / 2, 0);
tg.add(sill);
const plate = new THREE.Mesh(plankGeo(0.10, plateH, hw * 2 - wt * 2), timber);
plate.position.set(xC + sgn * (hl - wt / 2), eaveY - plateH / 2, 0);
tg.add(plate);
}
for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
const px = xC + dx * (hl - B * 0.011), pz = dz * (hw - B * 0.011);
tg.add(sparAB(new THREE.Vector3(px, baseY, pz),
new THREE.Vector3(px, eaveY, pz), B * 0.0190, B * 0.0165, timber));
}
const wallBand = (h, len, rotY) => {
const g = deckGeo(h, wt, len, 0.30);
g.rotateZ(Math.PI / 2);
if (rotY) g.rotateY(rotY);
return new THREE.Mesh(g, timber);
};
const wo = 1.10, ho = 0.55;
const headYo = eaveY - 0.28, sillYo = headYo - ho;
const clothMatT = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.94,
side: THREE.DoubleSide });
for (const sgn of [-1, 1]) {
const zW = sgn * (hw - wt / 2);
const rotY = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
const lo = wallBand(sillYo - bandLo, hl * 2, rotY);
lo.position.set(xC, (bandLo + sillYo) / 2, zW);
tg.add(lo);
const hi = wallBand(bandHi - headYo, hl * 2, rotY);
hi.position.set(xC, (headYo + bandHi) / 2, zW);
tg.add(hi);
const segL = (hl * 2 - wo) / 2;
for (const dx of [-1, 1]) {
const mid = wallBand(ho, segL, rotY);
mid.position.set(xC + dx * (wo / 2 + segL / 2), (sillYo + headYo) / 2, zW);
tg.add(mid);
}
const zP = sgn * (hw - wt / 2 + 0.020);
for (const dx of [-1, 1]) {
const jamb = new THREE.Mesh(plankGeo(0.05, 0.05, ho + 0.16), timber);
jamb.rotation.x = Math.PI / 2;
jamb.position.set(xC + dx * (wo / 2 + 0.025), (sillYo + headYo) / 2, zP);
tg.add(jamb);
}
for (const [yF, dy] of [[headYo, 0.025], [sillYo, -0.025]]) {
const strip = new THREE.Mesh(plankGeo(0.05, 0.05, wo + 0.26), timber);
strip.rotation.y = Math.PI / 2;
strip.position.set(xC, yF + dy, zP);
tg.add(strip);
}
const nC = 10, cpos = [], cidx = [];
for (let i = 0; i <= nC; i++) {
const t = i / nC, x = xC - wo / 2 + wo * t;
const sag = 0.05 * Math.sin(Math.PI * t) + 0.02 * Math.sin(3 * Math.PI * t + 1.0);
const zTop = sgn * (hw - wt - 0.015);
const zHem = sgn * (hw - wt - 0.055 - 0.03 * Math.sin(2 * Math.PI * t));
cpos.push(x, headYo - 0.01, zTop, x, sillYo - 0.06 + sag, zHem);
if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
}
const cg = new THREE.BufferGeometry();
cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
cg.setIndex(cidx); cg.computeVertexNormals();
tg.add(new THREE.Mesh(cg, clothMatT));
}
const doorMat = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
{ color: 0x17120c, roughness: 0.95 }));
const doorW = 0.72, doorH = Math.min(T.h * 0.72, 1.5);
const doorTop = bandLo + doorH;
const endLen = hw * 2 - wt * 2, xF = xC - (hl - wt / 2);
for (const dz of [-1, 1]) {
const seg = wallBand(bandHi - bandLo, (endLen - doorW) / 2, 0);
seg.position.set(xF, (bandLo + bandHi) / 2, dz * (doorW / 2 + (endLen - doorW) / 4));
tg.add(seg);
}
const hdr = wallBand(bandHi - doorTop, doorW, 0);
hdr.position.set(xF, (doorTop + bandHi) / 2, 0);
tg.add(hdr);
const xP = xC - hl - 0.012;
for (const dz of [-1, 1]) {
const jamb = new THREE.Mesh(plankGeo(0.05, 0.05, doorH + 0.10), timber);
jamb.rotation.x = Math.PI / 2;
jamb.position.set(xP, bandLo + doorH / 2, dz * (doorW / 2 + 0.025));
tg.add(jamb);
}
const lintel = new THREE.Mesh(plankGeo(0.05, 0.05, doorW + 0.26), timber);
lintel.position.set(xP, doorTop + 0.025, 0);
tg.add(lintel);
const doorG = plankGeo(doorW - 0.04, 0.035, doorH - 0.04);
doorG.rotateX(Math.PI / 2); doorG.rotateY(Math.PI / 2);
const door = new THREE.Mesh(doorG, doorMat);
door.position.set(xC - hl + 0.048, bandLo + doorH / 2, 0);
tg.add(door);
const aft = wallBand(bandHi - bandLo, endLen, Math.PI);
aft.position.set(xC + (hl - wt / 2), (bandLo + bandHi) / 2, 0);
tg.add(aft);
for (const sgn of [-1, 1]) {
const bat = new THREE.Mesh(plankGeo(B * 0.012, B * 0.010, hl * 2), pale);
bat.rotation.y = Math.PI / 2;
bat.position.set(xC, baseY + T.h * 0.55, sgn * hw);
tg.add(bat);
}
const ovh = Math.min(0.35, hw * 0.25);
const pitch = 0.42;
const ridgeY = eaveY + pitch * hw;
const tipY = eaveY - pitch * ovh;
const slope = Math.hypot(hw + ovh, ridgeY - tipY);
for (const sgn of [-1, 1]) {
const plane = new THREE.Mesh(
deckGeo(hl * 2 + ovh * 2, 0.045, slope, 0.30), pale);
plane.rotation.x = sgn * Math.atan(pitch);
plane.position.set(xC, (ridgeY + tipY) / 2 + 0.03, sgn * (hw + ovh) / 2);
tg.add(plane);
}
for (const sgn of [-1, 1]) {
const c = 0.04, apX = pitch * hw;
const shp = new THREE.Shape();
shp.moveTo(-hw + c, 0); shp.lineTo(hw - c, 0);
shp.lineTo(hw - c, pitch * c);
shp.lineTo(c * 0.5, apX - pitch * c * 0.5);
shp.lineTo(-c * 0.5, apX - pitch * c * 0.5);
shp.lineTo(-hw + c, pitch * c); shp.closePath();
const gable = new THREE.Mesh(
new THREE.ExtrudeGeometry(shp, { depth: wt, bevelEnabled: false }), timber);
gable.rotation.y = Math.PI / 2;
gable.position.set(xC + sgn * hl - (sgn > 0 ? wt : 0), eaveY, 0);
tg.add(gable);
}
const capR = new THREE.Mesh(
plankGeo(0.16, 0.07, hl * 2 + ovh * 2 + 0.10), timber);
capR.rotation.y = Math.PI / 2;
capR.position.set(xC, ridgeY + 0.06, 0);
tg.add(capR);
} else {
const colR = B * 0.014, eaveY = platY + 1.9, railH = 0.95;
for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
const col = new THREE.Mesh(
new THREE.CylinderGeometry(colR * 0.85, colR, eaveY - baseY, 10), timber);
col.position.set(xC + dx * hw, (baseY + eaveY) / 2, dz * hw);
tg.add(col);
}
const pw = T.w + 4 * colR;
for (const sgn of [-1, 1]) {
const bx = new THREE.Mesh(new THREE.BoxGeometry(pw, B * 0.020, B * 0.024), timber);
bx.position.set(xC, platY - B * 0.014, sgn * hw);
tg.add(bx);
const bz = new THREE.Mesh(new THREE.BoxGeometry(B * 0.024, B * 0.020, pw), timber);
bz.position.set(xC + sgn * hw, platY - B * 0.014, 0);
tg.add(bz);
}
const plat = new THREE.Mesh(new THREE.BoxGeometry(pw, B * 0.006, pw), pale);
plat.position.set(xC, platY, 0);
tg.add(plat);
const balR = B * 0.0045, span = T.w - colR, gate = 0.62;
const railSec = [B * 0.014, B * 0.011];
for (const side of ['aft', 'port', 'stbd', 'fwd']) {
const fwd = side === 'fwd';
const mkRail = (len, cx, cz, alongX) => {
const r = new THREE.Mesh(new THREE.BoxGeometry(
alongX ? len : railSec[0], railSec[1], alongX ? railSec[0] : len), timber);
r.position.set(cx, platY + railH, cz);
tg.add(r);
};
const alongX = side === 'port' || side === 'stbd';
const off = side === 'aft' ? [hw, 0] : side === 'fwd' ? [-hw, 0]
: side === 'port' ? [0, -hw] : [0, hw];
if (fwd) {
const seg = (span - gate) / 2;
mkRail(seg, xC + off[0], -(gate + seg) / 2, false);
mkRail(seg, xC + off[0], (gate + seg) / 2, false);
for (const sgn of [-1, 1]) {
const gp = new THREE.Mesh(
new THREE.CylinderGeometry(balR * 1.8, balR * 1.8, railH, 6), timber);
gp.position.set(xC + off[0], platY + railH / 2, sgn * gate / 2);
tg.add(gp);
}
} else {
mkRail(span, xC + off[0], off[1], alongX);
}
const n = Math.max(4, Math.round(span / 0.33));
for (let j = 0; j <= n; j++) {
const t = -span / 2 + span * j / n;
if (fwd && Math.abs(t) < gate / 2) continue;
const bal = new THREE.Mesh(
new THREE.CylinderGeometry(balR, balR, railH - 0.06, 6), timber);
const bx = alongX ? xC + t : xC + off[0];
const bz = alongX ? off[1] : t;
bal.position.set(bx, platY + railH / 2, bz);
tg.add(bal);
}
}
const run = 1.15, footX = xC - hw - run;
for (const sgn of [-1, 1]) {
tg.add(beamAB(new THREE.Vector3(footX, baseY, sgn * 0.26),
new THREE.Vector3(xC - hw + 0.04, platY, sgn * 0.26),
0.05, 0.10, timber));
}
const rungs = 7;
for (let j = 1; j < rungs; j++) {
const t = j / rungs;
const rung = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.0028, B * 0.0028, 0.52, 6), pale);
rung.rotation.x = Math.PI / 2;
rung.position.set(footX + (xC - hw + 0.04 - footX) * t,
baseY + (platY - baseY) * t, 0);
tg.add(rung);
}
const ovh = 0.55, eaveR = (hw + ovh) * Math.SQRT2, pitch = 0.55;
const roofH = pitch * (hw + ovh);
const roof = new THREE.Mesh(new THREE.ConeGeometry(eaveR, roofH, 4), timber);
roof.rotation.y = Math.PI / 4;
roof.position.set(xC, eaveY + roofH / 2, 0);
tg.add(roof);
const apex = new THREE.Vector3(xC, eaveY + roofH, 0);
for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
const corner = new THREE.Vector3(xC + dx * (hw + ovh), eaveY + 0.02, dz * (hw + ovh));
tg.add(beamAB(apex.clone().setY(apex.y + 0.03), corner, 0.07, 0.07, timber));
}
for (const [fx, fz, alongX] of [[hw + ovh, 0, false], [-(hw + ovh), 0, false],
[0, hw + ovh, true], [0, -(hw + ovh), true]]) {
const fas = new THREE.Mesh(new THREE.BoxGeometry(
alongX ? 2 * (hw + ovh) : 0.05, 0.13, alongX ? 0.05 : 2 * (hw + ovh)), pale);
fas.position.set(xC + fx, eaveY, fz);
tg.add(fas);
}
const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.5, 8), timber);
fin.position.set(xC, eaveY + roofH + 0.22, 0);
tg.add(fin);
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), timber);
knob.position.set(xC, eaveY + roofH + 0.50, 0);
tg.add(knob);
}
group.add(tag(tg, 'tower', T.name, T.what
|| 'The janggundae, the roofed pavilion amidships the commander fights the ship from. '
+ 'At Myeongnyang Yi Sun-sin stood on one of these, in the first ship in the line, '
+ 'for most of a day, in sight of thirteen crews who had watched the rest of their '
+ 'navy destroyed eight weeks before.'));
}
if (S.bowGuns && !S.bowFortress) {
const u0 = 0.030, u1 = AP ? AP.from : 0.17;
const pA0 = surfacePoint(S, H, u0, 1.0), pA1 = surfacePoint(S, H, u1, 1.0);
const topY = (S.gunDeck ? deckY + S.gunDeck.height
: Math.max(pA0[1], pA1[1])) + B * 0.023;
const width = 2 * apZ - B * 0.038;
const platT = B * 0.019;
const plat = new THREE.Mesh(deckGeo(width, platT, pA1[0] - pA0[0], 0.28), timber);
plat.rotation.y = Math.PI / 2;
plat.position.set((pA0[0] + pA1[0]) / 2, topY, 0);
group.add(tag(plat, 'arrumbada'));
const bmD = B * 0.024;
const bmTop = topY - platT / 2;
for (const u of [u0 + 0.012, (u0 + u1) / 2, u1 - 0.012]) {
const pd = surfacePoint(S, H, u, 1.0);
const beam = new THREE.Mesh(plankGeo(B * 0.026, bmD, width - B * 0.008), timber);
beam.position.set(pd[0], bmTop - bmD / 2, 0);
group.add(tag(beam, 'arrumbada', 'Platform beam'));
}
for (const u of [u0 + 0.012, u1 - 0.012]) for (const sgn of [-1, 1]) {
const pd = surfacePoint(S, H, u, 1.0);
const zP = sgn * Math.max(B * 0.06, Math.abs(pd[2]) - B * 0.03);
const a = new THREE.Vector3(pd[0], pd[1], zP);
const b = new THREE.Vector3(pd[0], bmTop - bmD + B * 0.004, zP);
group.add(tag(sparAB(a, b, B * 0.014, B * 0.011, timber),
'arrumbada', 'Platform post'));
}
const bwH = B * 0.082, bcH = B * 0.012;
const breast = new THREE.Mesh(plankGeo(B * 0.016, bwH - bcH, width), timber);
breast.position.set(pA0[0] + B * 0.008, topY + B * 0.007 + (bwH - bcH) / 2, 0);
group.add(tag(breast, 'arrumbada', 'Breastwork'));
const bcap = new THREE.Mesh(plankGeo(B * 0.026, bcH, width), timber);
bcap.position.set(pA0[0] + B * 0.008, topY + B * 0.007 + bwH - bcH / 2, 0);
group.add(tag(bcap, 'arrumbada', 'Breastwork cap'));
if (AP) {
const xF = (AP.from - 0.5) * L;
for (const sgn of [-1, 1]) {
const a = new THREE.Vector3(pA0[0] + B * 0.06, topY - B * 0.012, sgn * (width / 2 - B * 0.02));
const b = new THREE.Vector3(xF + B * 0.02, apY, sgn * apZ);
group.add(tag(sparAB(a, b, B * 0.011, B * 0.013, timber), 'arrumbada', 'Edge beam'));
}
}
const gmat = mats.iron;
const mkGun = (len, r, z, yaw) => {
const g = new THREE.Group();
const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 14), gmat);
bar.rotation.z = Math.PI / 2;
g.add(bar);
const carriage = new THREE.Mesh(
new THREE.BoxGeometry(len * 0.48, r * 2.4, r * 3.2), timber);
carriage.position.set(len * 0.18, -r * 2.0, 0);
g.add(carriage);
g.position.set(pA0[0] + len / 2 - B * 0.19, topY + r * 3.0, z);
g.rotation.y = yaw;
return g;
};
group.add(tag(mkGun(B * 0.65, B * 0.028, 0, 0), 'gun', 'Courser',
'The centreline heavy gun — a full cannon throwing a 50-pound ball. It is laid by '
+ 'steering the galley, and fired once, at fifty metres or less, as the spur came on.'));
const flankers = Math.max(0, (S.bowGuns | 0) - 1);
for (let j = 0; j < flankers; j++) {
const side = j % 2 ? -1 : 1, rank = Math.floor(j / 2);
const z = side * (B * 0.115 + rank * B * 0.105);
group.add(tag(mkGun(B * 0.42, B * 0.017, z, side * 0.05), 'gun', 'Flanking piece'));
}
}
if (S.bowGuns && S.bowFortress) {
const F = S.bowFortress;
const topY = (S.gunDeck ? deckY + S.gunDeck.height
: surfacePoint(S, H, F.to, 1.0)[1]) + B * 0.023;
const wF = apZ + B * 0.025;
const K = 22;
const arcU = k => F.to - (F.to - F.from) * Math.cos(-Math.PI / 2 + Math.PI * k / K);
const arc = [];
for (let k = 0; k <= K; k++)
arc.push(new THREE.Vector3((arcU(k) - 0.5) * L, topY,
wF * Math.sin(-Math.PI / 2 + Math.PI * k / K)));
const cen = new THREE.Vector3((F.to - 0.5) * L, topY, 0);
const pos = [cen.x, cen.y, cen.z], idx = [];
for (const p of arc) pos.push(p.x, p.y, p.z);
for (let k = 1; k < K + 1; k++) idx.push(0, k, k + 1);
const fg = new THREE.BufferGeometry();
fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
fg.setIndex(idx); fg.computeVertexNormals();
const paleDS = pale.clone(); paleDS.side = THREE.DoubleSide;
group.add(tag(new THREE.Mesh(fg, paleDS), 'fortress'));
const pH = F.parapetH || B * 0.14;
const fsY = topY + B * 0.007;
for (let k = 0; k < K; k++) {
const a = new THREE.Vector3(arc[k].x, fsY + pH / 2, arc[k].z);
const b = new THREE.Vector3(arc[k + 1].x, fsY + pH / 2, arc[k + 1].z);
group.add(tag(beamAB(a, b, pH, B * 0.014, timber), 'fortress', 'Parapet'));
}
for (let k = 0; k <= K; k += 2) {
const pd = surfacePoint(S, H, Math.min(Math.max(arcU(k), 0.004), 1), 1.0);
const zMax = Math.max(Math.abs(pd[2]) - B * 0.02, B * 0.02);
const zF = Math.sign(arc[k].z || 1) * Math.min(Math.abs(arc[k].z), zMax);
const a = new THREE.Vector3(pd[0], pd[1], zF);
const b = new THREE.Vector3(arc[k].x, topY - B * 0.008, arc[k].z);
group.add(tag(beamAB(a, b, B * 0.022, B * 0.022, timber), 'fortress', 'Fortress post'));
}
const portMat = new THREE.MeshStandardMaterial({ color: 0x17120c, roughness: 0.95 });
const nB = Math.max(1, S.bowGuns | 0);
const nRank = Math.max(1, (nB - 1) / 2);
const angs = [0];
for (let rk = 1; rk <= (nB - 1) / 2; rk++) { const a0 = rk * 0.84 / nRank; angs.push(a0, -a0); }
const rimAt = a0 => new THREE.Vector3(
(F.to - (F.to - F.from) * Math.cos(a0) - 0.5) * L, topY, wF * Math.sin(a0));
let big = true;
for (const a0 of angs) {
const rim = rimAt(a0);
const dir = rim.clone().sub(cen).setY(0).normalize();
const len = big ? B * 0.65 : B * 0.42, r = big ? B * 0.028 : B * 0.017;
const g = new THREE.Group();
const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 14), mats.iron);
bar.rotation.z = Math.PI / 2;
g.add(bar);
const carr = new THREE.Mesh(new THREE.BoxGeometry(len * 0.48, r * 2.4, r * 3.2), timber);
carr.position.set(len * 0.18, -r * 2.0, 0);
g.add(carr);
g.position.copy(cen).addScaledVector(dir, cen.distanceTo(rim) - len * 0.45)
.setY(fsY + r * 3.0);
g.rotation.y = Math.atan2(dir.z, -dir.x);
g.userData.gun = { style: 'fortress', tip: [-len * 0.5, 0, 0] };
group.add(tag(g, 'gun', big ? 'Courser' : 'Flanking piece', big
? 'The centreline heavy gun of the bow battery, firing dead ahead through the '
+ 'fortress parapet. At Lepanto this fire, opened as the Ottoman centre rowed '
+ 'down on the anchored galleasses, was the first sustained heavy bombardment '
+ 'a galley fleet had ever taken from shipboard.'
: 'A flanker on the round fortress, trained out on the bow. The curve is the '
+ 'point: a galley cannot row past on either side without crossing its fire.'));
const d1 = 0.07;
const pa = rimAt(a0 - d1).setY(fsY + pH * 0.42);
const pb = rimAt(a0 + d1).setY(fsY + pH * 0.42);
group.add(tag(beamAB(pa, pb, pH * 0.52, B * 0.024, portMat), 'gun', 'Gun port',
'The opening in the parapet the piece fires through.'));
big = false;
}
}
if (S.sternGuns && S.gunDeck) {
const GD = S.gunDeck;
const chY = deckY + GD.height + B * 0.007;
const len = B * 0.42, r = B * 0.017;
const n = Math.max(1, S.sternGuns | 0);
for (let j = 0; j < n; j++) {
const side = j % 2 ? -1 : 1, rank = Math.floor(j / 2);
const z = side * (B * 0.12 + rank * B * 0.11);
const g = new THREE.Group();
const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 12), mats.iron);
bar.rotation.z = -Math.PI / 2;
g.add(bar);
const carr = new THREE.Mesh(new THREE.BoxGeometry(len * 0.48, r * 2.4, r * 3.2), timber);
carr.position.set(-len * 0.18, -r * 2.0, 0);
g.add(carr);
g.position.set((GD.to - 0.5) * L - len * 0.20, chY + r * 3.0, z);
g.userData.gun = { style: 'chaser', tip: [len * 0.5, 0, 0] };
group.add(tag(g, 'gun', 'Stern chaser',
'A chaser at the after end of the fighting deck, laid astern over the poop '
+ 'tent. The card says "chasers aft" and gives no number; two are drawn, the '
+ 'least the plural supports.'));
}
}
if (S.sternCanopy) {
const C = S.sternCanopy, N = 10;
const ridgeH = B * 0.20;
const pos = [], idx = [];
const ridge = [];
for (let k = 0; k <= N; k++) {
const u = C.from + (C.to - C.from) * k / N;
const pd = surfacePoint(S, H, u, 1.0);
const zE = Math.abs(pd[2]) - B * 0.006;
const yR = pd[1] + ridgeH;
ridge.push(new THREE.Vector3(pd[0], yR, 0));
pos.push(pd[0], pd[1], zE, pd[0], yR, 0, pd[0], pd[1], -zE);
}
for (let k = 0; k < N; k++) {
const a = k * 3, b = a + 3;
idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
}
const cg = new THREE.BufferGeometry();
cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
cg.setIndex(idx); cg.computeVertexNormals();
group.add(tag(new THREE.Mesh(cg, mats.canvas), 'canopy'));
group.add(tag(beamAB(ridge[0], ridge[N], B * 0.016, B * 0.016, timber),
'canopy', 'Ridgepole'));
for (const k of [0, N]) {
const u = C.from + (C.to - C.from) * k / N;
const pd = surfacePoint(S, H, u, 1.0);
const foot = new THREE.Vector3(pd[0], pd[1], 0);
group.add(tag(beamAB(foot, ridge[k], B * 0.014, B * 0.014, timber),
'canopy', 'Tent post'));
}
}
}
function buildFloorStowage(S, group, mats) {
const H = hullSurface(S);
const tw = S.build === 'dugout' ? Math.max(0.03, S.beam * 0.045)
: Math.max(0.02, S.beam * 0.020);
const tb = S.build === 'dugout' ? tw * 1.8 : Math.max(0.04, S.draught * 0.06);
const eligible = u => u > 0.05 && u < 0.95
&& S.draught * H.keel(u) > tb * 1.4
&& surfacePoint(S, H, u, 1)[2] - tw > 0.01;
let uLo = -1, uHi = -1;
for (let u = 0.05; u <= 0.951; u += 0.005)
if (eligible(u)) { if (uLo < 0) uLo = u; uHi = u; }
if (uLo < 0 || uHi - uLo < 0.2) return;
const vF = u => 0.62 * tb / (S.draught * H.keel(u));
const floorY = u => surfacePoint(S, H, u, vF(u))[1];
const floorHalf = u => Math.max(0, surfacePoint(S, H, u, vF(u))[2] - tw);
const over = (u0, u1, f, pick) => {
let r = pick > 0 ? -1e9 : 1e9;
for (let i = 0; i <= 8; i++) {
const val = f(Math.min(uHi, Math.max(uLo, u0 + (u1 - u0) * i / 8)));
r = pick > 0 ? Math.max(r, val) : Math.min(r, val);
}
return r;
};
const xAt = u => (u - 0.5) * S.lwl;
const pale = mats.woodPale;
const scoopMat = new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: 0.8,
side: THREE.DoubleSide });
const fibre = new THREE.MeshStandardMaterial({ color: 0x8f7442, roughness: 0.95 });
const paddle = (len, bladeL, bladeW, name, what) => {
const g = new THREE.Group();
const shaftR = Math.max(0.016, len * 0.012);
const shaftL = len - bladeL * 0.7;
const shaft = new THREE.Mesh(
new THREE.CylinderGeometry(shaftR, shaftR * 0.85, shaftL, 8), pale);
shaft.rotation.z = Math.PI / 2;
shaft.position.x = -len / 2 + shaftL / 2;
g.add(shaft);
const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), pale);
blade.scale.set(bladeL / 2, shaftR * 0.85, bladeW / 2);
blade.position.x = len / 2 - bladeL / 2;
g.add(blade);
g.userData.restR = shaftR;
return tag(g, 'stowage', name, what);
};
const bailer = (r, name, what) => {
const g = new THREE.Group();
const bowl = new THREE.Mesh(
new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
scoopMat);
bowl.scale.set(1.5, 0.55, 1);
g.add(bowl);
const grip = new THREE.Mesh(
new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 1.1, 8), pale);
grip.rotation.z = Math.PI / 2;
grip.position.set(r * 1.85, -r * 0.08, 0);
g.add(grip);
g.userData.restR = r * 0.55;
return tag(g, 'stowage', name, what);
};
const coil = (R, rt, name, what) => {
const g = new THREE.Group();
for (const [rr, tt, dy] of [[R, rt, 0], [R * 0.82, rt * 0.9, rt * 0.9]]) {
const t = new THREE.Mesh(new THREE.TorusGeometry(rr, tt, 8, 24), fibre);
t.rotation.x = Math.PI / 2;
t.position.y = dy;
g.add(t);
}
g.userData.restR = rt;
return tag(g, 'stowage', name, what);
};
const place = (item, uC, halfLenM, halfWidM, zWant, rotY) => {
const u0 = uC - halfLenM / S.lwl, u1 = uC + halfLenM / S.lwl;
const y = over(u0, u1, floorY, +1) + item.userData.restR + 0.004;
const zRoom = over(u0, u1, floorHalf, -1) - halfWidM - 0.01;
const z = Math.sign(zWant || 1) * Math.min(Math.abs(zWant), Math.max(0, zRoom));
item.position.set(xAt(uC), y, z);
if (rotY) item.rotation.y = rotY;
group.add(item);
};
if (S.build === 'dugout') {
const paddleWhat = 'Paddling is the record’s own steering row — "the paddle '
+ 'itself — nothing is hung on the hull" — and her one measured figure is a '
+ 'paddled crossing (Kaifu’s Sugime, Taiwan→Yonaguni, 2019). The paddle in '
+ 'use is crew gear and no crew is drawn; this is the spare, stowed on the floor. No '
+ 'Pleistocene paddle survives: the one-piece shaft and narrow leaf blade are DERIVED '
+ 'from the oldest recovered paddles (Star Carr, ~9000 BC; Tybrind Vig, ~4400 BC).';
place(paddle(1.5, 0.5, 0.15, 'Spare paddle — stowed', paddleWhat),
0.42, 0.75, 0.085, S.beam * 0.14, Math.PI);
place(paddle(1.5, 0.5, 0.15, 'Spare paddle — stowed', paddleWhat),
0.58, 0.75, 0.085, -S.beam * 0.14, 0);
place(bailer(0.09, 'Bailer — carved scoop',
'An open hull in a seaway ships water, and a 70–90 km open-water leg has '
+ 'nowhere to empty her: bailing is as old as the open boat. No Pleistocene bailer '
+ 'survives; the one-piece scoop is DERIVED from the form recorded across the '
+ 'Pacific in Haddon & Hornell, Canoes of Oceania (1936–38).'),
0.34, 0.14, 0.10, -S.beam * 0.06, 0);
} else if (S.doubleHull) {
place(paddle(3.4, 1.0, 0.28, 'Steering paddle — stowed',
'Her own card row: steering is "a long paddle, not a rudder" (Finney 1977; '
+ 'Polynesian Voyaging Society logs). In use the sweep is handled over the quarter '
+ 'by the steersman — nothing is mounted on the hull, and no crew is drawn. The '
+ 'spare stows in the bottom of the hull.'),
0.50, 1.7, 0.15, S.beam * 0.10, 0);
place(bailer(0.11, 'Bailer — carved scoop',
'Both hulls are open and are bailed by hand under way — Polynesian Voyaging '
+ 'Society crews still stand bailing watches. The one-piece scoop with its spade '
+ 'grip is the recorded Oceanic form (Haddon & Hornell, Canoes of Oceania, '
+ '1936–38).'),
0.66, 0.17, 0.12, -S.beam * 0.08, 0);
const cR = Math.min(0.16, Math.max(0.06, floorHalf(0.74) * 0.7));
place(coil(cR, Math.min(0.03, cR * 0.35), 'Lashing line — coiled spare',
'Her construction row: "lashed-lug planking, no metal at all". A lashed ship is '
+ 'held together by cordage and carries it as stores; the traditional line is '
+ 'sennit — braided coconut fibre (Haddon & Hornell, Canoes of Oceania). The '
+ 'coil is the spare.'),
0.74, cR + 0.03, cR + 0.03, S.beam * 0.05, 0);
}
}
function buildPaddles(S, group, mats) {
const D = S.paddleDia || 0;
if (!D) return;
const H = hullSurface(S);
const L = S.lwl, B = S.beam;
const u = S.paddleAt || 0.52;
const p = surfacePoint(S, H, u, 0.80);
const waterY = H.sheer(u) - S.freeboard;
const axleY = waterY + D * 0.35;
const iron = mats.iron || mats.woodDark;
const NF = S.paddleFloats || 24;
const fLen = S.paddleFloatLenM || B * 0.30;
const fDeep = S.paddleFloatDeepM || D * 0.115;
const fThick = 0.10;
const R = D / 2;
const owHalf = S.paddleOverWheelsM ? S.paddleOverWheelsM / 2 : p[2] + B * 0.16 + fLen / 2;
const obHalf = S.paddleOverBoxesM ? S.paddleOverBoxesM / 2 : owHalf + B * 0.02;
const zc = owHalf - fLen / 2;
for (const sgn of [-1, 1]) {
const g = new THREE.Group();
for (let i = 0; i < NF / 2; i++) {
const arm = new THREE.Mesh(
new THREE.BoxGeometry(D * 0.018, R * 2, Math.max(0.14, D * 0.009)), iron);
arm.rotation.z = i / NF * Math.PI * 2;
arm.name = 'Wheel arm';
g.add(arm);
}
for (let i = 0; i < NF; i++) {
const a = i / NF * Math.PI * 2;
const float = new THREE.Mesh(
new THREE.BoxGeometry(fThick, fDeep, fLen), mats.woodDark || mats.woodPale);
const r0 = R - fDeep / 2;
float.position.set(Math.cos(a + Math.PI / 2) * r0,
Math.sin(a + Math.PI / 2) * r0, 0);
float.rotation.z = a;
float.name = 'Float';
g.add(float);
}
for (const r of [R, R * 0.55]) {
const rim = new THREE.Mesh(new THREE.TorusGeometry(r, B * 0.012, 6, 30), iron);
g.add(rim);
}
g.position.set(p[0], axleY, sgn * zc);
g.userData.wheel = { sgn, R };
group.add(tag(g, 'paddle'));
const zo = owHalf + 0.10, zi = p[2];
const bw = zo - zi;
const zbc = (zo + zi) / 2;
const boxRx = D * 0.60, boxRy = D * 0.60 * 0.86;
const h0 = Math.min(Math.max(H.sheer(u) - axleY, boxRy * 0.12), boxRy * 0.55);
const th0 = Math.asin(h0 / boxRy);
const xc = boxRx * Math.cos(th0);
const spon = new THREE.Mesh(
new THREE.BoxGeometry(xc * 2.16, B * 0.055, bw * 1.06), iron);
spon.position.set(p[0], axleY + h0 - B * 0.0275, sgn * zbc);
group.add(tag(spon, 'paddle', 'Sponson',
'The platform bracketed out from the hull side at deck level that carries the wheel\'s shaft bearings and the box above. Everything over it is housing; everything under it is wheel.'));
const bg = new THREE.Group();
bg.position.set(p[0], axleY, sgn * zbc);
if (sgn < 0) bg.rotation.y = Math.PI;
const NB = 22, arc = [];
for (let i = 0; i <= NB; i++) {
const a = th0 + (Math.PI - 2 * th0) * (i / NB);
arc.push([Math.cos(a) * boxRx, Math.sin(a) * boxRy]);
}
const bp = [], bi = [];
for (let i = 0; i <= NB; i++)
bp.push(arc[i][0], arc[i][1], -bw / 2, arc[i][0], arc[i][1], bw / 2);
for (let i = 0; i < NB; i++) {
const a0 = i * 2;
bi.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
}
for (const side of [1, -1]) {
const w = side * bw / 2, c0 = bp.length / 3;
bp.push(0, (h0 + boxRy) / 2, w);
for (const [x, y] of arc) bp.push(x, y, w);
for (let i = 0; i < NB; i++)
if (side > 0) bi.push(c0, c0 + 1 + i, c0 + 2 + i);
else          bi.push(c0, c0 + 2 + i, c0 + 1 + i);
if (side > 0) bi.push(c0, c0 + 1 + NB, c0 + 1);
else          bi.push(c0, c0 + 1, c0 + 1 + NB);
}
const bgeo = new THREE.BufferGeometry();
bgeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
bgeo.setIndex(bi); bgeo.computeVertexNormals();
bg.add(tag(new THREE.Mesh(bgeo, iron), 'paddlebox', 'Paddle box',
'The housing over the top half of the wheel, sprung from the sponson at deck level. A 17 m wheel throws a sheet of water and coal dirt that would sweep the deck; the box contains it. Being the largest thing on the ship\'s side, it is also what owners decorated.'));
for (let i = 0; i <= 10; i++) {
const b = Math.PI * (i / 10);
const A = Math.pow(Math.cos(b) / boxRx, 2) + Math.pow(Math.sin(b) / boxRy, 2);
const B2 = 2 * h0 * Math.sin(b) / (boxRy * boxRy);
const C = (h0 * h0) / (boxRy * boxRy) - 1;
const t = (-B2 + Math.sqrt(B2 * B2 - 4 * A * C)) / (2 * A);
const rT = Math.max(0.12, obHalf - zo);
const rib = new THREE.Mesh(
new THREE.BoxGeometry(D * 0.020, t * 0.92, rT), mats.woodPale || iron);
rib.position.set(Math.cos(b) * t * 0.5, h0 + Math.sin(b) * t * 0.5, bw / 2 + rT / 2);
rib.rotation.z = b - Math.PI / 2;
bg.add(tag(rib, 'paddlebox', 'Paddle-box rib',
'The face fans from its base because it must: a large thin panel taking the water a wheel throws at it is stiffened most cheaply by ribs running out from the centre. That it also looks well is why owners lettered and gilded it.'));
}
for (let i = 1; i < 7; i++) {
const a = th0 + (Math.PI - 2 * th0) * (i / 7);
const sl = new THREE.Mesh(new THREE.BoxGeometry(D * 0.035, B * 0.012, bw * 0.96), iron);
sl.position.set(Math.cos(a) * boxRx * 1.004, Math.sin(a) * boxRy * 1.004, 0);
sl.rotation.z = a;
bg.add(tag(sl, 'paddlebox', 'Paddle-box vent',
'Slatted so the wheel does not compress the air in its own housing at every revolution.'));
}
group.add(bg);
}
}
function buildShip(S, opts) {
const FINE = !!(opts && opts.fine);
const FURLED = !!(opts && opts.furled);
const group = new THREE.Group();
const sun = new THREE.Vector3(0.5, 0.72, 0.42).normalize();
const yearBuilt = S.year || 0;
const WELDED = !!S.iron && yearBuilt >= 1950;
const bottom = new THREE.Color();
if (S.bottom) bottom.set(S.bottom);
else if (yearBuilt >= 1955) bottom.setRGB(0.42, 0.13, 0.10);
else if (yearBuilt >= 1890) bottom.setRGB(0.36, 0.12, 0.09);
else bottom.setRGB(0.86, 0.55, 0.47);
const hullMat = new THREE.ShaderMaterial({
vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, side: THREE.DoubleSide,
uniforms: {
uSun: { value: sun }, uCam: { value: new THREE.Vector3() },
uStrakes: { value: S.strakes || 26 },
uPortholes: { value: S.portholes ? Math.round(S.lwl / 3.0) : 0 },
...(() => {
const HR = (S.hullRows && S.hullRows.groups) ? S.hullRows.groups.slice(0, 16) : [];
const fb = S.freeboard || 6;
const gA = [], gB = [];
for (let gi = 0; gi < 16; gi++) {
const gr = HR[gi];
if (gr) {
gA.push(new THREE.Vector4(gr.u[0], gr.u[1],
0.62 + 0.38 * (gr.hM[0] / fb), 0.62 + 0.38 * (gr.hM[1] / fb)));
gB.push(new THREE.Vector4(gr.pitchM || 0, gr.lightWM || 0,
gr.kind === 'porthole' ? 0 : (gr.kind === 'band' ? 2 : 1), 0));
} else {
gA.push(new THREE.Vector4(0, 0, 0, 0));
gB.push(new THREE.Vector4(0, 0, 0, 0));
}
}
return {
uHGrpN: { value: HR.length },
uHGrpA: { value: gA },
uHGrpB: { value: gB },
uHullDims: { value: new THREE.Vector2(S.loa || S.lwl, fb) },
};
})(),
uPlankLen: { value: Math.max(3, S.loa / (S.plankLen || 7.0)) },
uFrames: { value: Math.max(8, S.loa / (S.roomSpace || 0.78)) },
uCopper: { value: S.copper ? 1 : 0 },
uCopperAge: { value: S.copperAge !== undefined ? S.copperAge : 0.55 },
uWaterline: { value: 0.62 },
uChequer: { value: S.chequer ? 1 : 0 },
uGunDecks: { value: S.gunDecks || 0 },
uTopside: { value: new THREE.Color(S.topside || '#5b4a33') },
uIron: { value: S.iron ? 1 : 0 },
uWeld: { value: WELDED ? 1 : 0 },
uFaired: { value: S.faired ? 1 : 0 },
uBottom: { value: bottom },
uCove: { value: S.cove ? 1 : 0 },
uBoot: { value: new THREE.Color(S.boot || '#ffffff') },
uBootOn: { value: S.boot ? 1 : 0 },
uTime: { value: 0 },
},
});
const STEEL = S.build === 'steel' || S.build === 'iron';
const timber = STEEL
? new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.52, metalness: 0.55 })
: new THREE.MeshStandardMaterial({ color: 0x6b5334, roughness: 0.86 });
const ONE_PIECE = S.build === 'dugout';
if (!ONE_PIECE) group.add(tag(new THREE.Mesh(buildKeelGeometry(S), timber), 'keel'));
if (FINE) {
if (!ONE_PIECE)
for (let f = 0; f < 30; f++)
group.add(tag(new THREE.Mesh(buildFramesGeometry(S, 1, 0.055 + f / 29 * 0.89), timber),
'frames', 'Frame ' + (f + 1) + ' of 30'));
if (S.build === 'bulkhead') {
buildJunkEnds(S, group);
} else if (S.build !== 'dugout') {
group.add(tag(new THREE.Mesh(buildStemGeometry(S, false), timber), 'stempost', 'Stem'));
group.add(tag(new THREE.Mesh(buildStemGeometry(S, true), timber), 'stempost', 'Sternpost'));
}
if (S.build !== 'iron' && S.build !== 'steel' && S.build !== 'dugout') {
const waleMat = new THREE.MeshStandardMaterial({ color: 0x3d2f1f, roughness: 0.9 });
group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.655, 0.030), waleMat), 'wale'));
group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026), waleMat), 'wale'));
}
const steer = steeringOf(S);
if (steer === 'quarter') {
for (const sgn of [-1, 1])
group.add(tag(new THREE.Mesh(buildQuarterRudderGeometry(S, sgn), timber),
'quarterRudder',
sgn < 0 ? 'Port quarter rudder' : 'Starboard quarter rudder'));
} else if (steer !== 'paddle') {
const rudderMat = steer === 'steel'
? new THREE.MeshStandardMaterial({ color: bottom, roughness: 0.78, metalness: 0.12 })
: timber;
group.add(tag(new THREE.Mesh(buildRudderGeometry(S), rudderMat), 'rudder'));
}
const HS = hullSurface(S);
(S.masts || []).forEach(mk => {
if (mk.rig !== 'square' || mk.shrouds === 0) return;
for (const sgn of [-1, 1]) {
const p = surfacePoint(S, HS, mk.at, 0.985);
const ch = new THREE.Mesh(
new THREE.BoxGeometry(S.lwl * 0.075, S.beam * 0.012, S.beam * 0.055), timber);
ch.position.set(p[0], p[1] * 0.97, sgn * (p[2] + S.beam * 0.026));
group.add(tag(ch, 'channel'));
const de = buildDeadeyes(Math.max(3, (mk.shrouds || 3) + 1), S.beam * 0.018, timber);
de.rotation.y = Math.PI / 2;
de.position.set(p[0], p[1] * 0.97 + S.beam * 0.016, sgn * (p[2] + S.beam * 0.046));
group.add(de);
}
});
} else if (!ONE_PIECE) {
group.add(tag(new THREE.Mesh(buildFramesGeometry(S), timber), 'frames'));
}
const hull = new THREE.Mesh(
FINE ? buildHullGeometry(S, 420, 72) : buildHullGeometry(S), hullMat);
group.add(tag(hull, 'planking'));
const cover = deckCovering(S);
const deckShader = col => new THREE.ShaderMaterial({
vertexShader: SHADERS['DECK_VERT.vert'], fragmentShader: SHADERS['DECK_FRAG.frag'],
side: THREE.DoubleSide,
uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam,
uCol:    { value: new THREE.Color(col) },
uMode:   { value: cover.mode },
uPlankW: { value: cover.plankW || 1 },
uButtL:  { value: cover.buttL || 1 } } });
const deckMat = deckShader(cover.col);
if (cover.mode === 0) {
const tw = S.build === 'dugout' ? Math.max(0.03, S.beam * 0.045)
: Math.max(0.02, S.beam * 0.020);
const tb = S.build === 'dugout' ? tw * 1.8 : Math.max(0.04, S.draught * 0.06);
const nm = S.build === 'dugout' ? 'Open hull — the carved hollow'
: 'Open hull — no deck laid';
const what = 'The record lays no deck (deckLaid: false), so there is no cap: this is '
+ 'the inner surface of the hull itself, open to the sky, running down past the '
+ 'waterline to the floor. '
+ (S.build === 'dugout'
? 'Burned and adzed out of the one trunk, so the surface is charred and '
+ 'tool-marked. '
: 'The inside of the planked shell, unpainted and unbleached. ')
+ `Wall ${Math.round(tw * 100)} cm and bottom ${Math.round(tb * 100)} cm are `
+ 'DERIVED class defaults — no source attests the sidings, and the rim shows the '
+ 'wall figure as its visible thickness.';
group.add(tag(new THREE.Mesh(buildOpenHullGeometry(S, 96, 'cavity'),
deckShader(S.build === 'dugout' ? 0x54422d : 0x77664a)), 'deck', nm, what));
group.add(tag(new THREE.Mesh(buildOpenHullGeometry(S, 96, 'rim'),
deckShader(S.build === 'dugout' ? 0x97835d : 0x9c8a63)), 'deck',
S.build === 'dugout' ? 'Gunwale rim — dressed timber' : 'Gunwale — top strake edge',
'The top face of the hull wall itself, ' + Math.round(tw * 100) + ' cm across — '
+ 'the wall siding, seen end-on. Dressed, not charred: hollowing burns the bowl, '
+ 'the adze finishes the edge. There is no fitted capping rail; on an open hull '
+ 'the rim is the gunwale.'));
const plug = new THREE.Mesh(buildDeckGeometry(S),
new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
plug.renderOrder = 1;
group.add(tag(plug, 'deck', 'Waterplane mask',
'Draws nothing. It writes only depth across the open top so the sea surface cannot '
+ 'render inside the open hull; the interior below the waterline shows because it '
+ 'is drawn first.'));
if (S.build === 'dugout') {
const top = new THREE.Mesh(buildDeckGeometry(S), deckShader(0x8a7a5c));
top.visible = false;
group.add(tag(top, 'logtop'));
}
} else {
group.add(tag(new THREE.Mesh(buildDeckGeometry(S), deckMat), 'deck', cover.name, cover.what));
}
const mats = {
spar: new THREE.MeshStandardMaterial({ color: 0x6a4d2c, roughness: 0.72, metalness: 0.02 }),
woodDark: new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 0.78 }),
woodPale: new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: 0.68 }),
iron: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.42, metalness: 0.72 }),
canvas: new THREE.MeshStandardMaterial({ color: 0xded3b8, roughness: 0.94,
side: THREE.DoubleSide }),
ropeSolid: new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 0.88 }),
};
const sails = buildRig(S, group, mats, FINE, FURLED);
if (FINE) {
buildGuns(S, group, mats.iron || mats.woodDark);
if (S.__spars && S.__spars.length)
buildRigging(S, group, mats, S.__spars, S.__mastTops || []);
}
if (FINE) buildFittings(S, group, mats);
if (FINE) buildFunnel(S, group);
if (FINE && !S.flightDeck && !S.turrets) buildSuperstructure(S, group, hullMat);
if (FINE && S.cluster) buildCluster(S, group);
if (FINE && !S.flightDeck && !S.turrets) buildRaisedEnds(S, group);
if (FINE && S.sternSteps) buildSternTerraces(S, group, hullMat);
if (FINE) buildJunkCastle(S, group);
if (FINE && S.turrets) buildCitadel(S, group, mats);
if (FINE) buildSternAviation(S, group);
if (FINE) buildDeckHatches(S, group);
if (FINE) buildHead(S, group, mats);
if (FINE) buildAnchor(S, group, mats);
if (FINE && S.netDefence) buildNetDefence(S, group);
if (FINE) buildOars(S, group, mats.woodPale);
if (FINE) buildGalleyWorks(S, group, mats);
if (FINE) buildPaddles(S, group, mats);
if (FINE && cover.mode === 0) buildFloorStowage(S, group, mats);
if (FINE) buildScrews(S, group);
if (FINE && S.transom && S.build !== 'steel' && S.build !== 'iron')
buildStern(S, group, mats);
if (S.containers) buildContainers(S, group, !FINE);
if (S.livery) buildLivery(S, group);
if (S.wingSail) buildWingSail(S, group, mats);
if (FINE && S.boats) buildBoats(S, group, mats);
if (S.flightDeck) buildFlightDeck(S, group, mats);
if (S.turrets) buildTurrets(S, group, mats);
if (S.doubleHull) {
const sep = S.hullSep || S.loa * 0.26;
const hullKeys = ['keel', 'frames', 'planking', 'deck', 'stempost', 'wale', 'rudder',
'stowage'];
const body = group.children.filter(o => o.userData.part && hullKeys.includes(o.userData.part.key));
body.forEach(o => {
const twin = o.clone();
twin.userData.part = o.userData.part;
o.position.z -= sep / 2;
twin.position.z += sep / 2;
group.add(twin);
});
const beamMat = new THREE.MeshStandardMaterial({ color: 0x6f5836, roughness: 0.82 });
const dk = hullSurface(S);
[0.30, 0.50, 0.70].forEach(u => {
const cb = new THREE.Mesh(
new THREE.BoxGeometry(S.loa * 0.035, S.beam * 0.16, sep + S.beam * 1.6), beamMat);
cb.position.set((u - 0.5) * S.lwl, dk.sheer(u) + S.beam * 0.08, 0);
group.add(tag(cb, 'crossbeam'));
});
const plat = new THREE.Mesh(
new THREE.BoxGeometry(S.loa * 0.34, S.beam * 0.05, sep * 0.86), beamMat);
plat.position.set(0, dk.sheer(0.5) + S.beam * 0.17, 0);
group.add(tag(plat, 'platform'));
}
const bb = new THREE.Box3().setFromObject(group);
group.userData = { hullMat, sails, spec: S, furled: FURLED,
rigTop: bb.max.y, keelBottom: bb.min.y,
extentX: bb.max.x - bb.min.x,
waterlineY: 0 };
return group;
}
window.SHIPS_HULL = { PARTS, buildKeelGeometry, buildFramesGeometry, buildShip, buildHullGeometry, hullSurface, exponentForCm,
superellipseFullness, surfacePoint, landingStrip, linerHouse, netDefenceGeom };