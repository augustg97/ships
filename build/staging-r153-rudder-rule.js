/* r153 STAGED audit rule — a balanced rudder is a foil. Written and sim-proven in
 * r152 (build/staging-r152-aviation.mjs, foil checks 21/21 on yamato, queen-mary-2,
 * dreadnought) but HELD BACK: the fix reaches twelve steel-steered hulls and twelve
 * ship-* frames, which did not fit r152's window beside the catapult class. Apply
 * with the foil geometry + antifouling material, then paste this block into
 * Research/audit-hulls.js after the r152 aviation rule. Change the round number in
 * the comment to the round that lands it.
 */
    /* ⚠ A BALANCED RUDDER IS A FOIL (round 152). A steel ship's rudder is a
       streamlined body, thickest near a third of its chord and CLOSED by its
       trailing edge: in the aft tenth of the chord run no vertex may stand past
       0.35 of the mesh's own max half-thickness (a NACA00 section still carries
       44% of max thickness at 80% chord, so the band is the last tenth, where the
       section really has closed). The convicted form was the 12-triangle slab at
       full thickness to its trailing edge — on every steel-steered hull in the
       fleet, twelve of them. Timber and median rudders really are plates, and stay
       out of scope by the record's own steering kind. */
    const steerR152 = H.steering ? H.steering
      : (H.build === 'steel' || H.build === 'iron') ? 'steel'
      : H.build === 'bulkhead' ? 'median' : 'stern';
    if (steerR152 === 'steel') {
      let rdBad = 0, rdNote = '';
      g.traverse(o => {
        if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Rudder')
          return;
        const geo = o.geometry, pos = geo.attributes.position;
        const tris = geo.index ? geo.index.count / 3 : pos.count / 3;
        let xLo = Infinity, xHi = -Infinity, zMax = 0;
        for (let i = 0; i < pos.count; i++) {
          xLo = Math.min(xLo, pos.getX(i)); xHi = Math.max(xHi, pos.getX(i));
          zMax = Math.max(zMax, Math.abs(pos.getZ(i)));
        }
        let zAft = 0;
        for (let i = 0; i < pos.count; i++)
          if (pos.getX(i) > xHi - (xHi - xLo) * 0.10)
            zAft = Math.max(zAft, Math.abs(pos.getZ(i)));
        if (tris <= 12 || zAft > 0.35 * zMax) {
          rdBad++;
          rdNote = `${(zAft / Math.max(1e-9, zMax)).toFixed(2)} of full thickness ` +
                   `at the trailing edge, ${tris} triangles`;
        }
      });
      if (rdBad)
        say(v.id, 'rudder is a slab',
            `${rdNote} — a balanced rudder is a foil, closed at its trailing edge`);
    }

