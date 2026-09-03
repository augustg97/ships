# r209 — the 본문편's panokseon-relevant plates read, and the Beam row gains the institute's 3척 as a class witness

## The head task (r208's residual 1), done in full

Read at 113 dpi from build/staging/r204/geobukseon-bonmun.pdf (book page = pdf page; the TOC
plate at pdf 6 prints 6 in its margin), r209/bonmun/ii-041..046.png and r208/bonmun/vi-110..112.png:

1. **pp. 41–42, II.2.3) 이순신 종가 귀선도.** Two drawings (그림 3, 그림 4), private (최순신 종부),
   on deposit with 국가유산청 현충사관리소. Undated; the report puts them at about 1800 from
   their manner, which is the 전서 도설's. Its judgment: a later iconographic source, the 도설's
   standard image carried on in family transmission, not independent contemporary evidence.
   The 귀선송 inscription above 그림 3 gives 본판장 10파, 너비 5파, 선체 길이 13파, 원문 26 —
   read by the report as a later rough understanding of scale. Nothing here bears on the
   panokseon's beam.
2. **pp. 44–45, II.2.5) 2004년 미국 뉴욕 공개 거북선도.** 176 × 240 cm on silk, private, four
   turtle-headed warships with panokseon and small craft around them. The report's four
   objections: the lower-left inscription quotes 한치윤's 해동역사 (1823) almost verbatim, so
   19th century or later if contemporaneous with the painting; the firearms drawn (수노기,
   불랑기) are 19th-century types; pigment analysis shows early mineral colour under later
   overpainting, and Japanese-manner passages; a Georgia University radiocarbon date of
   ~300–350 years is therefore not the painting's date as it stands. Ranked a later visual
   reconstruction, a supplement to the primary texts. The one sentence for this card: the
   painting draws the hull body and the 상장 as visibly separate structures, "선체와 상부
   구조의 분리가 시각적으로 강조된다" — and the report says at once that this may be the
   painter's convention and not the ship. Carried on the card with that caveat.
3. **pp. 110–112, VI.1.2) 선형 and the start of VI.1.3) 구조.** The 통제영 turtle ship is
   built on the 판옥선-line warship's construction; hull form chosen for low-speed stability,
   turning and upper fighting space over wave-passing; upper deck sheer kept gentle for the
   guns, the men and the oars; bottom a hybrid flat form with 밑들기 ~1.2척 at the bow and
   ~1.0척 at the stern, mid-body flat. 그림 67 (정면 선도): 33尺 (상장광) over 27尺 (상요광),
   20.5尺 전고, 9.0/7.5尺 선요고/현요고 — the 상장 rides 3척 proud of the upper hull a side.
   표 6 fixes 상요광 27 as 상포판 중앙 부분 폭, the upper deck plank's mid breadth, i.e. the
   hull's breadth at the gunwale where the deck plank lands. 그림 68 the sheer and half-breadth
   plans. VI.1.3: the 본판 follows the 도설's 64척 8촌 / 12 / 14척 5촌 / 10척 6촌, 10 rows,
   through-pegged (장삭).
4. **p. 128 foot line** — CONFIRMED at 300 dpi in r208 (p128-dims-crop.png): 1 尺 = 31.22 cm.
   Nothing more to do.
5. **The report's own bounds, read this round from its 일러두기 (pdf 2):** the 도설 is a
   compilation 200 years after the war; the design is a 학술적 참조 모델 that tests functional
   possibility, not the absolute original; the drawings are 추정 설계도 reconstructed by
   analysis, not measured drawings. And from pdf 3 §5: 척·촌 base units with SI beside.
   Cover: 전통 선박 조선 기술 Ⅷ, 학술총서 제91집 — the SAME series number as the 문헌편, the
   two volumes of one report.

## The edit (web/data/vessels.json, panokseon only; before copy at r209/vessels.before.json)

- **Beam row**, two sentences inserted before "Length to beam": the institute's design draws the
  same structure for the turtle ship in her line — 상장 33척 over an upper hull 27척 at the
  waist, 3척 a side, and the 1882 register gives that turtle ship's deck as 33척; the institute
  calls its drawings a reference model, not a measured ship; no record gives the panokseon's
  own hull breadth under its 30척 deck; at 3척 a side that hull is 24척, 7.5 m at the 영조척,
  where the drawn 7.6 m sits. The word "derived" on the hull breadth stays: this is a class
  witness from a design, not a measurement.
- **jeonseoProvenance**, appendix "THE 본문편 READ, r209": the volume named whole (series,
  bytes, page count, image-only), the three reads above summarised with the report's own
  bounds, the p.128 foot, and the closing line that neither painting changes a number.
- **cite**: the 본문편 named as the source of the 33/27 figures.
- No geometry change. hull.beam 7.6 / gunDeck.over 0.9 stand as r208 set them; the ratio
  24.4/30 = 0.81 against the institute's 27/33 = 0.82 was already noted in r208 and is now
  on the card in words.

## Gates

- Audit 33/0 (audit.out), run on the edited tree.
- Witness: the sentence found in the DOM (rendered in DOM: beam True). The first screenshot
  showed the card head only — the rows sit below the history text at 1600 px — so the script
  now scrolls the Beam row into view; re-run after the ratchet (r208 rule: no other browser
  work while a ratchet runs). See card-row-witness.png.
- Ratchet: launched 10:30:22 under load 25 (mediaanalysisd at 200% — the desktop's own photo
  indexing, not this round's work). Result appended below.

## Ratchet result (close-ratchet.out, 10:30:22 → 11:12, one attempt, ran whole)

64 frames, ALL within tolerance, exit 0. Zero movers: ship-panokseon 0.000% / 0.000,
ship-galleass 0.000%, ship-sekibune 0.000%, shipwright 0.000%; globe-default at its
documented 0.046% / 0.011 flap, a ninth round. The Beam row sits below the card's fold in the
baseline frame (the rows begin under the history text), so a text-only edit there cannot move a
pixel of any committed frame — the witness screenshot is the row's only rendered check, and
it was taken with the row scrolled into view. Pace under load: ~39 s/frame (48 frames at
11:01, 62 at 11:11); the load of 25–56 through the run was the ratchet's own headless
chromium at 540% plus mediaanalysisd, not leaked work — checked with ps at 10:51. No
readiness abort this run at timeout_ms 150000.

## Rule 0, answered on ship-panokseon (_current, read whole after the run)

Reads as a rendered world: a timber warship on open grey-blue water with a hill line on the
horizon, two battened lug sails drawing on their masts, the commander's railed pavilion
under its hipped roof aft, nine oars a side working from under the deck edge, the hull's
raked planked belt with the sangjang's small square ports cut through it. Three facts a
viewer can read off it without a legend: the stat block prints 32.0 m length overall and
7.60 m beam, the hull's own; the fleet list and the strip place her 14 of 33 between the
galleass and the sekibune; the fighting deck stands proud of the narrower planked hull with
dark gunports cut low through its bulwark, six a side, muzzles standing out of them.

## Build

python3 build/build_site.py: PUBLISHED, data-version 1788459189, first paint 8.53 MB of
8.6, docs/data compacted 0.67 → 0.59 MB, 155 files.
