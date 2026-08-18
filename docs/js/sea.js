const SEA_WAVES = [
[ 1.000,  0.160, 118.0, 1.30],
[ 0.820, -0.570,  61.0, 0.72],
[ 0.550,  0.840,  27.0, 0.31],
[-0.310,  0.950,  13.0, 0.14],
];
const SWELL_FLOOR = [0.34, 0.22, 0.0, 0.0];
function seaAmp(i, wind) {
const U = wind === undefined ? 7.0 : Math.max(0, wind);
const hs = 0.021 * U * U;
const ref = 0.021 * 7.0 * 7.0;
const f = Math.min(4.2, hs / ref);
return SEA_WAVES[i][3] * Math.max(SWELL_FLOOR[i], f);
}
function seaWaveUniform(wind) {
return SEA_WAVES.map((w, i) => new THREE.Vector4(w[0], w[1], w[2], seaAmp(i, wind)));
}
function rippleRange(camera, pxHeight) {
const fov = (camera && camera.fov) || 34;
const px = Math.max(200, pxHeight || 900);
return 2.0 * px / (2.0 * Math.tan(fov * Math.PI / 360));
}
function updateWaveUniform(arr, wind) {
if (!arr) return arr;
for (let i = 0; i < SEA_WAVES.length && i < arr.length; i++) arr[i].w = seaAmp(i, wind);
return arr;
}
function seaAt(x, z, t, wind) {
const w = wind === undefined ? 7.0 : wind;
let y = 0, nx = 0, nz = 0, ny = 1;
for (let i = 0; i < SEA_WAVES.length; i++) {
const W = SEA_WAVES[i];
const dl = Math.hypot(W[0], W[1]) || 1;
const dx = W[0] / dl, dz = W[1] / dl;
const L = W[2];
const A = seaAmp(i, w);
const k = 6.2831853 / L;
const c = Math.sqrt(9.81 / k);
const ph = k * (dx * x + dz * z) - c * k * t;
const s = Math.sin(ph), co = Math.cos(ph);
const Q = Math.min(0.72 / Math.max(k * A * 4.0, 1e-4), 1.0);
y  += A * s;
nx -= dx * k * A * co;
nz -= dz * k * A * co;
ny -= Q * k * A * s;
}
const n = Math.hypot(nx, ny, nz) || 1;
return { y, nx: nx / n, ny: ny / n, nz: nz / n };
}
function sinc(x) {
const a = Math.abs(x);
return a < 1e-3 ? 1 - x * x / 6 : Math.sin(x) / x;
}
function slopeFilter(u) {
const a = Math.abs(u);
if (a < 1e-3) return 1 - u * u / 10;
return 3 * (Math.sin(u) - u * Math.cos(u)) / (u * u * u);
}
function floatShip(obj, x, z, heading, lengthM, t, wind, beamM, draughtM) {
const L = Math.max(0.5, lengthM);
const B = Math.max(0.2, beamM || L / 7.0);
const d = Math.max(0.05, draughtM || L / 20.0);
const hx = Math.cos(heading), hz = Math.sin(heading);
const tx = -hz, tz = hx;
const Troll = 2 * Math.max(0.20, 0.373 + 0.023 * (B / d) - 0.043 * (L / 100))
* B / Math.sqrt(0.055 * B);
const wn = 6.2831853 / Math.max(0.5, Troll);
const ZETA = 0.10;
let y = 0, pitch = 0, roll = 0;
for (let i = 0; i < SEA_WAVES.length; i++) {
const W = SEA_WAVES[i];
const dl = Math.hypot(W[0], W[1]) || 1;
const dx = W[0] / dl, dz = W[1] / dl;
const A = seaAmp(i, wind);
const k = 6.2831853 / W[2];
const c = Math.sqrt(9.81 / k);
const ph = k * (dx * x + dz * z) - c * k * t;
const s = Math.sin(ph), co = Math.cos(ph);
const muL = dx * hx + dz * hz;
const muB = dx * tx + dz * tz;
const uL = k * muL * L * 0.5, uB = k * muB * B * 0.5;
const fL = sinc(uL), fB = sinc(uB);
y += A * s * fL * fB;
pitch += A * co * (k * muL) * slopeFilter(uL) * fB;
const rawRoll = A * co * (k * muB) * slopeFilter(uB) * fL;
const r = (c * k) / wn;
roll += rawRoll / Math.sqrt((1 - r * r) * (1 - r * r) + (2 * ZETA * r) * (2 * ZETA * r));
}
obj.position.y = y;
return { pitch: Math.atan(pitch), roll: Math.atan(roll), y };
}
const STROKES_PER_MIN = 31;
const RO_Q = new THREE.Quaternion(), RO_R = new THREE.Quaternion();
const RO_Y = new THREE.Vector3(0, 1, 0), RO_Z = new THREE.Vector3(0, 0, 1);
function animateOars(root, t) {
if (!root) return;
const period = 60 / STROKES_PER_MIN;
root.traverse(o => {
const d = o.userData && o.userData.oar;
if (!d) return;
if (d.style === 'ro') {
const w = 2 * Math.PI * ((t / period) + d.ph);
RO_Q.setFromAxisAngle(RO_Y, Math.sin(w) * 0.10);
RO_R.setFromAxisAngle(RO_Z, Math.cos(w) * 0.30);
o.quaternion.copy(d.qRest).multiply(RO_Q).multiply(RO_R);
return;
}
const ph = ((t / period) + d.bank * 0.075) % 1.0;
const DRIVE = 0.36;
const DOWN_IN = 0.30;
const DOWN_OUT = 0.02;
let sweep, tilt, feather;
if (ph < DRIVE) {
const k = ph / DRIVE;
sweep = Math.cos(Math.PI * k);
tilt = DOWN_IN - 0.03 * Math.sin(Math.PI * k);
feather = 0.0;
} else {
const k = (ph - DRIVE) / (1 - DRIVE);
const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
sweep = -1.0 + 2.0 * e;
tilt = DOWN_IN + (DOWN_OUT - DOWN_IN) * Math.sin(Math.PI * k);
feather = Math.sin(Math.PI * Math.pow(k, 0.75));
}
const HANDLE_TRAVEL = 1.00, INBOARD = 1.10;
const ARC = HANDLE_TRAVEL / INBOARD / 2;
o.rotation.y = d.restY + d.sgn * sweep * ARC;
o.rotation.x = tilt;
o.rotation.z = feather * 1.35 * d.sgn;
});
}
function animateWheels(root, t, speedKn) {
if (!root) return;
const v = (speedKn || 8) * 0.5144;
root.traverse(o => {
const d = o.userData && o.userData.wheel;
if (!d) return;
const omega = (v / Math.max(1, d.R)) * 0.88;
o.rotation.z = -d.sgn * omega * t;
});
}
window.SHIPS_SEA = { rippleRange, SEA_WAVES, seaWaveUniform, updateWaveUniform, seaAmp, seaAt, floatShip,
animateOars, animateWheels };