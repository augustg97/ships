#!/usr/bin/env python3
"""r173 sim — prove the windlass rule's arms on the cog's real numbers BEFORE any web/ edit.

The machine under test is the PLANNED builder output (barrel from the record, athwartships,
underside 0.30 m over the deck) and three wrong forms: the vertical barrel (a capstan
wearing the wrong name), the dragged record (barrelDiaM 0.60 -> 1.60 under the faithful
builder), and a barrel through the planking (span > local breadth).

Station numbers measured off the built cog (measure_ship, r173): deck sheer runs 2.01 m
amidships to 3.18 m at the rail's aft end; at u 0.82 the deck stands ~2.42 m and the deck
half-breadth ~2.95 m. These two are estimates read off the part table; the in-page
injections then prove the same arms on the exact geometry.
"""

REC = {"barrelLenM": 4.5, "barrelDiaM": 0.60, "atU": 0.82}
DECK_Y = 2.42          # deck height at u 0.82, m (est. from measure_ship part table)
DECK_HALF = 2.95       # deck half-breadth at u 0.82, m (est.)

def arms(name, rec, axis, lenM, diaM, axisY_over_deck, span_half):
    """axis: unit vector of the barrel's long axis in hull frame (x fore, y up, z abeam)."""
    v = []
    if rec is None:
        v.append("V-WARRANT: windlass drawn, record silent")
        return v
    if abs(axis[1]) >= 0.1 or abs(axis[2]) <= 0.95:
        v.append(f"V-AXIS: barrel axis {axis} not horizontal-athwartships")
    if abs(lenM - rec["barrelLenM"]) > 0.12 * rec["barrelLenM"]:
        v.append(f"V-SPAN: length {lenM:.2f} vs record {rec['barrelLenM']}")
    if lenM > 0.95 * 2 * span_half:
        v.append(f"V-SPAN: barrel {lenM:.2f} m through the planking (deck breadth {2*span_half:.2f})")
    if abs(diaM - rec["barrelDiaM"]) > 0.15 * rec["barrelDiaM"]:
        v.append(f"V-DIA: dia {diaM:.2f} vs record {rec['barrelDiaM']}")
    # record-blind, all three: lever height, a borable barrel, cable clearance.
    # The builder clamps the axis to [0.45, 0.90], so a dragged diameter shows in the
    # barrel itself and the vanished clearance, not the axis.
    if not (0.45 <= axisY_over_deck <= 0.90):
        v.append(f"V-BREAST (record-blind): axis {axisY_over_deck:.2f} m over the deck")
    if diaM > 0.9:
        v.append(f"V-BREAST (record-blind): barrel {diaM:.2f} m thick, no handspike reaches through")
    if axisY_over_deck - diaM / 2 < 0.12:
        v.append(f"V-BREAST (record-blind): {axisY_over_deck - diaM/2:.2f} m under the barrel")
    return v

cases = []
# 1. the planned builder: record barrel, athwartships, underside 0.30 over deck
d = REC["barrelDiaM"]
cases.append(("faithful builder", arms("cog", REC, (0, 0, 1), 4.5, d, 0.30 + d / 2, DECK_HALF)))
# 2. sever: builder ignores the record — vertical barrel on the cog
cases.append(("sever: vertical barrel", arms("cog", REC, (0, 1, 0), 4.5, d, 0.30 + d / 2, DECK_HALF)))
# 3. sever: windlass drawn on a record-less hull (junk stands for the three)
cases.append(("sever: junk, record silent", arms("junk", None, (0, 0, 1), 4.5, d, 0.60, 4.0)))
# 4. drag: barrelDiaM 0.60 -> 1.60 under the FAITHFUL builder, whose clamp caps the
#    axis at 0.90 — so only the barrel-size and clearance counters can convict
d2 = 1.60
rec2 = dict(REC, barrelDiaM=d2)   # the record itself is dragged, so V-DIA cannot see it
axis2 = min(0.30 + d2 / 2, 0.90)
cases.append(("drag: dia 1.60, faithful", arms("cog", rec2, (0, 0, 1), 4.5, d2, axis2, DECK_HALF)))
# 5. a barrel longer than the deck is wide (6.2 m at this station)
rec3 = dict(REC, barrelLenM=6.2)
cases.append(("drag: len 6.2, faithful", arms("cog", rec3, (0, 0, 1), 6.2, d, 0.30 + d / 2, DECK_HALF)))

ok = True
for name, v in cases:
    want_clean = name == "faithful builder"
    status = "CLEAN" if not v else "CONVICTS"
    print(f"{name:34s} {status}")
    for x in v:
        print(f"    {x}")
    if want_clean and v: ok = False
    if not want_clean and not v: ok = False

# the drag case must convict on the record-blind arm ONLY
drag = dict(cases)["drag: dia 1.60, faithful"]
if not all("record-blind" in x for x in drag):
    ok = False
    print("FAIL: drag case convicted on a record arm — the arm would miss a dragged record")

print("\nSIM", "PASS" if ok else "FAIL")
raise SystemExit(0 if ok else 1)
