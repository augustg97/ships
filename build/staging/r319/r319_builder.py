"""r319 (0y¹⁵⁶): the lateen sheet on every set lateen, and Mainwaring's outlicker where the clew stands abaft the stern.
Asserts every replace (memory: assert-every-replace)."""
import sys
P = sys.argv[1]
s = open(P).read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:80]); s = s.replace(old, new)

# 1. the PARTS entries
rep("""  parrel:   { stage: 6, name: 'Parrels',""",
"""  lateenSheet: { stage: 6, name: 'Lateen sheet',
              what: 'The rope that hauls a lateen\\'s clew, its lower after corner, down and aft. '
                  + 'Its standing part is made fast on deck under the clew, it is rove through '
                  + 'the sheet block at the clew and back through a block beside the standing part, '
                  + 'and its fall is hauled on deck. Where the clew stands abaft the stern, the '
                  + 'sheet leads to an outlicker over the stern instead.' },
  outlicker: { stage: 6, name: 'Outlicker',
              what: 'A short spar made fast on top of the poop and standing straight out astern, '
                  + 'for the mizzen sheet. Mainwaring\\'s Seaman\\'s Dictionary (1644): it is "some '
                  + 'two or three yards long", the sheet\\'s standing part is made fast at its outer '
                  + 'end and the sheet rove through a block seized near that end, and it is used '
                  + 'where "the mizen mast is placed so far aft that there is not room enough '
                  + 'within-board to haul down the sheet flat". He says "generally all Newcastle '
                  + 'carvels have them" and that it is "seldom used in great ships".' },
  parrel:   { stage: 6, name: 'Parrels',""")

# 2. the sheet and the outlicker, in the lateen block after sheetG and rel exist
rep("""      beside.add(sheetG);
      const rel = P => [P[0] - heel[0], P[1] - heel[1]];
      if (FURLED) {""",
"""      beside.add(sheetG);
      const rel = P => [P[0] - heel[0], P[1] - heel[1]];
      /* ── r319 (0y¹⁵⁶): THE SHEET, AND THE OUTLICKER WHERE THERE IS NO ROOM WITHIN-BOARD ──
         No lateen drew a sheet: the clew was set in the air on all twelve, and on the four mizzens of
         the carrack, the fluyt, the East Indiaman and the slave ship it stood 0.75-1.07 m abaft the
         stern (r319/probe-before.json). Mainwaring's Seaman's Dictionary (written c. 1620-23, printed
         1644; Navy Records Society vol. 56, 1922, p. 193) names the fitting such a ship carried: "The
         Outlicker is a small piece of timber (some two or three yards long, as they have occasion to
         use it) and it is made fast to the top of the poop, and so stands right out astern. At the
         outwardmost end there is a hole, into which the standing part of the sheet is made fast, and
         so, being reeved through the block of the sheet, is reeved again through another block which
         is seized to this piece of timber near the end ... the cause why in any ship it is used is for
         that the mizen mast is placed so far aft that there is not room enough within-board to haul
         down the sheet flat."
         So the rule is his: the sheet's lead must stand at or abaft the clew's station. Where the
         deck's aft end (the stern at the sheer, deckEdge at u 1) is less than a block's room (0.3 m,
         class) abaft the clew, the lead is an outlicker: lashed on top of the poop at the lee quarter,
         standing straight aft, as long as it must be to stand 0.6 m (class) abaft the clew and within
         his two to three yards (1.83-2.74 m). Otherwise the standing part is made fast at the lee
         rail under the clew. The rope follows his reeving: standing part, up to the clew's block, down
         to the second block, and the fall inboard. The sheet is drawn in the set build only; the
         outlicker is a timber of the ship and stands in both. */
      const clewHull = new THREE.Vector3(clew[0] - heel[0], clew[1] - heel[1], 0)
        .applyQuaternion(sheetG.quaternion).add(new THREE.Vector3(heel[0], heel[1], OFF));
      {
        const se = deckEdge(S, H, 1);                       // [x, y, half] at the deck's aft end
        const xAft = se[0], ROOM = 0.30, ABAFT = 0.60;
        const needOut = clewHull.x > xAft - ROOM;
        const ctS = castleTopAt(S, H, 0.985);
        /* the top of the poop at the stern: a castle's rail where a castle reaches the stern, the
           taffrail's crown where the hull carries one (buildStern: sheer + B 0.055 at the quarter),
           else the sheer */
        const crown = (S.sternLights || S.gunDecks) ? B * 0.055 + B * 0.011 : 0;
        const poopTop = ctS ? ctS.y + ctS.railH : H.sheer(1) + crown;
        const rO = Math.max(0.05, rYheel * 0.55);           // class: about half the yard's heel
        const quarterZ = ctS ? ctS.half * 0.85 : se[2] * 0.85;
        let lead, outl = null;
        if (needOut) {
          const len = Math.max(1.83, Math.min(2.74, clewHull.x + ABAFT - xAft + 0.6));
          const xIn = xAft - 0.6, xOut = xIn + len, yO = poopTop + rO;
          const om = new THREE.Mesh(new THREE.CylinderGeometry(rO * 0.8, rO, len, 10), woodDark);
          om.rotation.z = Math.PI / 2;
          om.position.set((xIn + xOut) / 2, yO, quarterZ);
          outl = { xIn: +xIn.toFixed(3), xOut: +xOut.toFixed(3), y: +yO.toFixed(3), z: +quarterZ.toFixed(3), r: +rO.toFixed(3),
            len: +len.toFixed(3), past: +(xOut - xAft).toFixed(3), mast: mi,
            lenFrom: 'Mainwaring 1644: two or three yards long, as they have occasion to use it; class: long enough to stand 0.6 m abaft the clew',
            sideFrom: 'class: on the lee quarter, the side the lateen is sheeted to; Mainwaring says only that it stands right out astern' };
          om.userData.outlicker = outl;
          group.add(tag(om, 'outlicker'));
          lead = { end: new THREE.Vector3(xOut - 0.08, yO, quarterZ), block: new THREE.Vector3(xOut - 0.30, yO + rO + 0.05, quarterZ),
                   fall: new THREE.Vector3(xIn + 0.15, yO + rO, quarterZ) };
        } else {
          const uC = Math.max(0, Math.min(1, (clewHull.x + L / 2) / L));
          const ctC = castleTopAt(S, H, uC);
          const yR = ctC ? ctC.y + ctC.railH : H.sheer(uC);
          const zR = (ctC ? ctC.half : deckEdge(S, H, uC)[2]) * 0.96;
          lead = { end: new THREE.Vector3(clewHull.x, yR, zR), block: new THREE.Vector3(clewHull.x + 0.25, yR + 0.05, zR),
                   fall: new THREE.Vector3(clewHull.x + 0.25, (ctC ? ctC.y : H.deck(uC)) + 0.4, zR * 0.9) };
        }
        ym.userData.lateen.clew = [+clewHull.x.toFixed(3), +clewHull.y.toFixed(3), +clewHull.z.toFixed(3)];
        ym.userData.lateen.sheet = { lead: needOut ? 'outlicker' : 'rail', xAft: +xAft.toFixed(3),
          end: [+lead.end.x.toFixed(3), +lead.end.y.toFixed(3), +lead.end.z.toFixed(3)],
          room: +(xAft - clewHull.x).toFixed(3), drawn: !FURLED,
          from: 'Mainwaring 1644 (Outlicker, Sheets): the sheet hauls the clew down and aft; where there is no room within-board, an outlicker' };
        if (!FURLED) {
          const ck = clewHull.clone();
          const segs = [[lead.end, ck], [ck, lead.block], [lead.block, lead.fall]];
          const shm = ropeMesh(segs, 0.012 + B * 0.0004, ropeMat);
          if (shm) { shm.userData.lateenSheet = { mast: mi, lead: needOut ? 'outlicker' : 'rail' }; group.add(tag(shm, 'lateenSheet')); }
        }
      }
      if (FURLED) {""")
open(P, 'w').write(s)
print('ok')
