# r307: A-WASH-PORT into Research/audit-hulls.js (inside the A-WELL-BULWARK block, which has H2, uAtX, P5)
P = '/Users/augustgweon/Ships/Research/audit-hulls.js'
s = open(P).read()
anchor = """          if (over) say(v.id, "a well's capping standing over its bulwark top", `${w.name}: ${over} rail vertices up to ${overBy.toFixed(2)} m over the line`);
        }
      }
"""
assert s.count(anchor) == 1
RULE = """          if (over) say(v.id, "a well's capping standing over its bulwark top", `${w.name}: ${over} rail vertices up to ${overBy.toFixed(2)} m over the line`);
        }
        /* ── A-WASH-PORT (round 307, 0y¹³⁰, Titanic): A WELL READ OFF A PLATE ANSWERS FOR ITS WASH
           PORTS, AND A RECORDED PORT IS A HOLE IN THE BUILT BULWARK. The 1911 plan draws two
           rectangles under each well's bulwark line; they are wash ports (Bob Read), open with two
           bars forward, closed by doors aft. The model built both bulwarks as solid sheets, and its
           0.72 m class capping covered the top of every port. (1) RECORD: a well with a topRead
           carries a ports array (an empty one is an answer, silence is convicted); each port sits
           inside its well, its topM and bottomM are its read rows within 0.05 m, its doors are
           'closed' or 'removed', a removed port has bars as fractions of the opening, and
           islands.portsProvenance exists. (2) THE HOLE: a horizontal ray from outboard at the port's
           middle and the opening's mid-height passes the 'wellBulwark' sheets on both sides, and the
           same ray in the plating between two ports does not. (3) THE FITTINGS: a 'washPort' group
           named '<well> wash ports'; a closed port has a door on each side that the ray hits within
           0.06 m outboard of the shell, and a removed port has its bars, each inside the opening.
           (4) THE CAPPING: no 'rail' vertex over the port's span stands under the opening's top. */
        if (WL) {
          const capH = H.capM ? H.capM : H.beam * 0.016 * 1.6;
          const rcW = new THREE.Raycaster();
          const meshesOf = (key, name) => { const out = []; g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (pt && pt.key === key && (!name || pt.name === name)) out.push(o); }); return out; };
          g.updateMatrixWorld(true);
          const shoot = (meshes, u, y, sgn) => {
            const x = loftDeckX(H, u), half = Math.abs(SHIPS_HULL.surfacePoint(H, H2, u, 1)[2]);
            rcW.set(new THREE.Vector3(x, y, sgn * (half + 3)), new THREE.Vector3(0, 0, -sgn));
            const hit = rcW.intersectObjects(meshes, false)[0];
            return hit ? { off: sgn * hit.point.z - half, o: hit.object } : null;
          };
          for (const w of WL) {
            if (!w || !Array.isArray(w.u)) continue;
            if (w.topRead && !Array.isArray(w.ports)) { say(v.id, "a plate-read well with its wash ports unanswered", `${w.name}: topRead is recorded and ports is absent; the plate draws or does not draw ports, and the record must say which`); continue; }
            const PL = w.ports || [];
            if (PL.length && !(H.islands.portsProvenance && H.islands.portsProvenance.length > 20)) say(v.id, 'wash ports with no provenance', 'hull.islands.portsProvenance absent');
            const sheets = meshesOf('wellBulwark', w.name + ' bulwark'), fits = meshesOf('washPort', w.name + ' wash ports');
            if (PL.length && !fits.length) say(v.id, 'wash ports recorded and no fittings built', `${w.name}: no washPort group named '${w.name} wash ports'`);
            PL.forEach((p, pi) => {
              const ok = p && Array.isArray(p.u) && p.u.length === 2 && p.u[0] >= w.u[0] && p.u[1] <= w.u[1] && p.u[1] > p.u[0] && p.topM > p.bottomM && (p.doors === 'closed' || p.doors === 'removed');
              if (!ok) { say(v.id, 'a wash port declared out of shape', `${w.name} port ${pi}: ${JSON.stringify(p).slice(0, 140)}`); return; }
              const R = p.read;
              if (!(R && R.pxPerM > 0 && typeof R.lineUnderRow === 'number' && typeof R.bottomRow === 'number' && typeof R.datumRow === 'number')) say(v.id, 'a wash port with no read', `${w.name} port ${pi}`);
              else {
                const tW = R.datumM + (R.datumRow - R.lineUnderRow) / R.pxPerM, bW = R.datumM + (R.datumRow - R.bottomRow) / R.pxPerM;
                if (Math.abs(tW - p.topM) > 0.05 || Math.abs(bW - p.bottomM) > 0.05) say(v.id, 'a wash port off its plate read', `${w.name} port ${pi}: top ${p.topM}/${tW.toFixed(2)}, bottom ${p.bottomM}/${bW.toFixed(2)} m`);
              }
              if (p.doors === 'removed' && !(Array.isArray(p.bars) && p.bars.length && p.bars.every(f => f > 0 && f < 1))) say(v.id, 'an open wash port with no bars recorded', `${w.name} port ${pi}`);
              const um = (p.u[0] + p.u[1]) / 2;
              const lo = Math.max(p.bottomM, H2.sheer(um) - 0.02), hi = Math.min(p.topM, H2.wellTop(um) - capH), ym = (lo + hi) / 2;
              if (!(hi - lo >= 0.4)) say(v.id, 'a wash port with no room under the capping', `${w.name} port ${pi}: the opening runs ${lo.toFixed(2)}..${hi.toFixed(2)} m`);
              for (const sgn of [1, -1]) {
                const sh = shoot(sheets, um, ym, sgn);
                if (sh && Math.abs(sh.off) < 0.5) say(v.id, 'a wash port not cut through the bulwark', `${w.name} port ${pi}, ${sgn > 0 ? '+z' : '-z'} side: the plating stands across it at the opening's mid-height ${ym.toFixed(2)} m`);
                if (p.doors === 'closed') {
                  const d = shoot(fits.filter(o => o.userData.washPort && o.userData.washPort.side === sgn && !o.userData.washPort.what), um, ym, sgn);
                  if (!d || d.off < -0.01 || d.off > 0.06) say(v.id, 'a closed wash port with no door over it', `${w.name} port ${pi}, ${sgn > 0 ? '+z' : '-z'} side: ${d ? 'door ' + d.off.toFixed(3) + ' m off the shell' : 'the ray meets no door'}`);
                } else {
                  const bars = fits.filter(o => o.userData.washPort && o.userData.washPort.side === sgn && o.userData.washPort.what === 'bar'
                    && Math.abs(o.userData.washPort.u[0] - p.u[0]) < 1e-6);
                  if (bars.length !== p.bars.length) say(v.id, "an open wash port's bars not built", `${w.name} port ${pi}, ${sgn > 0 ? '+z' : '-z'} side: ${bars.length} bars, the record ${p.bars.length}`);
                  for (const b of bars) { const by = b.getWorldPosition(new THREE.Vector3()).y; if (by < lo - 0.02 || by > hi + 0.02) say(v.id, "a wash port's bar outside its opening", `${w.name} port ${pi}: a bar at ${by.toFixed(2)} m, the opening ${lo.toFixed(2)}..${hi.toFixed(2)}`); }
                }
              }
              let capLow = Infinity;
              g.traverse(o => { if (!o.isMesh) return; const pt = tagOf(o); if (!pt || pt.key !== 'rail') return; const pa = o.geometry.attributes.position;
                const xa = loftDeckX(H, p.u[0]), xb = loftDeckX(H, p.u[1]);
                for (let i = 0; i < pa.count; i++) { P5.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); if (P5.x > xa + 0.3 && P5.x < xb - 0.3) capLow = Math.min(capLow, P5.y); } });
              if (capLow < hi - 0.02) say(v.id, 'a capping hanging over a wash port', `${w.name} port ${pi}: the rail comes down to ${capLow.toFixed(2)} m, the opening's top ${hi.toFixed(2)} m`);
            });
            /* the plating between two ports, and outside them, is still there */
            const gaps = [];
            const PS = PL.filter(p => p && Array.isArray(p.u)).map(p => p.u).sort((a, b) => a[0] - b[0]);
            for (let i = 0; i + 1 < PS.length; i++) gaps.push((PS[i][1] + PS[i + 1][0]) / 2);
            if (PS.length) gaps.push((w.u[0] + PS[0][0]) / 2);
            for (const ug of gaps) for (const sgn of [1, -1]) {
              const ym = (H2.sheer(ug) + H2.wellTop(ug)) / 2, sh = shoot(sheets, ug, ym, sgn);
              if (!sh || Math.abs(sh.off) > 0.06) say(v.id, "a well's plating missing between its ports", `${w.name} at u ${ug.toFixed(4)}, ${sgn > 0 ? '+z' : '-z'}: ${sh ? sh.off.toFixed(2) + ' m off the shell' : 'the ray meets nothing'}`);
            }
          }
        }
      }
"""
s = s.replace(anchor, RULE)
open(P, 'w').write(s)
print('audit rule in')
