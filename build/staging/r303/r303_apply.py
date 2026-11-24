import json, sys
R='/Users/augustgweon/Ships/'
def rep(path, old, new, n=1):
    s=open(path).read(); c=s.count(old)
    assert c==n, (path, c, old[:80]); open(path,'w').write(s.replace(old,new))
HJ=R+'web/js/hull.js'
# A. hullSurface: the wells' bulwark top
rep(HJ, """  /* tumblehome grows above the waterline; quoted as the fraction of half-beam lost at deck */""",
"""  /* ── THE WELLS' BULWARKS (hull.islands.wells, round 303, Titanic) ────────────────────
     Between a raised end and the house a liner's deck is a WELL, and the side plating does not
     stop at it: it carries on up as a bulwark, which the 1911 side plan draws as a heavy solid
     line 0.9 to 1.8 m over the deck. The model ended the shell at the deck there and set its
     capping on the deck edge, so the after well's side stood a metre under the plan. The record
     reads each well's bulwark top over the water at both ends (topM, linear between them like an
     island's), and buildIslands carries the shell up to it. null anywhere the record has no well,
     so every other hull is byte-identical. */
  const wellTop = u => {
    const W = S.islands && S.islands.wells;
    if (!W) return null;
    for (const w of W)
      if (u >= w.u[0] && u <= w.u[1]) {
        const t = (u - w.u[0]) / Math.max(1e-6, w.u[1] - w.u[0]);
        return w.topM[0] + (w.topM[1] - w.topM[0]) * t;
      }
    return null;
  };
  /* tumblehome grows above the waterline; quoted as the fraction of half-beam lost at deck */""")
rep(HJ, "return { nExp, halfB, wl, keel, sheer, deck, tumble, rake, stepTop, islandTop, section:",
        "return { nExp, halfB, wl, keel, sheer, deck, tumble, rake, stepTop, islandTop, wellTop, section:")
# B. the capping rides the bulwark's top in a well
rep(HJ, """  const railAtU = u => H.sheer(u), railHalfAtU = u => Math.abs(surfacePoint(S, H, u, 1)[2]);""",
"""  /* r303: in a recorded well the skin goes on up as a bulwark (hull.islands.wells), and the
     capping is its top: the section's upper face stands at the read line */
  const capH = S.capM ? S.capM : B * 0.016 * 1.6;
  const railAtU = u => { const w = H.wellTop(u); return w !== null ? w - capH : H.sheer(u); };
  const railHalfAtU = u => Math.abs(surfacePoint(S, H, u, 1)[2]);""")
# C. buildIslands: the wells' bulwark plating
rep(HJ, """      group.add(tag(rg, 'islandRail', isl.name + ' rail'));
    }
  }
}""", """      group.add(tag(rg, 'islandRail', isl.name + ' rail'));
    }
  }
  /* ── THE WELLS' BULWARKS (round 303): the shell carried up from the deck to the read top along
     each well, both sides, flush with the skin. Its ends meet the island's wall and the house's
     shell tier edge to edge, so no two faces share a plane. The capping on top is the rail's
     (buildFittings rides it at wellTop). */
  for (const w of (S.islands.wells || [])) {
    const N = Math.max(4, Math.round((w.u[1] - w.u[0]) * L / 1.6));
    const g = new THREE.Group();
    for (const sgn of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= N; k++) {
        const u = w.u[0] + (w.u[1] - w.u[0]) * (sgn > 0 ? k : N - k) / N;
        const x = xAt(u), z = sgn * halfAt(u);
        pts.push(x, H.sheer(u) - 0.02, z, x, H.wellTop(u), z);
      }
      g.add(strip(pts, wallMat));
    }
    group.add(tag(g, 'wellBulwark', w.name + ' bulwark'));
  }
}""")
# D. the part
rep(HJ, """  islandRail: { stage: 3, name: 'Raised-deck rail',""",
"""  wellBulwark: { stage: 3, name: 'Well-deck bulwark',
    what: 'The side plating carried on up past a well deck, between a raised end and the house. '
        + 'It holds a breaking sea off the deck and stands about chest high on the people there.' },
  islandRail: { stage: 3, name: 'Raised-deck rail',""")
# E. the card phrase
rep(R+'web/js/shipwright.js', "  paddlebox: 'paddle boxes',\n};", "  paddlebox: 'paddle boxes', wellBulwark: 'bulwarks along the well decks',\n};")
# F. the record
VJ=R+'web/data/vessels.json'
d=json.load(open(VJ)); h=next(x for x in d['vessels'] if x['id']=='titanic')['hull']
W=json.load(open(R+'build/staging/r303/wells.json'))
h['islands']['wells']=W
h['islands']['wellsProvenance']=("READ, r303, off the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 "
 "(build/staging/r295/plates/side-plan-1911.png, 13.03 px/m). The plan draws each well's bulwark top as a heavy solid line, 4 to 5 px thick, "
 "running from the raised end's break to the house. Each line was traced every 3 columns as the centre of its dark run "
 "(the forward well on columns 2930 to 3090, 53 points; the after well on 565 to 760, 66 points; build/staging/r303/r303_trace.py), "
 "fitted as a straight line in the column (rms 0.32 and 0.35 px, about 0.03 m), and read at each well's two ends over r297's tilted waterline. "
 "The ends are the forecastle's and poop's recorded breaks (islands.list) and the house's stations (houseAt), placed on the plan through the loft's deck-level line "
 "(r303_read.py). The line's own thickness, 0.3 to 0.4 m, bounds where in it the plating's top edge lies; the centre is recorded. "
 "The forward well's top falls from 11.84 m at the forecastle break to 11.40 m at the house, the after well's rises from 11.29 m at the house to 11.58 m at the poop. "
 "The plan also draws rectangles hanging under the line in both wells, which may be freeing ports or openings in the bulwark; the model does not draw them.")
open(VJ,'w',encoding='utf8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('applied')
