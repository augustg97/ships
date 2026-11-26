
## Round 334 — 2026-11-25 — The fluyt's deck line now follows the rail on Hollar's 1647 etching of a fluyt under sail. Until this round her sheer was the class curve: nearly flat, with 1.2 m of rise at the bow and 0.9 m at the stern, all of it in the outer sixth of her length. On the plate the rail runs level along the waist, steps up 0.44 m where the quarterdeck begins, and climbs to the taffrail 3.6 m above the waist. The model now draws that line. Her mizzen stands on a deck 1.8 m above the waist, the height r329 read for its foot, where the model had it 0.33 m above. The mizzen and its lateen yard rise 1.47 m with it

**Queue check: August's second list stands worked in full (r57). This round first scored r333's backlog, then took the rest of (0y¹⁷⁵), which r333 named. `build/staging/r334` did not exist. At the start the load was 3.3 and no process was hot.**

**THE BACKLOG** (`r334_resume.sh`, `score-run1.out`). Nineteen frames were captured one process per frame at the clean r333 HEAD from 18:05 to 18:16: the 17 r333 did not reach, plus `globe-crossing` and `board-salamis`. Eighteen are inside the gate; `globe-crossing` (0.020%) and `board-salamis` (0.000%) were capture faults, as r333 said. `aboard-coast` repeats r333's 0.064% / 0.029 exactly when captured alone, so its baseline was stale. The diff (`pair-aboard-coast.png`) is r333's boat change on the nearest trireme of the Syracuse armada: in the baseline her mainmast stands up through the boat on her deck, and now the boat lies clear abaft the mast. r333 called it unpredicted because it thought no boat was in that view. **Accepted.** No r333 frame is now unscored.

**THE PLATE.** Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, 1647 (`r328/dl/hollar-flute.jpg`, 1920 px, bow at the left). The line read is the rail cap, the top edge of her side. It is the one line on the plate that runs from the stem head to the taffrail. The planking seams under it merge into the hatching of the stern, and a free trace (`r334_trace.py`, `r334_rail.py`) jumped onto them and onto the sails (`crops/trace-overlay.png`).

- **The trace** (`r334_rail2.py`, `rail-trace.json`, `crops/rail-overlay.png`). Rows were hand-read off gridded crops (`crops/z-bow.png`, `g-fwd.png`, `g-aft.png`) at 19 columns from 740 to 1720. Every 5 columns the trace takes the strongest light-over-dark edge, using the median of 11 columns, within 3 rows of that hand-read line. That gives 197 points. Stays and the crew standing at the rail cross the line, so the raw rows scatter by up to 8 rows from one point to the next (0.22 m). The line's steepest real slope is about 3 rows a step, at the taffrail.
- **The quarterdeck break.** The rail rises 16 rows between columns 1210 and 1220, where the quarterdeck's rail starts at a post. That is a real step in the line and the trace records it as one.
- **The mapping.** Columns map to u through r329's frame for this plate. The fore's foot at column 724 is the built fore (x −11.499 m) and the mizzen's foot at column 1501 is the built mizzen (x 10.029 m), at 36.09 px/m, through the loft's deck line. Heights use the same scale, measured from the rail at the main's foot (row 933), which is set to the record's freeboard of 3.0 m. Hollar's waves hide the waterline, so the freeboard comes from the record and only the rise is read off the plate.

| u | 0 to 0.10 | 0.25 | 0.5 | 0.5716 / 0.5816 | 0.7 | 0.85 (mizzen) | 0.95 | 1.0 |
|---|---|---|---|---|---|---|---|---|
| read, m | 3.67 (held) | 3.42 | 3.00 | 3.08 / 3.53 | 3.90 | 4.80 | 5.94 | 6.62 |
| class curve before, m | 4.2 to 3.70 | 3.04 | 3.00 | 3.00 | 3.03 | 3.33 | 3.65 | 3.90 |

**BOUNDS, written into the provenance.**

1. The model's bow is about 5 m longer forward of the fore than the plate's (0y¹⁷⁹). Every station forward of column 740 (u 0 to 0.10) holds the stem head's row, so the stem head now stands 0.5 m lower than the class curve put it.
2. The rise abaft column 1215 includes the quarterdeck's rail as well as the hull's sheer. The model has no quarterdeck, so it draws the whole rise as sheer, and it draws the break as a ramp 0.28 m long.
3. Hollar's eye is about 2 m above the water and the rail stands higher than that. The farther stern is therefore drawn lower than it stands, so if anything the plate understates the rise aft.
4. The vertical scale is r329's, taken off the masts' spacing. The plate's hull length gives 31.4 px/m, which would make every rise 15% larger.

**WHAT CHANGED** (`r334_edit.py` for the record and `r334_audit.py` for the audit; every replace is asserted).

- **Record.** The fluyt's hull carries `sheerRead`: 23 stations, the 21-point grid plus a pair either side of the break (`breakStations`), with `rows`, `datumRows`, `cols` and the raw `trace`. Each station's row is the median of the 5 trace points within 12 columns (`stationWindowCols`). `sheerProvenance` records that `sheerBow` and `sheerStern` are superseded.
- **Builder.** No code changed. r299's `sheerRead` path draws the sheer through the stations, and the deck, rail, waterway, mast feet, channels, lateen heel and stern lights follow it.
- **Audit: A-SHEER-TRACE learns three things.**
  - `trace.breaks`: each named break, given its column and a reason, is excused the step limit at that column and nowhere else. A break with no reason is convicted.
  - `trace.stationWindowCols`: each station is held, at 2 px, to the median of the trace points within that window. Without the field the check uses the interpolated row, as before.
  - `trace.breakStations`: the two stations either side of a break are excused only the deck-vertex test, because any vertex within 0.5 m of them may lie on the step itself. They still answer to their plate row and to hullSurface's sheer.
  - Titanic's read carries none of these fields, and she checks exactly as before.

**PROOFS** (:8150, `webb/`, `r334_proofs.sh`):

| Proof | What was broken | Problems found |
|---|---|---|
| B | the breaks removed | 1: 'a deck line trace that steps onto another line' (10 rows at column 1215) |
| C | a break with an empty reason | 2: 'a deck line break with no reason', and the step |
| D | `stationWindowCols` removed | 4: 'a deck line station off its own trace' (u 0.15, 0.25, 0.4, 0.85; up to 4.76 px) |
| E | the mizzen station's row moved 3 px | 2: 'a deck line station off its plate read', 'off its own trace' |
| H | `breakStations` removed | 1: 'a deck built off its read deck line' (u 0.5716: a vertex on the step at 3.54 m) |
| F | the builder ignoring `sheerRead` (class curve) | 29 on the fluyt and 32 on Titanic: 'a sheer drawn off its read deck line', 'a deck built off its read deck line' |
| G | r333's audit with this round's tree | 6: the step at 1215, four stations off the raw trace, the vertex on the step |

`audit-webb.out` (:8150, with `vessels.json` and `audit-hulls.js` identical to the tree by `cmp`): **0 problems on 33 hulls.**

**MEASURED** (`Research/measure_ship.py --ship fluyt`; `measure-before.out`, `measure-after.out`):

| part, y in m | before | after |
|---|---|---|
| weather deck | 3.00 to 4.21 | 2.92 to 6.69 |
| rail | 3.00 to 4.15 | 2.92 to 6.31 |
| mizzen top | 10.97 to 11.39 | 12.44 to 12.86 |
| lateen yard | 3.59 to 14.59 | 5.06 to 16.06 |
| bowsprit | 3.95 to 6.65 | 3.55 to 6.25 |

The channels still stand 0.2 m under the sheer at each mast, as every channel did under the class curve (`cy = 0.97 ×` the side's height).

**WITNESSED** (`w-{before,after}-{beam,aft,low}.png`; `#v=ship&s=fluyt` at `b=90&l=8&z=1.0`, `b=60&l=10&z=0.7` and `b=90&l=1&z=0.9`; panels hidden; before on :8150 with r333's record, after on :8149). `sheet-plate-before-after.png` sets the plate over both low profiles. `pair-stern.png` crops the stern from the quarter.

**Rule 0, on `w-after-aft.png` read whole: two rendered ships on a rippled sea under a low grey coast, the fluyt from her port quarter filling most of the frame and an oared galley at the left edge. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The fluyt's deck runs level along her waist and then steps up, and from there it climbs steeply to a stern much higher than her bow.**
2. **Her ship's boat lies on the low waist between the fore and the main.**
3. **The triangular sail on her aftermost mast rises from the high after deck, well above the level of the waist.**

**WHAT IS STILL OPEN.**

- **(0y¹⁷⁵) is closed:** both the main's station and the sheer come from the fluyt's own plate.
- **(0y¹⁸⁰), NEW: the quarterdeck.** The rise abaft the break is the quarterdeck's rail as well as the hull's sheer, and the model draws it all as one deck. The plate's lower planking lines rise aft by about half as much as the rail. A `castles.aft` tier from u 0.58, with the sheer re-read off a planking line, would separate the two. Read a seam that runs the whole length first: the free traces at rows 962 and 985 left their lines aft of column 1250.
- **(0y¹⁷⁹)** stands as r333 wrote it. When the fore moves, `sheerRead`'s mapping moves with it. The stations forward of u 0.10 then come inside the trace, and so do the mast heights.
- **(0y¹⁷⁸)**, **(0y¹⁷⁰)**, **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** stand as r294 to r333 list them.

**⚠ THE DISK IS FULL.** At 18:21 the Data volume reached 104 MiB free of 460 GiB. Proofs E to G failed mid-copy, and no shell command could start for about three minutes. Nothing in the tree was damaged: the proofs work on the :8150 copy, which was restored, and `web/` was written after the disk freed. The round deleted only its own 19 backlog captures (their scores are in `score-run1.out`) and ran with about 200 MB free. `build/staging` holds **20 GB** of past rounds' scratch, and `.git` holds 7 GB. **Nothing else was deleted. August decides what goes.** Until then, a full 65-frame ratchet risks filling the disk again.

**THE FRAMES.** No baseline frame shows the fluyt in her own berth. Predicted movers: `shipwright`, `shipwright-ahead`, `shipwright-furled`, `shipwright-astern` and `shipwright-hounds`, where the fluyt is the 74's left berth neighbour and her stern now stands 2.7 m higher; and `action-gravelines`, whose English fleet is drawn with the fluyt model. They are checked one at a time after the push and scored in the receipt below. Every other frame cannot be reached by this change: the record changed only the fluyt, and the audit changed only for a sheerRead carrying the new fields. Globe frames that may draw a fluyt marker are not scored this round.

**r335 opens by checking `df -m /System/Volumes/Data`, `uptime` and `ps -r`, and checks whether `build/staging/r335` already exists before writing into it. Below about 1 GB free, it runs only single-frame checks. Then it takes (0y¹⁸⁰), the quarterdeck, or (0y¹⁷⁹).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
