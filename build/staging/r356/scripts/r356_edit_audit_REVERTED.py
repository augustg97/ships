#!/usr/bin/env python3
"""r356: A-COVER-SIDE, and the carrack's record of having no side figure.
usage: r356_edit_audit.py <audit-hulls.js> <vessels.json>"""
import sys, json
ap, vp = sys.argv[1], sys.argv[2]
s = open(ap).read()
anchor = """        for (const [k, n] of Object.entries(tally)) say(v.id, 'a part under a deck cover lit as open sky', `${k}: ${n} mesh(es)`);
      }
    }
"""
assert s.count(anchor) == 1
rule = anchor + """    /* ── A-COVER-SIDE (round 356): THE SIDE A COVER'S PARTS STOP SHORT OF IS THE SHIP'S RECORDED SIDE. r354 stopped a part's
       span under a cover COVER_SIDE_M (0.25 m) inside the skin on every ship at every height. Steel's tables give the 74's
       side as 0.514 m at the upper deck and 0.356 m at the quarterdeck and forecastle (hull.side). TEST, on every hull
       whose deck material carries covers, against the record and the surface, not the builder's numbers: where the hull
       records side.atDeckM, every cover says sideFrom 'record', and at each of its eight stations the part's inner face
       at the deck (st[k][0]) lies atDeckM inside the shell's half-breadth at the deck's height there, and at the
       cover (st[k][1]) atCoverM inside the shell's half-breadth at that island's deck, each within 0.02 m; the deck's
       height (st[k][2]) is the surface's own; a closed end stands sternM (aft) or bowM (forward) short of the skin's
       end, each defaulting to atCoverM. Where the hull records no figure, every cover says sideFrom 'class' and the hull
       carries side.provenance saying why (silence is convicted, not the default). */
    {
      let covM = null; g.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.covers && o.material.userData.covers.length) covM = o.material; });
      if (covM) {
        const R = H.side || null, rec = !!(R && R.atDeckM > 0), HS = SHIPS_HULL.hullSurface(H), L = H.lwl;
        const cl = u => Math.max(0.001, Math.min(0.999, u)), xAt = u => (u - 0.5) * L + HS.rake(cl(u));
        const halfAt = (u, y) => { const uc = Math.max(0, Math.min(1, u));
          if (y >= HS.sheer(uc)) return Math.abs(SHIPS_HULL.surfacePoint(H, HS, uc, 1.0)[2]);
          let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (SHIPS_HULL.surfacePoint(H, HS, uc, m)[1] < y) a = m; else b = m; }
          return Math.abs(SHIPS_HULL.surfacePoint(H, HS, uc, (a + b) / 2)[2]); };
        if (!rec && !(R && typeof R.provenance === 'string' && R.provenance.length > 40))
          say(v.id, 'a deck cover on a side with no record either way', `${covM.userData.covers.length} cover(s) take COVER_SIDE_M and hull.side carries no provenance saying why`);
        for (const c of covM.userData.covers) {
          const at = `${c.from} ${c.name}`;
          if ((c.sideFrom || 'none') !== (rec ? 'record' : 'class')) { say(v.id, 'a deck cover whose side is not its record', `${at}: sideFrom ${c.sideFrom || 'none'}, the hull ${rec ? 'records' : 'does not record'} side.atDeckM`); continue; }
          if (!rec || c.from !== 'island' || !c.st || c.st.length !== 8) continue;
          const cov = R.atCoverM > 0 ? R.atCoverM : R.atDeckM, I = H.islands || {}, worst = [0, 0, 0, -1];
          for (let k = 0; k < 8; k++) {
            const x = c.x0 + (c.x1 - c.x0) * k / 7; let a = 0, b = 1;
            for (let j = 0; j < 30; j++) { const m = (a + b) / 2; if (xAt(m) < x) a = m; else b = m; }
            const u = (a + b) / 2, yD = HS.deck(cl(u));
            const isl = (I.list || []).find(q => u >= q.u[0] - 1e-6 && u <= q.u[1] + 1e-6), iRail = (isl && isl.railM) || I.railM || 1.0;
            const yC = Math.max(HS.islandTop(u), HS.sheer(u) + 0.05) - iRail;
            const e = [Math.abs(c.st[k][0] - (halfAt(u, yD) - R.atDeckM)), Math.abs(c.st[k][1] - (halfAt(u, yC) - cov)), Math.abs(c.st[k][2] - yD)];
            for (let j = 0; j < 3; j++) if (e[j] > worst[j]) { worst[j] = e[j]; if (e[j] > 0.02) worst[3] = k; }
          }
          if (worst[3] >= 0) say(v.id, 'a deck cover whose side is not its record', `${at}: station ${worst[3]} off by ${worst[0].toFixed(3)} m at the deck, ${worst[1].toFixed(3)} m at the cover, ${worst[2].toFixed(3)} m in the deck's height (side ${R.atDeckM} / ${cov} m)`);
          const wantEnd = c.open < 0 ? (R.sternM > 0 ? R.sternM : cov) : (R.bowM > 0 ? R.bowM : cov);
          if (c.endIn && Math.abs(c.endIn - wantEnd) > 0.005) say(v.id, 'a deck cover whose side is not its record', `${at}: its closed end stands ${c.endIn.toFixed(3)} m in from the skin; the record gives ${wantEnd} m`);
        }
      }
    }
"""
s = s.replace(anchor, rule)
open(ap, 'w').write(s)

raw = open(vp).read()
i0 = raw.index('"id": "carrack"')
i1 = raw.index('"castles":', i0)
assert raw.index('"id":', i0 + 10) > i1
ls = raw.rfind('\n', 0, i1) + 1
ind = raw[ls:i1]
assert ind.strip() == ''
side = {"provenance": (
    "NOT RECORDED, r356. No source read for this model gives the carrack's side at her main deck or at her half deck. "
    "The parts under her half deck stop 0.25 m inside the skin, the builder's class default (COVER_SIDE_M in hull.js), "
    "at every height and at her stern. That is a fallback, not a reading; a figure would come from the Mataro model's "
    "scantlings or an excavated carrack's frames.")}
assert '"side":' not in raw[i0:raw.index('"id":', i0 + 10)]
raw2 = raw[:i1] + '"side": ' + json.dumps(side, ensure_ascii=False) + ',\n' + ind + raw[i1:]
V2 = json.loads(raw2)
assert [v for v in V2['vessels'] if v['id'] == 'carrack'][0]['hull']['side'] == side
open(vp, 'w').write(raw2)
print('ok')
