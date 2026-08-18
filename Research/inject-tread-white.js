/* Injection proof for 'stair treads ignore the recorded covering': repaint the terrace
   stair treads back to the topside white after build — the exact pre-r108 appearance.
   Must fire once, on the one recorded laid covering (azzam). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    const tagOf = o => { for (let e = o; e; e = e.parent)
      if (e.userData && e.userData.part) return e.userData.part; return null; };
    g.traverse(o => {
      const p = o.isMesh && tagOf(o);
      if (p && p.key === 'stair' && o.material.uniforms && o.material.uniforms.uCol)
        o.material = o.material.clone();   // unshare, then repaint this mesh alone
    });
    g.traverse(o => {
      const p = o.isMesh && tagOf(o);
      if (p && p.key === 'stair' && o.material.uniforms && o.material.uniforms.uCol)
        o.material.uniforms.uCol.value.set('#f4f2ec');
    });
    return g;
  };
})();
"wrapped";
