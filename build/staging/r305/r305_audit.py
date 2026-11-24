import sys
p = sys.argv[1]
s = open(p).read()
anchor = """      if (throat < Infinity && throat > cap)
        say(v.id, 'a gaff hoisted above its lower masthead', `mast ${i}: gaff's lowest point ${(throat - foot).toFixed(2)} m over the foot, cap ${(cap - foot).toFixed(2)} m`);
    });
"""
assert s.count(anchor) == 1, 'anchor'
add = anchor + r"""
    /* ── A-GAFF-TOPMAST-STAYED (round 305, 0y¹³³): A BUILT GAFF TOPMAST IS STAYED ──────────────
       The builder stayed only square topmasts, so Endurance's two, Great Eastern's six, Wyoming's
       six and the steamer's one stood with nothing on them but the spring stay. For every gaff mast
       with shrouds whose topmast segment is built (userData.seg si 1), on the fine build:
       (1) a 'Crosstrees' group carrying userData.gaffCrosstrees for that mast, standing between the
       topmast's heel and the lower cap; (2) a 'Gaff topmast shrouds' mesh carrying
       userData.gaffTopShrouds for that mast, one lead a side, each with its head between 0.8 of the
       topmast and its head and within 0.12 m of the pole's skin, its bend on the crosstree's end
       (height within 0.1 m, |z| within the bars' own extent and over 0.7 of it), and its foot at the
       lower shrouds' foot row (height within 0.05 m, |z| within 0.5 m of the after shroud's foot),
       abaft the after lower shroud; and the mesh's own vertices reaching the head's height within
       0.1 m. SILENCE: a built gaff topmast with no such mesh, 'a gaff topmast unstayed'. */
    (H.masts || []).forEach((mk, i) => {
      if (mk.rig !== 'gaff' || !mk.topmast || !mk.shrouds) return;
      const sgB = [];
      g.traverse(o => { const sg = o.isMesh && o.userData.seg; if (sg && sg.mi === i) sgB[sg.si] = { sg, o }; });
      if (!sgB[0] || !sgB[1]) return;
      const S0 = sgB[0].sg, S1 = sgB[1].sg;
      let ctG = null, tsM = null;
      g.traverse(o => {
        if (o.userData.gaffCrosstrees && o.userData.gaffCrosstrees.mi === i) ctG = o;
        if (o.isMesh && o.userData.gaffTopShrouds && o.userData.gaffTopShrouds.mi === i) tsM = o;
      });
      if (!tsM) { say(v.id, 'a gaff topmast unstayed', `mast ${i}: topmast ${S1.footY.toFixed(2)}–${S1.headY.toFixed(2)} m built, no topmast shrouds`); return; }
      if (!ctG || (tagOf(ctG) || {}).name !== 'Crosstrees') { say(v.id, 'a gaff topmast shroud with no crosstrees', `mast ${i}`); return; }
      const ctBox = new THREE.Box3().setFromObject(ctG);
      const ctY = (ctBox.min.y + ctBox.max.y) / 2, ctZ = Math.max(-ctBox.min.z, ctBox.max.z);
      if (!(ctY > S1.footY && ctY < S0.headY))
        say(v.id, 'gaff crosstrees off the doubling', `mast ${i}: crosstrees at ${ctY.toFixed(2)} m, heel ${S1.footY.toFixed(2)}, cap ${S0.headY.toFixed(2)}`);
      /* the topmast's radius at the hounds, from its own mesh: the widest |z| of vertices in a 0.3 m band */
      const T = tsM.userData.gaffTopShrouds, B1 = T.built || [];
      const pm = sgB[1].o; pm.updateMatrixWorld(true);
      const pa = pm.geometry.attributes.position, V = new THREE.Vector3();
      const radAt = y => { let r = 0; for (let k = 0; k < pa.count; k++) { V.set(pa.getX(k), pa.getY(k), pa.getZ(k)).applyMatrix4(pm.matrixWorld);
        if (Math.abs(V.y - y) < 0.3) r = Math.max(r, Math.abs(V.z)); } return r; };
      const sh = [];
      g.traverse(o => { const p2 = o.isMesh && tagOf(o); if (p2 && p2.key === 'shroud' && p2.name === 'Shrouds' && o.userData.segs) sh.push(o); });
      const lowFeet = [];
      for (const o of sh) for (const [a, b2] of o.userData.segs) if (Math.abs(b2[0] - S0.headX) < 3 && b2[1] > S0.footY + (S0.headY - S0.footY) * 0.8 && b2[1] <= S0.headY + 0.05) lowFeet.push(a);
      if (B1.length !== 2) { say(v.id, 'a gaff topmast unstayed', `mast ${i}: ${B1.length} topmast shroud lead(s), want one a side`); return; }
      for (const q of B1) {
        const [hx, hy, hz] = q.head, [, ty, tz] = q.tip, [fx, fy, fz] = q.foot;
        const len = S1.headY - S1.footY, rH = radAt(hy);
        if (!(hy >= S1.footY + 0.8 * len && hy <= S1.headY) || Math.abs(Math.abs(hz) - rH) > 0.12)
          say(v.id, 'a gaff topmast shroud off its hounds', `mast ${i} side ${q.side}: head ${hy.toFixed(2)} m (topmast ${S1.footY.toFixed(2)}–${S1.headY.toFixed(2)}), ${Math.abs(hz).toFixed(3)} m off the axis, pole ${rH.toFixed(3)}`);
        if (Math.abs(ty - ctY) > 0.1 || Math.abs(tz) > ctZ + 0.02 || Math.abs(tz) < 0.7 * ctZ)
          say(v.id, 'a gaff topmast shroud off its crosstree', `mast ${i} side ${q.side}: bend at ${ty.toFixed(2)} m, ${Math.abs(tz).toFixed(2)} m out; crosstrees ${ctY.toFixed(2)} m, ${ctZ.toFixed(2)} m out`);
        const own = lowFeet.filter(a => Math.sign(a[2]) === Math.sign(q.side));
        if (!own.length) { say(v.id, 'a gaff topmast shroud with no lower shrouds to set up beside', `mast ${i} side ${q.side}`); continue; }
        const aft = own.reduce((m2, a) => (a[0] > m2[0] ? a : m2), own[0]);
        if (Math.abs(fy - aft[1]) > 0.05 || Math.abs(Math.abs(fz) - Math.abs(aft[2])) > 0.5 || !(fx > aft[0]) || fx - aft[0] > (H.beam || 8) * 0.25)
          say(v.id, 'a gaff topmast shroud set up off the rail', `mast ${i} side ${q.side}: foot ${fx.toFixed(2)}, ${fy.toFixed(2)}, ${Math.abs(fz).toFixed(2)}; after lower shroud's foot ${aft[0].toFixed(2)}, ${aft[1].toFixed(2)}, ${Math.abs(aft[2]).toFixed(2)}`);
      }
      const mb = new THREE.Box3().setFromObject(tsM);
      const hMax = Math.max(...B1.map(q => q.head[1]));
      if (Math.abs(mb.max.y - hMax) > 0.1)
        say(v.id, 'a gaff topmast shroud record off its mesh', `mast ${i}: mesh top ${mb.max.y.toFixed(2)}, record head ${hMax.toFixed(2)}`);
    });
"""
s = s.replace(anchor, add)
open(p, 'w').write(s)
print('ok')
