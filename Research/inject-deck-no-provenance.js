/* Injection proof for 'deck covering with no provenance': strip the source from every
   recorded covering. A stated material with nothing bounding the claim is the Azzam
   cluster fault in a new field; every vessel with hull.deck must fire. */
(APP.vessels.vessels || APP.vessels).forEach(v => {
  if (v.hull && v.hull.deck) delete v.hull.deck.provenance;
});
