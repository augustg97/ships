
## Round 337 — 2026-11-26 — The fluyt's main wale now follows the seam Hollar's 1647 etching draws under her channels. Until this round both wales stood at a fixed fraction of the freeboard, so they rose aft in proportion to the rail. On the plate the planking rises aft about half as much as the rail. The new wale is level at 2.06 m over the waterline along the waist and rises 0.86 m to the mizzen's foot and 2.2 m to the tuck. This round also found that no wale on any timber hull reaches the screen: the strips face inward and are culled. So this change renders pixel-identical until r338 fixes that

**Queue check: August's second list stands worked in full (r57).** The disk had 1,645 MB free at 00:47, so the round ran (r335 and r336 had stopped at about 130 MB). It took (0y¹⁸⁰), the fluyt's quarterdeck. `build/staging/r337` did not exist. Load at the start was 3.3.

**WHAT (0y¹⁸⁰) TURNED INTO.** r334 proposed a `castles.aft` tier from u 0.58, with the hull's sheer re-read off a planking line. The plate does not support the tier.

- **The crew.** People stand at the rail all along the waist and the quarterdeck, and their heads clear it by about the same height everywhere: 14 rows (0.39 m) in the waist and 20 rows (0.55 m) at columns 1605–1660 by the taffrail. The rail the r334 trace follows therefore stands at about the same height over the deck along its whole length. The deck rises with it.
- **The mizzen's foot.** r329 read the mizzen's foot 1.8 m over the waist, and the model's deck stands at that height now.
- **The one real step** is the 0.44 m break at column 1215, which r334 already records.

A tier would leave the deck the crew stands on where it is, and it would add a lower deck under it that no plate shows. **(0y¹⁸⁰) is closed without a tier.**

The planking is a different matter. Below the rail, the seams rise much less than the rail does, and that the model did get wrong.

**THE PLATE** (`r337_seam.py`, `r337_seam2.py`, `seam-trace.json`, `crops/seam-whole.png`). Same plate as r328 to r334: Hollar, *Navis Mercatoria Hollandica, vulgo VLIET*, 1647 (`r328/dl/hollar-flute.jpg`, 1920 px, bow at the left, 36.09 px/m).

- **The seam.** In the waist, dark seams cross the side at rows 936–946, 961–967 and 985–991. The rail is at row 933. A darkest path, limited in slope, was traced from each of them (every 2 columns, the median of 7 columns, 3 grey levels of cost for a one-row move). Only the row-967 seam holds one line from the bow to the tuck. It runs just under the channels' deadeyes. The row-946 trace jumps lines at column 1500, and the row-991 trace stops being reliable at the stern port, column 1500 (`crops/seam-aft.png`).
- **The trace** runs from column 746 to 1690: 473 points, never more than one row per step. Forward of column 830 it passes through the bow's shading under the anchor, and abaft column 1600 through the stern's shading.
- **Mapping**: exactly as `sheerRead` (r334). The rail at the main's foot, row 933, is set to the record's freeboard of 3.0 m. Columns map to u through r329's frame.

| u | 0.10 | 0.3 | 0.5 | 0.7 | 0.85 (mizzen) | 0.95 | 1.0 |
|---|---|---|---|---|---|---|---|
| seam read, m over WL | 2.17 (held) | 2.09 | 2.10 | 2.39 | 2.92 | 3.78 | 4.27 (held) |
| rail (sheerRead), m | 3.67 | 3.06 | 3.00 | 3.90 | 4.80 | 5.94 | 6.62 |
| class upper wale before (0.368 of the sheer), m | 1.35 | 1.13 | 1.10 | 1.44 | 1.77 | 2.19 | 2.44 |

The band between the seam and the rail is 0.9 m deep at the main, 1.9 m at the mizzen and 2.2 m at u 0.95. The class wale scaled with the rail, so it put the wale a metre lower than the plate does and drew no widening band.

**WHAT CHANGED** (`r337_edit.py`, every replace asserted; staged on :8150 and copied into `web/` after the ratchet).

- **Record.** The fluyt's hull carries `waleRead`. It holds 21 stations at u 0.05 steps, plus `rows`, `datumRows`, `cols`, `depthM` (0.205 m, the class band's depth at this freeboard) and the raw `trace` with `maxStepRows` 1 and `stationWindowCols` 12. The provenance names the bounds:
  - At 36 px/m the plate does not resolve whether the line is a wale or the seam at a wale's edge, so the depth is the class figure.
  - Forward of column 830 and abaft column 1600 the trace runs through shading.
  - u 0 to 0.10 and u 1.0 hold the trace's end rows.
  - The lower wale is not read, because Hollar's waves cover it.
- **Builder.** `readWaleV(S, H)` turns the stations into v(u), the shell parameter at which the wale's centre stands. Above v 0.62, surfacePoint's height is linear in v: 0 at the waterline, the sheer at v 1. `buildWaleGeometry` takes the result as an optional fourth argument, and the upper class wale is drawn through it when the record has `waleRead`. That mesh carries `userData.waleRead`. Without the field, both wales are byte-identical to before.
- **Audit: A-WALE-READ.** Each station must match its plate row within 0.05 m. Trace steps may not exceed `maxStepRows`. Each station must lie within 2 px of the median of its trace points. Exactly one wale mesh must carry the read, and its port vertices within 0.25 m of each station from u 0.05 to 0.95 must average within 0.10 m of the read height. A `waleRead` missing any field is convicted.

**PROOFS** (:8150, `r337_proofs.sh`, `r337_proofs2.sh`; B and E were re-run on r240's 150 s runner after timing out at 60 s under load 15):

| Proof | What was broken | Problems found on the fluyt |
|---|---|---|
| B | builder ignores `waleRead` (class wale) | 1: 'a read wale not drawn' |
| E | builder lays the wale 0.3 m high | 19: 'a wale built off its read line' (u 0.05 to 0.95, about 0.3 m each) |
| C | one station's height moved 0.2 m, its row not | 1: 'a wale station off its plate read' |
| D | a 6-row step in the trace at column 1300 | 2: 'a wale trace that steps onto another line', 'a wale station off its own trace' |
| G | r336's audit with the class builder | 0, as expected: the old audit has no rule for the field |

Proof B also printed 35 lines on other hulls ('a stage card the audit cannot ask', 'shared polar model unreachable'). Those are the old r240 runner, which does not wait for the Shipwright's page globals; they are not hull faults. `audit-webb.out` (:8150, files identical to the tree by `cmp`): **0 problems on 33 hulls.**

**⚠ NO WALE IS ON SCREEN, ON ANY TIMBER HULL (0y¹⁸¹, NEW).** The before and after witnesses (`w-before-beam.png` and `w-after-beam.png`, `#v=ship&s=fluyt&b=90&l=8&z=1.0`) are **pixel-identical**. The page probe found both wale meshes in `SW.ship`, visible, with the read wale 2 cm outboard of the planking at 2.0–2.2 m (`r337_probe2.py`, `r337_probe3.py`). Three tests in the page showed why:

- With the wale material set to red, nothing changed (`c-exp-red.png`).
- With the planking hidden as well, there was still no wale (`c-exp-red-noplank.png`).
- With the material set to `DoubleSide`, both wales appeared (`c-exp-dbl.png`).

`buildWaleGeometry` winds both sides `(a, a+1, a+2)`: the lower vertex, then the upper, then the next station. That triangle's normal is −z, so the port strip faces inboard and FrontSide culls it from outside. The hull skin at line 1837 already reverses the order by side; the wale is the one strip that does not. The starboard beam (`w-after-stbd.png`, b=270) showed no wale either, and that is not yet explained. r338 checks both beams after the fix.

`c-exp-dbl.png` is the only frame that shows the new wale, so it is the witness for this round. **Rule 0, read whole:** a rendered ship on a rippled grey-blue sea, broadside, bow at the left; it is not a chart. Three facts a viewer can read off it:

1. The red band along her side (the test colour) runs level through the waist and rises gently toward the stern, far less steeply than the deck edge above it.
2. The band between that line and the rail is narrow amidships and deep at the stern.
3. A second band lies along the waterline and rises at the stern: the lower class wale, also culled until now.

**r338 opens with (0y¹⁸¹).** `build/staging/r337/r338_wale_winding.py <dir>` is written and asserted, and it has not been applied. It moves every frame that shows a timber hull's side, so r338 must run the full ratchet after it, accept the movers with reasons, and witness both beams. A rule for the class belongs in the audit: a strip's face normals should point away from the hull's centreline.

**THE FRAMES.**

- **This round's change:** pixel-identical by the witness above, because the wales are culled. No frame can move.
- **The backlog** (r334 scored only six frames): the opening run at the clean HEAD 8932fc0 (`run-open.sh`) died at frame 33. `ship-steamer` missed its 150 s readiness wait while this round's proof browsers ran at load 18. Its 32 frames are in `run1` and scored offline (`score-run1.out`): 24 inside the gate and 8 capture faults. `ship-canoe` and `ship-trireme` captured the globe, `descent-coast` an empty sea, and `ship-container`, `ship-great-eastern`, `ship-panokseon`, `aboard-coast` and `globe-era-card` moved 9–92% (`sheet-run1-movers.png`). A first resume died after 2 frames because it was launched without `disown`. The second (`run-resume.sh` into `run3`, at the same HEAD) recaptures the 8 faults and the 31 frames not reached. Its scores are below.

**THE FRAMES (at the push).** The change was copied into `web/` at 01:35:36 (`copy-time.txt`), while the backlog run was still capturing. Frames captured after that time show the r337 tree. For every hull this tree draws exactly what HEAD draws, because the only geometry it changes is a wale the renderer culls (see above). Scored so far: run1's 24 frames inside the gate. Of run1's 8 faults, `globe-era-card`, `ship-canoe`, `ship-great-eastern`, `ship-panokseon` and `ship-trireme` were recaptured alone in `run3a`. `ship-container` missed its 150 s readiness wait twice, the second time with no other browser running (load 4–8). That may be a page fault at HEAD and not contention; r338 runs a page-error check on `#v=ship&s=container` first. The remaining 33 frames are capturing into `run4`. All of them are scored in the receipt below, or listed there as not reached.

**First paint is 8.55 MB against a budget of 8.6** (the same as r334 at this rounding). About 0.05 MB of headroom is left for record strings that are not provenance.

**r338 opens by checking `df -m /System/Volumes/Data`, `uptime` and `ps -r`.** Then it takes (0y¹⁸¹), the wale winding, with a full ratchet. After that, (0y¹⁷⁹), the fore's station. Every other open item from r334's list stands as written there. **One browser at a time beside a capture run**: this round lost its opening run to its own proofs.

**Live stamp: docs/index.html carries data-version 1795685736 at the build.**
