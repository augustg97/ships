#!/usr/bin/env python3
"""r296: Titanic's four funnels and two masts stand where the 1911 side plan draws them.
Reads the *.before.* files and writes web/ and Research/, so it can be re-run from clean."""
import json, sys
R='/Users/augustgweon/Ships/build/staging/r296/'; W='/Users/augustgweon/Ships/'
FOOT=json.loads(sys.argv[1]) if len(sys.argv)>1 else [10.31,10.283]
def sub1(s,old,new):
    assert s.count(old)==1,(old[:70],s.count(old)); return s.replace(old,new)
fit=json.load(open(R+'fit.json'))
d=json.load(open(R+'vessels.before.json',encoding='utf8'))
v=next(x for x in d['vessels'] if x['id']=='titanic'); h=v['hull']
L,loa=h['lwl'],h['loa']; rs=min(1,max(0,loa-L)/((h['stemRake']+h['sternRake'])*loa))
def rake(u):
    if u<h['forefoot']:
        k=(h['forefoot']-u)/h['forefoot']; return -h['stemRake']*rs*k*k*loa
    if u>1-h['run']:
        k=(u-(1-h['run']))/h['run']; return h['sternRake']*rs*k*k*loa
    return 0.0
x_of=lambda u:(u-.5)*L+rake(u)
def u_of(x):
    a,b=0.,1.
    for _ in range(60):
        m=(a+b)/2
        if x_of(m)<x:a=m
        else:b=m
    return (a+b)/2
STEM,STERN=3629.0,123.5; PX=(STEM-STERN)/loa; xHead=x_of(0)
col_x=lambda c:xHead+(STEM-c)/PX
WL=lambda c:845-25*(c-123.5)/3505.5
# funnels: the centre line at the height of the stack's root (19.0 m over the waterline)
fc=[fit['F'][k]['col'] for k in('f1','f2','f3','f4')]
fx=[col_x(c) for c in fc]
h['funnelAt']=[round(x/L+.5,4) for x in fx]
# masts: the pole's centre line at the height of the model's own mast foot
M=fit['M']; mc=[]
for name,yF in zip(('fore','main'),FOOT):
    k=M[name]['k']; c0,r0=M[name]['col@y10.3'],M[name]['row@y10.3']; b=c0-k*r0; c=c0
    for _ in range(4): c=k*(WL(c)-yF*PX)+b
    mc.append(round(c,1))
for m,c in zip(h['masts'],mc): m['at']=round(u_of(col_x(c)),4)
PLATE="the side plan of Olympic and Titanic in Engineering vol. 91, 26 May 1911 (Wikimedia Commons, 'Olympic and Titanic Side Plan 1911.png', 3803 x 1052 px, bow at the right; build/staging/r295/plates/side-plan-1911.png)"
h['stationRead']={'plate':PLATE,'stemHeadCol':STEM,'sternEndCol':STERN,'pxPerMAlongHull':round(-PX,4),'cols':mc,'colBoundPx':4,
 'stemHeadX':round(xHead,3),'distAbaftStemHeadM':[round((STEM-c)/PX,2) for c in mc],'read':'build/staging/r296/r296_fit2.py',
 'mapping':"each column's distance abaft the stem head is placed at x = stemHeadX + that distance, and the station is solved through the loft's deck-level line x(u) = (u - 0.5) lwl + rake(u)"}
h['stationProvenance']=("PLATE READ, r296: the two masts' stations off "+PLATE+". Each mast is drawn on the plan as two tapering edges. Both edges were traced every 2 rows from row 430 to row 598 and fitted as lines (rms 0.2 to 0.4 px), and the mast's centre line is their mean. "
 f"The centre line is read at the height of the model's own mast foot over the plan's waterline, which tilts from row 845 at the stern to row 820 at the bow: the fore at column {mc[0]}, the main at column {mc[1]}. The scale is the plan's 13.03 px/m over her recorded 269.1 m. The plan's bar scale reads 1% longer, so these distances carry a bound of 1%, and the read itself about 4 px (0.3 m). "
 "The plan's mast centre lines lean 10.4 and 9.8 degrees on the page. Taking out the 0.41 degrees by which the plan's waterline is tilted leaves 10.0 and 9.4, so the record keeps its attested rake of 2 inches to the foot (9.46 degrees).")
h['funnelRead']={'cols':fc,'yM':19.0,'stemHeadCol':STEM,'pxPerMAlongHull':round(-PX,4),'colBoundPx':3,'read':'build/staging/r296/r296_fit2.py',
 'provenance':("PLATE READ, r296: the four funnels' stations off "+PLATE+". Each funnel's two edges were read on rows 304 to 345, in the plain head of the stack above the guys, and their midpoints fitted as a line (rms 0.2 px). The line is read at 19.0 m over the plan's waterline, the height of the stack's root in the model: "
 f"columns {fc[0]}, {fc[1]}, {fc[2]} and {fc[3]}, which stand {(STEM-fc[0])/PX:.1f}, {(STEM-fc[1])/PX:.1f}, {(STEM-fc[2])/PX:.1f} and {(STEM-fc[3])/PX:.1f} m abaft the stem head. The spacing is {(fc[0]-fc[1])/PX:.1f}, {(fc[1]-fc[2])/PX:.1f} and {(fc[2]-fc[3])/PX:.1f} m. funnelAt is x / lwl, which is how buildFunnel places a stack. The scale carries the plan's 1% bound.")}
# the crow's nest: the box on the foremast's fore side, rows 470 (top) to 490 (foot), columns 3138.5 to 3153.5
wlN=WL(3146); yTop,yFoot=(wlN-470)/PX,(wlN-490)/PX
h['masts'][0]['crowsNest']={'yM':round((yTop+yFoot)/2,2),'heightM':round(yTop-yFoot,2),'foreM':round(15/PX,2),
 'read':{'col':3146,'topRow':470,'footRow':490,'wlRow':round(wlN,1),'pxPerM':round(PX,4)},
 'provenance':("PLATE READ, r296: the crow's nest off "+PLATE+". The plan draws it as a box on the fore side of the foremast, its top on row 470, its foot on row 490, reaching from the mast's fore edge at column 3138.5 to column 3153.5. The plan's waterline stands on row "+f"{wlN:.1f}"+" at that column, so the box stands "+f"{yFoot:.1f} to {yTop:.1f}"+" m over the water and reaches 1.15 m forward of the mast. The read is good to about 2 rows (0.15 m). The model had hung it at two thirds of the mast, 44.9 m over the water, which was a class rule with no source.")}
open(W+'web/data/vessels.json','w',encoding='utf8').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
# ---------- the audit
a=open(R+'audit-hulls.before.js',encoding='utf8').read()
RULE=r"""/* ── A-FUNNEL-STATIONS (round 296, Titanic): A FUNNEL STANDS WHERE ITS OWN READ PUTS IT.
       Her four funnels were spaced evenly at 28.5 m while the 1911 side plan draws them 35 to
       36 m apart, which left the forward funnel 16.6 m abaft the plan's. The record now carries
       the read (hull.funnelRead: each stack's plan column at a stated height), and this rule
       measures each built stack's own vertices: the centre of its lowest ring and of its
       highest, interpolated to the read's height, against the plan's distance abaft the loft's
       stem head (0.25 m). It also convicts the silence: a hull with funnels whose islands were
       read off a side plan and whose funnels were not. */
    {
      const FR = H.funnelRead;
      if (!FR && H.funnels && H.islands && H.islands.plate)
        say(v.id, 'funnels on a side-plan hull with no read of their own', 'hull.islands.plate is present and hull.funnelRead is absent');
      if (FR) {
        const stacks = [];
        g.updateMatrixWorld(true);
        const invF = new THREE.Matrix4().copy(g.matrixWorld).invert();
        g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.name === 'Funnel') stacks.push(o); });
        if (stacks.length !== (FR.cols || []).length)
          say(v.id, 'a funnel read that does not match the funnels built', `${(FR.cols || []).length} columns read, ${stacks.length} stacks built`);
        else {
          const xHeadF = loftDeckX(H, 0), P = new THREE.Vector3();
          stacks.forEach((m, i) => {
            const M = new THREE.Matrix4().multiplyMatrices(invF, m.matrixWorld), A = m.geometry.attributes.position;
            let y0 = Infinity, y1 = -Infinity;
            for (let k = 0; k < A.count; k++) { P.fromBufferAttribute(A, k).applyMatrix4(M); y0 = Math.min(y0, P.y); y1 = Math.max(y1, P.y); }
            let a0 = Infinity, b0 = -Infinity, a1 = Infinity, b1 = -Infinity;
            for (let k = 0; k < A.count; k++) { P.fromBufferAttribute(A, k).applyMatrix4(M);
              if (P.y < y0 + 0.02) { a0 = Math.min(a0, P.x); b0 = Math.max(b0, P.x); }
              if (P.y > y1 - 0.02) { a1 = Math.min(a1, P.x); b1 = Math.max(b1, P.x); } }
            const c0 = (a0 + b0) / 2, c1 = (a1 + b1) / 2, built = c0 + (c1 - c0) * (FR.yM - y0) / (y1 - y0);
            const plate = xHeadF + (FR.cols[i] - FR.stemHeadCol) / FR.pxPerMAlongHull;
            if (Math.abs(built - plate) > 0.25)
              say(v.id, 'a funnel built off its read', `funnel ${i + 1}: its axis at y ${FR.yM} stands at x ${built.toFixed(2)}; the plan's column ${FR.cols[i]} puts it at ${plate.toFixed(2)} (${(built - plate).toFixed(2)} m off)`);
          });
        }
      }
    }
    /* ── A-RIG-DATUM (round 291, Preussen)"""
a=sub1(a,"/* ── A-RIG-DATUM (round 291, Preussen)",RULE)
NR=r"""/* ── A-CROWS-NEST (round 296, Titanic): THE NEST STANDS WHERE THE PLAN DRAWS IT, ON THE MAST.
       A class rule hung it at two thirds of the mast, 44.9 m over the water, where the 1911 side
       plan draws it at 26.4 m. Where a mast's crowsNest carries a read, this rule measures the
       built nest: its centre height against the plan's rows (0.2 m), and its aft edge against the
       mast's own fore face at that height, read off the mast's vertices (it must touch, 0.15 m).
       It convicts the silence: a nest with no read on a hull whose stations were read. */
    (H.masts || []).forEach((mk, mi) => {
      if (!mk.crowsNest) return;
      const CN = mk.crowsNest;
      if (CN === true || !CN.read) { if (H.stationRead) say(v.id, "a crow's nest with no read on a plate-read mast", `masts[${mi}].crowsNest carries no plate read`); return; }
      g.updateMatrixWorld(true);
      const invN = new THREE.Matrix4().copy(g.matrixWorld).invert(), bN = new THREE.Box3(), P = new THREE.Vector3();
      let seg0 = null;
      g.traverse(o => { if (!o.isMesh) return;
        if (o.userData.part && o.userData.part.name === "Crow's nest") { const A = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(invN, o.matrixWorld); for (let k = 0; k < A.count; k++) bN.expandByPoint(P.fromBufferAttribute(A, k).applyMatrix4(M)); }
        const s = o.userData.seg; if (s && s.mi === mi && s.si === 0) seg0 = o; });
      if (bN.isEmpty()) { say(v.id, "a crow's nest recorded and not built", `masts[${mi}]`); return; }
      const R = CN.read, plateY = (R.wlRow - (R.topRow + R.footRow) / 2) / R.pxPerM, yC = (bN.min.y + bN.max.y) / 2;
      if (Math.abs(yC - plateY) > 0.2) say(v.id, "a crow's nest built off its read", `its centre stands ${yC.toFixed(2)} m over the water; the plan's rows put it at ${plateY.toFixed(2)}`);
      if (seg0) {
        const A = seg0.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(invN, seg0.matrixWorld);
        /* the mast's fore face, off its own vertices: a cylinder has two rings, split at
           mid-height, and the forward-most vertex of each is a point on the face. A raked ring
           does not lie at one height, so a rule reading "the lowest vertices" sees a part of it. */
        let yLo = Infinity, yHi = -Infinity;
        for (let k = 0; k < A.count; k++) { P.fromBufferAttribute(A, k).applyMatrix4(M); yLo = Math.min(yLo, P.y); yHi = Math.max(yHi, P.y); }
        const yMid = (yLo + yHi) / 2; let f0 = null, f1 = null;
        for (let k = 0; k < A.count; k++) { P.fromBufferAttribute(A, k).applyMatrix4(M);
          if (P.y < yMid) { if (!f0 || P.x < f0.x) f0 = { x: P.x, y: P.y }; }
          else if (!f1 || P.x < f1.x) f1 = { x: P.x, y: P.y }; }
        const face = f0.x + (f1.x - f0.x) * (yC - f0.y) / (f1.y - f0.y);
        if (bN.max.x < face - 0.02 || bN.max.x > face + 0.15) say(v.id, "a crow's nest off its mast", `its aft edge is at x ${bN.max.x.toFixed(2)}; the mast's fore face at that height is at ${face.toFixed(2)}`);
      }
    });
    /* ── A-RIG-DATUM (round 291, Preussen)"""
a=sub1(a,"/* ── A-RIG-DATUM (round 291, Preussen)",NR)
# ---------- the builder
b=open(R+'hull.before.js',encoding='utf8').read()
b=sub1(b,"""        const nest = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.028, B * 0.024, B * 0.045, 12, 1, true),
          mats.woodPale || woodDark);
        nest.position.set(mxA(y + seg * 0.66), y + seg * 0.66, 0);
        group.add(tag(nest, 'mast', "Crow's nest",
          'The lookout station, about two thirds up the foremast. Fleet and Lee were in Titanic\\'s when they sighted the iceberg — without binoculars, the ship\\'s glasses having been locked in a cabinet whose key left with an officer reassigned at Southampton.'));
""","""        /* r296: a nest with a plate read stands at the read's height on the mast's FORE FACE,
           as the 1911 side plan draws it, with a floor and a visible inside. A nest with no
           read keeps the class rule. */
        const CN = typeof mk.crowsNest === 'object' ? mk.crowsNest : null;
        const nestWhat = CN
          ? 'The lookout station, on the fore side of the foremast about 13 m above the forecastle deck. Fleet and Lee were in Titanic\\'s when they sighted the iceberg — without binoculars, the ship\\'s glasses having been locked in a cabinet whose key left with an officer reassigned at Southampton.'
          : 'The lookout station, about two thirds up the foremast. Fleet and Lee were in Titanic\\'s when they sighted the iceberg — without binoculars, the ship\\'s glasses having been locked in a cabinet whose key left with an officer reassigned at Southampton.';
        if (CN) {
          const rN = CN.foreM / 2, rMast = segR[si].a + (segR[si].b - segR[si].a) * ((CN.yM - y) / seg);
          const nestMat = (mats.woodPale || woodDark).clone();
          nestMat.side = THREE.DoubleSide;
          const nx = mxA(CN.yM) - rMast + 0.04 - rN;
          const nest = new THREE.Mesh(new THREE.CylinderGeometry(rN, rN * 0.92, CN.heightM, 16, 1, true), nestMat);
          nest.position.set(nx, CN.yM, 0);
          group.add(tag(nest, 'mast', "Crow's nest", nestWhat));
          const floor = new THREE.Mesh(new THREE.CircleGeometry(rN * 0.92, 16), nestMat);
          floor.rotation.x = Math.PI / 2;
          floor.position.set(nx, CN.yM - CN.heightM * 0.46, 0);
          group.add(tag(floor, 'mast', "Crow's nest", nestWhat));
        } else {
          const nest = new THREE.Mesh(
            new THREE.CylinderGeometry(B * 0.028, B * 0.024, B * 0.045, 12, 1, true),
            mats.woodPale || woodDark);
          nest.position.set(mxA(y + seg * 0.66), y + seg * 0.66, 0);
          group.add(tag(nest, 'mast', "Crow's nest", nestWhat));
        }
""")
open(W+'web/js/hull.js','w',encoding='utf8').write(b)
for p in ('Research/audit-hulls.js','web/audit-hulls.js'): open(W+p,'w',encoding='utf8').write(a)
print('funnelAt',h['funnelAt'],'x',[round(x,2) for x in fx]); print('mast cols',mc,'at',[m['at'] for m in h['masts']],'x',[round(col_x(c),2) for c in mc])
