/* Injection: delete every drawn Quarter boat after build while the record still
   declares davitBoats — the declared-but-not-drawn direction. Must fire once, on
   the one davitBoats record (endurance). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    const dead = [];
    g.traverse(o => {
      if (o.isMesh && o.userData.part && o.userData.part.name === 'Quarter boat')
        dead.push(o);
    });
    for (const o of dead) o.parent.remove(o);
    return g;
  };
})();
"wrapped";
