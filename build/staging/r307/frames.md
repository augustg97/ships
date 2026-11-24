**THE FRAMES.** The full check died at frame 27 (`aboard`, the 150 s FRAME_READY wait); `aboard` opens clean alone (`page_errors.py`). Its 26 captures were copied aside (`run1-current`) and the rest are captured by `r307_resume.py` (r306's resume script) in short runs: run 2 died at `ship-wyoming` after 14 frames, run 3 at `ship-treasure` after 2. The load was 2 to 14. Scored so far with r277's offline scorer (`score1.out`, `score2.out`, `score3.out`), 42 of 65 frames:

- `ship-titanic` 0.058% / 0.033: **predicted, ACCEPTED**. `pair-ship-titanic-fwd.png` and `pair-ship-titanic-aft.png` (baseline over the new frame, 3x) show the only changes: the forward well's two open ports with the deck seen through them, and the far bulwark's inside face white in shade where it had been black. Recaptured in run 2: 0.000% against the accepted baseline.
- `shipwright` 89.055%: **capture fault**. The frame caught the 1590 globe, not the Shipwright (`shipwright-run1-small.png`), as `ship-wyoming` and `shipwright-ahead` did in r306. Recaptured alone in the receipt.
- `aboard-titanic` 0.017%: inside the gate. The wells are too small at that distance to move a frame.
- Every other scored frame is inside the gate.

**The last 23 frames are being captured beside this close (run 4); every one is scored and classified in the receipt that follows.**
