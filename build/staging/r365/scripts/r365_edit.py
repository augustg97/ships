import sys
P = sys.argv[1]
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# 1. shroudFeet: a recorded channel
rep("""  const x = (u - 0.5) * L + H.rake(u);
  const CR = !SF && FINE && S.castles ? channelRun(S, H, u, 0.0275) : null;""",
"""  const x = (u - 0.5) * L + H.rake(u);
  /* r365: a channel the record lays (hull.channels, Steel's Folio LIII) carries its mast's feet */
  const CHR = kind === 'deadeyes' && FINE && !SF ? channelRecordOf(S, mk) : null;
  if (CHR) return recordedChannelFeet(S, H, mk, kind, x, CHR);
  const CR = !SF && FINE && S.castles ? channelRun(S, H, u, 0.0275) : null;""")

rep("""/* ── THE CROSSBEAMS OF A DOUBLE HULL ARE ONE DERIVATION (round 247).""",
"""/* ── A CHANNEL LAID FROM THE RECORD (round 365). Steel's Folio LIII ("Outboard", leaf 592 of the 1822
 * edition) gives each channel of a 74 its length, its thickness at the inner and outer edge, its breadth,
 * how far its foremost end stands afore the centre of its mast, and its height: the upper edge "well"
 * with the upper edge of the sheer rail, or top-timber line, which is the top of the side. The class
 * channel was a box 0.075 L long (3.8 m on the 74) centred on the shroud feet, at 0.97 of the sheer's
 * height, standing across the upper-deck ports. hull.channels.masts[i] = { lenM, foreM, breadthM,
 * thickInM, thickOutM } for mast i. The run starts foreM afore the mast's centre and runs lenM aft;
 * its upper edge lies on the top of the side at every station along it, its inner face on the skin, so
 * it follows the side's sheer and its curve in plan. The shrouds' deadeyes stand along its outer edge
 * at an even pitch over the whole run; the run also holds the backstays' deadeyes on the ship, which
 * the model sets up elsewhere, so the pitch is CONTESTED and the record says so. */
function channelRecordOf(S, mk) {
  const C = S.channels; if (!C || !Array.isArray(C.masts)) return null;
  const i = (S.masts || []).indexOf(mk), r = i >= 0 ? C.masts[i] : null;
  return r && r.lenM > 0 ? r : null;
}
function channelTopAt(S, H, xx) {
  const u = uAtXV(S, H, xx, 1, Math.max(0.01, Math.min(0.99, xx / S.lwl + 0.5)));
  if (u === null) return null;
  const p = surfacePoint(S, H, u, 1);
  return { u, x: p[0], y: p[1], z: Math.abs(p[2]) };
}
function recordedChannelFeet(S, H, mk, kind, x, R) {
  const B = S.beam, n = mk.shrouds;
  const x0 = x - R.foreM, x1 = x0 + R.lenM;
  const N = Math.max(8, Math.ceil(R.lenM / 0.4));
  const rows = [];
  for (let k = 0; k <= N; k++) {
    const t = channelTopAt(S, H, x0 + (x1 - x0) * k / N); if (!t) continue;
    rows.push({ x: t.x, u: t.u, y: t.y, zTop: t.z, zBot: halfAtHeight(S, H, t.u, t.y - R.thickInM) });
  }
  const pitch = R.lenM / n;
  const r = Math.min(B * 0.018, 0.25, pitch * 0.42);
  const xs = [], ys = [], zs = [];
  for (let s = 0; s < n; s++) {
    const t = channelTopAt(S, H, x0 + pitch * (s + 0.5));
    xs.push(t.x); ys.push(t.y + r * 0.6); zs.push(t.z + R.breadthM);
  }
  const mean = a => a.reduce((p, q) => p + q, 0) / a.length;
  const chan = { rec: true, x: (x0 + x1) / 2, x0, x1, len: R.lenM, w: R.breadthM, tIn: R.thickInM, tOut: R.thickOutM, rows,
                 y: mean(rows.map(q => q.y)) - R.thickInM / 2, z: mean(rows.map(q => q.zTop)) + R.breadthM / 2, d: R.thickInM };
  return { kind, xs, ys, zs, y: mean(ys), z: mean(zs), r, chan, castle: null, run: null, seats: null,
           drift: 0, block: 0, lash: 0, lashRead: false, recorded: true, pitch };
}
/* the recorded channel's solid: at each station of its run a section with its top on the top of the
   side, its inner face on the skin (tIn deep) and its outer edge tOut deep, the breadth out from the side */
function channelGeometry(C, sgn) {
  const R = C.rows, pos = [];
  const ring = q => [[q.x, q.y, q.zTop], [q.x, q.y, q.zTop + C.w], [q.x, q.y - C.tOut, q.zTop + C.w], [q.x, q.y - C.tIn, q.zBot]];
  const tri = (a, b, c) => { const t = sgn > 0 ? [a, b, c] : [a, c, b]; for (const p of t) pos.push(p[0], p[1], sgn * p[2]); };
  for (let k = 0; k + 1 < R.length; k++) {
    const A = ring(R[k]), Bq = ring(R[k + 1]);
    for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; tri(A[j], A[j2], Bq[j]); tri(A[j2], Bq[j2], Bq[j]); }
  }
  const F = ring(R[0]), E = ring(R[R.length - 1]);
  tri(F[0], F[2], F[1]); tri(F[0], F[3], F[2]);
  tri(E[0], E[1], E[2]); tri(E[0], E[2], E[3]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* ── THE CROSSBEAMS OF A DOUBLE HULL ARE ONE DERIVATION (round 247).""")

# 2. buildRig: per-foot deadeye heights
rep("""          else if (onDeadeyes) a = new THREE.Vector3(chX, FT.y + FT.r, side * FT.z);""",
"""          else if (onDeadeyes) a = new THREE.Vector3(chX, (FT.ys ? FT.ys[s] : FT.y) + FT.r, side * (FT.zs ? FT.zs[s] : FT.z));""")

# 3. buildShip: draw the recorded channel and its deadeyes
rep("""      const C = FT.chan, CT = FT.castle;
      for (const sgn of [-1, 1]) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(C.len, C.d, C.w), timber);""",
"""      const C = FT.chan, CT = FT.castle;
      for (const sgn of [-1, 1]) {
        /* r365: a channel the record lays follows the top of the side; each deadeye at its own foot */
        if (C.rec) {
          const ch = new THREE.Mesh(channelGeometry(C, sgn), timber);
          ch.userData.mast = mi;
          ch.userData.channel = { rec: true, x0: C.x0, x1: C.x1, w: C.w, tIn: C.tIn, tOut: C.tOut, pitch: FT.pitch };
          group.add(tag(ch, 'channel'));
          const dg = new THREE.Group();
          FT.xs.forEach((xx, s) => {
            const d = new THREE.Mesh(new THREE.CylinderGeometry(FT.r, FT.r, FT.r * 0.5, 16), timber);
            d.rotation.x = Math.PI / 2;
            d.position.set(xx, FT.ys[s], sgn * FT.zs[s]);
            dg.add(d);
          });
          dg.userData.mast = mi;
          group.add(tag(dg, 'deadeye'));
          continue;
        }
        const ch = new THREE.Mesh(new THREE.BoxGeometry(C.len, C.d, C.w), timber);""")

open(P, 'w').write(s)
print('ok')
