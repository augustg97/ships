const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE;
const res = {};
for (const v of V) {
  if (!v.hull) continue;
  let g; try { g = SH.buildShip(v.hull, { fine: true }); } catch (e) { res[v.id] = 'ERR ' + e.message.slice(0, 60); continue; }
  g.updateMatrixWorld(true);
  const parts = {}; const P = new THREE.Vector3(); let wales = [], guns = [], uni = null, wcol = null, wfin = null;
  g.traverse(o => {
    if (o.material && o.material.uniforms && o.material.uniforms.uTierLo) { const U = o.material.uniforms; uni = [U.uTierLo.value.toArray(), U.uTierHi.value.toArray(), U.uTierPort.value.toArray(), U.uTierSoft.value].map(a => Array.isArray(a) ? a.map(x => +x.toFixed(4)) : a); }
    if (!o.isMesh) return;
    const k = (o.userData.part && o.userData.part.key) || '?';
    const pa = o.geometry.attributes.position; let s = 0;
    for (let i = 0; i < pa.count; i++) { P.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); s += P.x * 1.1 + P.y * 2.3 + P.z * 0.7; }
    parts[k] = (parts[k] || 0) + s;
    if (k === 'wale') { let ys = 0, n = 0; for (let i = 0; i < pa.count; i++) { P.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (P.z > 0 && Math.abs(P.x) < 1) { ys += P.y; n++; } } wales.push(+(ys / n).toFixed(2)); wcol = (o.material.color || o.material.uniforms.uCol.value).getHexString(); wfin = o.userData.waleFinish; }
  });
  g.traverse(o => { if (o.userData.part && o.userData.part.key === 'gun') { const ys = []; o.traverse(c => { if (c.isMesh) ys.push(+c.position.y.toFixed(2)); }); guns = [...new Set(ys)].sort((a, b) => a - b); } });
  const H = SH.hullSurface(v.hull);
  res[v.id] = { parts: Object.fromEntries(Object.entries(parts).map(([k, s]) => [k, +s.toFixed(1)])), wales, wcol, wfin, guns, uni, sheer: +H.sheer(0.5).toFixed(2), deck: +H.deck(0.5).toFixed(2) };
}
console.log(JSON.stringify(res));
