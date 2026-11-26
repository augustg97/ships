// every hull, fine and furled: a hash of every mesh's world positions, per hull
const vm = require('vm'), fs = require('fs'), crypto = require('crypto');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2];
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
const SH = ctx.SHIPS_HULL, THREE = ctx.THREE, P = new THREE.Vector3();
for (const v of V) {
  if (!v.hull) continue;
  const res = [];
  for (const opts of [{ fine: true }, { fine: false, furled: true }]) {
    let g; try { g = SH.buildShip(v.hull, opts); } catch (e) { res.push('ERR'); continue; }
    g.updateMatrixWorld(true);
    const h = crypto.createHash('md5'); let n = 0;
    g.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position; n++;
      for (let i = 0; i < pa.count; i++) { P.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); h.update(P.x.toFixed(4) + ',' + P.y.toFixed(4) + ',' + P.z.toFixed(4) + ';'); } });
    res.push(n + ':' + h.digest('hex').slice(0, 10));
  }
  console.log(v.id.padEnd(22), res.join('  '));
}
