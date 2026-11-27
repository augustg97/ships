import sys
P = sys.argv[1]
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:90]); s = s.replace(a, b)

# (e) channels and deadeyes over a drawn port
rep("""            if (key !== 'gallery' && key !== 'cathead') return;""",
"""            if (key !== 'gallery' && key !== 'cathead' && key !== 'channel' && key !== 'deadeye') return;""")
rep("""              if (q.y > sill && q.y < head && Math.abs(q.z) > zS - 0.02) { if (key === 'cathead') overC++; else if (k < xs.length - cov) over++; else covered.add(k); } } });""",
"""              if (q.y > sill && q.y < head && Math.abs(q.z) > zS - 0.02) { if (key === 'cathead') overC++; else if (key === 'channel' || key === 'deadeye') overCh++; else if (k < xs.length - cov) over++; else covered.add(k); } } });""")
rep("""          let over = 0, overC = 0; const covered = new Set();""", """          let over = 0, overC = 0, overCh = 0; const covered = new Set();""")
rep("""          if (overC) say(v.id, 'a cathead over a gunport', `tier ${d}: ${overC} cathead vertices inside a drawn port's span`);""",
"""          if (overC) say(v.id, 'a cathead over a gunport', `tier ${d}: ${overC} cathead vertices inside a drawn port's span`);
          /* r365: and no channel or deadeye: the class channel stood at 0.97 of the sheer, across the upper tier's ports */
          if (overCh) say(v.id, 'a channel over a gunport', `tier ${d}: ${overCh} channel or deadeye vertices inside a drawn port's span`);""")

# D-SHROUDS: a long recorded channel is centred well abaft its mast; a deadeye reads the channel's top at its own x
rep("""        else if (p.key === 'channel') { const pts = worldS(o), xs = pts.map(q => q[0]); chans.push({ c: cenOf(pts), xMin: Math.min(...xs), xMax: Math.max(...xs) }); }""",
"""        else if (p.key === 'channel') { const pts = worldS(o), xs = pts.map(q => q[0]); chans.push({ c: cenOf(pts), xMin: Math.min(...xs), xMax: Math.max(...xs), rec: !!(o.userData.channel && o.userData.channel.rec), pts }); }""")
rep("""        const on = chans.some(c => Math.sign(c.c[2]) === Math.sign(d.c[2]) && d.c[0] >= c.xMin - 0.02 && d.c[0] <= c.xMax + 0.02 && d.c[1] - c.c[1] > -0.1 && d.c[1] - c.c[1] < 0.5);""",
"""        /* r365: a recorded channel follows the sheer over 6-11 m, so its centre's height says nothing at its ends:
           a deadeye on one is read against the channel's own top within 0.3 m of it */
        const localTop = c => { let t = -Infinity; for (const q of c.pts) if (Math.abs(q[0] - d.c[0]) < 0.3 && Math.sign(q[2]) === Math.sign(d.c[2])) t = Math.max(t, q[1]); return t; };
        const on = chans.some(c => Math.sign(c.c[2]) === Math.sign(d.c[2]) && d.c[0] >= c.xMin - 0.02 && d.c[0] <= c.xMax + 0.02
          && (c.rec ? (d.c[1] - localTop(c) > 0 && d.c[1] - localTop(c) < 0.5) : (d.c[1] - c.c[1] > -0.1 && d.c[1] - c.c[1] < 0.5)));""")
rep("""          if (!chans.some(c => Math.sign(c.c[2]) === sgn && Math.abs(c.c[0] - mx) < 0.06 * H.lwl))""",
"""          if (!chans.some(c => Math.sign(c.c[2]) === sgn && (c.rec ? mx >= c.xMin - 0.06 * H.lwl && mx <= c.xMax + 0.06 * H.lwl : Math.abs(c.c[0] - mx) < 0.06 * H.lwl)))""")

# A-CHANNEL-RECORD
anchor = """    /* ── A-GUN-FORM (round 361):"""
rep(anchor, """    /* ── A-CHANNEL-RECORD (round 365): A RECORDED CHANNEL IS DRAWN AS STEEL LAYS IT. Folio LIII gives each channel of a
       74 its length, its breadth, its thickness and where its foremost end stands afore its mast, and puts its upper edge
       at the top of the side. Read off the built scene, for every mast the record lays a channel for, on each side:
       (a) one channel mesh, recorded; (b) its fore-and-aft extent within 0.05 m of lenM, and its foremost end within
       0.10 m of foreM afore the mast's foot as built (the foot ring's centre, as A-PORT-STATIONS reads it); (c) its
       highest vertex at every station within 0.03 m of the top of the side there; (d) its breadth out from the side
       within 0.03 m of breadthM; (e) a deadeye for each shroud on it. */
    if (H.channels && Array.isArray(H.channels.masts)) {
      const HSc = SHIPS_HULL.hullSurface(H);
      const invC = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const feet = [];
      g.traverse(o => { if (!o.isMesh) return; let key = null; for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
        if (key === 'mast' || key === 'masts') feet.push(o); });
      H.channels.masts.forEach((R, mi) => {
        const mk = (H.masts || [])[mi]; if (!R || !mk) return;
        const mx = (mk.at - 0.5) * H.lwl + HSc.rake(mk.at);
        for (const sgn of [-1, 1]) {
          const ch = []; const des = [];
          g.traverse(o => { if (!o.isMesh || o.userData.mast !== mi && !(o.parent && o.parent.userData.mast === mi)) return;
            let key = null; for (let pp = o; pp && !key; pp = pp.parent) key = pp.userData && pp.userData.part && pp.userData.part.key;
            const M = new THREE.Matrix4().multiplyMatrices(invC, o.matrixWorld), a = o.geometry.attributes.position, q = new THREE.Vector3(), pts = [];
            for (let j = 0; j < a.count; j++) { q.fromBufferAttribute(a, j).applyMatrix4(M); pts.push([q.x, q.y, q.z]); }
            const zc = pts.reduce((s2, p) => s2 + p[2], 0) / pts.length; if (Math.sign(zc) !== sgn) return;
            if (key === 'channel') ch.push({ o, pts }); else if (key === 'deadeye') des.push(pts); });
          const side = sideOf(sgn);
          if (ch.length !== 1 || !ch[0].o.userData.channel || !ch[0].o.userData.channel.rec) { say(v.id, 'a recorded channel not drawn', `mast ${mi}, ${side}: ${ch.length} channel mesh(es), ${ch.length && ch[0].o.userData.channel ? 'recorded' : 'not recorded'}`); continue; }
          const P = ch[0].pts, xs2 = P.map(p => p[0]), x0 = Math.min(...xs2), x1 = Math.max(...xs2);
          if (Math.abs((x1 - x0) - R.lenM) > 0.05) say(v.id, 'a channel not Steel\\'s length', `mast ${mi}, ${side}: ${(x1 - x0).toFixed(3)} m against ${R.lenM}`);
          if (Math.abs((mx - x0) - R.foreM) > 0.10) say(v.id, 'a channel\\'s foremost end off its station', `mast ${mi}, ${side}: ${(mx - x0).toFixed(3)} m afore the mast against ${R.foreM}`);
          let worstY = 0, worstW = 0;
          const st = [...new Set(xs2.map(x => x.toFixed(3)))].map(Number);
          for (const x of st) {
            const at = P.filter(p => Math.abs(p[0] - x) < 1e-3);
            const top = Math.max(...at.map(p => p[1])), zin = Math.min(...at.map(p => Math.abs(p[2]))), zout = Math.max(...at.map(p => Math.abs(p[2])));
            const u = SHIPS_HULL.uAtXV ? null : null;
            let lo = 0, hi = 1; for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (SHIPS_HULL.surfacePoint(H, HSc, m, 1)[0] < x) lo = m; else hi = m; }
            const sk = SHIPS_HULL.surfacePoint(H, HSc, (lo + hi) / 2, 1);
            worstY = Math.max(worstY, Math.abs(top - sk[1]));
            worstW = Math.max(worstW, Math.abs((zout - Math.abs(sk[2])) - R.breadthM));
          }
          if (worstY > 0.03) say(v.id, 'a channel off the top of the side', `mast ${mi}, ${side}: its upper edge stands up to ${worstY.toFixed(3)} m off the top-timber line`);
          if (worstW > 0.03) say(v.id, 'a channel not Steel\\'s breadth', `mast ${mi}, ${side}: off by up to ${worstW.toFixed(3)} m`);
          if (des.length !== mk.shrouds) say(v.id, 'a recorded channel without a deadeye a shroud', `mast ${mi}, ${side}: ${des.length} deadeyes, ${mk.shrouds} shrouds`);
        }
      });
      console.warn(`READ ${v.id}: channels laid from Steel's Folio LIII (contested: ${H.channels.contested})`);
    }
""" + anchor)
open(P, 'w').write(s); print('ok')
