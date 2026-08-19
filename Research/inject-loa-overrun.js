/* Injection: stretch every planking mesh 6% in x after build — the regression the
   round-129 arm exists to hold: the rake clamp silently gone, the drawn hull outrunning
   the record's LENGTH OVERALL. Must convict every hull whose stretched span passes
   loa + max(0.25, 0.002·loa) as 'drawn length beyond record loa'; the deep under-length
   hulls (wyoming at −18.8 m has 8.4 m of slack against a 7.3 m stretch) must NOT. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    const tagOf = o => { for (let e = o; e; e = e.parent)
      if (e.userData && e.userData.part) return e.userData.part; return null; };
    g.traverse(o => {
      if (o.isMesh && o.geometry && o.geometry.attributes &&
          o.geometry.attributes.position && tagOf(o) && tagOf(o).key === 'planking') {
        const P = o.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) * 1.06);
        P.needsUpdate = true;
        o.geometry.computeBoundingBox();
        o.geometry.computeBoundingSphere();
      }
    });
    return g;
  };
})();
"wrapped";
