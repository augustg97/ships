(async function auditHulls() {
const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
const problems = [];
const rows = [];
const say = (id, rule, detail) => problems.push({ id, rule, detail });
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
const bb = new THREE.Box3().setFromObject(g);
const airM = bb.max.y - deckY;
{
const undecked = H.deckLaid === false || (H.deck && H.deck.covering === 'bare');
const timber = !(H.build === 'iron' || H.build === 'steel');
const steelDeck = H.deck && H.deck.covering === 'steel';
for (const k of ['grating', 'capstan']) {
if (undecked && part[k])
say(v.id, 'hold furniture on an undecked hull',
`${part[k].n} ${k} mesh(es) drawn, but the record declares deckLaid: false — `
+ 'no laid deck, no hatch to cover, nothing for a capstan to stand on');
else if (!undecked && timber && !steelDeck && !part[k])
say(v.id, `a decked timber ship lost her ${k}`,
'the hull is timber and the record does not refuse a laid deck, so hatch '
+ 'gratings and a capstan belong aboard and none is drawn');
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
if (sm.n !== 2 * H.gunDeck.loops)
say(v.id, 'loophole count off its record',
`${sm.n} sama drawn, record declares ${H.gunDeck.loops} a side`);
const bandTop = planeY + (H.gunDeck.screenH || 0) + 0.3;
if (sm.y[0] < planeY - 0.1 || sm.y[1] > bandTop)
say(v.id, 'loopholes out of the bulwark band',
`sama band ${sm.y[0].toFixed(1)}–${sm.y[1].toFixed(1)} m, bulwark ` +
`${planeY.toFixed(1)}–${bandTop.toFixed(1)}`);
}
}
{
const WALL = ['Bulwark', 'End bulwark', 'Screen'];
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
if (np !== 2 * H.gunDeck.wallPorts)
say(v.id, 'oar-deck ports off their record',
`${np} drawn, record declares ${H.gunDeck.wallPorts} a side`);
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
let nRo = 0, bad = 0, first = '';
const tip = new THREE.Vector3(), pin = new THREE.Vector3();
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
});
if (!nRo) say(v.id, 'ro declared but no oars drawn', 'oarStyle ro with no oar groups');
else if (bad) say(v.id, 'ro drawn as sweeps', `${bad} of ${nRo} oars fail the scull test — ${first}`);
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
for (const [name, want, got] of [
['stem', H.stemRake * H.loa, foreWL - foreDk],
['sternpost', H.sternRake * H.loa, aftDk - aftWL]]) {
if (want > 1.5 && Math.abs(got - want) > Math.max(1.2, want * 0.4))
say(v.id, 'a recorded rake drawn vertical',
`${name}: record asks a ${want.toFixed(1)} m lean, drawn ${got.toFixed(1)} m`);
}
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
const d = pb.min.y - HSf.sheer(uu);
if (d < -0.6 || d > 3.6)
say(v.id, 'floatplane stands on nothing',
`float bottom ${d.toFixed(1)} m off the sheer at its station`);
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
hs.push(new THREE.Box3().setFromObject(o)); });
if (hs.length !== H.deckHatches.length)
say(v.id, 'stowage hatches miscounted',
`${H.deckHatches.length} in the record, ${hs.length} drawn`);
for (const hb of hs) {
const uu = Math.max(0.001, Math.min(0.999, 0.5 + ((hb.min.x + hb.max.x) / 2) / H.lwl));
const zc = (hb.min.z + hb.max.z) / 2;
const bB = Math.abs(SHIPS_HULL.surfacePoint(H, HSh, uu, 1.0)[2]);
const camber = Math.cos((zc / bB) * Math.PI / 2) * bB * 0.035;
const d = hb.min.y - (HSh.sheer(uu) + camber);
if (d < -0.6 || d > 0.6)
say(v.id, 'hatch off the deck',
`coaming bottom ${d.toFixed(2)} m from the cambered deck at its station`);
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
if (Math.abs(cb.min.y - HS3.sheer(uu)) > 1.5)
say(v.id, 'catapult stands on nothing',
`bottom at ${cb.min.y.toFixed(1)} m, sheer there ${HS3.sheer(uu).toFixed(1)} m`);
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
const onSheer = Math.abs(tb.min.y - HS2.sheer(u)) < 1.4;
const onHouse = houseBoxes2.some(hbx =>
Math.abs(tb.min.y - hbx.max.y) < 1.4 &&
tb.max.x > hbx.min.x && tb.min.x < hbx.max.x &&
tb.max.z > hbx.min.z && tb.min.z < hbx.max.z);
if (!onSheer && !onHouse)
say(v.id, 'turret stands on nothing',
`bottom at ${tb.min.y.toFixed(1)} m, sheer there ${HS2.sheer(u).toFixed(1)} m, no deck beneath`);
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
const steelMain = (H.lwl + H.beam) / 2;
const lower = mk.heightM !== undefined ? mk.heightM : mk.height * steelMain;
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
const lower = mk.heightM !== undefined ? mk.heightM
: mk.height * (H.lwl + H.beam) / 2;
const floorY = HSt.sheer(mk.at) + lower * 0.75;
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
const d = HSd.sheer(uu);
if (hbx.min.y > d + 0.3 || hbx.max.y < d + 1.0)
say(v.id, 'deckhouse off the deck',
`house spans ${hbx.min.y.toFixed(1)}–${hbx.max.y.toFixed(1)} m, sheer there ${d.toFixed(1)} m`);
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
if (Math.abs(part.helm.y[0] - HSw.sheer(H.helmAt)) > 1.2)
say(v.id, 'wheel stands on nothing',
`base at ${part.helm.y[0].toFixed(1)} m, sheer there ${HSw.sheer(H.helmAt).toFixed(1)} m`);
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
}
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
let deck = HS3.sheer(u);
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
if (H.decks && !H.flightDeck && !H.turrets && H.houseAt && !coveredRoof)
say(v.id, 'house roofs ignore the recorded covering',
'a recorded laid covering, a walkable tier roof cascade, and no roof plate '
+ 'draws in the deck shader');
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
if (furlTop > deckY + (setTop - deckY) * 0.6)
say(v.id, "a junk's furled sail left hoisted",
`stowed cloth tops at ${furlTop.toFixed(1)} m against set canvas at ${setTop.toFixed(1)} m — the battens did not drop`);
}
}
}
}
{
const sq = (H.masts || []).filter(mm => mm.rig === 'square').length;
const jk = (H.masts || []).filter(mm => mm.rig === 'junk').length;
const steelMainA = (H.lwl + H.beam) / 2;
const lowersA = (H.masts || []).map(mm =>
mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainA);
const mainLowerA = Math.max(...lowersA, 0) || 1;
const aftAt = Math.max(...(H.masts || []).map(mm => mm.at || 0), 0);
const mixedSqA = (H.masts || []).some(mm => mm.rig === 'square');
const drawnD = i => {
const mm = H.masts[i], lo = lowersA[i];
const mz = mm.at === aftAt && (H.masts || []).length >= 3 && !H.iron
&& mixedSqA && lo < mainLowerA * 0.95
&& (mm.rig === 'square' || mm.rig === 'gaff' || mm.rig === 'lateen');
return H.beam * 0.06 * (mz ? Math.min(lo / mainLowerA, 0.60) : lo / mainLowerA);
};
const sqThick = (H.masts || []).filter((mm, i) =>
mm.rig === 'square' && !H.iron && drawnD(i) > 0.55).length;
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
if (p && p.key === 'top' && p.name === 'Top' && !o.isMesh) tops++;
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
if (part.corbis.y[1] < deckY + head * 0.7)
say(v.id, 'a corbis adrift down the mast',
`basket tops at ${part.corbis.y[1].toFixed(1)} m against a ~${head.toFixed(0)} m masthead`);
}
}
{
const anc = (H.masts || []).filter(mm => mm.rig === 'square' && mm.only === 1);
const depYear = H.year || v.from || 0;
const headM = mm => mm.heightM || (H.lwl + H.beam) / 2 * (mm.height || 0);
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
if (part.karchesion.y[1] < deckY + hi * 0.80)
say(v.id, 'a karchesion adrift down the mast',
`karchesion tops at ${part.karchesion.y[1].toFixed(1)} m against a ` +
`~${hi.toFixed(0)} m masthead`);
if (part.karchesion.y[0] < deckY + lo * 0.45)
say(v.id, 'a karchesion below the hounds',
`karchesion base at ${part.karchesion.y[0].toFixed(1)} m on masts of ` +
`${lo.toFixed(0)}–${hi.toFixed(0)} m`);
}
const sqAll = (H.masts || []).filter(mm => mm.rig === 'square');
if (sqAll.length && sqAll.every(mm => mm.only === 1) && part.halyard) {
const hi = Math.max(...sqAll.map(headM));
if (part.halyard.y[1] < deckY + hi * 0.85)
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
const vv = m => m.heightM !== undefined ? m.heightM
: (H.lwl + H.beam) / 2 * (m.height || 0);
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
const steelMainB = (H.lwl + H.beam) / 2;
const lowersB = (H.masts || []).map(mm =>
mm.heightM !== undefined ? mm.heightM : (mm.height || 0) * steelMainB);
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
const steelMainC = (H.lwl + H.beam) / 2;
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
const lo = mm.heightM !== undefined ? mm.heightM
: (mm.height || 0) * steelMainC;
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