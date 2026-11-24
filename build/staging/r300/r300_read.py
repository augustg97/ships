# r300: Titanic's two trucks off the 1911 side plan. Each mast's centre line (r296's fit) is followed up
# to the highest row with ink within 3 px of it; that row is read over r297's tilted waterline.
import numpy as np, json
from PIL import Image
a=np.asarray(Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('L')).astype(int)
dark=a<128
PX=3505.5/269.1
def WL(c): return 845-25*(c-123.5)/3505.5
fit=json.load(open('/Users/augustgweon/Ships/build/staging/r296/fit.json'))['M']
out={}
for n in ('fore','main'):
    m=fit[n]; k=m['k']; b=m['col@y13.5']-k*m['row@y13.5']
    rows=[r for r in range(0,200) if dark[r,int(round(k*r+b))-3:int(round(k*r+b))+4].any()]
    top=min(rows); c=k*top+b
    out[n]=dict(col=round(float(c),1),topRow=top,wlRow=round(WL(c),1),overWL=round((WL(c)-top)/PX,2))
    print(n,out[n])
json.dump(out,open('/Users/augustgweon/Ships/build/staging/r300/trucks.json','w'),indent=1)
