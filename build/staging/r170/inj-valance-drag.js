/* prove round 170's record-blind COUNTER arm fires alone under a FAITHFUL builder:
   the record's makuBayM dragged 0.7 → 2.4, so the builder honestly draws tangent
   scallops 1.20 m deep. V-HEAD, V-COVER and V-ONCLOTH follow the record and stay
   silent; only the record-blind V-COUNTER convicts — "a scallop nobody hung" —
   exactly on the maku hull(s). */
(() => {
  const list = (APP.vessels.vessels || APP.vessels);
  for (const v of list) {
    if (v.hull && v.hull.gunDeck && v.hull.gunDeck.maku)
      v.hull.gunDeck.makuBayM = 2.4;
  }
})();
