# Round 193 — the two ray-free rest rules take the surface-asked form (r187 residual 3)

## The defect, named by its own comment

The grapnel rule (r182) and the stone-anchor rule (r183) both SAY "asked of the
surface itself" in their headers, and both READ `hullSurface(H).sheer(u)` — the
sheer FUNCTION — in their code. The comment claims the ray; the arithmetic asks a
formula. This is the exact class CLAUDE.md warns on ("a comment can be right while
its arithmetic is the other sign"). r185 built the true form for the iron anchors
(ray straight down from over the assembly, first non-anchor hit is the surface it
must rest on, NONBEARING cordage vetoed), r186 and r187 reused it; r187 queued
these two stragglers as residual (3). The sheer function answers at every (u, z),
even where no ship exists — it is blind to an anchor hanging over the side, blind
to any raised stow, and can never say "nothing is under it".

## The change

1. `Research/audit-hulls.js` — grapnel V-REST and stoneAnchor V-REST rewritten to
   the r185 form verbatim (box over the assembly excluding cordage; ray from
   bb.max.y+0.5 straight down at the box centre; first hit not the anchor's own
   tag and not NONBEARING is the bearing surface; no hit convicts 'resting on
   nothing'; gap > +0.25 floats, gap < −0.20 stabs through).
2. The grapnel box now excludes `grap-coil` and `grap-cable` (the stone rule
   already excluded `st-cable`): cordage rests at its own stations by its own
   settle; the question is whether the IRON is seated. `hull.js` names the
   grapnel's cable `grap-cable` — it was the only anchor cable in the fleet
   without a name (st-/wa-/ia- all have one).
3. NONBEARING gains `'mast'`. Measured, not speculated: the pre-prediction probe
   (probe_rest.py, run on the staged rule before any audit) showed the dhow's
   raked foremast crossing the grapnel's rest-ray at y 3.2504 — 0.85 m over the
   deck hit at y 2.4022 — which would have convicted a seated anchor as
   stabbed-through 0.76 m. Same class as r187's forestay: a member crossing over
   the ray is not a surface. The probe convicted the draft before a live run
   (the r189 V-SWEEP-draft precedent).

## Probe-measured clean seats (shadow :8151, staged files)

- dhow grapnel: box min.y 2.4915, deck under the centre 2.4022 → gap **+0.089 m**
  (the rigid assembly touches at its forward end; the deck falls going aft under
  its centre — the +0.25 band is for exactly this slope).
- junk stone anchor: box min.y 3.7448, deck 3.7825 → gap **−0.038 m**.

## Predictions — written before running

1. **Clean audit (shadow :8151)**: 33 hulls, 0 problems.
2. **inj-gr-float** (tagged grapnel group y += 0.50): exactly ONE conviction —
   dhow, 'an anchor floating over its own deck',
   "lowest point 0.59 m above the surface under it at u 0.15" (0.089 + 0.50).
3. **inj-st-stab** (tagged stoneAnchor group y −= 0.50): exactly ONE — junk,
   'an anchor through the planking',
   "lowest point 0.54 m into the surface under it at u 0.03" (0.038 + 0.50).
4. **inj-gr-overside** (tagged grapnel group z += 6.0 — an `offZ` typo made
   flesh, the anchor hanging in air outboard of a 3.2 m half-beam):
   - staged audit (:8151): exactly ONE — dhow, 'an anchor resting on nothing',
     "no surface under the assembly at u 0.15".
   - the SAME injection against the r192 audit (:8149): **ZERO problems** — the
     pre-r193 sheer form provably cannot see it. This is the conviction of the
     old form, and the reason the residual existed.

The LOA rule measures planking only and the beam rules are gun-mount-specific,
so the z-move fires nothing else. V-SPAN and V-ARMS are translation-invariant.

## Frames

No pixel can move: audit-hulls.js is not loaded by the app, and the hull.js edit
sets a mesh `.name` only. Opening 64 expected 64/64, 0 movers; close solos
ship-dhow / ship-junk expected 0.000.
