#!/usr/bin/env python3
"""r175 sim — the windlass rule's arms, PLUS the new V-THROUGH arm, computed on the
panokseon's REAL shell numbers (probe-bow.py, read-only, run before any record was
written) and the proposed record, BEFORE any web/ edit. Cases: faithful, sever
(builder ignores throughBars and draws the Falconer single-ended spikes under the
horong record), drag (record barrelLenM 3.8 -> 7.0 under the faithful builder)."""
import math

SHELL = {'panokseon': {'u': 0.10, 'zmax': 2.894}}   # probe-bow.py, drawn shell
REC = {'panokseon': {'len': 3.8, 'dia': 0.5, 'through': True}}

def clamp(v, a, b): return max(a, min(b, v))

def arms(hull, barLen, barDia, recLen, recDia, through_rec=True, bars='through',
         record=True, vertical=False):
    out = []
    if not record:
        return ['V-WARRANT: drawn, record silent']
    if vertical:
        out.append('V-AXIS: stood on end')
    if recLen and abs(barLen - recLen) > 0.12 * recLen:
        out.append(f'V-SPAN(record): barrel {barLen:.2f} vs record {recLen}')
    zmax = SHELL[hull]['zmax']
    if barLen / 2 > 0.95 * zmax:
        out.append(f'V-SPAN(shell): {barLen:.2f} m across a {2*zmax:.2f} m deck')
    if recDia and abs(barDia - recDia) > 0.15 * recDia:
        out.append(f'V-DIA: {barDia:.2f} vs record {recDia}')
    over = clamp(0.30 + barDia / 2, 0.45, 0.90)
    if not (0.45 <= over <= 0.90):
        out.append(f'V-BREAST: axis {over:.2f}')
    if barDia > 0.9:
        out.append(f'V-BORE: barrel {barDia:.2f} m thick')
    if over - barDia / 2 < 0.12:
        out.append(f'V-CLEAR: {over - barDia/2:.2f} m under the barrel')
    # V-THROUGH: under a throughBars record, every bar's centre within 0.25 m of the
    # axis in the plane perpendicular to it (x-y in the group frame)
    if through_rec:
        if bars == 'through':
            offs = [0.0, 0.0]                       # centred on the axis by construction
        else:                                        # Falconer single-ended, as drawn now
            spL, seat = 1.7, 0.22
            offs = []
            for ang in (0.55, -0.35):
                d = spL / 2 - seat
                offs.append(math.hypot(math.sin(ang) * d, math.cos(ang) * d))
        for i, o in enumerate(offs):
            if o > 0.25:
                out.append(f'V-THROUGH: bar {i} centre {o:.2f} m off the axis — '
                           'the record says the bars pass through the drum')
    return out

r = REC['panokseon']
print(f"== panokseon (u {SHELL['panokseon']['u']}, half-breadth {SHELL['panokseon']['zmax']})")
a = arms('panokseon', r['len'], r['dia'], r['len'], r['dia'])
print('  faithful:', a or 'ALL ARMS PASS')
assert not a

sv = arms('panokseon', r['len'], r['dia'], r['len'], r['dia'], bars='falconer')
print('  sever (Falconer spikes under a throughBars record):', sv)
assert len(sv) == 2 and all(s.startswith('V-THROUGH') for s in sv), sv

dg = arms('panokseon', 7.0, r['dia'], 7.0, r['dia'])
print('  drag (barrelLenM 3.8 -> 7.0, faithful builder):', dg)
assert dg == ['V-SPAN(shell): 7.00 m across a 5.79 m deck'], dg

print('SIM OK — every case lands on exactly the predicted arms')
