import sys, pathlib
root = pathlib.Path(sys.argv[1]); p = root / 'js/hull.js'; s = p.read_text()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:80], s.count(a)); s = s.replace(a, b)
# one carriage material, from the hull's record
rep("""/* ── A GUN'S TRUCK CARRIAGE (round 360) ──""",
"""/* the carriages' paint, from the hull's record (S.gunCarriage.paint); red is the capstan's red */
function carriageMat(S, fallback) {
  const red = S.gunCarriage && S.gunCarriage.paint === 'red';
  return red ? new THREE.MeshStandardMaterial({ color: 0x7a3226, roughness: 0.72 })
             : new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 0.78 });
}
/* ── A GUN'S TRUCK CARRIAGE (round 360) ──""")
rep("""      const cg = new THREE.Group(), P = isl.ports;
      const cMat = (P.carriage && P.carriage.paint === 'red')
        ? new THREE.MeshStandardMaterial({ color: 0x7a3226, roughness: 0.72 })   // the capstan's red (buildCapstans)
        : (gunMat.isMeshStandardMaterial ? new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 0.78 }) : gunMat);""",
"""      const cg = new THREE.Group(), cMat = carriageMat(S);
  for (let d = 0; d < decks; d++) {""")
# tier guns whose axis stands above the weather deck ride carriages on it
rep("""  const len = S.beam * 0.19, r = S.beam * 0.017;
  for (let d = 0; d < decks; d++) {""",
"""  const len = S.beam * 0.19, r = S.beam * 0.017;
  /* r360: a tier whose guns stand over the weather deck (the 74's upper tier, 0.9 m over the upper
     deck in the open waist) shows two thirds of each barrel inboard, so each rides a carriage on that
     deck. A tier under the deck (every lower tier, the Indiaman's only one) is not seen inboard and
     takes none. */
  const cg = new THREE.Group(), cMat = carriageMat(S);
  for (let d = 0; d < decks; d++) {""")
rep("""        bar.userData.tierGun = { deck: d, u, lenM: len };
        g.add(bar);""",
"""        bar.userData.tierGun = { deck: d, u, lenM: len };
        g.add(bar);
        if (p[1] - r > H.deck(u)) cg.add(gunCarriage(p[0], H.deck(u), p[1], Math.abs(p[2]), sgn, len, r, cMat));""")
rep("""  group.add(tag(g, 'gun'));
}""", """  group.add(tag(g, 'gun'));
  if (cg.children.length) group.add(tag(cg, 'gunCarriage'));
}""")
p.write_text(s); print('ok')
