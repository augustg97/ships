import sys
p = sys.argv[1]; s = open(p).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]; s = s.replace(old, new)
rep("""                  + 'arm\\'s length. On the 74 the forecastle stands higher than the cathead, so the point is laid '
                  + 'instead on the bill-board, a board on the side above the fore channel. Steel (1822) puts '""",
"""                  + 'arm\\'s length. On the 74 the point rests on the forecastle\\'s rail, at the head of the '
                  + 'bill-board, a board fixed to the side above the fore channel. Steel (1822) puts '""")
rep("""                  + 'the hawse-holes. An iron ship\\'s cathead is an iron beam, and on a ship with '
                  + 'a forecastle it stands on the forecastle deck.' },""",
"""                  + 'the hawse-holes. An iron ship\\'s cathead is an iron beam, and on a ship with '
                  + 'a forecastle it stands on the forecastle deck. Steel (1822) tabulates the cathead '
                  + 'for every rate. The 74\\'s is 0.44 m by 0.42 m in section and reaches 2.6 m out from '
                  + 'the side. It rises 6 inches in every foot of its length, and its underside rests on '
                  + 'the forecastle deck where it passes through the side.' },""")
open(p + '.tmp', 'w').write(s); print('ok')
