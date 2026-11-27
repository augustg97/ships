import sys
p = 'Research/audit-hulls.js'; s = open(p).read()
old = """        if (cIn - breech > 0.25 || cIn < breech - 0.005) note('a breech off its carriage', `${tag}: carriage's inboard end ${cIn.toFixed(2)}, the breech ${breech.toFixed(2)}`);
      }"""
assert s.count(old) == 1
new = r"""        /* r362: a turned barrel's carriage runs back to the button (Muller: "by setting off from D to B, the length of the
           cascable"), so its inboard end stands the cascabel's length inboard of the base ring */
        const casc = GP ? gBase - Math.min(...GP.map(q => q.y)) : 0;
        if (GP) { if (Math.abs(cIn - (breech - casc)) > 0.01) note('a carriage not run back to the button', `${tag}: carriage's inboard end ${cIn.toFixed(3)}, the button ${(breech - casc).toFixed(3)}`); }
        else if (cIn - breech > 0.25 || cIn < breech - 0.005) note('a breech off its carriage', `${tag}: carriage's inboard end ${cIn.toFixed(2)}, the breech ${breech.toFixed(2)}`);
        /* ── A-CARRIAGE-MULLER (round 362): THE CARRIAGE IS LAID OFF ITS GUN. Muller (1768, pl. V figs. 16-18): the width
           within is the second reinforce ring's diameter at the trunnions and the base ring's at the breech; the side
           pieces are a calibre broad, 4.5 shot high before and half that behind. Until r362 the cheeks stood parallel at
           the trunnions' radius, 0.94 calibre broad, at whatever height the port left. READ from the BUILT carriage's
           vertices in hull space, against the BARREL's own profile (the calibre off its bore, the shot 20/21 of it, the
           rings off the lathe points), so the record the builder writes is not what is tested. The inner and outer faces
           are fitted as lines in t (metres outboard of the base ring) through the side pieces' upper vertices (within
           0.12 m under the axis, where nothing else of the carriage stands but the trunnions, which lie further out).
           (a) the inner half-width at the trunnions (t = 3/7 len) within 6 mm of the ring's radius, and at the breech
           (t = 0) of the base ring's; (b) the side piece's breadth a calibre within 5 mm; (c) the height before, from
           the fore face's lowest cheek vertex to the top, 4.5 shot within 5 mm, unless the carriage records a contested
           stretch, which must then equal what is drawn; (d) the height behind, half the height before within 5 mm. */
        if (GP) {
          const cm = mine[0][0], ca = cm.geometry.attributes.position, Mc = new THREE.Matrix4().multiplyMatrices(invG, cm.matrixWorld), pv = new THREE.Vector3();
          const bore = 2 * GP[GP.length - 2].x, shot = bore * 20 / 21, tTr = len * 3 / 7;
          const R2m = Math.max(...GP.filter(q => q.y >= gBase + tTr + 0.7 * bore && q.y <= gBase + tTr + 1.05 * bore).map(q => q.x));
          const V = [];
          for (let j = 0; j < ca.count; j++) { pv.fromBufferAttribute(ca, j).applyMatrix4(Mc); V.push([Math.abs(pv.x - xC), pv.y, Math.abs(pv.z) - breech]); }
          const band = V.filter(w => w[1] > yC - 0.12 && w[1] < yC + 0.01 && w[0] > 0.02);
          const dmin = Math.min(...band.map(w => w[0]));
          const fit = pts => { const n = pts.length, mt = pts.reduce((a, w) => a + w[2], 0) / n, md = pts.reduce((a, w) => a + w[0], 0) / n;
            let sxy = 0, sxx = 0; for (const w of pts) { sxy += (w[2] - mt) * (w[0] - md); sxx += (w[2] - mt) ** 2; }
            const b1 = sxx > 1e-9 ? sxy / sxx : 0; return t => md + b1 * (t - mt); };
          const inner = band.filter(w => w[0] < dmin + 0.5 * bore), outer = band.filter(w => w[0] > dmin + 0.5 * bore && w[0] < dmin + 1.5 * bore);
          const tagC = `${tag} carriage`;
          if (inner.length < 2 || outer.length < 2) note('a carriage whose side pieces cannot be read', `${tagC}: ${inner.length} inner, ${outer.length} outer vertices`);
          else {
            const fi = fit(inner), fo = fit(outer);
            if (Math.abs(fi(tTr) - R2m) > 0.006 || Math.abs(fi(0) - gRmax) > 0.006)
              note('a carriage not as wide as its gun\'s rings', `${tagC}: within ${(2 * fi(tTr)).toFixed(3)} at the trunnions (ring ${(2 * R2m).toFixed(3)}), ${(2 * fi(0)).toFixed(3)} at the breech (base ring ${(2 * gRmax).toFixed(3)})`);
            if (Math.abs(fo(tTr) - fi(tTr) - bore) > 0.005) note('side pieces not a calibre broad', `${tagC}: ${(fo(tTr) - fi(tTr)).toFixed(3)} against a calibre of ${bore.toFixed(3)}`);
            const inCheek = w => w[0] >= fi(w[2]) - 0.003 && w[0] <= fo(w[2]) + 0.003;
            const tF = Math.max(...V.filter(inCheek).map(w => w[2])), tR = Math.min(...V.filter(inCheek).map(w => w[2]));
            const top = Math.max(...V.filter(inCheek).map(w => w[1]));
            const foreLow = Math.min(...V.filter(w => inCheek(w) && w[2] > tF - 0.003).map(w => w[1]));
            const rear = V.filter(w => inCheek(w) && w[2] < tR + 0.003), hRear = Math.max(...rear.map(w => w[1])) - Math.min(...rear.map(w => w[1]));
            const hFore = top - foreLow, rec = cm.userData.carriage && cm.userData.carriage.muller;
            if (Math.abs(hFore - 4.5 * shot) > 0.005 && !(rec && rec.contested && Math.abs(rec.hFore - hFore) < 0.005))
              note('side pieces not 4.5 shot high before', `${tagC}: ${hFore.toFixed(3)} against ${(4.5 * shot).toFixed(3)}${rec && rec.contested ? ' (the record\'s contested height ' + rec.hFore + ' is not what is drawn)' : ''}`);
            if (Math.abs(hRear - hFore / 2) > 0.005) note('side pieces not half as high behind', `${tagC}: ${hRear.toFixed(3)} behind, ${hFore.toFixed(3)} before`);
            if (rec && rec.contested) note('a carriage stretched to its port (contested, a read)', `${tagC}: ${rec.contested}`);
          }
        }
      }"""
s = s.replace(old, new)
# a contested stretch is a READ, not a fault: say() it apart from the problems
old2 = "      for (const [k, { n, ex }] of Object.entries(bad)) say(v.id, k, `${n} case(s), e.g. ${ex}`);\n    }\n    /* ── A-GUN-FORM (round 361)"
assert s.count(old2) == 1
s = s.replace(old2, "      for (const [k, { n, ex }] of Object.entries(bad)) if (!/\\(contested, a read\\)/.test(k)) say(v.id, k, `${n} case(s), e.g. ${ex}`);\n      for (const [k, { n, ex }] of Object.entries(bad)) if (/\\(contested, a read\\)/.test(k)) console.warn(`READ ${v.id}: ${k}, ${n} case(s), e.g. ${ex}`);\n    }\n    /* ── A-GUN-FORM (round 361)")
open(p, 'w').write(s); print('ok')
