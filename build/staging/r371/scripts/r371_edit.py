import sys
P = sys.argv[1] if len(sys.argv) > 1 else 'web/js/hull.js'
src = open(P).read()
J = 'build/staging/r371/scripts/js/'
def rep(old, new, n=1):
    global src
    c = src.count(old)
    assert c == n, (old[:80], c)
    src = src.replace(old, new)
# 1. the cathead: three sheaves in the outer end (Steel 1822's table, every rate), a thumb cleat on its fore side, and its frame recorded
rep("""      cg.rotation.x = -sgn * 0.06;                       // a slight up-cant at the tip
      group.add(tag(cg, 'cathead'));""",
"""      cg.rotation.x = -sgn * 0.06;                       // a slight up-cant at the tip
      /* ⚠ THREE SHEAVES IN THE OUTER END, AND THE STOPPER'S THUMB CLEAT (round 371). Steel (1822, the cathead's table):
         "In the outer end of each to have sheaves ... three", for every rate from the 100 to the smallest; Falconer (1769,
         CAT-HEADS): "two or three small wheels, or sheaves, of brass, or strong wood". They stand side by side on one pin
         across the beam, each in its own mortise, the rims proud of the underside where the fall leads down. Steel 1794
         (vol. 2) leads the anchor's stopper "over a large thumb cleat bolted to the cathead". Sheave diameter 1.04 of the
         beam's depth and the cleat's size are CLASS: Steel's table gives them, but its OCR is unreadable. */
      cg.updateMatrix();
      const fwd = new THREE.Vector3(1, 0, 0).applyEuler(cg.rotation).x < 0 ? 1 : -1;   // the local x side that faces forward
      {
        const shR = sq * 0.52, shT = Math.max(0.03, sq * 0.11);
        for (const k of [-1, 0, 1]) {
          const sh = new THREE.Mesh(new THREE.CylinderGeometry(shR, shR, shT, 14), mats.iron || catMat);
          sh.rotation.z = Math.PI / 2;
          sh.position.set(k * sq * 0.3, -sq * 0.08, blen - sq * 0.55);
          sh.userData.catSheave = true;
          cg.add(sh);
        }
        const cl = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.32, sq * 0.24, sq * 0.7), catMat);
        cl.position.set(fwd * sq * 0.66, 0, blen - sq * 0.55);
        cl.userData.thumbCleat = true;
        cg.add(cl);
      }
      group.add(tag(cg, 'cathead'));""")
rep("""      S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z });""",
"""      /* where the beam's axis crosses the side at the sheer (the stopper's end, the shank-painter's bolts abaft it) */
      const heel = cg.position, ax = tip.clone().sub(heel).normalize();
      const zSide = Math.max(0, (Math.abs(pd[2]) - Math.abs(heel.z)) / Math.max(1e-6, Math.abs(ax.z)));
      S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z, m: cg.matrix.toArray(), sq, blen, fwd, zSide, xSide: heel.x + ax.x * zSide });""")
# 2. buildAnchor: the stopper and the shank-painter replace the cat pendant
rep("""      const pend = ropeMesh([[new THREE.Vector3(cat.x, cat.y, cat.z), st.ring]], 0.018 + B * 0.0006, mats.ropeSolid || iron);
      if (pend) group.add(tag(pend, 'anchor', 'Cat pendant'));
""", open(J + 'stopper.js').read())
# 3. the parts
rep("""  cathead:  { stage: 3, name: 'Cathead',""",
"""  catStopper: { stage: 3, name: 'Anchor stopper',
              what: 'The rope the anchor hangs by at sea. Steel (1794) clinches one end round the cathead, passes '
                  + 'the other down through the anchor\\'s ring and back up over a thumb cleat on the cathead, and '
                  + 'makes it fast there; the end is hitched round a timber-head forward of the cathead. The cat '
                  + 'tackle that hoisted the anchor is unhooked once the stopper holds it.' },
  shankPainter: { stage: 3, name: 'Shank-painter',
              what: 'A chain bolted through the topside abaft the cathead (Steel 1822). It is passed under the '
                  + 'anchor\\'s inner arm and round the shank, and made fast with two or three turns, so that the '
                  + 'shank and the flukes are held up against the side while the stopper holds the ring.' },
  cathead:  { stage: 3, name: 'Cathead',""")
open(P, 'w').write(src)
print('ok')
# 4. the ring hangs on the stopper's bight under the cathead, not inside the beam's end
src = open(P).read()
rep("""  const ring = new THREE.Vector3(cat.x, cat.y - B * 0.035, cat.z);""",
"""  /* ⚠ THE RING HANGS BELOW THE CATHEAD, ON THE STOPPER'S BIGHT (round 371). Until r371 the ring's centre hung 0.035 B
     under the cathead's axis, and the ring's top stood up to 0.1 m inside the beam's underside on every catted hull. Its
     top now stands the stopper's bight (two rope diameters doubled) under the beam. */
  const ropeR = 0.018 + B * 0.0006;
  /* the sheaves' rims stand 0.10 of the beam's depth under it (0.60 sq from its axis), and the beam stives up 0.06 rad, so
     its underside a ring's radius inboard of the tip is 0.06 ringR lower again */
  const ring = new THREE.Vector3(cat.x, cat.y - (cat.sq ? cat.sq * 0.6 + 4 * ropeR + f.ringR * 1.06 : B * 0.035), cat.z);""")
open(P, 'w').write(src)
print('ok4')
