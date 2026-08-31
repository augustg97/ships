# r170 — the maku valance: the judgment, made before the edit

The r168 sweep flagged 52 'Maku hem' meshes on the sekibune — flat half-discs,
CircleGeometry(0.24, 10, π, π), ≤12 tris each. The r168 residual predicted the judgment
would differ from the paddle-float's, because this is cloth. It does.

## What the plate attests (r119 crops, build/staging/r119/, read again this round)

1. **The scalloped border is FLAT cloth.** Like the float, the flat form is attested and
   no thickness or curvature is recorded, so none is owed. The sweep's "boxy" flag is not
   itself a conviction here.
2. **The border hangs at the HEAD of the band, not its foot.** atakebune.png (the best-
   resolved crop): both tiers hang the contrasting scallops from the rail/deck edge ABOVE,
   the plain cloth falling below them to the sheer. left-column.png middle hull: the small
   dark scallop row sits directly under the deck edge, the white band below. The record's
   own sentence — "white cloth … UNDER a dark scalloped hem" — already says this. The code
   hung the discs off the band's FOOT, over the rail: the documented class "a comment can
   be right while its arithmetic is the other sign."
3. **The scallops are CONTIGUOUS — tangent semicircles cut from one strip.** On every hull
   that resolves the border (atakebune.png both tiers, bottom-pair.png centre hull) the
   scallops touch, white cusps rising between them to the hanging line. The drawing spaced
   0.48 m discs on 0.7 m bays — 0.22 m of nothing between medallions.
4. **One strip of cloth is ONE piece.** The drawn row was 52 separate meshes, each floated
   +0.01 m proud of the band in a fixed ±z vertical plane, detached from the lofted
   surface it claims to border (the loft leans 0.10 m inboard head-to-hem and curves in
   plan at the ends; the discs did neither).

## What was measured on the drawn state (before)

- 52 'Maku hem' meshes; each CircleGeometry r=0.24, 10 segments, thetaStart π, length π
  (lower half-disc), positioned at y = railY(u)+0.15 (the hem line), z = ±(hw−lipIn−tuck+0.01),
  facing exactly ±z. Bays: round((0.9−0.1)·25/0.7) = 26 per side.
- Baseline frame ship-sekibune.png confirms: the dark bumps sit on the BOTTOM edge of the
  white band, just over the rail — the plate's arrangement inverted.
- r119's own measured note records "hem discs to 0.24 below the hem line."

## The change

- vessels.json: gunDeck.makuBayM = 0.7 (the scallop bay the r119 read already took off the
  plate at ~16 px/m, now a record field), makuProvenance and the card row updated to state
  placement (head) and contiguity (tangent), each with its plate and bound.
- hull.js buildPaddles→buildGunDeck maku branch: the band keeps its loft; the valance
  becomes ONE mesh per side lofted ON the band's own parametric surface — contiguous
  tangent semicircles (radius = bay/2), flat edge on the head line under the deck clamp,
  lying a finger's breadth (8 mm) proud along the outboard normal, the second cloth a real
  valance is. The 52-mesh class dies: 2 meshes, ~312 tris each, no longer in the sweep's
  boxy census.
- audit-hulls.js r170 rule + the r119 rule's comment corrected (it repeated the inversion:
  "the valance hangs BELOW the hem line").

## The r170 audit rule (arms)

Gated on gunDeck.maku; expectation from record + surfacePoint + the class constants
(lipIn B·0.010, tuck 0.10, clear 0.15), never the drawn meshes; vertices read in the
group's own frame (r169 lesson: no Box3 on anything).
- V-HEAD: the border's top edge lies on the head line (|maxY − headYm| ≤ 0.06) — convicts
  the foot-hung row.
- V-COVER: ≥97% of sampled head-line stations within 0.075 m of a border vertex — convicts
  medallions (spaced row covers ~90%).
- V-ONCLOTH: every border vertex within [−0.02, +0.06] of the record's own cloth surface.
- V-COUNTER, record-blind: no border vertex deeper than 0.75 m below the head, none below
  the band's mid-height — a valance nobody hung. Convicts the drag AND the old foot row.

Injections (in-page, no file touched): (a) builder severed back to the r119 foot-hung
spaced discs → expect conviction EXACTLY sekibune on V-HEAD (+V-COUNTER), 32 silent;
(b) record dragged makuBayM 0.7 → 2.4 under the faithful builder → V-HEAD/COVER follow the
record, only V-COUNTER convicts ("a scallop 1.20 m deep").
