/* prove round 118's sangjang rule fires, the IGNORED-FIELD arm: a builder that
   ignores gunDeck.walls draws the class-default open stanchions. The field is
   removed for the build only and restored before the audit reads the record, so
   the audit sees walls declared over an open band — the no-geometry arm must
   convict ('sangjang walls declared but not drawn'). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const had = S && S.gunDeck && S.gunDeck.walls;
    if (had) delete S.gunDeck.walls;
    const g = orig.apply(this, arguments);
    if (had) S.gunDeck.walls = true;
    return g;
  };
})();
