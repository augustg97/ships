/* Injection proof for 'floor attests steam but claims muscle': give Endurance's steam
   floor a paddle label. This is the round-103 card fault reproduced at the data level —
   "4.0 kn UNDER PADDLE" on a screw steamer — and the rule must convict it off the
   floor's own provenance text. */
(APP.vessels.vessels || APP.vessels).forEach(v => {
  if (v.id === 'endurance' && v.polar && v.polar.floor) v.polar.floor.by = 'paddle';
});
