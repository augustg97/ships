/* Injection: lift every terrace-stair tread 0.5 m after build — a flight whose top hangs
   over the deck above and whose feet float over the deck below. The stair rule must fire
   on both ends, on every hull that carries stairs. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    g.traverse(o => {
      if (!o.userData.part || o.userData.part.key !== 'stair') return;
      for (const c of o.children) c.position.y += 0.5;
    });
    g.updateMatrixWorld(true);
    return g;
  };
})();
"wrapped";
