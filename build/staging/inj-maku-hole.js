/* prove round 119's maku rays convict a HOLE: the port-side cloth strip alone
   is removed after the build — the hem valance stays, so a rule that took the
   scallops for the cloth would pass this and be refuted. The band rays must
   convict ('yagura band bare where its cloth should hang'), port side only. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    const gone = [];
    const c = new THREE.Vector3();
    g.traverse(o => {
      const p = o.userData && o.userData.part;
      if (o.isMesh && p && p.key === 'maku' && p.name === 'Maku') {
        new THREE.Box3().setFromObject(o).getCenter(c);
        if (c.z < 0) gone.push(o);
      }
    });
    for (const o of gone) o.parent.remove(o);
    g.updateMatrixWorld(true);
    return g;
  };
})();
