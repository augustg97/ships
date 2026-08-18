/* prove round 119's maku rule fires, the IGNORED-FIELD arm: a builder that
   ignores gunDeck.maku leaves the band bare stanchions. The field is removed
   for the build only and restored before the audit reads the record — the
   no-geometry arm must convict ('maku declared but not drawn'). */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const had = S && S.gunDeck && S.gunDeck.maku;
    if (had) delete S.gunDeck.maku;
    const g = orig.apply(this, arguments);
    if (had) S.gunDeck.maku = true;
    return g;
  };
})();
