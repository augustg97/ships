'use strict';
const BT = {
on: false, renderer: null, scene: null, cam: null, sea: null,
ships: [], day: 0, t: 0, playing: true, lon: 0.6, lat: 0.10, dist: 900, eye: 26,
spec: null, wind: 225, force: 5, smoke: null, sp: [], mats: [],
};
function btInit() {
if (BT.renderer) return;
const cv = document.getElementById('btCanvas');
BT.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
BT.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
BT.scene = new THREE.Scene();
const HORIZON = 0xa9bcc6;
BT.scene.fog = new THREE.FogExp2(HORIZON, 0.00042);
BT.scene.background = new THREE.Color(HORIZON);
const sky = new THREE.Mesh(
new THREE.SphereGeometry(40000, 32, 20),
new THREE.ShaderMaterial({
side: THREE.BackSide, depthWrite: false, fog: false,
uniforms: { uTop: { value: new THREE.Color(0x4d6f8c) },
uHor: { value: new THREE.Color(HORIZON) } },
vertexShader: 'varying float vH; void main(){ vH = normalize(position).y;'
+ ' gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
fragmentShader: 'varying float vH; uniform vec3 uTop, uHor;'
+ ' void main(){ float t = smoothstep(-0.04, 0.52, vH);'
+ ' gl_FragColor = vec4(mix(uHor, uTop, t), 1.0); }',
}));
BT.sky = sky;
BT.scene.add(sky);
BT.cam = new THREE.PerspectiveCamera(38, 1, 0.5, 90000);
BT.scene.add(new THREE.HemisphereLight(0x9dc2d8, 0x1e2a30, 1.15));
const sun = new THREE.DirectionalLight(0xfff0d6, 1.5); sun.position.set(400, 620, 300);
BT.scene.add(sun);
BT.sea = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200, 256, 256), new THREE.ShaderMaterial({
vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
uWind: { value: 9 }, uScale: { value: 240 }, uRip: { value: 3000 },
uWave: { value: SHIPS_SEA.seaWaveUniform() } },
}));
BT.sea.rotation.x = -Math.PI / 2;
BT.scene.add(BT.sea);
const NS = 460;
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3));
sg.setAttribute('size', new THREE.BufferAttribute(new Float32Array(NS), 1));
sg.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(NS), 1));
BT.smoke = new THREE.Points(sg, new THREE.ShaderMaterial({
transparent: true, depthWrite: false,
vertexShader: `attribute float size; attribute float alpha; varying float vA;
void main(){ vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0);
gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
fragmentShader: `varying float vA;
void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d);
if(r>0.5) discard;
float a = vA * smoothstep(0.5,0.06,r);
gl_FragColor = vec4(vec3(0.86,0.84,0.80), a*0.88); }`,
}));
BT.scene.add(BT.smoke);
BT.sp = Array.from({ length: NS }, () => ({ life: -1 }));
let drag = null;
cv.addEventListener('pointerdown', e => {
drag = { x: e.clientX, y: e.clientY, lon: BT.lon, lat: BT.lat };
cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
if (!drag) return;
BT.lon = drag.lon - (e.clientX - drag.x) * 0.006;
BT.lat = Math.max(0.012, Math.min(0.85, drag.lat + (e.clientY - drag.y) * 0.004));
});
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('wheel', e => {
e.preventDefault();
BT.dist = Math.max(90, Math.min(6000, BT.dist * (1 + Math.sign(e.deltaY) * 0.11)));
}, { passive: false });
document.getElementById('btPlay').onclick = () => {
BT.playing = !BT.playing;
document.getElementById('btPlay').textContent = BT.playing ? 'Pause' : 'Play';
};
document.getElementById('btDay').addEventListener('input', e => {
BT.day = +e.target.value; btSetDay();
});
}
function lonLatUpwind(d) {
const toWind = d.w * Math.PI / 180;
const dx = (d.elon - d.lon) * Math.cos(d.lat * Math.PI / 180), dz = d.elat - d.lat;
return (dx * Math.sin(toWind) + dz * Math.cos(toWind)) > 0 ? 1 : -1;
}
function btOpen(battle) {
btInit();
if (!battle || !battle.campaign) return false;
BT.spec = battle;
BT.ships.forEach(s => BT.scene.remove(s.obj));
BT.ships = []; BT.mats = [];
const V = (APP.vessels && APP.vessels.vessels) || [];
const FLEETS = [
{ id: 'carrack', n: 22, side: 0, name: 'Armada' },
{ id: 'fluyt',   n: 18, side: 1, name: 'English fleet' },
];
FLEETS.forEach(F => {
const ves = V.find(x => x.id === F.id);
if (!ves || !ves.hull) return;
const proto = window.SHIPS_HULL.buildShip(ves.hull);
const P = compilePolar(ves.polar);
if (proto.userData.hullMat) BT.mats.push(proto.userData.hullMat);
for (let i = 0; i < F.n; i++) {
const o = i === 0 ? proto : proto.clone();
const holder = new THREE.Group();
o.rotation.y = Math.PI / 2;
holder.add(o);
BT.scene.add(holder);
const t = (i - (F.n - 1) / 2) / ((F.n - 1) / 2);
BT.ships.push({
obj: holder, side: F.side, P, loa: ves.hull.loa,
t, x: 0, z: 0, hd: 0, spd: 0, phase: i * 1.7,
sx: F.side === 0 ? t * 260 : t * 210 + ((i % 3) - 1) * 40,
sz: F.side === 0 ? -Math.pow(Math.abs(t), 1.7) * 230 + 90
: -430 - (i % 4) * 70,
});
}
});
BT.day = 0; BT.t = 0; BT.playing = true;
const sl = document.getElementById('btDay');
sl.max = battle.campaign.length - 1; sl.value = 0;
document.getElementById('battle').classList.remove('hidden');
document.getElementById('btTitle').textContent = battle.name;
btSetDay();
btPlace(true);
BT.on = true;
btResize();
return true;
}
function btSetDay() {
const C = BT.spec.campaign, d = C[BT.day];
BT.wind = d.w; BT.force = d.f;
BT.tws = 0.836 * Math.pow(d.f, 1.5);
BT.sea.material.uniforms.uWind.value = 2.5 + d.f * 1.9;
const CARD = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
document.getElementById('btDate').textContent = d.d + ' 1588';
document.getElementById('btWind').innerHTML =
'<b>' + CARD[Math.round(d.w / 22.5) % 16] + '</b> force ' + d.f;
document.getElementById('btText').textContent = d.t;
const toWind = (d.w) * Math.PI / 180;
const engSep = lonLatUpwind(d);
BT.sep = { x: Math.sin(toWind) * d.rng * engSep, z: Math.cos(toWind) * d.rng * engSep };
BT.gauge = engSep > 0 ? 'English fleet holds the weather gauge'
: 'Armada holds the weather gauge';
BT.fleetHd = 90;
if (BT.day < C.length - 1) {
const n = C[BT.day + 1];
const mLat = 111132, mLon = 111320 * Math.cos(d.lat * Math.PI / 180);
BT.fleetHd = Math.atan2((n.lon - d.lon) * mLon, (n.lat - d.lat) * mLat) * 180 / Math.PI;
}
document.getElementById('btGauge').textContent = BT.gauge;
document.getElementById('btGauge').className = 'gauge ' + (engSep > 0 ? 'eng' : 'esp');
document.getElementById('btRange').textContent =
d.rng >= 1000 ? (d.rng / 1000).toFixed(1) + ' km apart' : d.rng + ' m apart';
btPlace(false);
}
function btPlace(snap) {
BT.ships.forEach(s => {
const h = BT.fleetHd * Math.PI / 180;
const ox = s.side === 0 ? 0 : BT.sep.x, oz = s.side === 0 ? 0 : BT.sep.z;
s.tx = ox + s.sx * Math.cos(h) + s.sz * Math.sin(h);
s.tz = oz - s.sx * Math.sin(h) + s.sz * Math.cos(h);
if (snap) { s.x = s.tx; s.z = s.tz; s.hd = h; }
});
}
function btClose() {
BT.on = false;
document.getElementById('battle').classList.add('hidden');
}
function btResize() {
if (!BT.renderer) return;
const el = document.getElementById('battle');
const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
BT.renderer.setSize(w, h, false);
BT.cam.aspect = w / h; BT.cam.updateProjectionMatrix();
}
const KN = 0.5144;
function btFrame(now, dt) {
if (!BT.on) return;
BT.t += dt;
const windTo = (BT.wind + 180) * Math.PI / 180;
const fromWind = windTo + Math.PI;
const action = /Action|GRAVELINES|Portland|Isle of Wight|fireships/i.test(
BT.spec.campaign[BT.day].t);
BT.ships.forEach(s => {
const dx = s.tx - s.x, dz = s.tz - s.z;
let want = Math.atan2(dx, dz);
let rw = (want - fromWind) * 180 / Math.PI;
while (rw > 180) rw -= 360;
while (rw < -180) rw += 360;
if (polarSpeed(s.P, BT.tws, rw) <= 0)
want = fromWind + (rw < 0 ? -1 : 1) * polarBeat(s.P, BT.tws) * Math.PI / 180;
let e = want - s.hd;
while (e > Math.PI) e -= 2 * Math.PI;
while (e < -Math.PI) e += 2 * Math.PI;
s.hd += Math.max(-0.30 * dt, Math.min(0.30 * dt, e));
let rel = (s.hd - fromWind) * 180 / Math.PI;
while (rel > 180) rel -= 360;
while (rel < -180) rel += 360;
const kn = polarSpeed(s.P, BT.tws, rel);
s.spd += (kn * KN - s.spd) * Math.min(1, dt * 0.4);
const dist = Math.hypot(dx, dz);
const drive = dist < 40 ? dist / 40 : 1;
s.x += Math.sin(s.hd) * s.spd * drive * dt;
s.z += Math.cos(s.hd) * s.spd * drive * dt;
const o = s.obj;
o.position.set(s.x, 0, s.z);
o.rotation.set(0, s.hd, 0);
const heel = Math.sin(rel * Math.PI / 180) * (0.035 + BT.force * 0.013);
o.rotateZ(-heel);
o.rotateX(Math.sin(BT.t * 0.7 + s.phase) * 0.016);
o.position.y = Math.sin(BT.t * 0.62 + s.phase) * 0.45 - 0.2;
if (action && Math.random() < dt * 1.9) btPuff(s.x, s.z, s.hd, s.loa);
});
btStepSmoke(dt, windTo);
const cx = BT.sep.x * 0.5, cz = BT.sep.z * 0.5;
BT.cam.position.set(cx + BT.dist * Math.cos(BT.lat) * Math.sin(BT.lon),
BT.eye + BT.dist * Math.sin(BT.lat) + Math.sin(BT.t * 0.5) * 1.2,
cz + BT.dist * Math.cos(BT.lat) * Math.cos(BT.lon));
BT.cam.lookAt(cx, 12, cz);
BT.sea.position.set(cx, 0, cz);
BT.sky.position.set(BT.cam.position.x, 0, BT.cam.position.z);
BT.sea.material.uniforms.uTime.value = BT.t;
BT.sea.material.uniforms.uCam.value.copy(BT.cam.position);
BT.sea.position.set(BT.cam.position.x, 0, BT.cam.position.z);
BT.mats.forEach(hm => hm.uniforms.uCam.value.copy(BT.cam.position));
if (BT.playing) {
BT.dayT = (BT.dayT || 0) + dt;
if (BT.dayT > 9.0) {
BT.dayT = 0;
BT.day = (BT.day + 1) % BT.spec.campaign.length;
document.getElementById('btDay').value = BT.day;
btSetDay();
}
}
BT.renderer.render(BT.scene, BT.cam);
}
function btPuff(x, z, hd, loa) {
const s = BT.sp.find(p => p.life < 0);
if (!s) return;
const side = Math.random() < 0.5 ? 1 : -1;
const along = (Math.random() - 0.5) * loa * 0.8;
s.x = x + Math.sin(hd) * along + Math.cos(hd) * side * loa * 0.16;
s.z = z + Math.cos(hd) * along - Math.sin(hd) * side * loa * 0.16;
s.y = 4 + Math.random() * 4;
s.life = 0; s.max = 7.0 + Math.random() * 5.0;
s.vx = Math.cos(hd) * side * 7; s.vz = -Math.sin(hd) * side * 7;
}
function btStepSmoke(dt, windTo) {
const g = BT.smoke.geometry;
const p = g.attributes.position, sz = g.attributes.size, al = g.attributes.alpha;
const w = 1.2 + BT.force * 0.9;
BT.sp.forEach((s, i) => {
if (s.life < 0) { al.setX(i, 0); return; }
s.life += dt;
if (s.life > s.max) { s.life = -1; al.setX(i, 0); return; }
const f = s.life / s.max;
s.vx *= 0.94; s.vz *= 0.94;
s.x += (s.vx + Math.sin(windTo) * w) * dt;
s.z += (s.vz + Math.cos(windTo) * w) * dt;
s.y += 1.5 * dt;
p.setXYZ(i, s.x, s.y, s.z);
sz.setX(i, 11 + f * 58);
al.setX(i, Math.sin(Math.min(1, f * 3.2) * Math.PI * 0.5) * (1 - f));
});
p.needsUpdate = true; sz.needsUpdate = true; al.needsUpdate = true;
}
addEventListener('resize', btResize);
window.SHIPS_BT = { btOpen, btClose, btFrame, BT };