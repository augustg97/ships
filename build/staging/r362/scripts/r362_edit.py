import sys, re
p = sys.argv[1]
s = open(p).read()
a = s.index('function gunCarriage(x, yDeck, yAxis, zFace, sgn, len, r, mat) {')
b = s.index('\n}\n', a) + 3
new = open(sys.argv[2]).read()
s = s[:a] + new + s[b:]
old_hdr = " * The proportions other than Falconer's two are CLASS figures. */"
assert s.count(old_hdr) == 1
s = s.replace(old_hdr, " * The proportions other than Falconer's two were CLASS figures until r362, which lays the\n * carriage off its gun by Muller's construction (see gunCarriage). */")
old_card = "'as whatever brings the gun to its port. The other proportions are class figures. The '"
assert s.count(old_card) == 1
s = s.replace(old_card, "'as whatever brings the gun to its port. Muller (1768) lays the rest off the gun itself: the '\n                  + 'cheeks a calibre thick, as far apart as the second reinforce ring at the trunnions and the base '\n                  + 'ring at the breech, so they open toward the rear; 4.5 shot diameters high before and half that '\n                  + 'behind, stepped four times; long enough to run from the fore truck to the button. The '")
open(p, 'w').write(s)
print('ok')
