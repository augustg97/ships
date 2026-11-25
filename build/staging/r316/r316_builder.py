import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""      const setY = yy;
      let loweredRec = null;""", """      /* r316 (0y¹⁵⁰): a doubled rig's fixed yard rests on its cap, one radius plus 0.02 m over it: the rest a
         lowered yard takes (below), so the two rules read one height */
      if (fracRec && typeof fracRec.onCap === 'number') yy = fracRec.onCap + slingsD / 2 + 0.02;
      const setY = yy;
      let loweredRec = null;""")
rep("""      const fracOf = nm => (mk.yardFracs && typeof mk.yardFracs[nm] === 'number') ? mk.yardFracs[nm] : PLAN[nm][0];
      mk.yards.filter(nm => PLAN[nm])
        .sort((a, b) => fracOf(a) - fracOf(b))
        .forEach(nm => { const [, r, kind] = PLAN[nm], f = fracOf(nm);
          crossYard(base + T * f, courseL * r,
                    kind === 'course' && isMizzen ? 'topsail' : kind, HOIST[nm], nm,
                    { name: nm, kind, frac: f, from: (mk.yardFracs && typeof mk.yardFracs[nm] === 'number') ? 'record' : 'plan',
                      base, T, hoist: HOIST[nm] === 'fixed' ? 'fixed' : 'tie', mast: mi }); });""",
"""      const fracOf = nm => (mk.yardFracs && typeof mk.yardFracs[nm] === 'number') ? mk.yardFracs[nm] : PLAN[nm][0];
      const isRec = nm => !!(mk.yardFracs && typeof mk.yardFracs[nm] === 'number');
      const order = mk.yards.filter(nm => PLAN[nm]).sort((a, b) => fracOf(a) - fracOf(b));
      /* ── r316 (0y¹⁵⁰): ABOVE THE COURSE, A DOUBLED RIG'S YARDS HANG FROM THE MAST'S OWN SECTIONS ─────────
         The plan's fractions of the truck were written for a stack whose caps stand at about 0.50 and 0.73 of
         it, which is where they put the lower topsail and lower topgallant, the yards fixed at the caps. The
         builder's stack puts the caps higher: the clipper's fore lower cap at 0.59 of the truck, her topmast
         cap at 0.87. So the lower topsail yard hung 3.4 m under the cap it is fixed to, the upper topsail
         came down 1.1-1.3 m onto that cap when furled, and the topgallant and Endurance's topsail and
         topgallant hung inside the doublings, under the cap of the section below the one they ride, where
         no yard can travel. Now:
         - a FIXED yard (ltop, ltg) rests on the cap of the section it is fixed to: Howes' rig hangs the
           lower topsail yard on the lower cap, the lower topgallant on the topmast cap (Research/MASTHEADS.md §4).
         - a HOISTING yard is set ATRIP: Falconer 1769, "The top-sails are said to be atrip, when they are
           hoisted up to the mast-head, or to their utmost extent" (build/staging/r172/falconer.txt line
           2121). The highest hoisting yard on a section stands at 0.88 of that section, under the heel of
           the section above, which is where the one-yard-per-segment rig already sets every upper yard
           (y + seg x 0.88, above), so both rig paths set the same spar at the same height. Two hoisting
           yards on one section (the clipper's topgallant and royal share her top pole) divide its run
           above the cap below in equal parts, the higher at 0.88: CLASS, no plate read.
         The course keeps its plan fraction or its plate read. A mast whose record reads any yard above the
         course off a plate (Preussen) keeps every yard where the record hangs it. */
      const anyRead = order.some(nm => nm !== 'course' && isRec(nm));
      const FIXED_ON = { ltop: 0, ltg: 1 };
      const placed = {};
      const lastSec = segHeads.length - 1;
      if (!anyRead && lastSec >= 1) {
        const groups = {};
        order.forEach(nm => {
          if (nm === 'course') return;
          if (FIXED_ON[nm] !== undefined) {
            const k = FIXED_ON[nm];
            if (k < lastSec) placed[nm] = { onCap: segHeads[k], sec: k + 1, rule: 'fixed on the cap of section ' + k };
            return;
          }
          const sc = Math.min(HOIST[nm].tie, lastSec);
          (groups[sc] = groups[sc] || []).push(nm);
        });
        Object.keys(groups).forEach(k => { const sc = +k, G = groups[k];
          const atrip = segHeads[sc] - 0.12 * segs[sc], floor = segHeads[sc - 1];
          G.forEach((nm, i) => { placed[nm] = { atY: floor + (atrip - floor) * (i + 1) / G.length, sec: sc, atrip, floor,
            rule: G.length === 1 ? 'atrip at 0.88 of section ' + sc : 'section ' + sc + ' shared by ' + G.length + ' hoisting yards, ' + (i + 1) + ' of ' + G.length + ' parts of its run over the cap below' }; });
        });
      }
      order.forEach(nm => { const [, r, kind] = PLAN[nm], f = fracOf(nm), pl = placed[nm];
          const rec = { name: nm, kind, frac: f, from: isRec(nm) ? 'record' : pl ? 'section' : 'plan',
                        base, T, hoist: HOIST[nm] === 'fixed' ? 'fixed' : 'tie', mast: mi };
          if (pl) Object.assign(rec, { sec: pl.sec, rule: pl.rule, planY: +(base + T * f).toFixed(3) },
                                     pl.onCap !== undefined ? { onCap: +pl.onCap.toFixed(3) } : { atrip: +pl.atrip.toFixed(3), floorY: +pl.floor.toFixed(3) });
          crossYard(pl && pl.atY !== undefined ? pl.atY : base + T * f, courseL * r,
                    kind === 'course' && isMizzen ? 'topsail' : kind, HOIST[nm], nm, rec); });""")
open(P, 'w').write(s); print('ok')
