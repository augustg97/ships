import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)
rep("""       barricade's face, for an island gun), and the cylinder's narrow end (+y, the muzzle) points outboard. (b) Every
       island gun has exactly one carriage""",
"""       barricade's face, for an island gun), and the cylinder's narrow end (+y, the muzzle) points outboard. (b) Every
       island gun, and every tier gun whose barrel stands clear over the weather deck (H.deck; its inboard two thirds
       are seen there), has exactly one carriage""")
rep("""       stands within 0.02 m of islandDeck there,""", """       stands within 0.02 m of its deck there (islandDeck, or H.deck for a tier gun),""")
rep("""      const nIsland = guns.filter(([, isl]) => isl).length;""", """      let nCarried = 0;""")
rep("""        if (!isl) continue;
        const xC""", """        const r0 = (b.max.y - b.min.y) / 2;
        if (!isl && !(yC - r0 > HSg.deck(gi.u))) continue;
        nCarried++;
        const xC""")
rep("""        const cb = mine[0][1], deck = HSg.islandDeck(gi.u);""", """        const cb = mine[0][1], deck = isl ? HSg.islandDeck(gi.u) : HSg.deck(gi.u);""")
rep("""note('an island gun without one carriage'""", """note('a gun over its deck without one carriage'""")
rep("""      if (cars.length !== nIsland) note('carriages off the island-gun count', `${cars.length} carriages for ${nIsland} island guns`);""",
"""      if (cars.length !== nCarried) note('carriages off the gun count', `${cars.length} carriages for ${nCarried} guns standing over their decks`);""")
p.write_text(s); print('ok')
