/* r192 drag — the sekibune's drawn shank stretched 1.35× along its own axis,
   crown-anchored (the shank is three pieces since r192: scale each and slide
   its centre up by the same factor, so the column stretches from the crown as
   one bar), under an unchanged record. Expect exactly TWO convictions, both
   predicted: V-YLEN "a yotsume off the record's length" ~2.26 m against 2.0 —
   the geometry-through-matrix measurement must see the stretch THROUGH the 45°
   roll and yaw that defeat a world AABB — plus the honest V-YMASS second at
   ~152/122, because a stretched shank truly carries the extra iron (the
   r190/r191 drag precedent). V-YSHANK must stay SILENT: the stretch does not
   touch a single section — the discrimination the new station rule exists to
   show. The stretch is fore-aft along the lying shank, so V-YREST is silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.yotsumeAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'ya-shank') {
          o.scale.y *= 1.35; o.position.y *= 1.35;
        }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
