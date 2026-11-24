#!/usr/bin/env python3
"""r309: A-SHEER-TRACE inside A-SHEER-READ. Reads audit-hulls.before.js, writes Research/audit-hulls.js."""
R='/Users/augustgweon/Ships/build/staging/r309/'; W='/Users/augustgweon/Ships/'
def sub1(s,old,new,n=1):
    assert s.count(old)==n,(old[:80],s.count(old)); return s.replace(old,new)
s=open(R+'audit-hulls.before.js',encoding='utf8').read()
anchor="""          if (u > 0.02 && u < 0.98 && !inIsland(u) && !(Math.abs(near[j] - m) <= 0.15))
            say(v.id, 'a deck built off its read deck line', `u ${u}: the deck's outermost vertex within 0.5 m of x ${xs[j].toFixed(2)} stands at ${near[j].toFixed(2)} m, the read ${m} m`);
        });
      }
    }
"""
new="""          if (u > 0.02 && u < 0.98 && !inIsland(u) && !(Math.abs(near[j] - m) <= 0.15))
            say(v.id, 'a deck built off its read deck line', `u ${u}: the deck's outermost vertex within 0.5 m of x ${xs[j].toFixed(2)} stands at ${near[j].toFixed(2)} m, the read ${m} m`);
        });
        /* ── A-SHEER-TRACE (round 309): THE TRACE STAYS ON ONE LINE, AND THE FIT STAYS ON THE TRACE.
           r299 traced Titanic's C deck letting each point move 4 rows from the last. At column 790
           a solid line begins 5 rows under the dashed C line, and the trace stepped onto it and
           followed it to the stern, while its provenance said it followed the dashed line: the
           after well's deck stood 0.27 m low, and r307 found the after wash ports 0.7 m over a
           deck the plan draws 0.4 m under them. The record carries the raw trace now. (1) No two
           neighbouring trace points may differ by more than its maxStepRows (a deck line's
           steepest slope on the plate): a larger step is a jump to another line. (2) Every
           station inside the trace's columns must stand within 2 px of the trace's own row at
           its column: a smooth fit cannot follow a jump, so a fit that leaves its trace is the
           other sign of one. SILENCE: a sheerRead with no trace is convicted. */
        const TR = SR.trace;
        if (!(TR && Array.isArray(TR.rows) && TR.rows.length >= 2 && TR.stepCol && TR.maxStepRows > 0 && Array.isArray(SR.cols) && SR.cols.length === ST.length))
          say(v.id, 'a deck line read with no trace', 'hull.sheerRead needs trace {fromCol, stepCol, rows, maxStepRows} and cols, so the fit can be checked against the raw rows');
        else {
          let worst = 0, at = null;
          for (let i = 1; i < TR.rows.length; i++) { const dd = Math.abs(TR.rows[i] - TR.rows[i - 1]); if (dd > worst) { worst = dd; at = TR.fromCol + i * TR.stepCol; } }
          if (worst > TR.maxStepRows)
            say(v.id, 'a deck line trace that steps onto another line', `the trace steps ${worst.toFixed(2)} rows at column ${at}, over its limit of ${TR.maxStepRows}`);
          const lastCol = TR.fromCol + (TR.rows.length - 1) * TR.stepCol, cMin = Math.min(TR.fromCol, lastCol), cMax = Math.max(TR.fromCol, lastCol);
          ST.forEach(([u], j) => {
            const c = SR.cols[j]; if (!(c >= cMin && c <= cMax)) return;
            const f = (c - TR.fromCol) / TR.stepCol, i0 = Math.min(TR.rows.length - 2, Math.floor(f)), t = f - i0;
            const tr = TR.rows[i0] * (1 - t) + TR.rows[i0 + 1] * t;
            if (Math.abs(SR.rows[j] - tr) > 2.0)
              say(v.id, 'a deck line station off its own trace', `u ${u}: the station's row ${SR.rows[j]} is ${(SR.rows[j] - tr).toFixed(2)} px off the trace's ${tr.toFixed(2)} at column ${c}`);
          });
        }
      }
    }
"""
s=sub1(s,anchor,new)
open(W+'Research/audit-hulls.js','w',encoding='utf8').write(s)
print('ok')
# second edit: the boat-deck derivation reads the sheer the builder stands the house on
s=open(W+'Research/audit-hulls.js',encoding='utf8').read()
s=sub1(s,"""      const dh = H.deckM || H.beam * 0.105;
      const top = H.freeboard + (H.boatsRecessed ? (H.shellTiers || 0) : H.decks) * dh;""",
"""      const dh = H.deckM || H.beam * 0.105;
      /* r309: a hull with a read deck line stands its house on that line, not on the class
         freeboard. Titanic's record keeps freeboard 10.1 m while her read C deck is 9.57 m
         amidships; this rule went on deriving from 10.1, and passed r299's tree by 0.001 m. */
      const base = H.sheerRead ? SHIPS_HULL.hullSurface(H).sheer(0.5) : H.freeboard;
      const top = base + (H.boatsRecessed ? (H.shellTiers || 0) : H.decks) * dh;""")
open(W+'Research/audit-hulls.js','w',encoding='utf8').write(s)
print('ok 2')
