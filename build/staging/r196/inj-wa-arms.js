/* r196 arms — the pre-r196 four-hook frame rebuilt: a second pair of timbers
   and tips added in the perpendicular plane at the mirrored station, drawn at
   the NEW splay 0.38 so the count rule alone owns the conviction. Expect
   exactly ONE: V-ARMS "4 hook points drawn — the form study's stock anchor
   carries 2". V-WSPLAY silent (injected at the class constant); V-WSTATION
   silent (the stone does not move); V-REST silent (the stone's rolled corner
   owns the assembly's floor and no arm reaches it). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      let arm = null;
      g.traverse(o => { if (o.isMesh && o.name === 'wa-arm' && !arm) arm = o; });
      if (arm) {
        const ai = arm.parent;
        const TH = 0.38, HL = 1.2, BL = 0.7585, armD = 0.12;
        const shankL = 2.0 / 0.51, yX = -shankL * 0.65, SEP = shankL * 0.058;
        for (const sg of [1, -1]) {
          const dir = new THREE.Vector3(0, Math.cos(TH), sg * Math.sin(TH));
          const yXp = yX - SEP;
          const t = new THREE.Mesh(
            new THREE.CylinderGeometry(armD * 0.45, armD * 0.55, BL + HL, 10),
            arm.material);
          t.name = 'wa-arm';
          t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          t.position.set(0, yXp, 0);
          t.position.addScaledVector(dir, (BL - HL) / 2);
          ai.add(t);
          const tip = new THREE.Mesh(
            new THREE.ConeGeometry(armD * 0.42, armD * 1.2, 10), arm.material);
          tip.name = 'wa-tip';
          tip.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0), dir.clone().negate());
          tip.position.set(0, yXp, 0);
          tip.position.addScaledVector(dir, -(HL + armD * 0.5));
          ai.add(tip);
        }
      }
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
