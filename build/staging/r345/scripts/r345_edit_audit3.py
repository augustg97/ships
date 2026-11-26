# r345 audit, part 3: the sweep is tested against triangles cut at the bars' height, not vertices only
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""            const M = new THREE.Matrix4().multiplyMatrices(invCap, o.matrixWorld), A = o.geometry.attributes.position;
            for (let i = 0; i < A.count; i++) { P.fromBufferAttribute(A, i).applyMatrix4(M);
              const r = Math.hypot(P.x - c.x, P.z - c.z);
              const inDrum = r < rD && P.y > yFoot + 0.05 && P.y < yTop;
              const inSweep = r < rB && P.y > b0 - 0.05 && P.y < b1 + 0.05;
              if (inDrum || inSweep) { const k = `${pt.key}/${pt.name}`;
                if (!hits.has(k)) hits.set(k, `${inDrum ? 'in the drum' : 'in the bars\\' sweep'} at x ${P.x.toFixed(2)} y ${P.y.toFixed(2)} z ${P.z.toFixed(2)}`); break; } }
          });""", """            const M = new THREE.Matrix4().multiplyMatrices(invCap, o.matrixWorld), A = o.geometry.attributes.position;
            const k = `${pt.key}/${pt.name}`;
            const W = new Float32Array(A.count * 3);
            for (let i = 0; i < A.count; i++) { P.fromBufferAttribute(A, i).applyMatrix4(M);
              W[3 * i] = P.x; W[3 * i + 1] = P.y; W[3 * i + 2] = P.z;
              const r = Math.hypot(P.x - c.x, P.z - c.z);
              const inDrum = r < rD && P.y > yFoot + 0.05 && P.y < yTop;
              const inSweep = r < rB && P.y > b0 - 0.05 && P.y < b1 + 0.05;
              if (inDrum || inSweep) {
                if (!hits.has(k)) hits.set(k, `${inDrum ? 'in the drum' : 'in the bars\\' sweep'} at x ${P.x.toFixed(2)} y ${P.y.toFixed(2)} z ${P.z.toFixed(2)}`); return; } }
            /* ⚠ A LARGE QUAD HAS NO VERTEX INSIDE A DISC IT CROSSES. The forecastle's end bulkhead is
               one quad 11 m wide whose four corners all lie outside the bars' 3.6 m sweep, and the
               first version of this arm passed the bars through it. Each triangle is cut by the
               plane of the bars and by three planes up the drum, and the cut's segment is measured
               to the capstan's axis. */
            const I = o.geometry.index, nT = I ? I.count / 3 : A.count / 3;
            const cuts = [[(b0 + b1) / 2, rB, "in the bars' sweep"],
                          [yFoot + 0.15, rD, 'in the drum'], [(yFoot + yTop) / 2, rD, 'in the drum'], [yTop - 0.05, rD, 'in the drum']];
            const seg = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
              const t = L2 > 0 ? Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / L2)) : 0;
              return Math.hypot(ax + t * dx - c.x, az + t * dz - c.z); };
            for (let t = 0; t < nT; t++) {
              const ia = I ? I.getX(3 * t) : 3 * t, ib = I ? I.getX(3 * t + 1) : 3 * t + 1, ic = I ? I.getX(3 * t + 2) : 3 * t + 2;
              const V = [ia, ib, ic].map(j => [W[3 * j], W[3 * j + 1], W[3 * j + 2]]);
              for (const [yc, rc, what] of cuts) {
                const pts = [];
                for (let e = 0; e < 3; e++) { const a = V[e], b = V[(e + 1) % 3];
                  if ((a[1] - yc) * (b[1] - yc) < 0) { const f = (yc - a[1]) / (b[1] - a[1]);
                    pts.push([a[0] + f * (b[0] - a[0]), a[2] + f * (b[2] - a[2])]); } }
                if (pts.length === 2 && seg(pts[0][0], pts[0][1], pts[1][0], pts[1][1]) < rc) {
                  if (!hits.has(k)) hits.set(k, `${what}: a face crosses y ${yc.toFixed(2)} within ${rc.toFixed(2)} m of the axis, near x ${((pts[0][0] + pts[1][0]) / 2).toFixed(2)}`);
                  return; }
              }
            }
          });""")
p.write_text(s); print('ok 3')
