
**Live stamp VERIFIED: 1795534735 on https://augustg97.github.io/ships/index.html at 07:41:09 PST, about 2 minutes after the push. The published `js/hull.js`, `data/vessels.json` and `audit-hulls.js` are byte-identical to docs/.**

**THE FRAMES: ALL 65 SCORED.** Four capture runs at about 38 s a frame under load 2.5 to 8, scored with r277's offline scorer (`score-offline.out`, `score4.out`):

- `run1-current`: 11 frames, died at `ship-usv` beside the proofs.
- `run2-current`: 15 frames, died at `aboard-off`.
- `run3-current`: 14 frames, died at `ship-treasure`.
- `run4-current`: the last 28 frames, with Endurance's reachable frames and the four suspect frames first. It finished.

Each run died on the 150 s FRAME_READY wait. Each of those frames opened clean alone, and `page_errors.py` found no page error.

- `ship-endurance` 1.444% / 0.547: **predicted, ACCEPTED**. `pair-ship-endurance.png` shows the old baseline beside the new frame. The main's set sail and its boom are gone, the long gaff stands aloft over the funnel with the bundle along the mast, and the mizzen sail has a longer head with its throat lower.
- **Capture faults, each recaptured alone inside the gate:**
  - `globe-crossing` 9.825% and `globe-modern` 5.541%. The voyage positions moved (Sahul 11°S 128°E against 10°S 127°E, `pair-globe-crossing.png`) and the ocean texture changed. Recaptured: 0.000%.
  - `aboard-off` 47.611%. The container ship stood at another voyage position, the r304 flap again. Recaptured: inside the gate.
  - `ship-wyoming` 90.448% and `shipwright-ahead` 89.055%. Each frame caught the 1590 globe, not the Shipwright. Recaptured: 0.000%.
- The berth neighbours stayed inside the gate: `ship-yamato`, `ship-titanic`, `ship-container`, `ship-queen-mary-2` and `ship-azzam`.

**This round's lesson:** three audit proofs beside the first frames of a full ratchet killed it at frame 12. `r306_resume.py` captures only the frames that a dead run has not captured, into a directory of its own, and an optional `FIRST=` list sets which frames go first. Four short runs finished inside the round where a fresh full run would not have.
