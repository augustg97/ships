import sys
P = sys.argv[1]; s = open(P).read()
anchor = "    /* ── A-COURSE-READ (round 313, 0y¹⁴³)"
assert s.count(anchor) == 1
rule = r"""    /* ── A-MIZZEN-TIERS (round 320, 0y¹⁵⁷): A LATEEN MIZZEN OF THE 1590s-1620s CROSSES NO TOPGALLANT.
       A square mizzen that sets a lateen (`lateenMizzen`, r317) carried one square sail, the topsail, over the crossjack
       that spreads its foot. Vasa's rig (Hocker, Vasa II, 2023, p. 31) names a topgallant mast on the fore and the main and
       none on the mizzen: "(i) mizzenmast; (j) mizzen topmast", sails "(9) mizzen; (10) mizzen topsail". Until r320 the
       East Indiaman and the slave ship stepped a topgallant mast on the mizzen and crossed a topgallant yard on it.
       RECORD: every such mast says how many tiers it crosses and from what (`tiersProvenance`); the SILENCE convicts.
       BUILT, on the set build: the mast's segment meshes (userData.seg) number two, and the square yards slung to it
       (userData.slung, within 0.6 m of the lateen yard's mast x) number two: 'a topgallant over a lateen mizzen'. */
    {
      const segN = {}, slung = [], lat = {};
      g.traverse(o => { if (!o.isMesh) return; const u = o.userData;
        if (u.seg) segN[u.seg.mi] = Math.max(segN[u.seg.mi] || 0, u.seg.si + 1);
        if (u.slung && !u.lateen) slung.push(u.slung.mastX);
        if (u.lateen && u.lateen.onSquareMast) lat[u.lateen.mast] = u.lateen.mastX; });
      (H.masts || []).forEach((mk, mi) => {
        if (mk.rig !== 'square' || mk.lateenMizzen !== true) return;
        const at = `masts[${mi}] (station ${mk.at}, lateen mizzen)`;
        if (!mk.tiersProvenance) say(v.id, 'a lateen mizzen whose tiers have no answer', `${at}: tiersProvenance is absent; the record does not say how many square sails the mizzen crosses, or from what`);
        if (lat[mi] === undefined) { say(v.id, 'a lateen mizzen with no lateen yard', `${at}: no lateen yard records this mast`); return; }
        const ny = slung.filter(x => Math.abs(x - lat[mi]) < 0.6).length;
        if ((segN[mi] || 0) > 2 || ny > 2)
          say(v.id, 'a topgallant over a lateen mizzen', `${at}: ${segN[mi] || 0} mast pieces and ${ny} square yards drawn; a lateen mizzen crosses the crossjack and the topsail on two pieces`);
      });
    }
"""
s = s.replace(anchor, rule + anchor)
open(P, 'w').write(s)
print('ok')
