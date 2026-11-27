const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const S = __V.find(x => x.id === 'ship-of-the-line').hull;
const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part.key; return null; };
const cat = []; g.traverse(o => { if (o.isMesh && keyOf(o) === 'cathead') { const b = new THREE.Box3().setFromObject(o); if (b.max.z > 0) cat.push(b); } });
g.traverse(o => { const t = o.userData.tierGun; if (!t || t.deck !== 1 || o.position.z < 0 || o.position.x > -18) return;
  const b = new THREE.Box3().setFromObject(o);
  console.log('gun x', b.min.x.toFixed(2), b.max.x.toFixed(2), 'y', b.min.y.toFixed(2), b.max.y.toFixed(2), 'z', b.min.z.toFixed(2), b.max.z.toFixed(2));
  cat.forEach((c, i) => { const hit = c.intersectsBox(b); console.log('  cathead', i, c.min.x.toFixed(2), c.max.x.toFixed(2), 'y', c.min.y.toFixed(2), c.max.y.toFixed(2), 'z', c.min.z.toFixed(2), c.max.z.toFixed(2), hit ? 'BOX OVERLAP' : ''); }); });
`, ctx);
