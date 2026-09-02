# Round 194 — the stone takes the record's own station: mid-shank, the institute's reconstruction

## The residual and what the fetch found

The r186 residual (queue position 3): the panokseon anchor-stone's station on the frame
was a DRAWN INFERENCE — "the Taean exhibition reproduction photo replaces it when
fetched." The fetch found three nested sources, each stronger than the one the residual
asked for:

1. **The institute's reconstruction figure** (닻돌 구성 /국립해양문화재연구소, the
   Dec 2023 press release for the anchor-stone report; fetched via atlasnews 7487,
   583×674 px, unscaled — proportions only). It draws the full wooden anchor at a
   grain-ship's bow: stone lashed across the shank's face at its MIDDLE, arms as
   timbers CROSSING the shank with blunt upper ends bracing the stone's underside,
   whipped crossings, carved hook points splayed below, a spreader board, end turns
   plus crossed frapping. Measured on the grid overlay (drawing-grid-2x.png): shank
   head (cable seizing) y≈265, foot y≈650, stone centre y≈427 → **0.57 of the shank
   above the foot** (alternative head-call at the beam gives 0.48; the band carries it).
2. **The report itself**, open on the CHA board: 『한국의 닻돌 — 서해중부해역 출수품 3
   연구보고서』, 국립해양문화재연구소 2023, 195 pp., 127 MB (dachdol-report-2023.pdf,
   saved). Its typology (report p. 185): method ① 닻채 외부에 묶는 방식 — lashing to
   the shank's outside is the leading use for the plank-form (판형) stones — and the
   19th-century 『표민대화』 anchor drawing fixes the stone 닻채 중앙부 (at the shank's
   middle, with a 방살 pin through the shank). **And the report's honesty sentence:
   닻돌이 닻채에 묶인 상태로 확인된 사례가 없어 추측만 — no stone has ever been found
   still lashed on.** Carried as CONTESTED in the provenance.
3. **The 2021 exhibition poster** (kspirit-a.jpg, 600×900): the reproduction's own
   photograph — end turns in the stone's grooves, crossed frapping over the midbody.
   (The report's 그림 2 재현품 is a different, twin-small-stone-at-닻장 type — method
   ③ for small stones; our record's one 2.0 m large-class stone takes method ①.)

The r186 inference said "above the crown" (0.9 m on the 3.2 m shank, frac 0.28). The
record's reconstruction says the middle. The inference was wrong by a quarter of the
shank, and the class change moves it.

## The class change (hull.js, woodAnchor block)

- Stone centre at **ST_FRAC 0.55** of the shank above the foot (class constant, not a
  knob; figure 0.57, 표민대화 "middle", band ±0.12 named).
- Lower frame redrawn to the figure: arms are timbers crossing the shank (blunt limb
  0.70·armM up to the stone's underside, hook limb = record armM below, splay 0.78 rad),
  cone points splayed outward-down (4 cones = record arms, V-ARMS unchanged), rope
  whippings at the crossing, spreader board across the splay.
- Lashing redrawn: 2 groove-turn pairs at the stone ends, 4 crossed frapping turns
  binding stone to shank (the reproduction's form). Names: wa-arm/wa-tip/wa-whip/
  wa-spread/wa-band; wa-shank/wa-cross/wa-stone/wa-cable unchanged.
- Stow, settle-by-box, cable-to-horong: unchanged (the fleet rule r182–r185).
- Record fields unchanged (shankM 3.2, armM 1.2, arms 4, stoneLenM 2.0, stoneSecM 0.3).

## NEW RULE V-WSTATION (audit-hulls.js)

Stone centre projected on the shank's own axis through the stow transforms (foot told
from head by distance from the crossbar), as a fraction of shank length above the foot,
vs the shared constant 0.55, band ±0.12. Never vacuous (builder draws by the same named
constant — the r191/r192 precedent). **This rule convicts the pre-r194 form itself
(0.28, at the crown).**

## Predictions — written before any run

1. **Clean audit on the staged class (:8151 shadow): 33 hulls, 0 problems.**
2. **inj-wa-station** (stone slid to the r186 station, frac 0.28125): exactly ONE
   conviction — V-WSTATION, "stone centre at 0.28 of the shank above the foot".
   V-REST silent (the shift runs along the stowed shank, fore-aft on deck, not into it).
3. **inj-wa-sever** (the four carved points stripped): exactly ONE — V-ARMS, "0 hook
   points drawn — the record hangs 4". Timbers remain; the rule counts cones.
4. **inj-wa-drag** (stone ×1.30 on its long axis): exactly ONE — V-STONE, "stone
   2.60 m through the stow transform, record says 2". The r186 drag proof's honest
   second (stone stabbed through the planking) DISAPPEARS BY DESIGN: the stone rides
   the shank's middle now and the stretch runs along the deck. V-WSTATION silent —
   a scale about the stone's own centre moves no centre.
5. Frames: ship-panokseon moves at the bow (the anchor's own pixels — the stone shifts
   ~0.86 m along the stowed shank, arms change form); expected mover, accept with
   reason, re-shot 0.000. All other frames inert (the class has one member hull).

## Outcomes — runs on the :8151 shadow, staged class, before landing

1. Clean: **33/0** ✓ as predicted.
2. inj-wa-station: **exactly ONE — V-WSTATION 0.28 vs 0.55±0.12** ✓ to the digit.
3. inj-wa-sever: **exactly ONE — V-ARMS "0 hook points drawn — the record hangs 4"** ✓.
4. inj-wa-drag: **TWO, both honest — V-STONE 2.60/2.0 ✓ plus "an anchor through the
   planking, 0.38 m at u 0.04". THE PREDICTION OF ONE WAS WRONG**, and the code is
   right: the stow's 45° roll and the lay rotation map the stone's long axis to a
   45° DOWNWARD diagonal, so a stretched stone digs its lower end through the deck —
   the r186 drag proof's honest second SURVIVES at the new station (my prediction
   had mapped the stone's stowed axis to fore-aft; it is diagonal). Same class as the
   r191→r192 supersession: the prediction is corrected by the geometry, not the
   geometry by the prediction. V-WSTATION silent under the drag ✓ (scale moves no
   centre) and silent under the sever ✓.
