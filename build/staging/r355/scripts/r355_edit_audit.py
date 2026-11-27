import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]; s = s.replace(a, b)
# 1. A-COVER-PART-LIT: the closed end from the SKIN at the vertex's height, not from the builder's record
rep("""        const under = q2 => cvs.some(c => { if (!c.st || q2.x < c.x0 || q2.x > c.x1 || q2.y > c.y - 0.05) return false;
          if (c.open < 0 ? q2.x > c.x1 - (c.endIn || 0) : q2.x < c.x0 + (c.endIn || 0)) return false;   // short of a closed end (r354)""",
"""        /* r355: a closed end is the skin's own end at the vertex's height (u = 1 aft, 0 forward), read off the surface
           here, so the rule does not take the builder's endOff/endLean on trust; the 74's stern rakes 2 m */
        const HSc = SHIPS_HULL.hullSurface(H), endX = {};
        const skinEnd = (uE, y) => { const k = uE + ':' + y.toFixed(2); if (endX[k] !== undefined) return endX[k];
          let a = 0, b = 1; if (SHIPS_HULL.surfacePoint(H, HSc, uE, 1.0)[1] <= y) a = b = 1;
          for (let i = 0; i < 26 && a < b; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSc, uE, m)[1] < y) a = m; else b = m; }
          return (endX[k] = SHIPS_HULL.surfacePoint(H, HSc, uE, (a + b) / 2)[0]); };
        const under = q2 => cvs.some(c => { if (!c.st || q2.x < c.x0 || q2.x > c.x1 || q2.y > c.y - 0.05) return false;
          if (c.endIn) { const xe = skinEnd(c.open < 0 ? 1 : 0, q2.y);
            if (c.open < 0 ? q2.x > xe - c.endIn : q2.x < xe + c.endIn) return false; }   // short of a closed end (r354, leaning r355)""")
# 2. A-STERN-ON-FACE
anchor = """    /* ── A-COVER-PART-LIT (round 354)"""
rule = """    /* ── A-STERN-ON-FACE (round 355): THE STERN'S FURNITURE STANDS ON THE FACE AT ITS OWN HEIGHT. buildStern set every
       light, moulding and gallery at the face's x at the SHEER, under a comment that the face is vertical; the loft's
       rake had made it 2 m out of upright on the 74, so her lower tier of lights stood 1.2 m aft of the face, each
       gallery's drum hung 1.3 m off its corner at the bottom, and the cornice, a full disc about the corner, stood three
       quarters inside the stern. TEST, from the BUILT scene in hull space against the skin's end (u = 1) read off the
       surface at each vertex's height: (a) every 'sternlight' and 'transom' moulding mesh lies within 0.35 m of the
       face, aft of it by no more than that and forward of it by no more than 0.05 m, at every vertex; (b) every
       'gallery' mesh has no vertex more than 0.05 m forward of the face AND inside the corner's half-breadth less
       0.05 m there (inside the stern), and the drums, the meshes with more than 40 vertices, reach the corner line
       (some vertex within 0.08 m of it in plan). */
    {
      const HSs = SHIPS_HULL.hullSurface(H), memo = {};
      const atY = y => { const k = y.toFixed(2); if (memo[k]) return memo[k];
        let a = 0, b = 1; if (SHIPS_HULL.surfacePoint(H, HSs, 1, 1.0)[1] <= y) a = b = 1;
        for (let i = 0; i < 26 && a < b; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSs, 1, m)[1] < y) a = m; else b = m; }
        const p = SHIPS_HULL.surfacePoint(H, HSs, 1, (a + b) / 2); return (memo[k] = [p[0], Math.abs(p[2])]); };
      g.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), M = new THREE.Matrix4(), q = new THREE.Vector3();
      const bad = {};
      g.traverse(o => { if (!o.isMesh) return; let key = null;
        for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
        if (key !== 'sternlight' && key !== 'gallery' && !(key === 'transom' && o.geometry.type === 'CylinderGeometry')) return;
        M.multiplyMatrices(inv, o.matrixWorld); const a = o.geometry.attributes.position;
        let worst = 0, inside = 0, near = 1e9;
        for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(M); const [xf, hf] = atY(q.y), d = q.x - xf;
          if (key === 'gallery') { if (d < -0.05 && Math.abs(q.z) < hf - 0.05) inside++; near = Math.min(near, Math.hypot(d, Math.abs(q.z) - hf)); }
          else worst = Math.max(worst, d > 0.35 ? d - 0.35 : d < -0.05 ? -0.05 - d : 0); }
        if (key === 'gallery') {
          if (inside) bad['gallery: ' + inside + ' vertices inside the stern'] = (bad['gallery: ' + inside + ' vertices inside the stern'] || 0) + 1;
          if (a.count > 40 && near > 0.08) bad['gallery drum ' + near.toFixed(2) + ' m off the corner'] = 1;
        } else if (worst > 0) { const k = key + ' off the face by ' + worst.toFixed(2) + ' m'; bad[k] = (bad[k] || 0) + 1; } });
      for (const [k, n] of Object.entries(bad)) say(v.id, 'stern furniture off the raked face', `${k} (${n} mesh(es))`);
    }
"""
rep(anchor, rule + anchor)
open(p, 'w').write(s); print('ok')
