"""r326 (0y168): A-SAIL-TOP."""
import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""    /* ── A-RIG-HEIGHT (round 287, 0y⁹⁶)""",
"""    /* ── A-SAIL-TOP (round 326, 0y¹⁶⁸): NO TOP STANDS THROUGH THE SAIL SET OVER IT, AND A SAIL CUT OVER A TOP BEARS ON IT.
       A topsail's foot is sheeted to the yard under the top, so its cloth comes down past the top on the fore side of
       the mast. The cloth hung in its own belly about a mast's width before the axis, and a top reaches forward by its
       whole radius: 25 tops on 9 hulls stood through the sail set over them, by up to 1.9 m. makeSail now cuts the
       cloth to clear each top on its mast (Falconer's TOP-LINING is where a real topsail rubbed the rim). TEST, on the
       set build: every vertex of every top on a set square sail's own mast (the lower top's `userData.mast`, the
       topmast top's `userData.topmastTop.mast`) that falls inside the cloth's width and rows is put in the sail's
       frame, and the cloth there is read off the mesh's own TRIANGLES (memory: a point on a coarse mesh); the rows
       within the yard's diameter of the head are the head laced round the spar and are not read. A vertex before the
       cloth by more than 5 mm convicts. A sail the builder cut over a top (`userData.drape` not empty) must bear on
       it: its nearest top vertex no more than 0.30 m abaft the cloth. Every set square sail says what it bears on
       (`userData.drape`, an array, empty where no top reaches it); the silence convicts. */
    {
      g.updateMatrixWorld(true);
      const sqS = [], tps = [];
      g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
        if (o.isMesh && p.key === 'sail' && o.userData.kind === 'square' && o.userData.surface && o.userData.grid) sqS.push(o);
        if (!o.isMesh && p.key === 'top') {
          const mi = o.userData.topmastTop ? o.userData.topmastTop.mast : o.userData.mast;
          if (mi !== undefined) tps.push({ o, mi });
        } });
      const V = new THREE.Vector3();
      for (const sl of sqS) {
        const ud = sl.userData, surf = ud.surface, { NW, NH } = ud.grid;
        const at = `the sail on masts[${ud.mast}] from the yard at y ${(+ud.yardY).toFixed(2)}`;
        if (!Array.isArray(ud.drape)) { say(v.id, 'a sail that does not say what it bears on', `${at}: userData.drape is absent`); continue; }
        if (ud.mast === undefined) continue;
        const W = 2 * surf(1, 0)[0], pa = sl.geometry.attributes.position, row = NH + 1;
        const inv = new THREE.Matrix4().copy(sl.matrixWorld).invert();
        const headSkip = 2 * (ud.yardR || 0.1);
        const uOf = x => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (surf(m, 0)[0] < x) a = m; else b = m; } return (a + b) / 2; };
        const zAt = (u, vv) => {
          const fi = Math.min(NW - 1e-9, u * NW), fj = Math.min(NH - 1e-9, vv * NH), i = Math.floor(fi), j = Math.floor(fj), ss = fi - i, tt = fj - j;
          const Z = (ii, jj) => pa.getZ(ii * row + jj);
          return ss + tt <= 1 ? Z(i, j) + ss * (Z(i + 1, j) - Z(i, j)) + tt * (Z(i, j + 1) - Z(i, j))
                              : Z(i + 1, j + 1) + (1 - ss) * (Z(i, j + 1) - Z(i + 1, j + 1)) + (1 - tt) * (Z(i + 1, j) - Z(i + 1, j + 1));
        };
        for (const { o, mi } of tps) {
          if (mi !== ud.mast) continue;
          let worst = -Infinity, n = 0;
          o.traverse(m => { if (!m.isMesh) return; const ga = m.geometry.attributes.position;
            for (let k = 0; k < ga.count; k++) {
              V.fromBufferAttribute(ga, k).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
              if (Math.abs(V.x) > W / 2 * 0.98 || V.y > -headSkip) continue;
              const u = uOf(V.x), foot = surf(u, 1)[1];
              if (V.y < foot) continue;
              n++;
              worst = Math.max(worst, zAt(u, V.y / foot) - V.z);   // the cloth's z less the vertex's: > 0, the vertex stands before the cloth
            } });
          if (!n) continue;
          const nm = o.userData.part.name || 'Top';
          if (worst > 0.005) say(v.id, 'a top through the sail set over it', `${at}: the ${nm} stands ${worst.toFixed(3)} m before the cloth (${n} of its vertices inside the sail's rows)`);
          else if (ud.drape.some(d => d.name === nm) && worst < -0.30) say(v.id, 'a sail cut over a top and standing off it', `${at}: cut over the ${nm}, the cloth stands ${(-worst).toFixed(3)} m before its nearest point; it bears within 0.30 m`);
        }
      }
    }

    /* ── A-RIG-HEIGHT (round 287, 0y⁹⁶)""")
open(P, 'w').write(s); print('ok')
