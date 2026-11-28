const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { if (!V.hull || !V.hull.bowsprit) continue;
  const S = V.hull; let g; try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { console.log(V.id, 'ERR', e.stack); continue; }
  g.updateMatrixWorld(true);
  const r = [];
  let sheaves = 0, cleats = 0; const catBoxes = [];
  g.traverse(o => { if (o.userData.catSheave) sheaves++; if (o.userData.thumbCleat) cleats++;
    if (o.userData.catStopper) r.push(['stop', o.userData.catStopper.bear, 'tip', o.userData.catStopper.tip]);
    if (o.userData.shankPainter) { const p = o.userData.shankPainter; r.push(['paint', 'bolt', p.bolt[0], 'shank', p.shank, 'offSide', p.offSide, 'cat', p.cathead, 'topY', p.topY]); } });
  // ring top vs cathead beam box (local)
  const cats = []; g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'cathead') cats.push(o); });
  console.log(V.id, 'sheaves', sheaves, 'cleats', cleats, JSON.stringify(r));
}
`, ctx);
