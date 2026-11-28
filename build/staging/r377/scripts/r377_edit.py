import sys
W = sys.argv[1]
p = W + '/js/hull.js'
s = open(p).read()
blk = open('/Users/augustgweon/Ships/build/staging/r377/scripts/cheeks_block.js').read()
anchor = """    rails.push(side);
  }

  if (grade >= 2) {"""
assert s.count(anchor) == 1
s = s.replace(anchor, """    rails.push(side);
  }
""" + blk + """
  if (grade >= 2) {""")
card_anchor = "  hawse:    { stage: 3, name: 'Hawse-holes',"
assert s.count(card_anchor) == 1
card = """  headCheek: { stage: 3, name: 'Cheeks of the head',
              what: 'The two knees on each side of the bow that bind the knee of the head to the ship. Each has '
                  + 'one arm along the side and one along the knee, and the hawse-holes stand between them. Steel '
                  + '(1822) gives a 74 two a side, 2 ft 6 in apart at the stem, with arms 11 ft 9 in long on the side '
                  + 'and at least 6 ft 3 in on the knee. The lower cheek is 1 ft deep at its after end and 7 in at its '
                  + 'fore end, and stands 1 ft 2 in off the side, thinning to 5 in forward. For the 74, Steel lets '
                  + 'the hawse-holes fix the height of the lower cheek, so here the holes are centred in the gap with '
                  + '5 in of solid wood, the bolster, above and below each. The rise of the arms on the knee is a '
                  + 'class shape, because Steel\\'s plate of the head is not online.' },
"""
s = s.replace(card_anchor, card + card_anchor)
open(p, 'w').write(s)
print('hull.js ok')
