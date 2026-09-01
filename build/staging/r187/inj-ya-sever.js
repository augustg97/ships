/* r187 sever — the sekibune drawn WITHOUT her claws under an unchanged record:
   the builder keeps shank, rings, cable and coil, and strips every ya-arm and
   ya-tip. Expect V-YARMS "0 fluke tips drawn — the name itself says four" with
   CERTAINTY; V-YREST may add an honest second at the 0.25 m threshold (the claws
   are what the assembly settles on — without them the rolled shank rides ~0.2 m
   proud), stated here so a second conviction is read as the rule seeing a true
   consequence, not noise. V-YRING, V-YLEN, V-YCABLE silent; 32 hulls silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.yotsumeAnchor) {
      const kill = [];
      g.traverse(o => {
        if (o.isMesh && (o.name === 'ya-arm' || o.name === 'ya-tip')) kill.push(o); });
      for (const o of kill) o.parent.remove(o);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
