/* r201 shank — the shank stretched ×1.25 about its own centre under the new
   stone: drawn 3.25 → 4.07 m while 1.66/0.51 puts 3.25. Expect exactly ONE:
   'a shank off its stone's proportion', shank 4.07 m drawn, the figure's
   stone/shank 0.51 puts 3.25 m on this stone. V-WSTATION silent (the scaled
   ends put the foot at −3.662, stone frac 0.54, inside 0.55±0.12);
   V-WSTOCK silent (highest non-rope member centre frac 0.35 < 0.75);
   V-REST silent (the foot extends along the deck-pitched axis). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-shank') o.scale.y *= 1.25;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
