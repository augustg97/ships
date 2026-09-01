  /* ── THE FOUR-CLAW IRON ANCHORS, FROM THE RECORD:
     `ironAnchors: {sheetAtU?, pairAtU?, pairOffZ?, sheetShankM?, bowerShankM?,
                    clawFrac?, yaw?}`
     The Tiangong Kaiwu carries this object in two chapters. 錘鍛 gives the FORM
     (fetched whole, r184): 錘法先成四爪，以次逐節接身 — the forging method first
     makes the four claws, then joins them section by section to the shank; war-ships
     and sea-ships carry anchors up to a thousand jun; the anchor is the largest thing
     under furnace and hammer. 舟車 gives the INVENTORY (r174's own text): five or six
     iron anchors to a grain ship, the mightiest the 看家錨 at about 500 catties
     RECORDED, two worked at the head, two at the stern, the cable belayed to the two
     general's-posts and broken out by the yun-che windlass. No text gives a dimension:
     the sheet anchor's shank is a DERIVED default (2.4 m of wrought iron summing to
     the recorded ~300 kg), the pair's weight an inference at the 錘鍛 chapter's own
     300-catty anvil threshold, claw length a woodcut-proportion default — all named in
     the provenance. Drawn recovered on the foredeck, the bow-worked three only (the
     stern pair's stow surface is unresolved and NOT drawn — the record is not license
     to invent a deck): each lies as the fleet's stowed anchors lie (r182/r183), spun
     45° so two claws splay to the planking and two stand up, pitched to the rising
     foredeck's own gradient, settled onto the deck by its own measured box. Cables:
     the pair's led to the two general's-posts the text belays them to, the sheet's to
     the barrel that breaks it out. Silence draws nothing: only an ironAnchors record
     draws them. */
  if (S.ironAnchors) {
    const ia = S.ironAnchors;
    const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
      { color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
    const ag = new THREE.Group();
    const wl = S.windlass;
    const uW = wl ? (wl.atU || 0.10) : 0.10;
    const wLen = wl ? (wl.barrelLenM || B * 0.55) : B * 0.55;
    const wDia = wl ? (wl.barrelDiaM || 0.5) : 0.5;
    /* one anchor: origin at the crown, shank along +Y to the head ring */
    const makeAnchor = (shankL, clawL) => {
      const shD = shankL * 0.046;
      const g2 = new THREE.Group();
      g2.name = 'ia-grp';
      const crown = new THREE.Mesh(new THREE.SphereGeometry(shD * 0.85, 10, 8), ironG);
      crown.name = 'ia-crown'; g2.add(crown);
      const sh = new THREE.Mesh(
        new THREE.CylinderGeometry(shD * 0.42, shD * 0.55, shankL, 10), ironG);
      sh.name = 'ia-shank'; sh.position.y = shankL / 2; g2.add(sh);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(shD * 1.4, shD * 0.28, 8, 18), ironG);
      ring.name = 'ia-ring'; ring.position.y = shankL + shD * 1.1; g2.add(ring);
      /* four claws at 90°, each curving outward then up — the forged sweep read as
         two straight sections and a point, the woodcut's own two-part join */
      const clawD = shD * 0.80;
      for (let k = 0; k < 4; k++) {
        const cg2 = new THREE.Group();
        cg2.rotation.y = k * Math.PI / 2;
        const a1 = 1.19, l1 = clawL * 0.58;          // 68°: mostly outward
        const s1 = new THREE.Mesh(
          new THREE.CylinderGeometry(clawD * 0.40, clawD * 0.52, l1, 8), ironG);
        s1.name = 'ia-claw'; s1.rotation.z = -a1;
        s1.position.set(Math.sin(a1) * l1 / 2, Math.cos(a1) * l1 / 2, 0);
        cg2.add(s1);
        const P1x = Math.sin(a1) * l1, P1y = Math.cos(a1) * l1;
        const a2 = 0.38, l2 = clawL * 0.32;          // 22°: turning up
        const s2 = new THREE.Mesh(
          new THREE.CylinderGeometry(clawD * 0.30, clawD * 0.42, l2, 8), ironG);
        s2.name = 'ia-claw'; s2.rotation.z = -a2;
        s2.position.set(P1x + Math.sin(a2) * l2 / 2, P1y + Math.cos(a2) * l2 / 2, 0);
        cg2.add(s2);
        const ch = clawL * 0.18;
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(clawD * 0.34, ch, 8), ironG);
        tip.name = 'ia-tip'; tip.rotation.z = -a2;
        tip.position.set(P1x + Math.sin(a2) * (l2 + ch / 2 - 0.01),
                         P1y + Math.cos(a2) * (l2 + ch / 2 - 0.01), 0);
        cg2.add(tip);
        g2.add(cg2);
      }
      return g2;
    };
    /* stow one anchor lying on the foredeck: crown at u, head aft toward the winch,
       spun 45° on its own shank, pitched to the deck's gradient over its own length,
       settled by measurement (the r182/r183 rules) */
    const stow = (g2, shankL, u, offZ) => {
      const uA = Math.min(1, u + shankL / L);
      const s = (uA - u) > 1e-6
        ? (deckAtU(uA) - deckAtU(u)) / ((uA - u) * L) : 0;
      const q = new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(0, 1, 0), ia.yaw || 0);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), -Math.PI / 2 + Math.atan(s)));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), Math.PI / 4));
      g2.quaternion.copy(q);
      const yD = deckAtU(u);
      g2.position.set((u - 0.5) * L, yD, offZ);
      g2.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(g2);
      g2.position.y += (yD - bb.min.y);
      g2.updateMatrixWorld(true);
      /* the ring's world point, for the cable */
      return new THREE.Vector3(0, shankL + shankL * 0.046 * 1.1, 0)
        .applyMatrix4(g2.matrixWorld);
    };
    const cableTo = (from, to, r) => {
      const mid = from.clone().lerp(to, 0.5);
      mid.y = deckAtU(Math.max(0, Math.min(1, mid.x / L + 0.5))) + 0.07;
      const c = ropeMesh([[from, mid], [mid, to]], r, mats.ropeSolid || wood);
      if (c) { c.name = 'ia-cable'; ag.add(c); }
    };
    /* the sheet anchor, centreline, forward of the pair */
    if (ia.sheetShankM !== 0) {
      const shL = ia.sheetShankM || 2.4, clL = shL * (ia.clawFrac || 0.42);
      const g2 = makeAnchor(shL, clL);
      const ringP = stow(g2, shL, ia.sheetAtU != null ? ia.sheetAtU : 0.030, 0);
      ag.add(g2);
      /* its cable — the one the text names 本身 — led to the barrel that lifts it */
      const barrelPt = new THREE.Vector3(
        (uW - 0.5) * L - wLen * 0.18, deckAtU(uW) + 0.30 + wDia / 2, 0);
      cableTo(ringP, barrelPt, 0.035);
    }
    /* the head pair, one to each side, cables to their own general's-posts */
    if (ia.bowerShankM !== 0) {
      const shL = ia.bowerShankM || 2.0, clL = shL * (ia.clawFrac || 0.42);
      for (const sg of [1, -1]) {
        const g2 = makeAnchor(shL, clL);
        const ringP = stow(g2, shL, ia.pairAtU != null ? ia.pairAtU : 0.060,
                           sg * (ia.pairOffZ || 2.4));
        ag.add(g2);
        const postPt = new THREE.Vector3(
          (uW - 0.5) * L, deckAtU(uW) + 0.55, sg * (wLen / 2 + 0.13));
        cableTo(ringP, postPt, 0.030);
      }
    }
    group.add(tag(ag, 'ironAnchors'));
  }
