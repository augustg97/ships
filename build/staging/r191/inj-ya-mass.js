/* r191 mass injection — every iron member of the sekibune's yotsume thinned to
   0.8 of its section in local x and z under an unchanged record: volume ×0.64,
   so the integrated iron falls to ~78 kg against the record's 122. Expect
   exactly ONE conviction, V-YMASS "a yotsume off the record's weight". Length
   is untouched (the shank's y is not scaled), the claw count and ring count
   stand, the assembly still seats — V-YLEN, V-YARMS, V-YRING, V-YREST, V-YCABLE
   all silent; 32 other hulls silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.yotsumeAnchor) {
      g.traverse(o => {
        if (o.isMesh && /^ya-(shank|ring|acring|arm|tip)$/.test(o.name)) {
          o.scale.x *= 0.8; o.scale.z *= 0.8;
        }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
