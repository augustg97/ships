#!/usr/bin/env python3
"""r356: A-SIDE-AS-DRAWN. usage: r356_edit_audit3.py <audit-hulls.js>"""
import sys
ap = sys.argv[1]; s = open(ap).read()
anchor = """        for (const [k, n] of Object.entries(tally)) say(v.id, 'a part under a deck cover lit as open sky', `${k}: ${n} mesh(es)`);
      }
    }
"""
assert s.count(anchor) == 1
rule = anchor + """    /* ── A-SIDE-AS-DRAWN (round 356): A RECORDED SIDE IS DRAWN, OR THE RECORD SAYS IT IS NOT. Steel's tables give the
       74's side 0.514 m thick at the upper deck (hull.side), and her waterway's outboard edge 0.387 m inside the outer
       plank, against the frame under the spirketting. The model draws her side as one skin with no thickness and lays
       its waterway against it. TEST, on every hull that records side.waterwayFromSkinM, from the BUILT scene in hull
       space: the drawn waterway's outboard edge is the 10th percentile, over every 'waterway' vertex, of the shell's
       half-breadth at the vertex's own station and height less |z|. Where it stands more than 0.1 m from the record,
       the hull must say so in side.contested (a sentence); where it stands within 0.1 m, side.contested must be gone,
       so the record cannot go on saying the model departs from it after the model is mended. A hull that records
       side.atDeckM and no waterwayFromSkinM is convicted: the figure the test reads is missing. */
    if (H.side && (H.side.atDeckM > 0 || H.side.waterwayFromSkinM > 0)) {
      const R = H.side, HSd = SHIPS_HULL.hullSurface(H), L = H.lwl;
      if (!(R.waterwayFromSkinM > 0)) say(v.id, 'a recorded side the audit cannot test', 'side.atDeckM is recorded and side.waterwayFromSkinM is not');
      else {
        const xAt = u => (u - 0.5) * L + HSd.rake(Math.max(0.001, Math.min(0.999, u)));
        const uOf = x => { let a = 0, b = 1; for (let j = 0; j < 30; j++) { const m = (a + b) / 2; if (xAt(m) < x) a = m; else b = m; } return (a + b) / 2; };
        const halfAt = (u, y) => { if (y >= HSd.sheer(u)) return Math.abs(SHIPS_HULL.surfacePoint(H, HSd, u, 1.0)[2]);
          let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HSd, u, m)[1] < y) a = m; else b = m; }
          return Math.abs(SHIPS_HULL.surfacePoint(H, HSd, u, (a + b) / 2)[2]); };
        g.updateMatrixWorld(true);
        const invS = new THREE.Matrix4().copy(g.matrixWorld).invert(), Ms = new THREE.Matrix4(), qs = new THREE.Vector3(), ins = [];
        g.traverse(o => { const p = tagOf(o); if (!o.isMesh || !p || p.key !== 'waterway') return;
          const a = o.geometry.attributes.position; Ms.multiplyMatrices(invS, o.matrixWorld);
          for (let j = 0; j < a.count; j++) { qs.fromBufferAttribute(a, j).applyMatrix4(Ms); const u = uOf(qs.x);
            if (u < 0.05 || u > 0.95) continue; ins.push(halfAt(u, qs.y) - Math.abs(qs.z)); } });
        if (!ins.length) say(v.id, 'a recorded side the audit cannot test', 'no waterway mesh is drawn between u 0.05 and 0.95');
        else {
          ins.sort((a, b) => a - b);
          const drawn = ins[Math.floor(ins.length * 0.1)], off = Math.abs(drawn - R.waterwayFromSkinM);
          const said = typeof R.contested === 'string' && R.contested.length > 40;
          if (off > 0.1 && !said) say(v.id, 'a recorded side the model does not draw, and the record is silent', `the waterway's outboard edge stands ${drawn.toFixed(3)} m inside the skin, the record ${R.waterwayFromSkinM} m; side.contested says nothing`);
          if (off <= 0.1 && said) say(v.id, 'a recorded side still marked contested after the model draws it', `the waterway's outboard edge stands ${drawn.toFixed(3)} m inside the skin, within 0.1 m of the record's ${R.waterwayFromSkinM} m`);
        }
      }
    }
"""
s = s.replace(anchor, rule); open(ap, 'w').write(s); print('ok')
