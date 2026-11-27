/* ── THE BOWER ANCHOR, CATTED ──────────────────────────────────────────────────────────
 * Hung at the cathead on the bow, which is where it lived at sea: too heavy to bring inboard
 * and too dangerous to tow. A 74's best bower is about 3.7 tonnes, and the whole apparatus of
 * the ship's bow — cathead, fish davit, capstan, the 24-inch cable that will not fit round the
 * capstan and has to be nipped to a messenger — exists to move it.
 *
 * The Admiralty pattern is the shape everyone recognises and the reason is mechanical: the STOCK
 * is set at right angles to the ARMS, so when the anchor lands on its side the stock rolls it
 * until one fluke bites. Without a stock it lies flat and drags, which is why the stock is the
 * part that had to be invented.
 *
 * ⚠ THE ARMS RISE FROM THE CROWN TOWARD THE RING (round 366). Falconer (1769, ANCHOR, pl. I fig. 2):
 * at the lower end of the shank are two arms "of equal thickness with the beam ... only that they
 * taper towards the points, which are ... inclined to the shank at an angle of sixty degrees"; "on
 * the upper part of each arm (in this position) is a fluke, or thick plate of iron, commonly shaped
 * like an isosceles triangle, whose base reaches inwards to the middle of the arm"; the stock "a long
 * beam of oak ... in two parts, strongly bolted, and hooped together with iron rings", fixed across
 * the shank's upper end "transversely with the flukes", and "close above the stock is the ring".
 * Until r366 each arm left the shank 0.21 shank-lengths above its end and ran DOWN and out, 97° from
 * the shank's line to the ring, so the two arms drew one straight bar across the shank's foot with a
 * cone at each end: from the beam the bower read as a crossbow. The stock was iron.
 * The angle, the arms' taper, the flukes' shape and the stock's timber are Falconer's. The lengths
 * are class figures read from no plate: the arm, crown to bill, a third of the shank; the stock as
 * long as the shank; the palm's breadth 0.13 of it. */
function anchorFormOf(S) {
  const L = S.lwl;
  /* ⚠ AN ANCHOR DOES NOT SCALE WITH THE SHIP. ~1/8 of the hull is right for the wooden
     sizes the rule was calibrated on — a 74's best bower shank runs about 5.5 m on a 53 m
     hull — but iron hulls kept growing and forged anchors did not: Titanic's centre anchor,
     the largest ever hand-forged, is 5.7 m OVER ALL on 269 m of ship. Linear scaling hung a
     10.6 m anchor on the 92 m steamer and a 17 m one on Preussen, laid across the whole
     forecastle. So the shank grows with the hull up to the size a forge can make, then
     nearly stops. */
  const s = Math.min(L, 48) * 0.115 + Math.max(0, L - 48) * 0.004;
  const f = { s, a: s / 3, armDeg: 60, rCrown: s * 0.021, rEye: s * 0.014, rBill: s * 0.010,
              palmB: s * 0.13, palmT: s * 0.009, stockL: s, stockMid: s * 0.062, stockEnd: s * 0.032,
              ringR: s * 0.075, ringT: s * 0.011 };
  const k = f.armDeg * Math.PI / 180;
  f.sin = Math.sin(k); f.cos = Math.cos(k);
  f.ringY = s + f.ringR;                                    // the ring's centre, over the shank's eye
  /* ring to bill, and the angle at the ring between the shank and the bill: the stow solves on these */
  f.rBillDist = Math.hypot(f.a * f.sin, f.ringY - f.a * f.cos);
  f.phi = Math.atan2(f.a * f.sin, f.ringY - f.a * f.cos);
  return f;
}
/* the anchor in its own frame: the crown at the origin, the shank up +Y to the ring, the arms in the XY
   plane (the +X arm first), the stock and the palms' breadth along Z. Each mesh carries userData.ap. */
function anchorMeshOf(f, iron, oak) {
  const A = new THREE.Group();
  const put = (m, ap) => { m.userData.ap = ap; A.add(m); return m; };
  const sh = put(new THREE.Mesh(new THREE.CylinderGeometry(f.rEye, f.rCrown, f.s, 12), iron), 'shank');
  sh.position.y = f.s / 2;
  put(new THREE.Mesh(new THREE.SphereGeometry(f.rCrown * 1.15, 12, 8), iron), 'crown');
  for (const k of [1, -1]) {
    const dx = k * f.sin, dy = f.cos;
    const arm = put(new THREE.Mesh(new THREE.CylinderGeometry(f.rBill, f.rCrown, f.a, 12), iron), 'arm');
    arm.rotation.z = -k * f.armDeg * Math.PI / 180;           // +Y onto (k·sin60, cos60)
    arm.position.set(dx * f.a / 2, dy * f.a / 2, 0);
    /* the palm: an isosceles triangle, apex at the bill, base across the arm at its middle, on the
       arm's upper face (the side toward the ring), its breadth athwart the arms' plane */
    const nx = -k * f.cos, ny = f.sin;                         // the arm's inner normal, toward the shank
    const off = f.rCrown * 0.75;
    const P = (t, n, z) => [dx * t + nx * n, dy * t + ny * n, z];
    const tri = [P(f.a, off * 0.6, 0), P(f.a * 0.5, off, f.palmB / 2), P(f.a * 0.5, off, -f.palmB / 2)];
    const top = tri.map(p => [p[0] + nx * f.palmT, p[1] + ny * f.palmT, p[2]]);
    const pos = [];
    const face = (a, b, c) => pos.push(...a, ...b, ...c, ...a, ...c, ...b);   // both windings: a thin plate seen from either face
    face(tri[0], tri[2], tri[1]); face(top[0], top[1], top[2]);
    for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; face(tri[i], tri[j], top[j]); face(tri[i], top[j], top[i]); }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pg.computeVertexNormals();
    put(new THREE.Mesh(pg, iron), 'palm');
  }
  /* the stock: oak, square, swelling to the middle, in two halves hooped with iron */
  const ys = f.s - f.stockMid * 0.9;
  for (const k of [1, -1]) {
    const half = put(new THREE.Mesh(new THREE.CylinderGeometry(f.stockEnd * Math.SQRT1_2, f.stockMid * Math.SQRT1_2, f.stockL / 2, 4), oak), 'stock');
    half.rotation.x = k * Math.PI / 2;                         // along ±Z
    half.rotation.y = Math.PI / 4;
    half.position.set(0, ys, k * f.stockL / 4);
    for (const t of [0.18, 0.40]) {
      const hoop = put(new THREE.Mesh(new THREE.BoxGeometry(f.stockMid * 1.5, f.stockMid * 1.5, f.s * 0.012), iron), 'hoop');
      hoop.position.set(0, ys, k * f.stockL * t);
    }
  }
  const ring = put(new THREE.Mesh(new THREE.TorusGeometry(f.ringR, f.ringT, 6, 16), iron), 'ring');
  ring.position.y = f.ringY;
  return A;
}

/* ── THE FISHED STOW IS SOLVED FROM THE CATHEAD AND THE FORE CHANNEL (round 366). Steel (1822, Book II,
 * "sheer draught", djvu text line 15775): "let us see that the fore channel is long enough to take the
 * anchor-lining and bill-board for stowing the anchor, thus: get the length of the anchor to the bill, and
 * allow for the cat-block; then sweep the distance so obtained from the cat-head aft, and the curve that
 * the bill of the anchor is supposed to make will give the middle of the lining". His glossary: the
 * anchor-lining is "short pieces of plank ... fastened to the sides of the ship, or to stantions under the
 * fore channel, to prevent the bill of the anchor from wounding the ship's side". So the bill lies on the
 * side under the fore channel, at the ring-to-bill distance from the ring hung a cat-block under the
 * cathead. HEAD's stow ran the shank to a class station, 0.105 + 1.05 shank/L, and on the 74 (after r364
 * moved her cathead forward and r365 laid Steel's channel) its upper arm stood 1.5 m over the channel,
 * 0.82 m outboard of a fore shroud. The bill now rests under the channel's underside at the side (the
 * sheer, where the channel is recorded; a class channel's own underside where one covers the station);
 * the arms' plane lies along the side (round 99), the palms clear of it. */
function anchorStowOf(S, H, f, cat) {
  const L = S.lwl, B = S.beam;
  const ring = new THREE.Vector3(cat.x, cat.y - B * 0.035, cat.z);
  const fm = (S.masts || []).filter(m => m.shrouds).sort((p, q) => p.at - q.at)[0];
  let FC = null; try { const F = fm ? shroudFeet(S, H, fm, true) : null; FC = F && F.chan ? F.chan : null; } catch (e) { FC = null; }
  const gap = f.rBill + 0.04;
  const billAt = x => {
    const u = uAtXV(S, H, x, 1, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null) return null;
    const p = surfacePoint(S, H, u, 1), q = surfacePoint(S, H, u, 0.9);
    let y = p[1];
    let under = 'sheer';
    if (FC && FC.rec && x >= FC.x0 && x <= FC.x1) under = 'recorded channel';
    if (FC && !FC.rec && x >= FC.x - FC.len / 2 && x <= FC.x + FC.len / 2 && FC.y - FC.d / 2 < y) { y = FC.y - FC.d / 2; under = 'class channel'; }
    const z = Math.max(Math.abs(p[2]), Math.abs(q[2])) + f.palmB / 2 + 0.03;
    return { u, v: new THREE.Vector3(x, y - gap, z * Math.sign(cat.z || 1)), under };
  };
  const fx = x => { const b = billAt(x); return b ? b.v.distanceTo(ring) - f.rBillDist : NaN; };
  let lo = ring.x, hi = ring.x + f.rBillDist + 1;
  if (!(fx(lo) < 0) || !(fx(hi) > 0)) return null;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fx(m) < 0) lo = m; else hi = m; }
  const b = billAt((lo + hi) / 2);
  const bill = b.v, e1 = bill.clone().sub(ring).normalize();
  /* the side's outward normal at the bill */
  const sgn = Math.sign(cat.z || 1);
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
  const half = (x, y) => {
    const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null || surfacePoint(S, H, u, 1)[1] < y) return 0;
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
    const worst = Math.min(...ends.map(clear), clear(crown) - f.rCrown, clear(crown.clone().addScaledVector(xA, -f.a * f.sin).addScaledVector(yA, f.a * f.cos)));
    const cand = { t: deg, crown, xA, yA, zA, worst };
    if (!pick || worst > pick.worst) pick = cand;
    if (worst > f.stockEnd + 0.03) { pick = cand; break; }
  }
  const { crown, xA, yA, zA } = pick;
  const inRun = FC ? (FC.rec ? bill.x >= FC.x0 && bill.x <= FC.x1 : Math.abs(bill.x - FC.x) <= FC.len / 2) : false;
  return { ring, crown, bill, xA, yA, zA, under: b.under, underChannel: inRun, tiltDeg: pick.t, stockClear: +pick.worst.toFixed(3),
           channel: FC ? (FC.rec ? [FC.x0, FC.x1] : [FC.x - FC.len / 2, FC.x + FC.len / 2]) : null };
}

function buildAnchor(S, group, mats) {
  if (!S.bowsprit) return;
  const iron = mats.iron || mats.woodDark, oak = mats.woodDark || iron;
  const H = hullSurface(S);
  const B = S.beam;
  const f = anchorFormOf(S);
  for (const sgn of [-1, 1]) {
    const A = anchorMeshOf(f, iron, oak);
    const cat = S.__catheads && S.__catheads[sgn > 0 ? 1 : 0];
    const st = cat ? anchorStowOf(S, H, f, cat) : null;
    if (st) {
      A.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(st.xA, st.yA, st.zA));
      A.position.copy(st.crown);
      A.userData.anchorStow = { ring: st.ring.toArray().map(q => +q.toFixed(3)), crown: st.crown.toArray().map(q => +q.toFixed(3)),
        bill: st.bill.toArray().map(q => +q.toFixed(3)), tiltDeg: st.tiltDeg, stockClear: st.stockClear, under: st.under, underChannel: st.underChannel, channel: st.channel,
        rule: 'Steel: the bill swept from the cathead at the anchor\'s length to the bill, onto the side under the fore channel' };
      const pend = ropeMesh([[new THREE.Vector3(cat.x, cat.y, cat.z), st.ring]], 0.018 + B * 0.0006, mats.ropeSolid || iron);
      if (pend) group.add(tag(pend, 'anchor', 'Cat pendant'));
      group.add(tag(A, 'anchor'));
      continue;
    }
    /* no cathead drawn (iron bows, the shell-built corbita): stowed against the bow, centred as before */
    const g = new THREE.Group();
    A.position.y = -f.ringY / 2;
    g.add(A);
    const p = surfacePoint(S, H, 0.09, 0.94);
    g.position.set(p[0], p[1] - f.s * 0.12, sgn * (p[2] + B * 0.05));
    g.rotation.x = sgn * 0.30;
    g.rotation.z = 0.42;
    group.add(tag(g, 'anchor'));
  }
}
