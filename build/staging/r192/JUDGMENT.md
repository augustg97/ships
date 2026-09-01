# Round 192 — the shank takes its own caliper record: the contested member resolves as a taper

## The residual and its condition

r191's queue head: the solved shank (0.0471·全長, square, uniform taper 0.72) is CONTESTED —
the corpus paper's own monument photographs read shanks at 0.023–0.034 of 全長, half the
solve. The residual asked for a caliper record of the Kozushima anchor's members
(國學院大學 1993 site report) to settle it.

The named report did not surface open (the 1993 publication is 東京都教育委員会's, per the
nabunken bibliography, print only). What surfaced instead is BETTER for the question: the
Pacific-coast companion to the class's own corpus paper —

**二宮俊洋「太平洋沿岸部にみられる四爪錨について」修士学位論文, 東京海洋大学, 2013年度
(2014-03), oacis.repo.nii.ac.jp record 1018** — saved as
`build/staging/r192/yotsume-pacific-kam1846.pdf` (64 pp., 19.5 MB). A survey of 144
four-claw anchors, Ibaraki to Wakayama, explicitly built on Matsui 2013's Japan-Sea survey.
Its 表3 調査錨法量 (PDF p.18, printed p.11 — rendered 300 DPI, transcribed, every used row
strip-verified) records what Matsui's 表1 does not: **the shank, at two stations** —
軸正面×軸側面 (the clean bar above the arms) and 軸根本正面×軸根本側面 (the root boss where
the four arms are forged on). Kozushima itself is out of its scope (島嶼部は含めない — the
survey excludes islands), so the 1993 report stays a residual for the WEIGHING's precision,
but the shank question is answered by 17 caliper rows instead of one.

## The record read

Stations compared SORTED (min, max) per anchor — 正面/側面 depend on how each shrine mounted
its anchor, and the sorted pair is invariant under that. Fractions of 全長:

- **upper bar (軸正面×軸側面), n=17: 0.0214 ± 0.0046 × 0.0303 ± 0.0058**
- **root boss (軸根本正面×軸根本側面), n=16: 0.0491 ± 0.0072 × 0.0764 ± 0.0099**

Excluded, named: №1 (sea-concreted — the text's own ①大洗 description: long submerged, tip
lost, surface wasted; every member ~2× corpus), №74 (exfoliated — 剥がれ; 0.012 of 全長 is a
wasted bar, not a section), №93 (printed-inconsistent: root 0.36 of 全長 on a 110 cm anchor
— the r191 rows-41/42 precedent). Flagged: №82's shaft pair (側面/正面 = 2.8, twice anyone
else) dropped from the shaft station, kept at the root.

Cross-corpus check, two independent coasts: №71 (銚子, 300 cm) claw root 10.5×7 =
0.0350×0.0233 of 全長 vs Matsui's arm-root means 0.0346×0.0198; claw length 96/300 = 0.320
vs the class default armF 0.30. The corpora agree on the arms; the arms and rings stand.

## The judgment

**The r191 contest resolves — both readings were right at their own stations.** The
monument photographs' 0.023–0.034 IS the record's upper-bar band; the r191 solve's 0.047 IS
the record's root (0.0491). The real shank is not a uniform bar: it tapers hard from an
oblong root boss (≈0.049×0.076, W:T ≈ 1:1.6) to a slender near-square upper bar
(≈0.021×0.030). The class was missing the taper, and the solve had smeared the root's iron
up the whole shank.

1. **The shank stations become the record's** — class constants, not knobs: root
   0.0491×0.0764, upper 0.0214×0.0303 of 全長, drawn sorted-oriented (wide dimension in the
   same plane at both stations).
2. **Drawn form**: lower taper root→upper split in TWO 4-segment frustums (piecewise mean
   thickness ratios halve the scaled-frustum artifact at the crown to −2.2%), a prism at
   the upper station from the knee to the ring weld. All three pieces named `ya-shank`.
3. **The knee height is the ONE unrecorded dimension** (表3 does not say where on the shank
   軸正面 was calipered) — it takes the mass budget, solved so the drawn iron weighs the
   record's kg at 7850 (the r190/r191 pattern: recorded members are not knobs; the
   unrecorded dimension is). At (2.0 m, 122 kg): knee at 1.286 m = **77% of the shank**,
   inside the solvable band (all-prism 69 kg, full-taper 138 kg). A record kg outside that
   band would clamp the knee and V-YMASS would convict honestly — a contest, not a knob.
   `shTaper` (0.72, "drawn class default — unrecorded") dies: one fewer default in the class.
4. **NEW RULE V-YSHANK**: read the drawn shank's end sections from the built scene — per
   `ya-shank` piece, both geometry ends through the world matrix (width = radius·√2 ×
   world-z-scale, thickness = ×world-x-scale), take the section at the globally lowest end
   (crown) and highest end (head), compare sorted vs the record stations × the record's
   length, 12% band. The constants are the same named corpus means the builder draws by
   (the V-YMASS precedent for shared constants — never vacuous). This rule convicts the
   r191 uniform-solve form itself (crown thickness 9.4 vs 15.3 cm) and any future
   re-smearing of the taper.
5. **V-YLEN updated**: collects ALL `ya-shank` pieces (was `find` — one), plus the head
   ring, projected on the shank's own axis. Same band.
6. **Provenance rewritten** (vessels.json `anchorProvenance`): the CONTESTED paragraph
   becomes the resolution — the thesis, the stations, the exclusions, the knee solve, the
   remaining Kozushima residual (the weighing's precision, not the shank).

## Proofs predicted, before running

- **inj-ya-mass** (members ×0.8 x/z): V-YMASS **78/122**, plus the PREDICTED honest
  V-YSHANK second — a thinned shank is honestly off both stations (−20%). TWO, both named.
  The r191 file's "exactly ONE" comment predates station auditing and is superseded (the
  r191-on-r187 precedent, verbatim).
- **inj-ya-drag** (shank pieces ×1.35 along the axis, crown-anchored): V-YLEN **~2.26/2.0**
  + the honest V-YMASS second **152/122** (a stretched shank truly carries the extra iron).
  V-YSHANK SILENT — the stretch does not touch sections: the discrimination the new rule
  must show.
- **inj-ya-tipsever** (tips only): V-YARMS alone; tips 0.63% of the iron — V-YMASS and
  V-YSHANK silent.
- **inj-ya-shankprism** (NEW: the whole shank forced to the upper station's prism —
  the boss taper removed): V-YSHANK crown 6.1 vs 15.3 cm, plus the honest V-YMASS second
  **69/122**. TWO, both named. This is the injection that convicts the pre-r192 form class.
- Clean audit: integral returns the solved 122 exactly (solve and rule share the same
  analytic volumes); 33/0.

## Frames

Opening 64 launched 14:12 on the unedited tree (r191 HEAD); edits land atomically after
frame 56 (action-myeongnyang) is captured; frames 57–63 score on the edited tree and prove
the class edit inert elsewhere. Close solos: ship-sekibune and action-myeongnyang — the
shank re-profile moves a handful of the anchor's ~90 px; classify, accept only with reason.
