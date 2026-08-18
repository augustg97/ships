/* prove round 118's port-count arm: one oar-deck port removed after the build
   leaves 31 drawn against a record of 16 a side — the count rule must convict
   ('oar-deck ports off their record'). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    let gone = null;
    g.traverse(o => { const p = o.userData && o.userData.part;
      if (!gone && p && p.name === 'Oar-deck port') gone = o; });
    if (gone) gone.parent.remove(gone);
    g.updateMatrixWorld(true);
    return g;
  };
})();
