import sys
p = sys.argv[1] + '/js/hull.js'; s = open(p).read()
old = """                  + 'behind, stepped four times; long enough to run from the fore truck to the button. The '
                  + 'breeching and tackles that held a gun in its port are not drawn.' },"""
new = """                  + 'behind, stepped four times; long enough to run from the fore truck to the button. The '
                  + 'trucks take up whatever height the port leaves. The upper-deck guns are laid as Muller lays a '
                  + 'lower tier\\'s: with the breech let down onto the hind axletree, the muzzle touches the top of the '
                  + 'port, so it cannot push the port lid open when the ship rolls. That puts each axis 0.84 m over '
                  + 'the deck, low in a port 0.81 m deep whose sill is 0.61 m up (Steel, 1805). Muller gives no such '
                  + 'rule for a quarterdeck; its guns stand on his standard carriage, with trucks four shot across. '
                  + 'The breeching and tackles that held a gun in its port are not drawn.' },"""
assert s.count(old) == 1; s = s.replace(old, new); open(p, 'w').write(s); print('card edited')
