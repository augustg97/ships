/* r175 drag — the record lies, the builder follows it faithfully. The panokseon's
   class-default barrelLenM 3.8 dragged to 7.0 m: V-SPAN(record) follows the lie and
   stays silent; the SHELL arm convicts — 7.00 m across a 5.79 m foredeck at the drawn
   station (probe-bow.py). Nothing else may fire, on this hull or any other. */
(() => {
  const vs = APP.vessels.vessels || APP.vessels;
  for (const v of vs)
    if (v.id === 'panokseon') v.hull.windlass.barrelLenM = 7.0;
})();
