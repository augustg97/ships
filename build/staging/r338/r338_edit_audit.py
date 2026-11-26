import sys
p = sys.argv[1] + '/audit-hulls.js'; s = open(p).read()
a = """    if (part.container || part.forecast) {
      const H2 = SHIPS_HULL.hullSurface(H);"""
b = """    /* ── A-STRIP-FACES (round 338): A ONE-SIDED PART FACES OUT FROM THE CENTRELINE ON BOTH SIDES.
       buildWaleGeometry wound both sides' strips in one order, so the port strips faced inboard and
       FrontSide culled them from outside: no port wale reached the screen on any timber hull until r338,
       and nothing in the audit could see it, because the meshes were built, visible and in place. On each
       side of every FrontSide mesh, count the triangles whose face normal is mostly athwartships
       (|nz| > 0.5 of its length) and whose centroid stands more than 0.05 m off the centreline. A closed
       solid has as many faces turned in as out; an open strip laid on the shell has all of them one way.
       If at least 8 such triangles stand on a side and over 90% of them face the centreline, the part is
       convicted. Parts drawn to be seen from inboard (a bulwark's inner face) carry
       userData.facesInboard and are skipped. */
    {
      g.updateMatrixWorld(true);
      const A6 = new THREE.Vector3(), B6 = new THREE.Vector3(), C6 = new THREE.Vector3(), E1 = new THREE.Vector3(), E2 = new THREE.Vector3();
      const hit = {};
      g.traverse(o => {
        if (!o.isMesh || !o.material || Array.isArray(o.material) || o.material.side !== THREE.FrontSide || o.userData.facesInboard) return;
        const pa = o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa) return;
        const ix = o.geometry.index, nt = ix ? ix.count / 3 : pa.count / 3; if (nt > 200000) return;
        const flip = o.matrixWorld.determinant() < 0;
        const cnt = { p: [0, 0], s: [0, 0] };
        for (let t = 0; t < nt; t++) {
          A6.fromBufferAttribute(pa, ix ? ix.getX(3 * t) : 3 * t).applyMatrix4(o.matrixWorld);
          B6.fromBufferAttribute(pa, ix ? ix.getX(3 * t + 1) : 3 * t + 1).applyMatrix4(o.matrixWorld);
          C6.fromBufferAttribute(pa, ix ? ix.getX(3 * t + 2) : 3 * t + 2).applyMatrix4(o.matrixWorld);
          E1.subVectors(B6, A6); E2.subVectors(C6, A6); E1.cross(E2); if (flip) E1.negate();
          const L = E1.length(); if (!(L > 1e-12) || Math.abs(E1.z) < 0.5 * L) continue;
          const cz = (A6.z + B6.z + C6.z) / 3; if (Math.abs(cz) < 0.05) continue;
          const sd = cz > 0 ? cnt.p : cnt.s; sd[(E1.z > 0) === (cz > 0) ? 0 : 1]++;
        }
        for (const [k, nm] of [['p', 'port'], ['s', 'starboard']]) {
          const [out, inn] = cnt[k];
          if (out + inn >= 8 && inn > 0.9 * (out + inn)) {
            const pt = tagOf(o), key = (pt && pt.key) || o.name || 'unnamed';
            (hit[key + ' (' + nm + ')'] = hit[key + ' (' + nm + ')'] || []).push(`${inn} of ${out + inn}`);
          }
        }
      });
      for (const k in hit) say(v.id, 'a part that faces the centreline', `${k}: ${hit[k].join(', ')} athwartships triangles face inboard on a FrontSide material, so it is culled from outside`);
    }

    if (part.container || part.forecast) {
      const H2 = SHIPS_HULL.hullSurface(H);"""
assert s.count(a) == 1, s.count(a); s = s.replace(a, b); open(p, 'w').write(s); print('A-STRIP-FACES added', p)
