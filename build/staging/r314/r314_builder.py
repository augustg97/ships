import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:80]); s = s.replace(a, b)

# 1. a running top of the last yard (and its roll) on this mast
rep("""    let prevYard = deckMax(u - 0.10, u + 0.10) + lower * 0.13;
""", """    let prevYard = deckMax(u - 0.10, u + 0.10) + lower * 0.13;
    /* r314 (0y¹⁴⁶): the top of the last yard crossed on this mast, its furled roll included: what a lowered
       hoisting yard above it comes to rest on (crossYard, below) */
    let lastYardTop = -Infinity;
""")

# 2. lower a furled hoisting yard inside crossYard
rep("""      const yg = new THREE.CylinderGeometry(slingsD / 2, slingsD / 2, yardLen, 16, 8);
      const ym = new THREE.Mesh(yg, woodDark);""", """      /* ── r314 (0y¹⁴⁶): A FURLED HOISTING YARD IS LOWERED ONTO THE CAP ─────────────────────────
         A topsail is taken in by letting go its halyard: the yard comes down its mast until it rests on
         the cap of the section below, and the sail is clewed up and furled there. Eckersberg's 1828
         painting of the Russian 74 Asow at anchor (build/staging/r312/plates/asow.jpg, about 30 px/m at
         the mizzen) shows every topsail yard down on its lower cap: the main topsail yard at row about
         1190 over the main cap at about 1215, the mizzen's at 1260 over its cap at 1283, the fore's at
         about 1315 over its cap at about 1340. Until r314 every hoisting yard stayed hoisted in the furled
         build. Every yard that rides a TIE over the head of section 1 or higher now comes down to the head
         of the section below it, or onto the yard below it with its roll where that stands higher (the
         upper topsail of a doubled rig comes down onto the lower topsail yard, which is fixed at the cap).
         A single-yard mast's yard (tie 0) is not lowered: no plate of a furled one-sail ship is read.
         The roll keeps the cloth of the SET sail, so its size is read from where the yard is hoisted to
         set, and the sail below keeps its own depth. CLASS: one plate reads it, for one ship. */
      const setY = yy;
      let loweredRec = null;
      if (FURLED && hoist && typeof hoist === 'object' && hoist.tie >= 1) {
        const capBelow = segHeads[hoist.tie - 1] !== undefined ? segHeads[hoist.tie - 1] : -Infinity;
        const floor = Math.max(capBelow, lastYardTop);
        const yl = floor + slingsD / 2 + 0.02;
        if (isFinite(floor) && yl < yy) {
          loweredRec = { setY: +setY.toFixed(3), onto: lastYardTop > capBelow ? 'the yard below' : 'the cap',
            floorY: +floor.toFixed(3), tie: hoist.tie,
            from: 'class (r314): a furled topsail yard is lowered onto its cap; read off Eckersberg\\'s 1828 Asow '
              + '(main, fore and mizzen topsail yards on their lower caps, rows 1190/1215, 1315/1340, 1260/1283); '
              + 'applied to every yard that rides a tie over section 1 or higher' };
          yy = yl;
        }
      }
      const yg = new THREE.CylinderGeometry(slingsD / 2, slingsD / 2, yardLen, 16, 8);
      const ym = new THREE.Mesh(yg, woodDark);""")

# 3. the roll's cloth from the set height
rep("""        ? Math.max(0.05, Math.sqrt(((yardLen * 0.96) * ((yy - prevYard) * 0.97) * 0.055)""",
    """        ? Math.max(0.05, Math.sqrt(((yardLen * 0.96) * ((setY - prevYard) * 0.97) * 0.055)""")

# 4. record it on the mesh
rep("""      if (courseRec) ym.userData.courseAt = Object.assign(courseRec, { y: yY, yPlan: yy });
""", """      if (courseRec) ym.userData.courseAt = Object.assign(courseRec, { y: yY, yPlan: yy });
      /* r314 (0y¹⁴⁶): a hoisting yard records whether it is lowered, and from where (A-YARD-LOWERED) */
      if (hoist && typeof hoist === 'object' && hoist.tie >= 1)
        ym.userData.lowered = loweredRec ? Object.assign(loweredRec, { y: +yY.toFixed(3) }) : { furled: FURLED, lowered: false };
""")

# 5. drop and prevYard from the set height; the top of this yard for the next
rep("""      const drop = yy - prevYard;
      prevYard = yy;
""", """      const drop = setY - prevYard;       // r314: the SET depth; a lowered yard keeps its sail's cloth
      prevYard = setY;
      lastYardTop = yY + slingsD / 2 + 2 * rRoll;
""")
open(p, 'w').write(s); print('ok')
