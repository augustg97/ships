import sys
p = sys.argv[1]; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]; s = s.replace(a, b)
rep("""      else if (part.planking && part.sternlight.x[1] < part.planking.x[1])
        say(v.id, 'stern furniture buried in the hull',""",
"""      /* r355: the planking's aft-most x is the TAFFRAIL's on a raked stern (the 74's face runs 2 m aft from the
         waterline to the sheer), so a light standing on the face at its own height read as buried. Whether the lights
         stand on the face is A-STERN-ON-FACE's test, at each vertex's own height; this one now catches only lights
         forward of the face at the waterline, which no raked face can explain. */
      else if (part.planking && part.sternlight.x[1] < SHIPS_HULL.surfacePoint(H, SHIPS_HULL.hullSurface(H), 1, 0.62)[0])
        say(v.id, 'stern furniture buried in the hull',""")
rep("""          else worst = Math.max(worst, d > 0.35 ? d - 0.35 : d < -0.05 ? -0.05 - d : 0); }""",
"""          else { const fwd = key === 'transom' ? 0.12 : 0.05;   // a moulding is a rod let half into the face
            worst = Math.max(worst, d > 0.35 ? d - 0.35 : d < -fwd ? -fwd - d : 0); } }""")
open(p, 'w').write(s); print('ok')
