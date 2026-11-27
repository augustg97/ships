// r367: hash every vertex of every built hull, for comparing two hull.js trees
const vm = require('vm'), fs = require('fs'), crypto = require('crypto');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
ctx.__H = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 10);
vm.runInContext(`for (const V of __V) { if (!V.hull) continue; let g; try { g = SHIPS_HULL.buildShip(V.hull, { fine: true }); } catch (e) { console.log(V.id, 'ERR'); continue; }
  g.updateMatrixWorld(true); const out = []; const v = new THREE.Vector3();
  g.traverse(o => { if (!o.isMesh) return; const a = o.geometry.attributes.position; for (let j = 0; j < a.count; j++) { v.fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld); out.push(v.x.toFixed(4), v.y.toFixed(4), v.z.toFixed(4)); } });
  console.log(V.id, __H(out.join(',')), out.length / 3); }`, ctx);
