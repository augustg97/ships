const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const S = __V.find(x => x.id === 'ship-of-the-line').hull, H = hullSurface(S);
const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part.key; return null; };
const chans = []; g.traverse(o => { if (o.isMesh && keyOf(o) === 'channel' && o.userData.channel) chans.push(o); });
console.log('channels', chans.length);
const v = new THREE.Vector3(); const hit = {};
S.masts.forEach((mk, mi) => { const F = shroudFeet(S, H, mk, true); if (!F || !F.chan || !F.chan.rec) return; const R = F.chan.rows, C = F.chan;
  const at = x => { for (let k = 0; k + 1 < R.length; k++) if (x >= R[k].x && x <= R[k+1].x) { const t = (x - R[k].x) / (R[k+1].x - R[k].x); const L = (a) => R[k][a] + (R[k+1][a] - R[k][a]) * t; return { y: L('y'), z: L('zTop') }; } return null; };
  g.traverse(o => { if (!o.isMesh) return; const k = keyOf(o); if (!k || /planking|channel|deadeye|shroud/.test(k)) return;
    const b = o.geometry.attributes.position; if (!b) return; let n = 0, ex = null;
    for (let j=0;j<b.count;j++){ v.fromBufferAttribute(b,j).applyMatrix4(o.matrixWorld); const r = at(v.x); if (!r) continue;
      const out = Math.abs(v.z) - r.z; if (out < 0.02 || out > C.w - 0.01) continue; const t = C.tIn + (C.tOut - C.tIn) * out / C.w;
      if (v.y < r.y - 0.01 && v.y > r.y - t + 0.01) { n++; ex = ex || [v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(2)]; } }
    if (n) { const kk = k + ' m' + mi; hit[kk] = (hit[kk] || 0) + n; console.log(kk, n, ex.join(',')); } }); });
console.log(JSON.stringify(hit));
`, ctx);
