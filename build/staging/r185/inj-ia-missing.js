/* r185 missing — one stern-pair assembly removed under an unchanged record
   (its cable and coil left behind): expect exactly two convictions, V-COUNT
   (4 head rings against the record's drawn set of 5) and V-CLAWS (16 claw
   points for 5 anchors). V-CABLE stays silent (5 cables remain) and V-SHANK
   stays silent (the four survivors match the sorted record lengths). */
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
      if (aft) { aft.removeFromParent(); g.updateMatrixWorld(true); }
    }
    return g;
  };
})();
