import sys, json
src, dst, which = sys.argv[1:4]
s = open(src).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (which, a[:60]); s = s.replace(a, b)
if which == 'OLDBUILDER': rep("const bareRec = (courseRec && isMizzen", "const bareRec = false && (courseRec && isMizzen")
elif which == 'CLOTH': rep("      if (bareRec) {\n        /* r315 (0y¹⁴⁹): the crossjack is crossed bare", "      if (false) {\n        /* r315 (0y¹⁴⁹): the crossjack is crossed bare")
elif which == 'CARD': rep("    if (bare) how.push('the crossjack", "    if (false) how.push('the crossjack")
elif which == 'SILENCE':
    V = json.loads(s)
    for v in V['vessels']:
        if v['id'] == 'east-indiaman':
            for m in v['hull']['masts']: m.pop('crossjackProvenance', None)
    s = json.dumps(V, ensure_ascii=False, indent=2)
else: raise SystemExit('unknown ' + which)
open(dst, 'w').write(s); print('variant', which)
