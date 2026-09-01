#!/usr/bin/env python3
"""r174 sim — the r173 audit rule's arms computed on the junk's and treasure-ship's REAL
shell numbers (probe-bow.py, drawn hulls, read-only) and the proposed records, BEFORE any
web/ edit. Three cases per hull: faithful, severed, dragged. The rule itself is unchanged
from r173; what this proves is that the chosen numbers pass every arm on THESE hulls'
bow stations, and that the planned injections convict on exactly the expected arms."""

SHELL = {  # zmax within the rule's ±0.6 m window at the station, from probe-bow.py
    'junk':          {'u': 0.10, 'zmax': 2.798},
    'treasure-ship': {'u': 0.10, 'zmax': 5.238},
}
REC = {
    'junk':          {'len': 4.6, 'dia': 0.5},
    'treasure-ship': {'len': 6.0, 'dia': 0.6},
}

def clamp(v, a, b): return max(a, min(b, v))

def arms(hull, barLen, barDia, recLen, recDia, vertical=False, record=True):
    out = []
    if not record:
        out.append('V-WARRANT: drawn, record silent')
        return out
    if vertical:
        out.append('V-AXIS: stood on end')
    if recLen and abs(barLen - recLen) > 0.12 * recLen:
        out.append(f'V-SPAN(record): barrel {barLen:.2f} vs record {recLen}')
    zmax = SHELL[hull]['zmax']
    if barLen / 2 > 0.95 * zmax:
        out.append(f'V-SPAN(shell): {barLen:.2f} m across a {2*zmax:.2f} m deck')
    if recDia and abs(barDia - recDia) > 0.15 * recDia:
        out.append(f'V-DIA: {barDia:.2f} vs record {recDia}')
    over = clamp(0.30 + barDia / 2, 0.45, 0.90)   # the builder's own derivation
    if not (0.45 <= over <= 0.90):
        out.append(f'V-BREAST: axis {over:.2f}')
    if barDia > 0.9:
        out.append(f'V-BORE: barrel {barDia:.2f} m thick')
    if over - barDia / 2 < 0.12:
        out.append(f'V-CLEAR: {over - barDia/2:.2f} m under the barrel')
    return out

for h in ('junk', 'treasure-ship'):
    r = REC[h]
    print(f'== {h} (station u {SHELL[h]["u"]}, shell half-breadth {SHELL[h]["zmax"]})')
    a = arms(h, r['len'], r['dia'], r['len'], r['dia'])
    print('  faithful:', a or 'ALL ARMS PASS')
    assert not a, h

# sever: junk barrel stood vertical under a present record; treasure drawn, record deleted
sv_j = arms('junk', 4.6, 0.5, 4.6, 0.5, vertical=True)
sv_t = arms('treasure-ship', 6.0, 0.6, 6.0, 0.6, record=False)
print('sever junk    :', sv_j); assert sv_j == ['V-AXIS: stood on end']
print('sever treasure:', sv_t); assert sv_t == ['V-WARRANT: drawn, record silent']

# drag: the RECORD lies, the builder follows it faithfully — only record-blind arms and
# the shell arm may convict
dg_j = arms('junk', 9.0, 0.5, 9.0, 0.5)             # barrelLenM 4.6 -> 9.0
print('drag junk 9.0 :', dg_j)
assert dg_j == ['V-SPAN(shell): 9.00 m across a 5.60 m deck']
dg_t = arms('treasure-ship', 6.0, 1.4, 6.0, 1.4)     # barrelDiaM 0.6 -> 1.4
print('drag treas 1.4:', dg_t)
assert dg_t == ['V-BORE: barrel 1.40 m thick']

print('SIM OK — faithful passes both hulls; sever and drag convict on exactly the expected arms')
