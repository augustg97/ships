/* ── THE FLEET SURVEY ─────────────────────────────────────────────────────────────────────
 * Paste into the console on any page of the app. Companion to audit-hulls.js: the audit asks
 * whether a ship is WRONG, this asks whether it is CRUDE. Neither question can be answered from
 * a picture — one viewpoint hides a detached part behind a hull, and no diff can tell a box
 * from a boat.
 *
 * What it measures, per vessel, and why each one is a real fault rather than a metric:
 *
 *   FLOATING PARTS. A part whose bounding box touches no other part's is attached to nothing.
 *     Sometimes correct (a flag on a halyard, a boat on davits), so this reports rather than
 *     fails — but a mast that touches no deck, or a funnel over open air, is a fault every time.
 *   BOXES. A mesh of twelve triangles is a cube. Counting them per ship is the most direct
 *     measure of "rudimentary" there is, and it ranks the fleet by where hand-work will pay.
 *   TRIANGLES PER METRE OF HULL. A 400 m container ship and a 9 m dugout cannot be compared on
 *     absolute counts; per metre they can, and the thin end of that list is the crude end.
 *   MATERIAL VARIETY. A hull drawn in one material is a hull with one surface. Real ships are
 *     painted iron above, fouled copper below, oiled timber, tarred rope, canvas — the count of
 *     distinct materials is a fair proxy for whether any of that is present.
 *   FLAT SHADING. A mesh with no vertex normals, or with every normal identical, is a facet.
 */
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

    /* a part is floating if no OTHER part's box comes within a hand's breadth of it */
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

    /* which part kinds are made ENTIRELY of boxes — those are the ones to rebuild */
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
