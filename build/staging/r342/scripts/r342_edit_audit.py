import sys
p = sys.argv[1] + '/audit-hulls.js'
s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, ('anchor count', s.count(a), a[:80])
    s = s.replace(a, b)

# 1. the cap's underside at the stanchion's own x (interpolated), and the skin at each vertex's own height
rep("""        const capAtX = (xq, sgn) => { if (!capPts) capPts = [].concat(...capM.map(pts));
          let under = 1e9, outer = 0, n = 0; for (const q of capPts) { if (Math.sign(q.z) !== sgn || Math.abs(q.x - xq) > 0.35) continue;
            under = Math.min(under, q.y); outer = Math.max(outer, Math.abs(q.z)); n++; } return n ? { under, outer } : null; };""",
"""        /* r342: the cap's underside AT the stanchion's x. The minimum over a 0.7 m window took the
           lower end of a rising sheer, so on the 74's bow (0.16 m of rise a metre) a stanchion
           a hand under its own cap read 0.02 m through it. Each cap station's lowest point, then
           a straight line between the two stations either side of x. */
        const capAtX = (xq, sgn) => { if (!capPts) capPts = [].concat(...capM.map(pts));
          const st = new Map(); let outer = 0, n = 0;
          for (const q of capPts) { if (Math.sign(q.z) !== sgn || Math.abs(q.x - xq) > 0.8) continue;
            const k = Math.round(q.x * 50); st.set(k, Math.min(st.has(k) ? st.get(k) : 1e9, q.y));
            if (Math.abs(q.x - xq) <= 0.35) { outer = Math.max(outer, Math.abs(q.z)); n++; } }
          if (!n) return null;
          const S2 = [...st.entries()].map(([k, y]) => [k / 50, y]).sort((a, b) => a[0] - b[0]);
          let lo = null, hi = null; for (const e of S2) { if (e[0] <= xq) lo = e; else if (!hi) hi = e; }
          const under = lo && hi ? lo[1] + (hi[1] - lo[1]) * (xq - lo[0]) / Math.max(1e-6, hi[0] - lo[0]) : (lo || hi)[1];
          return { under, outer }; };
        /* r342: the planking's half-breadth at a point's OWN height. A tumblehome side is wider at
           the deck than at the cap, so a stanchion standing a hand inside the planking at its foot
           stood 0.024 m outboard of the CAP's outer edge on the 74 (52 of them), and the rule read
           that as through the planking. The skin vertices within 0.3 m in x and 0.15 in y. */
        let skinPts = null;
        const skinHalfAt = (xq, yq) => { if (!skinPts) { skinPts = []; g.traverse(o => { const p = tagOf(o); if (o.isMesh && p && p.key === 'planking') skinPts.push(...pts(o)); }); }
          let w = 0; for (const q of skinPts) if (Math.abs(q.x - xq) < 0.3 && Math.abs(q.y - yq) < 0.15) w = Math.max(w, Math.abs(q.z)); return w; };""")

rep("""          const P = pts(o); let yF = 1e9, yH = -1e9, x = 0, zOut = 0, sgn = 0;
          for (const q of P) { yF = Math.min(yF, q.y); yH = Math.max(yH, q.y); x += q.x; zOut = Math.max(zOut, Math.abs(q.z)); sgn += q.z; }""",
"""          const P = pts(o); let yF = 1e9, yH = -1e9, x = 0, zOut = 0, sgn = 0, proud = -1e9, proudAt = null;
          for (const q of P) { yF = Math.min(yF, q.y); yH = Math.max(yH, q.y); x += q.x; zOut = Math.max(zOut, Math.abs(q.z)); sgn += q.z;
            const sk = skinHalfAt(q.x, q.y); if (sk > 0 && Math.abs(q.z) - sk > proud) { proud = Math.abs(q.z) - sk; proudAt = [q.y, Math.abs(q.z), sk]; } }""")

rep("""            if (zOut > c.outer + 0.01) say(v.id, 'a stanchion outside the planking', `${at}: its outer face at |z| ${zOut.toFixed(3)} stands ${(zOut - c.outer).toFixed(3)} m outside the cap's outer edge (${c.outer.toFixed(3)})`);""",
"""            if (proudAt && proud > 0.01) say(v.id, 'a stanchion outside the planking', `${at}: at y ${proudAt[0].toFixed(2)} its outer face at |z| ${proudAt[1].toFixed(3)} stands ${proud.toFixed(3)} m outside the planking at that height (${proudAt[2].toFixed(3)})`);""")

# 2. the fife rail against the mast as BUILT, not (at - 0.5) * L
rep("""        const fifePins = [];
        for (const { m, i } of sq) {
          const xm = (m.at - 0.5) * L, at = `mast ${i} (station ${m.at})`;""",
"""        const fifePins = [];
        /* r342: the mast where it is DRAWN at the deck. (at − 0.5)·lwl is not the builder's x — a
           station maps through the loft's deck line (r293) — and on the 74 it stood 1.3 m forward
           of the fore mast, so a rail round the real mast read as a rail beside it. The mast meshes'
           foot ring within 0.6 m of the deck and 3 m of the nominal x (a cylinder has vertices only at its
           ends): the middle of its x span. */
        const mastMs = []; g.traverse(o => { const p = tagOf(o); if (o.isMesh && p && p.key === 'mast' && !/nest|leg/i.test(p.name || '')) mastMs.push(o); });
        let mastPts = null;
        const mastXAt = (xn, e) => { if (!mastPts) mastPts = [].concat(...mastMs.map(pts));
          let a = 1e9, b = -1e9; for (const q of mastPts) if (Math.abs(q.x - xn) < 3 && Math.abs(q.y - e) < 0.6 && Math.abs(q.z) < 1.5) { a = Math.min(a, q.x); b = Math.max(b, q.x); }
          return a < 1e8 ? (a + b) / 2 : xn; };
        for (const { m, i } of sq) {
          const xn = (m.at - 0.5) * L, xm = mastXAt(xn, deckAtX(xn)), at = `mast ${i} (station ${m.at})`;""")
open(p, 'w').write(s)
print('audit edits applied')
