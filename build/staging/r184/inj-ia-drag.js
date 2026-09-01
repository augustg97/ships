/* r184 drag — one drawn shank stretched 1.30× along its axis under an unchanged
   record (sheet 2.4 m drawn as ~3.1): expect exactly one conviction, V-SHANK
   "a shank off the record's length"; the structural measurement must read the
   stretch through the group's stow transform. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  const vs = APP.vessels.vessels || APP.vessels;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const v = vs.find(x => x.hull === H);
    if (v && v.id === 'treasure-ship') {
      let done = false;
      g.traverse(o => {
        if (!done && o.isMesh && o.name === 'ia-shank') { o.scale.y = 1.30; done = true; }
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
