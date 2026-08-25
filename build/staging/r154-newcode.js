/* ── r154 replacement for buildNetDefence + emit helpers — applied after the
 * before-captures; transcribed from build/staging-r154-netdefence.mjs (30/30). ── */

/* one fair ledge from stations [{x, s, zo}] — inner edge buried in the plating, outer
 * edge already clamped to the old chain's own extreme; verts unshared so every arris
 * is sharp (r146/r147). sgn −1 mirrors z and re-winds so both sides face outward. */
function netShelfVerts(sta, yMid, sgn) {
  const yT = yMid + 0.045, yB = yMid - 0.045;
  const v = [];
  const tri = (a, b, c) => {
    if (sgn < 0) v.push(a[0], a[1], -a[2], c[0], c[1], -c[2], b[0], b[1], -b[2]);
    else v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const zi = st => st.s - 0.055;
  for (let i = 0; i + 1 < sta.length; i++) {
    const a = sta[i], b = sta[i + 1];
    quad([a.x, yT, zi(a)], [a.x, yT, a.zo], [b.x, yT, b.zo], [b.x, yT, zi(b)]);
    quad([a.x, yB, a.zo], [a.x, yB, zi(a)], [b.x, yB, zi(b)], [b.x, yB, b.zo]);
    quad([a.x, yT, a.zo], [a.x, yB, a.zo], [b.x, yB, b.zo], [b.x, yT, b.zo]);
    quad([a.x, yB, zi(a)], [a.x, yT, zi(a)], [b.x, yT, zi(b)], [b.x, yB, zi(b)]);
  }
  const f = sta[0], l = sta[sta.length - 1];
  quad([f.x, yT, f.zo], [f.x, yT, zi(f)], [f.x, yB, zi(f)], [f.x, yB, f.zo]);
  quad([l.x, yT, zi(l)], [l.x, yT, l.zo], [l.x, yB, l.zo], [l.x, yB, zi(l)]);
  return v;
}

/* one gusset bracket: a 4-point web profile in (z, y) — root on the plating at both
 * heights, a flat toe under the shelf's outer third — extruded 5 cm. The seat edge
 * sits at the plate's own mid-height so it lives INSIDE the shelf (r149's bury). */
function netBracketVerts(x, sT, sBot, zOutTop, yMid, sgn) {
  const P = [[sT - 0.03, yMid], [zOutTop, yMid],
             [zOutTop, yMid - 0.145], [sBot - 0.03, yMid - 0.50]];
  const v = [];
  const tri = (a, b, c) => {
    if (sgn < 0) v.push(a[0], a[1], -a[2], c[0], c[1], -c[2], b[0], b[1], -b[2]);
    else v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const F = P.map(p => [x + 0.025, p[1], p[0]]);
  const A = P.map(p => [x - 0.025, p[1], p[0]]);
  quad(F[0], F[1], F[2], F[3]);
  quad(A[3], A[2], A[1], A[0]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(A[i], A[j], F[j], F[i]);
  }
  return v;
}

/* the gooseneck, once, in its own frame: origin on the shell, +z outboard, x fore-aft
 * and symmetric so the port PI-turn (r118) reads the same. Backing pad buried in the
 * plating, two cheek lugs tapering root-to-tip past 2:1, a vertical octagonal pin
 * proud of the lug tips. The 40 ft boom's heel (r 0.16) swings between the lugs. */
function netHingeVerts() {
  const v = [];
  const tri = (a, b, c) => v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const box = (x0, x1, y0, y1, z0, z1) => {
    quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
    quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  };
  box(-0.25, 0.25, -0.20, 0.20, -0.04, 0.045);
  const P = [[0.02, 0.20], [0.21, 0.15], [0.28, 0.095],
             [0.28, -0.095], [0.21, -0.15], [0.02, -0.20]];
  for (const xc of [-0.19, 0.19]) {
    const F = P.map(p => [xc + 0.025, p[1], p[0]]);
    const A = P.map(p => [xc - 0.025, p[1], p[0]]);
    for (let i = 1; i + 1 < 6; i++) { tri(F[0], F[i], F[i + 1]); tri(A[0], A[i + 1], A[i]); }
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      quad(A[i], A[j], F[j], F[i]);
    }
  }
  const N = 8, R = 0.048, ZC = 0.24, Y0 = -0.21, Y1 = 0.21;
  const ring = y => { const r = [];
    for (let k = 0; k < N; k++) { const th = 2 * Math.PI * k / N;
      r.push([R * Math.sin(th), y, ZC + R * Math.cos(th)]); } return r; };
  const rB = ring(Y0), rT = ring(Y1);
  for (let k = 0; k < N; k++) {
    const j = (k + 1) % N;
    quad(rB[k], rB[j], rT[j], rT[k]);
  }
  for (let i = 1; i + 1 < N; i++) { tri(rT[0], rT[i], rT[i + 1]); tri(rB[0], rB[i + 1], rB[i]); }
  return v;
}

function buildNetDefence(S, group) {
  const G = netDefenceGeom(S);
  if (!G) return;
  const H = hullSurface(S);
  const steel = new THREE.MeshStandardMaterial({ color: 0x363b41, roughness: 0.50, metalness: 0.60 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x4a5057, roughness: 0.62, metalness: 0.45 });
  const netMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.90, metalness: 0.15 });
  /* the hull side at station u and height h above the load waterline — the same surface the
     plating is lofted from, so nothing here can stand off the ship or sink into it */
  const sideAt = (u, h) => {
    const k = Math.max(0, Math.min(1, h / H.sheer(u)));
    return surfacePoint(S, H, u, 0.62 + 0.38 * k);
  };
  const sA = G.u0 - 0.03, sB = Math.min(0.97, G.u1 + 0.01);   // the shelf runs a little past the booms
  /* ── THE SHELF IS ONE LEDGE, NOT A CHAIN OF PLATES (r154). The old form was 18 loose
     plumb boxes per side riding the curve on 6% overlap; the real shelf is one fair
     plate following the plating, carried on gusset webs. The r152 camera-fit law: the
     Shipwright's fit reads the whole ship's bounding box, so the loft's outer extreme
     must equal EXACTLY what the old chain gave Box3 — centre + hx|sin| + hz|cos| per
     rotated plate — clamped onto the loft's widest station. */
  const NSEG = 18;
  let zMaxOld = -Infinity;
  for (let i = 0; i < NSEG; i++) {
    const ua = sA + (sB - sA) * i / NSEG, ub = sA + (sB - sA) * (i + 1) / NSEG;
    const a = sideAt(ua, G.shelfY), b = sideAt(ub, G.shelfY);
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const rot = Math.atan2(-dz, dx);
    const hx = Math.hypot(dx, dz) * 1.06 / 2, hz = 0.275;
    zMaxOld = Math.max(zMaxOld, (a[2] + b[2]) / 2 + 0.22 +
                       hx * Math.abs(Math.sin(rot)) + hz * Math.abs(Math.cos(rot)));
  }
  const NST = 40;
  const sta = [];
  for (let i = 0; i <= NST; i++) {
    const u = sA + (sB - sA) * i / NST;
    const p = sideAt(u, G.shelfY);
    sta.push({ u, x: p[0], s: p[2] });
  }
  let peak = 0;
  for (let i = 1; i <= NST; i++) if (sta[i].s > sta[peak].s) peak = i;
  const dOut = zMaxOld - (sta[peak].s + 0.495);
  for (const st of sta) st.zo = Math.min(st.s + 0.495 + dOut, zMaxOld);
  sta[peak].zo = zMaxOld;
  /* gusset stations: the midpoints of the heel pitch plus one beyond each end, so no
     web can land on a gooseneck */
  const brU = [];
  {
    const half = (G.heels[1] - G.heels[0]) / 2;
    brU.push(Math.max(sA + 0.005, G.heels[0] - half));
    for (let i = 0; i + 1 < G.heels.length; i++) brU.push((G.heels[i] + G.heels[i + 1]) / 2);
    brU.push(Math.min(sB - 0.005, G.heels[G.heels.length - 1] + half));
  }
  const shelfVerts = [];
  for (const sgn of [1, -1]) {
    for (const f of netShelfVerts(sta, G.shelfY, sgn)) shelfVerts.push(f);
    for (const u of brU) {
      const pT = sideAt(u, G.shelfY), pB = sideAt(u, G.shelfY - 0.5);
      const zo = Math.min(pT[2] + 0.495 + dOut, zMaxOld);
      for (const f of netBracketVerts(pT[0], pT[2], pB[2], zo - 0.10, G.shelfY, sgn))
        shelfVerts.push(f);
    }
  }
  const shelfGeo = new THREE.BufferGeometry();
  shelfGeo.setAttribute('position', new THREE.Float32BufferAttribute(shelfVerts, 3));
  shelfGeo.computeVertexNormals();
  group.add(tag(new THREE.Mesh(shelfGeo, shelfMat), 'net', 'Net shelf'));
  /* the gooseneck, one geometry for all 24 heels (r144) */
  const hingeGeo = new THREE.BufferGeometry();
  hingeGeo.setAttribute('position', new THREE.Float32BufferAttribute(netHingeVerts(), 3));
  hingeGeo.computeVertexNormals();
  for (const sgn of [1, -1]) {
    /* the net itself, rolled into the long sausage that lies on the shelf */
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const u = sA + (sB - sA) * i / 40;
      const p = sideAt(u, G.shelfY);
      pts.push(new THREE.Vector3(p[0], G.shelfY + 0.23, sgn * (p[2] + 0.30)));
    }
    const roll = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.18, 8, false), netMat);
    group.add(tag(roll, 'net', 'Torpedo net, rolled'));
    /* the booms, heels pinned just under the shelf, tips trailing down-aft along the
       plating — +x is aft, so the stowed row leans the way the photograph has it */
    for (const uh of G.heels) {
      const hy = G.shelfY - 0.25;
      const a = sideAt(uh, hy), b = sideAt(uh + G.du, hy - G.drop);
      const A = new THREE.Vector3(a[0], hy, sgn * (a[2] + 0.22));
      const B = new THREE.Vector3(b[0], hy - G.drop, sgn * (b[2] + 0.22));
      const dir = B.clone().sub(A);
      const boom = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, dir.length(), 10), steel);
      boom.position.copy(A).add(B).multiplyScalar(0.5);
      boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      group.add(tag(boom, 'net', 'Net boom'));
      /* the heel swings in its gooseneck: pad on the plating, lugs either side of the
         spar, pin proud above and below — rotated to the local tangent so the pad lies
         along the shell, the port turn the r118 mirror */
      const e = 0.01;
      const t0 = sideAt(uh - e, hy), t1 = sideAt(uh + e, hy);
      const th = Math.atan2(-(t1[2] - t0[2]), t1[0] - t0[0]);
      const hinge = new THREE.Mesh(hingeGeo, steel);
      hinge.position.set(a[0], hy, sgn * a[2]);
      hinge.rotation.y = sgn > 0 ? th : Math.PI - th;
      group.add(tag(hinge, 'net', 'Boom hinge'));
    }
  }
}
