/* r169 inject-a: SEVER THE BUILDER — the paddle floats back to the pre-r169 crate:
   24 boards of D·0.030 × D·0.115 × B·0.30 centred at 0.90·R, the housing left as
   built. Expect: COUNT ('24 floats on a wheel recorded with 30'), BOARD (dims double
   the record) and the COUNTER (a 2 m deep, 0.5 m thick board) convict exactly
   {great-eastern}; every other hull silent. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    const g = orig.call(this, hull, opts);
    if (hull.paddleFloats) {
      const D = hull.paddleDia, B = hull.beam, R = D / 2;
      g.traverse(o => {
        if (!(o.userData && o.userData.wheel)) return;
        const floats = o.children.filter(m => m.isMesh && m.name === 'Float');
        floats.forEach((m, i) => {
          if (i >= 24) { o.remove(m); return; }
          const a = i / 24 * Math.PI * 2;
          m.geometry = new THREE.BoxGeometry(D * 0.030, D * 0.115, B * 0.30);
          m.position.set(Math.cos(a + Math.PI / 2) * R * 0.90,
                         Math.sin(a + Math.PI / 2) * R * 0.90, 0);
          m.rotation.z = a;
          m.updateMatrix();
        });
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
}
