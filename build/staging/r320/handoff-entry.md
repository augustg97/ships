
## Round 320 — 2026-11-25 — The East Indiaman's and the slave ship's mizzen no longer carries a topgallant. Vasa's rig, as the Vasa Museum's 2023 rigging volume draws and names it, has a topgallant mast on the fore and the main and none on the mizzen: the mizzen sets a lateen and one square topsail. The crossjack under that topsail now hangs just under the mizzen top, where Vasa's drawing puts it and where Mainwaring's *Seaman's Dictionary* says it hangs ("a yard at the upper end of the mizen mast under the top"). Until this round both ships stepped a third piece on the mizzen, crossed a topgallant yard on it, and hung the crossjack at the class 0.60 of the lower mast

**Queue check: August's second list stands worked in full (r57). This round first scored r319's backlog, then took (0y¹⁵⁷), which r319 named next. `build/staging/r320` did not exist. The load was 3.2 at the start and no process was hot (WindowServer 16%).**

**r319'S BACKLOG.** `r320_capture.py` (ONLY=…) captured the eight frames r319 left. The first run died at `sea-canoe-floor` on the 150 s ready wait, with a witness browser and a probe browser running beside it; the last three were recaptured alone (`backlog2/`). All eight were scored offline with r277's scorer (`score-backlog.out`): seven inside the gate, `ship-slave-ship` 0.010%. **`ship-carrack` 0.353% / 0.256 is ACCEPTED**: it is r319's predicted change, her lateen foot lifted clear of the sterncastle rail, with the outlicker and the sheet at her stern (`pair-carrack.png`).

**THE SOURCES.**

- Fred Hocker (ed.), *Vasa II: Rigging and Sailing a Swedish Warship of 1628* (Vasamuseet / Nordic Academic Press, 2023), p. 31, the rig diagram, on Wikimedia Commons as `File:Vasa_rig_diagram.jpg` (CC BY 3.0). The 1920 px thumbnail is `dl/vasa-rig.jpg`. Its caption names the masts and spars "(c) foremast; (d) fore topmast; (e) fore topgallant mast; (f) mainmast; (g) main topmast; (h) main topgallant mast; (i) mizzenmast; (j) mizzen topmast", and the sails "(9) mizzen; (10) mizzen topsail". The drawing shows a short yard across the mizzen just under its top, spreading the foot of sail 10.
- Mainwaring, *The Seaman's Dictionary* (c. 1620–23), NRS vol. 56 p. 135 (`r319/dl/henrymainwaring02manwuoft.txt` line 6316): "Cross-jack is a yard at the upper end of the mizen mast under the top and there is slung, having no halliards nor ties belonging to it; the use whereof is to spread and haul on the mizen-topsail sheets." His dictionary has no entry for a mizzen topgallant.

Vasa is dated 1628. The East Indiaman is dated 1620 and the slave ship 1590, and neither has a plate of her own. Both records now say that the rule is read from Vasa and applied to them.

**THE PLATE READ.** The mizzen's own column on `vasa-rig.jpg` (cols 300–330, `crop-vasa-mizzen.png`): the mast meets the hull at row 944, the top's platform runs from row 697 to row 703 (centre 700), and the crossjack crosses the mast at rows 736–738. The crossjack hangs at (944 − 737) / (944 − 700) = **0.848 of the deck-to-top height**. The span is 244 px, so a 3 px reading error is 0.012 of it. The drawing gives the hull as a grey silhouette and draws no deck under the poop rail, so both deck datums are the row where the mast meets the hull. A rail 1 m high would raise the share by about 0.014, so the bound is 0.03. The 74's crossjack on the Asow plate read 0.845 (r313).

**WHAT CHANGED (record only; `r320_record.py`).** On masts[2] of `east-indiaman` and `slave-ship`: `only` 3 → 2; new `tiersProvenance` (PLATE READ, Hocker 2023 p. 31); `courseRead` {ofDeckToTop 0.848, boundPm 0.03, rows, plate, spanPx 244}; `courseAtProvenance` UNREAD → PLATE READ. The builder and the cards are unchanged: the builder already reads `only` and `courseRead`, and the stage-4 and stage-6 cards read the built meshes.

| Mizzen, set build (`probe-before.out`, `probe-after.out`) | Before | After |
|---|---|---|
| East Indiaman: pieces, truck over the water | 3, 43.87 m | 2, 38.67 m |
| East Indiaman: crossjack | 18.63 m (0.60 of the lower mast, class) | 22.35 m (0.763 of the lower mast = 0.848 × 0.90) |
| East Indiaman: topsail, foot to head | 19.18–37.05 m (17.9 m deep) | 22.79–37.05 m (14.3 m deep) |
| East Indiaman: topgallant | 37.22–43.06 m | none |
| Slave ship: pieces, truck | 3, 27.61 m | 2, 24.36 m |
| Slave ship: crossjack | 11.80 m | 14.13 m |
| Slave ship: topsail depth | 11.2 m | 8.9 m |

The lateen yard is unchanged (East Indiaman sling 13.66 m, slave ship 8.70 m). It passes the crossjack's new height 5.9 m (East Indiaman) abaft the mast, so the two spars do not meet. In the furled build the topsail yard still comes down onto the lower cap (27.89 m and 17.61 m), above the crossjack.

**CARDS** (`cards-before.out`, `cards-after.out`). Stage 4 now says "The forward two are each built in three pieces, lower mast, topmast and topgallant mast; the aftermost mast is built in two pieces, lower mast and topmast." It had said all three masts were built in three pieces. Stage 6 now says the masts "cross eight yards"; it had said nine. Stage 7 and the furled card are unchanged.

**AUDIT.** New rule **A-MIZZEN-TIERS**. On every square mast with `lateenMizzen`: (1) the record carries `tiersProvenance`, and silence convicts: 'a lateen mizzen whose tiers have no answer'; (2) on the set build, the mast's segment meshes (userData.seg) number at most two and the square yards slung to it (userData.slung, within 0.6 m of the lateen yard's mast x) number at most two: 'a topgallant over a lateen mizzen'. A-COURSE-READ (r313) already checks the read crossjack against its own rows and against the drawn top, and it passes both hulls at 0.848 ± 0.03.

| Proof (on :8150, `webb/`) | What was broken | Problems found |
|---|---|---|
| OLD | r319's record, the new audit | 4: both rules on both hulls ('3 mast pieces and 3 square yards drawn') |
| FINAL (`audit-first.out` on :8150, `audit-second.out` on :8149 from web/) | none | 0 on 33 hulls |

**WITNESSED.** `#v=ship&s=<id>&b=90&l=6&z=1.1`, before from :8149 (r319's record), after from :8150 (`w-east-indiaman-*.png`, `w-slave-ship-*.png`, `pair-slave-ship.png`). On both ships the mizzen before carried two square sails over a yard at mid-mast. After, it carries one topsail, whose foot is spread by a yard hung just under the round top, and the mast ends at the topsail's head.

**Rule 0, on `w-east-indiaman-after.png` read whole: a rendered three-masted ship broadside on a rippled sea, with a low grey coast behind and two neighbouring hulls cut by the frame's edges. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The two forward masts carry three square sails each; the aftermost carries one square sail and a triangular sail on a slanting yard.**
2. **Each mast has a round platform partway up it, and the aftermost mast's square sail starts just under its platform.**
3. **Her side has a row of square gunports along one deck.**

**THE FRAMES.** Predicted movers: `ship-slave-ship` (her own frame), the 74's frames `shipwright`, `-ahead`, `-astern`, `-furled`, `-hounds` (the East Indiaman is the 74's berth neighbour), and the slave ship's berth neighbours `ship-galley`, `ship-galleass`. No Sea, Action or globe frame is known to show either hull.

The full ratchet was launched on the final tree at 01:39:18, at load 7–8, beside this close. **Every frame is scored and classified in the receipt that follows.** If the run reaches its last frame, the harness prints the browser console errors it collected; neither r318's nor r319's run got that far. Those errors are the first evidence on `ship-treasure` (below).

**WHAT IS STILL OPEN.**

- **(0y¹⁵⁷) is closed.**
- **`ship-treasure` captures the globe in a full run** (90.8% in r318 and r319; 0.000% alone). Read from the code this round: `applyHashView()` runs in a try/catch after `loadData()`, and `shipSelectPending` is set only after `setView()` returns. If `setView('ship')` throws, or the vessel data fails to load, the catch leaves the globe up with `shipSelectPending` false, and `__FRAME_READY` fires on the globe. Not yet confirmed: the 'hash view' message is a `console.warn`, and the harness collects only errors. Next step: capture `aboard-wyoming` then `ship-treasure` in one context (r320_capture.py with ONLY=aboard-wyoming,ship-treasure) with a console listener for warnings.
- **(0y¹⁶³), NEW: the fluyt and the carrack.** Their mizzens are `rig: 'lateen'` and set no square sail. Vasa's mizzen carried a topsail over the lateen in 1628; the fluyt's date and a plate of her would decide whether she did.
- **(0y¹⁵⁸)**, the mizzen lateen yard's class figures (Vasa's drawing shows the lateen yard crossing the mizzen below the crossjack and reaching from over the taffrail to the main deck; it could be read for this next); **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r319 list them.

**r321 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r321` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then (0y¹⁵⁸) off the same Vasa drawing.**

**Live stamp: docs/index.html carries data-version 1795599557 at the build.**
