R='/Users/augustgweon/Ships/'
p=R+'Research/audit-hulls.js'; s=open(p).read()
anchor="""      for (const q of groups) if (!(IL || []).some(isl => isl && isl.name === q.name)) say(v.id, 'a forecast group named for no island',"""
assert s.count(anchor)==1
rule = r"""      /* ── A-WELL-BULWARK (round 303, Titanic): A WELL'S SIDE IS SHELL UP TO ITS READ BULWARK TOP, AND
         THE CAPPING IS ON THAT TOP. Titanic's shell stopped at the deck in both wells and the capping
         sat on the deck edge, so the after well's side stood about a metre under the 1911 plan's
         bulwark line. hull.islands.wells carries each well's u-span and its bulwark top over the
         water at both ends, read off the plate. (1) RECORD: each well has a name, an ascending
         u-span, a topM pair at least 0.3 m over the sheer, and a topRead whose rows give topM within
         0.05 m; the block a provenance. (2) BUILT: a 'wellBulwark' group named '<well> bulwark'
         exists; its highest vertex within 1.5 m of each end stands at that end's topM within 0.15 m;
         it stays inside its span (0.1 m); every vertex above the sheer stands on the shell's
         half-breadth within 0.05 m. (3) THE CAPPING: the 'rail' inside the span tops out at the
         well's line within 0.15 m at its middle, and nowhere stands more than 0.15 m over it.
         SILENCE: a hull with islands whose deck lies at the sheer (no deck.belowSheerM) and no
         wells record: its wells would be built with no bulwark at all. */
      {
        const WL = H.islands.wells;
        if (!WL && !(H.deck && H.deck.belowSheerM > 0)) say(v.id, 'islands with wells and no bulwark record', 'hull.islands has no wells and the deck lies at the sheer, so the shell between the islands ends at the deck');
        if (WL && !(H.islands.wellsProvenance && H.islands.wellsProvenance.length > 20)) say(v.id, 'wells with no provenance', 'hull.islands.wellsProvenance absent');
        const uAtX = x => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (loftDeckX(H, m) < x) a = m; else b = m; } return (a + b) / 2; };
        const P5 = new THREE.Vector3();
        for (const w of (WL || [])) {
          const ok = w && typeof w.name === 'string' && Array.isArray(w.u) && w.u.length === 2 && w.u[0] >= 0 && w.u[1] <= 1 && w.u[1] > w.u[0]
            && Array.isArray(w.topM) && w.topM.length === 2 && w.topM.every(t => typeof t === 'number');
          if (!ok) { say(v.id, 'a well declared out of shape', `${JSON.stringify(w).slice(0, 120)}; want {name, u: [a, b], topM: [fwd, aft]}`); continue; }
          for (const e of [0, 1]) if (w.topM[e] < H2.sheer(w.u[e]) + 0.3) say(v.id, "a well's bulwark top under the deck", `${w.name} ${e ? 'aft' : 'fwd'} end: topM ${w.topM[e]} m, the sheer ${H2.sheer(w.u[e]).toFixed(2)} m`);
          const TR = w.topRead;
          if (!(TR && Array.isArray(TR.rows) && TR.rows.length === 2 && Array.isArray(TR.datumRows) && TR.datumRows.length === 2 && typeof TR.datumM === 'number' && TR.pxPerM > 0))
            say(v.id, "a well's bulwark top with no read", `${w.name}: topRead absent or out of shape, so topM ${w.topM.join('/')} m is not a reading`);
          else for (const e of [0, 1]) {
            const want = TR.datumM + (TR.datumRows[e] - TR.rows[e]) / TR.pxPerM;
            if (Math.abs(w.topM[e] - want) > 0.05) say(v.id, "a well's bulwark top off its plate read", `${w.name} ${e ? 'aft' : 'fwd'} end: topM ${w.topM[e]} m, row ${TR.rows[e]} over datum row ${TR.datumRows[e]} reads ${want.toFixed(2)} m`);
          }
          const xa = loftDeckX(H, w.u[0]), xb = loftDeckX(H, w.u[1]);
          let grp = null;
          g.traverse(o => { const pt = o.userData && o.userData.part; if (pt && pt.key === 'wellBulwark' && pt.name === w.name + ' bulwark') grp = o; });
          if (!grp) { say(v.id, 'a well recorded and its bulwark not built', `${w.name}: no wellBulwark group named '${w.name} bulwark'`); continue; }
          const endTop = [-Infinity, -Infinity]; let out = 0, worstInset = 0, insetX = 0;
          grp.updateMatrixWorld(true);
          grp.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position;
            for (let i = 0; i < pa.count; i++) { P5.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
              if (P5.x < xa - 0.1 || P5.x > xb + 0.1) out++;
              if (P5.x <= xa + 1.5) endTop[0] = Math.max(endTop[0], P5.y);
              if (P5.x >= xb - 1.5) endTop[1] = Math.max(endTop[1], P5.y);
              const u = uAtX(P5.x); if (P5.y < H2.sheer(u) + 0.2) continue;
              const inset = Math.abs(Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1)[2]) - Math.abs(P5.z));
              if (inset > worstInset) { worstInset = inset; insetX = P5.x; } } });
          for (const e of [0, 1]) if (!(Math.abs(endTop[e] - w.topM[e]) <= 0.15)) say(v.id, "a well's bulwark built off its top", `${w.name} ${e ? 'aft' : 'fwd'} end: built ${endTop[e].toFixed(2)} m, record ${w.topM[e]} m`);
          if (out) say(v.id, "a well's bulwark built past its span", `${w.name}: ${out} vertices outside x ${xa.toFixed(2)}..${xb.toFixed(2)}`);
          if (worstInset > 0.05) say(v.id, "a well's bulwark standing off the shell", `${w.name}: a vertex at x ${insetX.toFixed(1)} stands ${worstInset.toFixed(2)} m off the shell's half-breadth`);
          const xm = (xa + xb) / 2, um = uAtX(xm), wantMid = H2.wellTop(um);
          let capMid = -Infinity, over = 0, overBy = 0;
          g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (!pt || pt.key !== 'rail') return;
            o.updateMatrixWorld(true); const pa = o.geometry.attributes.position;
            for (let i = 0; i < pa.count; i++) { P5.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
              if (P5.x < xa + 0.5 || P5.x > xb - 0.5) continue;
              if (Math.abs(P5.x - xm) < 2.0) capMid = Math.max(capMid, P5.y);
              const wt = H2.wellTop(uAtX(P5.x)); if (wt !== null && P5.y > wt + 0.15) { over++; overBy = Math.max(overBy, P5.y - wt); } } });
          if (!(Math.abs(capMid - wantMid) <= 0.15)) say(v.id, "a well's capping off its bulwark top", `${w.name}: the rail tops out at ${capMid.toFixed(2)} m at x ${xm.toFixed(1)}, the bulwark line ${wantMid.toFixed(2)} m`);
          if (over) say(v.id, "a well's capping standing over its bulwark top", `${w.name}: ${over} rail vertices up to ${overBy.toFixed(2)} m over the line`);
        }
      }
"""
s=s.replace(anchor, rule+anchor); open(p,'w').write(s); print('ok')
