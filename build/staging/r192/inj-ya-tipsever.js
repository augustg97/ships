/* r192 tip-sever — the four fluke-tip cones stripped under an unchanged record
   (the r190 form of the sever proof: tips only, arms left standing). Expect
   exactly ONE conviction, V-YARMS "0 fluke tips drawn — the name itself says
   four". V-YMASS must stay SILENT (the tips carry ~0.6% of the drawn iron, far
   inside the 12% band) and so must V-YSHANK (the shank is untouched) — the
   discrimination this proof exists to show. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.yotsumeAnchor) {
      const kill = [];
      g.traverse(o => { if (o.isMesh && o.name === 'ya-tip') kill.push(o); });
      for (const o of kill) o.parent.remove(o);
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
