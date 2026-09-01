/* r185 float — the aftmost iron-anchor assembly (a stern-pair member on the poop
   top) raised 0.60 m off its surface under an unchanged record: expect exactly one
   conviction, the surface-asked V-REST "an anchor floating over the surface under
   it" — the ray must find the roof, not the sheer line, under a poop-stowed
   anchor. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  const vs = APP.vessels.vessels || APP.vessels;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const v = vs.find(x => x.hull === H);
    if (v && v.id === 'treasure-ship') {
      let aft = null;
      g.traverse(o => {
        if (o.isGroup && o.name === 'ia-grp' &&
            (!aft || o.position.x > aft.position.x)) aft = o;
      });
      if (aft) { aft.position.y += 0.60; g.updateMatrixWorld(true); }
    }
    return g;
  };
})();
