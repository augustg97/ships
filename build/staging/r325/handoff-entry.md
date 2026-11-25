
## Round 325 — 2026-11-25 — The East Indiaman's and the slave ship's fore and main topmasts now carry a small round top under the cap, where Hocker's rig diagram of Vasa (1628) draws one. Until this round every three-tier topmast in the fleet carried open crosstrees at its head, the fitting of the 18th century. On Vasa's plate the topmast top is 0.46 of the lower top's width on the fore and 0.48 on the main, and it stands at 0.945 and 0.943 of the height from the mast's foot to the topmast's head. On the East Indiaman the fore topmast top is 2.29 m across and stands 31.46 m over the water; the crosstrees it replaces stood at 32.53 m. The topmast shrouds now set up under the top, where before they ran up to the cap and would have passed through it. The topgallant shrouds set up at the top's rim

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶⁷), which r324 named next. `build/staging/r325` did not exist. At the start the load was 2.1. r324's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE PLATE READ** (`r325_read.py`, output in `read.json`), on the same 1920 px thumbnail of Hocker, *Vasa II* (2023), p. 31 (`r320/dl/vasa-rig.jpg`, bow at the right). Spar pixels are those with R−G over 30 or grey under 150, as in r324. For each mast the axis is fitted on the spar's centres in rows clear of the top. In every row the run of spar pixels through the axis is measured. The top is the set of rows whose run is at least 0.6 of the widest, and its row is their centre. The lower top on the same mast is read by the same test, so the topmast top's size is a ratio of two widths on one plate.

| Vasa, rows on the plate | foot | topmast head | top's rows (centre) | widest run | lower top: rows, widest run | share of foot-to-head | width over the lower top's |
|---|---|---|---|---|---|---|---|
| fore | 1005 | 330 | 364–370 (367.0) | 43 px | 678–691, 93 px | 0.9452 | 0.462 |
| main | 1012 | 298 | 333–345 (339.0) | 40 px | 674–690, 84 px | 0.9426 | 0.476 |

The lower-top rows agree with r322's reads (683 and 682) to 1.5 px. By eye on 4–5× crops (`fore-tmtop.png`, `main-tmtop.png`, `fore-lowtop.png`) each top is a shallow bowl in profile under a short cap; the eye reads 47 and 48 px across the topmast tops and 95 across the fore lower top, a ratio of 0.49–0.51, so the pixel test reads about 0.03 narrower than the eye. The record's bound on the ratio is 0.06. The mizzen (a 10 px run, rows 469–486) and the topgallant masts (6 and 13 px) show no top this test can resolve; the mizzen has a short crossbar about row 482 under its cap at 459. It is not read and not drawn.

**WHAT CHANGED.**

- **Builder** (`hull.js`, in the block that stays the upper masts). A square mast may record `topmastTop` with `ofFootToHead` and `ofLowerTop`. Such a mast draws `buildTop` at that share of the height from the mast's foot to the topmast's head, with radius `ofLowerTop` × the lower top's (beam × 0.20), so it is round and walled before 1710 like the lower top. It draws no crosstrees. Its topmast shrouds end at the hounds, 0.25 of the top's radius under its centre. Its topgallant shrouds start on the top's rim at 0.85 of its radius. The top records `userData.topmastTop` (mast, height, foot, head, radius, the lower top's radius, the shroud head). The crosstrees group now records its mast, and the topmast shroud mesh records its mast and head height. Without the field, every other hull builds as before.
- **Record** (`r325_record.py`). The fore and main of `east-indiaman` and `slave-ship` carry `topmastTop`, with the rows, the widths and the plate, and a `topmastTopProvenance` that opens PLATE READ. The fluyt's fore and main, the only other three-tier segment-rig masts on a hull dated before 1710, carry `topmastTopProvenance` UNREAD and keep their crosstrees. The 74 (1780) is outside the rule: crosstrees are her period's fitting.

| Built, hull metres over the waterline (`probe-before.json` on :8150 with r324's tree, `probe-after.json` on :8149) | before | after |
|---|---|---|
| East Indiaman fore: crosstrees / topmast top | crosstrees at 32.44–32.62 m | top 31.21–32.08 m, 2.29 m across |
| East Indiaman fore: topmast shrouds' head | 32.53 m | 31.18 m |
| East Indiaman main: crosstrees / topmast top | crosstrees at 33.24–33.41 m | top 31.87–32.77 m, 2.36 m across |
| slave ship fore: crosstrees / topmast top | crosstrees at 19.89–20.00 m | top 19.13–19.70 m, 1.48 m across |
| slave ship main: crosstrees / topmast top | crosstrees at 20.25–20.36 m | top 19.41–20.00 m, 1.52 m across |

On every one of the four masts the topmast shrouds now end under the top's lowest point, and the topgallant shrouds' feet stand on its rim (0.99–1.02 m off the centreline on the East Indiaman, where the rim is at 0.97–1.00 m).

**AUDIT. A-TOPMAST-TOP, new**, written after A-HOIST-READ.

- **Record.** On a hull dated before 1710, every square mast with no `yards` list and three tiers must carry `topmastTopProvenance`, opening PLATE READ with a `topmastTop` or UNREAD without one. A mast that says neither is convicted. A read's share must agree with its rows to 0.005 and its ratio with its widths to 0.01.
- **Built.** A read mast must carry one 'Topmast top' and no crosstrees. The top's centre must stand within the read's bound of the read share. Its half-width, measured off its meshes, must be the read share of the lower top's radius to within 5%. The topmast shrouds' highest vertex must stand under the top's lowest. The topgallant shrouds' feet must stand on the rim, within 0.15 of the radius of 0.85 of it. A mast with no read must carry crosstrees and no topmast top.
- **A-COURSE-READ** read "the mast's own top" as the nearest group tagged `top` by x. A topmast top on a mast with little rake stands at almost the same x as the lower top, so the rule could have measured the course against it. It now reads only the group named 'Top'.

The rule's three proofs:

- **A**, r324's builder and record on :8150 (`proofA.out`): 12 problems, two on each of the six masts. The record says nothing, and the crosstrees do not say which mast they belong to.
- **B**, r324's builder with this round's record (`proofB.out`): 6 problems. The four read tops are not drawn, and the fluyt's crosstrees do not say which mast they belong to.
- **C**, this round's builder with the top set at the old crosstrees height, and this round's record (`proofC.out`): 4 problems, one per read top. Each stands at 0.984 of foot-to-head against a read of 0.945 or 0.943.

`audit-first.out`, :8149 from web/: 0 problems on 33 hulls.

**WITNESSED.** `#v=ship&s=east-indiaman&b=70&l=8&z=0.45&y=30&x=-8`, before on :8150 with r324's tree (`webb/`), after on :8149: `w-ei-before.png`, `w-ei-after.png`, and the crops `pair-ei-main.png` and `pair-ei-fore.png`, before on the left. On the main, a small walled round top now stands on the topmast under the topgallant sail. Before, there was only the end of a crosstree. On the fore the topgallant sail hides most of the top from this camera.

**A FAULT THE WITNESS SHOWS, AND IT IS NOT NEW IN KIND.** The forward half of the main topmast top stands in front of the topgallant sail, so the top passes through the cloth (`pair-ei-main.png`, right). The same witness shows every lower top in the fleet passing through the topsail set above it, on both masts in frame (`w-ei-before.png`, the lower tops at about 545–710 and 1215–1325 across). A square sail's foot is sheeted to the yard below, so the cloth runs down past the top in a plane about one mast radius forward of the axis. A top reaches forward of the axis by its whole radius. A real sail cleared its top by its belly, and where it rubbed it carried a chafing piece, the top lining. The model's square sails have neither, and no audit rule tests cloth against tops. This round makes the fault larger on the four topgallant sails of these two ships; it already stood on every topsail over a top. **This is (0y¹⁶⁸), and r326 should take it first:** measure each square sail's cloth against every top between its head and its foot, on every hull. Then shape the cloth to bear on the top's forward rim from above and below, by the top's radius, and add the rule.

**Rule 0, on `w-ei-after.png` read whole: a rendered three-masted ship's upper rig against a rippled sea and a low grey coast. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **Each mast carries three square sails stacked one above another, and the sails get smaller toward the top.**
2. **The lower masts carry broad round tops with a raised rim, and on the main a much smaller round top stands higher up, on the topmast.**
3. **Each mast's head is stayed by ropes running down and outward from its top to the yard arms and to the next mast.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶⁷) is closed** for the fore and main of the East Indiaman and the slave ship. The mizzen's crossbar at about row 482 is not read.
- **(0y¹⁶⁸), NEW, above: tops through the sails set above them.**
- **(0y¹⁶³)**: the fluyt's and the carrack's mizzen topsail. If the fluyt's masts are read off Vasa's plate, her `topmastTopProvenance` changes from UNREAD with them.
- `ship-treasure` captures the globe in a full run (r318, r319); r320's next step stands. **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r324 list them.

**THE FRAMES.** Predicted movers: `ship-slave-ship` (no reframe; the truck is unchanged), the slave ship's berth neighbours `ship-galley`, `ship-galleass` and `ship-carrack`, the 74's frames `shipwright`, `-ahead`, `-astern`, `-furled` and `-hounds` (the East Indiaman's upper rig reaches their left edge), and `globe-default` (the 1590 Middle Passage markers are slave-ship models). The full ratchet was launched on the final tree at 07:31, at load 5.5, before the build. **Every frame is scored and classified in the receipt that follows.**

**r326 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r326` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁶⁸).**

**Live stamp: docs/index.html carries data-version 1795620710 at the build.**
