import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a, s.count(a)); s = s.replace(a, b)
# castle covers: the wall's half-breadth stands at every height; the deck under it is H.deck
rep("""      v.hw.push(T.half((a + b) / 2));
    }
    v.from = 'castle'; v.name = T.end;""",
"""      v.hw.push(T.half((a + b) / 2));
      /* r354: a part's record per station, [half-breadth at the deck, at the cover, the deck's height] */
      (v.st = v.st || []).push([T.half((a + b) / 2), T.half((a + b) / 2), H.deck(cl((a + b) / 2))]);
    }
    v.from = 'castle'; v.name = T.end;""")
rep("""        v.hw.push(Math.max(shellHalf(u, H.deck(cl(u))), shellHalf(u, top(u) - iRail)) + 0.05);
      }""",
"""        v.hw.push(Math.max(shellHalf(u, H.deck(cl(u))), shellHalf(u, top(u) - iRail)) + 0.05);
        /* r354: for a part, the shell's half-breadth at the deck and at the island deck, and the deck's height */
        (v.st = v.st || []).push([shellHalf(u, H.deck(cl(u))) + 0.05, shellHalf(u, top(u) - iRail) + 0.05, H.deck(cl(u))]);
      }""")
rep("""    deckMat.uniforms.uCoverHW = { value: hw };
    deckMat.userData.covers = cv.map(c => ({ x0: c.x, x1: c.y, y: c.z, open: c.w, hw: c.hw, from: c.from, name: c.name }));""",
"""    deckMat.uniforms.uCoverHW = { value: hw };
    const st = []; for (let i = 0; i < 32; i++) st.push(new THREE.Vector3());
    cv.forEach((c, i) => c.st.forEach((q, k) => st[i * 8 + k].set(q[0], q[1], q[2])));
    deckMat.uniforms.uCoverSt = { value: st };   // r354: read by the parts under a cover (lightUnderCovers), not by the deck
    deckMat.userData.covers = cv.map(c => ({ x0: c.x, x1: c.y, y: c.z, open: c.w, hw: c.hw, st: c.st, from: c.from, name: c.name }));""")
# the part filter: above the deck's lowest height under the cover
rep("""  const reaches = bb => covers.some(c => bb.max.x > c.x0 && bb.min.x < c.x1 && bb.min.y < c.y - 0.02 &&
                                         bb.max.z > -hwMax(c) && bb.min.z < hwMax(c));""",
"""  const y0 = c => Math.min(...c.st.map(q => q[2])) - 0.05;
  const reaches = bb => covers.some(c => bb.max.x > c.x0 && bb.min.x < c.x1 && bb.min.y < c.y - 0.02 && bb.max.y > y0(c) &&
                                         bb.max.z > -hwMax(c) && bb.min.z < hwMax(c));""")
rep("const hwMax = c => Math.max(...c.hw);", "const hwMax = c => Math.max(...c.hw, ...c.st.map(q => Math.max(q[0], q[1])));")
rep("sh.uniforms.uCover = U.uCover; sh.uniforms.uCoverN = U.uCoverN; sh.uniforms.uCoverHW = U.uCoverHW;",
    "sh.uniforms.uCover = U.uCover; sh.uniforms.uCoverN = U.uCoverN; sh.uniforms.uCoverHW = U.uCoverHW; sh.uniforms.uCoverSt = U.uCoverSt;")
rep("sh.fragmentShader = coverGlsl() + 'varying", "sh.fragmentShader = '#define COVER_PARTS\\n' + coverGlsl() + 'varying")
rep("{ vec2 cvis = coverVis(vCovO, vCovLo);", "{ vec2 cvis = coverVisPart(vCovO, vCovLo);")
open(p, 'w').write(s); print('ok')
