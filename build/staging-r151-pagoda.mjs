/* r151 staging sim — the pagoda becomes one tower, the r146 island law reaching the
 * battleship's bridge structure. The K stacked boxes (5 tower levels + bridge on
 * yamato, 3 + bridge on dreadnought) and the two proud glass boxes become ONE loft
 * on the same level stations: rounded-forward section (big front chamfers, small
 * back chamfers), vertical walls per level, a real shelf at every step, and the
 * top-two-level glazing bands as ROWS OF WINDOWS LET INTO THE FACE — glass set back
 * behind structural piers with jamb, sill and head, on the front face and both
 * sides, the r141/r142 pierced-wall law wrapped round the loft (r146 mechanism).
 * Pure node, no three.js: replicates the exact station/ring/row emit the hull.js
 * edit will use and checks form, fit, symmetry and the r151 audit property before
 * the app is touched.  Run: node build/staging-r151-pagoda.mjs */

let fails = 0, checks = 0;
const ok = (name, cond, detail) => {
  checks++;
  if (!cond) { fails++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ok ${name}`);
};

/* ── the loft, exactly as hull.js will emit it ────────────────────────────────────
 * Local frame: x fore-aft (+x AFT, front of the tower at −x), y absolute up,
 * z athwartships. Levels derived exactly as the box stack derived them. */
const PIER = 0.15, REV = 0.28, HEEL = 0.30;

function buildTower(B, towerH, dh) {
  const K = Math.max(2, Math.min(6, Math.round(towerH / (B * 0.11))));
  const tierTop0 = dh;                       // relative: base = 0, tier roof at dh
  const levels = [];
  let y = tierTop0;
  for (let k = 0; k < K; k++) {
    const f = k / Math.max(1, K - 1);
    const w = B * (0.34 - 0.20 * f), d = B * (0.40 - 0.22 * f);
    const lh = (towerH - tierTop0) / K;
    levels.push({ y0: y, lh, w, d });
    y += lh;
  }
  const sec = levels.map((lv, k) => {
    const a = lv.d / 2, b = lv.w / 2;
    const cf = b * 0.42, cb = b * 0.22;
    return {
      y0: lv.y0, y1: lv.y0 + lv.lh, a, b, cf, cb,
      xr: Math.min(a * 0.45, a - cf - PIER - 0.10, a - cb - PIER - 0.10),
      zr: Math.max(0.30, b - cf - PIER - 0.10),
      win: k >= K - 2
    };
  });
  const top = sec[K - 1];
  const NS = Math.max(2, Math.round(top.xr / 0.55));
  const NF = Math.max(2, Math.round(top.zr / 0.55));
  const sta = [];
  sec.forEach((v, k) => {
    sta.push({ v, y: k ? v.y0 : v.y0 - HEEL, d: 0 });
    if (v.win) {
      const lo = v.y0 + (v.y1 - v.y0) * 0.47, hi = v.y0 + (v.y1 - v.y0) * 0.77;
      sta.push({ v, y: lo, d: 0 }, { v, y: lo + 0.02, d: REV },
               { v, y: hi - 0.02, d: REV }, { v, y: hi, d: 0 });
    }
    sta.push({ v, y: v.y1, d: 0 });
  });
  const ring = (st) => {
    const v = st.v, a = v.a, b = v.b, cf = v.cf, cb = v.cb, d = st.d;
    const pts = [];
    const P = (x, z, w) => pts.push([x, z, !!w]);
    const runE = (r, n) => {
      const e = [];
      for (let j = 0; j <= n; j++) {
        const t = r - (j / n) * 2 * r;
        e.push([t + PIER, j > 0], [t + PIER, false],
               [t - PIER, false], [t - PIER, j < n]);
      }
      return e;
    };
    const sE = runE(v.xr, NS), fE = runE(v.zr, NF);
    P(a, -(b - cb)); P(a, -(b - cb));
    P(a, b - cb);    P(a, b - cb);
    P(a - cb, b);    P(a - cb, b);
    sE.forEach(([x, w]) => P(x, b - (w ? d : 0), w));
    P(-a + cf, b);   P(-a + cf, b);
    P(-a, b - cf);   P(-a, b - cf);
    fE.forEach(([z, w]) => P(-a + (w ? d : 0), z, w));
    P(-a, -(b - cf)); P(-a, -(b - cf));
    P(-a + cf, -b);   P(-a + cf, -b);
    sE.slice().reverse().forEach(([x, w]) => P(x, -(b - (w ? d : 0)), w));
    P(a - cb, -b);   P(a - cb, -b);
    return pts;
  };
  const pos = [], flag = [];
  const rings = sta.map(st => ring(st));
  const KP = rings[0].length;
  const addRing = (r, ya) => {
    const base = pos.length / 3;
    r.forEach(([x, z, w]) => { pos.push(x, ya, z); flag.push(w); });
    return base;
  };
  const bases = sta.map((st, i) => addRing(rings[i], st.y));
  const iWall = [], iGlass = [];
  const row = (A, Bq, glassRow) => {
    for (let k = 0; k < KP; k++) {
      const a2 = A + k, b2 = A + (k + 1) % KP;
      const pane = glassRow && flag[a2] && flag[b2];
      (pane ? iGlass : iWall).push(a2, Bq + k, b2, b2, Bq + k, Bq + (k + 1) % KP);
    }
  };
  const shared = s => sta[s].v === sta[s + 1].v && sta[s].d === sta[s + 1].d;
  for (let s = 0; s < sta.length - 1; s++)
    if (shared(s)) row(bases[s], bases[s + 1], sta[s].d > 0);
  for (let s = 0; s < sta.length - 1; s++)
    if (!shared(s))
      row(addRing(rings[s], sta[s].y), addRing(rings[s + 1], sta[s + 1].y), false);
  const R0 = addRing(rings[0], sta[0].y);
  const c0 = pos.length / 3; pos.push(0, sta[0].y, 0); flag.push(false);
  for (let k = 0; k < KP; k++) iWall.push(c0, R0 + k, R0 + (k + 1) % KP);
  const RT = addRing(rings[sta.length - 1], sta[sta.length - 1].y);
  const cT = pos.length / 3; pos.push(0, sta[sta.length - 1].y, 0); flag.push(false);
  for (let k = 0; k < KP; k++) iWall.push(cT, RT + (k + 1) % KP, RT + k);
  return { K, KP, levels, sec, sta, rings, pos, flag, iWall, iGlass, NS, NF };
}

/* ── geometry helpers ─────────────────────────────────────────────────────────────*/
const V = (pos, i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2],
                         u[0] * v[1] - u[1] * v[0]];
const len = v => Math.hypot(v[0], v[1], v[2]);
const triN = (pos, a, b, c) => cross(sub(V(pos, b), V(pos, a)), sub(V(pos, c), V(pos, a)));

function checkShip(name, B, towerH, dh, brkLevels) {
  console.log(`\n== ${name} (B ${B}, towerH ${towerH}) ==`);
  const T = buildTower(B, towerH, dh);
  const { K, KP, sec, sta, rings, pos, flag, iWall, iGlass } = T;

  ok(`${name}: every ring has the same point count`,
     rings.every(r => r.length === KP), `KP ${KP}`);
  ok(`${name}: no NaN in ${pos.length / 3} verts`, pos.every(Number.isFinite));

  /* the section is its own z-mirror — port wall = starboard wall, the r118 law for a
     centreline structure */
  const mirrored = rings.every(r => {
    const set = new Set(r.map(p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`));
    return r.every(p => set.has(`${p[0].toFixed(4)},${(-p[1]).toFixed(4)}`));
  });
  ok(`${name}: section is its own z-mirror`, mirrored);

  /* envelope: every station's ring inside its OWN level's old box; the heel the one
     allowed downward run, buried in the citadel roof */
  let out = 0;
  sta.forEach((st, i) => {
    const v = st.v;
    for (const [x, z] of rings[i].map(p => [p[0], p[1]]))
      if (Math.abs(x) > v.a + 1e-6 || Math.abs(z) > v.b + 1e-6) out++;
    if (st.y < v.y0 - HEEL - 1e-6 || st.y > v.y1 + 1e-6) out++;
  });
  ok(`${name}: 0 verts outside the old level boxes (heel ${HEEL} down allowed)`, out === 0,
     `${out} out`);

  /* windows: real openings, wide enough to read, glass truly recessed */
  const wsec = sec.filter(s => s.win);
  ok(`${name}: window levels are the top two`, wsec.length === 2 && sec[K - 1].win);
  for (const s of wsec) {
    const pitchS = 2 * s.xr / T.NS - 2 * PIER, pitchF = 2 * s.zr / T.NF - 2 * PIER;
    ok(`${name}: side panes ${pitchS.toFixed(2)} m, front ${pitchF.toFixed(2)} m wide`,
       pitchS > 0.30 && pitchF > 0.30);
  }
  let recessed = 0, glassTris = 0;
  for (let t = 0; t < iGlass.length; t += 3) {
    glassTris++;
    for (const i of [iGlass[t], iGlass[t + 1], iGlass[t + 2]]) {
      const st = sta.find(s2 => Math.abs(pos[3 * i + 1] - s2.y) < 1e-9 && s2.d > 0);
      if (!st) continue;
      const [x, z] = [pos[3 * i], pos[3 * i + 2]], v = st.v;
      const onFace = Math.abs(Math.abs(z) - v.b) < 1e-6 || Math.abs(x + v.a) < 1e-6;
      if (!onFace) recessed++;
    }
  }
  ok(`${name}: every glass vert sits behind its face (${glassTris} glass tris)`,
     glassTris > 0 && recessed === glassTris * 3,
     `${recessed} of ${glassTris * 3}`);

  /* windings, two parts. (a) A jamb faces tangentially and a sill faces down its own
     reveal, so a radial dot cannot judge them — instead prove the whole shell is
     CONSISTENTLY wound: merge verts by position, and every shared edge must be
     traversed once each way. (b) Then anchor the sense: every tri whose normal is
     clearly radial must point away from the axis. */
  const allIdx = [];
  for (let t = 0; t < iWall.length; t += 3)
    allIdx.push([iWall[t], iWall[t + 1], iWall[t + 2]]);
  for (let t = 0; t < iGlass.length; t += 3)
    allIdx.push([iGlass[t], iGlass[t + 1], iGlass[t + 2]]);
  const pk = i => `${pos[3 * i].toFixed(4)},${pos[3 * i + 1].toFixed(4)},${pos[3 * i + 2].toFixed(4)}`;
  const edges = new Map();
  let real = 0;
  for (const idx of allIdx) {
    if (len(triN(pos, idx[0], idx[1], idx[2])) < 1e-9) continue;  // paired-point degenerate
    real++;
    const k3 = idx.map(pk);
    for (let e = 0; e < 3; e++) {
      const a2 = k3[e], b2 = k3[(e + 1) % 3];
      if (a2 === b2) continue;                                    // collapsed pair edge
      const und = a2 < b2 ? `${a2}|${b2}` : `${b2}|${a2}`;
      const rec = edges.get(und) || { f: 0, r: 0 };
      if (a2 < b2) rec.f++; else rec.r++;
      edges.set(und, rec);
    }
  }
  let unbal = 0;
  for (const rec of edges.values()) if (rec.f !== rec.r) unbal++;
  ok(`${name}: shell consistently wound (${real} real tris, ${edges.size} edges paired)`,
     unbal === 0, `${unbal} unbalanced edges`);
  let bad = 0, radial = 0;
  for (const idx of allIdx) {
    const n = triN(pos, idx[0], idx[1], idx[2]);
    if (len(n) < 1e-9) continue;
    const c = [0, 1, 2].map(ax =>
      (pos[3 * idx[0] + ax] + pos[3 * idx[1] + ax] + pos[3 * idx[2] + ax]) / 3);
    const cr = Math.hypot(c[0], c[2]);
    if (cr < 1e-6) continue;
    const dot = (n[0] * c[0] + n[2] * c[2]) / (len(n) * cr);
    if (Math.abs(dot) < 0.5) continue;                 // jamb/sliver: judged by pairing above
    radial++;
    if (dot < 0) bad++;
  }
  ok(`${name}: all ${radial} clearly-radial tris point away from the axis`, bad === 0,
     `${bad} inward`);

  /* caps: crown up at the head, base down at the heel */
  const yTop = sta[sta.length - 1].y, yBot = sta[0].y;
  let capUp = 0, capDn = 0, capBadUp = 0, capBadDn = 0;
  for (let t = 0; t < iWall.length; t += 3) {
    const idx = [iWall[t], iWall[t + 1], iWall[t + 2]];
    const n = triN(pos, idx[0], idx[1], idx[2]);
    if (len(n) < 1e-9) continue;
    if (Math.abs(n[1]) / len(n) < 0.99) continue;
    const cy = (pos[3 * idx[0] + 1] + pos[3 * idx[1] + 1] + pos[3 * idx[2] + 1]) / 3;
    if (Math.abs(cy - yTop) < 1e-6) { capUp++; if (n[1] < 0) capBadUp++; }
    if (Math.abs(cy - yBot) < 1e-6) { capDn++; if (n[1] > 0) capBadDn++; }
  }
  /* the fan is KP tris but the paired points collapse half to zero area, by design */
  ok(`${name}: crown cap ${capUp} tris up, base cap ${capDn} tris down`,
     capUp >= KP / 3 && capDn >= KP / 3 && capBadUp === 0 && capBadDn === 0,
     `${capBadUp}/${capBadDn} misdirected`);

  /* shelves: at every level step the upper level is strictly smaller, so the step
     annulus is a real up-facing shelf */
  for (let k = 0; k + 1 < K; k++)
    ok(`${name}: level ${k + 2} steps in across a real shelf`,
       sec[k + 1].a < sec[k].a - 0.05 && sec[k + 1].b < sec[k].b - 0.05);

  /* the r149 bracket fit must survive: at the searchlight levels the side wall still
     runs flat at z = ±b past the bracket webs at x ±0.51, so the root buries 0.20 */
  if (brkLevels) for (const k of brkLevels) {
    const s = sec[k];
    ok(`${name}: level ${k + 1} side face spans the bracket webs`,
       -s.a + s.cf < -0.51 - 0.05 && s.a - s.cb > 0.51 + 0.05,
       `side run ${(-s.a + s.cf).toFixed(2)}..${(s.a - s.cb).toFixed(2)}`);
  }

  /* the r151 audit property: the principal mesh must run ≥0.6 of the superstructure's
     height. Old form: the tallest single mesh was one level box. */
  const assemblyLo = -0.4, assemblyHi = towerH + B * 0.036;
  const oldPrincipal = Math.max(dh + 0.4, sec[0].y1 - sec[0].y0);
  const newPrincipal = yTop - yBot;
  const H = assemblyHi - assemblyLo;
  ok(`${name}: old form convicted (${(oldPrincipal / H).toFixed(2)} of height)`,
     oldPrincipal / H < 0.6);
  ok(`${name}: loft passes (${(newPrincipal / H).toFixed(2)} of height, ` +
     `${(iWall.length + iGlass.length) / 3} tris)`,
     newPrincipal / H >= 0.6 && (iWall.length + iGlass.length) / 3 > 40);

  return T;
}

/* yamato: B 38.9, towerH 30, dh = B*0.080 = 3.112; searchlight brackets at levels
 * 2..5 (indices 1..4). dreadnought: B 25, towerH 12, dh = 2.0, no searchlights. */
const TY = checkShip('yamato', 38.9, 30.0, 38.9 * 0.080, [1, 2, 3, 4]);
const TD = checkShip('dreadnought', 25.0, 12.0, 25.0 * 0.080, null);
ok('yamato K = 6, dreadnought K = 4', TY.K === 6 && TD.K === 4,
   `${TY.K}/${TD.K}`);

console.log(`\n${checks - fails}/${checks} checks pass${fails ? ` — ${fails} FAIL` : ''}`);
process.exit(fails ? 1 : 0);
