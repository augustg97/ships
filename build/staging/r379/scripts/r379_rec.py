import json,sys
P='web/data/vessels.json'; s=open(P).read()
anchor='"height": "lowerTierPort", "era": "EXTENDED: Steel\'s table is of about 1805 and this hull is of 1620.'
assert s.count(anchor)==1, 'hawse anchor'
s=s.replace(anchor,'"height": "betweenCheeks", "era": "EXTENDED: Steel\'s table is of about 1805 and this hull is of 1620.')
old='The HEIGHT is CLASS, the lower tier\'s port line at the hole\'s own station, as on the 74."}, "steering": "stern",'
assert s.count(old)==1, 'prov anchor'
ck={"stemGapM":0.762,"armSideM":3.2004,"armKneeM":2.0574,
 "lower":{"sidedM":[0.254,0.1524],"mouldedM":[0.3048,0.1143]},
 "upper":{"sidedM":[0.2667,0.1397],"mouldedM":[0.2921,0.1080]},
 "number":"two or three","boltsEach":9,"boltDiaM":0.0318,"laidFrom":"hawse","sourceYear":1805,
 "kneeRisePerM":0.12,"kneeCurve":0.06,
 "kneeRiseFrom":"CLASS, as on the 74: the rise of the arms on the knee of the head (kneeRisePerM, kneeCurve) continues the bow's sheer, 0.12 m per m, and adds a lift of 0.06 m per m squared. Steel's Plan of the Head (Plate 38) would give it, and it is not online (r375).",
 "era":"EXTENDED: Steel's table is of about 1805 and this hull is of 1620. Her hawse record is carried back the same way (hawse.era). The cheeks' lengths and sections are Steel's East India figures; whether a 1620 Indiaman's head was bound to her bow by cheeks of these proportions is not recorded here.",
 "provenance":"RECORDED, r379, ERA-EXTENDED (see era). Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org elementspractice00stee), Folio XLIX, the East India Ships column of 1257 tons, the column her hawse record uses (BookReader leaf 584, build/staging/r379/dl/leaf584.jpg, 3013 px across, about 60 px to a table row; crop l584-HX-ei.png). The row letters are leaf 583's (r377): CHEEKS in number on each side 'two or three', printed across the 1257- and 1000-ton columns (H); distance between the cheeks on a square at stem 2 ft 6 in (I); arms of the cheeks, length on the side 10 ft 6 in (K), length on the knee at least 6 ft 9 in (L); lower cheek sided at the after end 0 ft 10 in (M), fore end 0 ft 6 in (N), moulded along the side 1 ft 0 in (O), fore end 0 ft 4 1/2 in (P); upper cheek sided at the after end 0 ft 10 1/2 in (Q), fore end 0 ft 5 1/2 in (R), moulded along the side 0 ft 11 1/2 in (S), at fore end 0 ft 4 1/4 in (T); bolted each with nine bolts (U), 1 1/4 in (X). Row Y gives this column one pair of iron cheeks of 4 cwt 1 qr; they are not drawn. The model draws two cheeks a side, the lower figure of Steel's 'two or three'. As on the 74, the gap is centred at the stem on the lower tier's port line (the holes' CLASS line) and each hawse-hole stands in the middle of the gap at its own station (cheekLines). Steel's East India heights over the rabbet (Folio XLVIII, leaf 582) were not read, so heightsFt is absent."}
ins=old[:-len("\"}, \"steering\": \"stern\",")]+" Since r379 the cheeks are drawn (hull.cheeks) and each hole stands in the middle of the gap between them at its own station (cheekLines), as on the 74.\"}, \"cheeks\": "+json.dumps(ck, ensure_ascii=False)+", \"steering\": \"stern\","
s=s.replace(old,ins)
json.loads(s)
open(P,'w').write(s); print('ok')
