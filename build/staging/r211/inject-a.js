/* r211 inject-a: SEVER THE BUILDER — every lower-mast top back to the pre-r211 bare round
   disc: the platform (the child with the most triangles) replaced by the old 14-sided
   cylinder, and any bulwark ring removed. Expect: the ROUND arm's wall check convicts every
   pre-1710 square-rigger (cog, carrack, slave-ship, sekibune, fluyt, east-indiaman) and the
   SQUARE-BACKED arm's form check convicts every post-1710 one (ship-of-the-line, clipper,
   steamer, preussen, endurance) — 11 hulls, no others. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    const g = orig.call(this, hull, opts);
    g.traverse(o => {
      const p = o.userData && o.userData.part;
      if (!p || p.key !== 'top' || p.name === 'Crosstrees') return;
      const kids = o.children.filter(m => m.isMesh);
      if (!kids.length) return;
      const tri = m => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count);
      const plat = kids.reduce((a, b) => (tri(b) > tri(a) ? b : a));
      plat.geometry.computeBoundingBox();
      const r = -plat.geometry.boundingBox.min.x;      // forward extent = the radius
      /* remove every extruded child that is not the platform (the bulwark ring) */
      kids.forEach(m => { if (m !== plat && m.geometry.type === 'ExtrudeGeometry') o.remove(m); });
      plat.geometry = new THREE.CylinderGeometry(r, r * 0.92, r * 0.09, 14);
      plat.rotation.set(0, 0, 0); plat.position.set(0, 0, 0); plat.updateMatrix();
    });
    g.updateMatrixWorld(true);
    return g;
  };
}
