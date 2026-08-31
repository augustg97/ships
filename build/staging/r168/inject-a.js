/* r168 inject-a: SEVER THE BUILDER — every sweep blade back to the pre-r168 crate,
   a BoxGeometry of constant section centred at 0.90·outb whose corner stands at
   1.049·outb. The loom is left as built; the sever is the blade law, which is the
   round's class. Expect: REACH and FORM convict exactly {trireme, galley, galleass}. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    const g = orig.call(this, hull, opts);
    if (hull.oarBanks && hull.oarStyle !== 'ro') {
      const B = hull.beam, oarLen = hull.oarLen || 4.2, outb = 0.74 * oarLen;
      g.traverse(o => {
        const d = o.userData && o.userData.oar;
        if (!d || d.style === 'ro') return;
        o.children.forEach(m => {
          if (m.isMesh && m.geometry.type !== 'CylinderGeometry') {
            m.geometry = new THREE.BoxGeometry(B * 0.008, B * 0.075, oarLen * 0.22);
            m.position.z = outb * 0.90;
            m.updateMatrix();
          }
        });
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
}
