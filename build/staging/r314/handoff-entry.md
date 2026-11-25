

## Round 314 — 2026-11-24 — In the furled build the topsail and topgallant yards come down onto their caps, as Eckersberg's 1828 painting of the Russian 74 Asow at anchor shows them. Until this round every hoisting yard stayed where it hangs to set its sail. The 74's main topsail yard now lies 13.2 m lower, just over the main top, and the same rule lowers 33 yards on seven hulls. The Shipwright's furled card says which yards are lowered, read off the built ship

**Queue check: August's second list stands worked in full (r57). This round first scored r313's backlog, then took (0y¹⁴⁶), which r313 named next. `build/staging/r314` did not exist. The load was 4.3 at the start; `mds_stores` was at 100% of one core and CleanMyMac's menu agent at 74%.**

**R313'S BACKLOG: ALL 65 FRAMES NOW SCORED.** `r314_backlog.sh` captured r313's eight unscored frames and `ship-clipper` at r313's HEAD, with no other browser running (17:13–17:19, one run, no FRAME_READY timeout). Scored with r277's offline scorer (`score-bl.out`): all nine are inside the gate. The largest is `passage-sahul` at 0.047%. `ship-clipper` scores 0.001%, so r313's 90.6% was the capture fault r313 named (the globe in place of the Shipwright). `ship-slave-ship` and `ship-carrack`, the two that could have shown r313's crossjack, score 0.000%.

**WHAT (0y¹⁴⁶) ASKED.** On the Asow plate (`build/staging/r312/plates/asow.jpg`, about 30 px/m at the mizzen) every topsail yard is down on its lower cap: the main topsail yard at row about 1190 over the main cap at about 1215, the mizzen's at 1260 over its cap at 1283, the fore's at about 1315 over its cap at about 1340. A topsail is taken in by letting go its halyard, so the yard comes down the topmast until the cap stops it. The model kept every hoisting yard hoisted in the furled build.

**WHAT CHANGED.**

- BUILDER (`hull.js`, `r314_builder.py`): in the furled build, a square yard that rides a tie over section 1 or higher comes down to rest on whichever is higher: the head of the section below the one it rides, or the yard below it with its furled roll. Its centre then stands one yard radius plus 0.02 m over that rest. The roll keeps the cloth of the set sail: its size is computed from the height the yard is hoisted to when set, and the sail above keeps its own depth. Three kinds of yard are not lowered:
  - a single-yard mast's yard (tie 0: the cog, the trireme, the sekibune). No plate of a furled one-sail ship has been read.
  - a yard whose height the record reads off a plate (`yardFracs` from 'record'). Every one of Preussen's 30 yards is such a read, from the Brodie print of her at anchor, so the furled Preussen is unchanged.
  - a yard whose set height is already at or under its rest: the clipper's and the steamer's topgallant yards, and Endurance's topsail and topgallant yards. The plan's class fractions hang these yards inside the doubling, under the cap of the section below the one they ride. See (0y¹⁵⁰).
- Each such yard records on its mesh whether it is lowered and why (`userData.lowered`: mast, name, set height, built height, rest, 'the cap' or 'the yard below', or the reason it is not lowered).
- CARD (`shipwright.js`): `swFurledCard(spec, built)` names the lowered yards by kind, read off the built ship. On the 74: "the topsail and topgallant yards are lowered onto the caps below them". On the clipper: "the upper topsail and royal yards …". Without a built ship, or where nothing is lowered (Preussen, Endurance), the card says nothing about it.

| Hull | Yards lowered | Example (set → furled, m over the waterline datum) |
|---|---|---|
| ship-of-the-line | 6 | main topsail 51.58 → 38.41, main topgallant 60.24 → 54.09 |
| east-indiaman | 6 | main topsail 42.04 → 31.36 |
| slave-ship | 6 | main topsail 26.46 → 19.78 |
| fluyt | 4 | main topsail 27.49 → 20.51 |
| carrack | 2 | main topsail 34.84 → 26.17 |
| clipper | 6 (upper topsails and royals) | main upper topsail 30.83 → 29.50, onto the lower cap |
| steamer | 3 (upper topsails) | main upper topsail 32.18 → 30.95 |
| preussen, endurance, and every one-yard mast | 0 | see above |

(`r314_probe.py`, `probe-after.json`: every yard in every square-rigged hull's set and furled fine builds.)

**AUDIT.** New rule A-YARD-LOWERED (`yardLowerRead`), run on the set build and on the furled build. It reads each yard's height from its mesh, and the cap heights from the mast's own segment meshes:

1. SET: no yard is lowered. Otherwise: 'a set ship with a lowered yard'.
2. FURLED: a hoisting yard that is not lowered must not stand more than 0.05 m over its rest, unless the record reads its height: 'a furled hoisting yard left hoisted'.
3. FURLED: a lowered yard's lowest point is no more than 0.01 m under the head of the section below: 'a lowered yard through the cap below'.
4. FURLED: a lowered yard's centre is within 0.05 m of its rest plus one radius plus 0.02 m, with the rake's rise at the slings added: 'a lowered yard standing off its rest'.
5. The furled card says "yards are lowered onto the caps" exactly when the furled build lowers a yard: 'a furled card that misstates the lowered yards'.

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED.** `#v=ship&s=ship-of-the-line&sail=furled&b=110&z=1.1&l=6`, r312's and r313's camera abaft her port beam. Before on :8149, carrying r313's tree; after on :8150, carrying this round's (`wit-before-b110.png`, `wit-after-b110.png`). `pair-rig-b110.png` (before left, after right, the three mastheads):

- before: on all three masts the topsail's roll hangs under the topmast crosstrees and the topgallant's roll sits at the masthead;
- after: each topsail roll lies just over its lower top, and each topgallant roll just over the topmast crosstrees. The topmast and topgallant poles stand bare above them, as on the plate. The crossjack and the lower yards have not moved.

`pair-b110-small.png` shows the card: the new clause adds one line.

**Rule 0, on `pair-b110-small.png` (after, lower half) read whole: a rendered three-masted two-decker at anchor on a rippled sea with a low coast behind, not a chart. Three facts a viewer can read off it without a legend: she carries two rows of gunports; every sail is rolled up on its yard; on each mast the upper yards have been brought down close over the tops, with bare poles standing above them.**

**THE FRAMES.** Predicted: `shipwright-furled` moves: the 74's six hoisting yards come down, the card's new clause adds one line, and the furled berth neighbours at its edges (the slave ship, the East Indiaman, the clipper) lower theirs. No other frame builds a furled hull with a hoisting yard. The Action frames build their furled fleets from the trireme, the galley, the galleass, the panokseon and the sekibune, which all have one-yard masts or no square rig. The set build is unchanged: proof SETLEAK convicts a set yard that is lowered, and FINAL finds none.

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹⁴⁶) is closed for every segment rig and for the doubled rigs' upper topsails and royals.**
- **(0y¹⁵⁰), NEW: on the doubled rigs the plan's class fractions and the section heights disagree.** The clipper's and the steamer's topgallant yards, and Endurance's topsail and topgallant yards, hang at or under the cap of the section below the one they ride, inside the doubling, so the furled build cannot lower them. On the clipper and the steamer the lower topsail yard, which Howes' rig fixes at the lower cap, hangs under that cap, so the upper topsail yard comes down onto the cap (1.1–1.3 m) and not onto the lower topsail yard. One fix serves both: hang the fixed yards of a doubled rig at the caps the builder actually draws, then read the hoisting yards from there.
- **(0y¹⁵¹), NEW: furled yards stay braced 19° off square.** A ship at anchor squares her yards. With the topsail yards lowered to the caps, one braced arm swings aft toward the topmast shrouds; no rule checks a lowered yard's arm against the shrouds.
- **(0y¹⁴⁹)**, the 74's crossjack carries a sail and a roll that the Asow plate does not show; **(0y¹⁴⁵)**, the 74's spanker gaff jaws stand below the crossjack; **(0y¹⁴⁷)**, the 74's fore and main course heights; **(0y¹⁴⁸)**, the Asow provenance's eye height and scale.
- **(0y¹⁴²), (0y¹⁴⁰), (0y¹³⁹), (0y¹³⁸)** for Great Eastern, Preussen, Wyoming and the steamer, **(0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r313 list them.

**r315 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r315` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁴⁹), the bare crossjack. Else (0y¹⁵⁰).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
