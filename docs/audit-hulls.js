(async function auditHulls() {
const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
const problems = [];
const rows = [];
const say = (id, rule, detail) => problems.push({ id, rule, detail });
{
const spend = s => String(s == null ? '' : s)
.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');
const sweep = (coll, items) => (items || []).forEach(it => {
const id = `data:${coll}/${it.id || it.name || '?'}`;
(it.rows || []).forEach((r, i) => [0, 1].forEach(j => {
if (spend(r[j]).includes('*'))
say(id, 'an asterisk the renderer cannot spend',
`rows[${i}][${j}] = ${JSON.stringify(String(r[j]).slice(0, 60))}`);
}));
for (const f of ['cite', 'text'])
if (spend(it[f]).includes('*'))
say(id, 'an asterisk the renderer cannot spend',
`${f} = ${JSON.stringify(String(it[f]).slice(0, 60))}`);
});
const V = (APP.voyages && (APP.voyages.voyages || APP.voyages)) || [];
const C = (APP.chapters && APP.chapters.chapters) || [];
const B = (APP.battles && APP.battles.battles) || [];
const P = (APP.ports && APP.ports.ports) || [];
sweep('vessels', list);
sweep('voyages', V);
sweep('chapters', C);
sweep('battles', B);
sweep('ports', P);
const titles = (coll, items, fields) => (items || []).forEach(it => {
const id = `data:${coll}/${it.id || it.name || it.title || '?'}`;
for (const f of fields)
if (String(it[f] == null ? '' : it[f]).includes('*'))
say(id, 'an asterisk in a title slot',
`${f} = ${JSON.stringify(String(it[f]).slice(0, 60))}`);
(it.legs || []).forEach((l, i) => {
if (String(l.name == null ? '' : l.name).includes('*'))
say(id, 'an asterisk in a title slot',
`legs[${i}].name = ${JSON.stringify(String(l.name).slice(0, 60))}`);
});
});
titles('vessels', list, ['name', 'sub']);
titles('voyages', V, ['name', 'dates']);
titles('chapters', C, ['title', 'short', 'years', 'stat', 'lede']);
titles('battles', B, ['name', 'date', 'campaign']);
titles('ports', P, ['name', 'modern', 'eyebrow', 'kind']);
}
for (const v of list) {
if (v.polar && v.polar.floor) {
const fb = v.polar.floor;
if (!/^(oar|paddle|steam|motor)$/.test(fb.by || ''))
say(v.id, 'speed floor with no means', `floor.by = ${JSON.stringify(fb.by)}`);
else if (/steam|\bihp\b|\bbhp\b/i.test(fb.source || '') && !/^(steam|motor)$/.test(fb.by))
say(v.id, 'floor attests steam but claims muscle',
`floor.by = ${fb.by}; the floor's own source says steam`);
}
if (!v.hull) continue;
const H = v.hull;
{
const hullRow = (v.rows || []).find(r => Array.isArray(r) && /^hull$/i.test(String(r[0]).trim()));
const timber = !/^(steel|iron)$/.test(String(H.build || ''));
const names = timber && hullRow && /castle|\bpoop\b/i.test(String(hullRow[1]));
const declares = !!(H.castle || H.castles || H.poop || (H.wellM && H.houseAt));
if (names && !declares)
say(v.id, 'a hull whose record names a castle it does not declare', `Hull row: '${hullRow[1]}'; no castle, castles, poop or raised ends in the data`);
if (H.castles && !H.castlesProvenance)
say(v.id, 'castles with no provenance', 'hull.castles declared, hull.castlesProvenance absent');
if (H.castles) for (const end of ['fore', 'aft']) {
const c = H.castles[end]; if (!c) continue;
if (!(Array.isArray(c) && c.length === 3 && c[0] >= 0 && c[1] <= 1 && c[1] > c[0] && c[2] >= 1))
say(v.id, 'a castle declared out of shape', `castles.${end} = ${JSON.stringify(c)}; want [fromU, toU, tiers]`);
}
}
if (H.deck) {
if (!/^(teak|hinoki|pine|wood|steel|bare)$/.test(H.deck.covering || ''))
say(v.id, 'deck covering unknown to the model',
`hull.deck.covering = ${JSON.stringify(H.deck.covering)}; the registry `
+ 'draws teak/hinoki/pine/wood/steel/bare, and an unknown word falls back to '
+ 'the heuristic silently');
else if (!(H.deck.provenance && H.deck.provenance.length > 20))
say(v.id, 'deck covering with no provenance',
`hull.deck.covering = ${H.deck.covering} but no source is recorded`);
}
if ((H.year || 0) < 1950) {
const recordText = JSON.stringify([v.rows || [], (v.polar || {}).anchor || {},
(v.polar || {}).floor || {}, v.sub || '']);
if (/steam|\bihp\b|\bbhp\b/i.test(recordText) && !(H.funnels >= 1))
say(v.id, 'steam attested, no funnel drawn',
`year ${H.year}; record says steam; hull.funnels = ${H.funnels}`);
}
if (H.tierBands && H.tierBands.groups) {
const [hA2, hB2] = H.houseAt || [0.10, 0.90];
for (const ti in H.tierBands.groups)
for (const gr of H.tierBands.groups[ti]) {
if (!(gr[0] < gr[1]))
say(v.id, 'window group inverted', `tier ${ti} group [${gr[0]}, ${gr[1]}]`);
if (gr[0] < hA2 - 0.03 || gr[1] > hB2 + 0.03)
say(v.id, 'window group outside its wall',
`tier ${ti} group [${gr[0]}, ${gr[1]}] vs house ${hA2}-${hB2}`);
}
}
if (H.hullRows && H.hullRows.groups) {
for (const gr of H.hullRows.groups) {
if (!(gr.u[0] < gr.u[1]) || gr.u[0] < 0 || gr.u[1] > 1)
say(v.id, 'hull row group off the hull', `u [${gr.u[0]}, ${gr.u[1]}]`);
if (gr.hM[1] > (H.freeboard || 6) + 0.01 || gr.hM[0] < 0 || !(gr.hM[0] < gr.hM[1]))
say(v.id, 'hull row beyond the freeboard',
`hM [${gr.hM[0]}, ${gr.hM[1]}] vs freeboard ${H.freeboard}`);
}
}
if (H.tierBands && H.tierBands.bandsM && H.tierFloorsM) {
const nT = H.decks || 0;
const fl = i => i <= 0 ? (H.freeboard || 0)
: i >= nT ? (H.houseTopM !== undefined ? H.houseTopM : Infinity)
: (H.tierFloorsM[i - 1] !== undefined ? H.tierFloorsM[i - 1] : Infinity);
for (const ti in H.tierBands.bandsM) {
const bm = H.tierBands.bandsM[ti], i = +ti;
if (!(bm[0] < bm[1]) || bm[0] < fl(i) - 0.01 || bm[1] > fl(i + 1) + 0.01)
say(v.id, 'tier band outside its tier',
`tier ${ti} band ${bm[0]}-${bm[1]} m vs floors ${fl(i)}-${fl(i + 1)}`);
}
}
if (H.cluster && H.cluster.domes) {
const [hA3, hB3] = H.houseAt || [0.10, 0.90];
for (const dm of H.cluster.domes) {
if (dm.onTier === undefined) continue;
const aft = (H.tierAftU && H.tierAftU[dm.onTier] !== undefined)
? H.tierAftU[dm.onTier] : hB3;
if (dm.u < hA3 - 0.01 || dm.u > aft + 0.01)
say(v.id, 'dome past its terrace',
`dome u ${dm.u} on tier ${dm.onTier}, terrace ends ${aft}`);
}
}
if (H.sternSteps) {
const ss = H.sternSteps.steps || [];
for (let i = 0; i < ss.length; i++) {
const st = ss[i];
if (!(st.u[0] < st.u[1]) || st.u[0] < 0 || st.u[1] > 1)
say(v.id, 'stern step span inverted', `step ${i} u [${st.u[0]}, ${st.u[1]}]`);
if (i && Math.abs(ss[i - 1].u[1] - st.u[0]) > 0.001)
say(v.id, 'stern steps not contiguous',
`step ${i - 1} ends ${ss[i - 1].u[1]}, step ${i} starts ${st.u[0]}`);
if (i && st.topM[0] > ss[i - 1].topM[1] + 0.05)
say(v.id, 'stern cap line ascends aft',
`step ${i} fwd top ${st.topM[0]} m over step ${i - 1} aft top ${ss[i - 1].topM[1]} m`);
if (st.deckM !== undefined) {
const para = Math.min(st.topM[0], st.topM[1]) - st.deckM;
if (para < 0.4 || para > 2.0)
say(v.id, 'stern parapet off human height',
`step ${i} deck ${st.deckM} m under cap ${st.topM} m — parapet ${para.toFixed(2)} m`);
if (st.deckM > (H.freeboard || 6))
say(v.id, 'stern step deck above the freeboard',
`step ${i} deck ${st.deckM} m on ${H.freeboard} m freeboard`);
}
}
}
let g = null;
try { g = SHIPS_HULL.buildShip(H, { fine: true }); }
catch (e) { say(v.id, 'BUILD THREW', e.message); continue; }
const tagOf = o => { for (let e = o; e; e = e.parent)
if (e.userData && e.userData.part) return e.userData.part;
return null; };
const NONBEARING = new Set(['stay', 'shroud', 'halyard', 'brace', 'lift',
'sheet', 'tack', 'ratline', 'oar', 'mast']);
const lowerOf = mk => {
if (mk.truckM !== undefined && mk.rig === 'square') {
const K = mk.only === 1 ? 1.0 : mk.only === 2 ? 0.88 + 0.60
: 0.88 * (1 + 0.60) + 0.30;
return mk.truckM / K;
}
return mk.heightM !== undefined ? mk.heightM
: (mk.height || 0) * (H.lwl + H.beam) / 2;
};
{
const bad = {};
g.traverse(o => {
if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
const a = o.geometry.attributes.position.array;
for (let i = 0; i < a.length; i++)
if (!Number.isFinite(a[i])) {
const p = tagOf(o);
bad[(p && p.name) || o.geometry.type] = true;
return;
}
});
const names = Object.keys(bad);
if (names.length)
say(v.id, 'geometry with non-finite vertices',
`NaN positions in: ${names.join(', ')} — the black-canvas class`);
}
{
const bad = [];
g.traverse(o => {
if (!o.isMesh || !o.geometry || !o.geometry.index) return;
const ia = o.geometry.index.array;
const seen = new Set(); let dup = 0;
for (let i = 0; i < ia.length; i += 3) {
const t = [ia[i], ia[i + 1], ia[i + 2]].sort((a, b) => a - b).join(',');
if (seen.has(t)) dup++; else seen.add(t);
}
if (dup) {
const p = tagOf(o);
bad.push(`${(p && (p.name || p.key)) || o.geometry.type}: ${dup} of ${ia.length / 3}`);
}
});
if (bad.length)
say(v.id, 'triangles drawn twice over the same vertices',
`${bad.join('; ')} — the both-ways class: computeVertexNormals cancels `
+ 'shared windings to zeros and unit garbage');
}
const part = {};
g.traverse(o => {
if (!o.isMesh) return;
const p = tagOf(o);
if (!p) return;
const bb = new THREE.Box3().setFromObject(o);
const e = part[p.key] || (part[p.key] = { n: 0, x: [1e9, -1e9], y: [1e9, -1e9], z: [1e9, -1e9], xs: [] });
e.n++; e.xs.push((bb.min.x + bb.max.x) / 2);
e.x[0] = Math.min(e.x[0], bb.min.x); e.x[1] = Math.max(e.x[1], bb.max.x);
e.y[0] = Math.min(e.y[0], bb.min.y); e.y[1] = Math.max(e.y[1], bb.max.y);
e.z[0] = Math.min(e.z[0], bb.min.z); e.z[1] = Math.max(e.z[1], bb.max.z);
});
const deckY = part.deck ? part.deck.y[1] : 0;
const mastDeckY = (part.deck && H.deck && H.deck.foredeck && part.mast) ? part.mast.y[0] : deckY;
const bb = new THREE.Box3().setFromObject(g);
const airM = bb.max.y - deckY;
{
const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
const timber = !(H.build === 'iron' || H.build === 'steel');
const steelDeck = H.deck && H.deck.covering === 'steel';
for (const k of ['grating']) {
if (undecked && part[k])
say(v.id, 'hold furniture on an undecked hull',
`${part[k].n} ${k} mesh(es) drawn, but the record declares deckLaid: false — `
+ 'no laid deck, no hatch to cover');
else if (!undecked && timber && !steelDeck && !part[k])
say(v.id, `a decked timber ship lost her ${k}`,
'the hull is timber and the record does not refuse a laid deck, so hatch '
+ 'gratings belong aboard and none is drawn');
}
if (undecked && part.capstan)
say(v.id, 'hold furniture on an undecked hull',
`${part.capstan.n} capstan mesh(es) drawn on a hull with no laid deck — `
+ 'nothing for a capstan to stand on');
}
{
const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
const st = part.stowage;
if (undecked && !st)
say(v.id, 'an open hull with a bare floor',
'the record lays no deck, so the floor is in plain sight — and the gear the '
+ 'record itself attests (paddles, a bailer) is not drawn');
else if (!undecked && st)
say(v.id, 'stowage drawn on a decked hull',
`${st.n} stowage mesh(es) on a hull whose deck would hide them — the open-`
+ 'hull gate widened wrongly');
if (undecked && st && part.deck) {
const eps = 0.03;
if (st.y[1] > part.deck.y[1] + eps)
say(v.id, 'stowed gear above the rim',
`gear tops at ${st.y[1].toFixed(2)} m against a rim line of `
+ `${part.deck.y[1].toFixed(2)} m — adrift, not stowed`);
if (st.y[0] < part.deck.y[0] - eps)
say(v.id, 'stowed gear below the floor',
`gear bottoms at ${st.y[0].toFixed(2)} m against a floor of `
+ `${part.deck.y[0].toFixed(2)} m — sunk through the hull`);
if (st.x[0] < part.deck.x[0] - eps || st.x[1] > part.deck.x[1] + eps
|| st.z[0] < part.deck.z[0] - eps || st.z[1] > part.deck.z[1] + eps)
say(v.id, 'stowed gear outside the hull',
`gear spans x ${st.x[0].toFixed(2)}..${st.x[1].toFixed(2)}, `
+ `z ${st.z[0].toFixed(2)}..${st.z[1].toFixed(2)} against the open hull's `
+ `x ${part.deck.x[0].toFixed(2)}..${part.deck.x[1].toFixed(2)}, `
+ `z ${part.deck.z[0].toFixed(2)}..${part.deck.z[1].toFixed(2)}`);
}
}
{
const st = H.steering;
if (!/^(paddle|quarter|median|stern|steel)$/.test(st || ''))
say(v.id, 'record declares no steering',
`hull.steering = ${JSON.stringify(st)}; the model draws paddle | quarter | `
+ 'median | stern | steel, and an undeclared record leaves the builder '
+ 'guessing off the build string — the round-121 fault standing again');
else if (st === 'paddle') {
for (const k of ['rudder', 'quarterRudder'])
if (part[k])
say(v.id, 'a paddled hull mounts steering',
`${part[k].n} ${k} mesh(es) drawn, but the record steers with a hand-held `
+ 'paddle — nothing is hung on the hull');
} else {
const want = st === 'quarter' ? 'quarterRudder' : 'rudder';
const other = st === 'quarter' ? 'rudder' : 'quarterRudder';
if (!part[want])
say(v.id, 'declared steering not drawn',
`hull.steering = ${st} and no ${want} mesh exists`);
if (part[other])
say(v.id, 'steering of the wrong kind drawn',
`hull.steering = ${st} but ${part[other].n} ${other} mesh(es) drawn`);
if (st === 'quarter' && part.quarterRudder) {
const q = part.quarterRudder;
if (q.n !== 2)
say(v.id, 'a quarter-rudder pair is a pair',
`${q.n} quarter-rudder mesh(es); one steers over each quarter`);
else if (!(q.z[0] < -0.1 && q.z[1] > 0.1))
say(v.id, 'both quarter rudders on one side',
`z extent ${q.z[0].toFixed(2)}..${q.z[1].toFixed(2)} m does not straddle `
+ 'the centreline');
if (q.y[0] > -0.15 * (H.draught || 1))
say(v.id, 'quarter rudder not immersed',
`blade bottoms at ${q.y[0].toFixed(2)} m on a ${H.draught} m draught — `
+ 'a steering blade out of the water steers nothing');
if (q.y[1] < 0.3)
say(v.id, 'quarter rudder with no loom above the rail',
`head tops out at ${q.y[1].toFixed(2)} m — nothing for a helmsman to hold`);
if (q.xs && !q.xs.every(x => x > 0.15 * (H.lwl || 1)))
say(v.id, 'quarter rudder off the quarter',
`mesh centres at x ${q.xs.map(x => x.toFixed(1)).join(', ')} m — the `
+ 'quarter is the after end of the run, well abaft amidships');
}
if (st === 'steel' && part.rudder && part.rudder.y[1] > 0.05)
say(v.id, 'steel rudder above the waterline',
`rudder tops at ${part.rudder.y[1].toFixed(2)} m; a motor ship's plate lives `
+ 'wholly below the counter — the carrier fault of round 27');
}
}
if (H.steering === 'stern' && !/^(steel|iron)$/.test(H.build || '')) {
const byName = nm => { const r = []; g.traverse(o => { if (o.isMesh && o.name === nm) r.push(o); }); return r; };
const post = (() => { let r = null; g.traverse(o => {
if (!r && o.isMesh && (o.name === 'Sternpost' || (o.userData.part && o.userData.part.name === 'Sternpost'))) r = o; }); return r; })();
const stock = byName('rudder-stock'), planks = byName('rudder-plank'), bands = byName('rudder-band');
const pins = byName('rudder-pintle'), clamps = byName('rudder-gudgeon'), tillers = byName('rudder-tiller');
const world = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
if (!stock.length)
say(v.id, 'a rudder with no stock', 'no rudder-stock mesh on a stern-hung timber build');
else {
const sv = world(stock[0]);
let sy0 = 1e9, sy1 = -1e9; for (const q of sv) { sy0 = Math.min(sy0, q[1]); sy1 = Math.max(sy1, q[1]); }
if (!post) say(v.id, 'a rudder with no post to hang on', 'no Sternpost mesh');
else {
const pv = world(post), ridge = new Map();
for (const q of pv) { const k = Math.round(q[1] * 100); ridge.set(k, Math.max(ridge.get(k) ?? -1e9, q[0])); }
const rk = [...ridge.keys()].sort((a, b) => a - b);
const ridgeAt = y => {
const k = y * 100; if (k < rk[0] || k > rk[rk.length - 1]) return null;
let i = 0; while (i + 1 < rk.length && rk[i + 1] < k) i++;
const a = rk[i], b = rk[Math.min(i + 1, rk.length - 1)];
if (b === a) return ridge.get(a);
const t = (k - a) / (b - a); return ridge.get(a) + (ridge.get(b) - ridge.get(a)) * t;
};
const edge = new Map();
for (const q of sv) { const k = Math.round(q[1] * 100); edge.set(k, Math.min(edge.get(k) ?? 1e9, q[0])); }
let worst = 0, worstY = 0, seen = 0;
for (const [k, x] of edge) {
const px = ridgeAt(k / 100); if (px == null) continue;
seen++; const gap = x - px;
if (Math.abs(gap) > Math.abs(worst)) { worst = gap; worstY = k / 100; }
}
if (!seen) say(v.id, 'a rudder that shares no height with its post', `stock ${sy0.toFixed(2)}..${sy1.toFixed(2)} m`);
else if (worst > 0.30 || worst < -0.12)
say(v.id, 'a rudder hung off its post',
`stock's leading edge ${worst.toFixed(2)} m from the post's after face at ${worstY.toFixed(2)} m — `
+ 'the irons clasp the post; the blade lies on it');
}
const want = H.rudder && H.rudder.hangings;
if (!bands.length) say(v.id, 'a rudder with no irons', '0 straps drawn; the Bremen gudgeons say four were needed');
else {
if (want && bands.length !== want)
say(v.id, "the irons off the record's count", `${bands.length} hangings drawn, record says ${want}`);
else if (!want && bands.length < 3)
say(v.id, 'too few irons for a stern-hung blade', `${bands.length} hangings`);
if (pins.length !== bands.length || clamps.length !== 2 * bands.length)
say(v.id, 'irons without their other half',
`${bands.length} straps, ${pins.length} pintles, ${clamps.length} clamp plates — one pintle and two plates per strap`);
const ys = bands.map(b => { const w = world(b); return w.reduce((a, q) => a + q[1], 0) / w.length; }).sort((a, b) => a - b);
for (const y of ys) if (y < sy0 - 0.05 || y > sy1 + 0.05)
say(v.id, 'an iron off the blade', `strap at ${y.toFixed(2)} m, stock ${sy0.toFixed(2)}..${sy1.toFixed(2)}`);
for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] < 0.5)
say(v.id, 'irons closer than a hand span', `${(ys[i] - ys[i - 1]).toFixed(2)} m between hangings — record-blind`);
}
if (H.castle && H.castle.fromU != null) {
if (!tillers.length) say(v.id, 'a castle with no tiller under it', 'record gives the castle; Ellmers puts the man at the tiller under its deck');
else {
const tv = world(tillers[0]);
let tx0 = 1e9, tx1 = -1e9, ty0 = 1e9, ty1 = -1e9;
for (const q of tv) { tx0 = Math.min(tx0, q[0]); tx1 = Math.max(tx1, q[0]); ty0 = Math.min(ty0, q[1]); ty1 = Math.max(ty1, q[1]); }
if (ty1 - ty0 > 0.3) say(v.id, 'a tiller that is not level', `${(ty1 - ty0).toFixed(2)} m of rise`);
if (sy1 < ty0 - 0.1) say(v.id, 'a tiller with no head to fit', `stock tops at ${sy1.toFixed(2)} m, tiller at ${ty0.toFixed(2)}`);
const uHand = 0.5 + tx0 / (H.lwl || 1);
if (uHand < H.castle.fromU || uHand > H.castle.toU)
say(v.id, 'a tiller whose hand end is not under the castle',
`hand end at u ${uHand.toFixed(2)}, castle ${H.castle.fromU}–${H.castle.toU} — the man stood under the castle deck`);
if (H.rudder && H.rudder.tillerAtU != null && Math.abs(uHand - H.rudder.tillerAtU) > 0.12)
say(v.id, "the tiller off the record's station", `hand end u ${uHand.toFixed(2)}, record says ${H.rudder.tillerAtU}`);
let deckY = -1e9, seen = 0;
g.traverse(o => { if (!o.isMesh || o.name !== 'castle-deck') return;
for (const q of world(o)) if (Math.abs(q[0] - tx0) < 0.6) { deckY = Math.max(deckY, q[1]); seen++; } });
if (seen) {
let after = 1e9, bestD = 0.6;
g.traverse(o => { const p = tagOf(o); if (!(o.isMesh && p && p.key === 'deck' && !/Waterplane|Gunwale|log/i.test(p.name || ''))) return;
for (const q of world(o)) { const d = Math.abs(q[0] - tx0); if (d < bestD - 1e-6) { bestD = d; after = q[1]; } else if (d <= bestD + 1e-6) after = Math.min(after, q[1]); } });
if (after > 1e8) after = deckY - (H.castle.deckHM || 1.95);
const hand = (ty0 + ty1) / 2 - after;
if (hand < 0.8 || hand > 1.7) say(v.id, 'a tiller nobody could hold', `${hand.toFixed(2)} m over the afterdeck at the hand`);
if (deckY - ty1 < 0.2) say(v.id, 'a tiller through the castle deck', `${(deckY - ty1).toFixed(2)} m under the planks`);
}
}
}
if (H.rudder && H.rudder.chordFootM) {
const all = sv.concat(...planks.map(world));
let lo = 1e9; for (const q of all) lo = Math.min(lo, q[1]);
let x0 = 1e9, x1 = -1e9;
for (const q of all) if (q[1] < lo + 0.35) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }
const c = x1 - x0;
if (Math.abs(c - H.rudder.chordFootM) > 0.30 * H.rudder.chordFootM)
say(v.id, "the blade off the record's chord", `${c.toFixed(2)} m at the foot, record says ${H.rudder.chordFootM}`);
}
}
}
if (H.sternpost && H.sternpost.form === 'straight' && H.sternpost.angleToKeelDeg != null) {
const SP = H.sternpost;
const post = (() => { let r = null; g.traverse(o => {
if (!r && o.isMesh && (o.name === 'Sternpost' || (o.userData.part && o.userData.part.name === 'Sternpost'))) r = o; }); return r; })();
const world = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
if (!post) say(v.id, 'a straight sternpost with no post drawn', 'record gives sternpost.form straight; no Sternpost mesh');
else {
const pv = world(post), ridge = new Map();
for (const q of pv) { const k = Math.round(q[1] * 100); ridge.set(k, Math.max(ridge.get(k) ?? -1e9, q[0])); }
const ks = [...ridge.keys()].sort((a, b) => a - b);
const yLo = ks[0] / 100, yHi = ks[ks.length - 1] / 100;
const pts = ks.filter(k => k / 100 > yLo + 0.2 && k / 100 < yHi - 0.2).map(k => [k / 100, ridge.get(k)]);
const n = pts.length; let sy = 0, sx = 0, syy = 0, sxy = 0;
for (const [y, x] of pts) { sy += y; sx += x; syy += y * y; sxy += x * y; }
const slope = n > 2 ? (n * sxy - sx * sy) / (n * syy - sy * sy) : 0, icpt = n ? (sx - slope * sy) / n : 0;
const wantTan = Math.tan((SP.angleToKeelDeg - 90) * Math.PI / 180);
let worst = 0; for (const [y, x] of pts) worst = Math.max(worst, Math.abs(x - (icpt + slope * y)));
if (n < 3) say(v.id, 'a sternpost too short to read', `${n} centimetres of after face`);
else {
if (Math.abs(slope - wantTan) > 0.05)
say(v.id, 'the sternpost off its attested angle', `${(90 + Math.atan(slope) * 180 / Math.PI).toFixed(1)}° to the keel drawn, the record says ${SP.angleToKeelDeg}`);
if (worst > 0.08)
say(v.id, 'a straight sternpost drawn bent', `after face ${worst.toFixed(2)} m off its own line`);
const wantWL = H.lwl / 2 + 0.05 * H.draught;
if (Math.abs(icpt - wantWL) > 0.2)
say(v.id, "the sternpost off the waterline's after end", `after face ${icpt.toFixed(2)} m abaft midships at the water, lwl/2 and the moulding say ${wantWL.toFixed(2)}`);
if (SP.headAboveKeelM != null && Math.abs((yHi + H.draught) - SP.headAboveKeelM) > 0.2)
say(v.id, "the sternpost's head off its attested height", `${(yHi + H.draught).toFixed(2)} m over the keel, the record says ${SP.headAboveKeelM}`);
if (yLo > -H.draught + 0.2)
say(v.id, 'a sternpost whose foot stands above the keel', `foot ${(yLo + H.draught).toFixed(2)} m over the keel's rabbet`);
}
const skins = []; g.traverse(o => { const p = o.userData && o.userData.part; if (o.isMesh && p && p.key === 'planking') skins.push(o); });
if (!skins.length) say(v.id, 'a straight sternpost with no planking to close on it', 'no planking mesh');
else {
const sv = [].concat(...skins.map(world)); let skinTop = -1e9; for (const q of sv) skinTop = Math.max(skinTop, q[1]);
const ridgeAt = y => { const k = Math.round(y * 100); let best = null, bd = 1e9;
for (const kk of ks) { const d = Math.abs(kk - k); if (d < bd) { bd = d; best = kk; } } return bd <= 3 ? ridge.get(best) : null; };
let worstAft = 0, worstGap = 0, yAft = 0, yGap = 0, bands = 0;
for (let y = yLo + 0.35; y < Math.min(yHi - 0.2, skinTop - 0.2); y += 0.25) {
const pa = ridgeAt(y); if (pa == null) continue;
let sx = -1e9; for (const q of sv) if (Math.abs(q[1] - y) < 0.13) sx = Math.max(sx, q[0]);
if (sx < -1e8) continue;
bands++; const gap = pa - sx;
if (-gap > worstAft) { worstAft = -gap; yAft = y; }
if (gap > worstGap) { worstGap = gap; yGap = y; }
}
if (!bands) say(v.id, 'a sternpost that shares no height with the planking', `post ${yLo.toFixed(2)}..${yHi.toFixed(2)} m`);
if (worstAft > 0.05)
say(v.id, 'planking standing abaft its sternpost', `skin ${worstAft.toFixed(2)} m abaft the post's after face at ${yAft.toFixed(2)} m — the planks close on the post, not past it`);
if (worstGap > 0.45)
say(v.id, 'daylight between the planking and the sternpost', `skin ${worstGap.toFixed(2)} m short of the post's after face at ${yGap.toFixed(2)} m`);
if (SP.hoodEndHalfBreadthM != null) {
let worstW = 0, yW = 0;
for (let y = yLo + 0.35; y < Math.min(yHi - 0.2, skinTop - 0.2); y += 0.25) {
let sx = -1e9; for (const q of sv) if (Math.abs(q[1] - y) < 0.13) sx = Math.max(sx, q[0]);
if (sx < -1e8) continue;
let w = 0; for (const q of sv) if (Math.abs(q[1] - y) < 0.13 && q[0] > sx - 0.10) w = Math.max(w, Math.abs(q[2]));
if (w > worstW) { worstW = w; yW = y; }
}
if (worstW > SP.hoodEndHalfBreadthM + 0.12)
say(v.id, "the planking's hood ends standing off the post", `${worstW.toFixed(2)} m half-breadth at the skin's after end at ${yW.toFixed(2)} m, the record's rabbet ${SP.hoodEndHalfBreadthM} — an end face, not a rabbet`);
}
}
}
}
if (H.stem && H.stem.form === 'straight' && H.stem.angleToKeelDeg != null) {
const ST = H.stem;
const stem = (() => { let r = null; g.traverse(o => {
if (!r && o.isMesh && (o.name === 'Stem' || (o.userData.part && o.userData.part.name === 'Stem'))) r = o; }); return r; })();
const world = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
if (!stem) say(v.id, 'a straight stem with no stem drawn', 'record gives stem.form straight; no Stem mesh');
else {
const pv = world(stem), ridge = new Map();
for (const q of pv) { const k = Math.round(q[1] * 100); ridge.set(k, Math.min(ridge.get(k) ?? 1e9, q[0])); }
const ks = [...ridge.keys()].sort((a, b) => a - b);
const yLo = ks[0] / 100, yHi = ks[ks.length - 1] / 100;
const pts = ks.filter(k => k / 100 > yLo + 0.2 && k / 100 < yHi - 0.2).map(k => [k / 100, ridge.get(k)]);
const n = pts.length; let sy = 0, sx = 0, syy = 0, sxy = 0;
for (const [y, x] of pts) { sy += y; sx += x; syy += y * y; sxy += x * y; }
const slope = n > 2 ? (n * sxy - sx * sy) / (n * syy - sy * sy) : 0, icpt = n ? (sx - slope * sy) / n : 0;
const wantTan = -Math.tan((ST.angleToKeelDeg - 90) * Math.PI / 180);
let worst = 0; for (const [y, x] of pts) worst = Math.max(worst, Math.abs(x - (icpt + slope * y)));
if (n < 3) say(v.id, 'a stem too short to read', `${n} centimetres of forward face`);
else {
if (Math.abs(slope - wantTan) > 0.05)
say(v.id, 'the stem off its attested angle', `${(90 - Math.atan(slope) * 180 / Math.PI).toFixed(1)}° to the keel drawn, the record says ${ST.angleToKeelDeg}`);
if (worst > 0.08)
say(v.id, 'a straight stem drawn bent', `forward face ${worst.toFixed(2)} m off its own line`);
if (ST.headAboveKeelM != null && Math.abs((yHi + H.draught) - ST.headAboveKeelM) > 0.2)
say(v.id, "the stem's head off its attested height", `${(yHi + H.draught).toFixed(2)} m over the keel, the record says ${ST.headAboveKeelM}`);
if (yLo > -H.draught + 0.2)
say(v.id, 'a stem whose foot stands above the keel', `foot ${(yLo + H.draught).toFixed(2)} m over the keel's rabbet`);
const SPd = H.sternpost && H.sternpost.form === 'straight' ? H.sternpost : null;
if (SPd && SPd.footAbaftStationDatumM != null && ST.footForwardOfStationDatumM != null) {
const posts = []; g.traverse(o => { if (o.isMesh && (o.name === 'Sternpost' || (o.userData.part && o.userData.part.name === 'Sternpost'))) posts.push(o); });
if (posts.length) {
const qv = [].concat(...posts.map(world)); let yMin = 1e9; for (const q of qv) yMin = Math.min(yMin, q[1]);
let heelX = -1e9; for (const q of qv) if (q[1] < yMin + 0.15) heelX = Math.max(heelX, q[0]);
const datumX = heelX - SPd.footAbaftStationDatumM;
let footX = 1e9; for (const q of pv) if (q[1] < yLo + 0.15) footX = Math.min(footX, q[0]);
const got = datumX - footX;
if (Math.abs(got - ST.footForwardOfStationDatumM) > 0.25)
say(v.id, "the stem's foot off the plate's station", `${got.toFixed(2)} m forward of the datum (datum x ${datumX.toFixed(2)}, foot x ${footX.toFixed(2)}), the record says ${ST.footForwardOfStationDatumM}`);
}
}
}
const skins = []; g.traverse(o => { const p = o.userData && o.userData.part; if (o.isMesh && p && p.key === 'planking') skins.push(o); });
if (!skins.length) say(v.id, 'a straight stem with no planking to close on it', 'no planking mesh');
else {
const sv = [].concat(...skins.map(world)); let skinTop = -1e9; for (const q of sv) skinTop = Math.max(skinTop, q[1]);
const ridgeAt = y => { const k = Math.round(y * 100); let best = null, bd = 1e9;
for (const kk of ks) { const d = Math.abs(kk - k); if (d < bd) { bd = d; best = kk; } } return bd <= 3 ? ridge.get(best) : null; };
let worstFwd = 0, worstGap = 0, yFwd = 0, yGap = 0, bands = 0, worstW = 0, yW = 0;
for (let y = yLo + 0.35; y < Math.min(yHi - 0.2, skinTop - 0.2); y += 0.25) {
const pf = ridgeAt(y); if (pf == null) continue;
let sx = 1e9; for (const q of sv) if (Math.abs(q[1] - y) < 0.13) sx = Math.min(sx, q[0]);
if (sx > 1e8) continue;
bands++; const gap = sx - pf;
if (-gap > worstFwd) { worstFwd = -gap; yFwd = y; }
if (gap > worstGap) { worstGap = gap; yGap = y; }
if (ST.hoodEndHalfBreadthM != null) {
let w = 0; for (const q of sv) if (Math.abs(q[1] - y) < 0.13 && q[0] < sx + 0.10) w = Math.max(w, Math.abs(q[2]));
if (w > worstW) { worstW = w; yW = y; }
}
}
if (!bands) say(v.id, 'a stem that shares no height with the planking', `stem ${yLo.toFixed(2)}..${yHi.toFixed(2)} m`);
if (worstFwd > 0.05)
say(v.id, 'planking standing forward of its stem', `skin ${worstFwd.toFixed(2)} m forward of the stem's face at ${yFwd.toFixed(2)} m — the planks close on the stem, not past it`);
if (worstGap > 0.45)
say(v.id, 'daylight between the planking and the stem', `skin ${worstGap.toFixed(2)} m short of the stem's face at ${yGap.toFixed(2)} m`);
if (ST.hoodEndHalfBreadthM != null && worstW > ST.hoodEndHalfBreadthM + 0.12)
say(v.id, "the planking's hood ends standing off the stem", `${worstW.toFixed(2)} m half-breadth at the skin's forward end at ${yW.toFixed(2)} m, the record's rabbet ${ST.hoodEndHalfBreadthM} — an end face, not a rabbet`);
}
}
}
if (H.castle && H.castle.plan) {
const P = H.castle.plan;
const byName = nm => { const r = []; g.traverse(o => { if (o.isMesh && o.name === nm) r.push(o); }); return r; };
const world = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
const bbox = o => { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
for (const q of world(o)) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.min(b[2], q[2]); b[3] = Math.max(b[3], q[0]); b[4] = Math.max(b[4], q[1]); b[5] = Math.max(b[5], q[2]); }
return b; };
const decks = byName('castle-deck');
if (!decks.length) say(v.id, 'a castle plan with no deck', 'record gives castle.plan; no castle-deck mesh');
else {
const dv = [].concat(...decks.map(world));
let xF = 1e9, xA = -1e9, yD = -1e9;
for (const q of dv) { xF = Math.min(xF, q[0]); xA = Math.max(xA, q[0]); yD = Math.max(yD, q[1]); }
const post = (() => { let r = null; g.traverse(o => {
if (!r && o.isMesh && (o.name === 'Sternpost' || (o.userData.part && o.userData.part.name === 'Sternpost'))) r = o; }); return r; })();
const ST = H.castle.stationsFromHeelM || null;
let heelX = -1e9;
if (post) { const pv0 = world(post); let yMin = 1e9; for (const q of pv0) yMin = Math.min(yMin, q[1]);
for (const q of pv0) if (q[1] < yMin + 0.15) heelX = Math.max(heelX, q[0]);
heelX -= ((v.hull.sternpost && v.hull.sternpost.form === 'straight' && v.hull.sternpost.footAbaftStationDatumM) || 0); }
const len = xA - xF;
const wantL = ST && heelX > -1e8 ? xA - (heelX - ST.wingFwd) : P.aftLenM + P.sideLenM;
if (Math.abs(len - wantL) > 0.15)
say(v.id, "a castle off the record's length", `${len.toFixed(2)} m of deck, the ${ST ? 'plate' : 'plan'} says ${wantL.toFixed(2)}`);
if (ST && heelX > -1e8 && Math.abs((heelX - xF) - ST.wingFwd) > 0.3)
say(v.id, "the castle's forward end off the plate's station",
`wing ends ${(heelX - xF).toFixed(2)} m forward of the heel, the plate says ${ST.wingFwd}`);
if (!post) say(v.id, 'a castle with no post to overhang', 'no Sternpost mesh');
else {
const pv = world(post); let top = -1e9; for (const q of pv) top = Math.max(top, q[1]);
let xp = -1e9; for (const q of pv) if (q[1] > top - 0.3) xp = Math.max(xp, q[0]);
const ovh = H.castle.overhangAftM != null ? H.castle.overhangAftM : 0.7;
if (ST && ST.aftEdge != null && heelX > -1e8) {
if (Math.abs((xA - heelX) + ST.aftEdge) > 0.3)
say(v.id, "the castle's after edge off the plate's station", `after edge ${(xA - heelX).toFixed(2)} m abaft the heel, the plate says ${-ST.aftEdge}`);
} else if (Math.abs((xA - xp) - ovh) > 0.25)
say(v.id, "a castle off the record's overhang", `after edge ${(xA - xp).toFixed(2)} m abaft the post's head, record says ${ovh}`);
if (xA - xp > 1.5)
say(v.id, 'a castle hanging past its stern', `after edge ${(xA - xp).toFixed(2)} m abaft the post's head — the stern beams cannot carry that`);
}
const halfAt = (x0, x1) => { let w = 0; for (const q of dv) if (q[0] >= x0 && q[0] <= x1) w = Math.max(w, Math.abs(q[2])); return w; };
const xT = ST && heelX > -1e8 ? heelX - ST.aftPartFwd : xA - P.aftLenM;
const wFwd = halfAt(xT - 0.35, xT + 0.35), wAft = halfAt(xA - 0.35, xA + 0.01);
if (Math.abs(2 * wFwd - P.aftBreadthFwdM) > 0.2)
say(v.id, "the castle off the plan's forward breadth", `${(2 * wFwd).toFixed(2)} m at the after part's forward edge, record says ${P.aftBreadthFwdM}`);
if (Math.abs(2 * wAft - P.aftBreadthAftM) > 0.2)
say(v.id, "the castle off the plan's after breadth", `${(2 * wAft).toFixed(2)} m at the after edge, record says ${P.aftBreadthAftM}`);
let innermost = 1e9; for (const q of dv) if (q[0] < xT - 0.35) innermost = Math.min(innermost, Math.abs(q[2]));
const wantIn = P.aftBreadthFwdM / 2 - P.sideBreadthM;
if (Math.abs(innermost - wantIn) > 0.15)
say(v.id, "the wings off the plan's breadth", `deck reaches to ${innermost.toFixed(2)} m of the centreline along the wings; ${P.sideBreadthM} m wings on a ${P.aftBreadthFwdM} m front leave ${wantIn.toFixed(2)}`);
const heck = byName('castle-heckbalken');
if (heck.length < 2) say(v.id, 'a castle with no stern beams', `${heck.length} castle-heckbalken; the after posts stand on two (Westphal)`);
for (const hb of heck) {
const b = bbox(hb);
if (yD - b[4] < 1.0) say(v.id, 'a stern beam up in the castle', `top ${(yD - b[4]).toFixed(2)} m under the castle deck`);
const w = Math.max(-b[2], b[5]), wc = halfAt(b[0] - 0.4, b[3] + 0.4);
if (wc - w > 0.3) say(v.id, "a stern beam short of the castle's side", `reaches ${w.toFixed(2)} m, the deck ${wc.toFixed(2)}`);
}
const walls = byName('castle-wall'), wantB = H.castle.wallBoards || 17;
const stbd = walls.filter(w => bbox(w)[5] > 0).length, portN = walls.length - stbd;
if (stbd !== wantB || portN !== wantB)
say(v.id, "the castle wall off the record's board count", `${stbd} / ${portN} boards a side, record says ${wantB}`);
for (const w of walls) { const b = bbox(w); if (b[4] - b[1] < 0.6) { say(v.id, 'a castle board that is not a board', `${(b[4] - b[1]).toFixed(2)} m tall`); break; } }
if (byName('castle-wall-lower').length < 8)
say(v.id, 'a castle wall with no lower part', 'three stringers and a plank below the deck (Westphal); fewer than 8 castle-wall-lower');
if (walls.length) { const b = bbox(walls[0]), h = b[4] - yD;
if (h < 0.8 || h > 1.4) say(v.id, 'a castle wall nobody could stand behind', `${h.toFixed(2)} m over the deck`); }
const tl = byName('rudder-tiller');
if (tl.length) {
const tb = bbox(tl[0]); let hit = null;
g.traverse(o => { if (hit || !o.isMesh || !/^castle-(wall|wall-lower|wall-aft|wall-wing|heckbalken|beam|post|longitudinal|cabin.*|door)$/.test(o.name)) return;
const b = bbox(o);
if (b[0] < tb[3] && b[3] > tb[0] && b[1] < tb[4] && b[4] > tb[1] && b[2] < tb[5] && b[5] > tb[2]) hit = o.name; });
if (hit) say(v.id, 'the castle across the tiller', `${hit} crosses the tiller's box`);
}
}
}
{
const fr = []; g.traverse(o => { const p = tagOf(o); if (o.isMesh && p && p.key === 'frames' && /^Frame \d+ of \d+$/.test(p.name || '')) fr.push(o); });
if (fr.length > 1) {
const worldF = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
const REC = !!(H.frames && H.frames.roomAndSpaceM);
const siding = REC ? (H.frames.sidedM || 0.18) : 0.016 * (H.lwl || H.loa);
const allow = siding * (REC && H.frames.laps && H.frames.laps.length ? 2 : 1) + 0.06;
let worst = null;
for (const f of fr) {
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
for (const q of worldF(f)) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
const span = x1 - x0;
if (span > allow && (!worst || span > worst.span)) worst = { span, y0, y1, name: tagOf(f).name, n: 0 };
if (span > allow && worst) worst.n++;
}
if (worst)
say(v.id, 'a frame drawn on a slant', `${worst.name} spans ${worst.span.toFixed(2)} m of x over ${(worst.y1 - worst.y0).toFixed(2)} m of height, a timber ${allow.toFixed(2)} m fore and aft at most${worst.n > 1 ? ' (' + worst.n + ' frames over)' : ''}`);
}
}
if (H.deck && H.deck.belowSheerM) {
const byName = nm => { const r = []; g.traverse(o => { if (o.isMesh && o.name === nm) r.push(o); }); return r; };
const world = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
const bbox = o => { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
for (const q of world(o)) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.min(b[2], q[2]); b[3] = Math.max(b[3], q[0]); b[4] = Math.max(b[4], q[1]); b[5] = Math.max(b[5], q[2]); }
return b; };
let skin = null; g.traverse(o => { const p = tagOf(o); if (!skin && o.isMesh && p && p.key === 'planking') skin = o; });
const deckMeshes = []; g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'deck' && !/Waterplane|Gunwale|log/i.test(p.name || '')) deckMeshes.push(o); });
if (!skin || !deckMeshes.length)
say(v.id, 'a deck record with no deck to measure', `${skin ? '' : 'no planking mesh; '}${deckMeshes.length} deck mesh(es)`);
else {
const sv = world(skin), dv = [].concat(...deckMeshes.map(world));
const L = H.lwl || H.loa;
const skinTopNear = x => { let t = -1e9; for (const q of sv) if (Math.abs(q[0] - x) < 0.5) t = Math.max(t, q[1]); return t; };
const skinHalfNear = (x, y) => { let w = 0; for (const q of sv) if (Math.abs(q[0] - x) < 0.3 && Math.abs(q[1] - y) < 0.3) w = Math.max(w, Math.abs(q[2])); return w; };
const deckEdgeNear = x => { let e = 1e9, best = 0.5; for (const q of dv) { const d = Math.abs(q[0] - x);
if (d < best - 1e-6) { best = d; e = q[1]; } else if (d <= best + 1e-6) e = Math.min(e, q[1]); } return e; };
const gapBeam = (H.deck.beamHeightsFromKeelM && H.deck.deckAboveBeamCentreM != null)
? H.deck.deckAboveBeamCentreM - (H.deck.beamSidedM || 0.30) / 2 : 0.02;
const top0 = skinTopNear(0), edge0 = deckEdgeNear(0);
if (edge0 > 1e8) say(v.id, 'a deck with no midship edge', 'no deck vertex within 0.5 m of midships');
else if (Math.abs((top0 - edge0) - H.deck.belowSheerM) > 0.15)
say(v.id, "a deck off the record's depth", `${(top0 - edge0).toFixed(2)} m under the top strake at midships, record says ${H.deck.belowSheerM}`);
if (H.deck.level) {
const eF = deckEdgeNear(-0.3 * L), eA = deckEdgeNear(0.3 * L);
if (eF < 1e8 && eA < 1e8 && Math.abs(eF - eA) > 0.1)
say(v.id, 'a level deck that is not level', `edge ${eF.toFixed(2)} m at u 0.2, ${eA.toFixed(2)} at u 0.8`);
}
if (H.deck.throughBeams) {
const beams = byName('deck-beam');
if (beams.length !== H.deck.throughBeams)
say(v.id, "through-beams off the record's count", `${beams.length} deck-beam, record says ${H.deck.throughBeams}`);
for (const bm of beams) {
const b = bbox(bm), xc = (b[0] + b[3]) / 2, half = skinHalfNear(xc, (b[1] + b[4]) / 2), edge = deckEdgeNear(xc);
if (b[5] < half + 0.1 || -b[2] < half + 0.1) {
say(v.id, 'a through-beam that does not come through', `reaches ${Math.min(b[5], -b[2]).toFixed(2)} m, the skin ${half.toFixed(2)} at x ${xc.toFixed(1)}`); }
if (edge < 1e8 && (b[4] > edge - gapBeam + 0.04 || b[4] < edge - gapBeam - 0.15))
say(v.id, 'a through-beam off its deck', `top ${b[4].toFixed(2)} m, the deck's edge ${edge.toFixed(2)} at x ${xc.toFixed(1)}, wanted ${gapBeam.toFixed(2)} under it`);
}
if (H.deck.beamStations) {
const rsB = H.frames && H.frames.roomAndSpaceM, nFB = rsB ? Math.floor(0.89 * L / rsB) + 1 : 0;
const oUB = H.frames && H.frames.originU !== undefined ? H.frames.originU : 0.055;
const uvB = skin.geometry.attributes.uv;
const bxs = beams.map(bm => { const b = bbox(bm); return { x: (b[0] + b[3]) / 2, y: (b[1] + b[4]) / 2 }; });
if (H.deck.beamStations.length !== H.deck.throughBeams)
say(v.id, "beam stations off the record's count", `${H.deck.beamStations.length} stations, throughBeams ${H.deck.throughBeams}`);
H.deck.beamStations.forEach((st, i) => {
const label = st.name || ('beam ' + (i + 1));
if (H.stem && H.stem.form === 'straight' && H.deck.beamHeadsFromHeelM && H.deck.beamHeadsFromHeelM[i] != null) return;
let u;
if (st.u !== undefined) u = st.u;
else if (rsB) u = oUB + 0.89 * st.spant / (nFB - 1);
else { say(v.id, 'a beam station named by frame number on a record with no frame pitch', `${label}: Spant ${st.spant}, no frames.roomAndSpaceM`); return; }
const yRef = bxs.length ? bxs[0].y : deckEdgeNear(0);
let want = (u - 0.5) * L;
if (uvB) {
let best = 1e9; for (let k = 0; k < uvB.count; k++) best = Math.min(best, Math.abs(uvB.getX(k) - u));
let dy = 1e9; for (let k = 0; k < uvB.count; k++) if (Math.abs(uvB.getX(k) - u) <= best + 1e-6 && Math.abs(sv[k][1] - yRef) < dy) { dy = Math.abs(sv[k][1] - yRef); want = sv[k][0]; }
}
let near = 1e9; for (const q of bxs) near = Math.min(near, Math.abs(q.x - want));
if (near > 0.15)
say(v.id, "a through-beam off the record's station", `${label} wanted at x ${want.toFixed(2)} m (${st.spant !== undefined ? 'Spant ' + st.spant : 'u ' + u}${st.derived ? ', derived' : ''}), the nearest deck-beam ${near.toFixed(2)} m away`);
});
}
if (H.deck.beamHeadsFromHeelM) {
const want = H.deck.beamHeadsFromHeelM;
if (want.length !== beams.length)
say(v.id, "beam heel distances off the beams' count", `${want.length} distances, ${beams.length} deck-beams`);
const posts = []; g.traverse(o => { const p = tagOf(o); if (o.isMesh && p && p.key === 'stempost' && p.name === 'Sternpost') posts.push(o); });
const pv = posts.length ? [].concat(...posts.map(world)) : sv;
let yMin = 1e9; for (const p of pv) yMin = Math.min(yMin, p[1]);
let heelX = -1e9; for (const p of pv) if (p[1] < yMin + 0.15) heelX = Math.max(heelX, p[0]);
heelX -= ((v.hull.sternpost && v.hull.sternpost.form === 'straight' && v.hull.sternpost.footAbaftStationDatumM) || 0);
const bx = beams.map(bm => { const b = bbox(bm); return (b[0] + b[3]) / 2; }).sort((a, b) => a - b);
want.forEach((d, i) => {
if (i >= bx.length) return;
const got = heelX - bx[i];
if (Math.abs(got - d) > 0.30)
say(v.id, "a through-beam off the sheet's distance from the heel", `beam ${i + 1} of ${bx.length} stands ${got.toFixed(2)} m forward of the heel (heel x ${heelX.toFixed(2)}, ${posts.length ? 'the sternpost' : 'the skin'}), the sheet says ${d.toFixed(2)}`);
});
}
if (H.deck.beamHeightsFromKeelM) {
const want = H.deck.beamHeightsFromKeelM;
if (want.length !== beams.length)
say(v.id, "beam heights off the beams' count", `${want.length} heights, ${beams.length} deck-beams`);
let datum = 1e9; for (const q of sv) if (Math.abs(q[0]) < 0.5) datum = Math.min(datum, q[1]);
const by = beams.map(bm => { const b = bbox(bm); return { x: (b[0] + b[3]) / 2, y: (b[1] + b[4]) / 2 }; }).sort((a, b) => a.x - b.x);
want.forEach((h, i) => {
if (i >= by.length) return;
const got = by[i].y - datum;
if (Math.abs(got - h) > 0.15)
say(v.id, "a through-beam off the plate's height over the keel", `beam ${i + 1} of ${by.length} centre ${got.toFixed(2)} m over the skin's bottom at midships (y ${datum.toFixed(2)}), the plate says ${h.toFixed(2)}`);
});
}
{
const wet = beams.filter(bm => { const b = bbox(bm); return (b[1] + b[4]) / 2 < 0; });
if (wet.length && !H.draughtCondition)
say(v.id, 'a through-beam under the waterline on a hull whose record does not name its load', `${wet.length} of ${beams.length} deck-beams have their centres under the water at hull.draught ${H.draught}; hull.draughtCondition is not on the record`);
}
const knees = byName('deck-knee');
if (knees.length !== 2 * H.deck.throughBeams)
say(v.id, 'through-beams without their knees', `${knees.length} deck-knee, ${2 * H.deck.throughBeams} wanted for ${H.deck.throughBeams} beams`);
for (const kn of knees) {
const b = bbox(kn), xc = (b[0] + b[3]) / 2, edge = deckEdgeNear(xc), top = skinTopNear(xc);
const reachIn = (yA, yB) => { let w = 0; const pos = kn.geometry.attributes.position, p = new THREE.Vector3();
for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i); kn.localToWorld(p); if (p.y >= yA && p.y <= yB) w = Math.max(w, Math.abs(p.z)); } return w; };
const skinAt = y => { let w = 0; for (const q of sv) if (Math.abs(q[0] - xc) < 0.3 && Math.abs(q[1] - y) < 0.12) w = Math.max(w, Math.abs(q[2])); return w; };
const ends = [['foot', reachIn(b[1] - 0.01, b[1] + 0.3), skinAt(b[1] + 0.3)],
['head', reachIn(b[4] - 0.3, b[4] + 0.01), skinAt(b[4] - 0.3)]];
if (edge < 1e8 && (b[1] > edge - gapBeam + 0.07 || b[1] < edge - gapBeam - 0.35))
say(v.id, 'a knee off its beam', `foot ${b[1].toFixed(2)} m, the deck's edge ${edge.toFixed(2)} at x ${xc.toFixed(1)}, the beam ${gapBeam.toFixed(2)} under it`);
if (b[4] < top - 0.5)
say(v.id, 'a knee that does not reach the top strake', `head ${b[4].toFixed(2)} m, the skin's top ${top.toFixed(2)} at x ${xc.toFixed(1)}`);
for (const [end, out, half] of ends) {
if (half > 0 && out > half + 0.02)
say(v.id, 'a knee outside the planking', `${end} reaches ${out.toFixed(2)} m, the skin ${half.toFixed(2)} at x ${xc.toFixed(1)}`);
if (half > 0 && out < half - 0.30)
say(v.id, 'a knee standing off the planking', `${end} reaches ${out.toFixed(2)} m, the skin ${half.toFixed(2)} at x ${xc.toFixed(1)}; a hand's gap is the build`);
}
}
}
if (H.draughtCondition !== undefined) {
const lc = H.loadConditions || [];
const c = lc.find(q => q.name === H.draughtCondition);
if (!c)
say(v.id, 'a named load condition the record does not carry', `hull.draughtCondition ${JSON.stringify(H.draughtCondition)}, hull.loadConditions ${lc.map(q => q.name).join(', ') || 'absent'}`);
else if (c.draughtM === undefined || Math.abs(c.draughtM - H.draught) > 0.05)
say(v.id, "a draught off the named load condition's", `hull.draught ${H.draught}, the ${H.draughtCondition} condition's draughtM ${c.draughtM}`);
}
if (H.section) {
if (H.section.form !== 'flared')
say(v.id, 'a section form the loft does not build', `hull.section.form ${JSON.stringify(H.section.form)}`);
else {
const rs = H.frames && H.frames.roomAndSpaceM;
const nFr = rs ? Math.max(2, Math.floor(0.89 * L / rs) + 1) : 0;
const oU = H.frames && H.frames.originU !== undefined ? H.frames.originU : 0.055;
const frameU = k => rs ? oU + 0.89 * k / (nFr - 1) : 0.5;
const F0 = H.section.floorHalfFrac || 0, n0 = H.section.power || 2.2;
const rows = (H.section.stations || []).map(s => ({
u: s.u !== undefined ? s.u : frameU(s.spant),
F: s.floorHalfFrac !== undefined ? s.floorHalfFrac : F0,
n: s.power !== undefined ? s.power : n0, spant: s.spant, r: s.railHalfFrac })).sort((a, b) => a.u - b.u);
const formAt = u => {
if (!rows.length) return { F: F0, n: n0 };
if (u <= rows[0].u) return rows[0];
const last = rows[rows.length - 1]; if (u >= last.u) return last;
for (let i = 1; i < rows.length; i++) if (u <= rows[i].u) {
const a = rows[i - 1], b = rows[i], f = (u - a.u) / Math.max(1e-9, b.u - a.u);
return { F: a.F + (b.F - a.F) * f, n: a.n + (b.n - a.n) * f };
}
return last;
};
const uvA = skin.geometry.attributes.uv;
if (rows.length && !uvA)
say(v.id, 'a section record with stations and a skin that carries no u to read them at', `${rows.length} stations`);
const stations = [{ u: 0.5, label: 'midships' }].concat(rows.map(r => ({ u: r.u, r: r.r, label: r.spant !== undefined ? `Spant ${r.spant} (u ${r.u.toFixed(3)})` : `u ${r.u.toFixed(3)}` })));
for (const st of stations) {
let sel;
if (uvA) {
let best = 1e9; for (let i = 0; i < uvA.count; i++) best = Math.min(best, Math.abs(uvA.getX(i) - st.u));
sel = []; for (let i = 0; i < uvA.count; i++) if (Math.abs(uvA.getX(i) - st.u) <= best + 1e-6) sel.push(sv[i]);
} else sel = sv.filter(q => Math.abs(q[0] - (st.u - 0.5) * L) < 0.35);
if (sel.length < 8) { say(v.id, 'a section station with no skin to read', `${st.label}: ${sel.length} vertices`); continue; }
let yTop = -1e9, yKeel = 1e9, wAll = 0, wTop = 0;
for (const q of sel) { yTop = Math.max(yTop, q[1]); yKeel = Math.min(yKeel, q[1]); }
for (const q of sel) { const w = Math.abs(q[2]); wAll = Math.max(wAll, w); if (q[1] > yTop - 0.25) wTop = Math.max(wTop, w); }
if (wAll > wTop + 0.05)
say(v.id, 'a flared section not widest at its rail', `${wAll.toFixed(2)} m half-breadth below the rail, ${wTop.toFixed(2)} at it, at ${st.label}`);
if (st.label === 'midships' && Math.abs(wTop - H.beam / 2) > 0.1)
say(v.id, "a flared section's rail off the record's beam", `${(2 * wTop).toFixed(2)} m across the rail, the record ${H.beam}`);
if (st.r !== undefined && Math.abs(wTop - st.r * H.beam / 2) > 0.1)
say(v.id, "a rail off the record's plan", `${wTop.toFixed(2)} m half-breadth at the rail, the record's ${(st.r * H.beam / 2).toFixed(2)} (${st.r} of the half-beam) at ${st.label}`);
const { F, n } = formAt(st.u), D = yTop - yKeel;
const want = h => wTop * (F + (1 - F) * Math.pow(Math.max(0, 1 - Math.pow(1 - Math.max(0, Math.min(1, h / D)), n)), 1 / n));
let worst = 0, worstH = 0, worstW = 0, worstWant = 0;
for (const q of sel) {
const h = q[1] - yKeel; if (h < 0.05 || h > D - 0.05) continue;
const w = Math.abs(q[2]), e = Math.abs(w - want(h));
if (e > worst) { worst = e; worstH = h; worstW = w; worstWant = want(h); }
}
if (worst > 0.2)
say(v.id, "a flared section off its record's curve", `${worstW.toFixed(2)} m half-breadth at ${worstH.toFixed(2)} m over the keel, the record's curve ${worstWant.toFixed(2)} (F ${F.toFixed(3)}, n ${n.toFixed(2)}, D ${D.toFixed(2)}) at ${st.label}; worst of ${sel.length} vertices`);
}
}
}
if (H.frames && H.frames.roomAndSpaceM) {
const fr = []; g.traverse(o => { const p = tagOf(o); if (o.isMesh && p && p.key === 'frames') fr.push(o); });
const rs = H.frames.roomAndSpaceM; let nWant = Math.floor(0.89 * L / rs) + 1;
if (H.stem && H.stem.form === 'straight' && H.stem.angleToKeelDeg != null && H.sternpost && H.sternpost.form === 'straight'
&& H.sternpost.footAbaftStationDatumM != null && H.stem.footForwardOfStationDatumM != null) {
const kd = 0.055 * H.draught + 0.02, t = 0.05 * H.draught;
const yPF = -H.draught * Math.max(0.06, 1 - (H.riseA || 0)) - kd, yF = -H.draught * Math.max(0.06, 1 - (H.riseF || 0)) - kd;
const datumX = L / 2 + yPF * Math.tan((H.sternpost.angleToKeelDeg - 90) * Math.PI / 180) + t - H.sternpost.footAbaftStationDatumM;
const xFoot = datumX - H.stem.footForwardOfStationDatumM + t;
const xEnd = xFoot + yF * Math.tan((H.stem.angleToKeelDeg - 90) * Math.PI / 180);
const n0 = nWant; nWant = 0;
for (let f = 0; f < n0; f++) if ((0.055 + 0.89 * f / (n0 - 1) - 0.5) * L >= xEnd) nWant++;
}
const nBeams = H.deck.throughBeams || 0;
if (fr.length > nWant || fr.length < nWant - nBeams)
say(v.id, "frames off the record's count", `${fr.length} frames, ${nWant} at ${rs} m over the run (less up to ${nBeams} at the beams)`);
const xs = [], floorArms = [], cutFrames = new Set();
for (const f of fr) {
const b = bbox(f), xc = (b[0] + b[3]) / 2, edge = deckEdgeNear(xc), top = skinTopNear(xc);
xs.push(xc);
const yB = edge < 1e8 ? edge + 0.5 : top - 0.5;
let oq = null; for (const q of world(f)) if (Math.abs(q[1] - yB) < 0.3 && (!oq || Math.abs(q[2]) > Math.abs(oq[2]))) oq = q;
if (oq) {
let dmin = 1e9, halfAt = 0;
for (const s of sv) if (Math.abs(s[0] - oq[0]) < 0.15) {
dmin = Math.min(dmin, Math.hypot(s[1] - oq[1], Math.abs(s[2]) - Math.abs(oq[2])));
if (Math.abs(s[1] - oq[1]) < 0.08) halfAt = Math.max(halfAt, Math.abs(s[2]));
}
if (halfAt > 0 && Math.abs(oq[2]) > halfAt + 0.02)
say(v.id, 'a frame outside the planking', `reaches ${Math.abs(oq[2]).toFixed(2)} m, the skin ${halfAt.toFixed(2)} at x ${xc.toFixed(1)}`);
if (dmin > 0.15)
say(v.id, 'a frame standing off the planking', `outer face ${dmin.toFixed(2)} m from the nearest planking at x ${xc.toFixed(1)}`);
}
if (b[4] < top - 0.5)
say(v.id, 'a frame that does not reach the top strake', `head ${b[4].toFixed(2)} m, the skin's top ${top.toFixed(2)} at x ${xc.toFixed(1)}`);
if (H.frames.headSidedFrac || H.frames.laps) {
const W = world(f);
const st = [];
for (let k = 0; k + 1 < W.length; k += 4)
st.push({ y: W[k][1], x: (W[k][0] + W[k + 1][0]) / 2, z: W[k][2], s: Math.abs(W[k + 1][0] - W[k][0]) });
const all = [[]];
for (let k = 0; k < st.length; k++) {
if (k && (st[k].y < st[k - 1].y - 0.01 || Math.sign(st[k].z) * Math.sign(st[k - 1].z) < 0)) all.push([]);
all[all.length - 1].push(st[k]);
}
for (const sg of [-1, 1]) {
const runs = all.filter(run => Math.sign(run.reduce((a2, r) => a2 + r.z, 0)) === sg);
if (!runs.length) continue;
const headOf = run => Math.max(...run.map(r => r.y)), footOf = run => Math.min(...run.map(r => r.y));
runs.sort((p, q) => headOf(q) - headOf(p));
const top = runs[0], topY = headOf(top), side = sg < 0 ? 'starboard' : 'port';
const tp = H.frames.headTaperM || 0;
let body = top.filter(q => q.y < topY - tp - 0.02).map(q => q.s);
if (!body.length) body = top.slice().sort((a, c) => a.y - c.y).slice(0, 4).map(q => q.s);
body.sort((a, c) => a - c);
const bs = body.length ? body[body.length >> 1] : 0;
const near = top.filter(q => q.y > topY - 0.35 && q.y < topY - 0.12).map(q => q.s);
const topS = top.reduce((m2, q) => (q.y > m2.y ? q : m2), { y: -1e9, s: 0 }).s;
if (H.frames.headSidedFrac && bs && near.length) {
const ratio = Math.max(...near) / bs, want = H.frames.headSidedFrac;
if (ratio > want + 0.12)
say(v.id, 'a futtock head that is not tapered', `siding ${Math.max(...near).toFixed(3)} m under the head, ${bs.toFixed(3)} at the deck (${ratio.toFixed(2)}), record ${want} at x ${xc.toFixed(1)} ${side}`);
if (ratio < want - 0.15)
say(v.id, 'a futtock head tapered past the record', `${ratio.toFixed(2)} of the body's siding, record ${want} at x ${xc.toFixed(1)} ${side}`);
if (H.frames.headRound && topS > 0.5 * bs)
say(v.id, 'a futtock head cut square', `top station ${topS.toFixed(3)} m across, body ${bs.toFixed(3)}, record says rounded, at x ${xc.toFixed(1)} ${side}`);
}
if (H.frames.laps) {
const keelY = Math.min(...runs.map(footOf));
const skinBottom = Math.min(...sv.map(q => q[1]));
const cutF = keelY > skinBottom + 0.15, keelBase = cutF ? skinBottom : keelY;
const wantOf = lp => lp.headAboveKeelM != null ? keelBase + lp.headAboveKeelM : topY - lp.headBelowM;
const laps = H.frames.laps.slice().sort((a, c) => wantOf(c) - wantOf(a)).filter(lp => !cutF || wantOf(lp) > keelY + 0.02);
if (cutF && sg < 0) cutFrames.add(xc.toFixed(2));
const sided = H.frames.sidedM || 0.18;
if (runs.length < laps.length + 1)
say(v.id, 'a frame built as fewer timbers than its laps', `${runs.length} timbers, record ${laps.length} lap(s) at x ${xc.toFixed(1)} ${side}`);
laps.forEach((lp, i) => {
const up = runs[i], lo = runs[i + 1]; if (!up || !lo) return;
const want0 = wantOf(lp), gotHead = headOf(lo);
const alt = lp.altM || 0, isLong = alt > 0 && Math.abs(gotHead - (want0 + alt)) < Math.abs(gotHead - want0);
const wantHead = want0 + (isLong ? alt : 0);
if (Math.abs(gotHead - wantHead) > 0.15)
say(v.id, 'a lap head off the record', `lower timber's head ${gotHead.toFixed(2)} m, record ${wantHead.toFixed(2)} (${lp.headAboveKeelM != null ? lp.headAboveKeelM + ' over the keel' : lp.headBelowM + ' under the top head'}${alt ? (isLong ? ' + ' + alt + ' on the long side' : ', the short side') : ''}) at x ${xc.toFixed(1)} ${side}`);
if (alt > 0) floorArms.push({ x: xc, side: sg, y: gotHead, long: isLong, alt });
const gotLap = gotHead - footOf(up);
if (lp.lapM && Math.abs(gotLap - lp.lapM) > 0.15)
say(v.id, 'a lap off its length', `upper timber's foot ${gotLap.toFixed(2)} m below the lower's head, record ${lp.lapM} at x ${xc.toFixed(1)} ${side}`);
const zLo = footOf(up), zHi = gotHead;
const xAt = (run, y) => {
const q = run.slice().sort((a2, c2) => a2.y - c2.y);
if (y <= q[0].y) return q[0].x; if (y >= q[q.length - 1].y) return q[q.length - 1].x;
let k = 1; while (k < q.length - 1 && q[k].y < y) k++;
const t2 = (y - q[k - 1].y) / Math.max(1e-6, q[k].y - q[k - 1].y);
return q[k - 1].x + t2 * (q[k].x - q[k - 1].x);
};
const xu = up.filter(r => r.y >= zLo + 0.02 && r.y <= zHi - 0.02);
const dx = xu.length ? xu.reduce((s2, r) => s2 + Math.abs(r.x - xAt(lo, r.y)), 0) / xu.length : sided;
if (dx < sided - 0.06)
say(v.id, 'lapped timbers in one another', `${dx.toFixed(2)} m between their centres in the lap, a siding is ${sided} at x ${xc.toFixed(1)} ${side}`);
if (dx > 1.5 * sided)
say(v.id, 'lapped timbers standing apart', `${dx.toFixed(2)} m between their centres in the lap, a siding is ${sided} at x ${xc.toFixed(1)} ${side}`);
const loTop = lo.reduce((m2, q) => (q.y > m2.y ? q : m2), { y: -1e9, s: 0 }).s;
if (H.frames.headRound && bs && loTop > 0.5 * bs)
say(v.id, 'a lap head cut square', `lower timber's top station ${loTop.toFixed(3)} m across, body ${bs.toFixed(3)}, record says rounded, at x ${xc.toFixed(1)} ${side}`);
});
}
}
}
}
const beamX = byName('deck-beam').map(bm => { const b = bbox(bm); return (b[0] + b[3]) / 2; });
if (floorArms.length) {
const byX = new Map();
for (const fa of floorArms) { const k = fa.x.toFixed(2); if (!byX.has(k)) byX.set(k, { x: fa.x }); byX.get(k)[fa.side < 0 ? 's' : 'p'] = fa; }
const fl = [...byX.values()].filter(f => f.s && f.p).sort((a, c) => a.x - c.x);
if (fl.length < fr.length - 1 - cutFrames.size)
say(v.id, 'floors whose arms the rule could not pair', `${fl.length} floors read on both sides of ${fr.length} frames${cutFrames.size ? ' (' + cutFrames.size + ' end on the stem or the post and have none)' : ''}`);
for (const f of fl) {
const d = Math.abs(f.p.y - f.s.y);
if (Math.abs(d - f.p.alt) > 0.15)
say(v.id, "a floor whose arms do not stand the record's height apart", `port arm ${f.p.y.toFixed(2)} m, starboard ${f.s.y.toFixed(2)}, ${d.toFixed(2)} apart, record ${f.p.alt} at x ${f.x.toFixed(1)}`);
f.longSide = f.p.y > f.s.y ? 'port' : 'starboard';
}
for (let i = 1; i < fl.length; i++) {
const skipped = (fl[i].x - fl[i - 1].x) > 1.5 * rs;
const same = fl[i].longSide === fl[i - 1].longSide;
if (same !== skipped)
say(v.id, skipped ? 'floors across a skipped station long on different sides' : 'neighbouring floors long on the same side', `${fl[i - 1].longSide} at x ${fl[i - 1].x.toFixed(1)} and ${fl[i].longSide} at x ${fl[i].x.toFixed(1)}${skipped ? ' (a station skipped between)' : ''}`);
}
}
xs.sort((a, b) => a - b);
for (let i = 1; i < xs.length; i++) {
const d = xs[i] - xs[i - 1];
const beamIn = beamX.some(x => x > xs[i - 1] && x < xs[i]);
if (d < rs - 0.1 || (d > rs + 0.1 && !beamIn) || d > 2.3 * rs + 0.05)
say(v.id, 'frames off their pitch', `${d.toFixed(2)} m between frames at x ${xs[i - 1].toFixed(1)} and ${xs[i].toFixed(1)}, record ${rs}${beamIn ? ' (a beam stands between)' : ''}`);
}
}
if (H.castle && H.castle.plan) {
const cd = byName('castle-deck'); let yC = -1e9, x0 = 1e9, x1 = -1e9;
for (const q of [].concat(...cd.map(world))) { yC = Math.max(yC, q[1]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }
let under = 1e9; for (const q of dv) if (q[0] >= x0 && q[0] <= x1) under = Math.min(under, q[1]);
if (H.castle.deckAboveKeelM != null) {
let datumC = 1e9; for (const q of sv) if (Math.abs(q[0]) < 0.5) datumC = Math.min(datumC, q[1]);
if (cd.length && Math.abs((yC - datumC) - H.castle.deckAboveKeelM) > 0.15)
say(v.id, "a castle deck off the record's height over the keel", `${(yC - datumC).toFixed(2)} m over the skin's bottom at midships, record says ${H.castle.deckAboveKeelM}`);
} else {
const want = H.castle.deckHM || 1.95;
if (cd.length && under < 1e8 && Math.abs((yC - under) - want) > 0.15)
say(v.id, 'a castle deck off its headroom', `${(yC - under).toFixed(2)} m over the main deck's edge, record says ${want}`);
}
}
if (part.rail && part.rail.y[0] < top0 - 0.3)
say(v.id, 'a rail that followed the deck down', `rail from ${part.rail.y[0].toFixed(2)} m, the skin's top at midships ${top0.toFixed(2)}`);
if (edge0 < 1e8 && edge0 < 0.2)
say(v.id, 'a deck at the waterline', `edge ${edge0.toFixed(2)} m over the water at midships — she floods`);
}
}
{
let skin = null; g.traverse(o => { const p = tagOf(o); if (!skin && o.isMesh && p && p.key === 'planking') skin = o; });
const geo = skin && skin.geometry;
if (geo && geo.index && geo.attributes.normal) {
const P = geo.attributes.position, Nn = geo.attributes.normal, I = geo.index;
let bad = 0, tot = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
let flat = 0, fx0 = 1e9, fx1 = -1e9, fy0 = 1e9, fy1 = -1e9;
for (let t = 0; t < I.count; t += 3) {
const a = I.getX(t), b = I.getX(t + 1), c = I.getX(t + 2);
const ax = P.getX(a), ay = P.getY(a), az = P.getZ(a);
const e1x = P.getX(b) - ax, e1y = P.getY(b) - ay, e1z = P.getZ(b) - az;
const e2x = P.getX(c) - ax, e2y = P.getY(c) - ay, e2z = P.getZ(c) - az;
const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
if (Math.hypot(nx, ny, nz) / 2 < 1e-4) continue;
tot++;
const sx = Nn.getX(a) + Nn.getX(b) + Nn.getX(c), sy = Nn.getY(a) + Nn.getY(b) + Nn.getY(c), sz = Nn.getZ(a) + Nn.getZ(b) + Nn.getZ(c);
const ln = Math.hypot(nx, ny, nz), ls = Math.hypot(sx, sy, sz) || 1;
const cos = (nx * sx + ny * sy + nz * sz) / (ln * ls);
if (cos < -0.5) { bad++; x0 = Math.min(x0, ax); x1 = Math.max(x1, ax); y0 = Math.min(y0, ay); y1 = Math.max(y1, ay); }
else if (Math.abs(cos) < 0.3) { flat++; fx0 = Math.min(fx0, ax); fx1 = Math.max(fx1, ax); fy0 = Math.min(fy0, ay); fy1 = Math.max(fy1, ay); }
}
if (bad) say(v.id, 'skin faces wound against their normals', `${bad} of ${tot} triangles, at x ${x0.toFixed(1)} to ${x1.toFixed(1)}, y ${y0.toFixed(1)} to ${y1.toFixed(1)}`);
if (flat) say(v.id, 'skin faces with no normal of their own', `${flat} of ${tot} triangles carry a normal lying in their own plane, at x ${fx0.toFixed(1)} to ${fx1.toFixed(1)}, y ${fy0.toFixed(1)} to ${fy1.toFixed(1)}`);
}
}
{
const onePiece = H.build === 'dugout';
const metal = H.build === 'iron' || H.build === 'steel';
for (const k of ['stempost', 'wale', 'keel', 'frames']) {
const belongs = k === 'stempost' ? !onePiece && H.build !== 'bulkhead'
: k === 'wale' ? !onePiece && !metal
: !onePiece;
if (onePiece && part[k])
say(v.id, 'assembly timber on a one-piece hull',
`${part[k].n} ${k} mesh(es) drawn on a hull the record calls one piece`);
else if (belongs && !part[k])
say(v.id, `an assembled ship lost her ${k}`,
`build ${H.build} is assembled from members, and no ${k} is drawn`);
}
}
{
const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
if (undecked && part.deck) {
g.updateMatrixWorld(true);
const rc = new THREE.Raycaster();
const lanes = H.doubleHull ? [-(H.hullSep || 0) / 2, (H.hullSep || 0) / 2] : [0];
for (const lane of lanes) {
let deepest = 1e9;
for (const u of [0.35, 0.45, 0.55, 0.65, 0.75]) {
const x = (u - 0.5) * H.lwl;
rc.set(new THREE.Vector3(x, 50, lane), new THREE.Vector3(0, -1, 0));
const hit = rc.intersectObject(g, true)
.find(h => { for (let e = h.object; e; e = e.parent)
if (e.visible === false) return false;
const p = tagOf(h.object);
return !p || p.name !== 'Waterplane mask'; });
if (hit) deepest = Math.min(deepest, hit.point.y);
}
if (deepest > -0.02)
say(v.id, 'an undecked hull is capped',
`rays down the ${lane ? (lane < 0 ? 'port' : 'starboard') + ' hull ' : ''}`
+ `centreline bottom out at ${deepest === 1e9 ? 'nothing' : deepest.toFixed(2) + ' m'}`
+ ' — the record lays no deck, so the view should reach the floor of the '
+ 'hollow, below the load waterline');
}
} else if (!undecked && part.deck && part.deck.y[0] < -0.02)
say(v.id, 'a decked hull opened up',
`deck geometry reaches down to ${part.deck.y[0].toFixed(2)} m — below the load `
+ 'waterline, where no laid deck belongs; the open-hull gate has widened');
if (undecked && part.rail)
say(v.id, 'a capping rail on a hull with no deck edge',
`${part.rail.n} rail mesh(es) drawn, but the record lays no deck — the rim `
+ 'of the hull wall is the gunwale');
else if (!undecked && !part.rail)
say(v.id, 'a decked hull lost her rail',
'every decked hull carries her capping (empty spans come out '
+ 'vertex-identical, but the mesh exists), and none is drawn');
}
if (H.__mastTops && H.__mastTops.length) {
const mastBoxes = [];
g.traverse(o => { if (o.isMesh && tagOf(o) && tagOf(o).key === 'mast')
mastBoxes.push(new THREE.Box3().setFromObject(o)); });
H.__mastTops.forEach((mt, i) => {
let my = -1e9;
mastBoxes.forEach(b2 => {
if (mt.x > b2.min.x - 3 && mt.x < b2.max.x + 3) my = Math.max(my, b2.max.y);
});
if (my > -1e9 && mt.y - my > 0.5)
say(v.id, 'stay anchored above its own truck',
`mast ${i} stay collar at ${mt.y.toFixed(1)} m vs drawn truck ${my.toFixed(1)} m`);
});
}
if (typeof H.bowTopM === 'number' && typeof H.freeboard === 'number') {
const expect = H.freeboard + (H.sheerBow || 0);
if (Math.abs(expect - H.bowTopM) > 0.4)
say(v.id, 'a bow the record measured but the sheer ignores',
`freeboard ${H.freeboard} + sheerBow ${H.sheerBow} draws the stem head at `
+ `${expect.toFixed(1)} m against the plates' bowTopM ${H.bowTopM} m`);
else {
g.updateMatrixWorld(true);
const rc = new THREE.Raycaster();
let worst = 0, at = null;
for (const u of [0.01, 0.02, 0.03]) {
const line = H.freeboard + (H.sheerBow || 0) * Math.pow(1 - 2 * u, 2.8);
rc.set(new THREE.Vector3((u - 0.5) * H.lwl, 50, 0), new THREE.Vector3(0, -1, 0));
const hit = rc.intersectObject(g, true)
.find(ht => { for (let e = ht.object; e; e = e.parent)
if (e.visible === false) return false;
const p = tagOf(ht.object);
return !p || p.name !== 'Waterplane mask'; });
if (hit && Math.abs(hit.point.y - line) > worst) {
worst = Math.abs(hit.point.y - line); at = { u, hit: hit.point.y, line };
}
}
if (worst > 0.65)
say(v.id, 'a drawn bow off its own recorded sheer line',
`ray at u ${at.u} lands ${at.hit.toFixed(2)} m where the record's sheer `
+ `line runs ${at.line.toFixed(2)} m (bowTopM ${H.bowTopM})`);
}
}
if (H.tierAftU && H.decks && H.lwl) {
const nT = H.decks, baseT = H.freeboard || 0,
dhT = H.deckM || Math.min((H.beam || 0) * 0.105, 3.0);
const fl = i => (i <= 0) ? baseT
: (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
: baseT + dhT * i;
const rcT = new THREE.Raycaster();
const zs = [0, (H.beam || 10) * 0.2, -(H.beam || 10) * 0.2];
const drop = (x, z) => {
rcT.set(new THREE.Vector3(x, 90, z), new THREE.Vector3(0, -1, 0));
const hit = rcT.intersectObject(g, true)
.find(ht => { for (let e = ht.object; e; e = e.parent)
if (e.visible === false) return false;
const p = tagOf(ht.object);
return !p || p.name !== 'Waterplane mask'; });
return hit ? hit.point.y : -1;
};
for (const k in H.tierAftU) {
const i = +k;
if (!(i > 0 && i < nT - 1)) continue;
const wall = (H.tierAftU[k] - 0.5) * H.lwl, roof = fl(i + 1);
const sagK = (H.tierRound && H.tierRound[k]) ? H.tierRound[k].sagittaM : 0;
const fwd = Math.max(...zs.map(z => drop(wall - 0.6, z)));
const aft = Math.min(...zs.map(z => drop(wall + sagK + 0.6, z)));
if (fwd < roof - 0.5)
say(v.id, 'a terrace the record pins but the drawn tier ignores',
`tier ${i} pinned aft at u ${H.tierAftU[k]} yet the ray just forward of the `
+ `pin lands ${fwd.toFixed(2)} m where the tier roof runs ${roof.toFixed(2)} m`);
else if (aft > roof - 0.5)
say(v.id, 'a tier drawn past its recorded aft pin',
`tier ${i} pinned aft at u ${H.tierAftU[k]} yet the ray just aft of the pin `
+ `still lands ${aft.toFixed(2)} m — the wall stands beyond its own record`);
}
if (H.loa) {
const rakeAllow2 = ((H.stemRake || 0) + (H.sternRake || 0)) * H.loa;
const rakeScale2 = rakeAllow2 > 0
? Math.min(1, Math.max(0, H.loa - H.lwl) / rakeAllow2) : 1;
const tipU = 0.5 + (0.5 * H.lwl + (H.sternRake || 0) * rakeScale2 * H.loa) / H.lwl;
const pins2 = Object.entries(H.tierAftU).map(([k2, p2]) => [+k2, p2]);
if (H.houseAt && H.houseAt.length === 2) pins2.push([0, H.houseAt[1]]);
for (const [i2, p2] of pins2)
if (p2 > tipU - 0.0005)
say(v.id, 'a terrace pinned past the ship\'s own counter',
`tier ${i2} aft pin u ${p2} vs the drawn stern extremity u ${tipU.toFixed(4)}`);
const swept = pins2.filter(([i2, p2]) =>
i2 > 0 && i2 < nT - 1 && p2 > 1.0 && p2 <= tipU - 0.0005);
if (swept.length) {
const HSs2 = SHIPS_HULL.hullSurface(H);
const qAtX2 = (x) => {
let lo = 0, hi = 1;
for (let it = 0; it < 32; it++) {
const q = (lo + hi) / 2;
if ((q - 0.5) * H.lwl + HSs2.rake(q) < x) lo = q; else hi = q;
}
return (lo + hi) / 2;
};
for (const [i2, p2] of swept) {
const xPin = (p2 - 0.5) * H.lwl;
const above = H.tierAftU[String(i2 + 1)];
const xAbove = ((above !== undefined ? above : p2 - 0.05) - 0.5) * H.lwl;
const roof2 = fl(i2 + 1);
for (const f of [0.45, 0.6, 0.75]) {
const x = xAbove + (xPin - xAbove) * f;
const zE = Math.abs(SHIPS_HULL.surfacePoint(H, HSs2, qAtX2(x), 1.0)[2])
- (H.beam || 10) * 0.015 - 0.35;
if (zE < 0.8) continue;
const land = Math.min(drop(x, zE), drop(x, -zE));
if (land < roof2 - 0.5)
say(v.id, 'a counter the record pins but the drawn sweep never reaches',
`tier ${i2} pinned at u ${p2} past the perpendicular, yet the ray one `
+ `waterway inside the true deck edge at x ${x.toFixed(1)} lands `
+ `${land.toFixed(2)} m where the tier roof runs ${roof2.toFixed(2)} m`);
}
}
}
}
{
const HSw = SHIPS_HULL.hullSurface(H);
const edgeZ = (u) => Math.abs(SHIPS_HULL.surfacePoint(H, HSw, u, 1.0)[2])
- (H.beam || 10) * 0.015 - 0.35;
const wrec = H.tierWings || {};
for (const k in wrec) {
const i = +k;
if (!Number.isFinite(i)) continue;
const w = wrec[k];
const face = H.tierAftU[k];
if (face === undefined) {
say(v.id, 'a wing on a tier whose face no record pins',
`tierWings[${k}] with no tierAftU[${k}]`);
continue;
}
if (!(w.aftU > face + 0.004))
say(v.id, 'a wing that does not outrun its own face',
`tierWings[${k}].aftU ${w.aftU} against the tier face u ${face}`);
if (!(w.depthM > 0 && w.depthM < (H.beam || 10) / 2))
say(v.id, 'a wing deeper than the half-beam it stands in',
`tierWings[${k}].depthM ${w.depthM} on beam ${H.beam}`);
const bw = wrec[String(i - 1)];
const below = bw ? bw.aftU
: (i - 1 >= 1 ? H.tierAftU[String(i - 1)]
: (H.houseAt ? H.houseAt[1] : undefined));
if (below !== undefined && w.aftU > below + 1e-6)
say(v.id, 'a wing tip past the floor that carries it',
`tierWings[${k}].aftU ${w.aftU} against the tier-below extent u ${below}`);
const uMid = (face + Math.min(w.aftU,
below !== undefined ? below : w.aftU)) / 2;
const zE = edgeZ(uMid);
if (zE > 0.8) {
const x = (uMid - 0.5) * H.lwl, wroof = fl(i + 1);
const stand = Math.max(drop(x, zE), drop(x, -zE));
if (stand < wroof - 0.5)
say(v.id, 'a recorded wing with no drawn structure',
`tierWings[${k}] pins the tip at u ${w.aftU} yet the deck-edge ray `
+ `at u ${uMid.toFixed(3)} lands ${stand.toFixed(2)} m where the `
+ `wing roof runs ${wroof.toFixed(2)} m`);
const uOpen = Math.max(uMid, face
+ ((H.tierRound && H.tierRound[k]) ? H.tierRound[k].sagittaM : 0)
/ H.lwl + 0.002);
const xO = (uOpen - 0.5) * H.lwl;
const open = Math.min(...[0, (H.beam || 10) * 0.1, -(H.beam || 10) * 0.1]
.map(z => drop(xO, z)));
if (open > wroof - 0.5)
say(v.id, 'a wing drawn as a full-width shelf',
`tier ${k} centreline ray at u ${uOpen.toFixed(3)} lands `
+ `${open.toFixed(2)} m — the tier still crosses the notch the `
+ `record recesses`);
}
}
for (const k in H.tierAftU) {
const i = +k;
if (!(i > 0 && i < nT - 1) || wrec[k]) continue;
const pin = H.tierAftU[k];
const bw2 = wrec[String(i - 1)];
const ext = bw2 ? bw2.aftU
: (i - 1 >= 1 ? H.tierAftU[String(i - 1)] : undefined);
const uProbe = pin + 0.012;
if (ext === undefined || uProbe > ext - 0.005) continue;
const zP = edgeZ(uProbe);
if (zP < 0.8) continue;
const xP = (uProbe - 0.5) * H.lwl;
const landE = Math.max(drop(xP, zP), drop(xP, -zP));
if (landE > fl(i) + 1.5)
say(v.id, 'a wing nobody attested',
`tier ${k} ends at u ${pin} with no tierWings, yet the deck-edge ray `
+ `just aft lands ${landE.toFixed(2)} m — a story above the terrace `
+ `floor ${fl(i).toFixed(2)} m`);
}
}
{
const rrec = H.tierRound || {};
const pitchR = ((H.tierBands && H.tierBands.pitchM) || 2.6) / H.lwl;
for (const k in rrec) {
const i = +k;
if (!Number.isFinite(i)) continue;
const r = rrec[k];
const face = H.tierAftU[k];
if (face === undefined) {
say(v.id, 'a round on a tier whose face no record pins',
`tierRound[${k}] with no tierAftU[${k}]`);
continue;
}
if (!(r.sagittaM > 0.3 && r.sagittaM <= (H.beam || 10) * 0.45))
say(v.id, 'a round the plate cannot support',
`tierRound[${k}].sagittaM ${r.sagittaM} on beam ${H.beam}`);
const wR = (H.tierWings || {})[k];
const boundR = (wR ? wR.aftU
: (i - 1 >= 1 ? H.tierAftU[String(i - 1)]
: (H.houseAt ? H.houseAt[1] : 1))) - pitchR;
const apexU = face + r.sagittaM / H.lwl;
if (apexU >= boundR)
say(v.id, 'a round whose apex outruns its own notch',
`tierRound[${k}] puts the apex at u ${apexU.toFixed(4)} against the `
+ `${wR ? 'wing chamfer' : 'floor below'} at u ${boundR.toFixed(4)}`);
if (i > 0 && i < nT - 1) {
const xR = (face - 0.5) * H.lwl + r.sagittaM * 0.55;
const landR = drop(xR, 0), roofR = fl(i + 1);
if (landR < roofR - 0.5)
say(v.id, 'a recorded round with no drawn bulge',
`tierRound[${k}] attests ${r.sagittaM} m of sweep yet the centreline `
+ `ray at x ${xR.toFixed(1)} lands ${landR.toFixed(2)} m where the `
+ `tier roof runs ${roofR.toFixed(2)} m`);
}
}
for (const k in H.tierAftU) {
const i = +k;
if (!(i > 0 && i < nT - 1) || rrec[k]) continue;
const pin = H.tierAftU[k];
const below = (H.tierWings && H.tierWings[k]) ? H.tierWings[k].aftU
: (i - 1 >= 1 ? H.tierAftU[String(i - 1)] : undefined);
const uC = pin + 1.2 / H.lwl;
if (below !== undefined && uC > below - pitchR) continue;
const landC = drop((uC - 0.5) * H.lwl, 0);
if (landC > fl(i + 1) - 0.5)
say(v.id, 'a bulge nobody attested',
`tier ${k} ends square at u ${pin} with no tierRound, yet the `
+ `centreline ray 1.2 m aft lands ${landC.toFixed(2)} m at the tier's `
+ `own roof height ${fl(i + 1).toFixed(2)} m`);
}
}
}
if (H.decks && H.lwl && !H.turrets && !H.flightDeck && g) {
const n7 = H.decks, B7 = H.beam || 10, L7 = H.lwl;
const HS7 = SHIPS_HULL.hullSurface(H);
const base7 = H.freeboard || 0,
dh7 = H.deckM || Math.min(B7 * 0.105, 3.0);
const fl7 = i => (i <= 0) ? base7
: (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
: base7 + dh7 * i;
const qAtX7 = (x) => {
if (x <= -0.5 * L7 + HS7.rake(0)) return 0;
if (x >= 0.5 * L7 + HS7.rake(1)) return 1;
let lo = 0, hi = 1;
for (let it = 0; it < 32; it++) {
const q = (lo + hi) / 2;
if ((q - 0.5) * L7 + HS7.rake(q) < x) lo = q; else hi = q;
}
return (lo + hi) / 2;
};
const shellTrue7 = x => Math.abs(SHIPS_HULL.surfacePoint(H, HS7, qAtX7(x), 1.0)[2]);
const shellOld7 = u => Math.abs(SHIPS_HULL.surfacePoint(H, HS7,
Math.max(0.001, Math.min(0.999, u)), 1.0)[2]);
const ns7 = H.shellTiers || 0,
taper7 = H.houseTaper !== undefined ? H.houseTaper : 0.16;
const predHalf = (i, x) => {
const sh = i < ns7;
const wid = sh ? B7 : B7 * (1 - taper7 * (0.5 + i / n7));
const ins = sh ? B7 * 0.015 : (taper7 < 0.06 ? B7 * 0.015 : B7 * 0.055);
return Math.max(B7 * 0.06, Math.min(wid / 2, shellTrue7(x) - ins));
};
const T7 = SHIPS_HULL.linerHouse(H);
let pick = null;
for (let i = 0; i < T7.tiers.length; i++) {
const t = T7.tiers[i];
for (const [u7, dir7] of [[t.uA, 1], [t.uB, -1]]) {
const x7 = (u7 - 0.5) * L7, q7 = qAtX7(x7);
if (q7 > 0 && q7 < 1
&& Math.abs((q7 - 0.5) * L7 + HS7.rake(q7) - x7) > 0.02)
say(v.id, 'a station inversion the loft cannot trust',
`tier ${i} edge u ${u7.toFixed(4)}: bisection returns q ${q7.toFixed(5)} `
+ `whose x misses the target by more than 2 cm`);
const bias7 = shellTrue7(x7) - shellOld7(u7);
if (!pick || Math.abs(bias7) > Math.abs(pick.bias))
pick = { i, u: u7, dir: dir7, bias: bias7 };
}
}
if (pick && Math.abs(pick.bias) > 0.5) {
const rc7 = new THREE.Raycaster();
const drop7 = (x, z) => {
rc7.set(new THREE.Vector3(x, 90, z), new THREE.Vector3(0, -1, 0));
const hit = rc7.intersectObject(g, true)
.find(ht => { for (let e = ht.object; e; e = e.parent)
if (e.visible === false) return false;
const p = tagOf(ht.object);
return !p || p.name !== 'Waterplane mask'; });
return hit ? hit.point.y : -1;
};
const xP = (pick.u - 0.5) * L7 + pick.dir * 1.2;
const wall7 = predHalf(pick.i, xP), roof7 = fl7(pick.i + 1);
const inn = Math.min(drop7(xP, wall7 - 0.35), drop7(xP, -(wall7 - 0.35)));
if (inn < roof7 - 0.5)
say(v.id, 'a wall sized off a station it does not stand at',
`tier ${pick.i} edge u ${pick.u.toFixed(3)} carries ${pick.bias.toFixed(2)} m `
+ `of rake bias, yet the ray one margin inside the true wall at x `
+ `${xP.toFixed(1)} lands ${inn.toFixed(2)} m where the tier roof runs `
+ `${roof7.toFixed(2)} m`);
for (const sgn of [1, -1]) {
const outs = Math.min(...[xP - 2, xP, xP + 2]
.map(xx => drop7(xx, sgn * (predHalf(pick.i, xx) + 0.6))));
if (outs > roof7 - 0.5)
say(v.id, 'a wall standing outside the shell station that sizes it',
`tier ${pick.i} edge u ${pick.u.toFixed(3)}: rays just outside the `
+ `predicted wall land ${outs.toFixed(2)} m, at the tier's own roof `
+ `height ${roof7.toFixed(2)} m`);
}
}
}
{
const strips = [];
g.traverse(o => { if (o.isMesh && o.name === 'sternLivery') strips.push(o); });
const sl = H.sternLivery;
if (sl) {
const shellsA = H.shellTiers || 0;
if (!(sl.strakes >= 1) || sl.strakes > shellsA)
say(v.id, 'a livery rise the ship cannot carry',
`sternLivery.strakes ${sl.strakes} against ${shellsA} shell strake(s)`);
if (H.houseAt && H.houseAt.length === 2
&& !(sl.fromU > H.houseAt[0] && sl.fromU < H.houseAt[1] - 0.01))
say(v.id, 'a livery knee outside the house it paints',
`sternLivery.fromU ${sl.fromU} against houseAt [${H.houseAt}]`);
if (!strips.length) {
say(v.id, 'a recorded livery rise with no drawn paint',
`sternLivery attests ${sl.strakes} strake(s) risen and no sternLivery `
+ 'mesh stands in the scene');
} else {
const baseL = H.freeboard || 0,
dhL = H.deckM || Math.min((H.beam || 0) * 0.105, 3.0);
const flL = i => (i <= 0) ? baseL
: (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
: baseL + dhL * i;
const topL = flL(Math.min(sl.strakes, shellsA));
const bb = new THREE.Box3();
strips.forEach(s2 => bb.union(new THREE.Box3().setFromObject(s2)));
if (H.houseAt && H.houseAt.length === 2
&& bb.max.x < (H.houseAt[1] - 0.5) * H.lwl - 1.0)
say(v.id, 'a livery rise that stops short of the stern it paints',
`the strip ends at x ${bb.max.x.toFixed(1)} where the house aft `
+ `extremity runs to x ${((H.houseAt[1] - 0.5) * H.lwl).toFixed(1)}`);
if (Math.abs(bb.max.y - topL) > 0.35 || Math.abs(bb.min.y - baseL) > 0.35)
say(v.id, 'a paint line off its own recorded strake boundary',
`the strip spans y ${bb.min.y.toFixed(2)}–${bb.max.y.toFixed(2)} m where `
+ `the record puts the rise ${baseL.toFixed(2)}–${topL.toFixed(2)} m`);
const ca = strips[0].geometry.getAttribute('color');
const want = new THREE.Color(H.topside || '#3a3a3c');
if (ca && (Math.abs(ca.getX(0) - want.r) > 0.03
|| Math.abs(ca.getY(0) - want.g) > 0.03
|| Math.abs(ca.getZ(0) - want.b) > 0.03))
say(v.id, 'risen paint that is not the topside\'s own',
`strip colour (${ca.getX(0).toFixed(2)}, ${ca.getY(0).toFixed(2)}, `
+ `${ca.getZ(0).toFixed(2)}) against topside ${H.topside}`);
}
} else if (strips.length) {
say(v.id, 'risen paint nobody attested',
`${strips.length} sternLivery mesh(es) stand on a hull whose record `
+ 'carries no sternLivery');
}
}
{
const scr = [];
g.traverse(o => { if (o.isMesh && o.name === 'fantailScreen') scr.push(o); });
const fs = H.fantailScreen;
if (fs) {
if (!(fs.hM >= 0.9 && fs.hM <= 2.0))
say(v.id, 'a screen no deck edge carries',
`fantailScreen.hM ${fs.hM} — outside 0.9–2.0 m`);
if (!(fs.leanDeg >= 0 && fs.leanDeg <= 25))
say(v.id, 'a screen leaning past its own plates',
`fantailScreen.leanDeg ${fs.leanDeg} — outside 0–25 deg`);
if (!(Number.isInteger(fs.tier) && fs.tier >= 0 && fs.tier < (H.decks || 0)))
say(v.id, 'a screen on a tier the ship does not have',
`fantailScreen.tier ${fs.tier} on ${H.decks || 0} decks`);
if (!scr.length) {
say(v.id, 'a recorded windscreen with no drawn glass',
`fantailScreen attests ${fs.hM} m of screen and no fantailScreen mesh `
+ 'stands in the scene');
} else {
const baseF = H.freeboard || 0,
dhF = H.deckM || Math.min((H.beam || 0) * 0.105, 3.0);
const flF = i => (i <= 0) ? baseF
: (H.tierFloorsM && H.tierFloorsM[i - 1] !== undefined) ? H.tierFloorsM[i - 1]
: baseF + dhF * i;
const yDeck = flF(fs.tier + 1);
const bbF = new THREE.Box3();
scr.forEach(s2 => bbF.union(new THREE.Box3().setFromObject(s2)));
if (Math.abs(bbF.min.y - yDeck) > 0.35
|| Math.abs(bbF.max.y - (yDeck + fs.hM)) > 0.35)
say(v.id, 'a screen off its own recorded deck edge',
`the glass spans y ${bbF.min.y.toFixed(2)}–${bbF.max.y.toFixed(2)} m `
+ `where the record puts it ${yDeck.toFixed(2)}–`
+ `${(yDeck + fs.hM).toFixed(2)} m`);
if (H.houseAt && H.houseAt.length === 2
&& bbF.max.x < (H.houseAt[1] - 0.5) * H.lwl - 1.5)
say(v.id, 'a screen that stops short of the sweep it rings',
`the glass ends at x ${bbF.max.x.toFixed(1)} where the house aft `
+ `extremity runs to x ${((H.houseAt[1] - 0.5) * H.lwl).toFixed(1)}`);
const pa = scr[0].geometry.getAttribute('position');
let cx = 0, cz = 0, nB = 0;
for (let q2 = 0; q2 < pa.count; q2 += 2) { cx += pa.getX(q2); cz += pa.getZ(q2); nB++; }
cx /= nB; cz /= nB;
let leanOK = 0;
for (let q2 = 0; q2 + 1 < pa.count; q2 += 2) {
const dB = Math.hypot(pa.getX(q2) - cx, pa.getZ(q2) - cz);
const dT = Math.hypot(pa.getX(q2 + 1) - cx, pa.getZ(q2 + 1) - cz);
if (dT > dB + 0.02) leanOK++;
}
if (fs.leanDeg > 2 && leanOK < nB * 0.9)
say(v.id, 'a screen that does not lean the way the plates read',
`${leanOK} of ${nB} panel pairs stand outboard of their own base`);
}
} else if (scr.length) {
say(v.id, 'a windscreen nobody attested',
`${scr.length} fantailScreen mesh(es) stand on a hull whose record `
+ 'carries no fantailScreen');
}
}
(H.masts || []).forEach((mk, i) => {
if (mk.truckM === undefined || mk.rig !== 'square') return;
const mt = (H.__mastTops || []).find(t => Math.abs(t.u - mk.at) < 0.02);
if (!mt) {
say(v.id, 'recorded truck with no drawn masthead',
`mast ${i} attests truckM ${mk.truckM} m and no masthead stands near u ${mk.at}`);
return;
}
const win = (H.beam || 10) * 0.25;
let lo = 1e9, hi = -1e9;
g.traverse(o => {
if (!o.isMesh || !tagOf(o) || tagOf(o).key !== 'mast') return;
const b2 = new THREE.Box3().setFromObject(o);
if (Math.abs((b2.min.x + b2.max.x) / 2 - mt.x) < win) {
lo = Math.min(lo, b2.min.y); hi = Math.max(hi, b2.max.y);
}
});
if (hi > lo && Math.abs((hi - lo) - mk.truckM) > 0.75)
say(v.id, 'mast short of its recorded flag-button',
`mast ${i} spans ${(hi - lo).toFixed(2)} m deck-to-truck against the record's `
+ `${mk.truckM} m`);
});
g.traverse(o => {
if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'anchor') return;
const flukes = [];
o.traverse(m => { if (m.isMesh && m.geometry && m.geometry.type === 'ConeGeometry')
flukes.push(Math.abs(new THREE.Box3().setFromObject(m)
.getCenter(new THREE.Vector3()).z)); });
if (flukes.length === 2 && Math.abs(flukes[0] - flukes[1]) > 1.5)
say(v.id, 'anchor fork athwart the ship',
`flukes at ${flukes[0].toFixed(1)} and ${flukes[1].toFixed(1)} m off centre — `
+ 'one in the planking or one in the air');
});
{
let untagged = 0, first = null;
g.traverse(o => {
if (!o.isMesh || tagOf(o)) return;
untagged++;
if (!first) {
const b2 = new THREE.Box3().setFromObject(o);
first = `${o.geometry ? o.geometry.type : '?'} at x ${b2.min.x.toFixed(1)}..${b2.max.x.toFixed(1)}`;
}
});
if (untagged)
say(v.id, 'mesh with no part tag', `${untagged} untagged mesh(es); first: ${first}`);
}
if (H.sternSteps) {
const ss = H.sternSteps.steps || [];
const spanDev = ss.map(() => -1e9);
g.traverse(o => {
if (!o.isMesh || !o.geometry) return;
const p = tagOf(o);
if (!p || p.key !== 'terrace') return;
const a = o.geometry.attributes.position.array;
for (let i = 0; i < a.length; i += 3) {
const uu = a[i] / H.lwl + 0.5;
for (let s2 = 0; s2 < ss.length; s2++)
if (uu > ss[s2].u[0] + 0.002 && uu < ss[s2].u[1] - 0.002) {
const t = (uu - ss[s2].u[0]) / (ss[s2].u[1] - ss[s2].u[0]);
const want = ss[s2].topM[0] + (ss[s2].topM[1] - ss[s2].topM[0]) * t;
spanDev[s2] = Math.max(spanDev[s2], a[i + 1] - want);
}
}
});
for (let s2 = 0; s2 < ss.length; s2++) {
if (spanDev[s2] < -1e8) continue;
if (spanDev[s2] < -0.2 || spanDev[s2] > 0.3)
say(v.id, 'stern cap off its record',
`step ${s2} built cap sits ${spanDev[s2].toFixed(2)} m off the recorded line`);
}
const HSs = SHIPS_HULL.hullSurface(H);
const wv = new THREE.Vector3();
g.updateMatrixWorld(true);
g.traverse(o => {
if (!o.userData.part || o.userData.part.key !== 'stair' || !o.children.length) return;
let minY = 1e9, maxY = -1e9, maxZ = 0, mx = 0, nch = 0;
for (const c of o.children) {
if (!c.isMesh || !c.geometry.parameters) continue;
const p = c.geometry.parameters;
c.getWorldPosition(wv);
minY = Math.min(minY, wv.y - p.height / 2);
maxY = Math.max(maxY, wv.y + p.height / 2);
maxZ = Math.max(maxZ, Math.abs(wv.z) + p.depth / 2);
mx += wv.x; nch++;
}
if (!nch) return;
const u = (mx / nch) / H.lwl + 0.5;
let bu = null;
for (const st of ss) if (st.u[0] > 0.5 && Math.abs(st.u[0] - u) < 0.05 &&
(bu === null || Math.abs(st.u[0] - u) < Math.abs(bu - u)))
bu = st.u[0];
if (bu === null) { say(v.id, 'stair off its decks', `flight at u ${u.toFixed(3)} near no break`); return; }
const dUp = HSs.sheer(bu - 1e-5), dLo = HSs.sheer(bu + 1e-5);
const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSs, bu + 1e-5, 1)[2]);
if (maxY < dUp - 0.05 || maxY > dUp + 0.45)
say(v.id, 'stair off its decks',
`top tread ${maxY.toFixed(2)} m vs upper deck ${dUp.toFixed(2)} at break ${bu}`);
if (minY < dLo - 0.05 || minY > dLo + 0.45)
say(v.id, 'stair off its decks',
`foot ${minY.toFixed(2)} m vs lower deck ${dLo.toFixed(2)} at break ${bu}`);
if (maxZ > half + 0.05)
say(v.id, 'stair off its decks',
`tread reaches ${maxZ.toFixed(2)} m off centre on a ${half.toFixed(2)} m half-breadth`);
});
}
const carriesSail = !!H.wingSail ||
(H.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole');
const airLimit = carriesSail ? H.loa * 1.15 : H.loa * 0.35;
if (airM > airLimit)
say(v.id, 'air draught', `${airM.toFixed(0)} m above deck on a ${H.loa} m hull` +
(carriesSail ? ' (square rig)' : ' (no sail)'));
for (const [flag, key, label] of [['funnels', 'funnel', 'funnels'],
['turrets', 'turret', 'turrets'],
['boats', 'boat', 'boats'],
['containers', 'container', 'containers'],
['flightDeck', 'flightdeck', 'a flight deck'],
['aaLight', 'aaLight', 'the light AA battery'],
['searchlights', 'searchlight', 'searchlights'],
['floatplanes', 'floatplane', 'floatplanes'],
['deckHatches', 'hatch', 'stowage hatches'],
['sternSteps', 'terrace', 'the stern terraces']])
if (H[flag] && (!Array.isArray(H[flag]) || H[flag].length) && !part[key]
&& !(flag === 'boats' && H.boatsInboard))
say(v.id, 'declared but not drawn', label);
if (H.gunDeck) {
const gd = part.gundeck;
const planeY = H.freeboard + H.gunDeck.height;
if (!gd) say(v.id, 'gun deck declared but not drawn', 'gunDeck record with no geometry');
else {
if (gd.y[0] < 0)
say(v.id, 'gun deck under water',
`lowest gun-deck vertex ${gd.y[0].toFixed(1)} m over water`);
if (planeY < gd.y[0] - 0.3 || planeY > gd.y[1] + 0.3)
say(v.id, 'gun deck off its declared height',
`deck plane derives to ${planeY.toFixed(1)} m over water, drawn band ` +
`${gd.y[0].toFixed(1)}–${gd.y[1].toFixed(1)}`);
}
if (H.gunDeck.loops) {
const sm = part.sama;
if (!sm) say(v.id, 'loopholes declared but not drawn', 'GD.loops with no sama geometry');
else {
const bandTop = planeY + (H.gunDeck.screenH || 0) + 0.3;
if (sm.y[0] < planeY - 0.1 || sm.y[1] > bandTop)
say(v.id, 'loopholes out of the bulwark band',
`sama band ${sm.y[0].toFixed(1)}–${sm.y[1].toFixed(1)} m, bulwark ` +
`${planeY.toFixed(1)}–${bandTop.toFixed(1)}`);
const wallSet = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && (p.key === 'sama' || p.name === 'Tate-ita')) wallSet.push(o); });
const HSs = SHIPS_HULL.hullSurface(H);
const GDs = H.gunDeck;
const overS = GDs.over !== undefined ? GDs.over : H.beam * 0.045;
const shHs = GDs.screenH !== undefined ? GDs.screenH : H.beam * 0.042;
const nL = GDs.loops;
const rc = new THREE.Raycaster(); rc.far = 60;
let bad = 0, shot = 0, first = '';
const yRay = planeY + H.beam * 0.007 + shHs * 0.60;
for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nL - 1; j++) {
const u = GDs.from + (GDs.to - GDs.from) * (j / 2 + 0.5) / nL;
const pd = SHIPS_HULL.surfacePoint(H, HSs, u, 1.0);
const faceZ = Math.abs(pd[2]) + overS;
rc.set(new THREE.Vector3(pd[0], yRay, sgn * (faceZ + 4)),
new THREE.Vector3(0, 0, -sgn));
shot++;
const hit = rc.intersectObjects(wallSet, true)[0];
const depth = hit ? faceZ - hit.point.z * sgn : 99;
const isSlot = j % 2 === 0;
if (isSlot ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
bad++;
if (!first) first = `${isSlot ? 'slot' : 'wall'} at u ${u.toFixed(2)} `
+ `${sgn > 0 ? 'stbd' : 'port'}: first strike ${hit ? depth.toFixed(2) + ' m in'
: 'nothing'}`;
}
}
if (bad) say(v.id, 'sama are not openings through the wall',
`${bad} of ${shot} passage rays wrong — ${first}`);
}
}
if (!H.apostis && H.gunDeck.gunsPerSide) {
const wallSet = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && (p.name === 'Bulwark' || p.name === 'Gun port'))
wallSet.push(o); });
if (!wallSet.length)
say(v.id, 'a battery with no wall to fire through',
'gunsPerSide on a frameless hull with no Bulwark or Gun port mesh');
else {
const HSp = SHIPS_HULL.hullSurface(H);
const GDp = H.gunDeck;
const overP = GDp.over !== undefined ? GDp.over : H.beam * 0.045;
const nP2 = GDp.gunsPerSide;
const rc = new THREE.Raycaster(); rc.far = 60;
let bad = 0, shot = 0, first = '';
const yRay = planeY + H.beam * 0.007 + H.beam * 0.042;
for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nP2 - 1; j++) {
const u = GDp.from + (GDp.to - GDp.from) * (j / 2 + 0.5) / nP2;
const pd = SHIPS_HULL.surfacePoint(H, HSp, u, 1.0);
const faceZ = Math.abs(pd[2]) + overP;
rc.set(new THREE.Vector3(pd[0], yRay, sgn * (faceZ + 4)),
new THREE.Vector3(0, 0, -sgn));
shot++;
const hit = rc.intersectObjects(wallSet, true)[0];
const depth = hit ? faceZ - hit.point.z * sgn : 99;
const isPort = j % 2 === 0;
if (isPort ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
bad++;
if (!first) first = `${isPort ? 'port' : 'wall'} at u ${u.toFixed(2)} `
+ `${sgn > 0 ? 'stbd' : 'port side'}: first strike `
+ `${hit ? depth.toFixed(2) + ' m in' : 'nothing'}`;
}
}
if (bad) say(v.id, 'gun ports are not openings through the wall',
`${bad} of ${shot} passage rays wrong — ${first}`);
}
}
if (H.gunDeck.walls && H.gunDeck.wallPorts) {
const beltSet = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'sangjang') beltSet.push(o); });
if (!beltSet.length)
say(v.id, 'a port row with no belt to pierce',
'GD.wallPorts declared with no sangjang geometry');
else {
const HSw = SHIPS_HULL.hullSurface(H);
const GDw = H.gunDeck, B2 = H.beam;
const overW = GDw.over !== undefined ? GDw.over : B2 * 0.045;
const nW = GDw.wallPorts;
const headYw = planeY - B2 * 0.016;
const yRow = headYw - 0.42;
const pdM = SHIPS_HULL.surfacePoint(H, HSw, 0.5, 1.0);
const yOff = H.freeboard - pdM[1];
const rc = new THREE.Raycaster(); rc.far = 60;
let bad = 0, shot = 0, first = '';
for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nW - 1; j++) {
const u = GDw.from + (GDw.to - GDw.from) * (j / 2 + 0.5) / nW;
const pd = SHIPS_HULL.surfacePoint(H, HSw, u, 1.0);
const footY = pd[1] + yOff - B2 * 0.010;
const footZ = Math.abs(pd[2]) - B2 * 0.006;
const headZ = Math.abs(pd[2]) + overW - B2 * 0.020 - B2 * 0.006;
const faceZ = footZ + (headZ - footZ) * (yRow - footY) / (headYw - footY);
rc.set(new THREE.Vector3(pd[0], yRow, sgn * (faceZ + 4)),
new THREE.Vector3(0, 0, -sgn));
shot++;
const hit = rc.intersectObjects(beltSet, true)[0];
const depth = hit ? faceZ - hit.point.z * sgn : 99;
const isPort = j % 2 === 0;
if (isPort ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
bad++;
if (!first) first = `${isPort ? 'port' : 'belt'} at u ${u.toFixed(2)} `
+ `${sgn > 0 ? 'stbd' : 'port side'}: first strike `
+ `${hit ? depth.toFixed(2) + ' m in' : 'nothing'}`;
}
}
if (bad) say(v.id, 'oar-deck ports are not openings through the belt',
`${bad} of ${shot} passage rays wrong — ${first}`);
}
}
if (!H.apostis) {
const clamps = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.name === 'Deck clamp') clamps.push(o); });
if (!clamps.length)
say(v.id, 'a fighting deck with no clamp under its edge',
'gunDeck on a frameless hull with no Deck clamp mesh');
else {
const HSc = SHIPS_HULL.hullSurface(H);
const GDc = H.gunDeck;
const xFc = SHIPS_HULL.surfacePoint(H, HSc, GDc.from, 1.0)[0];
const xTc = SHIPS_HULL.surfacePoint(H, HSc, GDc.to, 1.0)[0];
const run = Math.abs(xTc - xFc), stW = run / 22;
let badC = 0, firstC = '';
for (const m of clamps) {
const bb = new THREE.Box3().setFromObject(m);
const span = bb.max.x - bb.min.x;
if (span < run - stW) {
badC++;
if (!firstC) firstC = `a clamp mesh spans ${span.toFixed(2)} m of a `
+ `${run.toFixed(2)} m run`;
}
}
if (clamps.length !== 2 && !firstC)
firstC = `${clamps.length} clamp meshes for two sides`;
if (badC || clamps.length !== 2)
say(v.id, 'the deck clamp is a chain, not a bent timber',
`${badC} of ${clamps.length} clamp meshes short of the run — ${firstC}`);
}
}
{
const WALL = ['Bulwark', 'End bulwark', 'Screen', 'Tate-ita'];
const wallB = new THREE.Box3(); wallB.makeEmpty(); let nWall = 0;
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && WALL.includes(p.name)) { wallB.expandByObject(o); nWall++; } });
if (!nWall) say(v.id, 'gun deck without a wall',
'a gunDeck hull with no bulwark or screen mesh at all');
else {
const cx = (wallB.min.x + wallB.max.x) / 2, cz = (wallB.min.z + wallB.max.z) / 2;
const bandH = wallB.max.y - wallB.min.y;
const rc = new THREE.Raycaster(); let through = 0, shot = 0, first = '';
for (const f of [0.25, 0.5, 0.8]) {
const y = wallB.min.y + bandH * f;
for (let b = 0; b < 72; b++) {
const th = b * Math.PI / 36;
rc.set(new THREE.Vector3(cx + Math.cos(th) * 400, y, cz + Math.sin(th) * 400),
new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)).normalize());
rc.far = 900; shot++;
if (!rc.intersectObject(g, true).length) {
through++;
if (!first) first = `first at bearing ${Math.round(th * 180 / Math.PI)}°, ` +
`y ${y.toFixed(1)} m`;
}
}
}
if (through) say(v.id, 'you can see through the gun-deck wall',
`${through} of ${shot} bearings at the wall band strike nothing — ${first}`);
}
}
if (H.gunDeck.walls) {
const sj = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'sangjang') sj.push(o); });
if (!sj.length)
say(v.id, 'sangjang walls declared but not drawn',
'gunDeck.walls with no sangjang geometry');
else {
const HSw = SHIPS_HULL.hullSurface(H);
const GDw = H.gunDeck;
const overW = GDw.over !== undefined ? GDw.over : H.beam * 0.045;
const rc = new THREE.Raycaster(); rc.far = 60;
let open = 0, shot = 0, first = '';
const miss = (where, y) => {
open++;
if (!first) first = `first ${where}, y ${y.toFixed(1)} m`;
};
for (const sgn of [-1, 1]) for (let i = 0; i < 24; i++) {
const u = GDw.from + (GDw.to - GDw.from) * ((i + 0.5) / 24);
const pd = SHIPS_HULL.surfacePoint(H, HSw, u, 1.0);
const railZ = Math.abs(pd[2]);
for (const f of [0.30, 0.55, 0.85]) {
const y = pd[1] + (planeY - 0.15 - pd[1]) * f;
rc.set(new THREE.Vector3(pd[0], y, sgn * (railZ + overW + 4)),
new THREE.Vector3(0, 0, -sgn));
shot++;
const hit = rc.intersectObjects(sj, true)[0];
if (!hit || hit.point.z * sgn < railZ - 0.35
|| hit.point.z * sgn > railZ + overW + 0.6)
miss(`at u ${u.toFixed(2)} ${sgn > 0 ? 'stbd' : 'port'}`, y);
}
}
for (const uE of [GDw.from, GDw.to]) {
const pd = SHIPS_HULL.surfacePoint(H, HSw, uE, 1.0);
const railZ = Math.abs(pd[2]);
const dir = uE === GDw.from ? 1 : -1;
const uO = uE - dir * (1.2 / H.loa);
const pO = SHIPS_HULL.surfacePoint(H, HSw, Math.max(0.01, Math.min(0.99, uO)), 1.0);
const yLo = Math.max(pd[1], pO[1]) + 0.2;
for (const zf of [-0.5, 0, 0.5]) for (const f of [0.30, 0.55, 0.85]) {
const y = yLo + (planeY - 0.15 - yLo) * f;
rc.set(new THREE.Vector3(pd[0] - dir * 1.2, y, zf * railZ),
new THREE.Vector3(dir, 0, 0));
shot++;
const hit = rc.intersectObjects(sj, true)[0];
if (!hit || Math.abs(hit.point.x - pd[0]) > 0.5)
miss(`at the ${uE === GDw.from ? 'forward' : 'aft'} end`, y);
}
}
if (open) say(v.id, 'oar deck open where its wall should stand',
`${open} of ${shot} rays at the sangjang band miss it — ${first}`);
if (H.gunDeck.wallPorts) {
const np = sj.filter(m => tagOf(m).name === 'Oar-deck port').length;
if (!np)
say(v.id, 'oar-deck ports declared but not drawn',
`record declares ${H.gunDeck.wallPorts} a side, no Oar-deck port mesh`);
}
}
}
if (H.gunDeck.maku) {
const mk = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'maku') mk.push(o); });
if (!mk.length)
say(v.id, 'maku declared but not drawn', 'gunDeck.maku with no cloth geometry');
else {
const HSm = SHIPS_HULL.hullSurface(H);
const GDm = H.gunDeck;
const overM = GDm.over !== undefined ? GDm.over : H.beam * 0.045;
const headYm = H.freeboard + GDm.height - H.beam * 0.016;
const rc = new THREE.Raycaster(); rc.far = 60;
let open = 0, shot = 0, first = '';
for (const sgn of [-1, 1]) for (let i = 0; i < 24; i++) {
const u = GDm.from + (GDm.to - GDm.from) * ((i + 0.5) / 24);
const pd = SHIPS_HULL.surfacePoint(H, HSm, u, 1.0);
const railZ = Math.abs(pd[2]);
const hemY = pd[1] + 0.15;
if (headYm - hemY < 0.25) continue;
for (const f of [0.35, 0.75]) {
const y = hemY + (headYm - hemY) * f;
rc.set(new THREE.Vector3(pd[0], y, sgn * (railZ + overM + 4)),
new THREE.Vector3(0, 0, -sgn));
shot++;
const hit = rc.intersectObjects(mk, true)[0];
if (!hit || hit.point.z * sgn < railZ - 0.05
|| hit.point.z * sgn > railZ + overM + 0.3) {
open++;
if (!first) first = `first at u ${u.toFixed(2)} ` +
`${sgn > 0 ? 'stbd' : 'port'}, y ${y.toFixed(1)} m`;
}
}
}
if (open) say(v.id, 'yagura band bare where its cloth should hang',
`${open} of ${shot} rays at the maku band miss the cloth — ${first}`);
}
}
if (H.gunDeck.maku) {
const GDv = H.gunDeck;
const HSv = SHIPS_HULL.hullSurface(H);
const overV = GDv.over !== undefined ? GDv.over : H.beam * 0.045;
const headYv = H.freeboard + GDv.height - H.beam * 0.016;
const lipV = H.beam * 0.010, tuckV = 0.10, clearV = 0.15;
const NV = 22, sxV = [], ryV = [], hwV = [];
for (let i = 0; i <= NV; i++) {
const u = GDv.from + (GDv.to - GDv.from) * i / NV;
const pd = SHIPS_HULL.surfacePoint(H, HSv, u, 1.0);
sxV.push(pd[0]); ryV.push(pd[1]); hwV.push(Math.abs(pd[2]) + overV);
}
const dirV = Math.sign(sxV[NV] - sxV[0]) || 1;
const fInv = x => {
if ((x - sxV[0]) * dirV <= 0) return 0;
for (let i = 0; i < NV; i++)
if ((x - sxV[i + 1]) * dirV <= 0)
return (i + (x - sxV[i]) / (sxV[i + 1] - sxV[i])) / NV;
return 1;
};
const lerpV = (arr, f) => { const t = Math.min(1, Math.max(0, f)) * NV;
const i = Math.min(NV - 1, Math.floor(t)), w = t - i;
return arr[i] + (arr[i + 1] - arr[i]) * w; };
g.updateMatrixWorld(true);
const VW = new THREE.Vector3();
for (const sgn of [-1, 1]) {
const vtx = [];
g.traverse(o => { const p = tagOf(o);
if (!(o.isMesh && p && p.key === 'maku' && p.name !== 'Maku')) return;
const pa = o.geometry.getAttribute('position');
for (let k = 0; k < pa.count; k++) {
VW.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld);
if (VW.z * sgn > 0) vtx.push([VW.x, VW.y, VW.z]);
} });
if (!vtx.length) {
say(v.id, 'maku band drawn without its valance',
`no border geometry on the ${sgn > 0 ? 'starboard' : 'port'} side`);
continue;
}
const xMidLo = lerpV(sxV, 1 / 3), xMidHi = lerpV(sxV, 2 / 3);
const mid = vtx.filter(p => (p[0] - xMidLo) * dirV >= 0
&& (p[0] - xMidHi) * dirV <= 0);
const topMid = mid.length ? Math.max(...mid.map(p => p[1])) : -1e9;
if (Math.abs(topMid - headYv) > 0.06)
say(v.id, 'maku valance hung off the head',
`border top edge ${topMid.toFixed(2)} m amidships, `
+ `the hanging line at ${headYv.toFixed(2)}`);
const x0c = lerpV(sxV, 0) + dirV * 0.7, x1c = lerpV(sxV, 1) - dirV * 0.7;
let cov = 0; const MC = 60;
for (let m = 0; m < MC; m++) {
const xs = x0c + (x1c - x0c) * (m + 0.5) / MC;
if (vtx.some(p => Math.abs(p[0] - xs) <= 0.075)) cov++;
}
if (cov / MC < 0.97)
say(v.id, 'maku border is medallions, not a strip',
`${cov} of ${MC} head-line stations have border cloth within 0.075 m `
+ '— the scallops are cut from one strip and touch');
let offC = 0, firstC = '';
for (const p of vtx) {
const f = fInv(p[0]);
const depF = Math.max(0.05, headYv - (lerpV(ryV, f) + clearV));
const s = Math.min(1, Math.max(0, (headYv - p[1]) / depF));
const dev = Math.abs(p[2]) - (lerpV(hwV, f) - lipV - tuckV * s);
if (dev < -0.02 || dev > 0.06) {
offC++;
if (!firstC) firstC = `first at x ${p[0].toFixed(1)}, y ${p[1].toFixed(2)}, `
+ `${dev.toFixed(3)} m off the cloth`;
}
}
if (offC) say(v.id, 'maku border off its own cloth',
`${offC} of ${vtx.length} border vertices off the surface — ${firstC}`);
const botV = Math.min(...vtx.map(p => p[1]));
const hemMidV = lerpV(ryV, 0.5) + clearV;
if (headYv - botV > 0.75)
say(v.id, 'a scallop nobody hung',
`border reaches ${(headYv - botV).toFixed(2)} m below the hanging line `
+ '— no plate reads a valance past 0.75 m');
else if (botV < (headYv + hemMidV) / 2)
say(v.id, 'a scallop nobody hung',
`border bottom ${botV.toFixed(2)} m, below the band's own mid-height `
+ `${((headYv + hemMidV) / 2).toFixed(2)}`);
}
}
if (H.tower) {
const tw = part.tower;
if (!tw) say(v.id, 'tower declared but not drawn', 'tower record with no geometry');
else {
if (Math.abs(tw.y[0] - planeY) > 0.6)
say(v.id, tw.y[0] < planeY ? 'tower buried in the deck' : 'tower floats above the deck',
`tower foot ${tw.y[0].toFixed(1)} m over water, fighting deck at ${planeY.toFixed(1)}`);
if (tw.y[1] < planeY + (H.tower.h || 0))
say(v.id, 'tower short of its record',
`tower top ${tw.y[1].toFixed(1)} m, record claims ${(planeY + H.tower.h).toFixed(1)}+`);
}
}
if (H.tower && H.tower.walls) {
const tm = []; g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'tower') tm.push(o); });
if (tm.length) {
const tb = new THREE.Box3();
for (const m of tm) tb.expandByObject(m);
const wb = new THREE.Box3(); let nw = 0;
for (const m of tm) {
const b = new THREE.Box3().setFromObject(m);
if (b.min.y < tb.min.y + 0.3) { wb.union(b); nw++; }
}
const eb = nw ? wb : tb;
const cx = (eb.min.x + eb.max.x) / 2, cz = (eb.min.z + eb.max.z) / 2;
const rc = new THREE.Raycaster(); rc.far = 900;
const entry = new THREE.Vector3();
let open = 0, shot = 0, first = '';
for (const f of [0.25, 0.5, 0.8]) {
const y = tb.min.y + (H.tower.h || (tb.max.y - tb.min.y)) * f;
for (let b = 0; b < 72; b++) {
const th = b * Math.PI / 36;
rc.set(new THREE.Vector3(cx + Math.cos(th) * 400, y, cz + Math.sin(th) * 400),
new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)));
shot++;
const hit = rc.intersectObjects(tm, true)[0];
const ent = rc.ray.intersectBox(eb, entry);
if (!hit || !ent || hit.point.distanceTo(ent) > 0.6) {
open++;
if (!first) first = `first at bearing ${Math.round(th * 180 / Math.PI)}°, ` +
`y ${y.toFixed(1)} m`;
}
}
}
if (open) say(v.id, 'walled cabin open to a bearing',
`${open} of ${shot} rays into the wall band miss plank — ${first}`);
}
}
} else if (H.tower)
say(v.id, 'tower without a deck', 'tower record on a hull with no gunDeck to stand on');
if (H.oarStyle === 'ro') {
let nRo = 0, bad = 0, first = '', badF = 0, firstF = '';
const tip = new THREE.Vector3(), pin = new THREE.Vector3(), cnr = new THREE.Vector3();
g.updateMatrixWorld(true);
g.traverse(o => {
const d = o.userData && o.userData.oar;
if (!d) return;
nRo++;
if (d.style !== 'ro') { bad++; if (!first) first = 'drawn as a sweep'; return; }
tip.set(0, 0, d.outb).applyMatrix4(o.matrixWorld);
o.getWorldPosition(pin);
if (tip.x < pin.x + 0.3) {
bad++; if (!first) first = `tip not abaft its pin (dx ${(tip.x - pin.x).toFixed(1)} m)`;
} else if (tip.y > 0.15 || tip.y < -(H.draught + 0.6)) {
bad++; if (!first) first = `tip at ${tip.y.toFixed(2)} m over water (draught ${H.draught})`;
}
const kids = [];
o.traverse(m => { if (m.isMesh) kids.push(m); });
const ext = kids.map(m => {
m.updateMatrix();
const gm = m.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
const bb = gm.boundingBox; let z0 = Infinity, z1 = -Infinity;
for (const cx of [bb.min.x, bb.max.x])
for (const cy of [bb.min.y, bb.max.y])
for (const cz of [bb.min.z, bb.max.z]) {
cnr.set(cx, cy, cz).applyMatrix4(m.matrix);
z0 = Math.min(z0, cnr.z); z1 = Math.max(z1, cnr.z);
}
return [z0, z1];
});
let ovl = 0;
for (let a2 = 0; a2 < ext.length; a2++)
for (let b2 = a2 + 1; b2 < ext.length; b2++)
ovl = Math.max(ovl,
Math.min(ext[a2][1], ext[b2][1]) - Math.max(ext[a2][0], ext[b2][0]));
const reach = Math.max(...ext.map(e => e[1]));
if (ovl > 0.15 * d.outb) {
badF++; if (!firstF) firstF = `two timbers overlap ${ovl.toFixed(2)} m of a `
+ `${d.outb.toFixed(2)} m blade run`;
} else if (kids.length !== 2) {
badF++; if (!firstF) firstF = `${kids.length} meshes on one pin for a blade and a loom`;
} else if (reach < 0.95 * d.outb) {
badF++; if (!firstF) firstF = `blade reaches ${reach.toFixed(2)} m of its `
+ `${d.outb.toFixed(2)} m run`;
}
});
if (!nRo) say(v.id, 'ro declared but no oars drawn', 'oarStyle ro with no oar groups');
else if (bad) say(v.id, 'ro drawn as sweeps', `${bad} of ${nRo} oars fail the scull test — ${first}`);
if (nRo && badF)
say(v.id, 'the ro blade is a stepped overlay, not one scarfed timber',
`${badF} of ${nRo} — ${firstF}`);
}
if (H.oarBanks) {
const isc = H.interscalmium || 0.98;
const banks = Array.isArray(H.oarsPerBank) ? H.oarsPerBank
: [H.oarsPerBank || 27];
for (let b = 0; b < banks.length; b++) {
const span = (banks[b] - 1) * isc;
if (span > 0.9 * H.lwl)
say(v.id, 'more rowers than the hull has stations',
`bank ${b}: ${banks[b]} rowers at ${isc} m span ${span.toFixed(1)} m `
+ `on a ${H.lwl} m waterline`);
}
}
if ((H.year || 0) >= 1100 && (H.masts || []).some(m => m.rig === 'square')) {
let nTop = 0, badF = 0, firstF = '', badW = 0, firstW = '';
const cnr = new THREE.Vector3();
const square = H.year >= 1710;
g.updateMatrixWorld(true);
g.traverse(o => {
const part = o.userData && o.userData.part;
if (!part || part.key !== 'top' || part.name === 'Crosstrees') return;
const kids = [];
o.traverse(m => { if (m.isMesh) kids.push(m); });
if (!kids.length) return;
nTop++;
const ext = kids.map(m => {
m.updateMatrix();
const gm = m.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
const bb = gm.boundingBox;
let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
for (const cx of [bb.min.x, bb.max.x])
for (const cy of [bb.min.y, bb.max.y])
for (const cz of [bb.min.z, bb.max.z]) {
cnr.set(cx, cy, cz).applyMatrix4(m.matrix);
x0 = Math.min(x0, cnr.x); x1 = Math.max(x1, cnr.x);
y0 = Math.min(y0, cnr.y); y1 = Math.max(y1, cnr.y);
}
const idx = gm.index ? gm.index.count : gm.attributes.position.count;
return { tris: idx / 3, fwd: -x0, aft: x1, h: y1 - y0 };
});
const plat = ext.reduce((a, b) => (b.tris > a.tris ? b : a));
const r = plat.fwd, ratio = plat.aft / plat.fwd;
const tallest = Math.max(...ext.map(e => e.h));
if (square) {
if (ratio < 0.55 || ratio > 0.85) {
badF++; if (!firstF) firstF = `aft ${plat.aft.toFixed(2)} m of forward ${r.toFixed(2)} m, `
+ `${ratio.toFixed(2)} — a top depicted at ${H.year} is square-backed`;
}
if (tallest > 0.2 * r) {
badW++; if (!firstW) firstW = `a ${tallest.toFixed(2)} m wall on a ${r.toFixed(2)} m top `
+ `depicted at ${H.year} — the bulwark is the fighting top's, before 1710`;
}
} else {
if (Math.abs(ratio - 1) > 0.03) {
badF++; if (!firstF) firstF = `aft ${plat.aft.toFixed(2)} m of forward ${r.toFixed(2)} m, `
+ `${ratio.toFixed(2)} — a top depicted at ${H.year} is round`;
}
if (tallest < 0.3 * r) {
badW++; if (!firstW) firstW = `nothing over ${tallest.toFixed(2)} m on a ${r.toFixed(2)} m top `
+ `depicted at ${H.year} — a fighting top without its bulwark is a bare disc`;
}
}
});
if (badF) say(v.id, "a top of the wrong century's form", `${badF} of ${nTop} — ${firstF}`);
if (badW) say(v.id, "a top walled for the wrong century", `${badW} of ${nTop} — ${firstW}`);
}
if (H.oarBanks && H.oarStyle !== 'ro') {
const outbR = 0.74 * (H.oarLen || 4.2);
let nSw = 0, badR = 0, firstR = '', badF2 = 0, firstF2 = '', badC = 0, firstC = '';
const cnr = new THREE.Vector3();
g.updateMatrixWorld(true);
g.traverse(o => {
const d = o.userData && o.userData.oar;
if (!d || d.style === 'ro') return;
nSw++;
const kids = [];
o.traverse(m => { if (m.isMesh) kids.push(m); });
if (kids.length !== 2) {
badF2++; if (!firstF2) firstF2 = `${kids.length} meshes on one thole for a loom and a blade`;
return;
}
const ext = kids.map(m => {
m.updateMatrix();
const gm = m.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
const bb = gm.boundingBox; let z0 = Infinity, z1 = -Infinity;
for (const cx of [bb.min.x, bb.max.x])
for (const cy of [bb.min.y, bb.max.y])
for (const cz of [bb.min.z, bb.max.z]) {
cnr.set(cx, cy, cz).applyMatrix4(m.matrix);
z0 = Math.min(z0, cnr.z); z1 = Math.max(z1, cnr.z);
}
return [z0, z1];
});
const reach = Math.max(ext[0][1], ext[1][1]);
if (reach > 1.01 * outbR || reach < 0.97 * outbR) {
badR++; if (!firstR) firstR = `tip at ${reach.toFixed(2)} m of a recorded `
+ `${outbR.toFixed(2)} m outboard run`;
}
const bi = ext[0][0] > ext[1][0] ? 0 : 1;
const bm = kids[bi], bz0 = ext[bi][0], bz1 = ext[bi][1], run = bz1 - bz0;
const pa = bm.geometry.attributes.position.array;
const p3 = new THREE.Vector3();
let neckLo = Infinity, neckHi = -Infinity, tipLo = Infinity, tipHi = -Infinity,
allLo = Infinity, allHi = -Infinity;
for (let i = 0; i < pa.length; i += 3) {
p3.set(pa[i], pa[i + 1], pa[i + 2]).applyMatrix4(bm.matrix);
allLo = Math.min(allLo, p3.y); allHi = Math.max(allHi, p3.y);
if (p3.z < bz0 + 0.15 * run) { neckLo = Math.min(neckLo, p3.y);
neckHi = Math.max(neckHi, p3.y); }
if (p3.z > bz1 - 0.02 * run) { tipLo = Math.min(tipLo, p3.y);
tipHi = Math.max(tipHi, p3.y); }
}
const neckD = (neckHi - neckLo) / 2, tipD = (tipHi - tipLo) / 2,
maxD = (allHi - allLo) / 2;
if (!(maxD > 1.15 * neckD && maxD > 1.05 * tipD)) {
badF2++; if (!firstF2) firstF2 = `neck ${neckD.toFixed(3)}, widest `
+ `${maxD.toFixed(3)}, tip ${tipD.toFixed(3)} m half-depth — the same depth `
+ 'at the neck as at its widest is a crate, not a blade';
}
if (maxD > 0.045 * H.beam) {
badC++; if (!firstC) firstC = `blade ${(2 * maxD).toFixed(2)} m deep on a `
+ `${H.beam} m beam — deeper than the class it replaced`;
}
});
if (H.oarBanks && !nSw) say(v.id, 'oar banks declared but no sweeps drawn',
'oarBanks with no oar groups');
if (badR) say(v.id, 'an oar drawn past its own record',
`${badR} of ${nSw} sweeps — ${firstR}`);
if (badF2) say(v.id, 'the sweep blade is a crate, not a loft',
`${badF2} of ${nSw} — ${firstF2}`);
if (badC) say(v.id, 'a blade nobody attested',
`${badC} of ${nSw} — ${firstC}`);
}
if (H.paddleFloats) {
const Rw = (H.paddleDia || 0) / 2;
const fD = H.paddleFloatDeepM || 0, fL = H.paddleFloatLenM || 0;
let wheels = 0, badN = 0, firstN = '', badB = 0, firstB = '',
badC = 0, firstC = '';
g.traverse(o => {
if (!(o.userData && o.userData.wheel)) return;
wheels++;
let nF = 0;
o.children.forEach(m => {
if (!m.isMesh || m.name !== 'Float') return;
nF++;
const pp = m.geometry.parameters || {};
const deep = pp.height || 0, len = pp.depth || 0, thick = pp.width || 0;
const reach = Math.hypot(m.position.x, m.position.y) + deep / 2;
const dimBad = (fD && Math.abs(deep - fD) > 0.15 * fD)
|| (fL && Math.abs(len - fL) > 0.15 * fL);
if (dimBad || reach > 1.01 * Rw || reach < 0.95 * Rw) {
badB++; if (!firstB) firstB = `a ${len.toFixed(2)} × ${deep.toFixed(2)} m float `
+ `reaching ${reach.toFixed(2)} m against a recorded ${fL.toFixed(2)} × `
+ `${fD.toFixed(2)} m board on a ${Rw.toFixed(2)} m wheel`;
}
if (deep > 1.5 || thick > 0.30) {
badC++; if (!firstC) firstC = `a float ${deep.toFixed(2)} m deep and `
+ `${thick.toFixed(2)} m thick`;
}
});
if (nF !== H.paddleFloats) {
badN++; if (!firstN) firstN =
`${nF} floats drawn on a wheel recorded with ${H.paddleFloats}`;
}
});
if (!wheels) say(v.id, 'paddle floats recorded but no wheel drawn',
'paddleFloats with no wheel group');
if (badN) say(v.id, 'the wheel does not carry its recorded floats', firstN);
if (badB) say(v.id, 'a float drawn past its own record', `${badB} — ${firstB}`);
if (badC) say(v.id, 'a board nobody attested', `${badC} — ${firstC}`);
if (H.paddleOverBoxesM && wheels) {
const obHalf = H.paddleOverBoxesM / 2;
let zMax = 0;
const cnr = new THREE.Vector3();
g.updateMatrixWorld(true);
g.traverse(o => {
if (!o.isMesh) return;
let part = null;
for (let e = o; e; e = e.parent)
if (e.userData && e.userData.part) { part = e.userData.part; break; }
if (!part || part.key !== 'paddlebox') return;
const gm = o.geometry; if (!gm.boundingBox) gm.computeBoundingBox();
const bb = gm.boundingBox;
for (const cx of [bb.min.x, bb.max.x])
for (const cy of [bb.min.y, bb.max.y])
for (const cz of [bb.min.z, bb.max.z]) {
cnr.set(cx, cy, cz).applyMatrix4(o.matrixWorld);
zMax = Math.max(zMax, Math.abs(cnr.z));
}
});
if (zMax > 1.01 * obHalf || zMax < 0.93 * obHalf)
say(v.id, 'the housing does not stop at its recorded breadth',
`widest box structure at ${(2 * zMax).toFixed(2)} m over a recorded `
+ `${H.paddleOverBoxesM} m over the boxes`);
}
}
if (H.sternGuns) {
let nCh = 0, bad = 0, first = '';
const tip = new THREE.Vector3(), pin = new THREE.Vector3();
g.updateMatrixWorld(true);
g.traverse(o => {
const d = o.userData && o.userData.gun;
if (!d || d.style !== 'chaser') return;
nCh++;
tip.set(d.tip[0], d.tip[1], d.tip[2]).applyMatrix4(o.matrixWorld);
o.getWorldPosition(pin);
if (pin.x < (0.80 - 0.5) * H.lwl) {
bad++; if (!first) first = `chaser amidships (x ${pin.x.toFixed(1)} m)`;
} else if (tip.x < pin.x + 0.5) {
bad++; if (!first) first = `chaser fires forward (dx ${(tip.x - pin.x).toFixed(1)} m)`;
}
});
if (nCh !== H.sternGuns)
say(v.id, 'stern chasers off the record', `record says ${H.sternGuns}, drawn ${nCh}`);
else if (bad) say(v.id, 'chasers mis-laid', `${bad} of ${nCh} — ${first}`);
}
if (H.bowFortress) {
let fortDrawn = false, nBow = 0, bad = 0, first = '';
const tip = new THREE.Vector3(), pin = new THREE.Vector3();
g.updateMatrixWorld(true);
g.traverse(o => {
const p = tagOf(o);
if (o.isMesh && p && p.key === 'fortress') fortDrawn = true;
const d = o.userData && o.userData.gun;
if (!d || d.style !== 'fortress') return;
nBow++;
tip.set(d.tip[0], d.tip[1], d.tip[2]).applyMatrix4(o.matrixWorld);
o.getWorldPosition(pin);
if (tip.x > pin.x - 0.3) {
bad++; if (!first) first = `bow piece not firing ahead (dx ${(tip.x - pin.x).toFixed(1)} m)`;
} else if (Math.abs(tip.z) < Math.abs(pin.z) - 0.15) {
bad++; if (!first) first = 'bow piece crossing inboard of its breech';
}
});
if (!fortDrawn)
say(v.id, 'bow fortress declared but not drawn', 'bowFortress with no fortress meshes');
else if (H.bowGuns && nBow !== H.bowGuns)
say(v.id, 'bow battery off the record', `record says ${H.bowGuns}, drawn on the fortress ${nBow}`);
else if (bad) say(v.id, 'bow battery mis-laid', `${bad} of ${nBow} — ${first}`);
}
if (H.iron && !H.year)
say(v.id, 'no dress era', 'iron hull without year — shader falls back to Victorian dress');
if (H.iron && H.year >= 1950 && H.cove)
say(v.id, 'anachronistic dress', `cove line declared on a ${H.year} welded hull`);
if (H.boatDeckM && H.decks) {
const dh = H.deckM || H.beam * 0.105;
const top = H.freeboard + (H.boatsRecessed ? (H.shellTiers || 0) : H.decks) * dh;
if (Math.abs(top - H.boatDeckM) > 0.5)
say(v.id, 'house off the record',
`boat deck derives to ${top.toFixed(1)} m over water, record says ${H.boatDeckM}`);
}
if (H.mastTopM && part.mast) {
if (Math.abs(part.mast.y[1] - H.mastTopM) > 1.5)
say(v.id, 'mast tops off the record',
`tallest mast ${part.mast.y[1].toFixed(1)} m over water, record says ${H.mastTopM}`);
}
if (H.cluster) {
const cl = part.cluster;
if (!cl) say(v.id, 'cluster declared but not drawn', 'cluster record with no geometry');
else {
const dh2 = H.deckM || H.beam * 0.105;
const roofY = H.houseTopM !== undefined ? H.houseTopM
: H.freeboard + (H.decks || 0) * dh2;
const tierRoofY = ti => (H.tierFloorsM && H.tierFloorsM[ti] !== undefined)
? H.tierFloorsM[ti]
: (ti + 1 >= (H.decks || 0) && H.houseTopM !== undefined) ? H.houseTopM
: H.freeboard + (ti + 1) * dh2;
let floorY = roofY;
for (const d of H.cluster.domes || [])
if (!d.upper && d.onTier !== undefined) floorY = Math.min(floorY, tierRoofY(d.onTier));
if (H.cluster.fairFootTier !== undefined)
floorY = Math.min(floorY, tierRoofY(H.cluster.fairFootTier));
if (cl.y[0] < floorY - 1.5)
say(v.id, 'cluster reaches into the house',
`lowest cluster vertex ${cl.y[0].toFixed(1)} m over water, lowest declared footing ${floorY.toFixed(1)}`);
if (cl.y[0] > floorY + 0.6)
say(v.id, 'cluster floats above its roof',
`lowest cluster vertex ${cl.y[0].toFixed(1)} m over water, lowest declared footing ${floorY.toFixed(1)}`);
if (H.cluster.stack && Math.abs(cl.y[1] - H.cluster.stack.topFwdM) > 1.5)
say(v.id, 'cluster off its derived height',
`tallest cluster vertex ${cl.y[1].toFixed(1)} m over water, derived record says ${H.cluster.stack.topFwdM}`);
}
if (H.decks && SHIPS_HULL.linerHouse) {
const T2 = SHIPS_HULL.linerHouse(H);
const top = T2.n - 1;
const feet = [];
if (H.cluster.blockU)
feet.push(['block fwd', H.cluster.blockU[0], top], ['block aft', H.cluster.blockU[1], top]);
for (const d of H.cluster.domes || [])
if (!d.upper) feet.push(['dome', d.u, d.onTier !== undefined ? d.onTier : top]);
if (H.cluster.fairAftU !== undefined)
feet.push(['fairing foot', H.cluster.fairAftU,
H.cluster.fairFootTier !== undefined ? H.cluster.fairFootTier : top]);
for (const [what, u, ti] of feet) {
const t = T2.tiers[ti];
if (!t) {
say(v.id, 'cluster foot on a tier the house does not have',
`${what} declares tier ${ti}, the house has tiers 0–${top}`);
continue;
}
if (u < t.uA - 0.005 || u > t.uB + 0.005)
say(v.id, 'cluster foot off its tier',
`${what} at u ${u.toFixed(3)}, tier ${ti}${ti === top ? ' (crest)' : ''} spans ${t.uA.toFixed(3)}–${t.uB.toFixed(3)}`);
}
}
}
if ((H.tierBands || H.shellBands) && H.decks && SHIPS_HULL.linerHouse) {
const T3 = SHIPS_HULL.linerHouse(H);
const walls = [];
g.traverse(o => { if (o.isMesh && tagOf(o) && tagOf(o).key === 'superstructure'
&& o.geometry.attributes && o.geometry.attributes.color) walls.push(o); });
const scan = (y0, y1) => {
let dark = 0, light = 0, all = 0;
for (const m of walls) {
const P = m.geometry.attributes.position, C = m.geometry.attributes.color;
for (let i = 0; i < P.count; i++) {
const y = P.getY(i);
if (y < y0 + 0.05 || y > y1 - 0.05) continue;
all++;
const l = 0.2126 * C.getX(i) + 0.7152 * C.getY(i) + 0.0722 * C.getZ(i);
if (l < 0.10) dark++; else if (l > 0.4) light++;
}
}
return { dark, light, all };
};
for (let i = 0; i < T3.n; i++) {
const t = T3.tiers[i];
const TBr = H.tierBands, SBr = H.shellBands;
const b = (TBr && !t.recess && i >= TBr.from && i <= TBr.to) ? TBr
: ((SBr && t.shell && !t.recess) ? SBr : null);
if (!b) continue;
const r = scan(t.y0, t.y1);
if (!r.all || r.dark / Math.max(1, r.all) < 0.08)
say(v.id, 'band declared but not worn',
`tier ${i}: ${r.dark} of ${r.all} wall vertices carry band glass`);
if (t.shell && H.shellTopside && r.all && r.light / r.all < 0.3)
say(v.id, 'strake off its recorded paint',
`tier ${i}: ${r.light} of ${r.all} wall vertices carry the shellTopside livery`);
}
}
if (H.boatDeckM && H.boats && part.boat)
if (Math.abs(part.boat.y[0] - H.boatDeckM) > 1.5)
say(v.id, 'boats off their recorded deck',
`lowest boat at ${part.boat.y[0].toFixed(1)} m over water, record says ${H.boatDeckM}`);
if (H.boatsInboard && part.boat)
say(v.id, 'boats drawn against an inboard record',
`${part.boat.n} boat meshes topside; the record stows the tenders inside the shell`);
if (H.davitBoats && H.davitBoats.length) {
const qb = [];
g.traverse(o => { if (o.isMesh && o.userData.part &&
o.userData.part.name === 'Quarter boat')
qb.push(new THREE.Box3().setFromObject(o)); });
if (qb.length !== H.davitBoats.length * 2)
say(v.id, 'davit boat declared but not drawn',
`${H.davitBoats.length * 2} quarter boats declared, ${qb.length} drawn`);
const HSq = SHIPS_HULL.hullSurface(H);
for (const b of qb) {
const u = Math.max(0.001, Math.min(0.999, 0.5 + ((b.min.x + b.max.x) / 2) / H.lwl));
const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSq, u, 1)[2]);
const zin = Math.min(Math.abs(b.min.z), Math.abs(b.max.z));
if (Math.sign(b.min.z) !== Math.sign(b.max.z) || zin < half - 0.15)
say(v.id, 'davit boat buried in the shell',
`inboard edge ${zin.toFixed(2)} m off centre, hull side there ${half.toFixed(2)} m`);
if (b.min.y < 0.5)
say(v.id, 'davit boat in the water',
`keel at ${b.min.y.toFixed(2)} m over the load waterline`);
}
}
{
let pk = null;
g.traverse(o => { if (!pk && o.isMesh && tagOf(o) && tagOf(o).key === 'planking') pk = o; });
if (pk && pk.geometry && pk.geometry.attributes.position) {
const P = pk.geometry.attributes.position;
const wlBand = Math.min(0.6, 0.25 * H.draught + 0.1);
let topB = -1e9, topS = -1e9;
for (let i = 0; i < P.count; i++) {
const x = P.getX(i), y = P.getY(i);
if (x < 0) topB = Math.max(topB, y); else topS = Math.max(topS, y);
}
let foreWL = 1e9, foreDk = 1e9, aftWL = -1e9, aftDk = -1e9;
for (let i = 0; i < P.count; i++) {
const x = P.getX(i), y = P.getY(i);
if (Math.abs(y) < wlBand) { foreWL = Math.min(foreWL, x); aftWL = Math.max(aftWL, x); }
if (x < 0 && y > topB - 1.2) foreDk = Math.min(foreDk, x);
if (x > 0 && y > topS - 1.2) aftDk = Math.max(aftDk, x);
}
const rakeAllow = ((H.stemRake || 0) + (H.sternRake || 0)) * H.loa;
const rakeScale = rakeAllow > 0
? Math.min(1, Math.max(0, H.loa - H.lwl) / rakeAllow) : 1;
for (const [name, want, got] of [
['stem', H.stemRake * rakeScale * H.loa, foreWL - foreDk],
['sternpost', H.sternRake * rakeScale * H.loa, aftDk - aftWL]]) {
if (want > 1.5 && Math.abs(got - want) > Math.max(1.2, want * 0.4))
say(v.id, 'a recorded rake drawn vertical',
`${name}: record asks a ${want.toFixed(1)} m lean, drawn ${got.toFixed(1)} m`);
}
let px0 = 1e9, px1 = -1e9;
for (let i = 0; i < P.count; i++) {
const x = P.getX(i);
if (x < px0) px0 = x; if (x > px1) px1 = x;
}
const drawnL = px1 - px0;
if (drawnL > H.loa + Math.max(0.25, H.loa * 0.002))
say(v.id, 'drawn length beyond record loa',
`planking spans ${drawnL.toFixed(2)} m against loa ${H.loa} m`);
}
}
const house = part.superstructure || part.island;
if (H.decks && !house)
say(v.id, 'no superstructure', `decks: ${H.decks} and nothing built`);
if (H.decks && house && house.n < H.decks)
say(v.id, 'thin superstructure', `${house.n} meshes for ${H.decks} decks`);
if (H.decks && house && house.y[1] < deckY)
say(v.id, 'superstructure below deck',
`house top ${house.y[1].toFixed(1)} m, deck ${deckY.toFixed(1)} m`);
if (part.funnel && H.funnels > 1) {
const c = part.funnel.xs.slice().sort((a, b) => a - b);
const distinct = c.filter((x, i) => i === 0 || Math.abs(x - c[i - 1]) > H.loa * 0.02);
if (distinct.length < H.funnels)
say(v.id, 'funnels share a station',
`${H.funnels} declared, ${distinct.length} distinct positions`);
const fh = part.funnel.y[1] - deckY;
if (fh > H.beam * 1.35)
say(v.id, 'funnel height', `${fh.toFixed(0)} m above deck on a ${H.beam} m beam`);
}
if (H.funnels && part.funnel) {
const want = H.funnelRake !== undefined ? H.funnelRake : 4.87;
let worst = null;
g.updateMatrixWorld(true);
g.traverse(o => {
if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Funnel') return;
const pos = o.geometry.attributes.position;
o.geometry.computeBoundingBox();
const bbL = o.geometry.boundingBox, span = bbL.max.y - bbL.min.y;
if (!pos || span < 1e-6) return;
const lo = bbL.min.y + span * 0.15, hi = bbL.max.y - span * 0.15;
const a = new THREE.Vector3(), b = new THREE.Vector3(), v = new THREE.Vector3();
let na = 0, nb = 0;
for (let j = 0; j < pos.count; j++) {
v.fromBufferAttribute(pos, j);
if (v.y <= lo) { a.add(v); na++; }
else if (v.y >= hi) { b.add(v); nb++; }
}
if (!na || !nb) return;
a.divideScalar(na).applyMatrix4(o.matrixWorld);
b.divideScalar(nb).applyMatrix4(o.matrixWorld);
const d = b.sub(a);
const got = Math.atan2(d.x, d.y) * 180 / Math.PI;
if (worst === null || Math.abs(got - want) > Math.abs(worst - want)) worst = got;
});
if (worst === null)
say(v.id, 'funnel rake unmeasurable', 'no stack mesh tagged Funnel');
else if (Math.abs(worst - want) > 1.5)
say(v.id, 'funnel rake not worn',
`drawn ${worst.toFixed(1)}° aft, record says ${want}°`);
}
const tripods = (H.masts || []).filter(mk => mk.tripod).length;
if (tripods) {
let legs = 0, tops = 0, uprightLegs = 0;
g.updateMatrixWorld(true);
g.traverse(o => {
if (!o.isMesh || !o.userData.part) return;
if (o.userData.part.name === 'Tripod leg') {
legs++;
const d = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
if (Math.acos(Math.min(1, Math.abs(d.y))) * 180 / Math.PI < 6) uprightLegs++;
}
if (o.userData.part.name === 'Spotting top') tops++;
});
if (legs !== tripods * 2)
say(v.id, 'tripod not worn',
`${tripods * 2} struts in the record, ${legs} drawn`);
if (tops !== tripods)
say(v.id, 'tripod not worn',
`${tripods} spotting tops in the record, ${tops} drawn`);
if (uprightLegs)
say(v.id, 'tripod not worn',
`${uprightLegs} strut(s) standing vertical — a tripod's legs LEAN`);
}
if (H.turrets && H.turretAt && H.turretSide) {
const wantSides = H.turretAt.slice(0, H.turrets)
.map((u, i) => H.turretSide[i] || 0).sort();
const mains = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part &&
o.userData.part.key === 'turret' &&
o.userData.part.name === 'Main battery')
mains.push(o); });
const gotSides = mains.map(o => {
const bbx = new THREE.Box3().setFromObject(o);
const zc = (bbx.min.z + bbx.max.z) / 2;
return zc > H.beam * 0.12 ? 1 : zc < -H.beam * 0.12 ? -1 : 0;
}).sort();
if (wantSides.join() !== gotSides.join())
say(v.id, 'wing turret not on the wing',
`record sides [${wantSides.join()}], drawn [${gotSides.join()}]`);
}
if (H.netDefence) {
const G = SHIPS_HULL.netDefenceGeom(H);
const HSn = SHIPS_HULL.hullSurface(H);
const booms = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isMesh && o.userData.part &&
o.userData.part.name === 'Net boom') booms.push(o); });
if (booms.length !== G.heels.length * 2)
say(v.id, 'net defence not worn',
`${G.heels.length * 2} booms derived from the record, ${booms.length} drawn`);
for (const o of booms) {
const d = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
if (Math.abs(d.x) < 0.85 || Math.abs(d.y) < 0.10 || Math.abs(d.y) > 0.50)
say(v.id, 'net boom not stowed',
`a boom points (${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${d.z.toFixed(2)}) — ` +
'stowed spars lie fore-and-aft against the hull, drooping to the tip');
const bbx = new THREE.Box3().setFromObject(o);
const u = Math.max(0.001, Math.min(0.999, 0.5 + ((bbx.min.x + bbx.max.x) / 2) / H.lwl));
if (bbx.min.y < 0.3)
say(v.id, 'net boom in the water', `bottom at ${bbx.min.y.toFixed(2)} m`);
if (bbx.max.y > HSn.sheer(u) + 0.3)
say(v.id, 'net boom above the deck edge',
`top ${bbx.max.y.toFixed(1)} m, sheer there ${HSn.sheer(u).toFixed(1)} m`);
const zc = (Math.abs(bbx.min.z) + Math.abs(bbx.max.z)) / 2;
const k = Math.max(0, Math.min(1, (G.shelfY - G.drop / 2) / HSn.sheer(u)));
const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSn, u, 0.62 + 0.38 * k)[2]);
if (zc < half - 0.7 || zc > half + 1.4)
say(v.id, 'net boom off the plating',
`boom centre ${zc.toFixed(1)} m off the centreline, hull side there ${half.toFixed(1)} m`);
}
if (!part.net) say(v.id, 'declared but not drawn', 'net defence');
else {
const span = part.net.x[1] - part.net.x[0];
const want = (G.u1 - G.u0) * H.lwl;
if (span < want * 0.85)
say(v.id, 'net shelf short',
`${span.toFixed(0)} m drawn against ${want.toFixed(0)} m in the record`);
}
}
const halfWide = (H.flightDeck ? H.flightDeck : H.beam) * 0.52;
for (const k of ['superstructure', 'island', 'container', 'turret'])
if (part[k] && Math.max(-part[k].z[0], part[k].z[1]) > halfWide)
say(v.id, 'overhangs the side',
`${k} reaches ${Math.max(-part[k].z[0], part[k].z[1]).toFixed(1)} m off centre, limit ${halfWide.toFixed(1)}`);
if (H.decks && house) {
const g2 = g; g2.updateMatrixWorld(true);
const isHouse = o => { const p = tagOf(o); return !!(p && (p.key === 'superstructure' || p.key === 'island')); };
const hb = new THREE.Box3(); hb.makeEmpty();
g2.traverse(o => { if (o.isMesh && isHouse(o)) hb.expandByObject(o); });
const cx = (hb.min.x + hb.max.x) / 2, cz = (hb.min.z + hb.max.z) / 2;
const deck1 = Math.min(H.beam * 0.105, Math.max(0.4, hb.max.y - hb.min.y));
const rc = new THREE.Raycaster(); let through = 0, shot = 0;
for (const f of [0.25, 0.5, 0.75]) {
const y = hb.min.y + deck1 * f;
for (let b = 0; b < 36; b++) {
const th = b * Math.PI / 18;
rc.set(new THREE.Vector3(cx + Math.cos(th) * 500, y, cz + Math.sin(th) * 500),
new THREE.Vector3(-Math.cos(th), 0, -Math.sin(th)).normalize());
rc.far = 1200; shot++;
if (!rc.intersectObject(g2, true).some(h => isHouse(h.object))) through++;
}
}
if (through) say(v.id, 'you can see through the deckhouse',
`${through} of ${shot} bearings pass through the lowest tier`);
}
if (H.paddleDia) {
const pb = part.paddlebox;
if (!pb) say(v.id, 'paddle box not built', 'a paddle steamer with an open wheel');
else {
const D = H.paddleDia;
if (pb.x[1] - pb.x[0] < D * 0.9)
say(v.id, 'paddle box does not span its wheel',
`box ${(pb.x[1] - pb.x[0]).toFixed(1)} m fore-and-aft on a ${D} m wheel`);
if (!(pb.z[0] < 0 && pb.z[1] > 0))
say(v.id, 'paddle box on one side only',
`z ${pb.z[0].toFixed(1)}..${pb.z[1].toFixed(1)} m`);
g.updateMatrixWorld(true);
const isPB = o => { const p = tagOf(o); return !!(p && p.key === 'paddlebox'); };
const rc = new THREE.Raycaster();
const cx = (pb.x[0] + pb.x[1]) / 2, W = pb.x[1] - pb.x[0], Hh = pb.y[1] - pb.y[0];
let miss = 0, shot = 0, sample = '';
for (const sgn of [1, -1])
for (const fx of [-0.30, -0.15, 0, 0.15, 0.30])
for (const fy of [0.20, 0.40, 0.60]) {
rc.set(new THREE.Vector3(cx + fx * W, pb.y[0] + fy * Hh, sgn * 500),
new THREE.Vector3(0, 0, -sgn));
rc.far = 1000; shot++;
const h = rc.intersectObject(g, true);
if (!h.length || !isPB(h[0].object)) {
miss++;
if (!sample) sample = h.length
? `first hit at (${fx}, ${fy}) is ${(tagOf(h[0].object) || { key: 'untagged' }).key}`
: `the ray at (${fx}, ${fy}) hits nothing at all`;
}
}
if (miss) say(v.id, 'you can see through the paddle box',
`${miss} of ${shot} rays from abeam do not strike the box first — ${sample}`);
}
}
{
const parts = [];
g.traverse(o => { if (o.isMesh && tagOf(o)) parts.push(new THREE.Box3().setFromObject(o)); });
const pad = Math.max(0.25, H.loa * 0.004);
const adrift = [];
for (let i = 0; i < parts.length; i++) {
const a = parts[i].clone().expandByScalar(pad);
let touches = false;
for (let j = 0; j < parts.length && !touches; j++)
if (j !== i && a.intersectsBox(parts[j])) touches = true;
if (!touches) adrift.push(i);
}
if (adrift.length) say(v.id, 'part attached to nothing',
`${adrift.length} of ${parts.length} meshes touch no other part`);
}
{
const HSr = SHIPS_HULL.hullSurface(H);
const spr = u => SHIPS_HULL.surfacePoint(H, HSr, u, 1);
const NSr = 2000, rxs = [], rus = [];
for (let i = 0; i <= NSr; i++) { const u = i / NSr; rus.push(u); rxs.push(spr(u)[0]); }
const uOfX = x => { let bi = 0, bd = Infinity;
for (let i = 0; i <= NSr; i++) { const d = Math.abs(rxs[i] - x); if (d < bd) { bd = d; bi = i; } }
return rus[bi]; };
const rr = H.capM ? H.capM / 1.6 : H.beam * 0.016;
const tol = Math.max(0.25, rr * 1.2);
let off = 0, worst = 0, wu = null, walked = 0;
g.traverse(o => { const p = tagOf(o);
if (!o.isMesh || !p || p.key !== 'rail') return;
const pos = o.geometry.attributes.position;
for (let k = 0; k + 3 < pos.count; k += 4) {
let maxZ = 0;
for (let j = 0; j < 4; j++) maxZ = Math.max(maxZ, Math.abs(pos.getZ(k + j)));
const u = uOfX(pos.getX(k));
const err = maxZ - (Math.abs(spr(u)[2]) + rr * 0.3);
walked++;
if (Math.abs(err) > tol) { off++;
if (Math.abs(err) > Math.abs(worst)) { worst = err; wu = u; } }
}
});
if (off) say(v.id, 'rail off its deck edge',
`${off} of ${walked} rail stations off the surface edge, worst ` +
`${worst.toFixed(2)} m (${worst < 0 ? 'inboard' : 'outboard'}) at u ${wu}`);
}
if (H.turrets && part.turret && (part.superstructure || part.island)) {
const houseBoxes = [], lofts = [];
g.updateMatrixWorld(true);
g.traverse(o => { const p = tagOf(o);
if (!o.isMesh || !p || (p.key !== 'superstructure' && p.key !== 'island')) return;
if (p.name === 'Citadel deck' || p.name === 'Shelter deck') lofts.push(o);
else houseBoxes.push(new THREE.Box3().setFromObject(o)); });
const inLoft = (mesh, c) => {
const pos = mesh.geometry.attributes.position;
const lc = mesh.worldToLocal(c.clone());
let best = -1, bd = Infinity;
for (let k = 0; k * 4 < pos.count; k++) {
const d = Math.abs(pos.getX(k * 4) - lc.x);
if (d < bd) { bd = d; best = k; }
}
if (best < 0) return false;
const half = Math.abs(pos.getZ(best * 4 + 1));
const y0 = pos.getY(best * 4), y1 = pos.getY(best * 4 + 2);
return bd < 2.5 && Math.abs(lc.z) < half + 0.05 &&
lc.y > Math.min(y0, y1) - 0.05 && lc.y < Math.max(y0, y1) + 0.05;
};
let buried = 0;
g.traverse(o => { const p = tagOf(o);
if (!o.isMesh || !p || p.key !== 'turret' || p.name === 'Barbette') return;
const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
if (houseBoxes.some(hbx => hbx.containsPoint(c)) ||
lofts.some(m => inLoft(m, c))) buried++; });
if (buried) say(v.id, 'turret buried in the superstructure',
`${buried} gunhouse/gun meshes centred inside deckhouse geometry`);
}
if (H.turrets) {
g.updateMatrixWorld(true);
const turretGroups = [];
g.traverse(o => { if (o.userData.part && o.userData.part.key === 'turret' && o.isGroup)
turretGroups.push(o); });
for (const tgp of turretGroups) {
let guns = null, house = null;
tgp.traverse(o => { if (!o.isMesh || !o.userData.part) return;
const bbx = new THREE.Box3().setFromObject(o);
if (o.userData.part.name === 'Main gun') guns = guns ? guns.union(bbx) : bbx;
if (o.userData.part.name === 'Turret') house = house ? house.union(bbx) : bbx; });
if (!guns || !house) continue;
const u = 0.5 + ((house.min.x + house.max.x) / 2) / H.lwl;
const fwd = u < 0.5;
if (fwd ? guns.min.x > house.min.x - 0.5 : guns.max.x < house.max.x + 0.5)
say(v.id, 'guns point the wrong way',
`mount at u=${u.toFixed(2)} faces ${fwd ? 'the bow' : 'the stern'} but its barrels do not clear the gunhouse that way`);
}
}
if (H.turrets) {
const expect = H.turrets +
(H.secondaries || []).reduce((a, s) => a + (s.wing ? 2 : 1), 0);
const drawn = [];
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'turret')
drawn.push(o); });
if (drawn.length !== expect)
say(v.id, 'battery miscounted',
`${expect} mounts in the record (${H.turrets} main), ${drawn.length} drawn`);
}
if (H.aa && H.aa.length) {
const mounts = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'aa')
mounts.push(new THREE.Box3().setFromObject(o)); });
if (mounts.length !== H.aa.length * 2)
say(v.id, 'high-angle battery miscounted',
`${H.aa.length * 2} mounts in the record, ${mounts.length} drawn`);
for (const mb of mounts) {
if (Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)) > H.beam / 2 + 0.5)
say(v.id, 'high-angle mount outside the beam',
`z reaches ${Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)).toFixed(1)} m on ${(H.beam / 2).toFixed(1)} m of half-beam`);
}
if (part.superstructure && mounts.length &&
mounts.some(mb => mb.min.y < part.superstructure.y[0] ||
mb.min.y > part.superstructure.y[1] + 1.4))
say(v.id, 'high-angle mount stands on nothing',
'a mount bottom is below the citadel or floats above its roofline');
}
if (H.aaLight && H.aaLight.length) {
const mounts = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'aaLight')
mounts.push(new THREE.Box3().setFromObject(o)); });
if (mounts.length !== H.aaLight.length * 2)
say(v.id, 'light battery miscounted',
`${H.aaLight.length * 2} mounts in the record, ${mounts.length} drawn`);
for (const mb of mounts) {
if (Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)) > H.beam / 2 + 0.5)
say(v.id, 'light AA mount outside the beam',
`z reaches ${Math.max(Math.abs(mb.min.z), Math.abs(mb.max.z)).toFixed(1)} m`);
if (part.superstructure && (mb.min.y < part.superstructure.y[0] ||
mb.min.y > part.superstructure.y[1] + 1.4))
say(v.id, 'light AA mount stands on nothing',
'a bandstand bottom is below the citadel or floats above its roofline');
}
}
if (H.searchlights) {
let drums = 0;
g.traverse(o => { if (o.isMesh && o.userData.part &&
o.userData.part.name === 'Searchlight') drums++; });
if (drums !== H.searchlights)
say(v.id, 'searchlights miscounted',
`${H.searchlights} in the record, ${drums} drawn`);
}
if (H.floatplanes) {
const HSf = SHIPS_HULL.hullSurface(H);
const planes = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'floatplane')
planes.push(new THREE.Box3().setFromObject(o)); });
if (planes.length !== H.floatplanes)
say(v.id, 'floatplanes miscounted',
`${H.floatplanes} in the record, ${planes.length} drawn`);
for (const pb of planes) {
const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((pb.min.x + pb.max.x) / 2) / H.lwl));
const d = pb.min.y - HSf.deck(uu);
if (d < -0.6 || d > 3.6)
say(v.id, 'floatplane stands on nothing',
`float bottom ${d.toFixed(1)} m off the deck at its station`);
if (Math.max(Math.abs(pb.min.z), Math.abs(pb.max.z)) > H.beam / 2 + 0.5)
say(v.id, 'floatplane off the ship',
`z reaches ${Math.max(Math.abs(pb.min.z), Math.abs(pb.max.z)).toFixed(1)} m`);
}
}
if (H.deckHatches && H.deckHatches.length) {
const HSh = SHIPS_HULL.hullSurface(H);
const hs = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'hatch')
hs.push({ grp: o, box: new THREE.Box3().setFromObject(o) }); });
if (hs.length !== H.deckHatches.length)
say(v.id, 'stowage hatches miscounted',
`${H.deckHatches.length} in the record, ${hs.length} drawn`);
for (const { box: hb } of hs) {
const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((hb.min.x + hb.max.x) / 2) / H.lwl));
const zc = (hb.min.z + hb.max.z) / 2;
const bB = Math.abs(SHIPS_HULL.surfacePoint(H, HSh, uu, 1.0)[2]);
const camber = Math.cos((zc / bB) * Math.PI / 2) * bB * 0.035;
const d = hb.min.y - (HSh.deck(uu) + camber);
if (d < -0.6 || d > 0.6)
say(v.id, 'hatch off the deck',
`coaming bottom ${d.toFixed(2)} m from the cambered deck at its station`);
}
for (const hc of H.deckHatches) {
const rx = (hc.at - 0.5) * H.lwl;
const rz = (hc.z || 0) * Math.abs(SHIPS_HULL.surfacePoint(H, HSh, hc.at, 1.0)[2]);
let best = null, bd = Infinity;
for (const h of hs) {
const c = h.box.getCenter(new THREE.Vector3());
const d2 = (c.x - rx) ** 2 + (c.z - rz) ** 2;
if (d2 < bd) { bd = d2; best = h; }
}
if (!best) continue;
const rc = new THREE.Raycaster(); rc.far = 60;
const down = new THREE.Vector3(0, -1, 0);
const top = best.box.max.y + 5;
const hitY = (dx, dz) => {
rc.set(new THREE.Vector3(rx + dx, top, rz + dz), down);
const h2 = rc.intersectObject(best.grp, true);
return h2.length ? h2[0].point.y : -Infinity;
};
const hC = Math.max(hitY(0, 0), hitY(-hc.lenM * 0.16, 0), hitY(hc.lenM * 0.16, 0));
const hR = Math.max(hitY(0, hc.widM / 2 - 0.07), hitY(0, -(hc.widM / 2 - 0.07)));
if (hR === -Infinity)
say(v.id, 'hatch has no coaming', 'no surface under the rim line');
else if (hC >= hR - 0.02)
say(v.id, 'hatch cover stands proud of its own coaming',
`cover line ${hC.toFixed(2)} m, rim line ${hR.toFixed(2)} m — ` +
'a lid stacked on a box, not a cover dropped into a ring');
}
}
if (H.catapults) {
const HS3 = SHIPS_HULL.hullSurface(H);
const cats = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'catapult')
cats.push(new THREE.Box3().setFromObject(o)); });
const wanted = 2 + (H.sternCrane ? 1 : 0);
if (cats.length !== wanted)
say(v.id, 'aviation deck miscounted',
`${wanted} structures in the record (2 catapults${H.sternCrane ? ' + crane' : ''}), ${cats.length} drawn`);
for (const cb of cats) {
const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((cb.min.x + cb.max.x) / 2) / H.lwl));
if (Math.abs(cb.min.y - HS3.deck(uu)) > 1.5)
say(v.id, 'catapult stands on nothing',
`bottom at ${cb.min.y.toFixed(1)} m, deck there ${HS3.deck(uu).toFixed(1)} m`);
}
}
if (H.turrets) {
const HS2 = SHIPS_HULL.hullSurface(H);
const houseBoxes2 = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && (p.key === 'superstructure' || p.key === 'island'))
houseBoxes2.push(new THREE.Box3().setFromObject(o)); });
const turretGroups2 = [];
g.traverse(o => { if (o.userData.part && o.userData.part.key === 'turret' && o.isGroup)
turretGroups2.push(o); });
for (const tgp of turretGroups2) {
const tb = new THREE.Box3().setFromObject(tgp);
const u = Math.max(0.001, Math.min(0.999, 0.5 + ((tb.min.x + tb.max.x) / 2) / H.lwl));
const onDeck = Math.abs(tb.min.y - HS2.deck(u)) < 1.4;
const onHouse = houseBoxes2.some(hbx =>
Math.abs(tb.min.y - hbx.max.y) < 1.4 &&
tb.max.x > hbx.min.x && tb.min.x < hbx.max.x &&
tb.max.z > hbx.min.z && tb.min.z < hbx.max.z);
if (!onDeck && !onHouse)
say(v.id, 'turret stands on nothing',
`bottom at ${tb.min.y.toFixed(1)} m, deck there ${HS2.deck(u).toFixed(1)} m, no house beneath`);
}
}
if ((H.build === 'steel' || H.build === 'iron') && part.rudder) {
if (part.rudder.y[1] > 0.5)
say(v.id, 'rudder out of the water',
`top at ${part.rudder.y[1].toFixed(1)} m on a ${H.build} build`);
if (part.planking && part.rudder.x[1] > part.planking.x[1] + H.loa * 0.01)
say(v.id, 'rudder hung past the stern',
`${(part.rudder.x[1] - part.planking.x[1]).toFixed(1)} m beyond the hull`);
}
if (H.build === 'steel' || H.build === 'iron') {
if (part.transom)
say(v.id, 'timber transom on a welded ship',
'a fitted transom plate is timber-era; a steel stern closes with the hull cap');
if (part.stempost && part.planking) {
const past = Math.max(part.planking.x[0] - part.stempost.x[0],
part.stempost.x[1] - part.planking.x[1]);
if (past > 0.01)
say(v.id, 'post proud of a welded hull',
`stem or sternpost stands ${past.toFixed(2)} m outside the shell`);
}
}
if (H.sternLights) {
if (!part.sternlight) say(v.id, 'declared but not drawn', 'stern lights');
else if (part.planking && part.sternlight.x[1] < part.planking.x[1])
say(v.id, 'stern furniture buried in the hull',
`lights end ${(part.planking.x[1] - part.sternlight.x[1]).toFixed(2)} m inboard ` +
'of the aft face');
}
if (H.gunDecks && H.transom && H.build !== 'steel' && H.build !== 'iron') {
if (!part.gallery) say(v.id, 'declared but not drawn', 'quarter galleries');
else if (part.planking && part.gallery.x[1] < part.planking.x[1])
say(v.id, 'stern furniture buried in the hull',
`galleries end ${(part.planking.x[1] - part.gallery.x[1]).toFixed(2)} m inboard ` +
'of the aft face');
}
if (H.sternLights) {
const sl = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'sternlight') sl.push(o); });
const sashes = sl.filter(o => o.geometry && o.geometry.type === 'ExtrudeGeometry');
const sheets = sl.filter(o => o.geometry && o.geometry.type === 'BoxGeometry'
&& o.material && o.material.metalness >= 0.3);
if (sashes.length < H.sternLights)
say(v.id, 'a glazed tier with no aperture',
`${H.sternLights} tier(s) declared, ${sashes.length} pierced sash frame(s) `
+ 'drawn — a light laid ON a solid wall is a slab, not a window');
const gridRec = H.sternLightPanes || [3, 3];
const perLight = gridRec[0] * gridRec[1];
for (const fr of sashes) {
const shp = fr.geometry.parameters.shapes;
const holes = (shp && shp.holes) || [];
if (!holes.length) {
say(v.id, 'a glazed tier with no aperture',
'sash frame extruded without a single hole');
continue;
}
const nL = holes.length / perLight;
if (holes.length % perLight !== 0 || nL < 3 || nL > 7)
say(v.id, "stern lights off the record's grid",
`${holes.length} apertures cannot be an integer 3–7 lights of `
+ `${gridRec[0]}×${gridRec[1]} panes`);
let big = 0, dims = '';
for (const hp of holes) {
let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
for (const q of hp.getPoints(1)) {
a0 = Math.min(a0, q.x); a1 = Math.max(a1, q.x);
b0 = Math.min(b0, q.y); b1 = Math.max(b1, q.y);
}
if (a1 - a0 > 0.45 || b1 - b0 > 0.45) {
big++;
if (!dims) dims = `${(a1 - a0).toFixed(2)} × ${(b1 - b0).toFixed(2)} m`;
}
}
if (big)
say(v.id, 'a pane nobody could cast',
`${big} aperture(s) over 0.45 m — the first ${dims}`);
}
if (sashes.length && sheets.length) {
const sashOut = Math.min(...sashes.map(o =>
o.position.x + (o.geometry.parameters.options.depth || 0)));
const glassOut = Math.max(...sheets.map(o =>
o.position.x + o.geometry.parameters.width / 2));
if (glassOut > sashOut - 0.005)
say(v.id, 'glazing proud of its own sash',
`glass face at x ${glassOut.toFixed(3)}, sash face at `
+ `${sashOut.toFixed(3)} — panes sit in a rebate behind their bars`);
} else if (sashes.length && !sheets.length)
say(v.id, 'a sash with no glass behind it', 'no glazing sheet in any tier');
}
{
const capm = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'capstan') capm.push(o); });
if (capm.length && !H.capstan)
say(v.id, 'a machine the record does not carry',
`${capm.length} capstan meshes drawn with no capstan field — this hull's `
+ 'tradition attests other gear, and silence draws nothing');
if (H.capstan && !capm.length)
say(v.id, 'declared but not drawn', 'capstan');
if (H.capstan && capm.length && H.capstan.form === 'spill') {
const vr = o => {
const a = o.geometry.attributes.position; let y0 = 1e9, y1 = -1e9;
for (let i = 0; i < a.count; i++) { const yy = a.getY(i); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
return [y0, y1];
};
const cgrp = capm[0].parent;
const isBar = o => Math.abs(o.rotation.z) > 0.1 || Math.abs(o.rotation.x) > 0.1;
const verts = capm.filter(o => !isBar(o)), bars = capm.filter(isBar);
const prof = o => {
const a = o.geometry.attributes.position;
const [y0, y1] = vr(o); let rB = 0, rT = 0, rMax = 0, rMin = 1e9;
for (let i = 0; i < a.count; i++) {
const r = Math.hypot(a.getX(i), a.getZ(i)), yy = a.getY(i);
rMax = Math.max(rMax, r); rMin = Math.min(rMin, r);
if (yy < y0 + 0.02) rB = Math.max(rB, r);
if (yy > y1 - 0.02) rT = Math.max(rT, r);
}
return { y0: o.position.y + y0, y1: o.position.y + y1, rB, rT, rMax, rMin,
off: Math.hypot(o.position.x, o.position.z) };
};
const P = new Map(verts.map(o => [o, prof(o)]));
let cone = null, foot = 1e9, lowest = 1e9;
for (const o of verts) {
const q = P.get(o); lowest = Math.min(lowest, q.y0);
if (q.off < 0.05 && q.rMin < 0.05 && q.rB >= 1.08 * q.rT && q.y0 < foot) {
foot = q.y0; cone = o;
}
}
if (!cone || foot > lowest + 0.02)
say(v.id, 'a spill with no cone to take the rope',
cone ? `the cone's foot ${(foot - lowest).toFixed(2)} m above the lowest part`
: 'no body on the axis widens toward the deck — the museum: the rope ran round the lower cone');
else {
const cq = P.get(cone), coneTop = cq.y1;
let head = null, hq = null;
for (const o of verts) {
if (o === cone) continue;
const q = P.get(o);
if (q.off < 0.05 && (!hq || q.y1 > hq.y1)) { head = o; hq = q; }
}
const headBot = hq ? hq.y0 : 0, headTop = hq ? hq.y1 : 0, headR = hq ? hq.rMax : 0;
if (!head || headBot > coneTop + 0.05 || headR <= cq.rT)
say(v.id, 'a spill with no head for the handspikes',
head ? `head radius ${headR.toFixed(2)} m against a neck of ${cq.rT.toFixed(2)}, `
+ `standing ${(headBot - coneTop).toFixed(2)} m over the cone`
: 'nothing stands above the cone');
else {
if (!bars.length)
say(v.id, 'a spill nobody shipped a handspike in', '0 bars drawn');
for (const b of bars) {
const off = Math.hypot(b.position.x, b.position.z);
if (off > 0.5 * headR || b.position.y < headBot || b.position.y > headTop)
say(v.id, 'a handspike that does not pass through the head',
`bar ${off.toFixed(2)} m off the spindle's axis at ${b.position.y.toFixed(2)} m, `
+ `head ${headBot.toFixed(2)}–${headTop.toFixed(2)}`);
}
if (H.capstan.bars && bars.length !== H.capstan.bars)
say(v.id, "the spill off the record's count",
`${bars.length} bars shipped, record says ${H.capstan.bars}`);
const footDia = 2 * cq.rB, Ht = headTop - foot;
if (H.capstan.diaM && Math.abs(footDia - H.capstan.diaM) > 0.15 * H.capstan.diaM)
say(v.id, "the spill off the record's diameter",
`foot ${footDia.toFixed(2)} m, record says ${H.capstan.diaM}`);
if (H.capstan.heightM && Math.abs(Ht - H.capstan.heightM) > 0.12 * H.capstan.heightM)
say(v.id, "the spill off the record's height",
`${Ht.toFixed(2)} m foot to head, record says ${H.capstan.heightM}`);
if (H.capstan.onCastle && H.castle) {
const sx = cgrp.position.x; let deckY = -1e9, seen = 0;
g.traverse(o => {
if (!o.isMesh || o.name !== 'castle-deck') return;
const a = o.geometry.attributes.position;
for (let i = 0; i < a.count; i++)
if (Math.abs(a.getX(i) - sx) < 0.5) { deckY = Math.max(deckY, a.getY(i)); seen++; }
});
const footY = cgrp.position.y + foot;
if (!seen)
say(v.id, 'a spill on a castle that is not there',
`no castle-deck vertex within 0.5 m of x ${sx.toFixed(2)}`);
else if (footY < deckY - 0.15 || footY > deckY + 0.05)
say(v.id, 'a spill standing off its deck',
`foot ${footY.toFixed(2)} m, castle deck ${deckY.toFixed(2)} at its station`);
}
for (const b of bars) {
const hb = b.position.y - foot;
if (hb < 0.9 || hb > 1.6)
say(v.id, 'a spill nobody could work',
`handspike ${hb.toFixed(2)} m over the foot — a man pushes at chest height`);
}
if (Ht > 2.2 || Ht < 1.2)
say(v.id, 'a spill nobody built',
`${Ht.toFixed(2)} m tall — the recovered timber is 1.76`);
}
}
}
if (H.capstan && capm.length && H.capstan.form !== 'spill') {
const vrange = o => {
const a = o.geometry.attributes.position;
let y0 = 1e9, y1 = -1e9;
for (let i = 0; i < a.count; i++) {
const yy = a.getY(i); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy);
}
return [y0, y1];
};
const radAt = (o, yq, tol) => {
const a = o.geometry.attributes.position;
const off = Math.hypot(o.position.x, o.position.z);
let r = 0;
for (let i = 0; i < a.count; i++)
if (Math.abs(a.getY(i) - yq) < tol)
r = Math.max(r, Math.hypot(a.getX(i), a.getZ(i)));
return off + r;
};
let head = null, headDia = 0;
for (const o of capm) {
if (o.geometry.type !== 'CylinderGeometry') continue;
const p = o.geometry.parameters;
const dia = 2 * Math.max(p.radiusTop, p.radiusBottom);
if (p.height < dia / 2 && dia > headDia &&
Math.abs(o.rotation.z) < 0.1) { head = o; headDia = dia; }
}
if (!head) say(v.id, 'a capstan with no drumhead', 'no disc atop the barrel');
else {
const headT = head.geometry.parameters.height;
const headUnder = head.position.y - headT / 2;
const headTop = head.position.y + headT / 2;
let deckRef = 1e9;
for (const o of capm) {
if (Math.abs(o.rotation.z) > 0.1) continue;
deckRef = Math.min(deckRef, o.position.y + vrange(o)[0]);
}
const whelps = [], pawls = [];
let bars = 0;
for (const o of capm) {
if (o === head) continue;
if (Math.abs(o.rotation.z) > 0.1) { bars++; continue; }
const [y0, y1] = vrange(o);
if (o.geometry.type === 'BoxGeometry' &&
o.geometry.parameters.height <= 0.1 * headDia &&
o.position.y + y0 < deckRef + 0.1 * headDia) { pawls.push(o); continue; }
if ((o.geometry.type === 'BoxGeometry' ||
o.geometry.type === 'ExtrudeGeometry') &&
(y1 - y0) >= 0.25 * headDia) whelps.push(o);
}
if (H.capstan.whelps && whelps.length !== H.capstan.whelps)
say(v.id, "the capstan off the record's count",
`${whelps.length} whelps drawn, record says ${H.capstan.whelps}`);
if (H.capstan.bars && bars !== H.capstan.bars)
say(v.id, "the capstan off the record's count",
`${bars} bars shipped, record says ${H.capstan.bars}`);
if (whelps.length) {
const tol = 0.05 * headDia;
let baseGap = 1e9, headGap = 1e9, flare = 0;
for (const o of whelps) {
const [y0, y1] = vrange(o);
baseGap = Math.min(baseGap, (o.position.y + y0) - deckRef);
headGap = Math.min(headGap, headUnder - (o.position.y + y1));
const rT = radAt(o, y1, tol), rB = radAt(o, y0, tol);
if (rT > 0) flare = Math.max(flare, rB / rT);
}
if (baseGap > 0.02 * headDia || headGap > 0.02 * headDia)
say(v.id, 'whelps that touch neither deck nor drumhead',
`gap to deck ${baseGap.toFixed(3)} m, to drumhead `
+ `${headGap.toFixed(3)} m — Falconer: drum-head to the deck, both`);
if (flare < 1.08)
say(v.id, 'whelps with no sweep to enlarge',
`base/neck ${flare.toFixed(2)} — buttresses flare; fig 11 reads `
+ '1.15–1.22');
}
if (pawls.length < 2)
say(v.id, 'a capstan that would recoil through its crew',
`${pawls.length} pawl(s) on deck — Falconer bolts two`);
const Habove = headTop - deckRef;
if (headDia > 1.8 || Habove / headDia < 0.55)
say(v.id, 'a capstan nobody built',
`drumhead ${headDia.toFixed(2)} m dia, ${Habove.toFixed(2)} m tall — `
+ 'over 1.8 m or squatter than 0.55 of its own drum');
}
}
}
{
const wm = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'windlass') wm.push(o); });
if (wm.length && !H.windlass)
say(v.id, 'a machine the record does not carry',
`${wm.length} windlass meshes drawn with no windlass field — this hull's `
+ 'record is silent, and silence draws nothing');
if (H.windlass && !wm.length)
say(v.id, 'declared but not drawn', 'windlass');
if (H.windlass && wm.length) {
const R = H.windlass;
const ext = o => {
const a = o.geometry.attributes.position;
const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
for (let i = 0; i < a.count; i++) {
const p = [a.getX(i), a.getY(i), a.getZ(i)];
for (let k = 0; k < 3; k++) {
lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]);
}
}
return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
};
let bar = null, barLen = 0, barDia = 0, barK = 1;
for (const o of wm) {
if (o.geometry.type === 'BoxGeometry') continue;
const e = ext(o);
const k = e[0] > e[1] ? (e[0] > e[2] ? 0 : 2) : (e[1] > e[2] ? 1 : 2);
const dia = (e[(k + 1) % 3] + e[(k + 2) % 3]) / 2;
if (e[k] >= 2.5 * dia && e[k] > barLen) {
bar = o; barLen = e[k]; barDia = dia; barK = k;
}
}
if (!bar)
say(v.id, 'a windlass with no barrel',
'no round timber at least 2.5× its own cross dimension in the group');
else {
const ax = new THREE.Vector3(barK === 0 ? 1 : 0, barK === 1 ? 1 : 0,
barK === 2 ? 1 : 0).applyEuler(bar.rotation);
if (Math.abs(ax.y) >= 0.1 || Math.abs(ax.z) <= 0.95)
say(v.id, 'a windlass stood on end',
`barrel axis (${ax.x.toFixed(2)}, ${ax.y.toFixed(2)}, `
+ `${ax.z.toFixed(2)}) — the machine lies athwartships or it is `
+ 'a capstan wearing the wrong name');
if (R.barrelLenM && Math.abs(barLen - R.barrelLenM) > 0.12 * R.barrelLenM)
say(v.id, "the windlass off the record's length",
`barrel ${barLen.toFixed(2)} m, record says ${R.barrelLenM}`);
if (R.barrelDiaM && Math.abs(barDia - R.barrelDiaM) > 0.15 * R.barrelDiaM)
say(v.id, "the windlass off the record's diameter",
`barrel ${barDia.toFixed(2)} m, record says ${R.barrelDiaM}`);
let wgrp = bar; while (wgrp.parent && wgrp.parent !== g) wgrp = wgrp.parent;
const stationX = wgrp.position.x;
let plank = null;
g.traverse(o => { const p = tagOf(o);
if (!plank && o.isMesh && p && p.key === 'planking') plank = o; });
if (plank) {
const a = plank.geometry.attributes.position;
let zmax = 0;
for (let i = 0; i < a.count; i++)
if (Math.abs(a.getX(i) - stationX) < 0.6)
zmax = Math.max(zmax, Math.abs(a.getZ(i)));
if (zmax > 0 && barLen / 2 > 0.95 * zmax)
say(v.id, 'a windlass through the planking',
`barrel ${barLen.toFixed(2)} m across a deck `
+ `${(2 * zmax).toFixed(2)} m wide at its station`);
}
const stands = wm.filter(o => o.geometry.type === 'BoxGeometry' &&
o.geometry.parameters.height > o.geometry.parameters.width);
for (const sg of [1, -1]) {
const zEnd = bar.position.z + sg * barLen / 2;
if (!stands.some(s => Math.abs(s.position.z - zEnd) < 0.35))
say(v.id, 'a windlass end carried by nothing',
`barrel end at z ${zEnd.toFixed(2)} with no standard within 0.35 m — `
+ 'Falconer supports it at the two ends by two frames of wood');
}
if (stands.length) {
let deckRef = 1e9;
for (const s of stands)
deckRef = Math.min(deckRef,
s.position.y - s.geometry.parameters.height / 2);
const over = bar.position.y - deckRef;
if (!(over >= 0.45 && over <= 0.90))
say(v.id, 'a windlass nobody could heave',
`axis ${over.toFixed(2)} m over the deck — the handspike is levered `
+ 'by a standing man');
if (barDia > 0.9)
say(v.id, 'a windlass nobody bored',
`barrel ${barDia.toFixed(2)} m thick — no handspike reaches through it`);
if (over - barDia / 2 < 0.12)
say(v.id, 'a windlass the cable cannot pass under',
`${(over - barDia / 2).toFixed(2)} m under the barrel`);
}
if (R.throughBars) {
for (const o of wm) {
if (o === bar || o.geometry.type === 'BoxGeometry') continue;
const e = ext(o);
const k2 = e[0] > e[1] ? (e[0] > e[2] ? 0 : 2)
: (e[1] > e[2] ? 1 : 2);
const d2 = (e[(k2 + 1) % 3] + e[(k2 + 2) % 3]) / 2;
if (e[k2] < 1.2 || d2 > 0.15 || e[k2] < 2.5 * d2) continue;
const off = Math.hypot(o.position.x - bar.position.x,
o.position.y - bar.position.y);
if (off > 0.25)
say(v.id, 'a bar the record says passes through the drum',
`bar centre ${off.toFixed(2)} m off the axis — the horong's bars `
+ 'pass clean through, a man at each of the four ends');
}
}
}
}
}
{
const gm = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'grapnel') gm.push(o); });
if (gm.length && !H.grapnel)
say(v.id, 'an anchor the record does not carry',
`${gm.length} grapnel meshes drawn with no grapnel field — this hull's `
+ 'record is silent, and silence draws nothing');
if (H.grapnel && !gm.length)
say(v.id, 'declared but not drawn', 'grapnel');
if (H.grapnel && gm.length) {
const R = H.grapnel;
const tips = gm.filter(o => o.geometry.type === 'SphereGeometry');
if (tips.length !== 4)
say(v.id, 'a grapnel without its four arms',
`${tips.length} arm tips drawn — the record's anchor crosses two pairs`);
if (R.spanM && tips.length >= 2) {
const cs = tips.map(o => o.getWorldPosition(new THREE.Vector3()));
let span = 0;
for (let i = 0; i < cs.length; i++)
for (let j = i + 1; j < cs.length; j++)
span = Math.max(span, cs[i].distanceTo(cs[j]));
if (Math.abs(span - R.spanM) > 0.10 * R.spanM)
say(v.id, "the grapnel off the record's span",
`arms ${span.toFixed(2)} m tip to tip, record says ${R.spanM}`);
}
const bb = new THREE.Box3();
for (const o of gm) if (o.name !== 'grap-coil' && o.name !== 'grap-cable')
bb.union(new THREE.Box3().setFromObject(o));
const ug = Math.max(0, Math.min(1,
((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
const rayG = new THREE.Raycaster();
rayG.set(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.5,
(bb.min.z + bb.max.z) / 2),
new THREE.Vector3(0, -1, 0));
const underG = rayG.intersectObject(g, true).filter(h => {
const p = tagOf(h.object);
return !(p && (p.key === 'grapnel' || NONBEARING.has(p.key))); });
if (!underG.length)
say(v.id, 'an anchor resting on nothing',
`no surface under the assembly at u ${ug.toFixed(2)}`);
else {
const gapG = bb.min.y - underG[0].point.y;
if (gapG > 0.25)
say(v.id, 'an anchor floating over its own deck',
`lowest point ${gapG.toFixed(2)} m above the surface under it at u ${ug.toFixed(2)}`);
if (gapG < -0.20)
say(v.id, 'an anchor through the planking',
`lowest point ${(-gapG).toFixed(2)} m into the surface under it at u ${ug.toFixed(2)}`);
}
}
}
{
const am = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'stoneAnchor') am.push(o); });
if (am.length && !H.stoneAnchor)
say(v.id, 'an anchor the record does not carry',
`${am.length} stone-anchor meshes drawn with no stoneAnchor field — this `
+ "hull's record is silent, and silence draws nothing");
if (H.stoneAnchor && !am.length)
say(v.id, 'declared but not drawn', 'stoneAnchor');
if (H.stoneAnchor && am.length) {
const R = H.stoneAnchor;
const stones = am.filter(o => o.name === 'st-stone');
if (stones.length !== 1)
say(v.id, 'a stone anchor without its stone',
`${stones.length} stone bars drawn — the record hangs one`);
else if (R.stoneLenM) {
const s = stones[0];
s.updateWorldMatrix(true, false);
const e = s.matrixWorld.elements, gp = s.geometry.parameters;
const lg = Math.max(
Math.hypot(e[0], e[1], e[2]) * (gp.width || 0),
Math.hypot(e[4], e[5], e[6]) * (gp.height || 0),
Math.hypot(e[8], e[9], e[10]) * (gp.depth || 0));
if (Math.abs(lg - R.stoneLenM) > 0.10 * R.stoneLenM)
say(v.id, "the stone off the record's length",
`bar ${lg.toFixed(2)} m, record says ${R.stoneLenM}`);
}
const tips = am.filter(o => o.geometry.type === 'ConeGeometry');
if (tips.length !== 2)
say(v.id, 'a stone anchor without its two hooks',
`${tips.length} hook points drawn — the text clamps the stone with two`);
if (R.armLenM) {
const cheeks = am.filter(o => o.name === 'st-cheek' || o.name === 'st-tip');
if (cheeks.length) {
const par = cheeks[0].parent;
par.updateWorldMatrix(true, false);
const ax = new THREE.Vector3(0, 1, 0).transformDirection(par.matrixWorld);
let lo = Infinity, hi = -Infinity;
const c = new THREE.Vector3();
for (const o of cheeks) {
o.updateWorldMatrix(true, false);
if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
const b = o.geometry.boundingBox;
for (const cx of [b.min.x, b.max.x])
for (const cy of [b.min.y, b.max.y])
for (const cz of [b.min.z, b.max.z]) {
const d = c.set(cx, cy, cz).applyMatrix4(o.matrixWorld).dot(ax);
if (d < lo) lo = d;
if (d > hi) hi = d;
}
}
const run = hi - lo;
if (Math.abs(run - R.armLenM) > 0.10 * R.armLenM)
say(v.id, "the cheek timbers off the record's run",
`arm run ${run.toFixed(2)} m tip to butt — the articulated `
+ `마도해역-212 arm measures ${R.armLenM}`);
}
}
const bb = new THREE.Box3();
for (const o of am) if (o.name !== 'st-cable')
bb.union(new THREE.Box3().setFromObject(o));
const ua = Math.max(0, Math.min(1,
((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
const rayS = new THREE.Raycaster();
rayS.set(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.5,
(bb.min.z + bb.max.z) / 2),
new THREE.Vector3(0, -1, 0));
const underS = rayS.intersectObject(g, true).filter(h => {
const p = tagOf(h.object);
return !(p && (p.key === 'stoneAnchor' || NONBEARING.has(p.key))); });
if (!underS.length)
say(v.id, 'an anchor resting on nothing',
`no surface under the assembly at u ${ua.toFixed(2)}`);
else {
const gapS = bb.min.y - underS[0].point.y;
if (gapS > 0.25)
say(v.id, 'an anchor floating over its own deck',
`lowest point ${gapS.toFixed(2)} m above the surface under it at u ${ua.toFixed(2)}`);
if (gapS < -0.20)
say(v.id, 'an anchor through the planking',
`lowest point ${(-gapS).toFixed(2)} m into the surface under it at u ${ua.toFixed(2)}`);
}
if (!am.some(o => o.name === 'st-cable'))
say(v.id, 'a stone anchor with no cable',
"the text's sentence carries wheel, cable and stone together — "
+ 'nothing drawn holds this anchor to the ship');
}
}
{
const im = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'ironAnchors') im.push(o); });
if (im.length && !H.ironAnchors)
say(v.id, 'an anchor the record does not carry',
`${im.length} iron-anchor meshes drawn with no ironAnchors field — this `
+ "hull's record is silent, and silence draws nothing");
if (H.ironAnchors && !im.length)
say(v.id, 'declared but not drawn', 'ironAnchors');
if (H.ironAnchors && im.length) {
const R = H.ironAnchors;
const want = (R.sheetLenM !== 0 ? 1 : 0) + (R.bowerLenM !== 0 ? 2 : 0)
+ (R.sternAtU != null && R.sternLenM !== 0 ? 2 : 0);
const rings = im.filter(o => o.geometry.type === 'TorusGeometry');
if (rings.length !== want)
say(v.id, "the anchors off the record's count",
`${rings.length} head rings drawn — the record's drawn set is ${want}`);
const tips = im.filter(o => o.geometry.type === 'ConeGeometry');
if (tips.length !== want * 4)
say(v.id, 'an iron anchor without its four claws',
`${tips.length} claw points drawn for ${want} anchors — the forging text `
+ 'makes four claws first');
const grps = [];
g.traverse(o => { const p = tagOf(o);
if (o.isGroup && o.name === 'ia-grp' && p && p.key === 'ironAnchors')
grps.push(o); });
const volOf = (o) => {
o.updateMatrixWorld(true);
const e = o.matrixWorld.elements;
const det = Math.abs(
e[0] * (e[5] * e[10] - e[6] * e[9])
- e[4] * (e[1] * e[10] - e[2] * e[9])
+ e[8] * (e[1] * e[6] - e[2] * e[5]));
const pg = o.geometry.parameters;
if (o.geometry.type === 'ConeGeometry')
return det * Math.PI * pg.radius * pg.radius * pg.height / 3;
if (o.geometry.type === 'CylinderGeometry')
return det * Math.PI * pg.height / 3
* (pg.radiusTop * pg.radiusTop + pg.radiusTop * pg.radiusBottom
+ pg.radiusBottom * pg.radiusBottom);
if (o.geometry.type === 'SphereGeometry')
return det * 4 / 3 * Math.PI * Math.pow(pg.radius, 3);
if (o.geometry.type === 'TorusGeometry')
return det * 2 * Math.PI * Math.PI * pg.radius * pg.tube * pg.tube;
return 0;
};
const per = grps.map(gr => {
let shk = null, rng = null, crn = null;
const tps = [], mem = [];
gr.traverse(o => { if (o.isMesh) mem.push(o);
if (o.name === 'ia-shank') shk = o;
else if (o.name === 'ia-ring') rng = o;
else if (o.name === 'ia-crown') crn = o;
else if (o.name === 'ia-tip') tps.push(o); });
if (!shk || !rng || !crn) return { len: 0, sweep: null, kg: null };
let lo = Infinity, hi = -Infinity;
const ax = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
for (const o of [shk, rng, crn]) {
o.geometry.computeBoundingBox();
o.updateMatrixWorld(true);
const lb2 = o.geometry.boundingBox;
for (const yy of [lb2.min.y, lb2.max.y]) {
const t = new THREE.Vector3(0, yy, 0).applyMatrix4(o.matrixWorld).dot(ax);
if (t < lo) lo = t; if (t > hi) hi = t;
}
}
let mx = null;
const p0 = new THREE.Vector3().setFromMatrixPosition(shk.matrixWorld);
for (const t of tps) {
t.updateMatrixWorld(true);
const apex = new THREE.Vector3(0, t.geometry.parameters.height / 2, 0)
.applyMatrix4(t.matrixWorld);
const d = apex.sub(p0);
const rad = d.sub(ax.clone().multiplyScalar(d.dot(ax))).length();
if (mx == null || rad > mx) mx = rad;
}
const kg = 7850 * mem.reduce((s2, o) => s2 + volOf(o), 0);
return { len: hi - lo, sweep: mx, kg };
}).sort((a, b2) => b2.len - a.len);
const wantLn = [];
if (R.sheetLenM !== 0)
wantLn.push({ ln: R.sheetLenM || 1.86, kg: R.sheetKg || 295 });
if (R.bowerLenM !== 0)
for (let k2 = 0; k2 < 2; k2++)
wantLn.push({ ln: R.bowerLenM || 1.57, kg: R.bowerKg || 177 });
if (R.sternAtU != null && R.sternLenM !== 0)
for (let k2 = 0; k2 < 2; k2++)
wantLn.push({ ln: R.sternLenM || 1.57, kg: R.sternKg || 177 });
wantLn.sort((a, b2) => b2.ln - a.ln);
for (let i = 0; i < Math.min(per.length, wantLn.length); i++) {
if (Math.abs(per[i].len - wantLn[i].ln) > 0.12 * wantLn[i].ln)
say(v.id, "an anchor off the record's length",
`crown to ring head ${per[i].len.toFixed(2)} m along the shank's own `
+ `axis — the record's full length is ${wantLn[i].ln}`);
if (per[i].sweep != null
&& Math.abs(per[i].sweep - 0.339 * wantLn[i].ln)
> 0.12 * 0.339 * wantLn[i].ln)
say(v.id, "a claw sweep off the find's proportion",
`claw reach ${per[i].sweep.toFixed(2)} m from the shank's own axis — `
+ `the Penglai proportion gives ${(0.339 * wantLn[i].ln).toFixed(2)}`);
if (per[i].kg != null
&& Math.abs(per[i].kg - wantLn[i].kg) > 0.12 * wantLn[i].kg)
say(v.id, "an anchor off the record's weight",
`${per[i].kg.toFixed(0)} kg of drawn iron integrated from the scene — `
+ `the record's weight is ${wantLn[i].kg}`);
}
const rayR = new THREE.Raycaster();
for (const gr of grps) {
const bb = new THREE.Box3().setFromObject(gr);
const ui = Math.max(0, Math.min(1,
((bb.min.x + bb.max.x) / 2) / (H.lwl || H.loa) + 0.5));
rayR.set(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.5,
(bb.min.z + bb.max.z) / 2),
new THREE.Vector3(0, -1, 0));
const under = rayR.intersectObject(g, true).filter(h => {
const p = tagOf(h.object);
return !(p && (p.key === 'ironAnchors' || NONBEARING.has(p.key))); });
if (!under.length) {
say(v.id, 'an anchor resting on nothing',
`no surface under the assembly at u ${ui.toFixed(2)}`);
continue;
}
const gap = bb.min.y - under[0].point.y;
if (gap > 0.25)
say(v.id, 'an anchor floating over its own deck',
`lowest point ${gap.toFixed(2)} m above the surface under it at u ${ui.toFixed(2)}`);
if (gap < -0.20)
say(v.id, 'an anchor through the planking',
`lowest point ${(-gap).toFixed(2)} m into the surface under it at u ${ui.toFixed(2)}`);
}
const cables = im.filter(o => o.name === 'ia-cable');
if (cables.length !== want)
say(v.id, 'an iron anchor with no cable',
`${cables.length} cables for ${want} anchors — the 舟車 sentence gives `
+ 'every anchor its cable');
}
}
{
const wm = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'woodAnchor') wm.push(o); });
if (wm.length && !H.woodAnchor)
say(v.id, 'an anchor the record does not carry',
`${wm.length} wooden-anchor meshes drawn with no woodAnchor field — this `
+ "hull's record is silent, and silence draws nothing");
if (H.woodAnchor && !wm.length)
say(v.id, 'declared but not drawn', 'woodAnchor');
if (H.woodAnchor && wm.length) {
const R = H.woodAnchor;
const tips = wm.filter(o => o.geometry.type === 'ConeGeometry');
const wantArms = R.arms || 2;
if (tips.length !== wantArms)
say(v.id, 'a wooden anchor off its arm count',
`${tips.length} hook points drawn — ` + (R.arms
? `the record hangs ${R.arms}`
: "the form study's stock anchor carries 2 (그림 16/17)"));
const stones = wm.filter(o => o.name === 'wa-stone');
if (stones.length !== 1)
say(v.id, 'a wooden anchor without its stone',
`${stones.length} anchor-stones drawn — the record lashes one on, and `
+ 'an oak frame without it will not sink');
else if (R.stoneLenM) {
const sg2 = stones[0];
sg2.geometry.computeBoundingBox();
sg2.updateMatrixWorld(true);
const lb = sg2.geometry.boundingBox, me = sg2.matrixWorld.elements;
const scl = [Math.hypot(me[0], me[1], me[2]),
Math.hypot(me[4], me[5], me[6]),
Math.hypot(me[8], me[9], me[10])];
const ext = [(lb.max.x - lb.min.x) * scl[0],
(lb.max.y - lb.min.y) * scl[1],
(lb.max.z - lb.min.z) * scl[2]].sort((a, b2) => b2 - a);
if (Math.abs(ext[0] - R.stoneLenM) > 0.10 * R.stoneLenM)
say(v.id, "the stone off the record's length",
`stone ${ext[0].toFixed(2)} m through the stow transform, `
+ `record says ${R.stoneLenM}`);
}
const shk = wm.find(o => o.name === 'wa-shank');
if (shk) {
shk.updateMatrixWorld(true);
shk.geometry.computeBoundingBox();
const gbS = shk.geometry.boundingBox, meS = shk.matrixWorld.elements;
const sclSY = Math.hypot(meS[4], meS[5], meS[6]);
const lenS = (gbS.max.y - gbS.min.y) * sclSY;
const wantS = R.shankM || (R.stoneLenM || 2.0) / 0.51;
if (Math.abs(lenS - wantS) > 0.12 * wantS)
say(v.id, "a shank off its stone's proportion",
`shank ${lenS.toFixed(2)} m drawn — the figure's stone/shank 0.51 `
+ `puts ${wantS.toFixed(2)} m on this stone, the long shank the `
+ "form study explains by oak's buoyancy");
}
if (shk) {
const WSPLAY = 0.38, WSPLAY_TOL = 0.12;
const axSh = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
let worstA = null;
for (const o of wm) {
if (o.name !== 'wa-arm') continue;
o.updateMatrixWorld(true);
const axA = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
const angA = Math.acos(Math.min(1, Math.abs(axA.dot(axSh))));
if (worstA === null
|| Math.abs(angA - WSPLAY) > Math.abs(worstA - WSPLAY)) worstA = angA;
}
if (worstA !== null && Math.abs(worstA - WSPLAY) > WSPLAY_TOL)
say(v.id, "arms off the plates' splay",
`an arm timber at ${worstA.toFixed(2)} rad off the shank — the form `
+ "study's plates splay 0.38±0.12 (six limb chords, 그림 16/17 "
+ "and the institute's own figure)");
}
{
const ARM_LEN = 1.90, ARM_SEC = 0.196;
const secW = 1.1 * (R.armSecM || ARM_SEC);
const lenW = R.armM ? null : ARM_LEN - secW;
let worstL = null, worstD = null;
for (const o of wm) {
if (o.name !== 'wa-arm') continue;
o.updateMatrixWorld(true);
o.geometry.computeBoundingBox();
const gbA = o.geometry.boundingBox, meA = o.matrixWorld.elements;
const sA = [Math.hypot(meA[0], meA[1], meA[2]),
Math.hypot(meA[4], meA[5], meA[6]),
Math.hypot(meA[8], meA[9], meA[10])];
const lenA = (gbA.max.y - gbA.min.y) * sA[1];
const diaA = Math.max((gbA.max.x - gbA.min.x) * sA[0],
(gbA.max.z - gbA.min.z) * sA[2]);
if (lenW && (worstL === null
|| Math.abs(lenA - lenW) > Math.abs(worstL - lenW))) worstL = lenA;
if (worstD === null
|| Math.abs(diaA - secW) > Math.abs(worstD - secW)) worstD = diaA;
}
if (lenW && worstL !== null && Math.abs(worstL - lenW) > 0.12 * lenW)
say(v.id, "an arm timber off its record's length",
`an arm timber runs ${worstL.toFixed(2)} m — 진도-641, the one `
+ 'arm published with dimensions, is 1.90 m root to point '
+ `(Myeongnyang Ⅰ 2015, p. 467), ${lenW.toFixed(2)} m of it the `
+ 'timber once the point\'s cone takes its reach');
if (worstD !== null && Math.abs(worstD - secW) > 0.12 * secW)
say(v.id, "an arm timber off its record's section",
`an arm timber ${worstD.toFixed(2)} m through — 진도-641's `
+ `section is 19.6 cm, ${secW.toFixed(2)} m at the builder's `
+ 'own taper');
}
if (shk && stones.length === 1 && tips.length) {
shk.updateMatrixWorld(true);
shk.geometry.computeBoundingBox();
const gbS = shk.geometry.boundingBox, meS = shk.matrixWorld.elements;
const sclSY = Math.hypot(meS[4], meS[5], meS[6]);
const lenS = (gbS.max.y - gbS.min.y) * sclSY;
const axS2 = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
const cS2 = new THREE.Box3().setFromObject(shk).getCenter(new THREE.Vector3());
const cT2 = new THREE.Vector3();
for (const t of tips)
cT2.add(new THREE.Box3().setFromObject(t).getCenter(new THREE.Vector3()));
cT2.multiplyScalar(1 / tips.length);
const eA = cS2.clone().addScaledVector(axS2, lenS / 2);
const eB = cS2.clone().addScaledVector(axS2, -lenS / 2);
const foot = (eA.distanceTo(cT2) < eB.distanceTo(cT2)) ? eA : eB;
const head2 = (foot === eA) ? eB : eA;
const axUp = head2.clone().sub(foot).normalize();
const cSt2 = new THREE.Box3().setFromObject(stones[0])
.getCenter(new THREE.Vector3());
const fracW = cSt2.clone().sub(foot).dot(axUp) / lenS;
if (Math.abs(fracW - 0.55) > 0.12)
say(v.id, 'the stone off its shank station',
`stone centre at ${fracW.toFixed(2)} of the shank above the foot — `
+ "the record's reconstruction lashes it at the middle, 0.55±0.12");
const ROPE = new Set(['wa-seize', 'wa-band', 'wa-whip', 'wa-cable']);
const HEAD_SPAN = 0.75;
for (const o of wm) {
if (o === shk || o === stones[0] || ROPE.has(o.name)) continue;
const fo = new THREE.Box3().setFromObject(o)
.getCenter(new THREE.Vector3()).sub(foot).dot(axUp) / lenS;
if (fo > HEAD_SPAN)
say(v.id, 'a stock at the cable end',
`'${o.name}' crosses the shank at ${fo.toFixed(2)} above the `
+ 'foot — the stone is this anchor\'s 닻장, and the traditional '
+ "wooden stock sat at the arms' height, never at the cable end "
+ '(Hong 2013)');
}
}
const bbW = new THREE.Box3();
for (const o of wm) if (o.name !== 'wa-cable')
bbW.union(new THREE.Box3().setFromObject(o));
const uw = Math.max(0, Math.min(1,
((bbW.min.x + bbW.max.x) / 2) / (H.lwl || H.loa) + 0.5));
const rayW = new THREE.Raycaster();
rayW.set(new THREE.Vector3((bbW.min.x + bbW.max.x) / 2, bbW.max.y + 0.5,
(bbW.min.z + bbW.max.z) / 2),
new THREE.Vector3(0, -1, 0));
const underW = rayW.intersectObject(g, true).filter(h => {
const p = tagOf(h.object);
return !(p && (p.key === 'woodAnchor' || NONBEARING.has(p.key))); });
if (!underW.length)
say(v.id, 'an anchor resting on nothing',
`no surface under the assembly at u ${uw.toFixed(2)}`);
else {
const gapW = bbW.min.y - underW[0].point.y;
if (gapW > 0.25)
say(v.id, 'an anchor floating over its own deck',
`lowest point ${gapW.toFixed(2)} m above the surface under it at u ${uw.toFixed(2)}`);
if (gapW < -0.20)
say(v.id, 'an anchor through the planking',
`lowest point ${(-gapW).toFixed(2)} m into the surface under it at u ${uw.toFixed(2)}`);
}
if (!wm.some(o => o.name === 'wa-cable'))
say(v.id, 'a wooden anchor with no cable',
'the horong turns this anchor\'s cable — nothing drawn holds it to the ship');
}
}
{
const ym = [];
g.traverse(o => { const p = tagOf(o);
if (o.isMesh && p && p.key === 'yotsumeAnchor') ym.push(o); });
if (ym.length && !H.yotsumeAnchor)
say(v.id, 'an anchor the record does not carry',
`${ym.length} yotsume-anchor meshes drawn with no yotsumeAnchor field — `
+ "this hull's record is silent, and silence draws nothing");
if (H.yotsumeAnchor && !ym.length)
say(v.id, 'declared but not drawn', 'yotsumeAnchor');
if (H.yotsumeAnchor && ym.length) {
const R = H.yotsumeAnchor;
const tips = ym.filter(o => o.geometry.type === 'ConeGeometry');
if (tips.length !== 4)
say(v.id, 'a four-claw anchor off its claw count',
`${tips.length} fluke tips drawn — the name itself says four`);
const tori = ym.filter(o => o.geometry.type === 'TorusGeometry');
if (tori.length !== 2)
say(v.id, 'a yotsume off its rings',
`${tori.length} ring tori drawn — the head ring carries the free ring `
+ 'the cable bends to: exactly two');
const lenR = R.lenM || 2.0;
let lo = Infinity, hi = -Infinity;
const shks = ym.filter(o => o.name === 'ya-shank');
const rng = ym.find(o => o.name === 'ya-ring');
if (shks.length && rng) {
const ax = new THREE.Vector3(0, 1, 0).transformDirection(shks[0].matrixWorld);
for (const o of [...shks, rng]) {
o.geometry.computeBoundingBox();
o.updateMatrixWorld(true);
const lb2 = o.geometry.boundingBox;
for (const yy of [lb2.min.y, lb2.max.y]) {
const p2 = new THREE.Vector3(0, yy, 0).applyMatrix4(o.matrixWorld);
const t = p2.dot(ax);
if (t < lo) lo = t; if (t > hi) hi = t;
}
}
const drawnLen = hi - lo;
if (Math.abs(drawnLen - lenR) > 0.12 * lenR)
say(v.id, "a yotsume off the record's length",
`crown to ring head ${drawnLen.toFixed(2)} m along the shank's own `
+ `axis — the record says ${lenR}`);
const kgR = R.kg || Math.round(335 * Math.pow(lenR / 2.8, 3));
let vSum = 0;
for (const o of ym) {
if (o.name === 'ya-cable' || o.name === 'ya-coil') continue;
o.updateMatrixWorld(true);
const e = o.matrixWorld.elements;
const det = Math.abs(
e[0] * (e[5] * e[10] - e[6] * e[9])
- e[4] * (e[1] * e[10] - e[2] * e[9])
+ e[8] * (e[1] * e[6] - e[2] * e[5]));
const pg = o.geometry.parameters;
if (o.geometry.type === 'CylinderGeometry') {
const f = (pg.radialSegments === 4) ? 2 : Math.PI;
vSum += det * f * pg.height / 3
* (pg.radiusTop * pg.radiusTop + pg.radiusTop * pg.radiusBottom
+ pg.radiusBottom * pg.radiusBottom);
} else if (o.geometry.type === 'ConeGeometry') {
const f = (pg.radialSegments === 4) ? 2 : Math.PI;
vSum += det * f * pg.radius * pg.radius * pg.height / 3;
} else if (o.geometry.type === 'TorusGeometry') {
vSum += det * 2 * Math.PI * Math.PI * pg.radius * pg.tube * pg.tube;
}
}
const kgD = 7850 * vSum;
if (Math.abs(kgD - kgR) > 0.12 * kgR)
say(v.id, "a yotsume off the record's weight",
`${kgD.toFixed(0)} kg of drawn iron integrated from the scene — `
+ `the record's weight is ${kgR}`);
const YS = { rw: 0.0491, rt: 0.0764, mw: 0.0214, mt: 0.0303 };
let loE = null, hiE = null;
for (const o of shks) {
if (o.geometry.type !== 'CylinderGeometry') continue;
const pg2 = o.geometry.parameters;
const eW = o.matrixWorld.elements;
const sx = Math.hypot(eW[0], eW[1], eW[2]);
const sz = Math.hypot(eW[8], eW[9], eW[10]);
for (const [sgn, rad] of [[-1, pg2.radiusBottom], [1, pg2.radiusTop]]) {
const p3 = new THREE.Vector3(0, sgn * pg2.height / 2, 0)
.applyMatrix4(o.matrixWorld);
const end = { t: p3.dot(ax),
sec: [rad * Math.SQRT2 * sz, rad * Math.SQRT2 * sx] };
if (!loE || end.t < loE.t) loE = end;
if (!hiE || end.t > hiE.t) hiE = end;
}
}
if (loE && hiE) {
const badS = [];
const chkS = (sec, fw, ft, where) => {
const a = Math.min(sec[0], sec[1]), b = Math.max(sec[0], sec[1]);
const ra = fw * lenR, rb = ft * lenR;
if (Math.abs(a - ra) > 0.12 * ra || Math.abs(b - rb) > 0.12 * rb)
badS.push(`${where} ${(a * 100).toFixed(1)}×${(b * 100).toFixed(1)} cm `
+ `drawn against the station's ${(ra * 100).toFixed(1)}×${(rb * 100).toFixed(1)}`);
};
chkS(loE.sec, YS.rw, YS.rt, 'crown');
chkS(hiE.sec, YS.mw, YS.mt, 'head');
if (badS.length)
say(v.id, 'a shank off its calipered stations', badS.join('; '));
}
}
const bbY = new THREE.Box3();
for (const o of ym) if (o.name !== 'ya-cable' && o.name !== 'ya-coil')
bbY.union(new THREE.Box3().setFromObject(o));
const uy = Math.max(0, Math.min(1,
((bbY.min.x + bbY.max.x) / 2) / (H.lwl || H.loa) + 0.5));
const rayY = new THREE.Raycaster();
rayY.set(new THREE.Vector3((bbY.min.x + bbY.max.x) / 2, bbY.max.y + 0.5,
(bbY.min.z + bbY.max.z) / 2),
new THREE.Vector3(0, -1, 0));
const underY = rayY.intersectObject(g, true).filter(h => {
const p = tagOf(h.object);
return !(p && (p.key === 'yotsumeAnchor' || NONBEARING.has(p.key))); });
if (!underY.length)
say(v.id, 'an anchor resting on nothing',
`no surface under the assembly at u ${uy.toFixed(2)}`);
else {
const gapY = bbY.min.y - underY[0].point.y;
if (gapY > 0.25)
say(v.id, 'an anchor floating over its own deck',
`lowest point ${gapY.toFixed(2)} m above the surface under it at u ${uy.toFixed(2)}`);
if (gapY < -0.20)
say(v.id, 'an anchor through the planking',
`lowest point ${(-gapY).toFixed(2)} m into the surface under it at u ${uy.toFixed(2)}`);
}
if (!ym.some(o => o.name === 'ya-cable'))
say(v.id, 'a yotsume with no cable',
'nothing drawn holds this anchor to the ship');
else if (!ym.some(o => o.name === 'ya-coil'))
say(v.id, 'a cable with no coil',
'no machine and no belay is attested — the cable is flaked beside the '
+ 'head, and a cable ending in air is a part attached to nothing');
}
}
if (H.screws) {
if (!part.screw) say(v.id, 'declared but not drawn', 'screws');
else if (part.screw.y[1] > 0)
say(v.id, 'screws out of the water', `top at ${part.screw.y[1].toFixed(1)} m`);
}
if (H.build && typeof TRADITION !== 'undefined' && !TRADITION[H.build])
say(v.id, 'build tradition unknown',
`build: '${H.build}' names no entry in the tradition table`);
const gaffMasts = (H.masts || []).filter(mk => mk.rig === 'gaff');
if (!H.funnels && gaffMasts.length >= 2 &&
gaffMasts.length === (H.masts || []).length) {
const booms = [];
g.traverse(o => { if (o.isMesh && o.userData.part &&
o.userData.part.name === 'Boom') {
const bbx = new THREE.Box3().setFromObject(o);
booms.push({ cx: (bbx.min.x + bbx.max.x) / 2, len: bbx.max.x - bbx.min.x });
} });
if (booms.length >= 2) {
booms.sort((a, b) => a.cx - b.cx);
const aft = booms[booms.length - 1];
const longestFwd = Math.max(...booms.slice(0, -1).map(b => b.len));
if (aft.len < longestFwd * 0.9)
say(v.id, 'spanker boom collapsed',
`aftermost boom ${aft.len.toFixed(1)} m against ${longestFwd.toFixed(1)} m ` +
'forward of it — the one boom with nothing abaft it to hit');
}
}
(() => {
const masts = H.masts || [];
const mk = masts[masts.length - 1];
if (!mk || !(mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker))) return;
const L = H.lwl, mastX = (mk.at - 0.5) * L;
let funnelAbaft = false;
g.traverse(o => { if (o.isMesh && o.userData.part &&
o.userData.part.key === 'funnel') {
const bbx = new THREE.Box3().setFromObject(o);
if ((bbx.min.x + bbx.max.x) / 2 > mastX) funnelAbaft = true;
} });
if (funnelAbaft) return;
const lower = lowerOf(mk);
const want = Math.max(lower * 0.16,
Math.min(lower * 0.62, (1.04 - mk.at) * L * 1.6));
const booms = [];
g.traverse(o => { if (o.isMesh && o.userData.part &&
o.userData.part.name === 'Boom') {
const bbx = new THREE.Box3().setFromObject(o);
booms.push({ cx: (bbx.min.x + bbx.max.x) / 2, len: bbx.max.x - bbx.min.x });
} });
if (!booms.length) return;
booms.sort((a, b) => a.cx - b.cx);
const aft = booms[booms.length - 1];
if (aft.cx < mastX - L * 0.02) return;
if (aft.len < want * 0.93 || aft.len > want * 1.15)
say(v.id, 'open boom off its sail plan',
`aftermost boom ${aft.len.toFixed(1)} m against an entitlement of ` +
`${want.toFixed(1)} m with nothing drawn abaft the mast`);
})();
if (H.headsails && (H.masts || []).length) {
const fmx = (H.masts[0].at - 0.5) * H.lwl;
let jibs = 0;
g.traverse(o => { if (o.isMesh && o.userData.kind === 'tri' &&
o.userData.part && o.userData.part.key === 'sail') {
const bbx = new THREE.Box3().setFromObject(o);
if (bbx.max.x < fmx + H.lwl * 0.03) jibs++;
} });
if (jibs !== H.headsails)
say(v.id, 'headsail suit miscounted',
`${H.headsails} in the record, ${jibs} drawn forward of the foremast`);
}
for (const mk of (H.masts || [])) {
if (mk.rig !== 'gaff' || !mk.topsail) continue;
const mx = (mk.at - 0.5) * H.lwl;
const HSt = SHIPS_HULL.hullSurface(H);
const lower = lowerOf(mk);
const floorY = HSt.deck(mk.at) + lower * 0.75;
let found = 0;
g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.key === 'sail') {
const bbx = new THREE.Box3().setFromObject(o);
if (bbx.min.y > floorY && bbx.min.x < mx + 1.0 && bbx.max.x > mx - 1.0) found++;
} });
if (!found)
say(v.id, 'topsail not set',
`mast at u=${mk.at} declares a topsail and no canvas stands above ` +
`${floorY.toFixed(0)} m at its station`);
}
for (const mk of (H.masts || [])) {
if (!(mk.sail && mk.sail.areaM2) || mk.rig !== 'square' || mk.only !== 1) continue;
const want = mk.sail.areaM2 + (mk.sail.bonnetsM2 || []).reduce((a, b) => a + b, 0);
const mx = (mk.at - 0.5) * H.lwl;
let yardLen = 0, sailH = 0;
g.traverse(o => { if (!o.isMesh || !o.userData.part) return;
const k = o.userData.part.key;
if (k !== 'yard' && k !== 'sail') return;
const bbx = new THREE.Box3().setFromObject(o);
if (Math.abs((bbx.min.x + bbx.max.x) / 2 - mx) > H.lwl * 0.12) return;
if (k === 'yard') yardLen = Math.max(yardLen, Math.hypot(bbx.max.x - bbx.min.x, bbx.max.z - bbx.min.z));
else sailH = Math.max(sailH, bbx.max.y - bbx.min.y);
});
if (!yardLen || !sailH)
say(v.id, 'attested sail not set', `yard ${yardLen.toFixed(1)} m, sail depth ${sailH.toFixed(1)} m at u=${mk.at}`);
else {
const built = yardLen * 0.96 * sailH;
if (Math.abs(built - want) > want * 0.10)
say(v.id, 'a sail off its attested area',
`${(yardLen * 0.96).toFixed(1)} x ${sailH.toFixed(1)} m = ${built.toFixed(0)} m² built ` +
`against ${want} m² on the record (${mk.sail.areaM2} + bonnets) at u=${mk.at}`);
}
}
(H.masts || []).forEach((mk, i) => {
if (mk.rig !== 'square') return;
const spec = mk.top && mk.top.form === 'basket' ? mk.top : null;
const mx = (mk.at - 0.5) * H.lwl, win = H.lwl * 0.12;
const near = b => Math.abs((b.min.x + b.max.x) / 2 - mx) < win;
const baskets = [], crosses = [];
let truck = -1e9;
g.traverse(o => {
const p = o.userData && o.userData.part;
if (!p) return;
if (!o.isMesh && p.key === 'top' && p.name === 'Basket top') {
const b = new THREE.Box3().setFromObject(o); if (near(b)) baskets.push(b);
} else if (!o.isMesh && p.key === 'cross') {
const b = new THREE.Box3().setFromObject(o); if (near(b)) crosses.push(b);
} else if (o.isMesh && p.key === 'mast') {
const b = new THREE.Box3().setFromObject(o); if (near(b)) truck = Math.max(truck, b.max.y);
}
});
if (spec) {
if (!baskets.length)
say(v.id, 'declared but not drawn', `the basket top on mast ${i} (top.form 'basket' at u=${mk.at})`);
else {
const b = baskets[0], w = b.max.z - b.min.z;
if (Math.abs(w - spec.rimDiaM) > spec.rimDiaM * 0.10)
say(v.id, 'a basket top off its attested breadth',
`${w.toFixed(2)} m across against ${spec.rimDiaM} m on the record, mast ${i}`);
const pole = spec.poleAboveRimM !== undefined ? spec.poleAboveRimM : 0.55;
const wantFloor = truck - pole - spec.heightM;
if (truck > -1e8 && Math.abs(b.min.y - wantFloor) > 0.3)
say(v.id, 'a basket top adrift on the mast',
`floor at ${b.min.y.toFixed(2)} m against ${wantFloor.toFixed(2)} ` +
`(truck ${truck.toFixed(2)} less ${pole} m of pole less ${spec.heightM} m of basket), mast ${i}`);
if (baskets.length > 1)
say(v.id, 'two baskets on one masthead', `${baskets.length} basket tops at u=${mk.at}`);
}
if (spec.cross && !crosses.length)
say(v.id, 'declared but not drawn', `the cross at the truck of mast ${i}`);
if (spec.cross && crosses.length && truck > -1e8 && Math.abs(crosses[0].min.y - truck) > 0.3)
say(v.id, 'a cross adrift of the truck',
`cross foot at ${crosses[0].min.y.toFixed(2)} m, truck at ${truck.toFixed(2)} m, mast ${i}`);
} else if (baskets.length)
say(v.id, 'a basket top nobody attested',
`${baskets.length} basket top(s) at u=${mk.at} on a record without top.form 'basket'`);
if (!(spec && spec.cross) && crosses.length)
say(v.id, 'a cross nobody attested',
`${crosses.length} cross group(s) at u=${mk.at} on a record without top.cross`);
});
(H.masts || []).forEach((mk, i) => {
if (mk.rig !== 'square') return;
const F = mk.shroudFixing && mk.shroudFixing.stationsFromHeelM ? mk.shroudFixing : null;
const wales = [];
g.traverse(o => { const p = o.userData && o.userData.part;
if (p && !o.isMesh && p.key === 'channelWale') wales.push(o); });
if (!F) {
if (wales.length) say(v.id, 'a channel wale nobody attested',
`${wales.length} channel-wale group(s) on a record without mast.shroudFixing`);
return;
}
if (wales.length !== 2) {
say(v.id, 'declared but not drawn', `the channel wale the shrouds of mast ${i} set up in (${wales.length} of 2 sides drawn)`);
return;
}
const wv = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let k = 0; k < a.count; k++) { vv.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
let post = null;
g.traverse(o => { if (!post && o.isMesh && (o.name === 'Sternpost' || (o.userData.part && o.userData.part.name === 'Sternpost'))) post = o; });
if (!post) { say(v.id, 'a channel wale with no heel to measure from', 'no Sternpost mesh'); return; }
const pv = wv(post); let yMin = 1e9, heelX = -1e9;
for (const q of pv) yMin = Math.min(yMin, q[1]);
for (const q of pv) if (q[1] < yMin + 0.15) heelX = Math.max(heelX, q[0]);
heelX -= ((v.hull.sternpost && v.hull.sternpost.form === 'straight' && v.hull.sternpost.footAbaftStationDatumM) || 0);
const want = F.stationsFromHeelM.slice().sort((a, b) => a - b);
for (const w of wales) {
const st = []; w.traverse(o => { if (o.isMesh && o.name === 'channel-wale-stanchion') st.push(new THREE.Box3().setFromObject(o)); });
if (st.length !== want.length)
say(v.id, 'shroud stanchions miscounted', `${st.length} drawn on the ${w.userData.part.name.toLowerCase()}, the plate draws ${want.length}`);
const got = st.map(b => heelX - (b.min.x + b.max.x) / 2).sort((a, b) => a - b);
for (let k = 0; k < Math.min(got.length, want.length); k++)
if (Math.abs(got[k] - want[k]) > 0.3)
say(v.id, "a shroud stanchion off the plate's station",
`${got[k].toFixed(2)} m forward of the heel against ${want[k]} on the ${w.userData.part.name.toLowerCase()}, mast ${i}`);
}
const xLo = heelX - Math.max(...want) - 0.4, xHi = heelX - Math.min(...want) + 0.4;
let feet = 0, astray = 0, firstX = 0;
g.traverse(o => {
const p = o.userData && o.userData.part;
if (!(o.isMesh && p && p.key === 'shroud' && p.name === 'Shrouds')) return;
const pts = wv(o); let lo = 1e9; for (const q of pts) lo = Math.min(lo, q[1]);
for (const q of pts) if (q[1] < lo + 0.5) { feet++; if (q[0] < xLo || q[0] > xHi) { astray++; if (astray === 1) firstX = q[0]; } }
});
if (feet && astray)
say(v.id, 'shrouds set up off their attested station',
`${astray} of ${feet} lower-end vertices outside the channel wale's span x ${xLo.toFixed(2)}–${xHi.toFixed(2)} (first at x ${firstX.toFixed(2)}; the mast stands at x ${((mk.at - 0.5) * H.lwl).toFixed(2)}), mast ${i}`);
});
if (H.deckhouses && H.deckhouses.length) {
const HSd = SHIPS_HULL.hullSurface(H);
const houses = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part &&
o.userData.part.key === 'deckhouse')
houses.push(new THREE.Box3().setFromObject(o)); });
if (houses.length !== H.deckhouses.length)
say(v.id, 'deckhouses miscounted',
`${H.deckhouses.length} in the record, ${houses.length} drawn`);
for (const hbx of houses) {
const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((hbx.min.x + hbx.max.x) / 2) / H.lwl));
const d = HSd.deck(uu);
if (hbx.min.y > d + 0.3 || hbx.max.y < d + 1.0)
say(v.id, 'deckhouse off the deck',
`house spans ${hbx.min.y.toFixed(1)}–${hbx.max.y.toFixed(1)} m, deck there ${d.toFixed(1)} m`);
const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSd, uu, 1.0)[2]);
if (Math.max(-hbx.min.z, hbx.max.z) > half + 0.4)
say(v.id, 'deckhouse over the side',
`reaches ${Math.max(-hbx.min.z, hbx.max.z).toFixed(1)} m off centre, hull side ${half.toFixed(1)} m`);
}
}
if (H.helmAt !== undefined) {
if (!part.helm) say(v.id, 'declared but not drawn', 'the wheel');
else {
const HSw = SHIPS_HULL.hullSurface(H);
if (Math.abs(part.helm.y[0] - HSw.deck(H.helmAt)) > 1.2)
say(v.id, 'wheel stands on nothing',
`base at ${part.helm.y[0].toFixed(1)} m, deck there ${HSw.deck(H.helmAt).toFixed(1)} m`);
}
}
{
const stations = (H.masts || [])
.map(mk => ({ mk, x: (mk.at - 0.5) * H.lwl }))
.filter(s => s.mk.rig === 'square');
if (stations.some(s => s.mk.yards)) {
const count = new Map(stations.map(s => [s.mk, 0]));
g.traverse(o => {
if (!o.isMesh || o.userData.kind !== 'square') return;
let best = null, bd = Infinity;
for (const s of stations) {
const d = Math.abs(o.position.x - s.x);
if (d < bd) { bd = d; best = s; }
}
if (best) count.set(best.mk, count.get(best.mk) + 1);
});
for (const s of stations) {
if (!s.mk.yards) continue;
const tiers = count.get(s.mk);
if (tiers !== s.mk.yards.length)
say(v.id, 'square tiers miscounted',
`${s.mk.yards.length} yards in the record at u=${s.mk.at}, ${tiers} sails crossed`);
}
}
}
(H.masts || []).forEach((mk, mi) => {
if (!mk.staysails || !mi) return;
const xF = (H.masts[mi - 1].at - 0.5) * H.lwl, xA = (mk.at - 0.5) * H.lwl;
const tol = H.lwl * 0.03;
let n = 0;
g.traverse(o => { if (o.isMesh && o.userData.kind === 'tri' &&
o.userData.part && o.userData.part.key === 'sail') {
const bbx = new THREE.Box3().setFromObject(o);
if (bbx.min.x > xF - tol && bbx.max.x < xA + tol && bbx.min.y > deckY + 4) n++;
} });
if (n !== mk.staysails)
say(v.id, 'staysails miscounted',
`${mk.staysails} in the record between u=${H.masts[mi - 1].at} and u=${mk.at}, ${n} drawn`);
});
for (const mk of (H.masts || [])) {
if (mk.rig !== 'square' || !mk.spanker) continue;
const mx = (mk.at - 0.5) * H.lwl;
let found = 0;
g.traverse(o => { if (o.isMesh && o.userData.kind === 'quad') {
const bbx = new THREE.Box3().setFromObject(o);
if (bbx.min.x > mx - 1.5 && bbx.max.x > mx + 4) found++;
} });
if (!found)
say(v.id, 'spanker not set',
`mast at u=${mk.at} declares a spanker and no quad cloth runs aft of its station`);
}
g.traverse(o => {
if (!o.isMesh || !o.geometry || (o.userData.kind !== 'tri' && o.userData.kind !== 'quad')) return;
const pos = o.geometry.attributes.position, n = pos.count, row = Math.round(Math.sqrt(n));
if (row * row !== n) { say(v.id, 'a sail that is not a grid', `${o.userData.kind} cloth with ${n} vertices`); return; }
let held = o.userData.held;
if (!held) { say(v.id, 'a sail that does not name the edges its spars hold', `${o.userData.kind} cloth, userData.held absent`); held = ['head']; }
const at = o.userData.kind === 'tri'
? { head: q => q, foot: q => (row - 1) * row + q }
: { luff: q => q, head: q => q * row + row - 1, foot: q => q * row };
for (const e of held) {
if (!at[e]) { say(v.id, 'a sail holding an edge it does not have', `${o.userData.kind} cloth names '${e}'`); continue; }
let m = 0; for (let q = 0; q < row; q++) m = Math.max(m, Math.abs(pos.getZ(at[e](q))));
const P0 = at[e](0), P1 = at[e](row - 1);
const len = Math.hypot(pos.getX(P1) - pos.getX(P0), pos.getY(P1) - pos.getY(P0));
if (m > 0.01)
say(v.id, 'a sail standing off the spar it is bent to', `${o.userData.kind} cloth's ${e} stands ${m.toFixed(2)} m off its ${len.toFixed(1)} m spar (${(m / len).toFixed(4)} of it)`);
}
});
if (H.castles) {
const worldC = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
let skinC = null; g.traverse(o => { const p = tagOf(o); if (!skinC && o.isMesh && p && p.key === 'planking') skinC = o; });
const walls = [], decks = [];
g.traverse(o => { if (o.isMesh && o.userData.castle) (o.userData.castle.kind === 'wall' ? walls : decks).push(o); });
for (const end of ['fore', 'aft']) {
const c = H.castles[end]; if (!c) continue;
const w = walls.filter(o => o.userData.castle.end === end).length, d = decks.filter(o => o.userData.castle.end === end).length;
if (w !== c[2] || d !== c[2])
say(v.id, 'castle tiers missing', `${end}: ${c[2]} tier(s) declared, ${w} wall(s) and ${d} deck(s) drawn`);
}
if (!skinC) say(v.id, 'castles with no planking to stand in', 'no planking mesh');
else {
const sv = worldC(skinC);
const skinTopNear = x => { let t = -1e9; for (const q of sv) if (Math.abs(q[0] - x) < 0.5) t = Math.max(t, q[1]); return t; };
const skinHalfNear = (x, y) => { let w = 0; for (const q of sv) if (Math.abs(q[0] - x) < 0.3 && Math.abs(q[1] - y) < 0.3) w = Math.max(w, Math.abs(q[2])); return w; };
const deckYNear = (end, tier, x) => { let y = null;
for (const o of decks) { const c = o.userData.castle; if (c.end !== end || c.tier !== tier) continue;
for (const q of worldC(o)) if (Math.abs(q[0] - x) < 0.5 && (y === null || q[1] < y)) y = q[1]; }
return y; };
for (const o of walls) {
const c = o.userData.castle, pts = worldC(o);
let worst = 0, at = null;
for (const q of pts) {
const top = skinTopNear(q[0]); if (q[1] > top - 0.05) continue;
const half = skinHalfNear(q[0], q[1]); if (!half) continue;
const over = Math.abs(q[2]) - half;
if (over > worst) { worst = over; at = q; }
}
if (worst > 0.02)
say(v.id, 'a castle wall outside the planking', `${c.end} tier ${c.tier}: a base vertex ${worst.toFixed(2)} m outside the skin at x ${at[0].toFixed(1)}, y ${at[1].toFixed(2)}`);
const xs = [...new Set(pts.map(q => Math.round(q[0] * 2) / 2))];
let lift = 0, where = null;
for (const x of xs) {
let base = 1e9; for (const q of pts) if (Math.abs(q[0] - x) < 0.26) base = Math.min(base, q[1]);
const under = c.tier === 0 ? skinTopNear(x) : deckYNear(c.end, c.tier - 1, x);
if (under === null || under < -1e8) continue;
const d = base - under; if (d > lift) { lift = d; where = x; }
}
if (lift > 0.30)
say(v.id, 'a castle standing off the ship', `${c.end} tier ${c.tier}: base ${lift.toFixed(2)} m over ${c.tier === 0 ? 'the skin' : 'the tier beneath'} at x ${where.toFixed(1)}`);
}
const wallsX = walls.map(o => { const pts = worldC(o); return { c: o.userData.castle, pts,
xMin: Math.min(...pts.map(q => q[0])), xMax: Math.max(...pts.map(q => q[0])) }; });
const wallNear = (w, x) => {
if (x < w.xMin - 0.02 || x > w.xMax + 0.02) return null;
let h = 0, lo = 1e9, hi = -1e9, n = 0;
for (const q of w.pts) if (Math.abs(q[0] - x) < 0.6) { n++; h = Math.max(h, Math.abs(q[2])); lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); }
return n ? { half: h, lo, hi, railH: w.c.railH || 0.9 } : null;
};
let through = 0, feet = 0, first = null;
g.traverse(o => {
const p = tagOf(o);
if (!(o.isMesh && p && p.key === 'shroud' && p.name === 'Shrouds')) return;
const pts = worldC(o);
for (let i = 0; i + 7 < pts.length; i += 8) {
const cen = k => { const s = [0, 0, 0]; for (let j = k; j < k + 4; j++) for (let d = 0; d < 3; d++) s[d] += pts[i + j][d] / 4; return s; };
const a = cen(0), b = cen(4), foot = a[1] < b[1] ? a : b, head = a[1] < b[1] ? b : a;
feet++;
let hit = null;
for (let k = 0; k <= 200 && !hit; k++) {
const f = k / 200, x = foot[0] + (head[0] - foot[0]) * f, y = foot[1] + (head[1] - foot[1]) * f, z = foot[2] + (head[2] - foot[2]) * f;
for (const w of wallsX) { const n = wallNear(w, x); if (!n) continue;
if (Math.abs(z) < n.half - 0.02 && y > n.lo - 0.02 && y < n.hi + n.railH) { hit = { w, y, band: y < n.hi ? 'wall' : 'rail', over: y - n.hi, foot }; break; } }
}
if (hit) { through++; if (!first) first = hit; }
}
});
if (through)
say(v.id, 'a shroud through a castle', `${through} of ${feet} lower shrouds pass through a castle's wall or rail (first: the ${first.w.c.end} tier ${first.w.c.tier} ${first.band} at y ${first.y.toFixed(2)}, ${first.over >= 0 ? first.over.toFixed(2) + ' m over' : (-first.over).toFixed(2) + ' m under'} the wall's head, from a foot at x ${first.foot[0].toFixed(2)}, y ${first.foot[1].toFixed(2)}, z ${first.foot[2].toFixed(2)})`);
g.traverse(o => {
const p = tagOf(o);
if (!(o.isMesh && p && p.key === 'channel')) return;
const pts = worldC(o);
const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
let top = null;
for (const w of wallsX) { const n = wallNear(w, cx); if (n && (!top || n.hi > top.hi)) top = { ...n, c: w.c }; }
if (top && cy < top.hi - 0.5)
say(v.id, 'a channel under a castle wall', `a channel at x ${cx.toFixed(2)}, y ${cy.toFixed(2)} stands ${(top.hi - cy).toFixed(2)} m under the ${top.c.end} tier ${top.c.tier} wall's head (${top.hi.toFixed(2)}); the shrouds it sets up run through the castle`);
});
}
}
{
const worldS = o => {
const a = o.geometry.attributes.position, out = [], vv = new THREE.Vector3();
o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
for (let i = 0; i < a.count; i++) { vv.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push([vv.x, vv.y, vv.z]); }
return out;
};
const cenOf = pts => { const c = [0, 0, 0]; for (const q of pts) for (let d = 0; d < 3; d++) c[d] += q[d] / pts.length; return c; };
const anySquare = (H.masts || []).some(m => m.rig === 'square');
const kindOf = mk => !mk.shrouds ? null
: (mk.shroudFixing && mk.shroudFixing.stationsU && mk.shroudFixing.stationsU.length) ? 'fixing'
: (mk.rig === 'square' || mk.rig === 'gaff' || anySquare) ? 'deadeyes'
: (mk.rig === 'crabclaw' || mk.rig === 'junk') ? 'lashing' : 'tackle';
const dead = [], chans = [], shr = [];
g.traverse(o => {
const p = tagOf(o); if (!o.isMesh || !p) return;
if (p.key === 'deadeye') dead.push({ c: cenOf(worldS(o)), r: o.geometry.parameters ? o.geometry.parameters.radiusTop : 0.1 });
else if (p.key === 'channel') { const pts = worldS(o), xs = pts.map(q => q[0]); chans.push({ c: cenOf(pts), xMin: Math.min(...xs), xMax: Math.max(...xs) }); }
else if (p.key === 'shroud' && p.name === 'Shrouds') shr.push(o);
});
let off = 0, feet = 0, first = null;
for (const o of shr) {
const mk = (H.masts || [])[o.userData.mast]; if (!mk || kindOf(mk) !== 'deadeyes') continue;
const pts = worldS(o);
for (let i = 0; i + 7 < pts.length; i += 8) {
const a = cenOf(pts.slice(i, i + 4)), b = cenOf(pts.slice(i + 4, i + 8)), foot = a[1] < b[1] ? a : b;
feet++;
let best = null;
for (const d of dead) { const dist = Math.hypot(foot[0] - d.c[0], foot[1] - d.c[1], foot[2] - d.c[2]); if (!best || dist < best.dist) best = { dist, r: d.r }; }
if (!best || best.dist > 1.5 * best.r + 0.05) { off++; if (!first) first = { foot, mast: o.userData.mast, dist: best ? best.dist : null }; }
}
}
if (off)
say(v.id, 'a shroud on no deadeye', `${off} of ${feet} lower shrouds on deadeye-class masts end more than 1.5 r from any deadeye (first: mast ${first.mast}, a foot at x ${first.foot[0].toFixed(2)}, y ${first.foot[1].toFixed(2)}, z ${first.foot[2].toFixed(2)}, ${first.dist === null ? 'no deadeye drawn' : 'the nearest deadeye ' + first.dist.toFixed(2) + ' m away'})`);
let offC = 0, firstC = null;
for (const d of dead) {
const on = chans.some(c => Math.sign(c.c[2]) === Math.sign(d.c[2]) && d.c[0] >= c.xMin - 0.02 && d.c[0] <= c.xMax + 0.02 && d.c[1] - c.c[1] > -0.1 && d.c[1] - c.c[1] < 0.5);
if (!on) { offC++; if (!firstC) firstC = d; }
}
if (offC)
say(v.id, 'a deadeye off its channel', `${offC} of ${dead.length} deadeyes stand over no channel (first at x ${firstC.c[0].toFixed(2)}, y ${firstC.c[1].toFixed(2)}, z ${firstC.c[2].toFixed(2)})`);
(H.masts || []).forEach((mk, mi) => {
if (kindOf(mk) !== 'deadeyes') return;
const mx = (mk.at - 0.5) * H.lwl;
for (const sgn of [-1, 1])
if (!chans.some(c => Math.sign(c.c[2]) === sgn && Math.abs(c.c[0] - mx) < 0.06 * H.lwl))
say(v.id, 'shrouds and no channel', `mast ${mi} (${mk.rig}, ${mk.shrouds} shrouds a side) sets up on deadeyes and draws no ${sgn < 0 ? 'port' : 'starboard'} channel within ${(0.06 * H.lwl).toFixed(1)} m of its station`);
});
}
{
const sq = (H.masts || []).filter(mk => mk.rig === 'square');
if (sq.length) {
const jm = (H.masts || []).filter(mk => mk.rig === 'junk').length;
for (const [key, label] of [['lift', 'lift'], ['sheet', 'sheet'],
['tack', 'tack'], ['halyard', 'halyard']]) {
const want = sq.length + ((key === 'sheet' || key === 'halyard') ? jm : 0);
const got = part[key] ? part[key].n : 0;
if (got !== want)
say(v.id, 'yard gear missing',
`${want} ${label} mesh(es) for ${sq.length} square mast(s), ${got} drawn`);
}
const tiers = mk => mk.only ? Math.min(mk.only, 3) : 3;
const wantTop = sq.filter(mk => mk.shrouds && tiers(mk) >= 2).length;
const wantTg = sq.filter(mk => mk.shrouds && tiers(mk) >= 3).length;
let gotTop = 0, gotFut = 0, gotTg = 0;
g.traverse(o => { if (!o.isMesh || !o.userData.part) return;
const nm = o.userData.part.name;
if (nm === 'Topmast shrouds') gotTop++;
if (nm === 'Futtock shrouds') gotFut++;
if (nm === 'Topgallant shrouds') gotTg++; });
if (gotTop !== wantTop || gotFut !== wantTop)
say(v.id, 'topmast unstayed',
`${wantTop} topmast shroud set(s) wanted with futtocks, ` +
`${gotTop} drawn (${gotFut} futtock)`);
if (gotTg !== wantTg)
say(v.id, 'topgallant unstayed',
`${wantTg} topgallant set(s) wanted, ${gotTg} drawn`);
}
}
{
const ancs = [];
g.traverse(o => { if (o.userData && o.userData.part && o.userData.part.key === 'anchor')
ancs.push(new THREE.Box3().setFromObject(o)); });
for (const bb of ancs) {
const worst = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
if (worst > 8.5)
say(v.id, 'anchor out of scale',
`catted anchor spans ${worst.toFixed(1)} m; the largest ever forged is 5.7 m over all`);
}
}
if (H.build === 'bulkhead') {
if (!part.bowtransom) say(v.id, 'bulkhead ends', 'no bow transom drawn');
if (!part.sterntransom) say(v.id, 'bulkhead ends', 'no stern transom drawn');
if (part.stempost) say(v.id, 'bulkhead ends', 'a stem/sternpost on a bulkhead-built hull');
if (!part.rudder) say(v.id, 'junk rudder', 'no rudder drawn');
else {
const c = part.rudder.x[1] - part.rudder.x[0];
if (c < H.lwl * 0.055)
say(v.id, 'junk rudder', `chord ${c.toFixed(1)} m on ${H.lwl} m of waterline`);
if (part.rudder.y[0] > -H.draught * 1.02)
say(v.id, 'junk rudder',
`foot at ${part.rudder.y[0].toFixed(1)} m never reaches below the bottom (draught ${H.draught} m)`);
}
}
{
const jm = (H.masts || []).filter(m => m.rig === 'junk').length;
if (jm && jm === (H.masts || []).length) {
const got = part.yard ? part.yard.n : 0;
if (got !== jm * 7)
say(v.id, 'junk spar census',
`${got} spars across ${jm} junk masts (boom + five battens + yard = ${jm * 7})`);
}
}
if (part.planking && H.draught &&
Math.abs(part.planking.y[0] + H.draught) > Math.max(0.02, H.draught * 0.01))
say(v.id, 'skin off her marks',
`skin bottoms at ${part.planking.y[0].toFixed(2)} m against a stated draught of ${H.draught} m`);
if (part.keel) {
let floorY = 1e9, floorPart = null;
for (const k in part) if (part[k].y[0] < floorY) { floorY = part[k].y[0]; floorPart = k; }
const lowered = H.build === 'bulkhead' && floorPart === 'rudder';
if (floorPart !== 'keel' && !lowered && floorY < part.keel.y[0] - 0.02)
say(v.id, 'hangs below the keel',
`${floorPart} reaches ${floorY.toFixed(2)} m, keel bottom ${part.keel.y[0].toFixed(2)} m`);
}
if (H.flightDeck) {
if (!part.hangar) say(v.id, 'flight deck stands on air', 'no hangar casing built');
else if (part.flightdeck &&
(part.hangar.y[1] < part.flightdeck.y[0] - 1.0 ||
part.hangar.y[0] > deckY + 1.0))
say(v.id, 'hangar does not span the gap',
`casing ${part.hangar.y[0].toFixed(1)}–${part.hangar.y[1].toFixed(1)} m, ` +
`deck slab from ${part.flightdeck.y[0].toFixed(1)}, sheer ${deckY.toFixed(1)}`);
}
if (H.deckPark) {
const acs = [];
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isGroup && o.userData.part && o.userData.part.key === 'aircraft')
acs.push(o); });
if (!acs.length) say(v.id, 'declared but not drawn', 'deck park');
else {
if (acs.length !== H.deckPark)
say(v.id, 'deck park miscounted', `${H.deckPark} declared, ${acs.length} drawn`);
const LS = SHIPS_HULL.landingStrip(H);
const slabTop = part.flightdeck ? part.flightdeck.y[1] : 0;
for (const ac of acs) {
const ab = new THREE.Box3().setFromObject(ac);
const cxA = (ab.min.x + ab.max.x) / 2, czA = (ab.min.z + ab.max.z) / 2;
if (ab.min.y > slabTop + 1.0 || ab.min.y < slabTop - 1.8)
say(v.id, 'aircraft not on the deck',
`wheels at ${ab.min.y.toFixed(1)} m, deck about ${slabTop.toFixed(1)}`);
if (Math.max(-ab.min.z, ab.max.z) > H.flightDeck * 0.5 + 0.5 ||
Math.max(-ab.min.x, ab.max.x) > H.lwl * 0.51 + 0.5)
say(v.id, 'aircraft off the deck',
`at x ${cxA.toFixed(0)} z ${czA.toFixed(0)}`);
const dx = cxA - LS.cx, dz = czA - LS.cz;
const xl = dx * Math.cos(LS.rot) - dz * Math.sin(LS.rot);
const zl = dx * Math.sin(LS.rot) + dz * Math.cos(LS.rot);
if (Math.abs(zl) < LS.halfW + 4 && Math.abs(xl) < LS.halfLen + 9)
say(v.id, 'aircraft parked foul of the landing area',
`${zl.toFixed(1)} m off the axis at x ${cxA.toFixed(0)}`);
}
let acBad = 0, acNote = '';
for (const ac of acs) {
let lo = Infinity, hi = -Infinity, pRun = 0, pTris = 0;
ac.traverse(o => {
if (!o.isMesh || !o.geometry) return;
o.geometry.computeBoundingBox();
const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
lo = Math.min(lo, bb.min.x); hi = Math.max(hi, bb.max.x);
const r = bb.max.x - bb.min.x;
if (r > pRun) {
pRun = r;
pTris = o.geometry.index ? o.geometry.index.count / 3
: o.geometry.attributes.position.count / 3;
}
});
if (pRun < (hi - lo) * 0.8 || pTris <= 12) {
acBad++;
acNote = `principal mesh runs ${pRun.toFixed(2)} of ${(hi - lo).toFixed(2)} m ` +
`at ${pTris} triangles`;
}
}
if (acBad)
say(v.id, 'airframe is not one body',
`${acBad} of ${acs.length} — ${acNote} — a cone abutting a brick, ` +
'not a lofted body');
}
}
if (H.flightDeck) {
let islG = null;
g.traverse(o => {
if (!islG && o.isGroup && o.userData.part && o.userData.part.key === 'island')
islG = o;
});
if (islG) {
islG.updateMatrixWorld(true);
let lo2 = Infinity, hi2 = -Infinity, pRun = 0, pTris = 0;
islG.traverse(o => {
if (!o.isMesh || !o.geometry) return;
o.geometry.computeBoundingBox();
const bb2 = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
lo2 = Math.min(lo2, bb2.min.y); hi2 = Math.max(hi2, bb2.max.y);
const r = bb2.max.y - bb2.min.y;
if (r > pRun) {
pRun = r;
pTris = o.geometry.index ? o.geometry.index.count / 3
: o.geometry.attributes.position.count / 3;
}
});
if (pRun < (hi2 - lo2) * 0.5 || pTris <= 40)
say(v.id, 'island is not one tower',
`principal mesh runs ${pRun.toFixed(2)} of ${(hi2 - lo2).toFixed(2)} m ` +
`at ${pTris} triangles — slabs under a stick, not a lofted tower`);
}
}
if (H.floatplanes) {
const acs = [];
g.traverse(o => {
if (o.isGroup && o.userData.part && o.userData.part.key === 'floatplane')
acs.push(o);
});
let fpBad = 0, fpNote = '';
for (const ac of acs) {
let lo = Infinity, hi = -Infinity, pRun = 0, pTris = 0;
ac.traverse(o => {
if (!o.isMesh || !o.geometry) return;
o.geometry.computeBoundingBox();
const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
lo = Math.min(lo, bb.min.x); hi = Math.max(hi, bb.max.x);
const r = bb.max.x - bb.min.x;
if (r > pRun) {
pRun = r;
pTris = o.geometry.index ? o.geometry.index.count / 3
: o.geometry.attributes.position.count / 3;
}
});
if (pRun < (hi - lo) * 0.8 || pTris <= 12) {
fpBad++;
fpNote = `principal mesh runs ${pRun.toFixed(2)} of ${(hi - lo).toFixed(2)} m ` +
`at ${pTris} triangles`;
}
}
if (fpBad)
say(v.id, 'floatplane is not one body',
`${fpBad} of ${acs.length} — ${fpNote} — a cowl, a barrel and a tail cone ` +
'abutting, not a lofted body');
}
if (H.searchlights) {
let bkBad = 0, bkN = 0, bkNote = '';
g.traverse(o => {
if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Platform bracket')
return;
bkN++;
const pos = o.geometry.attributes.position;
const bkTris = o.geometry.index ? o.geometry.index.count / 3 : pos.count / 3;
let zLo = Infinity, zHi = -Infinity;
for (let i = 0; i < pos.count; i++) {
zLo = Math.min(zLo, pos.getZ(i)); zHi = Math.max(zHi, pos.getZ(i));
}
const span = zHi - zLo;
const depth = band => {
let yLo = Infinity, yHi = -Infinity;
for (let i = 0; i < pos.count; i++)
if (band(pos.getZ(i))) {
yLo = Math.min(yLo, pos.getY(i)); yHi = Math.max(yHi, pos.getY(i));
}
return yHi > yLo ? yHi - yLo : 0;
};
const dA = depth(z => z < zLo + span * 0.15);
const dB = depth(z => z > zHi - span * 0.15);
const dRoot = Math.max(dA, dB), dToe = Math.min(dA, dB);
if (bkTris <= 12 || dRoot < 2 * dToe) {
bkBad++;
bkNote = `depth ${dRoot.toFixed(2)} at the tower, ${dToe.toFixed(2)} at the ` +
`toe, ${bkTris} triangles`;
}
});
if (bkBad)
say(v.id, 'platform bracket is a slab',
`${bkBad} of ${bkN} — ${bkNote} — the same depth at its free end as at ` +
'the tower face, which no cantilever web is');
}
if (H.aa || H.aaLight) {
let shBad = 0, shN = 0, shNote = '';
g.traverse(o => {
if (!o.isMesh || !o.userData.part) return;
const nm = o.userData.part.name;
if (nm !== 'High-angle mount' && nm !== 'Triple 25 mm mount') return;
shN++;
const pos = o.geometry.attributes.position;
const shTris = o.geometry.index ? o.geometry.index.count / 3 : pos.count / 3;
let yLo = Infinity, yHi = -Infinity;
for (let i = 0; i < pos.count; i++) {
yLo = Math.min(yLo, pos.getY(i)); yHi = Math.max(yHi, pos.getY(i));
}
const h = yHi - yLo;
const maxZ = band => {
let m = -Infinity;
for (let i = 0; i < pos.count; i++)
if (band(pos.getY(i))) m = Math.max(m, pos.getZ(i));
return m;
};
const zTop = maxZ(y => y > yHi - h * 0.25), zBot = maxZ(y => y < yLo + h * 0.25);
if (shTris <= 12 || zTop > 0.9 * zBot) {
shBad++;
shNote = `${nm}: face ${zBot.toFixed(2)} at the base, ${zTop.toFixed(2)} at ` +
`the crown, ${shTris} triangles`;
}
});
if (shBad)
say(v.id, 'gun shield is a crate',
`${shBad} of ${shN} — ${shNote} — plumb on every side, which no gun ` +
'shield is');
}
if (H.turrets) {
let ssLo = Infinity, ssHi = -Infinity, pRun = 0, pTris = 0, ssN = 0;
g.traverse(o => {
if (!o.isMesh || !o.geometry || !o.userData.part ||
o.userData.part.key !== 'superstructure') return;
ssN++;
o.geometry.computeBoundingBox();
const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix);
ssLo = Math.min(ssLo, bb.min.y); ssHi = Math.max(ssHi, bb.max.y);
const r = bb.max.y - bb.min.y;
if (r > pRun) {
pRun = r;
pTris = o.geometry.index ? o.geometry.index.count / 3
: o.geometry.attributes.position.count / 3;
}
});
if (ssN && (pRun < (ssHi - ssLo) * 0.6 || pTris <= 40))
say(v.id, 'pagoda is a stack of crates',
`principal mesh runs ${pRun.toFixed(2)} of ${(ssHi - ssLo).toFixed(2)} m ` +
`at ${pTris} triangles — stacked boxes, not one lofted tower`);
}
if (H.catapults) {
let avBad = 0, avN = 0, avNote = '';
const avTri = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
const eachTri = (geo, fn) => {
const pos = geo.attributes.position, ix = geo.index;
const n = ix ? ix.count : pos.count;
for (let i = 0; i + 2 < n; i += 3) {
for (let k = 0; k < 3; k++) {
const vi = ix ? ix.getX(i + k) : i + k;
avTri[k][0] = pos.getX(vi); avTri[k][1] = pos.getY(vi);
avTri[k][2] = pos.getZ(vi);
}
fn(avTri);
}
};
g.traverse(o => {
if (!o.isMesh || !o.userData.part) return;
const nm = o.userData.part.name;
if (nm !== 'Aircraft catapult' && nm !== 'Aircraft crane' &&
nm !== 'Launch rail') return;
avN++;
const geo = o.geometry;
const tris = geo.index ? geo.index.count / 3
: geo.attributes.position.count / 3;
if (nm === 'Launch rail') {
let yHi = -Infinity, cross = false;
eachTri(geo, t => {
for (const p of t) yHi = Math.max(yHi, p[1]);
});
eachTri(geo, t => {
if (t[0][1] >= yHi - 0.05 && t[1][1] >= yHi - 0.05 &&
t[2][1] >= yHi - 0.05 &&
Math.min(t[0][2], t[1][2], t[2][2]) < -0.02 &&
Math.max(t[0][2], t[1][2], t[2][2]) > 0.02) cross = true;
});
if (tris <= 12 || cross) {
avBad++;
avNote = `${nm}: ${tris} triangles, head face in one piece across ` +
'the slot line';
}
} else {
geo.computeBoundingBox();
const bb = geo.boundingBox;
const bbV = Math.max(1e-9, (bb.max.x - bb.min.x) *
(bb.max.y - bb.min.y) * (bb.max.z - bb.min.z));
let vol = 0;
eachTri(geo, t => {
const a = t[0], b = t[1], c = t[2];
vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
- a[1] * (b[0] * c[2] - b[2] * c[0])
+ a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
});
const fill = Math.abs(vol) / bbV;
if (tris <= 60 || fill > 0.25) {
avBad++;
avNote = `${nm}: ${tris} triangles filling ${fill.toFixed(2)} of its ` +
'own box';
}
}
});
if (avBad)
say(v.id, 'aviation steelwork is a crate',
`${avBad} of ${avN} — ${avNote} — a catapult is a truss, a rail is a ` +
'slotted girder, a jib is a lattice');
}
const steerR153 = H.steering ? H.steering
: (H.build === 'steel' || H.build === 'iron') ? 'steel'
: H.build === 'bulkhead' ? 'median' : 'stern';
if (steerR153 === 'steel') {
let rdBad = 0, rdNote = '';
g.traverse(o => {
if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Rudder')
return;
const geo = o.geometry, pos = geo.attributes.position;
const tris = geo.index ? geo.index.count / 3 : pos.count / 3;
let xLo = Infinity, xHi = -Infinity, zMax = 0;
for (let i = 0; i < pos.count; i++) {
xLo = Math.min(xLo, pos.getX(i)); xHi = Math.max(xHi, pos.getX(i));
zMax = Math.max(zMax, Math.abs(pos.getZ(i)));
}
let zAft = 0;
for (let i = 0; i < pos.count; i++)
if (pos.getX(i) > xHi - (xHi - xLo) * 0.10)
zAft = Math.max(zAft, Math.abs(pos.getZ(i)));
if (tris <= 12 || zAft > 0.35 * zMax) {
rdBad++;
rdNote = `${(zAft / Math.max(1e-9, zMax)).toFixed(2)} of full thickness ` +
`at the trailing edge, ${tris} triangles`;
}
});
if (rdBad)
say(v.id, 'rudder is a slab',
`${rdNote} — a balanced rudder is a foil, closed at its trailing edge`);
}
if (H.netDefence) {
let ndBad = 0, ndN = 0, ndNote = '';
let nsLo = Infinity, nsHi = -Infinity, nsRun = 0, nsTris = 0;
g.traverse(o => {
if (!o.isMesh || !o.userData.part) return;
const nm = o.userData.part.name;
if (nm !== 'Net shelf' && nm !== 'Boom hinge') return;
const geo = o.geometry;
geo.computeBoundingBox();
const tris = geo.index ? geo.index.count / 3
: geo.attributes.position.count / 3;
if (nm === 'Net shelf') {
ndN++;
const bb = geo.boundingBox.clone().applyMatrix4(o.matrix);
nsLo = Math.min(nsLo, bb.min.x); nsHi = Math.max(nsHi, bb.max.x);
const r = bb.max.x - bb.min.x;
if (r > nsRun) { nsRun = r; nsTris = tris; }
return;
}
ndN++;
const bb = geo.boundingBox;
const bbV = Math.max(1e-9, (bb.max.x - bb.min.x) *
(bb.max.y - bb.min.y) * (bb.max.z - bb.min.z));
const pos = geo.attributes.position, ix = geo.index;
const n = ix ? ix.count : pos.count;
let vol = 0;
const t = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
for (let i = 0; i + 2 < n; i += 3) {
for (let k = 0; k < 3; k++) {
const vi = ix ? ix.getX(i + k) : i + k;
t[k][0] = pos.getX(vi); t[k][1] = pos.getY(vi); t[k][2] = pos.getZ(vi);
}
vol += (t[0][0] * (t[1][1] * t[2][2] - t[1][2] * t[2][1])
- t[0][1] * (t[1][0] * t[2][2] - t[1][2] * t[2][0])
+ t[0][2] * (t[1][0] * t[2][1] - t[1][1] * t[2][0])) / 6;
}
const fill = Math.abs(vol) / bbV;
if (tris <= 12 || fill > 0.6) {
ndBad++;
ndNote = `a heel fitting of ${tris} triangles filling ${fill.toFixed(2)} ` +
'of its own box';
}
});
if (nsHi > nsLo && (nsTris <= 12 || nsRun < (nsHi - nsLo) * 0.8)) {
ndBad++;
ndNote = `principal shelf plate runs ${nsRun.toFixed(2)} of ` +
`${(nsHi - nsLo).toFixed(2)} m at ${nsTris} triangles`;
}
if (ndBad)
say(v.id, 'net defence is dry goods',
`${ndBad} of ${ndN} — ${ndNote} — a net shelf is one ledge riding the ` +
'plating, and a boom heel swings in a gooseneck, not a crate');
}
if (H.boats && H.decks && !H.turrets && !H.flightDeck && part.boat) {
const T = SHIPS_HULL.linerHouse(H);
const rec = T.tiers.find(t => t.recess);
const datum = rec ? rec.y0 : T.top;
let off = 0, worst = 0;
g.traverse(o => {
if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Ship\'s boat') return;
const bb2 = new THREE.Box3().setFromObject(o);
const d = bb2.min.y - datum;
if (d < -0.6 || d > 2.2) { off++; if (Math.abs(d) > Math.abs(worst)) worst = d; }
});
if (off) say(v.id, 'boats off the boat deck',
`${off} boats, worst ${worst.toFixed(1)} m from the boat deck datum`);
}
if (H.decks && H.funnels && !H.turrets && !H.flightDeck) {
if (!part.bridge) say(v.id, 'no bridge', 'a decked steamer with no wheelhouse');
else {
const T = SHIPS_HULL.linerHouse(H);
if (Math.abs(part.bridge.y[0] - T.top) > 1.5)
say(v.id, 'bridge not on the boat deck',
`bridge base ${part.bridge.y[0].toFixed(1)} m, boat deck ${T.top.toFixed(1)} m`);
const frontX = (T.tiers[T.n - 1].uA - 0.5) * H.lwl;
if (part.bridge.x[0] > frontX + 0.12 * H.lwl)
say(v.id, 'bridge not at the front',
`bridge starts ${(part.bridge.x[0] - frontX).toFixed(1)} m abaft the house front`);
}
}
if (H.funnels && H.decks && !H.turrets && !H.flightDeck && part.funnel) {
const T = SHIPS_HULL.linerHouse(H);
const HS3 = SHIPS_HULL.hullSurface(H);
g.updateMatrixWorld(true);
let bad = 0, msg = '';
g.traverse(o => {
if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'funnel') return;
const bb2 = new THREE.Box3().setFromObject(o);
const u = Math.max(0.001, Math.min(0.999, 0.5 + ((bb2.min.x + bb2.max.x) / 2) / H.lwl));
let deck = HS3.deck(u);
if (T.recorded)
for (const t of T.tiers) if (u >= t.uA && u <= t.uB) deck = Math.max(deck, t.y1);
const d = bb2.min.y - deck;
if (d < -2.0 || d > 1.5) { bad++; msg = `casing bottom ${d.toFixed(1)} m from its deck`; }
});
if (bad) say(v.id, 'funnel does not stand on its deck', `${bad} of ${H.funnels}: ${msg}`);
}
if (part.container || part.forecast) {
const H2 = SHIPS_HULL.hullSurface(H);
let over = 0, worst = 0;
g.traverse(o => {
if (!o.isMesh) return;
const p = tagOf(o);
if (!p || (p.key !== 'container' && p.key !== 'forecast')) return;
const bb = new THREE.Box3().setFromObject(o);
let allow = 0;
for (let s = 0; s <= 4; s++) {
const u = Math.max(0.001, Math.min(0.999,
0.5 + (bb.min.x + (s / 4) * (bb.max.x - bb.min.x)) / H.lwl));
allow = Math.max(allow, Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1.0)[2]));
}
allow += Math.max(1.5, H.beam * 0.033);
const z = Math.max(-bb.min.z, bb.max.z);
if (z > allow) { over++; worst = Math.max(worst, z - allow); }
});
if (over) say(v.id, 'cargo off the deck edge',
`${over} meshes reach up to ${worst.toFixed(1)} m past the hull side at their own station`);
}
if (H.build === 'steel' || H.build === 'iron') {
const HS4 = SHIPS_HULL.hullSurface(H);
let poke = 0, worstP = 0;
g.traverse(o => {
if (!o.isMesh) return;
const p = tagOf(o);
if (!p || p.key !== 'stempost') return;
const pa = o.geometry.getAttribute('position');
for (let s = 0; s + 3 < pa.count; s += 4) {
const x = pa.getX(s), y = pa.getY(s);
const zHalf = Math.max(Math.abs(pa.getZ(s)), Math.abs(pa.getZ(s + 1)));
if (y < 0.3) continue;
let u = Math.max(0.001, Math.min(0.999, 0.5 + x / H.lwl));
const fb = HS4.sheer(u) || 1;
const k = Math.max(0, Math.min(1, y / fb));
u = Math.max(0.001, Math.min(0.999, 0.5 + (x - HS4.rake(u) * k) / H.lwl));
const shell = Math.abs(
SHIPS_HULL.surfacePoint(H, HS4, u, 0.62 + 0.38 * k)[2]);
if (zHalf > shell + 0.05) { poke++; worstP = Math.max(worstP, zHalf - shell); }
}
});
if (poke) say(v.id, 'post proud of a welded shell',
`${poke} stations stand up to ${worstP.toFixed(2)} m outside the plating`);
}
if (H.containers && part.container && part.bridge &&
part.container.y[1] > part.bridge.y[1] - 2.0)
say(v.id, 'the bridge cannot see over the stow',
`stack top ${(part.container.y[1] - deckY).toFixed(1)} m above deck, ` +
`house top ${(part.bridge.y[1] - deckY).toFixed(1)} m`);
for (const [fld, key] of [['bridgeU', 'bridge'], ['funnelU', 'funnel']]) {
if (H[fld] === undefined || !part[key]) continue;
const want = (H[fld] - 0.5) * H.lwl;
const got = (part[key].x[0] + part[key].x[1]) / 2;
if (Math.abs(got - want) > H.lwl * 0.03)
say(v.id, `${key} island off its recorded station`,
`record ${fld} = ${H[fld]} puts it at x ${want.toFixed(1)} m; ` +
`built centroid x ${got.toFixed(1)} m`);
}
{
const bad = {};
g.traverse(o => {
if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
const ge = o.geometry;
if (!ge || !ge.index || !ge.attributes.normal) return;
const ix = ge.index.array, nr = ge.attributes.normal.array, ps = ge.attributes.position.array;
const faces = ix.length / 3, step = Math.max(1, Math.floor(faces / 40));
let dis = 0, tot = 0;
for (let f = 0; f < faces; f += step) {
const A = ix[f * 3], B = ix[f * 3 + 1], C = ix[f * 3 + 2];
const ax = ps[A * 3], ay = ps[A * 3 + 1], az = ps[A * 3 + 2];
const e1 = [ps[B * 3] - ax, ps[B * 3 + 1] - ay, ps[B * 3 + 2] - az];
const e2 = [ps[C * 3] - ax, ps[C * 3 + 1] - ay, ps[C * 3 + 2] - az];
const gx = e1[1] * e2[2] - e1[2] * e2[1],
gy = e1[2] * e2[0] - e1[0] * e2[2],
gz = e1[0] * e2[1] - e1[1] * e2[0];
const gl = Math.hypot(gx, gy, gz); if (gl < 1e-9) continue;
const sx = (nr[A * 3] + nr[B * 3] + nr[C * 3]) / 3,
sy = (nr[A * 3 + 1] + nr[B * 3 + 1] + nr[C * 3 + 1]) / 3,
sz = (nr[A * 3 + 2] + nr[B * 3 + 2] + nr[C * 3 + 2]) / 3;
const sl = Math.hypot(sx, sy, sz); if (sl < 1e-6) continue;
tot++;
if ((gx * sx + gy * sy + gz * sz) / (gl * sl) < -0.2) dis++;
}
if (tot >= 8 && dis / tot > 0.5) {
const p = tagOf(o); const k = p ? p.key : '(untagged)';
bad[k] = (bad[k] || 0) + 1;
}
});
const keys = Object.keys(bad);
if (keys.length)
say(v.id, 'winding contradicts declared normals',
keys.map(k => `${bad[k]} ${k} mesh(es)`).join(', ') +
' — double-sided lighting flips these the wrong way');
}
if (H.deck && /^(teak|hinoki|pine|wood)$/.test(H.deck.covering || '')) {
const covCol = { teak: '8a7250', hinoki: 'b3a17c', pine: 'c0ad84',
wood: 'a08a66' }[H.deck.covering];
let badTreads = 0, coveredRoof = false;
g.traverse(o => {
if (!o.isMesh || !o.material) return;
const p = tagOf(o);
if (p && p.key === 'stair') {
const c = o.material.uniforms && o.material.uniforms.uCol
? o.material.uniforms.uCol.value.getHexString()
: (o.material.color ? o.material.color.getHexString() : '');
if (c !== covCol) badTreads++;
}
if (p && p.key === 'superstructure' && o.material.isShaderMaterial
&& o.material.uniforms && o.material.uniforms.uPlankW
&& o.geometry && o.geometry.type === 'ShapeGeometry') coveredRoof = true;
});
if (badTreads)
say(v.id, 'stair treads ignore the recorded covering',
`${badTreads} tread mesh(es) not in ${H.deck.covering} on a ship whose record lays it`);
if (H.decks && !H.flightDeck && !H.turrets && H.houseAt
&& (H.deck || {}).roofs === undefined && !coveredRoof)
say(v.id, 'record is silent on whether the covering reaches the tier roofs',
'a recorded laid covering, a walkable tier roof cascade, and no roof plate '
+ 'draws in the deck shader');
if ((H.deck || {}).roofs === 'terraces') {
const plates = [];
g.traverse(o => {
if (!o.isMesh || !o.material || !o.geometry) return;
const p = tagOf(o);
if (!p || p.key !== 'superstructure' || o.geometry.type !== 'ShapeGeometry') return;
if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
plates.push({
covered: !!(o.material.isShaderMaterial && o.material.uniforms
&& o.material.uniforms.uPlankW),
y: o.geometry.boundingBox.max.y });
});
if (plates.length) {
const top = plates.reduce((a, b) => (b.y > a.y ? b : a));
if (top.covered)
say(v.id, 'the crest roof wears the covering the record keeps off it',
`deck.roofs is 'terraces' yet the topmost roof plate (y ${top.y.toFixed(2)}) `
+ 'draws in the deck shader');
if (!plates.some(p2 => p2.covered))
say(v.id, "a 'terraces' answer with no terrace drawn in the covering",
`deck.roofs is 'terraces' yet none of ${plates.length} roof plates draws `
+ 'in the deck shader');
}
}
}
{
const P = v.polar || {};
const anch = P.anchor;
const cmax = P.curve ? Math.max.apply(null, Object.keys(P.curve).map(k => P.curve[k])) : 0;
if (!anch || !(anch.kn > 0) || !anch.source)
say(v.id, 'polar without an anchor', 'no polar.anchor {kn, kind, source} names the record');
else if (P.beatLight === 0 && P.beatHard === 0) {
if (Math.abs(cmax - anch.kn) > 0.11)
say(v.id, 'engine curve off its anchor',
`routes at ${cmax} kn against an anchored ${anch.kn}`);
if (v.speedKn !== undefined && (cmax < 0.7 * v.speedKn || cmax > 1.05 * v.speedKn))
say(v.id, 'engine curve contradicts the card',
`routes at ${cmax} kn against a stated ${v.speedKn} — the steamer fault`);
} else if (anch.kind === 'burst') {
if (Math.abs(1.55 * cmax - anch.kn) > 0.15 * anch.kn)
say(v.id, 'burst anchor off the 1.55× ceiling',
`1.55 × ${cmax} = ${(1.55 * cmax).toFixed(1)} kn vs the record's ${anch.kn}`);
} else {
if (anch.kn > 1.55 * cmax)
say(v.id, "day's run above the hull's own ceiling",
`${anch.kn} kn recorded, curve ceiling ${(1.55 * cmax).toFixed(1)}`);
if (cmax > 2 * anch.kn)
say(v.id, 'polar claims twice its own record',
`curve max ${cmax} kn against a day's-run anchor of ${anch.kn}`);
}
{
const eng = P.beatLight === 0 && P.beatHard === 0;
const ceil = (eng ? cmax : 1.55 * cmax) + 0.15;
const m = (P.rigNote || '').match(/\d+(?:\.\d+)?(?=\s*kn)/g) || [];
const over = m.map(Number).filter(kn => kn > ceil);
if (over.length)
say(v.id, "rigNote claims a speed the hull cannot make",
`note states ${over.join(', ')} kn over a ceiling of ${ceil.toFixed(1)} — another vessel's record pasted on`);
}
{
const eng = P.beatLight === 0 && P.beatHard === 0;
const muscled = /\b(oar|paddle)/.test(P.rig || '') && !eng;
const F = P.floor;
if (muscled && !(F && F.kn > 0 && F.lossKnPerMs >= 0 && F.source))
say(v.id, 'muscle vessel without an oar floor',
`rig says "${P.rig}" but no polar.floor {kn, lossKnPerMs, source} — route.js will wind-scale the crew`);
if (F && eng)
say(v.id, 'engine with an oar floor', 'a floor on a beat-0/0 polar is a contradiction — the engine curve already ignores the wind');
if (F && cmax && F.kn > cmax + 0.05)
say(v.id, 'oar floor above the curve',
`floor ${F.kn} kn over a curve topping at ${cmax} — the curve at reference wind already includes the muscle`);
if (F && F.kn - F.lossKnPerMs * 8 <= 0)
say(v.id, 'oar floor dies in its own reference wind',
`${F.kn} − ${F.lossKnPerMs}×8 ≤ 0 — she could never have made the crossing her anchor records`);
}
{
const eng = P.beatLight === 0 && P.beatHard === 0;
const FAM = [
['barquentine',  62,  78],
['square',       80,  95],
['lateen',       72,  84],
['settee',       72,  84],
['battened lug', 62,  70],
['gaff',         55,  68],
['crab claw',    75,  82],
['paddles',      90, 105],
];
const fam = FAM.find(f => (P.rig || '').indexOf(f[0]) >= 0);
if (!eng && fam && (P.beatLight !== fam[1] || P.beatHard !== fam[2]))
say(v.id, "beat angles are not the rig's",
`${P.beatLight}/${P.beatHard} on a "${P.rig}" — the ${fam[0]} family's measured pair is ${fam[1]}/${fam[2]}`);
if (!eng && !fam)
say(v.id, 'rig outside the beat-angle table',
`"${P.rig}" matches no rig family — add its researched pair to the audit table`);
}
{
if (!(P.rig && String(P.rig).trim()))
say(v.id, 'no polar.rig',
"the card subtitle needs the record's rig; a missing one prints the 'no sail' fallback");
const rl = (window.SHIPS_SW && window.SHIPS_SW.rigLine)
? window.SHIPS_SW.rigLine(v) : null;
if (rl !== null && P.rig && !rl.endsWith(P.rig))
say(v.id, 'card subtitle contradicts the rig',
`rigLine gives "${rl}" but the record's rig is "${P.rig}"`);
}
if (P.floor && P.curve
&& typeof compilePolar === 'function' && typeof polarSpeed === 'function'
&& typeof polarBeat === 'function') {
const CP = compilePolar(P);
for (const a of [0, 90, 180]) {
const kn = polarSpeed(CP, 0, a);
if (Math.abs(kn - P.floor.kn) > 0.02) {
say(v.id, 'a calm slows the muscled hull',
`polarSpeed at 0 m/s, ${a}° gives ${kn.toFixed(2)} kn against a floor of ${P.floor.kn} — the crew is being wind-scaled`);
break;
}
}
}
}
{
const setKinds = ['square', 'tri', 'quad'];
let setCloth = 0, setFurls = 0;
g.traverse(o => { if (o.isMesh && o.userData.kind) {
if (setKinds.includes(o.userData.kind)) setCloth++;
if (o.userData.kind === 'furl') setFurls++;
} });
if (setFurls)
say(v.id, 'a set ship carrying stowed canvas',
`${setFurls} furled rolls drawn in the set state`);
if (setCloth) {
let gf = null;
try { gf = SHIPS_HULL.buildShip(H, { furled: true }); }
catch (e) { say(v.id, 'FURLED BUILD THREW', e.message); }
if (gf) {
gf.updateMatrixWorld(true);
let worn = 0, furls = 0;
const furlBoxes = [], sparBoxes = [];
const sparKeys = ['yard', 'stay', 'bowsprit'];
gf.traverse(o => {
if (!o.isMesh) return;
const p = tagOf(o);
if (o.userData.kind && setKinds.includes(o.userData.kind)) worn++;
if (o.userData.kind === 'furl') {
furls++; furlBoxes.push(new THREE.Box3().setFromObject(o));
} else if (p && sparKeys.includes(p.key)) {
sparBoxes.push(new THREE.Box3().setFromObject(o));
}
});
if (worn)
say(v.id, 'furled ship still wearing canvas',
`${worn} set cloths drawn in the furled state`);
if (!furls)
say(v.id, 'furled ship with no stowed canvas',
`${setCloth} cloths when set, nothing stowed when furled`);
const slack = Math.max(1.2, H.beam * 0.12);
furlBoxes.forEach((fb, i) => {
const fbx = fb.clone().expandByScalar(slack);
if (!sparBoxes.some(sb => fbx.intersectsBox(sb)))
say(v.id, 'a furled sail stowed on nothing',
`furl ${i} at y ${fb.min.y.toFixed(1)}–${fb.max.y.toFixed(1)} m touches no yard, stay or bowsprit`);
});
if ((H.masts || []).length && (H.masts || []).every(m => m.rig === 'junk')) {
let setTop = -1e9, furlTop = -1e9;
g.traverse(o => { if (o.isMesh && o.userData.kind &&
setKinds.includes(o.userData.kind))
setTop = Math.max(setTop, new THREE.Box3().setFromObject(o).max.y); });
furlBoxes.forEach(fb => { furlTop = Math.max(furlTop, fb.max.y); });
if (furlTop > mastDeckY + (setTop - mastDeckY) * 0.6)
say(v.id, "a junk's furled sail left hoisted",
`stowed cloth tops at ${furlTop.toFixed(1)} m against set canvas at ${setTop.toFixed(1)} m — the battens did not drop`);
}
}
}
}
{
const sq = (H.masts || []).filter(mm => mm.rig === 'square').length;
const jk = (H.masts || []).filter(mm => mm.rig === 'junk').length;
const lowersA = (H.masts || []).map(mm => lowerOf(mm));
const mainLowerA = Math.max(...lowersA, 0) || 1;
const aftAt = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
const mixedSqA = (H.masts || []).some(mm => mm.rig === 'square');
const drawnD = i => {
const mm = H.masts[i], lo = lowersA[i];
const mz = mm.at === aftAt && (H.masts || []).length >= 3 && !H.iron
&& mixedSqA && lo < mainLowerA * 0.95
&& (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
if (mm.diaM !== undefined) return mm.diaM;
return H.beam * 0.06 * (mz ? Math.min(lo / mainLowerA, 0.60) : lo / mainLowerA);
};
const sqThick = (H.masts || []).filter((mm, i) =>
mm.rig === 'square' && !H.iron && !mm.oneTree && drawnD(i) > 0.55).length;
const jkThick = (H.masts || []).filter((mm, i) =>
mm.rig === 'junk' && !H.iron && drawnD(i) > 0.55).length;
const nW = part.woolding ? part.woolding.n : 0;
const nB = part.mastband ? part.mastband.n : 0;
const depYearA = H.year || v.from || 0;
const perMast = depYearA >= 1800 || jk ? 1 : 2;
const bound = Math.round((nW + nB) / perMast);
if (bound < sqThick + jkThick)
say(v.id, 'a made mast left unbound',
`${sqThick + jkThick} lower masts past 0.55 m through, ${bound} bound — ` +
'timber that thick is coaked, and unbound it opens');
if (jkThick && nB < jkThick)
say(v.id, 'a made junk mast left unbound',
`${jkThick} junk masts past 0.55 m through carry ${nB} iron-strap ` +
'meshes — a compound pole with no shrouds is held together by its straps alone');
if (jk && nW)
say(v.id, 'European wooldings on a junk',
`${nW} woolding meshes on a junk-rigged hull — the r61 copy class; Chinese ` +
'practice is flat iron straps, no rope bands, no pale pinch-hoops');
if (bound > sqThick + jkThick)
say(v.id, 'binding on a single stick',
`${bound} masts bound for ${sqThick + jkThick} past one tree — a stick one ` +
'tree yields, or an iron tube, is not bound');
const depYear = H.year || v.from || 0;
if (nW && depYear >= 1820)
say(v.id, 'rope wooldings out of their century',
`depicted ${depYear}; iron hoops replaced wooldings about 1800`);
if (nB && sq && depYear && depYear < 1780)
say(v.id, 'iron mast hoops before the technology',
`depicted ${depYear}; shrunk iron hoops arrive about 1800`);
if ((sq || jk) && !H.year)
say(v.id, 'a dated rig with no date',
`${sq + jk} square/junk masts and no H.year — tops and bindings key off it`);
}
{
const sq = (H.masts || []).filter(mm => mm.rig === 'square').length;
const depYear = H.year || v.from || 0;
let tops = 0;
g.traverse(o => {
const p = o.userData && o.userData.part;
if (p && p.key === 'top' && (p.name === 'Top' || p.name === 'Basket top') && !o.isMesh) tops++;
});
if (tops && depYear < 1100)
say(v.id, 'a top before the evidence',
`${tops} masthead platforms on a hull depicted ${depYear} — no classical ` +
'ship carried one; the earliest here are the cog seals, 13th century');
if (sq && depYear >= 1100 && tops < sq)
say(v.id, 'a masthead left bare',
`${tops} top platforms for ${sq} square lower masts, depicted ${depYear}`);
const nCb = part.corbis ? part.corbis.n : 0;
if (H.corbis && !nCb)
say(v.id, 'declared but not drawn', 'the corbis at the masthead');
if (!H.corbis && nCb)
say(v.id, 'a corbis nobody attested',
`${nCb} basket meshes on a hull whose record does not carry the corbis field`);
if (H.corbis && nCb) {
const maxShare = Math.max(...(H.masts || []).map(mm => mm.height || 0), 0);
const head = (H.lwl + H.beam) / 2 * maxShare;
if (part.corbis.y[1] < mastDeckY + head * 0.7)
say(v.id, 'a corbis adrift down the mast',
`basket tops at ${part.corbis.y[1].toFixed(1)} m against a ~${head.toFixed(0)} m masthead`);
}
}
{
const anc = (H.masts || []).filter(mm => mm.rig === 'square' && mm.only === 1);
const depYear = H.year || v.from || 0;
const headM = mm => lowerOf(mm);
let nK = 0;
g.traverse(o => { const p = o.userData && o.userData.part;
if (p && p.key === 'karchesion' && !o.isMesh) nK++; });
const preTop = H.year !== undefined && H.year < 1100;
if (preTop && anc.length && nK < anc.length)
say(v.id, 'an ancient masthead with no karchesion',
`${nK} karchesion mesh groups for ${anc.length} single-tier square masts ` +
`depicted ${depYear} — the yard hoists to a sheave the drawing does not carry`);
if (!preTop && nK)
say(v.id, 'a karchesion out of its age',
`${nK} karchesion meshes on a hull depicted ${depYear || 'undated'} — after ` +
'1100 the masthead carries a top, and the two never share a pole');
if (preTop && anc.length && nK) {
const heads = anc.map(headM);
const hi = Math.max(...heads), lo = Math.min(...heads);
if (part.karchesion.y[1] < mastDeckY + hi * 0.80)
say(v.id, 'a karchesion adrift down the mast',
`karchesion tops at ${part.karchesion.y[1].toFixed(1)} m against a ` +
`~${hi.toFixed(0)} m masthead`);
if (part.karchesion.y[0] < mastDeckY + lo * 0.45)
say(v.id, 'a karchesion below the hounds',
`karchesion base at ${part.karchesion.y[0].toFixed(1)} m on masts of ` +
`${lo.toFixed(0)}–${hi.toFixed(0)} m`);
}
const sqAll = (H.masts || []).filter(mm => mm.rig === 'square');
if (sqAll.length && sqAll.every(mm => mm.only === 1) && part.halyard) {
const hi = Math.max(...sqAll.map(headM));
if (part.halyard.y[1] < mastDeckY + hi * 0.85)
say(v.id, 'a halyard that reaches no masthead',
`halyard tops at ${part.halyard.y[1].toFixed(1)} m against a ` +
`~${hi.toFixed(0)} m masthead — the fall must lead over the head sheave`);
}
}
{
const steel = H.build === 'steel' || H.build === 'iron';
const steelDeck = steel && (H.deckSteel !== undefined ? H.deckSteel
: !!(H.flightDeck || H.containers));
const laid = !steelDeck && H.deckLaid !== false;
const ww = part.waterway;
if (laid && part.deck && !ww)
say(v.id, 'a laid deck with no waterway',
'a planked weather deck and no margin plank at its edge');
if (!laid && ww)
say(v.id, 'a margin plank on a deck that has none',
`${ww.n} waterway meshes on a ` +
(steelDeck ? 'bare steel deck' : 'hull with no laid deck (deckLaid: false)'));
if (laid && ww && part.deck) {
if (Math.abs(ww.z[1] - part.deck.z[1]) > 0.15 || Math.abs(ww.z[0] - part.deck.z[0]) > 0.15)
say(v.id, 'a waterway off the deck edge',
`waterway spans z ${ww.z[0].toFixed(2)}..${ww.z[1].toFixed(2)} m against a deck at ` +
`${part.deck.z[0].toFixed(2)}..${part.deck.z[1].toFixed(2)} m`);
if (ww.y[1] > deckY + 0.25 || ww.y[1] < deckY - 1.5)
say(v.id, 'a waterway adrift of its deck',
`waterway tops at ${ww.y[1].toFixed(2)} m against a deck crown at ${deckY.toFixed(2)} m`);
}
}
{
const legsOf = key => { let n = 0;
g.traverse(o => { if (!o.isMesh) return; const p = tagOf(o);
if (p && p.key === key) n += o.geometry.attributes.position.count; });
return Math.round(n / 8); };
const HOISTY = { top: 1, utop: 1, tg: 1, utg: 1, royal: 1 };
const sq = (H.masts || []).filter(m => m.rig === 'square');
const jmM = (H.masts || []).filter(m => m.rig === 'junk');
if (sq.length || jmM.length) {
let want = 0, nHoist = 0;
for (const m of sq) {
const tiers = m.only ? Math.min(m.only, 3) : 3;
const nh = m.yards ? m.yards.filter(nm => HOISTY[nm]).length
: Math.max(1, tiers - 1);
nHoist += nh; want += 2 * nh;
}
nHoist += jmM.length; want += 2 * jmM.length;
const got = legsOf('halyard');
if (got !== want)
say(v.id, 'a hoisting yard without its tie',
`${nHoist} hoisting yards want ${want} halyard legs (slings to the head, ` +
`head to the rail), ${got} drawn — a count below the mark is a fall that ` +
`misses its masthead, above it is a fall on a fixed yard`);
}
const vv = m => lowerOf(m);
const seg3 = sq.filter(m => !m.yards && (m.only ? Math.min(m.only, 3) : 3) >= 2);
let wantJ = 0;
if (seg3.length && !H.iron) {
const atMax = Math.max(...(H.masts || []).map(m => m.at));
const mainH = Math.max(...(H.masts || []).map(vv));
wantJ = seg3.filter(m => !((H.masts || []).length >= 3 && m.at === atMax
&& vv(m) < mainH * 0.95)).length;
}
const gotJ = part.jeers ? part.jeers.n : 0;
if (gotJ < wantJ)
say(v.id, 'a course without its jeers',
`${wantJ} coursed mast(s) on a classic rig want jeer tackles at the lower ` +
`masthead, ${gotJ} jeers mesh(es) drawn`);
if (gotJ > wantJ)
say(v.id, 'jeers out of their age',
`${gotJ} jeers mesh(es) for ${wantJ} wanted — the doubled rig sits its ` +
`lower yards on trusses, and the crossjack hangs in slings`);
if (wantJ && gotJ === wantJ && legsOf('jeers') !== 4 * wantJ)
say(v.id, 'jeers short of their tackle',
`${legsOf('jeers')} jeer legs for ${wantJ} coursed mast(s) — each pair is ` +
`four: block to slings and fall to the deck, both sides`);
let nS = 0;
g.traverse(o => { const p = o.userData && o.userData.part;
if (p && p.key === 'sheave' && !o.isMesh) nS++; });
if (jmM.length && nS < jmM.length)
say(v.id, 'a junk masthead with no sheave',
`${nS} sheave groups for ${jmM.length} junk masts — the halyard leads over ` +
`a sheave the pole does not carry`);
if (!jmM.length && nS)
say(v.id, 'a sheave out of its rig',
`${nS} through-pole sheave(s) on a hull with no junk mast`);
if (jmM.length && part.sheave) {
const heads = jmM.map(vv);
const hiJ = Math.max(...heads), loJ = Math.min(...heads);
if (part.sheave.y[1] < deckY + hiJ * 0.85)
say(v.id, 'a sheave adrift down the mast',
`sheaves top at ${part.sheave.y[1].toFixed(1)} m against a ` +
`~${hiJ.toFixed(0)} m masthead`);
if (part.sheave.y[0] < deckY + loJ * 0.55)
say(v.id, 'a sheave below the hounds',
`sheave base at ${part.sheave.y[0].toFixed(1)} m on poles of ` +
`${loJ.toFixed(0)}–${hiJ.toFixed(0)} m`);
}
}
{
const dbl = (H.masts || []).filter(mm => mm.rig === 'square' && mm.only !== 1).length;
const nC = part.cheek ? part.cheek.n : 0;
if (dbl && nC < dbl * 2)
say(v.id, 'a top standing on nothing',
`${nC} cheek knees for ${dbl} doubled mastheads — the trestletrees rest on air`);
if (!dbl && nC)
say(v.id, 'cheeks with no doubling to carry',
`${nC} cheek knees on a hull with no doubled square masthead`);
if (nC) {
const topBoxes = [], cheekBoxes = [];
g.traverse(o => {
const p = o.userData && o.userData.part;
if (!p) return;
if (p.key === 'top' && !o.isMesh) topBoxes.push(new THREE.Box3().setFromObject(o));
if (p.key === 'cheek' && o.isMesh) cheekBoxes.push(new THREE.Box3().setFromObject(o));
});
const slack = Math.max(0.8, H.beam * 0.06);
cheekBoxes.forEach((cb, i) => {
const cbx = cb.clone().expandByScalar(slack);
if (!topBoxes.some(tb => cbx.intersectsBox(tb)))
say(v.id, 'a cheek carrying nothing',
`cheek ${i} at y ${cb.min.y.toFixed(1)}–${cb.max.y.toFixed(1)} m touches no top`);
});
}
}
{
const lowersB = (H.masts || []).map(mm => lowerOf(mm));
const mainLowerB = Math.max(...lowersB, 0) || 1;
const aftAtB = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
const mixedSqB = (H.masts || []).some(mm => mm.rig === 'square');
const expD = (H.masts || []).map((mm, i) => {
const lo = lowersB[i];
const mz = mm.at === aftAtB && H.masts.length >= 3 && !H.iron && mixedSqB
&& lo < mainLowerB * 0.95
&& (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
return mz ? Math.min(lo / mainLowerB, 0.60) : lo / mainLowerB;
});
if ((H.masts || []).length >= 2) {
const cols = [];
g.traverse(o => {
if (!o.isMesh || !o.userData.part) return;
if (o.userData.part.key !== 'mast' || o.userData.part.name !== 'Mast') return;
const bb = new THREE.Box3().setFromObject(o);
if (bb.max.y - bb.min.y < Math.min(3, H.beam * 0.35)) return;
cols.push({ x: (bb.min.x + bb.max.x) / 2, d: bb.max.z - bb.min.z });
});
const drawn = (H.masts || []).map(() => 0);
cols.forEach(c => {
let bi = -1, bd = 1e9;
(H.masts || []).forEach((mm, i) => {
const dx = Math.abs(c.x - ((mm.at || 0) - 0.5) * H.lwl);
if (dx < bd) { bd = dx; bi = i; }
});
if (bi >= 0 && bd < H.lwl * 0.12) drawn[bi] = Math.max(drawn[bi], c.d);
});
const seen = drawn.map((d, i) => ({ d, e: expD[i] })).filter(s => s.d > 0);
let worst = null;
for (let i = 0; i < seen.length; i++)
for (let j = i + 1; j < seen.length; j++) {
const r = (seen[i].d / seen[j].d) / (seen[i].e / seen[j].e);
const off = Math.abs(Math.log(r));
if (!worst || off > worst.off) worst = { off, i, j };
}
if (worst && worst.off > Math.log(1.35))
say(v.id, 'every mast from one tree',
`lower masts drawn ${seen.map(s => s.d.toFixed(2)).join('/')} m through ` +
`where their lengths ask ${seen.map(s => (H.beam * 0.06 * s.e).toFixed(2)).join('/')} — ` +
"diameter follows the spar's own length (Steel 1794 p.39)");
}
}
{
if (H.iron && (H.masts || []).length) {
const colsC = [];
g.traverse(o => {
if (!o.isMesh || !o.userData.part) return;
if (o.userData.part.key !== 'mast') return;
if (!/^(Iron|Steel|Wooden) mast$/.test(o.userData.part.name || '')) return;
const bb = new THREE.Box3().setFromObject(o);
if (bb.max.y - bb.min.y < Math.min(3, H.beam * 0.35)) return;
colsC.push({ x: (bb.min.x + bb.max.x) / 2, d: bb.max.z - bb.min.z });
});
(H.masts || []).forEach((mm, i) => {
const lo = lowerOf(mm);
const pole = mm.rig === 'square' ? lo * 1.9
: mm.rig === 'gaff' ? (mm.topmast ? lo * 1.52 : lo)
: lo;
const expDia = mm.diaM !== undefined ? mm.diaM : pole / 55;
let drawn = 0;
colsC.forEach(c => {
if (Math.abs(c.x - ((mm.at || 0) - 0.5) * H.lwl) < H.lwl * 0.12)
drawn = Math.max(drawn, c.d);
});
if (!drawn)
say(v.id, 'a recorded mast not drawn',
`mast ${i} at u=${mm.at} declares ${expDia.toFixed(2)} m through and no ` +
'iron mast stands at its station');
else if (Math.abs(Math.log(drawn / expDia)) > Math.log(1.25))
say(v.id, 'an iron mast grown from a tree',
`mast ${i} drawn ${drawn.toFixed(2)} m through where ` +
(mm.diaM !== undefined ? 'the record says' : 'the tube law derives') +
` ${expDia.toFixed(2)} m — an iron mast's diameter is the record's, or ` +
'poleM/55 labelled derived (Research/IRON-MASTS.md)');
});
}
}
{
const steelMainD = (H.lwl + H.beam) / 2;
const lowersD = (H.masts || []).map(mm =>
mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainD);
const mainLowerD = Math.max(...lowersD, 0) || 1;
const aftAtD = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
const mixedSqD = (H.masts || []).some(mm => mm.rig === 'square');
const yardsD = [];
g.traverse(o => {
if (!o.isMesh) return;
const p = tagOf(o);
if (!p || p.key !== 'yard' || p.name !== 'Yard') return;
const bb = new THREE.Box3().setFromObject(o);
const xE = bb.max.x - bb.min.x, yE = bb.max.y - bb.min.y, zE = bb.max.z - bb.min.z;
if (zE <= xE || yE > zE * 0.25) return;
yardsD.push({ x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2,
len: Math.hypot(xE, zE), d: yE });
});
const byStation = new Map();
yardsD.forEach(yd => {
let bi = -1, bd = 1e9;
(H.masts || []).forEach((mm, i) => {
const dx = Math.abs(yd.x - ((mm.at || 0) - 0.5) * H.lwl);
if (dx < bd) { bd = dx; bi = i; }
});
if (bi < 0 || bd > H.lwl * 0.18) return;
if (!byStation.has(bi)) byStation.set(bi, []);
byStation.get(bi).push(yd);
});
byStation.forEach((ys, mi) => {
const mm = H.masts[mi];
const mz = mm.at === aftAtD && (H.masts || []).length >= 3 && !H.iron && mixedSqD
&& lowersD[mi] < mainLowerD * 0.95
&& (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
ys.sort((a, b) => a.y - b.y).forEach((yd, rank) => {
const rate = rank === 0 ? (mz ? 0.625 : 0.700) : rank <= 2 ? 0.625 : 0.600;
const exp = H.iron ? yd.len / 50 : yd.len * rate / 36;
if (Math.abs(Math.log(yd.d / exp)) > Math.log(1.35))
say(v.id, "a yard cut from the ship's beam",
`yard at u=${mm.at} tier ${rank}, ${yd.len.toFixed(1)} m long, drawn ` +
`${yd.d.toFixed(2)} m through where its own length asks ${exp.toFixed(2)} — ` +
(H.iron ? 'a steel yard is length/50 at the slings (Peking 1911, Great Eastern 1858)'
: "yard diameter follows the spar's own length (Steel 1794, " +
'"Proportional Diameters of Yards")'));
});
});
}
rows.push({ id: v.id, loa: H.loa, airAboveDeck: +airM.toFixed(1),
parts: Object.keys(part).length,
funnelH: part.funnel ? +(part.funnel.y[1] - deckY).toFixed(1) : null });
}
{
const curveOwner = {};
for (const v of list) {
if (!v.polar || !v.polar.curve) continue;
const k = JSON.stringify(v.polar.curve);
if (curveOwner[k]) say(v.id, 'shared polar curve', 'byte-identical with ' + curveOwner[k]);
else curveOwner[k] = v.id;
}
}
{
if (typeof btPolarSpeed !== 'undefined')
say('battle', 'a second speed model',
'btPolarSpeed exists again — the Action must ask route.js\'s polarSpeed, not its own interpolator');
for (const fn of ['compilePolar', 'polarSpeed', 'polarBeat'])
if (typeof window[fn] !== 'function')
say('battle', 'shared polar model unreachable',
fn + ' is not a page global — the battle compiles and evaluates through it at open');
}
{
const BATS = (typeof APP !== 'undefined' && APP.battles && APP.battles.battles) || [];
const VS = (typeof APP !== 'undefined' && APP.vessels && APP.vessels.vessels) || [];
for (const b of BATS) {
if (!b.campaign) continue;
const bid = 'battle-' + b.id;
if (!Array.isArray(b.fleets) || b.fleets.length < 2)
say(bid, 'a campaign without its two fleets',
'the Action and the board need the two principals in battle.fleets[0] and [1]');
else {
b.fleets.slice(0, 2).forEach((F, i) => {
if (F.side !== undefined && F.side !== i)
say(bid, 'a principal fleet on the wrong side',
`fleets[${i}] ("${F.name}") declares side ${F.side} — the gauge names FL[0]/FL[1] by index`);
});
b.fleets.slice(2).forEach(F => {
if (F.side !== 0 && F.side !== 1)
say(bid, 'an attached fleet with no side',
`"${F.name}": a third fleet block must declare side 0 or 1 explicitly`);
});
}
if (typeof b.powder !== 'boolean')
say(bid, 'a campaign without an armament record',
'powder must be true or false — the gunfire path asks it, and absence is not an answer');
if (typeof b.year !== 'number')
say(bid, 'a campaign without a year', 'the date line is d.d + btYear(year)');
if (!Array.isArray(b.cam) || b.cam.length !== 3 || !b.cam.every(isFinite))
say(bid, 'a campaign without a board camera', 'cam is [lon, lat, altitude km]');
for (const F of (b.fleets || [])) {
const ves = VS.find(x => x.id === F.id);
if (!ves || !ves.hull || !ves.polar)
say(bid, 'a fleet no vessel answers to',
`fleet "${F.name}" asks for vessel "${F.id}" — not in the vessel list with hull ` +
'and polar, so the Action would draw an empty sea under a working UI');
if (!(F.n >= 1) || !F.name || !/^[0-9a-f]{6}$/i.test(F.color || '') || !F.chip)
say(bid, 'a fleet with a broken record',
`"${F.id}": n ≥ 1, name, 6-digit color and chip are all required`);
const fm = F.form || {};
const formOk = fm.shape === 'crescent'
? [fm.front, fm.depth, fm.lead].every(isFinite)
: fm.shape === 'ranks'
? [fm.front, fm.rows, fm.gap].every(isFinite) && fm.rows >= 1
: false;
if (!formOk)
say(bid, 'a fleet with no formation',
`"${F.id}": form.shape must be crescent (front/depth/lead) or ranks (front/rows/gap)`);
}
const C = b.campaign;
if (C.length < 2)
say(bid, 'a campaign of one day', 'the fleet heading is the track\'s own bearing, day to day');
C.forEach((day, i) => {
for (const k of ['lon', 'lat', 'elon', 'elat'])
if (!isFinite(day[k])) say(bid, 'a campaign day off the map', `day ${i} ("${day.d}") ${k}`);
if (!(day.rng > 0)) say(bid, 'a campaign day without a range', `day ${i} ("${day.d}")`);
if (!(day.w >= 0 && day.w <= 360) || !(day.f >= 0 && day.f <= 12))
say(bid, 'a campaign day with impossible weather',
`day ${i} ("${day.d}") w=${day.w} f=${day.f}`);
if (!day.d || !day.t) say(bid, 'a campaign day with no record', `day ${i}`);
if (day.a !== undefined && day.a !== true)
say(bid, 'an action flag that is not a flag', `day ${i} ("${day.d}") a=${day.a}`);
if (day.hd !== undefined && !(day.hd >= 0 && day.hd <= 360))
say(bid, 'a day with an impossible facing',
`day ${i} ("${day.d}") hd=${day.hd} — an authored fleet heading is a compass bearing`);
if (day.ck !== undefined || day.cs !== undefined)
if (!(day.ck >= 0 && day.ck <= 15) || !(day.cs >= 0 && day.cs <= 360))
say(bid, 'a stream that is not a vector',
`day ${i} ("${day.d}") cs=${day.cs} ck=${day.ck} — a tidal stream is a set ` +
'(degrees toward, 0-360) and a rate (knots), both or neither');
if (day.anc !== undefined
&& (!Array.isArray(day.anc) || !day.anc.length
|| !day.anc.every(a => a === 0 || a === 1)))
say(bid, 'an anchor that names no fleet',
`day ${i} ("${day.d}") anc=${JSON.stringify(day.anc)} — anc lists the sides (0/1) lying to anchors`);
});
if (b.shore) {
const sh = b.shore;
if (!sh.src || ![sh.lon0, sh.lat0, sh.lon1, sh.lat1].every(isFinite)
|| !(sh.lon1 > sh.lon0) || !(sh.lat1 > sh.lat0))
say(bid, 'a shore without bounds', 'shore needs src and lon0<lon1, lat0<lat1');
const pr = sh.probes || [];
if (!pr.some(p => p.land === true) || !pr.some(p => p.land === false))
say(bid, 'a shore without witnesses',
'probes must name at least one point that is land and one that is water — ' +
'a mirrored patch passes any test that only asks one side');
for (const p of pr)
if (!isFinite(p.lon) || !isFinite(p.lat) || typeof p.land !== 'boolean'
|| p.lon <= sh.lon0 || p.lon >= sh.lon1 || p.lat <= sh.lat0 || p.lat >= sh.lat1)
say(bid, 'a probe off its own patch', `"${p.n}"`);
if (typeof SHIPS_BT === 'undefined' || typeof SHIPS_BT.btShoreElev !== 'function'
|| typeof SHIPS_BT.btShoreLoad !== 'function')
say(bid, 'a shore the Action cannot sample',
'SHIPS_BT.btShoreElev / btShoreLoad missing');
if (typeof SHIPS_BT !== 'undefined' && SHIPS_BT.SHORE_PALS
&& !SHIPS_BT.SHORE_PALS[sh.veg])
say(bid, 'a shore in another climate\'s clothes',
`shore.veg "${sh.veg}" names no palette in SHORE_PALS — ` +
`known: ${Object.keys(SHIPS_BT.SHORE_PALS).join(', ')}`);
else {
const B = SHIPS_BT.BT;
if (!B.shoreGrid || B.shoreFor !== b.id) {
try { SHIPS_BT.btShoreLoad(b); } catch (e) {  }
for (let w = 0; w < 200 && !B.shoreReady; w++)
await new Promise(r => setTimeout(r, 50));
}
if (!B.shoreGrid || B.shoreFor !== b.id)
say(bid, 'a shore that did not load',
`${sh.src} — no grid after btShoreLoad (staging the strait on open ocean)`);
else {
for (const p of pr) {
const el = SHIPS_BT.btShoreElev(p.lon, p.lat);
if (p.land !== (el > 0))
say(bid, 'a shore that contradicts its witnesses',
`"${p.n}" (${p.lon}, ${p.lat}) reads ${el.toFixed(1)} m but must be ${p.land ? 'land' : 'water'} — ` +
'mirrored, misplaced or misdecoded patch');
}
(b.campaign || []).forEach((d, i) => {
const el = SHIPS_BT.btShoreElev(d.lon, d.lat);
if (el > -2.0)
say(bid, 'a campaign day anchored on dry land',
`day ${i} ("${d.d}") at (${d.lon}, ${d.lat}) reads ${el.toFixed(1)} m`);
});
}
if (B.spec && B.spec.id === b.id && B.shoreFor === b.id && B.shoreGrid) {
for (const s of B.ships) {
const el = SHIPS_BT.btElevLocal(s.x, s.z);
if (el > 0)
say(bid, 'a ship on dry land',
`side ${s.side} at local (${s.x.toFixed(0)}, ${s.z.toFixed(0)}) sits on ${el.toFixed(1)} m of ground`);
}
}
}
if (typeof SHIPS_BT !== 'undefined' && SHIPS_BT.btFrame
&& !/btElevLocal/.test(String(SHIPS_BT.btFrame)))
say(bid, 'a helm that ignores the shore',
'btFrame no longer refuses a grounding step — ships will sail up the hillsides');
}
}
if (window.SHIPS_BT) {
const src = String(SHIPS_BT.btFrame);
if (/GRAVELINES/.test(src))
say('battle', 'gunfire by regex again',
'btFrame matches the day\'s prose for GRAVELINES — the a flag and powder are the record');
if (!/\.a\b/.test(src) || !/powder/.test(src))
say('battle', 'gunfire not asking the record',
'btFrame must gate its broadsides on the day\'s a flag and the battle\'s powder field');
if (typeof SHIPS_BT.formStation !== 'function')
say('battle', 'the formation model unreachable',
'SHIPS_BT.formStation is the one implementation both views draw');
if (typeof startCampaign === 'function' && !/formStation/.test(String(startCampaign)))
say('battle', 'the board keeps its own formation',
'startCampaign no longer draws SHIPS_BT.formStation — two shapes for one fleet');
if (typeof SHIPS_BT.btYear !== 'function' || SHIPS_BT.btYear(-480) !== '480 BC'
|| SHIPS_BT.btYear(1588) !== '1588')
say('battle', 'a year that cannot go BC',
'btYear(-480) must read "480 BC" — Salamis is dated like the vessels are');
const src158 = String(SHIPS_BT.btFrame);
if (BATS.some(b => (b.campaign || []).some(dd => dd.ck !== undefined))
&& !/curMs/.test(src158))
say('battle', 'a helm that ignores the stream',
'a campaign day carries a tidal rate (ck) but btFrame never reads BT.curMs — the tide would be a caption, not a force');
if (BATS.some(b => (b.campaign || []).some(dd => dd.anc !== undefined))
&& !/anchored|\.anc\b/.test(src158))
say('battle', 'an anchor the helm never feels',
'a campaign day states the anchor fact (anc) but btFrame never reads it — the anchored fleet would drift on the stream its cable holds');
}
if (typeof startCampaign === 'function' && typeof stepCampaign === 'function'
&& typeof clearCampaign === 'function') {
for (const b of BATS) {
if (!b.campaign || !b.fleets) continue;
try {
startCampaign(b);
stepCampaign(0.001);
} catch (e) {
say('battle-' + b.id, 'a board that cannot draw its campaign',
'startCampaign/stepCampaign threw: ' + e.message);
} finally {
try { clearCampaign(); } catch (e) {  }
}
}
}
}
if (typeof selectEra === 'function' && typeof seaLevelAt === 'function'
&& window.SHIPS_ROUTE && typeof S !== 'undefined' && typeof eraTracks !== 'undefined'
&& APP.chapters && APP.voyages) {
const RT = window.SHIPS_ROUTE;
const eraHome = S.era;
const chs = APP.chapters.chapters || [];
const drain = async () => {
for (let w = 0; w < 2000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
try { if (typeof pumpFleetQueue === 'function') pumpFleetQueue(24); } catch (e) { break; }
await new Promise(r => setTimeout(r, 0));
}
};
for (let e = 0; e < chs.length; e++) {
try { selectEra(e); } catch (err) {
say('era-' + e, 'an era that cannot build its fleet', 'selectEra threw: ' + err.message);
continue;
}
await drain();
const want = Math.round((seaLevelAt(S.year) || 0) / 5) * 5;
if (RT.FINE.ready && RT.FINE.datum !== want)
say('era-' + e, 'the router and the renderer hold two shorelines',
`FINE.datum ${RT.FINE.datum} m against seaLevelAt(${S.year}) = ${want} m — `
+ 'every track in this era was planned on a coastline the viewer is not shown');
for (const tr of eraTracks) {
const legs = tr.legs || [];
let ashore = 0, total = 0, run = 0, maxRun = 0, at = null;
const test = (lon, lat) => {
total++;
if (!RT.fineIsWater(lon, lat)) {
ashore++; run++; if (run > maxRun) maxRun = run;
if (!at) at = [lon, lat];
} else run = 0;
};
for (let i = 0; i < legs.length; i++) {
test(legs[i].lon, legs[i].lat);
if (i < legs.length - 1) {
const b = legs[i + 1], dl = ((b.lon - legs[i].lon + 540) % 360) - 180;
test(legs[i].lon + dl / 2, (legs[i].lat + b.lat) / 2);
}
}
if (maxRun >= 2)
say(tr.name || tr.vesselId, 'a voyage drawn on the model\'s own land',
`era ${e}: ${ashore} of ${total} track samples ashore at the era's own sea `
+ `level, longest run ${maxRun}`
+ (at ? `, first at (${at[0].toFixed(2)}, ${at[1].toFixed(2)})` : ''));
if (typeof showVoyageCard === 'function' && document.getElementById('cRows')) {
const vv = ((APP.voyages.voyages || APP.voyages) || [])
.find(x => x.name === tr.name);
if (vv) {
try {
showVoyageCard(vv);
const rowsTxt = document.getElementById('cRows').textContent || '';
const has = rowsTxt.indexOf('Route fallback') >= 0;
const need = !!(tr.give && (tr.give.legs || tr.give.unfixed || tr.give.ashore));
if (need && !has)
say(tr.name, 'a give-up the card does not confess',
`era ${e}: the track carries give ${JSON.stringify(tr.give)} and the `
+ 'voyage card shows no Route fallback row');
if (!need && has)
say(tr.name, 'a caveat on a clean track',
`era ${e}: the card shows a Route fallback row but the track's own `
+ 'ledger is clean');
} catch (err) {
say(tr.name, 'a voyage card that cannot open',
'showVoyageCard threw: ' + err.message);
}
}
}
}
}
try { selectEra(eraHome); await drain(); } catch (e) {  }
}
if (typeof fillLandRow === 'function' && typeof selectEra === 'function'
&& window.SHIPS_ROUTE && APP.ports && APP.chapters) {
const RT = window.SHIPS_ROUTE;
const eraHome2 = S.era;
const drain2 = async () => {
for (let w = 0; w < 2000 && typeof fleetQueueBusy === 'function' && fleetQueueBusy(); w++) {
try { if (typeof pumpFleetQueue === 'function') pumpFleetQueue(24); } catch (e) { break; }
await new Promise(r => setTimeout(r, 0));
}
};
try {
selectEra(0); await drain2();
const cell = document.createElement('div');
cell.innerHTML = '<table><tr><td class="pc-land">—</td></tr></table>';
if (typeof PSGV !== 'undefined') PSGV.landKey = undefined;
fillLandRow(cell, { at: { lon: 126.4, lat: -10.1 } });
const txt = cell.querySelector('.pc-land').textContent;
for (const p of (APP.ports.ports || []))
if (p.name && txt.includes(p.name))
say('passage-readout', 'a gazetteer that names a place out of its own time',
`era 0, year ${S.year}: the land row reads "${txt}" — "${p.name}" is a port `
+ 'of the modern record naming a coast sixty millennia before any port existed');
const m = txt.match(/^(\d+) nm/);
if (m && RT.FINE && RT.FINE.ready) {
const texNm = 40075 / RT.FINE.w * Math.cos(-10.1 * Math.PI / 180) / 1.852;
if (+m[1] < texNm)
say('passage-readout', 'a distance the field cannot state',
`the land row reads "${txt}" but the fine raster's texel here is `
+ `${texNm.toFixed(1)} nm — sub-texel ranges must say "under"`);
}
} catch (e) {
say('passage-readout', 'a land row that cannot be asked', 'fillLandRow threw: ' + e.message);
}
try { selectEra(eraHome2); await drain2(); } catch (e) {  }
}
return { problems, checked: rows.length, rows };
})()