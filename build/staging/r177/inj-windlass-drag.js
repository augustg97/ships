/* r177 drag — the record lies, the builder follows it faithfully. The corbita's
   geometric barrelLenM dragged to 9.5 m: V-SPAN(record) follows the lie and stays
   silent; the SHELL arm convicts — 9.5 m across the drawn foredeck at the drawn
   station (probe-bow.py). Nothing else may fire, on this hull or any other. */
(() => {
  const vs = APP.vessels.vessels || APP.vessels;
  for (const v of vs)
    if (v.id === 'corbita') v.hull.windlass.barrelLenM = 9.5;
})();
