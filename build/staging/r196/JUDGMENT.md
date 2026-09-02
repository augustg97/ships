# Round 196 — the frame takes the plates' own proportions: two arms, half the splay

The r195 head residual: a proportion pass on Hong 2013's own drawings — 그림 16 (the
typology plates) and 그림 17 (the stone-stock schematic) — against the drawn splay
(TH 0.78) and arm count, plus the thesis's unmined experiment tables (표 8, 표 11).

## The measurements (rule 4 — measured, not judged)

Pages rendered at 300 DPI (pdftoppm), gridded, chords read tip-to-root:

- **Arm count**: every stock-anchor the study draws carries TWO arms — 그림 16 forms
  A–D (the captions count them: 닻가지 두 개 / 한 개+일체 V), the stone-stock
  schematic 그림 17, and all six artifact reconstructions on p.135. FOUR arms appear
  only in the stockless form E, whose modern analogue the study names in 그림 18 — a
  four-claw grapnel. The institute's own reconstruction figure (r194, re-read at
  grid): TWO limbs, one whipped crossing each, staggered. The drawn four came from
  the Standard Korean Dictionary's '보통 네 갈고리' — the same source class whose
  station gloss r195 killed V-CROSS over.
- **Splay**: six limb chords — 그림 16 (A) 22.0°/27.0°, (C) 18.9°/26.2° (frontal
  elevations; the left/right spread is the plates' slight oblique cast, the mean
  cancels it), institute figure ~18.9°/16.6° — mean 21.6° = **0.38 rad**. The drawn
  TH 0.78 (44.7°) was a drawn default at TWICE any plate.
- **Variant named, not drawn**: Hong's plates root the arms at the foot with carved
  points rising to the stock's height; the institute's figure crosses them whipped
  at 0.35 with points down and blunt ends bracing the stone. The drawn frame stays
  the institute's (the class's declared frame source, r194); the study's variant
  goes in the provenance.

## The thesis tables (표 8, 표 11 — mined)

- **표 8 (정박실험)**: off Taean, 5–20 m of water, 30 m of cable, three runs per
  rig. Stone athwart the shank's middle: anchored ALL THREE runs (33/62/78 m).
  Bare wooden anchor: failed all three (157–182 m). Stone at the head: failed all
  three. Stone on the cable: failed all three (dug and dragged). The drawn form is
  the only rig of four that held the boat.
- **표 11 (묶기 실험)**: perpendicular-to-shank rated stable both ways tried
  (shank bored; lashed to a stock); parallel unstable; the head rig floats the
  anchor so the arms cannot reach bottom; the cable rig easy and dig-helping —
  the thesis reads it as an AUXILIARY for strong current. And the trial's own
  sentence: the wooden stock did little beside the stone — r195's crossbar
  removal confirmed in the water.

## The class change (hull.js woodAnchor — class, not instance)

- `nArms` class default **2** (was 4); the record's `arms: 4` DROPPED (a drawn
  default by its own provenance's words — a real fetched count would outrank).
- `TH` **0.38 measured** (was 0.78 drawn).
- The two-hook form is one timber per whipped station (±SEP, the institute
  figure's stagger), splayed opposite in the stone's plane; a four-hook record
  still draws two perpendicular pairs. Whippings, pegs (two per crossing),
  spreader, BL derivation unchanged — BL adapts through cos(TH).
- Provenance rewritten; card row updated (four → two hook-arms; the sea-trial
  sentence added).

## Audit changes

- **V-ARMS default 2** (shared with the builder; the pre-r196 four convicts).
- **V-WSPLAY (new)**: each wa-arm axis vs the shank's axis, both through their own
  world matrices — the pair rides the same stow transforms, so the angle tests the
  frame, not the stow (the r195 movable-span lesson respected by construction).
  0.38 ± 0.12 (the band carries the plates' 17–27° spread). Convicts the pre-r196
  0.78.

## Predictions — written BEFORE the shadow runs

1. **Clean on :8151 shadow (staged hull.js + audit + vessels.json): 33 hulls, 0
   problems.** Both arms read 0.38 exactly (drawn from the same constant).
2. **inj-wa-arms** (perpendicular pair + tips added at the mirrored station, drawn
   at the NEW 0.38): exactly ONE — V-ARMS "4 hook points drawn — the form study's
   stock anchor carries 2". V-WSPLAY silent (injected at the class constant).
   V-WSTATION silent (stone unmoved; tips centroid still at the foot end). V-REST
   silent — the stone's rolled corner owns the assembly's floor at −1.04 m in the
   frame's own coordinates and no arm reaches it.
3. **inj-wa-splay** (both timbers + tips re-aimed to 0.78 about their crossings,
   lengths kept): exactly ONE — V-WSPLAY "an arm timber at 0.78 rad off the
   shank". V-ARMS silent (two cones). V-WSTATION silent. V-WSTOCK silent. V-REST
   silent, same reason as (2).

## Outcomes — :8151 shadow, staged class, before landing

1. Clean: **33/0** ✓ (prediction 1).
2. inj-wa-arms: **exactly ONE — V-ARMS "4 hook points drawn — the form study's
   stock anchor carries 2 (그림 16/17)"** ✓; V-WSPLAY, V-WSTATION, V-REST all
   silent as predicted.
3. inj-wa-splay: **exactly ONE — V-WSPLAY "an arm timber at 0.78 rad off the
   shank"** ✓ to the digit; V-ARMS, V-WSTATION, V-WSTOCK, V-REST silent as
   predicted. No honest seconds this round — the stone's rolled corner owning
   the rest floor was computed before the runs, not discovered by them.
