/* ── A DECK LINE FROM A SCANTLING TABLE (sheerTable, round 378, the 74) ─────────────────
   Steel (1805) draws a ship's decks in the sheer draught by setting up three heights of the
   gun deck over the upper edge of the rabbet of the keel, at the foremost perpendicular, at
   dead-flat and at the after perpendicular, and drawing "by moulds which are portions of
   circles, (termed sweeps,) ... a curve line through these three heights" (Book II, ch. III).
   The upper deck is set a constant height over it at all three stations (7 ft 2 in on a 74,
   Folio XIX rows O-Q), so it has the same sweep. The record holds the three heights and dead-
   flat's distance abaft the foremost perpendicular (Folio I row E); the perpendiculars are
   placed on the model by steelPerpendiculars. The sweep is the circle through the three
   points, and the model's sheer follows it at the record's level: the sheer at levelAtU stays
   S.freeboard. Until r378 the 74 carried the class curve, which rose 1.46 m from dead-flat to
   the foremost perpendicular where Steel's deck rises 0.61 m (2 ft 0 in), and 0.77 m to the
   after perpendicular against the same 0.61 m. The perpendiculars are found on a surface built
   without the table (the masts and the stem's rake do not depend on the sheer), cached on the
   record against the fields it reads. null without the record: every other hull is unchanged. */
function sheerTableFn(S) {
  const T = S.sheerTable;
  if (!(T && T.gunDeckOverRabbetFt && T.deadFlatAbaftFpFt && S.perpendiculars)) return null;
  const key = JSON.stringify([T, S.lwl, S.loa, S.freeboard, S.perpendiculars, S.tierPorts, (S.masts || []).map(m => m.at), S.forefoot, S.run, S.stemRake, S.sternRake]);
  if (S.__sheerTable && S.__sheerTable.key === key) return S.__sheerTable.fn;
  const base = Object.assign({}, S); delete base.sheerTable; delete base.__sheerTable;
  const H0 = hullSurface(base), P = steelPerpendiculars(base, H0);
  if (!P || !(P.lpp > 0)) return null;
  const FT = 0.3048, F = a => a[0] + a[1] / 12, g = T.gunDeckOverRabbetFt;
  const xa = 0, xm = F(T.deadFlatAbaftFpFt), xb = P.lpp / FT;
  const ya = F(g.afore), ym = F(g.midships), yb = F(g.abaft);
  const d = 2 * (xa * (ym - yb) + xm * (yb - ya) + xb * (ya - ym));
  const xc = ((xa * xa + ya * ya) * (ym - yb) + (xm * xm + ym * ym) * (yb - ya) + (xb * xb + yb * yb) * (ya - ym)) / d;
  const yc = ((xa * xa + ya * ya) * (xb - xm) + (xm * xm + ym * ym) * (xa - xb) + (xb * xb + yb * yb) * (xm - xa)) / d;
  const R = Math.hypot(xa - xc, ya - yc);
  const sweepFt = xf => yc - Math.sqrt(Math.max(0, R * R - (xf - xc) * (xf - xc)));
  const yAt = u => sweepFt(((u - 0.5) * S.lwl + H0.rake(u) - P.fp) / FT) * FT;
  const lu = T.levelAtU != null ? T.levelAtU : 0.5, off = S.freeboard - yAt(lu);
  const fn = u => yAt(u) + off;
  S.__sheerTable = { key, fn, fp: P.fp, ap: P.ap, lpp: P.lpp, deadFlatX: P.fp + xm * FT, xc: P.fp + xc * FT, R: R * FT };
  return fn;
}

