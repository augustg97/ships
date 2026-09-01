/* r188 sever — one anchor's four claw tips stripped under a faithful record:
   expect exactly one conviction, V-CLAWS "an iron anchor without its four
   claws" counting 16 points for 5 anchors. V-LEN must stay silent — the
   shank and ring are untouched. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.ironAnchors) {
      let firstGrp = null;
      g.traverse(o => {
        if (!firstGrp && o.isGroup && o.name === 'ia-grp') firstGrp = o;
      });
      if (firstGrp) {
        const dead = [];
        firstGrp.traverse(o => { if (o.isMesh && o.name === 'ia-tip') dead.push(o); });
        for (const o of dead) o.parent.remove(o);
      }
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
