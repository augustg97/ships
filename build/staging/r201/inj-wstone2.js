/* r201 stone, corrected injection — the first (r199's lift shape) moved the
   stone 0.20 along the shank axis, which THIS stow lays horizontally toward
   the bow: the box centre slid to u 0.04 under the rising sheer and V-REST
   convicted the stretched corner 0.30 into the planking (audit-inj-wstone
   .json — the rest rule doing its job on injected geometry; the prediction
   missed it, stated in JUDGMENT). This one compensates along the stone's OWN
   length axis instead: the stretch's extra half-run 0.17 is shifted to the
   rising end, so the low corner keeps its settled depth. The shift is
   perpendicular to the shank axis, so V-WSTATION's projection is untouched.
   Expect exactly ONE: 'the stone off the record's length', stone 2.00 m
   through the stow transform, record says 1.66. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-stone') {
          o.scale.x *= 2.0 / 1.66;
          o.position.x -= (2.0 - 1.66) / 2;
        }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
