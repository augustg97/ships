
  /* ⚠ STEEL'S CHEEKS, LAID FROM THE HAWSE-HOLES' LINE (round 377). The cheeks are the two knees a side that bind the
     knee of the head to the bow: each has one arm along the ship's side and one along the knee, and the hawse-holes
     stand between them. Steel (1822), Folio XLIX, the 74's column: two cheeks a side, 2 ft 6 in apart "on a square at
     the stem"; arms 11 ft 9 in on the side and at least 6 ft 3 in on the knee; the lower cheek sided 1 ft 0 in at the
     after end and 7 in at the fore end, moulded 1 ft 2 in along the side and 5 in at the fore end; the upper cheek
     sided 11 in and 6 in, moulded 1 ft 1 in and 4¾ in. A cheek's arms lie in one nearly level plane, so its siding is
     its depth and its moulding is how far it stands off the side (Steel's sheer draught sets off "the siding or depth
     of the cheek"). Book II, for the 80 and the 74: "the situation of the hawse-holes may here determine the position
     of the upper edge of the lower cheek". The lines are cheekLines(): the gap centred at the stem on the lower tier's
     port line, the holes' CLASS line, and the holes then set between the cheeks at their own stations. On the knee the
     arm lifts forward on a CLASS curve (cheeks.kneeRiseFrom): Steel's Plate 38 is not online (r375). Where the knee of
     the head ends before the arm does, the arm stops 5 cm inside its fore edge and keeps the taper of its recorded
     length. Steel's Folio XLVIII also gives heights over the rabbet of the keel: the lower cheek's lower side at the
     stem 26 ft 3 in, the main rail's upper side 34 ft 0 in. The head's rails here are still CLASS, so the gap between
     the two is read and recorded (S.__headRead), and the record's contested field says where it disagrees. */
  if (S.cheeks && S.__hawse && S.__hawse.length) {
    const CL = cheekLines(S, H), CK = CL.CK, HB = hawseHoles(S, H);
    const half = CL.half, uT = CL.uT, yT = CL.yT;
    const xT = surfacePoint(S, H, uT, vAtY(S, H, uT, yT))[0];
    /* the knee's fore edge at a height, off the knee's own outline */
    const outline = shape.getPoints(24);
    const foreEdge = y => { let xm = Infinity;
      for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length];
        if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xm = Math.min(xm, a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)); }
      return xm; };
    const lift = d => CK.kneeRisePerM * d + CK.kneeCurve * d * d;
    const headRead = { cheeks: [] };
    const nSide = 26, nKnee = 10, embed = 0.01;
    for (const which of ['lower', 'upper']) {
      /* the knee arm: the table's length, unless the knee ends first */
      let armK = CK.armKneeM;
      for (let i = 0; i < 40; i++) {
        const yLo = CL.lowerSide(which, yT + lift(armK));
        const xf = Math.max(foreEdge(yLo), foreEdge(yLo + CL.dep(which, CK.armSideM + armK)));
        if (xT - armK >= xf + 0.05) break; armK *= 0.95; }
      const st = [];
      for (let k = 0; k <= nSide; k++) { const u = CL.uAtArc(CL.sideLen * (1 - k / nSide));
        st.push({ kind: 'side', u, s: CL.sOf(u), yRef: CL.yLine(u) }); }
      for (let k = 1; k <= nKnee; k++) { const d = armK * k / nKnee;
        st.push({ kind: 'knee', x: xT - d, s: CK.armSideM + d, yRef: yT + lift(d) }); }
      const pos = [], idx = [];
      const rows = st.map(p => {
        const dep = CL.dep(which, p.s), mo = CL.mould(which, p.s);
        const yLo = CL.lowerSide(which, p.yRef), yHi = yLo + dep;
        let inLo, inHi, n;
        if (p.kind === 'side') {
          inLo = surfacePoint(S, H, p.u, vAtY(S, H, p.u, yLo)); inHi = surfacePoint(S, H, p.u, vAtY(S, H, p.u, yHi));
          const um = Math.min(0.3, p.u + 0.002), ul = Math.max(0, p.u - 0.002), ym = (yLo + yHi) / 2;
          const a = surfacePoint(S, H, ul, vAtY(S, H, ul, ym)), b = surfacePoint(S, H, um, vAtY(S, H, um, ym));
          const tx = b[0] - a[0], tz = Math.abs(b[2]) - Math.abs(a[2]), tl = Math.hypot(tx, tz);
          n = [-tz / tl, tx / tl]; if (n[1] < 0) n = [-n[0], -n[1]];
          inLo = [inLo[0], yLo, Math.max(half, Math.abs(inLo[2])) - embed]; inHi = [inHi[0], yHi, Math.max(half, Math.abs(inHi[2])) - embed];
        } else {
          inLo = [p.x, yLo, half - embed]; inHi = [p.x, yHi, half - embed]; n = [0, 1];
        }
        const outLo = [inLo[0] + n[0] * mo, yLo, inLo[2] + n[1] * mo], outHi = [inHi[0] + n[0] * mo, yHi, inHi[2] + n[1] * mo];
        const base = pos.length / 3;
        for (const q of [inLo, outLo, outHi, inHi]) pos.push(q[0], q[1], q[2]);
        return { base, s: +p.s.toFixed(3), x: +inLo[0].toFixed(3), yLo: +yLo.toFixed(3), yHi: +yHi.toFixed(3), dep: +dep.toFixed(4), mo: +mo.toFixed(4),
                 kind: p.kind, u: p.u !== undefined ? +p.u.toFixed(5) : null };
      });
      for (let k = 0; k + 1 < rows.length; k++) {
        const a = rows[k].base, b = rows[k + 1].base;
        for (let j = 0; j < 4; j++) { const j1 = (j + 1) % 4; idx.push(a + j, b + j, b + j1, a + j, b + j1, a + j1); }
      }
      { const a = rows[0].base, b = rows[rows.length - 1].base; idx.push(a, a + 2, a + 1, a, a + 3, a + 2, b, b + 1, b + 2, b, b + 2, b + 3); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const stemRow = rows[nSide];
      headRead.cheeks.push({ which, armSideM: CK.armSideM, armKneeM: +armK.toFixed(3), kneeClamped: armK < CK.armKneeM - 1e-6,
                             stemYLo: stemRow.yLo, stemYHi: stemRow.yHi, stemX: +xT.toFixed(3), aft: rows[0], fore: rows[rows.length - 1] });
      for (const sgn of [-1, 1]) {
        const m = new THREE.Mesh(geo, mats.woodPale);
        if (sgn < 0) m.scale.z = -1;
        m.userData.headCheek = { which, sgn };
        group.add(tag(m, 'headCheek'));
      }
    }
    /* the gap at the stem, the holes' bolsters, and the class main rail's top at the stem against Steel's 7 ft 9 in */
    const lo = headRead.cheeks[0], up = headRead.cheeks[1];
    headRead.stemGapM = +(up.stemYLo - lo.stemYHi).toFixed(3);
    const rr = S.hawse.diaM / 2 + (S.hawse.pipeThickM || 0.03);
    headRead.holes = HB.holes.map(h => ({ c: h.c, u: +h.u.toFixed(4), y: +h.p[1].toFixed(3),
      bolsterBelowM: +(h.p[1] - rr - CL.lowerTop(h.u)).toFixed(3), bolsterAboveM: +(CL.upperBot(h.u) - h.p[1] - rr).toFixed(3) }));
    { const rc = rails[1][0]; let best = null;
      for (let i = 0; i <= 400; i++) { const q = rc.getPoint(i / 400); if (!best || Math.abs(q.x - xT) < Math.abs(best.x - xT)) best = q; }
      const hf = CK.heightsFt || {}, FT = 0.3048, ft = v => (Array.isArray(v) ? v[0] + v[1] / 12 : v);
      headRead.mainRailTopAtStem = +(best.y + railR).toFixed(3);
      headRead.lowerSideToMainRailM = +(best.y + railR - lo.stemYLo).toFixed(3);
      if (hf.mainRailUpperSideAtStem && hf.lowerCheekLowerSideAtStem)
        headRead.steelLowerSideToMainRailM = +((ft(hf.mainRailUpperSideAtStem) - ft(hf.lowerCheekLowerSideAtStem)) * FT).toFixed(3); }
    S.__headRead = headRead;
  }
