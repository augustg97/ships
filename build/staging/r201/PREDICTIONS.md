# r201 predictions — written BEFORE the change (r19x protocol)

## The change being made

The panokseon's anchor stone takes 진도Ⅳ-58 / 명량21-17's catalogue record
(『진도 명량대첩로 해역 수중발굴조사 보고서 Ⅳ』 2024, printed p. 147, verified
caption-vs-photograph on the r200 render m4-p148-148.png):

- record: `stoneLenM` 2.0 → **1.66**, section 0.3 square → **stoneWM 0.53 ×
  stoneTM 0.29** (new fields on woodAnchor, the junk's stoneAnchor convention),
  `stoneKg` 458 recorded.
- builder: `woodAnchor` learns stoneWM (너비, laid along the shank axis) and
  stoneTM (두께, off the shank's face); stoneSecM stays the legacy square
  fallback (height 0.83 × sec, depth sec — the pre-r201 shape, exact).
- provenance: the exhibition-threshold sentence ("over 2 m, 300–700 kg",
  Taean 2021) is REPLACED by the record + Hong 2012's 대형군 band
  (304–590 kg / 146–263 cm, carried as the 2021 Mado report's footnote 64);
  the shank sentence's "about 3.9 m on the 2.0 m stone" becomes ~3.3 on 1.66;
  two witness sentences land — 진도Ⅱ-328's zelkova beside 진도-641's oak
  (panokseon arm), 진도-621's both-face seat grooves (junk stoneAnchor,
  text only, no geometry).

## Derived numbers, computed from the constants BEFORE editing

- shankL = stoneLenM / ST_RATIO = 1.66 / 0.51 = **3.2549** (was 3.9216)
- stone box drawn **1.66 × 0.53 × 0.29** (was 2.00 × 0.249 × 0.30)
- yStone = −shankL·0.45 = −1.4647; yX = −shankL·0.65 = −2.1157
- BL = (yStone − 0.53/2 − yX)/cos 0.38 + 0.196·0.4 = 0.3860/0.9287 + 0.0784
  = **0.494** (was 0.788)
- HL = 1.90 − BL − 1.1·0.196 = **1.190** (was 0.896) — the hook limbs
  LENGTHEN because the shorter shank pulls the stone's underside toward the
  crossing; whole timber run stays 1.6844 = ARM_LEN − 1.1·armD
- SEP = 3.2549·0.058 = 0.1888; upper blunt end tip y = (yX + SEP) +
  BL·cos 0.38 = −1.468, BELOW the stone's top at −1.200 → V-WSTOCK silent

## Audit predictions (33 hulls on :8149)

1. **Clean, run 1 and run 2: 33 hulls, 0 problems.** Every wood-anchor rule
   shares its constant with the builder: V-STONE-analog reads drawn 1.66 vs
   record 1.66 (band ±10% = 1.494–1.826); V-WSHANK drawn 3.25 vs
   1.66/0.51 = 3.25 (±12%); V-WSTATION 0.55 shared; V-WSPLAY 0.38 shared;
   V-WARM run 1.684 vs 1.684, section 0.216 vs 0.216; V-REST settled by box;
   V-CABLE led to the horong.
2. **inj-wstone** (wa-stone scale.x × 2.0/1.66 = 1.2048, lifted +0.20 local —
   the r199 stone-injection shape: the OLD drawn length redrawn under the NEW
   record): exactly **ONE** problem —
   `panokseon: the stone off the record's length — stone 2.00 m through the
   stow transform, record says 1.66`.
   V-WSTATION silent (lift moves the station +0.20/3.25 = +0.06 → 0.61,
   inside 0.55±0.12); V-REST silent (the stone is not the assembly's low
   point; the lift only raises it); all other hulls untouched.
3. **inj-wshank** (wa-shank scale.y × 1.25): exactly **ONE** problem —
   `panokseon: a shank off its stone's proportion — shank 4.07 m drawn — the
   figure's stone/shank 0.51 puts 3.25 m on this stone, the long shank the
   form study explains by oak's buoyancy`.
   (3.2549 × 1.25 = 4.0686 → "4.07"; want 3.2549 → "3.25", diff 0.81 >
   0.12·3.25 = 0.39.) V-WSTATION silent: scaled ends put the foot at −3.662,
   frac = (−1.4647+3.662)/4.069 = **0.54**, inside band. V-WSTOCK silent:
   highest non-rope member is the upper arm timber, centre frac
   (−2.250+3.662)/4.069 = 0.35 < 0.75. V-REST silent: the foot end extends
   along the deck-pitched axis, and the ray reads the box centre.
4. **Restore clean → 33/0 again.**

## Frame predictions (the close ratchet)

- **ship-panokseon MOVES** — the one frame that draws this hull. The anchor
  assembly on the foredeck: shank 3.92 → 3.25, stone shorter/wider/thicker
  (visibly slab-like now, 0.53 across the shank), hook limbs 0.90 → 1.19.
  Expected magnitude: larger than r197's 0.005% (that was arm sections only;
  this remakes the whole assembly's proportions) — order 0.01–0.2%, ONE
  cluster at the foredeck anchor. Accept with reason after reading the crop.
- **All 63 other frames inert** (r197/r198 precedent: junk, sekibune,
  shipwright, action, globes all 0.000 when the panokseon anchor moved; the
  junk's change this round is provenance TEXT only and its geometry is
  untouched). Named exception risk: **action-myeongnyang** stages panokseon
  hulls at 1100 m camera distance — the anchor there is a few pixels at most;
  r197/r198 measured 0.000 on the action frames for an anchor-only change and
  the same is predicted here, but if it moves, the diff must read as bow
  clusters on the Korean line and nothing else.

## Rule-0 obligation

Answered on the close ratchet's ship-panokseon _current capture, three
readable facts named in HANDOFF.
