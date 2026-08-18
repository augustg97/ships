/* prove round 117's walled-cabin rule fires, the IGNORED-FIELD arm: a builder that
   ignores tower.walls draws the class-default open pavilion. The field is removed
   for the build only and restored before the audit reads the record, so the audit
   sees walls declared over pavilion geometry — most of the 216 rays must convict. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const had = S && S.tower && S.tower.walls;
    if (had) delete S.tower.walls;
    const g = orig.apply(this, arguments);
    if (had) S.tower.walls = true;
    return g;
  };
})();
