
## Round 323 — 2026-11-25 — The East Indiaman's and the slave ship's fore and main course yards now hang where Vasa's rig diagram draws them: 0.815 of the height from the deck to the top on the fore, and 0.788 on the main. Until this round both hung at the class 0.60 of the lower mast, which is 0.667 of that height, and no plate set it. With r322's lower tops, that left a gap of about 4.5 m between each course yard and its top on the East Indiaman, and the course hung well down the mast. On the East Indiaman the fore course yard is now 10.72 m over the mast's foot where it was 8.77 m, and the main 10.65 m where it was 9.01 m. On the slave ship the fore is 6.45 m where it was 5.28 m, and the main 6.41 m where it was 5.43 m. Each course is deeper by the same amount; in the witnesses its foot stands where it stood

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶⁵), which r322 named next. `build/staging/r323` did not exist. The load was 1.9 at the start and no process was hot. r322's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE READ** (`r323_crop.py`, crops `lower-fore.png`, `lower-main.png`, each 3x with a tick every 10 rows). Hocker, *Vasa II* (2023), p. 31, the rig diagram, the 1920 px thumbnail r320 saved (`r320/dl/vasa-rig.jpg`, bow at the right, about 23.7 px/m). The feet and tops are r322's rows. The yard rows were read by eye off the crops, each to about 3 px.

| Vasa, rows on the plate | foot (mast meets hull) | top (platform centre) | course yard crosses the mast | share of deck-to-top |
|---|---|---|---|---|
| fore (column about 1150) | 1005 | 683 (platform 675–690) | 737–747, centre 742.5 | (1005 − 742.5) / 322 = 0.815 |
| main (column about 656) | 1012 | 682 (platform 672–690) | 747–757, centre 752 | (1012 − 752) / 330 = 0.788 |
| mizzen, r320 | 944 | 700 | 736–738 | 0.848 |

On the plate the fore course yard is level. The main course yard is drawn cocked, with its fore end higher than its after end; its row is read where its centre line crosses the raked mast. The model hangs it level at that height. A 3 px error is 0.009 of either span, and the bound in the record is 0.03, as on the mizzen.

**WHAT CHANGED.** Record only (`r323_record.py`, on `vessels.json`). On the fore and main of `east-indiaman` and `slave-ship`: `courseRead` with the share, the rows, the plate, the columns and the bound; `courseAtProvenance` now opens PLATE READ and gives the rows and the old class figure. The builder already hangs a course at `courseRead.ofDeckToTop` (r313), so `hull.js` is unchanged. Every other hull builds byte-identically.

| Built, over each mast's foot (`probe-before.json` on :8150 with r322's record, `probe-after.json` on :8149) | course yard, before → after | top | share of deck-to-top, before → after |
|---|---|---|---|
| East Indiaman fore | 8.77 → 10.72 m | 13.17 m | 0.666 → 0.814 |
| East Indiaman main | 9.01 → 10.65 m | 13.50 m | 0.667 → 0.789 |
| slave ship fore | 5.28 → 6.45 m | 7.93 m | 0.666 → 0.814 |
| slave ship main | 5.43 → 6.41 m | 8.13 m | 0.667 → 0.789 |

**AUDIT.** No new rule. A-COURSE-READ (r313) already convicts a PLATE READ provenance with no figure, a figure that disagrees with its own rows by more than 0.005, a read not drawn, and a built yard off its read by more than the bound. All four new reads pass it: the rows give 0.8152 and 0.7879 against 0.815 and 0.788, and the built shares are 0.814 and 0.789. `audit-first.out`, :8149 from web/: 0 problems on 33 hulls. The rule's proofs were made in r313 and r320.

**WITNESSED.** `#v=ship&s=<id>&b=90&l=6&z=1.1`. Before was shot on :8150 with r322's record (`webb/`); after on :8149 (`w-east-indiaman-*.png`, `w-slave-ship-*.png`, `pair-east-indiaman.png`, `pair-slave-ship.png`). On both ships the fore and main course now start just under the tops, where before there was open mast between the course yard and the top. The courses are deeper, and their feet stand where they stood.

**Rule 0, on `w-east-indiaman-after.png` read whole: a rendered three-masted ship broadside on a rippled sea, with a low grey coast behind. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **On the fore and main masts the lowest sail hangs from a yard just below the round platform, so the sail reaches almost up to the platform.**
2. **The lowest sails are the deepest sails on the ship, and their feet stand a little above the deck.**
3. **The aftermost mast carries a triangular sail on a slanting yard, and above it one small square sail.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶⁵) is closed** for the East Indiaman and the slave ship. Every course on both hulls is now read off Vasa's plate.
- **(0y¹⁶⁶), NEW: the topsail yards on a Vasa mast.** The topsail yard hangs at the segment rule, 0.88 of the topmast. Read where Vasa's fore and main topsail yards cross their masts (below the topmast caps, which r322 read at rows 330 and 298) and compare with the built height, before deciding whether a record field is needed.
- **(0y¹⁶³)**, the fluyt's and the carrack's mizzen topsail. Once it is decided, read the fluyt's three masts off the same plate.
- `ship-treasure` captures the globe in a full run (r318, r319); r320's next step stands. **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r322 list them.

**THE FRAMES.** Predicted movers, from r322's list for the same two hulls: `ship-slave-ship`; the 74's frames `shipwright`, `-ahead`, `-astern`, `-furled` and `-hounds`, where the East Indiaman's rig reaches the left edge; the slave ship's berth neighbours `ship-galley`, `ship-galleass` and `ship-carrack`; and `globe-default`, whose 1590 Middle Passage markers are slave-ship models. The rig's truck height is unchanged, so `ship-slave-ship` is not reframed. The full ratchet was launched on the final tree at 05:14, at load 7.9, after the witnesses and before the close. **Every frame is scored and classified in the receipt that follows.**

**r324 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r324` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁶⁶) off the same Vasa drawing.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
