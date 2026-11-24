# r306 audit edits: A-GAFF-READ, A-BRAILED, A-CLOTH-FUNNEL, and the two exemptions a brailed sail needs.
import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90]); s = s.replace(a, b)

# 1. the boom census counts the masts that should carry a boom: a brailed sail has none
rep("""      const gaffMasts = (H.masts || []).filter(mk => mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker));
      if (gaffMasts.length && booms.length < gaffMasts.length)
        say(v.id, 'a gaff mast with no boom', `${gaffMasts.length} gaff or spanker masts in the record, ${booms.length} Boom mesh(es) carrying a gaffBoom read${SB}`);""",
"""      const gaffMasts = (H.masts || []).filter(mk => mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker));
      /* r306: a brailed sail is loose-footed and has no boom (A-BRAILED convicts a boom on one) */
      const boomed = gaffMasts.filter(mk => mk.gaffStow !== 'brailed');
      if (boomed.length && booms.length < boomed.length)
        say(v.id, 'a gaff mast with no boom', `${boomed.length} gaff or spanker masts with a boomed sail in the record, ${booms.length} Boom mesh(es) carrying a gaffBoom read${SB}`);""")

# 2. a set ship may carry a brailed sail stowed: the record says the plates show it so
rep("""        if (o.userData.kind === 'furl') setFurls++;
      } });""",
"""        if (o.userData.kind === 'furl' && !o.userData.brailed) setFurls++;   // r306: a brailed sail is stowed in both states
      } });""")

# 3. the new rules, run on both builds
NEW = r"""
    /* ── A-GAFF-READ, A-BRAILED, A-CLOTH-FUNNEL (round 306, 0y¹³²) ──────────────────────────────
       Endurance's main gaff was 3.1 m: the class cut it to 0.72 of a boom that is itself cut short
       by the funnel 5.5 m abaft the mast, though the gaff swings far over the stack. Hurley's beset
       broadside draws it at 0.55 of the lower mast, as long as the mizzen's, with the main sail
       brailed to the mast and no boom. Three rules, read from the BUILT scene, set and furled.
       A-GAFF-READ: a record that carries gaffFrac or throatFrac carries both and a gaffRead whose
       pixel figures give each share within 0.01, with a provenance; the built Gaff near the mast
       is gaffFrac of the built lower mast (segment 0's own foot to head) within 0.05 m, and its
       jaws stand at throatFrac of it within 0.10 m. A-BRAILED: gaffStow 'brailed' carries a
       provenance; no Boom stands on that mast; no set cloth names that mast; one 'Brailed sail'
       bundle lies along the mast's after side, every vertex within 1 m of the axis, from no lower
       than the deck to no higher than the gaff's jaws; and the gaff stands at its working angle
       (over 20°) in both builds. A-CLOTH-FUNNEL, the class: no vertex of any sail, set or stowed,
       and none of any yard, gaff or boom, stands inside a drawn funnel stack, read as the stack's
       own vertices within 0.4 m of that height. Before r306 no rule could see canvas through a
       funnel, and a 10 m gaff over a funnel-cut 4 m boom puts the leech through Endurance's. */
    const gaffSailRead = (G, STATE) => {
      const SB = STATE === 'furled' ? ' (furled build)' : '';
      const inv = new THREE.Matrix4().copy(G.matrixWorld).invert();
      const pts = o => { const a = o.geometry.attributes.position, out = [], V = new THREE.Vector3(); o.updateMatrixWorld(true);
        for (let k = 0; k < a.count; k++) { V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push(V.clone()); } return out; };
      const segs = [], gaffs = [], booms = [], cloth = [], spars = [], stacks = [];
      G.traverse(o => {
        if (!o.isMesh) return;
        if (o.userData.seg && o.userData.seg.si === 0) segs.push(o.userData.seg);
        const p = tagOf(o);
        if (o.userData.kind) cloth.push(o);
        if (!p) return;
        if (p.key === 'yard') spars.push(o);
        if (p.key === 'yard' && p.name === 'Gaff' && o.userData.gaff) gaffs.push(o);
        if (p.name === 'Boom' && o.userData.gaffBoom) booms.push(o);
        if (p.name === 'Funnel') stacks.push(pts(o));
      });
      (H.masts || []).forEach((mk, mi) => {
        if (!(mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker))) return;
        const seg = segs.find(q => q.mi === mi);
        const xm = (mk.at - 0.5) * H.lwl;
        let gf = null, bd = 1e9;
        for (const o of gaffs) { const d = Math.abs(o.userData.gaff.origin[0] - xm); if (d < bd) { bd = d; gf = o; } }
        if (bd > 3) gf = null;
        const at = `mast ${mi} (station ${mk.at})`;
        const hasF = mk.gaffFrac != null, hasT = mk.throatFrac != null;
        if (hasF || hasT) {
          const R = mk.gaffRead;
          if (STATE === 'set') {
            if (!(hasF && hasT)) say(v.id, 'a gaff read with half its shares', `${at}: gaffFrac ${mk.gaffFrac}, throatFrac ${mk.throatFrac}`);
            if (!R || !R.provenance) say(v.id, 'a gaff read with no provenance', `${at}: gaffFrac/throatFrac declared, gaffRead.provenance absent`);
            else {
              if (hasF && Math.abs(R.lengthPx / R.capOverDeckPx - mk.gaffFrac) > 0.01)
                say(v.id, 'a gaff share off its plate read', `${at}: ${R.lengthPx}/${R.capOverDeckPx} px = ${(R.lengthPx / R.capOverDeckPx).toFixed(3)} against gaffFrac ${mk.gaffFrac}`);
              if (hasT && Math.abs(R.throatOverDeckPx / R.capOverDeckPx - mk.throatFrac) > 0.01)
                say(v.id, 'a throat share off its plate read', `${at}: ${R.throatOverDeckPx}/${R.capOverDeckPx} px = ${(R.throatOverDeckPx / R.capOverDeckPx).toFixed(3)} against throatFrac ${mk.throatFrac}`);
            }
          }
          if (!gf || !seg) say(v.id, 'a recorded gaff not built', `${at}: ${gf ? '' : 'no Gaff mesh within 3 m of the station'}${seg ? '' : ' no lower mast segment'}${SB}`);
          else {
            const lower = seg.headY - seg.footY, P = pts(gf);
            let lo = P[0], hi = P[0];
            for (const q of P) { if (q.x < lo.x) lo = q; if (q.x > hi.x) hi = q; }
            const gL = gf.userData.gaff.lengthM, ox = gf.userData.gaff.origin;
            /* the cylinder's own span along its line: project every vertex on the builder's stated angle */
            const a = gf.userData.gaff.deg * Math.PI / 180, cx = Math.cos(a), cy = Math.sin(a);
            let t0 = 1e9, t1 = -1e9; for (const q of P) { const t = (q.x - ox[0]) * cx + (q.y - ox[1]) * cy; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
            const built = t1 - t0, jawsY = ox[1] + t0 * cy;
            if (hasF && Math.abs(built - lower * mk.gaffFrac) > 0.05)
              say(v.id, 'a gaff off its recorded length', `${at}: built ${built.toFixed(2)} m, gaffFrac ${mk.gaffFrac} of the ${lower.toFixed(2)} m lower mast is ${(lower * mk.gaffFrac).toFixed(2)}${SB}`);
            if (hasT && Math.abs(jawsY - (seg.footY + lower * mk.throatFrac)) > 0.10)
              say(v.id, 'a gaff throat off its recorded height', `${at}: jaws at y ${jawsY.toFixed(2)}, throatFrac ${mk.throatFrac} puts them at ${(seg.footY + lower * mk.throatFrac).toFixed(2)}${SB}`);
          }
        }
        if (mk.gaffStow === 'brailed') {
          if (STATE === 'set' && !mk.gaffStowProvenance) say(v.id, 'a brailed sail with no provenance', `${at}: gaffStow 'brailed', gaffStowProvenance absent`);
          const bm = booms.filter(o => Math.abs(o.userData.gaffBoom.at - mk.at) < 1e-6);
          if (bm.length) say(v.id, 'a boom under a brailed sail', `${at}: ${bm.length} Boom mesh(es) on a mast whose sail is loose-footed and brailed${SB}`);
          const set = cloth.filter(o => o.userData.kind !== 'furl' && o.userData.mastX != null && Math.abs(o.userData.mastX - xm) < 1.5);
          if (set.length) say(v.id, 'a brailed sail drawn set', `${at}: ${set.length} set cloth mesh(es) name this mast${SB}`);
          const br = cloth.filter(o => o.userData.brailed && o.userData.brailed.mast === mi);
          if (br.length !== 1) say(v.id, 'a brailed sail not drawn', `${at}: ${br.length} Brailed sail bundle(s)${SB}`);
          else if (seg && gf) {
            const P = pts(br[0]), jy = gf.userData.gaff.origin[1];
            let off = 0, lo = 1e9, hi = -1e9, fwd = 0;
            for (const q of P) {
              const t = (q.y - seg.footY) / Math.max(1e-6, seg.headY - seg.footY);
              const ax = seg.footX + (seg.headX - seg.footX) * t;
              off = Math.max(off, Math.hypot(q.x - ax, q.z)); lo = Math.min(lo, q.y); hi = Math.max(hi, q.y);
              fwd = Math.max(fwd, ax - q.x);
            }
            if (off > 1.0) say(v.id, 'a brailed bundle off its mast', `${at}: a vertex ${off.toFixed(2)} m from the mast's axis (1.0 allowed)${SB}`);
            if (lo < seg.footY - 0.05 || hi > jy + 0.05) say(v.id, 'a brailed bundle past the luff', `${at}: the bundle spans y ${lo.toFixed(2)}–${hi.toFixed(2)}; the deck is ${seg.footY.toFixed(2)} and the jaws ${jy.toFixed(2)}${SB}`);
            if (fwd > 0.05) say(v.id, 'a brailed bundle forward of its mast', `${at}: a vertex ${fwd.toFixed(2)} m forward of the axis; the sail stows on the after side${SB}`);
          }
          if (gf && gf.userData.gaff.deg < 20) say(v.id, 'a brailed gaff lowered', `${at}: the gaff lies at ${gf.userData.gaff.deg}°; a brailed sail's gaff stays aloft${SB}`);
        }
      });
      /* the class: canvas and spars stay out of the funnels */
      if (!stacks.length) return;
      const bands = stacks.map(S => {
        let y0 = 1e9, y1 = -1e9; for (const q of S) { y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
        return { S, y0, y1 };
      });
      const inside = q => {
        for (const b of bands) {
          if (q.y < b.y0 || q.y > b.y1) continue;
          let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0;
          for (const r of b.S) if (Math.abs(r.y - q.y) <= 0.4) { n++; x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x); z0 = Math.min(z0, r.z); z1 = Math.max(z1, r.z); }
          if (n < 6) continue;
          const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
          if (hx > 0 && hz > 0 && ((q.x - cx) / hx) ** 2 + ((q.z - cz) / hz) ** 2 < 1) return true;
        }
        return false;
      };
      const xs0 = Math.min(...bands.map(b => Math.min(...b.S.map(q => q.x)))) - 0.5;
      const xs1 = Math.max(...bands.map(b => Math.max(...b.S.map(q => q.x)))) + 0.5;
      const yTop = Math.max(...bands.map(b => b.y1));
      for (const o of [...cloth, ...spars]) {
        const P = pts(o); let hit = 0, ex = null;
        for (const q of P) { if (q.x < xs0 || q.x > xs1 || q.y > yTop) continue; if (inside(q)) { hit++; ex = ex || q; } }
        if (hit) { const p = tagOf(o);
          say(v.id, 'canvas or a spar through a funnel', `${p ? p.name : o.userData.kind} (${o.userData.kind || 'spar'}): ${hit} vertices inside a funnel stack, e.g. (${ex.x.toFixed(2)}, ${ex.y.toFixed(2)}, ${ex.z.toFixed(2)})${SB}`); }
      }
    };
    gaffSailRead(g, 'set');
"""
rep("""    boomRead(g, 'set');
""", """    boomRead(g, 'set');
""" + NEW)
rep("""          boomRead(gf, 'furled');
          halRead(gf, 'furled');""", """          boomRead(gf, 'furled');
          halRead(gf, 'furled');
          gaffSailRead(gf, 'furled');   // r306""")
open(p, 'w').write(s); print('ok')
# second pass: the throat rule reads hoisted gaffs only (a boomed sail's furled gaff is lowered onto the roll)
s = open(p).read()
a = "            if (hasT && Math.abs(jawsY - (seg.footY + lower * mk.throatFrac)) > 0.10)"
if a in s:
    s = s.replace(a, "            if (hasT && gf.userData.gaff.state !== 'furled' && Math.abs(jawsY - (seg.footY + lower * mk.throatFrac)) > 0.10)   // a furled boomed sail's gaff is lowered onto the roll")
    open(p, 'w').write(s)
