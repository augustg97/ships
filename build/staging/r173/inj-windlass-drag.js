/* r173 drag — the record lies, the builder follows it faithfully: the cog's
   replica-read barrelDiaM 0.60 dragged to 1.60 m. V-DIA follows the record and stays
   silent; the builder's own clamp caps the axis at 0.90 m so the lever-height arm
   stays silent too. Only the record-blind counters may convict, exactly the cog:
   the barrel nobody bored (1.60 > 0.9 m) and the vanished cable clearance
   (0.90 − 0.80 = 0.10 < 0.12 m). */
(() => {
  const vs = APP.vessels.vessels || APP.vessels;
  for (const v of vs)
    if (v.id === 'cog') v.hull.windlass.barrelDiaM = 1.6;
})();
