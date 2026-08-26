// r163 injection (b): the RECORD rots — a pin dragged past the ship's own drawn
// counter. Every hull carrying tierAftU must convict by the arithmetic arm
// ('a terrace pinned past the ship's own counter'), nothing else may.
(() => {
  for (const v of APP.vessels.vessels) {
    const H = v.hull || {};
    if (H.tierAftU && H.loa && H.lwl) {
      const rakeAllow = ((H.stemRake || 0) + (H.sternRake || 0)) * H.loa;
      const rakeScale = rakeAllow > 0
        ? Math.min(1, Math.max(0, H.loa - H.lwl) / rakeAllow) : 1;
      const tipU = 0.5 + (0.5 * H.lwl + (H.sternRake || 0) * rakeScale * H.loa) / H.lwl;
      const ks = Object.keys(H.tierAftU).filter(k => +k > 0 && +k < (H.decks - 1));
      const k = ks[Math.floor(ks.length / 2)];
      H.tierAftU[k] = +(tipU + 0.01).toFixed(3);   // past the drawn stern extremity
    }
  }
})();
