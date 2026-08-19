/* prove round 120's hold-furniture rule fires, the ORIGINAL-FAULT arm: a builder
   that ignores deckLaid draws gratings and a capstan on the dugout and the voyaging
   canoe again. The field is removed for the build only and restored before the audit
   reads the record, so the audit sees hold furniture drawn on hulls whose record
   declares no laid deck — 'hold furniture on an undecked hull' must convict, twice
   per ship (grating and capstan), on exactly those two ships. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    const had = S && S.deckLaid === false;
    if (had) delete S.deckLaid;
    const g = orig.apply(this, arguments);
    if (had) S.deckLaid = false;
    return g;
  };
})();
