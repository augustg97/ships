#!/usr/bin/env python3
"""r346: seat a class-station bar capstan at the nearest station where its drum and bars clear.
usage: r346_edit.py <web dir>"""
import sys, pathlib
W = pathlib.Path(sys.argv[1])
p = W / 'js' / 'hull.js'
s = p.read_text()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:80])
    s = s.replace(old, new)

# 1. the capstan build records whether its station is the class one, and its deck height
rep("""    cg.userData.capstanStation = { name: ST.name, u, drumDiaM: D, bars: nB, barTipM: D * 1.35 + D * 1.05, barY: barY - y };""",
    """    cg.userData.capstanStation = { name: ST.name, u, drumDiaM: D, bars: nB, barTipM: D * 1.35 + D * 1.05, barY: barY - y,
                                   classStation: !!ST.classStation };""")
rep("""  const list = C.stations && C.stations.length ? C.stations : [{ atU: C.atU != null ? C.atU : 0.62 }];
  return list.map(st => ({
    name: st.name || null, what: st.what || null, u: st.atU,""",
    """  const list = C.stations && C.stations.length ? C.stations
             : [{ atU: C.atU != null ? C.atU : 0.62, classStation: C.atU == null }];
  return list.map(st => ({
    name: st.name || null, what: st.what || null, u: st.atU, classStation: !!st.classStation,""")

# 2. the pass itself, before buildShip
FN = r"""/* ── A CLASS-STATION CAPSTAN STANDS WHERE ITS BARS CAN GO ROUND (round 346) ────────────────
   The men walk a capstan's bars round a full circle at breast height, so the deck round it has
   to be clear: nothing in the drum, nothing in the sweep of the bars. Where the record names
   no station the capstan stood at u 0.62 on every hull, and on five of them that put it in a
   part: the caravel's lateen sail, the galley's boat and oars, the galleass's boat, the clipper's
   deckhouse and Endurance's funnel. No plate has been read for any of those five.
   So the class station is now a search, made after every other part is built: starting at u
   0.62, the capstan is tried at stations 0.005 u apart along the centreline, alternately abaft
   and forward, out to u 0.20 and 0.85, and it is drawn at the first station where the test
   finds nothing. The test is the audit's A-CAPSTAN-CLEAR, run in hull space. The drum is the
   cylinder of the drumhead's own radius from the deck to the drumhead's top. The sweep is the
   disc out to the farthest bar vertex, between the bars' lowest and highest vertex, 0.05 m
   each way; a grating's coaming must stand 0.3 m clear of the drumhead's rim, the clearance r345
   cuts every hatch at. Every vertex of another part is tested, and every triangle is cut at the bars'
   height and at three heights up the drum. Rope is not tested; a rope is a line and is led
   clear. The deck, the shell and the rail under the foot are not tested either.
   ⚠ THE SAILS ARE TESTED SET, IN EVERY BUILD. A lateen's foot comes down to a man's height
   over the deck; a furled build carries the same sail rolled on its yard. If the furled build
   tested its rolls, the capstan would stand at another station when the sails were furled.
   So the sails tested are always the set sails, from a set rig built for the test and thrown
   away, and the capstan stands at one station in both builds.
   A record that names a station is never moved: there the audit convicts a conflict, because
   the read is the record's to correct. */
const CAP_CLEAR_SKIP = new Set(['capstan', 'deck', 'planking', 'frames', 'keel', 'waterway', 'wale', 'rail']);
const CAP_CLEAR_ROPE = /stay|shroud|sheet|brace|halyard|lift|tack|bowline|clew|bunt|fall|rope|coil|ratline|lanyard|jeer|tye|rigging|line|vang|pendant|tackle|guy/i;
function capPartOf(o) { let e = o; while (e && !(e.userData && e.userData.part)) e = e.parent; return e ? e.userData.part : null; }
/* every triangle of the parts the test reads, in hull space, as flat arrays */
function capObstacles(roots, inv, keep) {
  const out = [];
  const P = new THREE.Vector3(), M = new THREE.Matrix4();
  for (const root of roots) root.traverse(o => {
    if (!o.isMesh) return;
    const pt = capPartOf(o);
    if (!pt || !keep(pt, o)) return;
    M.multiplyMatrices(inv, o.matrixWorld);
    const A = o.geometry.attributes.position, I = o.geometry.index;
    const W = new Float32Array(A.count * 3);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zA = 1e9;
    for (let i = 0; i < A.count; i++) {
      P.fromBufferAttribute(A, i).applyMatrix4(M);
      W[3 * i] = P.x; W[3 * i + 1] = P.y; W[3 * i + 2] = P.z;
      x0 = Math.min(x0, P.x); x1 = Math.max(x1, P.x); y0 = Math.min(y0, P.y); y1 = Math.max(y1, P.y);
      zA = Math.min(zA, Math.abs(P.z));
    }
    out.push({ key: pt.key + '/' + pt.name, W, I, n: A.count, x0, x1, y0, y1, zA, grat: pt.key === 'grating' });
  });
  return out;
}
/* the first part in the drum or the sweep of a capstan centred at (cx, 0), its bands given */
function capSweepHit(obs, cx, B) {
  const { rD, rB, yFoot, yTop, b0, b1 } = B;
  /* a hatch is cut 0.3 m clear of the drumhead's rim, as r345's gratings are (buildFittings) */
  const yLo = Math.min(yFoot - 0.1, b0 - 0.05), yHi = Math.max(yTop, b1 + 0.05);
  const seg = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((cx - ax) * dx - az * dz) / L2)) : 0;
    return Math.hypot(ax + t * dx - cx, az + t * dz); };
  for (const o of obs) {
    if (o.x1 < cx - rB - 0.3 || o.x0 > cx + rB + 0.3 || o.y1 < yLo || o.y0 > yHi || o.zA > rB) continue;
    const W = o.W, rDo = o.grat ? rD + 0.3 : rD;
    /* ⚠ A GRATING LIES ALMOST FLUSH: its coaming stands a few centimetres over the planking, under
       the drum's lowest band, so it is tested from the deck up and cut at its own mid-height */
    const yD0 = o.grat ? yFoot - 0.1 : yFoot + 0.05;
    const cuts = [[(b0 + b1) / 2, rB], [yFoot + 0.15, rDo], [(yFoot + yTop) / 2, rDo], [yTop - 0.05, rDo]];
    if (o.grat) cuts.push([(o.y0 + o.y1) / 2, rDo]);
    for (let i = 0; i < o.n; i++) {
      const x = W[3 * i], y = W[3 * i + 1], z = W[3 * i + 2], r = Math.hypot(x - cx, z);
      if ((r < rDo && y > yD0 && y < yTop) || (r < rB && y > b0 - 0.05 && y < b1 + 0.05)) return o.key;
    }
    const I = o.I, nT = I ? I.count / 3 : o.n / 3;
    for (let t = 0; t < nT; t++) {
      const ia = I ? I.getX(3 * t) : 3 * t, ib = I ? I.getX(3 * t + 1) : 3 * t + 1, ic = I ? I.getX(3 * t + 2) : 3 * t + 2;
      const V = [ia, ib, ic];
      for (const [yc, rc] of cuts) {
        const pts = [];
        for (let e = 0; e < 3; e++) { const a = V[e], b = V[(e + 1) % 3];
          const ay = W[3 * a + 1], by = W[3 * b + 1];
          if ((ay - yc) * (by - yc) < 0) { const f = (yc - ay) / (by - ay);
            pts.push([W[3 * a] + f * (W[3 * b] - W[3 * a]), W[3 * a + 2] + f * (W[3 * b + 2] - W[3 * a + 2])]); } }
        if (pts.length === 2 && seg(pts[0][0], pts[0][1], pts[1][0], pts[1][1]) < rc) return o.key;
      }
    }
  }
  return null;
}
function seatClassCapstans(S, group, mats) {
  const caps = group.children.filter(o => o.userData.capstanStation && o.userData.capstanStation.classStation);
  if (!caps.length) return;
  const H = hullSurface(S), L = S.lwl;
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  /* the set sails, from a rig built for the test and thrown away; S's own derived state is
     put back as it was, so nothing the real rig recorded is overwritten */
  const saved = {};
  for (const k of Object.keys(S)) if (k.startsWith('__')) saved[k] = S[k];
  const tmp = new THREE.Group();
  try { buildRig(S, tmp, mats, false, false); } catch (e) { /* no rig, no sails to test */ }
  for (const k of Object.keys(S)) if (k.startsWith('__') && !(k in saved)) delete S[k];
  Object.assign(S, saved);
  tmp.updateMatrixWorld(true);
  const invT = new THREE.Matrix4().copy(tmp.matrixWorld).invert();
  for (const cg of caps) {
    const st = cg.userData.capstanStation, u0 = st.u;
    const others = capObstacles([group], inv, (pt, o) => {
      let e = o; while (e && e !== cg) e = e.parent;
      return !e && pt.key !== 'sail' && !CAP_CLEAR_SKIP.has(pt.key) && !CAP_CLEAR_ROPE.test(pt.key); })
      .concat(capObstacles([tmp], invT, pt => pt.key === 'sail'));
    /* the drum and the sweep, read off the machine as built, relative to its deck */
    const P = new THREE.Vector3(), M = new THREE.Matrix4();
    const y0 = H.deck(u0), cx0 = (u0 - 0.5) * L;
    let rD = 0, yTop = -1e9, yFoot = 1e9, rB = 0, b0 = 1e9, b1 = -1e9;
    cg.traverse(o => {
      if (!o.isMesh) return;
      M.multiplyMatrices(inv, o.matrixWorld);
      const A = o.geometry.attributes.position, bar = Math.abs(o.rotation.z) > 0.1;
      for (let i = 0; i < A.count; i++) { P.fromBufferAttribute(A, i).applyMatrix4(M);
        const r = Math.hypot(P.x - cx0, P.z);
        if (bar) { rB = Math.max(rB, r); b0 = Math.min(b0, P.y); b1 = Math.max(b1, P.y); }
        else { yTop = Math.max(yTop, P.y); yFoot = Math.min(yFoot, P.y);
               if (o.name === 'cap-head') rD = Math.max(rD, r); } }
    });
    if (!rB || !rD) continue;
    const bandAt = u => { const dy = H.deck(u) - y0;
      return { rD, rB, yFoot: yFoot + dy, yTop: yTop + dy, b0: b0 + dy, b1: b1 + dy }; };
    const tried = [];
    let uAt = null, firstHit = null;
    for (let k = 0; k <= 130 && uAt === null; k++) {
      for (const sg of k ? [1, -1] : [1]) {
        const u = +(u0 + sg * k * 0.005).toFixed(4);
        if (u < 0.20 || u > 0.85) continue;
        const hit = capSweepHit(others, (u - 0.5) * L, bandAt(u));
        if (k === 0) firstHit = hit;
        if (!hit) { uAt = u; break; }
        tried.push(u);
      }
    }
    st.seat = { classU: u0, clearAtClass: !firstHit, blockedBy: firstHit, drawnU: uAt };
    if (uAt === null) {
      /* ⚠ NOWHERE CLEAR, NOTHING DRAWN. On the galley the corsia and the oars' looms run the
         whole length of the centreline; on the carrack the boat, both castles and the lateen
         mizzen leave no circle of deck 5.8 m across; on Endurance the deckhouse, funnel and
         boiler casing fill her waist. No plate has been read for where any of them carried a
         capstan, and a machine drawn through a boat or a funnel says something false. The
         builder draws none, records why on the group, and the record's provenance says so; the
         audit holds the two together (A-CAPSTAN-UNSEATED). */
      st.seat.why = `no station along the centreline between u 0.20 and 0.85 has its drum and bars' sweep clear; at the class station u ${u0}, ${firstHit}`;
      (group.userData.capstanUnseated = group.userData.capstanUnseated || []).push(st.seat);
      group.remove(cg);
      continue;
    }
    if (uAt !== u0) {
      cg.position.x = (uAt - 0.5) * L;
      cg.position.y += H.deck(uAt) - y0;
      st.u = uAt;
      st.seat.why = `the class station u ${u0} puts ${firstHit} in its drum or the sweep of its bars; `
                  + `u ${uAt} is the nearest station along the centreline where both are clear`;
    }
    const pt = cg.userData.part;
    if (pt) pt.what = (pt.what || PARTS.capstan.what)
      + (uAt === u0
         ? ` Drawn at u ${u0}, the class station: no plate of this hull has been read for where her capstan stood, and the deck there is clear of its drum and bars.`
         : ` Drawn at u ${uAt}. No plate of this hull has been read for where her capstan stood. At the class station, u ${u0}, ${firstHit.split('/')[1] || firstHit} stood in its drum or in the sweep of its bars, so the capstan is drawn at the nearest station along the centreline where both are clear (r346).`);
  }
}

function buildShip(S, opts) {"""
rep("function buildShip(S, opts) {", FN)

# 3. call it once every part is built
rep("""  if (S.turrets) buildTurrets(S, group, mats);

  /* ── A DOUBLE CANOE IS TWO HULLS""",
    """  if (S.turrets) buildTurrets(S, group, mats);
  /* every part is built: a class-station capstan now moves clear of them (round 346) */
  if (FINE && S.capstan && S.capstan.form !== 'spill') seatClassCapstans(S, group, mats);

  /* ── A DOUBLE CANOE IS TWO HULLS""")
p.write_text(s)
print('ok', p)

# 4. buildShip replaces group.userData at its end; the unseated record rides across
s = p.read_text()
old = "  group.userData = { hullMat, sails, spec: S, furled: FURLED,\n"
assert s.count(old) == 1
s = s.replace(old, "  const capstanUnseated = group.userData.capstanUnseated;   // r346, set by seatClassCapstans\n"
                   "  group.userData = { hullMat, sails, spec: S, furled: FURLED, capstanUnseated,\n")
p.write_text(s)
print('ok 4', p)

# 5. r345's grating mover measured from the board's end; the coaming's outer face stands 0.45 t outside it
s = p.read_text()
old = """    for (const c of capClear)
      if (Math.abs(x - c.x) < l / 2 + c.r) x = c.x + (x >= c.x ? 1 : -1) * (l / 2 + c.r + 0.02);"""
new = """    /* (r346) the clearance is to the coaming's OUTER face, 0.45 of the coaming module outside the
       board's end (gratingAt's section); measured from the board, the 74's coamings stood 0.23 m
       from the drumhead's rim, and A-CAPSTAN-CLEAR, given gratings in r346, convicted both */
    const hOut = l / 2 + 0.45 * B * 0.013;
    for (const c of capClear)
      if (Math.abs(x - c.x) < hOut + c.r) x = c.x + (x >= c.x ? 1 : -1) * (hOut + c.r + 0.02);"""
assert s.count(old) == 1
s = s.replace(old, new)
p.write_text(s)
print('ok 5', p)
