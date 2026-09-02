# Round 202 — residual 1 closed on the whole board, residual 21 retired, residual 4 attempted and named

## Residual 1 — the 2024 Mado 발굴 report: fetched whole, mined, verdict NO

Fetch: nttId 4033, FILE_000000000055886/1, plain GET with browser UA + info-page
referer, 139,821,517 bytes on disk byte-exact against infoData — the last
unfetched report on the r200 board. >100 MB class: gitignored by name, disk only
(build/staging/r202/mado-balgul-2024.pdf).

The report covers the 10th excavation (2023 season): the 18-D full-clearance
grid (600 ㎡), 19-D-south trial trenches, and the 23-A trial grid (1,000 ㎡ of a
planned 3,000 — the report itself says the season ran short; 23-B/23-C were not
dug). Catalogue: 50건 51점 raised (the 맺음말 says 51건 52점 — the report's own
two totals disagree by one; both counted this round). Ceramics 47건, metal 2
(bronze spoon, silver hairpin), wood 2 catalogued:

- 마도23-51, 조형목제품 (bird-shaped wooden object), 10.7 × 58.8 × 4.0–8.8 cm,
  2,040 g — no fixing grooves, use unknown (the report's own judgment).
- 마도23-52, 선체편 (hull plank), remnant 110.3 × 34.6 × 9.0–16.0 cm, 34 kg,
  pine, A.D. 1060–1180 — the season's one ship timber, judged possibly of the
  마도 1–3호선 horizon.

**Ground tackle: NOTHING RAISED INTO THE CATALOGUE.** 석재류: 유물 0건 0점,
매몰 11건 20점 (2.86%) — stones seen, counted, and left on the seabed, no
dimensions recorded. The dive diary notes one 닻돌 raised at 23-A-3 line 1
(2023-05-08) and 닻돌 sightings at 23-6 and 23-A-8, but no stone entry exists
in the catalogue; the raised stone appears nowhere with dimensions. 닻가지 /
닻채: zero mentions in the whole text layer. No insert forms, no 결구부.

**Consequences, board-wide.** The arms census closes over the LAST report:
진도-641 stays the only whole-run arm record (Ⅰ one arm, Ⅱ one fragment,
Ⅲ/Ⅳ none, 2017 Mado the articulated pair, 2021 Mado none, 2024 Mado none) —
ARM_LEN 1.90 / ARM_SEC 0.196 now stand against every published report the
board lists. 마도해역-212 keeps the junk's record; the scale contest stays
closed. 명량21-17 (458 kg, the panokseon's r201 stone) stays the largest
lashed-form stone in anything fetched.

## The board moved: two reports no round has seen (posted 2025-11)

Found via the listData sweep this round (the info4033 nextPrev chain named
송호리 first):

| report | nttId | atchFileId | posted | state |
|---|---|---|---|---|
| 해남 송호리1호선 수중발굴조사보고서 | 4300 | FILE_000000000056217 | 2025-11-06 | coordinates recorded, NOT fetched |
| 해남 송호리1호선 과학적 분석 보고서 | 4297 | FILE_000000000056213 | 2025-11-04 | coordinates recorded, NOT fetched |

Songho-ri No. 1 is the Haenam wreck — a new hull for the Korean tradition, and
its excavation report may catalogue ground tackle. Sizes unknown: the fileDown
route answers a range GET with a 1,240-byte egov error page for both files
(with UA + referer that served the 140 MB Mado GET this same round) — the next
fetch round should use a PLAIN GET, and probe fileSn 0/1.

## Residual 4 — the grapnel shank record: ATTEMPTED, still standing

Every open path tried this round, named per the r182 rule:

- jewelofmuscat.tv is LIVE again (r182 found it 404) — but it is a 2015+
  WordPress relaunch: full sitemap read (193 URLs), no construction diaries,
  no build record; the story/education pages carry no anchor content (every
  "anchor" hit on the fetched pages is FontAwesome/TOC CSS boilerplate).
- The project's own book (JoM2015_en.pdf, 7.5 MB, fetched whole, on disk this
  round) is the 128-page voyage narrative — anchor appears only in sailing
  prose, no dimensions.
- Vosmer et al. 2011, PSAS 41 "The Jewel of Muscat Project" — Archaeopress OJS
  serves a login wall (subscription or purchase; the open-archive assumption
  was wrong); JSTOR gated; the academia.edu copies (16557355, 105219988) are
  login-gated and were not automated past the wall. The paper's own figure
  list (10 figures, read from the public page) shows no anchor figure.
- Vosmer 2009 RINA Historic Ships "Puzzles, Problems and Solutions" —
  ResearchGate-gated only (DOI 10.3940/rina.hist.2009.05).
- The ORIGINAL site's construction diaries: web.archive.org answered 429 to
  every request this round (CDX and /web/ both), archive.ph 429, the memento
  aggregator empty. Not reachable from this IP this round; retry another
  round.

The 1.8 m shank stands as what r182 drew it as: a stated reconstruction,
named in the provenance. No change to the dhow.

## Residual 21 — eraSm's dead fallback: RETIRED (the round's app change)

Predictions written first (PREDICTIONS.md); all landed:

- P1 audit 33/0 before and after (audit-before/after.json). ✓
- P2 string-exact both ways: OLD in-page proof rendered the predicted 180-char
  first paragraph when chapter 3's lede was deleted
  (proof-old-behaviour.json); NEW code renders "" — empty, the honest unknown
  (proof-new-behaviour.json). ✓
- P3 all 8 real chapters render byte-identical (all8: true × 8, both proofs). ✓
- P4 solo close checks on the five frames that fetch the line: globe-default
  0.046%/0.011 (its documented capture flap), globe-crossing, globe-steam,
  globe-modern, globe-era-card all within tolerance. No baseline moved, no
  accept needed. The full-64 debt is NAMED: owed to the next round's opening
  check, the r199 → r200 pattern. ✓

The change: app.js:1353 `innerHTML = ch.lede || (ch.text||'').split('\n\n')[0]`
→ `textContent = ch.lede || ''`. Two retirements in one line: the unlabelled
first-paragraph substitute goes (a chapter without a lede now renders an empty
strip, rule 10), and the raw-HTML surface goes (lede is contracted plain text
under the title sweep, r181 — if a future lede needs italics, spend markdown
here and move it out of the sweep).

Rule 1: the globe-era-card capture read by eye (z-globe-era-card-small.png) —
the lede strip renders under the era tabs exactly as before. Rule 0, answered
on the same capture: the frame reads as a rendered world, not a chart. Three
facts a viewer can read off it: the Khufu ship, buried beside the Great
Pyramid about 2560 BC, is 43.6 m of cedar with no keel and no frames, sewn
plank to plank; the Uluburun cargo was 354 copper ingots (10 t) and about a
tonne of tin, c. 1320 BC; the era strip runs Crossing 70,000–8,000 BP to
Containers 1950–2026 with Reed & Plank lit at 2,000 BC, and the era's voyage
list places Hatshepsut's fleet to Punt at 25°N 35°E.

## Frames — the attribution chain, stated

No opening 64 ran. r201's close ratchet PASSED IN FULL on this HEAD's code
(a5455aa; exactly one accepted mover, logged), and between that exit and this
round's first edit only build/loop.log changed (git status read at round
start). This round's one web/ edit is the app.js line above, verified inert on
live data three ways: byte-identical render proven in-page (P3), the five
fetching frames checked solo (P4), and the line's only consumer is the era
readout. The next round opens with the full 64 and this attribution is the
prediction it tests.
