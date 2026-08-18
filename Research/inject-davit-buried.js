/* Injection: shift every Quarter boat 1.8 m INBOARD after build — the r58 burial
   direction, a boat standing inside its own ship's shell. Must fire on both boats
   of the one davitBoats record (endurance). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    g.traverse(o => {
      if (o.isMesh && o.userData.part && o.userData.part.name === 'Quarter boat')
        o.position.z -= Math.sign(o.position.z) * 1.8;
    });
    g.updateMatrixWorld(true);   // r67: Box3 trusts the parent's matrix
    return g;
  };
})();
"wrapped";
