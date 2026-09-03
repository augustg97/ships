#!/usr/bin/env python3
"""r210: the panokseon card — the Beam row carries both of the institute's designs; the
provenance closes the 문헌편 and records the 본문편's chapter VII read. No geometry change."""
import json, sys
P = 'web/data/vessels.json'
raw = open(P, encoding='utf-8').read()
d = json.loads(raw)
v = next(x for x in d['vessels'] if x['id'] == 'panokseon')

# 1. Beam row
OLD_BEAM = ("The maritime institute's 2026 reconstruction design draws the same structure for the turtle ship in her line: "
 "its body plan sets the 상장 33척 across over an upper hull 27척 across at the waist, 3척 a side, and the 1882 register gives that turtle ship's deck as 33척. "
 "The institute calls its drawings a reference model, not a measured ship, and no record gives the panokseon's own hull breadth under its 30척 deck; "
 "at the institute's 3척 a side that hull is 24척, 7.5 m at the 영조척, which is where the drawn 7.6 m sits.")
NEW_BEAM = ("The maritime institute's 2026 reconstruction report designs two turtle ships in her line on the same 27척 upper hull and sets their decks differently. "
 "The 통제영 ship's 상장 is 33척 on its body plan and 33.8척 in its structure table, 3 to 3.4척 a side, and the 1882 register gives that yard's turtle ship a 33척 deck. "
 "The 전라좌수영 ship's 상장 is 27.8척 on both, 0.4척 a side, and no register stands behind that figure: the 도설 says only that the 좌수영 ship's dimensions were nearly the 통제영's. "
 "So the overhang is contested inside the institute's own report, and the institute calls both designs a reference model, not a measured ship. "
 "No record gives the panokseon's own hull breadth under her 30척 deck. The drawn 7.6 m hull follows 김재근's 2.5–3척 and the 통제영 design's 3척; "
 "at the 좌수영 design's 0.4척 a side the hull under a 30척 deck would be 29.2척, 9.1 m, with the deck barely overhanging it.")
rows = v['rows']
beam = next(r for r in rows if r[0] == 'Beam')
assert OLD_BEAM in beam[1], "Beam row text not found"
beam[1] = beam[1].replace(OLD_BEAM, NEW_BEAM)

# 2. cite
OLD_CITE = "the turtle-ship design figures (상장 33척 over 27척) from the same institute's"
NEW_CITE = "the turtle-ship design figures (통제영 상장 33–33.8척 and 전라좌수영 27.8척, both over a 27척 upper hull) from the same institute's"
assert OLD_CITE in v['cite']
v['cite'] = v['cite'].replace(OLD_CITE, NEW_CITE)

# 3. provenance appendix
APP = (" THE 문헌편 CLOSED, r210: the volume's remaining panokseon-bearing documents read whole at 113 dpi (pdf 7–12 and 123–127). "
 "태종실록 태종 13년 2월 5일 (1413): the king, passing the 임진도 ferry, watches a 귀선 and a 왜선 fight a mock action. "
 "태종 15년 7월 16일 (1415): 탁신's sixth point on the defences, 龜船之法 衝突衆敵 而敵不能害, with the order to build it sturdier and more skilfully. "
 "선조실록 선조 25년 6월 21일 (1592): the 옥포–사천–당포–한산–안골포 campaign, the turtle ship first sent in at 사천 on 5월 29일 to fire its 총통 and burn the enemy ship. "
 "당포파왜병장, 이순신's 1592 report: 別制龜船 前設龍頭 口放大砲 背植鐵尖 內能窺外 外不能窺內, the one contemporary description of the ship, "
 "and at 당포 倭船大如板屋者九隻 — nine Japanese ships as large as a panokseon, one carrying a 층루 three to four 장 high, under which the turtle ship's dragon mouth fired 현자 shot upward. "
 "견내량파왜병장 and 조진수륙전사장: the turtle ship charges first and the panokseon follow (龜船先突 板屋次進), and a fleet of some 250 ships proposed by province. "
 "난중일기 1592.2.27, 3.27 and 4.12: the turtle ship's gun trials. None of these documents carries a dimension of either ship. "
 "The one comparative size in the primary record is the 당포 sentence, the Japanese great ship as large as a panokseon. "
 "The name 귀선 is two centuries older than the panokseon: the 1413 and 1415 ship is a different vessel of the same name, and the report prints it first. "
 "THE 본문편 VII READ, r210 (pp. 210–214 and 227–232 at 113 dpi; the body-plan labels of pp. 111 and 213 confirmed at 300 dpi): the report's second design, the 전라좌수영 turtle ship. "
 "표 28 (p. 212) repeats the 통제영's hull figures exactly — 전장 113, 본판장 64.8, 본판요광 14.5, 상요광 27 — and lowers the hull sides (선요고/현요고 8.0/7.5, 선두고 and 선미고 8.5, against 9.0/7.5 and 9.5/9.0) under a taller whole (전고 22.5 against 20.5). "
 "Its body plan (그림 196, p. 213) labels 27.8척 (상장광) over 27척 (상요광), and 표 29 (p. 230) prints 상장 요광 27.8척, 두광 20.4, 미광 13.8, with 13 crossbeams, 8 oars a side worked from a lowered 포판, 10 개판 ports and 6 bow ports a side. "
 "The 통제영's own table, 표 7 (p. 135), prints 상장 요광 33.8척, 두광 26.4, 미광 20.5, 15 crossbeams, 10 oars, 22 방패 ports and 12 doors a side, 12 개판 ports — 0.8척 over its body plan's 33. "
 "The crossbeams of both designs run past the 상장 edge: 가목 34.3척 under a 33.8척 deck (표 8, p. 136) and 28.6척 under 27.8 (표 30, p. 231). "
 "So one report sets the 상장 overhang at 3 to 3.4척 a side for the 통제영 ship and 0.4척 a side for the 좌수영 ship, on identical hull figures. "
 "The 통제영's 33 has the 1882 register behind it; the 좌수영's 27.8 has no register, only the 도설's sentence that the 좌수영 ship's dimensions were nearly the 통제영's. "
 "The Beam row now states both. With this read the research residual on this card is closed.")
h = v['hull']
assert h['jeonseoProvenance'].endswith("Neither painting changes a number on this card.")
h['jeonseoProvenance'] = h['jeonseoProvenance'] + APP

out = json.dumps(d, ensure_ascii=False, indent=1)
open(P, 'w', encoding='utf-8').write(out)
print("edited; bytes", len(raw), "->", len(out))
