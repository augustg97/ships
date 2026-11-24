#!/usr/bin/env python3
"""r308 (0y134): A-BRAILED reads furlStow 'brailed' too. Usage: r308_audit.py <audit-hulls.js>"""
import sys
p = sys.argv[1]
s = open(p).read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'anchor found {c} times (want {n}): {old[:80]!r}'
    s = s.replace(old, new)

rep("""       funnel, and a 10 m gaff over a funnel-cut 4 m boom puts the leech through Endurance's. */
    const gaffSailRead = (G, STATE) => {""",
"""       funnel, and a 10 m gaff over a funnel-cut 4 m boom puts the leech through Endurance's.
       r308 (0y¹³⁴), A-BRAILED OVER A BOOM: furlStow 'brailed' is a sail set on gaff and boom and
       stowed by its brails. RECORD: the value is 'brailed' and it carries furlStowProvenance.
       SET build: a set cloth names the mast and no Brailed sail bundle does. FURLED build: the
       same bundle tests as gaffStow 'brailed' (one bundle, along the after side, deck to jaws,
       gaff over 20°), and the boom STAYS: exactly one Boom on the mast, and no furl roll lies
       along it (a roll whose centre is within the boom's run and 1.2 m of its line). Before
       r308 every furled gaff sail lowered its gaff onto a roll on the boom, and no rule could
       tell that from a plate that shows the gaff aloft. */
    const gaffSailRead = (G, STATE) => {""")

rep("""        if (mk.gaffStow === 'brailed') {
          if (STATE === 'set' && !mk.gaffStowProvenance) say(v.id, 'a brailed sail with no provenance', `${at}: gaffStow 'brailed', gaffStowProvenance absent`);
          const bm = booms.filter(o => Math.abs(o.userData.gaffBoom.at - mk.at) < 1e-6);
          if (bm.length) say(v.id, 'a boom under a brailed sail', `${at}: ${bm.length} Boom mesh(es) on a mast whose sail is loose-footed and brailed${SB}`);""",
"""        if (mk.furlStow != null) {
          if (STATE === 'set') {
            if (mk.furlStow !== 'brailed') say(v.id, 'a furl stowage the builder does not know', `${at}: furlStow '${mk.furlStow}'`);
            if (!mk.furlStowProvenance) say(v.id, 'a brailed stowage with no provenance', `${at}: furlStow '${mk.furlStow}', furlStowProvenance absent`);
            const set = cloth.filter(o => o.userData.kind !== 'furl' && o.userData.mastX != null && Math.abs(o.userData.mastX - xm) < 1.5);
            if (!set.length) say(v.id, 'a sail stowed by brails not drawn set', `${at}: no set cloth names this mast in the set build`);
            const brS = cloth.filter(o => o.userData.brailed && o.userData.brailed.mast === mi);
            if (brS.length) say(v.id, 'a brailed bundle in the set build', `${at}: ${brS.length} Brailed sail bundle(s) on a mast whose sail is set`);
          } else if (mk.furlStow === 'brailed') {
            const bm = booms.filter(o => Math.abs(o.userData.gaffBoom.at - mk.at) < 1e-6);
            if (bm.length !== 1) say(v.id, 'a brailed spanker without its boom', `${at}: ${bm.length} Boom mesh(es); the sail is brailed to the mast and the boom stays${SB}`);
            for (const b of bm) {
              const f = b.userData.gaffBoom.foot, c = b.userData.gaffBoom.clew;
              const dx = c[0] - f[0], dy = c[1] - f[1], L2 = Math.hypot(dx, dy);
              const rolls = cloth.filter(o => {
                if (o.userData.kind !== 'furl' || o.userData.brailed) return false;
                const P = pts(o); let cx = 0, cy = 0; for (const q of P) { cx += q.x; cy += q.y; } cx /= P.length; cy /= P.length;
                const t = ((cx - f[0]) * dx + (cy - f[1]) * dy) / (L2 * L2);
                const d = Math.abs((cx - f[0]) * dy - (cy - f[1]) * dx) / L2;
                return t > 0 && t < 1 && d < 1.2;
              });
              if (rolls.length) say(v.id, 'a brailed sail rolled on its boom', `${at}: ${rolls.length} furl roll(s) along the boom of a sail the record stows by its brails${SB}`);
            }
          }
        }
        if (mk.gaffStow === 'brailed' || (STATE === 'furled' && mk.furlStow === 'brailed')) {
          if (STATE === 'set' && mk.gaffStow === 'brailed' && !mk.gaffStowProvenance) say(v.id, 'a brailed sail with no provenance', `${at}: gaffStow 'brailed', gaffStowProvenance absent`);
          const bm = booms.filter(o => Math.abs(o.userData.gaffBoom.at - mk.at) < 1e-6);
          if (bm.length && mk.gaffStow === 'brailed') say(v.id, 'a boom under a brailed sail', `${at}: ${bm.length} Boom mesh(es) on a mast whose sail is loose-footed and brailed${SB}`);""")

open(p, 'w').write(s)
print('ok', p)
