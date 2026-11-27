# r358 byte trim: the island builders read H.islandDeck directly (every u they pass lies in the island's span)
import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
a = "const iDeck = u => top(u) - H.islandRailM(Math.min(u1, Math.max(u0, u)));"
assert s.count(a) == 2; s = s.replace(a, "const iDeck = H.islandDeck;")
open(p, 'w').write(s); print('ok')
