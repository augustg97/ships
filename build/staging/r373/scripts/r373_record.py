# r373: the 74's cathead, Steel Folio XLVI (leaf 577), 74-gun column
import sys, json
p = sys.argv[1]; raw = open(p).read(); D = json.loads(raw)
v = [x for x in D['vessels'] if x.get('id') == 'ship-of-the-line'][0]; h = v['hull']
assert 'cathead' not in h
FT, IN = 0.3048, 0.0254
C = {"sidedM": round(1 * FT + 5.5 * IN, 4), "deepM": round(1 * FT + 4.5 * IN, 4), "stivePerFt": round(6 / 12, 4),
     "outM": round(8 * FT + 6 * IN, 4), "inM": round(8 * FT + 6 * IN, 4), "plan": "square", "seat": "islandDeck",
     "sheaves": 3, "sheaveDiaM": round(1 * FT + 3 * IN, 4), "sheaveThickM": round(2.25 * IN, 4),
     "provenance": ("RECORDED, r373. Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org elementspractice00stee), "
       "Folio XLVI, Forecastle continued, the 74-gun column, read off the page scan (BookReader leaf 577, build/staging/r373/dl/leaf577.jpg, "
       "3013 px across the folio, about 60 px to a table row): CATHEADS fore and aft 1 ft 5 1/2 in, deep 1 ft 4 1/2 in (rows U, X); 'to stand square "
       "with the bow, and to stive upwards in every foot' 0 ft 6 in (row Y); length without board ('or sufficient to swing the anchor clear of the bow') "
       "8 ft 6 in, and within board from the outside of the timber 8 ft 6 in (rows Z, A); three sheaves in the outer end, 1 ft 3 in diameter and "
       "2 1/4 in thick (rows C-E). The seat is Steel's Book II, the sheer draught (djvu text line 15874): the cathead 'to stive upwards ... observing "
       "that the lower part comes on the plank of the deck at the side', the forecastle deck, Steel's glossary placing the catheads 'at the fore part "
       "of the forecastle'. The model seats the beam's underside on the forecastle deck (islandDeck) where its axis crosses the side at the sheer, "
       "and turns it square to the side's plan tangent there. NOT DRAWN: the knee at the aftside of the cathead (rows F-H, sided 7 1/4 in, arms 4 ft 9 in "
       "and 3 ft 6 in), which lies inboard under the forecastle; the supporter under the beam is drawn as a CLASS block, Steel gives no table row for it.")}
k = raw.index('"channels": ', raw.index('"id": "ship-of-the-line"'))
raw = raw[:k] + '"cathead": ' + json.dumps(C, ensure_ascii=False) + ', ' + raw[k:]
D2 = json.loads(raw)
assert [x for x in D2['vessels'] if x.get('id') == 'ship-of-the-line'][0]['hull']['cathead']['outM'] == C['outM']
open(p, 'w').write(raw)
print('ok', {k2: C[k2] for k2 in C if k2 != 'provenance'})
