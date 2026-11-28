      /* ⚠ THE RING HANGS ON STEEL'S STOPPER, AND THE SHANK ON HIS SHANK-PAINTER (round 371). Until r371 the ring hung on
         one straight rope from the cathead's tip to the ring's centre, and nothing held the shank. Steel (1794, vol. 2,
         "To cat and fish the anchor"): the bowers "are secured by their stoppers, from the catheads and shank-painters.
         The stopper has one end clinched round the cathead; the other end passes through the ring of the anchor, returns
         upwards, and leads over a large thumb cleat bolted to the cathead, and is made fast with several turns, and the
         end hitched round the head-rail and timber-head, on the fore side of the cathead. The shank-painter hangs the
         shank and fluke of the anchor to the ship's side outboard; and when stowed, the shank-painter is passed under the
         inner fluke round the shank of the anchor, and made fast with two or three turns, and the end stopt round
         timber-heads on the forecastle." Steel 1822's glossary: "SHANK-PAINTER. A chain bolted through the topside, abaft
         the cathead". Lever (1808; 1827 ed., p. 69): "the Shank Painter, which is a Stopper, with an Iron Chain, is passed
         under the inner Arm and Shank". The timber-heads both ends are belayed to are not drawn: the stopper's end stops
         at the cathead where it crosses the top of the side, the painter's at the topside (CLASS). */
      const ropeR = 0.018 + B * 0.0006, M = new THREE.Matrix4().fromArray(cat.m);
      const Lc = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
      const sq = cat.sq, bl = cat.blen, fw = cat.fwd, h = sq / 2 + ropeR;
      /* the bight bears on the inside of the ring at its highest point, in the ring's own plane (the shank and the arms) */
      const up = st.xA.clone().multiplyScalar(st.xA.y).addScaledVector(st.yA, st.yA.y);
      if (up.lengthSq() < 1e-6) up.copy(st.yA); up.normalize();
      const bear = st.ring.clone().addScaledVector(up, f.ringR - f.ringT - ropeR);
      const along = Lc(0, 0, 1).sub(Lc(0, 0, 0)).normalize();
      const zc = bl - sq * 1.25, zq = bl - sq * 0.55;
      const clinch = [];
      for (const [a, c] of [[1, 1], [1, -1], [-1, -1], [-1, 1], [1, 1]]) clinch.push(Lc(a * h, c * h, zc));
      const segs = [];
      for (let i = 0; i + 1 < clinch.length; i++) segs.push([clinch[i], clinch[i + 1]]);
      const b0 = bear.clone().addScaledVector(along, -ropeR * 1.5), b1 = bear.clone().addScaledVector(along, ropeR * 1.5);
      segs.push([Lc(0, -h, zc), b0], [b0, b1]);
      /* up from the ring to the thumb cleat on the cathead's fore side, over it, and inboard along that side */
      const cleatOut = sq * 0.5 + sq * 0.32;
      const q0 = Lc(fw * (cleatOut + ropeR), -sq * 0.12, zq), q1 = Lc(fw * (cleatOut + ropeR), sq * 0.12, zq);
      const zs = cat.zSide;
      const q2 = Lc(fw * h, sq * 0.2, zq - sq * 0.4), q3 = Lc(fw * h, sq * 0.2, Math.max(0, zs));
      segs.push([b1, q0], [q0, q1], [q1, q2], [q2, q3]);
      const stp = ropeMesh(segs, ropeR, mats.ropeSolid || iron);
      if (stp) {
        stp.userData.catStopper = { ring: st.ring.toArray().map(q => +q.toFixed(3)), bear: bear.toArray().map(q => +q.toFixed(3)),
          tip: [cat.x, cat.y, cat.z].map(q => +q.toFixed(3)), clinchZ: +zc.toFixed(3), cleatZ: +zq.toFixed(3), sq: +sq.toFixed(3), r: +ropeR.toFixed(3),
          rule: 'Steel 1794 vol. 2: one end clinched round the cathead, through the ring, up over a thumb cleat bolted to the cathead, made fast, the end to the timber-head on the cathead\'s fore side' };
        group.add(tag(stp, 'catStopper'));
      }
      /* the shank-painter: a chain bolted through the topside abaft the cathead, under the inner arm and round the shank
         at the crown, back up to a second bolt 0.3 m abaft the first; the inner arm is the one nearer the side */
      {
        const tOut = Lc(0, 0, bl);
        const armDir = k => st.xA.clone().multiplyScalar(k * f.sin).addScaledVector(st.yA, f.cos);   // crown → bill on arm k
        const bills = [1, -1].map(k => ({ k, p: st.crown.clone().addScaledVector(armDir(k), f.a) }));
        const inner = bills.sort((p, q) => Math.abs(p.p.z) - Math.abs(q.p.z))[0];
        /* round the shank just above the arms, and under the inner arm a quarter of its length from the crown */
        const shankPt = st.crown.clone().addScaledVector(st.yA, f.a * 0.15);
        const armPt = st.crown.clone().addScaledVector(armDir(inner.k), f.a * 0.25);
        const xb = Math.max(shankPt.x, cat.xSide + sq * 1.2);
        const ub = uAtXV(S, H, xb, 1, Math.max(0.01, Math.min(0.99, xb / S.lwl + 0.5)));
        if (ub !== null) {
          const shr = surfacePoint(S, H, ub, 1), yb = shr[1] - 0.25;
          const vb = vAtY(S, H, ub, yb), ub2 = uAtXV(S, H, xb, vb, ub) ?? ub;
          const pb = surfacePoint(S, H, ub2, vAtY(S, H, ub2, yb));
          const zb = Math.abs(pb[2]) + 0.03;
          const sg = Math.sign(st.ring.z) || 1;
          const bolt0 = new THREE.Vector3(xb, yb, sg * zb), bolt1 = new THREE.Vector3(xb + 0.3, yb, sg * zb);
          const cr = f.rCrown + 0.025, ar = f.rCrown * 0.8 + 0.025;
          /* under a member: the world's down, square to the member's axis */
          const under = (ax, pt, r) => { const d = new THREE.Vector3(0, -1, 0); d.addScaledVector(ax, -d.dot(ax)); if (d.lengthSq() < 1e-6) d.set(0, -1, 0); return pt.clone().addScaledVector(d.normalize(), r); };
          const sU = under(st.yA, shankPt, cr), aU = under(armDir(inner.k).normalize(), armPt, ar);
          const chainR = Math.max(0.012, B * 0.0012);
          const ch = ropeMesh([[bolt0, aU], [aU, sU], [sU, bolt1]], chainR, iron);
          if (ch) {
            ch.userData.shankPainter = { bolt: [bolt0, bolt1].map(p => p.toArray().map(q => +q.toFixed(3))), shank: shankPt.toArray().map(q => +q.toFixed(3)),
              arm: armPt.toArray().map(q => +q.toFixed(3)), topY: +shr[1].toFixed(3), cathead: +cat.xSide.toFixed(3), r: +chainR.toFixed(3),
              offSide: +(Math.abs(shankPt.z) - zb).toFixed(3),
              rule: 'Steel 1822 glossary: a chain bolted through the topside abaft the cathead; Steel 1794 and Lever: passed under the inner arm and round the shank' };
            group.add(tag(ch, 'shankPainter'));
            for (const p of [bolt0, bolt1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(chainR * 2.2, 8, 6), iron); e.position.copy(p); group.add(tag(e, 'shankPainter', 'Shank-painter bolt')); }
          }
        }
      }
