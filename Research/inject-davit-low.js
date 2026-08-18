/* Injection: drop every Quarter boat to the waterline — falls run away, the boat
   swamps. Must fire 'davit boat in the water' on both boats of the one davitBoats
   record (endurance). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    g.traverse(o => {
      if (o.isMesh && o.userData.part && o.userData.part.name === 'Quarter boat')
        o.position.y -= 2.8;
    });
    g.updateMatrixWorld(true);   // r67: Box3 trusts the parent's matrix
    return g;
  };
})();
"wrapped";
