/* r183 sever — the junk drawn faithfully, then her stoneAnchor record deleted:
   meshes with a silent record. Expect exactly one conviction, V-WARRANT
   'an anchor the record does not carry' on the junk; 32 hulls silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  const vs = APP.vessels.vessels || APP.vessels;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const v = vs.find(x => x.hull === H);
    if (v && v.id === 'junk') delete H.stoneAnchor;
    return g;
  };
})();
