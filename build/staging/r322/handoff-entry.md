
## Round 322 — 2026-11-25 — The East Indiaman's and the slave ship's masts now stand at Vasa's heights, read off Hocker's rig diagram of 1628. Until this round they were Steel's 1794 proportions: tall lower masts, a topmast 0.60 of the lower mast and a topgallant half the topmast. Vasa's lower masts are short and her topmasts long. On the East Indiaman the main top is now 13.5 m over the deck where it was 23.9 m, and the main truck 36.0 m where it was 45.4 m. Her mizzen top is 10.0 m over the deck where it was 20.5 m. The lateen yard r321 keyed to the masts' stations now crosses the mizzen at 0.743 of the deck-to-top height; Vasa's crosses at 0.717. The fluyt keeps Steel's shares until her mizzen topsail is settled, and her record says so

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶⁴), which r321 named next. `build/staging/r322` did not exist. The load was 1.9 at the start and no process was hot. r321's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE READ** (`r322_read.py`, `mast-read.json`, crops `c-fore-up.png`, `c-main-up.png`, `c-miz.png`, `heads4x.png`, `lowertops.png`). Hocker, *Vasa II* (2023), p. 31, the rig diagram, the 1920 px thumbnail r320 saved (`r320/dl/vasa-rig.jpg`, bow at the right). The script fitted each mast's axis and found where it meets the hull's upper edge. The rows of the tops, caps and trucks were then read by eye off 3x and 4x crops with row ticks, each to about 3 px.

The script's first pass misread the plate, and so did I. On the fore and the main, the platform at row 367 (fore) and 338 (main) is the TOPMAST's top, not the lower top. The lower tops are the wide platforms at rows 683 and 682, under the topsails (sails 4 and 7), with the lower caps at rows 628 and 622. A first record built from the wrong rows gave the East Indiaman a 29 m lower mast with a 6.6 m topmast over it. It was discarded before any capture.

| Vasa, rows on the plate | foot | lower top | topmast cap | topgallant cap | staff head |
|---|---|---|---|---|---|
| fore (column 1149.6) | 1005 | 683 | 330 | 220 | 158 |
| main (column 655.6) | 1012 | 682 | 298 | 132 | 50 |
| mizzen (column 323.7) | 944 | 700 | 459 | — | 366 |

Above the highest cap on every mast Vasa carries a bare staff with no sail on it. The builder does not build the staffs, and the records give their shares under `staffOfSpacing`.

**THE DATUM.** Each height is a share of the horizontal distance between the fore and mizzen masts' feet, 825.9 px on the plate. That is the same datum r321 used for the lateen yard, and the builder carries it: the mast stations. The hull's station shares are close to Vasa's. The fore-to-main spacing over the main-to-mizzen spacing is 1.54 on the East Indiaman and 1.49–1.56 on Vasa, depending on which main foot column is used. The alternative datum is the hull's length overall, taffrail to beakhead tip, which is 1447 px on the plate and 51.9 m on the East Indiaman's built hull. Keyed to that, every height comes out 0.86–0.88 of these. The record calls the datum CONTESTED and gives both. The drawing's scale agrees with Vasa's published figures. The bowsprit tip to the taffrail is about 1632 px against her 69 m length overall, which is 23.7 px/m. The main truck is then 40.7 m over the deck, and the museum's 52.5 m from keel to main truck leaves 11.8 m from the keel to the deck.

| Share of the fore-to-mizzen spacing | top | topmast cap | topgallant cap (truck) | staff |
|---|---|---|---|---|
| fore | 0.3899 | 0.8173 | 0.9505 | 1.0255 |
| main | 0.3996 | 0.8645 | 1.0655 | 1.1648 |
| mizzen | 0.2954 | 0.5872 | — | 0.6998 |

**WHAT CHANGED.**

- **Record** (`r322_record.py`, run on `probe-before.json`'s built feet). On every mast of `east-indiaman` (spacing 33.774 m) and `slave-ship` (20.343 m): `mastHeightsM` in metres, the share times this hull's spacing; `mastHeightsRead` (the shares, the rows, the feet, the plate, the spacing, a bound of 0.004 of the spacing per row and 0.05 m on the built height); and `mastHeightsProvenance`, which opens READ, names the plate and its scale, names the CONTESTED datum, and says the hull has no plate of its own. The mizzens carry `top` and `crosstrees` and no `truck`, because they are built in two pieces (`only` 2). `fluyt`: `mastHeightsProvenance` CLASS on all three masts. It says her lateen mizzen is one pole without a topsail, while Vasa's mizzen is two pieces with one. Which of Vasa's heights her pole should take depends on (0y¹⁶³). The East Indiaman's and the slave ship's `lateenYardProvenance` no longer say the crossing "stands low on the mast until (0y¹⁶⁴)". They give the crossing as built: 0.743 and 0.749 of the deck-to-top height, 0.026 and 0.032 above Vasa's 0.717.
- **Builder** (`hull.js`, `r322_edit.py`). `squareStackOf` accepts a two-piece mast's `mastHeightsM` with no truck, and solves its topmast from the crosstrees as before. The loft card's rig-height line now reads "derived: another ship's plate, read and applied to this hull" when the mast carries `mastHeightsRead`, so the Shipwright card prints the height *derived* (East Indiaman 36.0 m, slave ship 21.7 m). Before, a `mastHeightsM` was always printed as the record's own. Every hull without `mastHeightsRead` builds byte-identically.

| Built, over each mast's foot (`probe-before.json`, `probe-mid.json`) | top, before → after | topmast cap | truck |
|---|---|---|---|
| East Indiaman fore | 21.27 → 13.17 | 34.97 → 27.60 | 40.36 → 32.10 |
| East Indiaman main | 23.93 → 13.50 | 39.36 → 29.20 | 45.42 → 35.99 |
| East Indiaman mizzen | 20.52 → 9.98 | 33.74 → 19.83 | — |
| slave ship fore | 13.33 → 7.93 | 21.92 → 16.63 | 25.29 → 19.34 |
| slave ship main | 14.99 → 8.13 | 24.66 → 17.59 | 28.46 → 21.68 |
| slave ship mizzen | 12.85 → 6.01 | 21.13 → 11.95 | — |

**AUDIT.**

- New rule **A-MAST-READ**. On a hull whose lateen mizzen carries `lateenRead`, every mast answers for its heights: READ, RECORD, CONTESTED or CLASS. Silence convicts ('a mast beside a Vasa read with no height answer'). A READ carries `mastHeightsRead`. Each share agrees with its own plate rows within 0.0005 ('a mast read that disagrees with its own rows'). Each recorded height is its share times the spacing of the hull's fore and aftermost stations, as the builder places them (`stX`), within 0.05 m ('mast heights off their read'). A-MAST-HEIGHTS already checks the segments against the metres. This rule checks the metres against the stations, so a moved station cannot leave the heights stale.
- **A-MAST-HEIGHTS** accepts a two-piece mast with a top and crosstrees and no truck.
- **A-CROSSJACK-BARE** fixed in the audit. Its 'a roll on a bare crossjack' test took any roll within 1.5 m of the crossjack's centre. With the new heights, the lateen's own roll (its centroid is near the mast, where the yard crosses) came 1.21 m from the East Indiaman's crossjack and 0.70 m from the slave ship's. A roll is now on the crossjack only when it records that yard (`userData.onYard`, r316). Every roll on a square yard records it; a lateen's roll records none.
- The rig-height provenance rule takes a `mastHeightsRead` height as derived, not as the record's.

| Proof (on :8150, `webb/`) | What was broken | Problems found |
|---|---|---|
| OLD | r321's builder and record, the new audit | 9: silence on every mast of the fluyt, the East Indiaman and the slave ship |
| B | this round's builder and record, the East Indiaman's main truck raised 1.0 m in the record | 1: 'mast heights off their read', truck 36.99 m against 35.99 m |
| C | this round's record; the builder's crossjack furled like any yard | 10, among them 'a roll on a bare crossjack' on the 74, the East Indiaman and the slave ship, now matched by the record |
| FINAL (`audit-final.out`, :8149 from web/) | none | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=<id>&b=90&l=6&z=1.1`. Before was shot on :8150 with r321's builder and record; after on :8149 (`w-east-indiaman-*.png`, `w-slave-ship-*.png`, `pair-*.png`, `crop-ei-after.png`). On both ships the tops come down to just over the courses. The topmasts are now the longest pieces above them, the topgallant masts are short, and the rig is lower overall. The mizzen top stands just above the lateen yard's crossing, and the crossjack is between the two.

**Rule 0, on `w-east-indiaman-after.png` read whole: a rendered three-masted ship broadside on a rippled sea, with a low grey coast behind and two neighbouring hulls cut by the frame's edges. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **Each mast has a round platform (a top) a little above the lowest sail, and a second, taller sail stands above it.**
2. **The aftermost mast is the shortest, and the upper end of the slanting yard beside it stands higher than its platform.**
3. **The card beside the ship gives her rig as 36.0 m from the deck to the truck, marked derived.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶⁴) is closed** for the East Indiaman and the slave ship. The fluyt waits on (0y¹⁶³), and her record says so.
- **(0y¹⁶⁵), NEW: the course yard on a Vasa mast.** The fore and main courses still hang at the class 0.60 of the lower mast, which is 0.667 of the height from the deck to the top. The ratio is the same as before this round, but with the lower top now at 13.5 m it puts the East Indiaman's main course yard about 4.5 m under the top. Vasa's plate puts the fore course yard at row 742.5, which is 0.815 of the deck-to-top height. The main course yard is drawn cocked, and where it crosses the mast axis it is at row about 752, which is 0.79. `courseRead.ofDeckToTop` (r313) already carries such a read. Add it to the fore and main of both hulls and add their rows to the audit. This was found while the ratchet was already capturing from web/, so it was not done this round.
- **(0y¹⁶³)**, the fluyt's and the carrack's mizzen topsail. Once it is decided, read the fluyt's three masts off the same plate.
- `ship-treasure` captures the globe in a full run (r318, r319); r320's next step stands. **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r321 list them.

**THE FRAMES.** Predicted movers are listed below. `ship-slave-ship` is reframed, because the camera's datum is the rig's top and her rig is 6.8 m lower. In the 74's frames, `shipwright`, `-ahead`, `-astern`, `-furled` and `-hounds`, the East Indiaman's rig reaches the left edge. The slave ship's berth neighbours are `ship-galley`, `ship-galleass` and `ship-carrack`. The East Indiaman's are `ship-sekibune` and `ship-panokseon`, if their frames reach her. No Sea, Action or globe frame is known to show either ship. The full ratchet was launched on the final tree at 04:08, at load 5.5, beside this close. **Every frame is scored and classified in the receipt that follows.**

**r323 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r323` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁶⁵) off the same Vasa drawing.**

**Live stamp: docs/index.html carries data-version 1795608964 at the build.**
