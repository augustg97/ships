# r372: the stowed bower's inner arm rests on the gunwale (Steel 1794, Lever 1808). Every replace asserted.
import sys
p = sys.argv[1]
s = open(p).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# 1. billAt: the gunwale rest where the top of the side stands under the ring
rep("""  const billAt = (x, lift) => {
    const u = uAtXV(S, H, x, 1, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null) return null;
    const p = surfacePoint(S, H, u, 1), q = surfacePoint(S, H, u, 0.9);
    let y = p[1] - gap;""",
"""  /* ⚠ THE INNER ARM RESTS ON THE GUNWALE (round 372). Steel (1794, vol. 2, "To cat and fish the anchor"): "the flukes of
     the anchor are raised and placed on the gunwale, where it is made fast: by the shank-painter chain". Lever (1808; 1827
     ed., p. 69): "When the Anchors are stowed, the inner Arms rest on the Gunnel." His fig. 366 draws the shank running
     aft along the side from the ring, the stock nearly upright beside the cathead. Until r372 the bill lay on the side a
     bill's breadth under the sheer and the arms' plane was turned from flat-on-the-side only as far as the stock needed,
     which stood the crown 1.3–1.9 m off the side on eight hulls (r371's shank-painter, 'offSide'). The bill now rests on
     the top of the side (the sheer, or an island's rail where one stands there), on its outer edge, wherever that top
     stands under the cathead's tip: the fish hoists the flukes "towards the top of the bow" (Falconer 1769, FISH), and
     in Lever's figure the cathead stands over the gunwale. Where the top stands above the cathead (the 74's forecastle
     rail is 1.1 m over her cathead's tip, because her cathead stands at her sheer) the side above the bill is Steel's
     bill-board, and r370's stow on the board stands. */
  const topOf = u => { const t = H.islandTop(u), sh = surfacePoint(S, H, u, 1)[1]; return t !== null && t > sh ? t : sh; };
  const billAt = (x, lift) => {
    const u = uAtXV(S, H, x, 1, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null) return null;
    const p = surfacePoint(S, H, u, 1), q = surfacePoint(S, H, u, 0.9);
    const top = topOf(u);
    if (top < cat.y)
      return { u, v: new THREE.Vector3(x, top + f.rBill + 0.02, sgn * (Math.abs(p[2]) - f.rBill - 0.04)), under: 'gunwale', board: false, gunwale: true, sheer: p[1], top };
    let y = p[1] - gap;""")

# 2. the tilt scan: on the gunwale, the whole turn about the ring-bill line, the crown nearest the side that clears
rep("""    const clear = q => Math.abs(q.z) - half(q.x, q.y);
    let pick = null;
    for (let deg = 90; deg >= 0; deg -= 5) {""",
"""    const clear = q => Math.abs(q.z) - half(q.x, q.y);
    let pick = null;
    /* ⚠ ON THE GUNWALE THE TURN IS SOLVED FOR THE CROWN, NOT THE STOCK (round 372). The shank-painter "hangs the shank
       and fluke of the anchor to the ship's side" (Steel 1794), so of every turn about the ring-to-bill line that clears
       the skin (the stock's ends, the crown, the outer arm, the palms, and the inner arm where it crosses the gunwale's
       outer edge) the one that brings the crown nearest the side is taken, the crown under the bill. */
    if (b.gunwale) {
      for (let deg = -180; deg < 180; deg += 2.5) {
        const t = deg * Math.PI / 180;
        const w = out.clone().multiplyScalar(Math.cos(t)).addScaledVector(down, Math.sin(t)).normalize();
        const sd = e1.clone().multiplyScalar(Math.cos(f.phi)).addScaledVector(w, Math.sin(f.phi)).normalize();
        const crown = ring.clone().addScaledVector(sd, f.ringY);
        if (crown.y > bill.y - f.rCrown) continue;
        const yA = sd.clone().negate();
        let zA = new THREE.Vector3().crossVectors(e1, w).normalize();
        zA.addScaledVector(yA, -zA.dot(yA)).normalize();
        let xA = new THREE.Vector3().crossVectors(yA, zA).normalize();
        if (bill.clone().sub(crown).dot(xA) < 0) { xA.negate(); zA.negate(); }
        const sc = crown.clone().addScaledVector(yA, f.s - f.stockMid * 0.9);
        const ends = [sc.clone().addScaledVector(zA, f.stockL / 2), sc.clone().addScaledVector(zA, -f.stockL / 2)];
        if (f.ironStock) ends.push(sc.clone().addScaledVector(zA, f.stockL / 2).addScaledVector(yA, f.legL));
        let worst = Math.min(...ends.map(clear)) - f.stockEnd - 0.03;
        /* the shank, both arms and both palms; the inner arm's last fifth lies on the gunwale */
        for (const [px, py, pz, r] of gsamples) worst = Math.min(worst, clear(crown.clone().addScaledVector(xA, px).addScaledVector(yA, py).addScaledVector(zA, pz)) - r);
        const off = clear(crown) - f.rCrown;
        const cand = { t: deg, crown, xA, yA, zA, worst: worst + f.stockEnd + 0.03, cg: 9, off, score: worst, ok: worst >= 0 };
        if (cand.ok && (!pick || !pick.ok || off < pick.off)) pick = cand;
        else if (!cand.ok && (!pick || (!pick.ok && cand.score > pick.score))) pick = cand;
      }
      return { b, bill, pick };
    }
    for (let deg = 90; deg >= 0; deg -= 5) {""")

# 3. the gunwale samples: shank, arms (radius tapering crown to bill), palms; the inner arm's last tenth excluded
rep("""  const solveAt = lift => {""",
"""  const gsamples = [];
  for (let i = 1; i <= 10; i++) gsamples.push([0, f.s * i / 10, 0, f.rCrown * 0.9]);
  for (const k of [1, -1]) {
    const dx = k * f.sin, dy = f.cos, nx = -k * f.cos, ny = f.sin, off = f.rCrown * 0.75;
    for (let i = 1; i <= (k > 0 ? 8 : 10); i++) gsamples.push([dx * f.a * i / 10, dy * f.a * i / 10, 0, f.rCrown + (f.rBill - f.rCrown) * i / 10]);
    /* the palm: a triangle from the arm's middle (its base, a palm's breadth across) to the bill (anchorMeshOf) */
    for (const [at, wf] of [[0.5, 1], [0.5, 0], [0.65, 0.7], [0.8, 0.4]]) for (const z of [1, -1]) gsamples.push([dx * f.a * at + nx * off, dy * f.a * at + ny * off, z * wf * f.palmB / 2, 0.03]);
  }
  const solveAt = lift => {""")

# 4. the record carries the gunwale and the crown's offset
rep("""  const res = { ring, crown, bill, xA, yA, zA, under: b.under, underChannel: inRun, tiltDeg: pick.t, stockClear: +pick.worst.toFixed(3),""",
"""  const res = { ring, crown, bill, xA, yA, zA, under: b.under, underChannel: inRun, tiltDeg: pick.t, stockClear: +pick.worst.toFixed(3),
                gunwale: b.gunwale ? { top: +b.top.toFixed(3), crownOff: +pick.off.toFixed(3), ok: pick.ok } : null,""")

# 5. buildAnchor's record and rule
rep("""        board: st.board || null,
        rule: st.board ?""", """        board: st.board || null, gunwale: st.gunwale || null,
        rule: st.gunwale ? 'Steel 1794 and Lever 1808: the inner arm rests on the gunwale, the ring at the cathead; the crown turned as near the side as the stock and arms clear'
            : st.board ?""")
# 6. the solver's skin reading: the sheer and an island's shell at the point's own station
rep("""    const half = (x, y) => {
      const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
      if (u === null) return 0;
      if (surfacePoint(S, H, u, 1)[1] < y) { const t = H.islandTop(u); return t !== null && y <= t ? Math.abs(surfacePoint(S, H, u, 1)[2]) : 0; }""",
"""    /* ⚠ THE SHEER AND AN ISLAND'S SHELL ARE READ AT THE POINT'S OWN STATION (round 372). Until r372 both were read at
       the u where the side crosses x at v 0.9, which at a raked stem stands up to 0.9 m forward of the point: Preussen's
       inner palm, resting on her forecastle head, read 2.78 m of shell where her side is 2.98 m out, and stood 0.15 m
       inside it. */
    const half = (x, y) => {
      const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
      if (u === null) return 0;
      const u1 = uAtXV(S, H, x, 1, u) ?? u;
      if (surfacePoint(S, H, u1, 1)[1] < y) { const t = H.islandTop(u1); return t !== null && y <= t ? Math.abs(surfacePoint(S, H, u1, 1)[2]) : 0; }""")
open(p, 'w').write(s)
print('ok')
s = open(p).read()
a = """                  + 'At sea the ring hangs from the cathead and the anchor is fished: the inner arm is '
                  + 'hauled up the side until its point can be laid on the bill-board, a board on the side '
                  + 'above the fore channel. Steel (1822) puts a lining of plank on the side under the '
                  + 'channel, where the point drags on the way up.' },"""
assert s.count(a) == 1
s = s.replace(a, """                  + 'At sea the ring hangs from the cathead and the anchor is fished: the inner arm is '
                  + 'hauled up the side until its fluke can be laid on the gunwale, the top of the side, '
                  + 'and a chain called the shank-painter holds it there (Steel, 1794; Lever, 1808). The '
                  + 'shank then runs aft along the side and the stock stands nearly upright beside the bow. '
                  + 'The outer arm points away from the ship, so the crown stands off the side by most of an '
                  + 'arm\\'s length. On the 74 the forecastle stands higher than the cathead, so the point is laid '
                  + 'instead on the bill-board, a board on the side above the fore channel. Steel (1822) puts '
                  + 'a lining of plank on the side under the channel, where the point drags on the way up.' },""")
open(p, 'w').write(s)
print('card ok')
