/* r190 mass — one anchor's members thinned to 0.8 of their solved sections:
   x and z of every iron mesh in the FIRST assembly (the sheet), lengths and
   positions untouched, under a faithful record. Expect exactly one conviction,
   V-MASS "an anchor off the record's weight" reading ~0.64× the sheet's
   295 kg (~189 kg — volume scales with the world determinant, 0.8² = 0.64).
   V-LEN must stay silent (no y touched: crown, shank and ring axis extents
   stand), V-SWEEP silent (each tip apex sits on its cone's own y axis, which
   x/z scaling cannot move), V-COUNT/V-CLAWS silent (nothing removed), V-REST
   silent (thinner members raise the box floor ~1.6 cm, far inside the band). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.ironAnchors) {
      let firstGrp = null;
      g.traverse(o => {
        if (!firstGrp && o.isGroup && o.name === 'ia-grp') firstGrp = o;
      });
      if (firstGrp) firstGrp.traverse(o => {
        if (o.isMesh) { o.scale.x *= 0.8; o.scale.z *= 0.8; }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
