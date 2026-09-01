/* r193 float — the dhow's grapnel assembly raised 0.50 m off its stow. Expect
   exactly ONE conviction: 'an anchor floating over its own deck', 0.59 m (the
   probe-measured clean seat +0.089 plus the injected 0.50), at u 0.15. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.grapnel) {
      g.traverse(o => {
        if (o.userData && o.userData.part && o.userData.part.key === 'grapnel')
          o.position.y += 0.50;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
