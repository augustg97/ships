
## Round 321 — 2026-11-25 — The mizzen lateen yard of the fluyt, the East Indiaman and the slave ship is built as Vasa's rig diagram draws it: at 42° from the horizontal, with its heel on the deck about halfway between the mizzen and the main, and its peak over the taffrail. Until this round all three took the builder's class yard, at 56°, slung a third of its length from the heel, read from no plate. On the East Indiaman the yard is now 21.0 m where it was 26.2 m, and its peak stands over the taffrail at 19.6 m over the water where it stood at 27.3 m. On all three the clew now falls inside the stern, so the sheet is made fast at the rail and the r319 outlicker is no longer built on them. The carrack keeps the class yard, and her record now says so

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁵⁸), which r320 named next. `build/staging/r321` did not exist. The load was 1.7 at the start; CleanMyMac's menu agent was at 75% of one core. r320's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE READ** (`r321_read.py`, `lateen-read.json`, `crop-vasa-lateen.png`). Hocker, *Vasa II* (2023), p. 31, the rig diagram, the 1920 px thumbnail r320 saved (`r320/dl/vasa-rig.jpg`, bow at the right). The lateen yard's brown line was fitted on 346 columns: slope 0.904, which is **42.1°**, rms 1.3 px. Its peak is at column 112, row 599, where the spar tapers to a grey hairline over the taffrail (column 88). Its heel is at column 500, row 950, on the hull's upper edge. The mizzen's axis meets the hull at column 323.7, row 944, and is raked 7.8°. The main's axis meets the hull at column 655.6, row 1012. The yard is 523 px long, and the two masts' feet are 331.9 px apart.

| Share | Vasa |
|---|---|
| yard length / main-to-mizzen spacing | **1.576** |
| heel before the mizzen / that spacing | **0.531** |
| angle from the horizontal | **42.1°** |
| yard length / mizzen deck-to-top height | 2.143 |
| crossing of the mizzen / deck-to-top height | 0.717 |
| mizzen deck-to-top height / hull length | 0.168 |

**WHY THE YARD IS KEYED TO THE MAST SPACING AND NOT TO THE MIZZEN'S HEIGHT.** The first build keyed the yard to the mizzen's own deck-to-top height. On the East Indiaman that gave a 43.97 m yard on a 45.3 m waterline, with its peak 9.3 m past the stern (the first probe's output; the file was overwritten by the final probe, and the numbers are kept here). The reason is that her mizzen is much taller relative to her hull than Vasa's. Her deck-to-top height is 20.5 m, which is 0.45 of her waterline length; Vasa's is 0.17 of hers. Her lower masts are Steel's 1794 proportions, and Vasa's lower masts are much shorter, with long topmasts. The main-to-mizzen spacing and the taffrail are hull datums. Keyed to them, the yard's heel lands between the masts and its peak lands over the taffrail on all three hulls, where Vasa's are. The cost is that the yard now crosses the mizzen at 0.35–0.36 of its deck-to-top height, where Vasa's crosses at 0.717, so the lateen sits low on a tall mast. That is the mast's error, and it is now **(0y¹⁶⁴)**.

**WHAT CHANGED.**

- **Builder** (`hull.js`, the lateen block): a mast whose record carries `lateenRead.yardOfMastSpacing` takes the read angle, a yard of that share of the spacing to the next mast forward, and a heel that share before the mast. The heel's height is the deck under it, as before. Where the yard crosses the mast follows from those three. `userData.lateen` now records `yardLen`, `angleDeg`, `heel`, `peak`, `spacing`, `d2t`, `slingOfD2T` and `yardFrom`. Every hull without `lateenRead` builds as before; the carrack's probe is identical.
- **Record** (`r321_record.py`, then a rekeying step run inline from the shell that moved the height-keyed shares under `vasaShares`; the final record is `vessels.after.json`): on masts[2] of `fluyt`, `east-indiaman` and `slave-ship`, new `lateenRead` (the shares, the rows, the plate, a bound of 0.03 on each share and 1° on the angle, and Vasa's height-keyed shares under `vasaShares`) and `lateenYardProvenance` (PLATE READ, with the plate's scale and the reason for the keying). The East Indiaman's and the slave ship's `mizzenSailProvenance` no longer quote the class figures. `carrack`: `lateenYardProvenance` CLASS, saying she is dated 1450–1600 and the Vasa read is not applied to her.

| Mizzen lateen yard, set build (`probe-before.json`, `probe-after.json`) | Before | After |
|---|---|---|
| East Indiaman: length, angle | 26.22 m, 56.2° | 20.98 m, 42.1° |
| East Indiaman: heel (x, y) | 10.85, 5.49 | 8.65, 5.49 (7.07 m before the mizzen; spacing 13.31 m) |
| East Indiaman: peak (x, y) | 25.46, 27.26 | 24.22, 19.56 (the deck's aft end is at x 24.19) |
| East Indiaman: clew x, sheet | 25.76, outlicker | 21.00, rail |
| Fluyt: length, peak height | 17.14 m, 17.86 m | 13.38 m, 12.60 m |
| Slave ship: length, peak height | 16.42 m, 17.22 m | 12.68 m, 12.08 m |
| Carrack | 21.32 m, 56.2° | unchanged |

**CARDS** (`cards-before.out`, `cards-after.out`). On the fluyt, the East Indiaman and the slave ship, stage 6's "Also added" now reads "parrels and lateen sheet"; it read "parrels, outlicker and lateen sheet". It reads the built meshes, and the outlicker is no longer built on them. Stage 7 and the furled card are unchanged. Only stage 7 is in any frame.

**AUDIT.** New rule **A-LATEEN-READ**. On every lateen mizzen of a hull that carries square canvas: (1) `lateenYardProvenance` is present, and silence convicts: 'a lateen mizzen yard with no answer'; a PLATE READ carries `lateenRead`, and no other answer does. (2) The read's shares agree with its own plate rows within 0.005 and 0.1°. (3) Off the set yard mesh's own end centres: the length and the heel's distance before the mast, each over the spacing of the two masts' stations, and the angle, stand within the read's bounds: 'a lateen yard off its read'.

| Proof (on :8150, `webb/`) | What was broken | Problems found |
|---|---|---|
| OLD | r320's builder and record, the new audit | 4: silence on the carrack, the fluyt, the East Indiaman and the slave ship |
| B | r320's builder, this round's record | 3: 'a lateen yard off its read', e.g. the East Indiaman's built yard is 1.969 of the spacing, heel 0.366, 56.15° |
| FINAL (`audit-first.out`, :8149 from web/) | none | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=<id>&b=90&l=6&z=1.1`, before from :8150, after from :8149 (`w-east-indiaman-*.png`, `w-fluyt-*.png`, `pair-east-indiaman.png`, `crop-ei-mizzen.png`, `crop-fluyt.png`). On both ships the yard before rose steeply from a heel close to the mizzen, and its peak stood 4.9 m above the crossjack (East Indiaman) or 0.3 m under the pole's head (fluyt). After, the yard is flatter, its heel stands on the deck between the main and the mizzen, and its peak is over the taffrail. The sail is smaller and sits lower on the mast. The fluyt's lateen pole now stands bare for about a third of its height above the yard's crossing.

**Rule 0, on `w-east-indiaman-after.png` read whole: a rendered three-masted ship broadside on a rippled sea, with a low grey coast behind and two neighbouring hulls cut by the frame's edges. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The aftermost mast carries one square sail high up and a triangular sail low down on a slanting yard.**
2. **The slanting yard's lower end is on the deck forward of the aftermost mast, and its upper end is above the stern.**
3. **Her side has a row of square gunports along one deck.**

**THE FRAMES.** Predicted movers: `ship-slave-ship` (her own frame); the 74's frames `shipwright`, `-ahead`, `-astern`, `-furled`, `-hounds`, where the East Indiaman's mizzen reaches the left edge (r320 moved the first three); the slave ship's berth neighbours `ship-galley`, `ship-galleass`; the fluyt's berth neighbours `ship-sekibune`, `ship-panokseon`, if their frames reach her. No Sea, Action or globe frame is known to show any of the three. The full ratchet was launched on the final tree at 02:57:46, at load 5.3, beside this close. **Every frame is scored and classified in the receipt that follows.**

**WHAT IS STILL OPEN.**

- **(0y¹⁵⁸) is closed** for the fluyt, the East Indiaman and the slave ship. The carrack's yard is the class, and her record says so.
- **(0y¹⁶⁴), NEW: the mast heights of the 1590–1700 hulls.** The East Indiaman's mizzen deck-to-top height is 0.45 of her waterline length; Vasa's is 0.17. Her mizzen is 0.86 of the main's height share (0.823 / 0.96); Vasa's deck-to-top heights give 0.73 (244 / 332 px). The fluyt (0.874) and the slave ship (0.84) are the same class. The Vasa diagram gives every lower mast's and topmast's height over the hull and can be read for all three. When it is, the lateen yard's crossing will rise towards Vasa's 0.717 without a change to the yard.
- **`ship-treasure` captures the globe in a full run** (r318, r319); r320's next step stands.
- **(0y¹⁶³)**, the fluyt's and the carrack's mizzen topsail; **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r320 list them.

**r322 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r322` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁶⁴) off the same Vasa drawing.**

**Live stamp: docs/index.html carries data-version 1795604263 at the build.**
