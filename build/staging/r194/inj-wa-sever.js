/* r194 sever — the four carved points stripped under a faithful record. Expect
   exactly ONE conviction: V-ARMS '0 hook points drawn — the record hangs 4'. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      const kill = [];
      g.traverse(o => { if (o.isMesh && o.name === 'wa-tip') kill.push(o); });
      kill.forEach(o => o.removeFromParent());
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
