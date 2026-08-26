#!/usr/bin/env python3
"""r162 QM2 tierAftU measuring instrument — plate 1 (20161001 Queen Mary Aerial 2).

Draws every candidate line on the plate so the read can be LOOKED AT (rule 1),
then measures:
  - bay pitch (px) along each named balcony row by autocorrelation of luminance
  - intersections of each athwartships face line with the centerline
  - gap px between successive faces along the centerline

The gaps are between deck edges AT THE SAME HEIGHT (each terrace's aft edge vs
the next wall's base), so the one-story parallax cancels inside every gap.
Conversion px->bays uses the pitch interpolated linearly in centerline position
between the measured rows (perspective makes pitch a smooth function of
position; two-three witnesses over the cascade span carry it).
"""
import numpy as np
from PIL import Image, ImageDraw

im = Image.open('build/staging/r161/qm2-aerial-2.jpg').convert('RGB')
A = np.asarray(im).astype(float)
LUM = A.mean(axis=2)

# ---- candidate geometry (original px), refined by looking at the overlay ----
# athwartships lines, each [(x0,y0),(x1,y1)], measured at the stated LEVEL:
FACES = {
    # t1 top: fantail deck edge aft extreme (arc tangent point) — handled as a point
    'tip':      [(1008, 2214)],
    # t2 wall base at fantail level (pavilion glass face foot)
    'F2_pav':   [(995, 2000), (1235, 2082)],
    # t2 top = B aft deck edge (pavilion roof aft edge, segment on the roof itself)
    'E2_Baft':  [(938, 1962), (1080, 2005)],
    # t3 wall base at B level (wall under C's aft edge)
    'F3_Bwall': [(948, 1890), (1228, 1968)],
    # t3 top = C aft deck edge
    'E3_Caft':  [(932, 1848), (1230, 1937)],
    # t4 wall base at C level (foot read port of the awning + stbd doors)
    'F4_Cwall': [(1080, 1700), (1500, 1825)],
    # t4 top = D aft edge (awning attachment / lattice rail)
    'E4_Daft':  [(1170, 1655), (1520, 1812)],
    # t5 wall base at D level (lower cabin row bay-front foot)
    'F5_row1':  [(1195, 1640), (1520, 1780)],
    # t5 top = inter-row strip aft edge (lower row roof edge)
    'E5_strip': [(1210, 1600), (1530, 1740)],
    # t6 wall base at strip level (upper cabin row bay-front foot)
    'F6_row2':  [(1225, 1600), (1540, 1730)],
    # t6 top = E aft deck edge (jacuzzi terrace aft rail)
    'E6_Eaft':  [(1170, 1550), (1500, 1690)],
    # t7 wall base at E level (crest block lowest ledge foot, traced crest-foot.png)
    'F7_crest': [(1370, 1543), (1510, 1572)],
    # t7 top edge (crest first ledge outer rim)
    'E7':       [(1330, 1500), (1490, 1536)],
    # t8 wall base (second story foot on the ledge)
    'F8':       [(1330, 1492), (1490, 1526)],
    # t8 top edge (upper crest terrace aft rim)
    'E8':       [(1300, 1414), (1470, 1454)],
    # t9 wall base (top parapet foot)
    'F9':       [(1310, 1402), (1480, 1442)],
    # t9 top rim (46.5 m roof aft edge) — parallax cross-check only
    'E9_top':   [(1350, 1390), (1490, 1422)],
}
# centerline through fantail pool center and E jacuzzi center
CL = [(1065, 2075), (1397, 1572)]

# balcony-bay pitch witness rows: [(x0,y0),(x1,y1)] sampled along the row
ROWS = {
    'row1_D':  [(1215, 1705), (1500, 1805)],   # lower cabin row bay fronts
    'row2_up': [(1230, 1612), (1480, 1702)],   # upper cabin row rail line
    'stbdE':   [(1500, 1745), (1745, 1835)],   # stbd quarter balcony row below E
    'stbdCD':  [(1330, 1830), (1600, 1925)],   # stbd side row at C/D level
    'portDE':  [(960, 1640), (1120, 1700)],    # port wing row beside D/E
    'stbdB':   [(1290, 1965), (1560, 2060)],   # stbd band at B level
}

def draw_overlay():
    ov = im.copy()
    d = ImageDraw.Draw(ov)
    for name, pts in FACES.items():
        col = (255, 40, 40) if name.startswith('F') else (255, 220, 0)
        if len(pts) == 1:
            x, y = pts[0]
            d.ellipse([x-6, y-6, x+6, y+6], outline=col, width=3)
        else:
            d.line(pts, fill=col, width=3)
            d.text((pts[0][0]-40, pts[0][1]-8), name, fill=col)
    d.line(CL, fill=(0, 255, 0), width=2)
    for name, pts in ROWS.items():
        d.line(pts, fill=(0, 160, 255), width=2)
        d.text((pts[1][0]+4, pts[1][1]), name, fill=(0, 160, 255))
    crop = ov.crop((850, 1350, 1750, 2280))
    crop = crop.resize((crop.width*2, crop.height*2), Image.LANCZOS)
    crop.save('build/staging/r162/overlay.png')

def pitch_along(p0, p1, halfwidth=2):
    """luminance profile along p0->p1, autocorrelation peak = pitch px."""
    p0 = np.array(p0, float); p1 = np.array(p1, float)
    n = int(np.hypot(*(p1 - p0)))
    ts = np.linspace(0, 1, n)
    pts = p0[None, :] + ts[:, None] * (p1 - p0)[None, :]
    # average a couple px perpendicular for noise
    perp = np.array([-(p1 - p0)[1], (p1 - p0)[0]], float)
    perp /= np.hypot(*perp)
    prof = np.zeros(n)
    for k in range(-halfwidth, halfwidth + 1):
        q = pts + k * perp[None, :]
        xi = np.clip(q[:, 0].astype(int), 0, LUM.shape[1]-1)
        yi = np.clip(q[:, 1].astype(int), 0, LUM.shape[0]-1)
        prof += LUM[yi, xi]
    prof /= (2*halfwidth + 1)
    prof = prof - prof.mean()
    ac = np.correlate(prof, prof, 'full')[n-1:]
    ac /= ac[0]
    # first local max after the first zero crossing, in a sane pitch window
    best, bestv = None, -1
    for lag in range(5, min(30, n//3)):
        if ac[lag] > ac[lag-1] and ac[lag] >= ac[lag+1] and ac[lag] > bestv:
            best, bestv = lag, ac[lag]
    # refine with parabola
    if best and 1 <= best < len(ac)-1:
        a, b, c = ac[best-1], ac[best], ac[best+1]
        denom = (a - 2*b + c)
        off = 0.5*(a - c)/denom if denom != 0 else 0
        return best + off, bestv
    return None, None

def isect(line, cl):
    (x1, y1), (x2, y2) = line
    (x3, y3), (x4, y4) = cl
    den = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4)
    px = ((x1*y2-y1*x2)*(x3-x4) - (x1-x2)*(x3*y4-y3*x4)) / den
    py = ((x1*y2-y1*x2)*(y3-y4) - (y1-y2)*(x3*y4-y3*x4)) / den
    return px, py

if __name__ == '__main__':
    draw_overlay()
    print('pitch (px) by autocorrelation:')
    for name, seg in ROWS.items():
        p, v = pitch_along(seg[0], seg[1])
        print(f'  {name}: {p if p is None else round(p,2)} px  (ac={None if v is None else round(v,2)})')
    print('\ncenterline stations (px along CL from tip):')
    cl0 = np.array(CL[0], float); cl1 = np.array(CL[1], float)
    u_cl = (cl1 - cl0) / np.hypot(*(cl1 - cl0))
    tip = np.array(FACES['tip'][0], float)
    s_tip = (tip - cl0) @ u_cl
    for name, pts in FACES.items():
        if len(pts) == 1:
            continue
        p = np.array(isect(pts, CL))
        s = (p - cl0) @ u_cl - s_tip
        print(f'  {name}: {s:8.1f} px  at ({p[0]:.0f},{p[1]:.0f})')
