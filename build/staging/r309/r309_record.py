#!/usr/bin/env python3
"""r309: Titanic's C deck re-traced (r309_read.py). Reads vessels.before.json, writes web/data/vessels.json."""
import json, numpy as np
R='/Users/augustgweon/Ships/build/staging/r309/'; W='/Users/augustgweon/Ships/'
rd=json.load(open(R+'read.json')); PX=3505.5/269.1
WL=lambda c:845-25*(c-123.5)/3505.5
k=rd['coef']; lo,hi=rd['colRange']; assert (lo,hi)==(150,3600)
d=json.load(open(R+'vessels.before.json',encoding='utf8'))
h=next(x for x in d['vessels'] if x['id']=='titanic')['hull']
SR=h['sheerRead']; old=dict(SR['stations'])
rows=[];drows=[];st=[]
for u,c in zip([s[0] for s in SR['stations']],SR['cols']):
    cc=min(max(c,lo),hi); r=round(float(np.polyval(k,cc)),2); dr=round(WL(cc),2)
    rows.append(r); drows.append(dr); st.append([u,round((dr-r)/PX,2)])
tr=np.array(rd['trace']); assert len(tr)==346 and tr[0,0]==3600 and tr[-1,0]==150
SR['stations']=st; SR['rows']=rows; SR['datumRows']=drows; SR['rmsPx']=rd['rmsPx']
SR['read']='build/staging/r309/r309_read.py (r299_read.py re-run with a step limit)'
# the raw trace, so the audit can see a step onto another line: one row per 10 columns, 3600 down to 150
SR['trace']={'fromCol':3600,'stepCol':-10,'rows':[round(float(x),1) for x in tr[:,1]],'maxStepRows':1.5}
mid=dict(st)[0.5]; low=min(st[1:-1],key=lambda s:s[1])
def at(u): return dict(st)[u]
SR['provenance']=("PLATE READ, r299, RE-TRACED r309: the C deck (the shelter deck, which ran her whole length and was the floor of both well decks) "
 "off the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, 'Olympic and Titanic Side Plan 1911.png', "
 "3803 x 1052 px, bow at the right; build/staging/r295/plates/side-plan-1911.png). The plan labels its decks beside the stem, and the C label stands "
 "just above a dashed line at row 661 at column 3600. That line was followed aft every 10 columns to column 150 (346 points, each the darkness peak "
 "of a 40-column window no more than 1.5 rows from the last point; the line's steepest real slope is 1 row in 10 columns), and fitted as a quintic in the column "
 "(rms %.2f px, about 0.05 m). Each station's height is the fit's row read over r297's waterline, which tilts from row 845 at the stern end (column 123.5) "
 "to row 820 at the stem head (column 3629), at 13.03 px/m. The columns map to u through the loft's deck-level line, as r295 placed the islands. "
 "Beyond the trace (columns 3600 and 150) each end station holds the fit's end value. The deck stands %.1f m over the water at the stem, %.1f m at the "
 "forecastle break, %.2f m amidships, lowest at %.2f m at u %.2f, %.2f m in the after well (u 0.85) and %.1f m at the stern. "
 "The builder draws the sheer as a monotone cubic through these stations. trace holds the raw rows, so the fit can be checked against them. "
 "BOUNDS: the plan's scale carries 1%% (0.1 m at 10 m), the line's width about 0.1 m, and the waterline's tilt is r297's read. "
 "WHAT r299 READ WRONG: r299's trace let each point move 4 rows from the last. At column 790, under the house 3 m forward of its after end, a solid line "
 "begins 5 to 6 rows (about 0.4 m) under the dashed C line and runs aft under the after well and the poop to the stern; the trace stepped down onto it "
 "and followed it to column 150, while its provenance said it followed the dashed line. That put the deck 0.27 m low in the after well, 0.37 m low at "
 "u 0.90 and 0.4 m low at the stern, and its rms was 1.20 px where this trace's is %.2f. The solid line is not identified; it is not C, which the plan "
 "draws dashed along the whole length. In the after well the plan draws three things close together: the wash ports' lower edges at rows 704 to 706, "
 "the dashed C deck at 710 to 711, and that solid line at 715 to 717. "
 "The heavy solid line 1.2 to 1.8 m over C, from 11.6 m at the forecastle break through 10.9 m amidships to 12.3 m at the stern, is the top of the shell "
 "and of the wells' bulwark (r303), not a deck.") % (rd['rmsPx'],at(0.0),at(0.15),mid,low[1],low[0],at(0.85),at(1.0),rd['rmsPx'])
oldD=h['deckM']; boat=h['boatDeckM']; n=h['decks']
h['deckM']=round((boat-mid)/n,3)
h['deckMProvenance']=("DERIVED, r299, r309: the boat deck's recorded %.1f m over the water less the C deck's read %.2f m amidships (sheerRead), "
 "over the %d decks the house stands above C (B, A and the boat deck): %.3f m. It was 2.96 m while the model drew the deck at 10.1 m amidships, "
 "and 3.133 m on r299's read of 9.60 m.")%(boat,mid,n,h['deckM'])
# the after well's ports: the sentence about the deck under them
isl=h['islands']; P=isl['portsProvenance']
a="In the after well they stand 0.66 and 0.76 m over the recorded deck, which r303 found about 1 m lower there than in the forward well while the bulwark line is only 0.1 to 0.5 m lower; the model cuts them where the plan draws them and leaves the sill."
assert P.count(a)==1
P=P.replace(a,"In the after well they stand 0.35 to 0.44 m over the C deck, whose dashed line the plan draws 5 to 6 rows (about 0.4 m) under their lower edges; the model cuts them where the plan draws them and leaves the sill. (r307 had them 0.66 and 0.76 m over the deck, on r299's trace, which ran 0.3 m low there; r309 re-traced it.)")
isl['portsProvenance']=P
import os
open(W+'web/data/vessels.json.tmp','w',encoding='utf8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n'); os.replace(W+'web/data/vessels.json.tmp',W+'web/data/vessels.json')
print('deckM',oldD,'->',h['deckM'])
for (u,m) in st: print('  u %.2f %.2f (was %.2f, %+.2f)'%(u,m,old[u],m-old[u]))
