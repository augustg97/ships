      /* ── AND THE CLAMP IS ONE BENT TIMBER, NOT A CHAIN (round 143). On a hull that
         carries her fighting deck on the gunwale — gunDeck with no apostis, so the
         deck edge follows the hull's own curve — the fore-and-aft clamp under the
         deck lip is bent round that curve in ONE piece per side, and since r143 it
         is lofted that way. The old form was N chord boxes a side, a kink and a
         wedge gap at every joint. Conviction is by SPAN, because passage cannot
         tell two solid forms apart: every mesh tagged 'Deck clamp' must run the
         deck's own length — its x-extent within one station's width of the
         GD.from..GD.to run, from the record and surfacePoint, never the drawn
         meshes (r113) — and there must be exactly two, one a side. A chain fails
         both ways: 44 meshes, each spanning 1/22 of the run. The galleass keeps
         her straight-framed clamp (apostis branch) and is out of scope by the same
         clause that scopes the law. */
      if (!H.apostis && H.gunDeck) {
        const clamps = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.name === 'Deck clamp') clamps.push(o); });
        if (!clamps.length)
          say(v.id, 'a fighting deck with no clamp under its edge',
              'gunDeck on a frameless hull with no Deck clamp mesh');
        else {
          const HSc = SHIPS_HULL.hullSurface(H);
          const GDc = H.gunDeck;
          const xFc = SHIPS_HULL.surfacePoint(H, HSc, GDc.from, 1.0)[0];
          const xTc = SHIPS_HULL.surfacePoint(H, HSc, GDc.to, 1.0)[0];
          const run = Math.abs(xTc - xFc), stW = run / 22;
          let badC = 0, firstC = '';
          for (const m of clamps) {
            const bb = new THREE.Box3().setFromObject(m);
            const span = bb.max.x - bb.min.x;
            if (span < run - stW) {
              badC++;
              if (!firstC) firstC = `a clamp mesh spans ${span.toFixed(2)} m of a `
                + `${run.toFixed(2)} m run`;
            }
          }
          if (clamps.length !== 2 && !firstC)
            firstC = `${clamps.length} clamp meshes for two sides`;
          if (badC || clamps.length !== 2)
            say(v.id, 'the deck clamp is a chain, not a bent timber',
                `${badC} of ${clamps.length} clamp meshes short of the run — ${firstC}`);
        }
      }
