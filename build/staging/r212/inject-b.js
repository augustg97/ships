/* r212 inject-b: DRAG THE RECORD under the faithful builder — heightM 1.76 → 3.2 on the
   cog. The builder follows it, so S-SIZE stays silent; expect only the record-blind
   S-STATURE arms on the cog: both handspikes over 1.6 m, and a spindle over 2.2 m. */
() => {
  const L = APP.vessels.vessels || APP.vessels;
  const v = L.find(v => v.id === 'cog');
  v.hull.capstan.heightM = 3.2;
}
