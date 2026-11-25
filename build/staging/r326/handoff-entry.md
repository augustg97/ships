
## Round 326 — 2026-11-25 — No top now stands through the sail set over it. A topsail's foot is sheeted to the yard below the top, so its cloth hangs down past the top on the fore side of the mast. The model hung that cloth in its own belly, about a mast's width forward of the axis, and a top reaches forward of the axis by its whole radius. On 9 hulls, 25 tops stood through the sail above them, by up to 1.92 m (the East Indiaman's mizzen top through her mizzen topsail). Each set square sail is now cut to clear every top on its own mast by 4 cm: the cloth is pushed forward over the rows the top spans, and returns to its own shape at the head and at the foot, where it is made fast to its yards. Falconer's *TOP-LINING* is the chafing cloth sewn on the after side of a real topsail where it rubbed the rim of the top

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁶⁸), which r325 named first. `build/staging/r326` did not exist. At the start the load was 2.7. r325's receipt left no unscored frames, so no clean-HEAD run was made.**

**THE MEASURE** (`r326_probe.py`, `probe-before.json`, `probe-after.json`). The probe builds every hull fine and set. For every set square sail and every top it does three things. It puts each vertex of the top in the sail's own frame. It finds the cloth at that vertex's (x, y) through the sail's own `surface(u, v)`. It reports how far the vertex stands forward of the cloth. Pairs whose top belongs to another mast are dropped: they stand 10 m or more off the cloth.

| hull | sail (hull metres) | top | before | after |
|---|---|---|---|---|
| carrack | mast at x -15.23, yard at y 32.42 | Top (r 2.20 m) | 0.02 m through | 0.15 m clear |
| carrack | mast at x 1.96, yard at y 34.85 | Top (r 2.20 m) | 0.42 m through | 0.16 m clear |
| sekibune | mast at x -0.68, yard at y 13.10 | Top (r 1.00 m) | 0.05 m through | 0.10 m clear |
| fluyt | mast at x 1.54, yard at y 27.49 | Top (r 1.32 m) | 0.03 m through | 0.12 m clear |
| East Indiaman | mast at x -18.05, yard at y 30.23 | Top (r 2.48 m) | 0.64 m through | 0.13 m clear |
| East Indiaman | mast at x -18.05, yard at y 36.35 | Topmast top (r 1.15 m) | 0.04 m through | 0.10 m clear |
| East Indiaman | mast at x 2.41, yard at y 30.38 | Top (r 2.48 m) | 1.17 m through | 0.10 m clear |
| East Indiaman | mast at x 2.41, yard at y 38.82 | Topmast top (r 1.18 m) | 0.29 m through | 0.09 m clear |
| East Indiaman | mast at x 15.72, yard at y 22.90 | Top (r 2.48 m) | 1.92 m through | 0.11 m clear |
| 74 | mast at x 2.86, yard at y 51.59 | Top (r 2.92 m) | 0.34 m through | 0.21 m clear |
| 74 | mast at x 18.28, yard at y 45.34 | Top (r 2.92 m) | 1.38 m through | 0.13 m clear |
| slave ship | mast at x -10.84, yard at y 18.56 | Top (r 1.60 m) | 0.49 m through | 0.09 m clear |
| slave ship | mast at x -10.84, yard at y 22.24 | Topmast top (r 0.74 m) | 0.07 m through | 0.08 m clear |
| slave ship | mast at x 1.46, yard at y 18.53 | Top (r 1.60 m) | 0.81 m through | 0.08 m clear |
| slave ship | mast at x 1.46, yard at y 23.61 | Topmast top (r 0.76 m) | 0.23 m through | 0.07 m clear |
| slave ship | mast at x 9.50, yard at y 14.05 | Top (r 1.60 m) | 1.26 m through | 0.09 m clear |
| Preussen | mast at x -50.57, yard at y 34.94 | Top (r 3.28 m) | 0.55 m through | 0.23 m clear |
| Preussen | mast at x -25.30, yard at y 35.67 | Top (r 3.28 m) | 0.51 m through | 0.23 m clear |
| Preussen | mast at x 0.37, yard at y 35.09 | Top (r 3.28 m) | 0.52 m through | 0.23 m clear |
| Preussen | mast at x 25.67, yard at y 32.94 | Top (r 3.28 m) | 0.63 m through | 0.23 m clear |
| Preussen | mast at x 47.53, yard at y 29.62 | Top (r 3.28 m) | 0.69 m through | 0.23 m clear |
| clipper | mast at x 21.39, yard at y 22.66 | Top (r 2.19 m) | 0.59 m through | 0.17 m clear |
| steamer | mast at x -34.80, yard at y 28.29 | Top (r 3.08 m) | 1.31 m through | 0.19 m clear |
| steamer | mast at x -11.04, yard at y 30.96 | Top (r 3.08 m) | 1.04 m through | 0.20 m clear |
| steamer | mast at x 10.12, yard at y 28.78 | Top (r 3.08 m) | 1.22 m through | 0.19 m clear |

The fluyt's fore topsail, the 74's fore topsail, the clipper's fore and main topsails and Endurance's topsail already cleared their tops by 0.08–0.60 m. None of them is changed.

**WHAT CHANGED** (`r326_hull_edit.py`, `r326_hull_edit2.py`, and one line applied by hand at 08:47, quoted below).

- **`makeSail`** takes `discs`, the tops on the sail's own mast, in hull space. The cloth's shape before any push is one function, `cloth0(u, v)`. It has the same terms in the same order as the vertex loop had, so a sail that no top reaches is byte-identical. For each top, `topOutline(r, year, mastR)` lists the outline that `buildTop` draws: the platform's rim, the wall on a top dated before 1710, the D's straight sides after 1710, and the trestletrees and crosstrees under the platform. Each point carries the heights it spans. At 241 stations across the sail, the cloth is pushed forward by the least amount that clears every outline point at that station, over the rows that point spans plus one grid row on each side, with 4 cm to spare. Across the sail, the push eases to zero over one top-radius beyond the last station the top touches. Down the sail it holds over the top's rows and eases on a quarter sine to zero at the head and at the foot. The head row always starts the ease, even where a top reaches it: the head is laced round its yard (the hand-applied line, `const va = Math.max(dr.VA[k], 1 / NH)`). The sail records `userData.drape` (each top it is cut over, the push and the clearance) and `userData.drapeAt(u, v)`.
- **The mast's tops are known before its sails are cut.** The lower top enters `mastDiscs` where it is built. The topmast top (r325) is built later, in the standing rigging, so its disc is entered at the head of the mast from the same record and the same expressions. The lower top now records `userData.mast`. Each square sail records `userData.mast` and `userData.yardR`.
- **The gear follows the cloth.** `sailPt`, which places the clewlines and buntlines on the cloth, adds the sail's `drapeAt`. The reef points read `surface`, which carries the drape.

| clearance after, every pushed pair | least | most |
|---|---|---|
| over a walled top (before 1710) | 0.07 m (slave ship, main topgallant over the topmast top) | 0.16 m (carrack) |
| over a D top (1710 and after) | 0.13 m (74, mizzen) | 0.23 m (Preussen) |

The clearance is larger than the 4 cm aimed at because the push is set by the cloth one grid row above or below the top. Near the head the belly grows quickly down the sail, so that row asks for more. On a 26 m Preussen topsail, 0.23 m off a top 6.6 m across reads as the cloth lying on it.

**AUDIT. A-SAIL-TOP, new**, written before A-RIG-HEIGHT.

- Every set square sail must carry `userData.drape`, an array. It is empty where no top reaches the sail. A sail with no array is convicted as silent.
- Each vertex of each top on the sail's own mast that falls inside the cloth's width and rows is put in the sail's frame. The cloth there is read off the mesh's own triangles. The rows within the yard's diameter of the head are where the head is laced round the spar, and are not read. A vertex standing more than 5 mm forward of the cloth convicts.
- A sail cut over a top must bear on it: the top's nearest vertex may stand no more than 0.30 m aft of the cloth.

Proofs, all on :8150 (`webb/`):

- **A**, r325's builder (`proofA.out`): 98 problems. Every one of the 98 set square sails on 13 hulls is silent about what it bears on.
- **B**, this round's builder with no tops passed to `makeSail` (`proofB.out`): 24 problems, the 24 tops through their sails. The probe's 25th, the sekibune's 0.05 m, is at 0.005 of the drop, inside the yard's lacing, which the rule does not read.
- **C**, this round's builder with the topmast top's disc withheld (`proofC.out`): 4 problems, the East Indiaman's and the slave ship's topgallants.
- **D**, this round's builder cutting the cloth 0.50 m off the top (`proofD.out`): 29 problems, every pushed sail standing off its top.

`audit-first.out` (:8149, before the head-row line): 0 problems on 33 hulls. `audit-final.out` (:8150, serving this round's final hull.js): 0 problems on 33 hulls.

**WITNESSED.** Two cameras on the East Indiaman, before on :8150 with r325's builder and after on :8149, with the page's panels hidden (`HIDEUI=1` in `r326_witness.py`):

- `#v=ship&s=east-indiaman&b=70&l=8&z=0.45&y=30&x=-8`: `w-ei-before-clean.png`, `w-ei-after-clean.png`, side by side in `pair-ei-clean.png`. Before, five tops stand in front of the sails: the fore and main lower tops, the mizzen top, and both topmast tops. After, none does. Each topsail bulges forward over its top, and the fore lower top's wall shows only beyond the topsail's leech.
- `#v=ship&s=east-indiaman&b=50&l=10&z=0.55&y=18&x=-4`: `pair-ei-low.png`. Before, the fore and main lower tops and the mizzen top stand in front of the topsails. After, all three are behind the cloth, and the topsails' lower halves round forward over them.
- r325's `w-ei-after.png` was captured at another framing with the panels hidden, so it is not this round's before; both befores were re-shot.

**Rule 0, on `w-ei-after-clean.png` read whole: a rendered three-masted ship's upper rig over a rippled sea, a low grey coast on the horizon. It is not a chart. Three facts a viewer can read off it without a legend:**

1. **The sails are full and stand forward of the masts; the tops are behind them.**
2. **Each mast carries three square sails, smaller toward the top, and the mizzen also sets a triangular lateen.**
3. **A stay runs from the main topmast head down and forward past the fore topsail.**

**WHAT IS STILL OPEN.**

- **(0y¹⁶⁸) is closed** for every set square sail over a top on every hull. The furled build has no set cloth and is not touched.
- **(0y¹⁶⁹), NEW:** the sekibune's single yard hangs inside the trestletrees under her top (the top's lowest vertex is 5 cm forward of the cloth at 0.005 of the drop). That is a yard against a top, not a sail against one. Read where her yard hangs before moving it.
- **(0y¹⁶³)**: the fluyt's and the carrack's mizzen topsail. `ship-treasure` captures the globe in a full run (r318, r319). **(0y¹⁶¹)**, **(0y¹⁶²)**, **(0y¹⁵⁹)**, **(0y¹⁶⁰)**, **(0y¹⁵³)**, **(0y¹⁵⁵)**, **(0y¹⁵¹)**, and **(0y¹⁴⁵)** to **(0y⁹⁴)** and the named residuals stand as r294 to r325 list them.

**THE FRAMES.** Predicted movers: every Shipwright and Sea frame that shows a set square sail on the carrack, the fluyt, the East Indiaman, the 74, the slave ship, Preussen, the clipper or the steamer. That covers `shipwright`, `-ahead`, `-astern`, `-hounds` (the 74; `-furled` has no set cloth), `ship-carrack`, `ship-slave-ship`, `ship-preussen`, `ship-clipper`, `ship-steamer`, the berth neighbours of each, `aboard-clipper`, `aboard-preussen`, and `globe-default` (the slave-ship markers). The full ratchet was launched on the tree at 08:46, at load 7.0. The head-row line went into web/ at 08:47:17, while `globe-crossing` was capturing; a page opened within 10 s of the edit may have loaded either builder. The line moves only a sail whose top reaches its head row, which is the sekibune alone. **Every frame is scored and classified in the receipt that follows.**

**r327 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r327` already exists before writing into it. If this round's receipt lists unscored frames, score them first. Then take (0y¹⁶⁹) or (0y¹⁶³).**

**Live stamp: docs/index.html carries data-version 1795625245 at the build.**
