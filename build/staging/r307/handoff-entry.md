
## Round 307 — 2026-11-24 — Titanic's well-deck bulwarks have their wash ports: two in each well, cut where the 1911 side plan draws them. The forward pair stand open with two safety bars across each, and the after pair are closed by doors hinged at their heads, as Bob Read's study of her photographs describes. The capping over them is now 0.31 m deep, the thickness of the plan's line, where the class section had made it 0.72 m and would have covered the top of every port

**Queue check: August's second list stands worked in full (r57). This round took (0y¹³⁰), which r306 named next. `build/staging/r307` did not exist. The load was 4.3 at the start; `media-indexer` was at 97% CPU and nothing else was hot. r306's receipt left no unscored frames, so the opening ratchet was skipped.**

**WHAT WAS WRONG.** r303 built each well's side as shell carried up to the plan's bulwark line, as one solid sheet. The plan draws two rectangles hanging under that line in each well, which r303 recorded as unidentified. The model also capped each well with the class steel capping, `B × 0.0256` = 0.72 m deep on Titanic, which filled most of the 1.0 m forward bulwark.

**WHAT THE RECTANGLES ARE.** Bob Read, "Open Wash Ports of Titanic's Forward Well Deck" (rms-titanic.fr/otb/glossaire/titanic_open_wash_ports.pdf), read in this round:

- Olympic and Titanic had wash ports in the bulwarks of both well decks, to drain water off the deck in heavy weather.
- Olympic was built with doors on them in both wells, hinged to open outboard.
- During Titanic's fitting out the doors were removed from the forward well's ports. Her Southampton photographs show the white paint of the well through them. Each open port has two horizontal safety bars.
- The after well's ports kept their doors.

**THE READ (`r307_read.py`, `r307_rows.py`, `ports.json`, crops `forewell-4x.png`, `aftwell-4x.png`).** The plate is the same 1911 plan at 13.03 px/m. A port's ends are the columns where a dark edge runs down through rows 4 to 9 under the bulwark line. Its top is the underside of the line, and its bottom is the centre of its lower edge, each read over the tilted waterline at the port's middle column. Columns map to u linearly between the well's two ends, which r303 placed through the loft's deck line.

| Well | Columns | Length (m) | u | Opening top (m) | Opening bottom (m) | Deck there (m) |
|---|---|---|---|---|---|---|
| Forward | 3049.5–3099 | 3.80 | 0.1376–0.1523 | 11.63 | 10.70 | about 10.77 |
| Forward | 2963–3010 | 3.61 | 0.1640–0.1779 | 11.37 | 10.56 | about 10.61 |
| After | 658–705.5 | 3.65 | 0.8444–0.8576 | 11.25 | 10.40 | about 9.74 |
| After | 572.5–614.5 | 3.22 | 0.8697–0.8814 | 11.37 | 10.54 | about 9.78 |

- In the forward well each port's bottom stands within one pixel (0.08 m) of the deck, so those ports open to the deck.
- In the after well the bottoms stand 0.66 and 0.76 m over the recorded deck. r303 found the after well's C deck about 1 m lower than the forward well's while the bulwark line is only 0.1 to 0.5 m lower. The model cuts the after ports where the plan draws them and leaves the sill under them. See (0y¹³⁶) below.
- The plan's bulwark line is 4 px thick, 0.31 m, in both wells, and each port's top edge is drawn against its underside. The capping is the line, so it is no deeper than 0.31 m. This answers the depth half of (0y¹³¹).

**WHAT CHANGED.**

- RECORD (`vessels.json`, `r307_record.py`):
  - each of Titanic's two wells gains `ports`: u-span, `topM`, `bottomM`, the rows they were read from, and `doors` ('removed' forward, with `bars` at 0.33 and 0.67 of the opening; 'closed' aft);
  - each well gains `inboardCol`, the white of its inboard face;
  - `islands.portsProvenance` gives the read and Read's article, and says the bars' heights and the inboard colour are not read off a photograph and the port side is taken as the starboard side's mirror;
  - `hull.capM` 0.31 with `capProvenance`. The r303 `wellsProvenance` sentence that said the model drew no ports now points to the ports.
- BUILDER (`hull.js`, `r307_edits.py`):
  - the well bulwark is cut at each port. The opening runs from the read bottom, or the deck where that is higher, to the read top, or the capping's underside where that is lower. A port's two ends are stations half a millimetre apart, so the hole lands at its read length.
  - a well with `inboardCol` is built as two single-sided sheets on the same vertices: black wound outboard, white wound inboard. A pixel sees one of them, never both.
  - a new part, `washPort` ('Wash ports', stage 3), holds each closed port's door (a plate 35 mm proud of the shell, black outboard and white inboard, reaching 30 mm past the hole's top and bottom) with a hinge rod along its head, and each open port's two bars.
  - every hull without `islands.wells[].ports` and `capM` builds as before. On Titanic, `measure_ship` shows only the rail (bottom 10.57 → 10.98 m) and the two new parts moved (`ms-after.out` against `r303/ms-after.out`).
- CARD: the `washPort` part card says what a wash port is for and what the doors and bars do. `shipwright.js` names it 'wash ports' in Titanic's stage-3 card. No frame shows the stage-3 card.

**AUDIT.** New rule A-WASH-PORT, inside A-WELL-BULWARK:

- RECORD: a well with a `topRead` carries a `ports` array; silence is convicted, and an empty array is an answer. Each port lies inside its well, its `topM` and `bottomM` match its rows within 0.05 m, its doors are 'closed' or 'removed', and a removed port has its bars.
- THE HOLE: a horizontal ray from outboard, at the port's middle and the opening's mid-height, passes the bulwark sheets on both sides. The same ray between two ports, and between the well's forward end and its first port, meets the plating within 0.06 m of the shell.
- THE FITTINGS: a closed port has a door on each side that the ray meets 0 to 0.06 m outboard of the shell; an open port has its recorded number of bars, each inside the opening.
- THE CAPPING: no rail vertex over the port's span stands under the opening's top at its own station.
- **Audit fault found on the first run:** the capping test compared every rail vertex with the opening's top at the port's middle. The forward well's line falls 0.44 m along the well, so the rail at the port's after end came out 0.03 m under the top at the middle. It now compares each vertex with the top at its own station.

Final tree: 33 hulls, 0 problems.

__PROOFS__

**WITNESSED** with `profile_capture --ship titanic`, before on the :8150 copy carrying the pre-round `hull.js`, `shipwright.js` and record, after on :8149. Every changed pixel lies in the two wells.

- `pair-sb-well1.png` (the forward well, 3° starboard profile, 4x, before over after): the grey 0.72 m capping is a thin rail now, and the two ports show as openings to the deck, with the well's planking seen through them.
- `pair-sb-well2.png` (the after well): the capping is thinner. The closed doors are black on the black side and show only as a faint edge and the hinge line.
- `pair-q-a.png` and `pair-q-b.png` (the 300° quarter): the same openings forward; across each well the far bulwark's inside face is white paint in shade where it had been black.

**Rule 0, on `profile-after/quarter.png` read whole: a rendered liner on a lit, rippled sea, not a chart. Three facts a viewer can read off it without a legend: she has four buff funnels with black tops along a white superstructure; her forecastle and poop stand higher than the two wells between them and the house; the forward well's black side has two openings at deck level through which the well's planking shows.**

__FRAMES__

**WHAT IS STILL OPEN.**

- **(0y¹³⁰) is closed.**
- **(0y¹³¹), half closed:** the capping's depth is bounded by the plan's line at 0.31 m. Its profile (a rolled section or a teak rail on a steel bulb) is not read, and the model keeps the class box section scaled to that depth.
- **(0y¹³⁶), NEW: the after well's deck.** The plan draws the after well's wash ports 0.7 m over the recorded C deck there, while the forward well's ports open to the deck. Either the after well deck stands higher than the C deck line r299 read (a raised well deck or a step), or the after ports stand high. A side photograph of the after well, or the plan's own deck line in that well, would settle it.
- **(0y¹³⁷), NEW: the bars and the inboard white are not read.** The bars' heights are thirds of the opening, and the inboard colour comes from Read's words. A close photograph of the forward well (Read's Figure 4 or 5) would give both.
- **(0y¹³⁴), (0y¹³⁵), (0y¹²³), (0y¹²⁵), (0y⁹⁴)** and the named residuals (0y¹²⁴), (0y¹²⁰), (0y¹²¹), (0y¹²²), (0y¹¹³), (0y¹¹⁶), (0y¹¹⁷) stand as r294 to r306 list them. (0y¹²⁸)'s other half, the trireme's and the corbita's channels, is still a research question.

**r308 opens by checking `uptime` and `ps -r`, and checks whether `build/staging/r308` already exists before writing into it. Then (0y¹³⁴), Endurance's mizzen stowage. Else (0y¹³⁶).**

**Live stamp: docs/index.html carries data-version __STAMP__ at the build.**
