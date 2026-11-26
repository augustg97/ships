// the 74's mast segments as built: foot, head, length per segment; usage: node r347_mast_probe.js <hull.js> <vessels.json>
const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
const W = process.env.HOME + '/Ships/web';
for (const f of [W + '/js/three.min.js', W + '/js/shaders.js', process.argv[2]]) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const v = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).vessels.find(x => x.id === 'ship-of-the-line');
const g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true });
const segs = []; let ymax = -1e9;
const tops = []; g.traverse(o => { if (o.userData && o.userData.lowerTop) tops.push([o.userData.mast, o.position.y]); if (o.isMesh && o.userData.seg) segs.push(o.userData); if (o.isMesh) { o.geometry.computeBoundingBox(); } });
const box = new ctx.THREE.Box3().setFromObject(g);
segs.sort((a, b) => a.seg.mi - b.seg.mi || a.seg.si - b.seg.si);
for (const u of segs) console.log(`mast ${u.seg.mi} seg ${u.seg.si}  foot ${u.seg.footY.toFixed(2)}  head ${u.seg.headY.toFixed(2)}  len ${u.seg.lengthM.toFixed(2)}` + (u.step ? `  step ${JSON.stringify(u.step)}` : '') + (u.head ? `  head ${JSON.stringify(u.head)}` : ''));
console.log('tops', JSON.stringify(tops));
console.log('rig top y', box.max.y.toFixed(2), 'z span', (box.max.z-box.min.z).toFixed(3), 'x span', (box.max.x-box.min.x).toFixed(3));
