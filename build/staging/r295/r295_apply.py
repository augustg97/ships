#!/usr/bin/env python3
"""r295: Titanic's forecastle and poop become recorded islands read off the 1911 side plan.
Reads the *.before.* files and writes the :8150 working copies, so it can be re-run from clean."""
import json, re, sys

R = '/Users/augustgweon/Ships/build/staging/r295/'


def sub1(s, old, new, n=1):
    assert s.count(old) == n, (old[:70], s.count(old))
    return s.replace(old, new)


# ---------------------------------------------------------------- the record
d = json.load(open(R + 'vessels.before.json', encoding='utf8'))
v = next(x for x in d['vessels'] if x['id'] == 'titanic')
h = v['hull']
L, loa = h['lwl'], h['loa']
rs = min(1, max(0, loa - L) / ((h['stemRake'] + h['sternRake']) * loa))


def rake(u):
    if u < h['forefoot']:
        k = (h['forefoot'] - u) / h['forefoot']
        return -h['stemRake'] * rs * k * k * loa
    if u > 1 - h['run']:
        k = (u - (1 - h['run'])) / h['run']
        return h['sternRake'] * rs * k * k * loa
    return 0.0


def x_of(u):
    return (u - .5) * L + rake(u)


def u_of(x):
    a, b = 0.0, 1.0
    for _ in range(60):
        m = (a + b) / 2
        if x_of(m) < x:
            a = m
        else:
            b = m
    return (a + b) / 2


def sheer(u):
    s = abs(2 * u - 1)
    return h['freeboard'] + (h['sheerBow'] if u < .5 else h['sheerStern']) * s ** 2.8


STEM, STERN = 3629.0, 123.5
PX = (STEM - STERN) / loa          # px per metre along the hull, the plan's own length over the record's
xHead = x_of(0)
col_x = lambda c: xHead + (STEM - c) / PX

BREAKS = {'foreBreak': (3113, 3100), 'houseFore': (2910, 2924), 'houseAft': (765, 757), 'poopBreak': (550, 563)}
mid = {k: (a + b) / 2 for k, (a, b) in BREAKS.items()}
uF, uP = round(u_of(col_x(mid['foreBreak'])), 4), round(u_of(col_x(mid['poopBreak'])), 4)
# tier pins are x / lwl (linerHouse inverts them through the loft itself), so the house's u is linear in x
hA, hB = round(.5 + col_x(mid['houseFore']) / L, 4), round(.5 + col_x(mid['houseAft']) / L, 4)

DH, RAIL = h['deckM'], 0.10
top = lambda u: round(sheer(u) + DH + RAIL, 2)
dist = {k: round((STEM - c) / PX, 2) for k, c in mid.items()}
lens = {'forecastle': dist['foreBreak'], 'foreWell': round(dist['houseFore'] - dist['foreBreak'], 2),
        'bridge': round(dist['houseAft'] - dist['houseFore'], 2),
        'aftWell': round(dist['poopBreak'] - dist['houseAft'], 2),
        'poop': round(loa - dist['poopBreak'], 2)}

prov = (
    "READ, r295, off the side plan of Olympic and Titanic printed in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, "
    "'Olympic and Titanic Side Plan 1911.png', 3803 x 1052 px, bow at the right; build/staging/r295/plates/side-plan-1911.png; "
    "the read in build/staging/r295/r295_read.py). SCALE: the stem head stands at column 3629 and the stern end at 123.5, "
    f"3505.5 px apart, which at the recorded 269.1 m overall is {PX:.3f} px/m. The plan's own bar scale reads 3.93 px/ft, "
    "which would make her 271.7 m, so every length below carries a bound of 1%. "
    "COLUMNS: each break is a curved plate, so its column is the midpoint of the curve's top and foot: the forecastle's break "
    "3113 and 3100, the bridge's fore end 2910 and 2924, its after end 765 and 757, the poop's break 550 and 563 (each good to "
    "about 7 px, 0.5 m). "
    f"LENGTHS on the plan: forecastle {lens['forecastle']:.1f} m, forward well {lens['foreWell']:.1f} m, bridge {lens['bridge']:.1f} m, "
    f"after well {lens['aftWell']:.1f} m, poop {lens['poop']:.1f} m. The lengths this record carried before r295 were 128 ft (39.0 m), "
    "about 50 ft (15.2 m), 550 ft (167.6 m), about 50 ft and 106 ft (32.3 m); they had set the house 2.7 m too far aft at its "
    "fore end and 4.8 m too far aft at its after end. MAPPING: each column's distance abaft the stem head is placed at x = "
    "stemHeadX + that distance and the island's u is solved through the loft's deck-level line x(u) = (u - 0.5) lwl + rake(u). "
    "The house's two stations stay x / lwl, which is how linerHouse reads a tier pin. HEIGHTS ARE NOT READ HERE: each island's top "
    "is the model's weather deck plus one 2.96 m deck plus a 0.10 m plate edge. Read against the plan's waterline, the well deck "
    "stands about 1.3 m higher than the model draws it (11.7 m forward and 11.5 m aft against 10.3), and the plan's rise from the well to the raised deck is 2.0 m at the forecastle and 1.5 m at the poop against the model's 2.96."
)

h['houseAt'] = [hA, hB]
del h['wellM']
h['islands'] = {
    'list': [
        {'name': 'Forecastle', 'u': [0, uF], 'topM': [top(0), top(uF)], 'cols': [STEM, mid['foreBreak']],
         'what': 'The shell carried one deck higher at the bow: anchor gear, windlass and the break of the deck. Between here and the bridge superstructure lies the forward well deck, which on Titanic was Third Class open space and the first place the sea came aboard.'},
        {'name': 'Poop deck', 'u': [uP, 1], 'topM': [top(uP), top(1)], 'cols': [mid['poopBreak'], STERN],
         'what': 'The raised aft deck, and on Titanic the last of her to stay dry. The aft well deck between the poop and the superstructure was Third Class promenade; the docking bridge stood here, from which she was conned going astern.'},
    ],
    'railM': RAIL,
    'openRail': True,
    'provenance': prov,
    'plate': {
        'plate': "Engineering vol. 91, 26 May 1911, side plan of Olympic and Titanic (Wikimedia Commons), 3803 px, bow at the right; build/staging/r295/plates/side-plan-1911.png",
        'stemHeadCol': STEM, 'sternEndCol': STERN,
        'pxPerMAlongHull': round(-PX, 4),
        'pxSign': 'negative because the bow is at the plate\'s right: columns fall going aft',
        'stemHeadX': round(xHead, 3),
        'houseCols': [mid['houseFore'], mid['houseAft']],
        'breakColsTopFoot': {k: list(val) for k, val in BREAKS.items()},
        'lengthsM': lens,
    },
}
open(R + 'web/data/vessels.json', 'w', encoding='utf8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print('px/m', round(PX, 4), 'uF', uF, 'uP', uP, 'houseAt', hA, hB, 'lengths', lens, 'x', {k: round(col_x(c), 2) for k, c in mid.items()})

# ---------------------------------------------------------------- the builder
s = open(R + 'hull.before.js', encoding='utf8').read()
a = s.index('/* ── THE RAISED ENDS: FORECASTLE AND POOP')
b = s.index('/* ── WHERE THE FUNNELS STAND')
assert 'function buildRaisedEnds' in s[a:b] and s[a:b].count('function ') == 1
s = s[:a] + s[b:]
s = sub1(s, "  if (FINE && !S.flightDeck && !S.turrets) buildRaisedEnds(S, group);\n", '')
s = sub1(s, 'the buildRaisedEnds idiom', 'the buildIslands idiom', 3)
s = sub1(s, " * a bulkhead hung from the sheer's station stands out through it. */\nfunction buildIslands",
         " * a bulkhead hung from the sheer's station stands out through it.\n"
         " * ⚠ A LINER'S RAISED ENDS ARE ISLANDS TOO (round 295): Titanic's forecastle and poop had a\n"
         " * builder of their own that placed them on the straight u line, inset the wall from the skin\n"
         " * over an open slot and let the capping ride the sheer along them. She now carries them in\n"
         " * hull.islands, read off the 1911 side plan, with `openRail` for the rail on their edges. */\nfunction buildIslands")
s = sub1(s, "    group.add(tag(g, 'forecast', isl.name, isl.what));\n  }\n}\n",
"""    group.add(tag(g, 'forecast', isl.name, isl.what));
    /* an OPEN RAIL on the deck's edge, where the record says the ship has one (islands.openRail,
       round 295). It is its own part, so an island's built top stays the top of its plating. */
    if (S.islands.openRail) {
      const rg = new THREE.Group(), up = new THREE.Vector3(0, 1, 0);
      const railMat = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
      const postH = 0.89, edge = 0.08, step = B * 0.22, Q = [path[0]];
      let acc = 0;
      for (let k = 1; k < path.length; k++) {
        acc += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
        if (acc >= step || k === path.length - 1) { Q.push(path[k]); acc = 0; }
      }
      const xLo = closedFwd ? xAt(u0) + 0.15 : -Infinity, xHi = closedAft ? xAt(u1) - 0.15 : Infinity;
      const at = q => ({ x: Math.max(xLo, Math.min(xHi, q.x)), y: top(q.u) - railM, z: Math.sign(q.z) * Math.max(0, Math.abs(q.z) - edge) });
      for (const q of Q) {
        const p = at(q), st = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.004, B * 0.004, postH, 5), railMat);
        st.position.set(p.x, p.y + postH / 2, p.z);
        rg.add(st);
      }
      for (let k = 0; k + 1 < Q.length; k++) {
        const a = at(Q[k]), b = at(Q[k + 1]), len = Math.hypot(b.x - a.x, b.z - a.z);
        if (len < 0.01) continue;
        const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
        for (const hf of [1 / 3, 2 / 3, 1]) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, len, 5), railMat);
          bar.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + postH * hf, (a.z + b.z) / 2);
          bar.quaternion.setFromUnitVectors(up, dir);
          rg.add(bar);
        }
      }
      group.add(tag(rg, 'islandRail', isl.name + ' rail'));
    }
  }
}
""")
s = sub1(s, "  rail:     { stage: 3, name: 'Rail',", "  islandRail: { stage: 3, name: 'Raised-deck rail',\n    what: 'The open rail round the edge of a raised deck: stanchions carrying three bars.' },\n  rail:     { stage: 3, name: 'Rail',")
open(R + 'web/js/hull.js', 'w', encoding='utf8').write(s)

# ---------------------------------------------------------------- the audit
t = open(R + 'audit-hulls.before.js', encoding='utf8').read()
t = sub1(t, "(H.wellM && H.houseAt) || ", '')
t = sub1(t, "liner's raised ends (wellM + houseAt). And", "liner's raised ends (hull.islands since r295). And")
t = sub1(t, "liner's raised end, the wellM + houseAt builder's business, and", "liner's raised end, which hull.islands carries where it is read, and")
t = sub1(t, "      for (const q of groups) if (!(IL || []).some(isl => isl && isl.name === q.name)) say(v.id, 'a forecast group named for no island'",
"""      /* ── A-ISLAND-SEATING (round 295, Titanic): AN ISLAND'S SIDE IS THE SHELL. Read off the meshes:
         (1) FLUSH: every vertex of the island above the sheer, clear of its two ends, stands on the
         shell's half-breadth at its own station within 0.05 m (her old wall stood 0.42 m inside it
         over an open slot); (2) NO CAPPING along it: no 'rail' vertex lies within 0.6 m of the sheer
         inside the island's span; (3) THE HOUSE AGAINST THE PLATE: where islands.plate carries
         houseCols, the Superstructure's built ends stand at those columns within 1.0 m, because a
         break read off a plate means nothing if the well's other side is somewhere else. */
      {
        const uAtX = x => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (loftDeckX(H, m) < x) a = m; else b = m; } return (a + b) / 2; };
        const P4 = new THREE.Vector3();
        for (const isl of (IL || [])) {
          const grp = groups.find(q => isl && q.name === isl.name); if (!grp) continue;
          const xa = loftDeckX(H, isl.u[0]), xb = loftDeckX(H, isl.u[1]);
          let worstInset = 0, atX = 0;
          grp.o.updateMatrixWorld(true);
          grp.o.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position;
            for (let i = 0; i < pa.count; i++) { P4.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
              if (P4.x < xa + 0.5 || P4.x > xb - 0.5) continue;
              const u = uAtX(P4.x); if (P4.y < H2.sheer(u) + 0.2) continue;
              const inset = Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1)[2]) - Math.abs(P4.z);
              if (inset > worstInset) { worstInset = inset; atX = P4.x; } } });
          if (worstInset > 0.05) say(v.id, "an island's side standing inside the shell", `${isl.name}: a vertex at x ${atX.toFixed(1)} stands ${worstInset.toFixed(2)} m inside the shell's half-breadth`);
          let capped = 0, capX = 0;
          g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (!pt || pt.key !== 'rail') return;
            o.updateMatrixWorld(true); const pa = o.geometry.attributes.position;
            for (let i = 0; i < pa.count; i++) { P4.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
              if (P4.x < xa + 0.5 || P4.x > xb - 0.5) continue;
              if (Math.abs(P4.y - H2.sheer(uAtX(P4.x))) < 0.6) { capped++; capX = P4.x; } } });
          if (capped) say(v.id, "a capping ridden along an island's side", `${isl.name}: ${capped} 'rail' vertices within 0.6 m of the sheer inside its span, one at x ${capX.toFixed(1)}`);
        }
        const PLH = H.islands.plate;
        if (PLH && Array.isArray(PLH.houseCols)) {
          const bbH = new THREE.Box3().makeEmpty();
          g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (pt && pt.key === 'superstructure' && pt.name === 'Superstructure') bbH.expandByObject(o); });
          const xH = loftDeckX(H, 0), wa = xH + (PLH.houseCols[0] - PLH.stemHeadCol) / PLH.pxPerMAlongHull, wb = xH + (PLH.houseCols[1] - PLH.stemHeadCol) / PLH.pxPerMAlongHull;
          if (bbH.isEmpty()) say(v.id, 'a house read off a plate and not built', 'islands.plate.houseCols is present and no Superstructure part exists');
          else if (Math.abs(bbH.min.x - wa) > 1.0 || Math.abs(bbH.max.x - wb) > 1.0)
            say(v.id, 'a house built off its plate', `built x ${bbH.min.x.toFixed(2)}..${bbH.max.x.toFixed(2)}, the plate's columns put it at ${wa.toFixed(2)}..${wb.toFixed(2)}`);
        }
      }
      for (const q of groups) if (!(IL || []).some(isl => isl && isl.name === q.name)) say(v.id, 'a forecast group named for no island'""")
open(R + 'web/audit-hulls.js', 'w', encoding='utf8').write(t)
print('applied')
