/* r124 injection: the r123 residual-4 fault re-forced verbatim — fillLandRow restored to
   the shipped r123 body, which named the land from the port nearest THE SHIP, with no
   existence gate and no test that the port stands on the coast the scan found. At the
   sahul open-water waypoint that names Ujung Pandang (978 km away, modern) for a coast of
   60,000 BP. The round-124 rule must convict on the name arm; the r123 datum and track
   arms must stay quiet. */
window.fillLandRow = function (c, tr, lw) {
  const cell = c && c.querySelector('.pc-land');
  if (!cell || !tr || !tr.at) return;
  const RT = window.SHIPS_ROUTE;
  const key = (RT && RT.FINE
    ? (RT.FINE.ready ? 'r' : 'w') + RT.FINE.level + '|' + RT.FINE.sig : '')
    + '|' + Math.round(tr.at.lon * 4) + ',' + Math.round(tr.at.lat * 4);
  if (lw === undefined) {
    if (PSGV.landKey === key) return;
    lw = landward(tr.at);
  }
  PSGV.landKey = key;
  if (lw) {
    const ports = (APP.ports && APP.ports.ports) || [];
    let best = null, bestD = 1e9;
    const clat = Math.max(0.05, Math.cos(tr.at.lat * Math.PI / 180));
    for (const pt of ports) {
      const dx = (pt.lon - tr.at.lon) * clat, dy = pt.lat - tr.at.lat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = pt; }
    }
    const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                     'S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const pt8 = COMPASS[Math.round(((lw.az * 180 / Math.PI) % 360) / 22.5) % 16];
    cell.textContent = (best ? best.name + ' · ' : '') +
                       Math.round((lw.trueKm || lw.km) / 1.852) + ' nm ' + pt8;
  } else if (RT && RT.FINE && RT.FINE.ready) {
    cell.textContent = 'none within ' + Math.round(LAND_REACH_KM / 1.852) + ' nm';
  } else cell.textContent = '—';
};
