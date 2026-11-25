import sys
src, dst, which = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src).read()
V = {
 'HOISTED': ("if (FURLED && hoist && typeof hoist === 'object' && hoist.tie >= 1 && !readHere) {", "if (false && FURLED && hoist && typeof hoist === 'object' && hoist.tie >= 1 && !readHere) {"),
 'THROUGHCAP': ("const yl = floor + slingsD / 2 + 0.02;", "const yl = floor - 0.30;"),
 'SETLEAK': ("if (FURLED && hoist && typeof hoist === 'object' && hoist.tie >= 1 && !readHere) {", "if (hoist && typeof hoist === 'object' && hoist.tie >= 1 && !readHere) {"),
}
a, b = V[which]; assert s.count(a) == 1, which; open(dst, 'w').write(s.replace(a, b)); print(which, 'ok')
