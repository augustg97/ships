/* Injection proof for 'open boom off its sail plan', short side: shorten every
   aftermost gaff/spanker boom to 60% along its length (cylinder length is LOCAL Y;
   the yard is quarter-turned, so local y maps to hull x). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    const masts = S.masts || [];
    const mk = masts[masts.length - 1];
    if (mk && (mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker))) {
      g.updateMatrixWorld(true);
      let aft = null;
      g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.name === 'Boom') {
        const b = new THREE.Box3().setFromObject(o);
        const cx = (b.min.x + b.max.x) / 2;
        if (!aft || cx > aft.cx) aft = { o, cx };
      } });
      if (aft) { aft.o.scale.y = 0.6; g.updateMatrixWorld(true); }
    }
    return g;
  };
})()
