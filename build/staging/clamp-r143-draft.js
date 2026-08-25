/* r143 draft — replaces hull.js lines 8382–8403 (the fused stanchion/clamp/bulwark
   loops in the `S.gunDeck && !AP` branch). The clamp becomes ONE lofted bent timber
   per side on the same stations; stanchions (real discrete posts) and the class-default
   segment bulwark are unchanged in form. */

    /* ── THE CLAMP IS ONE BENT TIMBER, NOT A CHAIN (round 143) ───────────────────────
       The fore-and-aft timber under the deck lip — the one the deck's edge rides on
       and the walls tuck their heads into. Until r143 it was drawn as N chord boxes a
       side, the segment class the sama wall (r140), the gun-port bulwark (r141) and
       the sangjang belt (r142) each closed one storey at a time: a kink, a wedge gap
       and its own facet shading at every joint. A real clamp is bent round the deck
       edge in one piece per side. Lofted station by station on the same stations,
       section where every chord's section was — B*0.030 deep, B*0.028 athwart, axis
       at gdY − B*0.016 / halfW − B*0.014 — so nothing that abuts it moves. Single
       winding on a DoubleSide material, the r118 normals lesson. */
    const timberC = timber.clone(); timberC.side = THREE.DoubleSide;
    for (const sgn of [-1, 1]) {
      for (let i = 0; i <= N; i += 2) {
        /* stanchions stand ON the rail — foot at the gunwale the surface owns */
        const a = new THREE.Vector3(sx[i], railY[i], sgn * (halfW[i] - over));
        const b = new THREE.Vector3(sx[i], gdY, sgn * (halfW[i] - B * 0.020));
        group.add(tag(beamAB(a, b, B * 0.020, B * 0.020, timber), 'gundeck', 'Stanchion'));
      }
      {
        const cvh = B * 0.015, cah = B * 0.014, cyC = gdY - B * 0.016;
        const zCl = i => halfW[i] - B * 0.014;
        const cp = { pos: [], idx: [] };
        const quadCl = (a2, b2, c2, d2) => { const k = cp.pos.length / 3;
          cp.pos.push(...a2, ...b2, ...c2, ...d2);
          cp.idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
        for (let i = 0; i < N; i++) {
          const xA = sx[i], xB = sx[i + 1], zA = zCl(i), zB = zCl(i + 1);
          quadCl([xA, cyC + cvh, sgn * (zA - cah)], [xB, cyC + cvh, sgn * (zB - cah)],
                 [xB, cyC + cvh, sgn * (zB + cah)], [xA, cyC + cvh, sgn * (zA + cah)]);
          quadCl([xA, cyC - cvh, sgn * (zA - cah)], [xB, cyC - cvh, sgn * (zB - cah)],
                 [xB, cyC - cvh, sgn * (zB + cah)], [xA, cyC - cvh, sgn * (zA + cah)]);
          quadCl([xA, cyC - cvh, sgn * (zA + cah)], [xB, cyC - cvh, sgn * (zB + cah)],
                 [xB, cyC + cvh, sgn * (zB + cah)], [xA, cyC + cvh, sgn * (zA + cah)]);
          quadCl([xA, cyC - cvh, sgn * (zA - cah)], [xB, cyC - cvh, sgn * (zB - cah)],
                 [xB, cyC + cvh, sgn * (zB - cah)], [xA, cyC + cvh, sgn * (zA - cah)]);
        }
        for (const iE of [0, N])                          /* end grain */
          quadCl([sx[iE], cyC - cvh, sgn * (zCl(iE) - cah)],
                 [sx[iE], cyC - cvh, sgn * (zCl(iE) + cah)],
                 [sx[iE], cyC + cvh, sgn * (zCl(iE) + cah)],
                 [sx[iE], cyC + cvh, sgn * (zCl(iE) - cah)]);
        const cg2 = new THREE.BufferGeometry();
        cg2.setAttribute('position', new THREE.Float32BufferAttribute(cp.pos, 3));
        cg2.setIndex(cp.idx); cg2.computeVertexNormals();
        group.add(tag(new THREE.Mesh(cg2, timberC), 'gundeck', 'Deck clamp'));
      }
      if (!nSama && !nG) for (let i = 0; i < N; i++) {
        /* the bulwark above the clamp, segment by segment along the curved edge —
           the class default where no record cuts openings through it */
        const ba = new THREE.Vector3(sx[i], surfY + shH / 2, sgn * (halfW[i] - B * 0.006));
        const bb = new THREE.Vector3(sx[i + 1], surfY + shH / 2, sgn * (halfW[i + 1] - B * 0.006));
        group.add(tag(beamAB(ba, bb, shH, B * 0.012, timber), 'gundeck', 'Bulwark',
          'Heavy plank, chest-high, around the whole fighting deck — the rowers below it, '
          + 'the marines behind it, and the reason boarding a panokseon means climbing.'));
      }
    }
