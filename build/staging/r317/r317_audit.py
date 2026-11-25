import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:80]); s = s.replace(a, b)
# 1. the lateen read's vertex list without the cylinder seam's repeated vertex (r317)
old = """      const SB = STATE === 'furled' ? ' (furled build)' : '';
      const inv = new THREE.Matrix4().copy(G.matrixWorld).invert();
      const hullPts = o => { const a = o.geometry.attributes.position, out = [], V = new THREE.Vector3(); o.updateMatrixWorld(true);
        for (let k = 0; k < a.count; k++) { V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push(V.clone()); } return out; };
      const masts = [], yards = [], parrels = [], shrouds = [];"""
new = """      const SB = STATE === 'furled' ? ' (furled build)' : '';
      const inv = new THREE.Matrix4().copy(G.matrixWorld).invert();
      /* r317: each position once. A three.js cylinder repeats its seam vertex (theta 0, on +z) in
         every ring, so a ring's centroid stood about r/(n+1) to +z, and on the East Indiaman's
         square mizzen that read a yard 0.319 m off the axis (the builder's own offset, the mast's
         radius plus the yard's) as 0.305 m and called it through the mast. */
      const hullPts = o => { const a = o.geometry.attributes.position, out = [], seen = new Set(), V = new THREE.Vector3(); o.updateMatrixWorld(true);
        for (let k = 0; k < a.count; k++) { const key = Math.round(a.getX(k) * 1e5) + ',' + Math.round(a.getY(k) * 1e5) + ',' + Math.round(a.getZ(k) * 1e5);   // sin(2π) is -2e-16: toFixed gives '-0.00000'
          if (seen.has(key)) continue; seen.add(key);
          V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv); out.push(V.clone()); } return out; };
      const masts = [], yards = [], parrels = [], shrouds = [];"""
rep(old, new)
# 2. A-MIZZEN-SAIL
rep("""    crossjackRead(g, 'set');
""", """    crossjackRead(g, 'set');
    /* ── A-MIZZEN-SAIL (round 317, 0y¹⁵²): A SQUARE MIZZEN SETS A FORE-AND-AFT SAIL, OF ITS PERIOD, AND THE RECORD SAYS WHICH.
       With the crossjack bare (r315) the East Indiaman's and the slave ship's mizzens set nothing under their topsails.
       Waters 1958: on the larger ships of the sixteenth and seventeenth centuries "the mizzen mast carried a lateen-sail.
       This rig remained typical of merchant ships well into the eighteenth" century; Falconer 1769, MIZEN: "extended
       sometimes by a gaff, and sometimes by a yard which crosses the mast obliquely". For the aftermost of three or more
       masts, square-rigged: (1) the record names one sail — `spanker` or `lateenMizzen`, not both, not neither:
       'a square mizzen with no fore-and-aft sail' / 'a square mizzen with two'; (2) a lateen carries
       `mizzenSailProvenance` opening PLATE READ or CLASS: 'a lateen mizzen with no source'; (3) the period — a gaff
       spanker on a hull dated before 1700, 'a gaff spanker before its period', and a lateen on one dated after 1790,
       'a lateen mizzen after its period'; (4) a recorded lateen is built: one 'Lateen yard' recording `onSquareMast` on
       that mast, and in the set build one cloth beside it — 'a lateen mizzen recorded and not built' — and no such yard
       on a mast whose record does not name it, 'a lateen yard the record does not name'; (5) the yard's sling stands
       under the mast's lowest square yard, 'a lateen mizzen slung over the crossjack'. */
    {
      const ms = H.masts || [], mi = ms.length - 1, mk = ms[mi];
      const lys = [], cloths = [], sqY = [];
      g.traverse(o => { if (!o.isMesh) return;
        if (o.userData.lateen && o.userData.lateen.onSquareMast) lys.push(o.userData.lateen);
        if (o.userData.besideMast && typeof o.userData.mastX === 'number') cloths.push(o.userData.mastX);
        if (o.userData.bare && o.userData.bare.mast === mi) sqY.push(o.userData.bare.y);
        if (o.userData.yardFrac && o.userData.yardFrac.mast === mi) sqY.push(+o.userData.yardFrac.y); });
      if (ms.length >= 3 && mk.rig === 'square') {
        const at = `the mizzen (mast ${mi})`, yr = H.year;
        if (!mk.spanker && !mk.lateenMizzen) say(v.id, 'a square mizzen with no fore-and-aft sail', `${at}: neither spanker nor lateenMizzen in the record`);
        if (mk.spanker && mk.lateenMizzen) say(v.id, 'a square mizzen with two fore-and-aft sails', `${at}: both spanker and lateenMizzen`);
        if (mk.lateenMizzen && !/^(PLATE READ|CLASS)/.test(mk.mizzenSailProvenance || ''))
          say(v.id, 'a lateen mizzen with no source', `${at}: mizzenSailProvenance ${mk.mizzenSailProvenance ? JSON.stringify(mk.mizzenSailProvenance.slice(0, 30)) : 'absent'}`);
        if (typeof yr === 'number' && mk.spanker && yr < 1700) say(v.id, 'a gaff spanker before its period', `${at}: spanker on a hull dated ${yr}`);
        if (typeof yr === 'number' && mk.lateenMizzen && yr > 1790) say(v.id, 'a lateen mizzen after its period', `${at}: lateenMizzen on a hull dated ${yr}`);
        if (mk.lateenMizzen) {
          const mine = lys.filter(l => l.mast === mi);
          if (mine.length !== 1) say(v.id, 'a lateen mizzen recorded and not built', `${at}: ${mine.length} lateen yard(s) on a square mast recorded on it`);
          else {
            const L = mine[0];
            if (!cloths.some(x => Math.abs(x - L.mastX) < 0.01)) say(v.id, 'a lateen mizzen recorded and not built', `${at}: no cloth beside the mast at x ${L.mastX}`);
            const low = sqY.length ? Math.min(...sqY) : null;
            if (low !== null && L.slingY >= low) say(v.id, 'a lateen mizzen slung over the crossjack', `${at}: sling y ${L.slingY}, the lowest square yard at y ${low.toFixed(2)}`);
          }
        }
      }
      for (const L of lys) { const m2 = ms[L.mast];
        if (!m2 || !m2.lateenMizzen) say(v.id, 'a lateen yard the record does not name', `mast ${L.mast}: a lateen yard on a square mast whose record has no lateenMizzen`); }
    }
""")
open(p, 'w', encoding='utf8').write(s); print('ok')
