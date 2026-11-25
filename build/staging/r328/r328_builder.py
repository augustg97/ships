import sys
p = sys.argv[1]
s = open(p).read()
old = """      if (!lateenMizzen) {                    // r317: a square mizzen's pole is its own lower mast
        group.add(tag(mm, 'mast'));
        lateenHead = { y: base + mh, hounds, x: mxL(hounds), rakeDeg: mk.rake || 0 };
      }
"""
new = """      if (!lateenMizzen) {                    // r317: a square mizzen's pole is its own lower mast
        group.add(tag(mm, 'mast'));
        lateenHead = { y: base + mh, hounds, x: mxL(hounds), rakeDeg: mk.rake || 0 };
      }
      /* ── r328 (0y¹⁶³): A LATEEN MIZZEN MAY CARRY A TOP AND A BARE TOPMAST ─────────────────────
         Hollar's etching of a fluyt (1647, 'Navis Mercatoria Hollandica, vulgo VLIET') draws her mizzen
         as a lower pole carrying the lateen, a small round top, and a topmast above the top that
         crosses no yard and sets no sail: shrouds run up to its head and a pennant flies from a staff
         over it. A record carries the read as `lateenTopmast`: `topOfLower`, the top's height over the
         deck as a share of the lower mast (0.90, the height the r321 lateen read already keys the yard
         to); `headOverTop`, the topmast's head over the top as a share of the top's height over the
         deck; `topDiaOfTopHeight`, the top's width over the same height. The topmast's heel is in the
         doubling at 0.88 of the lower mast, the square stack's rule. Without the field, byte-identical. */
      const LT = (!lateenMizzen && mixed && mk.lateenTopmast && mk.lateenTopmast.headOverTop > 0
                  && mk.lateenTopmast.topOfLower > 0 && mk.lateenTopmast.topDiaOfTopHeight > 0) ? mk.lateenTopmast : null;
      if (LT) {
        const ltY = base + lower * LT.topOfLower;                      // the top, on the trestletrees
        const ltR = LT.topDiaOfTopHeight * (ltY - base) / 2;
        const ltHead = ltY + LT.headOverTop * (ltY - base);           // the topmast's head (its cap)
        const ltHeel = base + lower * 0.88;
        const ltRb = mastRl(ltY) * 0.62, ltRt = ltRb * 0.55;
        const tpL = buildTop(ltR, mats.woodPale, mastRl(ltY), S.year);
        tpL.position.set(mxL(ltY), ltY, 0);
        tpL.userData.mast = mi;
        tpL.userData.lateenTop = { mast: mi, y: +ltY.toFixed(4), base: +base.toFixed(4), r: +ltR.toFixed(4),
                                   head: +ltHead.toFixed(4), heel: +ltHeel.toFixed(4), from: 'record' };
        group.add(tag(tpL, 'top', 'Mizzen top',
          'A small round top at the head of the lateen mizzen. It spreads the shrouds of the mizzen topmast '
          + "above it. Read off Hollar's etching of a fluyt (1647)."));
        const tmLen = ltHead - ltHeel;
        const tmL = new THREE.Mesh(new THREE.CylinderGeometry(ltRt, ltRb, tmLen / Math.cos(rakeRad), 12), woodDark);
        tmL.position.set(mxL(ltHeel + tmLen / 2), ltHeel + tmLen / 2, 0);
        tmL.rotation.z = -rakeRad;
        tmL.userData.lateenTopmast = { mast: mi, heel: +ltHeel.toFixed(4), head: +ltHead.toFixed(4), sail: false };
        group.add(tag(tmL, 'mast', 'Mizzen topmast',
          'A bare topmast fidded over the lateen mizzen. It crosses no yard and sets no sail; Hollar draws a '
          + 'pennant staff at its head. Dutch ships of the 1640s often set a small square topsail here; '
          + 'the fluyt he drew did not.'));
        if (FINE) {
          const lSegs = [], nL = 2;
          for (let s2 = 0; s2 < nL; s2++) {
            const f = (s2 + 1) / (nL + 1);
            for (const side of [1, -1])
              lSegs.push([new THREE.Vector3(mxL(ltY) + (f - 0.5) * ltR, ltY + ltR * 0.05, side * ltR * 0.85),
                          new THREE.Vector3(mxL(ltHead - tmLen * 0.06), ltHead - tmLen * 0.06, side * (ltRt * 1.6 + 0.012))]);
          }
          const lsm = ropeMesh(lSegs, 0.012 + B * 0.0005, ropeMat);
          if (lsm) { lsm.userData.lateenTopmastShrouds = { mast: mi, n: lSegs.length }; group.add(tag(lsm, 'shroud', 'Mizzen topmast shrouds')); }
        }
      }
"""
assert s.count(old) == 1, 'anchor'
s = s.replace(old, new)
open(p, 'w').write(s)
print('builder edited')
