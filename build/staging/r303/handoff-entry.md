
## Round 303 — 2026-11-24 — Titanic's two well decks have bulwarks to the height the 1911 side plan draws them: the shell now carries on up past the deck along each well, to 11.84–11.40 m over the water forward and 11.29–11.58 m aft, and the capping sits on top of it. Before this round the shell stopped at the deck and the capping sat on the deck edge, so the after well's side stood 0.85 to 1.04 m under the plan

**Queue check: August's second list stands worked in full (r57). This round took (0y¹¹⁹)'s rail, the last open part of that item. `build/staging/r303` did not exist, the load was 2.0 at the start, and no process was hot. r302's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.** On Titanic the capping rail is built only where the deck is open to the side: the two well decks, between the forecastle and the house and between the house and the poop. Everywhere else the side is an island's wall or the house's shell tier. In the wells the model ended the shell at the deck (`H.sheer`, which r299 made the read C deck) and laid the 0.72 m class capping on that edge. The plan draws each well's side as shell plating carried up past the deck to a heavy solid line.

**THE READ.** In each well the heavy line was traced every 3 columns as the centre of its dark run: the forward well on columns 2930 to 3090 (53 points), the after well on 565 to 760 (66 points) (`r303_trace.py`, `trace.json`). The line is 4 to 5 px thick, 0.3 to 0.4 m, and that thickness bounds where the plate's top edge lies inside it; the centre is recorded. Each well's points were fitted as a straight line in the column (rms 0.32 and 0.35 px, about 0.03 m) and read at the well's two ends over r297's tilted waterline. The ends are the islands' recorded breaks and the house's stations (`houseAt`), placed on the plan through the loft's deck-level line (`r303_read.py`, `wells.json`). The forecastle break maps to column 3106.5 and the house front to 2917.1, which r295 read as 2910 to 2924.

| Well end | u | Plan, bulwark top (m) | Model before, capping top (m) | Deck (m) | Bulwark over deck (m) |
|---|---|---|---|---|---|
| Forward, at the forecastle | 0.1354 | 11.84 | 11.55 | 10.83 | 1.01 |
| Forward, at the house | 0.1915 | 11.40 | 11.20 | 10.48 | 0.92 |
| After, at the house | 0.8305 | 11.29 | 10.44 | 9.72 | 1.57 |
| After, at the poop | 0.8858 | 11.58 | 10.54 | 9.82 | 1.76 |

The "model before" column is the deck at that station (r299's `sheerRead`, through the builder's own `pchip`) plus the capping's 0.72 m section. The after well's bulwark stands higher over its deck than the forward well's: the C deck is about 1 m lower in the after well than in the forward one, while the plan's bulwark line is only 0.1 to 0.5 m lower.

**WHAT CHANGED.**

- RECORD: `hull.islands.wells` holds the two wells, each with a name, a u-span, `topM` at both ends and `topRead` (the rows, the waterline rows under them, the scale and the scripts). `islands.wellsProvenance` gives the trace, the fit, the line's thickness as the bound, and says the plan draws rectangles under the line in both wells (freeing ports or openings) that the model does not draw.
- BUILDER (`hull.js`):
  - `hullSurface` gains `wellTop(u)`, linear between each well's two ends like `islandTop`. It returns null outside a recorded well.
  - `buildIslands` builds each well's bulwark: a plate on both sides, flush with the skin, from the sheer up to `wellTop`, in the island walls' steel. It is tagged `wellBulwark`, a new part ("Well-deck bulwark", stage 3). Its ends meet the island's wall and the house's shell tier edge to edge, so no two faces share a plane.
  - `buildFittings`: inside a well the capping's upper face stands at `wellTop`.
  - Every hull without `islands.wells` is byte-identical.
- CARD (`shipwright.js`): Titanic's stage-3 card names the new part as "bulwarks along the well decks". No frame shows the stage-3 card.

**AUDIT AND PROOFS.** New rule, A-WELL-BULWARK:

- The record: each well's shape; a `topM` at least 0.3 m over the sheer; a `topRead` whose rows give `topM` within 0.05 m; and a provenance.
- Off the meshes: a `wellBulwark` group of the well's name; its top within 1.5 m of each end at that end's `topM` within 0.15 m; no vertex outside its span; every vertex above the sheer on the shell's half-breadth within 0.05 m.
- The capping: the rail at the well's middle tops out at the bulwark line within 0.15 m, and no rail vertex in the well stands more than 0.15 m over it.
- The silence: a hull with islands whose deck lies at the sheer (no `deck.belowSheerM`) and no wells record. Preussen carries `belowSheerM` 1.35, so her skin is already her bulwark and the rule is silent on her.

Final tree: 33 hulls, 0 problems. Each proof ran on the :8150 copy (`proofs.log`):

| Proof | What was broken | Problems found |
|---|---|---|
| OLDFILE | the whole pre-round `hull.js` with the new record | 2, a well recorded and its bulwark not built (both wells) |
| NOBULWARK | the wells loop in `buildIslands` emptied | 2, the same |
| OLDCAP | the capping back on the sheer | 2, a well's capping off its bulwark top |
| OFFROW | the after well's `topM` at the house set to 10.5 m | 1, a well's bulwark top off its plate read |
| SILENCE | `islands.wells` deleted | 1, islands with wells and no bulwark record |

The restored copy scored 0.

**MEASURED (`ms-after.out` against `r300/ms-after.out`).** Two new parts: Forward well bulwark, y 10.46–11.84 m; After well bulwark, y 9.70–11.58 m. The rail went from 9.72–11.53 m to 10.57–11.82 m. No other part moved.

**WITNESSED.** `pair-forewell.png` and `pair-aftwell.png` crop the 3° profile at 3x, r300's frame (top) over this round's (bottom), at the same camera. Forward, the capping rises about 0.3 m at the forecastle end and 0.2 m at the house. Aft, the black side now rises about a metre over the deck, and the capping runs along its top. `quarter-aft-4x.png` and `quarter-fore-4x.png`, from the 300° quarter, look down into each well: the far bulwark's black inside face stands over the planked well deck, and the well reads as a deck sunk between the raised end and the house.

**Rule 0, on `profile-after/quarter.png` read whole: a rendered liner on a lit, rippled sea, not a chart. Three facts a viewer can read off it without a legend: she has four buff funnels with black tops in a line along a white superstructure; her forecastle and poop stand higher than the two wells between them and the house; her black hull carries two rows of portholes and a thin gilt line along its length.**

**WHAT IS STILL OPEN.**

- **(0y¹¹⁹) is closed.** The funnel tops (r297), the island tops (r298), the deck line (r299), the trucks (r300) and the wells' bulwarks (this round) all stand where the plan draws them.
- **(0y¹³⁰), NEW: the wells' openings.** The plan draws two rectangles hanging under the bulwark line in each well, 3.5 to 3.8 m long and about 0.8 m deep (forward on columns 2965–3010 and 3050–3100). They may be freeing ports or open sections of the bulwark. A photograph of the forward well would settle which; the model draws neither.
- **(0y¹³¹), NEW: the capping's section.** The capping on every steel hull is a class section, 0.72 m deep on Titanic (beam × 0.0256), and it reads as a grey pipe along the top of each well. Nothing on the plan gives its depth.
- **(0y¹²⁸), (0y¹²⁹), (0y¹²³), (0y¹²⁵)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r302 list them.

**r304 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r304` already exists before writing into it. Then (0y¹²⁹), the furled-state button with no visible label: read `swSetFurled` for the label it sets and check the button's colours. It is a short fix to a control a visitor uses. Then (0y¹²⁸): Endurance's topmasts, off the Hurley plates. Else (0y¹²³).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build; the live check and the frame results are in the receipt that follows.**
