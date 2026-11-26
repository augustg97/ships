"""r334: A-SHEER-TRACE learns named breaks and a station window. usage: r334_audit.py <audit-hulls.js>  (every replace asserted)"""
import sys
p = sys.argv[1]; a = open(p).read()
old1 = """          let worst = 0, at = null;
          for (let i = 1; i < TR.rows.length; i++) { const dd = Math.abs(TR.rows[i] - TR.rows[i - 1]); if (dd > worst) { worst = dd; at = TR.fromCol + i * TR.stepCol; } }"""
new1 = """          /* r334 (the fluyt's rail): a line can carry a REAL vertical break — the quarterdeck's rail rising off the waist's
             — and a break is not a jump. Each break the record names, by the column of the step's far point and with a
             reason, is excused the step limit at that column and nowhere else; a break with no reason is convicted. */
          const BRK = new Set();
          for (const b of (TR.breaks || [])) {
            if (!(b && b.col > 0 && typeof b.why === 'string' && b.why.length > 10)) say(v.id, 'a deck line break with no reason', `trace.breaks entry ${JSON.stringify(b)} needs a column and a reason`);
            else BRK.add(b.col);
          }
          let worst = 0, at = null;
          for (let i = 1; i < TR.rows.length; i++) { const cI = TR.fromCol + i * TR.stepCol; if (BRK.has(cI)) continue; const dd = Math.abs(TR.rows[i] - TR.rows[i - 1]); if (dd > worst) { worst = dd; at = cI; } }"""
assert a.count(old1) == 1; a = a.replace(old1, new1)
old2 = """            const f = (c - TR.fromCol) / TR.stepCol, i0 = Math.min(TR.rows.length - 2, Math.floor(f)), t = f - i0;
            const tr = TR.rows[i0] * (1 - t) + TR.rows[i0 + 1] * t;"""
new2 = """            const f = (c - TR.fromCol) / TR.stepCol, i0 = Math.min(TR.rows.length - 2, Math.floor(f)), t = f - i0;
            /* r334: a trace that names stationWindowCols took each station as the MEDIAN of its points within that many
               columns (an etched rail crossed by stays and crew scatters a few rows point to point); the station is held
               to that estimator, at the same 2 px. Without the field, the interpolated row, as r309 wrote it. */
            let tr = TR.rows[i0] * (1 - t) + TR.rows[i0 + 1] * t;
            if (TR.stationWindowCols > 0) {
              const nb = TR.rows.filter((_, k) => Math.abs(TR.fromCol + k * TR.stepCol - c) <= TR.stationWindowCols).sort((x, y) => x - y);
              if (nb.length) tr = nb.length % 2 ? nb[(nb.length - 1) / 2] : (nb[nb.length / 2 - 1] + nb[nb.length / 2]) / 2;
            }"""
assert a.count(old2) == 1; a = a.replace(old2, new2)
old3 = """          if (u > 0.02 && u < 0.98 && !inIsland(u) && !(Math.abs(near[j] - m) <= 0.15))"""
new3 = """          /* r334: the two stations a record places either side of a named break (trace.breakStations) stand at the foot and
             the head of a vertical step; any deck vertex within 0.5 m of either may lie on the step itself, so the mesh
             test is excused there and only there. The station still answers to its plate row and to hullSurface's sheer. */
          const atBreak = ((SR.trace && SR.trace.breakStations) || []).some(b => Math.abs(b - u) < 1e-6);
          if (u > 0.02 && u < 0.98 && !inIsland(u) && !atBreak && !(Math.abs(near[j] - m) <= 0.15))"""
assert a.count(old3) == 1; a = a.replace(old3, new3)
open(p, 'w').write(a); print('audit patched', p)
