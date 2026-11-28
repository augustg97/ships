import sys
p = sys.argv[1]
s = open(p).read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)
rep("""      const halfAt = (x, y) => { const u = uAt(x, 0.9);
        if (SHIPS_HULL.surfacePoint(H, HSa, u, 1)[1] < y) { const t = HSa.islandTop ? HSa.islandTop(u) : null;
          return t !== null && y <= t ? Math.abs(SHIPS_HULL.surfacePoint(H, HSa, u, 1)[2]) : null; }""",
"""      /* ⚠ THE SHEER IS READ AT THE VERTEX'S OWN STATION (round 372). Until r372 the test "is this vertex above the sheer"
         read the sheer at the u where the side crosses the vertex's x at v 0.9; at a raked stem that u's sheer stands
         0.38 m forward (the carrack), so a bill resting on the gunwale read as 2.4 cm inside the skin. */
      const halfAt = (x, y) => { const u = uAt(x, 0.9), u1 = uAt(x, 1);
        if (SHIPS_HULL.surfacePoint(H, HSa, u1, 1)[1] < y) { const t = HSa.islandTop ? HSa.islandTop(u1) : null;
          return t !== null && y <= t ? Math.abs(SHIPS_HULL.surfacePoint(H, HSa, u1, 1)[2]) : null; }""")
rep("""    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99), RETIRED IN ROUND 366.""",
"""    /* ── A-ANCHOR-GUNWALE (round 372): THE STOWED BOWER'S INNER ARM RESTS ON THE GUNWALE. Steel (1794, vol. 2): "the
       flukes of the anchor are raised and placed on the gunwale, where it is made fast: by the shank-painter chain".
       Lever (1808; 1827 ed., p. 69): "When the Anchors are stowed, the inner Arms rest on the Gunnel." Until r372 the
       bill lay on the side a bill's breadth under the sheer and no part of the anchor touched the top of the side. Where
       the top of the side (the sheer, or an island's top) at the cathead's after end stands under the cathead's highest
       vertex, some anchor vertex abaft the cathead stands on the top of the side at its own station: no more than 0.15 m
       above it, no lower than 2 cm under it, and over it (inboard of the side's outer face there, by less than 0.5 m).
       Where the top stands over the cathead (the 74's forecastle rail), the bill is on Steel's bill-board and
       A-ANCHOR-BILLBOARD judges it. */
    if (part.anchor && part.cathead) {
      const HSg = SHIPS_HULL.hullSurface(H), invG = new THREE.Matrix4().copy(g.matrixWorld).invert(), w = new THREE.Vector3();
      const uAt = x => { let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSg, m, 1)[0] < x) a = m; else b = m; } return (a + b) / 2; };
      const topAt = x => { const u = uAt(x), p = SHIPS_HULL.surfacePoint(H, HSg, u, 1), t = HSg.islandTop ? HSg.islandTop(u) : null;
        return { y: t !== null && t > p[1] ? t : p[1], half: Math.abs(p[2]) }; };
      const vertsOf = o => { const P = []; o.updateMatrixWorld(true); o.traverse(m => { if (!m.isMesh || !m.geometry) return; const a = m.geometry.attributes.position;
        for (let j = 0; j < a.count; j++) { w.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld).applyMatrix4(invG); P.push([w.x, w.y, w.z]); } }); return P; };
      const cats = [], anchors = [];
      g.traverse(o => { const k = o.userData.part && o.userData.part.key;
        if (o.isGroup && k === 'cathead') cats.push(vertsOf(o));
        if (o.isGroup && k === 'anchor' && o.userData.anchorStow) anchors.push(vertsOf(o)); });
      const sgnOf = P => Math.sign(P.reduce((s2, p) => s2 + p[2], 0)) || 1;
      for (const P of anchors) {
        const sg = sgnOf(P), C = cats.find(c => sgnOf(c) === sg);
        if (!C) continue;
        const xAft = Math.max(...C.map(p => p[0])), cTop = Math.max(...C.map(p => p[1]));
        if (topAt(xAft).y >= cTop) continue;
        let best = null;
        for (const p of P) { if (p[0] <= xAft) continue; const T = topAt(p[0]), dy = p[1] - T.y, dz = T.half - Math.abs(p[2]);
          if (dy >= -0.02 && dy <= 0.15 && dz >= 0 && dz < 0.5) { best = p; break; } }
        if (!best) { let hi = null; for (const p of P) if (p[0] > xAft) { const d = p[1] - topAt(p[0]).y; if (!hi || d > hi.d) hi = { d, p }; }
          say(v.id, 'a stowed bower with no arm on the gunwale', hi ? `the anchor's highest point abaft the cathead stands ${hi.d.toFixed(2)} m from the top of the side at x ${hi.p[0].toFixed(2)}, ${Math.abs(hi.p[2]).toFixed(2)} m off the centreline` : 'no anchor vertex abaft the cathead'); }
      }
    }

    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99), RETIRED IN ROUND 366.""")
open(p, 'w').write(s); print('ok')
