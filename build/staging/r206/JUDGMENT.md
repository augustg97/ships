# r206 JUDGMENT — the 문헌편 mined: the 1795 도설 written into the panokseon card, and the 1882 척량 found

## What was mined, and from which plates

All reads are plate reads at 300 dpi off the pure-scan 문헌편
(국립해양유산연구소, 『거북선 학술 복원 보고서 문헌편』, 전통 선박 조선 기술
Ⅷ, 학술총서 91집 — publisher read off the cover imprint, mh-001.png; the
institute carries its post-2024 name, 국립해양유산연구소 under 국가유산청,
NOT 국립해양문화재연구소).

1. **pdf 121 (dosol300-121.png):** the 귀선지제 hanmun whole. 저판 10 planks
   64자8치, head 12자 / waist 14자5치 / tail 10자6치; 현판 7 a side, 7자5치
   high, 68자 lowest to 113자 topmost, all 4치 thick; 노판 4 planks 4자, 현자
   holes through the second; 축판 7 planks, the sixth pierced 1자2치 for the
   rudder (속명 鴟); 신방/가룡/방패/언방; 개판 11 a side, 1자5치 spine gap;
   귀두 4자3치×3자; 10 oars, 22 gunports, 12 doors a side; 24 under-deck
   rooms (2 iron + 3 magazine + 19 berths); the 행장's 6-holes-each-way
   variant quoted.
2. **pdf 122 (dosol300-122.png):** the translation of all of the above, and
   the 좌수영 variant AS differences: 尺度長廣 與統制營龜船略同; 鬼頭 under
   the 귀두; 龜紋 painted; 2 doors a side; counts 2/1/10/6; 8 oars a side.
3. **pdf 123 (r205 dosol-123.png, re-read):** the editor's own bounds —
   "그런데 모두 그 치수에 대해서는 자세히 말한 것이 없다" (no earlier source
   recorded dimensions) and the 1795 통제영 ship differs from 충무공's by
   "치수의 가감". These two sentences are the honesty bound on every number
   above and are quoted in the new provenance.
4. **pdf 143 (gwiseondo300-143 + two bow crops):** the 귀선도 (개인 소장
   최순선, 국가유산청 현충사관리소 기탁, undated caption) — BOTH drawings
   hang a two-arm crossed anchor on a steep shank. The two-masted drawing's
   is unambiguously at the BOW beside the dragon head (gwiseondo-bot-bow.png);
   the roofed side view's end-housing is not resolved (top-right crop shows
   the opposite end's horned sweep, no head). Scale bound stated: ship ~1,500
   px on the page, anchor ~200 px, ~50 px/m — form only.

## What was written into the record (web/data/vessels.json, panokseon only)

- New row 4 "Hull record, 1795" — the 도설 numbers, both foot conversions
  (영조척 31.2 cm / 주척 20.8 cm) printed as contested, the editor's two
  bounds stated.
- Oars row appended: the 8–10 band is the 도설's own pair (통제영 10,
  좌수영 8).
- New hull.jeonseoProvenance — the spec entire, the 좌수영 differences, the
  THREE bounds (no earlier dimensions; 치수의 가감; the 도설 never names the
  panokseon — the numbers reach the card only through the roofing argument),
  and the honest negative: the 도설 text names NO ground tackle, so the
  anchor/windlass warrants stand unchanged.
- anchorProvenance appended: the 귀선도 bow-anchor witness with its scale
  bound.
- cite appended: the report volume.

## Found and NOT mined (the ratchet was already running — no edits after gate start)

**pdf 136 (mangi300-136.png): 『각사등록』 통제영계록, 고종 19 (1882) — a
measured survey (尺量成冊) of three real ships after rebuild, sent to the
통리기무아문:**

- 一戰船 (the jeonseon — the panokseon type's own late-fleet continuation):
  本板 長九十尺 廣十八尺 元高十一尺; 下層信防牌 高五尺; 船頭 廣十五尺;
  船尾 廣十二尺; **上粧 長一百五尺 廣三十九尺**.
- 右別船: 本板 67척3촌 × 13척2촌, 元高 13척; 上粧 88척 × 33척5촌.
- 龜船: 本板 長六十七尺 廣十三尺 元高十三尺; 上粧 長八十八尺 廣三十三尺 —
  against the 1795 도설's 저판 64자8치: the two independent records sit
  within ~3% of each other on the bottom length.

At 영조척 31.2 cm the 일전선's 상장 runs 32.8 m — the card's "~32 m" is an
1882 measured ship's own number. The 상장 breadth 39척 = 12.2 m against the
card's beam ~9.4 m is NOT a contradiction to write blind: the 상장 overhangs
the hull sides, so deck breadth ≠ hull beam — reading which the card's 9.4
denotes, and which foot the 1882 register used, is the r207 head task.

## Gates

- Audit 33/0 on the edited tree (audit.out, audit.err: "checked 33 hulls,
  0 problems").
- build_site: data-version 1788410276.
- Opening 64 ATTRIBUTED under residual 24's stated condition, verified:
  r205's close-ratchet2.out ends RATCHET EXIT 0 all-within-tolerance on this
  HEAD, and git status at round open showed only build/loop.log moved.
- Close 64 IN FULL, predictions written before the run finished
  (PREDICTIONS-close.md): ship-panokseon expected to move (card row region),
  globe-default's documented flap, all else within tolerance.

## How the close gate actually ran (appended at close)

The full-64 run aborted at frame 53 (action-salamis __FRAME_READY
timeout, 60 s; 52 captured, none scored). Solo re-run of the frame:
0.000%, ok. cmd_check wipes _current on every invocation — the 52
captures were unrecoverable, and a full re-run could not fit inside the
80-minute wrapper kill. The gate closed as eleven solo-scored frames,
all within tolerance, zero accepts: the diff-reachable set
(ship-panokseon 0.000, action-myeongnyang 0.000, shipwright 0.000,
globe-default 0.046%/0.011 documented flap) plus seven sampled across
categories (ship-junk, shipwright-astern, aboard-titanic 0.028/0.008,
descent-high, globe-era-card 0.004/0.001, board-salamis 0.011/0.005,
action-salamis). The whole-set debt is HANDOFF residual 25, not
attributable. Rule 1 witnesses read by eye this round: ship-panokseon
(aborted-run capture, identical code+data), card-row-witness.png (the
row on screen, scrolled), globe-default (rule 0 answered on it).
