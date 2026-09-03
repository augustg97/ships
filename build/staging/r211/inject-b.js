/* r211 inject-b: SEVER THE RECORD FROM THE BUILD on one hull — the slave ship (record year
   1590) is built as if depicted at 1800, so the builder draws the square-backed top with no
   bulwark while the record says round and walled. Expect: both arms convict slave-ship
   EXACTLY, 3 of 3 tops, and no other hull. */
() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (hull, opts) {
    const h = (hull && hull.year === 1590 && hull.loa === 30) ? Object.assign({}, hull, { year: 1800 }) : hull;
    return orig.call(this, h, opts);
  };
}
