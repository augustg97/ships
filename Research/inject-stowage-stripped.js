/* Injection: strip the stowed gear from every hull after build — the bare-floor
   regression the rule exists to hold. Must convict both undecked hulls (dugout,
   voyaging-canoe) as 'an open hull with a bare floor'. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S, opts) {
    const g = orig.call(this, S, opts);
    const gone = [];
    g.traverse(o => {
      if (o.userData.part && o.userData.part.key === 'stowage') gone.push(o);
    });
    gone.forEach(o => o.parent.remove(o));
    return g;
  };
})();
"wrapped";
