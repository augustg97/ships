const V = __V.find(v => v.id === __ID), S = V.hull, SH = SHIPS_HULL;
const H = SH.hullSurface(S);
const f = x => (+x).toFixed(3);
const P = SH.steelPerpendiculars(S, H);
console.log('perp', JSON.stringify(P));
const uAtX = x => { let a = -0.2, b = 1.2; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if ((m - 0.5) * S.lwl + H.rake(m) < x) a = m; else b = m; } return (a + b) / 2; };
const ft = 0.3048;
if (P) {
  const ufp = uAtX(P.fp), uap = uAtX(P.ap), udf = uAtX(P.fp + 66 * ft);
  console.log('u fp', f(ufp), 'u deadflat', f(udf), 'u ap', f(uap));
  for (const [n, u] of [['stem u0', 0], ['fp', ufp], ['u.1', 0.1], ['u.25', 0.25], ['deadflat', udf], ['u.5', 0.5], ['u.75', 0.75], ['u.9', 0.9], ['ap', uap], ['stern u1', 1]])
    console.log(n.padEnd(9), 'u', f(u), 'x', f((u - 0.5) * S.lwl + H.rake(u)), 'sheer', f(H.sheer(Math.min(1, Math.max(0, u)))), 'deck', f(H.deck(Math.min(1, Math.max(0, u)))), 'islTop', H.islandTop(Math.min(1, Math.max(0, u))), 'islDeck', H.islandDeck(Math.min(1, Math.max(0, u))));
}
const R = SH.tierPortRows(S);
console.log('tierRows', JSON.stringify(R));
for (const t of R) { const y = v => SH.surfacePoint(S, H, 0.5, v)[1]; console.log('tier lo y', f(y(t.lo)), 'hi y', f(y(t.hi))); }
console.log('islands', JSON.stringify(S.islands.list.map(i => ({ u: i.u, overSheerM: i.overSheerM, overDeckM: i.overDeckM, railM: i.railM, name: i.name }))));
