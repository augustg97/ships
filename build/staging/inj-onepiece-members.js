/* prove round 122's extension of the one-piece rule convicts a STRIP of the new
   members: the fluyt's keel and frames are removed after the build. Expect exactly
   'an assembled ship lost her keel' and 'an assembled ship lost her frames' on the
   fluyt, and every other hull clean. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && S.lwl === 27.5) {
      const gone = [];
      g.traverse(o => { const p = o.userData && o.userData.part;
        if (p && (p.key === 'keel' || p.key === 'frames')) gone.push(o); });
      for (const o of gone) o.parent.remove(o);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
