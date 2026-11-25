import json, sys
kind, out = sys.argv[1], sys.argv[2]
if kind == 'NOSOURCE':
    D = json.load(open('vessels.after.json'))
    for v in D['vessels']:
        ms = (v.get('hull') or {}).get('masts') or [{}]; mk = ms[-1]
        if mk.get('lateenMizzen'): del mk['mizzenSailProvenance']
    json.dump(D, open(out, 'w'), indent=2, ensure_ascii=False)
elif kind == 'CLIPPERLATEEN':
    D = json.load(open('vessels.after.json'))
    for v in D['vessels']:
        if v['id'] == 'clipper':
            mk = v['hull']['masts'][-1]; mk['lateenMizzen'] = True
            mk['mizzenSailProvenance'] = 'CLASS, proof variant'
    json.dump(D, open(out, 'w'), indent=2, ensure_ascii=False)
elif kind == 'SEAMBIAS':
    s = open('audit.after.js').read()
    a = "if (seen.has(key)) continue; seen.add(key);"
    assert s.count(a) == 1; open(out, 'w').write(s.replace(a, ''))
print(kind, 'ok')
