
## Round 317 — 2026-11-24 — The East Indiaman and the slave ship now set a lateen sail on the mizzen, under the mizzen topsail. Since r315 made the crossjack a bare spar, neither ship had set any sail on the mizzen below the topsail. The hulls are dated 1620 and 1590, and in that period the mizzen of a three-masted ship carried a lateen. A gaff spanker, which the 74 and the clipper carry, came about a century and a half later. The Shipwright's "Bent on" card now names the mizzen's fore-and-aft sail on all five square-rigged three- and five-masters. Before this round it said "square sails on all three masts" on the 74 and the clipper, which set a spanker there, and on Preussen

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁵²), which r316 named first. `build/staging/r317` did not exist. The load was 1.6 at the start and no process was hot. r316's receipt left no unscored frames, so no clean-HEAD run was made.**

**WHAT (0y¹⁵²) ASKED.** r315 made the crossjack a bare spar on the East Indiaman and the slave ship, and their records give the mizzen no other sail below the topsail. r316 asked for a source for each hull before the record gains one, and for the rule to be checked on every three-masted square rig.

**THE PERIOD DECIDES THE SAIL.** The hull records date the East Indiaman 1620 and the slave ship 1590. A gaff spanker on either would be about 150 years early.

- **Waters**, *The Art of Navigation in England in Elizabethan and Early Stuart Times* (1958), ch. I (full text, archive.org `in.ernet.dli.2015.51856`, saved as `build/staging/r317/dl/waters.txt`): "The larger vessels were square-rigged only ... with three masts and a bowsprit. The fore and main masts each carried a course and a top-sail, the bow-sprit a sprit-sail ... the mizzen mast carried a lateen-sail. This rig remained typical of merchant ships well into the eighteenth" century.
- **Falconer 1769**, MIZEN (`build/staging/r172/falconer.txt` line 11379): the mizzen is "extended sometimes by a gaff, and sometimes by a yard which crosses the mast obliquely". By 1769 both forms were in use.

No plate of either hull's mizzen has been read, so both records say CLASS.

**WHAT CHANGED.**

- **BUILDER** (`hull.js`, `r317_builder.py`). A square mast whose record carries `lateenMizzen: true` runs the lateen block as well as the square tiers. The block builds the yard, the parrel and the cloth (or the furled roll) against the square mast's own lower section. No separate lateen pole is drawn, and the shrouds are the square mast's. The yard's length (1.15 of the lower mast), its angle (56°) and its sling (a third of its length from the heel) are the mixed-hull lateen mizzen's figures, which the carrack and the fluyt already take. The yard's record says `onSquareMast` and names its mast.
- **RECORD** (`vessels.json`, `r317_record.py`). On the East Indiaman's and the slave ship's mizzens: `lateenMizzen: true`, and `mizzenSailProvenance` opening CLASS, quoting Waters and Falconer and naming the builder's figures as class.
- **CARDS** (`shipwright.js`, `r317_card.py`):
  - Stage 7 ("Bent on") now names a square mizzen's lateen ("a lateen sail on the mizzen under its topsail") or spanker ("a gaff spanker on the mizzen", "on the aftermost mast" on Preussen).
  - The furled card names the mizzen lateen's stowage.
  - The furled card's lateen clause on the lateen-rigged hulls said "each lateen yard is lowered", while the builder keeps the yard aloft and brails the cloth to it (r260). It now says "each lateen sail is brailed up and furled along its yard, which stays aloft".

| Hull | Mizzen lateen yard | Sling over the datum | Clear of the mast's axis |
|---|---|---|---|
| East Indiaman | 26.2 m | 13.66 m (crossjack above it) | 0.319 m = mast 0.198 + yard 0.122 |
| slave ship | 16.4 m | 8.70 m | 0.204 m = mast 0.127 + yard 0.076 |

(`probe-after.json`.)

**AUDIT.** New rule **A-MIZZEN-SAIL**. It applies to the aftermost of three or more masts when that mast is square-rigged:

- (1) the record names one fore-and-aft sail, `spanker` or `lateenMizzen`: 'a square mizzen with no fore-and-aft sail' / 'with two';
- (2) a lateen's `mizzenSailProvenance` opens PLATE READ or CLASS: 'a lateen mizzen with no source';
- (3) the period: 'a gaff spanker before its period' on a hull dated before 1700, 'a lateen mizzen after its period' after 1790;
- (4) a recorded lateen is built, with one yard and its cloth on that mast: 'a lateen mizzen recorded and not built'; and no such yard is built where the record names none: 'a lateen yard the record does not name';
- (5) the sling stands under the mast's lowest square yard: 'a lateen mizzen slung over the crossjack'.

The stage-card and furled-card rig rules now count a square mizzen's lateen or spanker among the rigs a card names.

**The first audit of the new tree found 4 problems**, 'a lateen yard through its mast' on both hulls, set and furled. The fault was in the audit. A three.js cylinder repeats its seam vertex (theta 0, on +z) in every ring. The square lower mast is a 9-sided cylinder, so each ring's centroid stood about r/10 to +z. That pulled the measured axis toward the yard and inflated the measured mast radius: a yard 0.319 m off the axis read as 0.305 m. The lateen read now takes each vertex position once. The first attempt keyed on `toFixed(5)` and missed the seam, because sin(2π) is −2×10⁻¹⁶ and prints '-0.00000'. It keys on rounded integers now. Proof SEAMBIAS restores the repeat and gets the 4 back.

| Proof (on the :8150 copy, `r317_proofs.sh`, `r317_variant.py`) | What was broken | Problems found |
|---|---|---|
| OLDALL-OLDAUDIT | r316's builder, record, cards and audit | 0: the gap A-MIZZEN-SAIL closes |
| OLDALL (proof C) | r316's builder, record and cards; the new audit | 5: 'no fore-and-aft sail' on the East Indiaman and the slave ship; 'the card omits the gaff rig' on the 74, the clipper and Preussen |
| RECORDNOTBUILT | the new record on r316's builder | 2: 'a lateen mizzen recorded and not built' on both hulls |
| NOSOURCE | `mizzenSailProvenance` removed | 2: 'a lateen mizzen with no source' on both hulls |
| CLIPPERLATEEN | the clipper (1869) given `lateenMizzen` beside its spanker | 2: 'two fore-and-aft sails', 'a lateen mizzen after its period' |
| OLDCARD | r316's cards on the new builder and record | 7: the stage-7 card omits the lateen on the East Indiaman and the slave ship and the gaff spanker on the 74, the clipper and Preussen; the furled card omits the lateen on the East Indiaman and the slave ship |
| SEAMBIAS | the lateen read without its de-duplication | 4: 'a lateen yard through its mast' on both hulls, set and furled, offset read 0.305 m and 0.194 m |
| FINAL | none | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=<hull>&b=90&z=1.1&l=6`. Before is from :8150 carrying r316's builder and record, after from :8149 carrying this round's.

- `pair-east-indiaman.png`, `crop-east-indiaman-mizzen.png`: before, the mizzen has the topsail and topgallant above a bare crossjack and nothing below it. After, a lateen yard is slung beside the lower mast under the crossjack, its heel low forward and its peak high aft, with a triangular sail under it.
- `pair-slave-ship.png`, `crop-slave-ship-mizzen.png`: the same on the slave ship.

On both hulls the lateen's clew stands past the taffrail: about 1–2 m on the East Indiaman and more on the slave ship. Ships of the period led the mizzen sheet to an outrigger over the stern. The model draws no outrigger and the sheet ends in the air. This is the same class as the carrack's and the fluyt's lateen mizzens: see (0y¹⁵⁶).

**Rule 0, on `w-east-indiaman-after.png` read whole: a rendered three-masted ship on a rippled sea under a pale sky, with a low coast behind; it is not a chart. Three facts a viewer can read off it without a legend:**

1. **She has a single row of gunports along her side.**
2. **Her fore and main masts each carry three square sails.**
3. **Her aftermost mast carries a triangular sail on a long slanting yard, under two square sails.**

**THE FRAMES.** Predicted movers:

- `ship-slave-ship`: the lateen and the stage-7 card;
- `ship-clipper`, `ship-preussen`: the stage-7 card now names the spanker;
- `shipwright`, `shipwright-ahead`, `shipwright-astern`, `shipwright-hounds`: the 74's card, where the frame shows it;
- Shipwright frames up to three berths from the East Indiaman and the slave ship (`ship-carrack`, `ship-galley`, `ship-galleass`, `ship-panokseon`, `ship-sekibune`), where the lateen reaches the frame's edge;
- `shipwright-furled`, if the East Indiaman's furled lateen reaches the frame from the next berth.

No Sea, Action or globe frame shows either hull. The full ratchet was launched on the final tree at 21:35:13. The run died at its 11th frame, `ship-great-eastern`, on the 150 s FRAME_READY wait, while the proofs' audit browser ran beside it (load 8–9). Its 10 frames are saved in `run1-current` and scored (`score-run1.out`): nine are inside the gate, and `shipwright` (0.472% / 0.242) is ACCEPTED. In that frame the 74's card names the spanker, and the East Indiaman's lateen shows at the left edge. Also, 2,477 px at the right edge are the ocean steamer's yards, re-hung in r316. r316 scored this frame at 0.048%, just inside the gate, and this round does not touch the steamer. `r317_resume.py` is capturing the other 55 frames, predicted movers first, into `run2-current` beside this close. **Every frame is scored and classified in the receipt that follows.**

**WHAT IS STILL OPEN.**

- **(0y¹⁵²) is closed** for the East Indiaman and the slave ship.
- **(0y¹⁵⁶), NEW: a lateen mizzen's clew is sheeted to nothing past the stern.** This affects the carrack, the fluyt, the East Indiaman and the slave ship. Ships of the period led the mizzen sheet to an outrigger (outligger) over the taffrail. Either build that outrigger, or read the clew's position off a plate and pull it inboard.
- **(0y¹⁵⁷), NEW: the East Indiaman (1620) and the slave ship (1590) carry a mizzen topgallant** (`only: 3`). A ship of either date set a lateen and one square topsail on the mizzen. Check a plate of a 1620s ship (Vroom, the Vasa model) before cutting the tier.
- **(0y¹⁵⁸), NEW: the mizzen lateen yard's figures are the carrack's class.** At 26.2 m, the East Indiaman's yard is half her length. No plate of a retourschip's mizzen yard has been read.
- **(0y¹⁵⁴)**, the clipper's and the steamer's short top poles; **(0y¹⁵³)**, Endurance's topsail yard against Hurley's plate; **(0y¹⁵⁵)**, Preussen's plate-read yards under the first cap; **(0y¹⁵¹)**, furled yards left braced; **(0y¹⁴⁵), (0y¹⁴⁷), (0y¹⁴⁸)** on the 74; **(0y¹⁴²), (0y¹⁴⁰), (0y¹³⁹), (0y¹³⁸)** for Great Eastern, Preussen, Wyoming and the steamer, **(0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r316 list them.

**r318 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r318` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁵⁴), the short top poles. Else (0y¹⁵⁶).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
