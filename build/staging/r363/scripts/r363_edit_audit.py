#!/usr/bin/env python3
"""r363: A-CARRIAGE-MULLER (c) loses the ceiling's excuse; A-GUN-LAID. Usage: r363_edit_audit.py <audit-hulls.js>"""
import sys
p = sys.argv[1]; s = open(p).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:120])
    s = s.replace(old, new)

rep("""            /* a stretch is excused only as Muller's ceiling or the floor makes it: the fore truck, read off the carriage's
               fore face (its front vertex stands at the truck's centre height), at 2 shot with the side pieces carried UP
               past 4.5 shot, or at 1 shot with them cut DOWN; and the record must say so and match what is drawn */""",
"""            /* a stretch is excused only as the floor makes it: the fore truck, read off the carriage's fore face (its
               front vertex stands at the truck's centre height), at 1 shot with the side pieces cut DOWN, and the record
               must say so and match what is drawn. r363: Muller's 4-shot truck is not a ceiling ("if the port-holes in
               ships are made higher or lower, these diameters must be increased or diminished"), so a carriage whose side
               pieces are carried UP past 4.5 shot is convicted, recorded or not. */""")
rep("""            const excused = rec && rec.contested && Math.abs(rec.hFore - hFore) < 0.005 &&
              ((Math.abs(RFm - 2 * shot) < 0.004 && hFore > 4.5 * shot) || (Math.abs(RFm - shot) < 0.004 && hFore < 4.5 * shot));""",
"""            const excused = rec && rec.contested && Math.abs(rec.hFore - hFore) < 0.005 &&
              Math.abs(RFm - shot) < 0.004 && hFore < 4.5 * shot;""")
rep("""            if (rec && rec.contested) note('a carriage stretched to its port (contested, a read)', `${tagC}: ${rec.contested}`);
          }""",
"""            if (rec && rec.contested) note('a carriage stretched to its port (contested, a read)', `${tagC}: ${rec.contested}`);
            /* ── A-GUN-LAID (round 363): A GUN IS LAID FROM ITS PORT. Until r363 every gun's axis stood at its port's
               centre, and r362's quarterdeck carriages had to be 0.21 m taller than Muller's side pieces to reach it.
               Muller lays a lower tier's gun so that, "when the breech of a gun lies upon the hind axle-tree, the muzzle
               of the gun should touch above the port-hole"; he gives no rule for a quarterdeck, whose gun stands on his
               general construction (side pieces 4.5 shot, fore trucks 4 shot across). TEST, from the BUILT scene:
               (a) at the face, the barrel's vertices stand between the port's sill and head. A tier's port is read off
               the hull material's uTierPortLo/Hi (the v the shader cuts the port at) through the surface at the gun's
               station; an island's off the island's islandPorts. (b) A tier gun over its deck: the hind axletree's top
               is the side pieces' underside at the rear (read off the carriage) plus 0.625 shot (Muller's 30-part
               axletree, sunk half its height). Turn the barrel's own lathe points about the trunnions until the lowest
               over the axletree's 12 in touches that top; the highest point forward of the trunnions must then stand
               within 10 mm of the port's head. (c) An island gun: the trunnions 6.5 shot less a quarter inch over its
               deck within 5 mm, unless the barrel has been raised to clear the sill, when its underside at the face
               stands within 3 mm of the sill. */
            const ud = o.userData.tierGun || o.userData.islandGun || {};
            let port = null;
            if (isl) { const ip = []; g.traverse(n => { if (n.userData.islandPorts) ip.push(...n.userData.islandPorts); });
              const pq = ip.filter(w => Math.abs(w.u - gi.u) < 0.01)[0]; if (pq) port = { sill: pq.sill, head: pq.head }; }
            else { let hm = null; g.traverse(n => { if (!hm && n.material && n.material.uniforms && n.material.uniforms.uTierPortHi) hm = n.material; });
              const d = ud.deck;
              if (hm && d !== undefined) { const lo = hm.uniforms.uTierPortLo.value.getComponent(d), hi = hm.uniforms.uTierPortHi.value.getComponent(d);
                port = { sill: SHIPS_HULL.surfacePoint(H, HSg, gi.u, lo)[1], head: SHIPS_HULL.surfacePoint(H, HSg, gi.u, hi)[1] }; } }
            if (!port) note('a gun whose port cannot be read', tag);
            else {
              /* the barrel lies level, so its section at the face is its lathe radius there about the axis */
              const yF = gBase + (face - breech); let rF = 0;
              for (let k = 0; k + 1 < GP.length; k++) { const A = GP[k], B = GP[k + 1];
                if (B.y > A.y && yF >= A.y && yF <= B.y) rF = Math.max(rF, A.x + (B.x - A.x) * (yF - A.y) / (B.y - A.y)); }
              const fLo = yC - rF, fHi = yC + rF;
              if (!(rF > 0) || fLo < port.sill - 0.003 || fHi > port.head + 0.003)
                note('a gun not inside its port', `${tag}: barrel ${fLo.toFixed(3)}-${fHi.toFixed(3)} at the face, the port ${port.sill.toFixed(3)}-${port.head.toFixed(3)}`);
              if (!isl) {
                const yUnder = Math.min(...rear.map(w => w[1])), axTop = yUnder + 0.625 * shot;
                const yT = gBase + tTr, aft = GP.filter(q => q.y >= gBase - 0.1524 && q.y <= gBase + 0.1524), fwd = GP.filter(q => q.y > yT);
                const dep = th => Math.max(...aft.map(q => (yT - q.y) * Math.sin(th) + q.x * Math.cos(th)));
                let a0 = 0, b0 = 0.8; for (let k = 0; k < 40; k++) { const m = (a0 + b0) / 2; if (dep(m) < yC - axTop) a0 = m; else b0 = m; }
                const th = (a0 + b0) / 2, rise = Math.max(...fwd.map(q => (q.y - yT) * Math.sin(th) + q.x * Math.cos(th)));
                if (Math.abs(yC + rise - port.head) > 0.010)
                  note('a gun not laid from its port\\'s head (Muller, housed)', `${tag}: housed at ${(th * 180 / Math.PI).toFixed(1)} deg its muzzle stands ${(yC + rise).toFixed(3)}, the port's head ${port.head.toFixed(3)}`);
              } else {
                const want = deck + 6.5 * shot - 0.00635;
                if (Math.abs(yC - want) > 0.005 && !(yC > want && Math.abs(fLo - port.sill) < 0.003))
                  note('an island gun not on Muller\\'s construction', `${tag}: trunnions ${(yC - deck).toFixed(3)} over the deck, the construction ${(want - deck).toFixed(3)}, the barrel ${(fLo - port.sill).toFixed(3)} over the sill at the face`);
              }
            }
          }""")
rep("""${rec && rec.contested ? ' (the record\\'s contested height ' + rec.hFore + ' is not what is drawn)' : ''}`);""",
"""${rec && rec.contested ? ' (the record calls it contested: ' + rec.contested + ')' : ''}`);""")
open(p, 'w').write(s); print('audit edited')
