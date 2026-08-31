/* prove round 170's valance rule fires, the SEVERED-BUILDER arm: the builder put back
   to the r119 drawing — the valance meshes stripped from the built group and the old
   foot-hung spaced half-disc row restored, 26 a side on 0.7 m bays, floated +0.01 m
   proud at the hem line. Expect conviction EXACTLY on the maku hull(s): V-HEAD (hung
   off the hem, not the head) and V-COUNTER (below the band's mid-height); every other
   hull silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (!(S && S.gunDeck && S.gunDeck.maku)) return g;
    const dead = [];
    g.traverse(o => { const p = o.userData && o.userData.part;
      if (o.isMesh && p && p.key === 'maku' && p.name !== 'Maku') dead.push(o); });
    if (!dead.length) return g;
    const parent = dead[0].parent;
    dead.forEach(o => o.parent.remove(o));
    const H = S, GD = S.gunDeck, B = S.beam, L = S.loa;
    const HS = SHIPS_HULL.hullSurface(H);
    const over = GD.over !== undefined ? GD.over : B * 0.045;
    const lipIn = B * 0.010, tuck = 0.10, clear = 0.15;
    const hemMat = new THREE.MeshStandardMaterial({ color: 0x252a38, roughness: 0.94,
                                                    side: THREE.DoubleSide });
    const bays = Math.max(4, Math.round((GD.to - GD.from) * L / 0.7));
    for (const sgn of [-1, 1]) for (let j = 0; j < bays; j++) {
      const u = GD.from + (GD.to - GD.from) * ((j + 0.5) / bays);
      const p = SHIPS_HULL.surfacePoint(H, HS, u, 1.0);
      const hw = Math.abs(p[2]) + over;
      const sc = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10, Math.PI, Math.PI),
                                hemMat);
      sc.position.set(p[0], p[1] + clear, sgn * (hw - lipIn - tuck + 0.01));
      sc.userData.part = { key: 'maku', stage: 5, name: 'Maku hem', what: '' };
      parent.add(sc);
    }
    g.updateMatrixWorld(true);
    return g;
  };
})();
