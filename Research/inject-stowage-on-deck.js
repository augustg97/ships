/* Injection: put a stowage-tagged crate on every DECKED hull — the gate-widening
   direction. Floor stowage exists because an open hull shows her floor; below a laid
   deck it would be invisible, so a stowage part on a decked hull means the gate
   widened wrongly. Must convict every hull except the two undecked ones. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    if (S.deckLaid !== false) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x888888 }));
      m.position.y = (S.freeboard || 1) + 0.5;
      m.userData.part = { key: 'stowage', stage: 7, name: 'Injected crate', what: '' };
      g.add(m);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
