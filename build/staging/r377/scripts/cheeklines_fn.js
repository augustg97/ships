/* ── STEEL'S CHEEK LINES ON THE BOW (round 377) ───────────────────────────────────────────
   hull.cheeks records the 74's two cheeks a side (Steel 1822, Folio XLIX). Their lines along the side are one
   function so that the cheeks (buildHead) and the hawse-holes (hawseHoles) read the same lines. The throat is where
   the side's half-breadth on the lower tier's port line comes down to the knee of the head's face (KNEE_TH). At the
   throat the record's gap is centred on that port line; the lower sides of both cheeks run parallel to it aft; each
   cheek's depth diminishes evenly over its recorded length (arm on the side plus arm on the knee), so the lower cheek's
   upper edge rises aft of the throat by the taper. s runs from the side arm's after end (0) to the throat (armSideM).
   holeY(u) is the middle of the gap at u: Steel's sheer draught sets the holes off "between the cheeks, leaving
   sufficient substance for the bolster", with "lines parallel to the cheeks for their upper and lower part". */
const KNEE_TH = S => S.beam * 0.035;
function cheekLines(S, H) {
  const CK = S.cheeks; if (!CK) return null;
  H = H || hullSurface(S);
  const vPort = sideBands(S).tiers[0].port;
  const yLine = u => surfacePoint(S, H, u, vPort)[1];
  const zAtY = (u, y) => Math.abs(surfacePoint(S, H, u, vAtY(S, H, u, y))[2]);
  const half = KNEE_TH(S) / 2;
  let a = 0.0002, b = 0.2; const y0 = yLine(0.01);
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (zAtY(m, y0) < half) a = m; else b = m; }
  const uT = (a + b) / 2;
  const sideU = [uT], sideAcc = [0];
  { let acc = 0, u = uT, prev = surfacePoint(S, H, uT, vPort);
    while (acc < CK.armSideM && u < 0.3) { u += 0.0004; const p = surfacePoint(S, H, u, vPort);
      acc += Math.hypot(p[0] - prev[0], p[2] - prev[2]); prev = p; sideU.push(u); sideAcc.push(acc); } }
  const sideLen = sideAcc[sideAcc.length - 1], uAft = sideU[sideU.length - 1];
  const arcAt = u => { if (u <= uT) return 0; let i = 1; while (i < sideU.length - 1 && sideU[i] < u) i++;
    const t = Math.max(0, Math.min(1, (u - sideU[i - 1]) / (sideU[i] - sideU[i - 1]))); return sideAcc[i - 1] + (sideAcc[i] - sideAcc[i - 1]) * t; };
  const uAtArc = r => { let i = 1; while (i < sideAcc.length - 1 && sideAcc[i] < r) i++;
    const t = Math.max(0, Math.min(1, (r - sideAcc[i - 1]) / Math.max(1e-9, sideAcc[i] - sideAcc[i - 1]))); return sideU[i - 1] + (sideU[i] - sideU[i - 1]) * t; };
  const total = CK.armSideM + CK.armKneeM;
  const sOf = u => CK.armSideM * (1 - arcAt(u) / sideLen);
  const dep = (which, s) => { const P = CK[which].sidedM; return P[0] + (P[1] - P[0]) * s / total; };
  const mould = (which, s) => { const P = CK[which].mouldedM; return P[0] + (P[1] - P[0]) * s / total; };
  const dStem = dep('lower', CK.armSideM);
  /* the lower side of each cheek, off the reference height yRef (the port line on the side, its continuation on the knee) */
  const lowerSide = (which, yRef) => which === 'lower' ? yRef - CK.stemGapM / 2 - dStem : yRef + CK.stemGapM / 2;
  const lowerTop = u => lowerSide('lower', yLine(u)) + dep('lower', sOf(u));
  const upperBot = u => lowerSide('upper', yLine(u));
  return { CK, uT, yT: yLine(uT), uAft, sideLen, total, half, yLine, sOf, uAtArc, dep, mould, lowerSide, lowerTop, upperBot,
           holeY: u => (lowerTop(u) + upperBot(u)) / 2 };
}

