/* r123 injection: the original fault, re-forced — the router's datum pinned to the modern
   coastline whatever the era says, which is what reading uSeaLevel before onTime wrote it
   did at every frozen #e=0 boot. Arm 1 ('two shorelines') must convict the deep-time era;
   arm 2 ('drawn on the model's own land') must convict the crossing to Sahul, whose track
   then crosses the exposed shelf the shader draws as land. */
(() => {
  const orig = window.SHIPS_ROUTE.setSeaLevel;
  window.SHIPS_ROUTE.setSeaLevel = (m, y) => orig(0, y);
  window.SHIPS_ROUTE.setSeaLevel(0, -63000);
  window.SHIPS_ROUTE.buildMask(true);
})();
