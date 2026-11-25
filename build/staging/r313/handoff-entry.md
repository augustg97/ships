
## Round 313 — 2026-11-24 — The 74's crossjack hangs where Eckersberg's 1828 painting of the Russian 74 Asow puts it: at 0.845 of the height from the deck to the mizzen top, 3.6 m under the top. It had hung at a class 0.60 of the lower mast, 0.667 of the deck-to-top height, and now stands 4.5 m higher (y 22.6 → 27.2 m). Every other course on a one-yard-per-segment rig (13 masts on five hulls) now says in the record that its height is the class figure and has not been read, and the audit convicts a mast that says nothing

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁴³), which r312 named first. `build/staging/r313` did not exist. The load was 1.9 at the start and no process was hot. r312's receipt left no unscored frames, so no clean-HEAD run was made.**

**WHAT (0y¹⁴³) ASKED.** r312 read by eye that the Asow plate hangs the crossjack near the mizzen top, at about 0.88 of the height from the poop rail to the top, and the model at about 0.69. It asked for a row read on the plate and a measurement on the model.

**THE READ (`build/staging/r312/plates/asow.jpg`, the 1920 px derivative).** Brightness profiles down two column bands either side of the mizzen, clear of the ensign: columns 330–370 and 600–640 (`asow-rig-mid.png`, `asow-mz-top-4x.png`, `asow-mz-foot-4x.png`).

| Feature | Row | How it reads |
|---|---|---|
| mizzen cap | 1283 | the pale block where the orange topmast leaves the lower mast |
| front edge of the mizzen top | 1372 (±6) | the pale rim of the platform |
| main yard | 1416–1428 | dark, crossing just above the crossjack |
| **crossjack** | **1430–1449, centre 1438** | a pale yard, lit on its upper face, brown on its underside, centred on the mizzen |
| taffrail's top at the mast | 1782 | where the mizzen's foot goes out of sight |
| poop deck at the mast | 1782 to about 1815 | hidden behind the taffrail; 1815 allows a 1 m rail at 30 px/m |

The crossjack's share of the deck-to-top height is 0.839 on the first deck datum and 0.851 on the second. The record takes the mean, **0.845, bound ±0.025** (the top's ±6 rows and the yard's ±4).

Two corrections to r312's description of this plate, both in the handoff and not yet in the record's provenance text:

- **The eye is near the water, not high.** The horizon runs at the ship's waterline. The masts stand upright on the canvas, so ratios along one mast are kept.
- **The scale at the mizzen is about 30 px/m, not 20.** The main yard spans about 870 px, and a 74's main yard is 28–29 m. r312's 20 px/m came from assuming the rail-to-top height.

**THE MODEL (`r313_probe.py`, every yard and top vertex in the built 74, binned by mast).** Before: crossjack at y 22.42–22.85, the mizzen top at 30.39–31.16, the mast's foot at 5.73 in the same frame; the yard stood at 0.668 of the foot-to-top height. The model's mizzen also differs from the plate's in proportion: its masthead (cap to top) is 0.12 of the deck-to-cap height and the plate's is 0.18. The read is taken against the top because the yard's slings hang from the masthead over the top; a read against the cap would give a different figure.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r313_record.py`):
  - the 74's mizzen carries `courseRead {ofDeckToTop 0.845, boundPm 0.025, rows, plate, cols, topAtOfLower 0.90}` and a `courseAtProvenance` opening PLATE READ that names the plate, its scale, every row and what is contested;
  - her fore and main carry a `courseAtProvenance` opening UNREAD. The plate shows both course yards close under their tops, but the stern hides their decks, so their height over the deck is not read;
  - the fluyt (2 masts), the East Indiaman (3), the slave ship (3) and the carrack (2) carry a `courseAtProvenance` opening UNREAD that names the class figure (0.60 under three tiers, 0.72 under two).
- BUILDER (`hull.js`): on a mast with one yard per segment and more than one tier, `courseRead.ofDeckToTop` sets the course at that share of the deck-to-top height. The top's centre stands at 0.90 of the lower mast (buildTop's own height), so the yard hangs at 0.845 × 0.90 = 0.7605 of the lower mast. Every such course now records where it hangs on its mesh (`userData.courseAt`: mast, base, segment, share, from 'record' or 'class'). A mast with no `courseRead` builds exactly as before.
- The crossjack rose from y 22.64 to 27.15 (4.51 m). The set mizzen topsail, which sheets to it, is 4.5 m shallower: 22.7 m to 18.2 m from its yard to the crossjack.

**AUDIT.** New rule A-COURSE-READ, for every square mast with no `yards` list and more than one tier:

1. the record carries `courseAtProvenance`, opening PLATE READ with a `courseRead`, or UNREAD with none; silence is convicted;
2. a read's value is the mean of its two deck datums' shares from its own rows, within 0.005;
3. exactly one course mesh on the mast records where it hangs, drawn from 'record' when the record reads it and 'class' when it does not;
4. a read course's height over the mast's foot, over the height of that mast's own built top over the foot, is within the read's bound.

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED.** `#v=ship&s=ship-of-the-line&sail=furled&b=110&z=1.1&l=6` (r312's camera, abaft her port beam), before on :8149 carrying the r312 tree and after on :8150 carrying the new one (`wit-before-b110.png`, `wit-after-b110.png`). `pair-mizzen-b110.png` (before left, after right, about the mizzen):

- before: the crossjack, with its furled roll, hangs about halfway between the mizzen top and the gaff's jaws, with bare mast between it and the top;
- after: it hangs just under the top, as the plate shows. The gaff's jaws and the brailed spanker have not moved, so the jaws now stand well below the crossjack. The plate puts them above it: see (0y¹⁴⁵).

**Rule 0, on `wit-after-small.png` read whole: a rendered three-masted two-decker on a rippled sea with a low coast behind, not a chart. Three facts a viewer can read off it without a legend: she carries two rows of gunports; every square sail is rolled up on its yard on all three masts; the mizzen's lowest yard hangs just under its top, and the gaff with the spanker brailed to the mast stands below it.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹⁴³) is closed for the 74's mizzen.** Her fore and main course yards stay at the class figure; see (0y¹⁴⁷).
- **(0y¹⁴⁵), NEW: the 74's spanker gaff jaws stand below the crossjack, and the Asow plate puts them above it.** On the plate the brailed bundle is visible from row 1410 down. The ensign hides everything above 1410, so the jaws stand between 1410 and the top at 1372: between 0.91 and 1.0 of the deck-to-top height. The model's jaws are at `throatFrac`'s class 0.55 of the lower mast (y 21.2, 0.63 of the deck-to-top height). The plate gives a lower bound and no length, and A-GAFF-READ requires `gaffFrac` with `throatFrac`, so a bound read needs a record form for "at least" before it can go in.
- **(0y¹⁴⁶), NEW: on the plate every topsail yard is lowered onto its lower cap, and on the model every hoisting yard stays hoisted when furled.** Rows on the Asow plate: main topsail yard about 1190 over the main cap at about 1215; mizzen topsail yard 1260 over the cap at 1283; fore topsail yard about 1315 over its cap at about 1340. A topsail is furled by letting go its halyard and lowering the yard to the cap, then clewing up. The Shipwright's furled card says the 74 is shown "how she lay in harbour and at anchor", and draws her topsail and topgallant yards hoisted. This is a class change for every yard with a tie (`HOIST` in hull.js) in the furled build, and it moves every furled frame.
- **(0y¹⁴⁷), NEW: the 74's main and fore course yards.** On the Asow plate both hang close under their tops, as the crossjack does. The stern hides their decks, so their height over the deck is not read. A broadside of a working 74 at anchor would read all three.
- **(0y¹⁴⁸), NEW: r312's furlStowProvenance describes the Asow plate as seen "from high on her starboard quarter" at "about 20 px/m".** The eye is near the water, and the scale at the mizzen is about 30 px/m. The record text should be corrected; no figure in the record depends on either.
- **(0y¹⁴²)** (Preussen's island reads), **(0y¹⁴⁰), (0y¹³⁹), (0y¹³⁸)** for Great Eastern, Preussen, Wyoming and the steamer, **(0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r312 list them.

**r314 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r314` already exists before writing into it. Then (0y¹⁴⁶), the furled topsail yards on the caps, which the Asow plate reads for all three masts. Else (0y¹⁴⁵).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
