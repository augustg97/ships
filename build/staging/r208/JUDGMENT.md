# r208 — the staged edit lands whole: the 1882 row, the Beam datum, and the geometry, one round, one close

## What was edited (web/data/vessels.json, panokseon only)

1. **Beam row** rewritten to carry the r207 datum finding: 9.4 m is the 상장요광 —
   the fighting deck's waist breadth, 30척 — not the hull's; 김재근's 2.5–3척-a-side
   beam-end overhang stated; the hull at the rail 24–25척 ≈ 7.5 m named derived; the
   3.4 ratio named deck-length-on-deck-breadth.
2. **"Hull record, 1882" row inserted** after the 1795 row — the r207 JUDGMENT draft
   verbatim. Before insertion the draft was re-verified against the plates:
   mangi300-136.png carries the register's own hanmun — 一戰船 本板 長九十尺·廣十八尺·
   元高十一尺·船頭廣十五尺·船尾廣十二尺, 上粧 長一百五尺·廣三十九尺 — so the draft's
   "sides 11척 high" is the register's 元高, and Hong 표 3's 15/12 are the head and
   tail breadths, not a height conflict. The 귀선 line (67/13/13/10/8/88/33) and the
   우별선 (본판 67척 3촌) both confirmed on the plate and its translation (pdf 137).
   Conversions in the draft re-run: 105×0.312=32.76, 39×0.312=12.17, 90×0.312=28.08;
   주척 21.84/8.11/18.72; 67/64.8=+3.4%. All as drafted.
3. **hull.beam 9.4 → 7.6** — the shell at the record's structure: 24.4척 at the
   영조척, inside Hong's 24–25척; the drawn deck then lands at 7.6 + 2×0.9 = 9.4 m
   exactly, the 상장요광.
4. **gunDeck.over 0.5 → 0.9** — 2.88척 a side, inside 김재근's 2.5–3척 band
   (신경준's 병선론 proposed the full 3척).
5. **windlass.barrelLenM 3.8 → 2.7** + provenance sentence — the barrel's own warrant
   is GEOMETRIC (sized against the drawn foredeck, r184's probe law, margin 1.99 m);
   the deck it stands on narrowed, so the number follows its warrant:
   probe-bow re-run, u 0.10 width 5.79 → 4.68 m (probe-bow-before/after.json),
   4.68 − 1.99 ≈ 2.7.
6. **jeonseoProvenance appendix** — the 1882 register named as the second measured
   record in the line: 각사등록 통제영계록 고종 19, 광서 정월 15일 승정원 개탁, read
   at 300 dpi from 문헌편 pdf 135–137, hanmun and translation agreeing column for
   column, cross-checked against Hong 2025 표 3.

No code change: the galleass already set the class convention (hull.beam is the HULL's;
the stat block prints it; the card row carries the wider structure) — the panokseon now
follows it. The stat block moves 9.40 → 7.60 m by data alone.

## Measured, before and after (measure-before.txt / measure-after.txt)

| quantity                  | before | after | record |
|---------------------------|--------|-------|--------|
| Planking half-breadth     | 4.70   | 3.80  | shell 24–25척 ≈ 7.5–7.8 m → 7.60 ✓ |
| Sangjang deck half        | 5.20   | 4.70  | 상장요광 30척 ≈ 9.4 m → 9.40 ✓ |
| overhang per side         | 0.50   | 0.90  | 김재근 2.5–3척 = 0.78–0.94 m ✓ |
| win-barrel half           | 1.90   | 1.35  | 2.7 m across the 4.68 m foredeck ✓ |
| win-standard half         | 2.16   | 1.61  | < deck half 2.34 at u 0.10 ✓ |
| Oars outboard half        | 8.26   | 7.35  | pivot on the hull's own rail; blades still bury (y −0.73) ✓ |
| wa-shank / wa-stone half  | 1.66/1.41 | unchanged | < deck half 2.17 at u 0.08 ✓ |

Oars re-checked per the r207 condition: the ro pivots at surfacePoint(u, 0.96) — the
hull's own rail — so the band moved inboard with the shell and the blades' water reach
held; nine a side unchanged, inside the card's 8–10 band (Hong's 노 20 = 10 a side is
the band's top).

## Witnessed (rule 1)

- ship-panokseon frame read whole from _current: stat block prints 32.0 m / 7.60 m;
  the fighting deck stands proud of the planking on the raked belt; oars emerge from
  under the deck edge. Diff image confined to the ship and the stat digits.
- card-row-witness.png: the 1882 row rendered whole and legible, both conversions and
  the closing datum sentence on screen; the amended Beam row confirmed in the DOM.

## Gates

Audit 33/0 (audit.out). Opening baseline: r207's whole-64 pass, standing per its own
condition — git status at r208 open showed only build/loop.log. Close: full 64 run
(close-ratchet.out), movers classified and accepted with reasons. Build after the run
(the r207 order — the stamp must not move the tree mid-run). Push receipt read the
same round, live stamp verified.

## Second firing (09:18 PDT) — the close the first firing did not reach

The first r208 firing (23:47–00:03) made the edit, measured, witnessed, ran the audit, and
launched the close ratchet at 00:02; the turn ended with close-ratchet.out at 0 bytes and
nothing committed. Every firing from 00:08 to 09:08 died at the wrapper's NOT AUTHENTICATED
line (loop.log). This firing found the edit intact in the working tree (git diff = the six
items above, nothing else in web/), the audit at 33/0, the server up, and closes it.

Close ratchet, attempt 1 (09:20): aborted at frame 3, globe-steam, on the documented
readiness transient (r206's trap: __FRAME_READY never true inside 60 s; cmd_check wipes
_current). It coincided with pdftoppm rasterising six pages of the 785 MB 본문편 — cause
unproven, contention plausible; the run was relaunched at 09:23:59 (PID 9104) with no
other CPU work for its duration. Rule for the record: NO rasterising, no measure_ship, no
probes while a ratchet runs.

## The 본문편 LANDED — residual 1b CLOSED

retry-bonmun.log: attempt 4 (03:12–04:10, the early-morning window) HTTP 200,
784,858,884 bytes, COMPLETE byte-exact. build/staging/r204/geobukseon-bonmun.pdf, PDF-1.6,
404 pages, Adobe InDesign 20.5 (June 2026), an image-only export — pdftotext yields 40
characters over 40 pages, so every read is a plate read, as the 문헌편. TOC (pdf 6–8):
I 개요 · II 사료 검토 (행록, 난중일기, 장계, 일본 기록, 외교 문서, 명 기록; 영조실록,
이충무공전서, 해동역사, 2004 뉴욕 거북선도) · III 국내 제작·복원 현황 (eight existing
reconstructions surveyed) · IV 『이충무공전서』 구조 분석 · V 자문 · VI 통제영 거북선
원형 추정 설계 및 검증 (p.108–208: 주요 치수, 선형, 구조, 기본/구조/상세 설계도, 3D,
FEM, CFD, 1/30 모형) · VII 전라좌수영 거북선 (p.210–300) · VIII 결론 · 논고 (p.328–).

Mined this firing (light reads only, the ratchet running):
- p.3 §5 표기 방식 및 단위: the report keeps 척·촌 as its base unit and prints SI beside.
- p.109–110 표 6 「이충무공전서」 통제영 거북선의 주요 치수 (the institute's FIXED
  design figures, 2023–26): 전장 113 · 본판장 64.8 · 본판두광 12 · 본판요광 14.5 ·
  본판미광 10.6 · 본판재 10열 · 상두광 19.6 · 상요광 27 · 상미광 13.4 · 선두고 9.5 ·
  선요고/현요고 9.0/7.5 · 선미고 9.0 · 전고 20.5 (척). 상요광 = 상포판 중앙 부분 폭.
- p.111 그림 67 (정면 선도) labels the same section 33尺 (상장광) outside 27尺 (상요광):
  the 상장 rides 3척 proud of the upper hull A SIDE on the institute's own design — the
  full 신경준 projection, and exactly the 1882 register's 귀선 上粧 廣三十三尺 over a hull
  the 도설 gives no breadth for. Ratio 27/33 = 0.82; the panokseon as now drawn is
  24.4/30 = 0.81. The r208 geometry sits on the institute's number without having read it.
- p.128 그림 83/84 (기본 설계도, 2023.07–08 title blocks) carry a 주요치수 block ending
  "* 1 尺 = 31.22 cm 임" — read at 110 dpi, small type; CONFIRM at 300 dpi after the
  ratchet before it goes on any card. If it holds, the institute's design foot is the
  영조척 at 31.22, one leg more for r207's foot question, on the yard's own ship.
- p.136 표 8 몸체 구조의 목재 수량: member schedule in 尺/寸 with m³ — 가목 34.3척 ×
  10촌 × 10촌 × 14, 현판 24.7척 × 4촌 × 15.3촌 × 62, 포판 20.6척 × 10촌 × 3촌 × 110;
  timber total 168.341 m³ / 46,111 才. The 가목 at 34.3척 against a 33척 상장광: the
  crossbeams run the deck's full breadth and a little over — the beam-ends ARE the deck
  edge, which is the structure this round's over: 0.9 draws.

NOT read: 그림 67's offsets, 표 7, the 3D model chapter, the FEM/CFD, chapter VII (the
좌수영 ship), the 논고. Next reads for the PANOKSEON card: II.2.3) 이순신 종가 귀선도
(p.41) and II.2.5) 2004 뉴욕 공개 거북선도 (p.44) — plate reads; VI.1.2) 선형 (p.110–)
for the panokseon-line hull form argument ('판옥선 계열 군선에서 확인되는 조선 기술').
