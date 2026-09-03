# r206 close-ratchet predictions — written before the run finishes

The round's whole app change is data text on the panokseon card: one new row
(Hull record, 1795), an appended clause on the Oars row, a new hull-level
jeonseoProvenance string, one sentence appended to anchorProvenance, one
clause on cite. No shader, no geometry, no code path touched.

1. **ship-panokseon** — MOVES if the Shipwright card panel renders the rows
   region in-frame (the new row sits at index 4, high in the list); within
   tolerance if the panel crops above it. If it moves: accept, reason "new
   1795 전서 도설 row and oar warrant on the card, mined this round".
2. **globe-default** — the documented capture flap, ≤0.046% / 0.011, within
   tolerance (same figure five rounds running).
3. **Every other frame** — within tolerance. No geometry moved; no other
   vessel's card text changed; era cards untouched. Any OTHER frame beyond
   tolerance is unexplained by this diff and gets the stash-and-rerun test
   before any accept.
