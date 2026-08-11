/* ── YARD GIRTH PROBE (round 70) ─────────────────────────────────────────────────────────
 * Measures every drawn crossed yard in the fleet: its length and its slings diameter, read
 * off the mesh the same way the audit reads masts (bounding box: a braced horizontal spar's
 * vertical extent IS its slings diameter, the fattest station). Junk and crab-claw head
 * spars share the 'Yard' name but rake along the ship — the athwartships test excludes them.
 * Run before and after the yard-diameter law change, per rule 4: measure before tuning.
 */
(function probeYards() {
  const list = (typeof APP !== 'undefined' && (APP.vessels.vessels || APP.vessels)) || [];
  const out = [];
  for (const v of list) {
    if (!v.hull) continue;
    const H = v.hull;
    let g = null;
    try { g = SHIPS_HULL.buildShip(H, { fine: true }); }
    catch (e) { out.push({ id: v.id, error: e.message }); continue; }
    const tagOf = o => { for (let e = o; e; e = e.parent)
                           if (e.userData && e.userData.part) return e.userData.part;
                         return null; };
    const yards = [];
    g.traverse(o => {
      if (!o.isMesh) return;
      const p = tagOf(o);
      if (!p || p.key !== 'yard' || p.name !== 'Yard') return;
      const bb = new THREE.Box3().setFromObject(o);
      const xE = bb.max.x - bb.min.x, yE = bb.max.y - bb.min.y, zE = bb.max.z - bb.min.z;
      if (zE <= xE || yE > zE * 0.25) return;      // athwartships spars only
      yards.push({ x: +((bb.min.x + bb.max.x) / 2).toFixed(1),
                   y: +((bb.min.y + bb.max.y) / 2).toFixed(1),
                   len: +Math.hypot(xE, zE).toFixed(2), d: +yE.toFixed(3),
                   LoverD: +(Math.hypot(xE, zE) / yE).toFixed(1) });
    });
    if (yards.length)
      out.push({ id: v.id, iron: !!H.iron, beam: H.beam, yards: yards.sort((a, b) => a.x - b.x || a.y - b.y) });
  }
  return out;
})();
