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
const v = new THREE.Vector3(); const segs = []; const solid = [];
g.traverse(o => { if (!o.isMesh) return; const k = keyOf(o); const a = o.geometry.attributes.position; if (!a) return;
  if (k === 'shroud' && o.userData.part.name === 'Shrouds') { const P = []; for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); P.push([v.x,v.y,v.z]); }
    const c = A => A.reduce((s,p)=>[s[0]+p[0]/A.length,s[1]+p[1]/A.length,s[2]+p[2]/A.length],[0,0,0]);
    for (let i=0;i+7<P.length;i+=8){ const p=c(P.slice(i,i+4)), q=c(P.slice(i+4,i+8)); segs.push(p[1]<q[1]?[p,q]:[q,p]); } return; }
  if (/shroud|deadeye|channel|sail|yard|sheet|clew|brace|block|stay|lift|bunt|reef|halyard|mast|top|cap|ratline/i.test(k)) return;
  for (let j=0;j<a.count;j++){ v.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld); if (v.y > 5.3 && v.y < 9.5 && Math.abs(v.z) > 3) solid.push([v.x,v.y,v.z,k]); } });
console.log('shroud segs', segs.length, 'solid pts', solid.length);
let worst = {}; 
for (const [a,b] of segs) { if (a[1] > 7) continue; const sg = Math.sign(a[2]);
  for (const p of solid) { if (Math.sign(p[2]) !== sg) continue; const t = (p[1]-a[1])/(b[1]-a[1]); if (t < 0 || t > 1) continue;
    const x = a[0]+(b[0]-a[0])*t, z = Math.abs(a[2]+(b[2]-a[2])*t); if (Math.abs(p[0]-x) > 0.05) continue;
    const gap = z - Math.abs(p[2]); if (!worst[p[3]] || gap < worst[p[3]].gap) worst[p[3]] = { gap: +gap.toFixed(3), x: +x.toFixed(2), y: +p[1].toFixed(2) }; } }
console.log(JSON.stringify(worst));
`, ctx);
