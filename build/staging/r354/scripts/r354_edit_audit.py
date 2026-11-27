import sys
p = sys.argv[1]; s = open(p).read()
RULE = r'''    /* ── A-COVER-PART-LIT (round 354): A PART UNDER A DECK COVER IS LIT AS THE DECK UNDER IT IS. r352 and r353 shade
       the main deck under a deck built over it, and every scene-lit fitting on that deck (the 74's two capstans, her
       gratings and upper-deck guns, the carrack's capstan) kept the scene's full light, because the Shipwright has no
       shadow map. TEST, on every hull whose main deck's material carries covers, from the BUILT scene in hull space:
       every mesh with a scene-lit material (MeshStandardMaterial, Lambert, Phong) that has a vertex under a cover (inside
       its span, above the deck's height at that station less 0.05 m, under the cover less 0.05 m, and inside the shell's
       half-breadth AT THAT HEIGHT, from the cover's per-station record st) must carry the cover term: its material's
       userData.coverLit, and the deck material's own uCover uniform object as userData.coverUniforms, so the part and
       the deck read one set of numbers. A cover with no per-station record is convicted. */
    {
      let covM = null; g.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.covers && o.material.userData.covers.length) covM = o.material; });
      if (covM) {
        const cvs = covM.userData.covers;
        for (const c of cvs) if (!c.st || c.st.length !== 8) say(v.id, 'a deck cover with no per-station record for its parts', `${c.from} ${c.name}: st has ${c.st ? c.st.length : 0} stations`);
        g.updateMatrixWorld(true);
        const invP = new THREE.Matrix4().copy(g.matrixWorld).invert(), Mi = new THREE.Matrix4(), Mm = new THREE.Matrix4(), q = new THREE.Vector3();
        const under = q2 => cvs.some(c => { if (!c.st || q2.x < c.x0 || q2.x > c.x1 || q2.y > c.y - 0.05) return false;
          const t = Math.min(6.999, (q2.x - c.x0) / Math.max(c.x1 - c.x0, 1e-3) * 7), k = Math.floor(t), f = t - k;
          const st = [0, 1, 2].map(j => c.st[k][j] + (c.st[k + 1][j] - c.st[k][j]) * f);
          if (q2.y < st[2] - 0.05) return false;
          const hw = st[0] + (st[1] - st[0]) * Math.max(0, Math.min(1, (q2.y - st[2]) / Math.max(c.y - st[2], 0.1)));
          return Math.abs(q2.z) < hw; });
        const tally = {};
        g.traverse(o => { const m = o.isMesh && o.material;
          if (!m || Array.isArray(m) || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
          if (m.userData && m.userData.coverLit && m.userData.coverUniforms === covM.uniforms.uCover) return;
          const a = o.geometry.attributes.position, nI = o.isInstancedMesh ? o.count : 1; let hit = 0;
          for (let i = 0; i < nI && !hit; i++) {
            Mm.multiplyMatrices(invP, o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(i, Mi); Mm.multiply(Mi); }
            for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(Mm); if (under(q)) { hit = 1; break; } } }
          if (!hit) return;
          let nm = o.name || ''; for (let pp = o; pp && !nm; pp = pp.parent) nm = (pp.userData && pp.userData.part && (pp.userData.part.name || pp.userData.part.key)) || pp.name || '';
          const why = !(m.userData && m.userData.coverLit) ? 'no cover term' : 'the cover term on its own uniforms';
          const key = (nm || '?') + ' (' + why + ')'; tally[key] = (tally[key] || 0) + 1; });
        for (const [k, n] of Object.entries(tally)) say(v.id, 'a part under a deck cover lit as open sky', `${k}: ${n} mesh(es)`);
      }
    }
'''
anchor = '    /* ── D-MAST-STEP (round 248): A MAST ON A DOUBLE HULL STEPS ON THE PLATFORM.'
assert s.count(anchor) == 1; s = s.replace(anchor, RULE + anchor)
open(p, 'w').write(s); print('ok')
