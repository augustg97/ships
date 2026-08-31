/* r172 drag — the record lies, the builder follows it faithfully: the 74's plate-read
   drumDiaM 1.5 dragged to 3.5 m. The record-visible arms follow the record and stay
   silent; only record-blind V-STATURE may convict, exactly ship-of-the-line
   (dia 3.5 > 1.8 m, and H clamps to 1.35 so H/dia 0.39 < 0.55). */
(() => {
  const vs = APP.vessels.vessels || APP.vessels;
  for (const v of vs)
    if (v.id === 'ship-of-the-line') v.hull.capstan.drumDiaM = 3.5;
})();
