#!/usr/bin/env python3
"""r347: the rig-height derivation and the card row say a Steel lower stands less its step.
usage: r347_edit_card.py <web dir>   (writes each file atomically)"""
import sys, os
web = sys.argv[1]

def sub(src, old, new, label):
    n = src.count(old)
    assert n == 1, f'{label}: anchor found {n} times'
    return src.replace(old, new)

def write_atomic(p, s):
    t = p + '.r347tmp'
    open(t, 'w').write(s)
    os.replace(t, p)

p = f'{web}/js/hull.js'
s = open(p).read()
s = sub(s, """                     : 'derived: a beam-share lower mast carried to the truck through the class fractions, ' + n + ' segments';""",
"""                     : 'derived: a beam-share lower mast carried to the truck through the class fractions, ' + n + ' segments'
                       + (mastStepOf(S, mk) > 0 ? '; the lower stands its Steel length less the ' + mastStepOf(S, mk) + ' m from the deck down to its step (hull.mastStep)' : '');""", 'rigTruckFrom')
s = sub(s, """truckM: mk.truckM, heightM: mk.heightM, truckWLM: mk.truckWLM };""",
"""truckM: mk.truckM, heightM: mk.heightM, truckWLM: mk.truckWLM,
                        stepM: mastStepOf(S, mk) };   // r347""", 'rigTruckHow')
write_atomic(p, s)

p = f'{web}/js/shipwright.js'
s = open(p).read()
s = sub(s, """          : H.n > 1 ? 'no mast height is recorded; the lower mast is drawn to a class proportion of the hull and the masts above it are carried to the truck through class fractions, ' + H.n + ' segments in all'""",
"""          : H.n > 1 && H.stepM > 0 ? 'no mast height is recorded. The lower mast is Steel\\'s length for this hull, heel to head, less the ' + H.stepM + ' m from the deck down to its step on the keelson; the masts above it are carried to the truck through class fractions, ' + H.n + ' segments in all'
          : H.n > 1 ? 'no mast height is recorded; the lower mast is drawn to a class proportion of the hull and the masts above it are carried to the truck through class fractions, ' + H.n + ' segments in all'""", 'card row')
write_atomic(p, s)
print('ok')
