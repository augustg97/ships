/* prove round 171's stern-light rule fires, the SEVERED-BUILDER arm: the builder put
   back to the pre-r171 drawing — the pierced sash frames and glass sheets stripped
   from the built group and the old three-slab window row restored: a solid pale slab
   per light, a glass slab 0.001·B PROUD of it, a mullion stick prouder still, windows
   at 64% of a B·0.095 pitch. Expect V-PIERCED ("a glazed tier with no aperture") on
   EXACTLY the three sternLights hulls — fluyt 1 tier, east-indiaman 2, 74 2 — every
   other hull silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (!(S && S.sternLights)) return g;
    const dead = [];
    g.traverse(o => { const p = o.userData && o.userData.part;
      if (o.isMesh && p && p.key === 'sternlight') dead.push(o); });
    if (!dead.length) return g;
    const parent = dead[0].parent;
    dead.forEach(o => o.parent.remove(o));
    const H = S, B = S.beam;
    const HS = SHIPS_HULL.hullSurface(H);
    const fb = HS.sheer(1.0);
    const xF = SHIPS_HULL.surfacePoint(H, HS, 1.0, 1.0)[0];
    const atH = zH => SHIPS_HULL.surfacePoint(H, HS, 1.0,
        0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
    const woodPale = new THREE.MeshStandardMaterial({ color: 0xcfc0a4, roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
    const rows = S.sternLights, rowZ = [];
    for (let r = 0; r < rows; r++)
      rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));
    const wh = fb * 0.16;
    for (const zc of rowZ) {
      const hw = Math.abs(atH(zc)[2]) * 0.84;
      const N = Math.max(3, Math.min(7, Math.round((2 * hw) / (B * 0.095))));
      const pitch = (2 * hw) / N, ww = pitch * 0.64;
      for (let i = 0; i < N; i++) {
        const zi = -hw + pitch * (i + 0.5);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(B * 0.012, wh, ww), woodPale);
        fr.position.set(xF + B * 0.006, zc, zi);
        fr.userData.part = { key: 'sternlight', stage: 3, name: 'Stern lights', what: '' };
        parent.add(fr);
        const gl = new THREE.Mesh(
          new THREE.BoxGeometry(B * 0.012, wh - B * 0.016, ww - B * 0.014), glass);
        gl.position.set(xF + B * 0.007, zc, zi);
        gl.userData.part = { key: 'sternlight', stage: 3, name: 'Stern lights', what: '' };
        parent.add(gl);
        const mu = new THREE.Mesh(
          new THREE.BoxGeometry(B * 0.013, wh - B * 0.016, B * 0.006), woodPale);
        mu.position.set(xF + B * 0.0075, zc, zi);
        mu.userData.part = { key: 'sternlight', stage: 3, name: 'Stern lights', what: '' };
        parent.add(mu);
      }
    }
    g.updateMatrixWorld(true);
    return g;
  };
})();
