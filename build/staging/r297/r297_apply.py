import json
W='/Users/augustgweon/Ships/'; R=W+'build/staging/r297/'
rd=json.load(open(R+'read.json'))
d=json.load(open(R+'vessels.before.json',encoding='utf8'))
t=[v for v in d['vessels'] if v['id']=='titanic'][0]; h=t['hull']
assert 'funnelTopM' not in h
new={}
for k,v in h.items():
    new[k]=v
    if k=='funnelH':
        new['funnelTopM']=42.8
        new['funnelTopRead']={
          'plate':"the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, 'Olympic and Titanic Side Plan 1911.png', 3803 x 1052 px, bow at the right; build/staging/r295/plates/side-plan-1911.png)",
          'pxPerM':13.0268,
          'topRows':[f['topRow'] for f in rd],
          'wlRows':[float(f['wlRow']) for f in rd],
          'overWLM':[float(f['overWL']) for f in rd],
          'read':'build/staging/r297/r297_read.py',
          'provenance':("RECORDED, r297: the funnel heads stand 42.80 m over the load waterline. Harland and Wolff's figures for the class give 175 ft (53.34 m) from the keel to the top of the funnels and a load draught of 34 ft 7 in (10.54 m); the difference is 42.80 m. "
            "CHECKED against the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, 'Olympic and Titanic Side Plan 1911.png', bow at the right). Each funnel's head is drawn with its top edge square to the raked stack. That edge was fitted as a line and read where r296's fit of the stack's axis meets it: rows 280.8, 280.7, 281.1 and 289.4, which over the plan's tilted waterline (row 845 at the stern to row 820 at the bow) stand 41.96, 42.22, 42.45 and 42.06 m, mean 42.17 m. At the plan's length scale (13.03 px/m, from her 269.1 m overall) that is 0.63 m under the record. The plan's own bar scale is 1% longer and gives 42.58 m. At funnel 3 the plan's keel line lies on row 971, 10.53 m under its waterline, which matches the recorded draught. "
            "WHY THE MODEL WAS LOW: funnelH (19.0 m, the 62 ft funnel height the specification sources print) was built up from the boat deck, which puts the heads at 38.87 m. The record's waterline-to-boat-deck figure is 60 ft 6 in (18.44 m), so the heads stand 24.4 m over the boat deck. The 62 ft is therefore not measured from the boat deck, and the sources that print it do not say what it is measured from. The builder now solves each stack's height from its own deck to funnelTopM, so the head lands at the recorded height whatever the deck under it."),
        }
h.clear(); h.update(new)
open(W+'web/data/vessels.json','w',encoding='utf8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')

b=open(R+'hull.before.js',encoding='utf8').read()
old1="  const h = S.funnelH !== undefined ? S.funnelH : S.beam * 1.55;\n"
assert b.count(old1)==1
b=b.replace(old1,"  const hRec = S.funnelH !== undefined ? S.funnelH : S.beam * 1.55;\n")
old2="""    for (const t of T.tiers) if (u >= t.uA && u <= t.uB) y = Math.max(y, t.y1);
    const g = new THREE.Group();
    /* ── ⚠ THE FLICKER WAS THE FUNNEL'S OWN BASE"""
assert b.count(old2)==1
b=b.replace(old2,"""    for (const t of T.tiers) if (u >= t.uA && u <= t.uB) y = Math.max(y, t.y1);
    /* ── ⚠ A RECORDED HEAD HEIGHT IS OVER THE WATER, NOT OVER A DECK (round 297) ───────
       funnelH is a funnel's own length, and the sources that print one rarely say what it is
       measured from. Titanic's 62 ft (19.0 m) was built up from the boat deck and put her
       heads at 38.87 m, where the class's 175 ft keel-to-funnel-top less her 34 ft 7 in
       draught puts them at 42.80 m and the 1911 side plan draws them at 42.0 to 42.5 m.
       funnelTopM is the head over the load waterline. Where the record carries it, each
       stack's height is solved from ITS OWN deck, so the head lands at the recorded height
       whichever tier the casing stands on. The head is y + caseH * 0.55 + h with
       caseH = 0.085 h, hence the divisor. */
    const h = S.funnelTopM !== undefined ? (S.funnelTopM - y) / (1 + 0.085 * 0.55) : hRec;
    const g = new THREE.Group();
    /* ── ⚠ THE FLICKER WAS THE FUNNEL'S OWN BASE""")
open(W+'web/js/hull.js','w',encoding='utf8').write(b)

a=open(R+'audit-hulls.before.js',encoding='utf8').read()
anchor="""    /* ── A-CROWS-NEST (round 296, Titanic): THE NEST STANDS WHERE THE PLAN DRAWS IT, ON THE MAST."""
assert a.count(anchor)==1
rule="""    /* ── A-FUNNEL-TOP (round 297, Titanic): A RECORDED FUNNEL HEAD STANDS AT ITS RECORDED HEIGHT.
       Her stacks were built 19.0 m up from the boat deck, which put the heads at 38.87 m over
       the water against the record's 42.80 m (175 ft keel to funnel top, less 34 ft 7 in of
       draught). Where a hull carries funnelTopM, this rule reads each built stack's highest
       vertex and convicts any head more than 0.15 m off. It also convicts the silence: a hull
       whose funnel stations were read off a plan (funnelRead) and whose head height was not
       recorded, because a station read with no height leaves the height a class default. */
    {
      if (H.funnelRead && H.funnelTopM === undefined)
        say(v.id, 'funnel stations read with no head height', 'hull.funnelRead is present and hull.funnelTopM is absent');
      if (H.funnelTopM !== undefined) {
        g.updateMatrixWorld(true);
        const invT = new THREE.Matrix4().copy(g.matrixWorld).invert(), P = new THREE.Vector3();
        let n = 0;
        g.traverse(o => {
          if (!o.isMesh || !o.userData.part || o.userData.part.name !== 'Funnel') return;
          n++;
          const M = new THREE.Matrix4().multiplyMatrices(invT, o.matrixWorld), A = o.geometry.attributes.position;
          let top = -Infinity;
          for (let k = 0; k < A.count; k++) top = Math.max(top, P.fromBufferAttribute(A, k).applyMatrix4(M).y);
          if (Math.abs(top - H.funnelTopM) > 0.15)
            say(v.id, 'a funnel head off its recorded height', `funnel ${n}: head at ${top.toFixed(2)} m over the water, the record says ${H.funnelTopM} m (${(top - H.funnelTopM).toFixed(2)} m off)`);
        });
        if (!n) say(v.id, 'a funnel head height with no funnel built', 'hull.funnelTopM is present and no Funnel mesh was found');
      }
    }
"""
a=a.replace(anchor,rule+anchor)
for p in ('Research/audit-hulls.js','web/audit-hulls.js'): open(W+p,'w',encoding='utf8').write(a)
print('applied')
