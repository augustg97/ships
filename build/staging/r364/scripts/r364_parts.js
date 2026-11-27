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
const box = {}, B = new THREE.Box3();
g.traverse(o => { const p = o.userData.part; if (!p || !o.isMesh && !o.isGroup) return; B.setFromObject(o);
  if (!isFinite(B.min.x)) return; const k = p.key; box[k] = box[k] || [1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
  const b = box[k]; b[0] = Math.min(b[0], B.min.x); b[1] = Math.max(b[1], B.max.x); b[2] = Math.min(b[2], B.min.y); b[3] = Math.max(b[3], B.max.y); b[4]=Math.min(b[4],B.min.z); b[5]=Math.max(b[5],B.max.z); });
const v3=new THREE.Vector3(); let mn=1e9; g.traverse(o=>{const p=o.userData.part; if(!o.isMesh) return; let q=o; let key=null; while(q){ if(q.userData.part){key=q.userData.part.key;break;} q=q.parent;} if(key!=="gallery") return; const a=o.geometry.attributes.position; for(let i=0;i<a.count;i++){v3.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld); if(v3.y>5.0&&v3.y<6.0&&v3.z>0) mn=Math.min(mn,v3.x);} }); console.log("gallery fore x at y 5-6:", mn.toFixed(3));
`, ctx);
