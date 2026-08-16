'use strict';
const PSG = {
on: false, scene: null, cam: null, anchor: null,
track: null, vessel: null, ship: null, sea: null, sky: null,
lon: 0, lat: 0, hdg: 0, loa: 30, u: 0,
orbit: 1.15, elev: 0.30, dist: 2.6, spin: true,
M_PER_UNIT: 0,
};
const SEA_R = 260000;
const PATCH_M = SEA_R * 1.15;
function psgInit(R, globeCamera) {
if (PSG.scene) return;
PSG.M_PER_UNIT = 6371000 / R;
PSG.scene = new THREE.Scene();
PSG.cam = new THREE.PerspectiveCamera(globeCamera.fov, 1, 0.35, PATCH_M * 1.6);
PSG.anchor = new THREE.Object3D();
PSG.anchor.scale.setScalar(1 / PSG.M_PER_UNIT);
PSG.sun = new THREE.DirectionalLight(0xfff4e2, 3.0);
PSG.sun.castShadow = true;
PSG.sun.shadow.mapSize.set(2048, 2048);
PSG.sun.shadow.bias = -0.0016;
PSG.sun.shadow.normalBias = 0.6;
PSG.scene.add(PSG.sun, PSG.sun.target);
PSG.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x2c4756, 1.55);
PSG.scene.add(PSG.hemi);
const skyG = new THREE.SphereGeometry(PATCH_M * 1.3, 40, 24);
PSG.sky = new THREE.Mesh(skyG, new THREE.ShaderMaterial({
vertexShader: SHADERS['SKY_VERT.vert'], fragmentShader: SHADERS['SKY_FRAG.frag'],
side: THREE.BackSide, depthWrite: false, depthTest: false,
uniforms: { uSun: { value: new THREE.Vector3(0.4, 0.7, 0.5) }, uTime: { value: 0 } },
}));
PSG.sky.frustumCulled = false;
PSG.sky.renderOrder = -1000;
PSG.scene.add(PSG.sky);
const g = radialDisc(2.0, SEA_R, 340, 256, 6371000.0);
PSG.sea = new THREE.Mesh(g, new THREE.ShaderMaterial({
vertexShader: SHADERS['SEA_VERT.vert'], fragmentShader: SHADERS['SEA_FRAG.frag'],
uniforms: {
uSun: { value: new THREE.Vector3(0.4, 0.7, 0.5) },
uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
uWind: { value: 7.0 }, uScale: { value: 60 }, uRip: { value: 3000 },
uDrift: { value: new THREE.Vector2() },
uWakeP: { value: new THREE.Vector2() },
uWakeDir: { value: new THREE.Vector2(1, 0) },
uWakeLen: { value: 0 }, uWakeBeam: { value: 0 }, uWakeKn: { value: 0 },
uWave: { value: SHIPS_SEA.seaWaveUniform() },
uDepth: { value: null }, uAnchor: { value: new THREE.Vector2() },
uSeaLevel: { value: 0 }, uHasDepth: { value: 0 },
},
}));
PSG.sea.rotation.x = -Math.PI / 2;
PSG.sea.receiveShadow = true;
PSG.scene.add(PSG.sea);
const lg = radialDisc(2.0, SEA_R, 340, 256, 6371000.0);
PSG.land = new THREE.Mesh(lg, new THREE.ShaderMaterial({
vertexShader: SHADERS['LAND_VERT.vert'], fragmentShader: SHADERS['LAND_FRAG.frag'],
uniforms: {
uDepth: { value: null }, uAnchor: { value: new THREE.Vector2() },
uSeaLevel: { value: 0 }, uSun: { value: new THREE.Vector3(0.4, 0.7, 0.5) },
uCam: { value: new THREE.Vector3() }, uMPP: { value: 10 },
uLandLift: { value: 1.8 },
},
}));
PSG.land.rotation.x = -Math.PI / 2;
PSG.scene.add(PSG.land);
}
function radialDisc(r0, r1, rings, seg, curveR) {
const pos = [], idx = [], uv = [];
pos.push(0, 0, 0); uv.push(0.5, 0.5);
const gr = Math.pow(r1 / r0, 1 / (rings - 1));
for (let i = 0; i < rings; i++) {
const r = r0 * Math.pow(gr, i);
const drop = curveR ? (Math.sqrt(Math.max(0, curveR * curveR - r * r)) - curveR) : 0;
for (let j = 0; j < seg; j++) {
const a = j / seg * Math.PI * 2;
pos.push(Math.cos(a) * r, Math.sin(a) * r, drop);
uv.push(0.5 + Math.cos(a) * 0.5 * (r / r1), 0.5 + Math.sin(a) * 0.5 * (r / r1));
}
}
for (let j = 0; j < seg; j++) idx.push(0, 1 + j, 1 + (j + 1) % seg);
for (let i = 0; i < rings - 1; i++) {
const a0 = 1 + i * seg, b0 = 1 + (i + 1) * seg;
for (let j = 0; j < seg; j++) {
const jn = (j + 1) % seg;
idx.push(a0 + j, b0 + j, b0 + jn);
idx.push(a0 + j, b0 + jn, a0 + jn);
}
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
g.setIndex(idx);
g.computeVertexNormals();
return g;
}
function psgFrame(lon, lat, R) {
const p = lon * Math.PI / 180, a = lat * Math.PI / 180;
const up = new THREE.Vector3(Math.cos(a) * Math.sin(p), Math.sin(a), Math.cos(a) * Math.cos(p));
const east = new THREE.Vector3(Math.cos(p), 0, -Math.sin(p));
const north = new THREE.Vector3().crossVectors(up, east);
const west = new THREE.Vector3().crossVectors(up, north);
return { up, east, north, west, pos: up.clone().multiplyScalar(R) };
}
function psgOpen(tr, vessel, R, globeCamera) {
psgInit(R, globeCamera);
psgClearShip();
PSG.track = tr; PSG.vessel = vessel;
PSG.loa = (vessel.hull && vessel.hull.loa) || 30;
PSG.beam = (vessel.hull && vessel.hull.beam) || PSG.loa / 7.0;
PSG.draught = (vessel.hull && vessel.hull.draught) || PSG.loa / 20.0;
let obj = null;
try { obj = window.SHIPS_HULL.buildShip(vessel.hull, { fine: true }); } catch (e) { obj = null; }
if (!obj) return false;
obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
const holder = new THREE.Group();
obj.rotation.y = Math.PI / 2;
obj.position.y = -(obj.userData.waterlineY || 0);
holder.add(obj);
PSG.ship = holder;
PSG.scene.add(holder);
PSG.sea.material.uniforms.uScale.value = Math.max(14, PSG.loa * 0.7);
PSG.sea.material.uniforms.uRip.value =
SHIPS_SEA.rippleRange(PSG.cam, (typeof renderer !== 'undefined' && renderer.domElement)
? renderer.domElement.height : 900);
const bb = new THREE.Box3().setFromObject(holder);
const ctr = new THREE.Vector3(); bb.getCenter(ctr);
const rad = Math.max(1, bb.max.distanceTo(ctr));
const vfov = globeCamera.fov * Math.PI / 180;
const aspect = Math.max(0.5, globeCamera.aspect || 1.5);
const half = Math.min(vfov * 0.5, Math.atan(Math.tan(vfov * 0.5) * aspect));
PSG.dist = Math.max(0.9, (rad / Math.sin(half) * 1.06) / PSG.loa);
PSG.elev = Math.min(0.42, Math.max(0.09, (bb.max.y * 0.26) / PSG.loa));
PSG.aim = ctr.y - PSG.dist * PSG.loa * Math.tan(vfov * 0.5) * 0.13;
PSG.orbit = 1.15;
PSG.on = true;
return true;
}
function psgClearShip() {
if (PSG.ship) { PSG.scene.remove(PSG.ship); PSG.ship = null; }
}
function psgClose() {
PSG.on = false;
psgClearShip();
PSG.track = null; PSG.vessel = null;
PSG.ref = null;
}
function psgStep(t, u, lon, lat, hdgRad, R, sun, wind, globeCamera, drag) {
if (!PSG.on || !PSG.ship) return;
if (PSG.land) PSG.land.visible = false;
PSG.lon = lon; PSG.lat = lat; PSG.hdg = hdgRad; PSG.u = u;
const fr = psgFrame(lon, lat, R);
PSG.anchor.position.copy(fr.pos);
const m = new THREE.Matrix4().makeBasis(fr.west, fr.up, fr.north);
PSG.anchor.quaternion.setFromRotationMatrix(m);
PSG.anchor.updateMatrixWorld(true);
const sl = sun.clone();
const lsun = new THREE.Vector3(sl.dot(fr.west), sl.dot(fr.up), sl.dot(fr.north)).normalize();
PSG.sun.position.copy(lsun).multiplyScalar(PATCH_M * 0.5);
PSG.sun.target.position.set(0, 0, 0);
PSG.sky.material.uniforms.uSun.value.copy(lsun);
PSG.sky.material.uniforms.uTime.value = t;
PSG.sea.material.uniforms.uSun.value.copy(lsun);
PSG.sea.material.uniforms.uTime.value = t;
PSG.sea.material.uniforms.uWind.value = wind;
SHIPS_SEA.updateWaveUniform(PSG.sea.material.uniforms.uWave.value, wind);
if (lsun.y < 0.06) {
PSG.sun.intensity = 0.30;
PSG.hemi.intensity = 0.55;
PSG.sun.position.set(lsun.x, 0.10, lsun.z).normalize().multiplyScalar(PATCH_M * 0.5);
} else {
PSG.sun.intensity = 3.0 * Math.min(1, 0.35 + lsun.y * 1.5);
PSG.hemi.intensity = 1.55;
}
PSG.sea.position.set(0, 0, 0);
const yaw = -hdgRad;
PSG.ship.rotation.set(0, 0, 0);
PSG.ship.rotation.order = 'YXZ';
PSG.ship.rotation.y = yaw;
const fl = SHIPS_SEA.floatShip(PSG.ship, 0, 0, yaw, PSG.loa, t, wind,
PSG.beam, PSG.draught);
PSG.ship.rotation.z = fl.pitch;
PSG.ship.rotation.x = fl.roll;
if (SHIPS_SEA.animateOars) SHIPS_SEA.animateOars(PSG.ship, t, PSG.loa);
if (SHIPS_SEA.animateWheels) SHIPS_SEA.animateWheels(PSG.ship, t, 4.5);
const d = PSG.loa * PSG.dist;
const ex = Math.sin(PSG.orbit) * d, ez = Math.cos(PSG.orbit) * d;
const ey = Math.max(PSG.loa * 0.06, PSG.loa * PSG.elev);
PSG.cam.position.set(ex, ey, ez);
PSG.cam.lookAt(0, PSG.aim || PSG.loa * 0.10, 0);
PSG.cam.fov = globeCamera.fov;
PSG.cam.aspect = globeCamera.aspect;
PSG.cam.updateProjectionMatrix();
PSG.cam.updateMatrixWorld(true);
PSG.sea.material.uniforms.uCam.value.copy(PSG.cam.position);
PSG.sky.position.copy(PSG.cam.position);
globeCamera.matrix.multiplyMatrices(PSG.anchor.matrixWorld, PSG.cam.matrix);
globeCamera.matrix.decompose(globeCamera.position, globeCamera.quaternion, new THREE.Vector3());
globeCamera.scale.set(1, 1, 1);
globeCamera.updateMatrixWorld(true);
}
const DESCENT_M = 8000;
function psgDescentActive(altM) { return altM < DESCENT_M; }
function psgDescent(t, lon, lat, R, sun, wind, globeCamera, altM) {
psgInit(R, globeCamera);
PSG.mode = 'descent';
if (PSG.land) PSG.land.visible = true;
const fr = psgFrame(lon, lat, R);
PSG.anchor.position.copy(fr.pos);
PSG.anchor.quaternion.setFromRotationMatrix(
new THREE.Matrix4().makeBasis(fr.west, fr.up, fr.north));
PSG.anchor.userData.lon = lon; PSG.anchor.userData.lat = lat;
PSG.anchor.updateMatrixWorld(true);
const inv = new THREE.Matrix4().copy(PSG.anchor.matrixWorld).invert();
PSG.cam.matrix.multiplyMatrices(inv, globeCamera.matrixWorld);
PSG.cam.matrix.decompose(PSG.cam.position, PSG.cam.quaternion, new THREE.Vector3());
PSG.cam.scale.set(1, 1, 1);
PSG.cam.fov = globeCamera.fov;
PSG.cam.aspect = globeCamera.aspect;
const hor = Math.sqrt(2 * 6371000 * Math.max(1, altM));
PSG.cam.near = Math.max(0.3, Math.min(220, altM * 0.02));
PSG.cam.far = Math.max(20000, Math.min(SEA_R * 1.5, hor * 1.8));
PSG.cam.updateProjectionMatrix();
PSG.cam.updateMatrixWorld(true);
PSG.sky.scale.setScalar(PSG.cam.far * 0.5 / (PATCH_M * 1.3));
const lsun = new THREE.Vector3(sun.dot(fr.west), sun.dot(fr.up), sun.dot(fr.north)).normalize();
PSG.sun.position.copy(lsun).multiplyScalar(hor);
PSG.sun.target.position.set(0, 0, 0);
PSG.sun.intensity = lsun.y < 0.06 ? 0.30 : 3.0 * Math.min(1, 0.35 + lsun.y * 1.5);
PSG.hemi.intensity = lsun.y < 0.06 ? 0.55 : 1.55;
PSG.sky.material.uniforms.uSun.value.copy(lsun);
PSG.sky.material.uniforms.uTime.value = t;
PSG.sky.position.copy(PSG.cam.position);
PSG.sea.material.uniforms.uSun.value.copy(lsun);
PSG.sea.material.uniforms.uTime.value = t;
PSG.sea.material.uniforms.uWind.value = wind;
PSG.sea.material.uniforms.uCam.value.copy(PSG.cam.position);
PSG.sea.material.uniforms.uScale.value = Math.max(40, altM * 0.5);
PSG.sea.material.uniforms.uRip.value =
SHIPS_SEA.rippleRange(PSG.cam, (typeof renderer !== 'undefined' && renderer.domElement)
? renderer.domElement.height : 900);
const gm = (typeof mat !== 'undefined' && mat) ? mat.uniforms : null;
if (gm) {
PSG.sea.material.uniforms.uDepth.value = gm.uDepth.value;
PSG.sea.material.uniforms.uSeaLevel.value = gm.uSeaLevel.value;
PSG.sea.material.uniforms.uHasDepth.value = 1;
}
PSG.sea.material.uniforms.uAnchor.value.set(lon * Math.PI / 180, lat * Math.PI / 180);
if (PSG.land && gm) {
const lu = PSG.land.material.uniforms;
lu.uDepth.value = gm.uDepth.value;
lu.uSeaLevel.value = gm.uSeaLevel.value;
lu.uAnchor.value.copy(PSG.sea.material.uniforms.uAnchor.value);
lu.uSun.value.copy(lsun);
lu.uCam.value.copy(PSG.cam.position);
lu.uMPP.value = gm.uMPP.value;
}
SHIPS_SEA.updateWaveUniform(PSG.sea.material.uniforms.uWave.value, wind);
}
function psgFleet(tracks, R, t, wind, list, heroName) {
if (!PSG.fleetPool) { PSG.fleetPool = new Map(); PSG.fleetGroup = new THREE.Group();
PSG.scene.add(PSG.fleetGroup); }
const seen = new Set();
const alat = PSG.anchor.userData.lat, alon = PSG.anchor.userData.lon;
PSG.ref = { lon: Math.round(alon / 5) * 5, lat: Math.round(alat / 5) * 5 };
{
let dl = alon - PSG.ref.lon;
if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
const dE = dl * Math.PI / 180 * Math.cos(alat * Math.PI / 180) * 6371000;
const dN = (alat - PSG.ref.lat) * Math.PI / 180 * 6371000;
if (PSG.sea && PSG.sea.material.uniforms.uDrift)
PSG.sea.material.uniforms.uDrift.value.set(-dE, dN);
}
let hero = null, heroR2 = Infinity;
for (const tr of tracks || []) {
if (!tr.at || !tr.vesselId) continue;
const ves = list.find(x => x.id === tr.vesselId);
if (!ves || !ves.hull) continue;
let dlon = tr.at.lon - alon;
if (dlon > 180) dlon -= 360; else if (dlon < -180) dlon += 360;
const east = dlon * Math.PI / 180 * Math.cos(tr.at.lat * Math.PI / 180) * 6371000;
const north = (tr.at.lat - alat) * Math.PI / 180 * 6371000;
const r2 = east * east + north * north;
if (r2 > (SEA_R * 0.7) * (SEA_R * 0.7)) continue;
seen.add(tr.name);
let e = PSG.fleetPool.get(tr.name);
const wantFine = heroName ? (tr.name === heroName) : true;
if (e && e.fine !== wantFine) {
PSG.fleetGroup.remove(e.holder);
PSG.fleetPool.delete(tr.name);
e = null;
}
if (!e) {
let obj = null;
try { obj = window.SHIPS_HULL.buildShip(ves.hull, { fine: wantFine }); } catch (x) { continue; }
obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
obj.rotation.y = Math.PI / 2;
obj.position.y = -(obj.userData.waterlineY || 0);
const holder = new THREE.Group();
holder.add(obj);
holder.rotation.order = 'YXZ';
e = { holder, loa: ves.hull.loa, beam: ves.hull.beam,
draught: ves.hull.draught, fine: wantFine };
PSG.fleetPool.set(tr.name, e);
PSG.fleetGroup.add(holder);
}
e.holder.visible = true;
const drop = Math.sqrt(Math.max(0, 6371000 * 6371000 - r2)) - 6371000;
const yaw = -tr.at.hdg;
e.holder.rotation.set(0, yaw, 0);
if (!e.mates) {
const together = /treasure|carrack|indiaman/.test(ves.id) ? 3
: /container|steamer/.test(ves.id) ? 1
: /canoe|dugout/.test(ves.id) ? 2 : 1;
e.mates = [];
for (let n = 1; n < together; n++) {
let co = null;
try { co = window.SHIPS_HULL.buildShip(ves.hull); } catch (x) { break; }
co.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
co.rotation.y = Math.PI / 2;
co.position.y = -(co.userData.waterlineY || 0);
const mh = new THREE.Group();
mh.add(co); mh.rotation.order = 'YXZ';
const tt = n - (together - 1) / 2;
mh.userData.st = { x: tt * e.loa * 1.9, z: -Math.abs(tt) * e.loa * 1.5 };
mh.userData.ph = n * 2.399963 + e.loa * 0.017;
e.mates.push(mh);
PSG.fleetGroup.add(mh);
}
}
for (const mh of e.mates) {
mh.visible = true;
const st = mh.userData.st, ph = mh.userData.ph;
const wob = (a, b, k2) => Math.sin(t / a + k2) * 0.62 + Math.sin(t / b + k2 * 1.7) * 0.38;
const amp = Math.hypot(st.x, st.z) * 0.085;
const sx = st.x + wob(37.0, 61.0, ph) * amp;
const sz = st.z + wob(43.0, 71.0, ph * 1.31) * amp;
const cs = Math.cos(yaw), sn = Math.sin(yaw);
const mx = -east + sx * cs + sz * sn, mz = north - sx * sn + sz * cs;
mh.rotation.set(0, yaw + wob(53.0, 79.0, ph * 0.77) * 0.045, 0);
const mfl = SHIPS_SEA.floatShip(mh, mx, mz, yaw, e.loa, t, wind, e.beam, e.draught);
mh.position.set(mx, drop + mfl.y, mz);
mh.rotation.z = mfl.pitch; mh.rotation.x = mfl.roll;
}
const fl = SHIPS_SEA.floatShip(e.holder, -east, north, yaw, e.loa, t, wind,
e.beam, e.draught);
e.holder.position.set(-east, drop + fl.y, north);
e.holder.rotation.z = fl.pitch;
e.holder.rotation.x = fl.roll;
if (SHIPS_SEA.animateOars) SHIPS_SEA.animateOars(e.holder, t, e.loa);
if (SHIPS_SEA.animateWheels) SHIPS_SEA.animateWheels(e.holder, t, 4.5);
const rank = (heroName && tr.name === heroName) ? -1 : r2;
if (rank < heroR2) { heroR2 = rank; hero = { x: -east, z: north, yaw, tr, ves }; }
}
for (const [k, e] of PSG.fleetPool) if (!seen.has(k)) e.holder.visible = false;
if (PSG.sea && PSG.sea.material.uniforms.uWakeKn) {
const u = PSG.sea.material.uniforms;
if (hero) {
u.uWakeP.value.set(hero.x, hero.z);
u.uWakeDir.value.set(Math.sin(hero.yaw), Math.cos(hero.yaw));
u.uWakeLen.value = hero.ves.hull.loa;
u.uWakeBeam.value = hero.ves.hull.beam || hero.ves.hull.loa * 0.18;
u.uWakeKn.value = hero.tr.kn || 0;
} else u.uWakeKn.value = 0;
}
}
function psgPrebuild(tr, ves) {
if (!tr || !ves || !ves.hull) return false;
if (!PSG.scene) return false;
if (!PSG.fleetPool) { PSG.fleetPool = new Map(); PSG.fleetGroup = new THREE.Group();
PSG.scene.add(PSG.fleetGroup); }
if (PSG.fleetPool.has(tr.name)) return true;
let obj = null;
try { obj = window.SHIPS_HULL.buildShip(ves.hull, { fine: true }); } catch (e) { return false; }
obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
obj.rotation.y = Math.PI / 2;
obj.position.y = -(obj.userData.waterlineY || 0);
const holder = new THREE.Group();
holder.add(obj);
holder.rotation.order = 'YXZ';
holder.visible = false;
PSG.fleetPool.set(tr.name, { holder, loa: ves.hull.loa, fine: true });
PSG.fleetGroup.add(holder);
return true;
}
function psgFleetClear() {
if (!PSG.fleetPool) return;
for (const [, e] of PSG.fleetPool) {
e.holder.visible = false;
if (e.mates) e.mates.forEach(m => { m.visible = false; });
}
}
window.SHIPS_PSG = { PSG, psgInit, psgOpen, psgClose, psgStep, psgFrame, PATCH_M, SEA_R,
psgDescent, psgDescentActive, psgFleet, psgFleetClear, psgPrebuild,
DESCENT_M, radialDisc };