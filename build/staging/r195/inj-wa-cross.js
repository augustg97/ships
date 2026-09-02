/* r195 cross — the pre-r195 crossbar rebuilt at its modern station: a 1.6 m
   cylinder athwart the shank at y −0.28 below the head, named wa-cross, added
   to the anchor's inner frame so the stow transforms carry it. Expect exactly
   ONE conviction: V-WSTOCK "a stock above the stone" at ~0.93 above the foot. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      let shank = null;
      g.traverse(o => { if (o.isMesh && o.name === 'wa-shank') shank = o; });
      if (shank) {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 1.6, 10), shank.material);
        bar.name = 'wa-cross';
        bar.rotation.x = Math.PI / 2;
        bar.position.y = -0.28;
        shank.parent.add(bar);
      }
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
