/* r172 sever — the builder that ignores the capstan record: strips whatever the
   faithful builder drew and restores the pre-r172 assembly (8 parallel-box whelps
   floating clear, no pawls, bars at 0.132·B) on every timber decked hull, exactly
   the old `timberShip && laidDeck` inference. Expect: the 8 record-less hulls
   convict V-WARRANT; the 11 record hulls convict REACH+FLARE+PAWL+COUNT, plus
   STATURE where 0.1438·B tops 1.8 m (the 74, wyoming). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const timber = !(H.build === 'iron' || H.build === 'steel');
    const decked = H.deckLaid !== false &&
      !(H.deck && (H.deck.covering === 'steel' || H.deck.covering === 'bare'));
    // find and remove the faithful capstan
    const dead = [];
    g.traverse(o => { if (o.userData && o.userData.part &&
                          o.userData.part.key === 'capstan') dead.push(o); });
    let yDeck = 0, xCap = null;
    for (const o of dead) {
      if (o.isGroup) {
        xCap = o.position.x;
        let lo = 1e9;
        o.traverse(m => { if (m.isMesh && Math.abs(m.rotation.z) < 0.1) {
          const a = m.geometry.attributes.position;
          for (let i = 0; i < a.count; i++) lo = Math.min(lo, m.position.y + a.getY(i));
        } });
        if (lo < 1e8) yDeck = lo;
        o.parent.remove(o);
      }
    }
    if (!(timber && decked) && !dead.length) return g;
    // the pre-r172 assembly, verbatim proportions
    const B = H.beam, L = H.lwl, R = B * 0.062, y = yDeck;
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 });
    const cg = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.80, R, B * 0.115, 16), mat);
    barrel.position.y = y + B * 0.058; cg.add(barrel);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const w = new THREE.Mesh(new THREE.BoxGeometry(B * 0.014, B * 0.100, B * 0.030), mat);
      w.position.set(Math.cos(a) * R * 0.92, y + B * 0.056, Math.sin(a) * R * 0.92);
      w.rotation.y = -a; cg.add(w);
    }
    const head = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.16, R * 1.02, B * 0.038, 16), mat);
    head.position.y = y + B * 0.132; cg.add(head);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.009, B * 0.012, B * 0.34, 10), mat);
      bar.rotation.z = Math.PI / 2; bar.rotation.y = a;
      bar.position.set(Math.cos(a) * B * 0.17, y + B * 0.132, Math.sin(a) * B * 0.17);
      cg.add(bar);
    }
    cg.position.x = xCap !== null ? xCap : 0.12 * L;
    cg.userData.part = { key: 'capstan', stage: 3, name: 'Capstan', what: '' };
    g.add(cg);
    g.updateMatrixWorld(true);
    return g;
  };
})();
