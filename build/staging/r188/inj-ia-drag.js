/* r188 drag — the treasure-ship's SHEET anchor shank stretched 1.35x along its
   own axis under an unchanged record: expect exactly one conviction, V-LEN
   "an anchor off the record's length" reading ~2.19 m against the record's
   1.86 — the geometry-through-matrix measurement must see the stretch THROUGH
   the 45° stow spin. The bowers and stern pair stay faithful, so the sorted
   comparison convicts index 0 alone. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.ironAnchors) {
      let n = 0;
      g.traverse(o => {
        if (o.isMesh && o.name === 'ia-shank' && n++ === 0) o.scale.y = 1.35;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
