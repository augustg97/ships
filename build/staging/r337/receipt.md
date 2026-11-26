

**THE FRAMES (receipt).** 65 frames in the manifest. Each frame's last capture is scored offline against its baseline with frame_baseline's own compare(): run1 (the opening run at 8932fc0) for the frames inside the gate, run2/run3a for the 7 recaptures, run4/run5 for the rest (one process per frame, `run-each.sh`; frames captured after 01:35:36 show the r337 tree, which draws what 8932fc0 draws).
- **Inside the gate: 50.**
- **Beyond the gate: 2**: `aboard-treasure` 39.517% / 14.812 (score-run45.out), `aboard-wyoming` 23.322% / 8.176 (score-run45.out)
- **Not captured this round: 13**: `action-salamis`, `board-salamis`, `action-gravelines`, `action-lepanto`, `action-myeongnyang`, `wake-plan`, `ship-ever-given`, `sea-ever-given`, `passage-sahul`, `sea-dugout-floor`, `sea-canoe-floor`, `ship-slave-ship`, `ship-carrack`
- Per-frame capture failures (150 s readiness timeouts): 0.
- **Correction to the entry above:** the first resume did not die for lack of `disown`. It kept running beside the second, because a `pgrep | head -5` listing was filled by Chrome processes and hid it, and it ended at a 150 s timeout on `aboard-carrier`. Three later timeouts on Sea frames came at load 3 to 5 with nothing else running, which is why the rest were captured one process per frame.
No baseline was accepted this round.
