/* r195 station — r194's proof re-run on the new 3.92 m shank: the stone slid
   to the r186 crown station, frac 0.28125 (slide (0.55−0.28125)·(2.0/0.51) =
   1.054 m). Expect exactly ONE conviction: V-WSTATION reading 0.28 — the
   tips-centroid re-anchoring preserves r194's rule to the digit. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-stone')
          o.position.y -= (0.55 - 0.28125) * (2.0 / 0.51);
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
