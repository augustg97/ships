/* prove round 122's 'an undecked hull is capped' convicts the ORIGINAL FAULT: the
   two deckLaid: false hulls are built as if decked, so the cap comes back and the
   rays bottom out at sheer height. Expect: dugout once, voyaging canoe once per
   hull lane — plus the r120 hold-furniture rule firing alongside, because a "decked"
   build honestly regrows the gratings and capstan the record refuses. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    if (S && S.deckLaid === false) {
      S.deckLaid = true;
      const g = orig.apply(this, arguments);
      S.deckLaid = false;
      return g;
    }
    return orig.apply(this, arguments);
  };
})();
