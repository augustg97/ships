# r311: A-PLATE-TRACE in audit-hulls.js — every plate read fitted over a column range carries its raw trace,
# and the audit checks the trace for a jump and the fit against the trace. Asserts every replace.
import sys
P = sys.argv[1]; s = open(P).read()
anchor = "      /* ── A-ISLAND-TOP-READ (round 298, Titanic): AN ISLAND'S TOP IS ITS PLATE'S ROWS, AT BOTH ENDS."
assert s.count(anchor) == 1
helper = r'''      /* ── A-PLATE-TRACE (round 311, Titanic): A READ FITTED OVER A RUN OF COLUMNS CARRIES ITS TRACE.
         A-SHEER-TRACE (r309) caught r299's deck-line trace stepping 5 rows onto another line. The
         island tops (r298) and the wells' bulwark tops (r303) were fitted the same way, over a run of
         columns, and the record kept only the fit's two end rows, so a jump could not be seen. r311
         re-ran both reads and stored them: the after well's trace had stepped 3 rows down onto the
         house's own line at columns 754 to 760, where the bulwark's heavy line ends. Any read that
         carries colRange (a fit over columns) must carry trace {fromCol, stepCol, rows, maxStepRows,
         fit}, rows null where the read rejected a column. (1) No step between neighbouring kept
         points exceeds maxStepRows per stepCol: a larger one is a jump to another line. (2) Every
         kept point stands within 2 px of the fit: a fit that leaves its trace is the other sign of
         one. (3) The recorded end rows are the fit's rows at the read's end columns within 0.15 px,
         so rows and trace belong to one read. (4) The kept points span exactly colRange, and their
         rms about the fit is rmsPx within 0.05 px. SILENCE: colRange with no trace is convicted. */
      const plateTrace = (what, R, cols) => {
        if (!(R && Array.isArray(R.colRange))) return;
        const T = R.trace;
        if (!(T && Array.isArray(T.rows) && T.rows.length >= 3 && T.stepCol && T.maxStepRows > 0 && Array.isArray(T.fit) && T.fit.length >= 2 && Array.isArray(cols) && cols.length === R.rows.length)) {
          say(v.id, 'a plate read fitted over columns with no trace', `${what}: colRange ${R.colRange.join('-')} is recorded and trace {fromCol, stepCol, rows, maxStepRows, fit} is absent or out of shape, so the fit cannot be checked against the rows it was fitted to`); return; }
        const fit = c => T.fit.reduce((a, k) => a * c + k, 0);
        let prev = -1, worst = 0, wAt = null, off = 0, oAt = null, n = 0, ss = 0, cLo = Infinity, cHi = -Infinity;
        T.rows.forEach((r, i) => {
          if (r === null || r === undefined) return;
          const c = T.fromCol + i * T.stepCol, e = r - fit(c);
          n++; ss += e * e; cLo = Math.min(cLo, c); cHi = Math.max(cHi, c);
          if (Math.abs(e) > Math.abs(off)) { off = e; oAt = c; }
          if (prev >= 0) { const d = Math.abs(r - T.rows[prev]) / (i - prev); if (d > worst) { worst = d; wAt = c; } }
          prev = i;
        });
        if (worst > T.maxStepRows) say(v.id, 'a plate trace that steps onto another line', `${what}: the trace steps ${worst.toFixed(2)} rows per ${Math.abs(T.stepCol)} columns at column ${wAt}, over its limit of ${T.maxStepRows}`);
        if (Math.abs(off) > 2.0) say(v.id, 'a plate fit that leaves its trace', `${what}: the trace's row at column ${oAt} stands ${off.toFixed(2)} px off the fit`);
        cols.forEach((c, e) => { if (Math.abs(R.rows[e] - fit(c)) > 0.15) say(v.id, 'a plate read whose end rows are not its fit', `${what}: row ${R.rows[e]} at column ${c}, the trace's fit gives ${fit(c).toFixed(2)}`); });
        if (cLo !== Math.min(...R.colRange) || cHi !== Math.max(...R.colRange)) say(v.id, 'a plate read whose column range is not its trace', `${what}: colRange ${R.colRange.join('-')}, the kept trace spans ${cLo}-${cHi}`);
        const rms = Math.sqrt(ss / Math.max(1, n));
        if (typeof R.rmsPx === 'number' && Math.abs(rms - R.rmsPx) > 0.05) say(v.id, 'a plate read whose rms is not its trace', `${what}: rmsPx ${R.rmsPx}, the kept trace's rms about the fit is ${rms.toFixed(2)}`);
      };
'''
s = s.replace(anchor, helper + anchor)
a2 = "        const grp = groups.find(q => q.name === isl.name);\n        if (!grp) continue;\n        const xa = loftDeckX(H, isl.u[0]), xb = loftDeckX(H, isl.u[1]);"
assert s.count(a2) == 1
s = s.replace(a2, "        plateTrace(`${isl.name} top`, TR, isl.cols);\n" + a2)
a3 = """            if (Math.abs(w.topM[e] - want) > 0.05) say(v.id, "a well's bulwark top off its plate read", `${w.name} ${e ? 'aft' : 'fwd'} end: topM ${w.topM[e]} m, row ${TR.rows[e]} over datum row ${TR.datumRows[e]} reads ${want.toFixed(2)} m`);
          }"""
assert s.count(a3) == 1
s = s.replace(a3, a3 + "\n          if (TR) plateTrace(`${w.name} bulwark top`, TR, w.cols);")
open(P, 'w').write(s)
print('ok')
