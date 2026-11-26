# r345 audit, part 2: the class station is not judged yet (r346 item 1)
import sys, pathlib
p = pathlib.Path(sys.argv[1])
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)
s = p.read_text()
rep("""        for (const [G, ms] of capOwn) {
          const c = capCentre(G);
          let rD = 0,""", """        /* ⚠ THE CLASS STATION IS NOT JUDGED YET. A record with no `stations` and no `atU` draws
           its capstan at u 0.62, a station nobody read, and the first run of this rule found six
           conflicts there on five hulls: the caravel's sail, the galley's boat and oars, the
           galleass's boat, the clipper's deckhouse and Endurance's funnel. Moving those machines
           is r346's first item (HANDOFF). Until then this arm judges only a station the record
           names, and a recorded station that is not clear convicts. */
        const capClassOnly = !(H.capstan.stations && H.capstan.stations.length) && H.capstan.atU == null;
        if (!capClassOnly) for (const [G, ms] of capOwn) {
          const c = capCentre(G);
          let rD = 0,""")
p.write_text(s); print('ok gate')
