'use strict';
const APP = {};
const ELEV_MIN = -11000, ELEV_MAX = 9000, ELEV_SPAN = ELEV_MAX - ELEV_MIN;
const R = 100;
const MIN_ALT = 500 / 63710;
const MAP_FLOOR_M = 300000;
const FOLLOW_MAX_M = 2600;
const MONTH_NAMES = ['January','February','March','April','May','June',
'July','August','September','October','November','December'];
function yearLabel(y) {
y = Math.round(y);
if (y < -10000) return `${Math.round(-y / 1000)},000 BC`;
if (y < 0) return `${(-y).toLocaleString()} BC`;
if (y < 1000) return `AD ${y}`;
return String(y);
}
const S = {
follow: null, followAz: 2.4, followDep: 15, followDist: 200,
era: 4,
year: 1600,
month: 6.5,
monthPlaying: false,
lon: -30, lat: 20, dist: 340,
layers: { seafloor: 1, wind: 1, chl: 1, ice: 1, cloud: 0, ports: 1, reach: 0 },
voyage: null,
voyT: 0,
voyPlaying: false,
reachFrom: null,
};
let renderer, scene, camera, globe, mat, raycaster, sphere;
let W = 1, H = 1;
const VERT = SHADERS['VERT.vert'];
const FRAG = SHADERS['FRAG.frag'];
async function loadLevel(level, manifest, note) {
const L = manifest.levels.find(x => x.level === level);
const core = manifest.core, sk = manifest.skirt;
const cv = document.createElement('canvas');
cv.width = L.w; cv.height = L.h;
const ctx = cv.getContext('2d', { willReadFrequently: false });
ctx.imageSmoothingEnabled = false;
let done = 0;
const total = L.nx * L.ny;
const jobs = [];
for (let ty = 0; ty < L.ny; ty++) {
for (let tx = 0; tx < L.nx; tx++) {
jobs.push((async () => {
const r = await fetch(`fields/z${level}/${tx}_${ty}.png`);
const blob = await r.blob();
const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none',
premultiplyAlpha: 'none' });
ctx.drawImage(bmp, sk, sk, core, core, tx * core, ty * core, core, core);
bmp.close();
done++;
if (note) note(done / total);
})());
}
}
await Promise.all(jobs);
if (window.SHIPS_ROUTE && window.SHIPS_ROUTE.CARVED) carveDeclaredPassages(cv);
const tex = new THREE.CanvasTexture(cv);
setTexParams(tex);
tex.needsUpdate = true;
if (level === 0) APP.depthCanvas = cv;
APP.depthCanvasByLevel = APP.depthCanvasByLevel || {};
APP.depthCanvasByLevel[level] = cv;
return { tex, w: L.w };
}
function carveDeclaredPassages(cv) {
const cx = cv.getContext('2d', { willReadFrequently: true });
const img = cx.getImageData(0, 0, cv.width, cv.height);
const d = img.data;
const u16 = Math.round((-40 + 11000) / 20000 * 65535);
const hi = (u16 >> 8) & 255, lo = u16 & 255;
const put = (x, y) => {
if (y < 0 || y >= cv.height) return;
const xx = ((x % cv.width) + cv.width) % cv.width;
const i = (y * cv.width + xx) * 4;
d[i] = hi; d[i + 1] = lo;
};
const px = (lon, lat) => [ (((lon + 180) % 360 + 360) % 360) / 360 * cv.width,
(90 - lat) / 180 * cv.height ];
const rad = Math.max(1, Math.round(cv.width / 2048));
for (const c of window.SHIPS_ROUTE.CARVED) {
for (let s = 0; s < c.line.length - 1; s++) {
const a = px(c.line[s][0], c.line[s][1]), b = px(c.line[s + 1][0], c.line[s + 1][1]);
const n = Math.max(2, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) * 2);
for (let i = 0; i <= n; i++) {
const f = i / n;
const x = Math.round(a[0] + (b[0] - a[0]) * f), y = Math.round(a[1] + (b[1] - a[1]) * f);
for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) put(x + dx, y + dy);
}
}
}
cx.putImageData(img, 0, 0);
}
function setTexParams(t) {
t.flipY = false;
t.wrapS = THREE.RepeatWrapping;
t.wrapT = THREE.ClampToEdgeWrapping;
t.minFilter = THREE.LinearFilter;
t.magFilter = THREE.LinearFilter;
t.generateMipmaps = false;
return t;
}
async function loadTex(url) {
const r = await fetch(url);
if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
const bmp = await createImageBitmap(await r.blob(),
{ colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
const t = new THREE.CanvasTexture(bmp);
t.needsUpdate = true;
return setTexParams(t);
}
const FROZEN = new URLSearchParams(location.search).has('frozen');
const FROZEN_S = FROZEN
? (parseFloat(new URLSearchParams(location.search).get('frozen')) || 0)
: 0;
function clockS() { return FROZEN ? FROZEN_S : performance.now() / 1000; }
if (FROZEN) {
const still = document.createElement('style');
still.textContent =
'*,*::before,*::after{transition:none !important;animation:none !important;' +
'scroll-behavior:auto !important}';
document.head.appendChild(still);
}
let upgradesDone = false;
let shipSelectPending = false;
let battleOpenPending = false;
let fontsDone = false;
document.fonts.ready.then(() => { fontsDone = true; markReady(); });
function markReady() {
if (FROZEN && !fontsDone) return;
if (FROZEN && !upgradesDone) return;
if (FROZEN && shipSelectPending) return;
if (FROZEN && battleOpenPending) return;
if (FROZEN && fleetQueue.length) return;
if (FROZEN && (!APP.view || APP.view === 'sea') && APP.markers && !labelsSettled) return;
if (!window.__FRAME_READY) window.__FRAME_READY = true;
}
function applyHash() {
const h = location.hash;
const em = /[#&]e=(\d+)/.exec(h);
const tm = /[#&]t=(-?[\d.]+)/.exec(h);
const fm = /[#&]f=([a-z0-9-]+)/i.exec(h);
const cm = /[#&]card=era\b/.exec(h);
const bm = /[#&]battle=([a-z0-9-]+)/i.exec(h);
if (!em && !tm && !fm && !cm && !bm) return;
const chs = APP.chapters.chapters || [];
let era = em ? Math.max(0, Math.min(chs.length - 1, +em[1])) : null;
if (fm && APP.voyages) {
const wantId = fm[1].toLowerCase();
const v = ((APP.voyages.voyages || APP.voyages) || [])
.find(x => String(x.id).toLowerCase() === wantId);
if (v && v.year !== undefined) {
const own = chs.findIndex(c => v.year >= c.from && v.year <= c.to);
if (own >= 0) era = own;
}
}
if (bm && APP.battles) {
const wantId = bm[1].toLowerCase();
const b = (APP.battles.battles || [])
.find(x => String(x.id).toLowerCase() === wantId);
if (b && b.year !== undefined) {
const own = chs.findIndex(c => b.year >= c.from && b.year <= c.to);
if (own >= 0) era = own;
}
}
if (era !== null && (em || era !== S.era)) selectEra(era, false);
if (tm) {
const yr = document.getElementById('yr');
const v = Math.max(+yr.min, Math.min(+yr.max, parseFloat(tm[1])));
if (isFinite(v)) { yr.value = v; S.year = v; onTime(); }
}
if (cm && chs[S.era]) showEraCard(chs[S.era]);
}
function applyHashView() {
const vm = /[#&]v=(sea|ship|action)/.exec(location.hash);
const h = location.hash;
const askedShip  = /[#&](s|sail|b)=/i.test(h);
const askedOther = /[#&](e|t|card|f|battle|c|bt|day)=/i.test(h);
const fallback = (askedShip || !askedOther) ? 'ship'
: (/[#&](bt|day)=/i.test(h) ? 'action' : 'sea');
if (typeof setView === 'function') setView(vm ? vm[1] : fallback);
const sm = /[#&]s=([a-z0-9-]+)/i.exec(location.hash);
if (sm) {
shipSelectPending = true;
let tries = 0;
const want = sm[1].toLowerCase();
const bm = /[#&]b=(-?[\d.]+)/.exec(location.hash);
const zm = /[#&]z=([\d.]+)/.exec(location.hash);
const lm = /[#&]l=([\d.]+)/.exec(location.hash);
const ym = /[#&]y=(-?[\d.]+)/.exec(location.hash);
const fu = /[#&]sail=(furled|set)/.exec(location.hash);
const tryPick = () => {
const SWs = window.SHIPS_SW && window.SHIPS_SW.SW;
if (fu && window.SHIPS_SW && window.SHIPS_SW.swSetFurled)
window.SHIPS_SW.swSetFurled(fu[1] === 'furled');
const entry = SWs && (SWs.layout || []).find(e => e.id.toLowerCase() === want);
const settled = entry && Math.abs((SWs.shipX || 0) - entry.x) < 0.5 &&
!(fu && (SWs.layout || []).some(e => e.furlBuilt !== !!SWs.furled));
if (settled) {
if (bm) SWs.viewFromDeg = parseFloat(bm[1]);
if (zm) SWs.dist = Math.max(0.35, Math.min(8.0, parseFloat(zm[1])));
if (lm) SWs.lat = Math.max(0.02, Math.min(0.90, parseFloat(lm[1]) * Math.PI / 180));
if (ym) SWs.lookAtY = parseFloat(ym[1]);
shipSelectPending = false; return;
}
if (typeof swOpenById === 'function') swOpenById(sm[1]);
if (++tries > 600) { shipSelectPending = false; console.warn('no hull named', sm[1]); return; }
requestAnimationFrame(tryPick);
};
tryPick();
} else {
const fu = /[#&]sail=(furled|set)/.exec(location.hash);
if (fu && vm && vm[1] === 'ship') {
let ft = 0;
const trySail = () => {
if (window.SHIPS_SW && window.SHIPS_SW.swSetFurled)
window.SHIPS_SW.swSetFurled(fu[1] === 'furled');
else if (++ft < 600) requestAnimationFrame(trySail);
};
trySail();
}
}
const btm = /[#&]bt=([a-z0-9-]+)/i.exec(location.hash);
const dm = /[#&]day=(\d+)/.exec(location.hash);
if ((btm || dm) && vm && vm[1] === 'action') {
shipSelectPending = true;
let bTries = 0;
const wantB = btm && btm[1].toLowerCase();
const tryBattle = () => {
const BTs = window.SHIPS_BT && window.SHIPS_BT.BT;
const list = (APP.battles && APP.battles.battles) || [];
const b = wantB
? list.find(x => String(x.id).toLowerCase() === wantB && x.campaign)
: (BTs && BTs.spec);
if (b && BTs) {
if (wantB && BTs.spec !== b) window.SHIPS_BT.btOpen(b);
if (BTs.spec && (!wantB || BTs.spec.id === b.id) && (!BTs.spec.shore || BTs.shoreReady)) {
if (dm) window.SHIPS_BT.btGoDay(+dm[1]);
const cb = /[#&]cb=(-?[\d.]+)/.exec(location.hash);
const cd = /[#&]cd=([\d.]+)/.exec(location.hash);
const ch = /[#&]ch=([\d.]+)/.exec(location.hash);
if (cb) BTs.lon = parseFloat(cb[1]) * Math.PI / 180;
if (cd) BTs.dist = Math.max(90, Math.min(6000, parseFloat(cd[1])));
if (ch) BTs.lat = Math.max(0.012, Math.min(0.85, parseFloat(ch[1]) * Math.PI / 180));
shipSelectPending = false; return;
}
}
if (++bTries > 600) {
shipSelectPending = false; console.warn('action hash unresolved:', wantB); return;
}
requestAnimationFrame(tryBattle);
};
tryBattle();
}
const glm = /[#&]battle=([a-z0-9-]+)/i.exec(location.hash);
if (glm && (!vm || vm[1] === 'sea')) {
const wantC = glm[1].toLowerCase();
const bb = ((APP.battles && APP.battles.battles) || [])
.find(x => String(x.id).toLowerCase() === wantC);
if (!bb) { console.warn('no battle', wantC); }
else {
battleOpenPending = true;
let cTries = 0;
const tryBoard = () => {
if (S.camp !== bb && bb.campaign) openBattle(bb);
const settled = bb.campaign ? (S.camp === bb && !fly) : true;
if (settled) {
if (!bb.campaign) openBattle(bb);
battleOpenPending = false; return;
}
if (++cTries > 600) {
battleOpenPending = false; console.warn('campaign board unresolved:', wantC); return;
}
requestAnimationFrame(tryBoard);
};
tryBoard();
}
}
const fm = /[#&]f=([a-z0-9-]+)/i.exec(location.hash);
if (fm) {
const wantId = fm[1].toLowerCase();
const v = ((APP.voyages && APP.voyages.voyages) || [])
.find(x => String(x.id).toLowerCase() === wantId);
if (!v) { console.warn('no voyage', wantId); return; }
shipSelectPending = true;
let tries = 0;
const board = () => {
if (!upgradesDone) {
if (++tries < 900) requestAnimationFrame(board);
else { shipSelectPending = false; console.warn('terrain never settled for', wantId); }
return;
}
const tr = eraTracks.find(t => t.name === v.name);
if (tr && tr.at) {
if (!S.follow) { followShip(tr); if (fly) fly.t0 = -1e9; }
const pool = window.SHIPS_PSG && window.SHIPS_PSG.PSG.fleetPool;
const e = pool && pool.get(tr.name);
if (e && e.holder && e.holder.visible) {
const fb = /[#&]fb=(-?[\d.]+)/.exec(location.hash);
const fd = /[#&]fd=([\d.]+)/.exec(location.hash);
const fz = /[#&]fz=([\d.]+)/.exec(location.hash);
if (fb) S.followAz = (parseFloat(fb[1]) - 180) * Math.PI / 180;
if (fd) S.followDep = Math.max(4, Math.min(84, parseFloat(fd[1])));
if (fz) S.followDist = Math.max(25, Math.min(FOLLOW_MAX_M, parseFloat(fz[1])));
shipSelectPending = false; return;
}
}
if (++tries > 900) { shipSelectPending = false; console.warn('voyage never sailed', wantId); return; }
requestAnimationFrame(board);
};
board();
}
const cm = /[#&]c=(-?[\d.]+),(-?[\d.]+)/.exec(location.hash);
const zm = /[#&]z=([\d.]+)/.exec(location.hash);
if (cm || zm) {
fly = null;
if (cm) { S.lon = parseFloat(cm[1]); S.lat = parseFloat(cm[2]); }
if (zm) S.dist = R + Math.max(MIN_ALT, Math.min(600, parseFloat(zm[1]) / 63710));
placeCamera();
}
}
function writeHash() {
if (FROZEN) return;
const view = APP.view && APP.view !== 'sea' ? `&v=${APP.view}` : '';
const ship = APP.view === 'ship' && typeof SW === 'object' && SW.spec ? `&s=${SW.spec.id}` : '';
const h = `#e=${S.era}&t=${Math.round(S.year)}${view}${ship}`;
if (location.hash !== h) history.replaceState(null, '', h);
}
let seaKey = null, seaSky = null;
function sunVector(monthFrac) {
const dayOfYear = monthFrac / 12 * 365.25;
const decl = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365.25);
const hour = clockS() * 0.006;
return new THREE.Vector3(
Math.cos(decl) * Math.sin(hour),
Math.sin(decl),
Math.cos(decl) * Math.cos(hour)
).normalize();
}
function placeCamera() {
const la = S.lat * Math.PI / 180, lo = S.lon * Math.PI / 180;
let d = S.dist;
camera.position.set(
d * Math.cos(la) * Math.sin(lo),
d * Math.sin(la),
d * Math.cos(la) * Math.cos(lo)
);
setCameraDepthRange();
const altM = Math.max(1, (d - R) * 63710);
if (S.follow && S.follow.at) {
const shipLon = S.follow.at.lon, shipLat = S.follow.at.lat;
const dep = Math.max(4, Math.min(84, S.followDep)) * Math.PI / 180;
const standM = Math.max(20, S.followDist) * Math.cos(dep);
const eyeM = Math.max(6, Math.max(20, S.followDist) * Math.sin(dep));
S.dist = R + eyeM / 63710;
d = S.dist;
const brg = S.followAz + Math.PI;
const dLat = standM * Math.cos(brg) / 111320;
const dLon = standM * Math.sin(brg) / (111320 * Math.max(0.05, Math.cos(shipLat * Math.PI / 180)));
const cLat = Math.max(-84, Math.min(84, shipLat + dLat));
const cLon = shipLon + dLon;
S.lon = cLon; S.lat = cLat;
camera.position.copy(lonLatToVec(cLon, cLat, d));
const up = lonLatToVec(cLon, cLat, 1);
camera.up.set(0, 1, 0).lerp(up, Math.min(1, Math.max(0, 1 - (eyeM - 2000) / 58000))).normalize();
camera.lookAt(lonLatToVec(shipLon, shipLat, R + (S.follow.aimM || 12) / 63710));
setCameraDepthRange();
return;
}
const tilt = Math.max(0, Math.min(1,
1 - Math.log(altM / 2000) / Math.log(60000 / 2000)));
const sub = lonLatToVec(S.lon, S.lat, R);
const up = sub.clone().normalize();
camera.up.set(0, 1, 0).lerp(up, tilt).normalize();
if (tilt <= 0.001) { camera.lookAt(0, 0, 0); return; }
const east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo));
const north = new THREE.Vector3().crossVectors(up, east).normalize();
const dep = (90 - 79 * tilt) * Math.PI / 180;
const aheadU = (altM / 63710) / Math.tan(dep);
camera.lookAt(sub.clone().addScaledVector(north, aheadU));
}
function setCameraDepthRange() {
const altU = Math.max(MIN_ALT, camera.position.length() - R);
camera.near = Math.max(2e-5, altU * 0.05);
camera.far = camera.position.length() * 3 + 500;
camera.updateProjectionMatrix();
}
function lonLatToVec(lon, lat, r) {
const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
return new THREE.Vector3(
r * Math.cos(la) * Math.sin(lo),
r * Math.sin(la),
r * Math.cos(la) * Math.cos(lo)
);
}
function vecToLonLat(v) {
const n = v.clone().normalize();
return { lon: Math.atan2(n.x, n.z) * 180 / Math.PI,
lat: Math.asin(Math.max(-1, Math.min(1, n.y))) * 180 / Math.PI };
}
function tangentBasis(up, fwd) {
const u = up.clone().normalize();
const f = fwd.clone().addScaledVector(u, -fwd.dot(u));
if (f.lengthSq() < 1e-12) return null;
f.normalize();
const port = new THREE.Vector3().crossVectors(u, f);
return new THREE.Matrix4().makeBasis(port, u, f);
}
async function boot() {
const cv = document.getElementById('gl');
renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
{
const paper = getComputedStyle(document.documentElement)
.getPropertyValue('--abyss').trim() || '#efeade';
renderer.setClearColor(new THREE.Color(paper), 1);
}
scene = new THREE.Scene();
{
const paper = getComputedStyle(document.documentElement)
.getPropertyValue('--abyss').trim() || '#efeade';
scene.background = new THREE.Color(paper);
}
camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
raycaster = new THREE.Raycaster();
const bar = document.querySelector('#splash .bar i');
const note = document.getElementById('loadnote');
const setP = p => { bar.style.width = Math.round(p * 100) + '%'; };
const manifest = await (await fetch('fields/tiles.json')).json();
APP.manifest = manifest;
note.textContent = 'reading the sea floor…';
const z0 = await loadLevel(0, manifest, p => setP(p * 0.55));
note.textContent = 'reading the surface fields…';
const mi = Math.floor(S.month) % 12;
const seaA = await loadTex(`fields/sea_${String(mi + 1).padStart(2, '0')}.png`);
const seaB = await loadTex(`fields/sea_${String((mi + 1) % 12 + 1).padStart(2, '0')}.png`);
const winA = await loadTex(`fields/wind_${String(mi + 1).padStart(2, '0')}.png`);
const winB = await loadTex(`fields/wind_${String((mi + 1) % 12 + 1).padStart(2, '0')}.png`);
setP(0.85);
const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
blank.needsUpdate = true;
mat = new THREE.ShaderMaterial({
vertexShader: VERT, fragmentShader: FRAG,
uniforms: {
uDepth: { value: z0.tex },
uSeaA: { value: seaA }, uSeaB: { value: seaB },
uWindA: { value: winA }, uWindB: { value: winB },
uReach: { value: blank },
uMonthMix: { value: S.month - Math.floor(S.month) },
uTexel: { value: 1.0 / z0.w },
uSun: { value: new THREE.Vector3(1, 0.2, 0.4).normalize() },
uCam: { value: new THREE.Vector3() },
uTime: { value: 0 },
uSeaLevel: { value: 0 },
uLySeafloor: { value: 1 }, uLyWind: { value: 1 }, uLyChl: { value: 1 },
uLyIce: { value: 1 }, uLyCloud: { value: 0 }, uLyReach: { value: 0 },
uZoom: { value: 0 }, uMPP: { value: 1e6 },
uRef: { value: new THREE.Vector2() },
uWave: { value: SHIPS_SEA.seaWaveUniform() },
uWind: { value: 7.0 },
},
});
APP.texA = { seaA, seaB, winA, winB };
sphere = new THREE.SphereGeometry(R, 192, 128);
globe = new THREE.Mesh(sphere, mat);
scene.add(globe);
resize();
placeCamera();
setP(1);
nextFrame(frame);
if (FROZEN) {
const sp = document.getElementById('splash');
sp.classList.add('gone');
sp.style.transition = 'none';
sp.style.display = 'none';
} else {
setTimeout(() => {
document.getElementById('splash').classList.add('gone');
}, 260);
}
(async () => {
for (const lv of [1, 2]) {
try {
const z = await loadLevel(lv, manifest, null);
mat.uniforms.uDepth.value = z.tex;
mat.uniforms.uTexel.value = 1.0 / z.w;
APP.level = lv;
if (window.SHIPS_ROUTE && window.SHIPS_ROUTE.maskUpgradeAvailable()) {
const t0 = performance.now();
window.SHIPS_ROUTE.buildMask(true);
APP.maskBuildMs = Math.round(performance.now() - t0);
APP.maskFineLevel = window.SHIPS_ROUTE.FINE.level;
buildEraFleet();
}
} catch (e) { console.warn('level', lv, 'failed', e); break; }
}
upgradesDone = true;
})();
await loadData();
wireUI();
wirePanelInsets();
}
async function loadData() {
const DV = (document.querySelector('meta[name="data-version"]') || {}).content || '0';
const get = async u => {
try { return await (await fetch(u + '?v=' + DV)).json(); } catch (e) { return null; }
};
APP.ports    = await get('data/ports.json')    || { ports: [] };
APP.vessels  = await get('data/vessels.json')  || { vessels: [] };
APP.battles  = await get('data/battles.json')  || { battles: [] };
APP.chapters = await get('data/chapters.json') || { chapters: [] };
APP.voyages  = await get('data/voyages.json')  || { voyages: [] };
APP.plates   = await get('data/plates.json')   || {};
APP.about    = await get('data/about.json')    || null;
APP.metrics  = await get('data/metrics.json')  || { series: [], hideStat: [] };
buildChapters();
buildMarkers();
updateReadout();
}
const SEAS = [
['North Atlantic Ocean', -40, 35], ['South Atlantic Ocean', -20, -25],
['North Pacific Ocean', -160, 30], ['South Pacific Ocean', -130, -25],
['Indian Ocean', 78, -20], ['Southern Ocean', 40, -58],
['Arctic Ocean', 0, 84], ['Mediterranean Sea', 17, 36],
['Caribbean Sea', -75, 15], ['Bay of Bengal', 88, 15],
['Arabian Sea', 63, 15], ['South China Sea', 114, 14],
['Coral Sea', 155, -17], ['Tasman Sea', 162, -38],
['Gulf of Guinea', 2, 2], ['Bering Sea', -178, 58], ['North Sea', 3, 56],
['Sea of Japan', 135, 40], ['Drake Passage', -63, -58], ['Baltic Sea', 19, 58],
];
let labelHost;
function buildMarkers() {
labelHost = document.getElementById('labels');
APP.markers = [];
const push = (kind, item, cls) => {
const el = document.createElement('div');
el.className = 'lbl ' + cls;
el.innerHTML = (kind === 'sea')
? item.name
: `${item.name}<i class="tick"></i>`;
if (kind !== 'sea') el.onclick = () => (kind === 'port' ? openPort(item) : openBattle(item));
labelHost.appendChild(el);
APP.markers.push({ kind, item, el, v: lonLatToVec(item.lon, item.lat, R * 1.002),
major: !!item.kind && item.kind === 'historic' });
};
SEAS.forEach(([name, lon, lat]) => push('sea', { name, lon, lat }, 'sea'));
(APP.ports.ports || []).forEach(p =>
push('port', p, 'port' + (p.kind === 'historic' ? ' major' : '')));
(APP.battles.battles || []).forEach(b => push('battle', b, 'battle'));
}
let lblTick = 0;
let lblCamKey = '';
let voyT = 0;
let labelsHidden = false;
let labelsSettled = false;
function updateLabels(now) {
if (!APP.markers) return;
if (PSGV.on || S.follow) {
if (!labelsHidden) {
for (const m of APP.markers) if (m.el) m.el.style.display = 'none';
labelsHidden = true;
}
labelsSettled = true;
return;
}
if (labelsHidden) { for (const m of APP.markers) if (m.el) m.el.style.display = ''; }
labelsHidden = false;
if (!FROZEN && now - lblTick < 90) return;
lblTick = now;
const camKey = camera.position.x.toFixed(1) + ',' + camera.position.y.toFixed(1) + ',' +
camera.position.z.toFixed(1) + ',' + S.era + ',' + S.year;
if (camKey === lblCamKey) return;
lblCamKey = camKey;
camera.updateMatrixWorld();
camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
const rect = renderer.domElement.getBoundingClientRect();
const camDir = camera.position.clone().normalize();
const taken = [];
const era = currentEra();
if (APP._lblOrder !== APP.markers) {
APP._lblOrder = APP.markers;
const rank = m => m.kind === 'sea' ? 0 : (m.kind === 'battle' ? 1 : (m.major ? 2 : 3));
APP._lblSorted = APP.markers.slice().sort((a, b) => rank(a) - rank(b));
}
const order = APP._lblSorted;
for (const m of order) {
let show = true;
if (m.kind !== 'sea' && !S.layers.ports) show = false;
if (show && m.kind === 'port') {
if (m.item.kind === 'modern' && S.year < 1900) show = false;
else if (m.item.from !== undefined && S.year < m.item.from) show = false;
}
if (show && m.kind === 'battle' && era && (m.item.year < era.from || m.item.year > era.to))
show = false;
{
const cosLimb = R / S.dist;
if (show && m.v.clone().normalize().dot(camDir) < cosLimb + (1 - cosLimb) * 0.10)
show = false;
}
if (show) {
const p = m.v.clone().project(camera);
const sx = (p.x * 0.5 + 0.5) * rect.width, sy = (-p.y * 0.5 + 0.5) * rect.height;
if (sx < -60 || sy < -30 || sx > rect.width + 60 || sy > rect.height + 30) show = false;
else {
const pad = m.kind === 'sea' ? 120 : (m.major ? 88 : 76);
const vpad = m.kind === 'sea' ? 34 : 22;
for (const t of taken) {
if (Math.abs(t[0] - sx) < pad && Math.abs(t[1] - sy) < vpad) { show = false; break; }
}
if (show) {
taken.push([sx, sy]);
const tf = 'translate3d(' + (sx | 0) + 'px,' + (sy | 0) + 'px,0) translate(-50%,-50%)';
if (m._tf !== tf) { m._tf = tf; m.el.style.transform = tf; }
}
}
}
const op = show ? '1' : '0';
if (m._op !== op) {
m._op = op;
m.el.style.opacity = op;
m.el.style.pointerEvents = show ? 'auto' : 'none';
}
}
if (!fly) labelsSettled = true;
}
function markersVisible() { lblTick = 0; }
function currentEra() {
const chs = (APP.chapters && APP.chapters.chapters) || [];
return chs[S.era] || null;
}
function buildChapters() {
const strip = document.getElementById('eraStrip');
strip.innerHTML = '';
(APP.chapters.chapters || []).forEach((ch, i) => {
const b = document.createElement('button');
b.className = 'era';
b.innerHTML = `<span class="en">${ch.short || ch.title}</span>
<span class="ey">${ch.years}</span>`;
b.title = ch.title;
b.onclick = () => { selectEra(i, true); writeHash(); };
strip.appendChild(b);
});
selectEra(S.era, false);
applyHash();
window.addEventListener('hashchange', () => { applyHash(); applyHashView(); });
}
function selectEra(i, fly) {
const chs = APP.chapters.chapters || [];
if (!chs[i]) return;
S.era = i;
const ch = chs[i];
document.querySelectorAll('.era').forEach((b, j) => b.classList.toggle('on', j === i));
S.year = ch.seek;
const yr = document.getElementById('yr');
yr.min = ch.from; yr.max = ch.to; yr.step = Math.max(1, Math.round((ch.to - ch.from) / 400));
yr.value = S.year;
buildEraFleet();
document.getElementById('eraHd').textContent = ch.title;
document.getElementById('eraSm').innerHTML = ch.lede || (ch.text || '').split('\n\n')[0];
onTime();
buildVoyageList();
if (fly && ch.view) flyTo(ch.view[0], ch.view[1], ch.view[2] || 330);
if (fly) showEraCard(ch);
}
const ERA_PLATE = { 'Crossing': 'dugout', 'Reed & plank': 'khufu-ship',
'Oar & monsoon': 'trireme', 'Longships & junks': 'longship',
'Ocean crossing': 'caravel', 'Iron & steam': 'steamer',
'Steel & war': 'dreadnought', 'Containers': 'container' };
function showEraCard(ch) {
showCard({ eyebrow: 'Era', title: ch.title, sub: ch.years, plate: ERA_PLATE[ch.short],
rows: ch.rows || [], prose: ch.text, span: ch.years, cite: ch.cite });
}
let fly = null;
function flyTo(lon, lat, dist, ms = 1500) {
fly = { t0: performance.now(), ms,
a: { lon: S.lon, lat: S.lat, dist: S.dist },
b: { lon, lat, dist } };
while (fly.b.lon - fly.a.lon > 180) fly.b.lon -= 360;
while (fly.b.lon - fly.a.lon < -180) fly.b.lon += 360;
}
function stepTrackVoyage() {
if (!S.trackVoyage || fly) return;
const tr = (eraTracks || []).find(t => t.name === S.trackVoyage);
if (!tr || tr._lo === undefined) return;
let target = tr._lo;
while (target - S.lon > 180) target -= 360;
while (target - S.lon < -180) target += 360;
const k = FROZEN ? 1 : 0.075;
S.lon += (target - S.lon) * k;
S.lat += (tr._la - S.lat) * k;
placeCamera();
}
function clearTrackVoyage() { S.trackVoyage = null; }
function stepFly(now) {
if (!fly) return;
const k = Math.min(1, (now - fly.t0) / fly.ms);
const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
S.lon = fly.a.lon + (fly.b.lon - fly.a.lon) * e;
S.lat = fly.a.lat + (fly.b.lat - fly.a.lat) * e;
S.dist = fly.a.dist + (fly.b.dist - fly.a.dist) * e;
placeCamera();
if (k >= 1) fly = null;
}
function buildVoyageList() {
const host = document.getElementById('voyList');
const era = currentEra();
const all = (APP.voyages && APP.voyages.voyages) || [];
const mine = all.filter(v => era && v.year >= era.from && v.year <= era.to);
host.innerHTML = '';
if (!mine.length) {
host.innerHTML = '<div style="font-size:11px;color:var(--ink-faint);line-height:1.6">' +
'No voyage in this model is dated to this era.</div>';
clearVoyage();
return;
}
mine.forEach(v => {
const b = document.createElement('button');
b.className = 'voy' + (S.voyage && S.voyage.id === v.id ? ' on' : '');
const tr = (eraTracks || []).find(t => t.name === v.name);
const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === v.vessel);
let where = '';
if (tr && tr._lo !== undefined) {
const ns = tr._la >= 0 ? 'N' : 'S', ew = tr._lo >= 0 ? 'E' : 'W';
where = `${Math.abs(tr._la).toFixed(0)}°${ns} ${Math.abs(tr._lo).toFixed(0)}°${ew}`;
if (!tr.grp.visible) where += ' · far side';
}
b.innerHTML = `<span class="vn">${v.name}</span>` +
`<span class="vy">${ves ? ves.name : v.vessel}${where ? ' · ' + where : ''}</span>`;
b.onclick = () => {
startVoyage(v);
const t2 = (eraTracks || []).find(t => t.name === v.name);
const lon = t2 && t2._lo !== undefined ? t2._lo : v.legs[0].lon;
const lat = t2 && t2._la !== undefined ? t2._la : v.legs[0].lat;
flyTo(lon, lat, R + 2200000 / 63710, 1600);
S.trackVoyage = v.name;
};
host.appendChild(b);
});
}
let _fleetListAt = -1;
function refreshFleetList(t) {
if (!FROZEN && t - _fleetListAt < 500) return;
_fleetListAt = t;
const host = document.getElementById('voyList');
if (!host) return;
const btns = host.querySelectorAll('button.voy');
if (!btns.length || !eraTracks.length) return;
const all = (APP.voyages && APP.voyages.voyages) || [];
const era = currentEra();
const mine = all.filter(v => era && v.year >= era.from && v.year <= era.to);
btns.forEach((b, i) => {
const v = mine[i]; if (!v) return;
const tr = eraTracks.find(x => x.name === v.name);
const el = b.querySelector('.vy'); if (!el || !tr || tr._lo === undefined) return;
const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === v.vessel);
const ns = tr._la >= 0 ? 'N' : 'S', ew = tr._lo >= 0 ? 'E' : 'W';
el.textContent = (ves ? ves.name : v.vessel) +
` · ${Math.abs(tr._la).toFixed(0)}°${ns} ${Math.abs(tr._lo).toFixed(0)}°${ew}` +
(tr.grp.visible ? '' : ' · far side');
});
}
let voyLine = null;
function clearVoyage() {
S.trackVoyage = null;
if (voyLine) { scene.remove(voyLine); voyLine.geometry.dispose(); voyLine = null; }
S.voyage = null; S.voyPlaying = false;
}
function startVoyage(v) {
clearVoyage();
S.voyage = v;
const tr = (eraTracks || []).find(t => t.name === v.name);
if (tr && tr.legs && tr.legs.length > 1) {
voyLine = makeHoverLine(tr.legs);
voyLine.material.opacity = 0.42;
scene.add(voyLine);
}
buildVoyageList();
showVoyageCard(v);
}
function showVoyageCard(v) {
if (!v) return;
const legRows = (v.rows || []).slice();
if (v.legs && v.legs.length > 1) {
let nm = 0;
for (let i = 1; i < v.legs.length; i++) {
const a = v.legs[i - 1], b = v.legs[i];
const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
const dp = p2 - p1, dl = (b.lon - a.lon) * Math.PI / 180;
const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
nm += 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
}
legRows.push(['Track in this model',
`${Math.round(nm).toLocaleString()} nm over ${v.legs.length} waypoints`]);
}
showCard({ eyebrow: 'Voyage', title: v.name, sub: v.dates, rows: legRows,
prose: v.text, span: v.dates, cite: v.cite, tags: v.tags,
plate: v.vessel });
}
function slerpLonLat(lon1, lat1, lon2, lat2, f) {
const p1 = lonLatToVec(lon1, lat1, 1), p2 = lonLatToVec(lon2, lat2, 1);
const d = Math.acos(Math.max(-1, Math.min(1, p1.dot(p2))));
if (d < 1e-6) return [lon1, lat1];
const a = Math.sin((1 - f) * d) / Math.sin(d), b = Math.sin(f * d) / Math.sin(d);
const v = new THREE.Vector3(p1.x * a + p2.x * b, p1.y * a + p2.y * b, p1.z * a + p2.z * b);
const ll = vecToLonLat(v);
return [ll.lon, ll.lat];
}
function stepVoyage(dt) {  }
function inlineMD(src) {
return String(src === undefined || src === null ? '' : src)
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}
function proseHTML(src) {
return String(src || '')
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
.split('\n\n')
.map(p => '<p>' + p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
.replace(/\*([^*\n]+)\*/g, '<em>$1</em>') + '</p>')
.join('');
}
function syncPanelInsets() {
const root = document.documentElement;
const eras = document.getElementById('eras');
const psg = document.getElementById('psgCard');
const shown = el => !!el && !el.classList.contains('hidden')
&& getComputedStyle(el).display !== 'none'
&& el.getBoundingClientRect().height > 1;
const erasH = shown(eras) ? eras.getBoundingClientRect().height : 0;
root.style.setProperty('--erabar-h', Math.round(erasH) + 'px');
const ro = document.getElementById('readout');
const roBottom = shown(ro) ? ro.getBoundingClientRect().bottom : 62;
root.style.setProperty('--psg-top', Math.round(roBottom) + 14 + 'px');
const psgUp = shown(psg);
const above = psgUp ? psg.getBoundingClientRect().bottom
: (shown(ro) ? roBottom : 138);
root.style.setProperty('--card-top', Math.round(above) + 12 + 'px');
}
function wirePanelInsets() {
if (wirePanelInsets.done) return;
wirePanelInsets.done = true;
syncPanelInsets();
addEventListener('resize', syncPanelInsets);
if (typeof ResizeObserver !== 'undefined') {
const ro = new ResizeObserver(syncPanelInsets);
['eras', 'psgCard', 'card'].forEach(id => {
const el = document.getElementById(id);
if (el) ro.observe(el);
});
}
}
function showCard(c) {
syncPanelInsets();
document.getElementById('cEyebrow').textContent = c.eyebrow || '';
document.getElementById('cTitle').textContent = c.title || '';
document.getElementById('cSub').textContent = c.sub || '';
const rows = document.getElementById('cRows');
rows.innerHTML = '';
(c.rows || []).forEach(r => {
const d = document.createElement('div');
d.innerHTML = `<span class="k">${r[0]}</span><span class="v">${inlineMD(r[1])}</span>`;
rows.appendChild(d);
});
rows.style.display = (c.rows && c.rows.length) ? '' : 'none';
const prose = document.getElementById('cProse');
let html = '';
if (c.tags) html += c.tags.map(t =>
`<span class="tag ${t.toLowerCase()}">${t}</span>`).join('') + '<br>';
html += proseHTML(c.prose);
prose.innerHTML = html;
const pl = c.plate && (APP.plates || {})[c.plate];
if (pl) {
const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
prose.insertAdjacentHTML('afterbegin',
'<figure class="plate"><img src="data/assets/ships/' + c.plate + '.jpg" alt="" ' +
'loading="lazy" onerror="this.closest(\'.plate\').remove()">' +
'<figcaption>' + esc(pl.caption) +
(pl.credit ? '<span class="cr">' + esc(pl.credit) +
(pl.licence ? ' · ' + esc(pl.licence) : '') + '</span>' : '') +
'</figcaption></figure>');
}
document.getElementById('cSpan').textContent = c.span || '';
document.getElementById('cCite').textContent = c.cite || '';
document.getElementById('card').classList.remove('hidden');
}
function metricRow(label, pt) {
return `${label} ${pt.v}${pt.yr ? ` <span class="py">(${pt.yr})</span>` : ''}` +
`<br><span class="prov">${pt.kind} — ${pt.cite}</span>`;
}
function updateReadout() {
const ch = currentEra();
document.getElementById('roEra').textContent = ch ? ch.title : '—';
document.getElementById('roDate').textContent = yearLabel(S.year);
const mi = Math.floor(S.month) % 12;
const rows = [`<b>${MONTH_NAMES[mi]}</b> on the water`];
const sl = seaLevelAt(S.year);
if (sl < -3) rows.push(`Sea level <b>${Math.round(-sl)} m</b> lower` +
'<br><span class="prov">derived — Spratt &amp; Lisiecki 2016</span>');
const live = [];
((APP.metrics && APP.metrics.series) || []).forEach(s => {
if (S.year < s.from || S.year > s.to) return;
let pt = null;
s.points.forEach(p => { if (p.y <= S.year) pt = p; });
if (pt) live.push({ s, pt });
});
live.sort((a, b) => (a.s.pri || 9) - (b.s.pri || 9));
const shown = live.slice(0, 3);
shown.forEach(x => rows.push(metricRow(x.s.label, x.pt)));
const hide = (APP.metrics && APP.metrics.hideStat) || [];
if (ch && ch.stat && shown.length < 3 && !hide.includes(S.era)) rows.push(ch.stat);
if (!shown.some(x => x.s.cat === 'trade'))
rows.push('<span class="unrec">Seaborne trade: no aggregate record survives</span>');
document.getElementById('roStats').innerHTML = rows.join('<br>');
}
function onTime() {
document.getElementById('yrLab').textContent = yearLabel(S.year);
mat.uniforms.uSeaLevel.value = seaLevelAt(S.year);
{
const RTs = window.SHIPS_ROUTE;
if (RTs && RTs.setSeaLevel && eraFleet
&& RTs.setSeaLevel(seaLevelAt(S.year), S.year)) {
RTs.buildMask(true);
buildEraFleet();
}
}
updateReadout();
markersVisible();
}
const SEA_LEVEL = [
[-68000, -70], [-60000, -68], [-50000, -78], [-40000, -80], [-30000, -90],
[-26000, -110], [-21000, -122], [-18000, -115], [-15000, -95], [-12000, -62],
[-10000, -40], [-8000, -22], [-6000, -6], [-4000, -2], [-2000, -0.5], [0, 0], [2026, 0],
];
function seaLevelAt(y) {
if (y >= 0) return 0;
for (let i = 1; i < SEA_LEVEL.length; i++) {
const a = SEA_LEVEL[i - 1], b = SEA_LEVEL[i];
if (y <= b[0]) return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
}
return 0;
}
function setMonthTextures() {
const mi = Math.floor(S.month) % 12;
const a = String(mi + 1).padStart(2, '0');
const b = String((mi + 1) % 12 + 1).padStart(2, '0');
if (APP.curMonth === mi) return;
APP.curMonth = mi;
Promise.all([
loadTex(`fields/sea_${a}.png`), loadTex(`fields/sea_${b}.png`),
loadTex(`fields/wind_${a}.png`), loadTex(`fields/wind_${b}.png`),
]).then(([sa, sb, wa, wb]) => {
mat.uniforms.uSeaA.value = sa; mat.uniforms.uSeaB.value = sb;
mat.uniforms.uWindA.value = wa; mat.uniforms.uWindB.value = wb;
}).catch(() => {});
}
function wireUI() {
const yr = document.getElementById('yr');
yr.addEventListener('input', () => { S.year = +yr.value; onTime(); writeHash(); });
document.getElementById('eraAbout').onclick = openAbout;
wireTabs();
document.getElementById('swOpen').onclick = () => {
const v = window.SHIPS_YARD.YARD.spec;
window.SHIPS_YARD.yardClose();
if (v) { setView('ship'); window.SHIPS_SW.swOpen(v); }
};
document.getElementById('btOpen').onclick = () => {
if (S.camp) window.SHIPS_BT.btOpen(S.camp);
};
document.getElementById('campClose').onclick = () => {
clearCampaign();
document.getElementById('campBar').classList.add('hidden');
};
document.getElementById('yardClose').onclick = () => window.SHIPS_YARD.yardClose();
document.getElementById('yardCard').onclick = () => {
const v = window.SHIPS_YARD.YARD.spec;
window.SHIPS_YARD.yardClose();
if (v) openVessel(v);
};
const m = document.getElementById('month');
m.addEventListener('input', () => {
S.month = +m.value;
document.getElementById('monthName').textContent = MONTH_NAMES[Math.floor(S.month) % 12];
setMonthTextures();
updateReadout();
});
document.getElementById('monthPlay').onclick = e => {
S.monthPlaying = !S.monthPlaying;
e.target.classList.toggle('on', S.monthPlaying);
};
document.getElementById('cardClose').onclick = () =>
document.getElementById('card').classList.add('hidden');
const map = { lySeafloor: 'seafloor', lyWind: 'wind', lyChl: 'chl', lyIce: 'ice',
lyCloud: 'cloud', lyPorts: 'ports', lyReach: 'reach' };
Object.entries(map).forEach(([id, key]) => {
const el = document.getElementById(id);
if (!el) return;
el.addEventListener('change', () => {
S.layers[key] = el.checked ? 1 : 0;
const u = 'uLy' + key.charAt(0).toUpperCase() + key.slice(1);
if (mat.uniforms[u]) mat.uniforms[u].value = S.layers[key];
markersVisible();
if (key === 'reach' && el.checked && !S.reachFrom) {
showCard({ eyebrow: 'Reachability', title: 'Pick a port',
prose: 'Click any port on the globe and the ocean fills with the time it takes to get there — computed for the month you are looking at, from the wind field, with a hull you choose.\n\nThis is the model’s own output, not a drawing.' });
}
});
});
document.querySelectorAll('[data-about]').forEach(b => b.onclick = openAbout);
document.getElementById('aboutClose').onclick = () =>
document.getElementById('about').classList.add('hidden');
const cv = renderer.domElement;
let drag = null;
function raySphereDir(clientX, clientY, cam) {
const rect = cv.getBoundingClientRect();
const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
const rc = new THREE.Raycaster();
rc.setFromCamera(new THREE.Vector2(nx, ny), cam);
const hit = new THREE.Vector3();
if (!rc.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), R), hit)) return null;
return hit.normalize();
}
cv.addEventListener('pointerdown', e => {
const P = window.SHIPS_PSG ? window.SHIPS_PSG.PSG : null;
const frozenCam = camera.clone();
frozenCam.updateMatrixWorld(true);
drag = { x: e.clientX, y: e.clientY, lon: S.lon, lat: S.lat, moved: 0,
orbit: P ? P.orbit : 0, elev: P ? P.elev : 0,
az: S.followAz, dep: S.followDep,
cam: frozenCam, grab: raySphereDir(e.clientX, e.clientY, frozenCam) };
cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
if (!drag) return;
fly = null;
const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
drag.moved += Math.abs(dx) + Math.abs(dy);
if (S.follow) {
S.followAz = drag.az - dx * 0.006;
S.followDep = Math.max(6, Math.min(80, drag.dep + dy * 0.13));
placeCamera();
return;
}
if (!drag.grab) { clearTrackVoyage(); S.lon = drag.lon; S.lat = drag.lat; placeCamera(); return; }
const cur = raySphereDir(e.clientX, e.clientY, drag.cam);
if (!cur) return;
const q = new THREE.Quaternion().setFromUnitVectors(cur, drag.grab);
const p = lonLatToVec(drag.lon, drag.lat, 1).applyQuaternion(q);
const ll = vecToLonLat(p);
clearTrackVoyage();
S.lon = ll.lon;
S.lat = Math.max(-84, Math.min(84, ll.lat));
placeCamera();
});
cv.addEventListener('pointerup', ev => {
const wasDrag = drag && drag.moved > 6;
drag = null;
if (wasDrag) return;
const tr = pickShip(ev);
if (tr && tr.vesselId) followShip(tr);
});
cv.addEventListener('pointermove', ev => {
if (drag) return;
if (PSGV.on) return;
setHover(pickShip(ev));
});
cv.addEventListener('wheel', e => {
e.preventDefault();
fly = null;
if (PSGV.on) {
const P = window.SHIPS_PSG.PSG;
P.dist = Math.max(0.65, Math.min(14, P.dist * (1 + Math.sign(e.deltaY) * 0.11)));
return;
}
if (S.follow) {
S.followDist = Math.max(25, Math.min(FOLLOW_MAX_M,
S.followDist * (1 + Math.sign(e.deltaY) * 0.13)));
placeCamera();
return;
}
const alt = Math.max(MAP_FLOOR_M / 63710, S.dist - R);
S.dist = R + Math.max(MAP_FLOOR_M / 63710,
Math.min(600, alt * (1 + Math.sign(e.deltaY) * 0.11)));
placeCamera();
}, { passive: false });
addEventListener('resize', resize);
addEventListener('keydown', e => {
if (e.key === 'Escape') {
document.getElementById('card').classList.add('hidden');
document.getElementById('about').classList.add('hidden');
}
});
}
function resize() {
W = innerWidth; H = innerHeight;
renderer.setSize(W, H, false);
camera.aspect = W / H;
camera.updateProjectionMatrix();
}
function nextFrame(fn) {
if (document.hidden) setTimeout(() => fn(performance.now()), 50);
else requestAnimationFrame(fn);
}
function armNext() { markReady(); nextFrame(frame); }
let last = performance.now();
function frame(now) {
const rawDt = Math.min(0.1, (now - last) / 1000); last = now;
const dt = FROZEN ? 0 : rawDt;
const t  = FROZEN ? FROZEN_S * 1000 : now;
pumpFleetQueue(FROZEN ? 250 : 4);
if (window.SHIPS_BT && window.SHIPS_BT.BT.on) {
window.SHIPS_BT.btFrame(t, dt);
armNext();
return;
}
if (window.SHIPS_SW && window.SHIPS_SW.SW.on) {
window.SHIPS_SW.swFrame(t);
armNext();
return;
}
if (window.SHIPS_YARD && window.SHIPS_YARD.YARD.on) {
window.SHIPS_YARD.yardFrame(t);
armNext();
return;
}
if (FROZEN && fly) { fly.t0 = -1e9; }
stepFly(t);
stepTrackVoyage();
stepVoyage(dt);
stepCampaign(dt);
if (FROZEN) { voyT = clockS(); }
else {
const aM = Math.max(1, (camera.position.length() - R) * 63710);
const f = Math.max(0, Math.min(1,
(Math.log(aM) - Math.log(1000)) / (Math.log(120000) - Math.log(1000))));
const C = 8577;
voyT += dt * (1 / C) * Math.pow(C, f);
}
stepEraFleet(voyT);
refreshFleetList(t);
updateLabels(t);
if (S.monthPlaying && !FROZEN) {
S.month = (S.month + dt * 1.1) % 12;
document.getElementById('month').value = S.month;
document.getElementById('monthName').textContent = MONTH_NAMES[Math.floor(S.month) % 12];
setMonthTextures();
}
if (PSGV.on && PSGV.track && PSGV.track.at) {
const A = PSGV.track.at;
const w = window.SHIPS_ROUTE.windAt(A.lon, A.lat, S.month);
PSGV.wind = w ? Math.max(1.5, Math.min(17, w.speed)) : 7.0;
window.SHIPS_PSG.psgStep(clockS(), A.u, A.lon, A.lat, A.hdg, R,
sunVector(S.month), PSGV.wind, camera);
passageReadout(A.lon, A.lat, A.hdg, PSGV.wind);
}
mat.uniforms.uMonthMix.value = S.month - Math.floor(S.month);
mat.uniforms.uTime.value = t / 1000;
mat.uniforms.uSun.value.copy(sunVector(S.month));
mat.uniforms.uCam.value.copy(camera.position);
if (!seaKey) {
seaKey = new THREE.DirectionalLight(0xfff4e2, 2.6);
seaSky = new THREE.HemisphereLight(0xcfe4f6, 0x2e4a58, 1.5);
scene.add(seaKey); scene.add(seaSky);
}
{
const sv = sunVector(S.month);
seaKey.position.set(sv.x * R * 6, sv.y * R * 6, sv.z * R * 6);
const up = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z).normalize();
seaKey.intensity = 0.55 + 2.35 * Math.max(0, up.dot(sv));
}
const altU = Math.max(0.0004, camera.position.length() - R);
const altM = altU * (6371000 / R);
const mpp = 2 * altM * Math.tan(camera.fov * Math.PI / 360)
/ Math.max(1, renderer.domElement.clientHeight);
mat.uniforms.uMPP.value = mpp;
const lg = Math.log(Math.max(mpp, 0.02));
mat.uniforms.uZoom.value = Math.max(0, Math.min(1,
(Math.log(3000) - lg) / (Math.log(3000) - Math.log(4))));
mat.uniforms.uRef.value.set(S.lon * Math.PI / 180, S.lat * Math.PI / 180);
{
const gw = window.SHIPS_ROUTE && window.SHIPS_ROUTE.windAt
? window.SHIPS_ROUTE.windAt(S.lon, S.lat, S.month) : null;
const uw = PSGV.on ? (PSGV.wind || 7) : (gw ? Math.max(1.5, Math.min(17, gw.speed)) : 7);
mat.uniforms.uWind.value = uw;
SHIPS_SEA.updateWaveUniform(mat.uniforms.uWave.value, uw);
}
if (S.follow && !fly) {
if (!S.follow.at) releaseShip();
else {
placeCamera();
{
const fw = window.SHIPS_ROUTE && window.SHIPS_ROUTE.windAt
? window.SHIPS_ROUTE.windAt(S.follow.at.lon, S.follow.at.lat, S.month) : null;
if (fw) PSGV.wind = Math.max(1.5, Math.min(17, fw.speed));
}
passageReadout(S.follow.at.lon, S.follow.at.lat, S.follow.at.hdg, PSGV.wind);
}
}
const altMetres = Math.max(0, (camera.position.length() - R)) * 63710;
const descending = !PSGV.on &&
(!!S.follow || window.SHIPS_PSG.psgDescentActive(altMetres));
if (descending) {
camera.updateMatrixWorld(true);
const dw = window.SHIPS_ROUTE.windAt(S.lon, S.lat, S.month);
const dws = dw ? Math.max(1.5, Math.min(17, dw.speed)) : 7.0;
window.SHIPS_PSG.psgDescent(clockS(), S.lon, S.lat, R, sunVector(S.month), dws,
camera, altMetres);
window.SHIPS_PSG.psgFleet(eraTracks, R, clockS(), dws,
(APP.vessels && APP.vessels.vessels) || [],
S.follow ? S.follow.name : null);
if (eraFleet) eraFleet.visible = false;
} else if (!PSGV.on) {
window.SHIPS_PSG.psgFleetClear();
if (eraFleet && !PSGV.on) eraFleet.visible = true;
}
if ((PSGV.on && window.SHIPS_PSG.PSG.on) || descending) {
const NP = window.SHIPS_PSG.PSG;
renderer.autoClear = false;
renderer.clear(true, true, true);
NP.sea.visible = false;
const landWas = NP.land ? NP.land.visible : false;
if (NP.land) NP.land.visible = false;
if (NP.fleetGroup) NP.fleetGroup.visible = false;
renderer.render(NP.scene, NP.cam);
NP.sea.visible = true;
if (NP.land) NP.land.visible = landWas;
if (NP.fleetGroup) NP.fleetGroup.visible = true;
NP.sky.visible = false;
setCameraDepthRange();
renderer.clearDepth();
renderer.render(scene, camera);
renderer.clearDepth();
renderer.render(NP.scene, NP.cam);
NP.sky.visible = true;
renderer.autoClear = true;
} else {
renderer.render(scene, camera);
}
armNext();
}
function vesselsAtYear(y) {
const all = (APP.vessels && APP.vessels.vessels) || [];
const live = all.filter(v => y >= v.from && y <= v.to);
return live.length ? live : all;
}
function openVessel(v) {
const H = v.hull;
const rows = (v.rows || []).slice();
if (H) {
rows.push(['Generated from', `${H.loa} × ${H.beam} × ${H.draught} m, Cm ${H.cm}`]);
}
showCard({
plate: v.id,
eyebrow: 'Vessel', title: v.name, sub: v.sub || '',
rows, prose: v.text, span: v.era ? `${yearLabel(v.era[0])} – ${yearLabel(v.era[1])}` : '',
cite: v.cite, tags: [v.attestation, v.confidence].filter(Boolean)
.map(s => s[0].toUpperCase() + s.slice(1)),
});
const host = document.getElementById('cProse');
const box = document.createElement('div');
box.style.cssText = 'margin-top:14px;border-top:1px solid var(--edge);padding-top:12px';
box.innerHTML =
`<div style="font-size:11.5px;color:var(--ink-dim);line-height:1.6;margin-bottom:9px">
<b style="color:var(--verdigris)">${v.polar.rig}.</b> ${v.polar.rigNote}</div>` +
(H ? '<button id="toYard" class="mini" style="width:100%">See the hull</button>' : '');
host.appendChild(box);
if (H) document.getElementById('toYard').onclick = () => window.SHIPS_YARD.yardOpen(v);
}
function openPort(p) {
showCard({
eyebrow: p.eyebrow || 'Port', title: p.name, sub: p.modern || '',
rows: p.rows || [], prose: p.text || '', span: p.span || '', cite: p.cite || '',
tags: p.tags,
});
}
let eraFleet = null, eraTracks = [];
let seaRouteMisses = 0;
let paceClamped = [];
const trackCache = new Map();
const hullProtoCache = new Map();
function hullProto(ves) {
let p = hullProtoCache.get(ves.id);
if (!p) { p = window.SHIPS_HULL.buildShip(ves.hull); hullProtoCache.set(ves.id, p); }
return p;
}
function shipKn(ves) {
const curve = ves && ves.polar && ves.polar.curve;
if (curve) {
const vals = Object.keys(curve).map(k => curve[k]).filter(v => isFinite(v));
if (vals.length) return Math.max.apply(null, vals);
}
return (ves && ves.speedKn) || 6;
}
function seaRoute(legs) {
const it = seaRouteSteps(legs);
let r = it.next();
while (!r.done) r = it.next();
return r.value;
}
function* seaRouteSteps(legs) {
const RT = window.SHIPS_ROUTE;
const out = [];
const push = (lon, lat) => {
const last = out[out.length - 1];
if (!last || Math.abs(last.lon - lon) > 0.02 || Math.abs(last.lat - lat) > 0.02)
out.push({ lon, lat });
};
for (let i = 0; i < legs.length - 1; i++) {
const a = legs[i], b = legs[i + 1];
const path = (RT && RT.seaPath) ? RT.seaPath(a.lon, a.lat, b.lon, b.lat) : null;
if (path) { for (const p of path) push(p.lon, p.lat); }
else { seaRouteMisses++; push(a.lon, a.lat); push(b.lon, b.lat); }
yield;
}
if (out.length > 2 && RT && RT.finishTrackSteps) {
const it = RT.finishTrackSteps(out);
let r = it.next();
while (!r.done) { yield; r = it.next(); }
return r.value;
}
return out.length > 1 ? out : legs;
}
function clearEraFleet() {
setHover(null);
if (eraFleet) { scene.remove(eraFleet); }
eraFleet = null; eraTracks = [];
fleetQueue = [];
clearVoyage();
}
function buildEraFleet() {
clearEraFleet();
paceClamped = [];
{
const RTs = window.SHIPS_ROUTE;
if (RTs && RTs.setSeaLevel) {
if (RTs.setSeaLevel(seaLevelAt(S.year), S.year)) RTs.buildMask(true);
}
}
const ch = (APP.chapters && APP.chapters.chapters) ? APP.chapters.chapters[S.era] : null;
if (!ch || !APP.voyages || !APP.vessels) return;
const from = ch.from, to = ch.to;
const vy = (APP.voyages.voyages || APP.voyages).filter(v =>
v.legs && v.legs.length > 1 && v.year >= from && v.year <= to);
if (!vy.length) return;
eraFleet = new THREE.Group();
scene.add(eraFleet);
fleetQueue = vy.map(v => ({ v }));
fleetQueueList = APP.vessels.vessels || APP.vessels;
}
let fleetQueue = [];
let fleetQueueList = null;
function fleetQueueBusy() { return fleetQueue.length > 0; }
function pumpFleetQueue(budgetMs) {
if (!fleetQueue.length || !eraFleet) return;
const t0 = performance.now();
const list = fleetQueueList;
const RTc = window.SHIPS_ROUTE;
const sig = ((RTc && RTc.FINE && RTc.FINE.sig) || '') +
'|L' + (RTc && RTc.FINE ? RTc.FINE.level : -1);
while (fleetQueue.length && performance.now() - t0 < budgetMs) {
const item = fleetQueue[0];
if (item.legsR === undefined) {
if (!item.gen) {
item.ck = item.v.id + '|' + sig;
const cached = trackCache.get(item.ck);
if (cached) item.legsR = cached;
else { item.gen = seaRouteSteps(item.v.legs); continue; }
} else {
let r;
try { r = item.gen.next(); }
catch (e) { console.warn('route', item.v.name, e); r = { done: true, value: item.v.legs }; }
if (!r.done) continue;
item.legsR = r.value;
trackCache.set(item.ck, item.legsR);
}
}
fleetQueue.shift();
try { addVoyageToFleet(item.v, list, item.legsR); }
catch (e) { console.warn('fleet', item.v && item.v.name, e); }
}
if (!fleetQueue.length) buildVoyageList();
}
function addVoyageToFleet(v, list, legsR) {
{
const ves = list.find(x => x.id === v.vessel);
if (!ves || !ves.hull) return;
let proto;
try { proto = hullProto(ves); } catch (e) { return; }
const together = /treasure|carrack|indiaman/.test(v.vessel) ? 3
: /container|steamer/.test(v.vessel) ? 1
: /canoe|dugout/.test(v.vessel) ? 2 : 1;
const grp = new THREE.Group();
for (let n = 0; n < together; n++) {
const holder = new THREE.Group();
const sh = proto.clone();
sh.rotation.y = Math.PI / 2;
holder.add(sh);
const L0 = ves.hull.loa;
const t = together === 1 ? 0 : (n - (together - 1) / 2);
holder.position.set(t * L0 * 1.9, 0, -Math.abs(t) * L0 * 1.5);
holder.userData.station = { x: holder.position.x, z: holder.position.z };
holder.userData.wander = n * 2.399963 + ves.hull.loa * 0.017;
grp.add(holder);
}
grp.userData.loa = ves.hull.loa;
eraFleet.add(grp);
const kn = shipKn(ves);
if (!legsR) legsR = seaRoute(v.legs);
let km = 0;
for (let i = 0; i < legsR.length - 1; i++) {
const A = lonLatToVec(legsR[i].lon, legsR[i].lat, 1);
const B = lonLatToVec(legsR[i + 1].lon, legsR[i + 1].lat, 1);
km += Math.acos(Math.max(-1, Math.min(1, A.dot(B)))) * 6371;
}
const hours = km / (kn * 1.852);
const want = hours * 0.42;
const period = Math.max(45, want);
if (want < 45) paceClamped.push(v.name);
let ph = 0;
for (let i = 0; i < v.name.length; i++) ph = (ph * 31 + v.name.charCodeAt(i)) >>> 0;
eraTracks.push({ grp, legs: legsR, kn, period, km, vesselId: v.vessel,
phase: (ph % 1000) / 1000, name: v.name });
}
}
let hoverTrack = null, hoverLine = null, hoverTag = null;
function makeHoverLine(pts) {
const v = [];
for (const p of pts) { const w = lonLatToVec(p.lon, p.lat, R * 1.004); v.push(w.x, w.y, w.z); }
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
return new THREE.Line(g, new THREE.LineBasicMaterial({
color: 0xe8dcc0, transparent: true, opacity: 0.62 }));
}
function setHover(tr) {
if (hoverTrack === tr) return;
if (hoverLine) { scene.remove(hoverLine); hoverLine.geometry.dispose(); hoverLine = null; }
hoverTrack = tr;
if (!hoverTag) {
hoverTag = document.createElement('div');
hoverTag.style.cssText = 'position:fixed;pointer-events:none;z-index:60;font-size:11px;' +
'letter-spacing:.10em;text-transform:uppercase;color:#efe6d2;text-shadow:0 1px 3px #000;' +
'display:none;font-family:inherit';
document.body.appendChild(hoverTag);
}
if (!tr) { hoverTag.style.display = 'none'; document.body.style.cursor = ''; return; }
hoverLine = makeHoverLine(tr.legs);
scene.add(hoverLine);
hoverTag.textContent = tr.name;
hoverTag.style.display = 'block';
document.body.style.cursor = 'pointer';
}
const PSGV = { on: false, track: null, t: 0, card: null };
const LAND_REACH_KM = 900;
function landward(at) {
const RT = window.SHIPS_ROUTE;
if (!at || !RT || !RT.isOcean || !RT.FINE || !RT.FINE.ready) return null;
const cl = Math.max(0.05, Math.cos(at.lat * Math.PI / 180));
const REACH = LAND_REACH_KM, NEAR = 140;
for (let km = 3; km <= REACH; km += (km < NEAR ? 3 : 18)) {
for (let b = 0; b < 48; b++) {
const th = b * Math.PI / 24;
const lo = at.lon + Math.sin(th) * km / 111.32 / cl;
const la = at.lat + Math.cos(th) * km / 111.32;
if (!RT.isOcean(lo, la)) {
let h = 0;
if (APP.depthCanvasByLevel && RT.FINE.level >= 0) {
const cv = APP.depthCanvasByLevel[RT.FINE.level];
if (cv) {
if (landward._lvl !== RT.FINE.level) {
landward._lvl = RT.FINE.level;
landward._cx = cv.getContext('2d', { willReadFrequently: true });
landward._img = landward._cx.getImageData(0, 0, cv.width, cv.height).data;
landward._w = cv.width; landward._h = cv.height;
}
const x = Math.min(landward._w - 1,
Math.floor((((lo + 180) % 360) + 360) % 360 / 360 * landward._w));
const y = Math.max(0, Math.min(landward._h - 1,
Math.floor((90 - la) / 180 * landward._h)));
const i = (y * landward._w + x) * 4;
h = (landward._img[i] * 256 + landward._img[i + 1]) / 65535 * 20000 - 11000;
}
}
const drawKm = km <= NEAR ? km : NEAR * (0.72 + 0.28 * Math.min(1, NEAR / km));
return { az: th, km: drawKm, trueKm: km, h: Math.max(0, h) };
}
}
}
return null;
}
function standOffFor(loa, lw) {
const base = Math.max(90, (loa || 40) * 3.2);
if (!lw) return base;
const R_E = 6371000;
const dLand = Math.sqrt(2 * R_E * Math.max(1, lw.h));
const need = Math.max(0, lw.km * 1000 - dLand);
const eye = Math.min(190, 1.6 * (need * need) / (2 * R_E));
const dep = 15 * Math.PI / 180;
return Math.max(base, Math.min(FOLLOW_MAX_M, eye / Math.sin(dep)));
}
function followShip(tr) {
if (!tr || !tr.at) return;
const list = APP.vessels.vessels || APP.vessels;
const ves = list.find(x => x.id === tr.vesselId);
if (!ves || !ves.hull) return;
S.follow = tr;
const lw = landward(tr.at);
S.followAz = lw ? lw.az : 2.4;
S.followDep = 15;
S.followDist = standOffFor(ves.hull.loa, lw);
tr.aimM = (ves.hull.loa || 40) * 0.22;
setHover(null);
if (hoverLine) { scene.remove(hoverLine); hoverLine = null; }
const eye = Math.max(6, S.followDist * Math.sin(S.followDep * Math.PI / 180));
flyTo(tr.at.lon, tr.at.lat, R + eye / 63710, 2400);
window.SHIPS_PSG.psgInit(R, camera);
requestAnimationFrame(() => window.SHIPS_PSG.psgPrebuild(tr, ves));
passageCard(tr, ves, lw);
const voy = ((APP.voyages && APP.voyages.voyages) || []).find(v => v.name === tr.name);
if (voy) showVoyageCard(voy);
document.body.classList.add('in-passage');
}
function leaveShip(ms) {
const tr = S.follow || PSGV.track;
const lon = tr && tr.at ? tr.at.lon : S.lon;
const lat = tr && tr.at ? tr.at.lat : S.lat;
S.dist = Math.max(R + MIN_ALT, camera.position.length());
S.lon = lon; S.lat = lat;
if (PSGV.on) { PSGV.on = false; PSGV.track = null; window.SHIPS_PSG.psgClose(); }
if (S.follow) { S.follow = null; window.SHIPS_PSG.psgFleetClear(); }
if (eraFleet) eraFleet.visible = true;
if (PSGV.card) PSGV.card.style.display = 'none';
syncPanelInsets();
document.body.classList.remove('in-passage');
flyTo(lon, lat, R + MAP_FLOOR_M / 63710, ms || 1800);
}
function releaseShip() {
if (!S.follow) return;
leaveShip();
}
function openPassage(tr) {
const list = APP.vessels.vessels || APP.vessels;
const ves = list.find(x => x.id === tr.vesselId);
if (!ves || !ves.hull || !window.SHIPS_PSG) return;
if (!window.SHIPS_PSG.psgOpen(tr, ves, R, camera)) return;
PSGV.on = true; PSGV.track = tr;
setHover(null);
if (eraFleet) eraFleet.visible = false;
if (hoverLine) { scene.remove(hoverLine); hoverLine = null; }
passageCard(tr, ves);
document.body.classList.add('in-passage');
}
function closePassage() {
if (!PSGV.on) return;
PSGV.on = false; PSGV.track = null;
window.SHIPS_PSG.psgClose();
if (eraFleet) eraFleet.visible = true;
if (PSGV.card) PSGV.card.style.display = 'none';
syncPanelInsets();
document.body.classList.remove('in-passage');
placeCamera();
}
function passageCard(tr, ves, lw) {
if (!PSGV.card) {
const d = document.createElement('div');
d.id = 'psgCard';
d.innerHTML = '<button id="psgBack">↑ back to the ocean</button>' +
'<div class="pc-ship"></div><div class="pc-voy"></div>' +
'<table class="pc-rows"></table>';
document.body.appendChild(d);
PSGV.card = d;
d.querySelector('#psgBack').onclick = () => leaveShip();
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncPanelInsets).observe(d);
}
const c = PSGV.card;
c.style.display = 'block';
syncPanelInsets();
c.querySelector('.pc-ship').textContent = ves.name;
c.querySelector('.pc-voy').textContent = tr.name;
const H = ves.hull;
const rows = [
['Length overall', H.loa.toFixed(1) + ' m'],
['Beam', H.beam.toFixed(1) + ' m'],
['Draught', H.draught.toFixed(2) + ' m'],
ves.speedKn !== undefined
? ['Service speed', ves.speedKn.toFixed(1) + ' kn']
: ['Best speed, moderate breeze', shipKn(ves).toFixed(1) + ' kn'],
];
c.querySelector('.pc-rows').innerHTML =
rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') +
'<tr><td>Position</td><td class="pc-pos">—</td></tr>' +
'<tr><td>Course</td><td class="pc-crs">—</td></tr>' +
'<tr><td>Wind</td><td class="pc-wnd">—</td></tr>' +
'<tr><td>Nearest land</td><td class="pc-land">—</td></tr>';
PSGV.landKey = undefined;
fillLandRow(c, tr, lw);
}
function fillLandRow(c, tr, lw) {
const cell = c && c.querySelector('.pc-land');
if (!cell || !tr || !tr.at) return;
const RT = window.SHIPS_ROUTE;
const key = (RT && RT.FINE
? (RT.FINE.ready ? 'r' : 'w') + RT.FINE.level + '|' + RT.FINE.sig : '')
+ '|' + Math.round(tr.at.lon * 4) + ',' + Math.round(tr.at.lat * 4);
if (lw === undefined) {
if (PSGV.landKey === key) return;
lw = landward(tr.at);
}
PSGV.landKey = key;
if (lw) {
const ports = (APP.ports && APP.ports.ports) || [];
let best = null, bestD = 1e9;
const clat = Math.max(0.05, Math.cos(tr.at.lat * Math.PI / 180));
for (const pt of ports) {
const dx = (pt.lon - tr.at.lon) * clat, dy = pt.lat - tr.at.lat;
const d = dx * dx + dy * dy;
if (d < bestD) { bestD = d; best = pt; }
}
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
'S','SSW','SW','WSW','W','WNW','NW','NNW'];
const pt8 = COMPASS[Math.round(((lw.az * 180 / Math.PI) % 360) / 22.5) % 16];
cell.textContent = (best ? best.name + ' · ' : '') +
Math.round((lw.trueKm || lw.km) / 1.852) + ' nm ' + pt8;
} else if (RT && RT.FINE && RT.FINE.ready) {
cell.textContent = 'none within ' + Math.round(LAND_REACH_KM / 1.852) + ' nm';
} else cell.textContent = '—';
}
const BEAUFORT = [0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
const BF_NAME = ['calm', 'light air', 'light breeze', 'gentle breeze', 'moderate breeze',
'fresh breeze', 'strong breeze', 'near gale', 'gale', 'strong gale', 'storm',
'violent storm', 'hurricane'];
function passageReadout(lon, lat, hdgRad, wind) {
if (!PSGV.card) return;
const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
const fmt = (v, s) => {
const min = Math.round(Math.abs(v) * 60);
return Math.floor(min / 60) + '° ' + String(min % 60).padStart(2, '0') + '′ ' + s;
};
const pos = PSGV.card.querySelector('.pc-pos');
const crs = PSGV.card.querySelector('.pc-crs');
const wnd = PSGV.card.querySelector('.pc-wnd');
if (pos) pos.textContent = fmt(lat, ns) + '  ' + fmt(lon, ew);
if (crs) crs.textContent = String(Math.round(((hdgRad * 180 / Math.PI) % 360 + 360) % 360))
.padStart(3, '0') + '°';
if (wnd && wind !== undefined) {
let f = 0; while (f < BEAUFORT.length && wind > BEAUFORT[f]) f++;
wnd.textContent = 'force ' + f + ', ' + BF_NAME[f];
}
if (PSGV.track) fillLandRow(PSGV.card, PSGV.track);
}
function pickShip(ev) {
if (!eraFleet || !eraTracks.length) return null;
const cv = renderer.domElement, rect = cv.getBoundingClientRect();
const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
const rc = new THREE.Raycaster();
rc.setFromCamera(new THREE.Vector2(nx, ny), camera);
let best = null, bestD = Infinity;
for (const tr of eraTracks) {
const c = tr.grp.position;
const rad = (S.dist * 0.0098) * 1.6;
const d = rc.ray.distanceToPoint(c);
if (d < rad && c.distanceTo(camera.position) < bestD) { best = tr; bestD = c.distanceTo(camera.position); }
}
return best;
}
function avoidPass() {
for (const tr of eraTracks) {
if (tr._lo === undefined) continue;
let need = 0;
for (const o of eraTracks) {
if (o === tr || o._lo === undefined) continue;
const dLat = (o._la - tr._la) * 111.32;
let dl = o._lo - tr._lo; if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
const dLon = dl * 111.32 * Math.cos(tr._la * Math.PI / 180);
const d = Math.hypot(dLat, dLon);
const want = 0.9 * ((tr._drawKm || 0) + (o._drawKm || 0));
if (d < want && d > 1e-6) need += (want - d) * 0.5;
}
need = Math.min(need, 500);
const cur = tr.avoidKm || 0;
tr.avoidKm = cur + (need - cur) * (FROZEN ? 1 : (need > cur ? 0.05 : 0.015));
}
}
function stepEraFleet(t) {
if (!eraFleet) return;
avoidPass();
for (const tr of eraTracks) {
const n = tr.legs.length;
const period = tr.period;
const u = ((t / period) + tr.phase) % 1;
const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), fr = f - i;
const a = tr.legs[i], b = tr.legs[i + 1];
const va = lonLatToVec(a.lon, a.lat, 1), vb = lonLatToVec(b.lon, b.lat, 1);
const dot = Math.max(-1, Math.min(1, va.dot(vb)));
const ang = Math.acos(dot);
const dir = ang < 1e-6 ? va.clone()
: va.clone().multiplyScalar(Math.sin((1 - fr) * ang) / Math.sin(ang))
.add(vb.clone().multiplyScalar(Math.sin(fr * ang) / Math.sin(ang)));
dir.normalize();
let la = Math.asin(dir.y) * 180 / Math.PI;
let lo = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
{
const RTf = window.SHIPS_ROUTE;
if (RTf && RTf.isOcean && !RTf.isOcean(lo, la)) {
for (let k = 1; k <= 24; k++) {
for (const sgn of [1, -1]) {
const f2 = Math.min(n - 1.001, Math.max(0, f + sgn * k * 0.25));
const i2 = Math.min(n - 2, Math.floor(f2)), fr2 = f2 - i2;
const a2 = tr.legs[i2], b2 = tr.legs[i2 + 1];
const lo2 = a2.lon + (b2.lon - a2.lon) * fr2, la2 = a2.lat + (b2.lat - a2.lat) * fr2;
if (RTf.isOcean(lo2, la2)) { lo = lo2; la = la2; k = 99; break; }
}
}
}
}
if ((tr.avoidKm || 0) > 0.5) {
const dl0 = ((b.lon - a.lon + 540) % 360) - 180;
const brgR = Math.atan2(Math.sin(dl0 * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180),
Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos(dl0 * Math.PI / 180));
const stb = brgR + Math.PI / 2;
const dLa = tr.avoidKm * Math.cos(stb) / 111.32;
const dLo = tr.avoidKm * Math.sin(stb) / (111.32 * Math.max(0.05, Math.cos(la * Math.PI / 180)));
const RTa = window.SHIPS_ROUTE;
if (!RTa || !RTa.isOcean || RTa.isOcean(lo + dLo, la + dLa)) { lo += dLo; la += dLa; }
}
tr._lo = lo; tr._la = la;
const w = lonLatToVec(lo, la, R * 1.0002);
tr.grp.position.copy(w);
tr.grp.visible = w.clone().normalize().dot(camera.position.clone().normalize()) > R / S.dist;
{
const tok = (S.dist * 0.0098) / tr.grp.userData.loa;
const tru = R / 6371000;
const altU = Math.max(MIN_ALT, S.dist - R);
const hi = 300000 / 63710, lo = window.SHIPS_PSG.DESCENT_M / 63710;
const f = Math.max(0, Math.min(1,
(Math.log(altU) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))));
tr.grp.scale.setScalar(tru * Math.pow(Math.max(tok / tru, 1e-6), f));
tr._drawKm = tr.grp.scale.x * tr.grp.userData.loa * 6371 / R;
}
const up = w.clone().normalize();
let fwd = lonLatToVec(b.lon, b.lat, R).sub(lonLatToVec(a.lon, a.lat, R));
fwd.sub(up.clone().multiplyScalar(fwd.dot(up)));
if (fwd.lengthSq() < 1e-9) continue;
fwd.normalize();
const m = tangentBasis(up, fwd);
if (!m) continue;
const want = new THREE.Quaternion().setFromRotationMatrix(m);
if (!tr.heading) { tr.heading = want.clone(); }
else {
const ang = 2 * Math.acos(Math.min(1, Math.abs(tr.heading.dot(want))));
const rate = FROZEN ? 1 : Math.min(0.16, 0.02 + ang * 0.10);
tr.heading.slerp(want, rate);
}
tr.grp.quaternion.copy(tr.heading);
const Rlocal = R / tr.grp.scale.x;
const RTm = window.SHIPS_ROUTE;
tr.grp.updateMatrixWorld(true);
for (const h of tr.grp.children) {
const st = h.userData.station;
if (!st) continue;
const place = (f) => {
const x = st.x * f, z = st.z * f, r2 = x * x + z * z;
return { x, z, y: Math.sqrt(Math.max(0, Rlocal * Rlocal - r2)) - Rlocal };
};
const afloat = (f) => {
if (f <= 0.001) return true;
const q = place(f);
const wp = new THREE.Vector3(q.x, q.y, q.z).applyMatrix4(tr.grp.matrixWorld);
const cl = vecToLonLat(wp);
return !RTm || !RTm.isOcean || RTm.isOcean(cl.lon, cl.lat);
};
let target;
if (afloat(1)) target = 1;
else {
let lo = 0, hi = 1;
for (let b = 0; b < 7; b++) { const mid = (lo + hi) * 0.5; if (afloat(mid)) lo = mid; else hi = mid; }
target = lo;
}
if (h.userData.stationF === undefined) h.userData.stationF = target;
const cf = h.userData.stationF;
const rate = FROZEN ? 1 : (target < cf ? 0.020 : 0.008);
h.userData.stationF = cf + (target - cf) * rate;
const q = place(h.userData.stationF);
const ph = h.userData.wander || 0;
const T = (typeof clockS === 'function') ? clockS() : 0;
const wob = (a, b, k) => Math.sin(T / a + k) * 0.62 + Math.sin(T / b + k * 1.7) * 0.38;
const amp = Math.hypot(st.x, st.z) * 0.085;
if (amp > 0) {
q.x += wob(37.0, 61.0, ph) * amp;
q.z += wob(43.0, 71.0, ph * 1.31) * amp;
const r2w = q.x * q.x + q.z * q.z;
q.y = Math.sqrt(Math.max(0, Rlocal * Rlocal - r2w)) - Rlocal;
h.rotation.y = wob(53.0, 79.0, ph * 0.77) * 0.045;
}
h.position.set(q.x, q.y, q.z);
}
const east = new THREE.Vector3(Math.cos(lo * Math.PI / 180), 0, -Math.sin(lo * Math.PI / 180));
const north = new THREE.Vector3().crossVectors(up, east);
tr.at = { lon: lo, lat: la, hdg: Math.atan2(fwd.dot(east), fwd.dot(north)), u };
if (hoverTrack === tr && hoverTag) {
const p = tr.grp.position.clone().project(camera);
const cv = renderer.domElement, rect = cv.getBoundingClientRect();
hoverTag.style.left = (rect.left + (p.x * 0.5 + 0.5) * rect.width + 12) + 'px';
hoverTag.style.top  = (rect.top + (-p.y * 0.5 + 0.5) * rect.height - 8) + 'px';
hoverTag.style.display = p.z < 1 ? 'block' : 'none';
}
if (window.SHIPS_SEA) {
const s = window.SHIPS_SEA.seaAt(lo * 40, la * 40, t, 7);
tr.grp.translateY(s.y * 0.00002 * S.dist);
}
}
}
let campGroup = null, campWake = [], campShip = [], campWind = null;
function bearingVec(lon, lat, degFromNorth) {
const la = lat * Math.PI / 180, lo = lon * Math.PI / 180, th = degFromNorth * Math.PI / 180;
const east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo));
const north = new THREE.Vector3(-Math.sin(la) * Math.sin(lo), Math.cos(la), -Math.sin(la) * Math.cos(lo));
return north.multiplyScalar(Math.cos(th)).add(east.multiplyScalar(Math.sin(th))).normalize();
}
function clearCampaign() {
if (campGroup) scene.remove(campGroup);
campGroup = null; campWake = []; campShip = []; campWind = null;
S.camp = null; S.campT = 0;
const cb = document.getElementById('campBar');
if (cb) cb.classList.add('hidden');
}
function startCampaign(b) {
clearVoyage(); clearCampaign();
S.camp = b; S.campT = 0;
if (isFinite(b.year)) {
const yr = document.getElementById('yr');
const v = Math.max(+yr.min, Math.min(+yr.max, b.year));
yr.value = v; S.year = v; onTime();
}
campGroup = new THREE.Group();
scene.add(campGroup);
const track = k => b.campaign.map(d => k === 0 ? [d.lon, d.lat] : [d.elon, d.elat]);
const FLEETS = b.fleets || [];
let lo0 = 1e9, lo1 = -1e9, la0 = 1e9, la1 = -1e9;
b.campaign.forEach(q => {
lo0 = Math.min(lo0, q.lon, q.elon); lo1 = Math.max(lo1, q.lon, q.elon);
la0 = Math.min(la0, q.lat, q.elat); la1 = Math.max(la1, q.lat, q.elat);
});
const midLa = (la0 + la1) / 2 * Math.PI / 180;
const stageU = Math.hypot((lo1 - lo0) * Math.cos(midLa), la1 - la0) * R * Math.PI / 180;
for (let k = 0; k < FLEETS.length; k++) {
const F = FLEETS[k];
if (!F) { campShip.push(null); campWake.push(null); continue; }
const side = F.side !== undefined ? F.side : Math.min(k, 1);
if (k < 2) {
const pts = [];
const raw = track(side);
for (let i = 0; i < raw.length - 1; i++)
for (let j = 0; j < 20; j++)
pts.push(slerpLonLat(raw[i][0], raw[i][1], raw[i + 1][0], raw[i + 1][1], j / 20));
pts.push(raw[raw.length - 1]);
const pos = new Float32Array(pts.length * 3);
pts.forEach((q, i) => {
const w = lonLatToVec(q[0], q[1], R * 1.004);
pos[i * 3] = w.x; pos[i * 3 + 1] = w.y; pos[i * 3 + 2] = w.z;
});
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
g.setDrawRange(0, 0);
const ln = new THREE.Line(g, new THREE.LineBasicMaterial({
color: parseInt(F.color, 16), transparent: true, opacity: 0.95 }));
campGroup.add(ln);
campWake.push({ line: ln, pts });
} else campWake.push(null);
const ves = ((APP.vessels && APP.vessels.vessels) || []).find(x => x.id === F.id);
if (!ves || !ves.hull) { campShip.push(null); continue; }
const proto = window.SHIPS_HULL.buildShip(ves.hull, { furled: !!F.furled });
const fleet = new THREE.Group();
fleet.userData.loa = ves.hull.loa;
fleet.userData.holders = [];
fleet.userData.side = side;
fleet.userData.heelK = F.furled ? 0.2 : 1;
const camAlt = b.cam[2] / 63.71;
const frontU = F.form.front * camAlt * 0.0105 / ves.hull.loa;
const nDraw = frontU <= 0.5 * stageU ? F.n : 1;
for (let n = 0; n < nDraw; n++) {
const holder = new THREE.Group();
const sh = proto.clone();
sh.rotation.y = Math.PI / 2;
holder.add(sh);
const t = nDraw === 1 ? 0 : (n - (nDraw - 1) / 2) / ((nDraw - 1) / 2);
const st = nDraw === 1 ? { x: 0, z: 0 } : window.SHIPS_BT.formStation(F.form, t, n);
holder.position.set(st.x, 0, st.z);
fleet.add(holder);
fleet.userData.holders.push(holder);
}
campGroup.add(fleet); campShip.push(fleet);
}
const NW = 150;
const wp = new Float32Array(NW * 2 * 3);
const wg = new THREE.BufferGeometry();
wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
campWind = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({
color: 0xbcd8e6, transparent: true, opacity: 0.34 }));
campGroup.add(campWind);
campWind.userData.seed = Array.from({ length: NW }, (_, i) => [
((i + 1) * 0.7548776662) % 1, ((i + 1) * 0.5698402910) % 1, ((i + 1) * 0.6180339887) % 1]);
const mLo = (lo1 - lo0) * 0.25 + 0.2, mLa = (la1 - la0) * 0.25 + 0.2;
campWind.userData.box = { lo: lo0 - mLo, la: la0 - mLa,
dLo: (lo1 - lo0) + 2 * mLo, dLa: (la1 - la0) + 2 * mLa };
flyTo(b.cam[0], b.cam[1], R + b.cam[2] / 63.71);
showCard({ eyebrow: 'Campaign', title: b.name, sub: b.date || '',
rows: b.rows || [], prose: b.text || '', span: b.span || '',
cite: b.cite || '', tags: b.tags });
document.getElementById('campBar').classList.remove('hidden');
}
const CAMP_DAY = 2.3;
function stepCampaign(dt) {
if (!S.camp || !campGroup) return;
const C = S.camp.campaign;
S.campT += dt / CAMP_DAY;
if (S.campT > C.length - 1 + 1.4) S.campT = 0;
const f = Math.min(S.campT, C.length - 1);
const i = Math.min(C.length - 2, Math.floor(f)), fr = Math.min(1, f - i);
const a = C[i], bb = C[i + 1];
for (let k = 0; k < campShip.length; k++) {
const wk = campWake[k];
if (wk) {
const n = Math.max(2, Math.round((i + fr) * 20) + 1);
wk.line.geometry.setDrawRange(0, Math.min(n, wk.pts.length));
}
const sh = campShip[k];
if (!sh) continue;
const s0 = sh.userData.side === 0;
const lo = s0 ? a.lon + (bb.lon - a.lon) * fr : a.elon + (bb.elon - a.elon) * fr;
const la = s0 ? a.lat + (bb.lat - a.lat) * fr : a.elat + (bb.elat - a.elat) * fr;
const w = lonLatToVec(lo, la, R * 1.006);
sh.position.copy(w);
sh.scale.setScalar(((S.dist - R) * 0.0105) / sh.userData.loa);
const nlo = s0 ? bb.lon : bb.elon, nla = s0 ? bb.lat : bb.elat;
const plo = s0 ? a.lon : a.elon,  pla = s0 ? a.lat : a.elat;
const up = w.clone().normalize();
let fwd = lonLatToVec(nlo, nla, R).sub(lonLatToVec(plo, pla, R));
fwd.addScaledVector(up, -fwd.dot(up));
if (fwd.lengthSq() < 1e-9) fwd = bearingVec(lo, la, 90);
fwd.normalize();
const cm = tangentBasis(up, fwd);
if (cm) sh.quaternion.setFromRotationMatrix(cm);
const side = new THREE.Vector3().crossVectors(up, fwd);
const wf = bearingVec(lo, la, a.w).negate();
const rel = Math.atan2(wf.dot(side), wf.dot(fwd));
const heel = Math.sin(rel) * (0.030 + a.f * 0.011) * (sh.userData.heelK || 1);
(sh.userData.holders || []).forEach((h, n) => {
h.rotation.z = heel * (0.82 + 0.36 * ((n * 7) % 5) / 4);
h.rotation.x = Math.sin(S.campT * 2.1 + n) * 0.014;
});
}
const wdir = a.w, force = a.f;
const wp = campWind.geometry.attributes.position;
const drift = (S.campT * 0.55) % 1;
const box = campWind.userData.box;
campWind.userData.seed.forEach((sd, j) => {
const lon = box.lo + sd[0] * box.dLo, lat = box.la + sd[1] * box.dLa;
const dir = bearingVec(lon, lat, wdir + 180);
const base = lonLatToVec(lon, lat, R * 1.0045);
const ph = (sd[2] + drift) % 1;
const len = R * box.dLo * 0.00144 * (0.5 + force / 8);
const p0 = base.clone().addScaledVector(dir, len * (ph * 6 - 1.0));
const p1 = p0.clone().addScaledVector(dir, len);
wp.setXYZ(j * 2, p0.x, p0.y, p0.z);
wp.setXYZ(j * 2 + 1, p1.x, p1.y, p1.z);
});
wp.needsUpdate = true;
campWind.material.opacity = 0.22 + force * 0.045;
const CARD = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const pt = CARD[Math.round(wdir / 22.5) % 16];
document.getElementById('campDay').textContent =
a.d + ' ' + window.SHIPS_BT.btYear(S.camp.year);
document.getElementById('campWind').innerHTML =
'<b>' + pt + '</b> force ' + force;
document.getElementById('campText').textContent = a.t;
const gauge = document.getElementById('campGauge');
const toWind = bearingVec(a.lon, a.lat, wdir);
const sep = lonLatToVec(a.elon, a.elat, 1).sub(lonLatToVec(a.lon, a.lat, 1));
const gf = (S.camp.fleets || [])[sep.dot(toWind) > 0 ? 1 : 0];
gauge.textContent = gf ? gf.name + ' holds the weather gauge' : '';
gauge.className = 'gauge ' + ((gf && gf.chip) || '');
}
function setView(v) {
document.querySelectorAll('#tabs .tab').forEach(b =>
b.classList.toggle('on', b.dataset.view === v));
if (window.SHIPS_YARD) window.SHIPS_YARD.yardClose();
if (window.SHIPS_SW) window.SHIPS_SW.swClose();
if (window.SHIPS_BT) window.SHIPS_BT.btClose();
if (v === 'ship') {
const all = ((APP.vessels && APP.vessels.vessels) || []).filter(x => x.hull);
const keep = window.SHIPS_SW.SW.spec;
window.SHIPS_SW.swOpen(keep && keep.hull ? keep : all.find(x => x.id === 'ship-of-the-line') || all[0]);
} else if (v === 'action') {
const b = ((APP.battles && APP.battles.battles) || []).find(x => x.campaign);
if (b) window.SHIPS_BT.btOpen(b);
}
APP.view = v;
}
function wireTabs() {
document.querySelectorAll('#tabs .tab').forEach(b => {
b.onclick = () => { setView(b.dataset.view); writeHash(); };
});
}
function openBattle(b) {
if (b.campaign && b.campaign.length) return startCampaign(b);
showCard({
eyebrow: 'Battle', title: b.name, sub: b.date || '',
rows: b.rows || [], prose: b.text || '', span: b.span || '', cite: b.cite || '',
tags: b.tags,
});
}
function openAbout() {
const el = document.getElementById('about');
document.getElementById('aboutBody').innerHTML = APP.about ? APP.about.html :
'<h2>About</h2><p>Loading…</p>';
el.classList.remove('hidden');
}
boot().then(() => { try { applyHashView(); } catch (e) { console.warn('hash view', e); } })
.catch(e => {
console.error(e);
document.getElementById('loadnote').textContent = 'failed: ' + e.message;
});