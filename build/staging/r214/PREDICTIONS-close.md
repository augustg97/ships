# r214 close-ratchet predictions (written 16:50, before the run finished)

The change touches ONE hull's geometry: the cog (castle rebuilt from the plan, transom 0,
windlass/capstan/tiller stations moved). The cog has no frame of her own (r173). She is a
berth neighbour in the Sea frames near ship-dhow / ship-treasure / aboard-treasure (r212:
0.000–0.002%). Predicted movers: NONE beyond tolerance; ship-dhow / ship-treasure /
aboard-treasure at ≤ 0.01% if the cog is in shot at all. The 13 timber-rudder hulls are
untouched by this round's hull.js edits (the castleGeom branch is null for all but the cog;
the rudder's yTiller path only differs when castleGeom returns non-null). globe-default at
its documented flap (~0.046%). Residual 0 (r213's two text-strip movers) reproduced at
0.000% on the clean HEAD this round (build/staging/r214/r0-check.out) — a one-off capture
flap, no reason beyond that can be written.
