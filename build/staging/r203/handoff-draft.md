## Round 203 — 2026-09-02 — the insert form gets a dated carrier and a printed length: 송호리1호선, fetched whole and mined

**Residual 1 CLOSED — both Songho-ri reports fetched whole, first try, and
mined to verdicts (build/staging/r203/JUDGMENT.md).** The r202 instruction
was exact: the range GET was the blocker. PLAIN GET with the same UA +
info-page referer + session cookie served both — 수중발굴조사보고서
35,320,352 bytes and 과학적 분석 보고서 17,169,859 bytes, each byte-exact
against its infoData fileMg, both on disk and committed (under the 100 MB
class).

**What Songho-ri 1 is: a Goryeo coaster, remnant 13.4 × 4.7 m, found in
the Haenam intertidal in 2023 — the 15th ancient ship excavated in Korean
waters, the 11th of Goryeo. Hull plank radiocarbon AD 1021–1158 (Beta 2σ;
CAL 1040–1220), the dendro study felling the bark-bearing bottom plank at
1055–1085. 전통 한선 throughout — flat bottom, 가룡목, treenails — but the
whole hull butt-jointed (쪽매방식, a first among excavated Korean hulls),
mast-partner holes at 72 cm spacing, and a 5.74 m rudder.**

**The round's find, the reason this residual was head: the ship carried
ONE HALF OF A TWO-SHANK STONE-INSERT ANCHOR — 마도해역-212's class — with
a PRINTED whole-timber record, stowed inside the hull near the stern.
Catalogue p. 160, read by eye off the rendered plate: 최대길이 149.5 cm,
최대 폭 91.3, 최대두께 19.1 cm, 28 kg; one oak timber (analysis report
sample 42, 상수리나무류) cut as 닻채 and 닻가지 together, made to join an
identical opposite half; three through-stations photographed as SQUARE
MORTISES — 212's own joint detail — and a 'ㄷ' seat groove between the
lower two, the report's presumed 닻돌 결합부. The printed 149.5 cm stands
half a centimetre from the 1.49 m r199 measured off 212's 1/10 drawing.
The drawing-derived arm the junk sails with now has a printed same-form
sibling aboard a dated hull on Xu Jing's own road, in Xu Jing's own
century. Contested within the report and named in the record: survey
chapter says 나무못 구멍, catalogue says 관통 구멍 bound with rope; 212's
halves are batten-pegged. And the carrier is KOREAN-built — the 2017
report's Chinese-practice reading widens without unseating.**

**The census holds over the whole fetched board: three Songho-ri 닻돌
catalogued (9.2 / 151.3 / 8.3 kg, all grooved lashed-form, plates read by
eye) — 명량21-17's 458 kg stays the largest lashed-form stone fetched;
진도-641 stays the lashed tradition's only dimensioned separate arm;
ARM_LEN 1.90 / ARM_SEC 0.196 stand. Rule 9 carried into the record: the
151.3 kg stone is 역암 by the excavation catalogue and 화산력응회암 by the
analysis report's petrology, which also prints different dimensions
(133.6 × 55.8 × 16.7 cm vs 1,335 × 593 × 226 mm) — both stated.**

**The app change, predictions first (staging/r203/PREDICTIONS.md, all
landed): provenance text only. The junk's ground-tackle row and
stoneAnchorProvenance carry the corroboration; the panokseon's
anchorProvenance census sentences take their named exception; one hull.js
comment line (minified out of docs — the record lives in source). No
geometry, no numeric field; the two hull.* fields have zero consumers in
web/js (grep-proven before the edit). In-page proof: the new row sentence
renders verbatim (proof-row-render.json), the row measured below the
900 px fold before AND after (probe-row-visibility.py — the ship-junk
frame cannot see it). Audit 33/0 before, twice after.**

**Frames: residual 22 PAID — the opening 64 ran IN FULL on the untouched
tree (build/ratchet-r203-open.out): ALL WITHIN TOLERANCE, exit 0 — the
r202 attribution chain confirmed as predicted. Close 64 on the final
tree: {CLOSE_VERDICT}. Rule 1: {RULE1}. Rule 0, answered on the same
capture: {RULE0}.**

**The board moved again under the round (re-listed, listData/1): nttId
4452, posted 2026-06-30 — 『거북선 학술 복원 보고서』, the institute's
scholarly reconstruction of the 통제영 and 전라좌수영 turtle ships from
the 1795 이충무공전서, two volumes: 문헌편 FILE_000000000056499/1 at
127,831,863 bytes, 본문편 /2 at 784,858,884 bytes — both >100 MB class,
coordinates recorded, NOT fetched. The album tradition behind the
panokseon's own anchor and windlass warrants — the new residual head.
Also new: 매화도 조사보고서 (4351), 해양유산연구 23/24호 (4322/4439,
journal issues that may carry Songho-ri papers), and the report itself
names 해남 화봉리선 and 송호리2호선 as found and awaiting excavation —
future postings to watch.**

**Deployed: data-version 1788353673. Push log to be read this round (the
r198 rule); live stamp verified below.**

**Named residuals, in order (r202's list, renumbered):** (1) NEW head:
the 거북선 학술 복원 보고서 (nttId 4452, both volumes >100 MB, coordinates
above) — 문헌편 first at 128 MB, the smaller volume. (1b) CLOSED r203
(Songho-ri, this round). (2) Kozushima 1993 weighing (print-only stands).
(3) r187 emaki plate. (4) r182 grapnel shank reconstruction — Wayback
retry owed. (5) — . (6) r177 Lucian's second machine. (7) r173 cog
Gangspill. (8) r173 cog castles. (9) r173 cog rudder slab. (10) r176
sekibune class-size (kiwari read). (11) boxy classes: top (18),
channel/cheek/cathead. (12) Preussen mast livery. (13) Endurance
forecastle. (14) Azzam crest span. (15) r164 risen black unpierced.
(16) r165 fantail gallery wings. (17) r166 screen glass. (18) r171
quarter-gallery sashes. (19) r171 authored tier fractions. (20) r172 the
74's lower capstan barrel. (21) CLOSED r202. (22) CLOSED THIS ROUND (the
opening 64 ran whole, all within tolerance — the attribution test passed).
(23) NEW r203, owed: the opening 64 on next round's HEAD if its close
passes whole and only loop.log moves — else run it in full.
