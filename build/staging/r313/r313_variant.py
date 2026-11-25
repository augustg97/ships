import json, sys
kind, src, dst = sys.argv[1:4]
if kind in ('SILENCE', 'ROWS'):
    d = json.load(open(src)); V = {v['id']: v for v in d['vessels']}
    if kind == 'SILENCE': del V['fluyt']['hull']['masts'][0]['courseAtProvenance']
    if kind == 'ROWS': V['ship-of-the-line']['hull']['masts'][2]['courseRead']['rows']['yard'] = 1450
    json.dump(d, open(dst, 'w'), indent=2, ensure_ascii=False)
elif kind == 'CLASSDRAWN':
    s = open(src).read(); a = "if (rd) courseAt = rd.ofDeckToTop * 0.90;"
    assert s.count(a) == 1; open(dst, 'w').write(s.replace(a, "/* proof C: read ignored */"))
