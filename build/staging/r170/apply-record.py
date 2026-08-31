#!/usr/bin/env python3
"""r170: the three textual record edits, applied byte-precisely (no JSON re-dump)."""
import sys

P = "web/data/vessels.json"
raw = open(P, encoding="utf-8").read()

edits = [
    # 1. the bay becomes a record field
    ('     "maku": true,\n',
     '     "maku": true,\n     "makuBayM": 0.7,\n'),
    # 2. the card row states the border's place and cut
    ('"white cloth hung from the yagura\'s deck edge over the oar band, under a dark '
     'scalloped hem — the dress the Busan scroll draws on hull after hull, with no '
     'plank belt anywhere at this band. The ro work out from under it. Depth follows '
     'the band itself; the scallop is read off the scroll at ~16 px/m (derived)"',
     '"white cloth hung from the yagura\'s deck edge over the oar band, under a dark '
     'scalloped hem at its head — tangent scallops on a 0.7 m bay, cut from one strip, '
     'as the scroll hangs them on hull after hull, with no plank belt anywhere at this '
     'band. The ro work out from under it. Depth follows the band itself; the bay is '
     'read off the scroll at ~16 px/m, the tangency off the same scroll\'s '
     'better-resolved atakebune (derived)"'),
    # 3. the provenance carries the border's own reading and its bound
    ('and the ~0.7 m scallop bay is read off the scroll at its ~16 px/m (a ~25 m hull '
     'drawn ~400 px long), good to the nearest half metre, no finer. Whether',
     'and the ~0.7 m scallop bay (makuBayM) is read off the scroll at its ~16 px/m '
     '(a ~25 m hull drawn ~400 px long), good to the nearest half metre, no finer. '
     'The BORDER\'s place and cut are the plate\'s own: on every hull that resolves '
     'it — the atakebune above all, the same dress at better scale — the scallops '
     'hang from the band\'s HEAD, tangent, cut from one strip, white cusps rising '
     'between them to the hanging line; until round 170 the drawn valance hung '
     'spaced discs off the band\'s FOOT, the record\'s own sentence inverted. The '
     'drawn valance is one strip a side, contiguous semicircles of half the recorded '
     'bay; its depth (a semicircle\'s, half the bay) is a class default — the '
     'scroll\'s stretch bars a finer read. Whether'),
]

for old, new in edits:
    n = raw.count(old)
    if n != 1:
        print(f"ABORT: pattern occurs {n} times (need exactly 1):\n{old[:90]}...")
        sys.exit(1)
    raw = raw.replace(old, new)

open(P, "w", encoding="utf-8").write(raw)
import json
json.load(open(P))  # still valid JSON
print("applied 3 edits; JSON parses")
