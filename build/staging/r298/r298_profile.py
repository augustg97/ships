# r298: dark-row runs per column window on the 1911 side plan, as metres over its tilted waterline.
import numpy as np, sys
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
for c in [int(x) for x in sys.argv[1:]]:
    frac=dark[150:900,c-8:c+9].mean(1)
    rows=np.where(frac>=0.30)[0]+150
    runs=[];
    for r in rows:
        if runs and r-runs[-1][1]<=1: runs[-1][1]=r
        else: runs.append([r,r])
    wl=WL(c)
    print('col',c,'WL row %.1f'%wl)
    for r0,r1 in runs:
        m=(r0+r1)/2; print('   rows %d-%d  frac %.2f  %.2f m'%(r0,r1,frac[r0-150:r1-149].max(),(wl-m)/PX))
