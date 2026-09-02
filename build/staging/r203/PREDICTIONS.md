# r203 predictions — written BEFORE the edits (r19x protocol)

## The round's changes (all text; no geometry, no shader, no app.js)

1. `web/data/vessels.json` — junk, "Ground tackle, as drawn" row: append the
   Songho-ri corroboration sentences (user-facing card text).
2. `web/data/vessels.json` — junk, `hull.stoneAnchorProvenance`: append the
   Songho-ri record paragraph (record field, no consumer in web/js — verified
   by grep before the edit: zero hits for the key name outside vessels.json).
3. `web/data/vessels.json` — panokseon, `hull.anchorProvenance`: qualify the
   two census sentences (진도-641 "only arm published with dimensions";
   insert form "a different joint") with the Songho-ri facts (record field,
   same zero-consumer proof).
4. `web/js/hull.js` — one comment line at the 마도해역-212 dimension block
   (comment only; no executable change).

## Predictions

P1. Audit: 33 hulls / 0 problems, before (already run, 33/0,
    audit-before.json) and after. Reason: no numeric field changes; the
    audit rules read built geometry and record NUMBERS (woodAnchor,
    stoneAnchor), none of which move; no audit rule greps the edited
    strings (verified: zero hits for the field names in audit-hulls.js).

P2. Opening 64 (running now, started before any edit): ALL frames within
    tolerance. This is r202's attribution test — r201's close passed whole
    on HEAD 192cc80's tree and only build/loop.log moved since. Exception
    band: globe-default may show its documented capture flap (≤ 0.046% /
    0.011 class); any frame beyond tolerance falsifies the r202 attribution
    and must be classified solo before any edit ships.

P3. Close ratchet (after edits + build): ALL 64 within tolerance, ZERO
    accepts. Specifically:
    - ship-junk: NO visible change. The edited row sits at y 1690–2277 in
      the 1440×900 frame (measured in-page before the edit,
      probe-row-visibility.py) — below the fold; nothing above the fold
      reads the row.
    - ship-panokseon: 0.000-class. Only a never-consumed record string
      changes.
    - action-myeongnyang: 0.000-class, same reason.
    - hull.js comment: no executable change, no frame can move from it.
    If ship-junk moves visibly, the prediction is WRONG and the diff must
    be read before accepting anything.

P4. In-page render proof: after the edit, the junk card's ground-tackle row
    renders the new sentence verbatim (string-exact check in-page), and the
    era/globe views are byte-identical in behaviour (no code path touches
    them).

## What the fetched records say (the facts the edits carry)

- 송호리1호선 excavation report (nttId 4300, 35,320,352 bytes byte-exact
  against infoData; fetched this round, PLAIN GET as r202 instructed —
  the range GET was the blocker, fileSn 0 the PDF): Goryeo coaster,
  remnant 13.4 × 4.7 m, hull plank AD 1021–1158 (Beta 2σ; CAL 1040–1220),
  found Haenam 2023. ONE wooden anchor half, catalogued p.160:
  최대길이 149.5 cm, 폭 91.3, 두께 19.1, 28 kg — one timber cut as shank
  and arm together, joined to an identical opposite half, three
  through-stations, 'ㄷ' seat groove between the lower two = the two-shank
  insert form, 마도해역-212's class, at 212's own measured 1.49 m (0.3%).
  Fastening contested WITHIN the report: survey chapter says 나무못 구멍
  (peg holes), catalogue says 관통 구멍 + 줄로 묶어 (through-holes, rope).
  THREE anchor stones: 송호Ⅰ-11 46.4×15.2×6.6 cm 9.2 kg; 송호Ⅰ-12
  133.6×55.8×16.7 cm 151.3 kg; 송호1-13 43.3×15.2×8.8 cm 8.3 kg — all
  grooved lashed-form, largest 151.3 kg, census ceiling 명량21-17's 458 kg
  UNMOVED.
- 과학적 분석 보고서 (nttId 4297, 17,169,859 bytes byte-exact): the anchor
  timber (its sample 42, named 닻가지) is 상수리나무류 (oak) — 진도-641's
  species. 송호23-12 (= Ⅰ-12) petrology: 화산력응회암 (lapilli tuff),
  AGAINST the excavation catalogue's 역암 (conglomerate) — and its
  dimensions 1,335×593×226 mm against the catalogue's 1,336×558×167 —
  the site's own two reports disagree on both; both stated (rule 9).
- Board moved again: nttId 4452 (2026-06-30), 거북선 학술 복원 보고서 —
  two volumes, 127,831,863 B (문헌편, fileSn 1) and 784,858,884 B
  (본문편, fileSn 2), both >100 MB class, coordinates recorded, NOT
  fetched. New residual head after this round.
