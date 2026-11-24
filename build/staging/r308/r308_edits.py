#!/usr/bin/env python3
"""r308 (0y134): a gaff sail whose record says furlStow 'brailed' is stowed by its brails in the
FURLED build: the gaff stays aloft, the cloth lies along the mast, and the boom stays under it.
Usage: r308_edits.py <hull.js>"""
import sys
p = sys.argv[1]
s = open(p).read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'anchor found {c} times (want {n}): {old[:80]!r}'
    s = s.replace(old, new)

rep("""         both plates of her that show the main show it so (the record's gaffStowProvenance). */
      const BRAILED = mk.gaffStow === 'brailed';""",
"""         both plates of her that show the main show it so (the record's gaffStowProvenance).
         ── A SPANKER BRAILED OVER ITS BOOM (round 308, 0y¹³⁴) ──────────────────────────────
         furlStow: 'brailed' is a sail that is SET on its gaff and boom like any other, and is
         STOWED by its brails: the leech and foot are hauled in to the mast, the gaff stays aloft
         at its working angle, and the boom stays where it is, on its topping lift. Before r308
         every furled gaff sail was stowed the schooner's way, with the gaff lowered onto a roll
         along the boom. Endurance's mizzen is drawn this way because both plates of her mizzen
         in the ice show it so (the record's furlStowProvenance). BOOMLESS is the main's case;
         BRAILED is what the cloth and the gaff do in this build. */
      const BOOMLESS = mk.gaffStow === 'brailed';
      const BRAILED = BOOMLESS || (FURLED && mk.furlStow === 'brailed');""")

rep("""      if (!BRAILED) group.add(tag(bm2, 'yard', 'Boom',""",
    """      if (!BOOMLESS) group.add(tag(bm2, 'yard', 'Boom',""")
rep("""      if (liftMesh && !BRAILED) group.add(tag(liftMesh, 'toppingLift'));""",
    """      if (liftMesh && !BOOMLESS) group.add(tag(liftMesh, 'toppingLift'));""")

rep("""          card: 'This sail is loose-footed and is stowed by its brails, lines that haul the leech and foot in to the mast while the gaff stays aloft. She carries no boom on this mast. Hurley\\u2019s plates show it this way.' });""",
    """          card: BOOMLESS
            ? 'This sail is loose-footed and is stowed by its brails, lines that haul the leech and foot in to the mast while the gaff stays aloft. She carries no boom on this mast. Hurley\\u2019s plates show it this way.'
            : 'This sail is stowed by its brails, lines that haul the leech and foot in to the mast while the gaff stays aloft. The boom stays where it is, held up by its topping lift. Hurley\\u2019s plates of her in the ice show the sail stowed this way.' });""")

rep("""        if (br) { br.userData.brailed = { mast: mi, at: mk.at, foot:""",
    """        if (br) { br.userData.brailed = { mast: mi, at: mk.at, boom: !BOOMLESS, foot:""")

open(p, 'w').write(s)
print('ok', p)
