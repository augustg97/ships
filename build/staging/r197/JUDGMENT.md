# Round 197 — the r196 residual: do the publications dimension the recovered arms?

The residual (r196 #1): the study's artifact catalogue — recovered arms ④ (Jindo) and
⑥ (Gwangyang) were read for their peg holes only; whether the study or the thesis
dimensions them was not checked. A measured arm would replace the 1.2 m drawn class
default the provenance still names.

## The strict question, answered from disk first

- **Hong 2013 study (pp. 134–137, read at 150 DPI page by page): the catalogue ①–⑨
  is QUALITATIVE.** Every entry describes form (원통형, one end pointed, peg holes,
  flat inner face, semicircular section) and none carries a dimension — the only
  number in the run is ⑧'s stone lying 40 cm under the seabed. The plates carry
  scale bars, but ④'s is a small angled checker on an oblique shot and ⑥'s is a
  plain white rod of unknown convention — neither anchors a clean px/m.
- **Hong 2012 thesis: its only dimension table is 표 2, the 80 anchor-STONES.**
  The arms appear in prose (사진 17, the Mado II arm with three square holes) and in
  footnote 10 (wood species, 5 pieces, all oak) — no lengths. The cm figures in the
  experiment chapter are the lashing stones (№54, №26) and the reproduction rigs.
- **The 2023 report 『한국의 닻돌』: catalogue is per-stone.** Stone 052's entry
  (found IN the arm's groove, 2011) names the arm only as 공반 — no dimensions.

So: NO publication on disk dimensions the arms. The residual's question closes NO.

## The fetch — the excavation reports that would RECORD them

The record beats a derivation, so before measuring plates: the arms' own excavation
reports, from the same seamuse.go.kr board r195 used (the SPA hides links; POST to
/resources/academicreport/listData/<page> with searchWrd, then infoData/<nttId>,
then /board/fileDown/<atchFileId>/<fileSn> — needs a browser UA + referer or the
board serves an egov error page).

- 진도 명량대첩로 해역 수중발굴조사 보고서 Ⅰ (2015, nttId 904, 112 MB) — the Jindo
  arm ④ (오류리 해역, excavated 2012 season). DOWNLOADING.
- 태안 마도해역 탐사 보고서 (2011, nttId 259, 37 MB) — the 마도Ⅰ지구 광역탐사
  pieces. DOWNLOADING.
- Noted for later: 시굴조사 보고서 2017 (nttId 1250, 42 MB — the 2011 시굴 that
  raised stone 052 + arm ⑤) and 2021 (nttId 2894, 234 MB).

## What the reports record

- **진도-641, 닻가지 / Wooden arm** (Myeongnyang Ⅰ 2015, p. 467; = the study's ④):
  출수위치 C, 2013-09-03. **길이 190 cm, 너비 19.6 cm, 두께 40 cm**, oak
  (상수리나무류, the report's 수종분석). Validated on the catalogue's own measured
  drawing against its printed 1 m bar at 8.79 px/cm (300 DPI): plans 188.7/189.0 cm
  long, 19.2/20.7 cm wide; side envelope 40.7 cm — the 두께 40 is the root crook's
  side envelope, the timber sweeping up where it met the shank. Section circle at
  its marked station 16.3 × 17.6 cm. The root end is LAP-NOTCHED for the shank and
  the two peg stations (one treenail surviving) sit 0.35–0.55 m from that end.
- The Mado 탐사보고서 (2011): stones only — the diary logs "목재 닻 부속" raised,
  the catalogue dimensions none of it. The Gwangyang arm ⑥: no report exists (a
  reported find); undimensioned in print anywhere.

## The class change (hull.js woodAnchor)

- ARM_LEN 1.90 / ARM_SEC 0.196 class constants (진도-641). The whole drawn run
  root to point held to the record: HL = ARM_LEN − BL − 1.1·armD (the tip cone's
  reach as placed), so timber BL+HL = 1.6844 exactly and timber+point = 1.90.
  armD 0.12 → 0.196 (the visible change: timbers 63% stouter, matching the
  artifact and the institute figure's near-shank-girth arms). The record's
  armM 1.2 DROPPED — its own provenance called it a drawn default; a record
  armM/armSecM would outrank. CONTESTED carried: the artifact's own peg
  stations (0.35–0.55 m from the root) fit Hong's foot-rooted variant, not the
  drawn crossed frame's 0.79 m blunt limb; the institute frame stays drawn.

## Predictions, written BEFORE the shadow runs

1. **clean**: 33 hulls, 0 problems. (Builder timber = 1.6844 = rule's lenW
   exactly; dia 0.2156 = secW exactly.)
2. **inj-wa-armsec** (arms rescaled to armD 0.12): exactly ONE — V-WARM section,
   "0.13 m through" vs 0.22. Length form silent; V-WSPLAY silent (normalized
   axes); everything else silent.
3. **inj-wa-armlen** (timbers rebuilt at HL 1.2): exactly ONE — V-WARM length,
   "1.99 m" vs 1.68. Section form silent (0.22 kept); splay/station/stock/rest
   silent.
