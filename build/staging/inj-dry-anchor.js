/* r84 proof 2: a campaign day anchored on dry land must convict. Day 8 is set back to
   the pre-wiring anchor, 6.0 m up the sand east of Calais — the fault this round found
   by probing before wiring. Expect: armada 'a campaign day anchored on dry land'. */
(() => {
  const b = APP.battles.battles.find(x => x.id === 'armada');
  b.campaign[8].lon = 1.9; b.campaign[8].lat = 50.98;
})();
null;
