/* r189 sweep — one anchor's four tip cones displaced radially 1.3× in their own
   claw planes under a faithful record: expect exactly one conviction, V-SWEEP
   "a claw sweep off the find's proportion" reading ~1.3× the Penglai 0.339
   proportion. V-CLAWS must stay silent (four cones still drawn), V-LEN must
   stay silent (crown, shank and ring untouched), V-REST must stay silent (the
   displaced tips are the up-turned ends, still clear of the planking). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.ironAnchors) {
      let firstGrp = null;
      g.traverse(o => {
        if (!firstGrp && o.isGroup && o.name === 'ia-grp') firstGrp = o;
      });
      if (firstGrp) {
        firstGrp.traverse(o => {
          if (o.isMesh && o.name === 'ia-tip') o.position.x *= 1.3;
        });
      }
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
