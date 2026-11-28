function anchorStowOf(S, H, f, cat) {
  const L = S.lwl, B = S.beam;
  const ring = new THREE.Vector3(cat.x, cat.y - B * 0.035, cat.z);
  const fm = (S.masts || []).filter(m => m.shrouds).sort((p, q) => p.at - q.at)[0];
  let FC = null; try { const F = fm ? shroudFeet(S, H, fm, true) : null; FC = F && F.chan ? F.chan : null; } catch (e) { FC = null; }
  const gap = f.rBill + 0.04;
  const sgn = Math.sign(cat.z || 1);
  /* ⚠ THE STOWED BILL LIES ON THE BILL-BOARD, ABOVE THE CHANNEL (round 370). Steel (1822, Book II, the sheer draught):
     the fore channel must be "long enough to take the anchor-lining and bill-board for stowing the anchor ... The
     bill-board may then be carried upwards from the upperside of the channel to the top of the side. The anchor lining
     commences at the upperside of the bolster, which, in the eighty-gun ship, may be well with the upperside of the
     channel-wale". The lining under the channel is where the bill rubs while the anchor is being fished: his glossary
     has it there "to prevent the bill of the anchor from wounding the ship's side, when fishing the anchor". Falconer
     (1769, FISH) has the fish "hoist or draw up the flukes of the ship's anchor towards the top of the bow in order to
     stow it". So the stowed bill is on the bill-board, over the channel, and the crown hangs below it against the
     lining. Until r370 the solver laid the bill under a recorded channel's underside, where it is during fishing. Where
     a recorded channel covers the bill's station the bill now rests against the bill-board, as low on it as lets every
     part of the anchor clear the channel's solid; a hull without a recorded channel is unchanged. */
  const BB_T = 0.064;                                       // the bill-board's thickness, 2½-inch plank (CLASS)
  const sideZ = x => { const u = uAtXV(S, H, x, 1, Math.max(0.01, Math.min(0.99, x / L + 0.5))); return u === null ? null : Math.abs(surfacePoint(S, H, u, 1)[2]); };
  const billAt = (x, lift) => {
    const u = uAtXV(S, H, x, 1, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null) return null;
    const p = surfacePoint(S, H, u, 1), q = surfacePoint(S, H, u, 0.9);
    let y = p[1] - gap;
    let under = 'sheer', board = false;
    if (FC && FC.rec && x >= FC.x0 && x <= FC.x1) { y = p[1] + FC.tIn + gap + lift; under = 'bill-board'; board = true; }
    if (FC && !FC.rec && x >= FC.x - FC.len / 2 && x <= FC.x + FC.len / 2 && FC.y - FC.d / 2 < p[1]) { y = FC.y - FC.d / 2 - gap; under = 'class channel'; }
    const z = Math.max(Math.abs(p[2]), Math.abs(q[2])) + f.palmB / 2 + 0.03 + (board ? BB_T : 0);
    return { u, v: new THREE.Vector3(x, y, z * sgn), under, board, sheer: p[1] };
  };
  /* the recorded channel's solid, and the bill-board on the side over it: how far a point stands outboard of either */
  const chanGap = q => {
    if (!FC || !FC.rec || q.x < FC.x0 - 0.05 || q.x > FC.x1 + 0.05) return 9;
    let r = FC.rows[0]; for (const R of FC.rows) if (Math.abs(R.x - q.x) < Math.abs(r.x - q.x)) r = R;
    if (q.y > r.y + 0.03 || q.y < r.y - FC.tIn - 0.03) return 9;
    return Math.abs(q.z) - (r.zTop + FC.w + 0.03);
  };
  /* the arms, the palms' corners and the shank, sampled in the anchor's own frame (anchorMeshOf's layout) */
  const samples = [];
  for (let i = 0; i <= 10; i++) samples.push([0, f.s * i / 10, 0]);
  for (const k of [1, -1]) {
    const dx = k * f.sin, dy = f.cos, nx = -k * f.cos, ny = f.sin, off = f.rCrown * 0.75;
    for (let i = 1; i <= 10; i++) samples.push([dx * f.a * i / 10, dy * f.a * i / 10, 0]);
    for (const z of [1, -1]) samples.push([dx * f.a * 0.5 + nx * off, dy * f.a * 0.5 + ny * off, z * f.palmB / 2]);
  }
  const solveAt = lift => {
    const fx = x => { const b = billAt(x, lift); return b ? b.v.distanceTo(ring) - f.rBillDist : NaN; };
    let lo = ring.x, hi = ring.x + f.rBillDist + 1;
    if (!(fx(lo) < 0) || !(fx(hi) > 0)) return null;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fx(m) < 0) lo = m; else hi = m; }
    const b = billAt((lo + hi) / 2, lift);
    const bill = b.v, e1 = bill.clone().sub(ring).normalize();
    /* the side's outward normal at the bill */
    const sp = (u, v) => { const p = surfacePoint(S, H, u, v); return new THREE.Vector3(p[0], p[1], sgn * Math.abs(p[2])); };
    const p0 = sp(b.u, 0.95), tU = sp(Math.min(1, b.u + 0.01), 0.95).sub(p0), tV = sp(b.u, 0.99).sub(p0);
    const nrm = tU.cross(tV).normalize();
    if (nrm.z * sgn < 0) nrm.negate();
    const out = nrm.clone().addScaledVector(e1, -nrm.dot(e1)).normalize();
    const down = new THREE.Vector3().crossVectors(out, e1).normalize();
    if (down.y > 0) down.negate();
    /* ⚠ THE ARMS' PLANE IS TILTED UNTIL THE STOCK CLEARS THE BOW. Round 99 laid the arms flat on the side, which
       stands the stock straight off it; a stock as long as the shank then drives its inboard half into the bow at
       the cathead (HEAD: 0.30–0.92 m inside on six of the nine catted hulls). Falconer's shank-painter "hangs the
       shank and flukes up to the ship's side", which turns the stock up along the bow. So the plane through the
       ring and the bill is turned from flat-on-the-side (t = 90°, the crown hanging below the bill) toward
       square-off-the-side (t = 0, the crown outboard), and the first t whose stock ends, crown and ring all
       stand clear of the skin is taken. */
    /* ⚠ AN ISLAND'S SHELL IS THE SIDE ABOVE THE SHEER (round 367). buildIslands carries the shell straight up from the
       sheer to the island's top, so a stock end over the sheer but under a forecastle's top is inside the ship. Until
       r367 no catted hull had an island and this read open air there. */
    const half = (x, y) => {
      const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
      if (u === null) return 0;
      if (surfacePoint(S, H, u, 1)[1] < y) { const t = H.islandTop(u); return t !== null && y <= t ? Math.abs(surfacePoint(S, H, u, 1)[2]) : 0; }
      let a = 0, c = 1; for (let i = 0; i < 24; i++) { const m = (a + c) / 2; if (surfacePoint(S, H, u, m)[1] < y) a = m; else c = m; }
      return Math.abs(surfacePoint(S, H, u, (a + c) / 2)[2]);
    };
    const clear = q => Math.abs(q.z) - half(q.x, q.y);
    let pick = null;
    for (let deg = 90; deg >= 0; deg -= 5) {
      const t = deg * Math.PI / 180;
      const w = out.clone().multiplyScalar(Math.cos(t)).addScaledVector(down, Math.sin(t)).normalize();
      const sd = e1.clone().multiplyScalar(Math.cos(f.phi)).addScaledVector(w, Math.sin(f.phi)).normalize();
      const crown = ring.clone().addScaledVector(sd, f.ringY);
      const yA = sd.clone().negate();
      let zA = new THREE.Vector3().crossVectors(e1, w).normalize();
      zA.addScaledVector(yA, -zA.dot(yA)).normalize();
      let xA = new THREE.Vector3().crossVectors(yA, zA).normalize();
      if (bill.clone().sub(crown).dot(xA) < 0) { xA.negate(); zA.negate(); }
      const sc = crown.clone().addScaledVector(yA, f.s - f.stockMid * 0.9);
      const ends = [sc.clone().addScaledVector(zA, f.stockL / 2), sc.clone().addScaledVector(zA, -f.stockL / 2)];
      if (f.ironStock) ends.push(sc.clone().addScaledVector(zA, f.stockL / 2).addScaledVector(yA, f.legL));
      const worst = Math.min(...ends.map(clear), clear(crown) - f.rCrown, clear(crown.clone().addScaledVector(xA, -f.a * f.sin).addScaledVector(yA, f.a * f.cos)));
      let cg = 9;
      if (b.board) for (const [px, py, pz] of samples) cg = Math.min(cg, chanGap(crown.clone().addScaledVector(xA, px).addScaledVector(yA, py).addScaledVector(zA, pz)));
      const ok = worst > f.stockEnd + 0.03 && cg >= 0;
      const cand = { t: deg, crown, xA, yA, zA, worst, cg, score: Math.min(worst - f.stockEnd - 0.03, cg), ok };
      if (!pick || cand.score > pick.score) pick = cand;
      if (ok) { pick = cand; break; }
    }
    return { b, bill, pick };
  };
  let R = solveAt(0);
  if (!R) return null;
  let lift = 0;
  /* the bill rises up the bill-board, a decimetre at a time, until the anchor clears the channel; the board stops at the
     top of the side, the island's top where one stands there */
  if (R.b.board && !R.pick.ok) {
    const top = (H.islandTop(R.b.u) !== null ? H.islandTop(R.b.u) : R.b.sheer + 1.0) - gap;
    for (let l = 0.1; R.b.sheer + FC.tIn + gap + l <= top; l += 0.1) {
      const T = solveAt(l); if (!T || !T.b.board) break;
      if (T.pick.ok) { R = T; lift = l; break; }
      if (T.pick.score > R.pick.score) { R = T; lift = l; }
    }
  }
  const { b, bill, pick } = R;
  const { crown, xA, yA, zA } = pick;
  const inRun = FC ? (FC.rec ? bill.x >= FC.x0 && bill.x <= FC.x1 : Math.abs(bill.x - FC.x) <= FC.len / 2) : false;
  const res = { ring, crown, bill, xA, yA, zA, under: b.under, underChannel: inRun, tiltDeg: pick.t, stockClear: +pick.worst.toFixed(3),
                channel: FC ? (FC.rec ? [FC.x0, FC.x1] : [FC.x - FC.len / 2, FC.x + FC.len / 2]) : null };
  if (b.board) {
    const top = H.islandTop(b.u) !== null ? H.islandTop(b.u) : b.sheer + 1.0;
    res.board = { x: bill.x, u: b.u, yLo: b.sheer + FC.tIn, yHi: top, t: BB_T, lift: +lift.toFixed(2), chanGap: +pick.cg.toFixed(3), sheer: b.sheer };
  }
  return res;
}

/* ── STEEL'S ANCHOR-LINING, BOLSTER AND BILL-BOARD (round 370) ───────────────────────────
   Steel (1822, Book II): "get the length of the anchor to the bill, and allow for the cat-block; then sweep the distance
   so obtained from the cat-head aft, and the curve that the bill of the anchor is supposed to make will give the middle
   of the lining: the aftside from the channel may be perpendicular, and the fore-part follow the curve made by the
   anchor. The bill-board may then be carried upwards from the upperside of the channel to the top of the side. The
   anchor lining commences at the upperside of the bolster, which, in the eighty-gun ship, may be well with the
   upperside of the channel-wale, and long enough, at the fore-part, for a man to stand upon." His glossary: the
   bolsters for the anchor lining "are solid pieces of oak, bolted to the ship's side, at the fore part of the fore
   chains, on which the stantions are fixed that receive the anchor lining. The fore end of the bolster should extend two
   feet or more before the lining".
   The curve is the bill's path about the ring at the cat-block, the distance the stow solves on. The lining runs from the
   bolster's top (the channel-wale's upper side, the highest wale under the uppermost tier's ports) to the channel's
   underside. Its breadth Steel does not give: it is drawn 1.25 palm breadths (CLASS), and where that would cover a port
   of the uppermost tier its edge stops 5 cm short of the port. The bolster's depth and its standing out are 9 in
   (CLASS); the bill-board is 1.25 palm breadths broad (CLASS). Returned: null, or { lining, bolster, board, ... }, each
   a list of rows of side points [x, y, zSkin] that sideSlabGeometry turns into a plank. */
function anchorLiningOf(S, H, f, st) {
  if (!st || !st.board) return null;
  const L = S.lwl, sgn = Math.sign(st.bill.z) || 1;
  const rows = tierPortRows(S), top = rows[rows.length - 1];
  const wale = sideBands(S).wales.filter(w => w.v0 + w.thick <= top.lo + 1e-6).sort((a, b) => b.v0 - a.v0)[0];
  if (!wale) return null;
  const u0 = st.board.u;
  const yBot = surfacePoint(S, H, u0, wale.v0 + wale.thick)[1], yTop = st.board.sheer;
  const R = st.ring.distanceTo(st.bill);
  const xm = y => st.ring.x + Math.sqrt(Math.max(0, R * R - (y - st.ring.y) ** 2));
  const W = f.palmB * 1.25;
  let xAft = xm(yTop) + W / 2, xForeMin = -1e9;
  const ST = tierPortStations(S)[rows.length - 1];
  const portX = [];
  if (ST) for (const p of ST.ports) {
    const x0 = surfacePoint(S, H, p.uLo, top.port)[0], x1 = surfacePoint(S, H, p.uHi, top.port)[0];
    portX.push([Math.min(x0, x1), Math.max(x0, x1)]);
  }
  const mid = xm((yBot + yTop) / 2);
  for (const [a, c] of portX) {
    if (a >= mid && a - 0.05 < xAft) xAft = a - 0.05;                  // a port abaft the middle: the after side stops short of it
    if (c <= mid && c + 0.05 > xForeMin) xForeMin = c + 0.05;          // a port afore it: the fore edge stops short of it
  }
  const skinAt = (x, y) => {
    let u = uAtXV(S, H, x, 0.95, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null) return null;
    const sh = surfacePoint(S, H, u, 1);
    if (y >= sh[1]) return [x, y, Math.abs(sh[2])];                     // above the sheer the island's shell stands straight up
    const v = vAtY(S, H, u, y);
    u = uAtXV(S, H, x, v, u) ?? u;
    const p = surfacePoint(S, H, u, vAtY(S, H, u, y));
    return [x, y, Math.abs(p[2])];
  };
  const grid = (yA, yB, foreOf, aftOf, nj, ni) => {
    const G = [];
    for (let j = 0; j <= nj; j++) { const y = yA + (yB - yA) * j / nj, x0 = foreOf(y), x1 = aftOf(y), row = [];
      for (let i = 0; i <= ni; i++) { const p = skinAt(x0 + (x1 - x0) * i / ni, y); if (!p) return null; row.push(p); }
      G.push(row); }
    return G;
  };
  const foreOf = y => Math.max(xForeMin, Math.min(xAft - 0.2, xm(y) - W / 2));
  const lining = grid(yBot, yTop, foreOf, () => xAft, 8, 4);
  const BOL = 0.2286;                                                    // 9 in (CLASS)
  const bolster = grid(yBot - BOL, yBot, () => foreOf(yBot) - 0.61, () => xAft, 1, 6);
  const board = grid(st.board.yLo, st.board.yHi, () => st.bill.x - W / 2, () => st.bill.x + W / 2, 4, 3);
  if (!lining || !bolster || !board) return null;
  return { sgn, lining, liningT: 0.0508, bolster, bolsterT: BOL, board, boardT: st.board.t,
           yBot: +yBot.toFixed(3), yTop: +yTop.toFixed(3), xAft: +xAft.toFixed(3), mid: +mid.toFixed(3), W: +W.toFixed(3), R: +R.toFixed(3),
           ports: portX.map(p => p.map(q => +q.toFixed(3))) };
}
/* a plank laid on the side: G[j][i] = [x, y, zSkin], drawn as a slab from the skin out to zSkin + T, both windings */
function sideSlabGeometry(G, T, sgn) {
  const pos = [];
  const P = (p, o) => [p[0], p[1], sgn * (p[2] + o)];
  const quad = (a, b, c, d) => { for (const t of [[a, b, c], [a, c, d], [a, c, b], [a, d, c]]) for (const p of t) pos.push(...p); };
  const nj = G.length - 1, ni = G[0].length - 1;
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++)
    quad(P(G[j][i], T), P(G[j][i + 1], T), P(G[j + 1][i + 1], T), P(G[j + 1][i], T));
  const rim = [];
  for (let i = 0; i <= ni; i++) rim.push(G[0][i]);
  for (let j = 1; j <= nj; j++) rim.push(G[j][ni]);
  for (let i = ni - 1; i >= 0; i--) rim.push(G[nj][i]);
  for (let j = nj - 1; j >= 0; j--) rim.push(G[j][0]);
  for (let k = 0; k + 1 < rim.length; k++) quad(P(rim[k], 0.004), P(rim[k + 1], 0.004), P(rim[k + 1], T), P(rim[k], T));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
