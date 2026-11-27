import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)
rep("""      g.traverse(o => { if (o.userData.tierGun || o.userData.islandGun) guns.push(o); if (o.userData.carriage) cars.push([o, box(o)]); });
      const nIsland = guns.filter(o => o.userData.islandGun).length;
      for (const o of guns) {
        const gi = o.userData.tierGun || o.userData.islandGun, b = box(o), len = gi.lenM, sg = Math.sign(b.max.z + b.min.z);
        const yC = (b.min.y + b.max.y) / 2, face = o.userData.islandGun ? Math.abs(SHIPS_HULL.surfacePoint(H, HSg, gi.u, 1)[2]) : faceAt(gi.u, yC);""",
"""      /* the barrels are found by PART KEY, not by the builder's userData, so a builder that writes no userData is still
         read (proof C, r340): 'gun' on a gun-decked hull is buildGuns' tier barrels, 'islandGun' the island's */
      const xAtG = u => (u - 0.5) * H.lwl + HSg.rake(u);
      const uOfX = x => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (xAtG(m) < x) a = m; else b = m; } return (a + b) / 2; };
      g.traverse(o => { if (!o.isMesh) return; let key = null;
        for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
        if ((key === 'gun' && H.gunDecks) || key === 'islandGun') if (o.geometry.type === 'CylinderGeometry') guns.push([o, key === 'islandGun']);
        if (key === 'gunCarriage' || o.userData.carriage) cars.push([o, box(o)]); });
      const nIsland = guns.filter(([, isl]) => isl).length;
      for (const [o, isl] of guns) {
        const b = box(o), len = o.geometry.parameters.height, sg = Math.sign(b.max.z + b.min.z);
        const yC = (b.min.y + b.max.y) / 2, gi = { u: uOfX((b.min.x + b.max.x) / 2) };
        const face = isl ? Math.abs(SHIPS_HULL.surfacePoint(H, HSg, gi.u, 1)[2]) : faceAt(gi.u, yC);""")
rep("""        const tag = (o.userData.islandGun ? 'island' : 'tier') + ` gun at u ${gi.u.toFixed(3)} side ${sg}`;""",
"""        const tag = (isl ? 'island' : 'tier') + ` gun at u ${gi.u.toFixed(3)} side ${sg}`;""")
rep("""        if (!o.userData.islandGun) continue;
        const xC""", """        if (!isl) continue;
        const xC""")
p.write_text(s); print('ok')
