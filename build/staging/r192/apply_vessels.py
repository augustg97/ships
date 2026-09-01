#!/usr/bin/env python3
"""r192 — sekibune record: the shank takes its own caliper record (二宮 2014 表3);
the r191 CONTESTED paragraph becomes the resolution; card row carries the taper."""
import json, os, sys

P = sys.argv[1] if len(sys.argv) > 1 else 'web/data/vessels.json'
P_OUT = sys.argv[2] if len(sys.argv) > 2 else P
d = json.load(open(P))
vs = d['vessels'] if isinstance(d, dict) else d
v = next(x for x in vs if x["id"] == "sekibune")
h = v["hull"]

PROV_OLD = (
    "The shank is"
    " the one member 表1 does not record: its square side is SOLVED so the drawn"
    " iron weighs the record's kg at 7850 kg/m³ — at (2.0 m, 122 kg) it returns"
    " 9.4 cm at the crown tapering to 6.8. CONTESTED: the paper's own monument"
    " photographs read shanks slimmer (0.023–0.034 of 全長; fig 15-1, obliquity"
    " unbounded) than the solve's 0.047 — rust loss on century-exposed survivors,"
    " the forklift's precision and real working-vs-votive spread are the named"
    " suspects; a caliper record of the Kozushima members (國學院大學 1993 site"
    " report) would settle it. The audit holds the drawn anchor's integrated iron"
    " to the record's weight (V-YMASS, 12%).")
PROV_NEW = (
    "The shank's two stations are the Pacific corpus's own calipers, read r192:"
    " 表3 of 二宮俊洋's master's survey (東京海洋大学 2014, oacis record 1018 —"
    " 144 anchors, Ibaraki to Wakayama, the companion survey to Matsui's) records"
    " the shank per anchor at the clean upper bar (軸正面×軸側面) and at the root"
    " boss where the four arms are forged on (軸根本正面×軸根本側面). Corpus means"
    " as fractions of 全長, each anchor's pair sorted (min,max) because the"
    " shrine's mounting sets which face is 正面: upper bar 0.0214±0.0046 ×"
    " 0.0303±0.0058 (n=17), root boss 0.0491±0.0072 × 0.0764±0.0099 (n=16);"
    " excluded by name №1 (sea-concreted, every member ~2× corpus), №74"
    " (exfoliated to 0.012 of 全長) and №93 (printed-inconsistent, a 0.36·全長"
    " root), and №82's shaft pair flagged (側面/正面 = 2.8, twice anyone else)"
    " and dropped. The r191 CONTEST is RESOLVED, in the record's favour on both"
    " sides: the monument photographs' 0.023–0.034 was the upper bar, and the"
    " old solve's 0.047 was the root boss (0.0491) — the real shank tapers hard"
    " from an oblong boss to a slender near-square bar, and both prior readings"
    " were right at their own stations. The drawn shank now carries exactly those"
    " stations; the knee where the taper meets the bar is the one dimension no"
    " table records, SOLVED so the drawn iron weighs the record's kg at 7850"
    " kg/m³ — at (2.0 m, 122 kg) it lands at 77% of the shank, inside the drawn"
    " form's own solvable band (69–138 kg); a record outside that band would"
    " clamp the knee and the mass audit would convict, a contest and not a knob."
    " Cross-corpus check on the members already held: №71 (銚子, 300 cm) calipers"
    " claw root 0.0350×0.0233 and claw length 0.320 of 全長 against Matsui's"
    " 0.0346×0.0198 and the drawn 0.30 — two independent coasts agree on the"
    " arms. Residual: the mass calibration still hangs on the Kozushima weighing"
    " alone (約90貫 by forklift); the 1993 site report (東京都教育委員会, per the"
    " nabunken bibliography — print only, not surfaced open) would firm the kg,"
    " no longer the shank. The audit holds the drawn iron to the record's weight"
    " (V-YMASS, 12%) and the drawn shank's end sections to the calipered stations"
    " (V-YSHANK, 12%).")

if h["anchorProvenance"].count(PROV_OLD) != 1:
    sys.exit("REFUSING: provenance target not found exactly once")
h["anchorProvenance"] = h["anchorProvenance"].replace(PROV_OLD, PROV_NEW)

row = v['rows'][12]
assert row[0] == 'Ground tackle, as drawn', 'row moved'
ROW_OLD = ("The shank, the one member the table leaves unmeasured, is solved to"
           " carry that mass: a square bar 9 cm through at the crown")
ROW_NEW = ("The shank is calipered too, on the Pacific coast's own survivors: an"
           " oblong root boss, about 10 by 15 cm on hers, where the four arms are"
           " forged on, tapering to a bar about 4 by 6 at the head; where the"
           " taper ends is the one dimension no table records, solved so the"
           " drawn iron carries the record's mass")
if row[1].count(ROW_OLD) != 1:
    sys.exit("REFUSING: card-row target not found exactly once")
row[1] = row[1].replace(ROW_OLD, ROW_NEW)

json.dump(d, open(P_OUT + '.tmp', 'w'), indent=1, ensure_ascii=False)
os.replace(P_OUT + '.tmp', P_OUT)
print('applied: provenance resolution, card row taper ->', P_OUT)
