import json, sys
p = sys.argv[1]
raw = open(p).read()
d = json.loads(raw)
V = {v['id']: v for v in d['vessels']}
fz = V['fluyt']['hull']['masts'][2]; cz = V['carrack']['hull']['masts'][2]
assert fz['rig'] == 'lateen' and cz['rig'] == 'lateen'
fz['lateenTopmast'] = {
  'topOfLower': 0.90, 'headOverTop': 0.586, 'topDiaOfTopHeight': 0.143,
  'boundHeadOverTop': [0.556, 0.620],
  'rows': {'deckFrom': 860, 'deck': 868, 'deckTo': 878, 'top': 588, 'head': 424, 'staffEnd': 349},
  'topWidthPx': 40,
  'plate': 'build/staging/r328/dl/hollar-flute.jpg', 'plateWidthPx': 1920, 'pxPerM': 37,
}
fz['mizzenTopsail'] = False
fz['mizzenTopsailProvenance'] = (
  "PLATE READ, r328 (0y¹⁶³): read off Wenceslaus Hollar, 'Navis Mercatoria Hollandica, vulgo VLIET' (etching, 1647; "
  "Commons File:Wenceslas Hollar - A Flute (State 2).jpg, read at the 1920 px thumbnail, about 37 px/m along the hull at "
  "the record's 32 m). The mizzen sets a lateen from a lower pole. At the pole's head is a small round top, 40 px wide. "
  "Above the top stands a topmast with shrouds to its head and a pennant staff over it, and it crosses no yard. So the "
  "fluyt sets no mizzen topsail, and she carries a top and a bare topmast. Rows on that copy: the top at 588; the "
  "topmast's head, where its shrouds meet, at 424; the staff's end at 349. The deck at the mizzen is hidden behind the "
  "poop rail. It is taken at 868 ± 10, between the row where the pole comes out of the rail (860) and the feet of the men "
  "standing on the poop (878). The topmast's head therefore stands 0.586 (0.556-0.620) of the top's height over the deck "
  "above the top. The top is 0.143 of that height across. The top stands at 0.90 of the lower mast, the height the r321 "
  "lateen read already keys the yard to; the plate cannot set it independently, because the deck is hidden. The pennant "
  "staff is not drawn. Hollar's plate is dated 1647 and the hull 1620."
)
cz['mizzenTopsail'] = False
cz['mizzenTopsailProvenance'] = (
  "PLATE READ, r328 (0y¹⁶³): read off Master W with the Key (Master W.A.), engraving of a three-masted ship, about 1475 "
  "(Commons File:Master W with the Key ship.jpg, 548 × 768 px, about 12 px/m at the hull). Her mizzen is a single pole "
  "about 3 px wide, standing on the aftercastle. It carries a lateen yard, and a pennant flies from its head. It has no "
  "top and no topmast, and crosses no square yard. At this scale a top under about 1 m across would not resolve. A pole "
  "with a top and a topsail over it would. The engraving is a quarter of a century earlier than the hull's 1500. The "
  "mizzen topsail is attested on large carracks by the 1540s (the Anthony Roll, 1546). A carrack dated after about 1530 "
  "would need a later plate."
)
indent = 2 if raw.startswith('{\n  "') else None
open(p, 'w').write(json.dumps(d, indent=indent, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
print('record edited')
