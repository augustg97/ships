/* r174 sever — two failures, one per hull. The junk's faithful machine is stood ON END
   (the barrel rotated vertical under a PRESENT record — a capstan wearing the wrong
   name): expect V-AXIS alone. The treasure-ship is drawn faithfully and then her record
   is deleted (meshes with a silent record): expect V-WARRANT alone. All other hulls —
   the cog's faithful machine among them — silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  const vs = APP.vessels.vessels || APP.vessels;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    const v = vs.find(x => x.hull === H);
    if (!v) return g;
    if (v.id === 'junk') {
      g.traverse(o => {
        if (o.isMesh && o.name === 'win-barrel') o.rotation.x = 0;  // vertical
      });
      g.updateMatrixWorld(true);
    }
    if (v.id === 'treasure-ship') delete H.windlass;   // drawn, record now silent
    return g;
  };
})();
