
    /* ── A-CHEEK (round 377): STEEL'S CHEEKS ARE THEIR RECORD, ON THE BOW, WITH THE HAWSE-HOLES BETWEEN THEM.
       Where hull.cheeks is recorded: (a) two cheeks a side, tagged 'headCheek'; (b) each cheek's depth (its siding) and
       its standing-off from the side (its moulding) at its after and fore ends are the record's within 1 cm; (c) where
       the cheeks reach the knee's face (the throat, at the stem) the clear gap between them is the record's 'distance
       between the cheeks on a square at the stem' within 1 cm; (d) every hawse-hole stands between the cheeks at its
       own station, its pipe's outer edge at least 5 cm clear of both (Steel: 'leaving sufficient substance for the
       bolster'); (e) along the side arm the cheek's inner face lies on the skin: the audit bisects the station where
       the skin's half-breadth at the face's height equals the face's, and the face must stand within 6 cm of it;
       (f) silence is convicted, not the answer (r108): a knee arm shorter than the record's 'at least', or a main rail
       more than 0.15 m off Steel's height over the lower cheek, needs a contested field. */
    if (H.cheeks) {
      const CK = H.cheeks, HSc = SHIPS_HULL.hullSurface(H);
      const vAtYc = (u, y) => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSc, u, m)[1] < y) a = m; else b = m; } return (a + b) / 2; };
      const ck = {}; let nCk = 0;
      g.traverse(o => {
        if (!(o.isMesh && o.userData.part && o.userData.part.key === 'headCheek')) return;
        nCk++;
        const d = o.userData.headCheek || {};
        if (d.sgn !== 1) return;
        const P = o.geometry.attributes.position, rows = [];
        for (let i = 0; i + 3 < P.count; i += 4) {
          const q = k => [P.getX(i + k), P.getY(i + k), P.getZ(i + k)];
          const inLo = q(0), outLo = q(1), outHi = q(2), inHi = q(3);
          rows.push({ x: inLo[0], yLo: inLo[1], yHi: inHi[1], zIn: (inLo[2] + inHi[2]) / 2,
                      dep: inHi[1] - inLo[1], mo: Math.hypot(outLo[0] - inLo[0], outLo[2] - inLo[2]) });
        }
        ck[d.which] = rows;
      });
      if (nCk !== 4 || !ck.lower || !ck.upper) say(v.id, 'cheeks off their recorded number', `${nCk} drawn, 4 recorded (two a side)`);
      else {
        for (const w of ['lower', 'upper']) {
          const R = CK[w], rows = ck[w], a = rows[0], f = rows[rows.length - 1];
          const kneeArm = Math.abs(rows.find(r => r.zIn <= rows[rows.length - 1].zIn + 0.02).x - f.x);
          const fullTot = CK.armSideM + CK.armKneeM, tot = CK.armSideM + kneeArm;
          if (Math.abs(a.dep - R.sidedM[0]) > 0.01 || Math.abs(f.dep - R.sidedM[1]) > 0.01)
            say(v.id, 'a cheek off its recorded siding', `${w}: ${a.dep.toFixed(3)} m deep aft and ${f.dep.toFixed(3)} m forward, recorded ${R.sidedM.join(' and ')}`);
          /* the taper runs over the drawn length, so the fore end's figure is the record's only where the knee arm is whole */
          if (Math.abs(a.mo - R.mouldedM[0]) > 0.01 || (Math.abs(tot - fullTot) < 0.05 && Math.abs(f.mo - R.mouldedM[1]) > 0.01))
            say(v.id, 'a cheek off its recorded moulding', `${w}: stands ${a.mo.toFixed(3)} m off the side aft and ${f.mo.toFixed(3)} m forward, recorded ${R.mouldedM.join(' and ')}`);
          if (kneeArm < CK.armKneeM - 0.05 && !CK.contested)
            say(v.id, 'a cheek\'s knee arm short of its record, unstated', `${w}: ${kneeArm.toFixed(2)} m on the knee, recorded at least ${CK.armKneeM} m, and the record has no contested field`);
          /* (e) the side arm on the skin */
          for (const r of rows) {
            if (r.zIn < rows[rows.length - 1].zIn + 0.05) continue;
            const y = (r.yLo + r.yHi) / 2;
            let lo = 0.0005, hi = 0.4;
            for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Math.abs(SHIPS_HULL.surfacePoint(H, HSc, m, vAtYc(m, y))[2]) < r.zIn) lo = m; else hi = m; }
            const sp = SHIPS_HULL.surfacePoint(H, HSc, (lo + hi) / 2, vAtYc((lo + hi) / 2, y));
            if (Math.abs(sp[0] - r.x) > 0.06) { say(v.id, 'a cheek off the bow', `${w}: its inner face at x ${r.x.toFixed(2)} stands ${Math.abs(sp[0] - r.x).toFixed(3)} m from the skin at its own height and half-breadth`); break; }
          }
        }
        /* interpolate a cheek's row at x */
        const at = (rows, x) => { for (let i = 0; i + 1 < rows.length; i++) { const a = rows[i], b = rows[i + 1];
            if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) { const t = (x - a.x) / (b.x - a.x); return { yLo: a.yLo + (b.yLo - a.yLo) * t, yHi: a.yHi + (b.yHi - a.yHi) * t }; } }
          return null; };
        const kneeZ = ck.lower[ck.lower.length - 1].zIn;
        const thr = ck.lower.find(r => r.zIn <= kneeZ + 0.02);
        const L0 = at(ck.lower, thr.x), U0 = at(ck.upper, thr.x);
        if (!L0 || !U0) say(v.id, 'cheeks with no common station at the stem', `the lower cheek reaches the knee at x ${thr.x.toFixed(2)} and the upper does not span it`);
        else if (Math.abs((U0.yLo - L0.yHi) - CK.stemGapM) > 0.01)
          say(v.id, 'cheeks off their recorded distance at the stem', `${(U0.yLo - L0.yHi).toFixed(3)} m clear at the throat, recorded ${CK.stemGapM} m`);
        /* (d) the hawse-holes between the cheeks */
        if (H.hawse) {
          const rr = H.hawse.diaM / 2 + (H.hawse.pipeThickM || 0.03);
          g.traverse(o => {
            if (!(o.isGroup && o.userData.part && o.userData.part.key === 'hawse' && o.position.z > 0)) return;
            const x = o.position.x, y = o.position.y, Lh = at(ck.lower, x), Uh = at(ck.upper, x);
            if (!Lh || !Uh) { say(v.id, 'a hawse-hole outside the cheeks\' length', `the hole at x ${x.toFixed(2)} has no cheek at its station`); return; }
            const below = (y - rr) - Lh.yHi, above = Uh.yLo - (y + rr);
            if (below < 0.05 || above < 0.05)
              say(v.id, 'a hawse-hole not between the cheeks', `the hole at x ${x.toFixed(2)}: ${below.toFixed(3)} m of bolster over the lower cheek and ${above.toFixed(3)} m under the upper, each must be 0.05 m or more`);
          });
        }
        const HR = H.__headRead;
        if (HR && HR.steelLowerSideToMainRailM && Math.abs(HR.lowerSideToMainRailM - HR.steelLowerSideToMainRailM) > 0.15 && !CK.contested)
          say(v.id, 'a main rail off Steel\'s height over the lower cheek, unstated', `${HR.lowerSideToMainRailM} m, Steel ${HR.steelLowerSideToMainRailM} m, and the record has no contested field`);
      }
    }
