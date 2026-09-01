#!/usr/bin/env python3
"""r177 sim — the windlass rule's arms computed on the corbita's REAL shell numbers
(probe-bow.py, read-only, run before any record was written) and the proposed record,
BEFORE any web/ edit. Cases: faithful, sever (record deleted under drawn meshes ->
V-WARRANT), drag (record barrelLenM -> 9.5 under the faithful builder ->
V-SPAN(shell) alone).  Usage: sim.py <atU> <zmax_at_station> <barrelLenM>"""
import sys

ATU = float(sys.argv[1]); ZMAX = float(sys.argv[2]); LEN = float(sys.argv[3])
DIA = 0.5

def clamp(v, a, b): return max(a, min(b, v))

def arms(barLen, barDia, recLen, recDia, record=True, vertical=False):
    out = []
    if not record:
        return ['V-WARRANT: drawn, record silent']
    if vertical:
        out.append('V-AXIS: stood on end')
    if recLen and abs(barLen - recLen) > 0.12 * recLen:
        out.append(f'V-SPAN(record): barrel {barLen:.2f} vs record {recLen}')
    if barLen / 2 > 0.95 * ZMAX:
        out.append(f'V-SPAN(shell): {barLen:.2f} m across a {2*ZMAX:.2f} m deck')
    if recDia and abs(barDia - recDia) > 0.15 * recDia:
        out.append(f'V-DIA: {barDia:.2f} vs record {recDia}')
    over = clamp(0.30 + barDia / 2, 0.45, 0.90)
    if barDia > 0.9:
        out.append(f'V-BORE: barrel {barDia:.2f} m thick')
    if over - barDia / 2 < 0.12:
        out.append(f'V-CLEAR: {over - barDia/2:.2f} m under the barrel')
    return out

print(f'== corbita (u {ATU}, half-breadth {ZMAX}, barrel {LEN})')
a = arms(LEN, DIA, LEN, DIA)
print('  faithful:', a or 'ALL ARMS PASS')
assert not a

sv = arms(LEN, DIA, LEN, DIA, record=False)
print('  sever (record deleted under drawn meshes):', sv)
assert sv == ['V-WARRANT: drawn, record silent']

dr = arms(9.5, DIA, 9.5, DIA)
print('  drag (record 9.5 followed faithfully):', dr)
assert len(dr) == 1 and dr[0].startswith('V-SPAN(shell)'), dr
print('SIM OK')
