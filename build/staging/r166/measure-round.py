#!/usr/bin/env python3
"""r166 QM2 terrace-round measuring instrument — plate 1 (20161001 Queen Mary Aerial 2).

Read 3(b) of Research/QM2-PLATES.md: each terrace's aft rail is curved in plan,
following the stern's round. This measures HOW MUCH, per tier: the SAGITTA of
each curved aft face — the along-CL distance the face's centre stands aft of
the chord through its two corners.

Method (r162's frame, r165's loop): all three points of one read sit on the
SAME edge (the face's top rail line), so the one-story parallax cancels inside
the read. The apex's aft offset against the corner chord is found by solving
chord(t) + s*u_cl = apex; px -> m via the r162 pitch witnesses (21.3 px/bay at
B level, 21.8 at E level, interpolated in along-CL position), 2.6 m per bay.

Faces read as STRAIGHT on the plate are listed too, with sagitta expected ~0 —
the read states which tiers curve, and the flat ones are the counter-evidence
the audit's other direction guards.

Draws every read on the plate (overlay-round.png) so it can be LOOKED AT
before it is believed.
"""
import numpy as np
from PIL import Image, ImageDraw

im = Image.open('build/staging/r161/qm2-aerial-2.jpg').convert('RGB')

# ---- r162 geometry, kept verbatim ----
CL = [(1065, 2075), (1397, 1572)]
PITCH = [
    (221.8, 21.3),   # stbdB witness, px per 2.6 m bay, at its CL station
    (680.5, 21.8),   # stbdE witness
]

cl0 = np.array(CL[0], float); cl1 = np.array(CL[1], float)
u_cl = (cl1 - cl0) / np.hypot(*(cl1 - cl0))     # points FORWARD in the image
tipref = np.array([1008, 2214], float)          # r162 fantail tip point
s_tip = (tipref - cl0) @ u_cl

def cl_station(p):
    return (np.array(p, float) - cl0) @ u_cl - s_tip

def pitch_at(s):
    (s0, p0), (s1, p1) = PITCH
    return p0 + (p1 - p0) * (s - s0) / (s1 - s0)

def aft_offset(P, S, A):
    """along-CL px the apex A stands AFT of the chord P->S."""
    P = np.array(P, float); S = np.array(S, float); A = np.array(A, float)
    d = S - P
    M = np.array([[d[0], u_cl[0]], [d[1], u_cl[1]]])
    t, s = np.linalg.solve(M, A - P)
    return -s, t

# ---- the reads: per face, (port corner, apex, stbd corner) on the top rail
#      line of the face, refined by looking at overlay-round.png ----
FACES = {
    # t2, the glazed gallery face with the arch, cap of the r165 notch at 0.959.
    # All three points on the face's TOP TRIM (the cafe-step deck edge riding
    # it). Corners: the notch's inner corners at each wing gallery. Apex: the
    # aft rim of the projecting round arch bay at its aftmost.
    't2': {'P': (990, 2000), 'A': (1086, 2039), 'S': (1188, 2082),
           'note': 'gallery face w/ arch bay; cafe-step aft rail rides its top'},
    # t3, the main-pool terrace aft rail at 0.934: the middle of the rail
    # between the two stair turrets, corners inboard of the small end rounds.
    # EXPECTED ~0: the plate reads this face straight between rounded ends.
    't3': {'P': (942, 1846), 'A': (1130, 1891), 'S': (1220, 1914),
           'note': 'main-pool aft rail middle — reads straight, control read'},
    # t7, the jacuzzi step aft rail at 0.816, the cap of the r165 t7 notch:
    # a full convex-aft sweep between the wing decks.
    't7': {'P': (1300, 1580), 'A': (1420, 1620), 'S': (1552, 1620),
           'note': 'jacuzzi step aft rail between the wing decks'},
}

def draw_overlay():
    ov = im.copy()
    d = ImageDraw.Draw(ov)
    d.line(CL, fill=(0, 255, 0), width=2)
    for name, f in FACES.items():
        P, A, S = f['P'], f['A'], f['S']
        d.line([P, S], fill=(255, 220, 0), width=2)          # the chord
        for q, col in ((P, (255, 40, 40)), (S, (255, 40, 40)), (A, (0, 160, 255))):
            d.ellipse([q[0] - 6, q[1] - 6, q[0] + 6, q[1] + 6], outline=col, width=3)
        d.text((A[0] + 8, A[1] + 4), name, fill=(0, 160, 255))
        # the apex comparison segment: apex projected onto the chord along CL
        aft, t = aft_offset(P, S, A)
        F = np.array(P, float) + t * (np.array(S, float) - np.array(P, float))
        d.line([tuple(F), A], fill=(0, 160, 255), width=2)
    crop = ov.crop((850, 1450, 1700, 2200))
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    crop.save('build/staging/r166/overlay-round.png')

if __name__ == '__main__':
    draw_overlay()
    print(f"{'face':5s} {'aft px':>7s} {'t':>6s} {'pitch':>6s} {'bays':>6s} "
          f"{'sag m':>6s}  note")
    for name, f in FACES.items():
        aft, t = aft_offset(f['P'], f['S'], f['A'])
        s = cl_station(f['A'])
        p = pitch_at(s)
        bays = aft / p
        sag = bays * 2.6
        print(f"{name:5s} {aft:7.1f} {t:6.2f} {p:6.1f} {bays:6.2f} {sag:6.2f}  {f['note']}")
