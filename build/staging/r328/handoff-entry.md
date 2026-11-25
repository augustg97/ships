
## Round 328 — 2026-11-25 — The fluyt's lateen mizzen now carries a small round top and a bare topmast, as Hollar's 1647 etching of a fluyt draws it: the topmast crosses no yard and sets no sail. Until this round her mizzen was one pole with nothing above the lateen. The carrack's mizzen stays a bare pole, as Master W.A.'s engraving of a ship of about 1475 draws it. Both records now answer (0y¹⁶³): neither ship sets a mizzen topsail, and each answer names its plate

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶³), which r322 to r327 named. `build/staging/r328` did not exist. At the start the load was 1.2 and no process was hot. r327's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE QUESTION.** A lateen mizzen on a square-rigged ship of 1450–1650 can take three forms: a bare pole, a pole with a top and a bare topmast, or a topmast that sets a square topsail. Vasa (1628, Hocker's rig diagram, r320) sets a topsail, and the East Indiaman and the slave ship take that from r320. The fluyt's and the carrack's records said nothing.

**THE PLATES.**

- **Fluyt (hull 1620).** Wenceslaus Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, etching, 1647 (Commons `File:Wenceslas Hollar - A Flute (State 2).jpg`; `dl/hollar-flute.jpg`, read at the 1920 px thumbnail, about 37 px/m along the hull at the record's 32 m). `crop-hollar-mizzen.png` and `ruler-mizzen.png`:
  - The mizzen sets the lateen from a lower pole.
  - At the pole's head is a small round top, 40 px wide.
  - Above the top stands a topmast. Its shrouds run to its head, a pennant staff stands over it, and it crosses no yard.
  - Rows: top 588, topmast head 424, staff end 349. The deck at the mizzen is hidden behind the poop rail. It is taken at 868 ± 10, between the row where the pole comes out of the rail (860) and the feet of the men on the poop (878).
  - So the topmast's head stands 0.586 (0.556–0.620) of the top's height over the deck above the top, and the top is 0.143 of that height across.
- **Carrack (hull 1500).** Master W with the Key (Master W.A.), engraving of a three-masted ship, about 1475 (Commons `File:Master W with the Key ship.jpg`, 548 × 768 px, about 12 px/m; `dl/masterwa-ship.jpg`, `crop-masterwa-mizzen.png`, 4x). The mizzen is a single pole on the aftercastle. It carries a lateen yard and has a pennant at its head. It has no top, no topmast and no square yard. At this scale a top under about 1 m across would not show.

**WHAT CHANGED.**

- **Records** (`r328_record.py`):
  - Both mizzens now carry `mizzenTopsail: false` and a `mizzenTopsailProvenance` that names the plate and its px/m.
  - The fluyt's mizzen also carries `lateenTopmast` (`topOfLower` 0.90, `headOverTop` 0.586, `topDiaOfTopHeight` 0.143, the bound, the rows, the plate). The 0.90 is the height the r321 lateen read already keys the yard to. The plate cannot set it independently, because the deck is hidden.
- **Builder** (`r328_builder.py`, the lateen block in `buildRig`). A lateen pole on a square-rigged hull whose record carries `lateenTopmast` now draws:
  - a top (`buildTop`, so round before 1710) at 0.90 of the lower mast;
  - a bare topmast with its heel in the doubling at 0.88 of the lower mast and its head at the read height, with its own card;
  - two topmast shrouds a side, from the top's rim to the topmast's hounds.
  - Without the field the build is unchanged.
- **Built, on the fluyt** (`probe-after.json`): the mizzen top stands at 16.74 m, 1.92 m across, and the main top at 18.36 m. Hollar draws the mizzen top about 1.3 m under the main top. The topmast runs from 16.45 to 24.60 m, and the lower masthead stands 1.45 m above the top.
- `Research/MASTHEADS.md` §6 records the three plates and how sure each read is.

**AUDIT.**

- **A-MIZZEN-TOPSAIL, new.** It applies to every lateen mast on a hull that also carries a square mast. It convicts:
  - a record with no boolean `mizzenTopsail`, or no PLATE READ / CLASS provenance (silence);
  - `mizzenTopsail: true` on a lateen pole, because that rig is built as a square mizzen with `lateenMizzen` (r317);
  - a recorded `lateenTopmast` built other than once.
- Where the topmast is built, it is held to its record:
  - the top's height to `topOfLower` of the lower mast, within 5 cm;
  - the topmast's head to `headOverTop`, within 1% of the top's height;
  - the top's radius, within 1%;
  - a doubling, so the topmast's heel is below the top and the lower pole's head above it;
  - topmast shrouds drawn;
  - no square yard crossed above the top;
  - no mizzen top or topmast on a mast whose record carries none.
- **Proofs** on :8150 (`webb/`, `r328_proofs.sh`):
  - **A**, r327's builder with this round's record: 1 problem, "a recorded mizzen topmast not built".
  - **B**, this round's builder with the head at 0.8 of the read height: 1 problem, the head 23.03 m against a read 24.60 m.
  - **C**, the carrack's record without its answer: 1 problem, the silence.
  - **D**, r327's audit on this round's tree: 0 problems. The old audit could not see the change.
- `audit-2.out` (:8149, this round's tree): **0 problems on 33 hulls.**

**WITNESSED.** `#v=ship&s=fluyt&b=90&l=8&z=1.0`, before (r327's tree, 10:51) and after (10:56), panels hidden. `pair-fluyt-mizzen.png` puts the before and after crops beside Hollar's mizzen. Before, the pole stood bare above the lateen. After, a round top stands at its head, with the bare topmast and its shrouds above it, as Hollar draws them.

**Rule 0, on `w-fluyt-after-beam.png` read whole: four rendered ships on a rippled sea under a low grey coast, the fluyt broadside in the middle. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The fluyt carries three masts: square sails on the fore and the main, and a lateen on the mizzen.**
2. **Her mizzen has a small top with a bare topmast above it, and nothing is set on the topmast.**
3. **Her hull is a long, low, plain flush-decked box with no gunports, between the sekibune with her oars out and the East Indiaman's bow.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶³) is closed.** The East Indiaman and the slave ship set Vasa's topsail. The fluyt carries Hollar's bare topmast. The carrack carries Master W.A.'s bare pole. Each record names its plate.
- **(0y¹⁷¹), NEW:** Hollar's plate is the first plate of a fluyt on disk. Read her three masts' heights off it (r322 left them as Steel's shares, CLASS). The deck is hidden at the mizzen, but it shows in the waist at the main.
- **(0y¹⁷²), NEW:** Hollar's fluyt crosses two yards on the fore and the main (a course and a topsail) and no topgallant. The record builds three tiers (`only` 3). Hollar dates from 1647 and the hull from 1620, so check a second plate before cutting a tier.
- **(0y¹⁷³), NEW:** on Hollar's plate the lateen yard's peak stands about level with the mizzen top. The model's peak, from r321's Vasa read, stands well under it.
- **(0y¹⁷⁰)**, the sekibune's halyard lead; **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r327 list them.

**THE FRAMES.** No baseline frame shows the fluyt in her own berth. Predicted movers are her berth neighbours up to three away: `ship-sekibune`, `ship-panokseon`, `ship-galleass` and `ship-slave-ship`. The tall rigs reach the frame edges. `globe-default` would also move if a fluyt voyage marker is on screen. The carrack's change is record-only, so `ship-carrack` is predicted not to move. The full ratchet was launched on the final tree at 11:07:25, at load 6.7. **Every frame is scored and classified in the receipt that follows.**

**r329 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r329` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁷¹) or (0y¹⁷²): Hollar's plate is on disk.**

**Live stamp: docs/index.html carries data-version 1795633693 at the build.**
