/* prove round 116's gun rules fire, the IGNORED-FIELD arms: restyle the chasers
   (a builder that ignores sternGuns draws none) and remove every fortress mesh
   (a builder that ignores bowFortress leaves the record with no deck). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && (S.sternGuns || S.bowFortress)) {
      const doomed = [];
      g.traverse(o => {
        const d = o.userData && o.userData.gun;
        if (d && d.style === 'chaser') d.style = 'stripped';
        const p = (() => { for (let e = o; e; e = e.parent)
                             if (e.userData && e.userData.part) return e.userData.part;
                           return null; })();
        if (o.isMesh && p && p.key === 'fortress') doomed.push(o);
      });
      for (const m of doomed) m.parent.remove(m);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
