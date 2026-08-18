/* Injection: shift every rail vertex 1.2 m INBOARD after build — the stale-formula
   fault direction (flare the rail never followed). The rule must fire fleet-wide. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    g.traverse(o => {
      if (!o.isMesh || !o.userData.part || o.userData.part.key !== 'rail') return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        pos.setZ(i, z - Math.sign(z) * 1.2);
      }
      pos.needsUpdate = true;
    });
    return g;
  };
})();
"wrapped";
