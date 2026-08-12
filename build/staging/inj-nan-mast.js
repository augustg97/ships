/* INJECTION — the r86 black-canvas class, verbatim shape: a mast whose record carries
   neither `height` (Steel share) nor `heightM` (attested metres). `lower` computes to
   NaN, the mast/yard/sail build with NaN in every vertex, the bounding box and camera
   fit die of it. The finite-vertex rule must convict, naming the parts. */
(() => {
  const v = (APP.vessels.vessels || APP.vessels).find(x => x.id === 'galley');
  delete v.hull.masts[0].heightM;
})();
