# r188 — the treasure-ship's anchors take the excavated corpus's scale

## The task

The r187 queue head: "the r184 four-claw dimension replacement is now CHEAPER than
fetched-new — Matsui fig. 3 pins the finds the r184 residual named ... re-derive
the r184 sheet from Penglai and re-measure." The r184 provenance itself promised
it: "a measured surviving four-claw anchor would replace all three and this field
says so."

## The evidence, verified on the plate this round

Matsui 2013 (金沢大学考古学紀要 34, PDF local since r187, build/staging/r187/
matsui-yotsume.pdf) — fig. 3, paper p. 39, READ THIS ROUND, caption verbatim
(转载 from 王冠倬 2000: 149, 277–278):

- **a: 1984年、山東省蓬莱水城出土。全長 2.15 m、重さ 456 kg** — the complete
  excavated Ming four-claw anchor from the Penglai naval fortress.
- **b: 1956年、山東省梁山県宋金河出土。全長 1.36 m** — shank inscribed
  「甲字五百六十号 八十五斤 洪武五年」: a 甲-series arsenal serial, **85 catties
  as made**,
  Hongwu 5 = 1372. A datum the r187 residual did not carry: the corpus's OTHER
  dated Ming find has an as-made weight, ~50 kg.
- **c: 1981年、福建省泉州四湖港出土。残高 2.68 m、758.3 kg** — incomplete, its
  missing parts drawn dotted in the figure.

## The derivation

The 舟車 chapter records the sheet anchor (看家錨) at about 500 catties (~295 kg
at the Ming catty ~0.59 kg, the r184 conversion); the pair's 300 catties stays an
INFERENCE at the forging text's own anvil threshold. Weight is what the record
gives; length is what the model draws; the excavated corpus is the bridge.

**Calibrator: Penglai, cube-law.** k = 456/2.15³ = 45.9 kg/m³.
- Sheet 295 kg → L = 2.15 × (295/456)^(1/3) = **1.86 m** (was drawn 2.4).
- Pair/stern 177 kg → L = 2.15 × (177/456)^(1/3) = **1.57 m** (was 2.0).

**Why Penglai and not Liangshan:** the two dated Ming finds differ better than
2× in weight per length (46 vs 20 kg/m³) — the corpus spans a stocky naval build
and a slender small-craft build, visible in fig. 3's own drawings. The
treasure-ship's tackle is a state ship's: the TGK forges it as "the largest thing
under furnace and hammer," and Penglai is the naval-fortress find. Named
sensitivity: the power law through BOTH Ming points (n ≈ 4.8, an empirical
interpolation, both targets inside the 50–456 kg bracket) gives sheet 1.96 m
(inside the audit's 12% band around 1.86) and pair 1.77 m (at the band's edge).
The choice of law moves the drawn anchor by a hand's width; the choice is named
in the provenance.

**Cross-check: Quanzhou.** A complete 2.68 m anchor cube-scales to ~880 kg; the
incomplete find weighs 758.3 kg surviving — a consistent lower bound.

**What is NOT replaced:** the claw sweep stays a woodcut-proportion default
(clawFrac 0.42) — the Chinese finds are not measured part-by-part in the caption.
Named in the provenance, as before.

## The class change

The r184 record fields carried a bare shank length; the r187 yotsume settled the
fleet convention — the record carries the FULL crown-to-ring length, the quantity
a find's 全長 actually measures, and the length rule reads it from the geometry
through the world matrix. This round converts ironAnchors to that convention:

- Fields renamed: sheetShankM/bowerShankM/sternShankM → **sheetLenM/bowerLenM/
  sternLenM**, values the calibrated full lengths (1.86 / 1.57 / 1.57).
- Builder: makeAnchor takes the full length, splits it internally
  (shD = 0.046·full, shank = full − 2.78·shD) so the drawn ring top lands at the
  field's value; stow() takes the full length for pitch span and ring point.
- Audit: V-SHANK (world-AABB of the shank mesh) replaced by **V-LEN** — per
  anchor, shank + head-ring extents projected on the shank's own world axis (the
  V-YLEN form, the r186 lesson), sorted against the record's full lengths.

## Proofs (run on final code, results below)

- drag: sheet shank stretched 1.35× under a faithful record → exactly ONE V-LEN
  conviction reading ~2.19 m against 1.86.
- sever: one anchor's claw tips stripped → exactly ONE V-CLAWS conviction
  (16 points for 5 anchors); V-LEN silent.

## Residuals

- (from r187) the 1433 Jingu Kogo engi emaki plate; grapnel/stoneAnchor rest
  rules to the surface-asked form; panokseon stone station; and the carried list.
- The claw-sweep default could be replaced by measuring fig. 3a's own drawing
  (it self-scales: 全長 2.15 m is in the caption) — a part-proportion pass for a
  future round, plate and scale to be named per the Azzam rule.
