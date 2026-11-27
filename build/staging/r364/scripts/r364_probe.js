const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const S = __V.find(x => x.id === 'ship-of-the-line').hull, H = hullSurface(S), L = S.lwl;
const mx = S.masts.map(m => +((m.at - 0.5) * L + H.rake(m.at)).toFixed(3));
console.log('mast x', mx, 'stem head x', ((0 - 0.5) * L + H.rake(0)).toFixed(3), 'stern x', ((1 - 0.5) * L + H.rake(1)).toFixed(3));
const ft = (a, b) => (a + b / 12) * 0.3048;
const fm = ft(19, 6), mm = ft(99, 6), zm = ft(27, 3);
const w = ft(2, 10), cl = ft(8, 1), fo = ft(13, 1), af = ft(6, 9), n = 15;
const Lpp = fo + n * w + (n - 1) * cl + af;
const FP = [mx[0] - fm, mx[1] - mm, mx[2] + zm - Lpp];
console.log('Lpp', Lpp.toFixed(3), (Lpp / 0.3048).toFixed(2), 'ft; FP from fore/main/mizzen', FP.map(x => x.toFixed(3)));
const fp = (FP[0] + FP[1] + FP[2]) / 3; console.log('FP', fp.toFixed(3), 'AP', (fp + Lpp).toFixed(3), 'resid', FP.map(x => (x - fp).toFixed(3)));
const rows = tierPortRows(S), v = rows[1].port;
for (let k = 0; k < n; k++) { const x = fp + fo + w / 2 + k * (w + cl);
  let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (surfacePoint(S, H, m, v)[0] < x) a = m; else b = m; }
  const u = (a + b) / 2, p = surfacePoint(S, H, u, v);
  console.log(k, 'x', x.toFixed(2), 'u', u.toFixed(4), 'y', p[1].toFixed(2), 'z', p[2].toFixed(2), 'deck', H.deck(u).toFixed(2)); }
try { console.log('gallery', JSON.stringify(quarterGallerySpec(S, H)).slice(0, 600)); } catch (e) { console.log('qg err', e.message); }
const g = SHIPS_HULL.buildShip(S, { fine: true }); const tg = [];
g.traverse(o => { if (o.userData.tierGun && o.userData.tierGun.deck === 1 && o.position.z > 0) tg.push(o.position.x.toFixed(2)); });
console.log('HEAD upper-tier guns x (port side)', tg.length, tg.join(' '));
const tags = {}; g.traverse(o => { const t = o.userData.part || o.userData.tag || o.name; if (t) tags[t] = (tags[t] || 0) + 1; });
console.log(Object.keys(tags).filter(k => /mast|chain|channel|cathead|gallery|port/i.test(k)).join(' '));
`, ctx);
