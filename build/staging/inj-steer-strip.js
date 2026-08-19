/* prove round 121's rules convict a STRIP: the fluyt's rudder, wales and posts are
   removed after the build. Three convictions on the fluyt alone: 'declared steering
   not drawn' (steering: stern, no rudder mesh), 'an assembled ship lost her
   stempost' and 'an assembled ship lost her wale'. Every other hull stays clean. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && S.lwl === 27.5) {
      const gone = [];
      g.traverse(o => { const p = o.userData && o.userData.part;
        if (p && (p.key === 'rudder' || p.key === 'wale' || p.key === 'stempost'))
          gone.push(o); });
      for (const o of gone) o.parent.remove(o);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
