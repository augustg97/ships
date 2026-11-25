
## Round 331 — 2026-11-25 — The fluyt's fore and main topsail yards now hang where Hollar's 1647 etching of a fluyt under sail draws them. Until this round each was set at the class 0.88 of its topmast, which no plate set. The fore topsail yard is now 15.59 m over the mast's foot, where it was 16.15 m; the main is 18.37 m, where it was 19.38 m. Each topsail is shallower by that amount, and the topgallant sail above it is deeper. The plate crosses no yard on either topgallant mast, so the record says that section is unread and gives the reason

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁷⁶), which r330 named. `build/staging/r331` did not exist. At the start the load was 3.3 and no process was hot. r330's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE.** Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, 1647 (`r328/dl/hollar-flute.jpg`, 1920 px, about 36 px/m at the masts, bow at the left). Crops: `fore-upper.png`, `main-upper.png`; the fits drawn on the plate: `fit-fore.png`, `fit-main.png`.

**THE TOPSAIL YARDS** (`r331_trace.py`: the centroid of the dark pixels within 5 rows of a guide line on every third column, a straight-line fit, and the crossing with the mast's axis, the line from the foot to the topmast's cap). The yard is the head edge of the set topsail.

| Topsail yard | traced columns | points, rms | axis column | crossing row | foot row | topmast head row | share of foot-to-head |
|---|---|---|---|---|---|---|---|
| fore | 674–734 | 21, 1.64 px | 695.7 | 339.6 | 902 | 285 | 0.9115 |
| main | 1128–1206 | 27, 0.88 px | 1172.5 | 270.1 | 933 | 192 | 0.8946 |

- The foot and head rows are r329's mast read. The main's foot is the waist rail; from the hidden waist deck (row 963) the main reads 0.8987, 0.004 more.
- A 3 px error in a yard's row is 0.005 of the span. The bound is 0.01, as on the East Indiaman (r324), whose fore topsail yard reads 0.901 off Vasa's diagram.
- Both yards slope on the plate, braced round; the model hangs each level at its crossing.

| Built over each mast's foot (`probe-before.json`, `probe-after.json`) | topsail yard, before → after | share, before → after | topgallant yard |
|---|---|---|---|
| fore | 16.15 → 15.59 m | 0.9444 → 0.9115 | 20.01 m, unchanged (class) |
| main | 19.38 → 18.37 m | 0.9441 → 0.8946 | 23.93 m, unchanged (class) |

**THE TOPGALLANT YARDS ARE NOT ON THIS PLATE.** Above each topmast's cap Hollar draws a bare pole with a pennant. His plate of fluyts at anchor (`r328/dl/fleuten-1647.jpg`) draws topgallant yards crossed, with the sails furled, so it shows no set hoist. `hoistRead.topgallantMast` is `{ unread: 'UNREAD, r331: …' }` with that reason, and the yard stays at the class 0.88 of its section.

**WHAT CHANGED** (`r331_edit.py`, one script for the record and both copies of the audit, every replace asserted).

- **Record.** The fluyt's fore and main carry `hoistRead` (the topmast share, its three rows, the fit, the plate, the script, and the topgallant's unread answer), and `hoistProvenance` opens PLATE READ and names the plate, its scale, each row and the bound.
- **Builder.** No change. `hoistRead` has been drawn since r324, and a section with no figure is drawn at the class figure.
- **Audit**, A-HOIST-READ. A section may answer `unread`, opening UNREAD and giving its reason. Three new checks: *'a hoist section both read and unread'*; *'an unread hoist section that does not say why'*; and *'a hoist and a mast read that disagree on the foot'* or *'… on the head'*: where a hoist read and a mast read are taken off the same plate file, their foot rows and section-head rows agree within 1 px. All ten hoist sections already read on the East Indiaman and the slave ship pass it.
- `Research/MASTHEADS.md` §7 records the read.

**PROOFS** (:8150, `webb/`, `r331_proofs.sh`):

| Proof | What was broken | Problems found |
|---|---|---|
| A | the fore topgallant's unread answer also given a figure (0.95) | 1: 'a hoist section both read and unread' |
| B | the fore topsail read against a topmast head on row 300, its share recomputed to agree with its own rows | 1: 'a hoist and a mast read that disagree on the head' (300 against 285) |
| C | the builder ignoring `hoistRead` (one line flipped) | 12: 'a hoisting yard off its plate read' on every read hoisting yard in the fleet, the fluyt's two among them |
| D | r330's audit with B's record | 2, both 'a hoist read missing a section' on the unread topgallants; the misread head is not seen |
| E0 | r330's audit with this round's record | 2: the old audit cannot read an unread section |
| E | the main topgallant's reason cut to 'UNREAD' | 1: 'an unread hoist section that does not say why' |

`audit-webb.out` (:8150, files identical to the tree by `cmp`; every other file is a symlink into `web/`): **0 problems on 33 hulls.**

**WITNESSED.** `#v=ship&s=fluyt&b=90&l=8&z=1.0`, panels hidden, before and after on :8150 (`w-fluyt-before-beam.png`, `w-fluyt-after-beam.png`, `pair-fluyt-beam.png`). On both masts the topsail's head now stands lower under the topmast's cap and the topsail is shorter; the topgallant sail above it hangs deeper, down to the lowered yard. `pair-fluyt-hollar.png` puts the after frame beside the plate (mirrored to the same heading).

**Rule 0, on `w-fluyt-after-beam.png` read whole: three rendered ships on a rippled sea under a low grey coast, the fluyt broadside in the middle and an oared galley at her left. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The fluyt has three masts: square sails on the fore and the main, a triangular sail on a slanting yard on the mizzen.**
2. **On the fore and the main the topsail is now about as deep as the course below it, and a narrow sail stands above each topsail.**
3. **On the foremast a small round platform stands just above the course yard.**

**WHAT IS STILL OPEN.**

- **(0y¹⁷⁶) is closed.**
- **(0y¹⁷⁷), NEW: the fluyt's topgallant sails.** Hollar's fluyt under sail sets a course and a topsail on the fore and the main and nothing above them; the model sets a topgallant sail on both, and since this round they hang deeper. r329 kept the topgallant masts because the plate at anchor crosses topgallant yards. The question for the next round is the sail plan, not the masts: whether a fluyt of 1620 set her topgallants at sea, and if the record says not, how the builder furls a topgallant on a set rig. Read the plate at anchor at full size first.
- **(0y¹⁷³)**, the lateen's peak against Hollar's rows, and **(0y¹⁷⁵)**, the fluyt's mast stations and sheer, stand as r329 lists them.
- **(0y¹⁷⁰)**, the sekibune's halyard lead; **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r330 list them.

**THE FRAMES.** No baseline frame shows the fluyt in her own berth. Predicted movers, as in r330: `shipwright`, `shipwright-ahead` and `shipwright-furled` (her rig stands at the left edge, as the 74's left berth neighbour), and `action-gravelines`, whose English fleet is drawn with the fluyt model. The furled frame lowers hoisting yards onto the cap below, so it should not move. The full ratchet was launched on the final tree at 14:37:03, at load 9.5, before the build and this entry. **Every frame is scored and classified in the receipt that follows.**

**r332 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r332` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁷⁷), the fluyt's topgallant sails.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
