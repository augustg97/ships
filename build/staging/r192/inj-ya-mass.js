/* r192 mass injection — every iron member of the sekibune's yotsume thinned to
   0.8 of its section in local x and z under an unchanged record: volume ×0.64,
   so the integrated iron falls to ~78 kg against the record's 122. Expect
   exactly TWO convictions, both honest and both predicted: V-YMASS "a yotsume
   off the record's weight" 78/122, and V-YSHANK "a shank off its calipered
   stations" — a thinned shank really is off both stations by −20%. (The r191
   file's "exactly ONE" predates station auditing and is superseded — the same
   precedent by which r191 superseded the r187 drag file's comment.) Length is
   untouched, claw and ring counts stand, the assembly still seats — V-YLEN,
   V-YARMS, V-YRING, V-YREST, V-YCABLE all silent; 32 other hulls silent. */
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
