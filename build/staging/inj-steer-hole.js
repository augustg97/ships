/* prove round 121's pair arm convicts a HOLE: the trireme's starboard quarter
   rudder alone is removed after the build (matched by lwl 35 + beam 3.8 — the
   corbita shares her waterline length). 'A quarter-rudder pair is a pair' must
   convict once, on the trireme, with the port oar honestly standing. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const g = orig.apply(this, arguments);
    if (S && S.lwl === 35 && S.beam === 3.8) {
      const gone = [];
      g.traverse(o => { const p = o.userData && o.userData.part;
        if (p && p.key === 'quarterRudder' && o.isMesh) {
          const bb = new THREE.Box3().setFromObject(o);
          if ((bb.min.z + bb.max.z) / 2 > 0) gone.push(o);
        } });
      for (const o of gone) o.parent.remove(o);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
