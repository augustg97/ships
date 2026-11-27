// r366: for every hull with catheads: cathead tip, anchor extent, fore mast + fore channel, and the
// clearance of each lower shroud of the fore mast from every anchor vertex at the shroud's own height.
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.argv[2]; ctx.__ONLY = process.argv[3] || '';
for (const f of ['js/three.min.js', 'js/shaders.js', 'js/hull.js']) vm.runInContext(fs.readFileSync(W + '/' + f, 'utf8'), ctx);
ctx.__V = JSON.parse(fs.readFileSync(W + '/data/vessels.json', 'utf8')).vessels;
vm.runInContext(`
for (const V of __V) { if (!V.hull || (__ONLY && V.id !== __ONLY)) continue;
  const S = V.hull; let g; try { g = SHIPS_HULL.buildShip(S, { fine: true }); } catch (e) { continue; }
  if (!S.__catheads) continue;
  g.updateMatrixWorld(true); const H = hullSurface(S);
  const keyOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part; return null; };
  const v = new THREE.Vector3(); const segs = []; const anc = []; const chan = [];
  g.traverse(o => { if (!o.isMesh) return; const P = keyOf(o); const a = o.geometry.attributes.position; if (!a || !P) return;
    if (P.key === 'shroud' && P.name === 'Shrouds') { const Q = []; for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); Q.push([v.x,v.y,v.z]); }
      const c = A => A.reduce((s,p)=>[s[0]+p[0]/A.length,s[1]+p[1]/A.length,s[2]+p[2]/A.length],[0,0,0]);
      for (let i=0;i+7<Q.length;i+=8){ const p=c(Q.slice(i,i+4)), q=c(Q.slice(i+4,i+8)); segs.push(p[1]<q[1]?[p,q]:[q,p]); } return; }
    if (P.key === 'anchor' && P.name !== 'Cat pendant') for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); anc.push([v.x,v.y,v.z]); }
    if (P.key === 'channel') for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); chan.push([v.x,v.y,v.z]); }
  });
  const fm = (S.masts||[]).filter(m => m.shrouds).sort((a,b)=>a.at-b.at)[0];
  const F = fm ? shroudFeet(S, H, fm, true) : null;
  const ext = A => A.length ? [0,1,2].map(k => [Math.min(...A.map(p=>p[k])).toFixed(2), Math.max(...A.map(p=>p[k])).toFixed(2)]) : null;
  const pz = anc.filter(p => p[2] > 0);
  let worst = null, nHit = 0;
  for (const [a,b] of segs) { if (a[2] < 0) continue;
    for (const p of pz) { const t = (p[1]-a[1])/(b[1]-a[1]); if (t < 0 || t > 1) continue;
      const x = a[0]+(b[0]-a[0])*t, z = a[2]+(b[2]-a[2])*t; if (Math.abs(p[0]-x) > 0.06) continue;
      const gap = z - p[2]; if (gap < 0.05) nHit++; if (!worst || gap < worst.gap) worst = { gap: +gap.toFixed(3), x: +x.toFixed(2), y: +p[1].toFixed(2) }; } }
  const ct = S.__catheads[1];
  console.log(V.id.padEnd(22), 'L', S.lwl.toFixed(1), 'cat', [ct.x,ct.y,ct.z].map(q=>q.toFixed(2)).join(','),
    'anchor x', pz.length ? ext(pz)[0].join('..') : '-', 'y', pz.length ? ext(pz)[1].join('..') : '-',
    'foremast x', fm ? ((fm.at-0.5)*S.lwl + H.rake(fm.at)).toFixed(2) : '-',
    'chan', F && F.chan ? (F.chan.rec ? F.chan.x0.toFixed(2)+'..'+F.chan.x1.toFixed(2)+' rec' : (F.chan.x-F.chan.len/2).toFixed(2)+'..'+(F.chan.x+F.chan.len/2).toFixed(2)+' y'+F.chan.y.toFixed(2)) : '-',
    'dead x', F ? F.xs.map(q=>q.toFixed(1)).join(',') : '-', 'worst', JSON.stringify(worst), 'within5cm', nHit);
}
`, ctx);
