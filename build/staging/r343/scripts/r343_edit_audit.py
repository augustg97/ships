#!/usr/bin/env python3
"""r343: A-ISLANDS reads an island's top through the builder's own islandTop/islandDeck, so a
top given over the sheer (overSheerM) and a per-island railM are measured where they are built."""
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]; s = s.replace(a, b)
rep("""          && Array.isArray(isl.topM) && isl.topM.length === 2 && isl.topM.every(t => typeof t === 'number');
        if (!shapeOK) { say(v.id, 'an island declared out of shape', `${JSON.stringify(isl).slice(0, 120)}; want {name, u: [a, b], topM: [fwd, aft]}`); continue; }
        const um = (isl.u[0] + isl.u[1]) / 2;
        if (Math.min(isl.topM[0], isl.topM[1]) < H2.sheer(um)) say(v.id, 'an island whose top lies under the sheer', `${isl.name}: topM ${isl.topM.join('/')} m, the sheer at its middle ${H2.sheer(um).toFixed(2)} m`);""",
"""          && ((Array.isArray(isl.topM) && isl.topM.length === 2 && isl.topM.every(t => typeof t === 'number'))
              || (Array.isArray(isl.overSheerM) && isl.overSheerM.length === 2 && isl.overSheerM.every(t => typeof t === 'number')));
        if (!shapeOK) { say(v.id, 'an island declared out of shape', `${JSON.stringify(isl).slice(0, 120)}; want {name, u: [a, b], topM: [fwd, aft]} or overSheerM: [fwd, aft]`); continue; }
        const um = (isl.u[0] + isl.u[1]) / 2;
        /* r343: a timber island's top may ride the sheer (overSheerM); either way the top is read
           through the builder's islandTop, sampled along the span, and the deck through islandDeck */
        const topAt = q => H2.islandTop(q);
        if (isl.overSheerM ? Math.min(...isl.overSheerM) <= 0 : Math.min(isl.topM[0], isl.topM[1]) < H2.sheer(um))
          say(v.id, 'an island whose top lies under the sheer', `${isl.name}: ${isl.overSheerM ? 'overSheerM ' + isl.overSheerM.join('/') : 'topM ' + isl.topM.join('/') + ' m, the sheer at its middle ' + H2.sheer(um).toFixed(2)} m`);
        if (isl.railM !== undefined && !(isl.railM > 0.3 && isl.railM < (isl.overSheerM ? Math.min(...isl.overSheerM) + 2.5 : 4)))
          say(v.id, 'an island railM out of range', `${isl.name}: railM ${isl.railM}`);""")
rep("""        const wantTop = Math.max(isl.topM[0], isl.topM[1]);""",
"""        let wantTop = -Infinity;
        for (let k = 0; k <= 40; k++) { const t = topAt(isl.u[0] + (isl.u[1] - isl.u[0]) * k / 40); if (t !== null) wantTop = Math.max(wantTop, t); }""")
rep("""          const tE = isl.topM[ue] - (H.islands.railM || 1.0), floorY = Math.min(H2.sheer(ue), tE) - 0.3;""",
"""          const tE = H2.islandDeck(ue), floorY = Math.min(H2.sheer(ue), tE) - 0.3;""")
rep("""          const e = deckAtX(xm), over = yMax - e;""",
"""          /* r343: inside an island's span the fife rail stands on the island's deck */
          const isD = H.islands ? SHIPS_HULL.hullSurface(H).islandDeck(m.at) : null;
          const e = isD !== null ? isD : deckAtX(xm), over = yMax - e;""")
# every deckAtX in the furniture/gear rules reads the island's deck inside an island's span
n = s.count("const deckAtX = xq => { if (!deckPts)")
assert n == 5, n
for grp in ['G', 'G', 'g', 'g', 'g']:
    s = s.replace("const deckAtX = xq => { if (!deckPts)", "const deckAtX = xq => { const iD = islandDeckAtX(H, xq, %s); if (iD !== null) return iD; if (!deckPts)" % grp, 1)
assert s.count("islandDeckAtX(H, xq, ") == 5
rep("""    return (u - 0.5) * H.lwl + r;
  };
""", """    return (u - 0.5) * H.lwl + r;
  };
  /* ── THE DECK A CREW STANDS ON INSIDE AN ISLAND'S SPAN IS THE ISLAND'S (round 343). Every rule
     that measures a fitting or a fall against "the deck at x" read the main deck's mesh, which
     under a 74's forecastle and quarterdeck lies 2 m below the deck the stanchions, pin rails,
     fife rails and halyards stand on. Inside a recorded island's span the deck is the builder's
     islandDeck at the station whose loft x is xq; null outside, so every other hull reads its
     deck mesh as before. */
  const islandsBuilt = new WeakMap();
  const islandDeckAtX = (H, xq, grp) => {
    if (!(H && H.islands && Array.isArray(H.islands.list))) return null;
    /* only where the islands are BUILT: they are FINE-gated, so the furled build has none */
    if (!islandsBuilt.has(grp)) { let f = false; grp.traverse(o => { const p = o.userData && o.userData.part; if (p && p.key === 'forecast') f = true; }); islandsBuilt.set(grp, f); }
    if (!islandsBuilt.get(grp)) return null;
    let a = 0, b = 1;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (loftDeckX(H, m) < xq) a = m; else b = m; }
    return SHIPS_HULL.hullSurface(H).islandDeck((a + b) / 2);
  };
""")
# the fife rule finds the mast by its foot ring, the lowest ring of the mast meshes near its station
rep("""          const xn = (m.at - 0.5) * L, xm = mastXAt(xn, deckAtX(xn)), at = `mast ${i} (station ${m.at})`;""",
"""          /* r343: the foot ring is the LOWEST ring of the mast near its station. deckAtX is the
             island's deck inside an island's span, where the mast passes through and has no ring */
          const footY = xq => { if (!mastPts) mastPts = [].concat(...mastMs.map(pts)); let y = 1e9;
            for (const q of mastPts) if (Math.abs(q.x - xq) < 3 && Math.abs(q.z) < 1.5) y = Math.min(y, q.y); return y; };
          const xn = (m.at - 0.5) * L, xm = mastXAt(xn, footY(xn)), at = `mast ${i} (station ${m.at})`;""")
# the pin rail against the stanchions either side of it, not the nearest one: at a flaring bow the
# half-breadth changes 0.3 m a metre, so the nearest stanchion 0.7 m off read a sound rail 0.21 m out
rep("""              let st = null, bd = 1e9; for (const c of bySide[sgn]) { const d = Math.abs(c.x - q.x); if (d < bd) { bd = d; st = c; } }
              if (!st || bd > 1.5) continue;
              let inner = 1e9; for (const r of st.P) if (Math.abs(r.y - q.y) < 0.35) inner = Math.min(inner, Math.abs(r.z));
              if (inner > 1e8) continue;""",
"""              /* r343: between the two stanchions either side of the point, interpolated in x. At the
                 74's flaring bow the half-breadth changes 0.3 m a metre over the forecastle, and the
                 NEAREST stanchion 0.7 m off read a rail standing inside the planking as 0.21 m out */
              const innerOf = c => { let m2 = 1e9; for (const r of c.P) if (Math.abs(r.y - q.y) < 0.35) m2 = Math.min(m2, Math.abs(r.z)); return m2; };
              let sa = null, sb = null;
              for (const c of bySide[sgn]) { if (c.x <= q.x && (!sa || c.x > sa.x)) sa = c; if (c.x > q.x && (!sb || c.x < sb.x)) sb = c; }
              const ia = sa && q.x - sa.x <= 1.5 ? innerOf(sa) : 1e9, ib = sb && sb.x - q.x <= 1.5 ? innerOf(sb) : 1e9;
              const inner = ia < 1e8 && ib < 1e8 ? ia + (ib - ia) * (q.x - sa.x) / Math.max(1e-6, sb.x - sa.x) : Math.min(ia, ib);
              if (inner > 1e8) continue;""")
# the cap over a stanchion between two cap stations: at the 74's bow the stations stand 0.78 m apart
rep("""            if (Math.abs(q.x - xq) <= 0.35) { outer = Math.max(outer, Math.abs(q.z)); n++; } }
          if (!n) return null;""",
"""            if (Math.abs(q.x - xq) <= 0.35) { outer = Math.max(outer, Math.abs(q.z)); n++; } }
          /* r343: a stanchion BETWEEN two cap stations is under the cap. At the 74's raked bow the
             stations stand 0.78 m apart, so the 0.35 m window found no vertex over a stanchion
             0.35 m from one and 0.43 from the other */
          if (!n) { const ks = [...st.keys()].map(k => k / 50);
            if (ks.some(x => x <= xq) && ks.some(x => x > xq)) { n = 1;
              for (const q of capPts) if (Math.sign(q.z) === sgn && Math.abs(q.x - xq) <= 0.8) outer = Math.max(outer, Math.abs(q.z)); } }
          if (!n) return null;""")
p.write_text(s); print('audit edited')
# A-FALL-THROUGH-ISLAND: a running fall inside a built island's span lies on or over the island's deck
s = pathlib.Path(sys.argv[1]).read_text()
a = "      /* ── A-ISLAND-SEATING (round 295, Titanic)"
assert s.count(a) == 1
s = s.replace(a, """      /* ── A-FALL-THROUGH-ISLAND (round 343): A FALL INSIDE AN ISLAND'S SPAN ENDS ON THE ISLAND'S DECK.
         An island is FINE-gated and the rig's falls were placed on deck(u), the MAIN deck, so on
         Preussen the jigger's peak and throat halyards, sheets and tacks ran down through her poop
         deck to the main deck 1.0 m under it, and on the 74 every fall of all three masts ran through
         her forecastle and quarterdeck. Read off the meshes: no vertex of a running fall (sheet, tack,
         halyard, gaff halyards, jeers, clewline, buntline) standing inboard of the island's side at
         its station may lie more than 0.10 m under the island's deck there. Silent where no island is
         built (the furled build). */
      if (groups.length) {
        const FALL = new Set(['sheet', 'tack', 'halyard', 'throatHalyard', 'peakHalyard', 'jeers', 'clewline', 'buntline']);
        const uAtX2 = x => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (loftDeckX(H, m) < x) a = m; else b = m; } return (a + b) / 2; };
        const P5 = new THREE.Vector3(), worst = {};
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o); if (!o.isMesh || !p || !FALL.has(p.key)) return;
          const pa = o.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) { P5.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            const u = uAtX2(P5.x); if (u <= 0.002 || u >= 0.998) continue;
            const dI = H2.islandDeck(u); if (dI === null) continue;
            const half = Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1)[2]);
            if (Math.abs(P5.z) > half - 0.10) continue;
            const under = dI - P5.y;
            if (under > 0.10 && (!worst[p.key] || under > worst[p.key].under)) worst[p.key] = { under, x: P5.x, y: P5.y, z: P5.z, dI }; } });
        for (const [k, w] of Object.entries(worst))
          say(v.id, 'a fall through an island deck', `${k}: a vertex at x ${w.x.toFixed(2)}, y ${w.y.toFixed(2)}, |z| ${Math.abs(w.z).toFixed(2)} lies ${w.under.toFixed(2)} m under the island's deck (${w.dI.toFixed(2)})`);
      }
""" + a)
pathlib.Path(sys.argv[1]).write_text(s); print('A-FALL-THROUGH-ISLAND added')
