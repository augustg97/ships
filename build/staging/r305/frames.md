**THE FRAMES: ALL 65 SCORED.** The full ratchet ran on the round's geometry at about 44 s a frame under load 5 to 10. It died at frame 57 (`action-myeongnyang`, the 150 s FRAME_READY wait). Its 56 captures were copied aside (`run1-current`) and scored with r277's offline scorer (`score-offline.out`). The last nine were checked one at a time (`chain.log`, `check-*.out`), and all nine were inside the gate, `action-myeongnyang` included. The tag rename and the card change went into web/ after the captures. Neither moves a pixel in any frame: a part's name is not drawn, and the frames show only stage 7's card. Seven frames were beyond the gate:

- `ship-wyoming` 0.218%, `ship-great-eastern` 0.161%, `ship-endurance` 0.086%: **predicted, ACCEPTED**. The new crosstrees and topmast shrouds; each was viewed beside the old baseline (`pair-ship-*.png`).
- `aboard-wyoming` 0.078%, `aboard-cable` 0.070% (Great Eastern laying cable): **predicted, ACCEPTED**. The same parts in the Sea view.
- `ship-container` 90.052%: **a capture fault**. The frame caught the globe, not the Shipwright (`pair-ship-container.png`). Recaptured alone, it scored 0.000%.
- `descent-coast` 21.0%: **a capture fault**. The coast's land tiles were missing (`pair-descent-coast.png`). Recaptured alone, it scored 0.016%.

`ship-steamer` and `aboard` (the steamer) stayed inside the gate. Her single gaff topmast's new rope is under the gate at those cameras.
