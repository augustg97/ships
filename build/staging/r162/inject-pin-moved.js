// r162 injection (a): the RECORD moves, the drawing goes stale — every hull
// carrying tierAftU must convict, nothing else may.
(() => {
  for (const v of APP.vessels.vessels) {
    const H = v.hull || {};
    if (H.tierAftU) {
      const ks = Object.keys(H.tierAftU).filter(k => +k > 0 && +k < (H.decks - 1));
      const k = ks[Math.floor(ks.length / 2)];
      H.tierAftU[k] = +(H.tierAftU[k] - 0.02).toFixed(3);   // pin dragged ~6 m forward
    }
  }
})();
