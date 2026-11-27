import sys
p = sys.argv[1]; s = open(p).read()
a = """          for (const c of icov) if (c.name === I.name && !ends.includes(c.open)) say(v.id, 'an island cover on a closed end', `${I.name}: a cover opens at ${c.open}`);
        }
"""
assert s.count(a) == 1
b = a + """        /* ── A-ISLAND-DECK-AS-RECORDED (round 358): AN ISLAND'S DECK STANDS AT ITS TABLE HEIGHT OVER THE DECK BELOW.
           Until r358 every island's deck was its top less a railM, so the 74's quarterdeck and forecastle sat 2.0 m over
           the upper deck (a class figure) whatever the record said. Steel's Folio XXXII gives both as heights over the
           upper deck's plank, and the record carries them as overDeckM [fwd, aft]. TEST, from the BUILT scene in hull
           space, on every island that records overDeckM: each vertex of its deck mesh (userData.islandDeck), at the
           station u its x gives, stands within 0.03 m of deck(u) plus overDeckM interpolated over the island's span
           (vertices within 0.02 u of a closed end are skipped, where the deck runs into the stem's or the stern's rake);
           and the barricade over it (the island's top less the deck) is never under 0.3 m. */
        for (const dm of iDecks) {
          const I = dm.userData.islandDeck, isl = H.islands.list.find(i => i.name === I.name);
          if (!isl || isl.overDeckM === undefined) continue;
          const o = isl.overDeckM;
          if (!(Array.isArray(o) && o.length === 2 && o.every(t => t > 1.5 && t < 3.5))) { say(v.id, 'an island overDeckM out of shape', `${I.name}: ${JSON.stringify(o)}`); continue; }
          const HS = SHIPS_HULL.hullSurface(H), xAtU = u => (u - 0.5) * H.lwl + HS.rake(u);
          let worst = 0, at = null, lowRail = Infinity, n = 0;
          for (const q of ptsI(dm)) {
            let a = 0, b = 1;
            for (let j = 0; j < 30; j++) { const m = (a + b) / 2; if (xAtU(m) < q.x) a = m; else b = m; }
            const u = (a + b) / 2;
            if ((isl.u[0] <= 0 && u < 0.02) || (isl.u[1] >= 1 && u > 0.98) || u < isl.u[0] - 1e-3 || u > isl.u[1] + 1e-3) continue;
            const uc = Math.min(isl.u[1], Math.max(isl.u[0], u));
            const want = HS.deck(uc) + o[0] + (o[1] - o[0]) * (uc - isl.u[0]) / Math.max(1e-6, isl.u[1] - isl.u[0]);
            n++;
            if (Math.abs(q.y - want) > worst) { worst = Math.abs(q.y - want); at = [uc, q.y, want]; }
            lowRail = Math.min(lowRail, HS.islandTop(uc) - q.y);
          }
          if (!n) say(v.id, 'an island deck with no vertex in its span', `${I.name}`);
          else if (worst > 0.03) say(v.id, 'an island deck off its recorded height', `${I.name}: at u ${at[0].toFixed(3)} the deck stands at y ${at[1].toFixed(3)}, the record (deck + overDeckM) puts it at ${at[2].toFixed(3)}`);
          if (lowRail < 0.3) say(v.id, 'an island deck at its own top', `${I.name}: the barricade over the deck falls to ${lowRail.toFixed(2)} m`);
        }
"""
s = s.replace(a, b); open(p, 'w').write(s); print('audit ok')
