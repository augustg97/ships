import json, sys
kind, out = sys.argv[1], sys.argv[2]
if kind == 'NOSOURCE':
    D = json.load(open('vessels.after.json'))
    n = 0
    for v in D['vessels']:
        for mk in (v.get('hull') or {}).get('masts') or []:
            if 'mastHeightsProvenance' in mk: del mk['mastHeightsProvenance']; n += 1
    assert n == 3, n
    json.dump(D, open(out, 'w'), indent=2, ensure_ascii=False)
elif kind == 'STEELSTACK':   # proof C: the new builder drawing the old stack, one line flipped
    s = open('hull.after.js').read()
    a = "    const { top, tg } = squareStackOf(mk, lower);"
    assert s.count(a) == 1
    open(out, 'w').write(s.replace(a, "    const top = lower * 0.60, tg = top * 0.50;"))
print(kind, 'ok')
