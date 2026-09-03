/* r213 inject-b: DRAG THE RECORD under the faithful builder — the cog's rudder record
   gets hangings 12 and tillerAtU 0.60. The builder follows it, so R-IRONS' count arm and
   the tiller-station arm stay silent; expect only the record-blind arms on the cog:
   "irons closer than a hand span" (12 on ~4.5 m of post) and "a tiller whose hand end is
   not under the castle" (u 0.60 is forward of the castle's 0.70). No other hull moves. */
() => {
  const L = APP.vessels.vessels || APP.vessels;
  const v = L.find(v => v.id === 'cog');
  v.hull.rudder.hangings = 12;
  v.hull.rudder.tillerAtU = 0.60;
}
