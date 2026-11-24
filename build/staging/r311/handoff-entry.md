
## Round 311 — 2026-11-24 — The four plate reads behind Titanic's island tops and well bulwark tops now carry their raw traces in the record, and the audit checks each trace for a jump to another line and each fit against its trace. One jump was found: at the after well's forward end, where the bulwark's heavy line on the 1911 plan ends at the house, r303's trace stepped 3 rows down onto the house's own line for its last three points. Both wells are refitted on the columns where the line is whole, and each end's bulwark top moves by 0.01 m or less

**Queue check: August's second list stands worked in full (r57). This round took (0y¹⁴¹), which r310 named first. `build/staging/r311` did not exist. The load was 2.5 at the start and no process was hot. r310's receipt left no unscored frames, so no clean-HEAD run was made; the capture ran on web/ from 13:31 and the final record went in at 13:46:54 by atomic rename, between captures.**

**WHAT (0y¹⁴¹) ASKED.** r309 found that r299's deck-line trace had stepped onto another line, and added A-SHEER-TRACE for `sheerRead`. Three other reads off the same plan were fitted over a run of columns: the forecastle and poop tops (r298) and the two wells' bulwark tops (r303). The record kept only each fit's two end rows, so a jump in them could not be checked.

**THE RE-RUN (`r311_retrace.py`).** Both reads were re-run exactly as written, keeping every column. For each, the script measured the largest step between neighbouring kept points, the largest residual from the fit, and whether every pair of neighbours is joined by dark pixels on the plate.

| Read | Method | Points kept | Largest step | Largest residual | Finding |
|---|---|---|---|---|---|
| Forecastle top (r298) | bottom of the open-rail band, each column read on its own | 120 of 121 | 1.0 row | 0.67 px | clean; the one rejected point (column 3163, 25 rows high) was already excluded by the fit |
| Poop top (r298) | the same | 105 of 105 | 1.0 row | 0.70 px | clean |
| Forward well top (r303) | centre of the heavy line, each point within 4 rows of the last | 53 | 1.0 row | 1.53 px | column 2932: the line thins from 4 rows to 2 where it meets the house |
| After well top (r303) | the same | 66 | **3.0 rows** | 1.83 px | columns 754 to 760: the heavy line (rows 691–695) ends at column 755, and the trace stepped onto the house's 2-row line (rows 694–695) |

r298's read cannot jump in the way r299's did, because it reads each column independently; it can only pick the wrong dark band in one column, and its outlier fit rejects that. r303's trace follows the line from point to point, which is the method that failed in r299.

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r311_record.py`):
  - each island's `topRead.trace`: `fromCol`, `stepCol`, the raw `rows` (null where the fit rejected a point), `maxStepRows` 1.5, and the fit's coefficients;
  - each well's `topRead.trace`: the same, with the line's thickness at every point. The points where the line is under 3 rows thick (the band's median less one) are null: column 2932 forward, columns 754, 757 and 760 aft;
  - both wells refitted on the kept points. Forward well: rms 0.32 → 0.24 px, top 11.84 / 11.40 → 11.84 / 11.39 m. After well: rms 0.35 → 0.19 px, top 11.29 / 11.58 → 11.30 / 11.57 m. `colRange`, `n` and the end rows follow;
  - `wellsProvenance` quotes the new heights and says what r311 found and dropped.
- BUILDER: no change. `hull.js` builds the wells' bulwarks from `topM`.
- First paint grows by about 4 KB (minified).

**AUDIT.** New rule A-PLATE-TRACE, one helper called by A-ISLAND-TOP-READ and A-WELL-BULWARK. Any plate read that carries `colRange` (a fit over a run of columns) must carry `trace {fromCol, stepCol, rows, maxStepRows, fit}`. Then:

1. no step between neighbouring kept points exceeds `maxStepRows` per `stepCol`;
2. every kept point stands within 2 px of the fit;
3. the recorded end rows are the fit's rows at the read's end columns, within 0.15 px;
4. the kept points span exactly `colRange`, and their rms about the fit equals `rmsPx` within 0.05 px.

SILENCE: a read with `colRange` and no trace is convicted.

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED.** `#v=ship&s=titanic&b=140&l=22&z=0.8` (r309's camera, high on her starboard quarter), before on the :8150 copy carrying the r310 record and after carrying the new one (`wit-before-q.png`, `wit-after-q.png`). 230 of 5.18 million pixels changed (0.0044%), all along the capping of the two wells: about 160 over the after well and 50 over the forward well. `pair-q-wells-4x.png` (before over after, 4x about the after well) shows no visible difference, because 0.01 m is under a pixel at this distance.

**Rule 0, on `wit-after-small.png` read whole: a rendered liner on a rippled sea, seen from high on her starboard quarter, not a chart. Three facts a viewer can read off it without a legend: she has four buff funnels with black tops on a long boat deck lined with lifeboat davits; her hull is black with rows of portholes under a white superstructure; the poop at her stern stands a deck higher than the after well in front of it.**

**THE FRAMES.** Predicted: no frame beyond the gate. The witness changed 0.0044% of its pixels, and the gate is 0.05%. `ship-titanic` and `aboard-titanic` are the only frames that show Titanic.

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹⁴¹) is closed for Titanic.** Every fitted read on her (the sheer, two island tops, two well tops) carries its trace, and A-SHEER-TRACE and A-PLATE-TRACE check them. Her point reads (the masts' trucks, the crow's nest, the funnel tops, the wash ports) are single-column measurements with no trace to store.
- **(0y¹⁴²), NEW: Preussen's island reads.** r292 read her three islands as the median row of a 15-column median-filtered top edge over each span. A median can absorb a jump that covers less than half its span, so these reads cannot fail the way r299's did, but they carry no `colRange`, and A-PLATE-TRACE does not see them. Storing the per-column top edge (`r292/topedge.npy`) over each span would let the audit check that the median stands on one line.
- **(0y¹³⁸)** stays open for the 74, Great Eastern, Preussen, Wyoming and the steamer, as r310 wrote it.
- **(0y¹⁴⁰), (0y¹³⁹), (0y¹³⁷), (0y¹³¹)'s profile half, (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r310 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r312 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r312` already exists before writing into it. Then (0y¹³⁸) for the 74, if a plate of a working 74 at anchor is in reach. Else (0y¹⁴²).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
