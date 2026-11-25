import sys
P = sys.argv[1]
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# 1. the mast's discs, and the topmast top's disc known before its sails are cut
rep("""    const mastYards = [];
    /* the HEAD of each drawn segment""", """    const mastYards = [];
    /* r326 (0y¹⁶⁸): every top this mast carries, in hull space, so each square sail set over one can be cut to
       bear on its forward rim (makeSail). The lower top is entered where it is built; the topmast top is built
       in the standing rigging below, after the sails, so its disc is entered here from the same record and the
       same expressions (the r325 block: tmHeadY, ttY, ttR = platR x ofLowerTop). */
    const mastDiscs = [];
    if (FINE && mk.rig === 'square' && (mk.only ? Math.min(mk.only, 3) : 3) >= 3 && mk.topmastTop
        && typeof mk.topmastTop.ofFootToHead === 'number' && mk.topmastTop.ofLowerTop > 0) {
      const tmH = base + lower * 0.88 + top, yT = base + mk.topmastTop.ofFootToHead * (tmH - base);
      mastDiscs.push({ x: mxA(yT), y: yT, r: B * 0.20 * mk.topmastTop.ofLowerTop, walled: (S.year || 0) < 1710, name: 'Topmast top' });
    }
    /* the HEAD of each drawn segment""")

# 2. the lower top enters its disc
rep("""          tp.position.set(mxA(y + seg * 0.90), y + seg * 0.90, 0);
          group.add(tp);
        }""", """          tp.position.set(mxA(y + seg * 0.90), y + seg * 0.90, 0);
          tp.userData.mast = mi;
          group.add(tp);
          mastDiscs.push({ x: mxA(y + seg * 0.90), y: y + seg * 0.90, r: topR, walled: (S.year || 0) < 1710, name: 'Top' });
        }""")

# 3. the sail is cut against them, and names its mast and yard
rep("""        const sq = makeSail(yX, yY, sqW, sqH, canvas, group, 'square', TRIM, reef);
        /* the cloth names its mast and its yard's height, so the audit can tell its own
           mast's axis at the head row (where the yard is slung) from a spar through it */
        sq.userData.mastX = x; sq.userData.yardY = yY;""", """        const sq = makeSail(yX, yY, sqW, sqH, canvas, group, 'square', TRIM, reef, mastDiscs);
        /* the cloth names its mast and its yard's height, so the audit can tell its own
           mast's axis at the head row (where the yard is slung) from a spar through it */
        sq.userData.mastX = x; sq.userData.yardY = yY;
        sq.userData.mast = mi; sq.userData.yardR = slingsD / 2;   // r326: the head is laced round the yard to its diameter
        mastYards[mastYards.length - 1].sail = sq;                // r326: the gear's sailPt reads this cloth's drape""")

# 4. sailPt carries the drape
rep("""            const zb = Math.max(0, chord) * depth + proud;
            return V3(yd.cx - xw * sT - zb * cT, yd.yy + y, -xw * cT + zb * sT);""", """            const zb = Math.max(0, chord) * depth + proud
                     + (yd.sail && yd.sail.userData.drapeAt ? yd.sail.userData.drapeAt(uu, v) : 0);   // r326: over a top's rim
            return V3(yd.cx - xw * sT - zb * cT, yd.yy + y, -xw * cT + zb * sT);""")

# 5. makeSail: one cloth function, and the drape
rep("""function makeSail(x, yTop, width, height, mat, group, kind, trim, reef) {   // r284 (0y⁸⁹): reef = the tier's reef bands, or null""",
    """function makeSail(x, yTop, width, height, mat, group, kind, trim, reef, discs) {   // r284 (0y⁸⁹): reef = the tier's reef bands, or null; r326 (0y¹⁶⁸): discs = the tops on its mast""")

old_loop_start = """  const NW = 28, NH = 20;
  const pos = [], uvs = [], idx = [];
  const roach = kind === 'square' ? 0.085 : 0.03;     // the foot's upward cut
  const hollow = 0.022;                                // the leeches' inward cut
  for (let i = 0; i <= NW; i++) {"""
assert s.count(old_loop_start) == 1
i0 = s.index(old_loop_start)
end_marker = """      pos.push(xw, y, -z);
      uvs.push(u, v);
    }
  }"""
i1 = s.index(end_marker, i0) + len(end_marker)
loop = s[i0:i1]
surf_start = s.index("  const surface = (u, v) => {", i1)
surf_end_marker = """    z += crease + roband + slack;
    return [xw, y, -z];
  };"""
i2 = s.index(surf_end_marker, surf_start) + len(surf_end_marker)
surf_old = s[surf_start:i2]

new_head = """  const NW = 28, NH = 20;
  const pos = [], uvs = [], idx = [];
  const roach = kind === 'square' ? 0.085 : 0.03;     // the foot's upward cut
  const hollow = 0.022;                                // the leeches' inward cut
  /* The cloth before any top bears on it: x across, y down from the head, z the belly POSITIVE forward
     (the vertex loop below mirrors it). The same terms, in the same order, as the loop always used. */
  const cloth0 = (u, v) => {
    const arch = Math.sin(Math.PI * u);
    const xw = (u - 0.5) * width * (1 - hollow * arch * 0.55);
    const footY = -height + roach * height * arch;
    const y = footY * v;
    const chord = Math.pow(arch, 0.72) * (1.0 + 0.30 * Math.cos(Math.PI * (u - 0.40)));
    const depth = width * 0.115 * (0.35 + 0.65 * Math.pow(v, 0.75));
    let z = Math.max(0, chord) * depth;
    const cx = Math.min(u, 1 - u) * 2.0;
    const cy = v;
    const corner = Math.exp(-cx * 3.4) * Math.exp(-Math.abs(cy - 1.0) * 2.2)
                 + Math.exp(-cx * 3.4) * Math.exp(-cy * 3.0);
    const crease = Math.sin((u * 9.0 + v * 5.0) * Math.PI) * corner * width * 0.016;
    const roband = Math.sin(u * Math.PI * (NW / 3)) * Math.exp(-v * 14.0) * width * 0.008;
    const slack = Math.sin(u * Math.PI * 5.0 + v * 7.0) * Math.pow(v, 2.0) * width * 0.010;
    z += crease + roband + slack;
    return [xw, y, z];
  };
  /* ── r326 (0y¹⁶⁸): A SAIL SET OVER A TOP BEARS ON THE TOP'S FORWARD RIM ─────────────────────────
     A topsail's foot is sheeted to the yard below the top, so the cloth comes down past the top on the fore
     side of the mast. The model hung that cloth in its own belly alone, about a mast's width forward of the
     axis, and a top reaches forward of the axis by its whole radius: on 9 hulls 31 tops stood through the sail
     set over them, by up to 1.9 m (the East Indiaman's mizzen top through her mizzen topsail). A real sail is
     pressed forward by the wind and lies against the top's forward rim, and where it rubbed it was lined:
     Falconer 1769, TOP-LINING, a lining on the after part of a topsail to save it from chafing on the top's
     rim. So the cloth is cut here to stand clear of each top on its mast by 4 cm: across the sail, as far as
     the rim reaches at that station, pushed forward the least that clears every point of the top's platform,
     wall and crosstrees (radius 1.07 of the top's, from 0.23 of it under the platform to the wall's head);
     it holds that over the rows the top spans and eases back to its own belly at the head and at the foot,
     where it is made fast to its yards; across, it eases back over one more radius on each side. A sail no
     top reaches is not touched. */
  const drapes = [];
  if (kind === 'square' && Array.isArray(discs) && discs.length) {
    const CLR = 0.04, ang = Math.PI / 2 + (trim || 0), cA = Math.cos(ang), sA = Math.sin(ang);
    const NS = 240;
    for (const d of discs) {
      const dx = d.x - x, dy = d.y - yTop;
      const lx = dx * cA, lz = dx * sA;                  // the top's centre in the cloth's frame; lz > 0 abaft the head
      const R = d.r * 1.07 + CLR;
      const y0 = dy - d.r * 0.23, y1 = dy + d.r * (d.walled ? 0.545 : 0.045);
      if (y0 > 0 || y1 < -height) continue;
      const P = new Float64Array(NS + 1), VA = new Float64Array(NS + 1), VB = new Float64Array(NS + 1), X = new Float64Array(NS + 1);
      let any = 0;
      for (let k = 0; k <= NS; k++) {
        const u = k / NS, xw = cloth0(u, 0)[0], footY = cloth0(u, 1)[1];
        X[k] = xw;
        VA[k] = Math.max(0, y1 / footY - 1 / NH); VB[k] = Math.min(1, y0 / footY + 1 / NH);
        const q = xw - lx;
        if (Math.abs(q) >= R || VB[k] <= VA[k]) continue;
        const zFront = lz - Math.sqrt(R * R - q * q);      // the rim's most forward point at this station (forward NEGATIVE)
        let need = 0;
        for (let t = 0; t <= 8; t++) {
          const v = VA[k] + (VB[k] - VA[k]) * t / 8;
          need = Math.max(need, -cloth0(u, v)[2] - zFront);
        }
        P[k] = need; if (need > any) any = need;
      }
      if (!(any > 0)) continue;
      const Ps = new Float64Array(NS + 1);
      for (let k = 0; k <= NS; k++) {
        let m = 0;
        for (let k2 = 0; k2 <= NS; k2++) if (P[k2] > 0) m = Math.max(m, P[k2] * Math.max(0, 1 - Math.abs(X[k] - X[k2]) / R));
        Ps[k] = m;
      }
      drapes.push({ Ps, VA, VB, d, push: any, lx, lz, R });
    }
  }
  const drapeAt = (u, v) => {
    if (!drapes.length) return 0;
    let D = 0;
    const f = Math.min(1, Math.max(0, u)) * 240, k = Math.min(239, Math.floor(f)), w = f - k;
    for (const dr of drapes) {
      const p = dr.Ps[k] * (1 - w) + dr.Ps[k + 1] * w;
      if (!(p > 0)) continue;
      const va = dr.VA[k], vb = dr.VB[k];
      const T = v < va ? Math.sin(Math.PI / 2 * v / va) : v > vb ? Math.sin(Math.PI / 2 * (1 - v) / (1 - vb)) : 1;
      D = Math.max(D, p * Math.max(0, T));
    }
    return D;
  };
  for (let i = 0; i <= NW; i++) {
    const u = i / NW;                                  // 0 = one leech, 1 = the other
    for (let j = 0; j <= NH; j++) {
      const v = j / NH;                                // 0 = head, 1 = foot
      /* the outline, the draft, the belly forward and the cloth's creases: cloth0 above, and the notes below */
      const [xw, y, z] = cloth0(u, v);
      pos.push(xw, y, -(z + drapeAt(u, v)));
      uvs.push(u, v);
    }
  }"""

# keep the old loop's long comments as notes, after the new loop
notes = []
import re
for m in re.finditer(r"( {6}/\*[\s\S]*?\*/)", loop):
    notes.append(m.group(1))
notes_block = "\n  /* ── THE NOTES THAT STOOD IN THE VERTEX LOOP (moved with r326's cloth0) ── */\n" + "\n".join(n.replace("\n    ", "\n  ") for n in notes)
s = s[:i0] + new_head + notes_block + s[i1:surf_start] + """  const surface = (u, v) => {
    const [xw, y, z] = cloth0(u, v);
    return [xw, y, -(z + drapeAt(u, v))];
  };""" + s[i2:]

rep("""  m.userData.surface = surface; m.userData.grid = { NW, NH };""",
    """  m.userData.surface = surface; m.userData.grid = { NW, NH };
  m.userData.drapeAt = drapes.length ? drapeAt : null;   // r326: the push off the plain belly, forward, at (u, v)
  m.userData.drape = drapes.map(dr => ({ name: dr.d.name, y: +dr.d.y.toFixed(3), r: +dr.d.r.toFixed(3), pushM: +dr.push.toFixed(3),
                                         clearM: 0.04, from: 'class: the cloth bears on the rim, 4 cm off it' }));""")
open(P, 'w').write(s)
print("ok")
