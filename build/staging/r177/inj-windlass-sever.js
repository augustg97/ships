/* r177 sever — the corbita drawn faithfully, then her record deleted (meshes with a
   silent record): expect V-WARRANT alone, on the corbita alone. Every other hull —
   the cog's, junk's, treasure's and panokseon's faithful machines among them —
   silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  const vs = APP.vessels.vessels || APP.vessels;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const v = vs.find(x => x.hull === H);
    if (v && v.id === 'corbita') delete H.windlass;   // drawn, record now silent
    return g;
  };
})();
