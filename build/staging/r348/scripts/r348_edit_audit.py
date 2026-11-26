#!/usr/bin/env python3
"""r348: A-MASTHEAD-STEEL.  usage: r348_edit_audit.py <audit-hulls.js>"""
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
anchor = "    /* ── D-MAST-STEP (round 248): A MAST ON A DOUBLE HULL STEPS ON THE PLATFORM."
assert s.count(anchor) == 1
rule = r"""    /* ── A-MASTHEAD-STEEL (round 348): THE LOWER MASTHEAD IS A SHARE OF THE WHOLE MAST. Steel 1794: "The head
       of the main and fore masts, 5 inches to every yard of the mast's length. The head of the mizen-mast ...
       4 inches." The 74's main masthead, top to cap, was 2.5 m against Steel's 4.56 m and Asow's 4.2 m, because
       the top stood at a class 0.90 of the lower's span over the deck. On a hull that records mastStep, every
       Steel-length square lower must carry userData.head with Steel's rate (5 in, or 4 on the aftermost of three
       or more masts), its head must be that rate of the whole mast (span + step) to 0.02 m, the built lower top
       (userData.lowerTop) must stand that far under the lower's head, and the topmast's heel 1.2 heads under it,
       each to 0.03 m. On every other square lower the head must say it is the class figure. */
    {
      const steelLen = mk => !(mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0)
        && !(mk.truckM !== undefined && mk.rig === 'square') && mk.heightM === undefined;
      const rec = H.mastStep && H.mastStep.belowDeckM > 0 ? H.mastStep.belowDeckM : 0;
      const segs = {}, tops = {};
      g.traverse(o => {
        if (o.isMesh && o.userData.seg) (segs[o.userData.seg.mi] = segs[o.userData.seg.mi] || {})[o.userData.seg.si] = o.userData;
        if (o.userData && o.userData.lowerTop) tops[o.userData.mast] = o;
      });
      const ats = (H.masts || []).map(m2 => m2.at);
      (H.masts || []).forEach((mk, mi) => {
        const S0 = segs[mi] && segs[mi][0];
        if (!S0 || mk.rig !== 'square') return;
        const hd = S0.head;
        if (!hd) { say(v.id, 'a square lower with no masthead record', `mast ${mi}: no userData.head`); return; }
        const stepped = rec > 0 && steelLen(mk);
        if (!stepped) {
          if (!/^class/.test(hd.from || '')) say(v.id, 'a masthead not labelled as the class figure', `mast ${mi}: head.from '${hd.from}'`);
          return;
        }
        const want = ats.length >= 3 && mk.at === Math.max(...ats) ? 4 : 5;
        const span = S0.seg.headY - S0.seg.footY, headM = (span + rec) * want / 36;
        if (hd.inPerYd !== want) say(v.id, 'a masthead at the wrong Steel rate', `mast ${mi}: ${hd.inPerYd} in per yard against Steel's ${want}`);
        if (Math.abs(hd.headM - headM) > 0.02)
          say(v.id, 'a lower masthead off Steel\'s share of the whole mast', `mast ${mi}: head ${hd.headM} m against ${want} in/yd of ${(span + rec).toFixed(2)} m = ${headM.toFixed(3)} m`);
        const tp = tops[mi];
        if (tp) {
          tp.updateMatrixWorld(true);
          const q = new THREE.Vector3().setFromMatrixPosition(tp.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(g.matrixWorld).invert());
          if (Math.abs(q.y - (S0.seg.headY - headM)) > 0.03)
            say(v.id, 'a lower top off its masthead', `mast ${mi}: the top at y ${q.y.toFixed(3)}, the cap at ${S0.seg.headY.toFixed(3)}, Steel's head ${headM.toFixed(3)} m puts it at ${(S0.seg.headY - headM).toFixed(3)}`);
        } else say(v.id, 'a stepped square lower with no top', `mast ${mi}`);
        const S1 = segs[mi][1];
        if (S1 && Math.abs(S1.seg.footY - (S0.seg.headY - 1.2 * headM)) > 0.03)
          say(v.id, 'a topmast heel off the doubling', `mast ${mi}: heel at y ${S1.seg.footY.toFixed(3)}, 1.2 heads under the cap is ${(S0.seg.headY - 1.2 * headM).toFixed(3)}`);
      });
    }
"""
s = s.replace(anchor, rule + anchor)
p.write_text(s); print('r348_edit_audit: ok')
