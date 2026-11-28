const vm = require('vm'), fs = require('fs');
const ctx = { console, Math, JSON, Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8Array, Float64Array, Array, Object, Map, Set, WeakMap, Symbol, Promise, setTimeout, performance: { now: () => 0 } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: () => ({ getContext: () => null, style: {} }), createElementNS: () => ({ getContext: () => null, style: {} }) };
vm.createContext(ctx);
for (const f of ['three.min.js','shaders.js','hull.js']) vm.runInContext(fs.readFileSync(process.argv[2] + '/js/' + f, 'utf8'), ctx);
const V = JSON.parse(fs.readFileSync(process.argv[2] + '/data/vessels.json', 'utf8'));
const vol = g => { const P = g.attributes.position, I = g.index, n = I ? I.count : P.count, ix = t => I ? I.getX(t) : t; let v = 0;
  for (let t = 0; t + 2 < n; t += 3) { const a = ix(t), b = ix(t+1), c = ix(t+2);
    const A=[P.getX(a),P.getY(a),P.getZ(a)],B=[P.getX(b),P.getY(b),P.getZ(b)],C=[P.getX(c),P.getY(c),P.getZ(c)];
    v += (A[0]*(B[1]*C[2]-B[2]*C[1]) - A[1]*(B[0]*C[2]-B[2]*C[0]) + A[2]*(B[0]*C[1]-B[1]*C[0]))/6; } return v; };
for (const v of (V.vessels || V)) { if (!v.hull) continue; let g; try { g = ctx.SHIPS_HULL.buildShip(v.hull, { fine: true }); } catch (e) { continue; }
  const r = []; g.traverse(o => { if (o.isMesh && (o.userData.solid || (o.userData.channel && o.userData.channel.rec))) r.push(((o.userData.part&&o.userData.part.key)||'?') + ' ' + vol(o.geometry).toFixed(3) + (o.scale.z < 0 ? 'm' : '')); });
  if (r.length) console.log(v.id, r.join(', ')); }
