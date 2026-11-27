import sys
W = sys.argv[1]; p = W + '/js/hull.js'; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, ('anchor', a[:80], s.count(a))
    s = s.replace(a, b, 1)

# 1. a PARTS key of its own (the audit's ochre-band rule reads every 'gun')
rep("""  gun:      { stage: 3, name: 'Great guns',""",
"""  islandGun: { stage: 3, name: 'Quarterdeck guns',
              what: 'The guns on the quarterdeck, one in each port cut in its barricade. Steel (1805) '
                  + 'gives a 74 seven such ports a side, 2 ft 9 in wide and 2 ft 6 in deep, with the sill '
                  + '1 ft 10 in over the deck. He gives their number and size but not their stations; the '
                  + 'model spaces them evenly between the breast and the quarter gallery.' },
  gun:      { stage: 3, name: 'Great guns',""")

# 2. the one derivation of an island's ports
rep("""function buildIslands(S, group, hullMat) {""",
"""/* ── PORTS IN AN ISLAND'S BARRICADE (round 359) ──────────────────────────────────────────
 * isl.ports = { n, wM, hM, sillM, u: [first, last], capM }: n ports a side, wM wide and hM deep,
 * the sill sillM over the island's deck (H.islandDeck), centres spaced evenly from u[0] to u[1].
 * The head is kept capM under the barricade's top (islandTop); where the record's head would
 * stand higher the port is cut down and the read says by how much (clipM). The shader's
 * rectangles (uQP) and the guns are both placed from this list, so a gun cannot stand in a
 * blank plank. Returned per port: u, the sill and head in metres, the half-width in u, and the
 * shell's half-breadth at the sheer there (the barricade's face). */
function islandPorts(S, H) {
  const out = [];
  if (!(S.islands && S.islands.list)) return out;
  const L = S.lwl, xAt = u => (u - 0.5) * L + H.rake(u);
  for (const isl of S.islands.list) {
    const P = isl.ports;
    if (!P || !(P.n > 0) || !P.u) continue;
    for (let i = 0; i < P.n; i++) {
      const u = P.n > 1 ? P.u[0] + (P.u[1] - P.u[0]) * i / (P.n - 1) : P.u[0];
      const sill = H.islandDeck(u) + P.sillM, want = sill + P.hM;
      const head = Math.min(want, H.islandTop(u) - (P.capM || 0));
      const dxdu = (xAt(Math.min(1, u + 0.002)) - xAt(Math.max(0, u - 0.002))) / 0.004;
      out.push({ island: isl.name, u, sill, head, clipM: Math.max(0, want - head), halfU: P.wM / 2 / dxdu,
                 half: Math.abs(surfacePoint(S, H, u, 1.0)[2]) });
    }
  }
  return out;
}

function buildIslands(S, group, hullMat) {""")

# 3. the wall material takes the rectangles
rep("""                    uHGrpN: { value: 0 }, uCopper: { value: 0 } } })""",
"""                    uHGrpN: { value: 0 }, uCopper: { value: 0 }, ...qpUniforms() } })""")
rep("""  const wlV = hullMat.uniforms.uWaterline ? hullMat.uniforms.uWaterline.value : 0.62;
  /* the loft's (u, v) of a point on the wall at station u and height y (the freeboard's scale) */
  const wallUV = (u, y) => [u, wlV + (1 - wlV) * y / Math.max(0.5, H.sheer(Math.max(0, Math.min(1, u))))];""",
"""  /* the loft's (u, v) of a point on the wall at station u and height y (the freeboard's scale) */
  const wallUV = (u, y) => [u, wlV + (1 - wlV) * y / Math.max(0.5, H.sheer(Math.max(0, Math.min(1, u))))];""")
rep("""  const timberWall = !(S.build === 'steel' || S.build === 'iron') && !S.iron && hullMat.fragmentShader === HULL_FRAG;""",
"""  const timberWall = !(S.build === 'steel' || S.build === 'iron') && !S.iron && hullMat.fragmentShader === HULL_FRAG;
  const wlV = hullMat.uniforms.uWaterline ? hullMat.uniforms.uWaterline.value : 0.62;
  const wallV = (u, y) => wlV + (1 - wlV) * y / Math.max(0.5, H.sheer(Math.max(0, Math.min(1, u))));
  const QP = timberWall ? islandPorts(S, H).slice(0, 8) : [];
  function qpUniforms() {
    const a = [];
    for (let i = 0; i < 8; i++) {
      const q = QP[i];
      a.push(q ? new THREE.Vector4(q.u, q.halfU, wallV(q.u, q.sill), wallV(q.u, q.head)) : new THREE.Vector4());
    }
    /* a 2 cm edge, in u and in v at this hull's freeboard scale */
    return { uQPN: { value: QP.length }, uQP: { value: a },
             uQPSoft: { value: new THREE.Vector2(0.02 / L, 0.02 * (1 - wlV) / Math.max(0.5, H.sheer(0.5))) } };
  }""")

# 4. the guns in them, and the read
rep("""    group.add(tag(g, 'forecast', isl.name, isl.what));""",
"""    group.add(tag(g, 'forecast', isl.name, isl.what));
    const mine = QP.filter(q => q.island === isl.name);
    if (mine.length) {
      g.userData.islandPorts = mine.map(q => ({ u: +q.u.toFixed(4), sill: +q.sill.toFixed(3), head: +q.head.toFixed(3),
                                                clipM: +q.clipM.toFixed(3), halfU: +q.halfU.toFixed(5) }));
      /* a gun in every port, the tier guns' barrel at three quarters of its bore and length (a
         quarterdeck gun is a lighter piece), on the port's centre, pointing out through the
         barricade's face at the sheer's half-breadth */
      const gg = new THREE.Group(), len = B * 0.19 * 0.75, r = B * 0.017 * 0.75;
      const gunMat = S.__gunMat || new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.55, metalness: 0.35 });
      for (const q of mine) for (const sgn of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 16), gunMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(xAt(q.u), (q.sill + q.head) / 2, sgn * (q.half + len * 0.30));
        gg.add(bar);
      }
      group.add(tag(gg, 'islandGun'));
    }""")
open(p, 'w').write(s); print('ok')
