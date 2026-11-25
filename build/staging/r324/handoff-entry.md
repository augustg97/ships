
## Round 324 — 2026-11-25 — The East Indiaman's and the slave ship's topsail and topgallant yards now hang where Vasa's rig diagram draws them. Until this round every yard above the course was hoisted to 0.88 of the mast section it rides on. That figure is the class rule for a yard "atrip", and no plate set it. Hocker's diagram draws each of Vasa's five hoisting yards lower: the topsail yard just under the topmast's top, and the topgallant yard just under the topgallant mast's top. On the East Indiaman the main topsail yard is now 25.77 m over the mast's foot where it was 27.28 m. The fore topsail yard is 24.87 m where it was 25.83 m, and the mizzen topsail yard 17.95 m where it was 18.62 m. The topgallant yards are 0.4–0.7 m lower. Each topsail is shallower by the same amount, and bare topmast now shows above each yard

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶⁶), which r323 named next. `build/staging/r324` did not exist. At the start the load was 2.1, and CleanMyMac's menu agent was at 75% of one core. r323's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE READ** (`r324_read.py`, output in `read.json`). Hocker, *Vasa II* (2023), p. 31, the rig diagram: the 1920 px thumbnail that r320 saved (`r320/dl/vasa-rig.jpg`, bow at the right). r323 read these rows by eye. This round fits them by pixel. Spar pixels are those with R−G over 30 or grey under 150; the cloth reads R−G 13–21 and grey 190–235. In each column on both sides of the mast, the yard's centre row is fitted to a line, dropping points more than 2 px off it, four times. The mast's axis is fitted the same way, on its centres in 30 rows above and 30 below the yard. The yard's row is where the two lines cross. The feet and heads are r322's rows (`mastHeightsRead`).

| Vasa, rows on the plate | foot | head of the section | yard crosses the axis (fit: columns, rms) | share of foot-to-head | the class 0.88, built before |
|---|---|---|---|---|---|
| fore topsail | 1005 | 330 (topmast cap) | 396.8 (75, 0.45 px) | 0.9010 | 0.936 |
| main topsail | 1012 | 298 | 381.8 (144, 0.40 px) | 0.8826 | 0.934 |
| mizzen topsail | 944 | 459 | 504.9 (117, 0.50 px) | 0.9054 | 0.939 |
| fore topgallant | 1005 | 220 (topgallant cap) | 247.3 (69, 0.39 px) | 0.9652 | 0.977 |
| main topgallant | 1012 | 132 | 175.5 (114, 0.44 px) | 0.9506 | 0.971 |

r323's eye reads for the topsail yards (396, 381) agree with the fits to under 1 px. The main's yards are drawn cocked, with the slope of the fitted line at −0.16; the model hangs them level at the height where the line crosses the axis, as r323 did with the main course. A 3 px error is under 0.007 of any span here. The record's bound is 0.01.

**WHAT CHANGED.**

- **Builder** (`hull.js`, at the segment rig's `crossYard` call). A square mast with no `yards` list may record `hoistRead.topmast` and `hoistRead.topgallantMast`, each with `ofFootToHead`. This is the yard's height over the mast's foot, over the height of that section's head over the same foot. A side-view plate gives this share directly, and it uses the same two points r322's `mastHeightsM` reads. Every hoisting yard on such a mast now records where it is set: `userData.hoistAt`, from `record` or `class`, with `setY`, `base` and `head`. The furled build still lowers each yard onto the cap below, because the plate shows the sails set. Without the field a yard is set at the same expression as before (`y + seg * 0.88`), so the other 31 hulls build where they built. The only addition to their yards is the `hoistAt` record. The ratchet's frames of those hulls are the check.
- **Record** (`r324_record.py`). The six masts of `east-indiaman` and `slave-ship` carry `hoistRead`, with the rows, the fit and the plate, and a `hoistProvenance` that opens PLATE READ. The other seven segment-rig square masts carry `hoistProvenance` UNREAD: the carrack's fore and main, the fluyt's fore and main, and the 74's three masts. Their yards stay at the class 0.88.

| Built, over each mast's foot (`probe-before.json` on :8150 with r323's tree, `probe-after.json` on :8149) | before | after |
|---|---|---|
| East Indiaman fore topsail / topgallant | 25.83 / 31.35 m | 24.87 / 30.98 m |
| East Indiaman main topsail / topgallant | 27.28 / 34.95 m | 25.77 / 34.21 m |
| East Indiaman mizzen topsail | 18.62 m | 17.95 m |
| slave ship fore topsail / topgallant | 15.57 / 18.89 m | 14.98 / 18.67 m |
| slave ship main topsail / topgallant | 16.43 / 21.05 m | 15.53 / 20.61 m |
| slave ship mizzen topsail | 11.22 m | 10.82 m |

Every built share equals its read to the fourth decimal.

**AUDIT. A-HOIST-READ, new**, written after A-COURSE-READ. It has two parts.

- **Record.** Every segment-rig square mast with more than one tier must carry `hoistProvenance`, opening PLATE READ with a `hoistRead` or UNREAD without one. A mast that says neither is convicted. Each read must carry a share for each section above the lower mast, and that share must agree with its own rows to within 0.005.
- **Built.** A mast must carry one hoisting yard per section above the lower. A read must be drawn from the record, and a yard with no read must be drawn at the class figure. Each yard's set height, as a share of foot-to-head, must stand within the read's bound of the read. In the set build, the yard's axis must stand at that set height to within 0.005 m.

The rule's three proofs:

- **A**, r323's builder and record on :8150 (`proofA.out`): 26 problems, two on each of the 13 masts. The record says nothing, and the yards do not say where they are set.
- **B**, r323's builder with this round's record (`proofB.out`): 13 problems. The yards do not say where they are set.
- **C**, this round's builder with the read's height line disabled, and this round's record (`proofC.out`): 10 problems, one per read yard. Each yard is off its plate read by 0.011–0.052.

`audit-first.out`, :8149 from web/: 0 problems on 33 hulls.

**WITNESSED.** `#v=ship&s=<id>&b=90&l=6&z=1.1`. Before was shot on :8150 with r323's tree (`webb/`), after on :8149. The files are `w-east-indiaman-*.png`, `w-slave-ship-*.png`, and the three-mast crops `pair-east-indiaman.png` and `pair-slave-ship.png`, before on the left of each pair. On both ships the topsail yard on the fore and the main now sits lower on the topmast, with a length of bare topmast above it, and the topsail is shallower. The topgallant yard sits lower on its mast, with bare pole showing above it. The mizzen topsail yard has come down from the crosstrees.

**Rule 0, on `w-east-indiaman-after.png` read whole: a rendered three-masted ship broadside on a rippled sea, with a low grey coast behind. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **Each mast carries its sails in tiers, one above another, and the lowest sail on the fore and the main is the deepest.**
2. **Above the topsail yard on the main mast a length of bare mast stands clear before the next sail starts.**
3. **The aftermost mast carries a triangular sail on a slanting yard, and above it one small square sail.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶⁶) is closed** for the East Indiaman and the slave ship. Every square yard on both hulls now hangs where Vasa's plate draws it.
- **(0y¹⁶⁷), NEW: Vasa's topmast tops.** The plate draws a small round top on each topmast, under the cap. By eye it sits at about row 365 on the fore (cap 330), 338 on the main (cap 298) and 482 on the mizzen (cap 459). With the model's topmast heel at 0.88 of the lower mast, that is about 0.90 of the topmast's length, the same share as the lower top on the lower mast. The model draws crosstrees at 0.97 of the topmast (`topHead`, hull.js about line 5482). Fit the rows by pixel as this round did, and probe the built crosstrees, before deciding whether to draw a topmast top on these two hulls.
- **(0y¹⁶³)**: the fluyt's and the carrack's mizzen topsail. Once it is decided, read the fluyt's three masts off the same plate. Her masts' `hoistProvenance` is UNREAD now and would turn with them.
- `ship-treasure` captures the globe in a full run (r318, r319); r320's next step stands. **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r323 list them.

**THE FRAMES.** Predicted movers, from r322's and r323's lists for the same two hulls:

- `ship-slave-ship`, which is not reframed, because the truck is unchanged.
- The 74's frames `shipwright`, `-ahead`, `-astern`, `-furled` and `-hounds`, where the East Indiaman's upper rig reaches the left edge. A furled roll keeps the cloth of the set sail, so its size changes slightly.
- The slave ship's berth neighbours `ship-galley`, `ship-galleass` and `ship-carrack`.
- `globe-default`, whose 1590 Middle Passage markers are slave-ship models.

The full ratchet was launched on the final tree at 06:24, at load 5.6, after the witnesses and before the close. **Every frame is scored and classified in the receipt that follows.**

**r325 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r325` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁶⁷) off the same Vasa drawing.**

**Live stamp: docs/index.html carries data-version 1795616674 at the build.**
