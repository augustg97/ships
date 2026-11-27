import json, sys
p = sys.argv[1]
D = json.load(open(p))
h = [v for v in D['vessels'] if v['id'] == 'ship-of-the-line'][0]['hull']
ft = lambda a, b: round((a + b / 12) * 0.3048, 4)
T = h['tierPorts'][1]
assert T['pitchM'] == 2.464
T['clearM'] = ft(8, 1)
T['pitchM'] = round(ft(2, 10) + ft(8, 1), 4)
T['foreM'] = ft(13, 1)
T['aftM'] = ft(6, 9)
T['provenance'] += (" r364: rows Z and A of the same column. Row Z, foreside of the foremost port abaft the foremost "
  "perpendicular, 13 ft 1 in. Row A (the next block), aftside of the after port afore the after perpendicular, 6 ft 9 in. "
  "Row U, 'distance from each other', is the CLEAR space between two ports: 13 ft 1 in + 15 x 2 ft 10 in + 14 x 8 ft 1 in "
  "+ 6 ft 9 in = 175 ft 6 in, the length between the perpendiculars of a 74 of this period; read as centre to centre the "
  "row would close at 129 ft. So the centres stand 10 ft 11 in (3.327 m) apart. r363 had recorded 8 ft 1 in as the pitch.")
T['contested'] = ("The ports' stations are registered on the model through her drawn masts (hull.perpendiculars), whose "
  "three estimates of the foremost perpendicular spread 0.65 m. At the after end the after port's aftside stands about 0.24 m "
  "inside the fore end of the quarter gallery as drawn (Steel's Folio LI rim, registered on the stern's corner); the two "
  "registrations disagree by that much. The sill is placed over the deck at midships and the port follows the paint band "
  "along the length, so it stands 0.04-0.12 m off Steel's 2 ft 0 in toward the ends. The lower tier's ports are NOT "
  "recorded: Steel's Folios VII, XX-XXII and XXIII-XXVI give none for the gun deck, and the shader still cuts them every "
  "L/26 (a CLASS pattern).")
h['perpendiculars'] = {
  'foreMastM': ft(19, 6), 'mainMastM': ft(99, 6), 'mizzenAftM': ft(27, 3),
  'provenance': ("RECORDED, r364: Steel, Elements and Practice of Naval Architecture (1822), Folio XX (archive.org "
    "elementspractice00stee leaf 526, build/staging/r364/steel/leaf0526.jpg, about 1500 px across the table, about 12 px "
    "to an inch of type), the 74's column, 'Centres of Masts': the foremast 19 ft 6 in abaft the foremost perpendicular, "
    "the main mast 99 ft 6 in abaft it, the mizzen 27 ft 3 in afore the after perpendicular. The model registers Steel's "
    "perpendiculars on its own drawn masts (steelPerpendiculars in hull.js), so any Steel station along the length can be "
    "drawn. Steel's fore-to-main is 80 ft 0 in (24.38 m); the model's masts stand 23.74 m apart, CLASS stations read off "
    "Bellona's plate (r343), so the registration carries their 0.65 m disagreement."),
}
lines = open(p).read().split('\n')
k = [i for i, l in enumerate(lines) if l.startswith('        "tierPorts": ')]
assert len(k) == 1 and not any(l.startswith('        "perpendiculars": ') for l in lines)
lines[k[0]] = '        "tierPorts": ' + json.dumps(h['tierPorts'], ensure_ascii=False) + ','
lines.insert(k[0] + 1, '        "perpendiculars": ' + json.dumps(h['perpendiculars'], ensure_ascii=False) + ',')
out = '\n'.join(lines); json.loads(out); open(p, 'w').write(out)
print('record written', T['pitchM'], T['clearM'], T['foreM'], T['aftM'])
