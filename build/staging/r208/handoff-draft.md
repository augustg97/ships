## Round 208 — 2026-09-02/03 — the staged edit lands whole: the 1882 row, the Beam datum and the geometry in one close; the 본문편 lands (worked across two firings; the first died at the close gate, then nine firings failed unauthenticated)

**The r207 head task DONE: the panokseon card and hull now agree with the card's own
cite. Six edits, all in web/data/vessels.json, panokseon only, no code change
(build/staging/r208/JUDGMENT.md carries the full chain):** (1) the Beam row rewritten —
9.4 m is the 상장요광, the fighting deck's waist breadth at 30척, not the hull's; 김재근's
2.5–3척-a-side beam-end overhang stated; the hull at the rail 24–25척 ≈ 7.5 m named
DERIVED, no source recording the shell's own beam; the 3.4 ratio named deck length on deck
breadth. (2) A "Hull record, 1882" row inserted after the 1795 row — the r207 draft
verbatim, re-verified before insertion against the plate itself: mangi300-136.png carries
the register's hanmun (一戰船 本板 長九十尺·廣十八尺·元高十一尺·船頭廣十五尺·船尾廣十二尺,
上粧 長一百五尺·廣三十九尺; 龜船 67/13/13/10/8/88/33; 右別船 본판 67척 3촌), so the row's
"sides 11척 high" is the register's 元高 and Hong 표 3's 15/12 are head and tail breadths.
Conversions re-run: 105 × 0.312 = 32.76, 39 × 0.312 = 12.17, 90 × 0.312 = 28.08; 주척
21.84 / 8.11 / 18.72; 67/64.8 = +3.4%. (3) hull.beam 9.4 → 7.6: the shell at 24.4척 at
the 영조척, inside Hong's 24–25척, and the drawn deck lands at 7.6 + 2 × 0.9 = 9.4 m, the
상장요광 exactly. (4) gunDeck.over 0.5 → 0.9: 2.88척 a side, inside 김재근's 2.5–3척 band.
(5) windlass.barrelLenM 3.8 → 2.7, with its provenance sentence: the barrel's warrant is
GEOMETRIC — sized to the drawn foredeck by r184's probe law at a 1.99 m margin — and the
deck it stands on narrowed (probe-bow re-run: u 0.10 width 5.79 → 4.68 m;
probe-bow-before/after.json), so the number followed its warrant. (6) jeonseoProvenance
appended: the 1882 register named as the second measured record in the line — 각사등록
통제영계록 고종 19, 광서 정월 15일 승정원 개탁, read at 300 dpi from 문헌편 pdf 135–137,
hanmun and translation agreeing column for column, cross-checked against Hong 2025 표 3.
The galleass already set the class convention (hull.beam is the HULL's; the stat block
prints it; the card row carries the wider structure); the panokseon now follows it, and
the stat block moves 9.40 → 7.60 m by data alone.**

**Measured before and after (measure-before.txt / measure-after.txt, half-breadths in m):
Planking 4.70 → 3.80 (shell 24–25척 ≈ 7.5–7.8 m: 7.60 ✓); Sangjang deck 5.20 → 4.70
(상장요광 30척 ≈ 9.4 m: 9.40 ✓); overhang per side 0.50 → 0.90 (김재근 2.5–3척 =
0.78–0.94 m ✓); win-barrel 1.90 → 1.35 and win-standard 2.16 → 1.61, under the deck half
2.34 at u 0.10 ✓; Oars outboard 8.26 → 7.35 — the ro pivots at surfacePoint(u, 0.96), the
hull's own rail, so the band moved inboard with the shell and the blades' water reach held
(y −0.73), nine a side unchanged inside the card's 8–10 band; wa-shank/wa-stone 1.66/1.41
unchanged, under the deck half 2.17 at u 0.08 ✓. Model breadth 16.52 → 14.70 m (the oar
span).**

**Rule 0 answered on ship-panokseon, read whole from _current against the committed
baseline: it reads as a rendered world — a timber warship on open water with hills on the
horizon, two battened lug sails drawing, the commander's railed pavilion under its hipped
roof, nine oars a side working under the deck edge. Three facts a viewer can read off it:
the fighting deck now stands well proud of a narrower planked hull on its raked belt, with
dark gunports cut through its bulwark; the stat block prints 32.0 m length and 7.60 m
beam, the hull's own; the fleet list places her at 14 of 33 between the galleass and the
sekibune. Rule 1: card-row-witness.png (first firing) shows the 1882 row rendered whole
and legible, both conversions and the closing datum sentence on screen.**

**HOW THE ROUND RAN, for the record. The first firing (23:47–00:03) made the edit,
measured, witnessed, audited 33/0, launched the close ratchet at 00:02 and ended its turn
with close-ratchet.out at 0 bytes and nothing committed. Nine firings from 00:08 to 09:08
died at the wrapper's NOT AUTHENTICATED line. The second firing (09:18) found the edit
intact — git status: web/data/vessels.json, build/loop.log, the daemon's cookie file,
build/staging/r208/ — re-read the diff whole against the r207 draft and the measurements,
and closed it. Two ratchet aborts first: attempt 1 (09:20) died at frame 3 and attempt 2
(09:24) at frame 1, both on the r206 readiness transient (__FRAME_READY not true inside
the manifest's 60 s; cmd_check wipes _current). The load average was 8–12 through both —
the desktop was in use, and attempt 1 overlapped my own pdftoppm of the 본문편 — and
frames that captured took ~60 s each against ~20 s once the load dropped. The manifest's
readiness timeout_ms is now 150000 (Research/baselines/frames.json): a harness
tolerance, not an app change; what is captured is unchanged, since capture waits for
readiness and then settle_ms as before, and a frame that is really broken now fails in
150 s instead of 60. Attempt 3 (09:26, PID 9460) ran whole. Rule for the next round: no
rasterising, no measure_ship, no probes while a ratchet runs, and read `uptime` before
launching one.**

**The close ratchet, RUN WHOLE (build/staging/r208/close-ratchet.out, attempt 3): 64
frames, three movers, every one classified and accepted with its reason in FRAME-LOG.md.
ship-panokseon 6.093% / 2.301 — the whole ship redrawn narrower plus the stat digits
9.40 → 7.60, the intended change, read against the committed baseline. ship-galleass
0.126% / 0.046 — 25,041 of its 26,374 moved pixels (94.9%) lie in the right 15% edge
band where the panokseon, the next ship in the fleet row, stands at the frame edge; the
remainder is 0.026% of the frame in the waterline band, under the gate on its own.
ship-sekibune 0.090% / 0.031 — 23,557 of 24,054 (97.9%) in the left 15% band where the
panokseon's stern stands; the remainder 497 px in one 62 × 64 cluster at her bow anchor,
under the gate alone. No galleass or sekibune edit — the neighbours moved because the
Shipwright row shows the adjacent hulls at the frame edges, and the accepts say so, so the
intended change cannot read as drift. The other 61 within tolerance; globe-default at its
documented 0.046% / 0.011 flap an eighth round.**

**The 본문편 LANDED — residual 1b CLOSED.** retry-bonmun.log: attempt 4 (03:12–04:10,
the early-morning window) HTTP 200, 784,858,884 bytes, COMPLETE byte-exact —
build/staging/r204/geobukseon-bonmun.pdf, gitignored by name. PDF-1.6, 404 pages, Adobe
InDesign 20.5 (June 2026), image-only: pdftotext yields 40 characters over 40 pages, so
every read is a plate read, as the 문헌편. TOC (pdf 6–8): I 개요 · II 사료 검토 (행록,
난중일기, 장계, 일본 기록, 외교 문서, 명 기록; 영조실록, 이충무공전서, 이순신 종가 귀선도
p.41, 해동역사, 2004 뉴욕 공개 거북선도 p.44) · III 국내 제작·복원 현황 (eight existing
reconstructions) · IV 『이충무공전서』 구조 분석 · V 자문 · VI 통제영 거북선 원형 추정
설계 및 검증 (p.108–208) · VII 전라좌수영 거북선 (p.210–300) · VIII 결론 · 논고 (p.328–).
**Mined this round, light reads only:** p.3 §5 — the report keeps 척·촌 as its base unit
and prints SI beside. p.109–110 표 6, the institute's FIXED design figures for the 1795
통제영 ship: 전장 113 · 본판장 64.8 · 본판두광 12 · 본판요광 14.5 · 본판미광 10.6 · 상두광
19.6 · 상요광 27 (상포판 중앙 폭) · 상미광 13.4 · 선두고 9.5 · 선요고/현요고 9.0/7.5 ·
선미고 9.0 · 전고 20.5 척. **p.111 그림 67, the 정면 선도, labels the same section 33尺
(상장광) outside 27尺 (상요광): on the institute's own design the 상장 rides 3척 proud of
the upper hull A SIDE — the full 신경준 projection, and exactly the 1882 register's 귀선
上粧 廣三十三尺 over a hull the 도설 gives no breadth for. Ratio 27/33 = 0.82; the
panokseon as drawn since this round is 24.4/30 = 0.81. The geometry landed on the
institute's number before the number was read.** p.128 그림 83/84 (기본 설계도, 2023.07–08
title blocks) carry a 주요치수 block ending "* 1 尺 = 31.22 cm 임", read at 110 dpi in
small type — CONFIRMED at 300 dpi after the run
(p128-dims-crop.png): the block reads 전장 113尺 · 상장 87尺 · 상요광 27尺 · 현요고 7.5尺 ·
선요고 9.0尺 · "* 1 尺 = 31.22 cm 임." — the institute's design foot for the yard's own
ship is the 영조척 at 31.22, one leg more for r207's foot question, and the 상장 at 87척
is the 1882 register's 귀선 上粧 長八十八尺 within a foot. p.136 표 8, the hull's member schedule in 尺/寸 with
m³: 가목 34.3척 × 10촌 × 10촌 × 14, 현판 24.7척 × 4촌 × 15.3촌 × 62, 포판 20.6척 × 10촌 ×
3촌 × 110; timber total 168.341 m³ / 46,111 才. The 가목 at 34.3척 against a 33척 상장광:
the crossbeams run the deck's full breadth and a little over — the beam-ends are the deck
edge, which is the structure over: 0.9 now draws.

**Gates: audit 33/0 (audit.out, run on the edited tree by the first firing; nothing in
web/ changed after it but the stamp). Build after the run, the r207 order. THE BUILD
REFUSED ONCE: first paint 8.60 MB against the 8.6 budget — the 1882 row was the straw, and
the fat was the same class r61 found in the scripts: web/data/*.json is pretty-printed so
diffs read, and docs/ was serving the indentation. build/build_site.py now compacts the
published data (json.load → json.dump, separators without spaces, ensure_ascii=False; every
file re-parsed equal to its source before the commit): docs/data 0.67 → 0.59 MB, first
paint 8.53 MB. web/ is untouched, as with the scripts. Stamp 1788455398. Push receipt
read the same round, live stamp verified below.**

**Named residuals, in order (r207's list, renumbered):** (1) HEAD, r209: the 본문편's
panokseon-relevant plates — II.2.3) 이순신 종가 귀선도 (p.41) and II.2.5) the 2004 New
York 거북선도 (p.44), plate reads; VI.1.2) 선형 (p.110–112) for the 판옥선-line hull-form
argument; the p.128 foot line at 300 dpi if not confirmed this round; and a card sentence
for the 33/27 structure once read whole — the Beam row's "derived" hull breadth gains the
institute's own 3척 as a class witness. Then the rest of the 문헌편: 태종실록/탁신 (pdf 7
ff.), 당포파왜병장 (pdf 123). The 수군조련도 anchor read stays a museum fetch (증8190
e-museum). The 판옥선 학술연구 보고서 (2021) stays a named fetch candidate — the 재현선
너비 8.74 m datum. (1b) CLOSED this round. (2) Kozushima 1993 weighing (print-only
stands). (3) r187 emaki plate. (4) r182 grapnel shank — retry from a cooler week. (5) — .
(6) r177 Lucian's second machine. (7) r173 cog Gangspill. (8) CLOSED r205. (9) r173 cog
rudder slab. (10) r176 sekibune class-size (kiwari read). (11) boxy classes: top (18),
channel/cheek/cathead. (12) Preussen mast livery. (13) Endurance forecastle. (14) Azzam
crest span. (15) r164 risen black unpierced. (16) r165 fantail gallery wings. (17) r166
screen glass. (18) r171 quarter-gallery sashes. (19) r171 authored tier fractions. (20)
r172 the 74's lower capstan barrel. (21–23) CLOSED r202–r204. (24) CLOSED r206. (25)
CLOSED r207. (26) NEW: the readiness transient has now cost three whole runs (r206 ×1,
r208 ×2); if the 150 s timeout does not hold it, the next step is in the app — log what
__FRAME_READY waits on in frozen mode and time each stage under load.
