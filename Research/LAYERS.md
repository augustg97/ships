# The three layers on The Sea, rebuilt  (2026-08-04)

## "What lives in the water" was a dead switch, and it was measurable

Toggling it over the mid-Pacific moved **0.16 % of pixels by a mean of 0.008 of a level**. Two
faults, and the ramp was only the first:

1. The rebuilt ramp put open-ocean water — ~0.04 mg/m³, which is most of the ocean and therefore
   most of the frame — at **0.12**, while the layer's OFF value was a flat **0.16**. The two had
   been tuned to the same number, so across the gyres the toggle was a no-op **by construction**.
2. The colour endpoints were a quarter of the distance apart they should be. Real ocean colour is
   not subtle: an oligotrophic gyre is the deepest blue on the planet and a coastal bloom is
   opaque green. Painting that is not a false-colour ramp — it is the colour the water is.

Chlorophyll now also drives **transmission and scattering**, because productive water is turbid:
a bloom reads as milky, not merely green.

Measured over the Benguela, water pixels only: **11.6 % move, 3.8 % move strongly.** The
upwelling ribbon along the Namibian coast is now legible against the South Atlantic — which is
the richest fishery on that coast, and the reason fleets went there.

## Cloud was a texture printed on the map

One octave of noise × the cover field, mixed toward flat grey. No light in it, cast nothing, sat
on the ground, and drifted due east regardless of the wind. Four fixes, each doing one job:

1. **Parallax.** The deck is ~8 km up — a tenth of a per cent of the radius, which sounds
   negligible and is the strongest cue in the frame. Toward the limb clouds visibly **overhang
   the edge of the planet** and slide against the sea beneath them.
2. **The wind carries them.** u and v are already in the field; advecting along them makes the
   Southern Ocean stream east and the doldrums sit still, with none of that drawn.
3. **Two scales.** Weather systems are hundreds of kilometres; the cells inside them are tens.
   One octave gives cotton wool.
4. **They cast a shadow**, offset toward the anti-solar side. Without it the deck floats free.

⚠ **Accurate cover is not the same as useful cover.** July really is 60–70 % cloud over the North
Atlantic, and at full opacity it hid the ocean this view exists to show. Thin cloud now stays
thin; the overcast is still overcast.

## Wind: subtler and more clearly wind are not opposites

What made the old field read as noise was not that it was too strong but that it was too
**round**. At 6.8 : 1 the streaks were short enough to look like static, so the only way to see
them was to raise the contrast — which made them look like static more loudly.

The eye reads wind from **elongation**, not contrast. At 19 : 1 the streaks are unmistakably
combed and the amplitude comes down by a third. The second octave now crosses the first at a
shallow angle, because a real surface carries the streaks of the moment over the older ones.

---

# Sub-texel ground: what "increase the global resolution" actually means  (2026-08-04)

August asked to *"increase the global resolution as needed."* Taken literally it cannot be done,
and saying so is part of the answer.

## No raster this project can ship closes the gap

| | metres per sample |
|---|---|
| level 0 (loaded to CPU, drives routing) | 19,500 |
| level 2 (bound to the shader) | 4,900 |
| level 3 (on disk, 262 MB, not loaded) | 2,400 |
| **one pixel at 1 km altitude** | **0.75** |

Three thousand pixels inside one sample of the finest tile set in the project. The resolution
needed is four decades away. Loading level 3 would cost 262 MB and still leave the shoreline a
smooth interpolated curve.

## So it is generated, the way the water already is

Detail below the grid, at a frequency the frame can resolve. **This is not decoration over the
data — it is a truer statement than the smooth curve.** A real coastline is fractal at every
scale; a smooth one is a claim about the raster, not about the coast.

Two rules keep it honest:

- **Zero at globe zoom**, hard-gated on how many pixels a texel spans. Measured: 0.01 % of pixels
  at 300 km, and all four globe baselines unmoved to the pixel.
- **Amplitude from the data's own VERTICAL variation** — the real difference between neighbouring
  samples — not from the texel's horizontal size. The first version used `texelM` and put 157 m
  of noise into 70 m of water: the English Channel came out as an archipelago of invented
  islands, which is a far worse lie than a smooth coast.

Measured over the Norwegian fjords: 0.01 % changed at 300 km, **8.7 % at 30 km**, 5.8 % at 9 km.
Fires where the raster runs out, nowhere else.

## ⚠ And the shading perturbation is deliberately NOT shipped

Three attempts, all discarded, recorded because the negative result is the useful part:

1. **metres-per-metre against a gradient measured in metres-per-two-texels** — a ratio added to a
   difference. Contributed 0.07 % of the normal and did nothing.
2. **converted correctly into gradient units** — sub-texel slope came out three times the
   texel-scale slope, which is *true* of fractal terrain, and Norway rendered as bubble wrap.
   Smooth value noise has no ridges in it, and at full strength you see the noise.
3. **capped at 22 % of the local gradient** — stopped dominating, started showing its own
   LATTICE: square patches at the noise grid. A different artefact, not a smaller one.

Ridged, domain-warped noise would do it. That is a real piece of work rather than a constant to
retune, and shipping a worse artefact in the meantime helps nobody. The ELEVATION perturbation
stays, because it earns its place: it gives the shoreline its heads and inlets, which is what
actually reads as low-resolution from a few kilometres up.
