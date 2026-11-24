# r299: horizontal line rows on the 1911 side plan, per 40-column window, rows 600-830
import numpy as np, sys
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
for c in [int(x) for x in sys.argv[1:]]:
    p=dark[600:840,c-20:c+20].mean(1)
    pk=[ (600+i,round(float(p[i]),2)) for i in range(1,len(p)-1) if p[i]>=0.3 and p[i]>=p[i-1] and p[i]>=p[i+1]]
    print(c, ' '.join('%d:%.2f'%x for x in pk))
