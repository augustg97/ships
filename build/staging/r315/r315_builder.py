import sys
p = sys.argv[1]
s = open(p).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# 1. the bare crossjack's record, after readHere
rep("""      const readHere = !!(fracRec && fracRec.from === 'record');
""", """      const readHere = !!(fracRec && fracRec.from === 'record');
      /* ── r315 (0y¹⁴⁹): THE CROSSJACK IS A BARE SPAR ────────────────────────────────────────────
         On a one-yard-per-segment rig the mizzen's lowest yard is the crossjack, and it spread the foot of
         the mizzen topsail. Falconer 1769, CROSS-JACK: "a sail extended on the lower yard of the mizen-mast
         ... This sail, however, has generally been found of little service, and is therefore very seldom
         used." Eckersberg's 1828 Asow at anchor shows the 74's crossjack bare: a pale spar, rows 1430-1449,
         with nothing rolled on it. So the yard is crossed with no sail set from it and no roll on it, and
         with none of a course's gear: no sheets, no tacks, no clew garnets, no buntlines. It keeps its
         lifts and braces, and the mizzen topsail still sheets to its arms. The record says why on the mast
         (crossjackProvenance); `crossjackSail: true` would bend one. A doubled rig's mizzen course (the
         clipper's, Preussen's) is drawn from its own record's yard list and is not this yard. */
      const bareRec = (courseRec && isMizzen && mk.crossjackSail !== true)
        ? { mast: mi, sail: false, from: mk.crossjackProvenance ? mk.crossjackProvenance.split(':')[0] : 'class (r315)' }
        : null;
""")
# 2. no roll on a bare yard
rep("""      const rRoll = FURLED
        ? Math.max""", """      const rRoll = FURLED && !bareRec
        ? Math.max""")
# 3. record on the mesh, after the yard is positioned
rep("""      ym.position.set(yX, yY, 0);
      /* r258: what holds""", """      ym.position.set(yX, yY, 0);
      if (bareRec) ym.userData.bare = Object.assign(bareRec, { y: +yY.toFixed(3) });   // r315: the crossjack carries no cloth
      /* r258: what holds""")
# 4. the yard list carries the flag
rep("""      mastYards.push({ yy: yY, cx: ym.position.x, half: yardLen / 2, drop, hoist, r: slingsD / 2, name: listName || kind, kind });""",
    """      mastYards.push({ yy: yY, cx: ym.position.x, half: yardLen / 2, drop, hoist, r: slingsD / 2, name: listName || kind, kind, bare: !!bareRec });""")
# 5. no cloth on it
rep("""      if (FURLED) {
        /* the roll lies along the braced yard itself, between its arms, bunt at the slings */""",
    """      if (bareRec) {
        /* r315 (0y¹⁴⁹): the crossjack is crossed bare, set or furled */
      } else if (FURLED) {
        /* the roll lies along the braced yard itself, between its arms, bunt at the slings */""")
# 6. no sheets or tacks
rep("""          if (k === 0) {
            lead(sheets, clew, u + 0.17, sgn, 'sheet');
            lead(tacks, clew, u - 0.15, sgn, 'tack');
          } else {""", """          if (k === 0) {
            if (!yd.bare) {   // r315: a bare crossjack has no clews to sheet or tack
              lead(sheets, clew, u + 0.17, sgn, 'sheet');
              lead(tacks, clew, u - 0.15, sgn, 'tack');
            }
          } else {""")
# 7. no clew garnets or buntlines
rep("""        if (fifeHere) {
          /* ── r283 (0y⁸⁶): EVERY TIER'S CLEWLINES""", """        if (fifeHere && !yd.bare) {   // r315: no clewlines or buntlines on a yard with no sail
          /* ── r283 (0y⁸⁶): EVERY TIER'S CLEWLINES""")
open(p, 'w').write(s)
print('builder edits applied')
