# Round 201 — the panokseon's stone takes 명량21-17's record

## What this round is

The r200 menu's item 1 and item 2, both: the panokseon's drawn anchor stone
stops standing at the exhibition threshold (2.0 m, ~400 kg, "over 2 m,
300–700 kg", Taean 2021) and takes the excavated object at its own size —
진도Ⅳ-58 / 명량21-17, the largest Korean lashed-form stone in anything
fetched, from the class's own strait — and the two witness sentences land
(진도Ⅱ-328's zelkova beside 진도-641's oak; 진도-621's both-face seat
grooves into the junk's record, text only).

## The records, each verified by eye on a rendered page this round or r200

- **진도Ⅳ-58 / 명량21-17** (m4-p148-148.png, r200 staging, verified r200):
  166 × 53 × 29 cm, 458 kg, D10, 2021-08-14; grooves top 폭 7 × 깊이 2.5,
  bottom 11 × 3.5 cm; rim dressed (치석) toward the rectangle; inside Hong
  2012's 대형군 band 304–590 kg / 146–263 cm (the 2021 Mado report's own
  classification, footnote 64).
- **진도-621** (j1-p447-447.png, rendered and read THIS round): 175.6 ×
  22.8 × 13.2 cm, 108 kg, zone C, 2013-10-13; bar-form, symmetric, finely
  dressed; a 13 cm seat groove on BOTH broad faces (내외면) where the 닻채
  seats; ~4 cm pin grooves top and bottom (고정못). The caption sits above
  photographs showing the bar, the mid-length seat notch edge-on, and a
  close-up of the groove with its pin recesses — caption and plates agree.
- **진도Ⅱ-328** (m2-p336-336.png, rendered and read THIS round): 닻가지,
  59.4 × 9.2 cm, A63, 2017-06-05, the catalogue's own 목제닻을 구성하는
  일부분 — the photographs show the broken tip and burl root. The species
  appendix (p. 376 section) names its 닻가지 sample by the same date and
  grid — 2017.06.05, A63구역 — and identifies 느티나무 (Zelkova): the
  identification is this fragment's own, not 진도-641's.

## What changed in the app

- `web/data/vessels.json` panokseon `woodAnchor`: stoneLenM 2.0 → 1.66,
  stoneSecM 0.3 → stoneWM 0.53 / stoneTM 0.29, stoneKg 458 recorded (the
  junk's stoneAnchor field convention).
- `web/js/hull.js` woodAnchor builder: the stone's section is the record's
  own two faces (너비 along the shank, 두께 off its face); stoneSecM stays
  the legacy square fallback. Shank re-derives itself: 1.66/0.51 = 3.25 m
  (was 3.92); hook limbs lengthen 0.90 → 1.19 by the shared BL/HL
  derivation (whole timber run pinned to 진도-641's 1.90).
- anchorProvenance: the exhibition-threshold sentence replaced by the
  명량21-17 record + Hong 2012 대형군 band; the shank sentence's "3.9 on
  the 2.0 stone" becomes 3.3 on 1.66; the zelkova sentence added.
- junk stoneAnchorProvenance: 진도-621 as the seat-groove witness (text
  only, geometry untouched).

## Gates (predictions in PREDICTIONS.md, written before the change)

- **Opening 64** (unedited tree): ALL 64 WITHIN TOLERANCE
  (open-ratchet.out) — ship-panokseon 0.000, ship-junk 0.000, worst mover
  ship-steamer 0.037% (its own noise class).
- **Audit clean run 1** (after the change): 33 hulls, 0 problems
  (audit-clean1.json). As predicted.
- **inj-wshank**: exactly ONE, digit-exact to the prediction — "shank
  4.07 m drawn — the figure's stone/shank 0.51 puts 3.25 m on this stone"
  (audit-inj-wshank.json).
- **inj-wstone, first form — A PREDICTION MISS, recorded**: the V-STONE
  conviction landed digit-exact ("stone 2.00 m through the stow transform,
  record says 1.66") but a SECOND conviction fired that the prediction
  called silent: V-REST, "lowest point 0.30 m into the surface under it at
  u 0.04". Why the miss: the injection borrowed r199's lift verbatim —
  +0.20 along the stone's local y — but in THIS stow local y is the shank
  axis and the shank lies fore-and-aft, so the "lift" moved the stone
  horizontally toward the bow; the assembly box's centre slid to u 0.04
  under the rising sheer while the x-stretch dropped the rolled stone's
  corner. Both convictions are the audit doing its job on injected
  geometry; the miss was in transplanting an injection between two stows
  whose local frames differ. (audit-inj-wstone.json)
- **inj-wstone2, corrected**: the stretch's extra half-run shifted to the
  stone's rising end along its OWN axis (perpendicular to the shank, so
  V-WSTATION's projection is untouched by construction): exactly ONE,
  digit-exact — "stone 2.00 m ... record says 1.66"
  (audit-inj-wstone2.json).
- **Audit clean run 2** (restored): 33 hulls, 0 problems
  (audit-clean2.json).
- **Looks (rule 1)**: look-a (deck, from ahead-port, l=25) — the anchor
  ahead of its horong, shank diagonal, the new slab stone lashed at
  mid-shank, arms crossed, points clear of the planking; look-c (low, from
  ahead-starboard, l=10) — the stone's broad 0.53 face with its crossed
  frapping and groove turns, rolled onto one end, everything seated.
- Close ratchet + live stamp: recorded in HANDOFF.
