/* prove round 171's record-blind COUNTER arm fires alone under a FAITHFUL builder:
   the 74's sternLightPanes dragged [3,3] -> [1,1], so the builder honestly cuts one
   aperture per light — 0.89 × 0.81 m of glass in one sheet. V-PIERCED, V-GRID and
   V-BEHIND follow the record and stay silent; only V-COUNTER convicts — "a pane
   nobody could cast" — exactly on ship-of-the-line, both tiers. */
(() => {
  const list = (APP.vessels.vessels || APP.vessels);
  for (const v of list) {
    if (v.id === 'ship-of-the-line' && v.hull)
      v.hull.sternLightPanes = [1, 1];
  }
})();
