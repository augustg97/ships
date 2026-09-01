/* r192 shank-prism — the boss taper removed: the three drawn shank pieces are
   replaced by ONE prism at the upper-bar station over the same total length.
   This is the pre-r192 failure class made flesh (a shank drawn without the
   record's root boss). Expect exactly TWO convictions, both predicted:
   V-YSHANK "a shank off its calipered stations" — the crown reads the upper
   bar's 4.3×6.1 cm against the root station's 9.8×15.3 — plus the honest
   V-YMASS second at ~69/122, because a shank without its boss really is
   missing that iron (the all-prism floor of the solvable band). V-YLEN silent:
   the total length is preserved. V-YREST silent: the claws still set the box. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.yotsumeAnchor) {
      const shks = [];
      g.traverse(o => { if (o.isMesh && o.name === 'ya-shank') shks.push(o); });
      if (shks.length) {
        /* the prism piece carries the upper-bar station exactly */
        const prism = shks.find(o => Math.abs(o.geometry.parameters.radiusTop
                        - o.geometry.parameters.radiusBottom) < 1e-9) || shks[0];
        const totalL = shks.reduce((s, o) => s + o.geometry.parameters.height, 0);
        const parent = prism.parent;
        const geo = new THREE.CylinderGeometry(
          prism.geometry.parameters.radiusTop,
          prism.geometry.parameters.radiusTop, totalL, 4);
        geo.rotateY(Math.PI / 4);
        const m = new THREE.Mesh(geo, prism.material);
        m.name = 'ya-shank';
        m.scale.x = prism.scale.x;
        m.position.y = totalL / 2;
        for (const o of shks) o.parent.remove(o);
        parent.add(m);
        g.updateMatrixWorld(true);
      }
    }
    return g;
  };
})();
