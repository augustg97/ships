/* r142 DRAFT — replaces the sangjang side-wall loft (hull.js ~8443-8454) and the
   beamAB port-plate loop (~8468-8485) inside `if (GD.walls)`. The end closures
   (8455-8467) stay verbatim, moved below the new builder. portMat (8417) and the
   headY/wIn/timberDS declarations (8434-8442) stay. */

      /* ── THE PORT ROW IS OPENINGS NOW (round 142, the r140/r141 law one storey
         down). The plate's row of small square ports under the deck line was drawn
         as dark plates PROUD of the belt — paint, while the record's own word has
         been "pierced" since r118. Now the belt itself is built pierced, exactly as
         the fighting-deck wall above: stations of the loft plus both edges of every
         port, each port a real OPENING through the plank with jamb, sill and head
         reveal faces the plank's own gauge deep, and a near-black board a hand
         inboard so the port reads into the oar deck's shadow from every outboard
         bearing. Positions and sizes are the drawn row's exactly: 16 a side under
         the deck line, 0.52 m of daylight, 0.50 m tall. The plank takes the
         bulwark's own gauge (B*0.012) and thickens INBOARD, so the outer face —
         the face the plate attests and the posts stand proud of — does not move.
         The belt RAKES between rail and clamp, so every z is interpolated at its
         own height along the rake. Single winding on DoubleSide, the r118 lesson. */
      const tS = B * 0.012;
      const nP = Math.max(0, GD.wallPorts | 0);
      const duP = 0.26 / L;
      const yPc = headY - 0.42, ypS = yPc - 0.25, ypH = yPc + 0.25;
      const portDSS = portMat.clone(); portDSS.side = THREE.DoubleSide;
      /* stations: the loft's own N plus both edges of every port, sorted */
      const usS = [], portsS = [];
      for (let i = 0; i <= N; i++) usS.push(GD.from + (GD.to - GD.from) * i / N);
      for (let j = 0; j < nP; j++) {
        const uj = GD.from + (GD.to - GD.from) * (j + 0.5) / nP;
        portsS.push([uj - duP, uj + duP]); usS.push(uj - duP, uj + duP);
      }
      usS.sort((a, b) => a - b);
      const inPort = u => portsS.some(s => u > s[0] + 1e-9 && u < s[1] - 1e-9);
      /* the belt's frame at a station: foot on the rail, head at the clamp, and
         its z at any height interpolated along the rake between them */
      const stS = u => {
        const p = surfacePoint(S, H, u, 1.0);
        const footY = p[1] - B * 0.010;
        const footZ = Math.abs(p[2]) - wIn;
        const headZ = Math.abs(p[2]) + over - B * 0.020 - wIn;
        return { x: p[0], footY,
                 z: y => footZ + (headZ - footZ) * (y - footY) / (headY - footY) };
      };
      for (const sgn of [-1, 1]) {
        const wallS = { pos: [], idx: [] }, revS = { pos: [], idx: [] };
        const quadS = (gq, a, b, c, d) => {
          const k = gq.pos.length / 3;
          gq.pos.push(...a, ...b, ...c, ...d);
          gq.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
        };
        for (let i = 0; i < usS.length - 1; i++) {
          if (usS[i + 1] - usS[i] < 1e-7) continue;   // a port edge on a loft station
          const a = stS(usS[i]), b = stS(usS[i + 1]);
          const oA = y => sgn * a.z(y), oB = y => sgn * b.z(y);
          const iA = y => sgn * (a.z(y) - tS), iB = y => sgn * (b.z(y) - tS);
          /* below the sills and above the heads the belt runs unbroken */
          quadS(wallS, [a.x, a.footY, oA(a.footY)], [b.x, b.footY, oB(b.footY)],
                       [b.x, ypS, oB(ypS)], [a.x, ypS, oA(ypS)]);
          quadS(wallS, [a.x, a.footY, iA(a.footY)], [b.x, b.footY, iB(b.footY)],
                       [b.x, ypS, iB(ypS)], [a.x, ypS, iA(ypS)]);
          quadS(wallS, [a.x, ypH, oA(ypH)], [b.x, ypH, oB(ypH)],
                       [b.x, headY, oB(headY)], [a.x, headY, oA(headY)]);
          quadS(wallS, [a.x, ypH, iA(ypH)], [b.x, ypH, iB(ypH)],
                       [b.x, headY, iB(headY)], [a.x, headY, iA(headY)]);
          /* head and foot seams closed, plank-edge wide */
          quadS(wallS, [a.x, headY, iA(headY)], [b.x, headY, iB(headY)],
                       [b.x, headY, oB(headY)], [a.x, headY, oA(headY)]);
          quadS(wallS, [a.x, a.footY, oA(a.footY)], [b.x, b.footY, oB(b.footY)],
                       [b.x, b.footY, iB(b.footY)], [a.x, a.footY, iA(a.footY)]);
          /* the port band: belt only between ports — a span inside a port is the hole */
          if (!inPort((usS[i] + usS[i + 1]) / 2)) {
            quadS(wallS, [a.x, ypS, oA(ypS)], [b.x, ypS, oB(ypS)],
                         [b.x, ypH, oB(ypH)], [a.x, ypH, oA(ypH)]);
            quadS(wallS, [a.x, ypS, iA(ypS)], [b.x, ypS, iB(ypS)],
                         [b.x, ypH, iB(ypH)], [a.x, ypH, iA(ypH)]);
          }
        }
        /* end grain under the athwartships closures */
        for (const uE of [usS[0], usS[usS.length - 1]]) {
          const e = stS(uE);
          quadS(wallS, [e.x, e.footY, sgn * (e.z(e.footY) - tS)],
                       [e.x, e.footY, sgn * e.z(e.footY)],
                       [e.x, headY, sgn * e.z(headY)],
                       [e.x, headY, sgn * (e.z(headY) - tS)]);
        }
        /* each port: jambs, sill and head through the plank */
        for (const [uL2, uR2] of portsS) {
          const l = stS(uL2), r = stS(uR2);
          const oL = y => sgn * l.z(y), iL = y => sgn * (l.z(y) - tS);
          const oR = y => sgn * r.z(y), iR = y => sgn * (r.z(y) - tS);
          quadS(revS, [l.x, ypS, oL(ypS)], [l.x, ypS, iL(ypS)],
                      [l.x, ypH, iL(ypH)], [l.x, ypH, oL(ypH)]);
          quadS(revS, [r.x, ypS, oR(ypS)], [r.x, ypS, iR(ypS)],
                      [r.x, ypH, iR(ypH)], [r.x, ypH, oR(ypH)]);
          quadS(revS, [l.x, ypS, oL(ypS)], [r.x, ypS, oR(ypS)],
                      [r.x, ypS, iR(ypS)], [l.x, ypS, iL(ypS)]);
          quadS(revS, [l.x, ypH, oL(ypH)], [r.x, ypH, oR(ypH)],
                      [r.x, ypH, iR(ypH)], [l.x, ypH, iL(ypH)]);
        }
        const mkS = (gq, mat, name, what) => {
          const bg = new THREE.BufferGeometry();
          bg.setAttribute('position', new THREE.Float32BufferAttribute(gq.pos, 3));
          bg.setIndex(gq.idx); bg.computeVertexNormals();
          group.add(tag(new THREE.Mesh(bg, mat), 'sangjang', name, what));
        };
        mkS(wallS, timberDS, 'Sangjang belt',
            'The closed plank belt between the gunwale and the fighting deck — the '
            + 'oar deck\'s own protection. The rowers work behind it, and the ro '
            + 'reach out under its foot seam.');
        mkS(revS, timberDS, 'Oar-deck port',
            'The row of small square ports her plate draws under the deck line, cut '
            + 'through the belt — from outside each is a dark square in the plank, '
            + 'reading into the oar deck\'s own shadow.');
        /* the shadow boards: one dark plane behind each port, a hand inboard, so the
           opening reads into the deck's shadow rather than through to the far wall */
        const brdS = { pos: [], idx: [] };
        const mrgS = 0.06;
        for (const [uL2, uR2] of portsS) {
          const l = stS(uL2), r = stS(uR2);
          /* the belt rakes outboard as it rises: clamp the board inboard of the
             band's most-inboard face, which is its foot */
          const zb = sgn * (Math.min(l.z(ypS - mrgS), r.z(ypS - mrgS)) - tS - 0.08);
          const x0 = Math.min(l.x, r.x) - mrgS, x1 = Math.max(l.x, r.x) + mrgS;
          const k = brdS.pos.length / 3;
          brdS.pos.push(x0, ypS - mrgS, zb, x1, ypS - mrgS, zb,
                        x1, ypH + mrgS, zb, x0, ypH + mrgS, zb);
          brdS.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
        }
        mkS(brdS, portDSS, 'Oar-deck port');
      }
