#!/usr/bin/env python3
"""r192 — the shank takes its own caliper record.

Source: 二宮俊洋「太平洋沿岸部にみられる四爪錨について」修士学位論文, 東京海洋大学,
2013年度 (2014-03). oacis.repo.nii.ac.jp record 1018, kam1846.pdf, saved as
build/staging/r192/yotsume-pacific-kam1846.pdf. 表3 調査錨法量 (PDF p.18, printed
p.11, rendered 300 DPI, transcribed and strip-verified). 144 anchors surveyed
Ibaraki→Wakayama; the caliper-complete rows record the SHANK at two stations —
軸正面×軸側面 (the clean upper bar) and 軸根本正面×軸根本側面 (the root boss where
the four arms are forged on) — the one member Matsui 2013's 表1 does not record.

Cross-corpus check: №71 (銚子, 300 cm) claw root 10.5×7 = 0.0350×0.0233 of 全長
vs Matsui's Japan-Sea corpus means 0.0346×0.0198; claw length 96/300 = 0.320 vs
the class's armF 0.30 default. Two independent coasts agree on the arms.

Stations are compared SORTED (min, max): 正面/側面 depend on how each shrine
mounted its anchor, and the sorted pair is invariant under that.
"""
import math, statistics as st

# no, 全長cm, 軸正面, 軸側面, 軸根本正面, 軸根本側面, exclusion reason ('' = keep)
ROWS = [
    (1,   210,  15,   10,   20,   20,  'EXCLUDE: sea-concreted (text ①大洗: long submerged, tip lost, surface wasted) — every member ~2x corpus'),
    (4,   135,  6,    4,    8,    11,  ''),
    (63,  180,  3,    5,    7,    8,   ''),
    (71,  300,  6.5,  7.5,  15,   23,  ''),
    (74,  150,  1.8,  5.5,  None, None,'EXCLUDE: exfoliated (text 渡海神社: 剥がれ) — 0.012 of 全長 is a wasted bar, not a section'),
    (75,  230,  5,    7,    13,   17,  ''),
    (76,  230,  5,    7,    11,   15,  ''),
    (79,  189,  4,    5,    10,   16,  ''),
    (82,  125,  2.5,  7,    7,    10,  'FLAG: 側面/正面 = 2.8 at the shaft station, twice anyone else — kept for root, flagged for shaft'),
    (85,  156.5,5,    4,    10,   13,  ''),
    (88,  230,  3.5,  6,    None, 17,  ''),
    (91,  160,  3.5,  5.5,  7,    13,  ''),
    (92,  82,   2.5,  3.5,  3.5,  7,   ''),
    (93,  110,  None, None, 40,   None,'EXCLUDE: printed-inconsistent (root 0.36 of 全長 on a 110 cm anchor) — the r191 rows-41/42 precedent'),
    (96,  259,  4,    6,    11,   20,  ''),
    (104, 175,  5.5,  4,    8.5,  13,  ''),
    (109, 80,   2,    2.5,  None, 6,   ''),
    (136, 260,  4,    7,    11,   20,  ''),
    (137, 145,  4.5,  2.5,  7.5,  12,  ''),
    (138, 190,  4,    5,    8,    15,  ''),
    (144, 195,  5,    4,    9,    15,  ''),
]

def stats(pairs, label):
    mins = [min(a, b) for a, b in pairs]
    maxs = [max(a, b) for a, b in pairs]
    print(f'{label}: n={len(pairs)}')
    print(f'  min-dim  {st.mean(mins):.4f} ± {st.stdev(mins):.4f}')
    print(f'  max-dim  {st.mean(maxs):.4f} ± {st.stdev(maxs):.4f}')
    return st.mean(mins), st.mean(maxs)

kept = [r for r in ROWS if not r[6].startswith('EXCLUDE')]
print('== excluded, named ==')
for r in ROWS:
    if r[6]: print(f'  №{r[0]} ({r[1]} cm): {r[6]}')

# shaft station (upper bar): drop №82's flagged pair as well as exclusions
shaft = [(r[2]/r[1], r[3]/r[1]) for r in kept
         if r[2] is not None and r[3] is not None and r[0] != 82]
# root station (the boss): all kept rows with both dims
root = [(r[4]/r[1], r[5]/r[1]) for r in kept
        if r[4] is not None and r[5] is not None]
print('\n== stations, fractions of 全長, sorted (min,max) per anchor ==')
sW, sT = stats(shaft, 'shaft 軸正面x軸側面 (upper bar)')
rW, rT = stats(root,  'root 軸根本正面x軸根本側面 (arm boss)')
p82 = (2.5/125, 7/125)
print(f'  (№82 flagged pair would read ({min(p82):.4f},{max(p82):.4f}) — outside on max)')

# size-class check: allometry (small anchors stouter?)
big_shaft = [(a, b) for (a, b), r in zip(shaft, [r for r in kept if r[2] is not None and r[3] is not None and r[0] != 82]) if r[1] >= 125]
print(f'\n  shaft >=125cm subset: n={len(big_shaft)} '
      f'min {st.mean([min(p) for p in big_shaft]):.4f} max {st.mean([max(p) for p in big_shaft]):.4f}')

# ---- the mass solve with the recorded shank -------------------------------
# class constants carried from r191 (Matsui arms + Onominato rings)
arW0, arT0, arW1, arT1 = 0.0346, 0.0198, 0.0220, 0.0058
rSemiV, rSemiH, rBar   = 0.0818, 0.0353, 0.0056
acRc, acBar            = 0.0590, 0.0079
armF = 0.30
lenM, kgR = 2.0, 122.0

def yaW(f): return arW0 + (arW1 - arW0) * f
def yaT(f): return arT0 + (arT1 - arT0) * f
F1, F2 = 0.62 / 1.04, 0.88 / 1.04
w0, w1, w2 = yaW(0), yaW(F1), yaW(F2)
zs1 = (yaT(0) / w0 + yaT(F1) / w1) / 2
zs2 = (yaT(F1) / w1 + yaT(F2) / w2) / 2
zsT = yaT(F2) / w2
sqF = lambda wa, wb, h: h / 3 * (wa * wa + wa * wb + wb * wb)
vArms = 4 * (zs1 * sqF(w0, w1, 0.62 * armF)
           + zs2 * sqF(w1, w2, 0.26 * armF)
           + zsT * w2 * w2 * 0.16 * armF / 3)
vTips = 4 * zsT * w2 * w2 * 0.16 * armF / 3
vRings = (2 * math.pi**2 * (rSemiH - rBar) * rBar**2 * (rSemiV / rSemiH)
        + 2 * math.pi**2 * acRc * acBar**2)
vOther = (vArms + vRings) * lenM**3

shankL = lenM * (1 - 2 * rSemiV)
# drawn form: lower taper root→shaft split in TWO frustums (halves the
# mean-ratio thickness artifact at the crown to ~6%), prism above the knee.
# knee height h = the one unrecorded dimension, solved for the record's kg.
wRm, tRm, wMm, tMm = rW * lenM, rT * lenM, sW * lenM, sT * lenM
rR, rM = tRm / wRm, tMm / wMm
wMid, rMid = (wRm + wMm) / 2, (rR + rM) / 2
zsA, zsB = (rR + rMid) / 2, (rMid + rM) / 2   # per-sub-segment mean ratios
zsUp = rM

def vShank(h):
    return (zsA * sqF(wRm, wMid, h / 2)
          + zsB * sqF(wMid, wMm, h / 2)
          + zsUp * wMm * wMm * (shankL - h))

target = kgR / 7850 - vOther
# vShank is linear in h: solve directly
v0, v1 = vShank(0), vShank(shankL)
h = shankL * (target - v0) / (v1 - v0)
print('\n== the solve at (2.0 m, 122 kg) ==')
print(f'  arms {vArms*lenM**3*7850:.1f} kg (tips {vTips*lenM**3*7850:.2f}), '
      f'rings {vRings*lenM**3*7850:.1f} kg, shank target {target*7850:.1f} kg')
print(f'  solvable band: all-prism {v0*7850 + vOther*7850:.0f} kg .. full-taper {v1*7850 + vOther*7850:.0f} kg')
print(f'  knee h = {h:.3f} m = {h/shankL:.1%} of the shank')
print(f'  crown section drawn {wRm*100:.1f}x{wRm*zsA*100:.1f} cm (record {wRm*100:.1f}x{tRm*100:.1f} — artifact {zsA/rR-1:+.1%})')
print(f'  head section drawn {wMm*100:.1f}x{wMm*zsUp*100:.1f} cm (record {wMm*100:.1f}x{tMm*100:.1f} — exact)')
print(f'  check: total {(vShank(h)+vOther)*7850:.1f} kg')

# ---- proofs predicted -----------------------------------------------------
shank_kg = vShank(h) * 7850
print('\n== predictions ==')
print(f'  inj-ya-mass x0.8 x/z: {0.64*kgR:.0f}/{kgR:.0f} — ONE conviction V-YMASS')
print(f'  inj-ya-drag shank y x1.35: V-YLEN ~{lenM + 0.35*shankL:.2f}/{lenM} '
      f'+ honest V-YMASS {kgR + 0.35*shank_kg:.0f}/{kgR:.0f}')
print(f'  inj-ya-tipsever: V-YARMS alone; tips {vTips*lenM**3*7850/ (kgR):.2%} of iron — V-YMASS silent')
print(f'  inj-ya-shankprism (boss taper removed, prism at head section): '
      f'V-YSHANK crown {wMm*zsUp*100:.1f} vs {tRm*100:.1f} cm + honest V-YMASS '
      f'{(vShank(0)+vOther)*7850:.0f}/{kgR:.0f} — TWO, both named')
