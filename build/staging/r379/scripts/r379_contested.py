import json
P='web/data/vessels.json'; s=open(P).read()
old='Steel\'s East India heights over the rabbet (Folio XLVIII, leaf 582) were not read, so heightsFt is absent."}'
assert s.count(old)==1
new=old[:-1]+', "contested": "The arms on the knee are far short of Steel\'s \'at least\' 6 ft 9 in (2.057 m): the lower cheek\'s is 0.24 m and the upper\'s 0.49 m. Her knee of the head is CLASS and stands high, under the beakhead; at the hawse line, which is itself CLASS (the lower tier\'s port line, hawse.height), it reaches only a few tenths of a metre forward of the stem, so each arm stops 5 cm inside its fore edge. On a ship of 1620 the hawse-holes may have stood higher, nearer the head; this column of Steel cannot say, and the hole height is not recorded for her."}'
s=s.replace(old,new); json.loads(s); open(P,'w').write(s); print('ok')
