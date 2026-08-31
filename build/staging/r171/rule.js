    /* ── THE LIGHTS ARE A PIERCED SASH, GLASS BEHIND ITS BARS (round 171). The r168
       sweep flagged the 57 twelve-triangle sternlight boxes; the plate overruled the
       drawing, not the form — a sash light IS flat glazing in a flat frame, but
       SLR0338 (the RMG contemporary Bellona model, the 74's own sub-type) resolves
       every light in both tiers as a 3×3 grid of panes recessed BEHIND the bars,
       glazing filling 74–80% of the tier pilaster to pilaster — and the drawn light
       was one uncastable 0.9 m sheet with a single stick, the glass slab and the bar
       each floating PROUD of the slab meant to hold them, 36% of the tier blank
       wall. Every read here is geometry parameters and sibling-local positions in
       the stern group's own frame — no Box3, the r169 lesson. Arms: V-PIERCED (a
       glazed tier has real apertures — an extruded sash whose shape carries holes; a
       tier of solid slabs convicts), V-GRID (record arm — apertures = N·cols·rows of
       the record's own sternLightPanes for an integer 3–7 lights), V-BEHIND (the
       glass sheet's outer face at least 5 mm INBOARD of the sash's outer face — a
       rebate, not an appliqué; the pre-r171 stack fails it by 0.001·B), V-COUNTER
       record-blind (no aperture over 0.45 m either way — a pane nobody could cast;
       the one arm that survives a dragged record). */
    if (H.sternLights) {
      const sl = [];
      g.traverse(o => { const p = tagOf(o);
        if (o.isMesh && p && p.key === 'sternlight') sl.push(o); });
      const sashes = sl.filter(o => o.geometry && o.geometry.type === 'ExtrudeGeometry');
      const sheets = sl.filter(o => o.geometry && o.geometry.type === 'BoxGeometry'
        && o.material && o.material.metalness >= 0.3);
      if (sashes.length < H.sternLights)
        say(v.id, 'a glazed tier with no aperture',
            `${H.sternLights} tier(s) declared, ${sashes.length} pierced sash frame(s) `
            + 'drawn — a light laid ON a solid wall is a slab, not a window');
      const gridRec = H.sternLightPanes || [3, 3];
      const perLight = gridRec[0] * gridRec[1];
      for (const fr of sashes) {
        const shp = fr.geometry.parameters.shapes;
        const holes = (shp && shp.holes) || [];
        if (!holes.length) {
          say(v.id, 'a glazed tier with no aperture',
              'sash frame extruded without a single hole');
          continue;
        }
        const nL = holes.length / perLight;
        if (holes.length % perLight !== 0 || nL < 3 || nL > 7)
          say(v.id, "stern lights off the record's grid",
              `${holes.length} apertures cannot be an integer 3–7 lights of `
              + `${gridRec[0]}×${gridRec[1]} panes`);
        let big = 0, dims = '';
        for (const hp of holes) {
          let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
          for (const q of hp.getPoints(1)) {
            a0 = Math.min(a0, q.x); a1 = Math.max(a1, q.x);
            b0 = Math.min(b0, q.y); b1 = Math.max(b1, q.y);
          }
          if (a1 - a0 > 0.45 || b1 - b0 > 0.45) {
            big++;
            if (!dims) dims = `${(a1 - a0).toFixed(2)} × ${(b1 - b0).toFixed(2)} m`;
          }
        }
        if (big)
          say(v.id, 'a pane nobody could cast',
              `${big} aperture(s) over 0.45 m — the first ${dims}`);
      }
      if (sashes.length && sheets.length) {
        /* the sash extrudes up its local z, turned aft by the builder, so its outer
           face is position.x + depth; the sheet is an axis-aligned box, outer face
           position.x + width/2. Both are children of the same stern group. */
        const sashOut = Math.min(...sashes.map(o =>
          o.position.x + (o.geometry.parameters.options.depth || 0)));
        const glassOut = Math.max(...sheets.map(o =>
          o.position.x + o.geometry.parameters.width / 2));
        if (glassOut > sashOut - 0.005)
          say(v.id, 'glazing proud of its own sash',
              `glass face at x ${glassOut.toFixed(3)}, sash face at `
              + `${sashOut.toFixed(3)} — panes sit in a rebate behind their bars`);
      } else if (sashes.length && !sheets.length)
        say(v.id, 'a sash with no glass behind it', 'no glazing sheet in any tier');
    }
