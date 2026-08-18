/* Injection proof for 'deck covering unknown to the model': misspell Azzam's recorded
   covering. hull.js would fall back to the heuristic silently — a record stating a fact
   the model ignores without a word — so the audit must fire on the one vessel injected. */
(APP.vessels.vessels || APP.vessels).forEach(v => {
  if (v.hull && v.hull.deck) v.hull.deck.covering = 'marble';
});
