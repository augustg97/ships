/* r199 stone — the r183 class-default bar redrawn: the stone stretched along
   its own length axis to the old 1.6 m under the unchanged 1.09 record, and
   lifted 0.20 m so the stretched end cannot argue with the rest floor —
   this injection isolates the length rule. Expect exactly ONE: V-STONE
   "the stone off the record's length", 1.60 m against 1.09 — the retained
   rule proven to convict on the new record's number through the rolled stow.
   V-WCHEEK silent (cheeks untouched); V-REST silent (the assembly's low
   limbs unmoved). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.stoneAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'st-stone') {
          o.scale.x *= 1.6 / 1.09;
          o.position.y += 0.20;
        }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
