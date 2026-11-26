import sys
p = sys.argv[1] + '/audit-hulls.js'; s = open(p).read()
a = """      for (const k in hit) say(v.id, 'a part that faces the centreline',"""
b = """      /* ── A-INSIDE-OUT (round 338): a closed or tubular part is wound so its faces point away from its
         own middle. The signed volume of a mesh about its bounding-box centre, sum of c.(a x b)/6 over its
         triangles, is positive when it is wound outward and negative when it is inside out, and an
         open sheet sums to little either way. Every furled roll in the fleet and one post on every hull
         summed to minus their whole size until r338. A FrontSide mesh of at least 24 triangles whose
         signed volume is below -0.6 of its unsigned sum is convicted. */
      const io = {};
      g.traverse(o => {
        if (!o.isMesh || !o.material || Array.isArray(o.material) || o.material.side !== THREE.FrontSide || o.userData.facesInboard) return;
        const pa = o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa) return;
        const ix = o.geometry.index, nt = ix ? ix.count / 3 : pa.count / 3; if (nt < 24 || nt > 200000) return;
        const bb = new THREE.Box3().setFromObject(o), cc = bb.getCenter(new THREE.Vector3());
        const flip = o.matrixWorld.determinant() < 0;
        let sv = 0, av = 0;
        for (let t = 0; t < nt; t++) {
          A6.fromBufferAttribute(pa, ix ? ix.getX(3 * t) : 3 * t).applyMatrix4(o.matrixWorld).sub(cc);
          B6.fromBufferAttribute(pa, ix ? ix.getX(3 * t + 1) : 3 * t + 1).applyMatrix4(o.matrixWorld).sub(cc);
          C6.fromBufferAttribute(pa, ix ? ix.getX(3 * t + 2) : 3 * t + 2).applyMatrix4(o.matrixWorld).sub(cc);
          const vv = A6.dot(E1.crossVectors(B6, C6)) / 6 * (flip ? -1 : 1); sv += vv; av += Math.abs(vv);
        }
        if (av > 1e-9 && sv < -0.6 * av) { const pt = tagOf(o), key = ((pt && pt.key) || 'unnamed') + (o.userData.kind ? '/' + o.userData.kind : '');
          (io[key] = io[key] || []).push((sv / av).toFixed(2)); }
      });
      for (const k in io) say(v.id, 'a part wound inside out', `${k}: ${io[k].length} mesh${io[k].length > 1 ? 'es' : ''} whose signed volume about its own centre is ${io[k].slice(0, 6).join(', ')}${io[k].length > 6 ? ', …' : ''} of its unsigned sum, so its faces point inward`);
      for (const k in hit) say(v.id, 'a part that faces the centreline',"""
assert s.count(a) == 1, s.count(a); open(p, 'w').write(s.replace(a, b)); print('A-INSIDE-OUT added', p)
