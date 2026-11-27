# r358: an island may carry overDeckM (its deck's height over the main deck, from a table); islandRailM then follows.
# usage: python3 r358_edit.py <web dir>     — asserts every replace
import sys
W = sys.argv[1]
p = W + '/js/hull.js'; s = open(p).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""     quarterdeck's. islandDeck is the one derivation of the deck behind an island's top. */""",
"""     quarterdeck's. islandDeck is the one derivation of the deck behind an island's top. */
  /* ⚠ A TABLE GIVES THE DECK'S HEIGHT OVER THE DECK BELOW, NOT UNDER THE BARRICADE (round 358). Steel's Folio
     XXXII gives a 74's quarterdeck and forecastle as heights over the upper deck's plank. When the island records
     overDeckM [fwd, aft], its deck is deck(u) plus that, and the barricade (islandRailM) is what stands between the
     deck and the top. Without the field the deck is the top less railM, as before. */""")
rep("""  const islandRailM = u => {
    const isl = islandOf(u);
    return isl ? (isl.railM || S.islands.railM || 1.0) : null;
  };
  const islandDeck = u => { const t = islandTop(u); return t === null ? null : t - islandRailM(u); };""",
"""  const islandDeck = u => {
    const isl = islandOf(u);
    if (!isl) return null;
    const o = isl.overDeckM;
    return o ? deck(u) + o[0] + (o[1] - o[0]) * (u - isl.u[0]) / Math.max(1e-6, isl.u[1] - isl.u[0])
             : islandTop(u) - (isl.railM || S.islands.railM || 1.0);
  };
  const islandRailM = u => { const t = islandTop(u); return t === null ? null : t - islandDeck(u); };""")
# buildIslands
rep("""    const top = u => Math.max(H.islandTop(u), H.sheer(u) + 0.05);
    const iRail = isl.railM || railM;
    const g = new THREE.Group();""",
"""    const top = u => Math.max(H.islandTop(u), H.sheer(u) + 0.05);
    const iDeck = u => top(u) - H.islandRailM(Math.min(u1, Math.max(u0, u)));
    const g = new THREE.Group();""")
rep("const breast = isl.breastM ? (u => top(u) - iRail + isl.breastM) : null;", "const breast = isl.breastM ? (u => iDeck(u) + isl.breastM) : null;")
rep("      const u = stU(k), y = top(u) - iRail, [dx, h] = shellAt(u, y);", "      const u = stU(k), y = iDeck(u), [dx, h] = shellAt(u, y);")
rep("y: top(q.u) - iRail, z:", "y: iDeck(q.u), z:")
# islandCovers
rep("""    const u0 = isl.u[0], u1 = isl.u[1], iRail = isl.railM || railM;
    const top = u => Math.max(H.islandTop(u), H.sheer(u) + 0.05);""",
"""    const u0 = isl.u[0], u1 = isl.u[1];
    const top = u => Math.max(H.islandTop(u), H.sheer(u) + 0.05);
    const iDeck = u => top(u) - H.islandRailM(Math.min(u1, Math.max(u0, u)));""")
rep("y = Math.min(y, top(a + (b - a) * k / 16) - iRail);", "y = Math.min(y, iDeck(a + (b - a) * k / 16));")
rep("shellHalf(u, top(u) - iRail)", "shellHalf(u, iDeck(u))", 2)
assert 'iRail' not in s
# the gallery's sill cannot go under its floor
rep("""     light stands 0.12 m under the storey's top and the sill is what is left (read.storeys[].sillM says which) */""",
"""     light stands 0.12 m under the storey's top and the sill is what is left (read.storeys[].sillM says which), and
     never less than none: on Steel's own heights (r358) the 74's upper storey is 1.04 m and its 0.97 m light stands
     on the floor */""")
rep("    st.sillM = Math.min(SILL_M, st.topY - 0.12 - st.lightH - st.floorY);",
    "    st.sillM = Math.max(0, Math.min(SILL_M, st.topY - 0.12 - st.lightH - st.floorY));")
open(p, 'w').write(s)
print('hull.js ok')
s = open(p).read()
rep("  const L = S.lwl, B = S.beam, railM = S.islands.railM || 1.0;", "  const L = S.lwl, B = S.beam;")
rep("  const L = S.lwl, railM = I.railM || 1.0, cl = u =>", "  const L = S.lwl, cl = u =>")
open(p, 'w').write(s); print('trim ok')
