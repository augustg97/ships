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
      /* ── (c) PAIRS THAT MUST NEVER TOUCH ────────────────────────────────────────────
         Beyond rig-vs-deck. Note what is NOT here, and why: a bowsprit is stepped through the
         beakhead, a channel is bolted to the hull side, a rudder hangs on the sternpost, a
         gallery is built into the stern, and a boat or a capstan rests ON deck. All of those
         touch structure by design. Only pairs with no legitimate contact belong in this list. */
      const NEVER = [
        ['sail','funnel'], ['sail','bridge'], ['sail','island'], ['sail','turret'], ['sail','flightdeck'],
        ['yard','funnel'], ['yard','bridge'], ['yard','island'], ['yard','turret'], ['yard','flightdeck'],
        ['wing','funnel'], ['wing','bridge'],
        ['boat','mast'], ['boat','funnel'], ['boat','turret'],
        ['turret','funnel'], ['turret','bridge'], ['turret','mast'],
        ['funnel','mast'], ['funnel','bridge'], ['island','mast'],
        ['gun','boat'], ['gun','mast'],
      ];
      const by = {};
      g.traverse(o => { if (!o.isMesh) return; const p = o.userData && o.userData.part; if (!p) return;
        (by[p.key] = by[p.key] || []).push(o); });
      for (const [ak, bk] of NEVER) {
        const A = by[ak] || [], B = by[bk] || [];
        if (!A.length || !B.length) continue;
        let worst = 0, name = '';
        for (const b of B) {
          if (!b.geometry.boundingBox) b.geometry.computeBoundingBox();
          const bb = b.geometry.boundingBox.clone(), sz = new THREE.Vector3();
          bb.getSize(sz); bb.expandByVector(sz.multiplyScalar(-0.15));
          const bw = new THREE.Box3().setFromObject(b);
          const inv = new THREE.Matrix4().copy(b.matrixWorld).invert();
          for (const a of A) {
            if (!new THREE.Box3().setFromObject(a).intersectsBox(bw)) continue;
            const pos = a.geometry.attributes.position, p = new THREE.Vector3();
            let hits = 0; const step = Math.max(1, Math.floor(pos.count / 120));
            for (let i = 0; i < pos.count; i += step) {
              p.fromBufferAttribute(pos, i).applyMatrix4(a.matrixWorld).applyMatrix4(inv);
              if (bb.containsPoint(p)) hits++;
            }
            if (hits > worst) { worst = hits; name = (b.userData.part.name || bk); }
          }
        }
        if (worst >= 3) out.push({ ship: v.id, fault: ak + ' through ' + bk, part: name, points: worst });
      }
    }

    /* ── ⚠ AND VALIDATE THE INSTRUMENT BEFORE TRUSTING A NULL ────────────────────────────
       "All clean" from a checker that cannot fire is indistinguishable from "all clean" from
       one that can, and far more comforting than it deserves to be. Verified by deliberately
       driving a funnel into a sail on Great Eastern: 0 hits as built, 9 hits displaced. The
       test detects what it claims to detect. Re-run that check whenever these rules change. */
    return out.length ? out : 'CLEAN — ' + vs.length + ' hulls, no free rig through structure, '
                            + 'no forbidden pair touching';
  });
}
