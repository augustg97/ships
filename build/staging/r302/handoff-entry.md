
## Round 302 — 2026-11-24 — The Shipwright's build-stage cards for the 22 hulls that set sail are now composed from what each stage adds to that hull. They no longer tell the junk and the clipper that the deck "carries the guns", the trireme, corbita and dhow that a rudder is "hung aft", or every lateen, junk and crab-claw rig that its masts are "fidded through the doubling". Stage 0 is now the keel on every hull; r301 had left the powered hulls reading "Afloat" there.

**Queue check: August's second list stands worked in full (r57). This round took (0y¹²⁷), the sailing cards, which r301 found. It went ahead of (0y¹¹⁹)'s rail for the reason r301 gave for (0y¹²⁶): the rail is a trace on one hull, and (0y¹²⁷) is wrong text shown on 22 hulls. `build/staging/r302` did not exist. The load was 2.0 at the start and no process was hot. r301's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.**

1. **One fixed list of eight cards on every hull that sets sail.** Three of those cards made claims that the parts of most of these hulls contradict. The probe (`stages.json`, every sailing hull's parts by stage) found these cases:
   - Stage 3 said the deck "carries the guns". Only five hulls add a gun at stage 3: the galley, the galleass, the panokseon, the East Indiaman and the ship of the line.
   - Stage 3 said "Rudder hung aft". The trireme, the corbita and the dhow add quarter rudders.
   - Stage 4 said "Lower mast, topmast, topgallant — each fidded through the doubling". The mast meshes' own segment index (`userData.seg.si`) gives the pieces each mast is built in:
     - the dhow, caravel, galley, galleass, junk, treasure ship, panokseon, voyaging canoe, trireme, corbita, cog and sekibune build every mast as one piece;
     - the carrack's and the fluyt's mizzens are single poles;
     - Wyoming and Great Eastern build two pieces per mast;
     - Preussen's record says her lower mast and topmast are one steel tube.
   - Stage 5 said "Shrouds take the sideways pull; ratlines make them a ladder aloft". The junk, the treasure ship and the panokseon add no shrouds or stays. The dhow, the caravel, the galleys and the voyaging canoe add no ratlines.
   - Stage 6 said "The spars the square sails hang from, braced round". Nine of the hulls carry no square sail.
   - Stage 7 said "Canvas. She can now be driven by the wind rather than carried by it." That is the aphoristic register August has rejected.
2. **The furled card** described square sails, gaff sails and a junk's battens on every hull at once.
3. **Stage 0 on the powered hulls read "Afloat" and gave the machinery.** r301's `swPowerCard` answered any stage under 3 with its last card. Stage 0 was outside r301's audit range (3 to 7), so nothing caught it.

**WHAT CHANGED (`shipwright.js`).**

- **`swSailCard(spec, stage, parts)`** builds each sailing card from two inputs: the parts the stage adds (`userData.part`, plus `mi` and `si` from `userData.seg` on a mast mesh) and the record's masts sorted by station (`at`). `swStageCard` sends each hull to it, to `swPowerCard`, or to the keel card. The page and the audit both call `swStageCard`.
  - **Stage 3, "Decked".** "The deck is laid, and its beams tie the two sides together." It then lists what the stage adds, in plain words: "a rudder hung at the stern" or "two quarter rudders, one on each side aft", "guns" only where a gun part exists, anchors, capstan, boats and so on. The voyaging canoe's card reads "Hulls joined": her two hulls stay open, and crossbeams join them and carry a platform.
  - **Stage 4, "Masts stepped".** It gives the number of masts and how each group is built, for example "The forward two are each built in three pieces, lower mast, topmast and topgallant mast; the aftermost mast is a single pole". Where any mast has more than one piece, the card says what fidding is: "Each piece above the lowest stands in the doubling at the head of the one below, held up by an iron fid through its heel, so it can be lowered to the deck." Preussen's card says her lower mast and topmast are one tube, which is what her mast part's own description says. The card then lists tops, crosstrees, bowsprit, castles, oars and the other parts this stage adds.
  - **Stage 5, "Rigged" or "No standing rigging".** Shrouds, stays and ratlines are each named only where the stage adds them. The junk, the treasure ship and the panokseon get "Her masts stand without shrouds or stays." The sekibune gets "Stays hold the mast fore and aft. She carries no shrouds." The Korean and Japanese structures this stage adds get a gloss: sangjang, tate-ita, sama, maku, yakata.
  - **Stage 6.** One sentence per rig the hull carries:
    - square: the number of yards, with braces only where braces are rove;
    - lateen: one long yard per mast, with the sail laced along it;
    - gaff: gaffs and booms;
    - junk: yard, boom and five battens, and how the sail is reefed;
    - crab-claw: the sail's two spars.
    
    The running rigging is one sentence: halyards, sheets, tacks and a count of the other kinds of line. A first version listed every rope, and Endurance's card ran to six lines. `cards-after-endurance-s6.png` is the four-line card that replaced it.
  - **Stage 7, "Bent on".** Which sails go on which masts, by rig and position from forward, and the headsails from `hull.headsails`. Example, the steamer: "square sails on the forward three, a gaff sail on the aftermost mast and three headsails on the stays forward". A square rig with one sail per mast says so (the cog, the trireme, the corbita, the sekibune).
- **`swFurledCard(spec)`** names how each rig she carries is stowed, and only those rigs. `window.SW_FURLED_CARD` exposes it to the audit.
- **`swKeelCard(spec)`** is stage 0 on every hull but the dugout, whose tradition writes her own stage 0. A wooden hull reads "One timber, stem to sternpost. Every frame is set out from it." An iron or steel hull reads "a line of heavy steel plates along the bottom on the centreline, with the stem and sternpost at its ends."
- **The page now collects `addedHere` for every hull.** Before this round it did so only for powered hulls.

Every hull's eight cards, read off the page, are in `cards-after.json`. `cards-before.json` is r301's read of the same cards. All 22 sailing hulls changed. The ten powered hulls changed only at stage 0. The dugout did not change.

**AUDIT AND PROOFS.** New rule, A-STAGE-CARD-SAIL, alongside r301's A-STAGE-CARD. For each sailing hull it asks `SW_STAGE_CARD` for stages 3 to 7, passing the built hull's parts with their segment indices. It convicts a claim the parts contradict in either direction:

- guns, a stern rudder, quarter rudders, ratlines, braces;
- at stage 4: a fidded piece, a single pole;
- at stage 5: shrouds, stays;
- at stages 6 and 7: each of the five rigs, named where it is not carried or carried and not named;
- the "driven by the wind" sentence;
- a furled card that misnames her rig.

It also checks stage 0 on every hull: the title must be "Keel laid", and an iron or steel hull must not be told its keel is a timber.

One false conviction came up while the rule was written. The lateen masts are built by their own path, which records no `userData.seg`, so the audit saw no single poles. Following rule 8 (check the audit first), the audit was corrected: a "Mast" mesh with no segment record is a one-piece pole.

Final tree: 33 hulls, 0 problems. Each proof was run on the :8150 copy (`proofs.log`):

| Proof | What was broken | Problems found |
|---|---|---|
| OLDFILE | the whole pre-round `shipwright.js` | 233 |
| GUNS | "It carries the guns." on every stage-3 card | 18, one per sailing hull that adds no gun |
| POLE | "Each mast is a single pole." on every stage-4 card | 8, one per hull with a mast in more than one piece |
| KEEL0 | the stage-0 dispatch removed | 32, every hull but the dugout |
| FURLSQUARE | square sails named on every furled card | 10, one per hull with no square sail |

The restored copy scored 0.

**READ ON THE PAGE.** `cards-after-{endurance,ship-of-the-line,junk}-s{3,4,6,7}.png` and `sheet-cards.png` show the cards in the frame. The ←/→ row stays above the card at every length, because r301 made the nav a child of the card.

**Rule 0, on `cards-after-endurance-s6.png` read whole:** a rendered barquentine on a lit sea under a pale sky, not a chart. Three facts a viewer can read off it without a legend:
- she has a black hull, with a single funnel abaft her mainmast;
- her foremast crosses yards, and her main and mizzen carry gaffs;
- the card under her says the square-rigged mast crosses three yards and the other two masts carry two gaffs and two booms.

**WHAT IS STILL OPEN.**

- **(0y¹²⁸), NEW.** The cards now say what the model builds, so they show its gaps. Two are model questions for a later round:
  - The trireme's and the corbita's stage 5 card reads "Ratlines across the shrouds", "channels" and "deadeyes", because the model gives a Greek trireme and a Roman merchantman the same channel, deadeye and ratline gear as a carrack. Whether either ship carried ratlines or deadeyes is not settled in this record.
  - Endurance's main and mizzen are built as single poles, so her stage 4 card says so. Whether she carried topmasts on them has not been read off the Hurley plates (`build/hurley-*.jpg`).

  Each is a hull fix, and the card will follow it.
- **Named residuals.** (0y¹¹⁹) the rail, (0y¹²³) the stays, (0y¹²⁵) Preussen's sheer, and (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r301 list them.

**Two ratchet runs died this round, each on a globe frame's 150 s readiness timeout:** `globe-crossing` in the first, `globe-modern` in the second. Each time a second browser was open: the :8150 card reader or the proof audit. `page_errors.py` on `#e=0&t=40000` reached FRAME_READY with no error. The third run was launched with no other browser open until it had passed the globe frames. Do not open a second browser while the ratchet is on its first five frames.

**r303 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r303` already exists before writing into it. Then (0y¹¹⁹)'s rail: trace the plan's heavy shell-top line from stem to stern. Else (0y¹²⁸): Endurance's topmasts first, because she has plates; the trireme's rigging is a research question. Else (0y¹²³).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build; the live check and the frame results are in the receipt that follows.**
