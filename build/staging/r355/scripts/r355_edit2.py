import sys
# usage: r355_edit2.py <web dir with r355_edit.py applied> <COVER.chunk.glsl>
p = sys.argv[1] + '/js/hull.js'; q = sys.argv[2]
s = open(p).read(); gl = open(q).read()
def rep(a, b, n=1, which='s'):
    global s, gl
    t = s if which == 's' else gl
    c = t.count(a); assert c == n, (which, c, a[:90])
    t = t.replace(a, b)
    if which == 's': s = t
    else: gl = t

# the moulding is a cylinder along z: leaning it about z turned it on the face (first render)
rep("""      rail.position.set(faceX(zm) + B * 0.004, zm, 0);
      rail.rotation.z = -faceLean(zm);
""", """      rail.position.set(faceX(zm) + B * 0.004, zm, 0);
""")

# the closed end's line: the skin's own end, at the cover's height and leaning with height
rep("""const COVER_SIDE_M = 0.25;""", """const COVER_SIDE_M = 0.25;
/* ⚠ A CLOSED END IS THE SKIN'S END, AND THE SKIN'S END LEANS (round 355). r354 stopped a part's span
   COVER_SIDE_M short of x1 (or x0), a vertical plane at the deck line's end. The 74's stern rakes 2 m
   aft from the waterline to the sheer, so once her stern lights were stood on the face at their own
   heights (r355) the upper tier counted 0.3–0.6 m in under the quarterdeck and its top went dark.
   Each cover with a closed end now records that end as a line: endOff, the skin's end x at the
   cover's height less the cover's own end x; endLean, its dx/dy between the deck and the cover. */
function coverEndLine(S, H, v, uEnd, yDeck) {
  const xe = y => {
    if (y >= H.sheer(uEnd)) return surfacePoint(S, H, uEnd, 1.0)[0];
    let a = 0, b = 1;
    for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (surfacePoint(S, H, uEnd, m)[1] < y) a = m; else b = m; }
    return surfacePoint(S, H, uEnd, (a + b) / 2)[0];
  };
  const xc = xe(v.z), xd = xe(yDeck);
  v.endOff = xc - (v.w < 0 ? v.y : v.x);
  v.endLean = Math.abs(v.z - yDeck) > 0.1 ? (xc - xd) / (v.z - yDeck) : 0;
}""")
rep("""    v.endIn = COVER_SIDE_M;   // r354: the castle closes on the hull's own end, a wall a part's span stops short of
""", """    v.endIn = COVER_SIDE_M;   // r354: the castle closes on the hull's own end, a wall a part's span stops short of
    coverEndLine(S, H, v, T.end === 'aft' ? 1 : 0, H.deck(T.end === 'aft' ? 0.999 : 0.001));   // r355: and that end leans
""")
rep("""      v.endIn = ends.length === 2 ? 0 : COVER_SIDE_M;
""", """      v.endIn = ends.length === 2 ? 0 : COVER_SIDE_M;
      if (ends.length === 2) { v.endOff = 0; v.endLean = 0; }
      else coverEndLine(S, H, v, w < 0 ? 1 : 0, H.deck(w < 0 ? 0.999 : 0.001));   // r355: the hull's end, leaning
""")
rep("""    deckMat.uniforms.uCoverEnd = { value: [0, 1, 2, 3].map(i => cv[i] ? cv[i].endIn || 0 : 0) };""",
    """    deckMat.uniforms.uCoverEnd = { value: [0, 1, 2, 3].map(i => cv[i] ? new THREE.Vector3(cv[i].endIn || 0, cv[i].endOff || 0, cv[i].endLean || 0) : new THREE.Vector3()) };""")
rep("""endIn: c.endIn || 0, from: c.from""", """endIn: c.endIn || 0, endOff: c.endOff || 0, endLean: c.endLean || 0, from: c.from""")
open(p, 'w').write(s)

rep("""uniform float uCoverEnd[4];""", """uniform vec3 uCoverEnd[4];""", which='g')
rep("""    if (C.w < 0.0 ? o.x > C.y - uCoverEnd[i] : o.x < C.x + uCoverEnd[i]) continue;""",
"""    /* r355: the closed end is the skin's end, a line leaning with height: (inset, its x at the cover's height
       less the cover's end x, dx/dy) */
    vec3 E = uCoverEnd[i];
    float xEnd = (C.w < 0.0 ? C.y : C.x) + E.y + (o.y - C.z) * E.z;
    if (C.w < 0.0 ? o.x > xEnd - E.x : o.x < xEnd + E.x) continue;""", which='g')
rep("""   the far end is the midpoint of an island open at both ends) */""",
    """   the far end is the midpoint of an island open at both ends); since r355 a vec3, the end being a leaning line */""", which='g')
open(q, 'w').write(gl)
print('ok')
