import sys
p = sys.argv[1]
s = open(p).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:90])
    s = s.replace(a, b)

# yardRead carries the bare flag
rep("""yards.push({ c: ax.centre, ax, slung: o.userData.slung || null, athwart: Math.abs(ax.dir.z) >= 0.85 }); }""",
    """yards.push({ c: ax.centre, ax, slung: o.userData.slung || null, athwart: Math.abs(ax.dir.z) >= 0.85, bare: o.userData.bare || null }); }""")
# the furled-roll rule exempts the bare crossjack (A-CROSSJACK-BARE reads it)
rep("""              if (!rolls.length) { say(v.id, 'a furled square yard with no roll on it', `${at} has no furled roll within 1.5 m of its centre`); continue; }""",
    """              if (yd.bare) continue;                               // r315: the crossjack is crossed bare; A-CROSSJACK-BARE reads it
              if (!rolls.length) { say(v.id, 'a furled square yard with no roll on it', `${at} has no furled roll within 1.5 m of its centre`); continue; }""")
# the tack census: a bare crossjack has no tacks
rep("""          const want = sq.length + ((key === 'sheet' || key === 'halyard') ? jm : 0);""",
    """          /* r315 (0y¹⁴⁹): a segment rig's crossjack carries no sail, so its mast has no tacks */
          const want = sq.length + ((key === 'sheet' || key === 'halyard') ? jm : 0) - (key === 'tack' ? sq.filter(isSegCrossjack).filter(mk => mk.crossjackSail !== true).length : 0);""")
# the helper and the new rule, beside A-YARD-LOWERED
rep("""    yardLowerRead(g, 'set');
""", """    yardLowerRead(g, 'set');
    /* ── A-CROSSJACK-BARE (round 315, 0y¹⁴⁹): A SEGMENT RIG'S CROSSJACK CARRIES NO SAIL, AND THE RECORD SAYS WHY.
       Falconer 1769: the crossjack sail "has generally been found of little service, and is therefore very seldom
       used"; Eckersberg's 1828 Asow at anchor shows the 74's crossjack a bare spar while every other yard carries
       its roll. Until r315 the builder bent a course to it, set and furled, with its sheets, tacks, garnets and
       buntlines. For every mizzen that is the aftermost of three or more masts, square-rigged with no `yards` list
       and more than one tier: (1) the record answers — `crossjackProvenance` opening PLATE READ or CLASS and
       `crossjackSail` a boolean; silence is 'a crossjack with no answer'; (2) where the record says no sail, exactly
       one Yard mesh on that mast is recorded bare (userData.bare) — 'a crossjack not crossed bare'; (3) no square
       cloth hangs from it (a sail whose yardY is within 0.3 m of the bare yard's and whose mast is this one) — 'a sail
       set from a bare crossjack'; (4) in the furled build no roll lies within 1.5 m of its centre — 'a roll on a bare
       crossjack'; (5) no clewline or buntline tier is recorded on it — 'gear for a sail the crossjack does not
       carry'; and (6) a bare yard anywhere else — 'a bare yard the record does not name'. */
    const crossjackRead = (G, STATE) => {
      const SB = STATE === 'furled' ? ' (furled build)' : '';
      const inv = new THREE.Matrix4().copy(G.matrixWorld).invert();
      const ms = H.masts || [];
      const bares = [], cloth = [], furls = [], gearTiers = [];
      G.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        o.updateMatrixWorld(true);
        const p = tagOf(o);
        if (p && p.key === 'yard' && o.userData.bare) {
          const a = o.geometry.attributes.position, V = new THREE.Vector3(), c = new THREE.Vector3();
          for (let k = 0; k < a.count; k++) c.add(V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv));
          bares.push({ o, c: c.divideScalar(a.count), rec: o.userData.bare });
        }
        if (o.userData.kind === 'square' && o.userData.yardY !== undefined) cloth.push(o);
        if (o.userData.kind === 'furl' && !o.userData.brailed) {
          const a = o.geometry.attributes.position, V = new THREE.Vector3(), c = new THREE.Vector3();
          for (let k = 0; k < a.count; k++) c.add(V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(inv));
          furls.push(c.divideScalar(a.count));
        }
        if (o.userData.courseGear && Array.isArray(o.userData.courseGear.tiers)) for (const t of o.userData.courseGear.tiers) if (t.yard) gearTiers.push(t);
      });
      ms.forEach((mk, mi) => {
        if (!isSegCrossjack(mk)) return;
        const at = `the mizzen (mast ${mi})`;
        if (STATE === 'set') {
          if (typeof mk.crossjackSail !== 'boolean' || !/^(PLATE READ|CLASS)/.test(mk.crossjackProvenance || ''))
            say(v.id, 'a crossjack with no answer', `${at}: crossjackSail ${JSON.stringify(mk.crossjackSail)}, crossjackProvenance ${mk.crossjackProvenance ? JSON.stringify(mk.crossjackProvenance.slice(0, 40)) : 'absent'}`);
        }
        if (mk.crossjackSail === true) return;
        const mine = bares.filter(b => b.rec.mast === mi);
        if (mine.length !== 1) { say(v.id, 'a crossjack not crossed bare', `${at}: ${mine.length} yard(s) recorded bare${SB}`); return; }
        const B = mine[0], yY = B.rec.y, mx = B.o.userData.slung ? B.o.userData.slung.mastX : null;
        for (const o of cloth) if (Math.abs(o.userData.yardY - yY) < 0.3 && (mx === null || Math.abs(o.userData.mastX - mx) < 1.5))
          say(v.id, 'a sail set from a bare crossjack', `${at}: a square sail hangs from y ${o.userData.yardY.toFixed(2)}, the bare crossjack at ${yY.toFixed(2)}${SB}`);
        if (STATE === 'furled') for (const f of furls) if (f.distanceTo(B.c) <= 1.5)
          say(v.id, 'a roll on a bare crossjack', `${at}: a furled roll centred ${f.distanceTo(B.c).toFixed(2)} m from the crossjack's centre${SB}`);
        for (const t of gearTiers) if (Math.abs(t.yard.yy - B.c.y) < 0.3 && (mx === null || Math.abs(t.yard.cx - B.c.x) < 1.5))
          say(v.id, 'gear for a sail the crossjack does not carry', `${at}: a clewline/buntline tier recorded on the yard at y ${t.yard.yy}${SB}`);
      });
      for (const b of bares) { const mk = ms[b.rec.mast];
        if (!mk || !isSegCrossjack(mk) || mk.crossjackSail === true)
          say(v.id, 'a bare yard the record does not name', `mast ${b.rec.mast}: a yard at y ${b.c.y.toFixed(2)} recorded bare${SB}`); }
    };
    crossjackRead(g, 'set');
""")
rep("""            const nLow = yardLowerRead(gf, 'furled');
""", """            const nLow = yardLowerRead(gf, 'furled');
            crossjackRead(gf, 'furled');   // r315 (0y¹⁴⁹)
""")
open(p, 'w').write(s)
print('audit edits applied')
s = open(p).read()
a = """    const H = v.hull;
"""
assert s.count(a) >= 1
i = s.index(a) + len(a)
s = s[:i] + """    /* r315 (0y¹⁴⁹): a segment rig's crossjack — the builder's isMizzen (the aftermost of three or more masts),
       square, no `yards` list, more than one tier */
    const isSegCrossjack = mk => !!(H && mk && mk.rig === 'square' && !mk.yards && (mk.only || 3) > 1
      && (H.masts || []).length >= 3 && mk.at === Math.max(...(H.masts || []).map(m2 => m2.at)));
""" + s[i:]
open(p, 'w').write(s)
print('helper added')
