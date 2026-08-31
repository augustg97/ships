/* r169 inject-b: DRAG THE RECORD, HEALTHY BUILDER — paddleFloatDeepM 0.91 → 2.2.
   The builder follows its record faithfully, so COUNT and BOARD agree with the drag;
   only the record-independent COUNTER can convict: a float deeper than any board
   anybody ever hung on a paddle wheel. Expect: 'a board nobody attested', exactly
   {great-eastern}. */
() => {
  const list = APP.vessels.vessels || APP.vessels;
  const v = list.find(x => x.id === 'great-eastern');
  v.hull.paddleFloatDeepM = 2.2;
}
