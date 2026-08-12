/* INJECTION — the r91 wall-ring class, both faces at once:
   1. the panokseon's End bulwark panels are removed after build — the fighting deck
      becomes the open corridor r89 found by eye, and 'you can see through the gun-deck
      wall' must convict on the near-axis bearings;
   2. the sekibune loses her wall entirely — every Bulwark / End bulwark mesh removed —
      and 'gun deck without a wall' must convict.
   Meshes are removed from the graph, which is what "not drawn" IS to a raycaster. */
(() => {
  const fleet = APP.vessels.vessels || APP.vessels;
  const pkH = fleet.find(x => x.id === 'panokseon').hull;
  const skH = fleet.find(x => x.id === 'sekibune').hull;
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, ...rest) {
    const grp = orig.call(this, H, ...rest);
    if (H !== pkH && H !== skH) return grp;
    const doomed = [];
    grp.traverse(o => {
      const t = o.userData && o.userData.part;
      if (!o.isMesh || !t) return;
      if (H === pkH && t.name === 'End bulwark') doomed.push(o);
      if (H === skH && (t.name === 'Bulwark' || t.name === 'End bulwark')) doomed.push(o);
    });
    for (const o of doomed) o.removeFromParent();
    grp.updateMatrixWorld(true);
    return grp;
  };
})();
