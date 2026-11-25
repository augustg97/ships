
## Round 316 — 2026-11-24 — On the clipper, the steamer and Endurance, the yards above the course now hang from the mast's own sections. The lower topsail yard is fixed on the lower cap, where Howes' rig fixes it; until this round it hung 3.1–3.8 m under that cap. Each hoisting yard is set atrip, at 0.88 of the section it rides, which is the height the one-yard-per-segment rig already uses. Until this round the clipper's and the steamer's topgallant yards and Endurance's topsail and topgallant yards hung inside the doublings, under the cap of the section below, where no yard can travel. In the furled build every one of them now comes down onto its cap or onto the yard below

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁵⁰), which r315 named first. `build/staging/r316` did not exist. The load was 2.1 at the start and no process was hot. r315's receipt left no unscored frames, so no clean-HEAD run was made.**

**WHAT (0y¹⁵⁰) ASKED.** On a doubled rig (a mast with a `yards` list) every yard was crossed at the plan's class fraction of the truck. Those fractions assume caps at about 0.50 and 0.73 of the truck: the plan's own fixed yards, the lower topsail and the lower topgallant, stand there. The builder's stack puts the caps higher. The clipper's fore lower cap stands at 0.59 of the truck and her topmast cap at 0.87. `r316_probe.py` (`probe-before.json`) measured the result on every doubled-rig mast:

- the lower topsail yard hung 3.1–3.8 m under the lower cap it is fixed to (clipper fore 23.66 against a cap at 27.06);
- the upper topsail yard hung 1.2–1.4 m over that cap, so the upper topsail was a 4.8 m sail over a 9.1 m lower topsail;
- the clipper's and the steamer's topgallant yards hung 1.9–4.5 m under the topmast cap, inside the doubling, below the heel of the mast they ride;
- Endurance's topsail yard hung 1.2 m under her lower cap and her topgallant yard 3.4 m under her topmast cap.

**THE SOURCES.**

- **Fixed yards:** Howes' rig fixes the lower topsail yard at the lower cap (Research/MASTHEADS.md §4; the builder's own HOIST table already called it 'fixed').
- **Hoisting yards:** Falconer 1769, ATRIP (`build/staging/r172/falconer.txt` line 2121): "The top-sails are said to be atrip, when they are hoisted up to the mast-head, or to their utmost extent." The segment rig already sets every upper yard at `y + seg × 0.88`, the heel of the section above. The builder's comment at `crossYard` says both rig paths must build the identical spar, and now they do.
- **Endurance's plate, as a check and not a read:** Hurley's full-sail photograph from ahead (`build/hurley-fullsail.jpg`, quarter-scale in `hurley-fullsail-q.jpg`). Measured from the course yard to the truck, the topsail yard is at about 0.57 of that height and the topgallant yard at about 0.93. The model had 0.31 and 0.63 before this round; it now has 0.73 and 0.97. Both yards are closer to the plate than before, and the topsail yard is now too high by about a sixth of the span. The plate is not read into the record because it is taken from low on the ice ahead of her and its perspective is not solved. See (0y¹⁵³).

**WHAT CHANGED.**

- **BUILDER** (`hull.js`, `r316_builder.py`). This applies to a square mast with a `yards` list and two or more sections, where the record reads no yard above the course off a plate. Preussen is the only hull with such reads, and it is unchanged.
  - The course keeps its plan fraction, or its plate read on Endurance.
  - `ltop` rests on the head of section 0 and `ltg` on the head of section 1. The yard's centre stands one radius plus 0.02 m over the cap, the same rest r314 gives a lowered yard.
  - A hoisting yard is set at 0.88 of the section it rides. Two hoisting yards on one section (the clipper's topgallant and royal share her top pole) divide its run above the cap below in two equal parts, the higher at 0.88. This split is CLASS, with no plate read.
  - Each yard's `userData.yardFrac` now says `from: 'section'`, with the section, the rule, the cap or atrip height, and the plan height it replaced.
- **FURLED ROLLS** (`r316_furl.py`). A square roll records the yard it is bent to (`userData.onYard`). See the audit below for why.
- **RECORD** (`vessels.json`, `r316_record.py`). The seven `yardFracsProvenance` strings on the clipper, the steamer and Endurance's fore no longer say every yard hangs at the plan's fraction. They say what hangs where and why, and Endurance's carries the plate comparison above.
- **CARD:** no code changed. The furled card names the lowered yards read off the built ship (r314), so Endurance's furled card now gains the lowered-yards clause and the clipper's names the topgallant as well. This follows from the code; no frame shows a furled Endurance, and the card was not witnessed.

| Hull, mast | Yard | Set before → after (m over the datum) | Furled after (onto) |
|---|---|---|---|
| clipper fore | ltop (fixed) | 23.66 → 27.23 | 27.23 |
| | utop | 28.42 → 36.52 | 28.35 (the yard below) |
| | tg | 33.97 → 40.42 | 38.32 (the cap) |
| | royal | 40.31 → 42.64 | 39.05 (the yard below) |
| clipper main | ltop / utop / tg / royal | 25.53 / 30.84 / 37.03 / 44.11 → 29.52 / 39.88 / 44.23 / 46.71 | 29.52 / 30.73 / 41.89 / 42.68 |
| steamer main | ltop / utop / tg | 27.14 / 32.20 / 38.10 → 30.96 / 40.82 / 47.34 | 30.96 / 32.19 / 42.76 |
| endurance fore | top / tg | 19.86 / 26.61 → 28.67 / 33.64 | 21.15 / 30.14 (the cap) |

(`probe-before.json`, `probe-after.json`: every mast, both builds.) Before this round the furled build could not lower 9 of these yards: the clipper's and the steamer's topgallants and Endurance's two. It lowers all of them now.

**AUDIT.** New rule A-YARD-SECTION, read off the set build's meshes, with the caps taken from the segment meshes:

- (a) on a doubled rig with no plate-read yard above the course, every yard above it is hung from the sections: 'a doubled-rig yard hung at the plan's fraction';
- (b) a fixed yard rests on its cap, within 0.03 m: 'a fixed yard off its cap';
- (c) the highest hoisting yard on each section stands at 0.88 of it, within 0.03 m: 'a set hoisting yard not atrip';
- (d) on EVERY square mast, both rig paths: a set hoisting yard that the record does not read off a plate stands at least 0.05 m clear over the cap of the section below the one it rides: 'a set hoisting yard inside the doubling'.

A-YARD-FRAC's check that a fixed yard sits at base + T × frac now skips a yard hung from the sections.

**The first audit of the new tree found 18 problems**, all of them 'a furled roll floating off its yard' or 'a furled roll hung under its yard', on the clipper and the steamer. The fault was in the audit. D-FURL-BUNT gave each yard every roll within 1.5 m of its centre. A lowered upper topsail yard now rests 1.1 m over the fixed lower topsail yard, so each of the two yards picked up the other's roll. The builder now records each roll's yard, and the rule reads a roll that records its yard against that yard only. Proof NOROLLREC below removes the record and gets the 18 back.

| Proof (on the :8150 copy, `r316_proofs.sh`, `r316_variant.py`) | What was broken | Problems found |
|---|---|---|
| OLDBUILDER-OLDAUDIT | r315's builder and record; r315's audit | 0: the gap A-YARD-SECTION closes |
| OLDBUILDER (proof C) | r315's builder and record; the new audit | 31: 'hung at the plan's fraction' 23 (clipper 12, steamer 9, Endurance 2) and 'inside the doubling' 8 (clipper 3, steamer 3, Endurance 2) |
| NOTATRIP | hoisting yards at 0.80 of their section | 14: 'not atrip' (clipper 6, steamer 6, Endurance 2) |
| OFFCAP | fixed yards rest 0.25 m over their caps | 6: 'a fixed yard off its cap' (clipper 3, steamer 3) |
| NOROLLREC | the rolls carry no `onYard` record | 18: the false convictions described above |
| FINAL | none: every after file | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=clipper&b=90&z=1.1&l=6`, set and `&sail=furled`, and `#v=ship&s=endurance&b=90&z=1.1&l=6`. Before on :8149 carrying r315's tree; after on :8150 carrying this round's.

- `pair-rig-clipper-set.png` (before left, after right). Before, on each mast the upper topsail is a shallow strip just over the lower topsail, the topgallant is deep, and the royal is the deepest sail above the topsails. After, the lower and upper topsails are two equal deep sails, and the topgallant and royal are short sails near the truck. See (0y¹⁵⁴).
- `pair-rig-clipper-furled.png`. Before, the five rolls on each mast are spread up its height. After, the two topsail rolls lie together on each lower cap, the topgallant and royal rolls lie together on the topmast cap, and bare poles stand above them. This is the stowage r314 read off the Asow plate.
- `pair-rig-endurance-set.png`. Before, the fore topgallant hung halfway up the topmast with 7.7 m of bare pole over it. After, the topsail is one deep sail up to the topmast's head, and the topgallant sets just under the truck, as on Hurley's plate.

**Rule 0, on `pair-clipper-set.png` (after, right half) read whole: a rendered three-masted ship under full sail on a rippled sea, with a low coast behind; it is not a chart. Three facts a viewer can read off it without a legend:**

1. **She carries five square sails on each mast.**
2. **The two sails above the lowest are about the same depth.**
3. **The sails narrow toward the top of each mast.**

**THE FRAMES.** Predicted movers:

- `ship-clipper`, `ship-steamer` and `ship-endurance`: their rigs change;
- `aboard-clipper` and `aboard`, the Sea close-ups of the clipper and the steamer;
- Shipwright frames of hulls up to three berths from the three, where their rigs reach the frame's edge;
- `shipwright-furled`, if its furled berth neighbour on the edge is the clipper.

The full ratchet was launched on the final geometry at 20:18:33. The 20:19 record edit changed only a provenance string, which no frame shows. **It is being captured beside this close. Every frame is scored and classified in the receipt that follows.**

**WHAT IS STILL OPEN.**

- **(0y¹⁵⁰) is closed** for the clipper, the steamer and Endurance.
- **(0y¹⁵³), NEW: Endurance's set topsail yard against Hurley's full-sail plate.** The plate puts the yard at about 0.57 of the course-to-truck height and the model now at 0.73. To read it, solve the plate's perspective (the camera is low on the ice ahead of her). Then record `yardFracs.top` with that provenance. It is also possible that her topmast is too long. Her trucks are already contested (`trucksContested`).
- **(0y¹⁵⁴), NEW: the clipper's and the steamer's top poles are short.** Above the topmast cap the clipper's fore has 5.3 m of pole for the topgallant and the royal together, so with the yards on the stack the topgallant is 3.9 m deep and the royal 2.2 m, against 9.1–9.3 m for each topsail. A clipper's sail plan (Cutty Sark's has been drawn) gives the topgallant and royal masts' lengths. The fault is in the stack and not in the yards.
- **(0y¹⁵⁵), NEW: Preussen's plate-read yards stand under the stack's first cap on all five masts.** The lower topsail yards hang 9.5–10.9 m under the head of section 0 (masts[0]: 26.57 against 36.90; masts[3]: 23.92 against 34.80), and the upper topsail yards hang under it too. A-YARD-SECTION (d) skips plate-read yards, so it does not flag them. One possible reading: Preussen's steel lower mast and topmast may have been one tube, and the stack's section 0 may then be that tube with its 'cap' at the topmast head. If so, the reads are right and the section labels are wrong. Check her spar list before changing either.
- **(0y¹⁵²)**, the East Indiaman's and the slave ship's missing driver; **(0y¹⁵¹)**, furled yards left braced; **(0y¹⁴⁵), (0y¹⁴⁷), (0y¹⁴⁸)** on the 74; **(0y¹⁴²), (0y¹⁴⁰), (0y¹³⁹), (0y¹³⁸)** for Great Eastern, Preussen, Wyoming and the steamer, **(0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r315 list them.

**r317 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r317` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁵²), the missing driver. Else (0y¹⁵⁴).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
