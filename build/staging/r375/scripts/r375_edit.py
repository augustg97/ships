#!/usr/bin/env python3
"""r375: the 74's hawse-holes from Steel's Folios II and III. Every replacement asserted."""
import json, sys, pathlib
ROOT = pathlib.Path.home() / 'Ships'

def rep(path, old, new, count=1):
    p = ROOT / path
    s = p.read_text()
    n = s.count(old)
    assert n == count, f'{path}: anchor found {n} times, expected {count}: {old[:80]!r}'
    p.write_text(s.replace(old, new))

# ── 1. the record ────────────────────────────────────────────────────────────────────────
vp = ROOT / 'web/data/vessels.json'
raw = vp.read_text()
V = json.loads(raw)
vs = V if isinstance(V, list) else V.get('vessels', V)
it = vs if isinstance(vs, list) else list(vs.values())
sol = [v for v in it if v.get('id') == 'ship-of-the-line']
assert len(sol) == 1
IN = 0.0254
FT = 0.3048
stemHalf = 2 * FT / 2
kh = 1 * FT + 3.5 * IN
pieces = [1 * FT + 6 * IN, 1 * FT + 5.5 * IN, 1 * FT + 5.5 * IN, 1 * FT + 6 * IN]
c1 = stemHalf + kh + pieces[0]
c2 = c1 + pieces[1] + pieces[2]
sol[0]['hull']['hawse'] = {
    'diaM': round(1 * FT + 5 * IN, 4),
    'pipeThickM': round(1.5 * IN, 4),
    'clearM': round(1 * FT + 6 * IN, 4),
    'centresM': [round(c1, 4), round(c2, 4)],
    'height': 'lowerTierPort',
    'provenance': (
        "RECORDED, r375. Steel, Elements and Practice of Naval Architecture (1805; 1822 edition, archive.org "
        "elementspractice00stee), the 74-gun column. Folio III (BookReader leaf 491, build/staging/r375/dl/leaf491.jpg, "
        "2954 px across the folio): HAWSE PIECES sided 1 ft 6 in, 1 ft 5 1/2 in, 1 ft 5 1/2 in, 1 ft 6 in; holes in "
        "diameter, on a square, after the pipes are let in, 1 ft 5 in; to be in distance from each other on a square "
        "1 ft 6 in; hawse pipes thick at the bottom 1 1/2 in; each to weigh about 8 cwt. Folio II (leaf 489): the stem "
        "sided at the head 2 ft 0 in; the bollard or knight-head timbers square at the head 1 ft 3 1/2 in; hawse pieces "
        "four on each side. Book II, the half-breadth plan (djvu text line 16533): 'set off the foremost one, or that "
        "next to the middle line on the joint between the first and second hawse piece, then set off the other on the "
        "joint between the third and fourth hawse piece'. So the hole centres stand 1 ft 0 in + 1 ft 3 1/2 in + 1 ft 6 in "
        "= 3 ft 9 1/2 in (1.156 m) and 3 ft 9 1/2 in + 2 ft 11 in = 6 ft 8 1/2 in (2.045 m) off the middle line. The "
        "check: 2 ft 11 in between centres less one 1 ft 5 in hole is 1 ft 6 in clear, the table's 'distance from each "
        "other'. The HEIGHT is CLASS: Steel's 74 has the holes 'between the cheeks, which are on the lower deck', and "
        "his heights for them are in the sheer draught (Plate 1), which no round has found online (r374, r375). The "
        "model stands each hole's centre at the lower tier's port line at its own station. At sea the holes were "
        "closed from inside by blind bucklers (Steel's glossary, BUCKLERS), so the hole is drawn dark and closed."),
}
out = json.dumps(V, indent=1 if raw.startswith('{\n "') or raw.startswith('[\n {') else None, ensure_ascii=False)
# keep the file's own formatting style: detect indent
if raw[:3] in ('{\n ', '[\n '):
    ind = len(raw.split('\n')[1]) - len(raw.split('\n')[1].lstrip(' '))
    out = json.dumps(V, indent=ind, ensure_ascii=False)
vp.write_text(out + ('\n' if raw.endswith('\n') else ''))
print('centres', round(c1, 4), round(c2, 4), 'clear', round(c2 - c1 - (1 * FT + 5 * IN), 4))

# ── 2. the part card ─────────────────────────────────────────────────────────────────────
rep('web/js/hull.js', "  head:     { stage: 4, name: 'Head and beakhead',",
    "  hawse:    { stage: 3, name: 'Hawse-holes',\n"
    "              what: 'The holes in the bow that the anchor cables run out through. Steel (1822) gives a 74 '\n"
    "                  + 'two on each side of the stem. Each is 17 inches across inside a lead pipe 1.5 inches thick, '\n"
    "                  + 'and the two stand 18 inches apart. Each hole is cut on the joint between two of the four '\n"
    "                  + 'hawse pieces, the upright timbers of the bow beside the stem, so that it takes half the '\n"
    "                  + 'wood out of each timber and the whole of neither. At sea the cables were unbent from the '\n"
    "                  + 'anchors and the holes were closed from inside with plugs and blind bucklers.' },\n"
    "  head:     { stage: 4, name: 'Head and beakhead',")

# ── 3. the builder ───────────────────────────────────────────────────────────────────────
rep('web/js/hull.js', "  if (S.iron) return;\n\n  const grade = S.head || 0;",
r"""  /* ⚠ THE HAWSE-HOLES (round 375). Until r375 no hull had a hawse-hole, so every catted bower's cable had no way
     into the ship. Steel (1822) Folio III tabulates them for every rate; the 74's are 1 ft 5 in across inside a lead
     pipe 1 1/2 in thick, 1 ft 6 in apart, two a side, each on the joint between two of the four hawse pieces (Book II,
     the half-breadth plan). hull.hawse records the centres' half-breadths; the height is the lower tier's port line,
     a CLASS height until Steel's sheer draught is read. Each hole is a dark face closed by its blind buckler, ringed by
     the pipe's lead lip, set square to the bow's own surface where the record's half-breadth meets that height. */
  if (S.hawse && S.hawse.diaM > 0 && Array.isArray(S.hawse.centresM)) {
    const HW = S.hawse, r = HW.diaM / 2, t = HW.pipeThickM || 0.03;
    const vPort = sideBands(S).tiers[0].port;
    const leadMat = mats.lead || new THREE.MeshStandardMaterial({ color: 0x6f7377, roughness: 0.55, metalness: 0.35 });
    const lipMat = leadMat.clone(); lipMat.side = THREE.DoubleSide;
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x0b0907, roughness: 0.95, metalness: 0.0,
                                                    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const zAt = (u, y) => Math.abs(surfacePoint(S, H, u, vAtY(S, H, u, y))[2]);
    S.__hawse = [];
    for (const c of HW.centresM) {
      /* the station where the bow's half-breadth at the port line is the record's: bisect u, then re-read the height */
      let u = 0.03, y = surfacePoint(S, H, u, vPort)[1];
      for (let it = 0; it < 4; it++) {
        let a = 0.0005, b = 0.3;
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (zAt(m, y) < c) a = m; else b = m; }
        u = (a + b) / 2; y = surfacePoint(S, H, u, vPort)[1];
      }
      const v = vAtY(S, H, u, y), p = surfacePoint(S, H, u, v);
      const pu = surfacePoint(S, H, Math.min(1, u + 0.002), v), pv = surfacePoint(S, H, u, Math.min(1, v + 0.01));
      for (const sgn of [-1, 1]) {
        const P0 = new THREE.Vector3(p[0], p[1], sgn * Math.abs(p[2]));
        const du = new THREE.Vector3(pu[0] - p[0], pu[1] - p[1], sgn * (Math.abs(pu[2]) - Math.abs(p[2])));
        const dv = new THREE.Vector3(pv[0] - p[0], pv[1] - p[1], sgn * (Math.abs(pv[2]) - Math.abs(p[2])));
        const n = new THREE.Vector3().crossVectors(du, dv).normalize();
        if (n.z * sgn < 0) n.negate();                                  // outward
        const hg = new THREE.Group();
        hg.position.copy(P0);
        hg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        /* the lead pipe's lip: a short tube from just inside the skin to 4 cm proud of it */
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(r + t, r + t, 0.06, 24, 1, true), lipMat);
        lip.rotation.x = Math.PI / 2; lip.position.z = 0.01;
        hg.add(lip);
        const rim = new THREE.Mesh(new THREE.RingGeometry(r, r + t, 24), leadMat);
        rim.position.z = 0.04;
        hg.add(rim);
        /* the closed hole: the buckler's dark face a pipe's thickness inside the lip */
        const face = new THREE.Mesh(new THREE.CircleGeometry(r, 24), holeMat);
        face.position.z = 0.04 - t;
        face.userData.hawseFace = { r, t };
        hg.add(face);
        hg.userData.hawse = { c, u: +u.toFixed(4), y: +y.toFixed(3), r, t };
        group.add(tag(hg, 'hawse'));
        S.__hawse.push({ x: P0.x, y: P0.y, z: P0.z, c, u });
      }
    }
  }
  if (S.iron) return;

  const grade = S.head || 0;""")
print('hull.js edited')
