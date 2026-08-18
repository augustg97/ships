/* prove round 117's walled-cabin rule sees a single missing panel, the r91 lesson
   indoors: remove the AFT end wall alone. Rays from the astern bearings then enter
   the hole and first-strike the FAR wall, well past the box face — which is exactly
   the depth test the rule adds over the r91 ring. Wall meshes are found by shape:
   thin fore-and-aft, centred on the ship's axis, standing on the cabin sole (which
   excludes the gable boards, whose feet are at the eaves, and sorting aft-first
   excludes the doorway plate on the forward face). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && S.tower && S.tower.walls) {
      g.updateMatrixWorld(true);
      const tm = [];
      g.traverse(o => {
        let p = null;
        for (let e = o; e; e = e.parent)
          if (e.userData && e.userData.part) { p = e.userData.part; break; }
        if (o.isMesh && p && p.key === 'tower') tm.push(o);
      });
      const tb = new THREE.Box3();
      for (const m of tm) tb.expandByObject(m);
      const walls = [];
      for (const m of tm) {
        const b = new THREE.Box3().setFromObject(m);
        if (b.max.x - b.min.x < 0.12 && Math.abs((b.max.z + b.min.z) / 2) < 0.2
            && b.max.y - b.min.y > 0.5 && b.min.y < tb.min.y + 0.3)
          walls.push([m, (b.max.x + b.min.x) / 2]);
      }
      walls.sort((a, b) => b[1] - a[1]);
      if (walls.length) { const m = walls[0][0]; m.parent.remove(m); g.updateMatrixWorld(true); }
    }
    return g;
  };
})();
