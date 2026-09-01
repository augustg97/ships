/* r186 drag — the panokseon's drawn stone stretched 1.30× along its long axis
   under an unchanged record (drawn 2.60 m, record says 2.0): expect exactly one
   conviction, V-STONE "the stone off the record's length" reading 2.60 — the
   geometry-through-scale measurement must see the stretch THROUGH the 45° roll
   and yaw that defeat a world AABB. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => { if (o.isMesh && o.name === 'wa-stone') o.scale.z = 1.30; });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
