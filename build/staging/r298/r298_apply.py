# r298: Titanic's forecastle and poop tops off the 1911 side plan; topRead on every plate-read island; the audit rule.
import json, numpy as np
W='/Users/augustgweon/Ships/'; R=W+'build/staging/r298/'
rd=json.load(open(R+'read.json'))
PX=13.0268
def WL(c): return 845-25*(c-123.5)/3505.5
d=json.load(open(R+'vessels.before.json',encoding='utf8'))
t=[v for v in d['vessels'] if v['id']=='titanic'][0]; I=t['hull']['islands']
p=[v for v in d['vessels'] if v['id']=='preussen'][0]; IP=p['hull']['islands']
PLATE="the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, 'Olympic and Titanic Side Plan 1911.png', 3803 x 1052 px, bow at the right; build/staging/r295/plates/side-plan-1911.png)"
chord={}
for isl,key in zip(I['list'],['forecastle','poop']):
    k=rd[key]['coef']; c0,c1=isl['cols']
    rows=[round(float(np.polyval(k,c)),1) for c in (c0,c1)]
    wls=[round(WL(c),1) for c in (c0,c1)]
    top=[round((w-r)/PX,2) for w,r in zip(wls,rows)]
    cs=np.linspace(c0,c1,101); curve=(WL(cs)-np.polyval(k,cs))/PX; lin=top[0]+(top[1]-top[0])*np.linspace(0,1,101)
    dev=curve-lin; j=int(np.argmax(abs(dev))); chord[key]=(round(float(dev[j]),2),round(float((cs[j]-3629)/-PX),1))
    print(isl['name'],'was',isl['topM'],'now',top,'rows',rows,'wl',wls,'chord dev',chord[key])
    isl['topM']=top
    isl['topRead']={'rows':rows,'datumRows':wls,'datumM':0.0,'pxPerM':PX,'colRange':rd[key]['colRange'],'rmsPx':rd[key]['rmsPx'],'read':'build/staging/r298/r298_read.py'}
# Preussen: r292's own reads, carried as numbers (rows over r291's datum, row 2843 = 3.65 m, 30.6 px/m)
PR={'Forecastle':[2702,2740],'Midship bridge':[2757.3,2757.3],'Poop':[2760,2775]}
for isl in IP['list']:
    rows=PR[isl['name']]
    want=[round(3.65+(2843-r)/30.6,2) for r in rows]
    assert all(abs(a-b)<=0.05 for a,b in zip(want,isl['topM'])),(isl['name'],want,isl['topM'])
    isl['topRead']={'rows':rows,'datumRows':[2843,2843],'datumM':3.65,'pxPerM':30.6,'read':'build/staging/r292/read-islands.py'+(' (the bridge island recorded flat at 6.45 m; its rows are the per-50-column trace, 2748-2765, at that height)' if isl['name']=='Midship bridge' else '')}
old="HEIGHTS ARE NOT READ HERE: each island's top is the model's weather deck plus one 2.96 m deck plus a 0.10 m plate edge. Read against the plan's waterline, the well deck stands about 1.3 m higher than the model draws it (11.7 m forward and 11.5 m aft against 10.3), and the plan's rise from the well to the raised deck is 2.0 m at the forecastle and 1.5 m at the poop against the model's 2.96."
assert I['provenance'].count(old)==1
f,pp=I['list']
new=("HEIGHTS, READ r298 (build/staging/r298/r298_read.py, read.json). The plan labels its decks at the stem: BOAT DECK, A, B, C, D, E, F and LOWER, each label standing just above its own line. "
 "C, D, E, F and LOWER are the five dashed lines at rows 666, 701, 737, 770 and 803 at column 3500, 2.7 m apart; the forecastle's deck is at the B label. Each island's deck edge is the solid bottom line of the open-rail band drawn along it. "
 f"That line was traced column by column (the forecastle on columns 3135-3615, the poop on 128-544, every 4 columns, rms {rd['forecastle']['rmsPx']} and {rd['poop']['rmsPx']} px about a quadratic) and read over the plan's tilted waterline (row 845 at the stern end to row 820 at the stem head) at 13.03 px/m. "
 f"FORECASTLE: {f['topM'][0]} m over the water at the stem head (row {f['topRead']['rows'][0]}) and {f['topM'][1]} m at the break (row {f['topRead']['rows'][1]}); the model drew 13.86 and 13.45, 1.40 m low at the stem. "
 f"POOP: {pp['topM'][0]} m at the break (row {pp['topRead']['rows'][0]}) and {pp['topM'][1]} m at the stern end (row {pp['topRead']['rows'][1]}); the model drew 13.35 and 13.56. "
 f"The builder draws each top as a straight line between its two ends; the plan's line is curved, and the straight line lies {abs(chord['forecastle'][0])} m {'under' if chord['forecastle'][0]>0 else 'over'} it at the worst point of the forecastle ({chord['forecastle'][1]} m abaft the stem head) and {abs(chord['poop'][0])} m {'under' if chord['poop'][0]>0 else 'over'} it on the poop. "
 "The heights carry the plan's 1% scale bound (0.15 m at 15 m) and about 0.1 m of line width. "
 "WHAT r295 READ AS THE WELL DECK: the heavy solid line through both wells, 11.6 m over the water at column 3020 and 11.4 m at column 660. It is the top of the wells' bulwark: the freeing ports drawn in the wells hang from it down to the dashed C line, and the cranes' pedestals are drawn standing on it because the bulwark hides their feet. The well deck is the C line, 10.62 m over the water at column 3020 and between 10.0 and 10.5 m at column 660 (two lines there, not yet told apart). The model's weather deck is 10.1 m amidships rising to 10.85 m at the ends, so it is about 0.3 m low in the fore well; the plan's C deck falls to 9.5 m amidships under the house, so the plan's sheer is about 2.4 m forward against the model's 0.75 m. That sheer is not changed here.")
I['provenance']=I['provenance'].replace(old,new)
IP['provenance']+=" TOPS AS NUMBERS, r298: each island now carries topRead (its rows, the datum rows and height, and the scale), so the audit recomputes every topM from the plate's rows."
open(W+'web/data/vessels.json','w',encoding='utf8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')

a=open(R+'audit-hulls.before.js',encoding='utf8').read()
anchor="      for (const q of groups) if (!(IL || []).some(isl => isl && isl.name === q.name)) say(v.id, 'a forecast group named for no island',"
assert a.count(anchor)==1
rule="""      /* ── A-ISLAND-TOP-READ (round 298, Titanic): AN ISLAND'S TOP IS ITS PLATE'S ROWS, AT BOTH ENDS.
         r295 read Titanic's islands' ends off the 1911 side plan and left their heights a class
         figure (the weather deck plus one 2.96 m deck), and its provenance said so; the forecastle
         stood 1.40 m under the plan at the stem. On a hull whose islands carry a plate datum
         (islands.plate), every island must carry topRead {rows, datumRows, datumM, pxPerM}, and
         each end's topM must be datumM + (datumRow - row) / pxPerM within 0.05 m. Then off the
         meshes: the island's highest vertex within 1.5 m of each built end, inside its span,
         must stand at that end's topM within 0.15 m, so a builder that drew the right top at one
         end and a flat line from it is caught at the other. Silent without islands.plate. */
      if (H.islands.plate) for (const isl of (IL || [])) {
        if (!(isl && Array.isArray(isl.topM) && isl.topM.length === 2 && Array.isArray(isl.u))) continue;
        const TR = isl.topRead;
        if (!(TR && Array.isArray(TR.rows) && TR.rows.length === 2 && Array.isArray(TR.datumRows) && TR.datumRows.length === 2 && typeof TR.datumM === 'number' && TR.pxPerM > 0)) {
          say(v.id, 'an island top under a plate datum with no read', `${isl.name}: hull.islands.plate is present and isl.topRead is absent or out of shape, so topM ${isl.topM.join('/')} m is not a reading`); continue; }
        for (const e of [0, 1]) {
          const want = TR.datumM + (TR.datumRows[e] - TR.rows[e]) / TR.pxPerM;
          if (Math.abs(isl.topM[e] - want) > 0.05) say(v.id, 'an island top off its plate read', `${isl.name} ${e ? 'aft' : 'fwd'} end: topM ${isl.topM[e]} m, the plate's row ${TR.rows[e]} over datum row ${TR.datumRows[e]} (${TR.datumM} m) at ${TR.pxPerM} px/m reads ${want.toFixed(2)} m`);
        }
        const grp = groups.find(q => q.name === isl.name);
        if (!grp) continue;
        const xa = loftDeckX(H, isl.u[0]), xb = loftDeckX(H, isl.u[1]);
        const P4 = new THREE.Vector3(), endTop = [-Infinity, -Infinity];
        grp.o.updateMatrixWorld(true);
        grp.o.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) { P4.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            if (P4.x >= xa - 0.05 && P4.x <= xa + 1.5) endTop[0] = Math.max(endTop[0], P4.y);
            if (P4.x <= xb + 0.05 && P4.x >= xb - 1.5) endTop[1] = Math.max(endTop[1], P4.y); } });
        for (const e of [0, 1])
          if (!(Math.abs(endTop[e] - isl.topM[e]) <= 0.15)) say(v.id, 'an island built off its top at one end', `${isl.name} ${e ? 'aft' : 'fwd'} end: built top ${endTop[e].toFixed(2)} m within 1.5 m of x ${(e ? xb : xa).toFixed(2)}, record ${isl.topM[e]} m`);
      }
"""
a=a.replace(anchor,rule+anchor)
open(W+'Research/audit-hulls.js','w',encoding='utf8').write(a)
open(W+'web/audit-hulls.js','w',encoding='utf8').write(a)
print('ok')
