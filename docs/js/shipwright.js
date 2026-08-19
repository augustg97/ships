'use strict';
const SW = {
on: false, renderer: null, scene: null, cam: null, ship: null, spec: null,
yard: null, layout: null, shipX: 0, panX: undefined,
lon: 0.9, lat: 0.16, dist: 1.12, spin: true, stage: 7, sel: null,
ray: null, hit: [], t0: 0,
};
const STAGE_NAMES = [
['Keel laid', 'One timber, stem to sternpost. Everything is measured from it.'],
['Frames raised', 'The ribs go up on the keel. In a carvel ship the shape is now decided.'],
['Planked', 'The skin goes on. Carvel: edge to edge, caulked. Clinker: overlapped, riveted.'],
['Decked', 'The deck ties the sides together and carries the guns. Rudder hung aft.'],
['Masts stepped', 'Lower mast, topmast, topgallant — each fidded through the doubling.'],
['Rigged', 'Shrouds take the sideways pull; ratlines make them a ladder aloft.'],
['Yards crossed', 'The spars the square sails hang from, braced round to trim to the wind.'],
['Bent on', 'Canvas. She can now be driven by the wind rather than carried by it.'],
];
function swInit() {
if (SW.renderer) return;
const cv = document.getElementById('swCanvas');
SW.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
SW.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
SW.renderer.shadowMap.enabled = true;
SW.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
SW.scene = new THREE.Scene();
SW.cam = new THREE.PerspectiveCamera(34, 1, 0.05, 40000);
SW.ray = new THREE.Raycaster();
SW.ray.params.Line = { threshold: 0.35 };
SW.scene.add(new THREE.HemisphereLight(0xdCEBFF, 0x3d5a68, 2.2));
const key = new THREE.DirectionalLight(0xfff6e8, 3.1); key.position.set(90, 120, 70);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0012;
key.shadow.normalBias = 0.35;
SW.key = key;
const fill = new THREE.DirectionalLight(0xa8c8e0, 0.85); fill.position.set(-80, 45, -55);
const bounce = new THREE.DirectionalLight(0xd8c9a8, 0.40); bounce.position.set(15, -60, 25);
const rim = new THREE.DirectionalLight(0xdcecf6, 1.15); rim.position.set(-40, 70, -120);
[key, fill, bounce, rim].forEach(l => SW.scene.add(l));
SW.renderer.outputColorSpace = THREE.SRGBColorSpace || SW.renderer.outputColorSpace;
if ('toneMapping' in SW.renderer) {
SW.renderer.toneMapping = THREE.ACESFilmicToneMapping;
SW.renderer.toneMappingExposure = 1.15;
}
const skyG = new THREE.SphereGeometry(18000, 32, 20);
const skyM = new THREE.Mesh(skyG, new THREE.ShaderMaterial({
vertexShader: SHADERS['SKY_VERT.vert'], fragmentShader: SHADERS['SKY_FRAG.frag'],
side: THREE.BackSide, depthWrite: false, depthTest: false,
uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
uTime: { value: 0 } },
}));
skyM.frustumCulled = false;
skyM.renderOrder = -1000;
SW.sky = skyM; SW.scene.add(skyM);
const gg = window.SHIPS_PSG.radialDisc(40, 26000, 150, 192, 6371000);
const gm = new THREE.Mesh(gg, new THREE.ShaderMaterial({
vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
uWind: { value: 6.5 }, uScale: { value: 150 }, uRip: { value: 3000 },
uWave: { value: SHIPS_SEA.seaWaveUniform(6.5) } },
}));
gm.rotation.x = -Math.PI / 2;
gm.frustumCulled = false;
gm.renderOrder = 2;
SW.ground = gm; SW.scene.add(gm);
{
const R0 = 15000, seg = 720, pos = [], idx = [];
const drop = Math.sqrt(Math.max(0, 6371000 * 6371000 - R0 * R0)) - 6371000;
for (let j = 0; j <= seg; j++) {
const a = j / seg * Math.PI * 2;
const x = Math.sin(a) * R0, z = -Math.cos(a) * R0;
const envelope = 0.62 * Math.sin(a + 0.524)
+ 0.30 * Math.sin(a * 2 + 1.571)
+ 0.26 * Math.sin(a * 3 + 2.618)
+ 0.14 * Math.sin(a * 5 + 5.236) - 0.06;
const ridge = 0.55 + 0.45 * Math.sin(a * 11 + 1.10)
* (0.60 + 0.40 * Math.sin(a * 17 - 0.30))
+ 0.18 * Math.sin(a * 29 + 2.20);
const h = Math.max(0, 760 * envelope * ridge);
pos.push(x, drop, z, x, drop + h, z);
}
for (let j = 0; j < seg; j++) {
const a0 = j * 2, b0 = a0 + 2;
idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
}
const lg = new THREE.BufferGeometry();
lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
lg.setIndex(idx); lg.computeVertexNormals();
const lm = new THREE.MeshBasicMaterial({ color: 0x8fa2ad, fog: false });
const land = new THREE.Mesh(lg, lm);
land.frustumCulled = false; land.renderOrder = -900;
SW.shore = land; SW.scene.add(land);
}
let drag = null;
cv.addEventListener('pointerdown', e => {
delete SW.viewFromDeg;
drag = { x: e.clientX, y: e.clientY, spin: SW.shipSpin || 0, lat: SW.lat, moved: false };
cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
if (!drag) return;
if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
SW.shipSpin = drag.spin + (e.clientX - drag.x) * 0.008;
SW.lat = Math.max(0.02, Math.min(0.90, drag.lat + (e.clientY - drag.y) * 0.004));
});
cv.addEventListener('pointerup', e => {
if (drag && !drag.moved) swPick(e);
drag = null;
});
cv.addEventListener('wheel', e => {
e.preventDefault();
SW.dist = Math.max(0.35, Math.min(26.0, SW.dist * (1 + Math.sign(e.deltaY) * 0.11)));
}, { passive: false });
const step = d => {
if (!SW.layout) return;
const i2 = SW.layout.findIndex(e => e.id === SW.spec.id);
const n = SW.layout[(i2 + d + SW.layout.length) % SW.layout.length];
swOpen(n.v);
};
document.getElementById('swPrev').onclick = () => step(-1);
document.getElementById('swNext').onclick = () => step(1);
window.swOpenById = id => {
const e = (SW.layout || []).find(en => en.id === id);
if (!e) return false;
swOpen(e.v);
return true;
};
addEventListener('keydown', e => {
if (!SW.on) return;
if (e.key === 'ArrowLeft') step(-1);
if (e.key === 'ArrowRight') step(1);
});
document.getElementById('swStage').addEventListener('input', e => {
SW.stage = +e.target.value; swApplyStage();
});
const fb = document.getElementById('swFurl');
if (fb) fb.onclick = () => swSetFurled(!SW.furled);
}
function swPick(e) {
const cv = document.getElementById('swCanvas');
const r = cv.getBoundingClientRect();
const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1,
-((e.clientY - r.top) / r.height) * 2 + 1);
SW.ray.setFromCamera(m, SW.cam);
const hits = SW.ray.intersectObjects(SW.hit.filter(o => o.visible), false);
if (!hits.length) { swSelect(null); return; }
swSelect(hits[0].object);
}
function swSelect(obj) {
if (SW.sel && SW.sel.userData.emissiveWas !== undefined && SW.sel.material.emissive) {
SW.sel.material.emissive.setHex(SW.sel.userData.emissiveWas);
SW.sel.userData.emissiveWas = undefined;
}
SW.sel = obj;
if (obj && obj.material && obj.material.emissive) {
obj.userData.emissiveWas = obj.material.emissive.getHex();
obj.material = obj.material.clone();
obj.material.emissive.setHex(0x3a2c10);
}
}
const TRADITION = {
dugout: { label: 'One piece: a tree with the inside taken out',
s0: ['Nothing to lay', 'A dugout is not assembled, so there is no keel and '
+ 'nothing is measured from one. The work starts with a '
+ 'standing tree, not a timber on blocks.'],
s1: ['Log felled', 'The hull is chosen, not designed. Its beam is the trunk\'s '
+ 'beam and cannot exceed it, which fixes what the boat can '
+ 'ever be before a tool touches it.'],
s2: ['Hollowed', 'Burned and adzed out from above. There is no seam anywhere in '
+ 'the hull, so nothing can leak — and nothing can be replaced '
+ 'either, because there are no parts.'],
s3: ['Rim finished', 'The gunwale is dressed to a fair curve and left thick, '
+ 'because the rim takes the paddle strokes and every '
+ 'landing. Below it the hull is already complete: there is '
+ 'nothing left to add.'],
s7: ['Afloat', 'She floats with about a third of a metre of freeboard. '
+ 'Paddlers, food and water all sit on the hollowed floor, below '
+ 'the line of the rim.'] },
frame: { label: 'Frame-first (carvel): frames, then planking',
s1: ['Frames raised', 'The ribs go up on the keel. The shape is decided now, on the '
+ 'drawing floor, before a single plank is cut — which is what '
+ 'makes a 74 reproducible by a yard that has never built one.'],
s2: ['Planked', 'Planks meet edge to edge on the frames and the seams are caulked.'] },
shell: { label: 'Shell-first: planking, then frames',
s1: ['Shell built', 'The planking shell goes up FIRST and holds the shape — clinker '
+ 'riveted, or edge-joined by mortise and tenon, or sewn. The form '
+ "exists only in the shipwright's eye and hands; there is no plan."],
s2: ['Frames inserted', 'Light frames go in afterwards, into a hull whose shape '
+ 'already exists. Superb hulls — and they do not scale, '
+ 'because the shell has to carry the building loads.'] },
iron:     { label: 'Iron frames, riveted plating',
s1: ['Frames erected', 'Rolled iron frames on a keel plate. Iron does not care about '
+ 'the length of a tree, which is the whole point: a wooden hull '
+ 'is limited to about 60 m by the timber available and by '
+ 'hogging, and iron simply is not.'],
s2: ['Plated', 'Plates riveted to the frames, lapped and caulked. A riveted seam is '
+ 'watertight and, unlike a caulked one, does not need re-caulking every '
+ 'few years — which is a large part of why iron won.'] },
steelRiveted: { label: 'Steel: frames, riveted plating',
s1: ['Frames erected', 'Mild-steel frames on a keel plate, erected one by one and '
+ 'faired by eye — the block-built hull is a post-war invention. '
+ 'Steel displaced iron in the 1880s because it is stronger for '
+ 'the same weight, so the same ship needs fewer tons of hull.'],
s2: ['Plated', 'Plates riveted to the frames, lapped at every land. Titanic carried '
+ 'three million rivets, driven by four-man gangs — hydraulic where the '
+ 'shell was fair enough, by hand round the bow and stern where the '
+ 'machine could not reach.'] },
steel:    { label: 'Steel: frames, then welded plate',
s1: ['Frames erected', 'Steel frames on a keel plate — and not one at a time. A modern '
+ 'hull is assembled from prefabricated BLOCKS welded up elsewhere '
+ 'and craned together, which is why a 400 m ship takes months '
+ 'rather than years.'],
s2: ['Plated', 'Welded plate, not riveted. A welded seam is continuous, so the hull is '
+ 'one member instead of thousands of plates lapped together — and that '
+ 'continuity is what lets a ship be 400 m long at all.'] },
bulkhead: { label: 'Bulkhead-first (Chinese): bulkheads, then planking',
s1: ['Bulkheads raised', 'Transverse bulkheads go up first. They are structure and '
+ 'subdivision at once — which gave the junk WATERTIGHT '
+ 'COMPARTMENTS centuries before Europe thought of them. Hole '
+ 'one compartment and the ship swims home.'],
s2: ['Planked', 'The planking is fastened to the bulkheads rather than to ribs.'] },
};
const ENGINE_STAGES = [
null, null, null,
['Decked', 'The strength deck closes the box. On a container ship it is mostly hatch, because '
+ 'the hull is a rack and the cargo has to drop straight in.'],
['Machinery in', 'The engine and shafting go in before the ship is closed up — they are far too '
+ 'big to fit through any opening afterwards. A modern low-speed diesel is three '
+ 'storeys tall and turns at about 100 rpm, straight onto the shaft, no gearbox.'],
['Accommodation', 'The house and bridge, pushed to one end so nothing blocks the crane runs.'],
['Funnel and uptakes', 'What a mast used to be, doing what a mast never did: taking the exhaust '
+ 'of about 80 megawatts out of the top of the ship.'],
['Loaded', 'Cargo, stores and people aboard. What a hull is built to carry is what decides '
+ 'her proportions: how much of her volume is hold, how much is accommodation, and '
+ 'how deep she floats when it is all in.'],
];
function swApplyStage() {
if (!SW.ship) return;
const H = SW.spec && SW.spec.hull;
let buildKey = (H && H.build) || 'frame';
if (buildKey === 'steel' && H && H.year && H.year < 1950) buildKey = 'steelRiveted';
const trad = TRADITION[buildKey] || TRADITION.frame;
const shell = trad === TRADITION.shell;
const dug = trad === TRADITION.dugout;
SW.ship.traverse(o => {
const p = o.userData && o.userData.part;
if (!p) return;
let st = p.stage;
if (shell && p.key === 'frames') st = 2;
if (shell && p.key === 'planking') st = 1;
if (dug && p.key === 'planking') st = 1;
if (dug && p.key === 'deck') st = 2;
o.visible = st <= SW.stage;
if (p.key === 'frames' && SW.stage >= (shell ? 1 : 2)) o.visible = false;
if (p.key === 'logtop') o.visible = dug && SW.stage === 1;
});
const bb = new THREE.Box3();
SW.ship.traverse(o => { if (o.visible && o.userData.part) bb.expandByObject(o); });
bb.min.x -= SW.shipX; bb.max.x -= SW.shipX;
if (!bb.isEmpty()) {
SW.viewTop = bb.max.y; SW.viewBot = bb.min.y;
SW.viewX = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
}
const engine = !(SW.spec.hull.masts || []).length;
let nm = SW.stage === 1 ? trad.s1
: SW.stage === 2 ? trad.s2
: (engine && ENGINE_STAGES[SW.stage]) || STAGE_NAMES[SW.stage];
if (trad['s' + SW.stage]) nm = trad['s' + SW.stage];
else if (trad.s3 && SW.stage > 3 && SW.stage < 7) nm = trad.s3;
if (SW.stage === 7 && SW.spec.hull.containers)
nm = ['Loaded', 'The boxes. Eight feet by eight foot six by twenty or forty, corner castings '
+ 'identical everywhere on earth — and the standard, not the ship, is the '
+ 'invention.'];
const cloth = (SW.spec.hull.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole')
|| SW.spec.hull.headsails;
if (SW.stage === 7 && SW.furled && cloth)
nm = ['Bent on, furled', 'The canvas is bent to its spars and stowed: square sails rolled '
+ 'on their yards in harbour gaskets with the bunt gathered at the '
+ 'slings, gaff sails lowered onto their booms, a junk\'s battens '
+ 'dropped into their stack. This is how a ship spends most of her '
+ 'life — canvas wears out in use, and it was set only when she '
+ 'was going somewhere.'];
document.getElementById('swStageName').textContent = nm[0];
document.getElementById('swStageWhat').textContent = nm[1];
document.getElementById('swOrder').textContent = trad.label;
}
function swBuildYard() {
if (SW.yard) return;
SW.yard = new THREE.Group();
SW.scene.add(SW.yard);
const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull)
.slice().sort((a, b) => (a.from || 0) - (b.from || 0));
SW.layout = [];
let cursor = 0, prevL = 0;
all.forEach((v, i) => {
const L = v.hull.loa;
const gap = i === 0 ? 0 : Math.max(9, 0.30 * Math.max(prevL, L));
const x = cursor + (i === 0 ? L / 2 : prevL / 2 + gap + L / 2);
cursor = x; prevL = L;
SW.layout.push({ id: v.id, v, x, loa: L, obj: null, fine: false, built: false,
furlBuilt: !!SW.furled });
});
const lay = document.getElementById('swLabels');
lay.innerHTML = '';
SW.layout.forEach(e => {
const d = document.createElement('div');
d.className = 'sl';
const yr = e.v.from === undefined ? '' :
(e.v.from < 0 ? Math.abs(e.v.from) + ' BC' : String(e.v.from));
d.innerHTML = '<b>' + e.v.name + '</b><span>' + yr + ' · ' + e.loa.toFixed(0) + ' m</span>';
lay.appendChild(d);
e.el = d;
});
const first = SW.layout[0], last = SW.layout[SW.layout.length - 1];
SW.yardSpan = [first.x - first.loa, last.x + last.loa];
}
const FINE_WINDOW = 9;
function swFineWanted() {
if (!SW.layout || !SW.layout.length) return new Set();
const centre = SW.panTo !== undefined ? SW.panTo
: (SW.panX !== undefined ? SW.panX : SW.shipX);
const byNear = SW.layout.slice().sort((a, b) =>
Math.abs(a.x - centre) - Math.abs(b.x - centre));
const want = new Set(byNear.slice(0, FINE_WINDOW).map(e => e.id));
if (SW.spec && SW.spec.id) want.add(SW.spec.id);
return want;
}
function swRebuild(e, fine) {
if (e.obj) SW.yard.remove(e.obj);
e.obj = window.SHIPS_HULL.buildShip(e.v.hull, { fine: !!fine, furled: !!SW.furled });
e.built = true;
e.obj.position.x = e.x;
SW.yard.add(e.obj);
e.fine = !!fine;
e.furlBuilt = !!SW.furled;
if (SW.on && SW.spec && e.id === SW.spec.id && SW.ship !== e.obj) swAdoptShip(e);
return e.obj;
}
function swAdoptShip(e) {
SW.ship = e.obj;
SW.ship.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
SW.hit = [];
SW.ship.traverse(o => { if (o.userData && o.userData.part) SW.hit.push(o); });
SW.sel = null;
swApplyStage();
}
function swPumpDetail() {
if (!SW.layout || !SW.layout.length) return;
const want = swFineWanted();
const stale = e => e.furlBuilt !== !!SW.furled;
if (typeof FROZEN !== 'undefined' && FROZEN) {
SW.layout.forEach(e => {
const f = want.has(e.id);
if (!e.built || e.fine !== f || stale(e)) swRebuild(e, f);
});
return;
}
if (SW.layout.some(e => !e.built)) {
const centre = SW.panTo !== undefined ? SW.panTo
: (SW.panX !== undefined ? SW.panX : SW.shipX || 0);
const next = SW.layout.filter(e => !e.built)
.sort((a, b) => Math.abs(a.x - centre) - Math.abs(b.x - centre))[0];
if (next) { swRebuild(next, want.has(next.id)); return; }
}
const up = SW.layout.find(e => want.has(e.id) && (!e.fine || stale(e)));
if (up) { swRebuild(up, true); return; }
const down = SW.layout.find(e => !want.has(e.id) && (e.fine || stale(e)));
if (down) swRebuild(down, false);
}
function swSetFurled(on) {
on = !!on;
if (!!SW.furled === on) return;
SW.furled = on;
const b = document.getElementById('swFurl');
if (b) { b.textContent = on ? 'Set sail' : 'Furl sails'; b.classList.toggle('on', on); }
if (SW.layout && SW.spec) {
const e = SW.layout.find(en => en.id === SW.spec.id);
if (e) swRebuild(e, true);
}
if (SW.on) swApplyStage();
}
function swPromote(entry) {
if (entry.built && entry.fine) return entry.obj;
return swRebuild(entry, true);
}
function swOpen(vessel) {
swInit();
if (!vessel || !vessel.hull) return false;
swBuildYard();
SW.spec = vessel;
const entry = SW.layout.find(e => e.id === vessel.id);
if (!entry) return false;
SW.ship = swPromote(entry);
SW.ship.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
SW.shipX = entry.x;
SW.panTo = entry.x;
SW.shipSpin = 0;
if (!SW.on) { SW.panX = entry.x; SW.panTo = entry.x; }
const idx = SW.layout.findIndex(e => e.id === vessel.id);
document.getElementById('swNavPos').textContent = (idx + 1) + ' of ' + SW.layout.length;
SW.sel = null;
SW.hit = [];
SW.ship.traverse(o => { if (o.userData && o.userData.part) SW.hit.push(o); });
const U = SW.ship.userData;
const L = vessel.hull.loa;
SW.dryY = U.keelBottom - 0.02 * L;
SW.waterY = U.waterlineY || 0;
SW.ground.position.set(SW.shipX, SW.stage >= 7 ? SW.waterY : SW.dryY, 0);
SW.rigTop = U.rigTop;
SW.dist = Math.min(26.0, Math.max(SW.dist, 1.0));
SW.spin = true; SW.t0 = performance.now();
SW.stage = 7;
document.getElementById('swStage').value = 7;
document.getElementById('shipwright').classList.remove('hidden');
document.getElementById('swRuler').style.display = 'flex';
document.getElementById('swTitle').textContent = vessel.name;
document.getElementById('swSub').textContent = rigLine(vessel);
document.getElementById('swDims').innerHTML = [
['Length overall', L.toFixed(1) + ' m'],
['Beam', vessel.hull.beam.toFixed(2) + ' m'],
['Draught', vessel.hull.draught.toFixed(2) + ' m'],
[(vessel.hull.masts || []).length ? 'Rig, deck to truck' : 'Air draught, above deck',
(U.rigTop - vessel.hull.freeboard).toFixed(1) + ' m'],
].map(d => '<div><b>' + d[1] + '</b><span>' + d[0] + '</span></div>').join('');
if (SW.key) {
const r = Math.max(L, U.rigTop) * 0.85;
const sc = SW.key.shadow.camera;
sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r;
sc.near = 1; sc.far = r * 6;
SW.key.position.set(entry.x + r * 1.1, r * 1.6, r * 0.9);
SW.key.target.position.set(entry.x, U.rigTop * 0.3, 0);
SW.scene.add(SW.key.target);
sc.updateProjectionMatrix();
}
swFillCard(vessel);
swApplyStage();
swSelect(null);
swBuildFleetStrip();
swBuildList();
SW.on = true;
swResize();
return true;
}
function swFillCard(v) {
const P = v.polar || {};
const cur = P.curve || {};
const ks = Object.keys(cur).map(Number).sort((a, b) => a - b);
let bestA = 0, bestV = 0;
ks.forEach(k => { if (cur[k] > bestV) { bestV = cur[k]; bestA = k; } });
const eng = P.beatLight === 0 && P.beatHard === 0;
const cap = [
[v.crew !== undefined ? String(v.crew) : '—', v.crew === 0 ? 'crew — nobody aboard' : 'crew'],
[v.pax !== undefined ? String(v.pax) : '—', v.pax === undefined ? 'passengers unrecorded' : 'passengers'],
[(v.speedKn !== undefined ? v.speedKn.toFixed(1) : bestV.toFixed(1)) + ' kn',
v.speedKn !== undefined ? 'service speed' : 'best speed, in a moderate breeze'],
].concat(eng ? [
[bestV.toFixed(1) + ' kn', 'at sea, in the model — the router uses this'],
['0°', 'closest made good — straight upwind, under power'],
['—', 'the wind does not set her speed'],
] : [
[bestA + '°', 'at this angle off the wind'],
[(P.beatLight !== undefined ? P.beatLight + '°' : '—'),
P.floor ? 'closest made good under sail, light airs' : 'closest made good, light airs'],
[(P.beatHard !== undefined ? P.beatHard + '°' : '—'),
P.floor ? 'closest made good under sail, blowing hard' : 'closest made good, blowing hard'],
]).concat(P.floor ? (() => {
const word = P.floor.by;
return [
[P.floor.kn.toFixed(1) + ' kn', 'under ' + word + ', any heading — a calm does not slow her'],
[Math.max(0, P.floor.kn - P.floor.lossKnPerMs * 8).toFixed(1) + ' kn',
'made good dead upwind, fresh breeze — windage, not a beat limit'],
];
})() : []);
document.getElementById('swCap').innerHTML =
'<h4>Performance under sail and power</h4><div class="cap">' +
cap.map(c => '<div><b>' + c[0] + '</b><span>' + c[1] + '</span></div>').join('') + '</div>' +
'';
const pl = (APP.plates || {})[v.id];
const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
document.getElementById('swStory').innerHTML =
(pl ? '<figure class="plate">' +
'<img src="data/assets/ships/' + v.id + '.jpg" alt="" loading="lazy" ' +
'onerror="this.closest(\'.plate\').remove()">' +
'<figcaption>' + esc(pl.caption) +
(pl.credit ? '<span class="cr">' + esc(pl.credit) +
(pl.licence ? ' · ' + esc(pl.licence) : '') + '</span>' : '') +
'</figcaption></figure>'
: '') +
'<h4>History and service</h4>' + proseHTML(v.text);
document.getElementById('swRows').innerHTML = (v.rows || []).length
? '<h4>Measurements and sources</h4>' + v.rows.map(r =>
'<div class="rw"><i>' + r[0] + '</i><b>' + r[1] + '</b></div>').join('')
: '';
document.getElementById('swCite').textContent = v.cite || '';
}
function swBuildFleetStrip() {
const strip = document.getElementById('swFleet');
const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull)
.slice().sort((a, b) => (a.from || 0) - (b.from || 0));
const max = Math.max(...all.map(v => v.hull.loa));
strip.innerHTML = '';
all.forEach(v => {
const b = document.createElement('button');
b.className = 'fs' + (SW.spec && SW.spec.id === v.id ? ' on' : '');
b.innerHTML = '<i style="width:' + (Math.sqrt(v.hull.loa / max) * 100).toFixed(1) + '%"></i>'
+ '<span class="n">' + v.name + '</span>'
+ '<span class="l">' + v.hull.loa.toFixed(0) + ' m</span>';
b.onclick = () => swOpen(v);
strip.appendChild(b);
});
if (!strip.dataset.wheelWired) {
strip.dataset.wheelWired = '1';
strip.addEventListener('wheel', ev => {
const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
if (!d) return;
const before = strip.scrollLeft;
strip.scrollLeft += d;
if (strip.scrollLeft !== before) ev.preventDefault();
}, { passive: false });
}
swScrollFleetIntoView();
}
function swScrollFleetIntoView() {
const on = document.querySelector('#swFleet .fs.on');
if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function swClose() {
SW.on = false;
const rl = document.getElementById('swRuler');
if (rl) rl.style.display = 'none';
const lay = document.getElementById('swLabels');
if (lay) lay.querySelectorAll('.sl').forEach(d => { d.style.opacity = '0'; });
document.getElementById('shipwright').classList.add('hidden');
}
function swBuildList() {
const el = document.getElementById('swListBody');
const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull)
.slice().sort((a, b) => (a.from || 0) - (b.from || 0));
el.innerHTML = '';
all.forEach(v => {
const b = document.createElement('button');
b.className = 'sv' + (SW.spec && SW.spec.id === v.id ? ' on' : '');
const yr = v.from === undefined ? '' :
(v.from < 0 ? Math.abs(v.from) + ' BC' : String(v.from));
b.innerHTML = '<span class="n">' + v.name + '</span>'
+ '<span class="m">' + yr + (yr ? ' · ' : '') + v.hull.loa.toFixed(0) + ' m</span>';
b.onclick = () => swOpen(v);
el.appendChild(b);
});
}
function swResize() {
if (!SW.renderer) return;
const el = document.getElementById('shipwright');
const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
SW.renderer.setSize(w, h, false);
SW.cam.aspect = w / h; SW.cam.updateProjectionMatrix();
}
function swFrame(now) {
if (SW.sky) { SW.sky.material.uniforms.uTime.value = clockS();
SW.sky.position.copy(SW.cam.position); }
if (SW.ground && SW.ground.material.uniforms) {
const U2 = SW.ground.material.uniforms;
U2.uTime.value = clockS();
U2.uCam.value.copy(SW.cam.position);
SW.ground.position.x = SW.shipX;
SW.ground.position.y = SW.stage >= 7 ? (SW.waterY || 0) : (SW.dryY || 0);
}
if (!SW.on || !SW.ship) return;
const L = SW.spec.hull.loa;
SW.lon = 0.42;
if (SW.viewFromDeg !== undefined)
SW.shipSpin = SW.lon + Math.PI / 2 - SW.viewFromDeg * Math.PI / 180;
SW.layout && SW.layout.forEach(e => { if (e.obj) e.obj.rotation.y = e.id === SW.spec.id ? (SW.shipSpin || 0) : 0; });
if (SW.stage >= 7 && SW.layout) {
const t = clockS();
SHIPS_SEA.animateOars(SW.ship, t);
SHIPS_SEA.animateWheels(SW.ship, t, (SW.spec && SW.spec.speedKn) || 8);
SW.layout.forEach(e => {
if (!e.obj) return;
const h = (e.v && e.v.hull) || {};
const len = h.loa || 30;
const r = SHIPS_SEA.floatShip(e.obj, e.obj.position.x, 0, 0, len, t, 6.5,
h.beam, h.draught);
e.obj.position.y = r.y;
e.obj.rotation.z = r.pitch;
e.obj.rotation.x = r.roll;
});
} else if (SW.layout) {
SW.layout.forEach(e => { if (!e.obj) return; e.obj.position.y = 0; e.obj.rotation.z = 0; e.obj.rotation.x = 0; });
}
const top = SW.viewTop, bot = SW.viewBot;
const lookT = SW.lookAtY !== undefined
? Math.max(bot, Math.min(top, SW.lookAtY))
: bot + (top - bot) * 0.34;
const halfV = Math.max(top - lookT, lookT - bot);
const tanV = Math.tan(SW.cam.fov * Math.PI / 360);
const fitT = 1.14 * Math.max(halfV / tanV,
SW.viewX / 2 / (tanV * Math.max(1.2, SW.cam.aspect)));
if (!isFinite(SW.fit) || !isFinite(SW.look)) { SW.fit = fitT; SW.look = lookT; }
const EASE = typeof FROZEN !== 'undefined' && FROZEN
? 1.0
: 0.055;
SW.fit += (fitT - SW.fit) * EASE;
SW.look += (lookT - SW.look) * EASE;
const look = SW.look;
const d = SW.fit * SW.dist;
if (SW.panX === undefined) SW.panX = SW.shipX;
if (SW.panTo !== undefined) SW.panX += (SW.panTo - SW.panX) * EASE;
SW.cam.position.set(SW.panX + d * Math.cos(SW.lat) * Math.sin(SW.lon),
d * Math.sin(SW.lat) + look,
d * Math.cos(SW.lat) * Math.cos(SW.lon));
SW.cam.lookAt(SW.panX, look, 0);
if (SW.ground && SW.ground.material.uniforms.uRip)
SW.ground.material.uniforms.uRip.value =
SHIPS_SEA.rippleRange(SW.cam, SW.renderer ? SW.renderer.domElement.height : 900);
const hm = SW.ship.userData.hullMat;
if (hm) hm.uniforms.uCam.value.copy(SW.cam.position);
if (SW.layout) {
const el = document.getElementById('shipwright');
const w = el.clientWidth, h = el.clientHeight;
const v = new THREE.Vector3();
const cand = [];
SW.layout.forEach(e => {
v.set(e.x, SW.viewBot !== undefined ? SW.viewBot : 0, 0).project(SW.cam);
const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
const on = SW.spec && e.id === SW.spec.id;
const near = Math.abs(e.x - SW.panX);
const vis = v.z < 1 && sx > -40 && sx < w + 40 &&
near < (SW.fit || 200) * 4 * Math.max(1, SW.dist || 1);
cand.push({ e, sx, sy, on, near, vis });
});
cand.sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0) || a.near - b.near);
const taken = [];
cand.forEach(c => {
let show = c.vis;
if (show) {
for (const t of taken) {
if (Math.abs(t[0] - c.sx) < 96 && Math.abs(t[1] - c.sy) < 26) { show = false; break; }
}
}
if (show) {
taken.push([c.sx, c.sy]);
c.e.el.style.left = c.sx + 'px';
c.e.el.style.top = Math.min(h - 118, c.sy + 14) + 'px';
}
c.e.el.style.opacity = show ? (c.on ? '1' : '0.6') : '0';
c.e.el.classList.toggle('on', !!c.on);
});
}
{
const a = new THREE.Vector3(SW.panX, SW.look, 0).project(SW.cam);
const b = new THREE.Vector3(SW.panX + 100, SW.look, 0).project(SW.cam);
const el = document.getElementById('shipwright');
const pxPer100 = Math.abs(b.x - a.x) * 0.5 * el.clientWidth;
if (pxPer100 > 1) {
const targetPx = 190;
const rawM = targetPx / (pxPer100 / 100);
const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const m = steps.reduce((p, c) =>
Math.abs(Math.log(c / rawM)) < Math.abs(Math.log(p / rawM)) ? c : p, steps[0]);
const r = document.getElementById('swRuler');
r.querySelector('i').style.width = (m * pxPer100 / 100).toFixed(1) + 'px';
r.querySelector('b').textContent = m + (m === 1 ? ' metre' : ' metres');
}
}
swPumpDetail();
SW.renderer.render(SW.scene, SW.cam);
}
function rigLine(vessel) {
return (vessel.sub || '') + ' · ' +
((vessel.polar && vessel.polar.rig) ? vessel.polar.rig : 'no sail');
}
addEventListener('resize', swResize);
window.SHIPS_SW = { swOpen, swClose, swFrame, SW, rigLine, swSetFurled };