import sys
d = sys.argv[1]; hp = sys.argv[2]
s = open(hp).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:90]; s = s.replace(a, b)
rep("""    v.from = 'castle'; v.name = T.end;""", """    v.endIn = COVER_SIDE_M;   // r354: the castle closes on the hull's own end, a wall a part's span stops short of
    v.from = 'castle'; v.name = T.end;""")
rep("""      v.from = 'island'; v.name = isl.name;""", """      /* r354: the end away from the opening is the hull's own end (a wall a part's span stops short of), or, on an
         island open at both ends, the midpoint where its two covers meet, which is no wall */
      v.endIn = ends.length === 2 ? 0 : COVER_SIDE_M;
      v.from = 'island'; v.name = isl.name;""")
rep("""    deckMat.uniforms.uCoverSt = { value: st };""", """    deckMat.uniforms.uCoverSt = { value: st };
    deckMat.uniforms.uCoverEnd = { value: [0, 1, 2, 3].map(i => cv[i] ? cv[i].endIn || 0 : 0) };""")
rep("""hw: c.hw, st: c.st, from: c.from""", """hw: c.hw, st: c.st, endIn: c.endIn || 0, from: c.from""")
rep("""sh.uniforms.uCoverSt = U.uCoverSt;""", """sh.uniforms.uCoverSt = U.uCoverSt; sh.uniforms.uCoverEnd = U.uCoverEnd;""")
open(hp, 'w').write(s)
c = open(d).read()
def repc(a, b):
    global c
    assert c.count(a) == 1, a[:90]; c = c.replace(a, b)
repc("""uniform vec3 uCoverSt[32];
vec2 coverVisPart(vec3 o, vec3 lo) {""", """uniform vec3 uCoverSt[32];
/* and how far short of the closed end (the end away from the opening) a part's span stops: the hull's own end is a
   wall as the side is, so a sternpost or a rudder head proud of the stern stands in the open (COVER_SIDE_M, 0 where
   the far end is the midpoint of an island open at both ends) */
uniform float uCoverEnd[4];
vec2 coverVisPart(vec3 o, vec3 lo) {""")
repc("""    if (o.x < C.x || o.x > C.y || o.y > C.z - 0.05) continue;
    float t = clamp((o.x - C.x) / max(C.y - C.x, 1e-3), 0.0, 1.0) * 7.0;
    vec3 st""", """    if (o.x < C.x || o.x > C.y || o.y > C.z - 0.05) continue;
    if (C.w < 0.0 ? o.x > C.y - uCoverEnd[i] : o.x < C.x + uCoverEnd[i]) continue;
    float t = clamp((o.x - C.x) / max(C.y - C.x, 1e-3), 0.0, 1.0) * 7.0;
    vec3 st""")
open(d, 'w').write(c); print('ok')
