#!/usr/bin/env python3
"""r348: the 74's card says where her masthead comes from. usage: r348_edit_card.py <web dir>"""
import sys, pathlib
W = pathlib.Path(sys.argv[1])
def rep(p, old, new):
    s = p.read_text(); assert s.count(old) == 1, (p, old[:80]); p.write_text(s.replace(old, new))
rep(W / 'js' / 'shipwright.js',
    """: H.n > 1 && H.stepM > 0 ? 'no mast height is recorded. The lower mast is Steel\\'s length for this hull, heel to head, less the ' + H.stepM + ' m from the deck down to its step on the keelson; the masts above it are carried to the truck through class fractions, ' + H.n + ' segments in all'""",
    """: H.n > 1 && H.stepM > 0 ? 'no mast height is recorded. The lower mast is Steel\\'s length for this hull, heel to head, less the ' + H.stepM + ' m from the deck down to its step on the keelson. Its head, from the top to the cap, is Steel\\'s 5 inches for every yard of that whole length, and 4 inches on the mizzen. The topmast and topgallant are Steel\\'s 3/5 and 3/10 of the whole mast, and each stands in the mast below it by a class doubling, ' + H.n + ' segments in all'""")
rep(W / 'js' / 'hull.js',
    """+ ' m from the deck down to its step (hull.mastStep)' : '');""",
    """+ ' m from the deck down to its step (hull.mastStep), and its head, top to cap, is Steel\\'s 5 in (4 on the mizzen) to every yard of the whole mast (r348)' : '');""")
print('r348_edit_card: ok')
