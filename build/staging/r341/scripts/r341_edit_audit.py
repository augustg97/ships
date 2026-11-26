import sys
P = sys.argv[1]
s = open(P).read()
anchor = "    /* ── A-STRIP-FACES (round 338)"
assert s.count(anchor) == 1, 'anchor'
rule = r"""    /* ── A-WALE-PAINT (round 341, the 74): THE WALES RUN IN THE BLACK AND THE GUNS IN THE OCHRE.
       The chequer's bands were fixed in the shader and the wales at fixed fractions of the freeboard, two
       models of one side: on the 74 the upper wale crossed the top of the lower ochre band and both tiers of
       ports stood 1.1 m under where Eckersberg's Asow paints them. On a hull whose record carries paintBands:
       (1) the bands must be ordered, touching, and run from 0 to 1; (2) each 'wale' mesh's port-side vertices
       within 1 m of midships, as fractions of the sheer there, must lie inside one black band (0.01 slack);
       (3) each gun barrel's height at its station, as a fraction of the sheer there, must lie inside an ochre
       band. Silent without paintBands. */
    if (H.paintBands) {
      const BD = H.paintBands.bands;
      if (!(Array.isArray(BD) && BD.length && BD[0][1] === 0 && BD[BD.length - 1][2] === 1 && BD.every((b, i) => (b[0] === 'black' || b[0] === 'ochre') && b[2] > b[1] && (i === 0 || Math.abs(b[1] - BD[i - 1][2]) < 1e-9))))
        say(v.id, 'a paint band record out of order', 'hull.paintBands.bands must run from 0 to 1 in touching [black|ochre, from, to] bands');
      else {
        const HS = SHIPS_HULL.hullSurface(H), P7 = new THREE.Vector3(); g.updateMatrixWorld(true);
        const inK = (kind, f) => BD.some(b => b[0] === kind && f >= b[1] - 0.01 && f <= b[2] + 0.01);
        const xMid = SHIPS_HULL.surfacePoint(H, HS, 0.5, 0.8)[0];
        g.traverse(o => {
          const pt = tagOf(o); if (!o.isMesh || !pt || pt.key !== 'wale') return;
          const pa = o.geometry.attributes.position; let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < pa.count; i++) { P7.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (P7.z > 0 && Math.abs(P7.x - xMid) < 1) { lo = Math.min(lo, P7.y); hi = Math.max(hi, P7.y); } }
          if (!isFinite(lo)) return;
          const sh = HS.sheer(0.5), fl = lo / sh, fh = hi / sh;
          if (!BD.some(b => b[0] === 'black' && fl >= b[1] - 0.01 && fh <= b[2] + 0.01))
            say(v.id, 'a wale across its paint', `a wale amidships runs ${lo.toFixed(2)}–${hi.toFixed(2)} m (${fl.toFixed(3)}–${fh.toFixed(3)} of the sheer), which no black band of the record holds`);
        });
        let bad = 0, n = 0, ex = '';
        g.traverse(o => {
          const pt = tagOf(o); if (!pt || pt.key !== 'gun') return;
          o.traverse(c => { if (!c.isMesh) return; n++;
            P7.setFromMatrixPosition(c.matrixWorld);
            const L = H.loa || H.lwl, u = Math.min(1, Math.max(0, 0.5 + P7.x / L));
            const f = P7.y / HS.sheer(u);
            if (!inK('ochre', f)) { bad++; if (!ex) ex = `x ${P7.x.toFixed(1)} at ${P7.y.toFixed(2)} m (${f.toFixed(3)} of the sheer)`; } });
        });
        if (bad) say(v.id, 'a gun out of its ochre band', `${bad} of ${n} barrels stand outside every ochre band of the record, e.g. ${ex}`);
      }
    }

"""
s = s.replace(anchor, rule + anchor)
open(P, 'w').write(s)
print('audit rule added')
