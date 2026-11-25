#!/usr/bin/env python3
"""r318 (0y154): A-MAST-HEIGHTS into <dir>/audit-hulls.js. Asserted."""
import sys
from pathlib import Path
p = Path(sys.argv[1]) / 'audit-hulls.js'
t = p.read_text()
anchor = "    /* ── A-YARD-LOWERED (round 314, 0y¹⁴⁶):"
assert t.count(anchor) == 1, t.count(anchor)
rule = r"""    /* ── A-MAST-HEIGHTS (round 318, 0y¹⁵⁴): A RECORDED MAST HEIGHT IS BUILT, AND A POLE SHARED BY TWO YARDS
       IS LONG ENOUGH FOR BOTH. Steel's topgallant mast, half its topmast, is a spar for one sail. On the clipper,
       where the topgallant and the royal both ride it, it gave the fore a topgallant 3.9 m deep and a royal 2.2 m
       under topsails 9.1-9.3 m deep. Read off the set build's segment meshes (userData.seg) and yards
       (userData.yardFrac, userData.slung):
       (1) a square mast whose record carries `mastHeightsM` names its source: `mastHeightsProvenance` opening
           READ, RECORD or CONTESTED — 'mast heights with no source';
       (2) it is built to them, within 0.05 m over the foot of its lower mast: the top at 0.90 of the lower
           mast (the platform's rule), the crosstrees on the topmast's head, the truck on the last segment's
           head — 'mast heights recorded and not built', 'a mast drawn off its recorded heights';
       (3) on EVERY square mast, a set sail whose yard shares its section with another hoisting yard is at
           least half as deep as the deepest topsail on that mast, each depth taken from the yard to the yard
           under it — 'two yards on a pole too short for them'. The half is CLASS: Cutty Sark's tea rig, the
           rig the record now carries, gives 0.56 on her fore (royal 4.2 m against an upper topsail 7.5 m). */
    {
      const segBy = {}; g.traverse(o => { const sg = o.isMesh && o.userData.seg; if (sg) (segBy[sg.mi] = segBy[sg.mi] || [])[sg.si] = sg; });
      const yd = []; g.traverse(o => { if (o.isMesh && o.userData.yardFrac && o.userData.slung) yd.push(o); });
      (H.masts || []).forEach((mk, mi) => {
        if (mk.rig !== 'square') return;
        const at = `masts[${mi}] (station ${mk.at})`, sg = (segBy[mi] || []).filter(Boolean), MH = mk.mastHeightsM;
        if (MH) {
          if (!/^(READ|RECORD|CONTESTED)/.test(mk.mastHeightsProvenance || ''))
            say(v.id, 'mast heights with no source', `${at}: mastHeightsM ${JSON.stringify(MH)} and no mastHeightsProvenance`);
          if (sg.length < 3) say(v.id, 'mast heights recorded and not built', `${at}: ${sg.length} segments drawn for a top, crosstrees and truck`);
          else {
            const foot = sg[0].footY, got = { top: 0.90 * (sg[0].headY - foot), crosstrees: sg[1].headY - foot, truck: sg[sg.length - 1].headY - foot };
            for (const k of ['top', 'crosstrees', 'truck'])
              if (Math.abs(got[k] - MH[k]) > 0.05)
                say(v.id, 'a mast drawn off its recorded heights', `${at}: ${k} ${got[k].toFixed(2)} m over the foot, record ${MH[k]} m`);
          }
        }
        const mine = yd.filter(o => o.userData.yardFrac.mast === mi).sort((a, b) => a.position.y - b.position.y);
        if (mine.length < 3) return;
        const depth = new Map(); mine.forEach((o, k) => { if (k > 0) depth.set(o, o.position.y - mine[k - 1].position.y); });
        const tops = mine.filter(o => /top/.test(o.userData.yardFrac.name) && depth.has(o));
        if (!tops.length) return;
        const deep = Math.max(...tops.map(o => depth.get(o)));
        const bySec = {}; mine.forEach(o => { const f = o.userData.yardFrac; if (f.from === 'section' && f.atrip !== undefined) (bySec[f.sec] = bySec[f.sec] || []).push(o); });
        Object.keys(bySec).forEach(sc => { if (bySec[sc].length < 2) return;
          for (const o of bySec[sc]) { const d = depth.get(o);
            if (d !== undefined && d < 0.5 * deep)
              say(v.id, 'two yards on a pole too short for them', `${at}, yard '${o.userData.yardFrac.name}' on section ${sc}: its sail ${d.toFixed(2)} m deep against the deepest topsail's ${deep.toFixed(2)} m`); } });
      });
    }
"""
t = t.replace(anchor, rule + anchor)
p.write_text(t)
print('A-MAST-HEIGHTS added to', p)
