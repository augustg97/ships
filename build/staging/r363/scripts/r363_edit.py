#!/usr/bin/env python3
"""r363: lay each gun from its port. Muller's housing rule for a tier gun, his general construction for an island gun;
the 74's upper tier's ports from Steel's Folio XXXII; the side pieces always 4.5 shot. Usage: r363_edit.py <web dir>"""
import sys, re
W = sys.argv[1]
p = W + '/js/hull.js'
s = open(p).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:120])
    s = s.replace(old, new)

# ── 1. tierPortRows + vAtY + gunHousing, after sideBands ─────────────────────────────────────────────
rep("""  return { tiers, wales: [{ v0: 0.655, thick: 0.030 }, { v0: 0.760, thick: 0.026 }], soft: 0.011, from: 'class' };
}
""", """  return { tiers, wales: [{ v0: 0.655, thick: 0.030 }, { v0: 0.760, thick: 0.026 }], soft: 0.011, from: 'class' };
}

/* ── A TIER'S PORTS FROM THE RECORD (round 363) ──────────────────────────────────────────
   Until r363 every tier's ports were drawn |v − port| < 0.023 in the loft's v, a class depth: on
   the 74's upper tier that is a port 0.65 m deep with its sill 0.58 m over the deck. Steel's
   Folio XXXII gives a 74's upper-deck ports 2 ft 8 in deep with the sill 2 ft 0 in over the plank.
   hull.tierPorts[d] = { sillM, hM } records a tier's ports as Steel tables them: the sill over the
   deck the tier stands on (H.deck) and the depth. The shader draws a port as a band in v, so the
   record is turned into v at midships, where the deck is read; along the length the port follows
   the paint bands, as before. Returned per tier: lo and hi, the sill and the head in v, and from.
   Without a record the class band is returned, lo = port − 0.023 and hi = port + 0.023, which the
   shader draws with the same 0.007 softness as before, so every unrecorded hull is unchanged. */
function vAtY(S, H, u, y) {
  let a = 0, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (surfacePoint(S, H, u, m)[1] < y) a = m; else b = m; }
  return (a + b) / 2;
}
function tierPortRows(S) {
  const T = sideBands(S).tiers, rec = Array.isArray(S.tierPorts) ? S.tierPorts : [];
  let H = null;
  return T.map((t, d) => {
    const R = rec[d];
    if (!R || !(R.hM > 0)) return { lo: t.port - 0.023, hi: t.port + 0.023, port: t.port, from: 'class' };
    H = H || hullSurface(S);
    const y0 = H.deck(0.5) + R.sillM, lo = vAtY(S, H, 0.5, y0), hi = vAtY(S, H, 0.5, y0 + R.hM);
    return { lo, hi, port: (lo + hi) / 2, from: 'record' };
  });
}

/* ── MULLER LAYS THE GUN FROM ITS PORT (round 363) ──────────────────────────────────────
   Muller (A Treatise of Artillery, 1768, after the 1748 table of ship carriages): "The height of
   the side pieces and the diameter of the trucks depend on the height of the port-holes in ships
   from the deck. Those of the lower tiers ought to be such, that when the breech of a gun lies
   upon the hind axle-tree, the muzzle of the gun should touch above the port-hole, in order that
   it may not push the shutter open when the ship rolls in stormy weather."
   With the side pieces at 4.5 shot (his figure, whatever the port), the hind axletree's top stands
   at a fixed depth under the trunnions: the side pieces' underside is 4.5 shot less a quarter inch
   under them, and the axletree, 30 parts of the shot's 24 high, is sunk half its height into the
   side pieces, so its top is 0.625 shot over their underside. That is 3.875 shot less a quarter
   inch. Lower the breech until the barrel's lowest point over the axletree's 12 in touches that
   top, and the muzzle rises: theta is that angle, and rise is the height of the muzzle's highest
   point over the trunnions. The muzzle touches the port's upper sill, so the trunnions stand at
   the port's head less the rise, and the trucks make up the rest.
   Muller's words say the breech lies upon the axletree. The bed lies on that axletree in the
   model, 0.8 calibre thick (a CLASS figure); laid on the bed the gun would stand higher. The
   record (laid.contested) says so. */
function gunHousing(len, r) {
  const c = r / (0.5 + GUN_BARREL.t.vent / 14), D = c * 20 / 21;
  const { pts } = gunBarrelProfile(len, r);
  const yT = -len / 2 + len * 3 / 7, yB = -len / 2, axHalf = 0.1524;
  const drop = 3.875 * D - 0.00635;
  const aft = pts.filter(q => q[1] >= yB - axHalf && q[1] <= yB + axHalf), fwd = pts.filter(q => q[1] > yT);
  const depth = th => Math.max(...aft.map(([q, y]) => (yT - y) * Math.sin(th) + q * Math.cos(th)));
  let a = 0, b = 0.8;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (depth(m) < drop) a = m; else b = m; }
  const theta = (a + b) / 2;
  const rise = Math.max(...fwd.map(([q, y]) => (y - yT) * Math.sin(theta) + q * Math.cos(theta)));
  return { theta, rise, drop, calibre: c, shot: D };
}
""")

# ── 2. the shader's uniforms: the ports' sill and head per tier ──────────────────────────────────────
rep("""        return { uTierLo: { value: v4('lo') }, uTierHi: { value: v4('hi') },
                 uTierPort: { value: v4('port') }, uTierSoft: { value: sideBands(S).soft } };""",
"""        const pr = tierPortRows(S), pv4 = k => new THREE.Vector4(...[0, 1, 2, 3].map(i => (pr[i] ? pr[i][k] : 0)));
        return { uTierLo: { value: v4('lo') }, uTierHi: { value: v4('hi') },
                 uTierPortLo: { value: pv4('lo') }, uTierPortHi: { value: pv4('hi') }, uTierSoft: { value: sideBands(S).soft } };""")

# ── 3. buildGuns: the tier gun over its deck is laid from its port's head ─────────────────────────────
rep("""  const cg = new THREE.Group(), cMat = carriageMat(S);
  for (let d = 0; d < decks; d++) {
    const tier = sideBands(S).tiers[d];                 // the shader's port centre, exactly (r341)
    if (!tier) continue;
    const v = tier.port;""", """  const cg = new THREE.Group(), cMat = carriageMat(S);
  const rows = tierPortRows(S), house = gunHousing(len, r);
  for (let d = 0; d < decks; d++) {
    const tier = sideBands(S).tiers[d];                 // the shader's port centre, exactly (r341)
    if (!tier) continue;
    const row = rows[d], v = row.port;                  // r363: a recorded tier's port is Steel's""")
rep("""        bar.rotation.x = sgn * Math.PI / 2;              // along the beam, the muzzle out
        bar.position.set(p[0], p[1], sgn * (Math.abs(p[2]) - len / 6));
        bar.userData.tierGun = { deck: d, u, lenM: len };
        g.add(bar);
        if (p[1] - r > H.deck(u)) cg.add(gunCarriage(p[0], H.deck(u), p[1], Math.abs(p[2]), sgn, len, r, cMat));""",
"""        bar.rotation.x = sgn * Math.PI / 2;              // along the beam, the muzzle out
        bar.userData.tierGun = { deck: d, u, lenM: len };
        /* ⚠ LAID FROM THE PORT'S HEAD (round 363). A gun standing over its deck rides a carriage, and Muller lays it
           so that, housed with its breech down on the hind axletree, its muzzle touches the port's upper sill
           (gunHousing). Until r363 its axis stood at the port's centre, which left the quarterdeck's carriages 0.21 m
           taller than Muller's side pieces. A gun under a deck is not seen inboard, carries no carriage, and stays
           at the port's centre. */
        let q = p;
        if (p[1] - r > H.deck(u)) {
          const head = surfacePoint(S, H, u, row.hi)[1], sill = surfacePoint(S, H, u, row.lo)[1], yA = head - house.rise;
          q = surfacePoint(S, H, u, vAtY(S, H, u, yA));
          bar.userData.tierGun.laid = { rule: 'housed', head: +head.toFixed(4), sill: +sill.toFixed(4), axis: +yA.toFixed(4),
            rise: +house.rise.toFixed(4), thetaDeg: +(house.theta * 180 / Math.PI).toFixed(2), port: row.from,
            contested: `Muller lays the housed breech on the hind axletree; the model's bed lies on it ${(0.8 * house.calibre).toFixed(3)} m thick, and laid on the bed the gun would stand higher` };
          cg.add(gunCarriage(q[0], H.deck(u), yA, Math.abs(q[2]), sgn, len, r, cMat));
        }
        bar.position.set(q[0], q[1], sgn * (Math.abs(q[2]) - len / 6));
        g.add(bar);""")

# ── 4. gunCarriage: the side pieces are 4.5 shot; the trucks take the port's height ──────────────────
rep("""     Muller's construction for new guns makes the fore trucks 4 shot across and the hind 3.5; that is the ceiling
     here. Where the port stands so high that even 4-shot trucks leave a gap, the side pieces are carried up to the
     trunnions and the stretch is recorded (contested): it is a quarterdeck port whose gun the model lays at the
     port's centre, where Muller lays it from the port's upper sill (the queue's next item). */
  const yTop = yAxis + 0.00635, hF0 = 4.5 * D, RFmax = 2 * D, RFmin = D;   // the floor (2 shot across) is a guard, not a record
  let RF = yTop - hF0 - yDeck, hF = hF0;
  if (RF > RFmax) { RF = RFmax; hF = yTop - yDeck - RF; }
  if (RF < RFmin) { RF = RFmin; hF = yTop - yDeck - RF; }""",
"""     Muller's construction for new guns makes the fore trucks 4 shot across and the hind 3.5, and "if the port-holes
     in ships are made higher or lower, these diameters must be increased or diminished". So the side pieces stay at
     4.5 shot and the fore truck is whatever the axis leaves (r363; r362 held the trucks to 4 shot and stretched the
     side pieces instead). The caller lays the axis from the port (gunHousing, or Muller's construction on an island).
     Only under the floor, a truck less than 2 shot across, are the side pieces cut, and the record says so. */
  const yTop = yAxis + 0.00635, hF0 = 4.5 * D, RFmin = D;   // the floor (2 shot across) is a guard, not a record
  let RF = yTop - hF0 - yDeck, hF = hF0;
  if (RF < RFmin) { RF = RFmin; hF = yTop - yDeck - RF; }""")
rep("""              hFore: +hF.toFixed(4), hRule: +hF0.toFixed(4), truckFore: +RF.toFixed(4), truckHind: +RH.toFixed(4),
              contested: Math.abs(hF - hF0) > 0.005 ? `side pieces ${(hF - hF0).toFixed(3)} m off Muller's 4.5 shot: the trucks are held to ${RF === RFmax ? 'his 4-shot ceiling' : 'the 2-shot floor'} and the gun is laid at its port's centre` : null } };""",
"""              hFore: +hF.toFixed(4), hRule: +hF0.toFixed(4), truckFore: +RF.toFixed(4), truckHind: +RH.toFixed(4),
              truckForeShot: +(2 * RF / D).toFixed(2),
              contested: Math.abs(hF - hF0) > 0.005 ? `side pieces ${(hF - hF0).toFixed(3)} m off Muller's 4.5 shot: the trucks are held to the 2-shot floor` : null } };""")

# ── 5. the island's guns: Muller's construction, clear of the sill ───────────────────────────────────
rep("""      /* a gun in every port, the tier guns' barrel at three quarters of its bore and length (a
         quarterdeck gun is a lighter piece), on the port's centre, pointing out through the
         barricade's face at the sheer's half-breadth */
      const gg = new THREE.Group(), len = B * 0.19 * 0.75, r = B * 0.017 * 0.75;
      const cg = new THREE.Group(), cMat = carriageMat(S);
      for (const q of mine) for (const sgn of [-1, 1]) {
        const ya = (q.sill + q.head) / 2;""",
"""      /* a gun in every port, the tier guns' barrel at three quarters of its bore and length (a
         quarterdeck gun is a lighter piece), pointing out through the barricade's face at the
         sheer's half-breadth.
         ⚠ LAID ON MULLER'S CARRIAGE (round 363). Until r363 the axis stood at the port's centre,
         0.91 m over the plank, which no carriage of Muller's reaches. His housing rule is written
         for "the lower tiers", whose ports have shutters; he gives no rule for a quarterdeck. So an
         island gun stands on his general construction: side pieces 4.5 shot high, fore trucks 4
         shot across, which puts the trunnions 6.5 shot less a quarter inch over the plank. Where the
         barrel would then cut the port's sill at the face, the trucks are raised until it clears,
         as Muller directs for a higher port; laid.raisedM says by how much. */
      const gg = new THREE.Group(), len = B * 0.19 * 0.75, r = B * 0.017 * 0.75;
      const cg = new THREE.Group(), cMat = carriageMat(S);
      const cI = r / (0.5 + GUN_BARREL.t.vent / 14), DI = cI * 20 / 21, rFace = gunBarrelRadiusAt(len, r, len * 2 / 3);
      for (const q of mine) for (const sgn of [-1, 1]) {
        const yM = iDeck(q.u) + 6.5 * DI - 0.00635, ya = Math.max(yM, q.sill + rFace);""")
rep("""        bar.userData.islandGun = { u: q.u, lenM: len };""",
"""        bar.userData.islandGun = { u: q.u, lenM: len, laid: { rule: 'construction', axis: +ya.toFixed(4), sill: q.sill, head: q.head,
          raisedM: +(ya - yM).toFixed(4), faceR: +rFace.toFixed(4) } };""")

open(p, 'w').write(s)
print('hull.js edited')
