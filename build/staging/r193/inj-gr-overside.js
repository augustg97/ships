/* r193 overside — the dhow's grapnel moved 6.0 m to starboard: outboard of the
   3.2 m half-beam, hanging in air over the sea at its own deck height. An offZ
   typo made flesh. Expect on the STAGED audit exactly ONE conviction: 'an
   anchor resting on nothing' at u 0.15 — and on the r192 audit (:8149) ZERO
   problems, because the sheer function answers at every (u, z) whether or not
   any ship is there. This injection is the reason the residual existed. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    const g = orig.call(this, H, opts);
    if (H.grapnel) {
      g.traverse(o => {
        if (o.userData && o.userData.part && o.userData.part.key === 'grapnel')
          o.position.z += 6.0;
      });
      g.updateMatrixWorld(true);
    }
    return g;
  };
})();
"wrapped";
