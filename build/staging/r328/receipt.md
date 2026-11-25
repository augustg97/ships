
**THE FRAMES (receipt): ALL 65 SCORED, NONE ACCEPTED.**

- **The full check** was launched at 11:07:25 and captured 45 frames. It died at frame 46, `shipwright-ahead`, on the 150 s ready wait (11:37). The 45 were kept (`run1/`, `score-run1.out`).
- **The other 20** were captured one process per frame with no failure (`r328_resume.sh`, `resume.out`, `run2/`, `score-run2.out`). Every frame was scored with r277's offline scorer.
- **Predicted, and did not move:** `ship-sekibune` 0.000%, `ship-panokseon` 0.006%, `ship-galleass` 0.022%, `ship-slave-ship` 0.000%, `globe-default` 0.010%. The mizzen is at the fluyt's stern, and her topmast stands under her main truck, so nothing new reaches into the neighbours' frames. `ship-carrack` was predicted not to move and stood at 0.000%.
- **Capture faults, inside the gate alone:**
  - `globe-era-card`, 9.164% / 1.879 in the full run (the whole globe's terrain and coast edges, at 2000 BC, with no ship drawn), 0.041% / 0.013 alone (`run2/`).
  - `aboard-cable`, 10.531% / 2.507 in the full run (the whole sea surface and the wake, Great Eastern in place; she carries no lateen), 0.000% / 0.000 alone (`run3/`, `score-run3.out`).
  - `pair-era-card.png` and `pair-aboard-cable.png` show the full-run captures.
- **Inside the gate:** the other 58.
- **No baselines moved. No frames are left unscored for r329.**

**Live stamp VERIFIED: 1795633693 on https://augustg97.github.io/ships/index.html at 11:17 PST. The published hull.js carries `lateenTopmast`.**
