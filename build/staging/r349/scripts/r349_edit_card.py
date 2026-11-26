#!/usr/bin/env python3
"""r349: the 74's card and record say where her topmast head and topgallant hounds come from. usage: r349_edit_card.py <web dir>"""
import sys, pathlib, json
W = pathlib.Path(sys.argv[1])
def rep(p, old, new):
    s = p.read_text(); assert s.count(old) == 1, (p, old[:80]); p.write_text(s.replace(old, new))
rep(W / 'js' / 'shipwright.js',
    """The topmast and topgallant are Steel\\'s 3/5 and 3/10 of the whole mast, and each stands in the mast below it by a class doubling, ' + H.n + ' segments in all'""",
    """The topmast and topgallant are Steel\\'s 3/5 and 3/10 of the whole mast. The topmast\\'s head, from its crosstrees to its cap, is Steel\\'s 4 inches for every yard of the topmast, and 3 1/2 inches on the mizzen. Each mast\\'s heel stands 1.2 of those heads under the cap of the mast below it, ' + H.n + ' segments in all'""")
rep(W / 'js' / 'hull.js',
    """to every yard of the whole mast (r348)' : '');""",
    """to every yard of the whole mast (r348), and the topmast head, crosstrees to cap, Steel\\'s 4 in (3 1/2 on the mizzen) to every yard of the topmast (r349)' : '');""")
p = W / 'data' / 'vessels.json'
s = p.read_text()
OLD = "UNREAD, r324 (0y¹⁶⁶): each yard above the course is set atrip, at 0.88 of the section it hoists on, the class figure (Falconer 1769, ATRIP: 'The top-sails are said to be atrip, when they are hoisted up to the top-mast-heads'), and no plate of this hull's set sails has been read for it."
i0 = s.index('"id": "ship-of-the-line"'); i1 = s.index('"id": ', i0 + 10)
seg = s[i0:i1]
assert seg.count(OLD) == 3, seg.count(OLD)
parts = seg.split(OLD)
share = ['0.867', '0.867', '0.883']
NEW = lambda f: ("UNREAD, r324 (0y¹⁶⁶), r349: each yard above the course is set atrip (Falconer 1769, ATRIP: 'The top-sails are said to be atrip, when they are hoisted up to the top-mast-heads'). "
    "The topsail yard rides its topmast up to the heel of the topgallant mast, which stands in the topmast's head 1.2 of Steel's topmast heads under the cap, at " + f + " of the topmast. "
    "The topgallant yard stands at 0.88 of its section, the class figure. No plate of this hull's set sails has been read for either.")
seg2 = parts[0] + NEW(share[0]) + parts[1] + NEW(share[1]) + parts[2] + NEW(share[2]) + parts[3]
p.write_text(s[:i0] + seg2 + s[i1:])
import json; json.loads(p.read_text())
print('r349_edit_card: ok')
