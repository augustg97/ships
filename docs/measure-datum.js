(function measureDatum() {
const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
const rows = [];
const tagOf = o => { for (let e = o; e; e = e.parent)
if (e.userData && e.userData.part) return e.userData.part;
return null; };
for (const v of list) {
if (!v.hull) continue;
let g = null;
try { g = SHIPS_HULL.buildShip(v.hull, { fine: true }); }
catch (e) { rows.push({ id: v.id, err: 'BUILD THREW ' + e.message }); continue; }
g.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(g);
let deepY = 1e9, deepPart = null, skinMin = 1e9;
g.traverse(o => {
if (!o.isMesh) return;
const b = new THREE.Box3().setFromObject(o);
const p = tagOf(o);
const key = p ? (p.key || p) : '(untagged)';
if (b.min.y < deepY) { deepY = b.min.y; deepPart = key; }
if (key === 'planking' && b.min.y < skinMin) skinMin = b.min.y;
});
rows.push({
id: v.id,
draught: v.hull.draught,
keelBottom: +bb.min.y.toFixed(3),
waterErr: +(bb.min.y + v.hull.draught).toFixed(3),
skinMinY: skinMin < 1e9 ? +skinMin.toFixed(3) : null,
skinErr: skinMin < 1e9 ? +(skinMin + v.hull.draught).toFixed(3) : null,
deepestPart: deepPart,
});
}
return { rows };
})();