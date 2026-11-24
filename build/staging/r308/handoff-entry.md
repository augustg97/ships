
## Round 308 — 2026-11-24 — Endurance's furled mizzen is stowed as Hurley's two plates of her in the ice show it: the gaff stays aloft at its working angle, the sail is brailed in along the after side of the mast, and the boom stays where it is on its topping lift. Before this round the furled build lowered the mizzen gaff onto a roll of canvas along the boom, as it does for a schooner. The Shipwright's furled card now says her gaff sails are brailed in to their masts; since r306 it had told her that both were lowered onto booms, though the main has no boom

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³⁴), which r307 named next. `build/staging/r308` did not exist. The load was 1.6 at the start and no process was hot. r307's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.** The furled build stows every boomed gaff sail one way: the halyards are let go, the gaff comes down, and the cloth is rolled along the top of the boom with the gaff resting on it. That is how a schooner stows. r306 found that both plates of Endurance's main show its gaff aloft with the sail stowed against the mast, and (0y¹³⁴) asked whether the mizzen is the same.

**THE READ.**

- **Hurley's plate from the starboard quarter** (Commons a090007, 1500x1124, about 24 px/m at the stern; crops `a090007-mizzen-3x.png`, `a090007-mizzen-foot-4x.png`). The mizzen gaff stands at its working angle, with its vangs hanging from the peak. The sail is a twisted bundle along the after side of the mast, from the gaff's jaws down to the poop. There is no cloth along a boom and no gaff lying low.
- **Hurley's beset broadside** (RMG P00018, crop `plate-mizzen-4x.png`). The gaff stands at 37.7° (r306's read). `r308_widths.py` measures the dark column of each mast, per row, against the sky beside it:

| Mast | Topmast (px) | Lower mast under the jaws (px) |
|---|---|---|
| Main (r306: brailed) | 4 (60 rows) | 15 (65 rows) |
| Mizzen | 3 (65 rows) | 10 (70 rows) |

  At the plate's 12.4 px/m, 10 px is 0.8 m, about twice the mast's own diameter. The mizzen carries a bundle along its lower mast, as the main does.
- **The boom stays.** The record's `boomFootM` was read off the quarter plate in r273, and Hurley's plate of her heeled in the pressure (`build/endurance-heeled.png`, crop `heeled-aft-3x.png`) shows a spar out over the counter. The quarter plate does not show the boom clearly aft of the mast, so where it lay when that plate was taken is not read. The model keeps it on its topping lift.
- **Not read:** how the mizzen was set at sea. The set build draws it on its gaff and boom as before.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r308_record.py`): the mizzen gains `furlStow: 'brailed'` and `furlStowProvenance`, which names both plates, the crops, the width read, and what is not read.
- BUILDER (`hull.js`, `r308_edits.py`): `furlStow: 'brailed'` stows the sail by its brails in the furled build only. The gaff stands at its working angle, the cloth is r306's brailed bundle from the tack (the boom's jaws) to the throat, and the boom and its topping lift stay. r306's `gaffStow: 'brailed'` (the main: brailed in both builds, no boom) now reads as two flags in the code, `BOOMLESS` and `BRAILED`. The bundle's card says the boom stays where there is one.
- CARD (`shipwright.js`, `r308_card.py`): the furled card's gaff clause is composed from each gaff mast's stowage. Every gaff mast brailed: "the gaff sails are brailed in to their masts under gaffs left aloft". Some brailed: it names how many and says the others are lowered. None: "lowered onto their booms" as before. Endurance is the only hull with a brailed gaff mast, so her card is the only one that changed.
- `r308_probe.py` builds every gaff hull set and furled before and after (`probe-before.json`, `probe-after.json`). Only Endurance's furled build and furled card changed. In her set build, only the main's bundle gained a `boom: false` tag.

| Endurance, furled build | Before | After |
|---|---|---|
| Mizzen gaff | lowered: jaws at y 6.97, 18.1° | **aloft: jaws at y 14.10, 35.5°**, as in the set build |
| Mizzen sail | a roll along the boom | **brailed bundle** from (14.50, 6.31) to (15.02, 14.10), r 0.28 m |
| Mizzen boom | 10.14 m on its lift, cocked 10.65° | the same |

**AUDIT.** A-BRAILED gains a case for a sail that is set on gaff and boom and stowed by its brails:

- RECORD: `furlStow` is 'brailed' (the only value the builder knows) and carries `furlStowProvenance`.
- SET build: a set cloth names the mast, and no brailed bundle does.
- FURLED build: r306's bundle tests (one bundle, on the after side, within 1 m of the axis, from the deck to the jaws, gaff over 20°); exactly one boom on the mast; and no furl roll along that boom.
- THE FURLED CARD: a hull with a brailed gaff mast must say "brailed"; a hull with a gaff mast that lowers its gaff must say "lowered onto their booms"; a hull whose gaff masts are all brailed must not say "lowered".

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED** furled, at `#v=ship&s=endurance&sail=furled&b=90&l=6&z=1.3` (the port beam) and `b=125&l=14&z=1.0` (the port quarter), before on the :8150 copy carrying the pre-round `hull.js`, `shipwright.js` and record, after on :8149. `pair-beam-mizzen.png` and `pair-q-mizzen.png` (before | after): the mizzen gaff no longer lies on a roll along the boom. It stands aloft on its halyards at the main's angle, the canvas lies in a pale bundle down the mast's after side from the jaws to the boom, and the boom runs out over the compass platform on its topping lift. `pair-beam.png` shows the furled card's new sentence.

**Rule 0, on `wit-after-q.png` read whole: a rendered barquentine on a rippled sea, not a chart. Three facts a viewer can read off it without a legend: her foremast's square sails are furled on three yards; her main and mizzen each stand a gaff aloft with the sail bundled against the mast under it; a black funnel stands between those two masts and an open lattice tower stands at her stern.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³⁴) is closed** for Endurance.
- **(0y¹³⁸), NEW: the spanker's stowage as a class.** The 74, the clipper and Great Eastern still lower every gaff onto the boom in the furled build. A ship's or barque's spanker in the 19th century was often brailed in to the mast under a standing gaff, while a schooner lowers hers. Each hull needs its own plate before the record says which. `furlStow: 'brailed'` is the field, and the audit checks any hull that carries it.
- **(0y¹³⁹), NEW: where Endurance's mizzen boom lay in the ice.** The quarter plate shows no boom clearly aft of the mast. It may have been topped up, or swung, or unshipped. The model keeps it in place on its lift.
- **(0y¹³⁶), (0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r307 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r309 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r309` already exists before writing into it. Then (0y¹³⁶), Titanic's after well deck. Else (0y¹³⁸) for the clipper, if a plate of her furled is in reach.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
