
## Round 309 — 2026-11-24 — Titanic's C deck is re-traced off the 1911 side plan, and her after well deck now stands where the plan draws it: 10.0 to 10.15 m over the water, 0.27 to 0.3 m higher than before. r299's trace had stepped off the dashed C line onto a solid line 0.4 m under it at column 790 and followed that line to the stern, while its provenance said it followed the dashed line. The deck under the poop and at the stern rises with it, 0.37 to 0.42 m. The after well's wash ports now stand 0.35 to 0.44 m over the deck, where r307 had them 0.63 to 0.75 m over it

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³⁶), which r308 named first. `build/staging/r309` did not exist. The load was 2.3 at the start and the hottest process was CleanMyMac's menu agent at 74% of one core. r308's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT (0y¹³⁶) ASKED.** r307 found the plan's after-well wash ports 0.66 and 0.76 m over the recorded deck, while the forward well's ports open to the deck. Either the after well deck stands higher than r299's read, or the after ports stand high.

**WHAT WAS WRONG.** r299 traced the C deck by following a dashed line aft from the stem, letting each point move up to 4 rows from the last. Its own trace (`r299/read.json`) shows:

- forward of column 800 it is on the dashed line, at row 710.5 at column 800;
- at column 790 it is at row 715.5, 5 rows lower, and it stays on that lower line to column 150.

Per column, the plate shows three things in the after well (`r309` read, columns 500 to 820):

| Rows | What | Height over the water |
|---|---|---|
| 704–706 | the after wash ports' lower edges (columns 580–700 only) | 10.4–10.55 m |
| 710–711 | the dashed C deck, continuous with C amidships | 10.0–10.15 m |
| 715–717 | a solid line that begins between columns 800 and 820 and runs to the stern | 9.55–9.75 m |

The solid line begins under the house, about 3 m forward of its after end, so it is not the well's deck. It is not identified. r299's provenance said "the trace follows the dashed line at row 710"; the trace data says it did not. r299's quintic fit, pulled between the two lines, departs its own trace by 2.4 to 2.7 px at u 0.55, 0.80 and 0.85, and its rms was 1.20 px.

**THE RE-TRACE (`r309_read.py`).** r299's method with one change: each point may move at most 1.5 rows from the last (the dashed line's steepest real slope is 1 row in 10 columns, at the stem). It tracked all 346 points with no rejected step. The largest step between neighbours is 0.99 rows. The quintic's rms is 0.60 px, half r299's.

| u | 0.00 | 0.50 | 0.60 | 0.70 | 0.75 | 0.80 | 0.85 | 0.90 | 0.95 | 1.00 |
|---|---|---|---|---|---|---|---|---|---|---|
| r299 (m) | 12.21 | 9.60 | 9.55 | 9.58 | 9.62 | 9.67 | 9.75 | 9.85 | 9.99 | 10.14 |
| r309 (m) | 12.27 | 9.57 | 9.51 | 9.61 | 9.71 | 9.85 | **10.02** | **10.22** | **10.41** | **10.53** |

Forward of u 0.70 every station moves by 0.06 m or less. A local fit (`r309_local.py`) was tried and rejected: it follows a 1 px flat in the drawing amidships and puts a 0.1 m dip in the deck at u 0.55, which a fair sheer does not have.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r309_record.py`):
  - `sheerRead`: new stations, rows, datum rows and rms;
  - `sheerRead.trace`: the raw trace, one row per 10 columns from 3600 to 150, with `maxStepRows` 1.5, so the audit can check the fit against it;
  - the provenance says what r299 read wrong;
  - `deckM` 3.133 → 3.143, so the boat deck stays at the recorded 19.0 m over the new 9.57 m amidships;
  - `portsProvenance`: the after ports stand 0.35 to 0.44 m over the C deck.
- BUILDER: no change. `hull.js` draws the sheer through the record's stations.
- MEASURED (`measure_ship`, `ms-before.out` against `ms-after.out`):

| Part | Before | After |
|---|---|---|
| After well bulwark, foot | 9.70 m | 9.93 m |
| Poop deck, foot | 9.77 m | 10.11 m |
| Sternpost, head | 10.14 m | 10.53 m |
| Mainmast, foot (truck held at 61.95 m) | 9.62 m | 9.82 m |
| Superstructure, foot / top | 9.60 / 20.26 m | 9.57 / 20.26 m |
| Weather deck, lowest edge | 9.55 m | 9.51 m |

| Wash port | Deck under it before | After | Sill now |
|---|---|---|---|
| After well, first (u 0.8444–0.8576) | 9.74–9.77 m | 10.00–10.05 m | 0.35–0.40 m |
| After well, second (u 0.8697–0.8814) | 9.79–9.81 m | 10.10–10.15 m | 0.39–0.44 m |
| Forward well, both | unchanged within 0.01 m | | open to the deck |

**AUDIT.**

- New rule A-SHEER-TRACE, inside A-SHEER-READ:
  - no two neighbouring trace points may differ by more than the trace's `maxStepRows`; a larger step is a jump to another line;
  - every station inside the trace's columns stands within 2 px of the trace's own row at its column, because a smooth fit cannot follow a jump;
  - a `sheerRead` with no trace is convicted.
- **Audit fault found on the first run:** the house rule (round 34) derives the boat deck from the record's class `freeboard`, 10.1 m. Since r299 the builder stands the house on the read sheer, 9.57 m amidships. The rule had passed r299's tree by 0.001 m and convicted this one at 19.5 m. It now reads `hullSurface(H).sheer(0.5)` on a hull with a read deck line.

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED.**

- `profile_capture --ship titanic`, before on the :8150 copy carrying the r308 record, after on :8149. `pair-sb-aftwell.png` (3° starboard profile, 4x, before over after): from the side the after well's deck is behind its bulwark, and the closed doors and capping are unchanged.
- `#v=ship&s=titanic&b=140&l=22&z=0.8`, before and after (`wit-before-q.png`, `wit-after-q.png`). `pair-q-aftwell.png` (2x, before over after) looks down into the after well. The far bulwark's grey inboard face shows 13 px over the deck where it showed 17 to 18 px (columns 2420 and 2470 of the 2880 px frame). 0.81% of the frame changed.

**Rule 0, on `wit-after-q-small.png` read whole: a rendered liner on a rippled sea, seen from high on her starboard quarter, not a chart. Three facts a viewer can read off it without a legend: she has four buff funnels with black tops standing on a long boat deck lined with lifeboat davits; there are two open well decks, one between the forecastle and the white superstructure and one between the superstructure and the poop; the hull below the superstructure is black with rows of portholes.**

**THE FRAMES.** Predicted movers: `ship-titanic` and `aboard-titanic`. The sheer moves along her whole length, and most at the stern. Her truck heights are record figures, so the Shipwright camera's rig-top datum does not move. The full check was launched at 10:59 and died at frame 6 (`shipwright`) on the 150 s FRAME_READY wait. `run-resume.sh` chains `r309_resume.py` runs until every frame is captured.

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³⁶) is half closed.** 0.3 m of the 0.7 m was r299's trace error. The plan still draws the after ports' lower edges 5 rows (about 0.4 m) over the dashed C line, while the forward ports stand on it. A side photograph of the after well would show whether the doors have a sill. The model cuts the ports where the plan draws them.
- **(0y¹⁴⁰), NEW: the solid line under C aft.** It runs from under the house's after end to the stern, 0.4 to 0.45 m under C. It may be the top of a shell strake or a painted line. A Harland and Wolff profile or a close photograph of her stern would identify it.
- **(0y¹⁴¹), NEW: other traces may have the same fault.** Every plate trace from r295 to r307 that followed a line by "within N rows of the last point" can jump in the same way: the island tops (r298), the well bulwark lines (r303) and Preussen's reads. A-SHEER-TRACE covers only `sheerRead`. The island and bulwark reads were fitted as straight lines with rms 0.32 to 0.35 px, so a jump there would show in the rms. The record does not carry their traces.
- **(0y¹³⁸), (0y¹³⁹), (0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r308 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r310 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r310` already exists before writing into it. Then (0y¹³⁸) for the clipper, if a plate of her furled is in reach. Else (0y¹⁴¹): store the r298 and r303 traces in the record and extend A-SHEER-TRACE to them.**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
