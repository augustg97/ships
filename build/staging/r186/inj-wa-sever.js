/* r186 sever — the panokseon drawn WITHOUT her hook-arms under an unchanged
   record: the builder keeps shank, crossbar, stone, bands and cable, and strips
   every wa-arm and wa-tip. Expect exactly one conviction, V-ARMS "a wooden anchor
   off its arm count — 0 hook points drawn, the record hangs 4"; V-STONE, V-CROSS,
   V-REST and V-CABLE all silent (their members still stand); 32 hulls silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      const kill = [];
      g.traverse(o => {
        if (o.isMesh && (o.name === 'wa-arm' || o.name === 'wa-tip')) kill.push(o); });
      for (const o of kill) o.parent.remove(o);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
