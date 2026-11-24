import sys
import numpy as np
from PIL import Image
a=np.asarray(Image.open(sys.argv[1]).convert('L')).astype(int)
dark=a<128
def runs(mask,off=0):
    out=[];s=None
    for i,v in enumerate(mask):
        if v and s is None:s=i
        if not v and s is not None:out.append((s+off,i-1+off));s=None
    if s is not None:out.append((s+off,len(mask)-1+off))
    return out
print('SCALE: columns where rows 34-66 are >=60% dark (full-height ticks), 1040..2680')
sub=dark[28:72,1040:2680]; f=sub.mean(0)
print([ (r) for r in runs(f>0.62,1040)][:40])
for row in (30,34,38,42,46,50,54,58,62): print(row, runs(dark[row,1050:2660],1050)[:3], '...', runs(dark[row,1050:2660],1050)[-2:])
print('\nFORE BREAK rows: dark runs 2880..3180')
for r in range(626,684,4): print(r, runs(dark[r,2880:3180],2880))
print('\nAFT BREAK rows: dark runs 520..800')
for r in range(650,700,4): print(r, runs(dark[r,520:800],520))
print('\nSTEM rows: last dark col in 3560..3700')
for r in range(600,830,20):
    x=np.where(dark[r,3560:3700])[0]; print(r, x.max()+3560 if len(x) else None)
print('\nSTERN rows: first dark col in 60..320')
for r in range(640,720,6):
    x=np.where(dark[r,60:320])[0]; print(r, x.min()+60 if len(x) else None)
print('\nWL row: longest dark run rows 820..870')
for r in range(826,862,3):
    rr=runs(dark[r]); print(r, max((b-a for a,b in rr),default=0), rr[0] if rr else None, rr[-1] if rr else None)
