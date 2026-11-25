
## Round 329 — 2026-11-25 — The fluyt's three masts now stand at the heights Hollar's 1647 etching of a fluyt under sail draws. Until this round they were Steel's 1794 proportions, a rule for warships 150 years after her. Her lower masts are now short and her topmasts long. The fore top is 8.37 m over the mast's foot, where it was 13.92 m. The main top is 11.22 m, where it was 15.65 m, and the main topgallant's head is 24.55 m, where it was 29.70 m. The mizzen top is 7.76 m, where it was 13.41 m, and r328's mizzen topmast came down with it

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁷¹), which r328 named first. `build/staging/r329` did not exist. At the start the load was 2.6; Mail was at 197% of one core and CleanMyMac's menu agent at 75%. r328's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE.** Wenceslaus Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, etching, 1647 (`r328/dl/hollar-flute.jpg`, the 1920 px Commons thumbnail, bow at the left). Rows were read off 4x–6x crops with row ticks (`r329_sheet.py`; `fore-k.png`, `fore-top.png`, `main-k2.png`, `waist.png`, r328's `ruler-mizzen.png`).

| Row on the plate | foot (deck) | top | topmast head | pole head |
|---|---|---|---|---|
| fore, column 724 | 902 | 600 | 285 | 161 |
| main, column 1143 | 933 | 528 | 192 | 47 |
| mizzen, column 1501 | 868 (r328) | 588 (r328) | 424 (r328) | — |

- **The deck.** At the fore it is the foot of the forecastle rail's lattice. At the main it is the waist rail, where the mast comes out from behind it. The waist deck itself is hidden, and the men in the waist show only their heads over the rail, so the deck may lie up to about 30 px (0.8 m) lower. At the mizzen it is r328's 868 ± 10.
- **The pole above each topmast.** Under sail Hollar draws it bare, with a pennant on it and no yard crossed. His second fluyt plate of the same year (the fluyts at anchor, *vulgo VLIETEN*, `r328/dl/fleuten-1647.jpg`, 644 px wide) draws topgallant masts with yards crossed on the fore and the main. So the pole is built as the topgallant mast and the three tiers stand. **This answers (0y¹⁷²): the third tier is kept.** The main's pole head touches the plate's top border line (row 43), so it may stand a few pixels higher than read.

**THE DATUM.** Each height is a share of the distance between the fore and mizzen masts' feet: 777 px on the plate, 21.53 m on the built hull (`probe-before.json`), so 36.1 px/m, close to r328's 37 px/m along the hull. This is the datum r322 used for the East Indiaman and the slave ship, so A-MAST-READ checks it unchanged. It is CONTESTED in the record: the plate puts the main 0.539 of the way from the fore to the mizzen, and the hull's stations put it at 0.606. Hollar draws the ship a little from forward of the beam, so the span is foreshortened and the heights may be a few per cent high.

| Built over each mast's foot (`probe-before.json`, `probe-after.json`) | top, before → after | topmast head | topgallant head |
|---|---|---|---|
| fore | 13.92 → 8.37 | 22.89 → 17.10 | 26.41 → 20.53 |
| main | 15.65 → 11.22 | 25.74 → 20.53 | 29.70 → 24.55 |
| mizzen (lateen) | 13.41 → 7.76 | — | — |

**WHAT CHANGED** (`r329_edit.py`, one script for all three files, every replace asserted).

- **Record.** Every fluyt mast now carries `mastHeightsM`, `mastHeightsRead` (the shares, the rows, the feet, the plate, a bound of 0.006 of the span) and a `mastHeightsProvenance` that opens READ, names the plate and its scale, gives the deck read at that mast, and names the contested datum. The mizzen records the top only.
- **Builder** (`mastLowerOf`). A lateen mizzen that carries `lateenTopmast` and a recorded top takes its lower pole as the top's height over `topOfLower`. r328's topmast is keyed to the top's height, so it came down with it. Every hull without both fields builds as before.
- **Audit.** `lowerOf` follows the builder. A-MAST-READ takes the span's magnitude: Vasa's plate has the bow at the right and Hollar's at the left, and the signed span gave every share the wrong sign.
- `Research/MASTHEADS.md` §7 records the read.

**PROOFS** (:8150, `webb/`, `r329_proofs.sh`):

| Proof | What was broken | Problems found |
|---|---|---|
| A | r328's builder with this round's record and audit | 2: 'a mizzen top off its read height' (13.41 m built, 7.76 m read), and the mast diameters keyed to the old lengths |
| B | the main's recorded topgallant head raised 1.0 m | 1: 'mast heights off their read', 25.55 m against 24.55 m |
| C | the mizzen's `mastHeightsRead` removed | 1: 'a mast read without its figures' |
| D | r328's audit on this round's tree | 9: 7 'a mast read that disagrees with its own rows' (the signed span), 1 mizzen top, 1 diameter |

`audit-first.out` (:8149, this round's tree): **0 problems on 33 hulls.**

**WITNESSED.** `#v=ship&s=fluyt&b=90&l=8&z=1.0`, panels hidden, before on :8150 with r328's builder and record, after on :8149 (`w-fluyt-before-beam.png`, `w-fluyt-after-beam.png`, `pair-fluyt-beam.png`). `pair-fluyt-hollar.png` puts the after frame beside Hollar's plate. The camera is reframed, because its datum is the rig's top. On the fore and the main the top now stands a little above the course and the topsail is the deepest sail, as on the plate. On the mizzen the top stands about level with the lateen's peak, which is where Hollar draws it; before, the peak stood well under the top.

**Rule 0, on `w-fluyt-after-beam.png` read whole: three rendered ships on a rippled sea under a low grey coast, the fluyt broadside in the middle. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The fluyt has three masts: the fore and the main carry three square sails each, and the mizzen carries a triangular sail.**
2. **On the fore and the main the lowest sail is short and the one above it is the deepest, and a small platform stands between them.**
3. **The mizzen's slanting yard rises to about the height of the small platform on its mast.**

**WHAT IS STILL OPEN.**

- **(0y¹⁷¹) is closed** and **(0y¹⁷²) is answered**: the fluyt keeps three tiers, from Hollar's plate at anchor.
- **(0y¹⁷³) is partly answered.** The lateen's peak now stands about level with the mizzen top. Measure it against Hollar's rows before closing it.
- **(0y¹⁷⁴), NEW: the fluyt's course yards.** They still hang at the class 0.60 of the lower mast, which is 0.667 of the deck-to-top height, so with the lower tops the courses are short and the topsails deep (`pair-fluyt-hollar.png`). Hollar hangs each course yard just under its top. A first look (`course-k.png`) puts the fore course yard at about row 606, which is 0.98 of the deck-to-top height. The main's is at about row 560, which is 0.92. Read both properly and give the fore and main `courseRead.ofDeckToTop`, as r323 did for the East Indiaman.
- **(0y¹⁷⁵), NEW: the fluyt's mast stations.** Hollar's main stands 0.539 of the way from the fore to the mizzen, and the hull's stations put it at 0.606. His fluyt also has a strong rise of sheer aft, and the model's hull is nearly flush. The stations and the sheer are CLASS; read them off the plate.
- **(0y¹⁷⁰)**, the sekibune's halyard lead; **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r328 list them.

**THE FRAMES.** No baseline frame shows the fluyt in her own berth. Her rig is about 5 m lower, so anything of it that showed at a neighbour's frame edge is now gone. Predicted possible movers are her berth neighbours, `ship-sekibune`, `ship-panokseon`, `ship-galleass` and `ship-slave-ship`, and `globe-default` if a fluyt voyage marker is on screen. The full ratchet was launched on the final tree at 12:16:08, at load 7.4, before the build and this entry. **Every frame is scored and classified in the receipt that follows.**

**r330 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r330` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁷⁴), the fluyt's course yards, off the same plate.**

**Live stamp: docs/index.html carries data-version 1795637845 at the build.**
