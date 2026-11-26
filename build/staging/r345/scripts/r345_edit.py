# r345: capstan stations from the record; gratings clear of a capstan's drum; the waist boat on
# skid beams over the rail where the waist lies between two islands.  usage: r345_edit.py <web dir>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / 'js' / 'hull.js'
s = p.read_text()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80])
    s = s.replace(a, b)

# 1. the station list, one function the gratings and the capstan both read
rep("function deckCovering(S) {", """/* ── WHERE A BAR CAPSTAN STANDS (round 345) ─────────────────────────────────────────────
   Until r345 every bar capstan stood at u 0.62, a station no record carried. A 74 worked two:
   the main capstan between the main and mizzen masts, and the jeer capstan in the waist between
   the fore and main, which Bellona's contemporary model shows with its bars shipped. The record
   now names each machine it draws: `capstan.stations: [{name, atU, drumDiaM?, bars?, what?}]`.
   A record with no stations draws one machine at `capstan.atU`, or at u 0.62, the class
   station, labelled as such in the record's provenance. */
function capstanStations(S) {
  const C = S.capstan;
  if (!C || C.form === 'spill') return [];
  const B = S.beam, clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const list = C.stations && C.stations.length ? C.stations : [{ atU: C.atU != null ? C.atU : 0.62 }];
  return list.map(st => ({
    name: st.name || null, what: st.what || null, u: st.atU,
    D: st.drumDiaM || C.drumDiaM || clampN(B * 0.11, 0.95, 1.55),
    bars: st.bars || C.bars || 6,
  }));
}

function deckCovering(S) {""")

# 2. gratings stand clear of every capstan's drum
rep("""  if (timberShip && laidDeck) [0.30, 0.50, 0.70].forEach(u => {
    const w = halfAtU(u) * 0.85;
    group.add(gratingAt(u, w, L * 0.055));
  });""", """  /* ⚠ A HATCH IS NOT UNDER A CAPSTAN (round 345). The three gratings stand at u 0.30, 0.50
     and 0.70 on every timber hull, and the capstan stood at u 0.62, so they never met. The 74's
     jeer capstan stands at u 0.30, on the forward grating. A capstan's barrel goes down through
     the deck to its step, so the hatch is cut beside it: a grating whose coaming would come
     within 0.3 m of a drumhead's rim moves along the deck, abaft the drum if it stood abaft or
     level with it, forward otherwise. Bellona's model shows a grating just abaft her jeer
     capstan. A hull whose gratings already stand clear draws them exactly where it did. */
  const capClear = capstanStations(S).map(c => ({ x: (c.u - 0.5) * L, r: c.D / 2 + 0.3 }));
  if (timberShip && laidDeck) [0.30, 0.50, 0.70].forEach(u0 => {
    const l = L * 0.055;
    let x = (u0 - 0.5) * L;
    for (const c of capClear)
      if (Math.abs(x - c.x) < l / 2 + c.r) x = c.x + (x >= c.x ? 1 : -1) * (l / 2 + c.r + 0.02);
    const u = 0.5 + x / L;
    const w = halfAtU(u) * 0.85;
    group.add(gratingAt(u, w, l));
  });""")

# 3. the bar capstan, once per station
rep("""  if (S.capstan && S.capstan.form !== 'spill') {
    const u = 0.62, y = deckAtU(u);
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
    const D = S.capstan.drumDiaM || clampN(B * 0.11, 0.95, 1.55);
    const H = clampN(0.86 * D, 1.15, 1.35);
    const headT = 0.30 * H, whelpH = H - headT;
    const nW = S.capstan.whelps || 6, nB = S.capstan.bars || 6;""",
"""  for (const ST of capstanStations(S)) {
    const u = ST.u, y = deckAtU(u);
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
    const D = ST.D;
    const H = clampN(0.86 * D, 1.15, 1.35);
    const headT = 0.30 * H, whelpH = H - headT;
    const nW = S.capstan.whelps || 6, nB = ST.bars;""")
rep("""    cg.position.x = (u - 0.5) * L;
    group.add(tag(cg, 'capstan'));
  }

  /* ── THE WINDLASS, FROM THE RECORD:""", """    cg.position.x = (u - 0.5) * L;
    cg.userData.capstanStation = { name: ST.name, u, drumDiaM: D, bars: nB, barTipM: D * 1.35 + D * 1.05, barY: barY - y };
    group.add(tag(cg, 'capstan', ST.name || undefined, ST.what || undefined));
  }

  /* ── THE WINDLASS, FROM THE RECORD:""")

# 4. the waist boat on skid beams over the rail, where the waist lies between two islands
rep("""    let u = 0.46;
    {
      const xOf = q => (q - 0.5) * L + H.rake(q), c = 0.9;""", """    let u = 0.46, boomed = false;
    {
      const xOf = q => (q - 0.5) * L + H.rake(q), c = 0.9;""")
rep("""      const islC = wLo > 0.20 || wHi < 0.80 ? 0.3 : 0;""", """      const islC = wLo > 0.20 || wHi < 0.80 ? 0.3 : 0;
      boomed = wLo > 0.20 && wHi < 0.80;""")
rep("""    const bm = new THREE.Mesh(buildHullGeometry(boatSpec, 40, 14), pale);
    bm.position.set((u - 0.5) * L, deckAtU(u) + bl * 0.060, 0);
    bm.userData.skidBoat = { u: +u.toFixed(4), lengthM: +bl.toFixed(3), moved: u !== 0.46 || bl !== L * 0.17 };
    group.add(tag(bm, 'boat'));
    for (const d of [-0.30, 0.30]) {                    // she sits on skids across the beams""",
"""    const bm = new THREE.Mesh(buildHullGeometry(boatSpec, 40, 14), pale);
    /* ── ON A SHIP WITH A FORECASTLE AND A QUARTERDECK THE BOAT RIDES OVER THE WAIST (r345).
       The waist of a two-decker is where her men work the jeer capstan, and the bars sweep it
       from side to side at breast height. Her boats were stowed over it, on skid beams laid
       across the waist at the height of the gangways, so the deck under them stayed clear. The
       model draws the two skid beams resting on the waist's rail cap from side to side, with the
       boat's keel on them. Gangways and booms are not drawn. A hull with no island at one end
       of its waist keeps its boat on skids on the deck. */
    let seatY = deckAtU(u) + bl * 0.060, beamY = 0, beamH = 0;
    if (boomed) {
      bm.geometry.computeBoundingBox();
      beamH = Math.max(0.22, B * 0.018);
      beamY = Math.max(railAtU(u - 0.30 * bl / L), railAtU(u + 0.30 * bl / L)) + capH;
      seatY = beamY + beamH - bm.geometry.boundingBox.min.y;
    }
    bm.position.set((u - 0.5) * L, seatY, 0);
    bm.userData.skidBoat = { u: +u.toFixed(4), lengthM: +bl.toFixed(3), moved: u !== 0.46 || bl !== L * 0.17, overWaist: boomed };
    group.add(tag(bm, 'boat'));
    if (boomed) for (const d of [-0.30, 0.30]) {        // two skid beams, rail cap to rail cap
      const uq = u + d * bl / L, half = railHalfAtU(uq);
      const sk = new THREE.Mesh(new THREE.BoxGeometry(B * 0.030 * 1.4, beamH, 2 * half), wood);
      sk.position.set((u - 0.5) * L + d * bl, beamY + beamH / 2, 0);
      group.add(tag(sk, 'boat', 'Skid beam',
        'A beam laid across the waist from one rail to the other. The ship\\'s boat rides on two of them, over the deck where the jeer capstan is worked.'));
    }
    else for (const d of [-0.30, 0.30]) {               // she sits on skids across the beams""")
p.write_text(s)
print('ok', p)

# 5. a timber island's end that faces the waist is open below its deck
s = p.read_text()
rep("""    /* the end bulkheads, from the main deck up to the sheer where the wall above begins: only
       at an end that faces a well */
    for (const ue of [...(closedFwd ? [] : [u0]), ...(closedAft ? [] : [u1])]) {""",
"""    /* the end bulkheads, from the main deck up to the sheer where the wall above begins: only
       at an end that faces a well.
       ⚠ NOT ON A TIMBER SHIP'S WAIST (round 345). A steel ship's well deck looks at a closed
       front, and Preussen's plates draw one. On a two-decker of the 1760s the space under the
       quarterdeck (the half deck) and under the forecastle (the galley's) opened on the waist:
       the breastwork and the breast rail stand on the deck's edge, and nothing closes the
       space below. Bellona's model shows the jeer capstan's bars reaching in under the
       forecastle's edge, which a bulkhead there would not allow. So a timber island draws no
       bulkhead below its end; its deck's edge is the edge the waist sees. */
    for (const ue of (timberWall ? [] : [...(closedFwd ? [] : [u0]), ...(closedAft ? [] : [u1])])) {""")
p.write_text(s)
print('ok 5')
