function gunCarriage(x, yDeck, yAxis, zFace, sgn, len, r, mat) {
  /* r362: MULLER'S CONSTRUCTION (A Treatise of Artillery, 1768, "Construction of ship and garrison carriages",
     pl. V figs. 16-18). The carriage is laid off FROM ITS GUN: every length below is the barrel's own. */
  const T = GUN_BARREL.t, c = r / (0.5 + T.vent / 14);       // the calibre (gunBarrelProfile's scale)
  const D = c * 20 / 21;                                     // the shot: Muller's 24-pounder, 5.547 in in a 5.824 in bore
  const pr = gunBarrelProfile(len, r);
  const Rb = Math.max(...pr.pts.map(p => p[0]));             // the base ring's radius
  const R2 = (0.5 + T.r2end / 14 + GUN_BARREL.rise) * c;     // the second reinforce ring's radius
  /* PLAN (fig. 18). C, the trunnions' centre, and D, the breech (the base ring), are 3/7 of the gun apart. The width
     within is the second reinforce ring's diameter at C and the base ring's at D, so the cheeks splay toward the
     rear. Each cheek is a calibre broad. The carriage runs back from D by the cascabel's length, and forward of C by
     half the trunnion's diameter and half the fore truck's. The fore part of the trunnion holes is the fore
     axletree's centre line; the hind axletree, 12 in broad, is centred on D. */
  const sD = len * 2 / 3, sT = sD - len * 3 / 7, sR = sD + GUN_BARREL.cascabel * c;
  const slope = (Rb - R2) / (sD - sT), half = s => R2 + slope * (s - sT), wC = c;
  /* ELEVATION (fig. 16). The side pieces are 4.5 shot high before and half that behind. The trunnion hole is a
     calibre, its centre a quarter inch under the side pieces' top. The trucks make up the rest: "the height of the
     side pieces and the diameter of the trucks depend on the height of the port-holes in ships from the deck".
     Muller's construction for new guns makes the fore trucks 4 shot across and the hind 3.5; that is the ceiling
     here. Where the port stands so high that even 4-shot trucks leave a gap, the side pieces are carried up to the
     trunnions and the stretch is recorded (contested): it is a quarterdeck port whose gun the model lays at the
     port's centre, where Muller lays it from the port's upper sill (the queue's next item). */
  const yTop = yAxis + 0.00635, hF0 = 4.5 * D, RFmax = 2 * D, RFmin = 1.5 * D;
  let RF = yTop - hF0 - yDeck, hF = hF0;
  if (RF > RFmax) { RF = RFmax; hF = yTop - yDeck - RF; }
  if (RF < RFmin) { RF = RFmin; hF = yTop - yDeck - RF; }
  const hR = hF / 2, RH = RF * 3.5 / 4;
  const y0 = yTop - hF - yDeck;                              // the side pieces' underside, over the deck (= RF)
  const sAF = sT - 0.5 * c, sAH = sD, sF = sAF - RF, axB = 0.3048;
  const hAF = 1.75 * D;                                      // the fore axletree's body: 42 parts of the shot's 24
  const parts = [], M = new THREE.Matrix4();
  /* local frame: x along the ship, y up (from yDeck), s inboard from the face (mapped to z) */
  const put = (geo, lx, ly, ls) => {
    geo.applyMatrix4(M.makeTranslation(lx, ly, ls)); parts.push(geo); };
  /* the side pieces: level over the fore half, the hind half "divided into four equal parts, beginning at the hind
     end" for the steps, the quarter round taken from the fore part, and the underside hollowed in a circular arc
     between the axletrees "to make them something lighter". The quarter round's radius (a shot) and the hollow's
     depth (half a shot) are CLASS figures; Muller gives neither. */
  const sMid = (sF + sR) / 2, q = Math.min(D, hF / 3), yT = y0 + hF;
  for (const side of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(sF, y0); sh.lineTo(sF, yT - q);
    for (let k = 1; k <= 6; k++) { const a = Math.PI / 2 * k / 6; sh.lineTo(sF + q - q * Math.cos(a), yT - q + q * Math.sin(a)); }
    sh.lineTo(sMid, yT);
    for (let k = 1; k <= 4; k++) {
      const yk = yT - (hF - hR) * k / 4;
      sh.lineTo(sMid + (sR - sMid) * (k - 1) / 4, yk); sh.lineTo(sMid + (sR - sMid) * k / 4, yk);
    }
    sh.lineTo(sR, y0);
    const h0 = sAH - axB / 2, h1 = sAF + axB / 2, dep = 0.5 * D;
    sh.lineTo(h0, y0);
    for (let k = 1; k < 12; k++) { const t = k / 12; sh.lineTo(h0 + (h1 - h0) * t, y0 + dep * Math.sin(Math.PI * t)); }
    sh.lineTo(h1, y0); sh.lineTo(sF, y0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: wC, bevelEnabled: false });
    geo.applyMatrix4(M.makeRotationY(-Math.PI / 2));     // shape x (s) → +z, the depth → −x
    geo.applyMatrix4(M.makeTranslation(side > 0 ? R2 + wC : -R2, 0, 0));
    /* the splay: x moves out by the inner line's slope along s, about the trunnions */
    const k = side * slope;
    geo.applyMatrix4(new THREE.Matrix4().set(1, 0, k, -k * sT, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
    parts.push(geo);
  }
  /* the axletrees, sunk into the side pieces (fig. 17) by half their bodies' height, their arms a shot across and
     carried out through the trucks; the trucks as broad as the side pieces, on the arms outside them */
  const armOut = s => half(s) + wC + 0.012 + wC;
  put(new THREE.BoxGeometry(2 * (half(sAF) + wC), hAF, axB), 0, y0, sAF);
  const hindTop = y0 + 0.625 * D, hindBot = RH - 0.625 * D;
  put(new THREE.BoxGeometry(2 * (half(sAH) + wC), hindTop - hindBot, axB), 0, (hindTop + hindBot) / 2, sAH);
  for (const [R, sA] of [[RF, sAF], [RH, sAH]]) {
    const arm = new THREE.CylinderGeometry(D / 2, D / 2, 2 * armOut(sA) + 0.03, 10);
    arm.applyMatrix4(M.makeRotationZ(Math.PI / 2)); put(arm, 0, R, sA);
    for (const side of [-1, 1]) {
      const t = new THREE.CylinderGeometry(R, R, wC, 16);
      t.applyMatrix4(M.makeRotationZ(Math.PI / 2));
      put(t, side * (half(sA) + wC + 0.012 + wC / 2), R, sA);
    }
  }
  /* the transom, directly over the fore axletree: a shot broad and two high, in the middle of the side pieces' height */
  put(new THREE.BoxGeometry(2 * half(sAF), 2 * D, D), 0, y0 + hF / 2, sAF);
  /* the bed on the hind axletree, and the quoin under the breech */
  const yBed = hindTop + 0.4 * c, sBed0 = sT + 0.1;
  put(new THREE.BoxGeometry(2 * half(sBed0), 0.8 * c, sR - sBed0 - 0.05), 0, yBed, (sR + sBed0 - 0.05) / 2);
  const sB = len * 2 / 3 - 0.12;
  /* the quoin's top meets the lowest point of the barrel over its 0.32 m: the base ring, where it lies on it */
  let rB = 0;
  for (let k = 0; k <= 16; k++) rB = Math.max(rB, gunBarrelRadiusAt(len, r, len * 2 / 3 - (Math.min(sR - 0.17, sB) - 0.16 + 0.32 * k / 16)));
  const qH = Math.max(0.02, (yAxis - yDeck) - rB - (yBed + 0.4 * c));
  put(new THREE.BoxGeometry(1.6 * R2, qH, 0.32), 0, yBed + 0.4 * c + qH / 2, Math.min(sR - 0.17, sB));
  /* the trunnions, a calibre across, in their holes on the side pieces' fore tops */
  const tr = new THREE.CylinderGeometry(0.5 * c, 0.5 * c, 2 * (half(sT) + wC) + 0.04, 12);
  tr.applyMatrix4(M.makeRotationZ(Math.PI / 2));
  put(tr, 0, yAxis - yDeck, sT);
  /* merge: position and normal, non-indexed */
  let n = 0; const ga = parts.map(g => { const qq = g.index ? g.toNonIndexed() : g; qq.computeVertexNormals(); n += qq.attributes.position.count; return qq; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const qq of ga) { pos.set(qq.attributes.position.array, o * 3); nor.set(qq.attributes.normal.array, o * 3); o += qq.attributes.position.count; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  /* place: local s → hull z on this side (s inboard from the face), y from the deck */
  /* z → −sgn·s; on the +z side x is mirrored too (the carriage is symmetric in x), so the
     transform is a turn, not a reflection, and the faces keep their winding */
  geo.applyMatrix4(new THREE.Matrix4().makeScale(-sgn, 1, -sgn));
  geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, yDeck, sgn * zFace));
  const m = new THREE.Mesh(geo, mat);
  m.userData.carriage = { x, sgn, yDeck, yAxis, zFace, sF, sR, sT,
    muller: { calibre: +c.toFixed(4), shot: +D.toFixed(4), halfFore: +R2.toFixed(4), halfHind: +Rb.toFixed(4),
              hFore: +hF.toFixed(4), hRule: +hF0.toFixed(4), truckFore: +RF.toFixed(4), truckHind: +RH.toFixed(4),
              contested: Math.abs(hF - hF0) > 0.005 ? `side pieces ${(hF - hF0).toFixed(3)} m off Muller's 4.5 shot: the trucks are held to ${RF === RFmax ? 'his 4-shot ceiling' : '1.5 shot'} and the gun is laid at its port's centre` : null } };
  return m;
}
