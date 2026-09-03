/* r213 inject-a: SEVER THE BUILDER — after the faithful build, strip every iron and the
   tiller from each stern-hung timber rudder and shove the blade 1.0 m abaft its post: the
   old plate's fault class (a slab off the post, no hangings). Expect: every 'stern' timber
   hull convicts R-STOCK ("hung off its post") and R-IRONS ("no irons"); the cog alone also
   "a castle with no tiller under it"; steel, junk, quarter and paddle hulls silent. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    const g = orig.call(this, hull, opts);
    const kill = [];
    g.traverse(o => {
      if (!o.isMesh) return;
      if (/^rudder-(band|pintle|gudgeon|tiller)$/.test(o.name)) kill.push(o);
      if (/^rudder-(stock|plank)$/.test(o.name)) o.position.x += 1.0;
    });
    for (const o of kill) o.parent.remove(o);
    return g;
  };
}
