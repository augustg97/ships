# r171 — the stern lights: judgment BEFORE the edit

## The accused

The sweep's next boxy class: `sternlight`, 57 twelve-triangle boxes across the three
`sternLights` hulls — ship-of-the-line 21, east-indiaman 24, fluyt 12. Drawn per window:
a solid pale slab (the "frame"), a slightly smaller glass slab 1.5 cm PROUD of it, one
vertical mullion stick proud of the glass. Windows at 64% of pitch — 36% of the tier is
blank wall between lights. (hull.js buildStern, the `sternlight` block.)

## The judgment

**The boxy flag alone convicts nothing.** A sash light IS flat glazing in a flat frame —
the flat form is attested by the plate itself, as the container's box and the paddle's
board were. What convicts the drawn row is the plate, three ways:

The plate: **SLR0338**, the RMG contemporary full-hull model of *Bellona* (1760) — a
Slade 74, the record's own sub-type ("third rate, 74 guns"; the record's rows name
Slade's British 74s). Two photographs fetched this round into build/staging/r171/:
`bellona-stern-c1099.jpg` (dead astern, 1041×1280) and `bellona-stern-d7827.jpg`
(quarter, colour, 1280×1020). Scale of the astern plate at the lower tier: five clean
pitches span 335 px (pilaster centres 413→748 by column-brightness profile) and the
~9.2 m stern flat spans ~510 px — **~55 px/m**, so pane COUNTS are solid, widths good to
roughly ±15%, and a 5 cm glazing bar is a 2–4 px line, which is exactly what the profile
finds between the pilasters.

1. **The glass floats OUTSIDE its own frame.** Drawn: frame slab outer face at
   xF + 0.012·B, glass outer face at xF + 0.013·B, mullion outer face beyond that —
   glazing and bar each stand proud of the frame that is supposed to hold them. A sash
   holds its panes in a rebate BEHIND its bars; the colour plate resolves the mica
   panes recessed behind the gilt glazing bars on every light of both tiers. The
   documented class again: a comment saying "framed" while the arithmetic stacks the
   layers the other way.

2. **Two panes where the plate shows nine.** The drawn light is one 0.9 m glass sheet
   with a single vertical stick — 2×1 panes. The astern plate resolves each light in
   BOTH tiers as a 3×3 grid (two vertical, two horizontal bars — the 2–4 px bright
   slivers inside every light of the brightness profile), and the technology says so
   independently of the plate: crown glass could not cast a 0.9 m pane, which is why
   every period light is a grid of small panes.

3. **A third of the stern drawn as blank wall.** Drawn light = 64% of pitch. Measured:
   pier assembly (stile + pilaster + stile) 17 px of a 66–71 px pitch — glazing fills
   **74–80%** of the tier, pilaster to pilaster, across the whole face.

## The change

One pierced sash-wall per tier per side of the record: a THREE.Shape spanning the tier
band, with one rectangular hole per PANE — N lights × (recorded pane grid), lights at
(1 − recorded pierFrac) of pitch — extruded to frame depth. The material left between
hole groups IS the pilaster; between panes IS the glazing bar; no aperture is a slab.
ONE glass sheet per tier sits behind the frame face, inside the frame depth. Meshes per
tier: 2 (was ~30–36 boxes). The 57-box class dies; the surviving boxy remainder is the
glass sheets themselves — flat glass, attested.

Record fields promoted (per sternLights ship): `sternLightPanes` [cols, rows] and
`sternLightPierFrac`, with provenance. Ship-of-the-line: [3,3] / 0.26 — a PLATE READ
(SLR0338, ~55 px/m, bounds above). East-indiaman and fluyt: [3,3] / 0.26 — CLASS
DEFAULTS, named as such: the small-pane grid is the period's glazing technology and the
one plate in hand is English; Dutch practice (leaded lights) ran smaller panes if
anything, so the count is a floor, not a read of those hulls.

## The rule (four arms, hull frame, geometry parameters — no Box3, the r169 lesson)

Gated on `sternLights > 0`. Per tier, find the pierced frame and its glass:

- **V-PIERCED** — a glazed tier must have real apertures: ≥ 1 sternlight mesh per ship
  is an extrusion whose shape carries ≥ 6 holes. A tier of solid slabs convicts.
- **V-GRID** (record arm) — holes = N · cols · rows exactly, for an integer N ≥ 3 of
  lights, cols·rows from the record.
- **V-BEHIND** — the glass sheet's outermost x at least 5 mm INBOARD of the frame's
  outermost x: glazing behind its bars. The old code fails this by +1.5 cm of proud.
- **V-COUNTER** (record-blind) — no aperture wider or taller than 0.45 m: a pane
  nobody could cast. Under a dragged record ([3,3] → [1,1]) the faithful builder cuts
  a ~0.75–0.9 m hole and only this arm convicts.

## Predictions (simulation first, then in-page injection)

Proven in sim.py on the three ships' real surface numbers (stern-dims.json, dumped
from the r170 page) BEFORE any web/ edit — 0 failures:

- Faithful: all arms silent; 74 draws 4/5 lights per tier at 1.20 m pitch (the
  plate's own), panes 0.27×0.24 m; glass 0.14 m behind the bar face.
- Severed builder (old 3-slab row restored): V-PIERCED convicts per tier — 5 problems
  on exactly the three sternLights hulls (fluyt 1, indiaman 2, 74 2), 30 silent. The
  sim also confirms the judgment's arithmetic: the old glass face stands proud of its
  own frame slab on every ship (74 by 15 mm).
- Record dragged, ship-of-the-line panes [3,3] → [1,1], faithful builder: V-PIERCED,
  V-GRID, V-BEHIND follow the record and stay silent; only record-blind V-COUNTER
  convicts ("an aperture 0.89 × 0.81 m — a pane nobody could cast"), exactly
  ship-of-the-line, both tiers.
