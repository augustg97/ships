
## Round 319 — 2026-11-25 — Every lateen now draws its sheet, and where the clew stands abaft the stern the sheet is led to an outlicker, a short spar made fast on top of the poop and standing straight out astern, as Mainwaring's *Seaman's Dictionary* describes it. Before this round no lateen in the fleet drew a sheet: the clew of each of the 14 lateen sails on 8 hulls was set in the air with no rope to it. On the carrack, the fluyt, the East Indiaman and the slave ship the mizzen's clew stood 0.75–1.07 m abaft the stern. The carrack's lateen clew also hung 2.6 m under her sterncastle rail, so the sail's foot came down beside the castle; it now clears the rail by 0.5 m

**Queue check: August's second list stands worked in full (r57). This round first scored r318's backlog, then took (0y¹⁵⁶), which r318 named next. `build/staging/r319` did not exist. The load was 3.1 at the start; `SetStoreUpdateService` was at 93% of one core.**

**r318'S BACKLOG.** `r319_capture.py` (ONLY=…) captured the three frames r318 left into `backlog/`, scored offline with r277's scorer (`score-backlog.out`): `ship-treasure` **0.000%** (r318's 90.8% was the globe captured in place of the Shipwright, as it said), `ship-slave-ship` 0.000%, `ship-carrack` 0.000%.

**THE SOURCE.** Sir Henry Mainwaring, *The Seaman's Dictionary* (written c. 1620–23, printed 1644), in *The Life and Works of Sir Henry Mainwaring*, vol. II, Navy Records Society vol. 56 (1922), p. 193 (archive.org `henrymainwaring02manwuoft`, saved as `dl/henrymainwaring02manwuoft.txt`, line 9042):

> "The Outlicker is a small piece of timber (some two or three yards long, as they have occasion to use it) and it is made fast to the top of the poop, and so stands right out astern. At the outwardmost end there is a hole, into which the standing part of the sheet is made fast, and so, being reeved through the block of the sheet, is reeved again through another block which is seized to this piece of timber near the end; and so the use of this is to haul down the mizen sheet to it. This is seldom used in great ships, but the cause why in any ship it is used is for that the mizen mast is placed so far aft that there is not room enough within-board to haul down the sheet flat … generally all Newcastle carvels have them."

Falconer 1769 has no entry for it (`r172/falconer.txt`: BUMKIN is the fore tack's spar at the bow; OUT-RIGGER is a careening beam and a backstay boom in the tops). By his date the fitting had gone out of use.

**WHAT CHANGED.**

- **BUILDER** (`hull.js`, `r319_builder.py`, `r319_builder2.py`).
  - Every lateen yard records its clew in hull space (`userData.lateen.clew`) and a `sheet` record: the lead, the deck's aft end, and the room between them.
  - **The rule is Mainwaring's.** The sheet's lead must stand at or abaft the clew. Where the deck's aft end (`deckEdge` at u 1) is less than 0.3 m abaft the clew (class: a block's room), the lead is an outlicker. It is lashed on top of the poop at the lee quarter and stands straight aft, long enough to reach 0.6 m abaft the clew (class) and kept within his two to three yards (1.83–2.74 m). Otherwise the sheet's standing part is made fast at the lee rail under the clew.
  - The rope follows his reeving: from the standing part up to the clew, back down to the block, then the fall inboard. The sheet is drawn in the set build only. The outlicker is a timber of the ship and stands in both builds.
  - **The carrack's clew clears her castle.** The clew's height came from `deckMax`, which reads the deck and not the castles standing on it. Her clew was at 7.81 m over the water and her sterncastle rail at 10.44 m, so a sheet to the poop could only haul upward. The clew now clears the highest castle rail under the span from the mast to the clew by 0.5 m (class). The carrack is the only lateen hull with a castle, so every other hull is unchanged by this.
  - New PARTS `lateenSheet` ('Lateen sheet') and `outlicker`. The square-mast sheet census counts `sheet` per square mast, so the lateen's sheet takes its own key.
- **CARD** (`shipwright.js`). The stage-6 card on the East Indiaman and the slave ship now says "The mizzen also gets a lateen yard, slung slantwise under its topsail; the lateen sail is laced along it." The lateen yard has been crossed at this stage since r317, and the card did not name it. Each card's "Also added" now lists the outlicker and the lateen sheet (`cards-after.out`).

| Lateen mizzen, set build (`probe-after.json`) | Clew x, y (m) | Deck's aft end x | Outlicker length | Outer end past the stern | Outlicker top y |
|---|---|---|---|---|---|
| carrack | 21.35, 11.40 (was 21.13, 7.81) | 20.22 | 2.32 | 1.72 | 10.44 |
| fluyt | 16.60, 5.15 | 15.63 | 2.17 | 1.57 | 4.39 |
| East Indiaman | 25.76, 7.65 | 24.19 | 2.74 | 2.14 | 6.40 |
| slave ship | 15.79, 4.97 | 14.60 | 2.39 | 1.79 | 3.65 |
| caravel (mizzen) | 9.70, 3.52 | 9.72 | 1.83 | 1.23 | 2.65 |

The caravel's mizzen clew stands 0.02 m forward of her stern, so the rule gives her an outlicker too. Mainwaring names "Newcastle carvels" as the ships that "generally" carry one; that is an English coaster, not the Portuguese caravel, so the caravel's outlicker rests on his reason (no room within-board) and not on a plate of her. The other nine lateens (dhow ×2, caravel fore and main, galley ×2, galleass ×3) have 1.8–26.6 m of deck abaft the clew, and their sheets are made fast at the lee rail.

**AUDIT.** New rule **A-LATEEN-SHEET**, read off the set build against the deck's aft end (0.5 lwl + rake(1)):

- (1) each lateen yard has one 'Lateen sheet' mesh and a recorded clew: 'a lateen clew sheeted to nothing'. The cloth reaches the clew within 0.2 m: 'a lateen clew off its cloth'. The sheet reaches it within 0.08 m: 'a lateen sheet short of its clew'.
- (2) a clew less than 0.3 m forward of the deck's aft end has an outlicker: 'a clew abaft the stern with no outlicker'. A clew with room has none: 'an outlicker where the sheet has room within-board'.
- (3) the outlicker, measured off its mesh: 1.83–2.74 m long, 'an outlicker outside Mainwaring's two to three yards'; its inboard end forward of the stern, 'an outlicker not made fast to the poop'; its outer end abaft the clew, 'an outlicker short of the clew'; its top at least 0.2 m under the clew, 'an outlicker the sheet hauls up to'; the sheet within 0.2 m of its outer end, 'a sheet that does not reach its outlicker'.

The stage-card rule's stage-6 rig set now includes a square mizzen's lateen (`rigs6`). The first audit of the new tree convicted the East Indiaman and the slave ship with 'a sailing stage card that misstates what the stage adds': their stage-6 card listed "lateen sheet" under "Also added", and the rule read that as naming a rig that the hull, by its record, does not cross at stage 6. It does cross one, the lateen yard, and the card had not said so. Both the card and the rule are fixed.

The first version of rule (1) looked only at yards that record a clew, so proof C passed the old builder clean. It now convicts a lateen yard with no clew record as sheeted to nothing.

| Proof (on :8150, `build/staging/r319/webb`) | What was broken | Problems found |
|---|---|---|
| OLD (proof C) | r318's builder, the new audit | 14: 'a lateen clew sheeted to nothing', every lateen yard on 8 hulls |
| NOOUTL | `needOut` forced false | 5: 'a clew abaft the stern with no outlicker' (caravel, carrack, fluyt, East Indiaman, slave ship) |
| CASTLE | the castle clearance on the clew removed | 1: 'an outlicker the sheet hauls up to' (carrack) |
| FINAL (`audit-second.out` and the re-run) | none | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=<id>&b=215&l=8&z=0.55`: after from :8149, before from :8150 serving r318's `hull.js` (`w2-*-before.png`, `w2-*-after.png`).

- `crop-ei-stern.png` (before left): before, the lateen's clew ends in the air abaft the taffrail. After, a short spar stands straight aft off the port end of the taffrail, and the sheet runs from its end up to the clew and back.
- `crop-carrack-stern.png`: before, the lateen's foot hangs down past the sterncastle's rail. After, the foot clears the rail, and the outlicker stands out from the castle top with the sheet to it.
- `sheet-three-after.png`: the fluyt and the slave ship show the same spar and sheet at the stern. The caravel's stern is outside this bearing's frame.

**Rule 0, on `w2-ei-after.png` read whole: a rendered three-masted ship on a rippled sea under a pale sky, with a low coast behind; it is not a chart. Three facts a viewer can read off it without a legend:**

1. **Her stern carries two tiers of latticed windows under a curved rail.**
2. **A short spar sticks straight out astern from one corner of that rail, with a rope from its end up to the lower corner of the slanting sail on her aftermost mast.**
3. **Each mast has a round platform partway up it.**

**THE FRAMES.** Predicted movers:

- `ship-carrack` (her lateen's foot lifted 3.6 m, her outlicker and sheet), `ship-slave-ship`, `ship-dhow`, `ship-galley`, `ship-galleass` (each lateen's sheet);
- berth neighbours: `ship-treasure` (beside the caravel and the carrack), `ship-panokseon`, `ship-sekibune` (beside the galleass and the fluyt), and the 74's frames `shipwright`, `-ahead`, `-astern`, `-furled`, `-hounds` (beside the East Indiaman);
- `action-lepanto` and `action-gravelines` if their fleets carry lateens at visible scale.

The full ratchet was launched on the final tree at 00:36:06, at load 8–12.

**It is being captured beside this close. Every frame is scored and classified in the receipt that follows.**

**WHAT IS STILL OPEN.**

- **(0y¹⁵⁶) is closed.**
- **(0y¹⁶¹), NEW: the outlicker's side and the sheet's angle.** The outlicker stands on the lee quarter (class). Mainwaring says only that it "stands right out astern". Every fore-and-aft sail in the fleet is sheeted at one class angle, so the East Indiaman's clew stands 6.6 m to port of the centreline, 3.5 m outboard of the outlicker's end, and the sheet runs that far across. A plate of a 1620s mizzen sheeted on the wind would settle both.
- **(0y¹⁶²), NEW: the lateen sheet's lead on the all-lateen hulls is a class lee-rail lead under the clew.** A dhow's or a galley's sheet led to the quarter through a block; no plate of either has been read for it.
- **(0y¹⁵⁷)**, the East Indiaman's and the slave ship's mizzen topgallant; **(0y¹⁵⁸)**, the mizzen lateen yard's class figures; **(0y¹⁵⁹)**, the clipper's main skysail; **(0y¹⁶⁰)**, the clipper's yard lengths; **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r318 list them.

**r320 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r320` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁵⁷).**

**Live stamp: docs/index.html carries data-version 1795595769 at the build.**
