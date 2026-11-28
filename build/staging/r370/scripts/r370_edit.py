import sys, re
P = sys.argv[1] if len(sys.argv) > 1 else 'web/js/hull.js'
src = open(P).read()
J = 'build/staging/r370/scripts/js/'
def rep(old, new, n=1):
    global src
    c = src.count(old)
    assert c == n, (old[:80], c)
    src = src.replace(old, new)
# 1. the solver
a = src.index('function anchorStowOf(S, H, f, cat) {')
b = src.index('\nfunction buildAnchor(S, group, mats) {')
src = src[:a] + open(J + 'stow.js').read() + src[b:]
# 2. buildAnchor draws the lining, bolster and bill-board
rep("""        rule: 'Steel: the bill swept from the cathead at the anchor\\'s length to the bill, onto the side under the fore channel' };""",
"""        board: st.board || null,
        rule: st.board ? 'Steel: the bill swept from the cathead at the anchor\\'s length to the bill, onto the bill-board over the fore channel; the crown against the lining under it'
                       : 'Steel: the bill swept from the cathead at the anchor\\'s length to the bill, onto the side under the fore channel' };""")
rep("""      group.add(tag(A, 'anchor'));
      continue;""",
"""      group.add(tag(A, 'anchor'));
      const LN = anchorLiningOf(S, H, f, st);
      if (LN) {
        const wood = mats.woodDark || iron;
        const lm = new THREE.Mesh(sideSlabGeometry(LN.lining, LN.liningT, LN.sgn), wood);
        lm.userData.lining = { yBot: LN.yBot, yTop: LN.yTop, xAft: LN.xAft, mid: LN.mid, W: LN.W, R: LN.R, ports: LN.ports,
          ring: st.ring.toArray().map(q => +q.toFixed(3)), bill: st.bill.toArray().map(q => +q.toFixed(3)),
          rule: 'Steel 1822 Book II: the middle on the bill\\'s curve from the cathead, the after side square down from the channel, from the bolster (the channel-wale\\'s upper side) to the channel; breadth 1.25 palms (CLASS), stopped 5 cm short of a port' };
        group.add(tag(lm, 'anchorLining'));
        group.add(tag(new THREE.Mesh(sideSlabGeometry(LN.bolster, LN.bolsterT, LN.sgn), wood), 'anchorLining', 'Bolster'));
        const bb = new THREE.Mesh(sideSlabGeometry(LN.board, LN.boardT, LN.sgn), wood);
        bb.userData.billBoard = { x: +st.board.x.toFixed(3), yLo: +st.board.yLo.toFixed(3), yHi: +st.board.yHi.toFixed(3), t: st.board.t };
        group.add(tag(bb, 'anchorLining', 'Bill-board'));
      }
      continue;""")
# 3. the part's card
rep("""  cathead:  { stage: 3, name: 'Cathead',""",
"""  anchorLining: { stage: 3, name: 'Anchor-lining',
              what: 'Planking on the side under the fore channel. When the anchor is fished, its inner arm '
                  + 'is hauled up the side and the point drags over this planking. Steel (1822) lays the '
                  + 'lining out from the anchor itself: its middle lies on the curve the point makes as the '
                  + 'anchor swings from the cathead, and its after side runs straight down from the channel. '
                  + 'It stands on an oak bolster bolted to the side, and the bolster runs two feet further '
                  + 'forward so that a man can stand on it while the anchor is fished. Above the channel is '
                  + 'the bill-board, a board on the side running from the channel up to the top of the side. '
                  + 'The point of the stowed anchor rests on it.' },
  cathead:  { stage: 3, name: 'Cathead',""")
rep("""                  + 'At sea the ring hangs from the cathead, and the inner arm\\'s point rests against '
                  + 'the side under the fore channel, where Steel puts a lining of plank to take it.' },""",
"""                  + 'At sea the ring hangs from the cathead and the anchor is fished: the inner arm is '
                  + 'hauled up the side until its point can be laid on the bill-board, a board on the side '
                  + 'above the fore channel. Steel (1822) puts a lining of plank on the side under the '
                  + 'channel, where the point drags on the way up.' },""")
# 4. export tierPortRows for the audit
rep("window.SHIPS_HULL = { sideBands, tierPortStations,", "window.SHIPS_HULL = { sideBands, tierPortRows, tierPortStations,")
open(P, 'w').write(src)
print('edited', P)
