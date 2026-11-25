
## Round 330 — 2026-11-25 — The fluyt's fore and main course yards now hang just under their tops, where Hollar's 1647 etching of a fluyt under sail draws them. Until this round both hung at the class 0.60 of the lower mast, which no plate set, so her courses were short and her topsails deep. On the fore the course yard is now 8.25 m over the mast's foot, where it was 5.57 m; on the main it is 9.95 m, where it was 7.49 m. Reading the fore course yard also showed that r329 had read the fore top on the row where the course yard crosses the mast. The fore top is 37 px higher on the plate, and it now stands 9.39 m over the mast's foot, where r329 built it at 8.37 m

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁷⁴), which r329 named. `build/staging/r330` did not exist. At the start the load was 1.9 and no process was hot. r329's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE.** Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, 1647 (`r328/dl/hollar-flute.jpg`, 1920 px, bow at the left), as r329 read it. Crops with row ticks: `fore-wide.png`, `fore-yard.png`, `main-yard.png`, `fore-mast-whole.png`, `main-mast-whole.png`.

**THE FORE TOP, RE-READ.** r329 put the fore top on row 600. The fore course yard, traced as a straight line, crosses column 724 at row 600.5, so r329's "top" was the course yard. The top is a dark band on rows 563–572 at columns 740–758, aft of the topsail's leech, with the topmast shrouds' deadeyes above it. The main top is drawn the same way: a band on rows 528–540 with deadeyes above it, and r329 read its upper edge, 528. The fore top's upper edge is 563. Its fore half is behind the topsail. The fore top's share of the fore-to-mizzen span is now 0.4363, where it was 0.3887, and it stands 9.39 m over the mast's foot, where it stood 8.37 m. The topmast's head (row 285) and the pole's head (row 161) were read independently, so they stand where they stood, and the fore topmast is 1.02 m shorter. The main stays the tallest lower mast, so no mast's diameter changed.

**THE COURSE YARDS** (`r330_trace.py`: for each column, the centroid of the dark pixels within 6 rows of a guide line, then a straight-line fit).

| Course yard | traced columns | points, rms | axis column at the yard | crossing row | deck rows | top row | share of deck-to-top |
|---|---|---|---|---|---|---|---|
| fore | 660–772 | 29, 1.6 px | 708 | 604 | 902 | 563 | 0.879 |
| main | 1065–1205 | 36, 1.4 px | 1159 | 576 | 933 (rail) and 963 (hidden deck) | 528 | 0.881 and 0.890, mean 0.886 |

- **The mast's axis at the yard** is on the line from the mast's foot to its topmast's cap (fore: 724, 902 to 693, 285; main: 1143, 933 to 1176, 192). The yard slopes 0.20 px per column on the fore and 0.30 on the main, so 8 px of error in the axis column moves the crossing by 1.6 and 2.4 px.
- **Both yards slope on the plate**, the after yardarm higher, because they are braced round and the ship is seen from a little forward of the beam. The model hangs each yard level at its crossing.
- **The main's deck** is the waist rail, as in r329, and the hidden waist deck may be 30 px lower. A-COURSE-READ takes the mean of the two shares.
- The bound is 0.03 of the deck-to-top height, as for the East Indiaman's reads (r323).

| Built over each mast's foot (`probe-before.json`, `probe-after.json`) | course yard, before → after | top, before → after | course yard over the top's height |
|---|---|---|---|
| fore | 5.57 → 8.25 m | 8.37 → 9.39 m | 0.666 → 0.878 |
| main | 7.49 → 9.95 m | 11.22 m | 0.667 → 0.886 |

**WHAT CHANGED** (`r330_edit.py`, one script for the record and both copies of the audit, every replace asserted).

- **Record.** The fluyt's fore and main carry `courseRead` (the share, the four rows, the axis column, the trace's slope, intercept, points and rms, the plate, the script), and `courseAtProvenance` opens PLATE READ and names the plate, its scale, each row and the bound. The fore's `mastHeightsRead.rows.top` is 563 and its `mastHeightsM.top` 9.39 m, and its provenance says what r329 read and why it was the yard. The main's provenance now says that row 528 is the top's upper edge.
- **Builder.** No change. `courseRead` has been drawn by the builder since r313.
- **Audit**, A-COURSE-READ. Two new checks. *'a course and a mast read that disagree on the top'*: where a mast carries both a course read and a mast read off the same plate file, their top rows agree within 1 px. *'a course read at its own top'*: a course read at 0.97 of the deck-to-top height or more. A course yard hangs in slings under its top, so a share that high means one of the two rows is the other feature. r329's fore top would have given the fore course 0.987.
- `Research/MASTHEADS.md` §7 records the read and the correction.

**PROOFS** (:8150, `webb/`, `r330_proofs.sh`):

| Proof | What was broken | Problems found |
|---|---|---|
| A | r329's fore top (row 600, 8.37 m) with this round's course read | 1: 'a course and a mast read that disagree on the top' (563 against 600) |
| B | A, with the course read also taken against row 600 (0.987) | 2: 'a course read at its own top', and 'a top through the sail set over it' (the course yard at the top's height puts the top 0.09 m before the topsail's cloth) |
| C | the builder ignoring `courseRead` (one line flipped) | 9: 'a course off its plate read' on every read course in the fleet, the fluyt's two among them |
| D | r329's audit with A's record | 0: the old audit could not see the misread top |

`audit-first.out` (:8149, this round's tree): **0 problems on 33 hulls.**

**WITNESSED.** `#v=ship&s=fluyt&b=90&l=8&z=1.0`, panels hidden, before and after on :8149 (`w-fluyt-before-beam.png`, `w-fluyt-after-beam.png`, `pair-fluyt-beam.png`). `pair-fluyt-hollar.png` puts the after frame's rig beside Hollar's plate. On the fore and the main the course yard now stands just under the top, and the course is as deep as the topsail; before, the course was about half the topsail's depth. The fore top shows as a small round platform just above the fore course yard, aft of the mast, as on the plate.

**Rule 0, on `w-fluyt-after-beam.png` read whole: three rendered ships on a rippled sea under a low grey coast, the fluyt broadside in the middle. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The fluyt has three masts. The fore and the main each carry three square sails, one above another, and the mizzen carries a triangular sail on a slanting yard.**
2. **On the fore and the main the lowest sail is as deep as the one above it, and the highest is small.**
3. **On the foremast a small round platform stands just above the lowest sail's yard.**

**WHAT IS STILL OPEN.**

- **(0y¹⁷⁴) is closed.**
- **(0y¹⁷⁶), NEW: the fluyt's topsail yards.** They still hoist at the class 0.88 of the topmast section (`hoistProvenance` UNREAD, r324). On the plate the fore topsail is set to just under the topmast's cap (row 285) and the main's to row 192; read both against the trace method used here.
- **(0y¹⁷³)**, the lateen's peak against Hollar's rows, and **(0y¹⁷⁵)**, the fluyt's mast stations and sheer, stand as r329 lists them.
- **(0y¹⁷⁰)**, the sekibune's halyard lead; **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r329 list them.

**THE FRAMES.** No baseline frame shows the fluyt in her own berth. Predicted movers: `shipwright`, `shipwright-ahead` and `shipwright-furled`, where her rig stands at the left edge (she is the 74's left berth neighbour), and `action-gravelines`, whose English fleet is drawn with the fluyt model (r329). `globe-default` may move a little if a fluyt voyage marker is on screen; four voyages sail her (codfleet, jamestown, mayflower, balticgrain). The full ratchet was launched on the final tree at 13:26:32, at load 8.6, before the build and this entry. **Every frame is scored and classified in the receipt that follows.**

**r331 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r331` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁷⁶), the fluyt's topsail yards, off the same plate.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
