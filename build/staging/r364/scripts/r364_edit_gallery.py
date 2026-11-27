import sys, pathlib
W = pathlib.Path(sys.argv[1])
def rep(path, old, new, n=1):
    p = W / path; s = p.read_text(); c = s.count(old)
    assert c == n, f'{path}: anchor found {c} times: {old[:80]!r}'
    p.write_text(s.replace(old, new))
rep('js/hull.js', '''  const { P, storeys } = QG;
  /* the offset along the rim''', '''  const { P, storeys } = QG;
  /* ⚠ THE GALLERY STANDS ABAFT THE AFTER PORT (round 364). Steel's Folio XXXII puts the 74's after upper-deck port's
     aftside 6 ft 9 in afore the after perpendicular, and his Folio LI runs the lower gallery's rim 13 ft forward from the
     side counter timber. Registered on the model (the ports on her masts, the gallery on her stern's corner) the two
     overlap: the gallery's fore end stood 0.24 m forward of the port's aftside, and the gun in that port came out
     through the gallery's face. Bellona's contemporary model (RMG SLR0338) shows the after port immediately forward of
     the gallery. A storey that spans a recorded tier's port in height is therefore ended at the after port's aftside,
     and the read says by how much its rim was shortened. The fault is in the registration: both figures can stand only
     if the stern's corner stood about 0.9 m further aft at that height, and the stern is already contested. */
  {
    const ST = tierPortStations(S), PR = tierPortRows(S);
    ST.forEach((t, d) => {
      if (!t || !t.ports.length) return;
      const last = t.ports[t.ports.length - 1];
      const sill = surfacePoint(S, H, last.u, PR[d].lo)[1], head = surfacePoint(S, H, last.u, PR[d].hi)[1];
      const xAft = surfacePoint(S, H, last.uHi, PR[d].port)[0];
      storeys.forEach((st, i) => {
        const yLo = i === 0 ? Math.min(QG.upperCounterY, st.floorY - 0.4) : st.floorY;
        if (st.topY < sill || yLo > head) return;
        let sMin = Infinity;
        for (const y of [sill, (sill + head) / 2, head]) {
          const pts = lineAt(y);
          for (let k = 1; k < pts.length; k++) if (pts[k].x <= xAft) {
            const a = pts[k - 1], b = pts[k]; sMin = Math.min(sMin, a.s + (b.s - a.s) * (a.x - xAft) / Math.max(1e-9, a.x - b.x)); break; }
        }
        if (sMin < st.rimM) {
          const rs = QG.read.storeys[i];
          rs.rimDrawnM = +sMin.toFixed(3);
          rs.rimClamp = `ended at the after port of tier ${d} (its aftside at x ${xAft.toFixed(3)}), ${(st.rimM - sMin).toFixed(2)} m short of Steel's ${st.rimM.toFixed(2)} m rim`;
          st.rimM = sMin;
        }
      });
    });
  }
  /* the offset along the rim''')
rep('js/hull.js', '''    + ` (Steel, 1805, Folio LI). A carved drop hangs under the lower storey to the upper counter.`;''',
'''    + ` (Steel, 1805, Folio LI). A carved drop hangs under the lower storey to the upper counter.`
    + (QG.read.storeys[0] && QG.read.storeys[0].rimClamp ? ` The lower storey is ${QG.read.storeys[0].rimClamp}: Steel's rim and his after port overlap on this model, and the port is kept.` : '');''')
print('gallery edit applied')
