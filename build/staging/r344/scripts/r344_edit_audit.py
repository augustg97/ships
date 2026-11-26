#!/usr/bin/env python3
"""r344: A-ISLAND-PLANKED. On a timber hull an island's barricade is the side's planking carried up."""
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]; s = s.replace(a, b)
rep("""        const bb = new THREE.Box3().setFromObject(grp.o);
        let wantTop = -Infinity;""",
"""        /* ── A-ISLAND-PLANKED (round 344): A TIMBER BARRICADE IS THE SIDE'S PLANKING CARRIED UP.
           r343 drew the 74's barricades in STEEL_FRAG, a steel island's flat paint, so each read as
           a painted slab on a planked side. On a hull that is not steel or iron, every mesh of the
           island that is not its deck must be drawn in HULL_FRAG and carry a uv whose v continues
           the shell's at the sheer: at a vertex within 0.05 m of the sheer, v within 0.01 of 1
           (the loft's v is 1 at the sheer). A v that restarts at 0 there would draw the keel's
           strakes on the barricade, and no uv at all reads (0, 0), the underwater body. */
        if (!(H.build === 'steel' || H.build === 'iron' || H.iron)) {
          const P6 = new THREE.Vector3(); grp.o.updateMatrixWorld(true);
          grp.o.traverse(o => {
            if (!o.isMesh || o.material.fragmentShader === SHADERS['DECK_FRAG.frag']) return;
            if (o.material.fragmentShader !== SHADERS['HULL_FRAG.frag']) { say(v.id, 'a timber island drawn in a steel paint', `${isl.name}: a wall mesh of the island is not drawn in HULL_FRAG, so it shows no planking`); return; }
            const uv = o.geometry.attributes.uv;
            if (!uv) { say(v.id, 'a timber island drawn in a steel paint', `${isl.name}: a wall mesh in HULL_FRAG carries no uv, so it reads the loft's (0, 0)`); return; }
            const pa = o.geometry.attributes.position; let worst = 0, at = null;
            for (let i = 0; i < pa.count; i++) {
              P6.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
              const uq = Math.max(0, Math.min(1, uv.getX(i)));
              if (Math.abs(P6.y - H2.sheer(uq)) > 0.05) continue;
              const d = Math.abs(uv.getY(i) - 1); if (d > worst) { worst = d; at = uq; }
            }
            if (worst > 0.01) say(v.id, "a timber island's planking off the shell's at the sheer", `${isl.name}: v at the sheer is ${(1 - worst).toFixed(3)} or ${(1 + worst).toFixed(3)} at u ${at.toFixed(3)}, the shell's is 1.000`);
          });
        }
        const bb = new THREE.Box3().setFromObject(grp.o);
        let wantTop = -Infinity;""")
p.write_text(s); print('ok')
# second pass: the station is read from the vertex's x on the loft's deck-level line, not from
# uv.x (an end bulkhead's u runs across the beam, so uv.x is not its station)
s = p.read_text()
rep("""              const uq = Math.max(0, Math.min(1, uv.getX(i)));""",
"""              let a7 = 0, b7 = 1; for (let k = 0; k < 40; k++) { const m = (a7 + b7) / 2; if (loftDeckX(H, m) < P6.x) a7 = m; else b7 = m; }
              const uq = (a7 + b7) / 2;""")
p.write_text(s); print('ok2')
