/* r194 drag — the stone stretched 1.30x along its own long axis. Expect exactly
   ONE conviction: V-STONE 2.60 m through the stow transform vs record 2.0. The
   r186 drag proof's honest second (stabbed through the planking) DISAPPEARS by
   design: the stone rides the shank middle now and the stretch runs along the
   deck, reaching no planking. V-WSTATION silent — scale moves no centre. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.woodAnchor) {
      g.traverse(o => { if (o.isMesh && o.name === 'wa-stone') o.scale.x *= 1.30; });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
