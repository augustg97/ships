import json, sys
src, dst, which = sys.argv[1:4]
d = json.load(open(src)); V = {v['id']: v for v in d['vessels']}
m = V['ship-of-the-line']['hull']['masts'][2]
if which == 'NOREAD':
    m['furlStowProvenance'] = "UNREAD, r310: no plate of this hull furled has been read for how this sail is stowed."
elif which == 'NOPROV':
    del m['furlStowProvenance']
else: raise SystemExit('unknown ' + which)
json.dump(d, open(dst, 'w'), ensure_ascii=False, indent=2)
