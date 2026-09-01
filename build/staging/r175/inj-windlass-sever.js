/* r175 sever — the builder ignores throughBars and ships Falconer's single-ended
   spikes under the horong record. Only V-THROUGH may convict, once per bar (the
   spike centre rides (1.7/2 − 0.22) = 0.63 m off the axis, past the 0.25 m gate);
   every other hull and every other arm stays silent. */
(() => {
  const orig = SHIPS_HULL.buildShip;
  SHIPS_HULL.buildShip = function (H, opts) {
    let strip = false;
    if (H && H.windlass && H.windlass.throughBars) {
      H = JSON.parse(JSON.stringify(H));
      strip = true;
      delete H.windlass.throughBars;      // the builder draws the Falconer spikes...
    }
    const g = orig.call(this, H, opts);
    return g;
  };
  /* ...and the AUDIT still reads the real record: re-point the vessels list is not
     needed — the audit reads APP.vessels, whose panokseon record keeps
     throughBars: true. The builder alone was severed. */
})();
