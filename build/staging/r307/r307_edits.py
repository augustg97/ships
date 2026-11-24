# r307: the wells' wash ports (0y130) — builder, part, card phrase. Every replace asserted.
import sys
ROOT = '/Users/augustgweon/Ships/'
def rep(path, old, new):
    s = open(ROOT + path).read(); assert s.count(old) == 1, (path, old[:60], s.count(old))
    open(ROOT + path, 'w').write(s.replace(old, new))

OLD = """  for (const w of (S.islands.wells || [])) {
    const N = Math.max(4, Math.round((w.u[1] - w.u[0]) * L / 1.6));
    const g = new THREE.Group();
    for (const sgn of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= N; k++) {
        const u = w.u[0] + (w.u[1] - w.u[0]) * (sgn > 0 ? k : N - k) / N;
        const x = xAt(u), z = sgn * halfAt(u);
        pts.push(x, H.sheer(u) - 0.02, z, x, H.wellTop(u), z);
      }
      g.add(strip(pts, wallMat));
    }
    group.add(tag(g, 'wellBulwark', w.name + ' bulwark'));
  }
}"""
NEW = """  /* ── AND THE WASH PORTS CUT THROUGH IT (round 307, 0y¹³⁰). The plan draws two rectangles
     hanging under the bulwark line in each well; they are the wash ports (Bob Read, "Open Wash
     Ports of Titanic's Forward Well Deck"): openings to the deck that let a sea taken over the
     bow drain off. Olympic's had hinged doors in both wells. Titanic's forward ports had their
     doors removed while she fitted out and stand open with two safety bars across each; the
     after well kept its doors, hinged at the top on the outboard side. Each port is recorded
     on its well (w.ports: u-span, the read top and bottom, doors or bars). The opening runs
     from the deck, or the read bottom where that stands higher, to the read top or the
     capping's underside, whichever is lower, so the capping never hangs over an open hole.
     The plating is painted white inboard (Read: the white of the well shows through the open
     ports), so the wall is two single-sided sheets on the same vertices, black wound outboard
     and the inboard colour wound in: one face per pixel, so no two surfaces can fight. A port's
     edges are stations a millimetre apart (snapBand), so the hole lands at its read length. */
  const capHW = S.capM ? S.capM : B * 0.016 * 1.6;
  const sideMat = (hex, side) => { const m = steel(hex); m.side = side; return m; };
  for (const w of (S.islands.wells || [])) {
    const N = Math.max(4, Math.round((w.u[1] - w.u[0]) * L / 1.6));
    const g = new THREE.Group();
    const ports = Array.isArray(w.ports) ? w.ports : [];
    const inCol = w.inboardCol || null;
    const outMat = inCol ? sideMat(S.topside || '#3a3a3c', THREE.FrontSide) : wallMat;
    const inMat = inCol ? sideMat(inCol, THREE.FrontSide) : null;
    const us = [];
    for (let k = 0; k <= N; k++) us.push(w.u[0] + (w.u[1] - w.u[0]) * k / N);
    const eps = 0.0005 / L;
    for (const p of ports) for (const e of p.u) us.push(e - eps, e + eps);
    us.sort((a, b) => a - b);
    const U = us.filter((u, i) => i === 0 || u - us[i - 1] > eps * 0.5);
    const portAt = u => ports.find(p => u > p.u[0] && u < p.u[1]) || null;
    const holeOf = (p, u) => ({ lo: Math.max(p.bottomM, H.sheer(u) - 0.02), hi: Math.min(p.topM, H.wellTop(u) - capHW) });
    /* the outboard normal at u on side sgn, from the deck-level line's own slope */
    const nrm = (u, sgn) => {
      const d = 0.002, dx = xAt(u + d) - xAt(u - d), dz = halfAt(u + d) - halfAt(u - d), m = Math.hypot(dx, dz) || 1;
      return [-dz / m, sgn * dx / m];
    };
    for (const sgn of [1, -1]) {
      for (const inward of inCol ? [false, true] : [false]) {
        const pos = [], nor = [];
        const quad = (ua, ub, ya0, ya1, yb0, yb1) => {
          const A = [xAt(ua), sgn * halfAt(ua)], Bp = [xAt(ub), sgn * halfAt(ub)];
          const na = nrm(ua, sgn), nb = nrm(ub, sgn), f = inward ? -1 : 1;
          const v = [[A[0], ya0, A[1], na], [Bp[0], yb0, Bp[1], nb], [A[0], ya1, A[1], na], [Bp[0], yb1, Bp[1], nb]];
          /* wound to face outboard on +z walking aft, flipped for -z and for the inboard sheet */
          const tri = (sgn > 0) !== inward ? [0, 2, 1, 2, 3, 1] : [0, 1, 2, 2, 1, 3];
          for (const t of tri) { pos.push(v[t][0], v[t][1], v[t][2]); nor.push(f * v[t][3][0], 0, f * v[t][3][1]); }
        };
        for (let i = 0; i + 1 < U.length; i++) {
          const ua = U[i], ub = U[i + 1], p = portAt((ua + ub) / 2);
          const sa = H.sheer(ua) - 0.02, sb = H.sheer(ub) - 0.02, ta = H.wellTop(ua), tb = H.wellTop(ub);
          if (!p) { quad(ua, ub, sa, ta, sb, tb); continue; }
          const ha = holeOf(p, ua), hb = holeOf(p, ub);
          if (ha.lo > sa + 0.01 || hb.lo > sb + 0.01) quad(ua, ub, sa, ha.lo, sb, hb.lo);
          quad(ua, ub, ha.hi, ta, hb.hi, tb);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        g.add(new THREE.Mesh(geo, inward ? inMat : outMat));
      }
    }
    group.add(tag(g, 'wellBulwark', w.name + ' bulwark'));
    /* the doors and the bars, a part of their own */
    if (!ports.length) continue;
    const pg = new THREE.Group(), up = new THREE.Vector3(0, 1, 0);
    const barMat = sideMat(S.topside || '#3a3a3c', THREE.DoubleSide);
    for (const p of ports) {
      for (const sgn of [1, -1]) {
        const NP = 6, uc = (p.u[0] + p.u[1]) / 2;
        if (p.doors === 'closed') {
          /* a plate over the hole, 35 mm proud of the shell, hinged at its head: black out, white in */
          for (const inward of inCol ? [false, true] : [false]) {
            const pos = [], nor = [], f = inward ? -1 : 1;
            for (let k = 0; k < NP; k++) {
              const ua = p.u[0] + (p.u[1] - p.u[0]) * k / NP, ub = p.u[0] + (p.u[1] - p.u[0]) * (k + 1) / NP;
              const at = (u, y) => { const n = nrm(u, sgn); return [xAt(u) + n[0] * 0.035, y, sgn * halfAt(u) + n[1] * 0.035, n]; };
              const ha = holeOf(p, ua), hb = holeOf(p, ub);
              const v = [at(ua, ha.lo - 0.03), at(ub, hb.lo - 0.03), at(ua, ha.hi + 0.03), at(ub, hb.hi + 0.03)];
              const tri = (sgn > 0) !== inward ? [0, 2, 1, 2, 3, 1] : [0, 1, 2, 2, 1, 3];
              for (const t of tri) { pos.push(v[t][0], v[t][1], v[t][2]); nor.push(f * v[t][3][0], 0, f * v[t][3][1]); }
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
            const door = new THREE.Mesh(geo, inward ? inMat : (inCol ? outMat : wallMat));
            door.userData.washPort = { well: w.name, u: p.u, doors: 'closed', side: sgn };
            pg.add(door);
          }
        }
        /* the hinge rod along a door's head, or the two safety bars across an open port */
        const hc = holeOf(p, uc);
        const rows = p.doors === 'closed' ? [{ y: u => holeOf(p, u).hi + 0.03, off: 0.06, r: 0.03 }]
          : (p.bars || []).map(fr => ({ y: u => { const h = holeOf(p, u); return h.lo + (h.hi - h.lo) * fr; }, off: -0.03, r: 0.022 }));
        for (const rw of rows) {
          const pa = (() => { const n = nrm(p.u[0], sgn); return new THREE.Vector3(xAt(p.u[0]) + n[0] * rw.off, rw.y(p.u[0]), sgn * halfAt(p.u[0]) + n[1] * rw.off); })();
          const pb = (() => { const n = nrm(p.u[1], sgn); return new THREE.Vector3(xAt(p.u[1]) + n[0] * rw.off, rw.y(p.u[1]), sgn * halfAt(p.u[1]) + n[1] * rw.off); })();
          const len = pa.distanceTo(pb);
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(rw.r, rw.r, len, 8), barMat);
          bar.position.copy(pa).add(pb).multiplyScalar(0.5);
          bar.quaternion.setFromUnitVectors(up, pb.clone().sub(pa).normalize());
          bar.userData.washPort = { well: w.name, u: p.u, doors: p.doors || 'none', side: sgn, what: p.doors === 'closed' ? 'hinge' : 'bar' };
          pg.add(bar);
        }
        void hc;
      }
    }
    group.add(tag(pg, 'washPort', w.name + ' wash ports'));
  }
}"""
rep('web/js/hull.js', OLD, NEW)
rep('web/js/hull.js', """  islandRail: { stage: 3, name: 'Raised-deck rail',""",
"""  washPort: { stage: 3, name: 'Wash ports',
    what: 'Openings cut through a well-deck bulwark at the deck, so a sea that breaks over the bow '
        + 'drains off the well and over the side. Doors hinged at their heads close them from '
        + 'outboard; where the doors were taken off, bars across the opening stop a person going through.' },
  islandRail: { stage: 3, name: 'Raised-deck rail',""")
rep('web/js/shipwright.js', "paddlebox: 'paddle boxes', wellBulwark: 'bulwarks along the well decks',",
    "paddlebox: 'paddle boxes', wellBulwark: 'bulwarks along the well decks', washPort: 'wash ports',")
print('edits ok')
