      /* ── AND THE OAR-DECK PORTS ARE OPENINGS TOO (round 142, the r140 law one
         storey down). GD.walls closes the band between the gunwale and the fighting
         deck and GD.wallPorts counts the port row a side — the panokseon's sangjang
         belt, whose record has said "pierced by a row of small ports" since r118
         while the drawn ports were dark plates PROUD of the loft. Since r142 the
         belt is built pierced, so the same conviction applies: PASSAGE. At each
         drawn port centre a perpendicular ray from outside must strike the belt
         meshes DEEPER than the outer face; midway between ports it must be STOPPED
         at the face. The belt RAKES between rail and deck clamp, so the expected
         face is interpolated at the port row's own height — foot on the rail one
         post-face inboard, head at the clamp — from the record and surfacePoint,
         never the drawn meshes (r113). The rail's world height comes off
         surfacePoint anchored to the fleet convention (rail amidships IS the
         freeboard). The old plate form convicts itself at every port centre,
         standing proud where the ray must pass. */
      if (H.gunDeck.walls && H.gunDeck.wallPorts) {
        const beltSet = [];
        g.updateMatrixWorld(true);
        g.traverse(o => { const p = tagOf(o);
          if (o.isMesh && p && p.key === 'sangjang') beltSet.push(o); });
        if (!beltSet.length)
          say(v.id, 'a port row with no belt to pierce',
              'GD.wallPorts declared with no sangjang geometry');
        else {
          const HSw = SHIPS_HULL.hullSurface(H);
          const GDw = H.gunDeck, B2 = H.beam;
          const overW = GDw.over !== undefined ? GDw.over : B2 * 0.045;
          const nW = GDw.wallPorts;
          const headYw = planeY - B2 * 0.016;
          const yRow = headYw - 0.42;
          const pdM = SHIPS_HULL.surfacePoint(H, HSw, 0.5, 1.0);
          const yOff = H.freeboard - pdM[1];
          const rc = new THREE.Raycaster(); rc.far = 60;
          let bad = 0, shot = 0, first = '';
          for (const sgn of [-1, 1]) for (let j = 0; j < 2 * nW - 1; j++) {
            /* even j: port centre (must pass); odd j: midway between ports (must stop) */
            const u = GDw.from + (GDw.to - GDw.from) * (j / 2 + 0.5) / nW;
            const pd = SHIPS_HULL.surfacePoint(H, HSw, u, 1.0);
            const footY = pd[1] + yOff - B2 * 0.010;
            const footZ = Math.abs(pd[2]) - B2 * 0.006;
            const headZ = Math.abs(pd[2]) + overW - B2 * 0.020 - B2 * 0.006;
            const faceZ = footZ + (headZ - footZ) * (yRow - footY) / (headYw - footY);
            rc.set(new THREE.Vector3(pd[0], yRow, sgn * (faceZ + 4)),
                   new THREE.Vector3(0, 0, -sgn));
            shot++;
            const hit = rc.intersectObjects(beltSet, true)[0];
            const depth = hit ? faceZ - hit.point.z * sgn : 99;
            const isPort = j % 2 === 0;
            if (isPort ? depth < 0.02 : (depth < -0.1 || depth > 0.15)) {
              bad++;
              if (!first) first = `${isPort ? 'port' : 'belt'} at u ${u.toFixed(2)} `
                + `${sgn > 0 ? 'stbd' : 'port side'}: first strike `
                + `${hit ? depth.toFixed(2) + ' m in' : 'nothing'}`;
            }
          }
          if (bad) say(v.id, 'oar-deck ports are not openings through the belt',
                       `${bad} of ${shot} passage rays wrong — ${first}`);
        }
      }
