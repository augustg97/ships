/* Injection: hoist every piece of stowed gear well above the rim — a paddle floating
   over the rail. The containment arm must convict BOTH open hulls, so the lift scales
   with the hull's own freeboard (a fixed 2 m clears the dugout's 0.34 m rim but not
   necessarily the canoe's sheer). r67: a moved group needs updateMatrixWorld(true). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    g.traverse(o => {
      if (o.userData.part && o.userData.part.key === 'stowage')
        o.position.y += (S.freeboard || 1) * 3 + 1;
    });
    g.updateMatrixWorld(true);
    return g;
  };
})();
"wrapped";
