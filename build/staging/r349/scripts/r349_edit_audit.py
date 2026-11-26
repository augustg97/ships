#!/usr/bin/env python3
"""r349: A-TOPMAST-HEAD-STEEL.  usage: r349_edit_audit.py <audit-hulls.js>"""
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
anchor = "    /* ── D-MAST-STEP (round 248): A MAST ON A DOUBLE HULL STEPS ON THE PLATFORM."
assert s.count(anchor) == 1
rule = r"""    /* ── A-TOPMAST-HEAD-STEEL (round 349): THE TOPMAST HEAD AND THE TOPGALLANT HOUNDS. Steel 1794: "The head of the
       mizen-mast, and main and fore topmasts, 4 inches to every yard of the length. The head of the mizen topmast, and all
       topgallant-mast, 3 1/2 inches." The 74's main topmast crosstrees stood 0.59 m under its cap and the topgallant's heel
       2.37 m under it, so the heel hung 1.8 m below the crosstrees that hold it. TEST, on every square mast with a
       topmast and no `yards` list: the topmast and topgallant segments carry userData.head; on a hull that records
       mastStep and a Steel-length mast, the topmast head is 4 in per yard of the topmast (3.5 on the aftermost of three
       or more masts) and the topgallant's 3.5, each to 0.02 m; elsewhere each says it is the class figure. On every
       such mast: the crosstrees (a 'Crosstrees' group for the mast) stand at the record's crossY, one head under the
       topmast's cap on a Steel mast, to 0.03 m; the topgallant's heel stands at the record's heelY, 1.2 heads under the
       cap on a Steel mast, to 0.03 m; a class-set topsail yard is set at that heel (0.03 m), because its parrel rides
       the topmast and the topgallant's heel stands on the topmast's fore face above it; and the topgallant shrouds'
       highest vertex stands within 0.08 m of the topgallant's hounds (houndsY). */
    {
      const steelLen = mk => !(mk.rig === 'square' && mk.mastHeightsM && mk.mastHeightsM.top > 0)
        && !(mk.truckM !== undefined && mk.rig === 'square') && mk.heightM === undefined;
      const rec = H.mastStep && H.mastStep.belowDeckM > 0 ? H.mastStep.belowDeckM : 0;
      const segs = {}, cts = {}, tgs = {}, hoists = {};
      g.updateMatrixWorld(true);
      const invG = new THREE.Matrix4().copy(g.matrixWorld).invert(), V3 = new THREE.Vector3();
      g.traverse(o => {
        if (o.isMesh && o.userData.seg) (segs[o.userData.seg.mi] = segs[o.userData.seg.mi] || {})[o.userData.seg.si] = o.userData;
        const pt = o.userData && o.userData.part;
        if (pt && pt.key === 'top' && pt.name === 'Crosstrees' && o.userData.mast !== undefined) (cts[o.userData.mast] = cts[o.userData.mast] || []).push(o);
        if (o.isMesh && o.userData.topgallantShrouds) tgs[o.userData.topgallantShrouds.mast] = o;
        if (o.isMesh && o.userData.hoistAt && o.userData.hoistAt.section === 'topmast') hoists[o.userData.hoistAt.mast] = o;
      });
      const ats = (H.masts || []).map(m2 => m2.at);
      (H.masts || []).forEach((mk, mi) => {
        const S1 = segs[mi] && segs[mi][1], S2 = segs[mi] && segs[mi][2];
        if (!S1 || mk.rig !== 'square' || Array.isArray(mk.yards)) return;
        const at = `mast ${mi} (station ${mk.at})`, h1 = S1.head;
        if (!h1) { say(v.id, 'a topmast with no head record', at); return; }
        const steel = rec > 0 && steelLen(mk);
        const len1 = S1.seg.headY - S1.seg.footY;
        if (steel) {
          const want = ats.length >= 3 && mk.at === Math.max(...ats) ? 3.5 : 4, headM = len1 * want / 36;
          if (h1.inPerYd !== want) say(v.id, 'a topmast head at the wrong Steel rate', `${at}: ${h1.inPerYd} in per yard against Steel's ${want}`);
          if (Math.abs(h1.headM - headM) > 0.02) say(v.id, "a topmast head off Steel's share of the topmast", `${at}: head ${h1.headM} m against ${want} in/yd of ${len1.toFixed(2)} m = ${headM.toFixed(3)} m`);
          if (Math.abs(h1.crossY - (S1.seg.headY - headM)) > 0.03) say(v.id, 'topmast crosstrees off the head', `${at}: crossY ${h1.crossY}, one head under the cap is ${(S1.seg.headY - headM).toFixed(3)}`);
          if (Math.abs(h1.heelY - (S1.seg.headY - 1.2 * headM)) > 0.03) say(v.id, 'a topgallant heel record off the doubling', `${at}: heelY ${h1.heelY}, 1.2 heads under the cap is ${(S1.seg.headY - 1.2 * headM).toFixed(3)}`);
        } else if (!/^class/.test(h1.from || '')) say(v.id, 'a topmast head not labelled as the class figure', `${at}: head.from '${h1.from}'`);
        (cts[mi] || []).forEach(ct => {
          let yMin = Infinity, yMax = -Infinity;
          ct.traverse(m => { if (!m.isMesh) return; m.updateMatrixWorld(true); const a = m.geometry.attributes.position;
            for (let k = 0; k < a.count; k++) { V3.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(m.matrixWorld).applyMatrix4(invG); yMin = Math.min(yMin, V3.y); yMax = Math.max(yMax, V3.y); } });
          const cy = (yMin + yMax) / 2;
          if (Math.abs(cy - h1.crossY) > 0.03) say(v.id, 'topmast crosstrees not at their record', `${at}: drawn at y ${cy.toFixed(3)}, the head record puts them at ${h1.crossY}`);
        });
        if (S2 && Math.abs(S2.seg.footY - h1.heelY) > 0.03) say(v.id, 'a topgallant heel off its record', `${at}: heel at y ${S2.seg.footY.toFixed(3)}, the topmast's head record puts it at ${h1.heelY}`);
        const ho = hoists[mi];
        if (S2 && ho && ho.userData.hoistAt.from === 'class' && Math.abs(ho.userData.hoistAt.setY - S2.seg.footY) > 0.03)
          say(v.id, 'a topsail yard not atrip under the topgallant heel', `${at}: set at y ${ho.userData.hoistAt.setY.toFixed(3)}, the topgallant's heel at ${S2.seg.footY.toFixed(3)}`);
        if (!S2) return;
        const h2 = S2.head;
        if (!h2) { say(v.id, 'a topgallant mast with no head record', at); return; }
        if (steel) {
          const len2 = S2.seg.headY - S2.seg.footY, headM = len2 * 3.5 / 36;
          if (h2.inPerYd !== 3.5 || Math.abs(h2.headM - headM) > 0.02 || Math.abs(h2.houndsY - (S2.seg.headY - headM)) > 0.03)
            say(v.id, "a topgallant head off Steel's 3 1/2 inches", `${at}: head ${h2.headM} m at ${h2.inPerYd} in/yd, hounds ${h2.houndsY}; Steel gives ${headM.toFixed(3)} m, hounds at ${(S2.seg.headY - headM).toFixed(3)}`);
        } else if (!/^class/.test(h2.from || '')) say(v.id, 'a topgallant head not labelled as the class figure', `${at}: head.from '${h2.from}'`);
        const sh = tgs[mi];
        if (sh) {
          sh.updateMatrixWorld(true); const a = sh.geometry.attributes.position; let yMax = -Infinity;
          for (let k = 0; k < a.count; k++) { V3.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(sh.matrixWorld).applyMatrix4(invG); yMax = Math.max(yMax, V3.y); }
          if (Math.abs(yMax - h2.houndsY) > 0.08) say(v.id, 'topgallant shrouds off the hounds', `${at}: the shrouds reach y ${yMax.toFixed(3)}, the hounds stand at ${h2.houndsY}`);
        }
      });
    }
"""
s = s.replace(anchor, rule + anchor); p.write_text(s); print('r349_edit_audit: ok')
