/* prove round 122's 'a decked hull opened up' convicts the gate WIDENING: the fluyt
   (lwl 27.5, the decked timber control) is built as if her record refused a deck, so
   the open interior goes in and her deck-tagged geometry reaches below the load
   waterline. Expect: 'a decked hull opened up' on the fluyt — plus the r120 arm
   'a decked timber ship lost her grating/capstan' firing alongside, because the
   undecked build honestly strips the hold furniture too. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (S) {
    if (S && S.lwl === 27.5) {
      S.deckLaid = false;
      const g = orig.apply(this, arguments);
      delete S.deckLaid;
      return g;
    }
    return orig.apply(this, arguments);
  };
})();
