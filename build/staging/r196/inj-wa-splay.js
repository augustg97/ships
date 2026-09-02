/* r196 splay — the pre-r196 drawn splay rebuilt: both timbers and their tips
   re-aimed to 0.78 rad about their own crossings (lengths kept; the rule under
   proof reads the axis, not the length). Expect exactly ONE: V-WSPLAY "an arm
   timber at 0.78 rad off the shank". V-ARMS silent (two cones); V-WSTATION
   silent (the stone does not move and the tips stay at the foot end);
   V-WSTOCK silent; V-REST silent (the stone's rolled corner owns the floor). */
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
      const TH = 0.78, HL = 1.2, BL = 0.7585, armD = 0.12;
      const shankL = 2.0 / 0.51, yX = -shankL * 0.65, SEP = shankL * 0.058;
      const stations = [[1, yX + SEP], [-1, yX - SEP]];
      arms.forEach((t, i) => {
        const [sg, yXp] = stations[i];
        const dir = new THREE.Vector3(sg * Math.sin(TH), Math.cos(TH), 0);
        t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        t.position.set(0, yXp, 0);
        t.position.addScaledVector(dir, (BL - HL) / 2);
      });
      tips.forEach((tip, i) => {
        const [sg, yXp] = stations[i];
        const dir = new THREE.Vector3(sg * Math.sin(TH), Math.cos(TH), 0);
        tip.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), dir.clone().negate());
        tip.position.set(0, yXp, 0);
        tip.position.addScaledVector(dir, -(HL + armD * 0.5));
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
