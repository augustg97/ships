// r367: part keys of meshes in the fore body of the three uncatted hulls, with their boxes
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2]; ctx.__IDS = process.argv.slice(3);
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { if (!__IDS.includes(V.id)) continue;
  const S = V.hull; const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
  const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part; return null; };
  const agg = {};
  g.traverse(o => { if (!o.isMesh) return; const P = keyOf(o); const k = P ? P.key + '|' + (P.name||'') : '?';
    const b = new THREE.Box3().setFromObject(o); if (b.min.x > -S.lwl * 0.25) return;
    const a = agg[k] = agg[k] || new THREE.Box3(); a.union(b); });
  console.log('==', V.id, 'L', S.lwl);
  for (const k in agg) { const b = agg[k]; console.log(' ', k.padEnd(40), [b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].map(q=>q.toFixed(2)).join(' ')); }
}
`, ctx);
