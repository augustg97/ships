#!/usr/bin/env python3
"""r172 standalone sim — the capstan arms on the fleet's real beams, BEFORE any web/ edit.

OLD builder (hull.js r172 opening state, timberShip && laidDeck):
  R=0.062B; whelps 8 boxes spanning y=[0.006B, 0.106B]; head underside 0.113B;
  bar plane 0.132B; drumhead dia 2*1.16*R = 0.1438B; no pawls; flare ratio 1.0.
NEW builder (derived from capstan record):
  D = drumDiaM or clamp(0.11B, 0.95, 1.55); H = clamp(0.86D, 1.15, 1.35);
  headT=0.30H; whelpH=H-headT; barY=0.85H; whelp outer edge 0.41D neck -> 0.50D base;
  whelps reach y=0 to whelpH exactly; 2 pawls.
ARMS:
  V-REACH   whelp base gap <= 0.02D AND head gap <= 0.02D
  V-FLARE   base sweep / neck sweep >= 1.08          (fig 11 measures 1.15-1.22)
  V-PAWL    >= 2 pawls on deck
  V-STATURE (record-blind) drawn drum dia <= 1.8 m AND H/dia >= 0.55
  V-BREAST  is folded into STATURE+the H clamp check here: barY in [0.9, 1.5] m
"""
import json

vs = json.load(open('/Users/augustgweon/Ships/web/data/vessels.json'))['vessels']
KEEP = {'caravel','carrack','galley','galleass','fluyt','east-indiaman',
        'ship-of-the-line','slave-ship','clipper','wyoming','endurance'}
DRUM = {'ship-of-the-line': 1.5}
clamp = lambda v,a,b: max(a,min(b,v))

def old_geom(B):
    return dict(baseGap=0.006*B, headGap=(0.113-0.106)*B, flare=1.0, pawls=0,
                barY=0.132*B, dia=0.1438*B, H=0.151*B, D02=0.02*0.1438*B)
def new_geom(B, drum=None):
    D = drum or clamp(0.11*B, 0.95, 1.55)
    H = clamp(0.86*D, 1.15, 1.35)
    return dict(baseGap=0.0, headGap=0.0, flare=0.50/0.41, pawls=2,
                barY=0.85*H, dia=D, H=H, D02=0.02*D)

def arms(g):
    f = []
    if g['baseGap'] > g['D02'] or g['headGap'] > g['D02']: f.append('REACH')
    if g['flare'] < 1.08: f.append('FLARE')
    if g['pawls'] < 2:    f.append('PAWL')
    if g['dia'] > 1.8 or g['H']/g['dia'] < 0.55: f.append('STATURE')
    if not (0.9 <= g['barY'] <= 1.5): f.append('BREAST')
    return f

print(f"{'hull':18s} {'B':>5s}  OLD fails                            NEW fails")
bad_new = 0
for v in vs:
    h = v.get('hull', {})
    if v['id'] not in KEEP and not (h.get('build') not in ('iron','steel')):
        continue
    B = h.get('beam')
    if not B: continue
    o, n = old_geom(B), new_geom(B, DRUM.get(v['id']))
    fo, fn = arms(o), arms(n)
    keep = v['id'] in KEEP
    mark = 'KEEP  ' if keep else 'REMOVE'
    if keep:
        if fn: bad_new += 1
        print(f"{v['id']:18s} {B:5.1f}  {mark} old[{','.join(fo) or '-':30s}] "
              f"new[{','.join(fn) or 'clean'}]  barY {o['barY']:.2f}->{n['barY']:.2f} m  "
              f"dia {o['dia']:.2f}->{n['dia']:.2f} m")
    else:
        print(f"{v['id']:18s} {B:5.1f}  {mark} old[{','.join(fo) or '-':30s}] (no capstan drawn -> WARRANT arm)")

# the drag: 74's drumDiaM 1.5 -> 3.5 under the FAITHFUL builder
d = new_geom(14.6, 3.5)
print('\nDRAG drumDiaM 1.5->3.5 under faithful builder:', arms(d) or 'MISSED',
      f"(dia {d['dia']:.2f}, H/dia {d['H']/d['dia']:.2f}, barY {d['barY']:.2f})")
print('new-builder failures on KEEP hulls:', bad_new)
