'use strict';
const NAV_W = 512, NAV_H = 256;
const R_EARTH_NM = 3440.065;
const NAV = { ready: false, depth: null, w: NAV_W, h: NAV_H };
function buildNavGrid() {
if (NAV.ready || !APP.depthCanvas) return NAV.ready;
const src = APP.depthCanvas;
const cw = src.width, chh = src.height;
const cx = src.getContext('2d', { willReadFrequently: true });
const img = cx.getImageData(0, 0, cw, chh).data;
const depth = new Float32Array(NAV_W * NAV_H);
for (let y = 0; y < NAV_H; y++) {
const sy = Math.min(chh - 1, Math.floor((y + 0.5) / NAV_H * chh));
for (let x = 0; x < NAV_W; x++) {
const sx = Math.min(cw - 1, Math.floor((x + 0.5) / NAV_W * cw));
const i = (sy * cw + sx) * 4;
const u16 = img[i] * 256 + img[i + 1];
depth[y * NAV_W + x] = u16 / 65535 * 20000 - 11000;
}
}
NAV.depth = depth;
NAV.ready = true;
return true;
}
const _windCache = new Map();
async function sampleWind(monthIndex) {
const m = ((monthIndex % 12) + 12) % 12;
if (_windCache.has(m)) return _windCache.get(m);
const name = `fields/wind_${String(m + 1).padStart(2, '0')}.png`;
const blob = await (await fetch(name)).blob();
const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none',
premultiplyAlpha: 'none' });
const img = { width: bmp.width, height: bmp.height };
const cv = document.createElement('canvas');
cv.width = img.width; cv.height = img.height;
const cx = cv.getContext('2d', { willReadFrequently: true });
cx.imageSmoothingEnabled = false;
cx.drawImage(bmp, 0, 0);
bmp.close();
const d = cx.getImageData(0, 0, img.width, img.height).data;
const u = new Float32Array(NAV_W * NAV_H), v = new Float32Array(NAV_W * NAV_H);
const ice = new Float32Array(NAV_W * NAV_H);
for (let y = 0; y < NAV_H; y++) {
const sy = Math.min(img.height - 1, Math.floor((y + 0.5) / NAV_H * img.height));
for (let x = 0; x < NAV_W; x++) {
const sx = Math.min(img.width - 1, Math.floor((x + 0.5) / NAV_W * img.width));
const i = (sy * img.width + sx) * 4;
const k = y * NAV_W + x;
u[k] = (d[i] / 255 - 0.5019608) * 2 * 25;
v[k] = (d[i + 1] / 255 - 0.5019608) * 2 * 25;
ice[k] = d[i + 2] / 255 * 100;
}
}
const out = { u, v, ice };
_windCache.set(m, out);
return out;
}
const D2R = Math.PI / 180;
function cellLat(y) { return 90 - (y + 0.5) / NAV_H * 180; }
function cellLon(x) { return -180 + (x + 0.5) / NAV_W * 360; }
function haversineNm(lat1, lon1, lat2, lon2) {
const p1 = lat1 * D2R, p2 = lat2 * D2R;
const dp = (lat2 - lat1) * D2R, dl = (lon2 - lon1) * D2R;
const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
return 2 * R_EARTH_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}
function bearingDeg(lat1, lon1, lat2, lon2) {
const p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
const y = Math.sin(dl) * Math.cos(p2);
const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
return (Math.atan2(y, x) / D2R + 360) % 360;
}
function compilePolar(polar) {
const STEP = 1;
const n = 181;
const spd = new Float32Array(n);
const keys = Object.keys(polar.curve).map(Number).sort((a, b) => a - b);
for (let a = 0; a < n; a++) {
let lo = keys[0], hi = keys[keys.length - 1];
for (let i = 1; i < keys.length; i++) {
if (a <= keys[i]) { lo = keys[i - 1]; hi = keys[i]; break; }
}
const f = hi === lo ? 0 : (a - lo) / (hi - lo);
spd[a] = polar.curve[lo] * (1 - f) + polar.curve[hi] * f;
}
let head = null;
if (polar.floor) {
head = new Float32Array(n);
for (let a = 0; a < 91; a++) head[a] = Math.cos(a * Math.PI / 180);
}
return { spd, beatLight: polar.beatLight, beatHard: polar.beatHard,
isEngine: polar.beatLight === 0, STEP,
floorKn: polar.floor ? polar.floor.kn : 0,
floorLoss: polar.floor ? polar.floor.lossKnPerMs : 0, head };
}
function polarBeat(P, twsMs) {
let hard = (twsMs - 5.0) / 6.0;
hard = hard < 0 ? 0 : (hard > 1 ? 1 : hard);
return P.beatLight + (P.beatHard - P.beatLight) * hard;
}
function polarSpeed(P, twsMs, twaDeg) {
const twa = twaDeg < 0 ? -twaDeg : twaDeg;
const a = twa > 180 ? 180 : (twa | 0);
const base = P.spd[a];
if (P.isEngine) return base;
let sail = 0;
const beat = polarBeat(P, twsMs);
if (twa >= beat) {
const s = Math.sqrt((twsMs > 0.4 ? twsMs : 0.4) / 8.0);
sail = base * (s > 1.55 ? 1.55 : s);
}
if (!P.floorKn) return sail;
const mus = P.floorKn - P.floorLoss * P.head[a] * twsMs;
return sail > mus ? sail : (mus > 0 ? mus : 0);
}
class Heap {
constructor() { this.k = []; this.v = []; }
get size() { return this.k.length; }
push(key, val) {
this.k.push(key); this.v.push(val);
let i = this.k.length - 1;
while (i > 0) {
const p = (i - 1) >> 1;
if (this.k[p] <= this.k[i]) break;
this._swap(p, i); i = p;
}
}
pop() {
const top = this.v[0], tk = this.k[0];
const lk = this.k.pop(), lv = this.v.pop();
if (this.k.length) {
this.k[0] = lk; this.v[0] = lv;
let i = 0;
for (;;) {
const l = 2 * i + 1, r = l + 1;
let s = i;
if (l < this.k.length && this.k[l] < this.k[s]) s = l;
if (r < this.k.length && this.k[r] < this.k[s]) s = r;
if (s === i) break;
this._swap(s, i); i = s;
}
}
return { key: tk, val: top };
}
_swap(a, b) {
const tk = this.k[a]; this.k[a] = this.k[b]; this.k[b] = tk;
const tv = this.v[a]; this.v[a] = this.v[b]; this.v[b] = tv;
}
}
const NEIGH = [
[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2],
];
let EDGE = null;
function buildEdgeTable() {
if (EDGE) return EDGE;
const dist = new Float32Array(NAV_H * 16);
const brg = new Float32Array(NAV_H * 16);
for (let y = 0; y < NAV_H; y++) {
const lat = cellLat(y);
for (let n = 0; n < 16; n++) {
const [dx, dy] = NEIGH[n];
const ny = y + dy;
if (ny < 0 || ny >= NAV_H) { dist[y * 16 + n] = -1; continue; }
const nlat = cellLat(ny);
const dlon = dx * (360 / NAV_W);
dist[y * 16 + n] = haversineNm(lat, 0, nlat, dlon);
brg[y * 16 + n] = bearingDeg(lat, 0, nlat, dlon);
}
}
EDGE = { dist, brg };
return EDGE;
}
async function solveReach(lon0, lat0, vessel, monthIndex) {
if (!buildNavGrid()) return null;
buildEdgeTable();
const wind = await sampleWind(monthIndex);
const polar = compilePolar(vessel.polar);
const draught = vessel.draught || 6;
const N = NAV_W * NAV_H;
const cost = new Float64Array(N).fill(Infinity);
const done = new Uint8Array(N);
const navigable = (k) => {
const d = NAV.depth[k];
if (d > -draught) return false;
if (wind.ice[k] > 15) return false;
return true;
};
let sx = Math.round((lon0 + 180) / 360 * NAV_W - 0.5);
let sy = Math.round((90 - lat0) / 180 * NAV_H - 0.5);
sx = ((sx % NAV_W) + NAV_W) % NAV_W;
sy = Math.max(0, Math.min(NAV_H - 1, sy));
let seed = -1;
for (let r = 0; r <= 4 && seed < 0; r++) {
for (let dy = -r; dy <= r && seed < 0; dy++) {
for (let dx = -r; dx <= r && seed < 0; dx++) {
const y = sy + dy; if (y < 0 || y >= NAV_H) continue;
const x = ((sx + dx) % NAV_W + NAV_W) % NAV_W;
const k = y * NAV_W + x;
if (navigable(k)) seed = k;
}
}
}
if (seed < 0) return null;
const heap = new Heap();
cost[seed] = 0;
heap.push(0, seed);
let expanded = 0;
while (heap.size) {
const { key, val: k } = heap.pop();
if (done[k]) continue;
if (key > cost[k]) continue;
done[k] = 1;
expanded++;
if (key > 9600) continue;
const y = (k / NAV_W) | 0, x = k - y * NAV_W;
const erow = y * 16;
for (let n = 0; n < 16; n++) {
const dy = NEIGH[n][1], dx = NEIGH[n][0];
const ny = y + dy;
if (ny < 1 || ny >= NAV_H - 1) continue;
const nx = ((x + dx) % NAV_W + NAV_W) % NAV_W;
const nk = ny * NAV_W + nx;
if (done[nk] || !navigable(nk)) continue;
const distNm = EDGE.dist[erow + n];
if (distNm < 0) continue;
const brg = EDGE.brg[erow + n];
const wu = (wind.u[k] + wind.u[nk]) * 0.5;
const wv = (wind.v[k] + wind.v[nk]) * 0.5;
const twsRaw = Math.sqrt(wu * wu + wv * wv);
const tws = twsRaw > 4.0 ? twsRaw : 4.0;
const windFrom = (Math.atan2(-wu, -wv) * 57.29577951308232 + 360) % 360;
const twa = Math.abs(((windFrom - brg + 540) % 360) - 180);
const stw = polarSpeed(polar, tws, twa);
if (stw <= 0.05) continue;
const nc = key + distNm / stw;
if (nc < cost[nk]) { cost[nk] = nc; heap.push(nc, nk); }
}
}
return { cost, expanded, seed };
}
function reachToTexture(cost) {
const px = new Uint8Array(NAV_W * NAV_H * 4);
let reached = 0;
for (let i = 0; i < NAV_W * NAV_H; i++) {
const c = cost[i];
if (!isFinite(c)) { px[i * 4 + 3] = 255; continue; }
reached++;
const q = Math.max(0, Math.min(65535, Math.round(c / 9600 * 65535)));
px[i * 4] = q >> 8;
px[i * 4 + 1] = q & 0xFF;
px[i * 4 + 2] = 255;
px[i * 4 + 3] = 255;
}
const tex = new THREE.DataTexture(px, NAV_W, NAV_H, THREE.RGBAFormat);
tex.flipY = false;
tex.wrapS = THREE.RepeatWrapping;
tex.wrapT = THREE.ClampToEdgeWrapping;
tex.minFilter = THREE.LinearFilter;
tex.magFilter = THREE.LinearFilter;
tex.generateMipmaps = false;
tex.needsUpdate = true;
return { tex, reached };
}
async function computeReachFrom(port, vesselId) {
const vessels = (APP.vessels && APP.vessels.vessels) || [];
const v = vessels.find(x => x.id === vesselId) || vessels.find(x => x.id === 'square')
|| vessels[0];
if (!v) return null;
const t0 = performance.now();
const res = await solveReach(port.lon, port.lat, v, Math.floor(S.month) % 12);
if (!res) return null;
const { tex, reached } = reachToTexture(res.cost);
mat.uniforms.uReach.value = tex;
mat.uniforms.uLyReach.value = 1;
S.layers.reach = 1;
const box = document.getElementById('lyReach');
if (box) box.checked = true;
const ms = performance.now() - t0;
const pct = (reached / (NAV_W * NAV_H) * 100);
return { vessel: v, reached, pct, ms };
}
function passageHours(cost, lon, lat) {
const x = ((Math.round((lon + 180) / 360 * NAV_W - 0.5) % NAV_W) + NAV_W) % NAV_W;
const y = Math.max(0, Math.min(NAV_H - 1, Math.round((90 - lat) / 180 * NAV_H - 0.5)));
let best = Infinity;
for (let dy = -2; dy <= 2; dy++) {
for (let dx = -2; dx <= 2; dx++) {
const yy = y + dy; if (yy < 0 || yy >= NAV_H) continue;
const xx = ((x + dx) % NAV_W + NAV_W) % NAV_W;
const c = cost[yy * NAV_W + xx];
if (c < best) best = c;
}
}
return best;
}
function seaDepthAt(lon, lat) {
if (!buildNavGrid()) return -4000;
let x = Math.floor(((lon + 180) % 360) / 360 * NAV_W);
if (x < 0) x += NAV_W;
const y = Math.floor((90 - lat) / 180 * NAV_H);
if (y < 0 || y >= NAV_H) return -4000;
return NAV.depth[y * NAV_W + Math.min(NAV_W - 1, x)];
}
function isNavigable(lon, lat, minDepth) {
return seaDepthAt(lon, lat) < -(minDepth === undefined ? 60 : minDepth);
}
let MASK_W = 2048, MASK_H = 1024;
const SHOAL_M = -5;
const CARVED = [
{ name: 'Strait of Magellan', why: '2 km at the First Narrows; the raster cell is 19.5 km',
line: [[-68.4, -52.5], [-70.5, -53.6], [-71.4, -53.9], [-74.0, -52.9], [-75.4, -52.6]] },
{ name: 'Bosphorus and the Dardanelles', why: '700 m at the narrowest',
line: [[26.2, 40.1], [29.2, 41.3], [30.0, 41.9]] },
{ name: 'Suez Canal', why: 'opened 1869; 205 m wide against a 19.5 km cell', from: 1869,
line: [[32.30, 31.30], [32.32, 30.90], [32.31, 30.58], [32.35, 30.35], [32.55, 29.93],
[32.80, 29.60]] },
{ name: 'Panama Canal', why: 'opened 1914; 33 m at the locks', from: 1914,
line: [[-79.92, 9.40], [-79.92, 9.27], [-79.80, 9.18], [-79.68, 9.10], [-79.55, 8.95],
[-79.48, 8.80]] },
];
const MASK = { ready: false, ocean: null, coast: null, w: MASK_W, h: MASK_H,
cache: new Map() };
MASK.level = -1;
function bestDepthCanvas() {
const by = APP.depthCanvasByLevel;
if (!by) return { cv: APP.depthCanvas, level: 0 };
let best = -1;
for (const k of Object.keys(by)) { const n = +k; if (n > best) best = n; }
return best < 0 ? { cv: APP.depthCanvas, level: 0 } : { cv: by[best], level: best };
}
function maskUpgradeAvailable() {
const b = bestDepthCanvas();
return !!b.cv && b.level > MASK.level;
}
const FINE = { ready: false, elev: null, w: 0, h: 0, level: -1, datum: 0, year: 3000, sig: '',
blockedSeen: 0, detourFail: 0, unfixed: 0 };
function buildFine(src, level) {
const cw = src.width, ch = src.height;
const cx = src.getContext('2d', { willReadFrequently: true });
const img = cx.getImageData(0, 0, cw, ch).data;
const elev = new Int16Array(cw * ch);
for (let k = 0; k < elev.length; k++) {
const i = k * 4;
elev[k] = Math.max(-32768, Math.min(32767,
Math.round((img[i] * 256 + img[i + 1]) / 65535 * 20000 - 11000)));
}
FINE.elev = elev; FINE.w = cw; FINE.h = ch; FINE.level = level; FINE.ready = true;
}
function fineIsWater(lon, lat) {
if (!FINE.ready) return true;
const x = Math.min(FINE.w - 1, Math.floor((((lon + 180) % 360) + 360) % 360 / 360 * FINE.w));
const y = Math.max(0, Math.min(FINE.h - 1, Math.floor((90 - lat) / 180 * FINE.h)));
return FINE.elev[y * FINE.w + x] < FINE.datum + SHOAL_M;
}
function setSeaLevel(m, year) {
const v = Math.round((m || 0) / 5) * 5;
const y = year === undefined ? FINE.year : year;
const sig = v + '|' + CARVED.map(c => (c.from === undefined || y >= c.from) ? 1 : 0).join('');
if (sig === FINE.sig) return false;
FINE.datum = v; FINE.year = y; FINE.sig = sig;
const hit = MASK.cache && MASK.cache.get(sig);
if (hit) { MASK.ocean = hit.ocean; MASK.coast = hit.coast; MASK.ready = true; return false; }
MASK.ready = false;
return true;
}
function buildMask(force) {
if (MASK.ready && !force) return true;
const pick = bestDepthCanvas();
if (!pick.cv) return false;
if (!FINE.ready || FINE.level !== pick.level) buildFine(pick.cv, pick.level);
MASK.level = pick.level;
MASK_W = 2048; MASK_H = 1024;
MASK.w = MASK_W; MASK.h = MASK_H;
const N = MASK_W * MASK_H;
const fx = FINE.w / MASK_W, fy = FINE.h / MASK_H;
const water = new Uint8Array(N);
for (let y = 0; y < MASK_H; y++) {
const y0 = Math.floor(y * fy), y1 = Math.min(FINE.h, Math.ceil((y + 1) * fy));
for (let x = 0; x < MASK_W; x++) {
const x0 = Math.floor(x * fx), x1 = Math.min(FINE.w, Math.ceil((x + 1) * fx));
let wet = 0, tot = 0;
for (let yy = y0; yy < y1; yy++)
for (let xx = x0; xx < x1; xx++) {
tot++; if (FINE.elev[yy * FINE.w + xx] < FINE.datum + SHOAL_M) wet++;
}
water[y * MASK_W + x] = (tot && wet * 2 >= tot) ? 1 : 0;
}
}
for (const c of CARVED) {
if (c.from !== undefined && FINE.year < c.from) continue;
for (let s2 = 0; s2 < c.line.length - 1; s2++) {
const a = maskCell(c.line[s2][0], c.line[s2][1]);
const b = maskCell(c.line[s2 + 1][0], c.line[s2 + 1][1]);
const ay = (a / MASK_W) | 0, ax = a % MASK_W, by = (b / MASK_W) | 0, bx = b % MASK_W;
const n = Math.max(Math.abs(by - ay), Math.abs(bx - ax)) * 3 + 1;
for (let i = 0; i <= n; i++) {
const f = i / n;
const y = Math.round(ay + (by - ay) * f), x = Math.round(ax + (bx - ax) * f);
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
const yy = Math.max(0, Math.min(MASK_H - 1, y + dy)), xx = (x + dx + MASK_W) % MASK_W;
water[yy * MASK_W + xx] = 1;
}
}
}
}
const ocean = new Uint8Array(N);
const q = new Int32Array(N);
let qh = 0, qt = 0;
const seed = maskCell(-150, 10);
ocean[seed] = 1; q[qt++] = seed;
while (qh < qt) {
const k = q[qh++], y = (k / MASK_W) | 0, x = k % MASK_W;
for (let d = 0; d < 4; d++) {
const ny = y + (d === 0 ? 1 : d === 1 ? -1 : 0);
const nx = (x + (d === 2 ? 1 : d === 3 ? -1 : 0) + MASK_W) % MASK_W;
if (ny < 0 || ny >= MASK_H) continue;
const nk = ny * MASK_W + nx;
if (water[nk] && !ocean[nk]) { ocean[nk] = 1; q[qt++] = nk; }
}
}
const coast = new Uint8Array(N).fill(7);
qh = qt = 0;
for (let k = 0; k < N; k++) if (!ocean[k]) { coast[k] = 0; q[qt++] = k; }
while (qh < qt) {
const k = q[qh++], c = coast[k];
if (c >= 6) continue;
const y = (k / MASK_W) | 0, x = k % MASK_W;
for (let d = 0; d < 4; d++) {
const ny = y + (d === 0 ? 1 : d === 1 ? -1 : 0);
const nx = (x + (d === 2 ? 1 : d === 3 ? -1 : 0) + MASK_W) % MASK_W;
if (ny < 0 || ny >= MASK_H) continue;
const nk = ny * MASK_W + nx;
if (coast[nk] > c + 1) { coast[nk] = c + 1; q[qt++] = nk; }
}
}
MASK.ocean = ocean; MASK.coast = coast; MASK.ready = true;
if (MASK.cache && FINE.sig) MASK.cache.set(FINE.sig, { ocean, coast });
return true;
}
function maskCell(lon, lat) {
const x = Math.min(MASK_W - 1, Math.floor((((lon + 180) % 360) + 360) % 360 / 360 * MASK_W));
const y = Math.max(0, Math.min(MASK_H - 1, Math.floor((90 - lat) / 180 * MASK_H)));
return y * MASK_W + x;
}
function cellLonLat(k) {
const y = (k / MASK_W) | 0, x = k % MASK_W;
return { lon: (x + 0.5) / MASK_W * 360 - 180, lat: 90 - (y + 0.5) / MASK_H * 180 };
}
function isOcean(lon, lat) {
if (!buildMask()) return true;
return fineIsWater(lon, lat);
}
function isRoutable(lon, lat) {
if (!buildMask()) return true;
return !!MASK.ocean[maskCell(lon, lat)];
}
function snapToOcean(k, maxR) {
if (MASK.ocean[k]) return k;
const y0 = (k / MASK_W) | 0, x0 = k % MASK_W;
for (let r = 1; r <= (maxR || 40); r++) {
for (let dy = -r; dy <= r; dy++) {
for (let dx = -r; dx <= r; dx++) {
if (Math.max(Math.abs(dy), Math.abs(dx)) !== r) continue;
const y = y0 + dy; if (y < 0 || y >= MASK_H) continue;
const nk = y * MASK_W + ((x0 + dx + MASK_W) % MASK_W);
if (MASK.ocean[nk]) return nk;
}
}
}
return -1;
}
const _AS = { g: null, from: null, stamp: null, run: 0, hk: null, hv: null, hn: 0 };
function heapPush(k, v) {
let i = _AS.hn++;
if (i >= _AS.hk.length) {
const nk = new Float32Array(_AS.hk.length * 2), nv = new Int32Array(_AS.hv.length * 2);
nk.set(_AS.hk); nv.set(_AS.hv); _AS.hk = nk; _AS.hv = nv;
}
_AS.hk[i] = k; _AS.hv[i] = v;
while (i > 0) {
const p = (i - 1) >> 1;
if (_AS.hk[p] <= _AS.hk[i]) break;
const tk = _AS.hk[p], tv = _AS.hv[p];
_AS.hk[p] = _AS.hk[i]; _AS.hv[p] = _AS.hv[i]; _AS.hk[i] = tk; _AS.hv[i] = tv;
i = p;
}
}
function heapPop() {
const top = _AS.hv[0];
_AS.hn--;
if (_AS.hn > 0) {
_AS.hk[0] = _AS.hk[_AS.hn]; _AS.hv[0] = _AS.hv[_AS.hn];
let i = 0;
for (;;) {
const l = 2 * i + 1, r = l + 1;
let s = i;
if (l < _AS.hn && _AS.hk[l] < _AS.hk[s]) s = l;
if (r < _AS.hn && _AS.hk[r] < _AS.hk[s]) s = r;
if (s === i) break;
const tk = _AS.hk[s], tv = _AS.hv[s];
_AS.hk[s] = _AS.hk[i]; _AS.hv[s] = _AS.hv[i]; _AS.hk[i] = tk; _AS.hv[i] = tv;
i = s;
}
}
return top;
}
const CELL_NM = 180 / MASK_H * 60;
function seaPath(lon0, lat0, lon1, lat1) {
if (!buildMask()) return null;
const a = snapToOcean(maskCell(lon0, lat0)), b = snapToOcean(maskCell(lon1, lat1));
if (a < 0 || b < 0) return null;
if (a === b) return [{ lon: lon0, lat: lat0 }, { lon: lon1, lat: lat1 }];
const N = MASK_W * MASK_H;
if (!_AS.g) {
_AS.g = new Float32Array(N); _AS.from = new Int32Array(N);
_AS.stamp = new Int32Array(N); _AS.hk = new Float32Array(1 << 16); _AS.hv = new Int32Array(1 << 16);
}
const run = ++_AS.run;
const by = (b / MASK_W) | 0, bx = b % MASK_W;
const h = (y, x) => {
const dy = Math.abs(y - by);
let dx = Math.abs(x - bx); if (dx > MASK_W / 2) dx = MASK_W - dx;
const kx = Math.cos((90 - (y + 0.5) / MASK_H * 180) * Math.PI / 180);
return Math.hypot(dy, dx * kx);
};
_AS.hn = 0;
_AS.g[a] = 0; _AS.stamp[a] = run; _AS.from[a] = -1;
heapPush(h((a / MASK_W) | 0, a % MASK_W), a);
const closed = new Set();
let guard = 0;
while (_AS.hn > 0 && guard++ < 4000000) {
const cur = heapPop();
if (closed.has(cur)) continue;
closed.add(cur);
if (cur === b) break;
const cy = (cur / MASK_W) | 0, cxx = cur % MASK_W;
const kx = Math.cos((90 - (cy + 0.5) / MASK_H * 180) * Math.PI / 180);
for (let dy = -1; dy <= 1; dy++) {
const ny = cy + dy; if (ny < 0 || ny >= MASK_H) continue;
for (let dx = -1; dx <= 1; dx++) {
if (!dx && !dy) continue;
const nx = (cxx + dx + MASK_W) % MASK_W;
const nk = ny * MASK_W + nx;
if (!MASK.ocean[nk]) continue;
if (dx && dy && (!MASK.ocean[cy * MASK_W + nx] || !MASK.ocean[ny * MASK_W + cxx])) continue;
const c = MASK.coast[nk];
const pen = 1 + (c <= 1 ? 2.2 : c === 2 ? 0.9 : c === 3 ? 0.35 : 0);
const ng = _AS.g[cur] + Math.hypot(dy, dx * kx) * pen;
if (_AS.stamp[nk] !== run || ng < _AS.g[nk]) {
_AS.stamp[nk] = run; _AS.g[nk] = ng; _AS.from[nk] = cur;
heapPush(ng + h(ny, nx), nk);
}
}
}
}
if (_AS.stamp[b] !== run) return null;
const cells = [];
for (let k = b; k >= 0; k = _AS.from[k]) { cells.push(k); if (k === a) break; }
cells.reverse();
const out = [];
let i = 0;
while (i < cells.length - 1) {
let j = cells.length - 1;
for (; j > i + 1; j--) if (segmentClear(cells[i], cells[j])) break;
out.push(cells[i]);
i = j;
}
out.push(cells[cells.length - 1]);
const pts = out.map(cellLonLat);
return refineAgainstFine(pts);
}
function refineAgainstFine(ptsIn) {
if (!FINE.ready || ptsIn.length < 2) return ptsIn;
const toV = (lon, lat) => {
const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
};
const pts = [];
for (let i = 0; i < ptsIn.length - 1; i++) {
const a = ptsIn[i], b = ptsIn[i + 1];
const va = toV(a.lon, a.lat), vb = toV(b.lon, b.lat);
const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
const ang = Math.acos(dot), degs = ang * 180 / Math.PI;
const n = Math.max(1, Math.ceil(degs / 0.045));
const sn = Math.sin(ang);
for (let k = 0; k < n; k++) {
const f = k / n;
let x, y, z;
if (sn < 1e-9) { x = va[0]; y = va[1]; z = va[2]; }
else {
const wa = Math.sin((1 - f) * ang) / sn, wb = Math.sin(f * ang) / sn;
x = va[0] * wa + vb[0] * wb; y = va[1] * wa + vb[1] * wb; z = va[2] * wa + vb[2] * wb;
}
const r = Math.hypot(x, y, z);
pts.push({ lon: Math.atan2(x, z) * 180 / Math.PI,
lat: Math.asin(y / r) * 180 / Math.PI });
}
}
pts.push(ptsIn[ptsIn.length - 1]);
const out = [];
for (let i = 0; i < pts.length; i++) {
const p = pts[i];
if (fineIsWater(p.lon, p.lat)) { out.push(p); continue; }
const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
const cl = Math.max(0.08, Math.cos(p.lat * Math.PI / 180));
let bx = (b.lon - a.lon) * cl, by = b.lat - a.lat;
const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
let best = null;
for (let d = 1; d <= 14 && !best; d++) {
for (const side of [1, -1]) {
const off = d * 0.05 * side;
const nlon = p.lon + (-by * off) / cl, nlat = p.lat + (bx * off);
if (fineIsWater(nlon, nlat)) { best = { lon: nlon, lat: nlat }; break; }
}
}
out.push(best || p);
}
return smoothTrack(out);
}
function smoothTrack(pts) {
if (!FINE.ready || pts.length < 5) return pts;
const cur = pts.map(p => ({ lon: p.lon, lat: p.lat }));
for (let pass = 0; pass < 12; pass++) {
let moved = 0;
for (let i = 1; i < cur.length - 1; i++) {
const a = cur[i - 1], b = cur[i], c = cur[i + 1];
if (turnDeg(a, b, c) < 2) continue;
let dlonA = a.lon - b.lon, dlonC = c.lon - b.lon;
if (dlonA > 180) dlonA -= 360; else if (dlonA < -180) dlonA += 360;
if (dlonC > 180) dlonC -= 360; else if (dlonC < -180) dlonC += 360;
const tlon = b.lon + (dlonA + dlonC) * 0.5 * 0.5;
const tlat = b.lat + ((a.lat - b.lat) + (c.lat - b.lat)) * 0.5 * 0.5;
const T = { lon: tlon, lat: tlat };
if (fineIsWater(tlon, tlat) && gcWet(a, T) && gcWet(T, c)) {
b.lon = tlon; b.lat = tlat; moved++;
}
}
if (!moved) break;
}
const clear = gcWet;
const brgOf = (A, B) => {
const dl = (B.lon - A.lon) * Math.PI / 180, l1 = A.lat * Math.PI / 180, l2 = B.lat * Math.PI / 180;
return Math.atan2(Math.sin(dl) * Math.cos(l2),
Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl));
};
for (let sweep = 0; sweep < 6; sweep++) {
let cut = 0;
for (let i = 1; i < cur.length - 1; ) {
let d = Math.abs((brgOf(cur[i], cur[i + 1]) - brgOf(cur[i - 1], cur[i])) * 180 / Math.PI);
if (d > 180) d = 360 - d;
if (d > 45 && clear(cur[i - 1], cur[i + 1])) { cur.splice(i, 1); cut++; }
else i++;
}
if (!cut) break;
}
return cur;
}
function segmentClear(ka, kb) {
const A = cellLonLat(ka), B = cellLonLat(kb);
const toV = (lon, lat) => {
const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
};
const va = toV(A.lon, A.lat), vb = toV(B.lon, B.lat);
const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
const ang = Math.acos(dot);
const degs = ang * 180 / Math.PI;
if (degs > 42) return false;
const n = Math.max(2, Math.ceil(degs * MASK_H / 180 * 4));
const s = Math.sin(ang);
let prev = ka;
for (let i = 1; i <= n; i++) {
const f = i / n;
let x, y, z;
if (s < 1e-9) { x = va[0]; y = va[1]; z = va[2]; }
else {
const wa = Math.sin((1 - f) * ang) / s, wb = Math.sin(f * ang) / s;
x = va[0] * wa + vb[0] * wb; y = va[1] * wa + vb[1] * wb; z = va[2] * wa + vb[2] * wb;
}
const r = Math.hypot(x, y, z);
const lat = Math.asin(y / r) * 180 / Math.PI;
const lon = Math.atan2(x, z) * 180 / Math.PI;
const k = maskCell(lon, lat);
if (k === prev) continue;
if (!MASK.ocean[k]) return false;
const py = (prev / MASK_W) | 0, px = prev % MASK_W;
const cy = (k / MASK_W) | 0, cx = k % MASK_W;
let dxs = cx - px; if (dxs > MASK_W / 2) dxs -= MASK_W; else if (dxs < -MASK_W / 2) dxs += MASK_W;
if (cy !== py && dxs !== 0) {
if (!MASK.ocean[py * MASK_W + cx] || !MASK.ocean[cy * MASK_W + px]) return false;
}
prev = k;
}
return true;
}
function windAt(lon, lat, monthIndex) {
const m = ((Math.floor(monthIndex) % 12) + 12) % 12;
const w = _windCache.get(m);
if (!w) { sampleWind(m); return null; }
let x = Math.floor(((lon + 180) % 360 + 360) % 360 / 360 * NAV_W);
const y = Math.max(0, Math.min(NAV_H - 1, Math.floor((90 - lat) / 180 * NAV_H)));
const k = y * NAV_W + Math.min(NAV_W - 1, x);
return { u: w.u[k], v: w.v[k], speed: Math.hypot(w.u[k], w.v[k]), ice: w.ice[k] };
}
const R2D = 180 / Math.PI, EARTH_KM = 6371;
function toVec(lon, lat) {
const p = lat * D2R, l = lon * D2R;
return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
}
function toLL(v) {
const n = Math.hypot(v[0], v[1], v[2]) || 1;
return { lon: Math.atan2(v[0] / n, v[2] / n) * R2D,
lat: Math.asin(Math.max(-1, Math.min(1, v[1] / n))) * R2D };
}
function gcSlerp(A, B, f) {
const a = toVec(A.lon, A.lat), b = toVec(B.lon, B.lat);
const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
const t = Math.acos(d);
if (t < 1e-7) return { lon: A.lon, lat: A.lat };
const s = Math.sin(t), w0 = Math.sin((1 - f) * t) / s, w1 = Math.sin(f * t) / s;
return toLL([a[0] * w0 + b[0] * w1, a[1] * w0 + b[1] * w1, a[2] * w0 + b[2] * w1]);
}
function gcKm(A, B) {
const a = toVec(A.lon, A.lat), b = toVec(B.lon, B.lat);
const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
return Math.acos(d) * EARTH_KM;
}
function gcWet(A, B) {
const km = gcKm(A, B);
const n = Math.max(2, Math.ceil(km));
for (let i = 1; i < n; i++) {
const p = gcSlerp(A, B, i / n);
if (!fineIsWater(p.lon, p.lat)) return false;
}
return true;
}
function turnDeg(A, B, C) {
const brg = (P, Q) => {
const dl = (Q.lon - P.lon) * D2R, l1 = P.lat * D2R, l2 = Q.lat * D2R;
return Math.atan2(Math.sin(dl) * Math.cos(l2),
Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl));
};
let d = Math.abs((brg(B, C) - brg(A, B)) * R2D);
return d > 180 ? 360 - d : d;
}
function walkBack(arr, d) {
let acc = 0;
for (let j = arr.length - 1; j > 0; j--) {
const seg = gcKm(arr[j - 1], arr[j]);
if (acc + seg >= d) {
const f = seg > 1e-9 ? (d - acc) / seg : 1;
return { pt: gcSlerp(arr[j], arr[j - 1], Math.max(0, Math.min(1, f))), cut: arr.length - j };
}
acc += seg;
}
return null;
}
function walkFwd(arr, i, d) {
let acc = 0;
for (let j = i; j < arr.length - 1; j++) {
const seg = gcKm(arr[j], arr[j + 1]);
if (acc + seg >= d) {
const f = seg > 1e-9 ? (d - acc) / seg : 1;
return { pt: gcSlerp(arr[j], arr[j + 1], Math.max(0, Math.min(1, f))), next: j + 1 };
}
acc += seg;
}
return null;
}
function filletTurns(pts, radiusKm, stepKm) {
if (!FINE.ready || pts.length < 5) return pts;
const step = stepKm || 4;
const out = [pts[0]];
let i = 1;
while (i < pts.length - 1) {
const B = pts[i];
const th = turnDeg(pts[i - 1], B, pts[i + 1]);
if (th < 18) { out.push(B); i++; continue; }
let placed = false;
for (let att = 0, R = radiusKm; att < 6 && !placed; att++, R *= 0.55) {
const d = Math.min(60, R * Math.tan(Math.min(84, th * 0.5) * D2R));
if (d < 0.25) break;
const back = walkBack(out, d), fwd = walkFwd(pts, i, d);
if (!back || !fwd) continue;
const n = Math.max(3, Math.round(d * 2 / step));
const arc = []; let ok = true;
for (let k = 0; k <= n; k++) {
const t = k / n;
const pt = gcSlerp(gcSlerp(back.pt, B, t), gcSlerp(B, fwd.pt, t), t);
if (!fineIsWater(pt.lon, pt.lat)) { ok = false; break; }
arc.push(pt);
}
if (ok) {
out.length -= back.cut;
for (const p of arc) out.push(p);
i = fwd.next;
placed = true;
}
}
if (!placed) { out.push(B); i++; }
}
out.push(pts[pts.length - 1]);
return out;
}
function resampleUniform(pts, stepKm) {
if (pts.length < 2) return pts;
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcKm(pts[i - 1], pts[i]));
const total = cum[cum.length - 1];
if (!(total > 0)) return pts;
const n = Math.max(2, Math.round(total / stepKm));
const out = []; let j = 0;
for (let k = 0; k <= n; k++) {
const s = total * k / n;
while (j < cum.length - 2 && cum[j + 1] < s) j++;
const seg = cum[j + 1] - cum[j];
const f = seg > 1e-9 ? (s - cum[j]) / seg : 0;
out.push(gcSlerp(pts[j], pts[j + 1], Math.max(0, Math.min(1, f))));
}
return out;
}
function nearestWater(p, maxRings) {
const cl = Math.max(0.08, Math.cos(p.lat * D2R));
for (let r = 1; r <= (maxRings || 40); r++)
for (let a = 0; a < 32; a++) {
const th = a * Math.PI / 16, dd = r * 0.03;
const lo = p.lon + Math.cos(th) * dd / cl, la = p.lat + Math.sin(th) * dd;
if (fineIsWater(lo, la)) return { lon: lo, lat: la };
}
return null;
}
function pushOffLand(pts) {
if (!FINE.ready) return pts;
for (const p of pts) {
if (fineIsWater(p.lon, p.lat)) continue;
const best = nearestWater(p);
if (best) { p.lon = best.lon; p.lat = best.lat; }
}
return pts;
}
function detourPoint(A, B, p) {
const cl = Math.max(0.08, Math.cos(p.lat * D2R));
let dl = B.lon - A.lon; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
const ex = dl * cl, ey = B.lat - A.lat, L = Math.hypot(ex, ey) || 1;
const px = -ey / L, py = ex / L;
for (let r = 1; r <= 30; r++) {
const d = r * 0.04;
for (const s of [1, -1]) {
const X = { lon: p.lon + s * px * d / cl, lat: p.lat + s * py * d };
if (fineIsWater(X.lon, X.lat) && gcWet(A, X) && gcWet(X, B)) return X;
}
}
return null;
}
function fineAStar(A, B, marginDeg) {
const W = FINE.w, H = FINE.h, cw = 360 / W, chh = 180 / H;
const gx = lon => Math.floor(((((lon + 180) % 360) + 360) % 360) / cw);
const gy = lat => Math.max(0, Math.min(H - 1, Math.floor((90 - lat) / chh)));
const x0 = gx(Math.min(A.lon, B.lon) - marginDeg), x1 = gx(Math.max(A.lon, B.lon) + marginDeg);
if (x1 <= x0) return null;
const y0 = gy(Math.max(A.lat, B.lat) + marginDeg), y1 = gy(Math.min(A.lat, B.lat) - marginDeg);
const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
if (bw < 3 || bh < 3 || bw * bh > 90000) return null;
const N = bw * bh, lim = FINE.datum + SHOAL_M;
const wet = k => FINE.elev[(y0 + ((k / bw) | 0)) * W + (x0 + (k % bw))] < lim;
let sa = (gy(A.lat) - y0) * bw + (gx(A.lon) - x0);
let sb = (gy(B.lat) - y0) * bw + (gx(B.lon) - x0);
if (sa < 0 || sa >= N || sb < 0 || sb >= N) return null;
const snap = k => {
if (wet(k)) return k;
const ky = (k / bw) | 0, kx2 = k % bw;
for (let r = 1; r < Math.max(bw, bh); r++)
for (let dy = -r; dy <= r; dy++)
for (let dx = -r; dx <= r; dx++) {
if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
const ny = ky + dy, nx = kx2 + dx;
if (ny < 0 || ny >= bh || nx < 0 || nx >= bw) continue;
const nk = ny * bw + nx;
if (wet(nk)) return nk;
}
return -1;
};
sa = snap(sa); sb = snap(sb);
if (sa < 0 || sb < 0 || sa === sb) return null;
const kx = Math.max(0.05, Math.cos((A.lat + B.lat) * 0.5 * D2R));
const bx = sb % bw, by = (sb / bw) | 0;
const g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
const done = new Uint8Array(N);
const hk = new Float32Array(N + 8), hv = new Int32Array(N + 8); let hn = 0;
const push = (p, v) => { let i = hn++; hk[i] = p; hv[i] = v;
while (i > 0) { const par = (i - 1) >> 1; if (hk[par] <= hk[i]) break;
const tk = hk[par], tv = hv[par]; hk[par] = hk[i]; hv[par] = hv[i]; hk[i] = tk; hv[i] = tv; i = par; } };
const pop = () => { const top = hv[0]; hn--; if (hn > 0) { hk[0] = hk[hn]; hv[0] = hv[hn];
let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i;
if (l < hn && hk[l] < hk[s]) s = l; if (r < hn && hk[r] < hk[s]) s = r;
if (s === i) break; const tk = hk[s], tv = hv[s]; hk[s] = hk[i]; hv[s] = hv[i]; hk[i] = tk; hv[i] = tv; i = s; } }
return top; };
g[sa] = 0; push(0, sa);
let guard = 0;
while (hn > 0 && guard++ < 400000) {
const cur = pop();
if (done[cur]) continue;
done[cur] = 1;
if (cur === sb) break;
const cy = (cur / bw) | 0, cx = cur % bw;
for (let dy = -1; dy <= 1; dy++) {
const ny = cy + dy; if (ny < 0 || ny >= bh) continue;
for (let dx = -1; dx <= 1; dx++) {
if (!dx && !dy) continue;
const nx = cx + dx; if (nx < 0 || nx >= bw) continue;
const nk = ny * bw + nx;
if (!wet(nk)) continue;
if (dx && dy && (!wet(cy * bw + nx) || !wet(ny * bw + cx))) continue;
const ng = g[cur] + Math.hypot(dy, dx * kx);
if (ng < g[nk]) { g[nk] = ng; prev[nk] = cur;
push(ng + Math.hypot(ny - by, (nx - bx) * kx), nk); }
}
}
}
if (prev[sb] < 0 && sb !== sa) return null;
const cells = [];
for (let k = sb; k >= 0; k = prev[k]) { cells.push(k); if (k === sa) break; }
cells.reverse();
const pt = k => ({ lon: (x0 + (k % bw) + 0.5) * cw - 180,
lat: 90 - (y0 + ((k / bw) | 0) + 0.5) * chh });
const raw = cells.map(pt), keep = [];
let i = 0;
while (i < raw.length - 1) {
let j = raw.length - 1;
for (; j > i + 1; j--) if (gcWet(raw[i], raw[j])) break;
keep.push(raw[i]); i = j;
}
keep.push(raw[raw.length - 1]);
return keep.slice(1, -1);
}
function fineDetour(A, B) {
for (const m of [0.5, 1.5, 4]) {
const p = fineAStar(A, B, m);
if (p && p.length) {
let ok = gcWet(A, p[0]) && gcWet(p[p.length - 1], B);
for (let i = 1; ok && i < p.length; i++) ok = gcWet(p[i - 1], p[i]);
if (ok) return p;
}
}
return null;
}
function clearSegments(pts, sampleKm) {
if (!FINE.ready || pts.length < 2) return pts;
const stepKm = sampleKm || 1;
let cur = pts;
for (let pass = 0; pass < 4; pass++) {
const out = [cur[0]]; let fixed = 0;
for (let i = 1; i < cur.length; i++) {
const A = cur[i - 1], B = cur[i];
const n = Math.max(2, Math.ceil(gcKm(A, B) / stepKm));
for (let k = 1; k < n; k++) {
const p = gcSlerp(A, B, k / n);
if (!fineIsWater(p.lon, p.lat)) {
FINE.blockedSeen++;
const fix = detourPoint(A, B, p);
if (fix) { out.push(fix); fixed++; }
else {
const way = fineDetour(A, B);
if (way) { for (const q of way) out.push(q); fixed++; }
else { FINE.detourFail++; if (FINE.run) FINE.run.detourFail++; }
}
break;
}
}
out.push(B);
}
cur = out;
if (!fixed) break;
}
const blocked = i => {
const n = Math.max(2, Math.ceil(gcKm(cur[i - 1], cur[i]) / stepKm));
for (let k = 1; k < n; k++) {
const p = gcSlerp(cur[i - 1], cur[i], k / n);
if (!fineIsWater(p.lon, p.lat)) return true;
}
return false;
};
for (let attempt = 0; attempt < 3; attempt++) {
let bad = [];
for (let i = 1; i < cur.length; i++) if (blocked(i)) bad.push(i);
if (!bad.length) break;
const K = [2, 5, 12][attempt];
const rebuilt = []; let last = 0, any = 0;
for (const i of bad) {
const lo = Math.max(0, i - 1 - K), hi = Math.min(cur.length - 1, i + K);
if (lo < last) continue;
const way = fineDetour(cur[lo], cur[hi]);
if (!way) continue;
for (let j = last; j <= lo; j++) rebuilt.push(cur[j]);
for (const q of way) rebuilt.push(q);
last = hi; any++;
}
if (!any) break;
for (let j = last; j < cur.length; j++) rebuilt.push(cur[j]);
cur = rebuilt;
}
let unf = 0;
for (let i = 1; i < cur.length; i++) if (blocked(i)) unf++;
FINE.unfixed += unf;
if (FINE.run) FINE.run.unfixed = unf;
return cur;
}
function landDist2(lon, lat) {
const W = FINE.w, H = FINE.h, lim = FINE.datum + SHOAL_M;
const fx = (((lon + 180) % 360) + 360) % 360 / 360 * W;
const fy = (90 - lat) / 180 * H;
const x = Math.floor(fx), y = Math.max(0, Math.min(H - 1, Math.floor(fy)));
let best = 9;
for (let dy = -2; dy <= 2; dy++) {
const yy = y + dy; if (yy < 0 || yy >= H) continue;
for (let dx = -2; dx <= 2; dx++) {
const xx = ((x + dx) % W + W) % W;
if (FINE.elev[yy * W + xx] >= lim) {
const ex = x + dx + 0.5 - fx, ey = yy + 0.5 - fy;
const d2 = ex * ex + ey * ey;
if (d2 < best) best = d2;
}
}
}
return best;
}
function standOffLand(pts) {
if (!FINE.ready || pts.length < 3) return pts;
const out = pts.map(p => ({ lon: p.lon, lat: p.lat }));
const texDeg = 360 / FINE.w, step = 0.15 * texDeg;
const near = [];
for (let i = 1; i < out.length - 1; i++)
if (fineIsWater(out[i].lon, out[i].lat) && landDist2(out[i].lon, out[i].lat) < 1)
near.push(i);
if (!near.length) return out;
const stuck = new Uint8Array(out.length);
for (let pass = 0; pass < 8; pass++) {
let moved = 0;
for (const i of near) {
if (stuck[i]) continue;
const p = out[i];
const d0 = landDist2(p.lon, p.lat);
if (d0 >= 1) continue;
const a = out[i - 1], c = out[i + 1];
const cl = Math.max(0.08, Math.cos(p.lat * D2R));
const ex = (((c.lon - a.lon + 540) % 360) - 180) * cl, ey = c.lat - a.lat;
const L = Math.hypot(ex, ey) || 1;
const px = -ey / L, py = ex / L;
const turn0 = turnDeg(a, p, c);
let best = null, bestD = d0;
for (const s of [1, -1]) {
const X = { lon: p.lon + s * px * step / cl, lat: p.lat + s * py * step };
if (!fineIsWater(X.lon, X.lat)) continue;
const dd = landDist2(X.lon, X.lat);
if (dd <= bestD + 1e-6) continue;
if (turnDeg(a, X, c) > Math.max(turn0, 8) + 20) continue;
if (!gcWet(a, X) || !gcWet(X, c)) continue;
best = X; bestD = dd;
}
if (best) {
out[i] = best; moved++;
stuck[i - 1] = 0; stuck[i + 1] = 0;
} else stuck[i] = 1;
}
if (!moved) break;
}
return out;
}
function finishTrack(pts, opt) {
const it = finishTrackSteps(pts, opt);
let r = it.next();
while (!r.done) r = it.next();
return r.value;
}
function* finishTrackSteps(pts, opt) {
if (!FINE.ready || !pts || pts.length < 3) return pts;
FINE.run = { detourFail: 0, unfixed: 0, ashorePts: 0 };
const o = opt || {};
const step = o.stepKm || 4;
let t = pts.map(p => ({ lon: p.lon, lat: p.lat }));
t = smoothTrack(t); yield;
t = resampleUniform(t, step); yield;
t = filletTurns(t, o.turnKm || 9, step); yield;
t = pushOffLand(t); yield;
t = smoothTrack(t); yield;
t = clearSegments(t, 1); yield;
t = smoothTrack(t); yield;
t = clearSegments(t, 1); yield;
const fin = [];
for (let i = 0; i < t.length; i++) {
const p = t[i];
if (fineIsWater(p.lon, p.lat)) { fin.push(p); continue; }
const prev = fin[fin.length - 1], next = t[i + 1];
if (prev && next && gcWet(prev, next)) continue;
const fix = nearestWater(p, 60);
if (!fix && FINE.run) FINE.run.ashorePts++;
fin.push(fix || p);
}
yield;
const sm = smoothTrack(fin); yield;
const so = standOffLand(sm); yield;
return clearSegments(so, 1);
}
window.SHIPS_ROUTE = { computeReachFrom, solveReach, passageHours, NAV, seaDepthAt, isNavigable,
buildMask, seaPath, isOcean, MASK, CARVED, maskCell, cellLonLat, windAt,
maskUpgradeAvailable, isRoutable, FINE, fineIsWater, setSeaLevel,
finishTrack, finishTrackSteps, gcKm, gcSlerp, turnDeg };