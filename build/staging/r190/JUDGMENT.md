# Round 190 — the anchors take their recorded weight: the r189 mass residual paid by a record, not a photograph

## The queue

August's second list stands worked in full (r157); the survey carries, and its
head is r189's residual (1): the drawn arm taper follows the plate's line
weights, and a mass balance at the caption's 456 kg would ask thicker members —
"a photograph of the Penglai find itself would settle the cross-sections."

## What the fetch found — a record better than the photograph

The residual asked for a photograph. The fetch found calipers instead: the same
harbour's SECOND dredge (2005, 蓬莱水城清淤工程) raised a complete four-claw
iron anchor, and the excavation brief (蓬莱3艘古船发掘简报, §7 船用文物 item 2;
haijiaoshi.com/archives/425, saved build/staging/r190/penglai-brief.txt) records
its members by measurement:

> 铁锚：4爪完整，锚杆长177㎝，径8.5㎝，锚把上有一缆口，径4.5㎝，锚体表面有
> 明显的锻打痕，锚爪长73㎝，径7㎝，锚爪间距144㎝。

Shank 177 cm at ⌀8.5; a head eye ⌀4.5; forge marks named on the surface; claws
73 cm at ⌀7 — ONE diameter over the claw's length; tips 144 cm apart. Under the
project's own standing rule — the record beats a derivation from the record —
a published caliper measurement of the same class at the same site outranks
both a museum photograph (which this round therefore did not chase further) and
the line weights of 王冠倬's re-printed illustration, which is what r189's
sections were.

## The mass balance — the drawn model convicted

The drawn iron, integrated member by member (frusta between the plate's own
stations, tip cones, crown ball, eye torus, wrought iron 7850 kg/m³):

| fullL | drawn mass | record | density class |
|-------|-----------|--------|---------------|
| 2.15 m (calibrator) | **156 kg** | 456 kg | 15.7 kg/m³ |
| 1.86 m (sheet) | 101 kg | 500 catties ≈ 295 kg | 15.7 |
| 1.57 m (pair) | 61 kg | 300 catties ≈ 177 kg | 15.7 |

A third of the recorded iron — below even r188's slender small-craft class
(~20 kg/m³), for the anchors of the stocky naval build (45.9 kg/m³). The plate's
line weights starved the arms: drawn taper ⌀0.024→0.009 of 全長 against the
2005 caliper's near-constant 0.036. The shank the plate and the caliper AGREE
on (drawn fraction 0.045, caliper 0.044) — the arms alone were the lie.

**The method validates itself on the caliper record:** integrating the 2005
anchor's own recorded members gives ~167–170 kg, which at its ~1.94 m estimated
全長 is 22.9 kg/m³ — landing on r188's slender class line derived
independently from the Liangshan inscription. And handing that mass and length
back to the new solve returns claw ⌀7.1 cm against the calipered 7.0 and shank
⌀9.7 against 8.5.

## The class change — sections fall out of length and weight

`makeAnchor(fullL, kg)`: member sections are SOLVED per anchor so the drawn
iron weighs the record's own mass — the weight is the one dimension the 舟車
text actually records (500 catties the sheet; the 300-catty pair inference).
The section RATIOS are the 2005 caliper record's (shank ⌀ 1.21× claw ⌀; the
claw one diameter over its length, falling to 0.6 at the last station for the
forged point). The claw CENTRELINE — stations, reach, tip point — stays the
plate's (r189): a line drawing carries a silhouette; it does not carry
sections. Crown ball and head eye stay the plate's too (r189 measured them
consistent; the crown bottom is the 全長 datum and the eye was measured at
0.062). Nothing is a knob: hand the class a slender record and it draws
slender members.

Solved at the records (t ≈ 1.43 for all three, same density class → geometric
similarity, the r188 cube-law preserved):

- sheet 1.86 m / 295 kg: shank ⌀13.4→10.3 cm, claw ⌀9.8→5.9 cm
- pair 1.57 m / 177 kg: shank ⌀11.3→8.6 cm, claw ⌀8.2→4.9 cm
- calibrator check 2.15 / 456: shank ⌀15.5→11.9, claw ⌀11.3→6.8 — the family
  of real 400–500 kg four-claw anchors.

Record fields added: `sheetKg` 295 (RECORDED, 500 catties), `bowerKg` 177,
`sternKg` 177 (the standing inference, named).

## NEW RULE V-MASS

Each drawn anchor's iron INTEGRATED from the built scene — every member's
analytic volume (frustum, cone, ball, torus from its geometry parameters)
through its own world matrix's DETERMINANT (exact under any linear map) —
× 7850 against the record's weight slot, 12% band. {len, sweep, kg} measured
in ONE pass and sorted together (the r189 slot lesson). An anchor with missing
members is V-COUNT's fault and V-MASS passes over it.

## Proofs (all on final code)

- inj-ia-mass (NEW): first assembly's members thinned ×0.8 in x/z → exactly ONE
  conviction, V-MASS 189 kg vs 295. V-LEN/V-SWEEP/V-CLAWS/V-REST silent.
- inj-ia-drag (r188): shank stretched 1.35× → V-LEN 2.28 vs 1.86 AND an honest
  V-MASS second on the same anchor (predicted ~346 kg vs 295: a stretched shank
  truly carries ~17% more iron — the r185 float precedent, an honest second
  named, not laundered).
- inj-ia-claws (r188): tips severed → V-CLAWS 16/5 alone; the four tip cones
  are 0.6% of the iron, so V-MASS must stay silent — the proof that severing
  is V-CLAWS's fault, not V-MASS's.
- inj-ia-sweep (r189): tips displaced 1.3× → V-SWEEP alone; positions carry no
  volume, V-MASS silent.

## Verification

- Audit 33/0 twice: post-land (audit-run1.json) and on the final built tree
  (audit-run2.json).
- Proofs, all on final code: inj-ia-mass → exactly ONE, V-MASS "189 kg of drawn
  iron — the record's 295" (predicted 189, 0.8² = 0.64); inj-ia-drag → V-LEN
  2.28 vs 1.86 AND the predicted honest V-MASS second, 346 vs 295 (a stretched
  shank truly carries the extra iron — both convictions on the same anchor,
  named, r185 precedent); inj-ia-claws → V-CLAWS 16/5 ALONE, V-MASS silent (the
  four tips are 0.6% of the iron — severing is V-CLAWS's fault); inj-ia-sweep →
  V-SWEEP 0.81 vs 0.63 ALONE (positions carry no volume).
- Opening 64 PAID AND PURE: launched 11:52 on the unedited tree; edits landed
  12:13, atomically after frames 41/42 (ship-treasure 0.000, aboard-treasure
  0.002 pre-edit); run finished 12:29 — 64/64, 0 movers, 0 BLANK, EXIT:0. The
  frames captured after the land (43–63) all scored within tolerance on the
  edited tree, proving the class edit inert for every hull but the carrier.
- Close solos: ship-treasure 0.012% — the diff image is the five anchors' own
  silhouettes, bow set and stern pair, nothing else in frame — ACCEPTED with
  FRAME-LOG reason, then 0.000. aboard-treasure 0.002%, flap level, not
  accepted (r184/r188/r189 precedent).
- Looked at (rules 0/1): the frame reads as a rendered world. Three facts a
  viewer can read off the crops (look-bow.png, look-stern.png): three
  four-clawed iron anchors lie recovered on the treenailed foredeck by the
  windlass, arms splayed to the planking with tips turned up, and their members
  now read as heavy forged bar, not wire; the stern pair lies on the aft
  castle's dark roof with each cable bent to its head eye and flaked in a tan
  coil beside it; the battened lugs above them are sheeted by their crowfoot
  fans to the same surfaces the anchors lie on.
- Deployed: data-version 1788291130. Live stamp verified (see HANDOFF).
