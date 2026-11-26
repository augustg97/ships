#!/usr/bin/env python3
"""r350: A-TOPMAST-HEAD-READ. usage: r350_edit_audit.py <audit-hulls.js>"""
import sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
ANCH = "    /* ── D-MAST-STEP (round 248): A MAST ON A DOUBLE HULL STEPS ON THE PLATFORM."
assert s.count(ANCH) == 1
RULE = r"""    /* ── A-TOPMAST-HEAD-READ (round 350): A PLATE READ OF A TOPMAST HEAD SAYS WHETHER IT AGREES. r349 drew the 74's
       topmast heads to Steel's rule and read only the main's off Eckersberg's Asow; r350 read the fore and mizzen. The
       plate draws all three heads at about 0.20 of the span from the lower cap to the crosstrees, and the model's
       mizzen, at Steel's 3 1/2 in, draws 0.143. A read that disagrees with the geometry and says nothing is the failure
       this rule exists for, and so is a read marked 'contested' that the geometry in fact meets. TEST, on every mast whose
       record carries topmastHeadRead: the topmast segment's head record carries the read (head.read, the same share,
       bound and verdict); the read's share is its own rows' (crosstrees - cap) / (lowerCap - crosstrees) to 0.002; the
       DRAWN share is the topmast head (head.headM) over the span from the lower cap (the lower head record's topY +
       headM) to the crosstrees (head.crossY); and the verdict is 'agrees' when the drawn share lies within the read's
       bound of its share, 'contested' when it does not, and a contested read's provenance says CONTESTED. */
    {
      const segs = {};
      g.traverse(o => { if (o.isMesh && o.userData.seg) (segs[o.userData.seg.mi] = segs[o.userData.seg.mi] || {})[o.userData.seg.si] = o.userData; });
      (H.masts || []).forEach((mk, mi) => {
        const R = mk.topmastHeadRead; if (!R) return;
        const at = `mast ${mi} (station ${mk.at}, ${R.mast})`;
        const S0 = segs[mi] && segs[mi][0], S1 = segs[mi] && segs[mi][1];
        const h0 = S0 && S0.head, h1 = S1 && S1.head;
        if (!h0 || !h1) { say(v.id, 'a topmast head read on a mast with no head records', at); return; }
        const r = h1.read;
        if (!r || r.share !== R.share || r.bound !== R.bound || r.verdict !== R.verdict)
          { say(v.id, 'a plate read of a topmast head not carried to the build', `${at}: head.read ${JSON.stringify(r || null)}`); return; }
        const rw = R.rows || {}, rs = (rw.crosstrees - rw.cap) / (rw.lowerCap - rw.crosstrees);
        if (!(Math.abs(rs - R.share) <= 0.002)) say(v.id, "a topmast head read whose share is not its rows'", `${at}: rows give ${rs.toFixed(4)}, the record ${R.share}`);
        const drawn = h1.headM / (h1.crossY - (h0.topY + h0.headM));
        const want = Math.abs(drawn - R.share) <= R.bound ? 'agrees' : 'contested';
        if (R.verdict !== want) say(v.id, 'a topmast head read with the wrong verdict', `${at}: drawn ${drawn.toFixed(3)} against the plate's ${R.share} +/- ${R.bound}, so '${want}'; the record says '${R.verdict}'`);
        if (R.verdict === 'contested' && !/CONTESTED/.test(R.provenance || '')) say(v.id, 'a contested topmast head whose provenance does not say so', at);
      });
    }
"""
p.write_text(s.replace(ANCH, RULE + ANCH))
print('r350_edit_audit: ok')
