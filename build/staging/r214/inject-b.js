/* r214 inject-b: DRAG THE RECORD under the faithful builder — the cog's castle.railHM to
   0.3 and castle.overhangAftM to 3.0. Expect: the cog alone, on the record-blind arms only:
   "a castle wall nobody could stand behind" (0.3 m) and "a castle hanging past its stern"
   (3.0 m abaft the post); the record-gated arms (length, overhang vs record, plan breadths,
   board count) silent because the build follows the record it was given. */
() => {
  const L = APP.vessels.vessels || APP.vessels;
  const v = L.find(x => x.id === 'cog');
  v.hull.castle.railHM = 0.3;
  v.hull.castle.overhangAftM = 3.0;
}
