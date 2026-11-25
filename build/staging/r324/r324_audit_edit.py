import sys
P = sys.argv[1]; s = open(P).read()
anchor = "    /* ── A-RIG-HEIGHT (round 287, 0y⁹⁶): THE RIG'S HEIGHT IS ONE FIGURE"
assert s.count(anchor) == 1
RULE = r"""    /* ── A-HOIST-READ (round 324, 0y¹⁶⁶): A HOISTING YARD ON A SEGMENT RIG IS SET WHERE ITS RECORD SAYS, AND THE RECORD ANSWERS.
       Above the course every yard of a one-yard-per-segment rig is set atrip, at a class 0.88 of the section it hoists
       on, which no plate set. Hocker's Vasa rig diagram draws all five of her hoisting yards lower: the topsail yards at
       0.883-0.905 of the height from the mast's foot to the topmast's head, where the class figure gave 0.936-0.951.
       RECORD: every square mast with no `yards` list and more than one tier carries `hoistProvenance`, opening
       'PLATE READ' with a `hoistRead` or 'UNREAD' with none; the SILENCE convicts. A read names a share for each
       section above the lower mast (`topmast`, and `topgallantMast` on a three-piece mast), and each share agrees with
       its own rows (0.005). BUILT: every hoisting yard records where it is set (`userData.hoistAt`, from 'record' |
       'class'); a mast crosses one per section above the lower; a read is drawn as the record's and a class yard as the
       class figure; and the set height over the mast's foot, over the section's head over the foot, stands within the
       read's bound of the read. The furled build lowers the yard onto the cap below, so the SET height (`setY`) is the
       one tested, and a set build's yard stands at it (0.005 m). */
    {
      const hoistM = [];
      g.traverse(o => { if (o.isMesh && o.userData.hoistAt) hoistM.push(o); });
      (H.masts || []).forEach((mk, mi) => {
        if (mk.rig !== 'square' || Array.isArray(mk.yards) || (mk.only || 3) < 2) return;
        const at = `masts[${mi}] (station ${mk.at})`, P = mk.hoistProvenance || '', R = mk.hoistRead;
        const keys = (mk.only || 3) >= 3 ? ['topmast', 'topgallantMast'] : ['topmast'];
        if (!P) say(v.id, 'a hoisting yard with no answer', `${at}: the yards above the course are set at the class 0.88 of their sections and the record says nothing of where they are set (hoistProvenance opening PLATE READ with a hoistRead, or UNREAD)`);
        else if (/^PLATE READ/.test(P) && !R)
          say(v.id, 'a hoist read with no figure', `${at}: hoistProvenance opens PLATE READ and hoistRead is absent`);
        else if (/^UNREAD/.test(P) && R)
          say(v.id, 'a hoist figure over an UNREAD provenance', `${at}: hoistRead present and the provenance opens UNREAD`);
        else if (!/^(PLATE READ|UNREAD)/.test(P))
          say(v.id, 'a hoist provenance that does not say', `${at}: hoistProvenance opens '${P.slice(0, 30)}', neither PLATE READ nor UNREAD`);
        if (R) keys.forEach(k => {
          const e = R[k];
          if (!e || typeof e.ofFootToHead !== 'number') { say(v.id, 'a hoist read missing a section', `${at}: hoistRead.${k}.ofFootToHead is absent`); return; }
          if (e.rows) {
            const w = e.rows, a = (w.foot - w.yard) / (w.foot - w.head);
            if (Math.abs(a - e.ofFootToHead) > 0.005)
              say(v.id, 'a hoist read off its own rows', `${at} ${k}: rows give ${a.toFixed(4)} against ofFootToHead ${e.ofFootToHead}`);
          }
        });
        const mine = hoistM.filter(o => o.userData.hoistAt.mast === mi);
        if (mine.length !== keys.length) { say(v.id, 'a hoisting yard that does not say where it is set', `${at}: ${mine.length} hoisting yards record where they are set, ${keys.length} expected`); return; }
        mine.forEach(o => {
          const h = o.userData.hoistAt, e = R && R[h.section], read = !!(e && typeof e.ofFootToHead === 'number');
          if ((h.from === 'record') !== read)
            say(v.id, read ? 'a hoist read not drawn' : 'a hoisting yard drawn as read with no read', `${at} ${h.section}: drawn from '${h.from}', hoistRead ${read ? e.ofFootToHead : 'absent'}`);
          const share = (h.setY - h.base) / (h.head - h.base);
          if (read && Math.abs(share - e.ofFootToHead) > (R.boundPm || 0.01))
            say(v.id, 'a hoisting yard off its plate read', `${at} ${h.section}: set ${share.toFixed(4)} of the way from the mast's foot (y ${h.base.toFixed(2)}) to the section's head (y ${h.head.toFixed(2)}); the plate reads ${e.ofFootToHead} +/- ${R.boundPm || 0.01}`);
          const lw = o.userData.lowered;
          if (lw && lw.lowered === false && o.userData.slung && Math.abs(o.userData.slung.axisY - h.setY) > 0.005)
            say(v.id, 'a set hoisting yard not at its set height', `${at} ${h.section}: the yard's axis stands at y ${o.userData.slung.axisY} and its set height is ${h.setY}`);
        });
      });
    }
"""
s = s.replace(anchor, RULE + anchor)
open(P, 'w').write(s); print('ok')
