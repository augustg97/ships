import sys, pathlib
root = pathlib.Path(sys.argv[1]); p = root / 'js/hull.js'; s = p.read_text()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:80], s.count(a)); s = s.replace(a, b)

# 1. buildGuns: a third of the barrel outboard, as the comment says; the muzzle outboard on both sides
rep("""        bar.rotation.x = Math.PI / 2;                    // along the beam, pointing out
        bar.position.set(p[0], p[1], sgn * (p[2] + len * 0.30));
        g.add(bar);""",
"""        /* ⚠ A THIRD OF THE BARREL OUTBOARD (round 360). Until r360 the centre stood at the skin
           plus 0.3 of the length, which put 80% of every barrel outside the ship and left its
           breech in the air off the side. A third outboard puts the centre a sixth of the
           length inboard of the skin. And the cylinder's narrow end (the muzzle, +y) is turned
           outboard on BOTH sides: one rotation for both had every starboard gun's muzzle
           pointing inboard. */
        bar.rotation.x = sgn * Math.PI / 2;              // along the beam, the muzzle out
        bar.position.set(p[0], p[1], sgn * (Math.abs(p[2]) - len / 6));
        bar.userData.tierGun = { deck: d, u, lenM: len };
        g.add(bar);""")

# 2. island guns: seated a third outboard, on a truck carriage
rep("""      const gg = new THREE.Group(), len = B * 0.19 * 0.75, r = B * 0.017 * 0.75;
      for (const q of mine) for (const sgn of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 16), gunMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(xAt(q.u), (q.sill + q.head) / 2, sgn * (q.half + len * 0.30));
        gg.add(bar);
      }
      group.add(tag(gg, 'islandGun'));""",
"""      const gg = new THREE.Group(), len = B * 0.19 * 0.75, r = B * 0.017 * 0.75;
      const cg = new THREE.Group(), P = isl.ports;
      const cMat = (P.carriage && P.carriage.paint === 'red')
        ? new THREE.MeshStandardMaterial({ color: 0x7a3226, roughness: 0.72 })   // the capstan's red (buildCapstans)
        : (gunMat.isMeshStandardMaterial ? new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 0.78 }) : gunMat);
      for (const q of mine) for (const sgn of [-1, 1]) {
        const ya = (q.sill + q.head) / 2;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 16), gunMat);
        /* r360: a third outboard of the barricade's face, the muzzle outboard on both sides */
        bar.rotation.x = sgn * Math.PI / 2;
        bar.position.set(xAt(q.u), ya, sgn * (q.half - len / 6));
        bar.userData.islandGun = { u: q.u, lenM: len };
        gg.add(bar);
        cg.add(gunCarriage(xAt(q.u), iDeck(q.u), ya, q.half, sgn, len, r, cMat));
      }
      group.add(tag(gg, 'islandGun'));
      group.add(tag(cg, 'gunCarriage'));""")

# 3. the carriage builder, before islandPorts
rep("""/* ── PORTS IN AN ISLAND'S BARRICADE (round 359) ──""",
"""/* ── A GUN'S TRUCK CARRIAGE (round 360) ──────────────────────────────────────────────────
 * Falconer (1769, CANNON, pl. VII figs. 16-17): the sea carriage is "composed of two large
 * pieces of plank, called sides or cheeks, connected together by means of cross-pieces, which
 * are either bolts, axle-trees, or transoms. The two axle-trees are fixed across under the fore
 * and hinder parts of the carriage, being supported at their extremities by solid wooden wheels
 * called trucks. The transom is placed directly over the fore axle-tree, and exactly in the
 * middle of the height of the cheeks ... The height of the transom is equal to two diameters of
 * the shot, and the breadth to one diameter." And: "The breadth of the wheels is always equal to
 * that of the cheeks; but the height of the cheeks and diameter of the trucks must conform to
 * the height of the gun-ports above the deck."
 * So the carriage is built FROM the port: the trunnions sit on the cheeks' fore tops at the
 * barrel's axis, which is the port's centre, and the cheeks run down from there to the
 * axletrees on trucks standing on the deck. The shot's diameter d is the unit: the breech's
 * outer radius r is taken as 1.75 d (a gun's base ring is about 3.5 calibres across); the
 * cheeks are d thick, the trucks d broad. The cheeks step down three times toward the rear,
 * the bed lies on the hind axletree, and a quoin under the breech lays the gun level.
 * The barrel stands a third outboard of the face at zFace, so its breech is 2/3 of its length
 * inboard; the carriage runs from just inside the face to just short of the breech.
 * One merged mesh per gun, tagged userData.carriage, so the audit reads each against its gun.
 * The proportions other than Falconer's two are CLASS figures. */
function gunCarriage(x, yDeck, yAxis, zFace, sgn, len, r, mat) {
  const d = r / 1.75;
  const sF = 0.06, sT = len * (2 / 3 - 0.43), sR = len * (2 / 3 - 0.05);   // along the gun, inboard of the face
  const rTr = r * (1 - 0.28 * 0.43);                       // the barrel's radius at the trunnions
  const cheekIn = rTr + 0.01, wC = d;                      // the cheeks clasp the barrel
  const RF = Math.min(0.24, Math.max(0.12, (yAxis - yDeck) * 0.22)), RH = RF * 0.9;
  const axH = 1.1 * d;
  const yBot = yDeck + RF + axH / 2;                       // the cheeks' underside, on the fore axletree
  const hTop = yAxis - yBot;                               // the cheek's height at the trunnions
  const parts = [], M = new THREE.Matrix4();
  /* local frame: x along the ship, y up (from yDeck), s inboard from the face (mapped to z) */
  const put = (geo, lx, ly, ls) => {
    geo.applyMatrix4(M.makeTranslation(lx, ly, ls)); parts.push(geo); };
  /* the cheeks: a stepped plank in (s, y), d thick in x */
  for (const side of [-1, 1]) {
    const sh = new THREE.Shape(), y0 = yBot - yDeck, steps = 3;
    const sStep0 = Math.min(sR - 0.1, sT + 1.3 * d);
    sh.moveTo(sF, y0); sh.lineTo(sF, y0 + hTop); sh.lineTo(sStep0, y0 + hTop);
    const hRear = Math.max(2.2 * d, hTop * 0.45);
    for (let k = 1; k <= steps; k++) {
      const yk = y0 + hTop - (hTop - hRear) * k / steps;
      const sk = sStep0 + (sR - sStep0) * k / steps;
      sh.lineTo(sStep0 + (sR - sStep0) * (k - 1) / steps, yk);
      sh.lineTo(k === steps ? sR : sk, yk);
    }
    sh.lineTo(sR, y0); sh.lineTo(sF, y0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: wC, bevelEnabled: false });
    /* the shape is drawn in (x=s, y); turn it so its x runs along s (z) and its depth along x */
    geo.applyMatrix4(M.makeRotationY(-Math.PI / 2));     // shape x → −z ... then flip below
    geo.applyMatrix4(M.makeScale(1, 1, -1));             // s inboard → +z in the local frame
    geo.applyMatrix4(M.makeTranslation(side > 0 ? cheekIn + wC : -cheekIn, 0, 0));
    parts.push(geo);
  }
  /* the axletrees, across under the fore and hind ends, and the four trucks on them */
  const sAF = sF + RF + 0.03, sAH = sR - RH - 0.03, span = 2 * (cheekIn + wC) + 0.10;
  put(new THREE.BoxGeometry(span, axH, 1.3 * d), 0, RF, sAF);
  put(new THREE.BoxGeometry(span, yBot - yDeck - (RH - axH / 2), 1.3 * d), 0, (yBot - yDeck + RH - axH / 2) / 2, sAH);
  for (const [R, sA] of [[RF, sAF], [RH, sAH]]) for (const side of [-1, 1]) {
    const t = new THREE.CylinderGeometry(R, R, wC * 0.95, 14);
    t.applyMatrix4(M.makeRotationZ(Math.PI / 2));
    put(t, side * (cheekIn + wC / 2), R, sA);
  }
  /* the transom over the fore axletree, at the middle of the cheeks' height: 2d high, d broad */
  put(new THREE.BoxGeometry(2 * cheekIn, 2 * d, d), 0, yBot - yDeck + hTop / 2, sAF);
  /* the bed on the hind axletree, and the quoin under the breech */
  const yBed = yBot - yDeck + 0.4 * d;
  put(new THREE.BoxGeometry(2 * cheekIn, 0.8 * d, sR - sT - 0.1), 0, yBed, (sR + sT) / 2 + 0.05);
  const sB = len * 2 / 3 - 0.12, rB = r * (1 - 0.28 * 0.04);
  const qH = Math.max(0.02, (yAxis - yDeck) - rB - (yBed + 0.4 * d));
  put(new THREE.BoxGeometry(1.6 * rTr, qH, 0.32), 0, yBed + 0.4 * d + qH / 2, Math.min(sR - 0.17, sB));
  /* the trunnions, on the cheeks' fore tops */
  const tr = new THREE.CylinderGeometry(0.5 * d, 0.5 * d, 2 * (cheekIn + wC) + 0.04, 12);
  tr.applyMatrix4(M.makeRotationZ(Math.PI / 2));
  put(tr, 0, yAxis - yDeck, sT);
  /* merge: position and normal, non-indexed */
  let n = 0; const ga = parts.map(g => { const q = g.index ? g.toNonIndexed() : g; q.computeVertexNormals(); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const q of ga) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  /* place: local s → hull z on this side (s inboard from the face), y from the deck */
  geo.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -sgn));
  geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, yDeck, sgn * zFace));
  const m = new THREE.Mesh(geo, mat);
  m.userData.carriage = { x, sgn, yDeck, yAxis, zFace, sF, sR, sT };
  return m;
}

/* ── PORTS IN AN ISLAND'S BARRICADE (round 359) ──""")

# 4. PARTS key
rep("""  gun:      { stage: 3, name: 'Great guns',""",
"""  gunCarriage: { stage: 3, name: 'Gun carriages',
              what: 'Each quarterdeck gun rides a truck carriage: two stepped cheeks joined by a transom '
                  + 'and two axletrees, on four solid wooden trucks. Falconer (1769) gives the transom as two '
                  + 'shot diameters high and one broad, the trucks as broad as the cheeks, and the cheeks\\' height '
                  + 'as whatever brings the gun to its port. The other proportions are class figures. The '
                  + 'breeching and tackles that held a gun in its port are not drawn.' },
  gun:      { stage: 3, name: 'Great guns',""")
p.write_text(s); print('ok')
