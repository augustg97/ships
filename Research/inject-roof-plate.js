/* Injection proof for 'house roofs ignore the recorded covering': put the walkable tier
   roofs back on the MeshStandard plate — the exact pre-r108 appearance. Must fire once,
   on the one recorded laid covering with a house (azzam). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    const tagOf = o => { for (let e = o; e; e = e.parent)
      if (e.userData && e.userData.part) return e.userData.part; return null; };
    g.traverse(o => {
      const p = o.isMesh && tagOf(o);
      if (p && p.key === 'superstructure' && o.material.isShaderMaterial
          && o.geometry && o.geometry.type === 'ShapeGeometry')
        o.material = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60,
                                                      side: THREE.DoubleSide });
    });
    return g;
  };
})();
"wrapped";
