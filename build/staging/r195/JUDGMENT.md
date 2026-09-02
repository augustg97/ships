# Round 195 — the wooden anchor takes its form study: the shank derived long, the modern crossbar dies

The r194 head residual: fetch 홍광희 2013, 「전통 나무닻의 생김새 연구」, 『해양문화재』 6
(국립해양문화재연구소), pp. 107–143 — the 2023 report's own cited form study — and replace
the drawn frame defaults with measured proportions.

## The fetch

FOUND AND SAVED, from the institute's own journal board (seamuse.go.kr academiccultural
info/2654, board fileDown FILE_000000000053466/5 — the SPA hides the links; the listData
JSON carries them): `hong-2013-namu-datch.pdf`, 6.4 MB, 36 pp., scanned (no text layer),
read visually page by page. Bonus: 홍광희 2012 master's thesis (한국 전통 닻돌의 생김새와
쓰임새 연구, 조선대) fetched open from OAK (js-challenge cookie needed), 91 pp. — the
lashing experiments and island interviews behind the 2023 report's methods ①②③.

## What the study holds (no numeric table — a typology; its findings are structural)

1. **The shank was made LONG against oak's buoyancy**, with the stock set at the ARMS'
   top height — "닻가지 위와 비슷한 높이에 설치하고 나무닻의 부력을 고려해 닻채를 길게
   제작" (p. 132, repeated in the 맺음말). Modern anchors wear the stock at the cable
   end; the tradition did not.
2. **A wooden crossbar beside a stone stock is redundant** (his footnote-8 position; his
   own schematics 그림 16/17 draw one stock or the other, never both). CONTESTED in the
   same footnote: some argue both were fitted so the stone could not spin on a round
   shank — carried in provenance, not drawn.
3. Korean plank-form stones sat "조금 더 닻채 위쪽" — further up the shank (p. 133),
   consistent with ST_FRAC 0.55.
4. **Two treenails per separately-made arm joint**: artifacts ④ (Jindo) and ⑥ (Gwangyang
   Seonso) each carry two square peg holes; the 표민대화 anchor is drawn with two 나무못.
5. V-crotch one-piece construction (3 of 9 recovered pieces); arm inner faces worked
   flat; crowns thick relative to arms (⑨ — already drawn, foot/arm dia ratio 1.8).

## Measurements (rule 4)

- r194's figure numbers REPRODUCE on drawing-anchor-3x.png: shank (seizing top y≈95 to
  foot y≈1235) 1140 px; stone x≈155–735 = 580 px → **stone/shank 0.51**; stone centre
  y≈580 → **0.57 above the foot**. (First read of the 2x grid crop suggested ~1.0 — the
  grid crop cuts the anchor at the crossing; the foot call there was the image edge, not
  the foot. Measured on the full 3x crop, the residual's 0.51 stands.)
- Crossing station on the same crop: whipped crossings centre y≈830 → **0.35 above the
  foot** (r194 drew 0.30, a choice not a measurement; the class takes the measured 0.35).

## The class change (hull.js woodAnchor — class, not instance)

- `ST_RATIO 0.51`: **shankL = shankM || stoneLenM / 0.51** → 3.92 m on the recorded
  2.0 m stone. The record's shankM 3.2 was a DRAWN CLASS DEFAULT by the provenance's own
  words — the field is dropped from the record so the derivation rules; a real fetched
  shankM would outrank it.
- **The crossbar (wa-cross) dies**, with its record field crossM: it sat at the modern
  head station (frac 0.91) that Hong 2013 explicitly distinguishes from the tradition's,
  and the stone is this anchor's 닻장 (the report's 석제 닻장). The institute's figure
  draws none.
- **Head seizing** (wa-seize ×3): the figure whips the cable's bend onto the shank head.
- **XA_FRAC 0.35**: the crossing station measured, not chosen. The **blunt limb is now
  DERIVED** — crossing to the stone's underside — so the arms brace the stone at any
  shank length (r194's fixed 0.70·armM breaks the bracing the moment the shank grows).
- **Two treenails (wa-peg) through each crossing**, axis on the pair's normal — ④⑥ and
  표민대화.
- Record: shankM and crossM removed; provenance rewritten (Hong 2013 named, the
  derivation named, the crossbar's removal argued, footnote 8 CONTESTED); card gains the
  "Ground tackle, as drawn" row (residual 22).

## Audit changes

- **V-CROSS dies** (all three crossbar checks — they ENFORCED the modern station off a
  dictionary gloss; the form study outranks the inference).
- **V-WSHANK (new)**: drawn shank length (geometry × world scale) vs shankM ||
  stoneLenM/0.51, ±12%. Never vacuous — builder and rule share ST_RATIO — and the
  pre-r195 default (3.2 on the 2.0 stone, 18% short) CONVICTS.
- **V-WSTOCK (new)**: no timber member between the stone's top (fracW+0.10) and the
  head; rope exempt by name (wa-seize, wa-band, wa-whip, wa-cable). The pre-r195
  crossbar (frac 0.91) CONVICTS.
- **V-WSTATION re-anchored**: foot told from head by the hook points' centroid (was: by
  the crossbar, which no longer exists).

## Predictions — written BEFORE the shadow runs

1. **Clean on :8151 shadow (staged hull.js + audit + vessels.json): 33 hulls, 0
   problems.** The new shank draws 3.92 = derived exactly; stone at 0.55; nothing but
   rope above the stone.
2. **inj-wa-shank** (wa-shank mesh scaled ×0.8163 about its centre → drawn 3.20 m):
   exactly ONE — V-WSHANK, "shank 3.20 m drawn … puts 3.92 m". V-WSTATION SILENT (foot
   rises 0.36; frac (2.156−0.36)/3.20 = 0.56, in band). V-WSTOCK SILENT (the seizing
   ends up above the shortened head — frac > 1 — but rope is exempt by name; that
   exemption is load-bearing and this injection proves it).
3. **inj-wa-cross** (the pre-r195 crossbar rebuilt: cylinder athwart at y −0.28 in the
   anchor's inner frame, named wa-cross): exactly ONE — V-WSTOCK, "'wa-cross' crosses
   the shank at 0.93 above the foot". V-ARMS silent (a cylinder is not a cone).
4. **inj-wa-station** (stone slid to frac 0.28125 on the NEW 3.92 m shank, slide
   1.054 m): exactly ONE — V-WSTATION reading 0.28 (proves the tips-centroid
   re-anchoring preserved r194's rule to the digit). V-REST silent (the slide runs
   along the stowed shank, fore-aft on deck).

## Outcomes — :8151 shadow, staged class, before landing

1. Clean: **33/0** ✓ (prediction 1).
2. inj-wa-shank: **exactly ONE — V-WSHANK "shank 3.20 m drawn … puts 3.92 m"** ✓ to the
   digit; V-WSTATION and V-WSTOCK silent as predicted (the rope exemption proven).
3. inj-wa-cross: **exactly ONE — "a stock at the cable end", 'wa-cross' at 0.93** ✓.
4. inj-wa-station: V-WSTATION at **0.28 to the digit** ✓ — but the FIRST draft returned
   FIVE convictions: V-WSTOCK's span hung off the stone's drawn position (fracW+0.10),
   and sliding the stone to the crown dragged the span down onto the arms and pegs.
   **The prediction of ONE was right and the rule was wrong** — it tested "above the
   stone" while its claim was "at the cable end". Fixed to a fixed HEAD_SPAN 0.75
   (named, clear of the stone's band 0.67 and the arm tops); re-run: clean 33/0,
   cross ONE, station ONE. The miss and the fix are in the rule's own comment.

## After landing

- Audit on :8149: **33/0 twice** on final code.
- Geometry probe (probe_anchor.py): anchor box x 610.2–613.5 on a bow at 610.0 — the
  blunt panokseon bow platform carries the longer frame; head-to-windlass relation
  unchanged from the accepted r194 stow (the shank grew at the FOOT, forward).
- Frames: opening 64 PAID AND PURE (launched 17:53 on the unedited tree, EXIT:0 at
  ~18:35, all frames within tolerance; every edit stayed in staging until then).
  Close solo ship-panokseon 0.065% — the diff ONE cluster, the anchor's own
  silhouette — ACCEPTED with FRAME-LOG reason, re-checked within tolerance.
  ship-junk, ship-sekibune, shipwright, action, globe-default all within tolerance.
- Looked at (look-pan-e-zoom3x.png): the anchor lies caltrop-wise on the planked bow
  platform, the whipped crossings and splayed arms reading as a frame, the grey stone
  lashed diagonally at the shank's middle with crossed turns, the cable led aft to
  the horong. Three facts a viewer can name: a wooden anchor with splayed hook-arms
  dumped at the bow; a long grey stone lashed across its shank's middle; the plank
  seams of the bow platform under it.
