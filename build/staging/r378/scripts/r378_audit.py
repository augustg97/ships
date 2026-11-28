import sys
p = sys.argv[1]; s = open(p).read()
blk = open(sys.argv[2]).read()
a = "    /* ── A-WALE-READ (round 337, the fluyt): A READ WALE IS ITS PLATE'S ROWS, ON ONE LINE, AND THE BUILT WALE."
assert s.count(a) == 1
s = s.replace(a, blk + a)
open(p, 'w').write(s); print('audit ok')
