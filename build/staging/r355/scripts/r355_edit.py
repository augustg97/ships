import sys
p = sys.argv[1] + '/js/hull.js'
s = open(p).read()
def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# 1. the face's x at a height
rep("""  /* the aft face: x is constant over height at u = 1, half-breadth is not */
  const xF = surfacePoint(S, H, 1.0, 1.0)[0];
  const atH = zH => surfacePoint(S, H, 1.0, 0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
  const halfAt = zH => atH(zH)[2];
""", """  /* ⚠ THE AFT FACE IS RAKED, AND EVERYTHING ON IT STOOD AT THE TOP'S x (round 355). This
     comment used to read "x is constant over height at u = 1"; the loft's rake made that
     false long ago. On the 74 the face runs from x 25.50 at the waterline to 27.50 at the
     sheer, and every light, moulding and gallery here was set at the sheer's x: the lower
     tier of lights stood 1.2 m aft of the face it is glazed into, and each gallery's drum
     hung off its corner by up to 1.3 m at the bottom while its full-circle cornice stood
     half inside the stern. Each fitting now stands on the face at its OWN height (faceX),
     leans with the face (faceLean), and the gallery is lofted round the corner line itself. */
  const xF = surfacePoint(S, H, 1.0, 1.0)[0];
  const atH = zH => surfacePoint(S, H, 1.0, 0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
  const halfAt = zH => atH(zH)[2];
  const faceX = zH => atH(zH)[0];
  const faceLean = zH => {                       // the face's rake there, dx/dy, as an angle
    const a = atH(zH - 0.25), b = atH(zH + 0.25);
    return Math.atan2(b[0] - a[0], Math.max(1e-3, b[1] - a[1]));
  };
""")

# 2. the stern-light tier: built about its own centre, stood on the face, leaned with it
rep("""    const sash = new THREE.Shape();
    sash.moveTo(-hw, zc - wh / 2); sash.lineTo(hw, zc - wh / 2);
    sash.lineTo(hw, zc + wh / 2); sash.lineTo(-hw, zc + wh / 2); sash.closePath();
    for (let i = 0; i < N; i++) {
      const zi = -hw + pitch * (i + 0.5);
      for (let cx = 0; cx < plC; cx++) for (let cy = 0; cy < plR; cy++) {
        const h0 = zi - lw / 2 + cx * (pw + barW), v0 = zc - gh / 2 + cy * (ph + barW);""",
"""    const sash = new THREE.Shape();
    sash.moveTo(-hw, -wh / 2); sash.lineTo(hw, -wh / 2);
    sash.lineTo(hw, wh / 2); sash.lineTo(-hw, wh / 2); sash.closePath();
    for (let i = 0; i < N; i++) {
      const zi = -hw + pitch * (i + 0.5);
      for (let cx = 0; cx < plC; cx++) for (let cy = 0; cy < plR; cy++) {
        const h0 = zi - lw / 2 + cx * (pw + barW), v0 = -gh / 2 + cy * (ph + barW);""")
rep("""    fr.rotation.y = Math.PI / 2;               // shape (breadth, height) → ship (z, y)
    fr.position.set(xF + B * 0.002, 0, 0);
    g.add(tag(fr, 'sternlight'));
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.012, gh, 2 * hw), glass);
    gl.position.set(xF + B * 0.004, zc, 0);
    g.add(tag(gl, 'sternlight'));""",
"""    fr.rotation.y = Math.PI / 2;               // shape (breadth, height) → ship (z, y)
    fr.position.set(B * 0.002, 0, 0);
    /* the tier's own frame: its centre on the face at zc, its height axis up the face */
    const tierG = new THREE.Group();
    tierG.position.set(faceX(zc), zc, 0);
    tierG.rotation.z = -faceLean(zc);
    g.add(tierG);
    tierG.add(tag(fr, 'sternlight'));
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.012, gh, 2 * hw), glass);
    gl.position.set(B * 0.004, 0, 0);
    tierG.add(tag(gl, 'sternlight'));""")
rep("""      rail.rotation.x = Math.PI / 2;
      rail.position.set(xF + B * 0.004, zm, 0);
      g.add(tag(rail, 'transom'));""",
"""      rail.rotation.x = Math.PI / 2;
      rail.position.set(faceX(zm) + B * 0.004, zm, 0);
      rail.rotation.z = -faceLean(zm);
      g.add(tag(rail, 'transom'));""")

# 3. the gallery: lofted round the corner line at each height, closed on both cheeks, a quarter cornice
rep("""        const c = atH(zH);
        const cz = sgn * c[2] * 0.995, r = rAt(zH);
        for (let i = 0; i <= NA; i++) {
          const a = (i / NA) * Math.PI / 2;      // 0 → dead aft, π/2 → square outboard
          gp.push(xF + r * Math.cos(a), zH, cz + sgn * r * Math.sin(a));
        }
      }
      for (let j = 0; j < NZ; j++)
        for (let i = 0; i < NA; i++) {
          const a = j * (NA + 1) + i;
          if (sgn > 0) gi.push(a, a + 1, a + NA + 1, a + 1, a + NA + 2, a + NA + 1);
          else         gi.push(a, a + NA + 1, a + 1, a + 1, a + NA + 1, a + NA + 2);
        }
""", """        const c = atH(zH);
        const cz = sgn * c[2] * 0.995, r = rAt(zH);
        for (let i = 0; i <= NA; i++) {
          const a = (i / NA) * Math.PI / 2;      // 0 → dead aft, π/2 → square outboard
          gp.push(c[0] + r * Math.cos(a), zH, cz + sgn * r * Math.sin(a));
        }
      }
      for (let j = 0; j < NZ; j++)
        for (let i = 0; i < NA; i++) {
          const a = j * (NA + 1) + i;
          if (sgn > 0) gi.push(a, a + 1, a + NA + 1, a + 1, a + NA + 2, a + NA + 1);
          else         gi.push(a, a + NA + 1, a + 1, a + 1, a + NA + 1, a + NA + 2);
        }
      /* the two cheeks that close the bay on the hull: one square across the face from the
         corner aft (a = 0), one square to the side from the corner outboard (a = π/2). Until
         r355 both were open, and from astern or from forward the drum showed its hollow. */
      const nRing = (NZ + 1) * (NA + 1);
      for (let j = 0; j <= NZ; j++) {
        const zH = zG0 + (zG1 - zG0) * (j / NZ), c = atH(zH);
        gp.push(c[0], zH, sgn * c[2] * 0.995);     // the corner line at this height
      }
      for (let j = 0; j < NZ; j++) {
        const k0 = nRing + j, k1 = k0 + 1;
        for (const i of [0, NA]) {
          const a0 = j * (NA + 1) + i, a1 = a0 + NA + 1;
          if ((sgn > 0) === (i === 0)) gi.push(k0, a1, a0, k0, k1, a1);
          else                         gi.push(k0, a0, a1, k0, a1, k1);
        }
      }
""")
rep("""      /* the cornice closing the drum's top */
      const cT = atH(zG1);
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(rMax * 1.12, rMax * 1.12, B * 0.012, 10), mats.woodDark);
      lid.position.set(xF, zG1 + B * 0.006, sgn * cT[2] * 0.995);
      g.add(tag(lid, 'gallery'));""",
"""      /* the cornice closing the drum's top: the drum's own quarter, 12% proud of it. Until
         r355 it was a full disc about the corner, so three quarters of it stood inside the
         stern and showed through the seam as dark slivers once the deck's cover lit it. */
      const cT = atH(zG1), rL = rMax * 1.12, pie = new THREE.Shape();
      pie.moveTo(0, 0);
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI / 2;
        pie.lineTo(rL * Math.cos(a), -sgn * rL * Math.sin(a));   // shape y → ship −z
      }
      pie.closePath();
      const lid = new THREE.Mesh(
        new THREE.ExtrudeGeometry(pie, { depth: B * 0.012, bevelEnabled: false }), mats.woodDark);
      lid.rotation.x = -Math.PI / 2;               // extrusion depth → up
      lid.position.set(cT[0], zG1, sgn * cT[2] * 0.995);
      g.add(tag(lid, 'gallery'));""")
rep("""        pane.position.set(xF + (r + B * 0.004) * Math.SQRT1_2,""",
"""        pane.position.set(c[0] + (r + B * 0.004) * Math.SQRT1_2,""")
open(p, 'w').write(s)
print('ok')
