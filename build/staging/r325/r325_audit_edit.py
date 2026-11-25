"""r325 (0y167): A-TOPMAST-TOP, and A-COURSE-READ reads the LOWER top only."""
import sys
P = sys.argv[1]; s = open(P).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80]); s = s.replace(a, b)
rep("""                        if (o.userData.part && o.userData.part.key === 'top') topM.push(o); });""",
"""                        if (o.userData.part && o.userData.part.key === 'top' && o.userData.part.name === 'Top') topM.push(o); });   // r325: the lower top, not a topmast top or crosstrees on the same axis""")
rep("""    /* ── A-RIG-HEIGHT (round 287, 0y⁹⁶)""",
"""    /* ── A-TOPMAST-TOP (round 325, 0y¹⁶⁷): A TOPMAST BEFORE 1710 SAYS WHETHER IT CARRIES A TOP, AND A READ TOP IS DRAWN THERE.
       Every three-tier topmast was given open crosstrees at its head, the 18th-century fitting. Hocker's Vasa rig diagram
       (1628) draws a small round top on the fore and main topmasts, under the cap, at 0.945 and 0.943 of the height from
       the mast's foot to the topmast's head, 0.46 and 0.48 of the lower top's width. RECORD: on a hull dated before 1710
       every square mast with no `yards` list and three tiers carries `topmastTopProvenance`, opening 'PLATE READ' with a
       `topmastTop` or 'UNREAD' with none; the SILENCE convicts. A read's two figures agree with its own rows and widths
       (0.005, 0.01). BUILT: a read mast carries exactly one 'Topmast top' group (`userData.topmastTop` for the mast) and
       no crosstrees; its centre stands within the read's bound of the read share of foot-to-head, and its half-width
       measured off its meshes is the read share of the lower top's radius (0.05 of it); the topmast shrouds' highest
       vertex stands under the top's lowest (the r324 build ran them through the platform to the cap); and every
       topgallant shroud's foot stands on the top's rim, within 0.15 r of 0.85 r off the axis. A mast with no read
       carries crosstrees and no topmast top. */
    {
      const ttG = [], ctG = [], tmS = [], tgS = [];
      g.updateMatrixWorld(true);
      const invG = new THREE.Matrix4().copy(g.matrixWorld).invert();
      g.traverse(o => { const p = o.userData && o.userData.part; if (!p) return;
        if (o.userData.topmastTop) ttG.push(o);
        else if (p.key === 'top' && p.name === 'Crosstrees' && o.userData.mast !== undefined) ctG.push(o);
        if (o.isMesh && o.userData.topmastShrouds) tmS.push(o);
        if (o.isMesh && p.key === 'shroud' && p.name === 'Topgallant shrouds') tgS.push(o); });
      const vtx = o => { const a = o.geometry.attributes.position, out = [], V = new THREE.Vector3(); o.updateMatrixWorld(true);
        for (let k = 0; k < a.count; k++) { V.set(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(o.matrixWorld).applyMatrix4(invG); out.push(V.clone()); } return out; };
      (H.masts || []).forEach((mk, mi) => {
        if ((H.year || 0) >= 1710 || mk.rig !== 'square' || Array.isArray(mk.yards) || (mk.only || 3) < 3) return;
        const at = `masts[${mi}] (station ${mk.at})`, P = mk.topmastTopProvenance || '', R = mk.topmastTop;
        if (!P) say(v.id, 'a topmast head with no answer', `${at}: a topmast on a hull dated ${H.year} carries crosstrees and the record says nothing of whether it carried a top (topmastTopProvenance opening PLATE READ with a topmastTop, or UNREAD)`);
        else if (/^PLATE READ/.test(P) && !R) say(v.id, 'a topmast top read with no figure', `${at}: topmastTopProvenance opens PLATE READ and topmastTop is absent`);
        else if (/^UNREAD/.test(P) && R) say(v.id, 'a topmast top figure over an UNREAD provenance', `${at}: topmastTop present and the provenance opens UNREAD`);
        else if (!/^(PLATE READ|UNREAD)/.test(P)) say(v.id, 'a topmast top provenance that does not say', `${at}: topmastTopProvenance opens '${P.slice(0, 30)}', neither PLATE READ nor UNREAD`);
        const read = !!(R && typeof R.ofFootToHead === 'number' && R.ofLowerTop > 0);
        if (R && R.rows && R.widthPx) {
          const a = (R.rows.foot - R.rows.top) / (R.rows.foot - R.rows.head), b = R.widthPx.top / R.widthPx.lowerTop;
          if (Math.abs(a - R.ofFootToHead) > 0.005 || Math.abs(b - R.ofLowerTop) > 0.01)
            say(v.id, 'a topmast top read off its own rows', `${at}: rows give ${a.toFixed(4)} against ofFootToHead ${R.ofFootToHead}, widths ${b.toFixed(3)} against ofLowerTop ${R.ofLowerTop}`);
        }
        const mine = ttG.filter(o => o.userData.topmastTop.mast === mi), cts = ctG.filter(o => o.userData.mast === mi);
        if (!read) {
          if (mine.length) say(v.id, 'a topmast top drawn with no read', `${at}: ${mine.length} topmast top(s) and no topmastTop`);
          if (cts.length !== 1) say(v.id, 'a topmast head with nothing to spread its shrouds', `${at}: ${cts.length} crosstrees and no topmast top`);
          return;
        }
        if (mine.length !== 1 || cts.length) { say(v.id, 'a topmast top read not drawn', `${at}: ${mine.length} topmast tops and ${cts.length} crosstrees; the read wants one top and no crosstrees`); return; }
        const T = mine[0], u = T.userData.topmastTop;
        const share = (T.position.y - u.base) / (u.head - u.base);
        if (Math.abs(share - R.ofFootToHead) > (R.boundPm || 0.01))
          say(v.id, 'a topmast top off its plate read', `${at}: the top stands ${share.toFixed(4)} of the way from the mast's foot (y ${u.base}) to the topmast's head (y ${u.head}); the plate reads ${R.ofFootToHead}`);
        const P3 = []; T.traverse(m => { if (m.isMesh) P3.push(...vtx(m)); });
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
        for (const q of P3) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); }
        const half = (x1 - x0) / 2, want = u.lowerR * R.ofLowerTop;
        if (Math.abs(half - want) > 0.05 * want)
          say(v.id, 'a topmast top not the read size', `${at}: half-width ${half.toFixed(3)} m measured off its meshes; ${R.ofLowerTop} of the lower top's ${u.lowerR} m is ${want.toFixed(3)} m`);
        const sh = tmS.filter(o => o.userData.topmastShrouds.mast === mi);
        if (sh.length !== 1) say(v.id, 'a topmast top with no topmast shrouds under it', `${at}: ${sh.length} topmast shroud meshes`);
        else { const yMax = Math.max(...vtx(sh[0]).map(q => q.y));
          if (yMax > y0) say(v.id, 'a topmast shroud through its top', `${at}: the topmast shrouds reach y ${yMax.toFixed(3)} and the top's lowest point is y ${y0.toFixed(3)}`); }
        /* the topgallant shrouds' feet: the lowest vertices of the mast's topgallant shroud mesh within 3 m of the top */
        const near = [].concat(...tgS.map(vtx)).filter(q => Math.abs(q.y - u.y) < 0.6 && Math.abs(q.x - T.position.x) < u.r * 2);
        if (!near.length) say(v.id, 'a topmast top with no topgallant shrouds at its rim', `${at}: no topgallant shroud vertex within 0.6 m of the top's height`);
        else { const dz = Math.max(...near.map(q => Math.abs(q.z)));
          if (Math.abs(dz - 0.85 * u.r) > 0.15 * u.r + 0.05) say(v.id, 'a topgallant shroud off its top\\'s rim', `${at}: the shroud feet stand ${dz.toFixed(3)} m off the centreline; the rim is at ${(0.85 * u.r).toFixed(3)} m`); }
      });
    }
    /* ── A-RIG-HEIGHT (round 287, 0y⁹⁶)""")
open(P, 'w').write(s)
print('ok')
