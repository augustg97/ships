import sys
P = '/Users/augustgweon/Ships/web/js/hull.js'
s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:80])
    s = s.replace(old, new)

# 1. catheads for iron hulls too; the head (beakhead) stays timber-only
rep("""  S.__catheads = null;
  if (!S.bowsprit || S.iron) return;
  const H = hullSurface(S);""", """  S.__catheads = null;
  if (!S.bowsprit) return;
  const H = hullSurface(S);""")
rep("""  if (S.build === 'frame') {
    const blen = B * 0.26, sq = B * 0.042, ang = 0.70;   // 40° forward of athwart""",
"""  /* ⚠ AN IRON SHIP CATS HER ANCHOR TOO (round 367). Until r367 only a frame-built hull had a cathead, so the iron
     steamer's and Preussen's bowers were placed against the bow at a class station and stood 0.4–0.7 m inside it.
     A stocked bower is catted and fished whatever the hull is made of: the Admiralty pattern stayed the bower of iron
     merchant ships until the stockless anchor and the hawse pipe replaced it from the 1880s. On an iron hull the
     cathead is an iron beam. Where a forecastle island covers the bow (Preussen) the cathead stands on the forecastle
     head at the island's rail, at the middle of its length: a class station, read from no plate. Preussen's own stow
     is contested in the record's terms: her plates show her at anchor or at sea in halftone, and a ship of 1902 may
     have housed stockless bowers in hawse pipes. */
  if (S.build === 'frame' || S.iron) {
    const blen = B * 0.26, sq = B * 0.042, ang = 0.70;   // 40° forward of athwart
    const fcsle = S.islands && S.islands.list ? S.islands.list.find(i => i.u[0] <= 0.001) : null;
    const catMat = S.iron ? (mats.iron || mats.woodDark) : mats.woodDark;""")
rep("""    let uc = 0.105;
    const kneeAft = u =>""", """    let uc = fcsle ? fcsle.u[1] * 0.5 : 0.105;
    const kneeAft = u =>""")
rep("""    const pd = surfacePoint(S, H, uc, 1.0);
    S.__catheads = [];
    for (const sgn of [-1, 1]) {
      const cg = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.BoxGeometry(sq, sq, blen), mats.woodDark);""",
"""    const pd = surfacePoint(S, H, uc, 1.0);
    if (fcsle) pd[1] = H.islandTop(uc);
    S.__catheads = [];
    for (const sgn of [-1, 1]) {
      const cg = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.BoxGeometry(sq, sq, blen), catMat);""")
rep("""      const kn = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.7, B * 0.06, sq * 0.7), mats.woodDark);""",
"""      const kn = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.7, B * 0.06, sq * 0.7), catMat);""")
# the head stays timber-only: return after the catheads on an iron hull
rep("""      S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z });
    }
  }

  const grade = S.head || 0;""", """      S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z });
    }
  }
  if (S.iron) return;

  const grade = S.head || 0;""")

# 2. the stow's clearance test: a forecastle island's shell is solid above the sheer
rep("""  const half = (x, y) => {
    const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null || surfacePoint(S, H, u, 1)[1] < y) return 0;""",
"""  /* ⚠ AN ISLAND'S SHELL IS THE SIDE ABOVE THE SHEER (round 367). buildIslands carries the shell straight up from the
     sheer to the island's top, so a stock end over the sheer but under a forecastle's top is inside the ship. Until
     r367 no catted hull had an island and this read open air there. */
  const half = (x, y) => {
    const u = uAtXV(S, H, x, 0.9, Math.max(0.01, Math.min(0.99, x / L + 0.5)));
    if (u === null) return 0;
    if (surfacePoint(S, H, u, 1)[1] < y) { const t = H.islandTop(u); return t !== null && y <= t ? Math.abs(surfacePoint(S, H, u, 1)[2]) : 0; }""")
rep("""    /* no cathead drawn (iron bows, the shell-built corbita): stowed against the bow, centred as before */""",
"""    /* no cathead drawn (the shell-built corbita): stowed against the bow, centred as before. ⚠ It stands about
       0.5 m inside the bow; carried in HANDOFF.md (r367). */""")
open(P, 'w').write(s)

A = '/Users/augustgweon/Ships/Research/audit-hulls.js'
a = open(A).read()
def repa(old, new):
    global a
    assert a.count(old) == 1, old[:80]
    a = a.replace(old, new)
repa("""       skin and below the sheer. The bows without a cathead (the corbita, and the iron Preussen and steamer) are not
       judged here: their anchors stand 0.4–0.7 m into the bow, a fault carried to r367 in HANDOFF.md. */""",
"""       skin and below the sheer. Since r367 the iron steamer and Preussen are catted and judged here; the corbita, with
       no cathead, is not, and its anchor's stow is carried in HANDOFF.md. A forecastle island's shell is the side
       above the sheer (r367): a vertex over the sheer and under the island's top is judged against the sheer's
       half-breadth, which until r367 read as open air. */""")
repa("""      const halfAt = (x, y) => { const u = uAt(x, 0.9); if (SHIPS_HULL.surfacePoint(H, HSa, u, 1)[1] < y) return null;""",
"""      const halfAt = (x, y) => { const u = uAt(x, 0.9);
        if (SHIPS_HULL.surfacePoint(H, HSa, u, 1)[1] < y) { const t = HSa.islandTop ? HSa.islandTop(u) : null;
          return t !== null && y <= t ? Math.abs(SHIPS_HULL.surfacePoint(H, HSa, u, 1)[2]) : null; }""")
open(A, 'w').write(a)
print('ok')
