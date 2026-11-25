import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
rep("""          if (sg.length < 3) say(v.id, 'mast heights recorded and not built', `${at}: ${sg.length} segments drawn for a top, crosstrees and truck`);
          else {
            const foot = sg[0].footY, got = { top: 0.90 * (sg[0].headY - foot), crosstrees: sg[1].headY - foot, truck: sg[sg.length - 1].headY - foot };
            for (const k of ['top', 'crosstrees', 'truck'])""",
"""          /* r322: a mast built in two pieces (`only` 2) records a top and crosstrees and no truck */
          const twoPiece = mk.only === 2 && MH.truck === undefined, need = twoPiece ? 2 : 3;
          if (sg.length < need) say(v.id, 'mast heights recorded and not built', `${at}: ${sg.length} segments drawn for ${twoPiece ? 'a top and crosstrees' : 'a top, crosstrees and truck'}`);
          else if (twoPiece && sg.length > 2) say(v.id, 'mast heights recorded and not built', `${at}: ${sg.length} segments drawn for a two-piece mast`);
          else {
            const foot = sg[0].footY, got = { top: 0.90 * (sg[0].headY - foot), crosstrees: sg[1].headY - foot, truck: sg[sg.length - 1].headY - foot };
            for (const k of (twoPiece ? ['top', 'crosstrees'] : ['top', 'crosstrees', 'truck']))""")
ANCHOR = """    /* ── A-MIZZEN-TIERS (round 320, 0y¹⁵⁷): A LATEEN MIZZEN OF THE 1590s-1620s CROSSES NO TOPGALLANT."""
rep(ANCHOR, """    /* ── A-MAST-READ (round 322, 0y¹⁶⁴): THE MASTS OF A HULL WHOSE LATEEN YARD IS READ OFF VASA ANSWER FOR THEIR HEIGHTS,
       AND A READ HEIGHT IS ITS SHARE OF THE BUILT STATIONS. Until r322 the East Indiaman's and the slave ship's masts were
       Steel's 1794 proportions, and the East Indiaman's mizzen stood 0.45 of her waterline from the deck to its top, where
       Vasa's stands 0.17 of hers. Hocker's Vasa rig diagram (Vasa II, 2023, p. 31) gives each mast's top, topmast cap
       and topgallant cap as shares of the distance between the fore and mizzen masts' feet.
       RECORD: on a hull whose lateen mizzen carries `lateenRead`, every mast says where its heights come from
       (`mastHeightsProvenance`, READ, RECORD, CONTESTED or CLASS); the SILENCE convicts: 'a mast beside a Vasa read with no
       height answer'. A READ carries `mastHeightsRead`, and one without it convicts.
       READ: each share agrees with the plate rows it came from, (foot row - row) / (fore foot column - mizzen foot column),
       within 0.0005: 'a mast read that disagrees with its own rows'.
       BUILT: each recorded height is its share times the spacing of this hull's fore and aftermost stations, as the
       builder places them, within `boundM`: 'mast heights off their read'. A-MAST-HEIGHTS checks the segments against
       the metres; this rule checks the metres against the stations, so a moved station cannot leave stale heights. */
    {
      const lrH = (H.masts || []).some(m2 => m2.lateenRead && typeof m2.lateenRead.yardOfMastSpacing === 'number');
      if (lrH) {
        const hs = SHIPS_HULL.hullSurface(H), Lh = H.lwl;
        const stX = u => (u - 0.5) * Lh + hs.rake(u);
        const ats = (H.masts || []).map(m2 => m2.at);
        const spB = stX(Math.max(...ats)) - stX(Math.min(...ats));
        (H.masts || []).forEach((mk, mi) => {
          const at = `masts[${mi}] (station ${mk.at})`, pv = mk.mastHeightsProvenance, rd = mk.mastHeightsRead;
          if (!/^(READ|RECORD|CONTESTED|CLASS)/.test(pv || '')) { say(v.id, 'a mast beside a Vasa read with no height answer', `${at}: mastHeightsProvenance is ${pv ? "'" + pv.slice(0, 12) + "'" : 'absent'}`); return; }
          if (/^READ/.test(pv) !== !!rd) { say(v.id, 'a mast read without its figures', `${at}: provenance opens '${pv.slice(0, 12)}' and mastHeightsRead is ${rd ? 'present' : 'absent'}`); return; }
          if (!rd) return;
          const sh = rd.ofForeMizzenSpacing || {}, span = rd.feetPx[0] - rd.feetPx[1], MH = mk.mastHeightsM || {};
          for (const k of Object.keys(sh)) {
            const fromRows = (rd.foot[1] - rd.rows[k]) / span;
            if (Math.abs(fromRows - sh[k]) > 0.0005)
              say(v.id, 'a mast read that disagrees with its own rows', `${at}: ${k} rows give ${fromRows.toFixed(4)} of the spacing, the read says ${sh[k]}`);
            if (MH[k] === undefined || Math.abs(MH[k] - sh[k] * spB) > (rd.boundM || 0.05))
              say(v.id, 'mast heights off their read', `${at}: ${k} ${MH[k]} m recorded; ${sh[k]} of the built ${spB.toFixed(3)} m fore-to-mizzen spacing is ${(sh[k] * spB).toFixed(2)} m`);
          }
          for (const k of Object.keys(MH)) if (sh[k] === undefined)
            say(v.id, 'mast heights off their read', `${at}: ${k} ${MH[k]} m recorded with no share read for it`);
        });
      }
    }
""" + ANCHOR)
open(P, 'w').write(s); print('ok')
