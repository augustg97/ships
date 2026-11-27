import sys, re
W = sys.argv[1]
p = W + '/js/hull.js'
s = open(p).read()
def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:80])
    s = s.replace(old, new)

# 1. the record's storeys, read once at the top of buildStern
rep("""  const glass = new THREE.MeshStandardMaterial({
    color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });

  /* ── STERN LIGHTS — rows of glazed cabin windows across the face ─────────────────────""",
"""  const glass = new THREE.MeshStandardMaterial({
    color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
  const QG = quarterGallerySpec(S, H);

  /* ── STERN LIGHTS — rows of glazed cabin windows across the face ─────────────────────""")

# 2. tier heights from the record's storeys
rep("""  for (let r = 0; r < rows; r++)
    rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));""",
"""  /* r357: a hull whose galleries are recorded (hull.quarterGallery) glazes its stern at the gallery's own storeys,
     because the lights across the stern and the lights round the quarter are the same cabins. Until r357 the 74's tiers
     stood at 0.42 and 0.72 of the sheer (y 2.65 and 4.54), between the two counters Steel puts under them. */
  if (QG && QG.storeys.length === rows) for (const st of QG.storeys) rowZ.push(st.lightY);
  else for (let r = 0; r < rows; r++)
    rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));""")

# 3. mouldings: with a record, the rims and the counter rails stand at the record's heights
rep("""    for (const zm of [zc - wh * 0.80, zc + wh * 0.80]) {
      const w2 = halfAt(zm) * 0.94;""",
"""    for (const zm of (QG ? [] : [zc - wh * 0.80, zc + wh * 0.80])) {
      const w2 = halfAt(zm) * 0.94;""")
rep("""  /* ── THE TAFFRAIL — the crown rail across the top of the stern ───────────────────────""",
"""  /* r357: with the galleries recorded, the stern's horizontal lines are the record's: each storey's rim carried across
     the face (the line the gallery's rim continues round the quarter) and the two counter rails (Steel, Folio LI) */
  if (QG) for (const zm of [QG.lowerCounterY, QG.upperCounterY, ...QG.storeys.map(st => st.floorY)]) {
    const w2 = halfAt(zm) * 0.94;
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.008, B * 0.008, w2 * 2, 6), mats.woodDark);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(faceX(zm) + B * 0.004, zm, 0);
    rail.userData.sternRecord = QG.read;
    g.add(tag(rail, 'transom'));
  }

  /* ── THE TAFFRAIL — the crown rail across the top of the stern ───────────────────────""")

# 4. the gallery: the record's bay, else the class drum
rep("""  if (S.gunDecks) {
    const zG0 = fb * 0.30, zG1 = fb * (rows >= 2 ? 0.88 : 0.62);""",
"""  if (QG) buildQuarterGalleryBay(S, H, QG, g, mats, glass);
  else if (S.gunDecks) {
    const zG0 = fb * 0.30, zG1 = fb * (rows >= 2 ? 0.88 : 0.62);""")

# 5. the spec and the bay builder, before buildStern
rep("""function buildStern(S, group, mats) {""",
r"""/* ── THE QUARTER GALLERY AS RECORDED (round 357) ──────────────────────────────────────────
   A two-decker's quarter gallery is a bay built out on the side at each after quarter, the officers' quarters carried
   round the corner of the stern: two storeys of lights, each storey's rim running some metres forward along the side,
   a carved drop (the lower finial) hanging under the lower storey and a roof over the upper. Until r357 the model drew
   a quarter drum about the corner line, 0.76 m in radius on the 74, which no plate or table supports.

   hull.quarterGallery records Steel's Folio LI (1805; 1822 edition) in feet over the upper side of the rabbet of the
   keel: the touch of the lower and of the upper counter at the middle line, the upper part of the lower balcony's
   breastrail and its height over the plank of the deck, the upper part of the taffrail; and for each storey the length
   of its rim forward from the aft part of the side counter timber and the length (on the rake) and breadth (on the
   square) of its lights. The heights are registered on the model by ONE anchor, the taffrail's top, which is the
   island's top at the stern; the record names it (registerOn). The balcony's deck then lands within a few centimetres
   of the model's upper deck at the stern, which is the check that the registration is sound (userData records both).
   The lower storey stands on that deck, the upper on the island's deck (the quarterdeck). What the table does not give
   is labelled in the record and in userData as the class's: the bay's projection off the side, the pier between
   lights, and the roof reaching no higher than the taffrail's top. */
function quarterGallerySpec(S, H) {
  const R = S.quarterGallery;
  if (!R || !R.heightsFt || !R.storeys || !R.storeys.length) return null;
  const FT = 0.3048, ft = v => (Array.isArray(v) ? v[0] + v[1] / 12 : v);
  const hf = R.heightsFt;
  const islT = H.islandTop(1), anchorY = islT !== null ? islT : H.sheer(1);
  const Y = h => anchorY - (ft(hf.taffrailTop) - ft(h)) * FT;     // feet over the rabbet → model y
  const balconyDeckY = Y(ft(hf.lowerBreastrail) - ft(hf.breastrailOverDeck));
  const qdY = H.islandDeck(1);
  const P = R.projectionM || 0.76;
  const storeys = R.storeys.map((st, i) => {
    const floorY = i === 0 ? balconyDeckY : (qdY !== null ? qdY : balconyDeckY + 2.0);
    const lightH = ft(st.lightsFt[0]) * FT, lightW = ft(st.lightsFt[1]) * FT;
    return { name: st.name, floorY, rimM: ft(st.rimFt) * FT, lightH, lightW };
  });
  /* each storey runs from its floor to the next storey's floor; the top storey to the roof's foot, 0.25 m under the
     anchor. A light's sill stands SILL_M over its floor (the class's) unless the storey is too low for it, when the
     light stands 0.12 m under the storey's top and the sill is what is left (read.storeys[].sillM says which) */
  const SILL_M = 0.45;
  for (let i = 0; i < storeys.length; i++) {
    const st = storeys[i];
    st.topY = i + 1 < storeys.length ? storeys[i + 1].floorY : anchorY - 0.25;
    st.sillM = Math.min(SILL_M, st.topY - 0.12 - st.lightH - st.floorY);
    st.lightY = st.floorY + st.sillM + st.lightH / 2;
  }
  const read = {
    source: R.provenance ? R.provenance.split('.')[0] : 'record',
    anchor: 'taffrail top = ' + (islT !== null ? 'the island top at u 1' : 'the sheer at u 1') + ', y ' + anchorY.toFixed(2),
    balconyDeckY: +balconyDeckY.toFixed(3), modelDeckY: +H.deck(1).toFixed(3),
    lowerCounterY: +Y(hf.lowerCounter).toFixed(3), upperCounterY: +Y(hf.upperCounter).toFixed(3),
    projectionM: P, projectionFrom: R.projectionFrom || 'class',
    storeys: storeys.map(st => ({ name: st.name, floorY: +st.floorY.toFixed(3), topY: +st.topY.toFixed(3),
      rimM: +st.rimM.toFixed(3), lightH: +st.lightH.toFixed(3), lightW: +st.lightW.toFixed(3), lightY: +st.lightY.toFixed(3),
      sillM: +st.sillM.toFixed(3) }))
  };
  return { P, storeys, anchorY, lowerCounterY: Y(hf.lowerCounter), upperCounterY: Y(hf.upperCounter),
           pierM: R.pierM || 0.25, read };
}

function buildQuarterGalleryBay(S, H, QG, g, mats, glass) {
  const L = S.lwl;
  const xAt = u => (u - 0.5) * L + H.rake(u);
  /* the shell at station u and height y, as [x, half-breadth]: the loft below the sheer, the island's wall (stood on
     the sheer's line, buildIslands) above it */
  const sideAt = (u, y) => {
    if (y >= H.sheer(u)) { const p = surfacePoint(S, H, u, 1.0); return [p[0], Math.abs(p[2])]; }
    let a = 0, b = 1;
    for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (surfacePoint(S, H, u, m)[1] < y) a = m; else b = m; }
    const p = surfacePoint(S, H, u, (a + b) / 2); return [p[0], Math.abs(p[2])];
  };
  /* the side's plan line at height y, as arc length forward from the corner (u = 1) */
  const memo = new Map();
  const lineAt = y => {
    const k = y.toFixed(3); if (memo.has(k)) return memo.get(k);
    const pts = []; let acc = 0, prev = null;
    for (let i = 0; i <= 160; i++) {
      const u = 1 - i * 0.0009375;                      // to u 0.85
      const q = sideAt(u, y);
      if (prev) acc += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      pts.push({ s: acc, x: q[0], z: q[1] }); prev = q;
    }
    memo.set(k, pts); return pts;
  };
  const at = (y, s) => {                                // [x, z, tx, tz]: the side's point and plan tangent (forward)
    const pts = lineAt(y);
    let i = 1; while (i < pts.length - 1 && pts[i].s < s) i++;
    const a = pts[i - 1], b = pts[i], t = Math.max(0, Math.min(1, (s - a.s) / Math.max(1e-9, b.s - a.s)));
    const dl = Math.max(1e-9, b.s - a.s);
    return [a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, (b.x - a.x) / dl, (b.z - a.z) / dl];
  };
  const { P, storeys } = QG;
  /* the offset along the rim: full over the bay, easing back onto the side over its forward end */
  const off = (s, Lr) => { const f = Math.min(0.6, 0.3 * Lr), s0 = Lr - f;
    return s <= s0 ? 1 : 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (s - s0) / f))); };
  const NS = 16;
  /* one storey's (or the finial's) lofted shell: rows [{y, Lr, d}], an aft cheek at s = 0 and the fore end on the side.
     The bay stands out square from the side along the plan normal; the cheek runs straight outboard from the corner,
     in the stern's own transverse plane. Caps close the rows named in `caps`. */
  const loft = (rows, caps, mat) => {
    const pos = [], idx = [], nC = NS + 2;
    const vtx = (y, s, d, sgn, cheek) => {
      const [x, z, tx, tz] = at(y, s);
      /* outboard normal in plan: the tangent turned 90°, pointing away from the centreline */
      let nx = -tz, nz = tx; if (nz < 0) { nx = -nx; nz = -nz; }
      return cheek ? [x, y, sgn * (z + d)] : [x + nx * d, y, sgn * (z + nz * d)];
    };
    for (const sgn of [-1, 1]) {
      const base = pos.length / 3;
      for (const r of rows) {
        pos.push(...vtx(r.y, 0, 0, sgn, true));
        for (let c = 0; c <= NS; c++) {
          const s = (c / NS) * r.Lr, d = r.d * off(s, r.Lr);
          pos.push(...vtx(r.y, s, d, sgn, c === 0));
        }
      }
      for (let j = 0; j + 1 < rows.length; j++)
        for (let c = 0; c + 1 < nC; c++) {
          const a = base + j * nC + c, b = a + nC;
          if (sgn > 0) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      for (const j of caps) {                        // a cap: each column's outer point to the side, at the row's y
        const r = rows[j], cb = pos.length / 3;
        for (let c = 0; c <= NS; c++) { const s = (c / NS) * r.Lr; pos.push(...vtx(r.y, s, 0, sgn, true)); }
        for (let c = 0; c < NS; c++) {
          const o0 = base + j * nC + 1 + c, o1 = o0 + 1, i0 = cb + c, i1 = i0 + 1;
          idx.push(o0, i0, o1, o1, i0, i1);
        }
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setIndex(idx); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, mat);
    m.userData.quarterGallery = QG.read;
    return m;
  };
  const body = new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: 0.68, side: THREE.DoubleSide });
  const S0 = storeys[0];
  /* the lower finial: a drop from the lower storey's floor down to the upper counter, shortening and drawing in */
  const yF = Math.min(QG.upperCounterY, S0.floorY - 0.4), fin = [];
  for (let j = 0; j <= 6; j++) {
    const t = j / 6, y = yF + (S0.floorY - yF) * t;
    fin.push({ y, Lr: S0.rimM * (0.25 + 0.75 * Math.sqrt(t)), d: P * Math.pow(t, 0.7) });
  }
  const shells = [];
  storeys.forEach((st, i) => {
    const rows = i === 0 ? fin.slice(0, -1) : [];
    rows.push({ y: st.floorY, Lr: st.rimM, d: P }, { y: st.topY, Lr: st.rimM, d: P });
    const caps = [rows.length - 1];
    if (i === storeys.length - 1) {                    // the roof, drawing in to the wall by the taffrail's top
      const yR = Math.max(st.topY + 0.1, QG.anchorY);
      rows.pop(); caps.length = 0;
      rows.push({ y: st.topY, Lr: st.rimM, d: P });
      for (let j = 1; j <= 4; j++) { const t = j / 4;
        rows.push({ y: st.topY + (yR - st.topY) * t, Lr: st.rimM * (1 - 0.35 * t), d: P * Math.cos(t * Math.PI / 2) }); }
    }
    shells.push({ rows, caps, storey: st.name });
  });
  for (const sh of shells) g.add(tag(loft(sh.rows, sh.caps, body), 'gallery'));
  /* each storey's rim (and the upper storey's cornice): a moulding proud of the bay, its section swept along the rim */
  const rims = storeys.map(st => ({ y: st.floorY, Lr: st.rimM }));
  const top = storeys[storeys.length - 1]; rims.push({ y: top.topY, Lr: top.rimM });
  for (const r of rims) {
    const hR = 0.07, rows = [{ y: r.y - hR, Lr: r.Lr, d: P + 0.06 }, { y: r.y + hR, Lr: r.Lr, d: P + 0.06 }];
    g.add(tag(loft(rows, [0, 1], mats.woodDark), 'gallery'));
  }
  /* the lights, Steel's sizes, as many as the rim holds at the class pier, centred on the bay's flat run; each a
     glass sheet in a sash of the stern lights' own pane grid */
  const [plC, plR] = S.sternLightPanes || [3, 3];
  const UP = new THREE.Vector3(0, 1, 0);
  for (const st of storeys) {
    const f = Math.min(0.6, 0.3 * st.rimM), run = st.rimM - f - 0.15;
    const N = Math.max(1, Math.floor((run + QG.pierM) / (st.lightW + QG.pierM)));
    const pitch = st.lightW + QG.pierM, s0 = 0.15 + (run - N * pitch + QG.pierM) / 2 + st.lightW / 2;
    for (const sgn of [-1, 1]) for (let k = 0; k < N; k++) {
      const s = s0 + k * pitch, [x, z, tx, tz] = at(st.lightY, s);
      let nx = -tz, nz = tx; if (nz < 0) { nx = -nx; nz = -nz; }
      const lg = new THREE.Group();
      lg.position.set(x + nx * P, st.lightY, sgn * (z + nz * P));
      lg.rotation.y = -Math.atan2(sgn * nz, nx);      // the group's +x points out of the bay
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.02, st.lightH, st.lightW), glass);
      sheet.position.x = 0.005; lg.add(tag(sheet, 'gallery'));
      const bw = 0.05, bt = 0.05;
      for (let c = 0; c <= plC; c++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(bt, st.lightH + bw, bw), mats.woodPale);
        bar.position.set(0.02, 0, -st.lightW / 2 + (c / plC) * st.lightW); lg.add(tag(bar, 'gallery'));
      }
      for (let r = 0; r <= plR; r++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(bt, bw, st.lightW + bw), mats.woodPale);
        bar.position.set(0.02, -st.lightH / 2 + (r / plR) * st.lightH, 0); lg.add(tag(bar, 'gallery'));
      }
      lg.userData.galleryLight = { storey: st.name, s: +s.toFixed(3), w: +st.lightW.toFixed(3), h: +st.lightH.toFixed(3) };
      g.add(lg);
    }
  }
}

function buildStern(S, group, mats) {""")
open(p, 'w').write(s)
print('ok')
