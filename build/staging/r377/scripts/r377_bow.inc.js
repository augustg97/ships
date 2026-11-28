const V = __V.find(v => v.id === __ID), S = V.hull, SH = SHIPS_HULL;
const H = SH.hullSurface(S);
const f = x => (+x).toFixed(3);
console.log('lwl', S.lwl, 'beam', S.beam, 'draught', S.draught, 'head', S.head, 'islandTop(1)', f(H.islandTop(1)), 'islandTop(0)', H.islandTop(0), 'islandDeck(0.02)', H.islandDeck(0.02));
for (const u of [0, 0.01, 0.02, 0.04, 0.06, 0.08, 0.1, 0.5, 1]) console.log('u', u, 'sheer', f(H.sheer(u)), 'deck', f(H.deck(u)), 'stem x', f((u - 0.5) * S.lwl + H.rake(u)));
const SB = SH.sideBands(S); console.log('sideBands', JSON.stringify(SB).slice(0, 900));
const R = SH.tierPortRows(S); console.log('tierPortRows', JSON.stringify(R));
console.log('tierPorts rec', JSON.stringify(S.tierPorts));
const g = SH.buildShip(S, { fine: true }); g.updateMatrixWorld(true);
console.log('hawse', JSON.stringify(S.__hawse || g.userData.hawse || null));
let hw = []; g.traverse(o => { if (o.userData && o.userData.hawse) hw.push(o.userData.hawse); }); console.log('hawse groups', JSON.stringify(hw));
const ST = SH.tierPortStations(S); console.log('first ports', JSON.stringify(ST.map(t => t && t.ports.slice(0, 2))));
console.log('headRead', JSON.stringify(Object.assign({}, S.__headRead, { cheeks: (S.__headRead && S.__headRead.cheeks || []).map(c => ({ ...c, rows: undefined })) })));
let nc = 0; g.traverse(o => { if (o.userData && o.userData.headCheek) nc++; }); console.log('cheek meshes', nc);
{ const CL = SH.cheekLines(S, H); console.log('CL uT', CL.uT, 'yT', CL.yT, 'half', CL.half);
  const vA = (u, y) => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (SH.surfacePoint(S, H, u, m)[1] < y) a = m; else b = m; } return (a + b) / 2; };
  for (const y of [CL.yT, 3.0, 3.8]) { let lo = 0.0002, hi = 0.2;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Math.abs(SH.surfacePoint(S, H, m, vA(m, y))[2]) < CL.half) lo = m; else hi = m; }
    const p = SH.surfacePoint(S, H, (lo + hi) / 2, vA((lo + hi) / 2, y)); console.log('y', y.toFixed(3), 'throat u', ((lo+hi)/2).toFixed(5), 'x', p[0].toFixed(3), 'z', p[2].toFixed(3)); }
  for (const u of [CL.uT, CL.uT + 0.002, CL.uT + 0.005, 0.01]) console.log('u', u.toFixed(5), 'x', SH.surfacePoint(S, H, u, vA(u, CL.yT))[0].toFixed(3), 'z', SH.surfacePoint(S, H, u, vA(u, CL.yT))[2].toFixed(3));
}
