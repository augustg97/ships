/* r197 section — the pre-r197 drawn section rebuilt: both arm timbers scaled
   in their own cross-axes to armD 0.12 (the old drawn default), lengths and
   axes kept. Expect exactly ONE: V-WARM "an arm timber off its record's
   section", 0.13 m against 진도-641's 0.22 at the builder's taper. The
   LENGTH form silent (timbers unscaled along their axes); V-WSPLAY silent
   (transformDirection normalizes scale); V-ARMS/V-WSTATION/V-WSTOCK/V-REST
   silent (counts, stations and the stone's floor all unmoved). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      const K = 0.12 / 0.196;
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-arm') { o.scale.x *= K; o.scale.z *= K; }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
