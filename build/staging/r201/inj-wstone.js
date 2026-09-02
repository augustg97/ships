/* r201 stone — the pre-r201 drawn length redrawn under the new record: the
   wa-stone stretched along its own length axis back to the old 2.0 m while
   the record says 명량21-17's 1.66, lifted +0.20 local (toward the head along
   the shank) so the stretched ends cannot argue with the rest floor — the
   r199 stone-injection shape. Expect exactly ONE: 'the stone off the
   record's length', stone 2.00 m through the stow transform, record says
   1.66. V-WSTATION silent (station 0.55 → 0.61, inside ±0.12); V-REST
   silent; every other hull untouched. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => {
        if (o.isMesh && o.name === 'wa-stone') {
          o.scale.x *= 2.0 / 1.66;
          o.position.y += 0.20;
        }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
