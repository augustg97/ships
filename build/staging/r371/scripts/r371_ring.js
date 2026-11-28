// r371: the ring against the cathead's beam, per catted hull
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
  const S = V.hull; let g; try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { console.log(V.id, 'ERR', e.message); continue; }
  g.updateMatrixWorld(true);
  const cats = []; g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'cathead') cats.push(o); });
  const out = [];
  g.traverse(o => { if (!o.isGroup || !o.userData.anchorStow) return; const st = o.userData.anchorStow;
    const ring = new THREE.Vector3(...st.ring), crown = new THREE.Vector3(...st.crown);
    const sd = crown.clone().sub(ring).normalize();
    const c = cats.find(q => Math.sign(q.position.z) === Math.sign(ring.z)); if (!c) return;
    const inv = new THREE.Matrix4().copy(c.matrixWorld).invert();
    const beam = c.children[0]; const sq = beam.geometry.parameters.width, blen = beam.geometry.parameters.depth;
    // sample the ring (in the plane of shank and stock: try both) for points inside the beam box
    const zA = new THREE.Vector3(...[0,0,0]); 
    const top = ring.clone().addScaledVector(sd, -1); // placeholder
    const loc = p => p.clone().applyMatrix4(inv);
    const rl = loc(ring);
    out.push({ side: Math.sign(ring.z), sq: +sq.toFixed(3), blen: +blen.toFixed(2), ringLocal: rl.toArray().map(q=>+q.toFixed(3)), sdDownComp: +sd.y.toFixed(3) });
  });
  console.log(V.id, JSON.stringify(out));
}
`, ctx);
