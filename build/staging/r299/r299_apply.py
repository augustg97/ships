#!/usr/bin/env python3
"""r299: Titanic's deck line (her sheer) read off the 1911 side plan as a record curve.
Reads the *.before.* copies and writes web/ and Research/, so it can be re-run from clean."""
import json, sys
R='/Users/augustgweon/Ships/build/staging/r299/'; W='/Users/augustgweon/Ships/'
def sub1(s,old,new,n=1):
    assert s.count(old)==n,(old[:80],s.count(old)); return s.replace(old,new)
rd=json.load(open(R+'read.json'))
PX=3505.5/269.1
WL=lambda c:845-25*(c-123.5)/3505.5
import numpy as np
k=rd['coef']; lo,hi=rd['colRange']
rows=[];drows=[]
for u,c in zip([s[0] for s in rd['stations']],rd['cols']):
    cc=min(max(c,lo),hi); rows.append(round(float(np.polyval(k,cc)),2)); drows.append(round(WL(cc),2))
st=[[u,round((dr-r)/PX,2)] for (u,_),r,dr in zip(rd['stations'],rows,drows)]
for a,b in zip(st,rd['stations']): assert abs(a[1]-b[1])<=0.011,(a,b)
d=json.load(open(R+'vessels.before.json',encoding='utf8'))
h=next(x for x in d['vessels'] if x['id']=='titanic')['hull']
mid=dict(st)[0.5]
h['sheerRead']={'stations':st,'rows':rows,'datumRows':drows,'datumM':0.0,'pxPerM':round(PX,4),'cols':rd['cols'],
 'colRange':rd['colRange'],'rmsPx':rd['rmsPx'],'read':'build/staging/r299/r299_read.py',
 'provenance':("PLATE READ, r299: the C deck (the shelter deck, which ran her whole length and was the floor of both well decks) "
 "off the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, 'Olympic and Titanic Side Plan 1911.png', "
 "3803 x 1052 px, bow at the right; build/staging/r295/plates/side-plan-1911.png). The plan labels its decks beside the stem, and the C label stands "
 "just above a dashed line at row 661 at column 3600. That line was followed aft every 10 columns to column 150 (346 points, each the darkness peak "
 "of a 40-column window within 4 rows of the last), and fitted as a quintic in the column (rms %.2f px, about 0.09 m). Each station's height is the "
 "fit's row read over r297's waterline, which tilts from row 845 at the stern end (column 123.5) to row 820 at the stem head (column 3629), at 13.03 px/m. "
 "The columns map to u through the loft's deck-level line, as r295 placed the islands (its two breaks map back to u 0.1354 and 0.8858 exactly). "
 "Beyond the trace (columns 3600 and 150) each end station holds the fit's end value. The deck stands 12.2 m over the water at the stem, 10.7 m at the "
 "forecastle break, %.2f m amidships, lowest at 9.55 m at u 0.60, and 10.1 m at the stern: a sheer of about 2.6 m forward and 0.6 m aft. "
 "The builder draws the sheer as a monotone cubic through these stations. BOUNDS: the plan's scale carries 1%% (0.1 m at 10 m), the line's width about "
 "0.1 m, and the waterline's tilt is r297's read. CONTESTED IN THE AFTER WELL: between columns 560 and 760 the plan draws three lines close together, "
 "at rows 704, 710 and 716 (10.5, 10.05 and 9.6 m). The trace follows the dashed line at row 710, the one continuous with the C line amidships, so the "
 "after well deck carries a bound of about 0.45 m. The heavy solid line 1.2 to 1.8 m higher, from 11.6 m at the forecastle break through 10.9 m "
 "amidships to 12.3 m at the stern, is the top of the shell and of the wells' bulwark, not a deck. The model's rail still stands a class 1 m over this "
 "deck.") % (rd['rmsPx'],mid)}
old=h['deckM']; boat=h['boatDeckM']; n=h['decks']
h['deckM']=round((boat-mid)/n,3)
h['deckMProvenance']=("DERIVED, r299: the boat deck's recorded %.1f m over the water less the C deck's read %.2f m amidships (sheerRead), "
 "over the %d decks the house stands above C (B, A and the boat deck): %.3f m. It was %.2f m while the model drew the deck at 10.1 m amidships; "
 "the plan's C deck is %.2f m lower there, so the same three decks must each be about 0.17 m taller to reach the same boat deck.")%(boat,mid,n,h['deckM'],old,10.1-mid)
open(W+'web/data/vessels.json','w',encoding='utf8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
print('deckM',old,'->',h['deckM'],' stations',st)

# ---------------------------------------------------------------- the builder
s=open(R+'hull.before.js',encoding='utf8').read()
s=sub1(s,"""  const sheer = u => {
    const s = Math.abs(2 * u - 1);
    const rise = u < 0.5 ? S.sheerBow : S.sheerStern;
    const base = S.freeboard + rise * Math.pow(s, 2.8);""","""  /* ── A READ DECK LINE OUTRANKS THE STANDARD CURVE (sheerRead, round 299, Titanic) ──────
     The curve below is a class shape: one freeboard amidships and two rises at the ends.
     Titanic's 1911 side plan draws her C deck 9.60 m over the water amidships, lowest at
     u 0.60, and climbing 2.6 m to the stem and 0.5 m to the stern; the class curve had her
     0.5 m high amidships and 0.4 m low at the forecastle break. A hull whose record carries
     the read stations draws the sheer as a monotone cubic through them, so the deck, the
     house, the masts' feet and every fitting pinned to the sheer stand where the plate puts
     them. Record-gated: every other hull is byte-identical. */
  const SR = S.sheerRead && Array.isArray(S.sheerRead.stations) && S.sheerRead.stations.length >= 2
    ? pchip(S.sheerRead.stations.map(([u, r]) => ({ u, r }))) : null;
  const sheer = u => {
    const s = Math.abs(2 * u - 1);
    const rise = u < 0.5 ? S.sheerBow : S.sheerStern;
    const base = SR ? SR(u) : S.freeboard + rise * Math.pow(s, 2.8);""")
open(W+'web/js/hull.js','w',encoding='utf8').write(s)

# ---------------------------------------------------------------- the audit
a=open(R+'audit-hulls.before.js',encoding='utf8').read()
anchor="""    if (part.container || part.forecast) {
      const H2 = SHIPS_HULL.hullSurface(H);
      let over = 0, worst = 0;"""
a=sub1(a,anchor,"""    /* ── A-SHEER-READ (round 299, Titanic): A READ DECK LINE IS ITS PLATE'S ROWS, AND THE BUILT DECK.
       Titanic's sheer was the class curve (freeboard 10.1 m, rises 0.7 and 0.4 m) while her
       side plan draws the C deck 9.60 m amidships and 2.6 m higher at the stem. On a hull whose
       record carries sheerRead: every station's height must be datumM + (datumRow - row) /
       pxPerM within 0.05 m; hullSurface's sheer must pass through every station within 0.05 m;
       and off the meshes, the deck's OUTERMOST vertex within 0.5 m of each station's x, between
       the islands, must stand at that station within 0.15 m. The outermost, because the deck is
       cambered: its crown stands about half a metre over its edge on a 28 m beam, and the
       sheer is the edge. Silent without sheerRead. */
    if (H.sheerRead) {
      const SR = H.sheerRead, ST = SR.stations;
      if (!(Array.isArray(ST) && ST.length >= 2 && Array.isArray(SR.rows) && SR.rows.length === ST.length && Array.isArray(SR.datumRows) && SR.datumRows.length === ST.length && SR.pxPerM > 0 && typeof SR.datumM === 'number'))
        say(v.id, 'a deck line read with no rows', 'hull.sheerRead needs stations, rows and datumRows of one length, datumM and pxPerM');
      else {
        const HS = SHIPS_HULL.hullSurface(H);
        const inIsland = u => ((H.islands && H.islands.list) || []).some(isl => isl && Array.isArray(isl.u) && u >= isl.u[0] - 0.01 && u <= isl.u[1] + 0.01);
        const P5 = new THREE.Vector3();
        const near = ST.map(() => NaN), far = ST.map(() => -1), xs = ST.map(([u]) => loftDeckX(H, u));
        g.updateMatrixWorld(true);
        g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (!pt || pt.key !== 'deck') return;
          const pa = o.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) { P5.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
            for (let j = 0; j < ST.length; j++) if (Math.abs(P5.x - xs[j]) <= 0.5 && Math.abs(P5.z) > far[j]) { far[j] = Math.abs(P5.z); near[j] = P5.y; } } });
        ST.forEach(([u, m], j) => {
          const want = SR.datumM + (SR.datumRows[j] - SR.rows[j]) / SR.pxPerM;
          if (Math.abs(m - want) > 0.05) say(v.id, 'a deck line station off its plate read', `u ${u}: ${m} m, the plate's row ${SR.rows[j]} over datum row ${SR.datumRows[j]} reads ${want.toFixed(2)} m`);
          if (Math.abs(HS.sheer(u) - m) > 0.05) say(v.id, 'a sheer drawn off its read deck line', `u ${u}: hullSurface sheer ${HS.sheer(u).toFixed(2)} m, the read ${m} m`);
          if (u > 0.02 && u < 0.98 && !inIsland(u) && !(Math.abs(near[j] - m) <= 0.15))
            say(v.id, 'a deck built off its read deck line', `u ${u}: the deck's outermost vertex within 0.5 m of x ${xs[j].toFixed(2)} stands at ${near[j].toFixed(2)} m, the read ${m} m`);
        });
      }
    }

"""+anchor)
open(W+'Research/audit-hulls.js','w',encoding='utf8').write(a)
print('builder and audit written')
