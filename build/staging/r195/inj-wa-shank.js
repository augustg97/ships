/* r195 shank — the pre-r195 drawn default made flesh: the shank scaled back to
   3.2 m on the 2.0 m stone (×0.8163 about its own centre). Expect exactly ONE
   conviction: V-WSHANK "a shank off its stone's proportion", 3.20 vs 3.92.
   V-WSTATION silent (frac 0.56, in band); V-WSTOCK silent (the seizing rises
   past the shortened head, but rope is exempt by name — this proves it). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-shank') o.scale.y *= 3.2 / (2.0 / 0.51);
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
