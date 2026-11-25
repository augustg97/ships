import sys
P = sys.argv[1]; s = open(P).read()
anchor = "    /* ── A-COURSE-READ (round 313, 0y¹⁴³)"
assert s.count(anchor) == 1
rule = r"""    /* ── A-LATEEN-SHEET (round 319, 0y¹⁵⁶): A LATEEN'S CLEW IS SHEETED TO THE SHIP, AND ABAFT THE STERN TO AN OUTLICKER.
       Until r319 no lateen drew a sheet, and on the carrack, the fluyt, the East Indiaman and the slave ship the clew
       stood 0.75-1.07 m abaft the stern. Mainwaring's Seaman's Dictionary (c. 1620-23, printed 1644; NRS vol. 56 p. 193):
       the outlicker, "some two or three yards long", is "made fast to the top of the poop, and so stands right out
       astern", and the sheet is led to it where "there is not room enough within-board to haul down the sheet flat".
       Read off the set build, against the deck's aft end xAft (0.5 lwl + rake(1), the hull surface's own):
       (1) every lateen yard has one 'Lateen sheet' mesh on its mast, 'a lateen clew sheeted to nothing'; the cloth reaches
       the yard's recorded clew within 0.2 m, 'a lateen clew off its cloth'; the sheet reaches it within 0.08 m, 'a lateen
       sheet short of its clew'. (2) A clew less than 0.3 m (class: a block's room) forward of xAft has an outlicker on
       its mast, 'a clew abaft the stern with no outlicker'; a clew with room has none, 'an outlicker where the sheet has
       room within-board'. (3) The outlicker, measured off its mesh: 1.83-2.74 m long, 'an outlicker outside Mainwaring's
       two to three yards'; its inboard end forward of xAft, 'an outlicker not made fast to the poop'; its outer end abaft
       the clew, 'an outlicker short of the clew'; its top under the clew by 0.2 m, 'an outlicker the sheet hauls up to';
       and the sheet comes within 0.2 m of its outer end, 'a sheet that does not reach its outlicker'. */
    {
      const hs = SHIPS_HULL.hullSurface(H), xAft = 0.5 * H.lwl + hs.rake(1);
      const lys = [], cl = [], shs = [], outs = [];
      g.traverse(o => { if (!o.isMesh) return;
        if (o.userData.lateen && o.userData.lateen.clew) lys.push(o.userData.lateen);
        if (o.userData.besideMast && typeof o.userData.mastX === 'number') cl.push(o);
        if (o.userData.lateenSheet) shs.push(o);
        if (o.userData.part && o.userData.part.key === 'outlicker') outs.push(o); });
      const vp = new THREE.Vector3();
      const minD = (o, P) => { let d = Infinity; const pa = o.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) { vp.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); d = Math.min(d, vp.distanceTo(P)); } return d; };
      for (const L of lys) {
        const at = `mast ${L.mast} (lateen, x ${L.mastX})`, C = new THREE.Vector3(...L.clew);
        const myCl = cl.filter(o => Math.abs(o.userData.mastX - L.mastX) < 0.01);
        if (myCl.length && Math.min(...myCl.map(o => minD(o, C))) > 0.2) say(v.id, 'a lateen clew off its cloth', `${at}: no cloth vertex within 0.2 m of the recorded clew ${L.clew}`);
        const mySh = shs.filter(o => o.userData.lateenSheet.mast === L.mast);
        if (mySh.length !== 1) { say(v.id, 'a lateen clew sheeted to nothing', `${at}: ${mySh.length} lateen sheet meshes`); continue; }
        const dC = minD(mySh[0], C);
        if (dC > 0.08) say(v.id, 'a lateen sheet short of its clew', `${at}: the sheet's nearest vertex ${dC.toFixed(3)} m from the clew`);
        const myO = outs.filter(o => o.userData.outlicker && o.userData.outlicker.mast === L.mast);
        const need = L.clew[0] > xAft - 0.3;
        if (need && !myO.length) say(v.id, 'a clew abaft the stern with no outlicker', `${at}: clew x ${L.clew[0]} against the deck's aft end ${xAft.toFixed(3)}`);
        if (!need && myO.length) say(v.id, 'an outlicker where the sheet has room within-board', `${at}: clew x ${L.clew[0]}, ${(xAft - L.clew[0]).toFixed(2)} m forward of the deck's aft end`);
        for (const o of myO) {
          const bb = new THREE.Box3().setFromObject(o), len = bb.max.x - bb.min.x;
          if (len < 1.81 || len > 2.76) say(v.id, "an outlicker outside Mainwaring's two to three yards", `${at}: ${len.toFixed(3)} m`);
          if (bb.min.x >= xAft) say(v.id, 'an outlicker not made fast to the poop', `${at}: inboard end x ${bb.min.x.toFixed(3)}, the deck's aft end ${xAft.toFixed(3)}`);
          if (bb.max.x < L.clew[0]) say(v.id, 'an outlicker short of the clew', `${at}: outer end x ${bb.max.x.toFixed(3)}, clew x ${L.clew[0]}`);
          if (bb.max.y > L.clew[1] - 0.2) say(v.id, 'an outlicker the sheet hauls up to', `${at}: outlicker top y ${bb.max.y.toFixed(3)}, clew y ${L.clew[1]}`);
          const end = new THREE.Vector3(bb.max.x, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
          const dE = minD(mySh[0], end);
          if (dE > 0.2) say(v.id, 'a sheet that does not reach its outlicker', `${at}: the sheet's nearest vertex ${dE.toFixed(3)} m from the outer end`);
        }
      }
    }
"""
s = s.replace(anchor, rule + anchor); open(P, 'w').write(s); print('ok')
