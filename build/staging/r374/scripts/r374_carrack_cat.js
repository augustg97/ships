// usage: node r374_carrack_cat.js <webdir> — the carrack's cathead against her forecastle castle
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
const V = __V.find(v => v.id === 'carrack'); const S = V.hull;
const g = SHIPS_HULL.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
const H = SHIPS_HULL.hullSurface(S);
const P = new THREE.Vector3();
g.traverse(o => {
  if (!(o.isGroup && o.userData.part && o.userData.part.key === 'cathead')) return;
  o.traverse(m => { if (!m.isMesh) return; const a = m.geometry.attributes.position;
    let lo=1e9,hi=-1e9,x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); lo=Math.min(lo,P.y);hi=Math.max(hi,P.y);x0=Math.min(x0,P.x);x1=Math.max(x1,P.x);z0=Math.min(z0,P.z);z1=Math.max(z1,P.z); }
    console.log('cat mesh', m.geometry.type, 'y', lo.toFixed(2), hi.toFixed(2), 'x', x0.toFixed(2), x1.toFixed(2), 'z', z0.toFixed(2), z1.toFixed(2)); });
});
for (const u of [0.02, 0.05, 0.08, 0.105, 0.13, 0.2, 0.26]) {
  const sp = SHIPS_HULL.surfacePoint(S, H, u, 1.0); const ct = castleTopAt(S, H, u);
  console.log('u', u, 'sheer x', sp[0].toFixed(2), 'y', sp[1].toFixed(2), 'half', Math.abs(sp[2]).toFixed(2), 'castle', ct ? JSON.stringify({y:+ct.y.toFixed(2), half:+ct.half.toFixed(2), railH: ct.railH}) : null);
}
console.log('catheads', JSON.stringify(S.__catheads.map(c => ({x:+c.x.toFixed(2), y:+c.y.toFixed(2), z:+c.z.toFixed(2), xSide:+c.xSide.toFixed(2)}))));
`, ctx);
