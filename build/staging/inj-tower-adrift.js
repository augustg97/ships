/* INJECTION — the r89 upper-deck class, both faces at once:
   1. the panokseon's drawn tower is lifted 1.0 m off the fighting deck after build —
      'tower floats above the deck' must convict (the r58 burial class, other sign);
   2. the galley's record grows a tower with no gunDeck under it —
      'tower without a deck' must convict from the data alone.
   ⚠ the moved group needs updateMatrixWorld(true) — the r67 lesson: Box3 refreshes the
   mesh's own matrix but trusts the parent's. */
(() => {
  const g = (APP.vessels.vessels || APP.vessels).find(x => x.id === 'galley');
  g.hull.tower = { at: 0.5, w: 3.0, h: 2.5 };
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, ...rest) {
    const grp = orig.call(this, H, ...rest);
    if (H && H.tower && H.gunDeck) {
      grp.traverse(o => {
        const t = o.userData && (o.userData.part || o.userData.tag);
        if (t && (t.key === 'tower' || t === 'tower')) o.position.y += 1.0;
      });
      grp.updateMatrixWorld(true);
    }
    return grp;
  };
})();
