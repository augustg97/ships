# r207 — the datum and the foot, answered from the card's own cite; the 1882 row drafted; no tree edit

## Shape of the round, decided at open

Residual 25 demanded the FULL 64 run whole before any edit, and the wrapper's 80-minute
kill does not hold two full runs (~43 min each measured this round). So the round is the
r204 shape: the full 64 on the untouched tree (opening run = the whole-set pass r206
could not produce), the head task's two questions answered by research, the card edit
drafted and staged, no rendered change, close attributed to the same run under the
nothing-rendered-moved condition. r208 makes the edit and closes whole.

## The datum question — ANSWERED, and it is not the answer the row implies

The card's ~32 m and 9.4 m were traced to their source. r89 took them from Hong Sun-jae
2025 (군사 135) — and the paper itself is now fetched (hong2025.pdf, 2.56 MB, 44 pp,
KCI's own PDF route with browser headers; the bare curl gets a block page). Hong's
<표 5> (판옥선 크기 추정, p. 100, read whole from hong-22.png) estimates the Imjin-era
통제사 대선 from the 비변사등록's 14把 bottom (70척), scaling the rest from the
귀선도설/각선도본 proportions:

    본판장 70척 · 본판요광 15.4척 · 상갑판장 103척 · 상장두광 21.6척 ·
    상장요광 30척 · 상장미광 15.4척 · 방패고 5.3척 · 노 20 · 돛 2

At the 영조척: 103척 ≈ 32.1 m and 30척 ≈ 9.2–9.4 m. **The card's ~32 m is the
상갑판장 (upper-deck length) and its 9.4 m is the 상장요광 — the FIGHTING DECK's waist
breadth, not the hull shell's.** No hull-at-sheer breadth appears in 표 5 at all.

The deck-over-hull structure is the record's own: 김재근 (우리 배의 역사, 1984, p. 95,
quoted by Hong p. 107): the 가목 ends stand 2.5–3척 proud of the planking each side and
the 상장's breadth between the 현란 rails runs **5–6척 wider than the hull's planking**
— "이것은 판옥선만이 가지는 특징." 신경준's 병선론 (여암전서 권18, quoted in Hong's
fn 24: 駕木頭出兩邊, 船舷外各三尺) PROPOSED the full 3척 projection; Hong reads the
각선도본 drawing as projecting less before that. And the institute's own 2021 재현선
partly closes the loop: published 길이 32.16 m · 너비 8.74 m · 높이 5.56 m · 140.3 t —
the 32.16 is exactly the 각선도본's 상장장 105척 at 30.63 cm/척. The 너비 8.74 m is
28.5척 — no single 각선도본 breadth (bottom 18.4척 = 5.6 m, deck 39.7척 = 12.2 m); it
reads as the hull shell's breadth at the sheer, but then the implied overhang is 5.6척 a
side, double 김재근's 2.5–3척. Its datum is stated only in the reconstruction's own
report (판옥선 학술연구 보고서, 2021 — unfetched); the tension is named, not resolved.

**Model consequence (r208, geometry + card together):** `hull.beam: 9.4` draws the HULL
SHELL at the deck's breadth, and `gunDeck.over: 0.5` then rides the deck out to ~10.4 m.
Under the card's own cite the Imjin ship is: hull shell ≈ 24–25척 (~7.5 m), deck 30척
(~9.4 m), over ≈ 0.8–0.9 m a side. The drawn shell is ~1.9 m too beamy and the drawn
overhang half the record's. Fix and row amendment must land together — amending the Beam
row's datum alone would make the card contradict the drawn hull on screen. Run
measure_ship.py --ship panokseon first for the before numbers, then beam → ~7.5,
gunDeck.over → ~0.9, oar geometry re-checked (oars work through the beam-end gap; Hong
puts 노 at 20 = 10 a side, the card's own top of band).

## The foot question — ANSWERED as far as the record answers it

Three legs, none of them judgement:

1. **The register shares the 도설's foot.** 1882 귀선 본판 67척 vs 1795 도설 저판
   64자8치 — same yard, same class, 87 years apart, within 3.4% in any single foot. And
   the 1882 일전선 IS the 각선도본 전선 within 촌s (90/18/15/12/105/39 vs
   90/18.4/15/12.7/105/39.7 — Hong 표 3, read whole from hong-20.png, matches the plate
   mangi300-136.png column for column on 우별선 and 귀선). Whichever foot the yard
   measured with, it held it across the whole line of records.
2. **The card's cite converts at the 영조척 family.** Hong's own text works at
   척 ≈ 30 cm in both directions (7.5자 = "약 225㎝", p. 93; 김재근's 흘수 3척 = 90㎝,
   same page), and the 2021 재현선's 32.16 m = 105척 × 30.63 cm exactly (the revised
   영조척 value).
3. **The contest carries formally.** The register itself names no foot. The 1795 row's
   printed contest (영조척 31.2 vs 주척 20.8 — 남천우's argument) applies to any 척
   record of the class, so the row prints both conversions, as the 1795 row already
   does, and lets the record's own institution's working conversion (leg 2) stand
   beside them. No sentence claims the register names what it does not.

## The drafted row (r208 inserts after "Hull record, 1795")

["Hull record, 1882", "the class's one measured dimension set: in 1882 the 통제영
rebuilt three of its ships — the flagship jeonseon, a second warship, and the yard's
turtle ship — and sent the finished dimensions to the government as a survey register,
the 척량성책 in the 통제영계록 for Gojong 19. The jeonseon: bottom 90척 long by 18척
across, sides 11척 high, fighting deck 105척 by 39척. The turtle ship: bottom 67척 by
13척, sides 13척, deck 88척 by 33척. These are measured ships after rebuild, not a
specification — and they are the drawn 각선도본 jeonseon's numbers within a few 촌, a
century apart: the yard held its dimensions. At the 영조척 of 31.2 cm the jeonseon's
deck is 32.8 × 12.2 m on a 28.1 m bottom; at the 주척 of 20.8 cm, 21.8 × 8.1 m on
18.7 m — the same contested foot as the 1795 row, and the register names none. The
turtle ship's 67척 bottom against the 1795 도설's 64자8치 agrees within 4% in any one
foot — the two records share whichever foot the yard used. Every breadth here is the
bottom plank's or the fighting deck's; the hull's own beam at the rail is in neither
record."]

Plus a jeonseoProvenance appendix clause naming: 각사등록 통제영계록 고종 19 (1882),
광서 정월 15일, read at 300 dpi from 문헌편 pdf 136–137 (mangi300-136.png r206,
mangi300-137.png r207); cross-checked against Hong 2025 표 3 (hong-20.png). And the
Beam row amendment WITH the geometry (above).

## Also fetched and staged

- hong2025.pdf/.txt — the card's primary cite, now in the tree for the first time.
  Sections not yet mined: the oar-form argument (표 1, ⓐ–ⓔ), the 무경총요 누선/몽충
  comparison, 도면 3–4 (가룡·가목 배置圖).
- 판옥선 학술연구 보고서 (국립해양문화재연구소 2021) EXISTS as a published volume —
  the reconstruction's own report, not fetched; the 국가유산청 press page carries the
  headline dimensions. A future fetch candidate on the same academic-report route as the
  거북선 volumes.

## Gates this round

Opening 64 RUN IN FULL on the untouched tree (open-ratchet.out) — residual 25's own
condition. Audit after the run. No app edit; close attributed to the opening run under
the nothing-rendered-moved condition, git status the witness. Build, commit, push, live
stamp verified — the r198 rule: read the push log the same round.
