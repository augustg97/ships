import sys
p = sys.argv[1]; s = open(p).read()
A = "    /* ── A-RIG-HEIGHT (round 287, 0y⁹⁶)"
assert s.count(A) == 1
RULE = r"""    /* ── A-COURSE-READ (round 313, 0y¹⁴³): A COURSE ON A SEGMENT RIG HANGS WHERE ITS RECORD SAYS, AND THE RECORD ANSWERS.
       A square mast with no `yards` list crosses one yard per segment, and its lowest, the course (the crossjack on a
       mizzen), hung at a class 0.60 of the lower mast (0.72 under one tier) that no plate set. The Asow plate put the
       74's crossjack at 0.845 of the deck-to-top height, where the class figure gave 0.667. RECORD: every such mast with
       more than one tier carries `courseAtProvenance`, opening 'PLATE READ' with a `courseRead` or 'UNREAD' with none;
       the SILENCE convicts. A read carries its plate rows, and its value is the mean of the two deck datums' shares
       (0.005). BUILT: the course mesh records where it hangs (`userData.courseAt`, from 'record' | 'class'); a read is
       drawn as the record's, a class yard as the class figure; and the yard's height over the mast's foot, over the
       height of that mast's own TOP mesh over the foot, stands within the read's bound of the read. */
    {
      const courseM = [], topM = [];
      g.traverse(o => { if (o.isMesh && o.userData.courseAt) courseM.push(o);
                        if (o.userData.part && o.userData.part.key === 'top') topM.push(o); });
      (H.masts || []).forEach((mk, mi) => {
        if (mk.rig !== 'square' || Array.isArray(mk.yards) || (mk.only || 3) < 2) return;
        const at = `masts[${mi}] (station ${mk.at})`, P = mk.courseAtProvenance || '', R = mk.courseRead;
        if (!P) say(v.id, 'a course height with no answer', `${at}: the course hangs at a class share of the lower mast and the record says nothing of where it hangs (courseAtProvenance opening PLATE READ with a courseRead, or UNREAD)`);
        else if (/^PLATE READ/.test(P) && !(R && typeof R.ofDeckToTop === 'number'))
          say(v.id, 'a course read with no figure', `${at}: courseAtProvenance opens PLATE READ and courseRead.ofDeckToTop is absent`);
        else if (/^UNREAD/.test(P) && R)
          say(v.id, 'a course figure over an UNREAD provenance', `${at}: courseRead ${JSON.stringify(R.ofDeckToTop)} and the provenance opens UNREAD`);
        else if (!/^(PLATE READ|UNREAD)/.test(P))
          say(v.id, 'a course provenance that does not say', `${at}: courseAtProvenance opens '${P.slice(0, 30)}', neither PLATE READ nor UNREAD`);
        if (R && R.rows) {
          const w = R.rows, a = (w.deckRail - w.yard) / (w.deckRail - w.top), b = (w.deckHidden - w.yard) / (w.deckHidden - w.top);
          if (Math.abs((a + b) / 2 - R.ofDeckToTop) > 0.005)
            say(v.id, 'a course read off its own rows', `${at}: rows give ${a.toFixed(3)} and ${b.toFixed(3)} (mean ${((a + b) / 2).toFixed(3)}) against ofDeckToTop ${R.ofDeckToTop}`);
        }
        const mine = courseM.filter(o => o.userData.courseAt.mast === mi);
        if (mine.length !== 1) { say(v.id, 'a course that does not say where it hangs', `${at}: ${mine.length} course meshes record where they hang, 1 expected`); return; }
        const o = mine[0], c = o.userData.courseAt;
        if ((c.from === 'record') !== !!R)
          say(v.id, R ? 'a course read not drawn' : 'a course drawn as read with no read', `${at}: drawn from '${c.from}', courseRead ${R ? R.ofDeckToTop : 'absent'}`);
        if (R && typeof R.ofDeckToTop === 'number') {
          const ax = o.userData.slung ? o.userData.slung.axisX : o.position.x;
          const tops = topM.filter(t => t.parent === o.parent).sort((p, q) => Math.abs(p.position.x - ax) - Math.abs(q.position.x - ax));
          if (!tops.length || Math.abs(tops[0].position.x - ax) > 3) { say(v.id, 'a read course with no top to read it against', `${at}: no top within 3 m of the mast's axis at the yard`); return; }
          const share = (o.position.y - c.base) / (tops[0].position.y - c.base), bound = R.boundPm || 0.02;
          if (Math.abs(share - R.ofDeckToTop) > bound)
            say(v.id, 'a course off its plate read', `${at}: the yard stands ${share.toFixed(3)} of the way from the mast's foot (y ${c.base.toFixed(2)}) to its top (y ${tops[0].position.y.toFixed(2)}); the plate reads ${R.ofDeckToTop} +/- ${bound}`);
        }
      });
    }
"""
s = s.replace(A, RULE + A); open(p, 'w').write(s); print('ok')
