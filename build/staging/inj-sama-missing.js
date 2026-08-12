/* INJECTION — the r90 loophole class, both faces at once:
   1. the galleass's record declares loops — her gunDeck rides the apostis, whose path
      draws no sama, so 'loopholes declared but not drawn' must convict;
   2. the sekibune's drawn sama are lifted 2.0 m after build —
      'loopholes out of the bulwark band' must convict.
   ⚠ the moved meshes need updateMatrixWorld(true) — the r67 lesson: Box3 refreshes the
   mesh's own matrix but trusts the parent's. */
(() => {
  const g = (APP.vessels.vessels || APP.vessels).find(x => x.id === 'galleass');
  g.hull.gunDeck.loops = 8;
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, ...rest) {
    const grp = orig.call(this, H, ...rest);
    if (H && H.gunDeck && H.gunDeck.loops && !H.apostis) {
      grp.traverse(o => {
        const t = o.userData && o.userData.part;
        if (t && t.key === 'sama') o.position.y += 2.0;
      });
      grp.updateMatrixWorld(true);
    }
    return grp;
  };
})();
