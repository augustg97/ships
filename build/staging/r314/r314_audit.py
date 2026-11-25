import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b):
    global s
    c = s.count(a); assert c == 1, (c, a[:80]); s = s.replace(a, b)
RULE = r"""
    /* ── A-YARD-LOWERED (round 314, 0y¹⁴⁶): A FURLED HOISTING YARD IS DOWN ON ITS CAP, AND A SET ONE IS NOT.
       Eckersberg's 1828 Asow at anchor shows every topsail yard lowered onto its lower cap; until r314 every
       hoisting yard stayed hoisted in the furled build. Read off each built yard that rides a tie over
       section 1 or higher (userData.lowered), against the mast's own segment meshes (userData.seg): in the
       SET build no yard is lowered — 'a set ship with a lowered yard'. In the FURLED build every such yard
       is lowered — 'a furled hoisting yard left hoisted' — its spar's lowest point no more than 0.01 m under
       the head of the section below — 'a lowered yard through the cap below' — and its centre within 0.05 m
       of one yard radius plus 0.02 m over the higher of that head and the top of the yard below it, roll
       included — 'a lowered yard standing off its rest'. The yard's height is read from its mesh, not from
       the record. */
    const yardLowerRead = (G, STATE) => {
      const SB = STATE === 'furled' ? ' (furled build)' : '';
      const inv = new THREE.Matrix4().copy(G.matrixWorld).invert();
      const heads = {}, ys = [];
      G.traverse(o => {
        if (!o.isMesh) return;
        if (o.userData.seg) (heads[o.userData.seg.mi] || (heads[o.userData.seg.mi] = {}))[o.userData.seg.si] = o.userData.seg.headY;
        const p = tagOf(o);
        if (!p || p.key !== 'yard' || !o.userData.slung) return;
        o.updateMatrixWorld(true);
        const a = o.geometry.attributes.position, V = new THREE.Vector3();
        let lo = 1e9, hi = -1e9;
        for (let k = 0; k < a.count; k++) { V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); lo = Math.min(lo, V.y); hi = Math.max(hi, V.y); }
        ys.push({ o, lo, hi, c: o.userData.slung.axisY + (o.userData.slung.off * Math.sin((o.userData.slung.rakeDeg || 0) * Math.PI / 180)),
                  r: o.userData.slung.yardR, roll: o.userData.slung.rollR || 0, rec: o.userData.lowered || null,
                  mast: o.userData.lowered ? o.userData.lowered.mast : (o.userData.yardFrac ? o.userData.yardFrac.mast : (o.userData.courseAt ? o.userData.courseAt.mast : null)) });
      });
      for (const Y of ys) {
        const L = Y.rec; if (!L) continue;
        const at = `the yard on mast ${L.mast} riding a tie over section ${L.tie}, its centre at y ${(0.5 * (Y.lo + Y.hi)).toFixed(2)}`;
        if (STATE === 'set') { if (L.setY !== undefined) say(v.id, 'a set ship with a lowered yard', `${at}: recorded lowered from ${L.setY}${SB}`); continue; }
        if (L.setY === undefined) { say(v.id, 'a furled hoisting yard left hoisted', `${at}: not lowered${SB}`); continue; }
        const capY = (heads[L.mast] || {})[L.tie - 1];
        if (capY === undefined) { say(v.id, 'a lowered yard with no cap below it', `${at}: no segment ${L.tie - 1} on mast ${L.mast}${SB}`); continue; }
        /* the mesh's own vertical extent is the braced, tapered spar; its centre is the slings' height */
        const mid = 0.5 * (Y.lo + Y.hi), r = 0.5 * (Y.hi - Y.lo);
        if (Y.lo < capY - 0.01) say(v.id, 'a lowered yard through the cap below', `${at}: its lowest point y ${Y.lo.toFixed(3)} under the head of section ${L.tie - 1} at ${capY.toFixed(3)}${SB}`);
        let rest = capY;
        for (const W of ys) if (W !== Y && W.mast === L.mast && W.hi < mid) rest = Math.max(rest, W.hi + 2 * W.roll);
        if (Math.abs(mid - (rest + r + 0.02)) > 0.05) say(v.id, 'a lowered yard standing off its rest', `${at}: centre ${mid.toFixed(3)}, its rest at ${rest.toFixed(3)} puts it at ${(rest + r + 0.02).toFixed(3)}${SB}`);
      }
      return ys.filter(Y => Y.rec && Y.rec.setY !== undefined).length;
    };
    yardLowerRead(g, 'set');
"""
rep("""    /* ── A-COURSE-READ (round 313, 0y¹⁴³)""", RULE.lstrip('\n') + """    /* ── A-COURSE-READ (round 313, 0y¹⁴³)""")
rep("""          gaffSailRead(gf, 'furled');   // r306
""", """          gaffSailRead(gf, 'furled');   // r306
          yardLowerRead(gf, 'furled');  // r314
""")
open(p, 'w').write(s); print('ok')
