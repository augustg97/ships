
## Round 327 — 2026-11-25 — The sekibune's mast no longer carries a European fighting top. Since round 67 the builder gave a top to every square lower mast dated 1100 or later, and the date was the only test. Every such hull in the fleet but one is European; the sekibune, dated 1597, drew a walled round top with her one yard hung under its trestletrees. The Japanese mast carried no top. Its head carried the semi (蝉), a sheave block the halyard runs over. Her mast now draws no top and carries the semi at its head, and about a metre of bare pole stands above her yard, as her own plate, the Busan scroll of 1593, draws it

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶⁹), which r326 named first. `build/staging/r327` did not exist. At the start the load was 1.7 and no process was hot. r326's receipt left no unscored frames, so no clean-HEAD run was made.**

**WHAT WAS WRONG.** r326 reported (0y¹⁶⁹) as the sekibune's yard hanging inside the trestletrees under her top. The witness (`w-seki-before-b.png`, `crop-seki-before.png`, 4x) shows the cause: a pale walled round platform at the masthead, the European fighting top of before 1710, with the yard slung under it. The top was gated `rig === 'square' && year >= 1100` (r67). Of the 13 hulls that gate reaches, 12 are European; the sekibune is the 13th.

**THE SOURCES.**

- **Her plate.** The Busan boat-barrier scroll of 1593 (University of Tokyo; Commons `File:Atakebune4.jpg`, 2095 × 2167 px, about 16 px/m at the ships; `dl/atakebune4.jpg`). It draws one rigged mast in the fleet, the atakebune's (`plate-masthead-3x.png`). Her yard is slung at the head, about 17 px (about 1 m) of bare pole stands above it, stays run down from the head, and there is no platform. At this scale a block cannot be resolved.
- **The semi.** The Minamichita wasen museum (minamichita-museum.com/wasen/ship.html), already the source for her anchor: "帆桁や伝馬船、碇に取り付けられた綱は帆柱上端の蝉（滑車）を通り" — the ropes on the yard, the boat and the anchor run through the semi, the sheave at the mast's upper end. The Fleet Seven wasen page says the yard is raised and lowered through it, and a Japanese dictionary entry for せみ says the same.
- The semi is attested for the Edo wasen. On a sekibune of 1597 it is inferred from the tradition, and the record says so.

**WHAT CHANGED** (`r327_edit.py`).

- **Record.** `sekibune.hull.masts[0].top = { form: 'none', masthead: 'semi', provenance }`. This is the field r235 opened for the cog's basket top (`top.form 'basket'`).
- **Builder.** The top gate also requires the mast's record not to say `top.form 'none'`. Such a mast draws no top and no cheeks, and enters no disc for r326's drape. Where the record names `masthead: 'semi'`, a sheave block is drawn at the head: two cheeks, a cap over and under, the sheave dark between them and its pin through. Its top face is the truck, as the karchesion's is. Its size is derived from the pole at the head: 3.6 pole radii tall (0.38 m on the sekibune). It records `userData.semi` and is tagged `semi`, with its own card (PARTS.semi).
- The yard keeps its single-tier height, 0.90 of the mast. With the top gone, the pole above it stands bare, which is what the plate draws.
- `Research/MASTHEADS.md` §5 records the sources and the confidence.

**AUDIT.**

- **r67's dated-top rule** required a top on every square lower mast after 1100. It no longer requires one on a mast whose record says `top.form 'none'`. Run unchanged on this round's builder (`proofD.out`), it convicts the sekibune: "0 top platforms for 1 square lower masts, depicted 1597". The old rule required the fault.
- **A-MASTHEAD-NONE, new.** It convicts a `top.form` the builder does not know, and a 'none' with no provenance. It convicts any top or crosstrees on a mast whose record says none. The fitting the record names at the head must be drawn on that mast, exactly once, with its top face within 5 cm of the head, and some halyard vertex must lie inside its box grown by 5 cm. A semi on a mast whose record names none convicts.
- Proofs, on :8150 (`webb/`):
  - **A**, r326's builder with this round's record (`proofA.out`): 2 problems — the top on a mast whose record says none, and no semi.
  - **B**, this round's builder with the block 1 m down the mast (`proofB.out`): 2 problems — the block's top 1.00 m under the head (13.40 against 14.40 m), and no halyard through it.
  - **C**, this round's record without its provenance (`proofC.out`): 1 problem, the silence.
  - **D**, r326's audit on this round's builder (`proofD.out`): 1 problem, above.
- `audit-first.out` (:8149, this round's tree): **0 problems on 33 hulls.**

**WITNESSED.** `#v=ship&s=sekibune&b=125&l=14&z=1.5`, before (r326's tree on :8149, 09:45) and after (09:52), panels hidden; `pair-seki-masthead.png`, 4x crops side by side. Before, a walled round platform stands at the masthead, its trestletrees over the yard. After, the yard is slung at the head, the bare pole stands about a metre above it, and the semi caps the pole, with the stays and the halyard meeting it.

**Rule 0, on `w-seki-after-b.png` read whole: three rendered ships on a rippled sea under a low grey coast, the sekibune in the middle with her oars out. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The sekibune carries one mast and one square sail, and a long walled fighting deck pierced with loopholes.**
2. **Her masthead has no platform: the yard hangs near the head, and the stays run from the head to the bow and the stern.**
3. **Her oars come out under a white cloth hung along the side with a dark scalloped hem.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶⁹) is closed.** No hull in the fleet now draws a top its record denies. The gate stays a date for every other square mast: the 12 European hulls it reaches all carried tops at their dates.
- **(0y¹⁷⁰), NEW:** the sekibune's halyard falls from the semi to the rail just abaft the mast, the class lead. The Edo wasen led it aft through a second block at the stern (艫滑車) to the rokuro winch, and her record's 'Rokuro, judged' row says she carried no winch. Where a 1597 halyard was made fast is unread; find a Sengoku source before moving it.
- **(0y¹⁶³)**: the fluyt's and the carrack's mizzen topsail. **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r326 list them.

**THE FRAMES.** Predicted movers: `ship-sekibune`; its berth neighbours `ship-panokseon`, `ship-galleass`, `ship-galley`; and `action-myeongnyang`, where her class crowds the vanguard at about 1.1 km. The full ratchet was launched on the final tree at 09:56:31, at load 6. **Every frame is scored and classified in the receipt that follows.**

**r328 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r328` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁶³) or (0y¹⁷⁰).**

**Live stamp: docs/index.html carries data-version 1795629460 at the build.**
