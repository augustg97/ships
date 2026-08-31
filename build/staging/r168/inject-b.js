/* r168 inject-b: DRAG THE RECORD, healthy builder — galley oarsPerBank 24 -> 40.
   Span (40-1)·1.2 = 46.8 m on a 39.5 m waterline; 0.9·lwl = 35.55. The builder
   draws the 40 faithfully; only the record's own arithmetic can convict it.
   Expect: 'more rowers than the hull has stations', exactly galley. */
() => {
  const list = APP.vessels.vessels || APP.vessels;
  list.find(v => v.id === 'galley').hull.oarsPerBank = [40];
}
