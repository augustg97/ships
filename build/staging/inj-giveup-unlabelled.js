/* r125 injection: the give-up that keeps quiet. Two forcings together: the unsnappable
   steppe voyage guarantees era 0 holds a track whose route fell back to its raw waypoints
   (give.legs >= 1), and showVoyageCard is re-forced to the r124 text verbatim — the Track
   row and nothing about the routing. The round-125 rule 'a give-up the card does not
   confess' must convict; the r123 ashore rule will also convict the injected track, which
   is that rule doing its own job on the same fault. */
(() => {
  const list = APP.voyages.voyages || APP.voyages;
  list.push({ id: 'inj-steppe', name: 'INJECTED: the steppe passage', vessel: 'dugout',
              year: -40000,
              legs: [{ lon: 88.0, lat: 47.0, name: 'a' }, { lon: 76.0, lat: 42.0, name: 'b' }] });
  /* r124 showVoyageCard, verbatim */
  showVoyageCard = function (v) {
    if (!v) return;
    const legRows = (v.rows || []).slice();
    if (v.legs && v.legs.length > 1) {
      let nm = 0;
      for (let i = 1; i < v.legs.length; i++) {
        const a = v.legs[i - 1], b = v.legs[i];
        const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
        const dp = p2 - p1, dl = (b.lon - a.lon) * Math.PI / 180;
        const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
        nm += 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
      }
      legRows.push(['Track in this model',
                    `${Math.round(nm).toLocaleString()} nm over ${v.legs.length} waypoints`]);
    }
    showCard({ eyebrow: 'Voyage', title: v.name, sub: v.dates, rows: legRows,
               prose: v.text, span: v.dates, cite: v.cite, tags: v.tags,
               plate: v.vessel });
  };
})();
