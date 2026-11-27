import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
anchor = '''    /* ── A-GUN-FORM (round 361): EVERY GREAT GUN IS TURNED TO ARMSTRONG'S RULE.'''
assert s.count(anchor) == 1
rule = r'''    /* ── A-PORT-STATIONS (round 364): A RECORDED TIER'S PORTS STAND WHERE STEEL PUTS THEM. Until r364 the shader cut a
       port every L/26 along every tier and buildGuns stood a gun in each between u 0.13 and the run, so the 74 showed
       about 19 upper-deck ports a side where Steel's Folio XXXII gives 15, 2 ft 10 in fore and aft with 8 ft 1 in clear
       between them, the foremost 13 ft 1 in abaft the foremost perpendicular and the after one 6 ft 9 in afore the
       after perpendicular. TEST, for every tier whose record carries foreM, from the BUILT scene: (a) the ports the
       hull material cuts in that tier (uRecPort, read through the surface at the tier's port height) number nSide;
       (b) each is wM fore and aft within 10 mm, and each clear space clearM within 10 mm; (c) the perpendiculars are
       registered on the masts AS BUILT: the three lower masts' x one metre over the deck (each mesh's vertices there,
       averaged) against hull.perpendiculars, the mizzen's through the length the ports close; every mast within
       0.75 m of the mean, and the foremost port's foreside within 0.10 m of that mean plus foreM; (d) every drawn port
       holds exactly one gun of that tier on each side, and no gun of that tier stands outside a drawn port. */
    if (Array.isArray(H.tierPorts) && H.tierPorts.some(t => t && t.foreM > 0)) {
      const HSp = SHIPS_HULL.hullSurface(H); g.updateMatrixWorld(true);
      const invP = new THREE.Matrix4().copy(g.matrixWorld).invert();
      let hm = null; g.traverse(n => { if (!hm && n.material && n.material.uniforms && n.material.uniforms.uRecPort) hm = n.material; });
      if (!hm) say(v.id, 'recorded ports not drawn', 'the hull material has no uRecPort: the shader cuts the class pattern');
      else {
        const U = hm.uniforms, nRec = U.uRecPortN.value;
        /* the masts as built, one metre over the deck */
        const yM = HSp.deck(0.5) + 1.0, mastX = [], vv = new THREE.Vector3();
        g.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
          let key = null; for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
          if (key !== 'mast') return;
          const a = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(invP, o.matrixWorld); let sx = 0, n = 0;
          for (let j = 0; j < a.count; j++) { vv.fromBufferAttribute(a, j).applyMatrix4(M); if (Math.abs(vv.y - yM) < 0.3) { sx += vv.x; n++; } }
          if (n) mastX.push(sx / n); });
        mastX.sort((a, b) => a - b);
        H.tierPorts.forEach((R, d) => {
          if (!R || !(R.foreM > 0)) return;
          const vP = (U.uTierPortLo.value.getComponent(d) + U.uTierPortHi.value.getComponent(d)) / 2;
          const xs = [];
          for (let i = 0; i < nRec; i++) { const P = U.uRecPort.value[i]; if (Math.round(P.z) !== d) continue;
            xs.push([SHIPS_HULL.surfacePoint(H, HSp, P.x, vP)[0], SHIPS_HULL.surfacePoint(H, HSp, P.y, vP)[0]]); }
          xs.sort((a, b) => a[0] - b[0]);
          if (xs.length !== R.nSide) say(v.id, 'a recorded tier cut with the wrong number of ports', `tier ${d}: ${xs.length} drawn, the record ${R.nSide}`);
          const badW = xs.filter(q => Math.abs(q[1] - q[0] - R.wM) > 0.010);
          if (badW.length) say(v.id, 'a recorded port drawn the wrong width', `tier ${d}: ${badW.length} of ${xs.length}, e.g. ${(badW[0][1] - badW[0][0]).toFixed(3)} against ${R.wM}`);
          const gaps = xs.slice(1).map((q, k) => q[0] - xs[k][1]), badG = gaps.filter(gp => Math.abs(gp - R.clearM) > 0.010);
          if (badG.length) say(v.id, 'recorded ports drawn the wrong distance apart', `tier ${d}: ${badG.length} of ${gaps.length} spaces, e.g. ${badG[0].toFixed(3)} against ${R.clearM}`);
          const PP = H.perpendiculars;
          if (!PP || mastX.length !== 3) say(v.id, 'perpendiculars cannot be registered on the built masts', `${mastX.length} masts read one metre over the deck; perpendiculars ${PP ? 'recorded' : 'not recorded'}`);
          else if (xs.length) {
            const lpp = R.foreM + R.nSide * R.wM + (R.nSide - 1) * R.clearM + R.aftM;
            const est = [mastX[0] - PP.foreMastM, mastX[1] - PP.mainMastM, mastX[2] + PP.mizzenAftM - lpp], fp = est.reduce((a, b) => a + b, 0) / 3;
            const worst = Math.max(...est.map(e => Math.abs(e - fp)));
            if (worst > 0.75) say(v.id, 'the masts and Steel\'s perpendiculars disagree', `estimates of the foremost perpendicular ${est.map(e => e.toFixed(2)).join(', ')}`);
            if (Math.abs(xs[0][0] - (fp + R.foreM)) > 0.10) say(v.id, 'the foremost recorded port off its station', `tier ${d}: foreside at ${xs[0][0].toFixed(3)}, Steel's ${(fp + R.foreM).toFixed(3)} on the masts as built`);
          }
          const per = xs.map(() => ({ p: 0, s: 0 })); let outside = 0;
          g.traverse(o => { const t = o.userData.tierGun; if (!t || t.deck !== d) return;
            const w = new THREE.Vector3(); o.getWorldPosition(w); w.applyMatrix4(invP);
            const k = xs.findIndex(q => w.x >= q[0] && w.x <= q[1]);
            if (k < 0) outside++; else per[k][w.z > 0 ? 'p' : 's']++; });
          const badP = per.filter(c => c.p !== 1 || c.s !== 1).length;
          if (outside) say(v.id, 'a gun outside every recorded port', `tier ${d}: ${outside} gun(s)`);
          if (badP) say(v.id, 'a recorded port without one gun a side', `tier ${d}: ${badP} of ${xs.length} ports`);
        });
      }
    }
'''
s = s.replace(anchor, rule + anchor)
p.write_text(s); print('audit rule added')
