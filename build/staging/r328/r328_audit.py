import sys
p = sys.argv[1]
s = open(p).read()
anchor = "    /* ── A-MASTHEAD-NONE (round 327, 0y¹⁶⁹): A MAST THAT CARRIES NO TOP CARRIES WHAT ITS RECORD NAMES ───────────\n"
rule = r"""    /* ── A-MIZZEN-TOPSAIL (round 328, 0y¹⁶³): A LATEEN MIZZEN ON A SQUARE-RIGGED SHIP ANSWERS FOR ITS TOPSAIL ─────
       Vasa's mizzen (1628) set a square topsail over the lateen. Hollar's fluyt (1647) carries a top and a bare
       topmast over it and sets nothing there. Master W.A.'s ship (about 1475) carries a bare pole. Each of the three is
       possible, and until r328 the record of the fluyt and the carrack said nothing either way. TESTS, on every mast
       with `rig 'lateen'` on a hull that also carries a square mast: (1) `mizzenTopsail` is a boolean and
       `mizzenTopsailProvenance` opens PLATE READ or CLASS, or the silence convicts; (2) `mizzenTopsail: true` on a
       lateen pole convicts, because that rig is built as a square mizzen with `lateenMizzen` (r317); (3) where the
       record carries `lateenTopmast`, exactly one 'Mizzen top' group and one 'Mizzen topmast' mesh are built on that
       mast. The top stands at `topOfLower` of the lower mast within 5 cm, and the topmast's head stands `headOverTop`
       of the top's height above the top, within 1%. The top's radius is `topDiaOfTopHeight` of that height over two,
       within 1%. The topmast's heel stands below the top, and the lower pole's head stands above it, so the two
       overlap in the doubling. Topmast shrouds are drawn, and no square yard (a 'yard' part wider than 2 m and
       shallower than 1 m) has its centre above the top within 1.5 m of the axis. (4) A mizzen top or topmast on a
       mast whose record carries no `lateenTopmast` convicts. */
    {
      const anySq = (H.masts || []).some(mm => mm.rig === 'square');
      g.updateMatrixWorld(true);
      const lTops = [], lTms = [], lShr = [], yardsAll = [], poles = [];
      g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
        if (!o.isMesh && p.key === 'top' && o.userData.lateenTop) lTops.push(o);
        if (o.isMesh && p.key === 'mast' && o.userData.lateenTopmast) lTms.push(o);
        if (o.isMesh && p.key === 'mast' && !o.userData.lateenTopmast) poles.push(o);
        if (o.userData.lateenTopmastShrouds) lShr.push(o);
        if (o.isMesh && p.key === 'yard') yardsAll.push(o); });
      (H.masts || []).forEach((mm, mi) => {
        const at = `masts[${mi}]`;
        const myTops = lTops.filter(o => o.userData.lateenTop.mast === mi);
        const myTms = lTms.filter(o => o.userData.lateenTopmast.mast === mi);
        if (!(mm.rig === 'lateen' && anySq)) {
          if (myTops.length || myTms.length) say(v.id, 'a lateen topmast on a mast that is not a lateen mizzen', `${at}: rig '${mm.rig}'`);
          return;
        }
        if (typeof mm.mizzenTopsail !== 'boolean' || !/^(PLATE READ|CLASS)/.test(mm.mizzenTopsailProvenance || ''))
          say(v.id, 'a lateen mizzen with no answer for its topsail',
              `${at}: mizzenTopsail ${JSON.stringify(mm.mizzenTopsail)}, provenance ${mm.mizzenTopsailProvenance ? JSON.stringify(mm.mizzenTopsailProvenance.slice(0, 40)) : 'absent'}`);
        if (mm.mizzenTopsail === true)
          say(v.id, 'a mizzen topsail the lateen pole cannot carry', `${at}: build it as rig 'square' with lateenMizzen (r317)`);
        const LT = mm.lateenTopmast;
        if (!LT) {
          if (myTops.length || myTms.length)
            say(v.id, 'a mizzen topmast nobody recorded', `${at}: ${myTops.length} tops, ${myTms.length} topmasts, no lateenTopmast`);
          return;
        }
        if (myTops.length !== 1 || myTms.length !== 1) {
          say(v.id, 'a recorded mizzen topmast not built', `${at}: ${myTops.length} mizzen tops and ${myTms.length} mizzen topmasts (want 1 and 1)`);
          return;
        }
        const T = myTops[0].userData.lateenTop, M = myTms[0].userData.lateenTopmast;
        const hT = T.y - T.base;
        const tb = new THREE.Box3().setFromObject(myTops[0]);
        const mb = new THREE.Box3().setFromObject(myTms[0]);
        const wantHead = T.y + LT.headOverTop * hT;
        if (Math.abs(mb.max.y - wantHead) > 0.01 * hT)
          say(v.id, 'a mizzen topmast off its read height', `${at}: head ${mb.max.y.toFixed(2)} m, read ${wantHead.toFixed(2)} m (headOverTop ${LT.headOverTop})`);
        const wantR = LT.topDiaOfTopHeight * hT / 2, builtR = (tb.max.z - tb.min.z) / 2;
        if (Math.abs(builtR - wantR) > Math.max(0.01 * wantR, 0.03))
          say(v.id, 'a mizzen top off its read width', `${at}: radius ${builtR.toFixed(3)} m, read ${wantR.toFixed(3)} m`);
        const myPole = poles.filter(o => { const b = new THREE.Box3().setFromObject(o);
          return Math.abs((b.min.x + b.max.x) / 2 - (tb.min.x + tb.max.x) / 2) < 1.5 && b.min.y < T.y && b.max.y > T.base; });
        const poleHead = Math.max(...myPole.map(o => new THREE.Box3().setFromObject(o).max.y), -Infinity);
        if (!(mb.min.y < T.y) || !(poleHead > T.y))
          say(v.id, 'a mizzen topmast with no doubling', `${at}: topmast heel ${mb.min.y.toFixed(2)} m, lower head ${poleHead.toFixed(2)} m, top ${T.y.toFixed(2)} m`);
        if (!lShr.some(o => o.userData.lateenTopmastShrouds.mast === mi))
          say(v.id, 'a mizzen topmast with no shrouds', at);
        const axX = (mb.min.x + mb.max.x) / 2;
        yardsAll.forEach(o => { const b = new THREE.Box3().setFromObject(o);
          const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
          if (cy > T.y && Math.abs(cx - axX) < 1.5 && Math.max(b.max.x - b.min.x, b.max.z - b.min.z) > 2 && b.max.y - b.min.y < 1)
            say(v.id, 'a yard crossed on a mizzen topmast recorded bare', `${at}: '${o.userData.part.name}' at ${cy.toFixed(2)} m`); });
      });
    }

"""
assert s.count(anchor) == 1, 'anchor'
s = s.replace(anchor, rule + anchor)
open(p, 'w').write(s)
print('audit edited')
