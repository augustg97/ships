/* prove round 116's gun rules fire, the MIS-LAID arms: turn every stern chaser
   180° (fires forward) and every fortress bow piece 180° (fires aft/inboard).
   Geometric flips, not datum edits — the audit must catch the pose itself. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && (S.sternGuns || S.bowFortress)) {
      g.traverse(o => {
        const d = o.userData && o.userData.gun;
        if (!d) return;
        if (d.style === 'chaser' || d.style === 'fortress') o.rotation.y += Math.PI;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
