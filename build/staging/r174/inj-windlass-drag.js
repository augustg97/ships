/* r174 drag — the record lies, the builder follows it faithfully. The junk's
   class-default barrelLenM 4.6 dragged to 9.0 m: V-SPAN(record) follows the lie and
   stays silent; the SHELL arm convicts — 9.00 m across a 5.60 m foredeck at the
   station. The treasure-ship's barrelDiaM 0.6 dragged to 1.4 m: V-DIA follows the lie;
   the builder's clamp caps the axis at 0.90 so the lever and clearance arms stay
   silent; the record-blind bore arm convicts — no handspike reaches through a 1.4 m
   barrel. Nothing else may fire. */
(() => {
  const vs = APP.vessels.vessels || APP.vessels;
  for (const v of vs) {
    if (v.id === 'junk') v.hull.windlass.barrelLenM = 9.0;
    if (v.id === 'treasure-ship') v.hull.windlass.barrelDiaM = 1.4;
  }
})();
