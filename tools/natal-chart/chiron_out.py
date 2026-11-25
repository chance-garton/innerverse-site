import swisseph as swe, numpy as np
swe.set_ephe_path('ephe')
step=10; j0=swe.julday(675,6,1,0,swe.JUL_CAL); j1=swe.julday(2999,12,1,0)
js=np.arange(j0,j1+step,step)
raw=[]
for j in js:
    r=swe.calc_ut(j,swe.CHIRON,swe.FLG_SWIEPH); raw.append(r[0][0])
L=np.degrees(np.unwrap(np.radians(raw)))
# accuracy test
rng=np.random.default_rng(2); err=0
for t in rng.uniform(j0+step,j1-2*step,4000):
    i=int((t-j0)//step); x=(t-js[i])/step; p=L[i-1:i+3]; xs=[-1,0,1,2]
    v=sum(p[k]*np.prod([(x-xs[m])/(xs[k]-xs[m]) for m in range(4) if m!=k]) for k in range(4))
    err=max(err,abs(((v-swe.calc_ut(t,swe.CHIRON)[0][0])+180)%360-180))
print('n',len(js),'max err arcsec',err*3600)
q=np.round(L*10000).astype(np.int64); d=np.diff(q)
import json; json.dump({'jd0':float(j0),'step':step,'v0':int(q[0]),'d':','.join(map(str,d))},open('site/chiron.json','w'),separators=(',',':'))
import os; print(os.path.getsize('site/chiron.json'))
