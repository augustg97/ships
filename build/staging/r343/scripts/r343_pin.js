const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
const v = V.find(x => x.id === 'ship-of-the-line');
const g = SH.buildShip(v.hull, { fine: true }); g.updateMatrixWorld(true);
const P = new THREE.Vector3(), X = +process.argv[3];
g.traverse(o => { if (!o.isMesh) return; const k = o.userData.part && o.userData.part.key; if (!(process.argv[4] || 'bulwarkStanchion,pinRail').split(',').includes(k)) return;
  const pa = o.geometry.attributes.position; let zs = [];
  for (let i = 0; i < pa.count; i++) { P.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (Math.abs(P.x - X) < 1.5 && P.z > 0) zs.push([+P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(3)]); }
  if (zs.length) { zs.sort((a,b)=>a[0]-b[0]); console.log(k, o.userData.part.name, zs.length, JSON.stringify(zs.filter((_, i) => i % Math.max(1, Math.floor(zs.length / 12)) === 0))); } });
