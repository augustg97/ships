#!/usr/bin/env python3
"""r172 — promote the capstan to a record field on the 11 capstan-bearing hulls.
The other 8 timber hulls that drew one (trireme, corbita, dhow, junk, treasure-ship,
cog, panokseon, sekibune) get NO field: their traditions attest other gear (the Bremen
cog's own wreck carries a windlass), and silence draws nothing. Windlasses are a named
residual, not a silent substitution."""
import json, collections

P = '/Users/augustgweon/Ships/web/data/vessels.json'
d = json.load(open(P), object_pairs_hook=collections.OrderedDict)

CLASS_PROV = ("Bar capstan of the European tradition, a type-period CLASS DEFAULT — no "
              "hull-specific plate; counts are class defaults (whelps 6: Falconer 1769 "
              "pl. II figs 11-12 resolve six, period range 6-8). Form and proportions "
              "from Falconer 1769 CAPSTERN (whelps drumhead-to-deck like buttresses, "
              "chocks, two iron pawls, bars heaved at the breast) and pl. II fig 11 "
              "(engraving, widths ~±10%: height ≈ 0.86 of drumhead dia, neck sweep "
              "0.82 flaring to 1.0 at the deck). Sized to the men at its bars.")

CAP = {
  'caravel':          ({'whelps': 6, 'bars': 6},  CLASS_PROV),
  'carrack':          ({'whelps': 6, 'bars': 8},  CLASS_PROV),
  'galley':           ({'whelps': 6, 'bars': 6},  CLASS_PROV + " Mediterranean argano; "
                        "confidence lower than the sailing hulls'."),
  'galleass':         ({'whelps': 6, 'bars': 8},  CLASS_PROV + " Mediterranean argano; "
                        "confidence lower than the sailing hulls'."),
  'fluyt':            ({'whelps': 6, 'bars': 8},  CLASS_PROV),
  'east-indiaman':    ({'whelps': 6, 'bars': 12}, CLASS_PROV),
  'ship-of-the-line': ({'whelps': 6, 'bars': 14, 'drumDiaM': 1.5, 'paint': 'red'},
      "PLATE READS off RMG SLR0338, the contemporary Bellona model, quarter plate "
      "l5785_003 (~16 px/m at the waist — counts solid ±1, widths ±15%): bars SHIPPED, "
      "12-14 rays so bars=14 is a read ±1; drumhead ≈1.5 m (read at that px/m, ±10%); "
      "bar tips ≈2.7 drumhead-dias out, agreeing with the period's 12-14 ft bars; the "
      "machine painted red-ochre like the inner works (paint field). whelps 6 is a "
      "CLASS DEFAULT (Falconer pl. II resolves six; period range 6-8). Form per "
      "Falconer 1769 CAPSTERN: whelps drumhead-to-deck, chocks between, two iron "
      "pawls on deck, men heaving breast-high. A 74 carried main (double) and jeer "
      "capstans; the weather-deck machine drawn is the upper barrel of the main."),
  'slave-ship':       ({'whelps': 6, 'bars': 8},  CLASS_PROV),
  'clipper':          ({'whelps': 6, 'bars': 10}, CLASS_PROV),
  'wyoming':          ({'whelps': 6, 'bars': 10}, CLASS_PROV +
      " By 1909 heaving was the donkey engine's; the bar capstan stands aft."),
  'endurance':        ({'whelps': 6, 'bars': 8},  CLASS_PROV),
}

n = 0
for v in d['vessels']:
    if v['id'] in CAP:
        cap, prov = CAP[v['id']]
        v['hull']['capstan'] = cap
        v['hull']['capstanProvenance'] = prov
        n += 1
assert n == len(CAP), (n, len(CAP))
json.dump(d, open(P, 'w'), indent=1, ensure_ascii=False)
print(f'capstan record written on {n} hulls')
