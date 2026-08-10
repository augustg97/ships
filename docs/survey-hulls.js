(function surveyHulls() {
const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
const rows = [];
for (const v of list) {
if (!v.hull) continue;
let g = null;
try { g = SHIPS_HULL.buildShip(v.hull, { fine: true }); } catch (e) { continue; }
g.updateMatrixWorld(true);
const tagOf = o => { for (let e = o; e; e = e.parent)
if (e.userData && e.userData.part) return e.userData.part; return null; };
const meshes = [];
g.traverse(o => {
if (!o.isMesh || !o.geometry) return;
const geo = o.geometry;
const tris = geo.index ? geo.index.count / 3
: (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
meshes.push({ o, tris, key: (tagOf(o) || {}).key || '?',
box: new THREE.Box3().setFromObject(o),
mat: o.material && o.material.uuid });
});
if (!meshes.length) continue;
const tris = meshes.reduce((a, m) => a + m.tris, 0);
const boxes = meshes.filter(m => m.tris <= 12).length;
const mats = new Set(meshes.map(m => m.mat)).size;
const pad = Math.max(0.25, v.hull.loa * 0.004);
let floating = [];
for (let i = 0; i < meshes.length; i++) {
const a = meshes[i].box.clone().expandByScalar(pad);
let touches = false;
for (let j = 0; j < meshes.length && !touches; j++)
if (j !== i && a.intersectsBox(meshes[j].box)) touches = true;
if (!touches) floating.push(meshes[i].key);
}
floating = [...new Set(floating)];
const byKey = {};
for (const m of meshes) {
const e = byKey[m.key] || (byKey[m.key] = { n: 0, boxy: 0, tris: 0 });
e.n++; e.tris += m.tris; if (m.tris <= 12) e.boxy++;
}
const boxyParts = Object.entries(byKey)
.filter(([, e]) => e.n >= 2 && e.boxy === e.n)
.map(([k, e]) => `${k}x${e.n}`);
rows.push({
id: v.id, loa: v.hull.loa,
tris: Math.round(tris),
trisPerM: +(tris / v.hull.loa).toFixed(0),
meshes: meshes.length, boxMeshes: boxes,
boxPct: +(100 * boxes / meshes.length).toFixed(0),
materials: mats,
floating, boxyParts,
});
}
rows.sort((a, b) => a.trisPerM - b.trisPerM);
return { crudestFirst: rows };
})()