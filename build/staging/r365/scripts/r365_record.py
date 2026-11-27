import json, sys
P = sys.argv[1]
D = json.load(open(P))
v = [x for x in D['vessels'] if x['id'] == 'ship-of-the-line'][0]; h = v['hull']
ft = lambda f, i=0: round((f * 12 + i) * 0.0254, 3)
h['channels'] = {
  'masts': [
    {'mast': 'fore',   'lenM': ft(30, 6), 'foreM': ft(0, 9),  'breadthM': ft(1, 8), 'thickInM': ft(0, 6), 'thickOutM': ft(0, 4.5), 'tPlates': 5},
    {'mast': 'main',   'lenM': ft(37, 6), 'foreM': ft(0, 10), 'breadthM': ft(1, 8), 'thickInM': ft(0, 6), 'thickOutM': ft(0, 4.5), 'tPlates': 6},
    {'mast': 'mizzen', 'lenM': ft(19, 6), 'foreM': ft(0, 6),  'breadthM': ft(1, 8), 'thickInM': ft(0, 5), 'thickOutM': ft(0, 4),   'tPlates': 4},
  ],
  'upperEdge': 'topTimberLine',
  'provenance': ("READ, r365, from Steel, The Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org "
    "elementspractice00stee), Folio LIII, 'Outboard', leaf 592 (build/staging/r365/steel/leaf0592.jpg, 3013 x 3946 px), the 74-gun "
    "column. Main channel: 37 ft 6 in long; 6 in thick at the inner edge and 4 1/2 in at the outer; 1 ft 8 in broad, 'or sufficient "
    "to clear the shrouds of the roughtree rail'; its foremost end 10 in afore the centre of the main mast; its upper edge 'well' "
    "with the upper edge of the sheer rail, or top-timber line (the three-deckers' columns put it 5 ft 3 in and 4 ft 5 in below); "
    "9 bolts; six iron T-plates under it. Fore channel: 30 ft 6 in; 6 and 4 1/2 in; 1 ft 8 in; its upper edge 'in the same range as "
    "the main channel'; its foremost end 9 in afore the fore mast; five T-plates. Mizzen channel: 19 ft 6 in; 5 and 4 in; 1 ft 8 in; "
    "its foremost end 6 in afore the mizzen mast; four T-plates. Steel's sheer-draught instructions (Book II, the 1822 text) say the "
    "same of every channel: 'placing their upper edges, next the side, in a line with the upper edge of the sheer-rail'. "
    "Eckersberg's Asow (1828; build/staging/r312/plates/asow.jpg, crop r365/asow-778-6x.png) draws the channels so: a dark timber "
    "at the top of the upper ochre band, over the upper-deck ports, with the chains running down across the band between the ports. "
    "ON THIS MODEL the top of that band is the hull's sheer (paintBands, freeboard 5.4 m, r340), and Asow's channel stands on it, so each "
    "channel's underside at the side is laid on the sheer and its upper edge, the top-timber line, a channel's depth over it. "
    "r340 read the band's top as the rail cap at the top of the side; the plate at 6x shows the channel there instead."),
  'contested': ("The mizzen channel's height is blank in Steel's 74 column (the 80's and 50's columns read 'well' with the main "
    "channel's range); the model lays it in the main channel's range. The shrouds' deadeyes are spread at an even pitch over each "
    "whole channel. On the ship the after part of each channel also took the backstays' deadeyes, which the model sets up at the "
    "side 0.2 L abaft the mast, so the shrouds stand further apart than they did. The chains and Steel's T-plates under each channel "
    "are not drawn. The model's waist is 1.5 m deep under its sheer (deck.belowSheerM), and its top-timber line therefore 1.65 m, "
    "where Steel's Folio XXXII gives 6 ft 9 in (2.06 m); Steel's stern heights, registered on the taffrail, agree with the model's deck "
    "(A-GALLERY-AS-RECORDED (e)), so the 0.41 m is in the side above the band, which the model does not draw. Not reconciled."),
}
lines = open(P).read().split('\n')
k = [i for i, l in enumerate(lines) if l.startswith('        "perpendiculars": {"foreMastM": 5.9436')]
assert len(k) == 1
lines.insert(k[0] + 1, '        "channels": ' + json.dumps(h['channels'], ensure_ascii=False) + ',')
open(P, 'w').write('\n'.join(lines))
D2 = json.load(open(P)); h2 = [x for x in D2['vessels'] if x['id'] == 'ship-of-the-line'][0]['hull']
assert h2['deck']['belowSheerM'] == 1.5 and h2['channels']['masts'][1]['lenM'] == 11.43
print('ok')
