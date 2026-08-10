'use strict';
const YARD = {
on: false, renderer: null, scene: null, cam: null, ship: null,
sea: null, spec: null, t0: 0, spin: true, lon: 0.9, lat: 0.22, dist: 2.4,
};
const SEA_VERT = SHADERS['SEA_VERT.vert'];
const SEA_FRAG = SHADERS['SEA_FRAG.frag'];
function yardInit() {
if (YARD.renderer) return;
const cv = document.getElementById('yardCanvas');
YARD.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
YARD.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
YARD.scene = new THREE.Scene();
YARD.cam = new THREE.PerspectiveCamera(32, 1, 0.1, 40000);
YARD.scene.add(new THREE.HemisphereLight(0x9fc4d8, 0x203040, 1.25));
const dir = new THREE.DirectionalLight(0xfff3dd, 1.5);
dir.position.set(60, 90, 50);
YARD.scene.add(dir);
const seaG = new THREE.PlaneGeometry(1, 1, 1, 1);
YARD.sea = new THREE.Mesh(seaG, new THREE.ShaderMaterial({
vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
uWind: { value: 8 }, uScale: { value: 60 } },
}));
YARD.sea.rotation.x = -Math.PI / 2;
YARD.scene.add(YARD.sea);
let drag = null;
cv.addEventListener('pointerdown', e => {
drag = { x: e.clientX, y: e.clientY, lon: YARD.lon, lat: YARD.lat };
YARD.spin = false;
cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
if (!drag) return;
YARD.lon = drag.lon - (e.clientX - drag.x) * 0.007;
YARD.lat = Math.max(-0.05, Math.min(1.05, drag.lat + (e.clientY - drag.y) * 0.005));
});
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('wheel', e => {
e.preventDefault();
YARD.dist = Math.max(1.15, Math.min(7.0, YARD.dist * (1 + Math.sign(e.deltaY) * 0.11)));
}, { passive: false });
}
function yardOpen(vessel) {
yardInit();
const H = vessel.hull;
if (!H) return false;
if (YARD.ship) { YARD.scene.remove(YARD.ship); YARD.ship = null; }
YARD.spec = vessel;
YARD.ship = window.SHIPS_HULL.buildShip(H);
YARD.scene.add(YARD.ship);
const L = H.loa;
YARD.sea.scale.set(L * 60, L * 60, 1);
YARD.sea.material.uniforms.uScale.value = L * 0.9;
const U = YARD.ship.userData;
YARD.rigTop = U.rigTop;
const look = U.rigTop * 0.26;
const halfV = Math.max(U.rigTop - look, look - U.keelBottom);
const tanV = Math.tan(YARD.cam.fov * Math.PI / 360);
const tanH = tanV * Math.max(1.2, YARD.cam.aspect || 1.78);
YARD.dist = 1.14 * Math.max(halfV / tanV, U.extentX / 2 / tanH) / L;
YARD.spin = true;
YARD.t0 = performance.now();
const cm = window.SHIPS_HULL.superellipseFullness(
window.SHIPS_HULL.exponentForCm(H.cm));
document.getElementById('yard').classList.remove('hidden');
document.getElementById('yardTitle').textContent = vessel.name;
document.getElementById('yardSub').textContent = window.SHIPS_SW.rigLine(vessel);
const dims = [
['Length overall', H.loa.toFixed(1) + ' m'],
['Beam', H.beam.toFixed(2) + ' m'],
['Draught', H.draught.toFixed(2) + ' m'],
['L : B', (H.loa / H.beam).toFixed(2)],
['Midship coeff.', cm.toFixed(3)],
];
if (H.masts.length) dims.push(['Masts', String(H.masts.length)]);
document.getElementById('yardDims').innerHTML = dims.map(
d => `<div><b>${d[1]}</b><span>${d[0]}</span></div>`).join('');
document.getElementById('yardNote').innerHTML =
'Generated from attested dimensions and hull-form coefficients.<br>' +
'Nothing here is traced from a drawing.';
YARD.on = true;
yardResize();
return true;
}
function yardClose() {
YARD.on = false;
document.getElementById('yard').classList.add('hidden');
}
function yardResize() {
if (!YARD.renderer) return;
const el = document.getElementById('yard');
const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
YARD.renderer.setSize(w, h, false);
YARD.cam.aspect = w / h;
YARD.cam.updateProjectionMatrix();
}
function yardFrame(now) {
if (!YARD.on || !YARD.ship) return;
const H = YARD.spec.hull;
const L = H.loa;
if (YARD.spin) YARD.lon += 0.0022;
const d = L * YARD.dist;
const eye = YARD.rigTop * 0.26;
YARD.cam.position.set(
d * Math.cos(YARD.lat) * Math.sin(YARD.lon),
d * Math.sin(YARD.lat) + eye,
d * Math.cos(YARD.lat) * Math.cos(YARD.lon));
YARD.cam.lookAt(0, YARD.rigTop * 0.26, 0);
const t = (now - YARD.t0) / 1000;
const wind = 8.5;
const heel = H.masts.length ? -0.055 * Math.min(1, wind / 10) : -0.012;
YARD.ship.rotation.z = heel + Math.sin(t * 0.62) * 0.012;
YARD.ship.rotation.x = Math.sin(t * 0.47 + 1.1) * 0.010;
YARD.ship.position.y = Math.sin(t * 0.55) * L * 0.004;
YARD.sea.material.uniforms.uTime.value = t;
YARD.sea.material.uniforms.uWind.value = wind;
YARD.sea.material.uniforms.uCam.value.copy(YARD.cam.position);
const hm = YARD.ship.userData.hullMat;
if (hm) hm.uniforms.uCam.value.copy(YARD.cam.position);
YARD.renderer.render(YARD.scene, YARD.cam);
}
addEventListener('resize', yardResize);
window.SHIPS_YARD = { yardOpen, yardClose, yardFrame, YARD };