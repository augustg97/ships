import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:80], s.count(a)); s = s.replace(a, b)
rep("""      (v.st = v.st || []).push([T.half((a + b) / 2), T.half((a + b) / 2), H.deck(cl((a + b) / 2))]);""",
"""      (v.st = v.st || []).push([T.half((a + b) / 2) - COVER_SIDE_M, T.half((a + b) / 2) - COVER_SIDE_M, H.deck(cl((a + b) / 2))]);""")
rep("""        (v.st = v.st || []).push([shellHalf(u, H.deck(cl(u))) + 0.05, shellHalf(u, top(u) - iRail) + 0.05, H.deck(cl(u))]);""",
"""        (v.st = v.st || []).push([shellHalf(u, H.deck(cl(u))) - COVER_SIDE_M, shellHalf(u, top(u) - iRail) - COVER_SIDE_M, H.deck(cl(u))]);""")
rep("""/* ⚠ A TIMBER ISLAND OPEN ON THE WAIST COVERS THE DECK UNDER IT (round 353).""",
"""/* ⚠ THE SPACE A COVER ROOFS ENDS AT THE INNER FACE OF THE SIDE (round 354). The model draws a ship's side as one
   skin with no thickness, and a part's record (v.st) is read by every fragment of every part under the cover. Taken
   at the skin (plus r353's 0.05 m), it blacked out the faces of the quarter galleries and the inboard edge of the
   mizzen channel where they meet the side (r354/wit/crop-stern.png), which stand outside it. A ship's side at the
   upper deck is frame and two skins of plank; no record gives the 74's or the carrack's, so this is a CLASS default,
   named here and in HANDOFF r354: a fitting within it of the skin takes the open light. */
const COVER_SIDE_M = 0.25;
/* ⚠ A TIMBER ISLAND OPEN ON THE WAIST COVERS THE DECK UNDER IT (round 353).""")
open(p, 'w').write(s); print('ok')
