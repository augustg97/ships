import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)
# the r359 rule's barrel test: a third outboard of the face (r360), not the centre outboard of it
rep("""           each with its centre within a port's width of a port's centre in x, between that port's sill and head, and
           outboard of the shell's half-breadth at the sheer there; and no port's span""",
"""           each with its centre within a port's width of a port's centre in x, between that port's sill and head, and
           crossing the shell's half-breadth at the sheer there (r360: a third outboard; A-GUN-SEATED tests how much); and no port's span""")
rep("""              for (const gp of mine) if (gp.y < q.sill || gp.y > q.head || Math.abs(gp.z) < half)""",
"""              for (const gp of mine) if (gp.y < q.sill || gp.y > q.head || Math.abs(gp.z) > half || Math.abs(gp.z) < half - 1.5)""")
# the new rule, after the r359 block
rep("""    /* ── A-STERN-ON-FACE (round 355): THE STERN'S FURNITURE STANDS ON THE FACE AT ITS OWN HEIGHT.""",
"""    /* ── A-GUN-SEATED (round 360): A GUN STANDS A THIRD OUTBOARD, MUZZLE OUT, AND ITS BREECH RESTS ON SOMETHING.
       buildGuns' comment said a third of the barrel stands outside the ship; its arithmetic (the skin plus 0.3 of the
       length) put 80% of every barrel outside, and one rotation for both sides turned every starboard muzzle inboard.
       r359's quarterdeck guns copied the 0.3, so their breeches hung 0.9 m over the deck with nothing under them.
       TEST, from the BUILT scene in hull space. (a) Every tier gun (userData.tierGun) and every island gun
       (userData.islandGun): the barrel's outboard end stands 0.28-0.40 of its length outboard of the face (the skin's
       half-breadth at the barrel's own height, read off the surface, for a tier gun; the sheer's half-breadth, the
       barricade's face, for an island gun), and the cylinder's narrow end (+y, the muzzle) points outboard. (b) Every
       island gun has exactly one carriage (userData.carriage) on its side within 0.3 m of it in x, whose lowest vertex
       stands within 0.02 m of islandDeck there, whose highest stands within 0.08 m of the barrel's axis above it, which
       stands wholly inside the face, and whose inboard end stands within 0.25 m of the breech (the cascabel's overhang)
       and no further inboard than the breech. */
    if (H.gunDecks || (H.islands && H.islands.list && H.islands.list.some(i => i.ports))) {
      const HSg = SHIPS_HULL.hullSurface(H); g.updateMatrixWorld(true);
      const invG = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const faceAt = (u, y) => { let a = 0, b = 1; if (SHIPS_HULL.surfacePoint(H, HSg, u, 1)[1] <= y) return Math.abs(SHIPS_HULL.surfacePoint(H, HSg, u, 1)[2]);
        for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSg, u, m)[1] < y) a = m; else b = m; }
        return Math.abs(SHIPS_HULL.surfacePoint(H, HSg, u, (a + b) / 2)[2]); };
      const box = o => new THREE.Box3().setFromObject(o).applyMatrix4(invG);
      const guns = [], cars = [], bad = {};
      const note = (k, ex) => { if (!bad[k]) bad[k] = { n: 0, ex }; bad[k].n++; };
      g.traverse(o => { if (o.userData.tierGun || o.userData.islandGun) guns.push(o); if (o.userData.carriage) cars.push([o, box(o)]); });
      const nIsland = guns.filter(o => o.userData.islandGun).length;
      for (const o of guns) {
        const gi = o.userData.tierGun || o.userData.islandGun, b = box(o), len = gi.lenM, sg = Math.sign(b.max.z + b.min.z);
        const yC = (b.min.y + b.max.y) / 2, face = o.userData.islandGun ? Math.abs(SHIPS_HULL.surfacePoint(H, HSg, gi.u, 1)[2]) : faceAt(gi.u, yC);
        const outer = sg > 0 ? b.max.z : -b.min.z, breech = sg > 0 ? b.min.z : -b.max.z, f = (outer - face) / len;
        const tag = (o.userData.islandGun ? 'island' : 'tier') + ` gun at u ${gi.u.toFixed(3)} side ${sg}`;
        if (!(f >= 0.28 && f <= 0.40)) note('a gun not a third outboard', `${tag}: ${(f * 100).toFixed(0)}% of the barrel outboard of the face`);
        const tip = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld).transformDirection(invG);
        if (o.geometry.parameters && o.geometry.parameters.radiusTop < o.geometry.parameters.radiusBottom && Math.sign(tip.z) !== sg)
          note('a gun with its muzzle inboard', tag);
        if (!o.userData.islandGun) continue;
        const xC = (b.min.x + b.max.x) / 2;
        const mine = cars.filter(([m, cb]) => Math.abs((cb.min.x + cb.max.x) / 2 - xC) < 0.3 && Math.sign(cb.max.z + cb.min.z) === sg);
        if (mine.length !== 1) { note('an island gun without one carriage', `${tag}: ${mine.length} carriage(s)`); continue; }
        const cb = mine[0][1], deck = HSg.islandDeck(gi.u);
        if (Math.abs(cb.min.y - deck) > 0.02) note('a carriage off its deck', `${tag}: trucks at ${cb.min.y.toFixed(3)}, the deck at ${deck.toFixed(3)}`);
        if (cb.max.y < yC || cb.max.y > yC + 0.08) note('a carriage not under its trunnions', `${tag}: carriage top ${cb.max.y.toFixed(3)}, the axis ${yC.toFixed(3)}`);
        const cOut = sg > 0 ? cb.max.z : -cb.min.z, cIn = sg > 0 ? cb.min.z : -cb.max.z;
        if (cOut > face + 0.005) note('a carriage through its barricade', `${tag}: carriage to ${cOut.toFixed(2)}, the face ${face.toFixed(2)}`);
        if (cIn - breech > 0.25 || cIn < breech - 0.005) note('a breech off its carriage', `${tag}: carriage's inboard end ${cIn.toFixed(2)}, the breech ${breech.toFixed(2)}`);
      }
      if (cars.length !== nIsland) note('carriages off the island-gun count', `${cars.length} carriages for ${nIsland} island guns`);
      for (const [k, { n, ex }] of Object.entries(bad)) say(v.id, k, `${n} case(s), e.g. ${ex}`);
    }
    /* ── A-STERN-ON-FACE (round 355): THE STERN'S FURNITURE STANDS ON THE FACE AT ITS OWN HEIGHT.""")
p.write_text(s); print('ok')
