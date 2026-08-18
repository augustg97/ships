/* Injection: push every terrace-stair tread 1.2 m outboard after build — the round-100
   rail fault in stair form, treads hanging past the shell. The stair rule's half-breadth
   check must fire. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    g.traverse(o => {
      if (!o.userData.part || o.userData.part.key !== 'stair') return;
      for (const c of o.children) c.position.z += Math.sign(c.position.z || 1) * 1.2;
    });
    g.updateMatrixWorld(true);
    return g;
  };
})();
"wrapped";
