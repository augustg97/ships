- Run 1, the harness's own check, started at 12:15 on web/ carrying the new record and the r309 card and builder comment. It died at frame 16 (`ship-galleass`) on the 150 s FRAME_READY wait while the proofs ran a second browser beside it. Its 15 frames are scored offline in `score1.out`:
  - 13 inside the gate;
  - `globe-steam` at 9.884%, the capture fault r309 saw while a second browser ran;
  - `ship-usv` at 91.107%: the frame captured the globe, because the Shipwright view never opened under load.
  - Both are recaptured alone in the receipt.
- `run-resume.sh` chains `r310_resume.py` runs until every frame is in.
- At 12:46 the card, the audit and the builder comment went into web/ by atomic rename, between captures. The frames after that point carry the final tree.
- Predicted movers: `shipwright-furled` alone, by the card's new clause, since it is the only frame with a furled card on screen. Nothing else, because no geometry changed.

**The frames are being captured beside this close. Every one is scored and classified in the receipt that follows.**
