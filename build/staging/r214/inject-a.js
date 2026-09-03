/* r214 inject-a: SEVER THE BUILDER — after the faithful build, strip the cog's two stern
   beams, shove the castle deck and walls 1.5 m aft, and remove every other wall board.
   Expect: the cog alone convicts "a castle with no stern beams", "a castle off the record's
   overhang", "a castle hanging past its stern" and "the castle wall off the record's board
   count"; no other hull carries a plan, so none moves. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    const g = orig.call(this, hull, opts);
    const kill = []; let k = 0;
    g.traverse(o => {
      if (!o.isMesh) return;
      if (o.name === 'castle-heckbalken') kill.push(o);
      if (/^castle-(deck|wall|wall-lower|wall-aft|wall-wing|rail|longitudinal|beam|stanchion|breastrail)$/.test(o.name)) o.position.x += 1.5;
      if (o.name === 'castle-wall' && (k++ % 2)) kill.push(o);
    });
    for (const o of kill) o.parent.remove(o);
    return g;
  };
}
