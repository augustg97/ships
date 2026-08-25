    /* ── THE WALLED YAKATA, FRAMED AND PLANKED (round 139; form round 117) ──────────
       The Busan boat-barrier scroll of 1593 — this hull's own plate — draws the
       commander's cabin as a CLOSED plank house under a ridged plank roof, and on
       several cabins it hangs CLOTH in wall openings. Round 117 drew the house as
       box slabs and recorded the curtain as not drawn; this round the house is
       carried structure and the curtain hangs. Each piece carries the next (the
       r133 law): groundsills on the yagura, corner posts sill to plate, wall plates
       at the eave line, and the walls are seam-planked boards landed on that frame
       — deckGeo stood on edge, so every board edge is geometry (the snapBand law).
       One opening a side under the eaves with jambs, head and sill timbers, the
       curtain lofted inside it; the doorway is a framed opening with the dark door
       recessed INTO it, not a plate proud of the wall. Footprint, eave line and the
       r117 ridge law are kept exactly: the ridge stands pitch*hw over the wall-top
       line and the eave tip drops pitch*ovh below it, which is what keeps gable
       hypotenuse and roof soffit on one line. Openings are DERIVED (plan-scale
       read, no Sengoku sekibune survives); the cloth is the scroll's. */
      const hl = (T.len || T.w) / 2;
      const eaveY = baseY + T.h;
      const wt = 0.06;
      const sillH = 0.07, plateH = 0.08;
      const bandLo = baseY + sillH, bandHi = eaveY - plateH;   // the planking spans the frame
      /* the frame: sills and plates, chamfered working timber */
      for (const sgn of [-1, 1]) {                             // side sills + wall plates
        const sill = new THREE.Mesh(plankGeo(0.10, sillH, hl * 2), timber);
        sill.rotation.y = Math.PI / 2;
        sill.position.set(xC, baseY + sillH / 2, sgn * (hw - wt / 2));
        tg.add(sill);
        const plate = new THREE.Mesh(plankGeo(0.10, plateH, hl * 2 + 0.06), timber);
        plate.rotation.y = Math.PI / 2;
        plate.position.set(xC, eaveY - plateH / 2, sgn * (hw - wt / 2));
        tg.add(plate);
      }
      for (const sgn of [-1, 1]) {                             // end sills + wall plates
        const sill = new THREE.Mesh(plankGeo(0.10, sillH, hw * 2 - wt * 2), timber);
        sill.position.set(xC + sgn * (hl - wt / 2), baseY + sillH / 2, 0);
        tg.add(sill);
        const plate = new THREE.Mesh(plankGeo(0.10, plateH, hw * 2 - wt * 2), timber);
        plate.position.set(xC + sgn * (hl - wt / 2), eaveY - plateH / 2, 0);
        tg.add(plate);
      }
      /* corner posts, one timber sill to plate, square with a working taper */
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        const px = xC + dx * (hl - B * 0.011), pz = dz * (hw - B * 0.011);
        tg.add(sparAB(new THREE.Vector3(px, baseY, pz),
                      new THREE.Vector3(px, eaveY, pz), B * 0.0190, B * 0.0165, timber));
      }
      /* a planked wall band: deckGeo stood on edge — width becomes height, the
         V-seamed face turns outboard, boards run the wall's length. rotY turns the
         seam face: +PI/2 -> +z, -PI/2 -> -z, 0 -> -x (fore), PI -> +x (aft) */
      const wallBand = (h, len, rotY) => {
        const g = deckGeo(h, wt, len, 0.30);
        g.rotateZ(Math.PI / 2);
        if (rotY) g.rotateY(rotY);
        return new THREE.Mesh(g, timber);
      };
      /* side walls: one opening a side under the eaves, curtain hung in it */
      const wo = 1.10, ho = 0.55;
      const headYo = eaveY - 0.28, sillYo = headYo - ho;
      const clothMatT = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.94,
                                                         side: THREE.DoubleSide });
      for (const sgn of [-1, 1]) {
        const zW = sgn * (hw - wt / 2);
        const rotY = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
        const lo = wallBand(sillYo - bandLo, hl * 2, rotY);          // sole to opening sill
        lo.position.set(xC, (bandLo + sillYo) / 2, zW);
        tg.add(lo);
        const hi = wallBand(bandHi - headYo, hl * 2, rotY);          // opening head to plate
        hi.position.set(xC, (headYo + bandHi) / 2, zW);
        tg.add(hi);
        const segL = (hl * 2 - wo) / 2;                              // beside the opening
        for (const dx of [-1, 1]) {
          const mid = wallBand(ho, segL, rotY);
          mid.position.set(xC + dx * (wo / 2 + segL / 2), (sillYo + headYo) / 2, zW);
          tg.add(mid);
        }
        /* the opening's own frame, proud of the planking like the posts */
        const zP = sgn * (hw - wt / 2 + 0.020);
        for (const dx of [-1, 1]) {                                  // jamb studs
          const jamb = new THREE.Mesh(plankGeo(0.05, 0.05, ho + 0.16), timber);
          jamb.rotation.x = Math.PI / 2;
          jamb.position.set(xC + dx * (wo / 2 + 0.025), (sillYo + headYo) / 2, zP);
          tg.add(jamb);
        }
        for (const [yF, dy] of [[headYo, 0.025], [sillYo, -0.025]]) { // head and sill timbers
          const strip = new THREE.Mesh(plankGeo(0.05, 0.05, wo + 0.26), timber);
          strip.rotation.y = Math.PI / 2;
          strip.position.set(xC, yF + dy, zP);
          tg.add(strip);
        }
        /* the curtain the scroll hangs in the opening — head under the head timber,
           hem sagging and swung a hand inboard; deterministic folds, single winding
           on DoubleSide (the r118 normals lesson) */
        const nC = 10, cpos = [], cidx = [];
        for (let i = 0; i <= nC; i++) {
          const t = i / nC, x = xC - wo / 2 + wo * t;
          const sag = 0.05 * Math.sin(Math.PI * t) + 0.02 * Math.sin(3 * Math.PI * t + 1.0);
          const zTop = sgn * (hw - wt - 0.015);
          const zHem = sgn * (hw - wt - 0.055 - 0.03 * Math.sin(2 * Math.PI * t));
          cpos.push(x, headYo - 0.01, zTop, x, sillYo - 0.06 + sag, zHem);
          if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
        cg.setIndex(cidx); cg.computeVertexNormals();
        tg.add(new THREE.Mesh(cg, clothMatT));
      }
      /* fore wall: the doorway framed, the dark door recessed into it */
      const doorMat = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
        { color: 0x17120c, roughness: 0.95 }));
      const doorW = 0.72, doorH = Math.min(T.h * 0.72, 1.5);
      const doorTop = bandLo + doorH;
      const endLen = hw * 2 - wt * 2, xF = xC - (hl - wt / 2);
      for (const dz of [-1, 1]) {                                  // planking beside the door
        const seg = wallBand(bandHi - bandLo, (endLen - doorW) / 2, 0);
        seg.position.set(xF, (bandLo + bandHi) / 2, dz * (doorW / 2 + (endLen - doorW) / 4));
        tg.add(seg);
      }
      const hdr = wallBand(bandHi - doorTop, doorW, 0);            // header over the door
      hdr.position.set(xF, (doorTop + bandHi) / 2, 0);
      tg.add(hdr);
      const xP = xC - hl - 0.012;
      for (const dz of [-1, 1]) {                                  // door jambs, proud
        const jamb = new THREE.Mesh(plankGeo(0.05, 0.05, doorH + 0.10), timber);
        jamb.rotation.x = Math.PI / 2;
        jamb.position.set(xP, bandLo + doorH / 2, dz * (doorW / 2 + 0.025));
        tg.add(jamb);
      }
      const lintel = new THREE.Mesh(plankGeo(0.05, 0.05, doorW + 0.26), timber);
      lintel.position.set(xP, doorTop + 0.025, 0);
      tg.add(lintel);
      const doorG = plankGeo(doorW - 0.04, 0.035, doorH - 0.04);   // the door itself, recessed
      doorG.rotateX(Math.PI / 2); doorG.rotateY(Math.PI / 2);
      const door = new THREE.Mesh(doorG, doorMat);
      door.position.set(xC - hl + 0.048, bandLo + doorH / 2, 0);
      tg.add(door);
      /* aft wall: planked full */
      const aft = wallBand(bandHi - bandLo, endLen, Math.PI);
      aft.position.set(xC + (hl - wt / 2), (bandLo + bandHi) / 2, 0);
      tg.add(aft);
      /* a waist batten each side — the scroll draws the wall planking in bands */
      for (const sgn of [-1, 1]) {
        const bat = new THREE.Mesh(plankGeo(B * 0.012, B * 0.010, hl * 2), pale);
        bat.rotation.y = Math.PI / 2;
        bat.position.set(xC, baseY + T.h * 0.55, sgn * hw);
        tg.add(bat);
      }
      /* the ridged plank roof — boards run ridge to eave with real seam edges;
         the r117 alignment law kept exactly */
      const ovh = Math.min(0.35, hw * 0.25);             // eaves overhang
      const pitch = 0.42;
      const ridgeY = eaveY + pitch * hw;                 // ridge over the wall-top line
      const tipY = eaveY - pitch * ovh;                  // eave tip, below it at the same pitch
      const slope = Math.hypot(hw + ovh, ridgeY - tipY);
      for (const sgn of [-1, 1]) {
        const plane = new THREE.Mesh(
          deckGeo(hl * 2 + ovh * 2, 0.045, slope, 0.30), pale);
        plane.rotation.x = sgn * Math.atan(pitch);
        plane.position.set(xC, (ridgeY + tipY) / 2 + 0.03, sgn * (hw + ovh) / 2);
        tg.add(plane);
      }
      /* gable boards close the triangle under each end of the roof, at the roof's
         pitch — corners truncated like every other working timber here, with the
         cuts INSIDE the triangle so the hypotenuse stays exactly on the soffit
         line (the r117 open-wedge law): vertical cuts at the feet, hidden by the
         posts, and a flat under the apex, hidden by the ridge cap */
      for (const sgn of [-1, 1]) {
        const c = 0.04, apX = pitch * hw;
        const shp = new THREE.Shape();
        shp.moveTo(-hw + c, 0); shp.lineTo(hw - c, 0);
        shp.lineTo(hw - c, pitch * c);
        shp.lineTo(c * 0.5, apX - pitch * c * 0.5);
        shp.lineTo(-c * 0.5, apX - pitch * c * 0.5);
        shp.lineTo(-hw + c, pitch * c); shp.closePath();
        const gable = new THREE.Mesh(
          new THREE.ExtrudeGeometry(shp, { depth: wt, bevelEnabled: false }), timber);
        gable.rotation.y = Math.PI / 2;
        gable.position.set(xC + sgn * hl - (sgn > 0 ? wt : 0), eaveY, 0);
        tg.add(gable);
      }
      const capR = new THREE.Mesh(                       // the ridge cap
        plankGeo(0.16, 0.07, hl * 2 + ovh * 2 + 0.10), timber);
      capR.rotation.y = Math.PI / 2;
      capR.position.set(xC, ridgeY + 0.06, 0);
      tg.add(capR);
