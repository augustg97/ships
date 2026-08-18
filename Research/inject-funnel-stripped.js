/* Injection proof for 'steam attested, no funnel drawn': strip the funnel count from
   every record that has one. Every pre-1950 steam record must then fire the rule —
   the Endurance fault of rounds 61–102, reproduced on the whole fleet. */
(APP.vessels.vessels || APP.vessels).forEach(v => {
  if (v.hull && v.hull.funnels) delete v.hull.funnels;
});
