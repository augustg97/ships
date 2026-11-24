
## Round 304 — 2026-11-24 — Endurance's main and mizzen are each built as a lower mast with a topmast above it, as Hurley's beset broadside shows them. The model had built each as one pole, 33.5 m and 26.8 m tall, with the gaff hoisted to 0.86 of the pole. Each cap now stands at the share of the truck read off the plate (main 0.56, mizzen 0.61). The gaff hangs under the cap, and the topmast stands bare above it to the same truck as before

**Queue check: August's second list stands worked in full (r57). This round took (0y¹²⁸)'s Endurance half, which r303 named first. `build/staging/r304` did not exist. The load was 2.5 at the start and no process was hot. r303's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.** `masts[1]` and `masts[2]` were gaff masts with a `heightM` (33.5, 26.8) and no `topmast`, so the builder drew each as one spar from the deck to the truck. It hoisted the gaff's throat to 0.86 of that spar and led the shrouds, the topping lift and both halyards to its head. r302's stage-4 card said so in words ("the aftermost two are single poles").

**THE READ (`r304_steps.py`, `steps.json`, `plate-steps-3x.png`).** The plate is the beset broadside, RMG P00018 (`build/hurley-broadside.png`). For each pole, the darkness is summed across the pole at every row. Where the blur is wider than the spar, that sum is proportional to the spar's width.

| Mast | Thin pole above (sum) | Thick mast below (sum) | Step row (half-way, ±3) | Cap rail row (r285) | Cap over deck (px) | Pole fades to half (row, ±6) | Truck over deck (px) | Cap ÷ truck |
|---|---|---|---|---|---|---|---|---|
| Fore (check) | ~180 topgallant, ~400 topmast | ~700 and up | 496 | 620 | 140.7 | 381 | 255.7 | 0.55 |
| Main | ~260 | ~520 | 500 | 630 | 146.7 | 385 | 261.7 | **0.56** |
| Mizzen | ~200 | ~950 | 507 | 645 | 154.7 | 409 | 252.7 | **0.61** |

- "Over deck" adds the plan's 1.35 m bulwark (16.7 px, r272) to the height over the cap rail.
- The fore line is the check. The builder's stack puts the fore's top at 0.586 of its truck (18.8 m of 32.1 m), and the same read gives 0.55, so the method lands within 0.04 on a mast whose sections are known.
- A thin pole can fade before its truck, so each share is a bound from above.
- On both after masts the gaff is a faint diagonal rising aft from just under the step. The heeled plate (Commons 4776 px copy, `build/staging/r280/commons-heeled-4776.jpg`; crop `heeled-main-mizzen.png`) shows the mizzen's crosstrees with the topmast standing beside the lower masthead.
- The plate gives shares only, no lengths. Each truck stays the record's contested figure (`trucksContested`, (0y⁹⁴)).
- Hurley's night plate (August 1915, `night-mainhead-2x.png`) shows the main ending at a capped head level with the fore topsail yard. That may be a topmast struck for the winter. It is not read here.

**WHAT CHANGED.**

- RECORD (`vessels.json`): main and mizzen each lose `heightM` and gain:
  - `topmast: true`;
  - `truckM` (33.5, 26.8 m, deck to truck: the old figures under the name of what they measure);
  - `capFrac` (0.56, 0.61);
  - `capRead`: the rows, the pixel heights, the scale, the script and a provenance.

  `trucksContested` names the new fields.
- BUILDER (`hull.js`):
  - `mastLowerOf` solves a gaff mast that has a topmast, a `truckM` and a `capFrac`: the lower mast is `truckM × capFrac`.
  - The new `gaffTopmastOf` gives that mast's topmast as the truck less 0.88 of the lower, because the topmast's heel stands in the doubling at 0.88 of the lower, as on every fidded mast here. Without `capFrac` it keeps the class 0.52 of the lower, so Wyoming, Great Eastern and the steamer are unchanged.
  - `rigTruckFrom` reads "record: truckM 33.5 m deck to truck, the cap at the plate-read 0.56 of it".
- WHAT FOLLOWS FROM THE BUILDER WITH NO SEPARATE CODE:
  - The gaffs, throat and peak halyards, topping lifts and shrouds now lead to the lower mastheads (main cap 20.76 m over the waterline, mizzen 18.51 m). Shrouds top out at 20.45 m, where they topped out at 34.50 m.
  - The mizzen boom is shorter with its lower mast (`lower × 0.62`), and no longer runs 7 m past the stern. The model's x-extent went from 57.68 to 55.12 m.
  - **The fore's lower mast is thicker: 0.44 m across, where it was about 0.26 m.** Mast diameter follows the class rule: beam × 0.06 for the tallest LOWER mast, and every other mast scaled by its length against that one. The main's 33.5 m single pole had been that tallest lower mast, which thinned the fore to 18.8/33.5 of it. The fore's 18.8 m lower now sets the scale, and 0.456 m sits near Steel's inch per yard (0.52 m). The fore's parrels, cheeks and fife rail widen with it.
- CARD: stage 4 now reads "the foremost mast is built in three pieces, lower mast, topmast and topgallant mast; the aftermost two are each built in two pieces, lower mast and topmast" (`cards-after.json`). The card is composed from the built meshes, so no card code changed.

**AUDIT.**

- New rule, A-GAFF-TOPMAST.
  - RECORD: a gaff mast with `capFrac` has `topmast`, `truckM`, and `capFrac` between 0.3 and 0.9. Its `capRead` pixel heights give `capFrac` within 0.02, and it has a provenance.
  - BUILT: two segments; the cap at `truckM × capFrac` within 0.1 m; the truck at `truckM` within 0.1 m; the topmast's heel inside the lower's head; no part of the gaff above the cap.
  - SILENCE: a gaff `truckM` with no `capFrac`.
- **Audit fault fixed.** Both copies of the audit's principal-axis iteration started at (0, 1, 0). The fore's topsail yard is exactly level (its covariance has xy = yz = 0 to the last bit), so (0, 1, 0) is an eigenvector and the iteration stayed on it. The yard's "axis" came out vertical and its slings radius 6.17 m, which convicted it as slung through its mast. The other yards had escaped only on 1e-13 of rounding noise. The iteration now starts at (0.31, 0.89, 0.33).
- Final tree: 33 hulls, 0 problems. Proofs (`proofs.log`), each run on web/ with nothing else running and restored from the round's copies:

| Proof | What was broken | Problems found |
|---|---|---|
| OLDFILE | the pre-round `hull.js` with the new record | 32 on Endurance; the new rule convicts both masts (cap off its share, truck off, heel outside the doubling) |
| SINGLEPOLE | the gaff topmast segment removed | 2, a recorded gaff topmast not built (and the steamer's iron-mast rule, which shares the path) |
| CLASSTOP | the topmast back at 0.52 of the lower | 2, a gaff topmast off its recorded truck |
| GAFFHIGH | the throat at 1.02 of the lower | 2, a gaff hoisted above its lower masthead (and the halyard rules on three hulls) |
| OFFREAD | main `capFrac` 0.70 against its read | 1, a gaff cap share off its plate read |
| SILENCE | mizzen `capFrac` deleted | the silence rule, with 15 more on the broken mast |

**MEASURED (`ms-before.out`, `ms-after.out`, the before on a :8150 copy carrying the pre-round files).**

- Sail top: 33.05 → 26.87 m.
- Main gaff: 25.14–33.13 → 16.15–20.28 m over the waterline.
- Throat halyard top: 33.16 → 19.45 m.
- Topping lift top: 34.50 → 20.20 m.
- Shrouds top: 34.50 → 20.45 m.
- The mast span stands at 1.99–35.51 m, so the main truck is unchanged.

**WITNESSED.** `pair-starboard.png` shows the 3° profile from starboard, before over after, at the same camera. Before, both gaff sails ran up to the trucks. After, each sail is set on its lower mast, and the thin topmast stands bare above it to the same truck. `crop-after-heads-2x.png` shows both after mastheads, with the gaffs leading aft from under the caps. Beside the plate (`plate-steps-3x.png`), the model now has the plate's form: three masts whose lower mastheads stand at about the same height, with thin poles above them.

**Rule 0, on `profile-after/quarter.png` read whole: a rendered barquentine on a rippled sea, not a chart. Three facts a viewer can read off it without a legend: her foremast crosses square sails in three tiers over a jib-boom with four headsails; her main and mizzen set gaff sails on their lower masts, with bare topmasts standing above them; a single black funnel stands between the main and the mizzen.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹²⁸), half closed.** Endurance's topmasts are done. The trireme's and the corbita's channels, deadeyes and ratlines remain a research question.
- **(0y¹³²), NEW: the main gaff's length.** The main gaff is 2.6 m and the mizzen's 5.7 m. On the plate the two diagonals are about the same length, 72 px (≈5.8 m). The main's boom is capped at 0.78 of the room to the next obstruction aft, here the funnel. The gaff is capped at 0.72 of the boom. This predates the round. The topmast made it visible because the sail is lower and smaller.
- **(0y¹³³), NEW: gaff topmasts are unstayed.** The builder stays only square topmasts (`tiersDrawn`, `mk.rig === 'square'`). Endurance's two topmasts, Great Eastern's six and Wyoming's six stand with no topmast shrouds or backstays; only the truck-to-truck stays reach them.
- **(0y¹³⁰), (0y¹³¹), (0y¹²³), (0y¹²⁵)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r303 list them. (0y⁹⁴), the contested trucks, stands too. This round read shares off the plate, not heights.

**r305 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r305` already exists before writing into it. Then (0y¹³³), the gaff topmasts' rigging, because it touches three hulls. Else (0y¹³²). Else (0y¹³⁰).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build; the live check is in the receipt that follows.**
