
## Round 300 — 2026-11-23 — Titanic's two trucks stand where the 1911 side plan draws them, 60.81 m (fore) and 61.87 m (main) over the water: each pole is now the truck less the deck at its foot, so the foremast no longer rises with the deck r299 raised under it, which had put its truck at 63.25 m

**Queue check: August's second list stands worked in full (r57). This round took the trucks, the first item r299 left. `build/staging/r300` did not exist, the load was 1.2 at the start, and the hottest process was CleanMyMac's menu agent at 75% of one core. r299's receipt left no unscored frames, so the opening ratchet was skipped.**

**THE READ.** On the plan each mast ends in a black knob, the truck, with a house flag flying from it (`r300-top-fore.png`, `r300-top-main.png`). Each mast's centre line (r296's fit) was followed up to the highest row with ink within 3 px of it, and that row read over r297's tilted waterline at 13.03 px/m (`trucks.json`):

| Mast | Column | Top row | Waterline row | Plan, over the water | Model before |
|---|---|---|---|---|---|
| Fore | 3050.9 | 32 | 824.1 | 60.81 m | 63.25 m |
| Main | 690.5 | 35 | 841.0 | 61.87 m | 61.87 m |

These agree with the figures r296 took off the topmost dark pixel (60.8 and 61.9). The bound is the plan's 1% scale (about 0.6 m at 60 m) and about a row (0.1 m) for the read.

**WHY THE FORE WAS HIGH.** Both poles carried `heightM` 52.2 m from the deck, set long ago to put the trucks at the record's `mastTopM` of 62.5 m. r299 raised the C deck under the foremast by 0.6 m to the plan's line, and the pole stood up from the new deck, so its truck went to 63.25 m. Under the mainmast the deck fell, and the same 52.2 m pole happens to land on the plan's 61.87 m.

**CONTESTED.** `mastTopM` 62.5 m is the "approximately 205 ft above the maximum load line" that secondary accounts of her fitting-out give for both masts, with no drawing or measurement cited. The plan draws the two trucks a metre apart. The masts are built to the plan; `mastTopM` stays as the printed figure, now with a `mastTopMProvenance` that says this, and the existing rule still holds the tallest built mast within 1.5 m of it (61.95 m built).

**WHAT CHANGED.** RECORD (Titanic): each mast drops `heightM` and carries `truckWLM` (its truck over the load waterline), `truckRead` (column, top row, waterline row, scale) and `truckProvenance`. BUILDER (`hull.js`): `mastLowerOf(mk, steelMain, footY)` returns `truckWLM − footY` for a pole or bare mast that carries `truckWLM`; all three callers pass the deck at the mast's station. The loft's `rigTruckFrom` says "record: truckWLM … one pole from the deck at its foot", and `rigTruckHow` marks it as the record, so the Shipwright card prints no "derived" row. Every other hull is unchanged: no other record carries `truckWLM`. AUDIT: `lowerOf` and the yard-rate block mirror the derivation, the rig-height provenance rule accepts `truckWLM` as a record, and a new rule, A-TRUCK-READ: on a hull whose masts were read off a plate (`stationRead`), every pole mast must carry `truckWLM` with its rows, the figure must equal its rows within 0.05 m, and the head of that mast's highest built segment must stand at it within 0.15 m. A pole with no truck read on such a hull is convicted for the silence. Square masts (Preussen's, which carry `truckM`) are outside it.

**AUDIT AND PROOFS.** Final tree: 33 hulls, 0 problems. Four proofs ran on a :8150 copy (`proofs.log`). OLDHEIGHT, the builder drawing 52.2 m poles with the new record: 1 problem, the fore ("a pole built off its read truck"); the main is not convicted because its old pole already lands on its read. OFFROW, the fore's `truckWLM` set to 62.0: 1 problem. SILENCE, the main's read deleted and `heightM` put back: 1 problem. NOROWS, the fore's `truckRead` deleted: 1 problem. The restored copy scored 0.

**MEASURED (`ms-before.out`, `ms-after.out`).** The model's highest point 63.25 → 61.95 m: the main's truck at 61.87 m plus the rim of the raked pole. Nothing else in the measure moved.

**WITNESSED.** `pair-fore.png` crops the foremast head in the 3° profile before (left) and after (right). The capture reframes when the rig top moves, so the heights were measured against each frame's own ruler: before, the fore truck stood 1.0 m over the main; after, the main stands 1.29 m over the fore (the plan: 1.06 m). The fore came down about 2.3 m against the main, against 2.44 m predicted, within the frame's 0.1 m pixels and the poles' rims. `profile-after/starboard.png` is the whole frame.

**Rule 0, on `profile-after/starboard.png` read whole: a rendered liner on a lit sea under a pale sky with a coast behind her, not a chart. Three facts a viewer can read off it without a legend: she has four buff funnels with black tops standing along a white superstructure; her two buff masts rake aft, the foremast rising from the forecastle and the mainmast from abaft the superstructure, the mainmast's head a little higher; her hull side rises toward the bow, and the forecastle and poop stand higher than the well decks between them and the superstructure.**

**WHAT THE PLAN SHOWS THAT THE MODEL STILL GETS WRONG.**

- **(0y¹¹⁹) THE RAIL, still open.** The model's rail stands a class 1 m over the deck. The plan's heavy solid line, the top of the shell and of the wells' bulwark, stands 1.2 to 1.8 m over C (11.6 m at the forecastle break, 10.9 m amidships, about 12.3 m at the stern). `r299_lines.py` lists its rows at 26 columns; the trace is r299's job done on that line.
- **(0y¹²³) THE STANDING RIGGING.** The plan draws her forestay, the triatic stay between the two trucks, the funnel guys and the wireless aerial. The trucks are now on the plan, so the stays between them can be drawn to it.
- **(0y¹²⁵) PREUSSEN'S SHEER**, and **(0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²)** as r295 to r299 list them.

**Named residuals.** (0y¹¹⁹) is narrower again: the funnel tops (r297), the island tops (r298), the deck line (r299) and the trucks (this round) are done; the rail is open. (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) and every other residual stand as r294 to r299 list them.

**r301 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r301` already exists before writing into it. Then (0y¹¹⁹)'s rail: trace the plan's heavy shell-top line stem to stern and decide whether the record can carry it as the bulwark top. Else (0y¹²³), her stays between the trucks. Else (0y¹²⁵).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build; the live check and the frame results are in the receipt that follows.**
