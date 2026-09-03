## Round 210 — 2026-09-03 — the 문헌편 closed, and the 본문편's second design read: one report, two overhangs, and the card says both

**Queue check first: August's second list stands WORKED IN FULL (r57). r209's residual 1 was
the head task — close the 문헌편 and scan the 본문편's chapter VII for a second 상장/hull pair —
and it is DONE; the research residual on the panokseon card is closed with it, and the vessel
survey carries the task again from r211.**

**The 문헌편 closed (pdf 7–12 and 123–127 rendered at 113 dpi, build/staging/r210/munheon/;
page-by-page record in r210/JUDGMENT.md).** 태종실록 1413: the king at the 임진도 ferry watches
a 귀선 and a 왜선 fight a mock action. 1415: 탁신's sixth point, 龜船之法 衝突衆敵 而敵不能害, and
the order to build it sturdier. 선조실록 1592.6.21: the campaign as the court recorded it, the
turtle ship first sent in at 사천. 당포파왜병장: 別制龜船 前設龍頭 口放大砲 背植鐵尖 內能窺外
外不能窺內, the one contemporary description; and 倭船大如板屋者九隻 — nine Japanese ships at
당포 as large as a panokseon, one carrying a 층루 three to four 장 high — the primary record's
one comparative size for her. 견내량·조진수륙전사장: 龜船先突 板屋次進, the 250-ship fleet by
province. 난중일기 1592.2.27/3.27/4.12: gun trials. No dimension of either Korean ship in any of
them, as r209 predicted. The 1413/1415 귀선 is a different vessel of the same name, two centuries
before the panokseon.

**The 본문편's chapter VII (pp. 210–214, 227–232 at 113 dpi; the body-plan labels of p. 111
and p. 213 CONFIRMED at 300 dpi, r210/bonmun/p111-labels-crop.png and p213-labels-crop.png).**
표 28 (p. 212) gives the 전라좌수영 turtle ship the 통제영's hull figures exactly — 전장 113,
본판장 64.8, 본판요광 14.5, 상요광 27 — with lower sides (8.0/7.5 at the waist, 8.5 at the ends)
under a taller whole (전고 22.5). Its body plan, 그림 196, labels **27.8척 (상장광) over 27척
(상요광)**, and 표 29 (p. 230) prints 상장 요광 27.8척 outright — 0.4척 a side. The 통제영's own
table, 표 7 (p. 135), prints 상장 요광 **33.8척** against its body plan's 33 — 3 to 3.4척 a side.
The crossbeams of each design run past its 상장 edge: 가목 34.3척 under 33.8 (표 8), 28.6척
under 27.8 (표 30). So one report sets the 상장 overhang at 3–3.4척 a side on one turtle ship
and 0.4척 a side on the other, on identical hull figures. The 통제영's 33 has the 1882 register
behind it; the 좌수영's 27.8 has none — the 도설 says only that the 좌수영 ship's dimensions were
nearly the 통제영's. r209's Beam-row sentence was true of one of the institute's two designs.

**The edit (web/data/vessels.json, panokseon only; before-copy r210/vessels.before.json;
r210/edit-card.py):** the Beam row's two institute sentences replaced by six that state both
designs, the register behind one and not the other, the word contested, the reference-model
bound, and the two hulls that follow — 24–25척 (7.5–7.8 m) at 김재근's 2.5–3척 and the
통제영's 3척, where the drawn 7.6 m sits; 29.2척 (9.1 m) at the 좌수영's 0.4척, with the deck
barely overhanging it. The cite names both designs' figures. jeonseoProvenance gains THE 문헌편
CLOSED, r210 and THE 본문편 VII READ, r210. **No geometry change:** hull.beam 7.6 and
gunDeck.over 0.9 stand on the panokseon-specific scholarship (김재근's 2.5–3척, the feature only
the panokseon has) and on the one design with a register behind it; the 좌수영's near-flush
상장 is a roofed ship's choice, oars worked from a lowered 포판, with no register and no
panokseon claim — stated as the contest it is, not drawn.

**Witnessed (rule 1): r210/card-row-witness.png — the amended Beam row scrolled into view and
read whole on screen, all six new sentences legible; the DOM check found the row first
(rendered in DOM: beam True).**

**The close ratchet, RUN WHOLE in one attempt (build/staging/r210/close-ratchet.out,
11:40:34 → 12:21:43): 64 frames, all within tolerance, exit 0, zero movers — ship-panokseon
0.000% / 0.000, ship-galleass 0.000%, ship-sekibune 0.000%, shipwright 0.000%; globe-default at
its documented 0.046% / 0.011 flap a tenth round. The Beam row sits below the card's fold in the
baseline frame, so the text edit cannot move a committed frame; its rendered check is the witness
screenshot. Pace ~39 s a frame under load 7–15 (18 frames at 11:52, 34 at 12:02, 49 at 12:12);
the load was the ratchet's own chromium plus the desktop's mediaanalysisd and a Chrome renderer,
checked with ps at 11:40. No readiness abort at timeout 150 s. Rule 0 answered on ship-panokseon,
read whole from _current: it reads as a rendered world — a timber warship on open blue-grey water
under a pale sky with a hill line on the horizon, two battened lug sails drawing, the railed
pavilion under its hipped roof aft, nine oars a side working from under the deck edge. Three
facts a viewer can read off it without a legend: the stat block prints 32.0 m length overall and
7.60 m beam, the hull's own; the fleet list and the strip place her 14 of 33 between the galleass
and the sekibune; the fighting deck stands proud of the narrower planked hull with six dark
gunports a side cut low through its bulwark, muzzles standing out, over the row of square ports
through the closed sangjang belt.**

**Gates: audit 33/0 (r210/audit.out, on the edited tree, before the ratchet). Build after
the run, the r207 order. Stamp and push receipt below.**

**Named residuals, in order (r209's list, renumbered):** (1) CLOSED this round — the
panokseon's research residual. The 수군조련도 anchor read stays a museum fetch (증8190
e-museum); the 판옥선 학술연구 보고서 (2021) stays a named fetch candidate (the 재현선 너비
8.74 m datum); the 당포 sentence (倭船大如板屋者九隻, the 층루 3–4 장) is a candidate for the
sekibune card's size row if that card ever carries the atakebune beside it. (2) HEAD, r211:
**the vessel survey carries the task again — the boxy classes (old 11) first: top (18),
channel/cheek/cathead.** (3) Kozushima 1993 weighing (print-only stands). (4) r187 emaki
plate. (5) r182 grapnel shank — retry from a cooler week. (6) r177 Lucian's second machine.
(7) r173 cog Gangspill. (8) r173 cog rudder slab. (9) r176 sekibune class-size (kiwari read).
(10) Preussen mast livery. (11) Endurance forecastle. (12) Azzam crest span. (13) r164 risen
black unpierced. (14) r165 fantail gallery wings. (15) r166 screen glass. (16) r171
quarter-gallery sashes. (17) r171 authored tier fractions. (18) r172 the 74's lower capstan
barrel. (19) the readiness transient: no abort this round at timeout_ms 150000 under load 7–15; keep the r208 rule (read
uptime, no browser work while a run is up) and leave the in-app readiness log as the next step if
it aborts again.

**Build PUBLISHED, data-version 1788463330, first paint 8.53 MB of 8.6, docs/ 155 files;
web/index.html carries the same stamp and is in this commit's path list (the r209 rule). Push
receipt and live stamp: appended below after the push, per the r198 rule.**
