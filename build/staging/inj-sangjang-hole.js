/* prove round 118's sangjang escape ring convicts a HOLE: the aft end wall alone
   is removed after the build, so the band stands complete except dead astern —
   the ring must convict ('oar deck open to a bearing'), first at bearing 0°,
   because this file's +x is aft. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    const gone = [];
    g.traverse(o => { const p = o.userData && o.userData.part;
      if (p && p.name === 'Oar-deck end wall, aft') gone.push(o); });
    for (const o of gone) o.parent.remove(o);
    g.updateMatrixWorld(true);
    return g;
  };
})();
