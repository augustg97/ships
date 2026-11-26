"""r333: the ship's boat on skids clears every mast's foot; A-BOAT-CLEAR. usage: r333_boat.py <dir>"""
import sys
D = sys.argv[1]
p = f'{D}/js/hull.js'; h = open(p).read()
old = """  if (timberShip && laidDeck && S.lwl > 25) {
    const bl = L * 0.17, u = 0.46;
"""
new = """  if (timberShip && laidDeck && S.lwl > 25) {
    let bl = L * 0.17;
    /* ── THE BOAT STANDS CLEAR OF THE MASTS (round 333) ─────────────────────────────────
       The boat was set at u 0.46 on every hull, 0.17 of the waterline long, and nothing asked
       where the masts stood. Seven hulls stood a mast up through it (A-BOAT-CLEAR): the fluyt's
       main once r333 moved it to the station Hollar's 1647 plate draws, and the trireme's,
       the corbita's, the panokseon's, the treasure ship's, Wyoming's and Endurance's as they
       were. A boat on skids was stowed in the waist BETWEEN two masts. So: a boat whose length,
       0.35 m each way, holds no mast's axis keeps u 0.46 and is drawn exactly as before.
       Otherwise it goes to the gap between two masts' feet (or a mast and the waist's end,
       u 0.20 / 0.80) nearest u 0.46 that holds it with 0.9 m clear of each axis (the treasure ship's main is 0.54 m in radius); where no gap
       holds it, it is shortened to fit the widest one, down to half its length. */
    let u = 0.46;
    {
      const xOf = q => (q - 0.5) * L + H.rake(q), c = 0.9;
      const feet = (S.masts || []).map(m => xOf(m.at)).sort((a, b) => a - b);
      const x0 = (u - 0.5) * L;
      if (feet.some(xm => Math.abs(xm - x0) < bl / 2 + 0.35)) {
        const lo = (0.20 - 0.5) * L, hi = (0.80 - 0.5) * L;
        const edges = [lo, ...feet.filter(xm => xm > lo && xm < hi), hi];
        const gaps = [];
        for (let k = 0; k + 1 < edges.length; k++) {
          const a = edges[k] + (k === 0 ? 0 : c), b = edges[k + 1] - (k + 1 === edges.length - 1 ? 0 : c);
          if (b > a) gaps.push([a, b]);
        }
        const fit = gaps.filter(([a, b]) => b - a >= bl)
          .map(([a, b]) => Math.min(b - bl / 2, Math.max(a + bl / 2, x0)))
          .sort((p1, p2) => Math.abs(p1 - x0) - Math.abs(p2 - x0));
        if (fit.length) u = 0.5 + fit[0] / L;
        else {
          const w = gaps.sort((g1, g2) => (g2[1] - g2[0]) - (g1[1] - g1[0]))[0];
          if (w && w[1] - w[0] >= bl / 2) { bl = w[1] - w[0]; u = 0.5 + (w[0] + w[1]) / 2 / L; }
        }
      }
    }
"""
assert h.count(old) == 1; h = h.replace(old, new)
old2 = """    group.add(tag(bm, 'boat'));
    for (const d of [-0.30, 0.30]) {                    // she sits on skids across the beams"""
assert h.count(old2) == 1
h = h.replace(old2, """    bm.userData.skidBoat = { u: +u.toFixed(4), lengthM: +bl.toFixed(3), moved: u !== 0.46 || bl !== L * 0.17 };
    group.add(tag(bm, 'boat'));
    for (const d of [-0.30, 0.30]) {                    // she sits on skids across the beams""")
open(p, 'w').write(h)

p = f'{D}/audit-hulls.js'; a = open(p).read()
anchor = """    /* ── A-FUNNEL-STATIONS (round 296, Titanic): A FUNNEL STANDS WHERE ITS OWN READ PUTS IT."""
assert a.count(anchor) == 1
rule = """    /* ── A-BOAT-CLEAR (round 333, the fluyt): NO MAST STANDS UP THROUGH THE SHIP'S BOAT.
       The boat on skids was set at u 0.46 on every hull and no rule asked where the masts stood. When r333
       moved the fluyt's main to the station her plate draws, the mast stood up through the boat's after
       thwarts, and every audit rule passed. MESH: each mast's lowest segment, as a cylinder of its own radius
       at the deck, against the boat hull's own vertices in hull space. A mast whose axis falls inside the
       boat's length and breadth, with its surface inside the boat's x-span and the boat's sheer above the
       deck the mast stands on, convicts: 'a mast through the ship's boat'. */
    {
      g.updateMatrixWorld(true);
      const invB = new THREE.Matrix4().copy(g.matrixWorld).invert(), P = new THREE.Vector3();
      const boats = [], segs0 = [];
      g.traverse(o => { if (!o.isMesh) return;
        if (o.userData.part && o.userData.part.key === 'boat' && o.userData.part.name === "Ship's boat") boats.push(o);
        const s = o.userData.seg; if (s && s.si === 0) segs0.push({ s, r: (o.geometry.parameters || {}).radiusBottom || 0 }); });
      boats.forEach(bo => {
        const M = new THREE.Matrix4().multiplyMatrices(invB, bo.matrixWorld), A = bo.geometry.attributes.position;
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (let k = 0; k < A.count; k++) { P.fromBufferAttribute(A, k).applyMatrix4(M);
          x0 = Math.min(x0, P.x); x1 = Math.max(x1, P.x); z0 = Math.min(z0, P.z); z1 = Math.max(z1, P.z); y0 = Math.min(y0, P.y); y1 = Math.max(y1, P.y); }
        segs0.forEach(({ s, r }) => {
          if (s.footX + r > x0 && s.footX - r < x1 && z0 < r && z1 > -r && s.footY < y1 && s.headY > y0)
            say(v.id, "a mast through the ship's boat", `masts[${s.mi}] foot at x ${s.footX.toFixed(2)} (radius ${r.toFixed(2)}) stands inside the ship's boat at x ${x0.toFixed(2)} to ${x1.toFixed(2)}`);
        });
      });
    }
"""
a = a.replace(anchor, rule + anchor)
open(p, 'w').write(a)
print('boat edit applied to', D)
