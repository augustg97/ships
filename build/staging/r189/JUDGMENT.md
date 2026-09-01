# r189 — the four-claw anchor takes the find's own part proportions

## The task

The r188 queue head, named in that round's own provenance and residual list:
"fig. 3a self-scales (全長 2.15 m in its own caption) — a part-proportion pass
could replace the claw-sweep woodcut default; plate and px/m to be named per the
Azzam rule."

## The plate and its scale

Matsui 2013 (金沢大学考古学紀要 34, local since r187), fig. 3a — the complete
Penglai 1984 find, caption 全長 2.15 m, 456 kg. Rendered from PDF p. 14 (paper
p. 39) at 300 DPI; the anchor's drawn overall height is 694 px, crown bottom to
ring top 659 px, so the crown-to-ring basis the record fields carry reads at
**322.8 px/m — 3.1 mm per pixel**. The plate is 王冠倬 2000's published line
drawing of a corroded excavated object, re-printed by Matsui: the pixel scale is
millimetric but the drawing's own draughting is the true precision bound.

## The measurement (measure_fig3a.py, trace_claws.py, verified on the annotated overlay)

The drawing is an oblique of four claws at 90°. The pair drawn widest is read as
in-plane; the two sides disagree by the obliquity and their spread is the named
bound.

- Tips: left (56,536), right (503,563) → reach 0.325/0.354 of 全長, height above
  the crown centre 0.222/0.181. **Means: reach 0.339, height 0.201.**
- Claw path (binned medians of both mirrored traces, model frame, fractions of
  全長): springs at the shank foot ~+0.05, near-flat to r 0.14, rises through
  (0.26, +0.135) to the point — root run ~6–10° above horizontal, tip section
  ~40°. The woodcut default drew the root at 22° and the tip at 68° — the drawn
  claws curled up like a bud where the find's sweep is a flat spider.
- Arm sections taper 0.024 → 0.015 → 0.012 → 0.009 of 全長 (run thickness,
  cos-corrected) — about half the drawn 0.038.
- Head: outer width 41 px = **0.062 of 全長** — a small forged eye. The drawn
  torus was 0.155 wide, 2.6× the plate.
- Crown lump width 56 px = 0.085 — the drawn ball (0.078) is consistent; its
  bottom sits 27 px = 0.041 below the claw joins.
- Shank widths 27–41 px = 0.041–0.062 with corrosion lumps — the drawn taper
  (0.039–0.051) is consistent within the crust; left alone.
- The two foreshortened claws droop below the crown in the drawing (34 px);
  read as projection of the toward-viewer pair, not real geometry — the in-plane
  pair never drops below the crown centre. So the find's 全長 ≈ crown bottom to
  ring top within the drawing's own obliquity (694 vs 659 px, 5%), and the r188
  field convention stands.

## The class change

- makeAnchor: claw drawn as the measured polyline — three cylinder sections
  between the plate's stations (0,0.035) → (0.14,0.060) → (0.26,0.135) →
  (0.315,0.180), cone to the measured point (0.339,0.201), radii from the
  measured taper. Head eye at the measured 0.062 (torus R 0.0216, tube 0.0095);
  the shank lengthens to meet it (0.908 of 全長) and the ring top now lands at
  1 − crownR so that **crown bottom to ring top = the field exactly**. clawFrac
  retired from the signature and the record — the proportions are class
  constants measured from the calibrator, not a knob.
- V-LEN: the crown joins the projection — the rule now measures crown bottom to
  ring top, exactly the span a find's 全長 measures, and the builder guarantee
  is exact rather than 4% shy.
- V-SWEEP (new rule, the round's new fault class): per anchor, tip-cone apexes'
  radial distance from the shank's own world axis, sorted, against 0.339 of the
  record's lengths, 12% band. An anchor with no tips is V-CLAWS's conviction and
  V-SWEEP passes over it, so the sever proof still convicts exactly once.

## Proofs planned (results appended below after the run)

- drag (r188's, re-run): sheet shank stretched 1.35× → exactly one V-LEN
  conviction (~2.28 m against 1.86 — the scaled shank's own span). V-SWEEP
  silent: the claws are not children of the shank mesh.
- sever (r188's, re-run): one anchor's tips stripped → exactly one V-CLAWS
  conviction (16 points for 5 anchors); V-LEN and V-SWEEP silent.
- sweep (new): one anchor's tip cones displaced radially 1.3× → exactly one
  V-SWEEP conviction; V-CLAWS, V-LEN, V-REST silent.

## Results (all on final code)

- Audit clean: 33 hulls, 0 problems (audit-run2.json).
- drag → exactly ONE: V-LEN "crown to ring head 2.28 m … the record's full
  length is 1.86" — the predicted 1.23×. V-SWEEP silent.
- sever, FIRST RUN CONVICTED THE ROUND'S OWN DRAFT RULE: V-CLAWS fired
  correctly, but V-SWEEP also convicted an innocent bower at 0.53 vs 0.63 —
  sorting sweeps separately from lengths slid the four survivors against the
  record's 1.86 slot. Rewritten: {len, sweep} measured on one pass per anchor,
  sorted together by length, each sweep compared in its own record slot
  (inj-claws2.err is the conviction, inj-claws3.json the fixed exactly-one).
- sever (fixed rule) → exactly ONE: V-CLAWS "16 claw points drawn for 5
  anchors". V-LEN and V-SWEEP silent.
- sweep → exactly ONE: V-SWEEP "claw reach 0.81 m … the Penglai proportion
  gives 0.63" — the predicted 1.29×. V-CLAWS, V-LEN, V-REST silent.
- measure_ship: ia-crown/shank/claw/tip/ring u 0.029–0.058 on the foredeck,
  coils u 0.939–0.951 on the poop roof — stations unchanged from r188.
- Looked at (rules 0/1): plan bow crop at 4× — the three bow anchors read as
  arrow glyphs, crown forward, the horizontal claw pair sweeping back-outward,
  cables led aft to posts and barrel (the same glyph the Kawaguchi screen's
  painter uses in Matsui fig. 4); quarter crop at 3× — the port bower's flat
  spider sweep on the planking, slender arms, tips turned up, tan cable bent
  to the ring. Card row shot: renders whole with the new sweep sentence,
  plain type, rawStar False.
- Frames: opening 64 PAID AND PURE — launched 10:29 on the unedited tree,
  edits landed atomically only after frames 42/43 (ship-treasure 0.000,
  aboard-treasure 0.002 pre-edit) had captured; 64/64, 0 movers, 0 BLANK,
  EXIT:0. Close solos on final code: ship-treasure 0.012% — read and located,
  647 amplified px in the deck-line band carrying the anchors — accepted with
  FRAME-LOG reason (r132-in-advance), then 0.000; aboard-treasure 0.002%
  flap-level, not accepted (r184/r188 precedent); ship-junk 0.000 proves the
  class edit inert.
