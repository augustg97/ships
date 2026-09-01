# r189 — stage the part-proportion pass: fig. 3a's measured claw sweep, eye and crown
# replace the woodcut defaults in the ironAnchors class. Writes staged copies only;
# landing is a separate mv after the opening frames capture.
import json
import pathlib
import sys

ROOT = pathlib.Path.home() / 'Ships'
OUT = ROOT / 'build/staging/r189'

# ── 1. hull.js ──────────────────────────────────────────────────────────────────
hp = ROOT / 'web/js/hull.js'
h = hp.read_text()

old_sig = """     `ironAnchors: {sheetAtU?, pairAtU?, pairOffZ?, sheetLenM?, bowerLenM?,
                    sternAtU?, sternOffZ?, sternLenM?, clawFrac?, yaw?}`"""
new_sig = """     `ironAnchors: {sheetAtU?, pairAtU?, pairOffZ?, sheetLenM?, bowerLenM?,
                    sternAtU?, sternOffZ?, sternLenM?, yaw?}`"""
assert h.count(old_sig) == 1
h = h.replace(old_sig, new_sig)

old_default = ("""cube-scales the recorded 500-catty (~295 kg) sheet to 1.86 m full length and the
     300-catty pair inference to 1.57 m; claw length stays a woodcut-proportion default —
     all named in the provenance.""")
new_default = ("""cube-scales the recorded 500-catty (~295 kg) sheet to 1.86 m full length and the
     300-catty pair inference to 1.57 m; part proportions are MEASURED from the same
     find's own drawing (r189, fig. 3a self-scaled) — all named in the provenance.""")
assert h.count(old_default) == 1
h = h.replace(old_default, new_default)

old_make = """    /* one anchor: origin at the crown, shank along +Y to the head ring; fullL is
       the crown-to-ring-top length — the ring top lands at it exactly */
    const makeAnchor = (fullL, clawL) => {
      const shD = fullL * 0.046;
      const shankL = fullL - shD * 2.78;
      const g2 = new THREE.Group();
      g2.name = 'ia-grp';
      const crown = new THREE.Mesh(new THREE.SphereGeometry(shD * 0.85, 10, 8), ironG);
      crown.name = 'ia-crown'; g2.add(crown);
      const sh = new THREE.Mesh(
        new THREE.CylinderGeometry(shD * 0.42, shD * 0.55, shankL, 10), ironG);
      sh.name = 'ia-shank'; sh.position.y = shankL / 2; g2.add(sh);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(shD * 1.4, shD * 0.28, 8, 18), ironG);
      ring.name = 'ia-ring'; ring.position.y = shankL + shD * 1.1; g2.add(ring);
      /* four claws at 90°, each curving outward then up — the forged sweep read as
         two straight sections and a point, the woodcut's own two-part join */
      const clawD = shD * 0.80;
      for (let k = 0; k < 4; k++) {
        const cg2 = new THREE.Group();
        cg2.rotation.y = k * Math.PI / 2;
        const a1 = 1.19, l1 = clawL * 0.58;          // 68°: mostly outward
        const s1 = new THREE.Mesh(
          new THREE.CylinderGeometry(clawD * 0.40, clawD * 0.52, l1, 8), ironG);
        s1.name = 'ia-claw'; s1.rotation.z = -a1;
        s1.position.set(Math.sin(a1) * l1 / 2, Math.cos(a1) * l1 / 2, 0);
        cg2.add(s1);
        const P1x = Math.sin(a1) * l1, P1y = Math.cos(a1) * l1;
        const a2 = 0.38, l2 = clawL * 0.32;          // 22°: turning up
        const s2 = new THREE.Mesh(
          new THREE.CylinderGeometry(clawD * 0.30, clawD * 0.42, l2, 8), ironG);
        s2.name = 'ia-claw'; s2.rotation.z = -a2;
        s2.position.set(P1x + Math.sin(a2) * l2 / 2, P1y + Math.cos(a2) * l2 / 2, 0);
        cg2.add(s2);
        const ch = clawL * 0.18;
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(clawD * 0.34, ch, 8), ironG);
        tip.name = 'ia-tip'; tip.rotation.z = -a2;
        tip.position.set(P1x + Math.sin(a2) * (l2 + ch / 2 - 0.01),
                         P1y + Math.cos(a2) * (l2 + ch / 2 - 0.01), 0);
        cg2.add(tip);
        g2.add(cg2);
      }
      return g2;
    };"""

new_make = """    /* one anchor: origin at the crown's centre, shank along +Y to the head eye.
       fullL is the find convention's 全長 — crown BOTTOM to ring top — and the parts
       are placed so that span equals the field exactly. Proportions are MEASURED from
       the calibrator's own drawing (Matsui 2013 fig. 3a, the Penglai find, r189 —
       fig3a self-scales at 全長 2.15 m, read at 322.8 px/m; fractions of 全長): the
       claw springs at the shank foot, runs near-flat to r 0.14, rises through an
       elbow to its point at (0.339, +0.201) — the in-plane pair's mean; arms taper
       0.024 → 0.009 across; the head is a small forged eye 0.062 wide. */
    const IA_P = {
      crownR: 0.0391,                    /* crown ball — bottom lands at −0.0391 */
      ringR: 0.0216, ringT: 0.0095,      /* the eye: centre radius, tube */
      claw: [[0.000, 0.035, 0.0120],     /* [r, y, section radius] along the arm */
             [0.140, 0.060, 0.0075],
             [0.260, 0.135, 0.0060],
             [0.315, 0.180, 0.0045]],
      tip: [0.339, 0.201]                /* the measured point the cone lands on */
    };
    const makeAnchor = (fullL) => {
      const shD = fullL * 0.046;
      const g2 = new THREE.Group();
      g2.name = 'ia-grp';
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(fullL * IA_P.crownR, 10, 8), ironG);
      crown.name = 'ia-crown'; g2.add(crown);
      const ringC = fullL * (1 - IA_P.crownR - IA_P.ringR - IA_P.ringT);
      const shankL = ringC - fullL * IA_P.ringR;
      const sh = new THREE.Mesh(
        new THREE.CylinderGeometry(shD * 0.42, shD * 0.55, shankL, 10), ironG);
      sh.name = 'ia-shank'; sh.position.y = shankL / 2; g2.add(sh);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(fullL * IA_P.ringR, fullL * IA_P.ringT, 8, 18), ironG);
      ring.name = 'ia-ring'; ring.position.y = ringC; g2.add(ring);
      /* four claws at 90°, each the measured polyline — cylinder sections between
         the plate's own stations, a cone to the measured point */
      for (let k = 0; k < 4; k++) {
        const cg2 = new THREE.Group();
        cg2.rotation.y = k * Math.PI / 2;
        const P = IA_P.claw.map(p => [p[0] * fullL, p[1] * fullL, p[2] * fullL]);
        for (let s = 0; s + 1 < P.length; s++) {
          const [x0, y0, r0] = P[s], [x1, y1, r1] = P[s + 1];
          const dl = Math.hypot(x1 - x0, y1 - y0);
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(r1, r0, dl, 8), ironG);
          seg.name = 'ia-claw';
          seg.rotation.z = -Math.atan2(x1 - x0, y1 - y0);
          seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
          cg2.add(seg);
        }
        const [xb, yb, rb] = P[P.length - 1];
        const xt = IA_P.tip[0] * fullL, yt = IA_P.tip[1] * fullL;
        const ch = Math.hypot(xt - xb, yt - yb);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(rb, ch, 8), ironG);
        tip.name = 'ia-tip';
        tip.rotation.z = -Math.atan2(xt - xb, yt - yb);
        tip.position.set((xb + xt) / 2, (yb + yt) / 2, 0);
        cg2.add(tip);
        g2.add(cg2);
      }
      return g2;
    };"""
assert h.count(old_make) == 1
h = h.replace(old_make, new_make)

old_ringpt = """      /* the ring's world point, for the cable */
      return new THREE.Vector3(0, fullL - fullL * 0.046 * 1.68, 0)
        .applyMatrix4(g2.matrixWorld);"""
new_ringpt = """      /* the ring's world point, for the cable */
      return new THREE.Vector3(
        0, fullL * (1 - IA_P.crownR - IA_P.ringR - IA_P.ringT), 0)
        .applyMatrix4(g2.matrixWorld);"""
assert h.count(old_ringpt) == 1
h = h.replace(old_ringpt, new_ringpt)

for old_call, new_call in [
    ("""      const fL = ia.sheetLenM || 1.86, clL = fL * (ia.clawFrac || 0.42);
      const g2 = makeAnchor(fL, clL);""",
     """      const fL = ia.sheetLenM || 1.86;
      const g2 = makeAnchor(fL);"""),
    ("""      const fL = ia.bowerLenM || 1.57, clL = fL * (ia.clawFrac || 0.42);
      for (const sg of [1, -1]) {
        const g2 = makeAnchor(fL, clL);""",
     """      const fL = ia.bowerLenM || 1.57;
      for (const sg of [1, -1]) {
        const g2 = makeAnchor(fL);"""),
    ("""      const fL = ia.sternLenM || 1.57, clL = fL * (ia.clawFrac || 0.42);
      const dhP = B * 0.115;""",
     """      const fL = ia.sternLenM || 1.57;
      const dhP = B * 0.115;"""),
    ("""        const g2 = makeAnchor(fL, clL);
        const zA = sg * (ia.sternOffZ || 2.4);""",
     """        const g2 = makeAnchor(fL);
        const zA = sg * (ia.sternOffZ || 2.4);"""),
]:
    assert h.count(old_call) == 1, old_call[:60]
    h = h.replace(old_call, new_call)

(OUT / 'hull.js').write_text(h)
print('hull.js staged,', len(h), 'bytes')

# ── 2. vessels.json (as text, to keep formatting) ──────────────────────────────
vp = ROOT / 'web/data/vessels.json'
v = vp.read_text()

old_cf = '     "clawFrac": 0.42,\n'
assert v.count(old_cf) == 1
v = v.replace(old_cf, '')

old_prov = ("Claw sweep REMAINS a woodcut-proportion default — the excavated finds "
            "are not measured part-by-part.")
new_prov = (
    "Claw sweep MEASURED r189, from the calibrator's own drawing — fig. 3a "
    "self-scales, 全長 2.15 m in its caption; the plate read at 322.8 px/m from a "
    "300-DPI render (build/staging/r189). The drawing is 王冠倬's published line "
    "drawing of a corroded find, so the proportions carry its draughting precision, "
    "not a survey's. The pair drawn widest is read as in-plane; the two sides give "
    "reach 0.325/0.354 of 全長 and tip height 0.222/0.181 — the spread is the "
    "obliquity bound — and the means set the class: tips at 0.339 of 全長 from the "
    "shank axis, 0.201 above the crown centre, the arm leaving the shank foot "
    "near-flat and turning up to ~40° at the point, arm sections tapering "
    "0.024 → 0.009 of 全長, the head a small forged eye 0.062 across in place of "
    "the drawn wide ring, the crown ball 0.078 — its bottom, the datum 全長 "
    "measures from, 0.039 below the claw joins. The audit holds the drawn reach to "
    "the measured proportion (V-SWEEP) and the crown-bottom-to-ring-top span to "
    "the field itself (V-LEN).")
assert v.count(old_prov) == 1
v = v.replace(old_prov, new_prov)

old_row = ("The forging chapter gives the form: four claws made first, then joined "
           "section by section to the shank — no stock, no wood; whichever way it "
           "lands a claw bites.")
new_row = ("The forging chapter gives the form: four claws made first, then joined "
           "section by section to the shank — no stock, no wood; whichever way it "
           "lands a claw bites. The sweep of the drawn claws follows the Penglai "
           "anchor's published drawing, which carries its own scale: each arm "
           "leaves the shank foot nearly flat and turns up to its point at a third "
           "of the anchor's length out from the shank.")
assert v.count(old_row) == 1
v = v.replace(old_row, new_row)

json.loads(v)  # must still parse
(OUT / 'vessels.json').write_text(v)
print('vessels.json staged,', len(v), 'bytes')

# ── 3. audit-hulls.js ──────────────────────────────────────────────────────────
ap = ROOT / 'Research/audit-hulls.js'
a = ap.read_text()

old_hdr = """       V-CLAWS: four cone points per anchor — the forging text's own count. V-LEN
       (r188, replacing the r184 shank-box read): each anchor's full crown-to-ring
       length, shank and head-ring extents projected on the shank's own world axis —
       geometry through the world matrix, the r186 lesson — sorted against the
       record's full lengths, which are CALIBRATED from the Penglai find (2.15 m,
       456 kg; Matsui 2013 fig. 3)."""
new_hdr = """       V-CLAWS: four cone points per anchor — the forging text's own count. V-LEN
       (r188; r189 adds the crown): each anchor's 全長 — crown BOTTOM to ring top,
       the span the find convention measures — crown, shank and head-ring extents
       projected on the shank's own world axis, geometry through the world matrix
       (the r186 lesson), sorted against the record's full lengths, which are
       CALIBRATED from the Penglai find (2.15 m, 456 kg; Matsui 2013 fig. 3).
       V-SWEEP (r189): each anchor's claw reach — tip-cone apexes' radial distance
       from the shank's own world axis — against the proportion measured from the
       same find's drawing, 0.339 of the record's 全長 (fig. 3a self-scaled,
       322.8 px/m). An anchor with no tips is V-CLAWS's conviction, so V-SWEEP
       passes over it."""
assert a.count(old_hdr) == 1
a = a.replace(old_hdr, new_hdr)

old_len = """        /* full length per anchor, crown to ring head: shank and head-ring extents
           projected on the shank's own world axis — geometry through the world
           matrix (the r186 lesson: a world AABB cannot read the 45° stow) */
        const lens = grps.map(gr => {
          let shk = null, rng = null;
          gr.traverse(o => { if (o.name === 'ia-shank') shk = o;
            else if (o.name === 'ia-ring') rng = o; });
          if (!shk || !rng) return 0;
          let lo = Infinity, hi = -Infinity;
          const ax = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
          for (const o of [shk, rng]) {"""
new_len = """        /* full length per anchor — 全長, crown bottom to ring top: crown, shank
           and head-ring extents projected on the shank's own world axis — geometry
           through the world matrix (the r186 lesson: a world AABB cannot read the
           45° stow) */
        const lens = grps.map(gr => {
          let shk = null, rng = null, crn = null;
          gr.traverse(o => { if (o.name === 'ia-shank') shk = o;
            else if (o.name === 'ia-ring') rng = o;
            else if (o.name === 'ia-crown') crn = o; });
          if (!shk || !rng || !crn) return 0;
          let lo = Infinity, hi = -Infinity;
          const ax = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
          for (const o of [shk, rng, crn]) {"""
assert a.count(old_len) == 1
a = a.replace(old_len, new_len)

old_after = """          if (Math.abs(lens[i] - wantLn[i]) > 0.12 * wantLn[i])
            say(v.id, "an anchor off the record's length",
                `crown to ring head ${lens[i].toFixed(2)} m along the shank's own `
                + `axis — the record's full length is ${wantLn[i]}`);
        const rayR = new THREE.Raycaster();"""
new_after = """          if (Math.abs(lens[i] - wantLn[i]) > 0.12 * wantLn[i])
            say(v.id, "an anchor off the record's length",
                `crown to ring head ${lens[i].toFixed(2)} m along the shank's own `
                + `axis — the record's full length is ${wantLn[i]}`);
        /* V-SWEEP (r189): claw reach against the Penglai drawing's proportion.
           Apex of each tip cone through its world matrix; radial distance from
           the line through the shank along its own axis. Null (no tips) is
           V-CLAWS's fault, not this rule's. */
        const sweeps = grps.map(gr => {
          let shk = null; const tps = [];
          gr.traverse(o => { if (o.name === 'ia-shank') shk = o;
            else if (o.name === 'ia-tip') tps.push(o); });
          if (!shk || !tps.length) return null;
          shk.updateMatrixWorld(true);
          const ax = new THREE.Vector3(0, 1, 0).transformDirection(shk.matrixWorld);
          const p0 = new THREE.Vector3().setFromMatrixPosition(shk.matrixWorld);
          let mx = 0;
          for (const t of tps) {
            t.updateMatrixWorld(true);
            const apex = new THREE.Vector3(0, t.geometry.parameters.height / 2, 0)
              .applyMatrix4(t.matrixWorld);
            const d = apex.sub(p0);
            const rad = d.sub(ax.clone().multiplyScalar(d.dot(ax))).length();
            if (rad > mx) mx = rad;
          }
          return mx;
        }).filter(s => s != null).sort((a2, b2) => b2 - a2);
        for (let i = 0; i < Math.min(sweeps.length, wantLn.length); i++)
          if (Math.abs(sweeps[i] - 0.339 * wantLn[i]) > 0.12 * 0.339 * wantLn[i])
            say(v.id, "a claw sweep off the find's proportion",
                `claw reach ${sweeps[i].toFixed(2)} m from the shank's own axis — `
                + `the Penglai proportion gives ${(0.339 * wantLn[i]).toFixed(2)}`);
        const rayR = new THREE.Raycaster();"""
assert a.count(old_after) == 1
a = a.replace(old_after, new_after)

(OUT / 'audit-hulls.js').write_text(a)
print('audit-hulls.js staged,', len(a), 'bytes')
print('ALL STAGED OK')
