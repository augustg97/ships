const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const THREE = ctx.THREE;
for (const id of ['ship-of-the-line', 'east-indiaman']) {
const v = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels.find(x => x.id === id);
const S = v.hull, SH = ctx.SHIPS_HULL, H = SH.hullSurface(S);
const g = SH.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
const bb = o => { const b = new THREE.Box3().setFromObject(o); b.applyMatrix4(inv); return b; };
let k = 0, tier = [];
g.traverse(o => {
  if (o.userData.tierGun) tier.push(o);
  if (o.userData.carriage) { const b = bb(o), c = o.userData.carriage;
    if (k++ < 3 || k === 14) console.log(id, 'CARRIAGE', k, 'x', b.min.x.toFixed(2), b.max.x.toFixed(2), 'y', b.min.y.toFixed(3), b.max.y.toFixed(3), 'z', b.min.z.toFixed(2), b.max.z.toFixed(2), 'deck', c.yDeck.toFixed(3), 'axis', c.yAxis.toFixed(3), 'face', c.zFace.toFixed(2), 'verts', o.geometry.attributes.position.count); }
  if (o.userData.islandGun && k < 3) { const b = bb(o); console.log(id, 'IGUN z', b.min.z.toFixed(2), b.max.z.toFixed(2), 'y', b.min.y.toFixed(2), b.max.y.toFixed(2), 'rotx', o.rotation.x.toFixed(2)); }
});
console.log(id, 'carriages', k, 'tier guns', tier.length);
for (const o of tier.slice(0, 2).concat(tier.slice(-1))) { const b = bb(o); const u = o.userData.tierGun.u;
  const face = Math.abs(SH.surfacePoint(S, H, u, 1)[2]);
  console.log(id, 'TIER u', u.toFixed(3), 'z', b.min.z.toFixed(2), b.max.z.toFixed(2), 'y', ((b.min.y + b.max.y) / 2).toFixed(2), 'len', o.userData.tierGun.lenM.toFixed(2), 'sheerHalf', face.toFixed(2)); }
let n = 0; g.traverse(o => { if (o.isMesh) n++; }); console.log(id, 'meshes', n);
}
{
const v = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels.find(x => x.id === 'ship-of-the-line');
const S = v.hull, SH = ctx.SHIPS_HULL, H = SH.hullSurface(S);
const g = SH.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
const cars = []; g.traverse(o => { if (o.userData.carriage) cars.push([o, new THREE.Box3().setFromObject(o).applyMatrix4(inv)]); });
g.traverse(o => { if (!o.userData.islandGun) return;
  const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv), u = o.userData.islandGun.u, len = o.userData.islandGun.lenM;
  const face = Math.abs(SH.surfacePoint(S, H, u, 1)[2]), sg = Math.sign(b.max.z + b.min.z);
  const out = sg > 0 ? b.max.z - face : -b.min.z - face, breech = sg > 0 ? b.min.z : -b.max.z;
  const c = cars.find(([m, cb]) => Math.abs((cb.min.x + cb.max.x) / 2 - (b.min.x + b.max.x) / 2) < 0.3 && Math.sign(cb.max.z + cb.min.z) === sg);
  const cin = c ? (sg > 0 ? c[1].min.z : -c[1].max.z) : NaN;
  const tip = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
  console.log('u', u.toFixed(3), 'side', sg, 'out frac', (out / len).toFixed(3), 'breech |z|', breech.toFixed(2), 'carriage inboard |z|', cin.toFixed(2), 'overhang', (cin - breech).toFixed(2), 'muzzle dir z', tip.z.toFixed(2));
});
}
