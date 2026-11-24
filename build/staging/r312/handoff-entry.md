

## Round 312 — 2026-11-24 — The 74's spanker is stowed brailed, as Eckersberg's 1828 painting of the Russian 74 Asow at anchor shows it: the gaff stays aloft, the sail is gathered along the after side of the mizzen, and the boom stays where it is. Before this round the furled 74 lowered her gaff onto a roll along the boom, a schooner's stowage, which no plate of a 74 had been read for. The Shipwright's furled card now says "the spanker is brailed in to the mast under its gaff". The audit now convicts a 'brailed' stowage whose provenance opens UNREAD, as r310 already did for 'lowered'

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³⁸) for the 74, which r311 named first. `build/staging/r312` did not exist. The load was 1.8 at the start and the hottest process was CleanMyMac's menu agent at 75% of one core. r311's receipt left no unscored frames, so no clean-HEAD run was made.**

**WHAT (0y¹³⁸) ASKED FOR THE 74.** r310 named the 74's spanker UNREAD: the builder lowered her gaff by default. r310 also said what plate would settle it: a dated drawing or painting of a 74 at anchor with her spanker stowed, and not Victory in dock.

**THE PLATES TRIED.** Commons searches for a 74 or a ship of the line at anchor gave three candidates:

| Plate | What it is | Why it does or does not read |
|---|---|---|
| RMG J7847, "74 GUN SHIP", 1819 | an Admiralty drawing of a 74's anchor and cable | no rig on it |
| RMG PZ0905, J. C. Schetky, *'Bulwark' and other vessels at anchor in Portsmouth Harbour*, 25 August 1824 | a pencil sketch; Bulwark (74) drawn from dead astern | the lines are too faint and too few at the mizzen below the top to show either a gaff or a bundle (`plates/crop-left-ship-3x.png`) |
| C. W. Eckersberg, *The Russian Ship of the Line Asow and a Frigate at Anchor in the Roads of Elsinore*, 1828, Statens Museum for Kunst | oil on canvas, every rope drawn; Asow (Azov), a Russian 74 launched in 1826 (Commons `Category:Azov (ship, 1826)`) | **reads** |

**THE PLATE THAT READS.** Commons' Google Art Project copy, 4044 × 4939 px, read off the 1920 px derivative (`plates/asow.jpg`). She is at anchor with her yards crossed and every square sail furled, seen from high on her starboard quarter. At the mizzen the derivative is about 20 px/m: about 410 px from the poop rail to the mizzen top.

`plates/asow-mizzen-3x.png` (3x about the mizzen) shows:

- a long buff bundle of canvas close along the after side of the mizzen lower mast, from just under the crossjack yard down to the poop;
- the boom lying fore and aft at the poop under it;
- the St Andrew's ensign hanging from high on the mizzen, from the peak of a gaff that stands aloft.

That is the spanker brailed in to the mast under a standing gaff, with the boom left in place.

**CONTESTED, and the provenance says so:** one painting of one ship, a Russian 74 painted 48 years after this hull's 1780. The ensign hides the gaff's own line, so the gaff's angle and length are not read, and neither is the boom's height.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r312_record.py`): the 74's mizzen carries `furlStow: 'brailed'` and a `furlStowProvenance` that names the plate, its scale, what it shows and what it does not.
- BUILDER (`hull.js`): comment only. A square mast's spanker goes through the same branch as a gaff mast's sail, so the r308 brailed stowage draws it with no new code: gaff aloft at its working angle, the sail in one bundle on the mast's after side between the deck and the jaws, the boom on its topping lift.
- CARD: no code change. r310's `SW_FURLED_CARD` already says "the spanker is brailed in to the mast under its gaff" when every spanker on the hull is 'brailed', so the 74's card changed with the record. Before: "the spanker's gaff is lowered and the sail is stowed along its boom".

**AUDIT.** New rule A-STOW-READ: a mast whose `furlStow` is 'brailed' and whose `furlStowProvenance` opens UNREAD is convicted. r310 had this check for 'lowered' only, so a 'brailed' value over an unread provenance passed. The 74 is the first square mast to carry 'brailed', so r308's brailed rules now run on a square mast: one boom, no furl roll on it, one bundle on the mast's after side between the deck and the jaws, and the gaff above 20°. Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED.** `#v=ship&s=ship-of-the-line&sail=furled&b=110&z=1.1&l=6` (abaft her port beam), before carrying the r311 record and after carrying the new one, both on :8150 (`wit-before-b110.png`, `wit-after-b110.png`). `pair-mizzen-b110-2x.png` (before left, after right, 2x about the mizzen):

- before: the gaff lies lowered on a roll of canvas along the boom, and the mizzen is bare from the crossjack yard to the deck;
- after: the gaff stands aloft, its jaws just under the crossjack yard, as on the plate. The sail lies in one pale bundle down the mast's after side to the boom. The boom stays where it was, with nothing rolled on it.

**Rule 0, on `wit-after-b110-small.png` read whole: a rendered three-masted two-decker on a rippled sea, seen from abaft her port beam, not a chart. Three facts a viewer can read off it without a legend: she carries two rows of gunports along her side; every square sail is rolled up on its yard on all three masts; the mizzen's gaff stands aloft with the spanker gathered against the mast and the boom bare beneath it.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³⁸) is closed for the 74.** It stays open for Great Eastern, Preussen, Wyoming and the steamer: each of their masts names its silence in the record.
- **(0y¹⁴³), NEW: the 74's crossjack yard and gaff jaws may stand too low.** On the Asow plate the crossjack yard, and the head of the brailed bundle under it, stand near the mizzen top. On the model both stand lower down the mast. Read by eye off `plates/asow-mizzen-3x.png` and `pair-mizzen-b110-2x.png`, the crossjack yard stands at about 0.88 of the height from the poop rail to the top on the plate, and at about 0.69 on the model. This is an eye read of two images from different cameras, not a measurement. A row read on the plate (the poop rail, the crossjack yard, the bundle's head and the top, along the mast's line) and `measure_ship` on the model would settle it. The 74's yard fractions are class figures, so a read would replace a default, not a record.
- **(0y¹⁴²)** (Preussen's island reads), **(0y¹⁴⁰), (0y¹³⁹), (0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r311 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r313 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r313` already exists before writing into it. Then (0y¹⁴³), measured on the Asow plate and on the model. Else (0y¹⁴²).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
