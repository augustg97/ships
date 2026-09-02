/* r197 length — the pre-r197 hook limb rebuilt: each arm timber's cylinder
   replaced at HL 1.2 (the old drawn default) with the new record section,
   repositioned about its own crossing, its tip cone moved out with it.
   Timber runs BL 0.7888 + HL 1.2 = 1.989 m. Expect exactly ONE: V-WARM
   "an arm timber off its record's length", 1.99 m against 1.68 (진도-641's
   1.90 less the tip cone's reach). The SECTION form silent (0.22 kept);
   V-WSPLAY silent (axes kept); V-ARMS silent (two cones); V-WSTOCK silent
   (arm centres stay far below the head span); V-WSTATION/V-REST silent
   (stone unmoved, the stone's corner still owns the rest floor). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      const arms = [], tips = [];
      g.traverse(o => {
        if (!o.isMesh) return;
        if (o.name === 'wa-arm') arms.push(o);
        if (o.name === 'wa-tip') tips.push(o);
      });
      const TH = 0.38, armD = 0.196, BL = 0.7888, HL = 1.2;
      const shankL = 2.0 / 0.51, yX = -shankL * 0.65, SEP = shankL * 0.058;
      const stations = [[1, yX + SEP], [-1, yX - SEP]];
      arms.forEach((t, i) => {
        const [sg, yXp] = stations[i];
        const dir = new THREE.Vector3(sg * Math.sin(TH), Math.cos(TH), 0);
        t.geometry.dispose();
        t.geometry = new THREE.CylinderGeometry(
          armD * 0.45, armD * 0.55, BL + HL, 10);
        t.position.set(0, yXp, 0);
        t.position.addScaledVector(dir, (BL - HL) / 2);
      });
      tips.forEach((tip, i) => {
        const [sg, yXp] = stations[i];
        const dir = new THREE.Vector3(sg * Math.sin(TH), Math.cos(TH), 0);
        tip.position.set(0, yXp, 0);
        tip.position.addScaledVector(dir, -(HL + armD * 0.5));
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
