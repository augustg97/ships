/* prove round 115's ro rule fires, both arms: strip the style on the sekibune
   (oarsPerBank [20]) and square the panokseon's oars back to perpendicular sweeps */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && S.oarStyle === 'ro') {
      const seki = S.oarsPerBank && S.oarsPerBank[0] === 20;
      g.traverse(o => {
        const d = o.userData && o.userData.oar;
        if (!d) return;
        if (seki) d.style = 'sweep';
        else o.quaternion.identity();
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
