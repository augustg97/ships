#!/usr/bin/env python3
"""r343: the 74's forecastle and quarterdeck as islands on a timber hull.
usage: r343_edit.py <web dir>   (edits js/hull.js; the record is r343_edit_record.py)"""
import sys, pathlib
W = pathlib.Path(sys.argv[1])
p = W / 'js' / 'hull.js'
s = p.read_text()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:90])
    s = s.replace(old, new)

# A. islandTop may ride the sheer (isl.overSheerM), and the island's deck is one function
rep("""  const islandTop = u => {
    if (!(S.islands && S.islands.list)) return null;
    for (const isl of S.islands.list)
      if (u >= isl.u[0] && u <= isl.u[1]) {
        const t = (u - isl.u[0]) / Math.max(1e-6, isl.u[1] - isl.u[0]);
        return isl.topM[0] + (isl.topM[1] - isl.topM[0]) * t;
      }
    return null;
  };""", """  /* ⚠ A TIMBER SHIP'S RAISED DECK IS LAID PARALLEL TO HER SHEER (round 343, the 74). A steel
     island's top is a straight line read at both ends (topM); a forecastle or quarterdeck on a
     wooden hull rises with the sheer under it, so the record may give its top as a height OVER
     THE SHEER at both ends (overSheerM), linear between them. And an island may carry its own
     railM (the barricade over its deck): a 74's forecastle barricade is lower than her
     quarterdeck's. islandDeck is the one derivation of the deck behind an island's top. */
  const islandOf = u => {
    if (!(S.islands && S.islands.list)) return null;
    for (const isl of S.islands.list) if (u >= isl.u[0] && u <= isl.u[1]) return isl;
    return null;
  };
  const islandTop = u => {
    const isl = islandOf(u);
    if (!isl) return null;
    const t = (u - isl.u[0]) / Math.max(1e-6, isl.u[1] - isl.u[0]);
    if (isl.overSheerM) return sheer(u) + isl.overSheerM[0] + (isl.overSheerM[1] - isl.overSheerM[0]) * t;
    return isl.topM[0] + (isl.topM[1] - isl.topM[0]) * t;
  };
  const islandRailM = u => {
    const isl = islandOf(u);
    return isl ? (isl.railM || S.islands.railM || 1.0) : null;
  };
  const islandDeck = u => { const t = islandTop(u); return t === null ? null : t - islandRailM(u); };""")
rep("""  return { nExp, halfB, wl, keel, sheer, deck, tumble, rake, stepTop, islandTop, wellTop, section: sectionRows(S),""",
    """  return { nExp, halfB, wl, keel, sheer, deck, tumble, rake, stepTop, islandTop, islandDeck, islandRailM, islandOf, wellTop, section: sectionRows(S),""")

# B. the bowsprit's heel: on the forecastle's deck unless the island says the sprit runs under it
rep("""    const spritDeck = H.islandTop(u0) !== null
      ? H.islandTop(u0) - ((S.islands && S.islands.railM) || 1.0) : deckAt(u0);""",
    """    /* r343: a ship with a beakhead runs her bowsprit out UNDER the forecastle, its heel on the
       deck below (the 74: isl.spritHeel 'main'); a steel forecastle carries it on its own deck */
    const islS = H.islandOf(u0);
    const spritDeck = islS && islS.spritHeel !== 'main' ? H.islandDeck(u0) : deckAt(u0);""")

# C. buildIslands: per-island railM, a recorded wall finish, a breastwork at an end facing a well
rep("""  const wallMat = steel(S.topside || '#3a3a3c');""",
    """  /* r343: a timber island's barricade wears a recorded paint (islands.finish, the wale's
     vocabulary: the 74's is tarred black on Asow); without it the topside colour, as before */
  const wallMat = S.islands.finish
    ? (() => { const m = steel('#000000'); m.uniforms.uCol.value = waleFinish({ wale: { finish: S.islands.finish }, topside: S.topside }).color; return m; })()
    : steel(S.topside || '#3a3a3c');""")
rep("""    const top = u => Math.max(H.islandTop(u), H.sheer(u) + 0.05);
    const g = new THREE.Group();""",
    """    const top = u => Math.max(H.islandTop(u), H.sheer(u) + 0.05);
    const iRail = isl.railM || railM;
    const g = new THREE.Group();""")
rep("""    const wall = [];
    for (const p of path) wall.push(p.x, H.sheer(p.u) - 0.02, p.z, p.x, top(p.u), p.z);""",
    """    /* ⚠ AN END THAT FACES A WELL IS A BREASTWORK, NOT THE BARRICADE CARRIED ACROSS (round 343).
       A 74's quarterdeck ends at the waist in a breast rail about a metre over its deck, and her
       forecastle in a breastwork with the belfry on it; the side barricade is the height of a
       man and more. isl.breastM is that end's height over the island's deck. The corner is a
       pair of coincident stations, so the wall steps there in one edge. Without the field the
       perimeter is walked exactly as before. */
    const wall = [];
    const breast = isl.breastM ? (u => top(u) - iRail + isl.breastM) : null;
    const pathW = [];
    for (let k = 0; k < path.length; k++) {
      const p = path[k], q = path[k + 1];
      pathW.push({ ...p, hi: top(p.u) });
      /* the crossing segments are the two consecutive points at the same u with opposite z */
      const same = (x, y) => Math.abs(x - y) < 1e-9;
      if (breast && q && same(q.u, p.u) && Math.sign(q.z) !== Math.sign(p.z)
          && ((same(p.u, u1) && !closedAft) || (same(p.u, u0) && !closedFwd))) {
        pathW.push({ ...p, hi: breast(p.u) }, { ...q, hi: breast(q.u) });
      }
    }
    for (const p of pathW) wall.push(p.x, H.sheer(p.u) - 0.02, p.z, p.x, p.hi, p.z);""")
rep("""      const u = stU(k), y = top(u) - railM, [dx, h] = shellAt(u, y);""",
    """      const u = stU(k), y = top(u) - iRail, [dx, h] = shellAt(u, y);""")
rep("""      const at = q => ({ x: Math.max(xLo, Math.min(xHi, q.x)), y: top(q.u) - railM, z: Math.sign(q.z) * Math.max(0, Math.abs(q.z) - edge) });""",
    """      const at = q => ({ x: Math.max(xLo, Math.min(xHi, q.x)), y: top(q.u) - iRail, z: Math.sign(q.z) * Math.max(0, Math.abs(q.z) - edge) });""")

# D. the bulwark furniture stands only where there is a bulwark: not inside an island's span
rep("""  const deckAtU = u => H.deck(u), railAtU = u => H.sheer(u);
  const BW = S.bulwark || {};""",
    """  /* ⚠ ON A RAISED DECK THE BULWARK IS ITS BARRICADE (round 343, the 74). Inside an island's
     span the deck a crew stands on is the island's, and the side over it is the island's wall:
     its stanchions stand on that deck up to the island's top, and its pin rail is where the gear
     of a mast standing there is belayed. Without this the mizzen's halyards led 25 m forward to
     the waist's pins. Every hull without islands reads deck(u) and sheer(u), as before. */
  const deckAtU = u => { const d = H.islandDeck(u); return d === null ? H.deck(u) : d; };
  const railAtU = u => { const t = H.islandTop(u); return t === null ? H.sheer(u) : t; };
  const BW = S.bulwark || {};""")
rep("""      for (let i = 0; i <= NU; i++) {
        const u = 0.035 + (i / NU) * 0.93;
        const yD = deckAtU(u);
        if (!wallAt(u) || railAtU(u) - yD < yPin + 0.15) { flush(); continue; }""",
    """      let lastIsl;
      for (let i = 0; i <= NU; i++) {
        const u = 0.035 + (i / NU) * 0.93;
        const yD = deckAtU(u);
        /* a run ends where the deck under it changes, at an island's end (r343) */
        const isl = H.islandOf(u);
        if (i && isl !== lastIsl) flush();
        lastIsl = isl;
        if (!wallAt(u) || railAtU(u) - yD < yPin + 0.15) { flush(); continue; }""")

# E. the skid boat is stowed in the WAIST, between the islands
rep("""      const feet = (S.masts || []).map(m => xOf(m.at)).sort((a, b) => a - b);
      const x0 = (u - 0.5) * L;
      if (feet.some(xm => Math.abs(xm - x0) < bl / 2 + 0.35)) {
        const lo = (0.20 - 0.5) * L, hi = (0.80 - 0.5) * L;""",
    """      const feet = (S.masts || []).map(m => xOf(m.at)).sort((a, b) => a - b);
      const x0 = (u - 0.5) * L;
      /* ⚠ AND THE WAIST ENDS AT THE ISLANDS (round 343). On a ship with a forecastle and a
         quarterdeck the waist is the open deck between them, and the class's u 0.20 / 0.80 put
         the 74's boat through her quarterdeck's breast. The waist's ends are the islands' ends
         with 0.3 m clear; a hull without islands keeps 0.20 / 0.80. */
      let wLo = 0.20, wHi = 0.80;
      for (const isl of ((S.islands && S.islands.list) || [])) {
        if ((isl.u[0] + isl.u[1]) / 2 < 0.5) wLo = Math.max(wLo, isl.u[1]);
        else wHi = Math.min(wHi, isl.u[0]);
      }
      const islC = wLo > 0.20 || wHi < 0.80 ? 0.3 : 0;
      const lo = islC ? xOf(wLo) + islC : (0.20 - 0.5) * L, hi = islC ? xOf(wHi) - islC : (0.80 - 0.5) * L;
      if (feet.some(xm => Math.abs(xm - x0) < bl / 2 + 0.35) || x0 - bl / 2 < lo || x0 + bl / 2 > hi) {""")

# F. the taffrail crowns the stern's top, which is the quarterdeck's barricade where there is one
rep("""  if (rows || S.gunDecks) {
    const halfT = halfAt(fb) * 0.97;
    const hR = B * 0.055;
    const arc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xF, fb + hR, -halfT),
      new THREE.Vector3(xF, fb + hR * 1.35, 0),
      new THREE.Vector3(xF, fb + hR, halfT)]);""",
    """  /* ⚠ ON A SHIP WHOSE QUARTERDECK RUNS TO THE STERN THE TAFFRAIL CROWNS ITS BARRICADE (round
     343). The stern face goes on up past the sheer as the island's wall, and a rail left at the
     sheer stands in front of that wall, two surfaces a few centimetres apart. Here it rides the
     island's top: the ends on the top, the crown hR·0.35 over it (the rise above the shoulders
     the rail always had), and the balusters only where the arc stands clear of the top. */
  const islT = H.islandTop(1);
  if ((rows || S.gunDecks) && islT !== null) {
    const halfT = halfAt(fb) * 0.97, hR = B * 0.055;
    const arc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xF, islT, -halfT),
      new THREE.Vector3(xF, islT + hR * 0.35, 0),
      new THREE.Vector3(xF, islT, halfT)]);
    g.add(tag(new THREE.Mesh(
      new THREE.TubeGeometry(arc, 16, B * 0.011, 6, false), mats.woodDark), 'taffrail'));
  } else if (rows || S.gunDecks) {
    const halfT = halfAt(fb) * 0.97;
    const hR = B * 0.055;
    const arc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xF, fb + hR, -halfT),
      new THREE.Vector3(xF, fb + hR * 1.35, 0),
      new THREE.Vector3(xF, fb + hR, halfT)]);""")
rep("""        const crown = (S.sternLights || S.gunDecks) ? B * 0.055 + B * 0.011 : 0;
        const poopTop = ctS ? ctS.y + ctS.railH : H.sheer(1) + crown;""",
    """        const crown = (S.sternLights || S.gunDecks) ? B * 0.055 + B * 0.011 : 0;
        /* r343: where the quarterdeck runs to the stern the taffrail crowns its barricade */
        const islT1 = H.islandTop(1);
        const poopTop = ctS ? ctS.y + ctS.railH
          : islT1 !== null ? islT1 + ((S.sternLights || S.gunDecks) ? B * 0.055 * 0.35 + B * 0.011 : 0)
          : H.sheer(1) + crown;""")

# G. the fife rail stands on the deck the mast passes through where the crew works it: an island's
rep("""    if (mk.rig === 'square' && S.__belay) S.__belay.addFifeRail(mi, u, mxA(base), base, mastRAt(base));""",
    """    /* r343: a mast inside an island's span steps on the deck below and passes up through the
       island's deck, and the crew works its gear there: the fife rail stands on the island's deck */
    const fifeBase = (() => { const d = hullSurface(S).islandDeck(u); return d === null ? base : d; })();
    if (mk.rig === 'square' && S.__belay) S.__belay.addFifeRail(mi, u, mxA(fifeBase), fifeBase, mastRAt(fifeBase));""")


# H. a timber island's barricade carries the capping on its top (the wells' rule, r303)
rep("""      /* an island's side is the shell carried up past the sheer (r292): no deck edge here,
         and a capping ridden along the sheer would stand as a lip outside the island's wall */
      if (H.islandTop(u) !== null) return false;""",
    """      /* an island's side is the shell carried up past the sheer (r292): no deck edge here,
         and a capping ridden along the sheer would stand as a lip outside the island's wall.
         ⚠ r343: a TIMBER island's barricade is capped like any bulwark, on its own top (railAtU),
         the wells' rule (r303); a steel island's plating has no capping, as before */
      if (H.islandTop(u) !== null) return timberIsland;""")
rep("""  const railAtU = u => { const w = H.wellTop(u); return w !== null ? w - capH : H.sheer(u); };""",
    """  const timberIsland = !(S.build === 'steel' || S.build === 'iron');
  const railAtU = u => { const w = H.wellTop(u); if (w !== null) return w - capH;
    const it = timberIsland ? H.islandTop(u) : null; return it !== null ? it : H.sheer(u); };""")
# I. a fall with no pin ends on the deck at its station, which inside a built island is the island's
rep("""    return new THREE.Vector3((uc - 0.5) * L, deckAt(uc) + B * 0.012, sgn * hz);""",
    """    /* r343: inside a built island's span the deck is the island's; Preussen's jigger falls
       ran down through her poop deck to the main deck under it */
    const dI = FINE && S.islands ? H.islandDeck(uc) : null;
    return new THREE.Vector3((uc - 0.5) * L, (dI !== null ? dI : deckAt(uc)) + B * 0.012, sgn * hz);""")
rep("""      for (let i = 0; i <= NU; i++) {
        const u = 0.035 + (i / NU) * 0.93;
        if (!open(u)) { flush(); continue; }""",
    """      let lastIslC;
      /* r343: the grid plus a station 8 cm each side of every island end that faces a well, where
         the barricade's end post and the waist's stand (bulwarkFurnitureSpec), so each cap run
         reaches its post. A hull without islands walks the grid alone, as before. */
      const Ucap = [];
      for (let i = 0; i <= NU; i++) Ucap.push(0.035 + (i / NU) * 0.93);
      if (timberIsland) for (const isl of ((S.islands && S.islands.list) || [])) for (const ue of isl.u)
        if (ue > 0 && ue < 1) Ucap.push(ue - 0.08 / L, ue + 0.08 / L);
      Ucap.sort((a, b) => a - b);
      for (let i = 0; i < Ucap.length; i++) {
        const u = Ucap[i];
        /* r343: the capping steps at an island's end, so a run ends there */
        const islC = H.islandOf(u);
        if (i && islC !== lastIslC) flush();
        lastIslC = islC;
        if (!open(u)) { flush(); continue; }""")

# J. a fall led over the cap gets its fairlead on the cap's top, which on a timber island is its barricade's
rep("""      const fair = new THREE.Vector3(best.x, H.sheer(best.u) + rc * 1.6 + 0.02, sgn * (capHalf - rc * 0.35));""",
    """      /* r343: the cap's top at the pin's station, which over a timber island's span rides the
         barricade (buildFittings' railAtU): the fore tack's fairlead stood 2 m down inside the
         74's forecastle barricade, at the waist's cap height */
      const capBase = (() => { const it = (S.build === 'steel' || S.build === 'iron') ? null : H.islandTop(best.u); return it !== null ? it : H.sheer(best.u); })();
      const fair = new THREE.Vector3(best.x, capBase + rc * 1.6 + 0.02, sgn * (capHalf - rc * 0.35));""")
# K. a post each side of every break: the barricade ends on one, and so does the waist's bulwark
rep("""    stations.push({ u, fb: railAtU(u), yD: deckAtU(u) });
  }""",
    """    stations.push({ u, fb: railAtU(u), yD: deckAtU(u) });
  }
  /* ⚠ A BARRICADE ENDS ON A POST (round 343). The stations are a fixed pitch from u 0.05 and know
     nothing of an island's end, so the 74's forecastle pin rail ran 0.7 m past its last stanchion
     into the break. A post stands each side of every island end that faces a well, 8 cm from
     it: the island's end post and the waist's. A hull without islands adds none. */
  for (const isl of ((S.islands && S.islands.list) || [])) for (const ue of isl.u) {
    if (ue <= 0 || ue >= 1) continue;
    for (const uu of [ue - 0.08 / L, ue + 0.08 / L])
      if (uu > 0.035 && uu < 0.965 && wallAt(uu) && !stations.some(st => Math.abs(st.u - uu) < 0.3 / L && H.islandOf(st.u) === H.islandOf(uu)))
        stations.push({ u: uu, fb: railAtU(uu), yD: deckAtU(uu) });
  }
  stations.sort((a, b) => a.u - b.u);""")

p.write_text(s)
print('hull.js edited', len(s))
