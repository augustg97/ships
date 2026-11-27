import sys
p = sys.argv[1]; s = open(p).read()
anchor = """    /* ── A-COVER-PART-LIT (round 354): A PART UNDER A DECK COVER IS LIT AS THE DECK UNDER IT IS."""
assert s.count(anchor) == 1
rule = r"""    /* ── A-GALLERY-AS-RECORDED (round 357): A RECORDED QUARTER GALLERY IS DRAWN AT THE RECORD'S LENGTHS, HEIGHTS AND
       LIGHTS. Until r357 every gun-decked hull took a quarter drum about the corner line, 0.76 m in radius on the 74, and
       her stern lights stood at 0.42 and 0.72 of the sheer, between the two counters Steel's Folio LI puts under them.
       TEST, on every hull whose record carries quarterGallery, from the BUILT scene in hull space: (a) gallery bodies
       carry userData.quarterGallery, and no gallery mesh of more than 40 vertices lacks it (the class drum beside the
       record's bay); (b) at each storey's floor the storey's own body's (userData.galleryStorey) forward-most vertex stands the storey's rim length forward of
       the corner at that height, within 0.15 m short and 0.05 m long (the rim is measured along the side's curve, so
       the x-run is a little short of it); (c) on each side the glass of each storey's lights is the record's size within
       1 cm, the record's storeys all have lights; (d) each stern-light tier's sash is centred at a storey's light
       height within 0.05 m; (e) the balcony's deck, as the record registers it, lies within 0.15 m of the model's upper
       deck at the stern — a registration that misses the deck is a registration on the wrong anchor. */
    if (H.quarterGallery) {
      g.updateMatrixWorld(true);
      const invG = new THREE.Matrix4().copy(g.matrixWorld).invert(), Mg = new THREE.Matrix4(), q = new THREE.Vector3();
      const HSg = SHIPS_HULL.hullSurface(H);
      const cornerX = y => { let a = 0, b = 1; if (SHIPS_HULL.surfacePoint(H, HSg, 1, 1.0)[1] <= y) return SHIPS_HULL.surfacePoint(H, HSg, 1, 1.0)[0];
        for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSg, 1, m)[1] < y) a = m; else b = m; }
        return SHIPS_HULL.surfacePoint(H, HSg, 1, (a + b) / 2)[0]; };
      let rd = null; const bodies = [], lights = [], sashes = [];
      g.traverse(o => { if (!o.isMesh) return; let key = null;
        for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
        if (key === 'gallery') {
          if (o.userData.quarterGallery) { rd = o.userData.quarterGallery; bodies.push(o); }
          else if (o.geometry.attributes.position.count > 40) say(v.id, 'a recorded gallery drawn as the class drum', `a ${o.geometry.attributes.position.count}-vertex gallery mesh with no record`);
          if (o.parent && o.parent.userData.galleryLight && o.material && o.material.metalness >= 0.3) lights.push(o);
        }
        if (key === 'sternlight' && o.geometry.type === 'ExtrudeGeometry') sashes.push(o); });
      if (!rd) say(v.id, 'a recorded quarter gallery not drawn', 'no gallery mesh carries userData.quarterGallery');
      else {
        if (Math.abs(rd.balconyDeckY - rd.modelDeckY) > 0.15)
          say(v.id, 'the gallery registered on the wrong anchor', `the balcony's deck lands at y ${rd.balconyDeckY}, the model's upper deck at the stern is ${rd.modelDeckY}`);
        const ftv = x => (Array.isArray(x) ? x[0] + x[1] / 12 : x) * 0.3048;   // the record's own figures, not the builder's read
        for (const [si, st0] of rd.storeys.entries()) {
          const rec = H.quarterGallery.storeys[si] || {};
          const st = { ...st0, rimM: +ftv(rec.rimFt).toFixed(3), lightH: +ftv(rec.lightsFt[0]).toFixed(3), lightW: +ftv(rec.lightsFt[1]).toFixed(3) };
          if (H.quarterGallery.storeys.length !== rd.storeys.length) say(v.id, 'a gallery storey not drawn', `the record has ${H.quarterGallery.storeys.length} storeys, the build ${rd.storeys.length}`);
          for (const sgn of [-1, 1]) {
            let xf = 1e9;
            for (const o of bodies.filter(o => o.userData.galleryStorey === st.name)) { Mg.multiplyMatrices(invG, o.matrixWorld); const a = o.geometry.attributes.position;
              for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(Mg);
                if (Math.abs(q.y - st.floorY) < 0.02 && Math.sign(q.z) === sgn) xf = Math.min(xf, q.x); } }
            const run = cornerX(st.floorY) - xf;
            if (!(run >= st.rimM - 0.15 && run <= st.rimM + 0.05))
              say(v.id, 'a gallery storey off its recorded rim', `${st.name} storey, ${sideOf(sgn)}: ${xf > 1e8 ? 'no body at its floor' : run.toFixed(2) + ' m forward of the corner'}, the record ${st.rimM} m`);
            const mine = lights.filter(o => o.parent.userData.galleryLight.storey === st.name && Math.sign(o.parent.position.z) === sgn);
            if (!mine.length) say(v.id, 'a gallery storey with no lights', `${st.name}, ${sideOf(sgn)}`);
            for (const o of mine) { const pr = o.geometry.parameters;
              if (Math.abs(pr.height - st.lightH) > 0.01 || Math.abs(pr.depth - st.lightW) > 0.01)
                say(v.id, 'a gallery light off the record', `${st.name}: ${pr.height.toFixed(3)} by ${pr.depth.toFixed(3)} m, the record ${st.lightH} by ${st.lightW}`); }
          }
        }
        for (const o of sashes) { const yc = new THREE.Vector3().setFromMatrixPosition(o.parent.matrixWorld).applyMatrix4(invG).y;
          if (!rd.storeys.some(st => Math.abs(st.lightY - yc) <= 0.05))
            say(v.id, 'a stern-light tier off the recorded storeys', `a tier centred at y ${yc.toFixed(2)}; the storeys' lights at ${rd.storeys.map(st => st.lightY).join(', ')}`); }
      }
    }
"""
s = s.replace(anchor, rule + anchor)
open(p, 'w').write(s); print('ok')
