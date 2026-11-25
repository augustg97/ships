"""r325 (0y167): a topmast top where the record reads one, in place of the crosstrees."""
import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""        const topHead = base + lower * 0.88 + top * 0.97;
        const futt = [], upPts = [[], []], upSegs = [], upRats = [], tgSegs = [];""",
"""        const topHead = base + lower * 0.88 + top * 0.97;
        /* ── r325 (0y¹⁶⁷): A TOPMAST TOP WHERE THE RECORD READS ONE ─────────────────────────────
           Before about 1700 a topmast carried a small round top of its own, under its cap, where the
           18th century put open crosstrees. Hocker's rig diagram of Vasa (1628) draws one on the fore
           and the main topmast, about half the lower top's width, at 0.945 and 0.943 of the height from
           the mast's foot to the topmast's head. A record carries the read as `topmastTop`:
           `ofFootToHead`, the same measure as `hoistRead`, and `ofLowerTop`, the top's width over the
           lower top's on the same plate. Such a mast draws the top (buildTop, so round before 1710 and
           walled like the lower top), sets its topmast shrouds up under it at the hounds where they
           ran to the cap through the platform, and sets its topgallant shrouds up at its rim. Every
           other three-tier mast keeps the crosstrees and says why in `topmastTopProvenance`.
           Without the field, byte-identical. */
        const TT = mk.topmastTop && typeof mk.topmastTop.ofFootToHead === 'number' && mk.topmastTop.ofLowerTop > 0 ? mk.topmastTop : null;
        const tmHeadY = base + lower * 0.88 + top;
        const ttY = TT ? base + TT.ofFootToHead * (tmHeadY - base) : 0;
        const ttR = TT ? platR * TT.ofLowerTop : 0;
        const shHead = TT ? ttY - ttR * 0.25 : topHead;          // under the trestletrees (buildTop: underside at -0.22 r)
        const futt = [], upPts = [[], []], upSegs = [], upRats = [], tgSegs = [];""")
rep("""            const b = new THREE.Vector3(mxAt(topHead), topHead, side * B * 0.022);
            upSegs.push([a, b]);""",
"""            const b = new THREE.Vector3(mxAt(shHead), shHead, side * B * 0.022);
            upSegs.push([a, b]);""")
rep("""          const rise = topHead - platY;
          for (let h = RAT; h < rise * 0.86; h += RAT) {""",
"""          const rise = shHead - platY;
          for (let h = RAT; h < rise * 0.86; h += RAT) {""")
rep("""        if (tiersDrawn >= 3) {
          const ctR = B * 0.085;""",
"""        if (tiersDrawn >= 3 && TT) {
          const tp = buildTop(ttR, mats.woodPale, (segR[1] ? segR[1].b : B * 0.014), S.year);
          tp.position.set(mxAt(ttY), ttY, 0);
          tp.userData.topmastTop = { mast: mi, y: +ttY.toFixed(4), base: +base.toFixed(4), head: +tmHeadY.toFixed(4),
                                     r: +ttR.toFixed(4), lowerR: +platR.toFixed(4), shroudHeadY: +shHead.toFixed(4), from: 'record' };
          group.add(tag(tp, 'top', 'Topmast top',
            'A small round top on the topmast, under its cap, about half the width of the lower top. '
            + 'Ships carried one before about 1700; it spreads the topgallant shrouds, which set up at its rim. '
            + "Read off Hocker's rig diagram of Vasa (1628)."));
          const tgHead = base + (lower + top) * 0.88 + tg * 0.95;
          const nG = Math.max(2, Math.round(mk.shrouds * 0.35));
          for (let s = 0; s < nG; s++) {
            const f = (s + 1) / (nG + 1);
            for (const side of [1, -1])
              tgSegs.push([new THREE.Vector3(mxAt(ttY) + (f - 0.5) * ttR, ttY + ttR * 0.05, side * ttR * 0.85),
                           new THREE.Vector3(mxAt(tgHead), tgHead, side * B * 0.014)]);
          }
        } else if (tiersDrawn >= 3) {
          const ctR = B * 0.085;""")
rep("""          group.add(tag(ct, 'top', 'Crosstrees',""", """          ct.userData.mast = mi;
          group.add(tag(ct, 'top', 'Crosstrees',""")
rep("""        const up = ropeMesh(upSegs, 0.014 + B * 0.0007, ropeMat);
        if (up) group.add(tag(up, 'shroud', 'Topmast shrouds'));""",
"""        const up = ropeMesh(upSegs, 0.014 + B * 0.0007, ropeMat);
        if (up) { up.userData.topmastShrouds = { mast: mi, headY: +shHead.toFixed(4) }; group.add(tag(up, 'shroud', 'Topmast shrouds')); }""")
open(P, 'w').write(s)
print('ok')
