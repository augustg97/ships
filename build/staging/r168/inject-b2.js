/* r168 inject-b2: the same drag on the ship the rule was NOT born on — trireme
   bank 2, 31 -> 45 rowers at the Vitruvian 0.98 default. Span 44·0.98 = 43.1 m on a
   35 m waterline; 0.9·lwl = 31.5. Expect: exactly trireme, bank 2. */
() => {
  const list = APP.vessels.vessels || APP.vessels;
  list.find(v => v.id === 'trireme').hull.oarsPerBank = [27, 27, 45];
}
