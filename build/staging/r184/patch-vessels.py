#!/usr/bin/env python3
"""r184: the treasure-ship's ironAnchors datum, provenance and card row."""
import json, sys

P = '/Users/augustgweon/Ships/web/data/vessels.json'
d = json.load(open(P))
vs = d['vessels'] if isinstance(d, dict) else d
v = next(x for x in vs if x.get('id') == 'treasure-ship')
h = v['hull']

h['ironAnchors'] = {
    'sheetAtU': 0.030, 'pairAtU': 0.060, 'pairOffZ': 2.4,
    'sheetShankM': 2.4, 'bowerShankM': 2.0, 'clawFrac': 0.42, 'yaw': 0.0,
}
h['ironAnchorProvenance'] = (
    'DRAWN, r184 — a FLEET-CLASS EXTENSION, the same join as the windlass: this '
    "hull's own record attests no fitting (attestation 'generated'). The Tiangong "
    'Kaiwu (1637, ~200 years after the voyages — the gap named) carries the object '
    'in two chapters. Zhouche counts the inventory for the state grain ship: five '
    'or six iron anchors, the mightiest the kanjia mao (sheet anchor) at about 500 '
    'catties RECORDED, two worked at the head, two at the stern, cables belayed to '
    'the two general’s-posts and broken out by the yun-che windlass; and '
    '‘the ocean transport’s gear is all the same’ (qi ju jie tong) '
    'carries the set to the zheyang ship, the Yuan and early-Ming state sea '
    'carrier (the r174 join, build/staging/r174/JUDGMENT.md). Chuiduan gives the '
    'FORM, fetched whole r184 (Gutenberg #25273, staging/r184): the forging method '
    'first makes the FOUR CLAWS, then joins them section by section to the shank '
    '— no stock, no wood, the largest thing under furnace and hammer. NO '
    'dimension is in any text: sheet shank 2.4 m is DERIVED (wrought iron summing '
    'to the recorded ~300 kg), the pair’s 300 catties an INFERENCE at the '
    'forging text’s own anvil threshold (scale 0.84 → shank 2.0 m), claw '
    'sweep a woodcut-proportion default — a measured surviving four-claw '
    'anchor would replace all three and this field says so. Cable material '
    'RECORDED in the same chapter: anchor cables are split green bamboo strip, '
    'boiled then twisted (po xi qing mie) — hemp is the text’s sail and towing '
    'cordage, not the anchor’s. Drawn recovered on the '
    'foredeck, the bow-worked three only; the stern pair (stations attested) is '
    'NOT drawn — its stow surface on the drawn poop is unresolved, and the '
    'record is not license to invent a deck. Stow spots PLACEMENT INFERENCE, '
    'measured and iterated (r182/r183 method).')

rows = v['rows']
row = ['Ground tackle, as drawn',
       'five or six iron anchors is the *Tiangong kaiwu* inventory for the state '
       'grain ship — gear the text extends to the ocean transport whole — '
       'the mightiest the ‘house-guarding anchor’ of about 500 catties, '
       'two more worked at the head, two at the stern. The forging chapter gives '
       'the form: four claws made first, then joined section by section to the '
       'shank — no stock, no wood; whichever way it lands a claw bites. The '
       'bow-worked three lie recovered on the foredeck, cables to the '
       'general’s-posts and the windlass barrel; the stern pair is attested '
       'but its stow is not, and nothing is drawn for it.']
if not any(r[0] == 'Ground tackle, as drawn' for r in rows):
    rows.append(row)
else:
    rows[[i for i, r in enumerate(rows) if r[0] == 'Ground tackle, as drawn'][0]] = row

json.dump(d, open(P, 'w'), ensure_ascii=False, indent=1)
print('patched', P)
