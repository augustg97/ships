/* r194 station — the stone slid back to the pre-r194 crown station (0.9 m above
   the foot on a 3.2 m shank, frac 0.28 — the r186 inference made flesh). Expect
   exactly ONE conviction: 'the stone off its shank station', 0.28. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-stone') o.position.y -= (0.55 - 0.28125) * 3.2;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
