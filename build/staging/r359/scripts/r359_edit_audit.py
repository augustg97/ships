import sys
p = sys.argv[1]; s = open(p).read()
a = """          if (lowRail < 0.3) say(v.id, 'an island deck at its own top', `${I.name}: the barricade over the deck falls to ${lowRail.toFixed(2)} m`);
        }
"""
assert s.count(a) == 1
s = s.replace(a, a + r"""        /* ── A-ISLAND-PORTS-AS-RECORDED (round 359): THE PORTS IN AN ISLAND'S BARRICADE ARE THE RECORD'S, AND A GUN IS IN EACH.
           Steel's Folio XLII gives a 74 seven quarterdeck ports a side, 2 ft 9 in by 2 ft 6 in, the sill 1 ft 10 in over the
           plank; until r359 the barricade was a blank wall. The ports are painted by HULL_FRAG from uniforms (uQP) and the
           guns placed from the same list (islandPorts), and both read back here. TEST, on every island that records ports,
           from the BUILT scene in hull space: a malformed record is convicted; the island's group reports n ports
           (userData.islandPorts); each sill stands within 0.01 m of islandDeck(u) + sillM; each head is no higher than
           islandTop(u) less capM and no lower than the sill plus half of hM; neighbouring ports are at least wM apart
           centre to centre; the barricade's material uploads n rectangles (uQPN); there are 2n barrels (part islandGun),
           each with its centre within a port's width of a port's centre in x, between that port's sill and head, and
           outboard of the shell's half-breadth at the sheer there; and no port's span in x and y overlaps a quarter
           gallery's storey (userData.galleryStorey), which would hide it behind the gallery. */
        {
          const HSp = SHIPS_HULL.hullSurface(H), xAtP = u => (u - 0.5) * H.lwl + HSp.rake(u);
          const groups = {}, guns = [], storeys = []; const qpn = [];
          g.traverse(o => {
            if (o.userData.islandPorts && o.userData.part) groups[o.userData.part.name] = o;
            if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uQPN && o.material.uniforms.uQPN.value) qpn.push(o.material.uniforms.uQPN.value);
            if (o.userData.galleryStorey && o.isMesh) { o.geometry.computeBoundingBox(); storeys.push(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(invI)); }
            if (o.userData.part && o.userData.part.key === 'islandGun') o.traverse(c => { if (c.isMesh) guns.push(new THREE.Vector3().setFromMatrixPosition(c.matrixWorld).applyMatrix4(invI)); });
          });
          let want = 0;
          for (const isl of H.islands.list) {
            const P = isl.ports; if (!P) continue;
            const okP = P.n > 0 && P.n <= 8 && P.wM > 0.3 && P.wM < 1.5 && P.hM > 0.3 && P.hM < 1.5 && P.sillM >= 0 && P.sillM < 1.5
              && Array.isArray(P.u) && P.u.length === 2 && P.u[0] >= isl.u[0] && P.u[1] <= isl.u[1] && P.u[0] <= P.u[1];
            if (!okP) { say(v.id, 'an island ports record out of shape', `${isl.name}: ${JSON.stringify(P)}`); continue; }
            want += P.n;
            const grp = groups[isl.name], rd = grp && grp.userData.islandPorts;
            if (!rd || rd.length !== P.n) { say(v.id, 'an island port count off its record', `${isl.name}: the record ${P.n}, the build ${rd ? rd.length : 'none'}`); continue; }
            rd.forEach((q, i) => {
              const sill = HSp.islandDeck(q.u) + P.sillM, cap = HSp.islandTop(q.u) - (P.capM || 0);
              if (Math.abs(q.sill - sill) > 0.01) say(v.id, 'an island port sill off its record', `${isl.name} port ${i + 1} at u ${q.u}: sill ${q.sill} m, the record puts it at ${sill.toFixed(3)}`);
              if (q.head > cap + 0.005) say(v.id, 'an island port through its barricade top', `${isl.name} port ${i + 1}: head ${q.head} m, the top less capM is ${cap.toFixed(3)}`);
              if (q.head < q.sill + P.hM / 2) say(v.id, 'an island port cut away', `${isl.name} port ${i + 1}: ${(q.head - q.sill).toFixed(2)} m deep against the record's ${P.hM}`);
              if (i && xAtP(q.u) - xAtP(rd[i - 1].u) < P.wM) say(v.id, 'island ports overlapping', `${isl.name} ports ${i} and ${i + 1}`);
              const x = xAtP(q.u);
              for (const b of storeys) if (x + P.wM / 2 > b.min.x && x - P.wM / 2 < b.max.x && q.head > b.min.y && q.sill < b.max.y)
                say(v.id, 'an island port behind a quarter gallery', `${isl.name} port ${i + 1} at x ${x.toFixed(2)}, a storey over x ${b.min.x.toFixed(2)}-${b.max.x.toFixed(2)}`);
              const mine = guns.filter(gp => Math.abs(gp.x - x) < P.wM / 2);
              if (mine.length !== 2) say(v.id, 'an island port without its two guns', `${isl.name} port ${i + 1} at x ${x.toFixed(2)}: ${mine.length} barrel(s)`);
              const half = Math.abs(SHIPS_HULL.surfacePoint(H, HSp, q.u, 1.0)[2]);
              for (const gp of mine) if (gp.y < q.sill || gp.y > q.head || Math.abs(gp.z) < half)
                say(v.id, 'an island gun out of its port', `${isl.name} port ${i + 1}: barrel at y ${gp.y.toFixed(2)}, z ${gp.z.toFixed(2)}; port ${q.sill}-${q.head}, face ${half.toFixed(2)}`);
            });
          }
          if (guns.length !== 2 * want) say(v.id, 'island guns off the port count', `${guns.length} barrels for ${want} ports a side`);
          if (want && !qpn.some(n => n === want)) say(v.id, 'island ports not painted', `the build reports ${want} ports, the barricade's material uploads ${JSON.stringify(qpn)}`);
          if (!want && qpn.length) say(v.id, 'island ports painted without a record', `uQPN ${JSON.stringify(qpn)}`);
        }
""", 1)
open(p, 'w').write(s); print('ok')
