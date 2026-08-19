/* prove round 121's one-piece rule convicts the ORIGINAL FAULT: the dugout is
   built as if she were planked shell-first — posts raised, wales hung — while the
   record still calls her one piece. 'Assembly timber on a one-piece hull' must
   convict on exactly the dugout, twice: stempost (2 meshes, stem and sternpost)
   and wale (2 meshes). Steering stays paddle, so no rudder confounds the count. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    if (S && S.build === 'dugout') {
      S.build = 'shell';
      const g = orig.apply(this, arguments);
      S.build = 'dugout';
      return g;
    }
    return orig.apply(this, arguments);
  };
})();
