import json, sys
src, dst, which = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(src)); h = next(x for x in d['vessels'] if x['id'] == 'titanic')['hull']
o = json.load(open('retrace.json')); I = h['islands']
if which == 'OLDTRACE':   # r303's after-well read as it stood, with its full trace stored
    w = I['wells'][1]; t = o['After well']; T = w['topRead']
    T['rows'] = [693.4, 691.1]; w['topM'] = [11.29, 11.58]; T['rmsPx'] = 0.35; T['n'] = 66; T['colRange'] = [565, 760]
    T['trace']['rows'] = [q[3] for q in t['pts']]; T['trace']['fit'] = t['fitCoef']
elif which == 'SILENCE': del I['list'][0]['topRead']['trace']
elif which == 'ROWS': I['list'][1]['topRead']['rows'][0] = round(I['list'][1]['topRead']['rows'][0] + 0.5, 1)
elif which == 'JUMP':     # the forward well's trace steps 4 rows onto another line for its last 8 points
    R = I['wells'][0]['topRead']['trace']['rows']; idx = [i for i, r in enumerate(R) if r is not None][-8:]
    for i in idx: R[i] += 4
json.dump(d, open(dst, 'w'), indent=2, ensure_ascii=False)
