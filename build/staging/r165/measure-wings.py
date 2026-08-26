#!/usr/bin/env python3
"""r165 QM2 wing measuring instrument — plate 1 (20161001 Queen Mary Aerial 2).

Read 3(a) of Research/QM2-PLATES.md: the side balcony wings run aft PAST each
terrace floor. This measures HOW FAR, per tier, in balcony bays.

Method (r162's): every candidate wing TIP is compared with its own tier's aft
FACE line (r162's measured lines) at the same height — the tip's axial offset
is found by intersecting the face line with the line through the tip parallel
to the ship's centerline in the image, so the one-story parallax cancels
inside the gap. px -> bays via the r162 pitch witnesses (21.3 px/bay at B
level, 21.8 at E level, interpolated in along-CL position), bays -> u via the
2.6 m recorded pitch over lwl 318.2.

Draws every candidate on the plate (overlay-wings.png) so the read can be
LOOKED AT before it is believed.
"""
import numpy as np
from PIL import Image, ImageDraw

im = Image.open('build/staging/r161/qm2-aerial-2.jpg').convert('RGB')

# ---- r162 geometry, kept verbatim ----
CL = [(1065, 2075), (1397, 1572)]
FACES = {
    'F2_pav':   [(995, 2000), (1235, 2082)],
    'F3_Bwall': [(948, 1890), (1228, 1968)],
    'F4_Cwall': [(1080, 1700), (1500, 1825)],
    'F5_row1':  [(1195, 1640), (1520, 1780)],
    'F6_row2':  [(1225, 1600), (1540, 1730)],
    'F7_crest': [(1370, 1543), (1510, 1572)],
}
# pitch witnesses (r162 autocorrelation): px per 2.6 m bay, at their CL position
PITCH = [
    (221.8, 21.3),   # stbdB witness, at ~E2_Baft CL station (px from tip)
    (680.5, 21.8),   # stbdE witness, at ~E6_Eaft CL station
]

cl0 = np.array(CL[0], float); cl1 = np.array(CL[1], float)
u_cl = (cl1 - cl0) / np.hypot(*(cl1 - cl0))     # points FORWARD in the image
tipref = np.array([1008, 2214], float)          # r162 fantail tip point
s_tip = (tipref - cl0) @ u_cl

def cl_station(p):
    """along-CL px of a point, measured from the fantail tip (r162's frame)."""
    return (np.array(p, float) - cl0) @ u_cl - s_tip

def pitch_at(s):
    (s0, p0), (s1, p1) = PITCH
    return p0 + (p1 - p0) * (s - s0) / (s1 - s0)

def axial_gap(face, tip):
    """px the tip stands AFT of the face line, along the CL direction.
    Solves face(t) + s*u_cl = tip; returns (-s, t): -s>0 = aft, t = where on
    the face line the comparison landed (0..1 inside the drawn segment)."""
    (x1, y1), (x2, y2) = face
    F0 = np.array([x1, y1], float); Fd = np.array([x2 - x1, y2 - y1], float)
    T = np.array(tip, float)
    # F0 + t*Fd + s*u_cl = T  ->  [Fd  u_cl] [t s]' = T - F0
    A = np.array([[Fd[0], u_cl[0]], [Fd[1], u_cl[1]]])
    t, s = np.linalg.solve(A, T - F0)
    return -s, t

# ---- the candidate wing tips (original px), refined by looking ----
# each: (face key, tip point, side, note)
WINGS = {
    # t2 wing: the glazed single-story row standing on the fantail, stbd side
    'W2s': ('F2_pav',   (1215, 2105), 's', 'glazed gallery aft end + stair, stbd'),
    # t4 wing: one-story continuation past the two-story corner, stbd
    'W4s': ('F4_Cwall', (1512, 1810), 's', 'railed strip aft end, stbd'),
    # t4 wing, port: lattice-railed strip aft end
    'W4p': ('F4_Cwall', (940, 1780),  'p', 'lattice rail aft end, port'),
    # t5 wing: the two-story block corner (t4+t5 end together), stbd
    'W5s': ('F5_row1',  (1600, 1697), 's', 'two-story corner, stbd'),
    # t5 wing, port: upper lattice aft end
    'W5p': ('F5_row1',  (1103, 1662), 'p', 'upper lattice end, port'),
    # t7 wing: beside the jacuzzi terrace, port (triangular platform tip)
    'W7p': ('F7_crest', (1170, 1610), 'p', 'wing platform tip, port'),
    # t7 wing, stbd
    'W7s': ('F7_crest', (1600, 1625), 's', 'wing deck tip, stbd'),
}

def draw_overlay():
    ov = im.copy()
    d = ImageDraw.Draw(ov)
    for name, pts in FACES.items():
        d.line(pts, fill=(255, 220, 0), width=3)
        d.text((pts[0][0] - 40, pts[0][1] - 8), name, fill=(255, 220, 0))
    d.line(CL, fill=(0, 255, 0), width=2)
    for name, (fk, tip, side, note) in WINGS.items():
        x, y = tip
        d.ellipse([x - 7, y - 7, x + 7, y + 7], outline=(255, 40, 40), width=3)
        d.text((x + 9, y - 9), name, fill=(255, 40, 40))
        # the axial comparison segment, drawn so it can be looked at
        aft, t = axial_gap(FACES[fk], tip)
        (x1, y1), (x2, y2) = FACES[fk]
        F = np.array([x1, y1], float) + t * np.array([x2 - x1, y2 - y1], float)
        d.line([tuple(F), (x, y)], fill=(0, 160, 255), width=2)
    crop = ov.crop((850, 1350, 1750, 2280))
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    crop.save('build/staging/r165/overlay-wings.png')

if __name__ == '__main__':
    draw_overlay()
    print(f"{'wing':5s} {'aft px':>7s} {'t':>6s} {'pitch':>6s} {'bays':>6s} "
          f"{'dU':>7s}  note")
    for name, (fk, tip, side, note) in WINGS.items():
        aft, t = axial_gap(FACES[fk], tip)
        s = cl_station(tip)
        p = pitch_at(s)
        bays = aft / p
        dU = bays * 2.6 / 318.2
        print(f"{name:5s} {aft:7.1f} {t:6.2f} {p:6.1f} {bays:6.2f} {dU:7.4f}  {note}")
