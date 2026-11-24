# r309: each station from a local quadratic through the trace within 50 columns of it (11 points),
# in place of r299's single quintic over the whole length, which bulged 1.8 px off the trace amidships.
import json, numpy as np
d=json.load(open('read.json')); PX=3505.5/269.1
WL=lambda c:845-25*(c-123.5)/3505.5
t=np.array(d['trace']); c,r=t[:,0],t[:,1]
assert len(c)==346 and c[0]==3600 and c[-1]==150 and np.all(np.diff(c)==-10)
steps=np.abs(np.diff(r)); print('largest step between trace points %.2f rows at col %d'%(steps.max(),c[np.argmax(steps)+1]))
lo,hi=150,3600
st=[]
for s in d['stations']:
    cc=min(max(s['col'],lo),hi); m=np.abs(c-cc)<=50
    k=np.polyfit(c[m]-cc,r[m],2); row=float(k[2]); res=r[m]-np.polyval(k,c[m]-cc)
    tr=float(np.interp(cc,c[::-1],r[::-1]))
    st.append(dict(u=s['u'],col=s['col'],row=round(row,2),datum=round(WL(cc),2),m=round((WL(cc)-row)/PX,2),trace=round(tr,2),res=round(float(np.abs(res).max()),2),quintic=s['m']))
for s in st: print('  u %.2f row %.2f trace %.2f (local max res %.2f) -> %.2f m, quintic %.2f'%(s['u'],s['row'],s['trace'],s['res'],s['m'],s['quintic']))
json.dump(st,open('stations.json','w'),indent=0)
