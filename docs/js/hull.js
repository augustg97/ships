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
const pos = [], idx = [];
const pts = STEEL
? [[p[0] - chord * 1.6, top], [p[0] - chord * 0.6, top],
[p[0] - chord * 0.75, depth], [p[0] - chord * 1.45, depth]]
: BULK
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
const lower = mk.heightM !== undefined ? mk.heightM : mk.height * steelMain;
const mainLower = S.masts.reduce((mx, m2) =>
Math.max(mx, m2.heightM !== undefined ? m2.heightM : (m2.height || 0) * steelMain), 0)
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
const tp = buildTop(topR, mats.woodPale, headR);
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
const yardLen = si === 0 ? lower * 0.875
: si === 1 ? lower * 0.875 * 0.714
: lower * 0.875 * 0.714 * 0.667;
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
mk.yards.filter(nm => PLAN[nm])
.sort((a, b) => PLAN[a][0] - PLAN[b][0])
.forEach(nm => { const [f, r, kind] = PLAN[nm];
crossYard(base + T * f, lower * 0.875 * r,
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
const flower = fm.heightM !== undefined ? fm.heightM : fm.height * steelMain;
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
what: 'Great Eastern\'s are 17 m across — taller than a house. She carried a 7.3 m '
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
+ 'cabin is the one place aboard you can read without a candle.' },
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
what: 'A vertical winch turned by bars. It is the machine that makes a big ship '
+ 'workable by muscle: fourteen men on the bars can weigh an anchor no gang '
+ 'could lift, and the same drum warps the ship, hoists yards and heaves guns.' },
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
+ 'the 13th-century seals of the cog towns.' },
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
if (timberShip && laidDeck) {
const u = 0.62, y = deckAtU(u), R = B * 0.062;
const cg = new THREE.Group();
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.80, R, B * 0.115, 16), wood);
barrel.position.y = y + B * 0.058;
cg.add(barrel);
for (let i = 0; i < 8; i++) {
const a = i / 8 * Math.PI * 2;
const w = new THREE.Mesh(new THREE.BoxGeometry(B * 0.014, B * 0.100, B * 0.030), wood);
w.position.set(Math.cos(a) * R * 0.92, y + B * 0.056, Math.sin(a) * R * 0.92);
w.rotation.y = -a;
cg.add(w);
}
const head = new THREE.Mesh(
new THREE.CylinderGeometry(R * 1.16, R * 1.02, B * 0.038, 16), pale);
head.position.y = y + B * 0.132;
cg.add(head);
for (let i = 0; i < 8; i++) {
const a = i / 8 * Math.PI * 2;
const bar = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.009, B * 0.012, B * 0.34, 10), pale);
bar.rotation.z = Math.PI / 2; bar.rotation.y = a;
bar.position.set(Math.cos(a) * B * 0.17, y + B * 0.132, Math.sin(a) * B * 0.17);
cg.add(bar);
}
cg.position.x = (u - 0.5) * L;
group.add(tag(cg, 'capstan'));
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
function buildTop(r, mat, mastR) {
const g = new THREE.Group();
const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, r * 0.09, 14), mat);
g.add(plat);
const zT = mastR ? mastR + r * 0.055 : r * 0.13;
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
for (let i = 0; i < n; i++) {
const shell = i < ns;
const wid = shell ? B : B * (1 - taper * (0.5 + i / n));
const ins = shell ? B * 0.015 : (taper < 0.06 ? B * 0.015 : inset);
const f = n > 1 ? i / (n - 1) : 0;
const uA = foreAt(i), uB = aftAt(i);
const half = (u) => {
const uu = Math.max(0.001, Math.min(0.999, u));
return Math.max(B * 0.06, Math.min(wid / 2,
Math.abs(surfacePoint(S, H, uu, 1.0)[2]) - ins));
};
const uAHead = S.houseRamp
? (i < n - 1 ? foreAt(i + 1)
: Math.min(uA + (n > 1 ? uA - foreAt(n - 2) : 0.02),
uA + (uB - uA) * 0.45))
: undefined;
tiers.push({ uA, uB, uAHead, y0: floorY(i), y1: floorY(i + 1), half, shell,
recess: i === recessTier });
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
const perim = (t, step) => {
const st = step || paneW * 0.5;
const pts = [];
const NU = Math.max(60, Math.round((t.uB - t.uA) * L / st));
for (let k = 0; k <= NU; k++) {
const u = t.uA + (t.uB - t.uA) * k / NU;
pts.push({ x: (u - 0.5) * L, z: t.half(u) });
}
const hb = t.half(t.uB), NB = Math.max(6, Math.round(2 * hb / st));
for (let k = 1; k <= NB; k++)
pts.push({ x: (t.uB - 0.5) * L, z: hb - 2 * hb * k / NB });
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
const roofPlate = (t, y) => {
const pts = perim(t);
const sh = new THREE.Shape();
sh.moveTo(pts[0].x, pts[0].z);
for (let k = 1; k < pts.length; k++) sh.lineTo(pts[k].x, pts[k].z);
const gg = new THREE.ShapeGeometry(sh);
gg.rotateX(Math.PI / 2);
gg.translate(0, y, 0);
if (roofDeckMat) {
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
? { uA: t.uAHead, uB: t.uB, half: t.half } : t;
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
g.add(roofPlate(tCeil, t.y1));
if (i === T.n - 1) {
railRun(perim(tCeil), t.y1);
} else {
const tAbove = T.tiers[i + 1];
const promenade = (uEnd, uStart, capAt) => {
const pr = [];
const NP = Math.max(4, Math.round(Math.abs(uStart - uEnd) * L / (paneW * 0.5)));
for (let k = 0; k <= NP; k++) {
const u = uEnd + (uStart - uEnd) * k / NP;
pr.push({ x: (u - 0.5) * L, z: t.half(u) });
}
const hb = t.half(capAt);
pr.push({ x: (capAt - 0.5) * L, z: -hb });
for (let k = NP; k >= 0; k--) {
const u = uEnd + (uStart - uEnd) * k / NP;
pr.push({ x: (u - 0.5) * L, z: -t.half(u) });
}
railRun(pr, t.y1);
};
if (t.uB > tAbove.uB + 0.012) promenade(tAbove.uB, t.uB, t.uB);
const fFront = t.uAHead !== undefined ? t.uAHead : t.uA;
if (fFront < tAbove.uA - 0.012) promenade(tAbove.uA, fFront, fFront);
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
bg.add(roofPlate(whT, T.top + whH));
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
wg.add(roofPlate(wt, T.top + h));
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
let yy = 0;
tiers.forEach((t, ti) => {
const blk = new THREE.Mesh(new THREE.BoxGeometry(t[0], t[2], t[1]), dark);
blk.position.set(t[3], yy + t[2] / 2, 0);
isl.add(blk);
if (ti >= 1) {
const winH = t[2] * 0.30, winY = yy + t[2] * 0.64;
const win = new THREE.Mesh(
new THREE.BoxGeometry(t[0] * 0.94, winH, t[1] * 1.01), glassI);
win.position.set(t[3], winY, 0);
isl.add(win);
const nM = Math.max(3, Math.round(t[0] / 2.2));
for (let m = 0; m <= nM; m++) {
const mull = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.006, winH * 1.06, t[1] * 1.015), dark);
mull.position.set(t[3] - t[0] * 0.47 + (m / nM) * t[0] * 0.94, winY, 0);
isl.add(mull);
}
}
yy += t[2];
});
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
pan.position.set(-L * 0.006 + f[0] * L * 0.046, tiers[0][2] + B * 0.052,
f[1] * islW * 0.47);
pan.rotation.z = f[0] * 0.10;
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
function buildAircraft(mats) {
const ac = new THREE.Group();
const fus = new THREE.Mesh(new THREE.BoxGeometry(13.2, 1.5, 1.9), mats.acSkin);
fus.position.set(0.6, 1.55, 0); ac.add(fus);
const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.18, 5.0, 8), mats.acSkin);
nose.rotation.z = -Math.PI / 2;
nose.position.set(-8.5, 1.55, 0); ac.add(nose);
const can = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 1.1), mats.acGlass);
can.position.set(-4.6, 2.5, 0); ac.add(can);
for (const s of [-1, 1]) {
const wing = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.15, 3.3), mats.acSkin);
wing.position.set(-0.4, 2.0, s * 2.6); wing.rotation.y = s * 0.3; ac.add(wing);
const tip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.13, 2.5), mats.acSkin);
tip.position.set(0.4, 3.05, s * 4.5); tip.rotation.x = -s * 1.25; ac.add(tip);
const fin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.16), mats.acSkin);
fin.position.set(5.2, 3.35, s * 1.15); fin.rotation.x = s * 0.35; fin.rotation.z = -0.35;
ac.add(fin);
const stab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.1), mats.acSkin);
stab.position.set(6.6, 1.7, s * 1.9); stab.rotation.y = s * 0.45; ac.add(stab);
const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.85, 6), mats.acDark);
mg.position.set(1.1, 0.43, s * 1.0); ac.add(mg);
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
for (let i = 0; i < Math.min(S.deckPark, spots.length); i++) {
const ac = buildAircraft(mats);
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
const lvl = new THREE.Mesh(new THREE.BoxGeometry(d, lh, w), k % 2 ? dark : wall);
lvl.position.set(tx, y + lh / 2, 0);
g.add(tag(lvl, 'superstructure', k === K - 1 ? 'Bridge' : 'Tower level ' + (k + 1),
k === K - 1 ? 'The compass platform at the head of the tower. Everything below it is fire control, flag space and searchlight platforms, stacked because the centreline is the only real estate there is.' : undefined));
if (k >= K - 2) {
const band = new THREE.Mesh(new THREE.BoxGeometry(d * 1.03, lh * 0.30, w * 1.03), glaze);
band.position.set(tx, y + lh * 0.62, 0);
g.add(tag(band, 'superstructure', 'Bridge glazing'));
}
y += lh;
}
const rf = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.016, B * 0.016, B * 0.40, 10), dark);
rf.rotation.x = Math.PI / 2;
rf.position.set(tx, y + B * 0.020, 0);
g.add(tag(rf, 'superstructure', 'Main rangefinder',
'The primary optical rangefinder for the main battery, at the highest point that will hold one: range accuracy is baseline times height.'));
if (S.searchlights) {
const nPairs = Math.min(Math.ceil(S.searchlights / 2), Math.max(1, K - 2));
for (let p = 0; p < nPairs; p++) {
const lv = levels[Math.min(1 + p, K - 1)];
for (const sgn of [1, -1]) {
const zc = sgn * (lv.w / 2 + 1.25);
const sl = new THREE.Group();
const bk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 2.6), dark);
bk.position.set(0, -0.55, -sgn * 0.7);
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
function buildAA(S, g, T, mats) {
if (!S.aa || !S.aa.length) return;
const B = S.beam, L = S.lwl;
const steel = mats.turretSteel || (mats.turretSteel =
new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
const dark = mats.turretDark || (mats.turretDark =
new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
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
const shield = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 2.0), steel);
shield.position.y = 2.1;
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
const shield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 1.6), steel);
shield.position.y = 3.9;
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
function buildFloatplane(fm) {
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
const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 6.6, 10), fm.skin);
fus.rotation.z = Math.PI / 2;
fus.position.set(0.4, 2.35, 0);
ac.add(tag(fus, 'floatplane', 'Floatplane'));
const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.16, 1.5, 10), fm.skin);
tail.rotation.z = Math.PI / 2;
tail.position.set(4.45, 2.35, 0);
ac.add(tail);
const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.0, 12), fm.dark);
cowl.rotation.z = Math.PI / 2;
cowl.position.set(-3.3, 2.35, 0);
ac.add(tag(cowl, 'floatplane', 'Engine cowling'));
for (const r of [0, Math.PI / 2]) {
const bl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.5, 0.28), fm.dark);
bl.rotation.x = r;
bl.position.set(-3.9, 2.35, 0);
ac.add(bl);
}
const can = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.75), fm.glass);
can.position.set(0.3, 2.95, 0);
ac.add(tag(can, 'floatplane', 'Canopy'));
const wingLo = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 10.8), fm.skin);
wingLo.position.set(-0.7, 1.95, 0);
ac.add(tag(wingLo, 'floatplane', 'Lower wing'));
const wingHi = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 11.2), fm.skin);
wingHi.position.set(-1.2, 3.65, 0);
ac.add(tag(wingHi, 'floatplane', 'Upper wing'));
for (const s of [-1, 1]) {
for (const sx of [-1.6, -0.3]) {
const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.72, 6), fm.dark);
st.position.set(sx, 2.8, s * 4.6);
ac.add(st);
}
const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), fm.dark);
cb.position.set(-1.0, 3.2, s * 0.6);
ac.add(cb);
const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 1.5, 8), fm.skin);
tf.rotation.z = Math.PI / 2;
tf.position.set(0.1, 1.05, s * 4.7);
ac.add(tag(tf, 'floatplane', 'Wingtip float'));
const ts = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), fm.dark);
ts.position.set(0.1, 1.6, s * 4.7);
ac.add(ts);
const wd = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), fm.red);
wd.position.set(-1.2, 3.65, s * 3.4);
ac.add(wd);
}
const fd = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.10, 16), fm.red);
fd.rotation.x = Math.PI / 2;
fd.position.set(1.6, 2.4, 0);
ac.add(fd);
const fin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 0.10), fm.skin);
fin.position.set(4.6, 3.35, 0);
ac.add(tag(fin, 'floatplane', 'Fin'));
const stab = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.10, 3.4), fm.skin);
stab.position.set(4.4, 2.6, 0);
ac.add(stab);
return ac;
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
let portCat = null;
for (const sgn of [1, -1]) {
const g = new THREE.Group();
const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.0, 14), dark);
ped.position.y = 0.5;
g.add(tag(ped, 'catapult', 'Catapult turntable'));
const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 1.4), steel);
beam.position.y = 1.45;
g.add(tag(beam, 'catapult'));
const rail = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.18, 0.5), dark);
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
const jib = new THREE.Mesh(new THREE.BoxGeometry(jibL, 0.6, 0.6), steel);
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
if (portCat) {
const p0 = buildFloatplane(fm);
p0.position.y = 2.08;
p0.rotation.y = Math.PI;
portCat.add(tag(p0, 'floatplane'));
}
for (let i = portCat ? 1 : 0; i < S.floatplanes; i++) {
const p = buildFloatplane(fm);
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
S.deckHatches.forEach(hc => {
const u = hc.at, b = Math.abs(surfacePoint(S, H, u, 1.0)[2]);
const zP = (hc.z || 0) * b;
const camber = Math.cos((zP / b) * Math.PI / 2) * b * 0.035;
const g = new THREE.Group();
const coam = new THREE.Mesh(new THREE.BoxGeometry(hc.lenM, 0.55, hc.widM), dark);
coam.position.y = 0.12;
g.add(tag(coam, 'hatch', 'Hatch coaming'));
const lid = new THREE.Mesh(new THREE.BoxGeometry(hc.lenM * 0.96, 0.16, hc.widM * 0.92), cover);
lid.position.y = 0.47;
g.add(tag(lid, 'hatch', 'Hatch cover'));
for (let s = 1; s <= 2; s++) {
const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, hc.widM * 0.92), dark);
strip.position.set((s / 3 - 0.5) * hc.lenM * 0.96, 0.57, 0);
g.add(strip);
}
g.position.set((u - 0.5) * L, H.sheer(u) + camber, zP);
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
for (const sgn of [1, -1]) {
const NSEG = 18;
for (let i = 0; i < NSEG; i++) {
const ua = sA + (sB - sA) * i / NSEG, ub = sA + (sB - sA) * (i + 1) / NSEG;
const a = sideAt(ua, G.shelfY), b = sideAt(ub, G.shelfY);
const dx = b[0] - a[0], dz = sgn * (b[2] - a[2]);
const plate = new THREE.Mesh(
new THREE.BoxGeometry(Math.hypot(dx, dz) * 1.06, 0.09, 0.55), shelfMat);
plate.position.set((a[0] + b[0]) / 2, G.shelfY, sgn * ((a[2] + b[2]) / 2 + 0.22));
plate.rotation.y = Math.atan2(-dz, dx);
group.add(tag(plate, 'net', 'Net shelf'));
}
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
const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.34), steel);
hinge.position.copy(A);
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
for (const zc of rowZ) {
const hw = halfAt(zc) * 0.84;
const N = Math.max(3, Math.min(7, Math.round((2 * hw) / (B * 0.095))));
const pitch = (2 * hw) / N, ww = pitch * 0.64;
for (let i = 0; i < N; i++) {
const zi = -hw + pitch * (i + 0.5);
const fr = new THREE.Mesh(new THREE.BoxGeometry(B * 0.012, wh, ww), mats.woodPale);
fr.position.set(xF + B * 0.006, zc, zi);
g.add(tag(fr, 'sternlight'));
const gl = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.012, wh - B * 0.016, ww - B * 0.014), glass);
gl.position.set(xF + B * 0.007, zc, zi);
g.add(tag(gl, 'sternlight'));
const mu = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.013, wh - B * 0.016, B * 0.006), mats.woodPale);
mu.position.set(xF + B * 0.0075, zc, zi);
g.add(tag(mu, 'sternlight'));
}
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
const inb = oarLen * 0.38, outb = oarLen * 0.62;
const DOG = 0.35;
const limb = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.010, B * 0.036, outb), mat);
limb.position.z = outb / 2;
o.add(limb);
const face = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.008, B * 0.052, outb * 0.45), mat);
face.position.set(0, -B * 0.004, outb * 0.76);
o.add(face);
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
const inb = oarLen * 0.26, outb = oarLen * 0.74;
const shaft = new THREE.Mesh(
new THREE.CylinderGeometry(B * 0.010, B * 0.014, oarLen, 6), mat);
shaft.rotation.x = Math.PI / 2;
shaft.position.z = outb / 2 - inb / 2;
o.add(shaft);
const blade = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.008, B * 0.075, oarLen * 0.22), mat);
blade.position.z = outb * 0.90;
o.add(blade);
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
if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2,
a + 2, a + 1, a, a + 2, a + 3, a + 1); }
}
const dg = new THREE.BufferGeometry();
dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
dg.setIndex(idx); dg.computeVertexNormals();
group.add(tag(new THREE.Mesh(dg, pale), 'gundeck', GD.name, GD.what));
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
const hemMat = new THREE.MeshStandardMaterial({ color: 0x252a38, roughness: 0.94,
side: THREE.DoubleSide });
const lipIn = B * 0.010;
const tuck = 0.10;
const clear = 0.15;
const headYc = gdY - B * 0.016;
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
const bays = Math.max(4, Math.round((GD.to - GD.from) * L / 0.7));
for (let j = 0; j < bays; j++) {
const u = GD.from + (GD.to - GD.from) * ((j + 0.5) / bays);
const p = surfacePoint(S, H, u, 1.0);
const hw = Math.abs(p[2]) + over;
const sc = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10, Math.PI, Math.PI),
hemMat);
sc.position.set(p[0], p[1] + clear, sgn * (hw - lipIn - tuck + 0.01));
group.add(tag(sc, 'maku', 'Maku hem'));
}
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
for (let k = 1; k < K + 1; k++) idx.push(0, k, k + 1, 0, k + 1, k);
const fg = new THREE.BufferGeometry();
fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
fg.setIndex(idx); fg.computeVertexNormals();
group.add(tag(new THREE.Mesh(fg, pale), 'fortress'));
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
for (const sgn of [-1, 1]) {
const g = new THREE.Group();
const R = D / 2;
for (let i = 0; i < 24; i++) {
const a = i / 24 * Math.PI * 2;
const arm = new THREE.Mesh(
new THREE.BoxGeometry(B * 0.020, R * 2, B * 0.020), iron);
arm.rotation.z = a;
g.add(arm);
const float = new THREE.Mesh(
new THREE.BoxGeometry(D * 0.030, D * 0.115, B * 0.30), mats.woodDark || mats.woodPale);
float.position.set(Math.cos(a + Math.PI / 2) * R * 0.90,
Math.sin(a + Math.PI / 2) * R * 0.90, 0);
float.rotation.z = a;
g.add(float);
}
for (const r of [R, R * 0.55]) {
const rim = new THREE.Mesh(new THREE.TorusGeometry(r, B * 0.012, 6, 30), iron);
g.add(rim);
}
g.position.set(p[0], axleY, sgn * (p[2] + B * 0.16));
g.userData.wheel = { sgn, R };
group.add(tag(g, 'paddle'));
const bw = B * 0.42;
const boxRx = D * 0.60, boxRy = D * 0.60 * 0.86;
const h0 = Math.min(Math.max(H.sheer(u) - axleY, boxRy * 0.12), boxRy * 0.55);
const th0 = Math.asin(h0 / boxRy);
const xc = boxRx * Math.cos(th0);
const spon = new THREE.Mesh(
new THREE.BoxGeometry(xc * 2.16, B * 0.055, bw * 1.06), iron);
spon.position.set(p[0], axleY + h0 - B * 0.0275, sgn * (p[2] + B * 0.16));
group.add(tag(spon, 'paddle', 'Sponson',
'The platform bracketed out from the hull side at deck level that carries the wheel\'s shaft bearings and the box above. Everything over it is housing; everything under it is wheel.'));
const bg = new THREE.Group();
bg.position.set(p[0], axleY, sgn * (p[2] + B * 0.16));
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
const rib = new THREE.Mesh(
new THREE.BoxGeometry(D * 0.020, t * 0.92, B * 0.030), mats.woodPale || iron);
rib.position.set(Math.cos(b) * t * 0.5, h0 + Math.sin(b) * t * 0.5, bw / 2 + B * 0.014);
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
group.add(tag(new THREE.Mesh(buildRudderGeometry(S), timber), 'rudder'));
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