#!/usr/bin/env python3
"""r131: author the missing overhang on the two honest-loa under-length hulls.

slave-ship: allowance loa 30.0 - lwl 26.0 = 4.0 m; authored rakes 0.03/0.02 drew only
1.5 m of it. Brookes plan: raked stem carrying the head forward, counter stern - bow
share greater than stern. Authored 3:2 split kept, normalized up: 0.081/0.054
(sum 4.05 m; the r129 clamp trims to 4.00 exactly, 2.4 m bow / 1.6 m stern).

container: allowance 399.9 - 383.0 = 16.9 m; 383.0 is the class LBP (Significant Ships
of 2019, MSC Gulsun), and on this generation the transom stands nearly plumb at the aft
perpendicular - the whole LOA-LPP difference is the flared bow above the bulb. Stern
keeps its authored 0.0; stem takes the allowance: 0.0423 (16.916 m; clamp trims to
16.90 exactly).

Line-targeted, asserts every line before touching it, validates JSON after.
"""
import json, sys

P = "/Users/augustgweon/Ships/web/data/vessels.json"
lines = open(P, encoding="utf-8").read().splitlines(keepends=True)

def assert_line(n, expect):  # n is 1-indexed
    got = lines[n - 1].strip()
    if got != expect:
        sys.exit(f"line {n} is {got!r}, expected {expect!r} - REFUSING")

# slave-ship rakes (lines 2553-2554)
assert_line(2553, '"stemRake": 0.03,')
assert_line(2554, '"sternRake": 0.02,')
lines[2552] = '     "stemRake": 0.081,\n'
lines[2553] = '     "sternRake": 0.054,\n'

# container stem rake (line 4382; stern stays 0.0)
assert_line(4382, '"stemRake": 0.03,')
assert_line(4383, '"sternRake": 0.0,')
lines[4381] = '     "stemRake": 0.0423,\n'

SLAVE_PROV = (
    '     "rakeProvenance": "AUTHORED to fill the record\'s own allowance: loa 30.0 \\u2212 '
    'lwl 26.0 leaves 4.0 m of overhang and the drawn planking carried only 1.5 m of it '
    '(rakes 0.03/0.02, r129 fleet sweep). The recorded 30 m (98 ft) is the ship\'s hull '
    'length (en.wikipedia.org/wiki/Brooks_(1781_ship)), and the Brookes plan (Regulated '
    'Slave Trade Act plates, 1788\\u201389) draws a raked stem carrying the head forward and '
    'a counter stern \\u2014 the bow\'s share of the overhang larger than the stern\'s. The '
    'authored 3:2 stem:stern split is kept and normalized up to the allowance: 0.081/0.054, '
    'which the r129 loft clamp trims to 2.4 m bow / 1.6 m stern, 30.00 m drawn exactly. The '
    'plate is a stowage engraving, not a lines plan \\u2014 it supports the split '
    'qualitatively, not to the centimetre.",\n'
)
CONT_PROV = (
    '     "rakeProvenance": "AUTHORED to fill the record\'s own allowance: loa 399.9 \\u2212 '
    'lwl 383.0 = 16.9 m, and the old 0.03/0.0 drew only 12.0 m of it (r129 fleet sweep, '
    '\\u22124.9). 383.0 is the class\'s length between perpendiculars (RINA, Significant '
    'Ships of 2019, MSC G\\u00fcls\\u00fcn \\u2014 the same plate as the depth moulded '
    'above); on this generation the transom stands nearly plumb at the aft perpendicular '
    'and virtually the whole LOA\\u2212LPP difference is the flared bow above the bulb '
    '\\u2014 ever-given, the fleet\'s attested hull of the same 400 m generation, carried '
    'the identical 383 LBP against 399.94 LOA before r113 moved her lwl to her casualty '
    'report\'s 387 waterline. The stern keeps its authored 0.0 and the stem takes the '
    'allowance: 0.0423, which the r129 loft clamp trims to 16.90 m of bow overhang, '
    '399.90 m drawn exactly. NOTE the semantics this leaves: this type ship\'s lwl is the '
    'class LBP; the loaded waterline of the real hull runs \\u007e4 m further over the '
    'bulb (the ever-given precedent) and is not published for this class, so the record '
    'keeps the figure a plate attests.",\n'
)

# insert before each hull's "steering" line, scanning ONLY that hull's tail
def insert_before(steering_expect, lo, hi, prov):
    for i in range(lo, hi):
        if lines[i].strip() == steering_expect:
            lines.insert(i, prov)
            return i
    sys.exit(f"no {steering_expect!r} in lines {lo}-{hi} - REFUSING")

# container first (higher line numbers, so the earlier insert does not shift it)
insert_before('"steering": "steel"', 4395, 4420, CONT_PROV)
insert_before('"steering": "stern"', 2590, 2615, SLAVE_PROV)

open(P, "w", encoding="utf-8").write("".join(lines))

d = json.load(open(P, encoding="utf-8"))
vs = d["vessels"] if isinstance(d, dict) and "vessels" in d else d
for v in vs:
    if v.get("id") == "slave-ship":
        h = v["hull"]
        assert h["stemRake"] == 0.081 and h["sternRake"] == 0.054 and "rakeProvenance" in h, h
    if v.get("id") == "container":
        h = v["hull"]
        assert h["stemRake"] == 0.0423 and h["sternRake"] == 0.0 and "rakeProvenance" in h, h
print("applied and validated: slave-ship 0.081/0.054, container 0.0423/0.0, provenance on both")
