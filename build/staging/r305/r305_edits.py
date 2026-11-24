import sys
p = sys.argv[1]
s = open(p).read()
anchor = """        if (tgm) group.add(tag(tgm, 'shroud', 'Topgallant shrouds'));
      }
"""
assert s.count(anchor) == 1, 'anchor'
add = anchor + r"""
      /* ── r305 (0y¹³³): A GAFF TOPMAST IS STAYED TOO ────────────────────────────────────
         The block above stays only square topmasts, so every gaff topmast in the fleet stood
         with nothing but the truck-to-truck spring stay on it: Endurance's main and mizzen,
         Great Eastern's six and Wyoming's six. A schooner's topmast is fidded through the
         lower masthead the same way a square-rigger's is, and it needs the same sideways
         support. It gets it from a pair of CROSSTREES (spreaders) athwart the lower masthead,
         and one TOPMAST SHROUD a side. The shroud runs from the topmast's hounds out over
         the end of the crosstree, which gives it a spread to pull against, and down to the
         ship's side one shroud-space abaft the lower shrouds, where it sets up at the rail.
         There are no ratlines: a gaff topsail is set and handed from the deck.
         The crosstree spread is the square-rig class figure (beam × 0.085 a side) and the
         lead to the rail is a class rule; neither is read off a plate of these three ships. */
      const gaffTopSeg = mk.rig === 'gaff' && mk.topmast && segs.length >= 2 ? segs[1] : 0;
      if (FINE && gaffTopSeg > 0 && onDeadeyes && shroudPts[0].length) {
        const ctY = base + lower * 0.975;                     // on the trestletrees, under the cap
        const ctR = B * 0.085;
        const tmFoot = base + lower * 0.88;                   // the topmast's heel, in the doubling
        const tmHounds = tmFoot + gaffTopSeg * 0.93;
        const ct = new THREE.Group();
        for (const dx of [-1, 1]) {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(B * 0.016, B * 0.011, ctR * 2.3),
            mats.woodPale || woodDark);
          bar.position.set(mxA(ctY) + dx * B * 0.018, ctY, 0);
          ct.add(bar);
        }
        ct.userData.gaffCrosstrees = { mi, y: +ctY.toFixed(4), x: +mxA(ctY).toFixed(4), halfSpanM: +(ctR * 1.15).toFixed(4) };
        group.add(tag(ct, 'top', 'Crosstrees',
          'Two light timbers athwart the lower masthead, on the trestletrees under the cap. '
          + 'They spread the topmast shrouds so that the shrouds pull on the topmast from '
          + 'out to each side; led straight down the mast, a shroud would hold nothing. '
          + 'The spread is a class figure, not read from a plate of this ship (r305).'));
        const tSegs = [], built = [];
        [1, -1].forEach((side, si2) => {
          const feet = shroudPts[si2].map(([a]) => a);
          const aft = feet.reduce((m, a) => (a.x > m.x ? a : m), feet[0]);
          const xs = feet.map(a => a.x).sort((p, q) => p - q);
          const pitch = xs.length > 1 ? (xs[xs.length - 1] - xs[0]) / (xs.length - 1) : B * 0.08;
          const fx = aft.x + pitch;
          const uA = aft.x / L + 0.5, uF = fx / L + 0.5;
          /* the foot keeps the after shroud's standoff from the skin, at its own station */
          const off = Math.abs(aft.z) - halfAtHeight(S, H, uA, aft.y);
          const foot = new THREE.Vector3(fx, aft.y, side * (halfAtHeight(S, H, uF, aft.y) + off));
          const tip = new THREE.Vector3(mxA(ctY), ctY + B * 0.0055, side * ctR * 1.12);
          const head = new THREE.Vector3(mxA(tmHounds), tmHounds, side * B * 0.012);
          tSegs.push([head, tip], [tip, foot]);
          built.push({ side, head: [head.x, head.y, head.z], tip: [tip.x, tip.y, tip.z], foot: [foot.x, foot.y, foot.z],
                       aftShroudFoot: [aft.x, aft.y, aft.z] });
        });
        const tsm = ropeMesh(tSegs, 0.014 + B * 0.0007, ropeMat);
        if (tsm) {
          tsm.userData.gaffTopShrouds = { mi, tmFoot: +tmFoot.toFixed(4), tmHead: +(tmFoot + gaffTopSeg).toFixed(4),
                                          hounds: +tmHounds.toFixed(4), ct: +ctY.toFixed(4), built };
          group.add(tag(tsm, 'shroud', 'Gaff topmast shrouds',
            'One shroud a side from the topmast\'s hounds, out over the end of the crosstree and '
            + 'down to the rail one shroud-space abaft the lower shrouds. It holds the topmast '
            + 'against the sideways pull of the gaff topsail and the spring stay. No ratlines: '
            + 'a gaff topsail is worked from the deck. The lead is a class rule (r305).'));
        }
      }
"""
s = s.replace(anchor, add)
open(p, 'w').write(s)
print('ok')
