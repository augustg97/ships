import sys
p = sys.argv[1]; s = open(p).read()
old = """    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99) ─────────────────────────────"""
new = r"""    /* ── A-ANCHOR-FORM (round 366): THE ARMS RISE FROM THE CROWN TOWARD THE RING. Falconer (1769, ANCHOR): the arms
       are at the shank's lower end, "inclined to the shank at an angle of sixty degrees", with the flukes on their
       upper side. Until r366 each arm left the shank above its end and ran down and out, 97° from the shank's line
       to the ring, and the bower read as a crossbow. Read off the meshes: the shank is the anchor's longest cylinder,
       the ring its torus, the crown the shank's end away from the ring; every other round cylinder (12 or more sides,
       which leaves out the square stock) is an arm, and its vertex farthest from the crown is its bill. The angle at
       the crown between the bill and the ring must be 60° within 5°. */
    g.traverse(o => {
      if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'anchor') return;
      const cyl = [], tor = [];
      o.traverse(m => { if (!m.isMesh || !m.geometry) return;
        if (m.geometry.type === 'CylinderGeometry') cyl.push(m); if (m.geometry.type === 'TorusGeometry') tor.push(m); });
      if (!cyl.length || !tor.length) return;
      o.updateMatrixWorld(true);
      const shank = cyl.reduce((a, b) => (b.geometry.parameters.height > a.geometry.parameters.height ? b : a), cyl[0]);
      const ringC = new THREE.Box3().setFromObject(tor[0]).getCenter(new THREE.Vector3());
      const hh = shank.geometry.parameters.height / 2;
      const e1 = new THREE.Vector3(0, hh, 0).applyMatrix4(shank.matrixWorld), e2 = new THREE.Vector3(0, -hh, 0).applyMatrix4(shank.matrixWorld);
      const crown = e1.distanceTo(ringC) > e2.distanceTo(ringC) ? e1 : e2;
      const toRing = ringC.clone().sub(crown).normalize();
      const angs = [];
      for (const m of cyl) {
        if (m === shank || m.geometry.parameters.radialSegments < 8) continue;
        const a = m.geometry.attributes.position, w = new THREE.Vector3(); let far = null, fd = -1;
        for (let j = 0; j < a.count; j++) { w.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld); const d = w.distanceTo(crown); if (d > fd) { fd = d; far = w.clone(); } }
        angs.push(Math.acos(Math.max(-1, Math.min(1, far.sub(crown).normalize().dot(toRing)))) * 180 / Math.PI);
      }
      const bad = angs.filter(a => Math.abs(a - 60) > 5);
      if (!angs.length) say(v.id, 'an anchor with no arms', 'no round cylinder but the shank');
      else if (bad.length) say(v.id, 'anchor arms not at sixty degrees to the shank', `bill-crown-ring angles ${angs.map(a => a.toFixed(1)).join(', ')}°; Falconer gives 60°, the arms rising from the crown toward the ring`);
    });

    /* ── A-ANCHOR-CLEAR (round 366): A CATTED BOWER STANDS OUTSIDE THE SHIP AND CLEAR OF THE SHROUDS. On a hull with a
       cathead, (a) no anchor vertex stands inside the skin at its own station and height (r366 found the stock's
       inboard half 0.30–0.92 m inside the bow on six hulls, from the round-99 stow that laid the arms flat on the side and
       so stood a shank-long stock square off it); (b) no lower shroud passes within 0.05 m of an anchor vertex at that
       vertex's height (r365 found a fore shroud 0.82 m inboard of the 74's upper arm); (c) one bill rests on the side, as
       Steel stows it on the anchor-lining under the fore channel: the arm tip nearest the side stands within 0.5 m of the
       skin and below the sheer. The bows without a cathead (the corbita, and the iron Preussen and steamer) are not
       judged here: their anchors stand 0.4–0.7 m into the bow, a fault carried to r367 in HANDOFF.md. */
    if (part.cathead) {
      const HSa = SHIPS_HULL.hullSurface(H), invA = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const L = H.lwl, w = new THREE.Vector3();
      const uAt = (x, vv) => { let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSa, m, vv)[0] < x) a = m; else b = m; } return (a + b) / 2; };
      const halfAt = (x, y) => { const u = uAt(x, 0.9); if (SHIPS_HULL.surfacePoint(H, HSa, u, 1)[1] < y) return null;
        let a = 0, b = 1; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSa, u, m)[1] < y) a = m; else b = m; }
        return Math.abs(SHIPS_HULL.surfacePoint(H, HSa, u, (a + b) / 2)[2]); };
      const segs = [];
      g.traverse(m => { if (!m.isMesh || !m.userData.part || m.userData.part.key !== 'shroud' || m.userData.part.name !== 'Shrouds') return;
        const a = m.geometry.attributes.position, Q = [];
        for (let j = 0; j < a.count; j++) { w.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld).applyMatrix4(invA); Q.push([w.x, w.y, w.z]); }
        const c = A => A.reduce((s2, p) => [s2[0] + p[0] / A.length, s2[1] + p[1] / A.length, s2[2] + p[2] / A.length], [0, 0, 0]);
        for (let i = 0; i + 7 < Q.length; i += 8) { const p = c(Q.slice(i, i + 4)), q = c(Q.slice(i + 4, i + 8)); segs.push(p[1] < q[1] ? [p, q] : [q, p]); } });
      g.traverse(o => {
        if (!o.isGroup || !o.userData.part || o.userData.part.key !== 'anchor') return;
        const P = [], tips = [];
        o.traverse(m => { if (!m.isMesh || !m.geometry) return; const a = m.geometry.attributes.position;
          for (let j = 0; j < a.count; j++) { w.fromBufferAttribute(a, j).applyMatrix4(m.matrixWorld).applyMatrix4(invA); P.push([w.x, w.y, w.z]); } });
        if (!P.length) return;
        const sg = Math.sign(P.reduce((s2, p) => s2 + p[2], 0)) || 1;
        let inside = 0, worst = 1e9, at = null, near = 1e9, nearAt = null;
        for (const p of P) { const h = halfAt(p[0], p[1]); if (h === null) continue; const d = Math.abs(p[2]) - h;
          if (d < -0.005) { inside++; if (d < worst) { worst = d; at = p; } }
          if (d < near) { near = d; nearAt = p; } }
        if (inside) say(v.id, 'a catted anchor inside the bow', `${inside} vertices inside the skin, worst ${(-worst).toFixed(3)} m at x ${at[0].toFixed(2)}, y ${at[1].toFixed(2)}`);
        if (near > 0.5) say(v.id, 'a catted anchor with no bill on the side', `nearest anchor vertex ${near.toFixed(2)} m off the skin`);
        let hit = null;
        for (const [a, b] of segs) { if (Math.sign(a[2]) !== sg) continue;
          for (const p of P) { const t = (p[1] - a[1]) / (b[1] - a[1]); if (!(t >= 0 && t <= 1)) continue;
            const x = a[0] + (b[0] - a[0]) * t, z = Math.abs(a[2] + (b[2] - a[2]) * t); if (Math.abs(p[0] - x) > 0.06) continue;
            const gap = z - Math.abs(p[2]); if (Math.abs(gap) < 0.05 || gap < 0) { if (!hit || gap < hit.gap) hit = { gap, x, y: p[1] }; } } }
        if (hit) say(v.id, 'a shroud through the catted anchor', `a lower shroud ${hit.gap.toFixed(3)} m from an anchor vertex at x ${hit.x.toFixed(2)}, y ${hit.y.toFixed(2)}`);
      });
    }

    /* ── A STOWED BOWER LIES FLAT ALONG THE SIDE (round 99) ─────────────────────────────"""
assert s.count(old) == 1, 'anchor anchor'
s = s.replace(old, new)
open(p, 'w').write(s); print('audit edited')
