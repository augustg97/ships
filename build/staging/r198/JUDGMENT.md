# Round 198 — finish r197's close-out; the push that had already failed

## The finding at the door

r197's commit dbccb6c was never on the remote. Its push died on GitHub's 100 MB
limit — build/staging/r197/jindo-myeongnyang-I-2015.pdf is 106.86 MB in git's
accounting — and the round was killed before it could read its own push log. The
live site was serving r196 while HANDOFF said r197 had landed. loop.log's "round
finished; HEAD is dbccb6c" is a statement about the LOCAL tree; only the live
stamp says what shipped.

## The fix, at the class level

- The 112 MB PDF untracked (`git rm --cached`), kept on disk — the evidence is
  the mined record in r197's JUDGMENT.md plus the committed drawing crops; the
  board coordinates to re-fetch are in the same file.
- .gitignore now names it, with the rule written above the line: fetched reports
  over the push limit stay on disk only.
- dbccb6c amended to 78c2c76 (safe: never pushed), pushed 23:16, live stamp
  1788328583 verified at 23:31 — r197 is live.

## r197's pending checklist, worked in order

1. **Audit run 2** (:8149, landed tree): 33 hulls, 0 problems ✓
   (build/staging/r197/audit-run2.json)
2. **Looks** (rule 1, the landed tree): look-a/b/c in r197 staging. look-c is
   the keeper: the shank diagonal on the planked foredeck, the grey grooved
   stone lashed at its middle, TWO stout arm timbers crossing at staggered
   whipped stations — visibly near the shank's own girth now (the r197 change,
   armD 0.12 → 0.196). Cable runs aft. Nothing floats, nothing stabs.
3. **Close ratchet**: ALL 64 WITHIN TOLERANCE, EXIT:0 (close-ratchet.out in r197
   staging). ship-panokseon 0.005%/0.001 — ONE cluster, 317 px at 753–805 ×
   813–859, and the current-frame crop shows it is the anchor assembly itself:
   the stouter arms and the stone's new silhouette on the foredeck
   (panok-diff-crop.png, panok-cur-crop.png). Accepted under-gate per the r185
   precedent so intent cannot read as drift; solo re-check 0.000/0.000.
   junk/sekibune/shipwright/action/globes: 0.000–0.046%, all ok, inert as
   predicted.
4. **Live-stamp check**: ✓ (see above — done before the ratchet finished, since
   the push was this round's own work)

## Residual 1 prep (fetch coordinates, from r197's saved metadata)

- 2017 마도해역 시굴조사 보고서 (the 2011–2012, 2014 seasons — arm ⑤ raised with
  stone 052 in 2011): fileDown FILE_900000000007142/1, 41,812,224 bytes.
- 2021 시굴 보고서 (2018–2019 seasons, 233 finds incl. 닻돌):
  fileDown FILE_000000000053762/0, 234,174,598 bytes — an hour at the board's
  ~100 KB/s; needs a round that starts it FIRST.
- Myeongnyang Ⅱ–Ⅳ nttIds: not yet listed.

## What the 2017 report records (mined 00:01–00:06; text + pages 205/210 rendered)

The catalogue is per-STONE, like every sibling report — but TWO stones came up
with their arms, and one drawing dimensions an arm by its own scale bar:

- **마도해역-203** (2011-10-18; 98×40×34 cm, 255 kg): no grooves, near-square
  section → the report infers the stone was INSERTED BETWEEN TWO SHANK TIMBERS
  (두 개의 닻채 사이), not lashed to one. Raised with ONE 닻가지 and a bamboo
  rope; bamboo cordage read as Chinese practice → a Chinese ship's anchor. The
  report's own analogue: the anchor on the Eastern-Han pottery ship excavated
  at Dongjiao, Guangzhou, 1951. Figures on p. 205 (p203-205.png): buried-state
  schematic, complete-form reconstruction schematic, the pottery ship, and the
  co-recovered arm + rope photograph. This is the 2023 report's stone 052 by
  date and circumstance — Hong's arm ⑤ context.
- **마도해역-212** (2014-08-01; 109×29×10 cm, 84 kg): raised STILL ARTICULATED
  (결구된 채) with its arm — the report states this proves the two-shank-insert
  structure. **p. 210 (p212-210.png) carries a measured drawing of the ARM at
  1/10 with a 0–25–50 cm bar**: plan with the stone crossing near one end, side
  elevation (the timber sweeps up at one end, notched seats on the upper face),
  and an underside view with THREE SQUARE HOLES — Hong 2013's artifact ⑤, the
  "Mado II arm with three square holes", now with a drawing that can be
  measured the r197 way (px/cm against the printed bar).
- **마도해역-206** (2011; 178×28×13 cm, 133 kg, granite-precise work, Chinese by
  form): an 18 cm-wide shallow 결구부 mid-length FOR mounting between two
  shanks, plus ~5 cm grooves top and bottom for retaining fittings.

## What this means, and what it does not

- These are records for the CHINESE two-shank stone-insert form — the JUNK's
  ground tackle (residual 5, the r183 stone bar class default), NOT the Korean
  single-shank form the panokseon draws. No text dimension for either arm; the
  212 drawing is the first measurable arm record of the insert form.
- NOT DONE this round (the wire): measuring the 212 drawing at 300 DPI, and any
  junk stone-anchor class change with its shadow proofs. That is the successor's
  opening move, from disk.
- Against r194's CONTESTED note ("no stone has ever been found still lashed to
  its shank"): 마도해역-212 came up still joined to an ARM of the insert form —
  a different joint than lashing-to-shank, so the note stands for the Korean
  form, but the sentence should name the insert-form exception when the junk
  class is next touched.
