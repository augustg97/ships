
## Round 318 — 2026-11-24 — The clipper's masts now stand at the heights of Cutty Sark's tea rig, from the spar table in Lubbock's *Log of the Cutty Sark* (1924). Until this round each lower mast was a recorded length carried up by Steel's 1794 proportions, a topmast 0.60 of it and a topgallant mast half the topmast. Steel's topgallant mast carries one sail. On the clipper it carried two, the topgallant and the royal, so on the fore the topgallant was 3.9 m deep and the royal 2.2 m, under topsails 9.1 and 9.3 m deep. The lower masts are now 10–15% shorter, the topgallant masts 60–90% longer, and the fore's four upper sails are 6.8, 7.4, 5.6 and 4.2 m deep. The course yards take Lubbock's lengths too: 23.8 m on the fore and main, where they had been 20.3 and 22.7 m

**Queue check: August's second list stands worked in full (r57). This round first scored r317's backlog, then took (0y¹⁵⁴), which r317 named next. `build/staging/r318` did not exist. The load was 1.7 at the start; CleanMyMac's menu agent was at 75% of one core.**

**r317'S BACKLOG.** `r318_resume.py` captured the nine frames r317 left (`run-a`, `run-b`), scored offline with r277's scorer (`score-a.out`, `score-b.out`):

- `board-salamis`, recaptured alone: **0.000%**. r317's 33.214% was the second-browser fault, as it said.
- `action-lepanto` 0.003%, `action-myeongnyang` 0.033%, `wake-plan` 0.019%, `ship-ever-given` 0.000%, `sea-ever-given` 0.024%, `passage-sahul` 0.047%, `sea-dugout-floor` 0.018%: inside the gate.
- `sea-canoe-floor` timed out twice on the 150 s FRAME_READY wait at load 2–4. `page_errors.py` opened it clean and ready at `?frozen=1`. It is scored in this round's full ratchet below.

**WHAT (0y¹⁵⁴) ASKED.** r316 found that, with the yards hung from the mast's own sections, the clipper's fore had 5.3 m of pole over the topmast cap for the topgallant and the royal together. The fault was in the stack and not in the yards, and r316 named Cutty Sark's sail plan as the source.

**THE SOURCE.**

- **Lubbock, *The Log of the Cutty Sark* (1924), Appendix III**, the spar plans of the tea clippers. The archive.org text of the 1928 printing (`bwb_KT-739-235`, saved as `build/staging/r318/dl/bwb.txt`) does not read the appendix: it is a fold-out table printed sideways, and the OCR comes out as noise (lines 20330–20470). Two tabulations of it in metres agree: J. Sankey, 'The Ship Cutty Sark' (johnsankey.ca, `dl/sankey.html`, "compared to the original lengths quoted in The Log of the Cutty Sark"), and Wikipedia's 'Mast specifications' table, which cites Lubbock App. III (`dl/cutty-sark.wiki` line 346).

| Tea rig, m over the deck | Top | Topgallant | Royal / skysail |
|---|---|---|---|
| Fore | 18.8 | 29.8 | 39.6 |
| Main | 19.8 | 31.9 | 44.5 (skysail) |
| Mizzen | 17.0 | 25.7 | 33.2 |

- **Lubbock's text checks the main** (bwb.txt line 2196): "Her mainmast from load line to truck was 151 feet in length", which is 46.0 m. If the last figure in the table is the truck, the deck stands 1.5 m over the load line. If it were the skysail yard instead, the truck would stand about 3 m higher, and Lubbock's 151 ft would leave no room for any freeboard at all. So the last figure is the truck.
- **CONTESTED, in the record.** The table names each height by a sail and not by a fitting. The builder reads the first figure as the top's platform, the second as the topmast crosstrees and the last as the truck. If the first figure is the lower cap and not the top, every lower mast is 10% shorter than drawn.

**WHAT CHANGED.**

- **RECORD** (`vessels.json`, `r318_record.py`). On each of the clipper's three masts, `heightM` (23.2, 25.9, 22.3) is replaced by `mastHeightsM: {top, crosstrees, truck}` with the table's figures. Each mast also gets `courseYardM` (23.8, 23.8, 18.3 m, from Lubbock's yard table) and a `mastHeightsProvenance` that quotes both sources and the contest. The yards above the course keep the plan's shares of the course yard: on the fore that gives 22.1, 20.2, 16.2 and 11.9 m, against Lubbock's 20.7, 19.5, 14.6 and 11.6 m.
- **BUILDER** (`hull.js`, `r318_builder.py`). The new `squareStackOf(mk, lower)` solves the stack from the record, in the same way the `truckM` rule solves Preussen's:
  - lower = top / 0.90, because the top platform stands at 0.90 of the lower mast;
  - topmast = crosstrees − 0.88 × lower;
  - topgallant mast = truck − 0.88 × (lower + topmast).
  
  A mast without `mastHeightsM` keeps Steel's 0.60 and 0.50. The headsails' stay to the fore topmast head reads the same helper, where it had assumed Steel's 0.60. The loft's `rigTruckFrom` now says 'record: mastHeightsM …'.
- **CARD.** The clipper's "Rig, deck to truck" figure is now 44.5 m with no "derived" mark; it had read "44.2 m derived". A new row, "*Cutty Sark*'s masts, deck to truck", reads "fore 39.6 m, main 44.5 m, mizzen 33.2 m, as rigged for the tea trade (Lubbock's spar table); the model's masts are drawn to these heights". Lubbock is added to the cite.

| Clipper, m over the deck | Lower cap | Crosstrees | Truck | Sail depths, ltop / utop / tg / royal |
|---|---|---|---|---|
| fore, before | 23.20 | 34.33 | 39.62 | 9.12 / 9.29 / 3.90 / 2.22 |
| fore, after | 20.89 | 29.80 | 39.60 | 6.80 / 7.37 / 5.60 / 4.23 |
| main, before | 25.90 | 38.33 | 44.24 | 10.18 / 10.36 / 4.35 / 2.48 |
| main, after | 22.00 | 31.90 | 44.50 | 6.15 / 8.22 / 6.95 / 5.45 |
| mizzen, before | 22.30 | 33.00 | 38.09 | 8.76 / 8.92 / 3.74 / 2.14 |
| mizzen, after | 18.89 | 25.70 | 33.20 | 7.08 / 5.57 / 4.32 / 3.23 |

(`probe-before.json` from :8149 carrying r317's tree, `probe-after.json` from :8150 carrying this round's.) Each sail's depth is taken from its yard down to the yard below it. The mizzen's course yard is 1.8 m lower than before, because it hangs at the plan's 0.36 of a truck that is now 4.9 m lower.

**THE STEAMER IS NOT CHANGED.** Her masts set a single topgallant, the one sail Steel's topgallant mast was sized for. On her main the topgallant is 6.52 m deep under an upper topsail 9.86 m deep, which is 0.66 of it. The new rule's clipper figures after the fix are 0.57–0.85. No source for her spars has been read; that stays in (0y¹³⁸).

**AUDIT.** New rule **A-MAST-HEIGHTS**:

- (1) a square mast with `mastHeightsM` has a `mastHeightsProvenance` that opens READ, RECORD or CONTESTED: 'mast heights with no source';
- (2) the mast is built to those heights within 0.05 m, read off the segment meshes: the top at 0.90 of the lower, the crosstrees on the topmast head, the truck on the last head. The convictions are 'mast heights recorded and not built' and 'a mast drawn off its recorded heights';
- (3) on every square mast, a sail whose yard shares its section with another hoisting yard is at least half as deep as the deepest hoisting topsail on that mast: 'two yards on a pole too short for them'. The half is CLASS.

The rig-height provenance rule now treats `mastHeightsM` as a record.

**The first audit of the new tree found 2 problems, both in the audit.**

- 'Rig height provenance wrong' on the clipper. That rule did not know the new field.
- 'Two yards on a pole too short' on the mizzen royal, 3.23 m against 7.10 m. The 7.10 m was the lower topsail. That sail sheets to the course yard, and the course yard hangs at the plan's class 0.36 of the truck, so its depth says nothing about the stack. Rule (3) now compares against the hoisting topsail, the sail that rides the section under the shared pole. On the old stack it still convicts the clipper on all three masts (OLDALL below).

| Proof (on the :8150 copy, `r318_proofs.sh`, `r318_variant.py`) | What was broken | Problems found |
|---|---|---|
| OLDALL (proof C) | r317's builder and record; the new audit | 6: 'two yards on a pole too short for them', the topgallant and royal on each of the clipper's three masts |
| NOSOURCE | `mastHeightsProvenance` removed | 3: 'mast heights with no source' |
| STEELSTACK | the new builder with its one stack line flipped back to Steel's | 12: 'a mast drawn off its recorded heights' 6, 'two yards on a pole too short' 6 |
| FINAL (`audit-second.out`) | none | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=clipper&b=90&z=1.1&l=6`, before from :8149 (r317's tree), after from :8150 (`pair-clipper.png`, `crop-clipper-rig.png`, before left). Before, each mast carries two deep topsails with two small sails crowded at the masthead over them. After, the topsails are shallower, the topgallant and royal are clearly two sails of working depth, and every yard is wider. The card's rig figure reads 44.5 m with no "derived" mark.

**Rule 0, on `w-clipper-after.png` read whole: a rendered three-masted ship under full sail on a rippled sea, with a low coast behind; it is not a chart. Three facts a viewer can read off it without a legend:**

1. **She carries five square sails on each of her three masts.**
2. **The middle mast is the tallest.**
3. **A white deckhouse with two small windows stands on her deck just abaft the foremast.**

**THE FRAMES.** Predicted movers:

- `ship-clipper`: her rig and her card;
- `aboard-clipper`: the Sea close-up of her;
- Shipwright frames of hulls up to three berths from her, where her rig reaches the frame's edge: `ship-steamer`, `ship-great-eastern`, `ship-preussen`, `ship-dreadnought`, and the 74's frames `shipwright`, `shipwright-ahead`, `-astern`, `-furled`, `-hounds`.

The full ratchet was launched on the final tree at 23:06:14.

**It is being captured beside this close. Every frame is scored and classified in the receipt that follows.**

**WHAT IS STILL OPEN.**

- **(0y¹⁵⁴) is closed** for the clipper. The steamer's single topgallant is not the fault (see above).
- **(0y¹⁵⁹), NEW: the clipper's main skysail.** Cutty Sark's tea rig set a skysail over the main royal; the record names no skysail yard, so the main royal sets atrip under the skysail masthead, about 3 m higher than her royal stood. Either add a `skysail` tier (the PLAN table, the HOIST table, the cards and the yard census), or record the main royal's own masthead.
- **(0y¹⁶⁰), NEW: the three heights are read by the sail they name, not by a fitting.** G. F. Campbell's 1870 drawings of the tea rig for the Cutty Sark Preservation Society would settle whether the first figure is the top or the lower cap. The clipper's other yards keep the plan's shares of the course yard. Lubbock's table gives each yard's length (fore 20.7, 19.5, 14.6 and 11.6 m above the course), and a `yardLengthsM` record would let the builder draw them.
- **(0y¹⁵⁶)**, a lateen mizzen's clew sheeted past the stern; **(0y¹⁵⁷)**, the East Indiaman's and the slave ship's mizzen topgallant; **(0y¹⁵⁸)**, the mizzen lateen yard's class figures; **(0y¹⁵³)**, Endurance's topsail yard against Hurley's plate; **(0y¹⁵⁵)**, Preussen's plate-read yards under the first cap; **(0y¹⁵¹)**, furled yards left braced; and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r317 list them.

**r319 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r319` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁵⁶).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
