const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const THREE = ctx.THREE, SH = ctx.SHIPS_HULL;
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
for (const id of ['ship-of-the-line', 'east-indiaman']) {
  const S = V.find(x => x.id === id).hull;
  const g = SH.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const rows = {};
  g.traverse(o => { if (!o.userData.carriage) return; const c = o.userData.carriage;
    const bb = new THREE.Box3().setFromObject(o).applyMatrix4(inv);
    const k = (c.muller ? JSON.stringify(c.muller.kind || '') : '') + ' yDeck~' + c.yDeck.toFixed(1);
    const h = c.yAxis - c.yDeck;
    (rows[k] = rows[k] || []).push({ h, len: c.sR - c.sF, w: bb.max.x - bb.min.x, top: bb.max.y - c.yDeck, m: c.muller });
  });
  for (const [k, a] of Object.entries(rows)) {
    const hs = a.map(r => r.h);
    console.log(id, k, 'n', a.length, 'axis over deck', Math.min(...hs).toFixed(3), Math.max(...hs).toFixed(3), 'carr len', a[0].len.toFixed(3), 'width', a[0].w.toFixed(3), 'top', a[0].top.toFixed(3), a[0].m ? JSON.stringify(a[0].m) : '');
  }
  const gb = []; g.traverse(o => { if (o.geometry && o.geometry.userData && o.geometry.userData.gunBarrel) gb.push(o.geometry.userData.gunBarrel); });
  const seen = new Set(); for (const b of gb) { const k = b.len.toFixed(3); if (seen.has(k)) continue; seen.add(k); console.log(id, 'barrel', JSON.stringify(b)); }
}
