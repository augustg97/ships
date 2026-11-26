#!/usr/bin/env python3
"""r346 audit: judge the class station; hold an unseated capstan to its provenance.
usage: r346_edit_audit.py <audit-hulls.js>"""
import sys, pathlib
p = pathlib.Path(sys.argv[1])
s = p.read_text()

def rep(old, new):
    global s
    c = s.count(old)
    assert c == 1, (c, old[:90])
    s = s.replace(old, new)

# 1. 'declared but not drawn' gives way to the unseated record, and the record and builder must agree
rep("""      if (H.capstan && !capm.length)
        say(v.id, 'declared but not drawn', 'capstan');""",
    """      /* ── A-CAPSTAN-UNSEATED (round 346): A CLASS CAPSTAN WITH NOWHERE CLEAR IS NOT DRAWN, AND SAYS SO.
         A record with no station draws its capstan at the nearest station from u 0.62 where its
         drum and bars' sweep are clear (seatClassCapstans). On the galley, the carrack and Endurance
         no station between u 0.20 and 0.85 is clear, and the builder draws none. MESH and RECORD:
         a recorded bar capstan with no capstan mesh passes only where the builder recorded the
         failed search on the group (userData.capstanUnseated) AND the record's provenance says "No
         capstan is drawn"; a provenance that says so over a drawn capstan convicts too. */
      const capProv = H.capstanProvenance || '';
      const capUnseated = (g.userData && g.userData.capstanUnseated) || null;
      if (H.capstan && !capm.length && !(capUnseated && /No capstan is drawn/.test(capProv)))
        say(v.id, 'declared but not drawn', capUnseated
            ? 'capstan: the builder found no clear station, and the record\\'s provenance does not say "No capstan is drawn"'
            : 'capstan');
      if (H.capstan && capm.length && /No capstan is drawn/.test(capProv))
        say(v.id, 'declared but not drawn',
            'the record\\'s provenance says "No capstan is drawn" and a capstan is drawn');""")

# 2. A-CAPSTAN-STATIONS: a seated class capstan is judged against its seat and the provenance
rep("""        else for (const G of capOwn.keys()) {
          const c = capCentre(G);
          const st = capRec.slice()""",
    """        else for (const G of capOwn.keys()) {
          const c = capCentre(G);
          /* (r346) a record with no station: the builder moved the machine to the nearest clear
             station from u 0.62 and recorded the seat. The centre must stand where the seat says,
             and the record's provenance must name that station, so the card and the deck agree. */
          const seatSt = G.userData && G.userData.capstanStation;
          if (!(H.capstan.stations && H.capstan.stations.length) && H.capstan.atU == null) {
            if (!seatSt || !seatSt.seat)
              say(v.id, 'capstans off the record\\'s stations', 'a class-station capstan with no seat record');
            else {
              if (Math.abs((seatSt.u - 0.5) * H.lwl - c.x) > 0.3)
                say(v.id, 'capstans off the record\\'s stations',
                    `the capstan stands at x ${c.x.toFixed(2)}; its seat says u ${seatSt.u}, x ${((seatSt.u - 0.5) * H.lwl).toFixed(2)}`);
              if (!(H.capstanProvenance || '').includes(`u ${seatSt.u}`))
                say(v.id, 'capstans off the record\\'s stations',
                    `the capstan is drawn at u ${seatSt.u} and the record's provenance does not name that station`);
            }
            continue;
          }
          const st = capRec.slice()""")

# 3. the class station is judged now
rep("""        const capClassOnly = !(H.capstan.stations && H.capstan.stations.length) && H.capstan.atU == null;
        if (!capClassOnly) for (const [G, ms] of capOwn) {""",
    """        /* (r346) and since r346 it is: the builder seats a class capstan where this arm passes, so
           every drawn capstan is judged, the class station's with the rest. Run with the gate off,
           the arm found 16 problems on 9 hulls at u 0.62, where r345's vertex-only first run had
           listed 6 on 5 (build/staging/r346/auditInj.out). */
        for (const [G, ms] of capOwn) {""")
rep("⚠ THE CLASS STATION IS NOT JUDGED YET. A record", "(r345) THE CLASS STATION WAS NOT JUDGED AT FIRST. A record")
# 4. a hatch's coaming stands 0.3 m clear of the drumhead's rim, and a grating lies almost flush
rep("""              const r = Math.hypot(P.x - c.x, P.z - c.z);
              const inDrum = r < rD && P.y > yFoot + 0.05 && P.y < yTop;""",
"""              const r = Math.hypot(P.x - c.x, P.z - c.z);
              /* (r346) a hatch is cut 0.3 m clear of the drumhead's rim (r345's grating rule), and a
                 grating's coaming stands a few centimetres over the planking, under the drum's bands */
              const inDrum = r < rDo && P.y > yD0 && P.y < yTop;""")
rep("""            const k = `${pt.key}/${pt.name}`;
            const W = new Float32Array(A.count * 3);""",
"""            const k = `${pt.key}/${pt.name}`;
            const grat = pt.key === 'grating', rDo = grat ? rD + 0.3 : rD, yD0 = grat ? yFoot - 0.1 : yFoot + 0.05;
            let gy0 = 1e9, gy1 = -1e9;
            const W = new Float32Array(A.count * 3);""")
rep("""              W[3 * i] = P.x; W[3 * i + 1] = P.y; W[3 * i + 2] = P.z;
              const r = Math.hypot""", """              W[3 * i] = P.x; W[3 * i + 1] = P.y; W[3 * i + 2] = P.z; gy0 = Math.min(gy0, P.y); gy1 = Math.max(gy1, P.y);
              const r = Math.hypot""")
rep("""                          [yFoot + 0.15, rD, 'in the drum'], [(yFoot + yTop) / 2, rD, 'in the drum'], [yTop - 0.05, rD, 'in the drum']];""",
"""                          [yFoot + 0.15, rDo, 'in the drum'], [(yFoot + yTop) / 2, rDo, 'in the drum'], [yTop - 0.05, rDo, 'in the drum']];
            if (grat) cuts.push([(gy0 + gy1) / 2, rDo, 'within 0.3 m of the drumhead\\'s rim']);""")
p.write_text(s)
print('ok', p)
