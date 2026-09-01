#!/usr/bin/env python3
"""r177 — apply the corbita windlass record + provenance to web/data/vessels.json.
Run AFTER the opening ratchet exits and AFTER probe-bow.py has fixed the barrel
length. Usage: apply_record.py <atU> <barrelLenM>"""
import json, sys

ATU = float(sys.argv[1])
BARREL = float(sys.argv[2])

P = 'web/data/vessels.json'
d = json.load(open(P))
vs = d['vessels'] if isinstance(d, dict) and 'vessels' in d else d
v = next(x for x in vs if x['id'] == 'corbita')
h = v['hull']
assert 'windlass' not in h, 'already applied'

h['windlass'] = {'atU': ATU, 'barrelLenM': BARREL, 'barrelDiaM': 0.5}
h['windlassProvenance'] = (
    "The gear list of her own trade's giant, thirty-five years before her drawn year. "
    "Lucian, Navigium 5 (c. AD 165), on the Alexandrian grain freighter Isis at "
    "Piraeus — the ship this card's own rows carry: 'αἱ ἄγκυραι καὶ στροφεῖα καὶ "
    "περιαγωγεῖς καὶ αἱ κατὰ τὴν πρύμναν οἰκήσεις, θαυμάσια πάντα μοι ἔδοξε' — the "
    "anchors, the windlasses and the capstans, and the stern cabins, all of them "
    "wonders to the visitor. Torr (Ancient Ships, 1894, p. 95) and the fetched "
    "translation read the two nouns as the ship's winding machines; which noun is the "
    "horizontal machine the text does not say, and ONLY the horizontal windlass is "
    "drawn — a Roman vertical winch has no attested form, and the Georgian capstan "
    "this hull carried until r172 was exactly that anachronism, removed. Lucretius "
    "4.901–906 puts the machina with its trocleae and tympana — pulleys and drums "
    "moving great weights at light effort — in the same breath as the ship and her "
    "rudder; Torr's note connects the Latin terms to Lucian's Greek ones, a scholarly "
    "reading named as such. Warrant: GEAR-LIST EXTENSION, same trade, same era — one "
    "stated inference, from the 55 m Isis down the same Alexandria–Rome run to the "
    "drawn 40 m carrier (the Madrague de Giens size, the card's other named wreck). "
    f"Station u {ATU} is a PLACEMENT INFERENCE ±0.05: no ancient source places the "
    "machine; the bower anchors and their cables work at the bow — hawse-eyes and "
    "catheads a little abaft them (Torr pp. 69–74) — and the drawn station is the "
    f"open foredeck abaft the artemon's step. Barrel {BARREL} m is a GEOMETRIC read "
    "off the drawn deck's breadth at that station (probe, read-only, before this "
    "record was written); diameter 0.5 m, the axis a foot over the deck and the two "
    "standards are Falconer CLASS DEFAULTS cross-tradition (r173). CONTESTED, the "
    "standing negative: Laurons 2, the one wreck preserved to the rail (late 3rd c. "
    "AD, a ~15 m, ~30 t coaster), keeps her bitts, belaying pins and spare rudder and "
    "shows NO windlass in any fetched description — the class's small end may have "
    "worked its anchors by hand, and a corbita drawn at her size would reopen this "
    "judgment toward silence. No fetched relief or mosaic shows the machine; Casson "
    "1971 is borrow-gated and was not readable this round, named as such.")

json.dump(d, open(P, 'w'), ensure_ascii=False, indent=1)
print('applied: windlass', h['windlass'])
print('provenance chars:', len(h['windlassProvenance']))
