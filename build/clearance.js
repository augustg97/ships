/* clearance.js — DOES ANYTHING PASS THROUGH ANYTHING IT SHOULD NOT?
 *
 * Paste into the console on any page of this app, then call `clearance()`.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
 * Interpenetration was being found by eye, one hull at a time, and only where a screenshot
 * happened to look. That found the Great Eastern's sails in her funnels and missed the same
 * class on four other ships. Twenty-one hulls times a dozen part types is not an eye problem.
 *
 * ── AND WHY THE RULE MATTERS AS MUCH AS THE TEST ───────────────────────────────────────
 * The first version of this flagged 23 faults. Most were not faults:
 *
 *   • A sail's luff is LACED TO ITS OWN MAST. Every sail on every ship "penetrated" a mast,
 *     because that is what being bent to a mast means. Excluding each sail's nearest mast
 *     took the list from 23 to zero for that pair.
 *   • A BOWSPRIT is stepped THROUGH the beakhead and bitted below deck. Passing through the
 *     deck is how it is mounted, not a fault.
 *   • A wing BEARING is bolted to the deck. It is supposed to touch.
 *
 * So the test is over FREE-FLYING RIG only — sails, yards, and the wing sail and vane, none
 * of which may touch structure. A checker that reports things that are correct is worse than
 * no checker, because it trains you to skim the output.
 *
 * ── AND WHY IT RAYCASTS RATHER THAN COMPARING BOXES ────────────────────────────────────
 * The first measurement compared each sail's LOWEST point against the deck's HIGHEST point
 * and reported penetrations of 0.9–1.5 m. But a sheer line rises toward bow and stern, so the
 * deck's highest point is nowhere near the sail. Casting a ray UP from each rig vertex hits a
 * deck only if that vertex is genuinely underneath one. Real depths: 0.16–0.66 m. The bogus
 * measurement was four times the real one and would have been "fixed" by over-correcting.
 */
function clearance(opts) {
  opts = opts || {};
  const samples = opts.samples || 60;
  return fetch('data/vessels.json').then(r => r.json()).then(j => {
    const vs = (Array.isArray(j) ? j : (j.vessels || [])).filter(v => v.hull);
    const ray = new THREE.Raycaster(), UP = new THREE.Vector3(0, 1, 0);
    const free = o => {
      const p = o.userData.part;
      return ['sail', 'yard'].includes(p.key)
          || (p.key === 'wing' && /Wing sail|Tail vane/.test(p.name || ''));
    };
    const out = [];
    for (const v of vs) {
      const g = SHIPS_HULL.buildShip(v.hull, { fine: true });
      g.updateMatrixWorld(true);
      const rig = [], solids = [], masts = [];
      g.traverse(o => {
        if (!o.isMesh) return;
        const p = o.userData && o.userData.part; if (!p) return;
        if (free(o)) rig.push(o);
        if (['deck', 'planking'].includes(p.key)) solids.push(o);
        if (p.key === 'mast') masts.push(o);
      });

      /* (a) does any free rig lie UNDER a deck or the planking? */
      let n = 0, depth = 0, who = '';
      for (const a of rig) {
        const pos = a.geometry.attributes.position, p = new THREE.Vector3();
        const step = Math.max(1, Math.floor(pos.count / samples));
        for (let i = 0; i < pos.count; i += step) {
          p.fromBufferAttribute(pos, i).applyMatrix4(a.matrixWorld);
          ray.set(p, UP); ray.far = v.hull.beam * 2;
          const h = ray.intersectObjects(solids, false);
          if (h.length) { n++; if (h[0].distance > depth) { depth = h[0].distance; who = a.userData.part.name || a.userData.part.key; } }
        }
      }
      if (n) out.push({ ship: v.id, fault: 'rig under deck', part: who, points: n, depth: +depth.toFixed(2) });

      /* (b) does any sail pass through a mast that is NOT its own? */
      for (const a of rig) {
        const ab = new THREE.Box3().setFromObject(a);
        let own = null, best = Infinity;
        masts.forEach(m => {
          const mc = new THREE.Vector3(); new THREE.Box3().setFromObject(m).getCenter(mc);
          const d = Math.abs(mc.x - ab.min.x); if (d < best) { best = d; own = m; }
        });
        for (const b of masts) {
          if (b === own) continue;
          if (!b.geometry.boundingBox) b.geometry.computeBoundingBox();
          const bb = b.geometry.boundingBox.clone(), sz = new THREE.Vector3();
          bb.getSize(sz); bb.expandByVector(sz.multiplyScalar(-0.12));   // touching is not penetrating
          if (!ab.intersectsBox(new THREE.Box3().setFromObject(b))) continue;
          const inv = new THREE.Matrix4().copy(b.matrixWorld).invert();
          const pos = a.geometry.attributes.position, p = new THREE.Vector3();
          let hits = 0; const step = Math.max(1, Math.floor(pos.count / 400));
          for (let i = 0; i < pos.count; i += step) {
            p.fromBufferAttribute(pos, i).applyMatrix4(a.matrixWorld).applyMatrix4(inv);
            if (bb.containsPoint(p)) hits++;
          }
          if (hits >= 3) out.push({ ship: v.id, fault: 'rig through another mast', part: a.userData.part.key, points: hits });
        }
      }
    }
    return out.length ? out : 'CLEAN — ' + vs.length + ' hulls, no free rig through structure';
  });
}
