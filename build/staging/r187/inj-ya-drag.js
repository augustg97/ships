/* r187 drag — the sekibune's drawn shank stretched 1.35x along its own axis
   under an unchanged record: expect exactly one conviction, V-YLEN "a yotsume
   off the record's length" reading ~2.30 m against the record's 2.0 — the
   geometry-through-matrix measurement must see the stretch THROUGH the 45° roll
   and yaw that defeat a world AABB. The stretch is fore-aft along the lying
   shank, so V-YREST stays silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.yotsumeAnchor) {
      g.traverse(o => { if (o.isMesh && o.name === 'ya-shank') o.scale.y = 1.35; });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
