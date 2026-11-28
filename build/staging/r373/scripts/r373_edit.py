import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)

# 1. the record's dimensions, stive and plan
rep("""    const blen = B * 0.26, sq = B * 0.042, ang = 0.70;   // 40° forward of athwart
""", """    /* ⚠ A RECORDED CATHEAD IS STEEL'S BEAM, SEATED ON THE FORECASTLE DECK (round 373). Steel (1822), Folio XLVI, gives
       each rate's cathead: the 74's is 1 ft 5½ in fore and aft by 1 ft 4½ in deep, 8 ft 6 in without board and 8 ft 6 in
       within it from the outside of the timber, "to stand square with the bow, and to stive upwards in every foot" 6 in
       (26.6°). His sheer draught (Book II) seats it: "the lower part comes on the plank of the deck at the side", the deck
       being the forecastle, where his glossary puts the catheads ("at the fore part of the forecastle"). Until r373 the
       74's cathead was the class beam, 0.61 m square and stived 3.4°, its underside 0.13 m under her sheer: 0.73 m under
       her forecastle deck and 1.1 m under her forecastle rail, so that no anchor hung from it could be laid on the rail.
       hull.cathead carries the record; without it the class beam below stands unchanged. Its sides stand plumb (Steel,
       Book III: "the sides standing perpendicular or plumb"), so the stive is a pitch in the beam's own vertical plane. */
    const CR = !S.iron && S.cathead && S.cathead.outM ? S.cathead : null;
    const blen = CR ? CR.inM + CR.outM : B * 0.26, sq = CR ? CR.sidedM : B * 0.042, ang = 0.70;   // 40° forward of athwart
    const dep = CR ? CR.deepM : sq, stv = CR ? Math.atan(CR.stivePerFt) : 0.06;
    /* "square with the bow": the beam's plan direction is the side's outward normal at the sheer, at its own station */
    const planAng = u => {
      if (!CR || CR.plan !== 'square') return ang;
      const a = surfacePoint(S, H, Math.max(0, u - 0.004), 1.0), b = surfacePoint(S, H, u + 0.004, 1.0);
      return Math.atan2(Math.abs(b[2]) - Math.abs(a[2]), b[0] - a[0]);
    };
    const kD = sq * 0.7;   // the supporter's siding and breadth (CLASS: Steel's table has no row for it)
""")
rep("""    const kneeAft = u => surfacePoint(S, H, u, 1.0)[0] - blen * 0.30 * Math.sin(ang) + sq * 0.7;
""", """    const kneeAft = u => CR ? surfacePoint(S, H, u, 1.0)[0] - (kD / 2 + 0.02) * Math.sin(planAng(u)) + kD * 0.75
                            : surfacePoint(S, H, u, 1.0)[0] - blen * 0.30 * Math.sin(ang) + sq * 0.7;
""")
# 2. the beam, its supporter, its placing
rep("""      const beam = new THREE.Mesh(new THREE.BoxGeometry(sq, sq, blen), catMat);
      beam.position.z = blen / 2;
      cg.add(beam);
      /* the supporting knee, from the topside up to the beam's underside */
      const kn = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.7, B * 0.06, sq * 0.7), catMat);
      kn.position.set(0, -B * 0.038, blen * 0.30);
      cg.add(kn);
      cg.position.set(pd[0], pd[1] + B * 0.012, sgn * pd[2] * 0.55);
      cg.rotation.y = sgn > 0 ? -ang : Math.PI + ang;    // outboard and forward, both sides
      cg.rotation.x = -sgn * 0.06;                       // a slight up-cant at the tip
""", """      const beam = new THREE.Mesh(new THREE.BoxGeometry(sq, dep, blen), catMat);
      beam.position.z = blen / 2;
      if (CR) beam.userData.catBeam = { sided: sq, deep: dep, len: blen };
      cg.add(beam);
      let seat = null;
      if (CR) {
        /* the beam's underside on the forecastle deck where its axis crosses the side; the supporter plumb under it,
           against the side just outboard of that crossing */
        const a = planAng(uc);
        cg.rotation.set(-stv, sgn > 0 ? -a : Math.PI + a, 0, 'YXZ');
        const d = new THREE.Vector3(0, 0, 1).applyEuler(cg.rotation);
        const yD = H.islandDeck(uc) !== null ? H.islandDeck(uc) : pd[1];
        const A = new THREE.Vector3(pd[0], yD + dep / 2 / Math.cos(stv), sgn * Math.abs(pd[2]));
        cg.position.copy(A).addScaledVector(d, -CR.inM);
        const hK = B * 0.06, zk = CR.inM + (kD / 2 + 0.02) / Math.cos(stv);
        const kn = new THREE.Mesh(new THREE.BoxGeometry(kD, hK + 0.05, kD), catMat);
        kn.rotation.x = stv;                              // plumb in the world
        kn.position.set(0, -dep / 2, zk).add(new THREE.Vector3(0, -hK / 2 + 0.025, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), stv));
        cg.add(kn);
        seat = { deck: +yD.toFixed(3), underside: +(A.y - dep / 2 / Math.cos(stv)).toFixed(3), u: +uc.toFixed(4), planDeg: +(a * 180 / Math.PI).toFixed(1),
                 stiveDeg: +(stv * 180 / Math.PI).toFixed(1), rule: 'Steel 1822: the lower part on the plank of the forecastle deck at the side; Folio XLVI, the 74\\'s column' };
      } else {
        /* the supporting knee, from the topside up to the beam's underside */
        const kn = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.7, B * 0.06, sq * 0.7), catMat);
        kn.position.set(0, -B * 0.038, blen * 0.30);
        cg.add(kn);
        cg.position.set(pd[0], pd[1] + B * 0.012, sgn * pd[2] * 0.55);
        cg.rotation.y = sgn > 0 ? -ang : Math.PI + ang;    // outboard and forward, both sides
        cg.rotation.x = -sgn * 0.06;                       // a slight up-cant at the tip
      }
""")
# 3. the sheaves at the record's size
rep("""        const shR = sq * 0.52, shT = Math.max(0.03, sq * 0.11);
        for (const k of [-1, 0, 1]) {
          const sh = new THREE.Mesh(new THREE.CylinderGeometry(shR, shR, shT, 14), mats.iron || catMat);
          sh.rotation.z = Math.PI / 2;
          sh.position.set(k * sq * 0.3, -sq * 0.08, blen - sq * 0.55);
""", """        const shR = CR ? CR.sheaveDiaM / 2 : sq * 0.52, shT = CR ? CR.sheaveThickM : Math.max(0.03, sq * 0.11);
        for (const k of [-1, 0, 1]) {
          const sh = new THREE.Mesh(new THREE.CylinderGeometry(shR, shR, shT, 14), mats.iron || catMat);
          sh.rotation.z = Math.PI / 2;
          /* the rims stand 0.6 sq under the axis either way, which is where the stopper's bight is hung (anchorStowOf) */
          sh.position.set(k * sq * 0.3, CR ? -sq * 0.6 + shR : -sq * 0.08, blen - sq * 0.55);
""")
# 4. the record the stow reads
rep("""      S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z, m: cg.matrix.toArray(), sq, blen, fwd, zSide, xSide: heel.x + ax.x * zSide });
""", """      const rec = { x: tip.x, y: tip.y, z: tip.z, m: cg.matrix.toArray(), sq, blen, fwd, zSide, xSide: heel.x + ax.x * zSide };
      if (CR) { rec.stiveTan = Math.tan(stv); rec.seat = seat; cg.userData.catSeat = seat; }
      S.__catheads.push(rec);
""")
# 5. the ring under a steeply stived beam
rep("""  const ring = new THREE.Vector3(cat.x, cat.y - (cat.sq ? cat.sq * 0.6 + 4 * ropeR + f.ringR * 1.06 : B * 0.035), cat.z);
""", """  const ring = new THREE.Vector3(cat.x, cat.y - (cat.sq ? cat.sq * 0.6 + 4 * ropeR + f.ringR * (1 + (cat.stiveTan != null ? cat.stiveTan : 0.06)) : B * 0.035), cat.z);
""")
# 6. the gunwale branch tests a recorded channel's solid, and keeps Steel's lining and bill-board
rep("""        for (const [px, py, pz, r] of gsamples) worst = Math.min(worst, clear(crown.clone().addScaledVector(xA, px).addScaledVector(yA, py).addScaledVector(zA, pz)) - r);
        const off = clear(crown) - f.rCrown;
        const cand = { t: deg, crown, xA, yA, zA, worst: worst + f.stockEnd + 0.03, cg: 9, off, score: worst, ok: worst >= 0 };
""", """        for (const [px, py, pz, r] of gsamples) worst = Math.min(worst, clear(crown.clone().addScaledVector(xA, px).addScaledVector(yA, py).addScaledVector(zA, pz)) - r);
        /* a recorded fore channel under the gunwale (the 74, r373): no part of the anchor in its solid or its bill-board */
        let cg = 9;
        if (FC && FC.rec) for (const [px, py, pz] of samples) cg = Math.min(cg, chanGap(crown.clone().addScaledVector(xA, px).addScaledVector(yA, py).addScaledVector(zA, pz)));
        worst = Math.min(worst, cg);
        const off = clear(crown) - f.rCrown;
        const cand = { t: deg, crown, xA, yA, zA, worst: worst + f.stockEnd + 0.03, cg, off, score: worst, ok: worst >= 0 };
""")
rep("""  if (b.board) {
    const top = H.islandTop(b.u) !== null ? H.islandTop(b.u) : b.sheer + 1.0;
    res.board = { x: bill.x, u: b.u, yLo: b.sheer + FC.tIn, yHi: top, t: BB_T, lift: +lift.toFixed(2), chanGap: +pick.cg.toFixed(3), sheer: b.sheer };
  }
""", """  if (b.board) {
    const top = H.islandTop(b.u) !== null ? H.islandTop(b.u) : b.sheer + 1.0;
    res.board = { x: bill.x, u: b.u, yLo: b.sheer + FC.tIn, yHi: top, t: BB_T, lift: +lift.toFixed(2), chanGap: +pick.cg.toFixed(3), sheer: b.sheer };
  }
  /* ⚠ ON THE GUNWALE OVER A RECORDED CHANNEL THE BILL-BOARD STILL STANDS (round 373). Steel's board is "carried upwards
     from the upperside of the channel to the top of the side", and his lining is where the bill rubs while fishing; both
     are the ship's, wherever the bill comes to rest. With the 74's cathead on her forecastle the bill rests on the top of
     the side, at the board's head. */
  if (b.gunwale && FC && FC.rec && bill.x >= FC.x0 && bill.x <= FC.x1)
    res.board = { x: bill.x, u: b.u, yLo: b.sheer + FC.tIn, yHi: b.top, t: BB_T, lift: 0, chanGap: +pick.cg.toFixed(3), sheer: b.sheer, head: true };
""")
# 7. the stow comment that described the 74's old cathead
rep("""     in Lever's figure the cathead stands over the gunwale. Where the top stands above the cathead (the 74's forecastle
     rail is 1.1 m over her cathead's tip, because her cathead stands at her sheer) the side above the bill is Steel's
     bill-board, and r370's stow on the board stands. */""", """     in Lever's figure the cathead stands over the gunwale. Where the top stands above the cathead the side above the bill
     is Steel's bill-board, and r370's stow on the board stands. No hull reaches that branch since r373: the 74's cathead
     was the one under its own top (1.1 m under her forecastle rail), and Steel seats it on her forecastle deck. */""")
open(p, 'w').write(s); print('ok')
