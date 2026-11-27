# r358 bytes: two record keys no code or audit reads move to provenance (the build splits *Provenance out of first
# paint); the 74's island 'what' lines are cut back to r343's length with Steel's figures rounded
import sys, json
p = sys.argv[1]; raw = open(p).read()
for k in ('pxSign', 'fartherFeet'):
    n = raw.count('"%s":' % k); assert n >= 1, k
    raw = raw.replace('"%s":' % k, '"%sProvenance":' % k); print(k, n)
for a, b in (("Quarterdeck: a deck over the after part of the ship, 2.16 m over the upper deck at its fore end and 2.21 m at the stern, behind a barricade 1.3 m over it",
              "Quarterdeck: a deck over the after part of the ship, 2.2 m over the upper deck, behind a 1.3 m barricade"),
             ("Forecastle: a deck over the bow, 2.08 m over the upper deck, behind a barricade 1.1 m over it",
              "Forecastle: a deck over the bow, 2.1 m over the upper deck, behind a 1.1 m barricade")):
    assert raw.count(a) == 1, a; raw = raw.replace(a, b)
json.loads(raw); open(p, 'w').write(raw); print('ok')
