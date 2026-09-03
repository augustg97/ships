# r205 close-ratchet predictions — written 20:42, before the run finishes

The round's app change is the cog aftcastle (hull.js castle block, vessels.json
castle record + two provenance texts) plus the handspike rest-angle fork under
a castle deck. Inherited from the 08:51 firing, verified this firing.

1. NO ship-* or action-* frame among the 64 names a cog — grep of frames.json
   for 'cog' returns empty — so every ship-* and action-* frame lands 0.000.
2. The cog renders on globe-era routes as a route model. If any globe frame
   shows a medieval route cog, its move stays UNDER tolerance (the castle is
   ~2 m of framework on a hull a few px long at globe scale).
3. Worst mover: globe-default at its documented capture flap, ~0.046%/0.011,
   the same figure as r202/r203/r204.
4. Zero accepts; FRAME-LOG untouched.

If any frame beyond these moves, STOP and attribute before accepting — the
r132 stash test if the diff cannot reach it.
