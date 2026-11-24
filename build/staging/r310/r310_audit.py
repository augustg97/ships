import sys
P = sys.argv[1]
s = open(P).read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (c, a[:80]); s = s.replace(a, b)

# 1. the doc block: name the r310 rules under the r308 paragraph
rep("""       r308 every furled gaff sail lowered its gaff onto a roll on the boom, and no rule could
       tell that from a plate that shows the gaff aloft. */
    const gaffSailRead = (G, STATE) => {""",
"""       r308 every furled gaff sail lowered its gaff onto a roll on the boom, and no rule could
       tell that from a plate that shows the gaff aloft.
       r310 (0y¹³⁸), A-LOWERED and A-STOW-SILENCE: furlStow 'lowered' is the read of a plate that shows
       no gaff aloft on a furled ship. RECORD: furlStow is 'brailed' or 'lowered' and carries
       furlStowProvenance. FURLED build of a 'lowered' mast: exactly one Boom; the mast's Gaff is in
       its lowered state, its jaws within 1.5 m of the boom's foot; one furl roll lies along the
       boom; no Brailed sail bundle names the mast. SILENCE: every gaff sail and every spanker in
       the fleet carries furlStow, gaffStow 'brailed', or a furlStowProvenance that opens 'UNREAD'
       naming the builder's default. Before r310 the 74, the clipper, Great Eastern, Wyoming,
       Preussen and the steamer lowered their gaffs with nothing in the record to say whether a
       plate had been read for it. */
    const gaffSailRead = (G, STATE) => {""")

# 2. the record check: 'lowered' is known; the provenance wording covers both; silence convicted
rep("""        if (mk.furlStow != null) {
          if (STATE === 'set') {
            if (mk.furlStow !== 'brailed') say(v.id, 'a furl stowage the builder does not know', `${at}: furlStow '${mk.furlStow}'`);
            if (!mk.furlStowProvenance) say(v.id, 'a brailed stowage with no provenance', `${at}: furlStow '${mk.furlStow}', furlStowProvenance absent`);""",
"""        if (STATE === 'set' && mk.furlStow == null && mk.gaffStow !== 'brailed' && !/^UNREAD/.test(mk.furlStowProvenance || ''))
          say(v.id, 'a furled stowage with no read and no named silence', `${at}: no furlStow, and furlStowProvenance ${mk.furlStowProvenance ? 'does not open UNREAD' : 'absent'}; the builder lowers the gaff by default`);
        if (mk.furlStow === 'lowered' && STATE === 'set') {
          if (!mk.furlStowProvenance || /^UNREAD/.test(mk.furlStowProvenance)) say(v.id, 'a lowered stowage with no read', `${at}: furlStow 'lowered', furlStowProvenance ${mk.furlStowProvenance ? 'opens UNREAD' : 'absent'}`);
        } else if (mk.furlStow === 'lowered') {
          const bm = booms.filter(o => Math.abs(o.userData.gaffBoom.at - mk.at) < 1e-6);
          if (bm.length !== 1) say(v.id, 'a lowered spanker without its boom', `${at}: ${bm.length} Boom mesh(es); a lowered gaff rests on the roll along the boom${SB}`);
          if (!gf) say(v.id, 'a lowered gaff not built', `${at}: no Gaff mesh within 3 m of the station${SB}`);
          else if (gf.userData.gaff.state !== 'furled') say(v.id, 'a lowered gaff standing aloft', `${at}: the Gaff is in state '${gf.userData.gaff.state}', the record reads it lowered${SB}`);
          else if (bm.length === 1 && Math.abs(gf.userData.gaff.origin[1] - bm[0].userData.gaffBoom.foot[1]) > 1.5)
            say(v.id, 'a lowered gaff off its boom', `${at}: jaws at y ${gf.userData.gaff.origin[1]}, the boom's foot at y ${bm[0].userData.gaffBoom.foot[1]}${SB}`);
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
            if (rolls.length !== 1) say(v.id, 'a lowered sail not rolled on its boom', `${at}: ${rolls.length} furl roll(s) along the boom of a sail the record stows lowered${SB}`);
          }
          const brL = cloth.filter(o => o.userData.brailed && o.userData.brailed.mast === mi);
          if (brL.length) say(v.id, 'a lowered sail drawn brailed', `${at}: ${brL.length} Brailed sail bundle(s) on a mast whose sail the record stows lowered${SB}`);
        }
        if (mk.furlStow != null) {
          if (STATE === 'set') {
            if (mk.furlStow !== 'brailed' && mk.furlStow !== 'lowered') say(v.id, 'a furl stowage the builder does not know', `${at}: furlStow '${mk.furlStow}'`);
            if (!mk.furlStowProvenance) say(v.id, 'a furl stowage with no provenance', `${at}: furlStow '${mk.furlStow}', furlStowProvenance absent`);""")
open(P, 'w').write(s)
print('ok')

# 3. the furled card names the spanker and how it is stowed
s = open(P).read()
rep("""            if (gmF.length === nBr && /lowered onto their booms/i.test(txt)) say(v.id, 'a furled card that lowers a brailed gaff', `every gaff mast stows by brails and the card says the gaffs are lowered: "${txt.slice(0, 160)}"`);
""", """            if (gmF.length === nBr && /lowered onto their booms/i.test(txt)) say(v.id, 'a furled card that lowers a brailed gaff', `every gaff mast stows by brails and the card says the gaffs are lowered: "${txt.slice(0, 160)}"`);
            /* r310 (0y¹³⁸): a square-rigged ship's spanker is named, and stowed as the record has it */
            const spF = (H.masts || []).filter(m => m.rig === 'square' && m.spanker);
            if (spF.length) {
              const allBr = spF.every(m => m.furlStow === 'brailed');
              if (!/spanker/i.test(txt)) say(v.id, 'a furled card that leaves the spanker unsaid', `${spF.length} spanker(s) carried and the card does not name one: "${txt.slice(0, 200)}"`);
              else if (allBr !== /spanker is brailed/i.test(txt)) say(v.id, 'a furled card that stows the spanker the wrong way', `the record ${allBr ? 'brails' : 'lowers'} the spanker: "${txt.slice(0, 200)}"`);
            } else if (/spanker/i.test(txt)) say(v.id, 'a furled card that names a spanker she does not carry', `"${txt.slice(0, 200)}"`);
""")
open(P, 'w').write(s)
print('ok3')
