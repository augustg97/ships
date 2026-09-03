/* r212 inject-a: SEVER THE BUILDER — the builder ignores the record's form and draws
   the Georgian bar capstan for a hull whose record says 'spill'. Expect: the cog alone
   convicts S-CONE ("no body on the axis widens toward the deck") — the Georgian core is
   a straight cylinder on the axis and its whelps stand off it; no other hull moves. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    if (hull && hull.capstan && hull.capstan.form === 'spill')
      hull = Object.assign({}, hull, { capstan: { whelps: 6, bars: 6 } });
    return orig.call(this, hull, opts);
  };
}
