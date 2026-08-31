/* r173 sever — the builder that ignores the windlass record: strips the faithful
   machine on the cog and stands a barrel ON END there (a capstan wearing the wrong
   name, wrong length, no standards), and draws the same wrong machine on three hulls
   whose records are silent (junk, trireme, dhow). Expect: cog convicts V-AXIS +
   V-SPAN(record) + V-STANDARD both ends; junk/trireme/dhow convict V-WARRANT alone;
   all other hulls silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const hit = H.windlass || ['junk', 'trireme', 'dhow'].some(id =>
      (APP.vessels.vessels || APP.vessels).some(v =>
        v.hull === H && v.id === id));
    if (!hit) return g;
    const dead = [];
    g.traverse(o => { if (o.userData && o.userData.part &&
                          o.userData.part.key === 'windlass') dead.push(o); });
    let x = (0.82 - 0.5) * H.lwl, yDeck = null;
    for (const o of dead) if (o.isGroup) {
      x = o.position.x;
      let lo = 1e9;
      o.traverse(m => { if (m.isMesh && m.name === 'win-standard') {
        lo = Math.min(lo, m.position.y - m.geometry.parameters.height / 2); } });
      if (lo < 1e8) yDeck = lo;
      o.parent.remove(o);
    }
    if (yDeck === null) yDeck = H.freeboard != null ? H.freeboard : 2.0;
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 });
    const wg = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.0, 12), mat);
    bar.name = 'win-barrel';                       // vertical: no rotation at all
    bar.position.y = yDeck + 1.5; wg.add(bar);
    wg.position.x = x;
    wg.userData.part = { key: 'windlass', stage: 3, name: 'Windlass', what: '' };
    g.add(wg);
    return g;
  };
})();
