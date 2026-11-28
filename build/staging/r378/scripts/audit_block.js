    /* ── A-SHEER-TABLE (round 378, the 74): A TABLED DECK LINE RISES AS THE TABLE SAYS, AND ITS LEVEL IS STATED.
       Steel gives the gun deck's height over the rabbet at the foremost perpendicular, at dead-flat and at the
       after perpendicular, and the upper deck a constant height over it. On a hull whose record carries
       sheerTable: (1) the built deck's rise from dead-flat to each perpendicular must be the table's within 3 cm,
       read off hullSurface at the perpendiculars that steelPerpendiculars places; (2) the deck mesh's outermost
       vertex within 0.5 m of dead-flat must stand within 0.15 m of hullSurface's deck there; (3) Steel's
       waterline, found from the lower sills over the water, and the one found from the draught less the keel,
       must agree within 3 in, or the record's datum is wrong; (4) where the model's deck at dead-flat stands more
       than 0.15 m off Steel's on that waterline, the record must say so in contested (LEVEL) and give the
       derivation in levelProvenance. SILENCE is convicted, not the answer. */
    if (H.sheerTable) {
      const T = H.sheerTable, F = a => Array.isArray(a) ? a[0] + a[1] / 12 : NaN, FT = 0.3048;
      const HS = SHIPS_HULL.hullSurface(H), P = SHIPS_HULL.steelPerpendiculars(H, HS);
      if (!(P && P.lpp > 0) || !T.gunDeckOverRabbetFt || !T.deadFlatAbaftFpFt)
        say(v.id, 'a tabled deck line with no frame', 'hull.sheerTable needs gunDeckOverRabbetFt, deadFlatAbaftFpFt and perpendiculars that place both ends');
      else {
        const uAt = x => { let a = -0.2, b = 1.2; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if ((m - 0.5) * H.lwl + HS.rake(m) < x) a = m; else b = m; } return Math.min(1, Math.max(0, (a + b) / 2)); };
        const gd = T.gunDeckOverRabbetFt, ufp = uAt(P.fp), uap = uAt(P.ap), udf = uAt(P.fp + F(T.deadFlatAbaftFpFt) * FT);
        const dDf = HS.deck(udf);
        for (const [nm, u, want] of [['foremost', ufp, (F(gd.afore) - F(gd.midships)) * FT], ['after', uap, (F(gd.abaft) - F(gd.midships)) * FT]]) {
          const got = HS.deck(u) - dDf;
          if (Math.abs(got - want) > 0.03) say(v.id, 'a deck rising off its table', `the deck rises ${got.toFixed(3)} m from dead-flat (u ${udf.toFixed(3)}) to the ${nm} perpendicular (u ${u.toFixed(3)}); the table gives ${want.toFixed(3)} m`);
        }
        let far = -1, yNear = NaN; const xdf = (udf - 0.5) * H.lwl + HS.rake(udf), P6 = new THREE.Vector3();
        g.updateMatrixWorld(true);
        g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (!pt || pt.key !== 'deck') return;
          const pa = o.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) { P6.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            if (Math.abs(P6.x - xdf) <= 0.5 && Math.abs(P6.z) > far) { far = Math.abs(P6.z); yNear = P6.y; } } });
        if (!(Math.abs(yNear - dDf) <= 0.15)) say(v.id, 'a deck built off its tabled line', `the deck's outermost vertex within 0.5 m of dead-flat (x ${xdf.toFixed(2)}) stands at ${yNear} m, hullSurface's deck ${dDf.toFixed(3)} m`);
        const W1 = F(gd.midships) - F(T.gunRoundUpFt) + F(T.lowerSillOverPlankFt) - F(T.lowerPortsOverWaterFt);
        const W2 = F(T.loadDraughtFt) - F(T.keelDeepFt) - F(T.falseKeelFt);
        if (!(Math.abs(W1 - W2) <= 0.25)) say(v.id, 'a table whose two waterlines disagree', `the sills give the waterline ${W1.toFixed(2)} ft over the rabbet and the draught ${W2.toFixed(2)} ft`);
        const steelDeck = (F(gd.midships) + F(T.betweenDecksFt && T.betweenDecksFt.midships) + F(T.upperPlankFt) - F(T.upperRoundUpFt) - W1) * FT;
        if (!(Math.abs(dDf - steelDeck) <= 0.15) && !(typeof T.contested === 'string' && /LEVEL/.test(T.contested) && typeof T.levelProvenance === 'string' && T.levelProvenance.length > 40))
          say(v.id, 'a deck level off its table, unstated', `the deck at dead-flat stands ${dDf.toFixed(2)} m over the water and Steel's ${steelDeck.toFixed(2)} m on his own waterline; sheerTable.contested must state the LEVEL and levelProvenance derive it`);
      }
    }

