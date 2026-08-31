#!/usr/bin/env python3
"""r171: the stern-light record fields, applied byte-precisely (no JSON re-dump).
Each ship gains sternLightPanes / sternLightPierFrac / sternLightPitchM and a
provenance that says which numbers are a PLATE READ and which are CLASS DEFAULTS."""
import sys

P = "web/data/vessels.json"
raw = open(P, encoding="utf-8").read()

PROV_74 = (
    "The tier arrangement is a PLATE READ: SLR0338, the RMG contemporary full-hull "
    "model of Bellona (1760), a Slade 74 — the record's own sub-type. Astern "
    "photograph (RMG media c1099, 1041×1280) at ~55 px/m: five pilaster pitches "
    "span 335 px and the ~9.2 m stern flat ~510 px, so pane COUNTS are solid and "
    "widths good to ~±15%, no finer. Each light in BOTH tiers is a 3×3 pane "
    "grid — two vertical and two horizontal bars, the 2–4 px bright lines a "
    "column-brightness profile finds inside every light; glazing fills 74–80% of "
    "pitch (pier assembly 17 px of 66–71) at 1.20–1.29 m pitch. The colour "
    "quarter plate (RMG media d7827) resolves the mica panes recessed BEHIND the gilt "
    "bars. Until round 171 each drawn light was one uncastable 0.9 m sheet with a "
    "single stick, floating proud of its own frame, and 36% of the tier was blank wall.")

PROV_EI = (
    "CLASS DEFAULTS, not a read of this hull: the small-pane grid is the period's "
    "glazing technology — crown glass casts no metre pane — and the one "
    "plate in hand is English (SLR0338, see ship-of-the-line). Dutch retourschip "
    "practice ran leaded lights with smaller panes if anything, so 3×3 is a "
    "floor, not a count of this stern; pier share and pitch are carried from the "
    "same plate as class figures.")

PROV_FL = (
    "CLASS DEFAULTS, not a read of this hull: the small-pane grid is the period's "
    "glazing technology — crown glass casts no metre pane — read on the one "
    "plate in hand, the English SLR0338 (see ship-of-the-line). The narrow Dutch tuck "
    "carried leaded lights with smaller panes if anything, so 3×3 is a floor; "
    "pier share and pitch are class figures from the same plate.")

def fields(prov):
    return ('    "sternLightPanes": [3, 3],\n'
            '    "sternLightPierFrac": 0.26,\n'
            '    "sternLightPitchM": 1.25,\n'
            f'    "sternLightProvenance": {jstr(prov)},\n')

def jstr(s):
    import json
    return json.dumps(s, ensure_ascii=False)

edits = [
    # fluyt: sternLights 1, followed by steering, preceded by cm 0.82
    ('    "sternLights": 1,\n    "steering": "stern"',
     '    "sternLights": 1,\n' + fields(PROV_FL) + '    "steering": "stern"'),
    # east-indiaman: the sternLights 2 followed directly by steering
    ('    "sternLights": 2,\n    "steering": "stern"',
     '    "sternLights": 2,\n' + fields(PROV_EI) + '    "steering": "stern"'),
    # ship-of-the-line: the sternLights 2 followed by headsails
    ('    "sternLights": 2,\n    "headsails": 2,',
     '    "sternLights": 2,\n' + fields(PROV_74) + '    "headsails": 2,'),
]

for old, new in edits:
    n = raw.count(old)
    if n != 1:
        print(f"ABORT: pattern occurs {n} times (need exactly 1):\n{old[:90]}...")
        sys.exit(1)
    raw = raw.replace(old, new)

open(P, "w", encoding="utf-8").write(raw)
import json
json.load(open(P))  # still valid JSON
print("applied 3 edits; JSON parses")
