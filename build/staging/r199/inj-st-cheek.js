/* r199 cheek run — the pre-r199 drawn hooks rebuilt: every cheek segment and
   tip scaled and re-stationed along the run to the old 2.1 m hook length,
   record unchanged. Expect exactly ONE: V-WCHEEK "the cheek timbers off the
   record's run", ~2.10 m against the measured 1.49. V-STONE silent (the stone
   untouched); V-HOOKS silent (still two cones); V-REST silent (the run
   stretches nearly parallel to the deck and the low limbs do not move). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.stoneAnchor) {
      const K = 2.1 / 1.49;
      g.traverse(o => {
        if (o.isMesh && (o.name === 'st-cheek' || o.name === 'st-tip')) {
          o.scale.y *= K;
          o.position.y *= K;
        }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
