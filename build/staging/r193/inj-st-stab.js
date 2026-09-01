/* r193 stab — the junk's stone anchor lowered 0.50 m through its planking.
   Expect exactly ONE conviction: 'an anchor through the planking', 0.54 m (the
   probe-measured clean seat −0.038 minus the injected 0.50), at u 0.03. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.stoneAnchor) {
      g.traverse(o => {
        if (o.userData && o.userData.part && o.userData.part.key === 'stoneAnchor')
          o.position.y -= 0.50;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
