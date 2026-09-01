/* r183 drag — the junk's drawn stone stretched 1.35× along the bar under an
   unchanged record (drawn 2.16 m, record says 1.6): expect exactly one
   conviction, V-STONE "the stone off the record's length"; the structural
   measurement must read the stretch through the group's stow transform. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  const vs = APP.vessels.vessels || APP.vessels;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const v = vs.find(x => x.hull === H);
    if (v && v.id === 'junk') {
      g.traverse(o => { if (o.isMesh && o.name === 'st-stone') o.scale.y = 1.35; });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
