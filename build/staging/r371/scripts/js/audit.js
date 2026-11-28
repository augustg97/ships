
    /* ── A-ANCHOR-STOPPER (round 371): THE RING HANGS ON A STOPPER BELOW THE CATHEAD, THE SHANK ON A SHANK-PAINTER.
       Steel (1794, vol. 2): the stowed bowers "are secured by their stoppers, from the catheads and shank-painters. The
       stopper has one end clinched round the cathead; the other end passes through the ring of the anchor, returns
       upwards, and leads over a large thumb cleat bolted to the cathead ... the shank-painter is passed under the inner
       fluke round the shank of the anchor". Steel (1822), the cathead's table: three sheaves in its outer end, every rate;
       his glossary: the shank-painter is "a chain bolted through the topside, abaft the cathead". Until r371 the ring
       hung on one rope to its centre, its top 0–0.1 m inside the cathead's underside, and nothing held the shank. On every
       catted anchor, read off the meshes: (a) the ring's highest vertex stands below every cathead vertex over it;
       (b) that cathead carries three sheaves and a thumb cleat; (c) an Anchor stopper passes through the ring (a vertex
       within the ring's inner radius of its centre) and reaches the cathead (a vertex inside its box); (d) a Shank-painter
       on that side comes within the shank's radius plus 0.1 m of the shank, and stands wholly abaft the cathead. */
    if (part.anchor) {
      const invB = new THREE.Matrix4().copy(g.matrixWorld).invert(), w = new THREE.Vector3();
      const vertsOf = o => { const P = []; o.updateMatrixWorld(true); o.traverse(m => { if (!m.isMesh || !m.geometry) return; const a = m.geometry.attributes.position;
        for (let j = 0; j < a.count; j++) { w.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld).applyMatrix4(invB); P.push([w.x, w.y, w.z]); } }); return P; };
      const cats = [], stops = [], paints = [], anchors = [];
      g.traverse(o => {
        const k = o.userData.part && o.userData.part.key;
        if (o.isGroup && k === 'cathead') { let sh = 0, cl = 0; o.traverse(m => { if (m.userData.catSheave) sh++; if (m.userData.thumbCleat) cl++; }); cats.push({ V: vertsOf(o), sh, cl }); }
        if (o.isMesh && o.userData.catStopper) stops.push(vertsOf(o));
        if (o.isMesh && o.userData.shankPainter) paints.push(vertsOf(o));
        if (o.isGroup && k === 'anchor' && o.userData.anchorStow) { let ring = null; o.traverse(m => { if (m.isMesh && m.geometry && m.geometry.type === 'TorusGeometry') ring = m; });
          anchors.push({ st: o.userData.anchorStow, R: ring ? vertsOf(ring) : [], rr: ring ? ring.geometry.parameters.radius - ring.geometry.parameters.tube : 0 }); }
      });
      const sgnOf = P => Math.sign(P.reduce((s2, p) => s2 + p[2], 0)) || 1;
      const box = P => [0, 1, 2].map(i => [Math.min(...P.map(p => p[i])), Math.max(...P.map(p => p[i]))]);
      for (const A of anchors) {
        const st = A.st, sg = Math.sign(st.ring[2]) || 1, ring = st.ring;
        const C = cats.find(c => sgnOf(c.V) === sg);
        if (!C) { say(v.id, 'a catted anchor with no cathead', `ring at x ${ring[0].toFixed(2)}`); continue; }
        const rTop = A.R.length ? Math.max(...A.R.map(p => p[1])) : ring[1];
        const over = C.V.filter(p => Math.abs(p[0] - ring[0]) < A.rr + 0.05 && Math.abs(p[2] - ring[2]) < A.rr + 0.05);
        if (over.length && rTop >= Math.min(...over.map(p => p[1]))) say(v.id, 'an anchor ring inside its cathead', `ring top ${rTop.toFixed(3)}, the cathead's underside over it ${Math.min(...over.map(p => p[1])).toFixed(3)}`);
        if (C.sh !== 3 || C.cl < 1) say(v.id, 'a cathead without its sheaves', `${C.sh} sheaves and ${C.cl} thumb cleat(s); Steel's table gives three sheaves in the outer end`);
        const cb = box(C.V);
        const sp = stops.filter(P => sgnOf(P) === sg);
        const through = sp.some(P => P.some(p => Math.hypot(p[0] - ring[0], p[1] - ring[1], p[2] - ring[2]) < A.rr));
        const reach = sp.some(P => P.some(p => p[0] >= cb[0][0] && p[0] <= cb[0][1] && p[1] >= cb[1][0] - 0.05 && p[1] <= cb[1][1] + 0.05 && p[2] >= cb[2][0] && p[2] <= cb[2][1]));
        if (!sp.length || !through || !reach) say(v.id, 'an anchor ring with no stopper', sp.length ? `stopper ${through ? '' : 'does not pass through the ring '}${reach ? '' : 'does not reach the cathead'}` : 'no Anchor stopper on this side');
        const pp = paints.filter(P => sgnOf(P) === sg);
        const a = new THREE.Vector3(...ring), b = new THREE.Vector3(...st.crown), d = b.clone().sub(a), Ld = d.length(); d.normalize();
        const toShank = p => { const q = new THREE.Vector3(...p).sub(a); const t = Math.max(0, Math.min(Ld, q.dot(d))); return q.addScaledVector(d, -t).length(); };
        const near = pp.length ? Math.min(...pp.flat().map(toShank)) : 9;
        const rS = Ld * 0.021 / 1.0 + 0.1;
        if (!pp.length || near > rS + 0.12) say(v.id, 'an anchor shank with no shank-painter', pp.length ? `nearest shank-painter vertex ${near.toFixed(2)} m from the shank` : 'no Shank-painter on this side');
        else if (Math.min(...pp.flat().map(p => p[0])) <= cb[0][0]) say(v.id, 'a shank-painter forward of the cathead', `foremost painter vertex x ${Math.min(...pp.flat().map(p => p[0])).toFixed(2)}, the cathead's ${cb[0][0].toFixed(2)}`);
      }
    }
