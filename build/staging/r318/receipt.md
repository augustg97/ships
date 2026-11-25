
**Live stamp VERIFIED: 1795590459 on https://augustg97.github.io/ships/index.html at 23:09:39 PST, under two minutes after the push. The published `js/hull.js` carries `squareStackOf`, and the published `audit-hulls.js` carries A-MAST-HEIGHTS ('two yards on a pole too short for them'). First paint is 8.52 MB against the 8.6 MB budget.**

**THE FRAMES (receipt).** The full check died at frame 25 (`descent-high`) on the 150 s FRAME_READY wait, with no second browser running and the load at 2–8. Its 24 frames are in `run1-current`. `r318_resume.py` captured the rest in two more runs: `run2-current` died at `aboard-off` on the same wait, and `run3-current` captured from 23:35. All three are scored with r277's offline scorer (`score-run1.out`, `score-run2.out`, `score-run3.out`).

- **Predicted, ACCEPTED** (FRAME-LOG.md):
  - `ship-clipper` 11.814% / 4.139: her rig on the new stack, and her card's rig figure now reads the record's 44.5 m with no "derived" mark;
  - `aboard-clipper` 0.307% / 0.099: her rig at Sea distance;
  - `ship-great-eastern` 0.131% / 0.047: all of it at the left edge behind the card (x 0–94), where the clipper in the next berth shows.

  Recaptured after acceptance, `ship-clipper` and `aboard-clipper` score 0.000%.
- **`ship-treasure` 90.829%: capture fault, NOT accepted.** The captured frame shows the 1590 globe and not the Shipwright. That is the wrong-view race CLAUDE.md describes. This round does not touch the treasure ship (`pair-ship-treasure.png`). **r319: recapture it alone** with `check --frame ship-treasure`.
- **Inside the gate:** every other frame scored. This includes the predicted berth neighbours `ship-steamer`, `ship-preussen`, `ship-dreadnought`, `shipwright`, `shipwright-ahead`, `-astern`, `-furled` and `-hounds`, all at 0.000%, and r317's `sea-canoe-floor` at 0.010%.
- **UNSCORED, for r319:** `ship-slave-ship` and `ship-carrack`. The run was stopped at 23:53 to close the round. Both are berth neighbours of the East Indiaman, three berths or more from the clipper. **63 of 65 frames are scored.** Score the two with `r318_resume.py <dir> run1-current run2-current run3-current`, then with r277's scorer.

