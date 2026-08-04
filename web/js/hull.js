/* hull.js — ships, generated.
 *
 * Every hull on this site is GENERATED from the vessel's attested principal dimensions and
 * published hull-form coefficients. Nothing is modelled by hand and nothing is traced from a
 * copyrighted drawing. That is not a compromise, it is the honest option: the good geometry
 * for historical ships is mostly not redistributable, and *generating and disclosing* beats
 * *copying and hoping*. Every card says which dimensions are attested and which are inferred.
 *
 * ── HOW A HULL IS BUILT ─────────────────────────────────────────────────────────────
 * A hull surface is parametrised by u along the length (0 = stem, 1 = sternpost) and v from
 * the keel up to the sheer line. Four curves and one exponent do almost all the work:
 *
 *   waterline(u)   the half-breadth at the design waterline, as a fraction of B/2.
 *                  Its integral is the waterplane coefficient Cw.
 *   keel(u)        how deep the hull is at that station, as a fraction of T. Flat over the
 *                  midbody, rising into the ends — the "rise of floor" and the deadwood.
 *   sheer(u)       the deck line, which on a real ship is never flat: it rises toward bow and
 *                  stern, and how much is one of the strongest signals of period.
 *   tumble(u)      how far the topsides fall INWARD above the waterline. On a ship of the line
 *                  this is severe, and it is most of why a 74 looks like a 74.
 *   n              the superellipse exponent of the underwater section, |y/b|ⁿ + |z/t|ⁿ = 1.
 *                  n = 1 is a V, n = 2 an ellipse, n → ∞ a box. It is solved numerically to
 *                  hit the vessel's midship coefficient Cm, so the section is not a guess —
 *                  it is the section that has the right area.
 *
 * Block coefficient then falls out: Cb = Cp × Cm, and the model reports what it achieved so a
 * card can be checked against the published figure rather than trusting the generator.
 *
 * ── WHAT IS DELIBERATELY NOT MODELLED ───────────────────────────────────────────────
 * Interior arrangement, deck furniture, carving and figureheads, and running rigging beyond
 * the principal standing rig. A generated hull that sprouted invented ornament would be
 * pretending to a precision it does not have.
 */
'use strict';

/* ── numeric helpers ───────────────────────────────────────────────────────────────── */

/* Area of one quadrant of |y/b|ⁿ + |z/t|ⁿ = 1, as a fraction of the enclosing rectangle b·t.
   Integrated numerically because the closed form is a beta function and this is clearer. */
function superellipseFullness(n) {
  const N = 256;
  let a = 0;
  for (let i = 0; i < N; i++) {
    const y = (i + 0.5) / N;
    a += Math.pow(Math.max(0, 1 - Math.pow(y, n)), 1 / n);
  }
  return a / N;
}

/* Solve for the exponent that gives a section of the required fullness. Cm for a real hull
   runs from about 0.55 (a sharp V-sectioned clipper or a canoe) to 0.99 (a tanker). */
function exponentForCm(cm) {
  let lo = 0.6, hi = 24.0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (superellipseFullness(mid) < cm) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* A shape function that is 1 amidships and falls to `end` at the extremities, with `p`
   controlling how full the ends are. p = 2 is a parabola; large p is a long parallel body. */
function fullness(u, p, endF, endA) {
  const s = Math.abs(2 * u - 1);
  const f = 1 - Math.pow(s, p);
  const end = u < 0.5 ? endF : endA;
  return end + (1 - end) * f;
}


/* ── ROPE WITH A DIAMETER ──────────────────────────────────────────────────────────────
 * Standing rigging was drawn with THREE.Line, which is one pixel wide at every distance. At
 * arm's length — which is the whole point of this view — a 74's shrouds read as scratched wire
 * and 452 separate ratline objects read as static.
 *
 * Real rope has a diameter, and on a ship of the line it is a startling one: a main shroud is
 * about 4½ inches in circumference, which is over an inch thick, and the main stay is 20 inches
 * around — as thick as a man's calf. Drawing it as a hairline throws away the single most
 * physical fact about a sailing ship, which is how MASSIVE the cordage is.
 *
 * Every segment becomes a thin four-sided prism and they are merged into ONE geometry per set,
 * so the whole ladder is a single draw call. That is what makes 500 real ropes cheaper than 500
 * lines were.
 */
function ropeMesh(segs, r, mat) {
  const pos = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  segs.forEach(([a, b]) => {
    const d = tmp.copy(b).sub(a);
    if (d.lengthSq() < 1e-9) return;
    d.normalize();
    const n1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up).normalize();
    const n2 = new THREE.Vector3().crossVectors(d, n1).normalize();
    const base0 = pos.length / 3;
    for (const P of [a, b])
      for (const [s1, s2] of [[1, 1], [1, -1], [-1, -1], [-1, 1]])
        pos.push(P.x + (n1.x * s1 + n2.x * s2) * r,
                 P.y + (n1.y * s1 + n2.y * s2) * r,
                 P.z + (n1.z * s1 + n2.z * s2) * r);
    for (let f = 0; f < 4; f++) {
      const c = (f + 1) % 4;
      idx.push(base0 + f, base0 + 4 + f, base0 + c, base0 + c, base0 + 4 + f, base0 + 4 + c);
    }
  });
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/* ── the parametric hull ───────────────────────────────────────────────────────────── */

function hullSurface(S) {
  const nExp = exponentForCm(S.cm);
  const halfB = S.beam / 2;

  /* waterline half-breadth, normalised */
  const wl = u => fullness(u, S.wlPower, S.stemFineness, S.sternFineness);
  /* depth of the keel below the waterline, normalised. The forefoot rises and the run sweeps
     up to the sternpost; a flat-floored cog barely does either. */
  const keel = u => {
    const fore = 1 - Math.pow(Math.max(0, (S.forefoot - u) / S.forefoot), 2) * S.riseF;
    const aft = 1 - Math.pow(Math.max(0, (u - (1 - S.run)) / S.run), 2) * S.riseA;
    return Math.max(0.06, Math.min(fore, aft));
  };
  /* The deck line. Sheer is the rise of the deck at the ends above amidships, and getting its
     SHAPE right matters more than its size: the standard profile (ICLL 1966 Reg. 38) is a
     cubic-ish curve that is nearly flat over the middle third and lifts sharply only in the
     outer sixth, with bow sheer exactly TWICE stern sheer.
     ⚠ A power of 1.9 spreads the rise across the whole hull and bends the ship into a banana.
     The real curve is much flatter amidships — hence 2.8. */
  const sheer = u => {
    const s = Math.abs(2 * u - 1);
    const rise = u < 0.5 ? S.sheerBow : S.sheerStern;
    return S.freeboard + rise * Math.pow(s, 2.8);
  };
  /* tumblehome grows above the waterline; quoted as the fraction of half-beam lost at deck */
  const tumble = u => S.tumblehome * fullness(u, 1.4, 0.55, 0.7);

  /* the profile of the stem and the sternpost, as an x-offset that rakes the ends */
  const rake = u => {
    if (u < S.forefoot) {
      const k = (S.forefoot - u) / S.forefoot;
      return -S.stemRake * k * k * S.loa;
    }
    if (u > 1 - S.run) {
      const k = (u - (1 - S.run)) / S.run;
      return S.sternRake * k * k * S.loa;
    }
    return 0;
  };

  return { nExp, halfB, wl, keel, sheer, tumble, rake };
}


/* ── THE BACKBONE AND THE RIBS ─────────────────────────────────────────────────────────
 * A ship you cannot take apart is a picture of a ship. These generate the two members that
 * come before the planking, so the Shipwright can build the vessel in the order a yard
 * actually built it — and so the order itself carries information, because it is NOT the
 * same order everywhere:
 *
 *   FRAME-FIRST (carvel).  Mediterranean, and northern Europe from about 1450. Lay the keel,
 *   raise the frames, then plank onto them. The shape is decided on the drawing floor before
 *   a plank is cut, which is what makes a 74 reproducible.
 *
 *   SHELL-FIRST (clinker).  Scandinavian and the northern cog. Build the planking shell FIRST,
 *   edge-joined and riveted, and insert light frames afterwards into a hull whose shape is
 *   already fixed. The shape lives in the shipwright's eye, not on paper.
 *
 * The same two members, assembled in opposite orders, and the difference is most of why the
 * Atlantic ship of 1500 could be scaled up and the longship could not. `S.shellFirst` marks it.
 */
function buildKeelGeometry(S) {
  const H = hullSurface(S);
  const pos = [], idx = [];
  const NU = 96, sided = 0.055 * S.beam / 2;        // moulded siding of the keel timber
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const p = surfacePoint(S, H, u, 0);             // the rabbet line, where planking meets keel
    const depth = i === 0 || i === NU ? 0.02 : 0.055 * S.draught + 0.02;
    /* a rectangular section hung under the rabbet: four corners per station */
    pos.push(p[0], p[1] - depth, -sided, p[0], p[1] - depth, sided,
             p[0], p[1] + 0.01, sided, p[0], p[1] + 0.01, -sided);
  }
  for (let i = 0; i < NU; i++) {
    const a = i * 4, b = a + 4;
    for (let f = 0; f < 4; f++) {
      const c = (f + 1) % 4;
      idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function buildFramesGeometry(S, NF = 26, onlyU) {
  const H = hullSurface(S);
  const pos = [], idx = [];
  const NV = 26, half = 0.016 * S.lwl / 2;
  if (NF === 1 && onlyU === undefined) NF = 1;          // the room-and-space of one frame
  let base = 0;
  for (let f = 0; f < NF; f++) {
    const u = onlyU !== undefined ? onlyU : 0.055 + (f / (NF - 1)) * 0.89;
    for (let sgn = -1; sgn <= 1; sgn += 2) {        // both sides of the ship
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const p = surfacePoint(S, H, u, v);
        /* ── ⚠ THE FRAMES WERE POKING THROUGH THE PLANKING ON EVERY SHIP ────────────────
           A 3.5% inset is not a plank thickness, it is a PROPORTION — so at the ends, where
           the half-breadth falls to a fraction of a metre, the gap shrank to millimetres and
           the two surfaces interpenetrated. Worse, the frames are tessellated at 26 steps and
           the fine planking at 72: two polygonal approximations of the same curve, sampled
           differently, cross each other wherever the curvature is strongest. The ribs then
           show as streaks down a finished hull — which is exactly what they were doing, on
           every vessel in the fleet, and it read as a texture bug rather than as geometry.

           An inset has to be a LENGTH, because a plank is a length. Frames sit one plank
           thickness inboard — call it 4% of the half-beam — plus a small absolute clearance
           that does not vanish when the section narrows. */
        const plank = S.beam * 0.020;
        const inset = plank + S.beam * 0.006;
        const z = Math.max(0, Math.abs(p[2]) - inset);
        for (let e = -1; e <= 1; e += 2)
          pos.push(p[0] + e * half, p[1], sgn * z);
      }
      for (let j = 0; j < NV; j++) {
        const a = base + j * 2;
        idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
      base += (NV + 1) * 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}


/* ── THE SHIPWRIGHT'S MODEL: THE SAME SHIP, BUILT FINER ────────────────────────────────
 * The globe needs a token, the Yard needs a silhouette, and the Shipwright needs an object you
 * can put your face against. These are separate models — deliberately, at a much higher level
 * of detail — but they are generated from the SAME vessel spec and the SAME surfacePoint(), so
 * detail can go up without the ship becoming a different ship. That is the distinction worth
 * holding: more members and finer tessellation is detail; a second set of dimensions would be
 * drift.
 *
 * What the fine build adds, all of it derived rather than drawn:
 *   · the hull at 4x the stations and 2x the waterlines
 *   · the STEM and STERNPOST as their own timbers, because they are their own timbers
 *   · WALES — the thickened strakes that stop a long wooden hull from hogging
 *   · a RUDDER on the sternpost, with its tiller
 *   · CHANNELS, the shelves that push the shrouds out clear of the topsides
 *   · every FRAME as its own object, so you can pick one out of the skeleton
 */
function buildStemGeometry(S, aft) {
  const H = hullSurface(S);
  const pos = [], idx = [];
  const N = 26, sided = 0.055 * S.beam / 2;
  /* the timber follows the ship's own profile at the very end of the hull */
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const u = aft ? 1 - (1 - f) * 0.10 : f * 0.10;
    const v = aft ? f : 1 - f;
    const p = surfacePoint(S, H, u, Math.max(0, Math.min(1, v)));
    const t = 0.05 * S.draught;
    pos.push(p[0] - t, p[1], -sided, p[0] - t, p[1], sided,
             p[0] + t, p[1], sided,  p[0] + t, p[1], -sided);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 4, b = a + 4;
    for (let f = 0; f < 4; f++) {
      const c = (f + 1) % 4;
      idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* a wale is a band of the hull surface, pushed proud of it */
function buildWaleGeometry(S, v0, thick) {
  const H = hullSurface(S);
  const pos = [], idx = [];
  const NU = 120;
  let base = 0;
  for (let sgn = -1; sgn <= 1; sgn += 2) {
    for (let i = 0; i <= NU; i++) {
      const u = 0.012 + (i / NU) * 0.976;
      for (let k = -1; k <= 1; k += 2) {
        const p = surfacePoint(S, H, u, v0 + k * 0.5 * thick);
        const out = 1.018;                       // proud of the planking
        pos.push(p[0], p[1], sgn * p[2] * out);
      }
    }
    for (let i = 0; i < NU; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    base += (NU + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function buildRudderGeometry(S) {
  const H = hullSurface(S);
  const p = surfacePoint(S, H, 1.0, 0);
  const top = H.sheer(1.0) * 0.35;
  const depth = -S.draught * 0.92;
  const w = 0.030 * S.beam, chord = S.lwl * 0.055;
  const pos = [], idx = [];
  /* a plate on the sternpost: wider at the foot, raked with the post */
  const pts = [[p[0], top], [p[0] + chord * 0.55, top],
               [p[0] + chord, depth], [p[0], depth]];
  pts.forEach(q => pos.push(q[0], q[1], -w, q[0], q[1], w));
  for (let i = 0; i < 4; i++) {
    const a = i * 2, b = ((i + 1) % 4) * 2;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  idx.push(0, 2, 4, 0, 4, 6, 1, 5, 3, 1, 7, 5);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* Build the hull as an indexed triangle mesh. u runs stem→stern, v runs keel→sheer. */
/* The one place a point on the hull surface is defined. Keel, frames and planking are all
   generated from THIS function, so the frames cannot sit proud of the planking and the keel
   cannot float below it — they agree by construction rather than by tuning. */
function surfacePoint(S, H, u, v) {
  const L = S.lwl;
  const b = H.halfB * H.wl(u);
  const t = S.draught * H.keel(u);
  const deckHalf = b * (1 - H.tumble(u));
  const fb = H.sheer(u);
  let y, z;
  if (v <= 0.62) {
    const k = v / 0.62;
    z = -t * (1 - k);
    const yy = Math.pow(Math.max(0, 1 - Math.pow(1 - k, H.nExp)), 1 / H.nExp);
    y = b * yy;
  } else {
    const k = (v - 0.62) / 0.38;
    z = fb * k;
    y = b + (deckHalf - b) * Math.pow(k, 0.9);
    /* ── THE COUNTER ────────────────────────────────────────────────────────────────
       A square-sterned ship is FINE AT THE WATERLINE AND BROAD AT THE TAFFRAIL. The run
       tapers away underwater — it has to, or she drags a wake like a barn door — while the
       topsides above it flare outward into a flat transom. The model had the after-body the
       same width at every height, which is why a transom could not be attached to it: there
       was nothing up there to attach one to.

       ⚠ And this is why the fix belongs HERE rather than in the waterline function. The flare
       is entirely above v = 0.62, so the waterplane is untouched: Cw, Cp, Cb and Cm are all
       exactly what they were, and no published coefficient has to be re-checked. Changing
       sternFineness instead — the obvious move — would have moved every one of them. */
    if (S.transom) {
      const runStart = 1 - S.run;
      if (u > runStart) {
        const t = (u - runStart) / S.run;
        y += (S.beam / 2) * S.transom * t * t * Math.pow(k, 0.75);
      }
    }
  }
  return [(u - 0.5) * L + H.rake(u), z, y];
}

function buildHullGeometry(S, NU = 120, NV = 34) {
  const H = hullSurface(S);
  const pos = [], nor = [], uvs = [], idx = [];
  const L = S.lwl;

  const pointAt = (u, v) => {
    const b = H.halfB * H.wl(u);
    const t = S.draught * H.keel(u);
    const deckHalf = b * (1 - H.tumble(u));
    const fb = H.sheer(u);
    let y, z;
    if (v <= 0.62) {
      /* underwater: the superellipse whose area is the vessel's own Cm */
      const k = v / 0.62;                 // 0 at keel, 1 at waterline
      z = -t * (1 - k);
      const yy = Math.pow(Math.max(0, 1 - Math.pow(1 - k, H.nExp)), 1 / H.nExp);
      y = b * yy;
    } else {
      /* topsides: waterline → deck edge, falling inward by the tumblehome */
      const k = (v - 0.62) / 0.38;
      z = fb * k;
      y = b + (deckHalf - b) * Math.pow(k, 0.9);
    }
    /* the ends close: half-breadth goes to (nearly) zero at stem and sternpost */
    const x = (u - 0.5) * L + H.rake(u);
    return [x, z, y];
  };

  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const [x, z, y] = pointAt(u, v);
      pos.push(x, z, y);
      uvs.push(u, v);
      /* normal by finite difference on the surface */
      const e = 1 / (NU * 2), f = 1 / (NV * 2);
      const a = pointAt(Math.min(1, u + e), v), c = pointAt(u, Math.min(1, v + f));
      const du = [a[0] - x, a[1] - z, a[2] - y];
      const dv = [c[0] - x, c[1] - z, c[2] - y];
      let nx = du[1] * dv[2] - du[2] * dv[1];
      let ny = du[2] * dv[0] - du[0] * dv[2];
      let nz = du[0] * dv[1] - du[1] * dv[0];
      const ln = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / ln, ny / ln, nz / ln);
    }
  }
  const row = NV + 1;
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * row + j, b = a + row, c = a + 1, d = b + 1;
      idx.push(a, b, c, c, b, d);
    }
  }

  /* mirror to the port side by duplicating with negated z (the beam axis) */
  const n0 = pos.length / 3;
  for (let i = 0; i < n0; i++) {
    pos.push(pos[i * 3], pos[i * 3 + 1], -pos[i * 3 + 2]);
    nor.push(nor[i * 3], nor[i * 3 + 1], -nor[i * 3 + 2]);
    uvs.push(uvs[i * 2], uvs[i * 2 + 1]);
  }
  const m = idx.length;
  for (let i = 0; i < m; i += 3) {
    idx.push(idx[i] + n0, idx[i + 2] + n0, idx[i + 1] + n0);   // reversed winding
  }

  /* ── CLOSE THE ENDS. ⚠ THE HULL HAD AN OPEN SLOT DOWN BOTH OF THEM. ────────────────
     The surface is built as a starboard half and mirrored to port, and the two halves only
     meet where the half-breadth reaches zero — which it never does. `wl(0)` is stemFineness
     and `wl(1)` is sternFineness, both deliberately non-zero because a real hull has a stem
     and a sternpost with actual width. So the mesh was open at bow and stern and you could see
     straight through into the inside of the ship, which is most of what read as "gaps".
     They are closed with their own vertices and their own outward normals, because reusing the
     hull's surface normals would light a flat end as if it were curved planking. */
  for (const end of [0, 1]) {
    const nx = end === 0 ? -1 : 1;
    const base = pos.length / 3;
    for (let j = 0; j <= NV; j++) {
      const [x, z, y] = pointAt(end, j / NV);
      pos.push(x, z, y);   nor.push(nx, 0, 0); uvs.push(end, j / NV);
      pos.push(x, z, -y);  nor.push(nx, 0, 0); uvs.push(end, j / NV);
    }
    for (let j = 0; j < NV; j++) {
      const a = base + j * 2;
      if (end === 0) idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      else           idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/* The deck: a cap across the sheer line, slightly cambered as a real deck is. */
function buildDeckGeometry(S, NU = 120) {
  const H = hullSurface(S);
  const pos = [], nor = [], uvs = [], idx = [];
  const L = S.lwl;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const b = H.halfB * H.wl(u) * (1 - H.tumble(u));
    const fb = H.sheer(u);
    const x = (u - 0.5) * L + H.rake(u);
    for (let j = 0; j <= 8; j++) {
      const k = j / 8;                    // 0 = starboard edge, 1 = port edge
      const y = b * (1 - 2 * k);
      const camber = Math.cos((k - 0.5) * Math.PI) * b * 0.035;   // real decks are cambered
      pos.push(x, fb + camber, y);
      nor.push(0, 1, 0);
      uvs.push(u, k);
    }
  }
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < 8; j++) {
      const a = i * 9 + j, b = a + 9, c = a + 1, d = b + 1;
      idx.push(a, c, b, c, d, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/* ── the hull's surface ────────────────────────────────────────────────────────────────
 * Planking, caulked seams, copper below the waterline and the paint scheme above it — all
 * procedural, all keyed to the hull's own parametrisation, so they follow the sheer and the
 * tumblehome instead of being wrapped round it like a decal.
 *
 * Copper sheathing: the Royal Navy plate was about 4 ft x 14 in, fastened in overlapping
 * courses from the keel up to a line a little above the load waterline. New copper is bright
 * salmon; within weeks it is dull brown; within a season in warm water it is the green that
 * gave verdigris its name. The `copperAge` uniform runs that progression.
 */
const HULL_VERT = SHADERS['HULL_VERT.vert'];

const HULL_FRAG = SHADERS['HULL_FRAG.frag'];


/* ── rig ──────────────────────────────────────────────────────────────────────────────
 * Masts, yards and sails placed by the PROPORTIONAL RULES the shipwrights actually used —
 * mast positions as fractions of the length, mast height as a multiple of the beam, yard
 * lengths as fractions of the mast — rather than by eye. Where a rule is not attested for a
 * type, the value is marked inferred on the card.
 */
function buildRig(S, group, mats, FINE) {
  const L = S.lwl, B = S.beam;
  const H = hullSurface(S);
  const deckAt = u => H.sheer(u);
  /* ── ⚠ THE DECK IS NOT LEVEL, AND CLEARANCE WAS BEING TAKEN AT THE MAST ────────────
     A sheer line RISES toward the bow and the stern — that is what sheer is — so the deck
     under a sail's clew stands higher than the deck at the mast the sail hangs on, sometimes
     by the better part of a metre. Every foot height here was measured from `base`, the deck
     AT THE MAST, and then applied out at the clews. That is how sails came to hang through
     the deck on five hulls, and bracing the yards round made it worse, because a braced sail
     swings its clews fore and aft into precisely the part of the deck that is rising.
     Take the HIGHEST deck under the span the sail actually occupies. */
  const deckMax = (uA, uB) => {
    const a = Math.max(0, Math.min(uA, uB)), b = Math.min(1, Math.max(uA, uB));
    let m = -Infinity;
    for (let k = 0; k <= 8; k++) m = Math.max(m, deckAt(a + (b - a) * k / 8));
    return m;
  };

  const woodDark = mats.spar, canvas = mats.canvas, rope = mats.rope;
  /* ⚠ LineBasicMaterial is UNLIT — it renders flat at whatever colour it is given, so rigging
     drawn with it stayed the same value whether it was in sunlight or in the shadow of a sail.
     Rope that is actually geometry can take the light like everything else. */
  const ropeMat = mats.ropeSolid || woodDark;

  const cyl = (x, y0, y1, r0, r1, mat, tiltZ = 0) => {
    const h = y1 - y0;
    const g = new THREE.CylinderGeometry(r1, r0, h, 9, 1, true);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y0 + h / 2, 0);
    m.rotation.z = tiltZ;
    group.add(tag(m, 'mast'));
    return m;
  };

  /* ── ⚠ THE YARDS WERE BRACED SQUARE ────────────────────────────────────────────────
     Every yard sat exactly athwartships and every fore-and-aft sail hung in the centreline
     plane, which is how a rig is DRAWN and not how one is ever set. A ship at sea is trimmed:
     the yards are braced round so the sails meet the wind at an angle, and the whole plan
     turns together because it is all working the same breeze.
     Square sails braced square are for running dead before the wind, which is the one point of
     sailing a square-rigger is worst at and almost never does deliberately. Trimmed round, the
     sails present their curve to the viewer instead of their edge — which is most of why they
     were reading as flat boards.
     One angle for the ship, applied to yard and canvas alike. Both sit on the mast centreline,
     so a rotation about Y is a brace. */
  const TRIM = S.trim !== undefined ? S.trim : 0.34;    // ~19 degrees off square
  const sails = [], spars = [], mastTops = [];
  const maxMastShare = S.masts.length ? Math.max(...S.masts.map(m => m.height)) : 1;

  S.masts.forEach((mk, mi) => {
    const u = mk.at;
    /* How much clear water there is abaft this mast before the next one. A fore-and-aft sail
       has to live inside it — see the boom clamp in the gaff block below. */
    const nextAt = (S.masts[mi + 1] || {}).at;
    /* ⚠ AND A FUNNEL STANDS IN THAT GAP. Clamping the boom to the next MAST was not enough
       on Great Eastern, because a fore-and-aft sail and a centreline funnel occupy the SAME
       PLANE — they cannot pass through one another, and the funnel sits at the middle of the
       gap, so a boom reaching 86% of it went straight through the stack. The obstruction is
       whichever comes first. */
    let obstruct = nextAt !== undefined ? nextAt : (0.5 + 0.06);
    (S.funnels ? funnelStations(S) : []).forEach(fu => {
      if (fu > u + 1e-4 && fu < obstruct) obstruct = fu;
    });
    const gapAft = (obstruct - u) * L;
    const x = (u - 0.5) * L + H.rake(u);
    const base = deckAt(u);
    const rakeRad = (mk.rake || 0) * Math.PI / 180;

    /* ── STEEL'S RULE, 1794 ────────────────────────────────────────────
       "The length of the lower deck and extreme breadth being added together, the half is the
       length of the main-mast." — Steel, *Elements of Mastmaking, Sailmaking and Rigging*.
       So the mast is a function of BOTH length and beam, not of beam alone: on a 74 with a
       51 m lower deck and 14.6 m breadth it gives a 32.8 m main mast, which is what a 74 had.
       `mk.height` is that mast's share of the main — main 1.0, fore ~0.88, mizzen ~0.72.
       Those three ratios are conventional and are NOT confirmed from Steel's tables; they are
       marked inferred on the card. The rule itself is attested. */
    const steelMain = (S.lwl + S.beam) / 2;
    /* ⚠ STEEL'S RULE HAS A DOMAIN, AND IT IS 18th-CENTURY WARSHIPS AT L/B ≈ 3.9.
       (lower deck + breadth) / 2 is dominated by LENGTH, so on a very fine hull it runs away:
       a trireme at L/B 9.7 comes out with a 20 m mast against Olympias's measured 11 m. Where a
       vessel has an attested mast, that measurement wins and the rule is not used at all —
       `heightM` is metres, `height` is a share of Steel's main. */
    const lower = mk.heightM !== undefined ? mk.heightM : mk.height * steelMain;
    /* Steel 1794, "Proportional Lengths of Masts": main topmast = 3/5 of the main mast;
       topgallant = 1/2 of its topmast. Cross-checked against Fincham 1843, whose measured
       ships give topmast 1.05–1.22 x extreme breadth and topgallant 0.57–0.70 x breadth.
       ⚠ The first version used 0.62 and 0.42 — the topgallant was nearly half again too long,
       which is why the rig stood 72 m over a 57 m hull instead of about 62. */
    const top = lower * 0.60, tg = top * 0.50;
    let y = base;
    /* a braced sail reaches about a tenth of the hull either side of its own mast */
    let prevYard = deckMax(u - 0.10, u + 0.10) + lower * 0.13;
    /* ⚠ A JUNK MAST IS A SINGLE POLE. Only a square rig is built up in fidded sections —
       lower mast, topmast, topgallant — because only a square rig needs to send its upper
       spars down in heavy weather. A junk reefs by dropping battens onto the boom and never
       sends anything down, so it steps one unstayed pole and the sail hoists to its head.
       Falling through to the square-rig case gave the treasure ship a 64 m mast carrying a
       sail that stopped halfway up it. */
    /* ── ⚠ A GAFF MAST IS NOT ALWAYS A SINGLE POLE ──────────────────────────────────
       Every gaff rig here got one spar, which is right for a fishing schooner and wrong for
       a big one. A pole mast is the CHEAP option: nothing to send down, nothing to fid, and
       nothing above the gaff either. Any schooner that wanted a gaff-topsail — and every
       large one did, because that is where the wind is — carried a TOPMAST fidded above the
       lower, and the reference model of Great Eastern shows six of them standing bare above
       her white lower masts.
       That gap is also why the black-upper livery had nothing to paint: the model had no
       upper masts to be black. Structure first, colour second. */
    const segs = mk.rig === 'lateen' ? []                       // built below, from the yard
               : (mk.rig === 'crabclaw' || mk.rig === 'junk') ? [lower]
               : mk.rig === 'gaff' ? (mk.topmast ? [lower, lower * 0.52] : [lower])
               : [lower, top, tg];
    const radii = [B * 0.030, B * 0.020, B * 0.013];

    segs.forEach((seg, si) => {
      if (mk.only && si >= mk.only) return;
      /* ── MAST LIVERY ────────────────────────────────────────────────────────────────
         On an iron ship the masts are painted, not oiled timber, and the museum model of
         Great Eastern shows the scheme plainly: WHITE LOWER MASTS, BLACK ABOVE. It is not
         decoration — the lower mast is a built iron tube kept white with the deckhouses, and
         the topmast and above are the sending-down spars, tarred and blacked like the rigging
         they carry. The join is at the doubling, which is exactly where the colour changes. */
      const mastMat = S.mastLivery
        ? (si === 0 ? (mats.mastWhite || (mats.mastWhite = new THREE.MeshStandardMaterial(
              { color: 0xdedad0, roughness: 0.58 })))
                    : (mats.mastBlack || (mats.mastBlack = new THREE.MeshStandardMaterial(
              { color: 0x1e2022, roughness: 0.52, metalness: 0.20 }))))
        : woodDark;
      const m = cyl(x - Math.sin(rakeRad) * (y - base), y, y + seg,
                    radii[si], radii[si] * 0.7, mastMat, -rakeRad);
      m.position.x = x + Math.sin(rakeRad) * (y + seg / 2 - base);

      /* the TOP sits at the head of the lower mast, and the topmast is fidded through it */
      if (FINE && mk.rig === 'square' && si === 0) {
        const tp = buildTop(B * 0.20, mats.woodPale);
        tp.position.set(x + Math.sin(rakeRad) * (y + seg - base), y + seg * 0.90, 0);
        group.add(tp);
      }
      if (mk.rig === 'square') {
        /* ── YARD LENGTHS, Steel 1794 p.40 ────────────────────────────
           "Proportional Lengths of Yards, in the Royal Navy":
             main yard          = 7/8 of the main mast          (0.875)
             main topsail yard  = 5/7 of the main yard          (0.714)
             topgallant yard    = 2/3 of its topsail yard       (0.667, 74s and up)
           ⚠ 7/8, not 8/9. Read off the page at high zoom AND validated against Steel's own
           *Dimensions of Masts and Yards in the Royal Navy* (p.49): 7/8 x 112 ft = 98 ft 0 in,
           and the table lists 98 ft 0 in. The tabulated ratio is .875 at 100 guns, .875 at 90,
           .874 at 74. Falconer 1780 independently puts the main yard at .559-.576 of the gun
           deck by rate; this rule gives .567 of the lower deck. Two sources, two rule forms,
           one answer.
           ⚠ And the fractions hold for two-deckers and above ONLY. Below 74 guns Steel's own
           tables run .89-.91, so a frigate wants the tabulated ratio, not the rule. */
        const yardLen = si === 0 ? lower * 0.875
                      : si === 1 ? lower * 0.875 * 0.714
                      : lower * 0.875 * 0.714 * 0.667;
        /* ⚠ 0.94 SLUNG EVERY YARD AT THE HEAD OF ITS OWN SEGMENT, which put the main course
           30 m up a 33 m lower mast and left a two-storey hole between the deck and the lowest
           sail. A course yard is slung a little over halfway up the lower mast; the mast carries
           on above it to the hounds, the top and the cap. */
        /* Where the lowest yard is slung depends on how many tiers are above it. Under two
           more sails a course sits a little over halfway up the lower mast; carrying the ONLY
           sail on the mast, as a trireme or a cog does, it is slung near the masthead — there
           is nothing above it to leave room for, and leaving the top 40% of the pole bare is
           just a mast that is too tall. */
        const tiers = mk.only || 3;
        const courseAt = tiers === 1 ? 0.90 : tiers === 2 ? 0.72 : 0.60;
        const yy = y + seg * (si === 0 ? courseAt : 0.88);
        /* A yard is not a cylinder: it is octagonal in the middle quarters and tapers to two
           fifths of its slings diameter at the arms. Murray 1754 gives the shipwrights' own
           sector divisions — 1.000, 0.964, 0.900, 0.700, 0.400 — and the last of those is why
           a yard reads as a yard rather than a pole. */
        const yg = new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, yardLen, 16);
        const ym = new THREE.Mesh(yg, woodDark);
        const yp = yg.attributes.position;
        for (let i = 0; i < yp.count; i++) {
          const t = Math.abs(yp.getY(i)) / (yardLen / 2);          // 0 slings, 1 arm
          const taper = t < 0.25 ? 1.0 - 0.144 * (t / 0.25)
                      : t < 0.75 ? 0.856 - 0.256 * ((t - 0.25) / 0.5)
                                 : 0.600 - 0.200 * ((t - 0.75) / 0.25);
          const k = taper / 0.4 * 0.9;
          yp.setX(i, yp.getX(i) * k); yp.setZ(i, yp.getZ(i) * k);
        }
        yg.computeVertexNormals();
        /* ── ⚠ THE YARD WAS NEVER ACTUALLY BRACED. ────────────────────────────────────────
           `rotation.x = PI/2` lays the cylinder's axis onto Z. `rotation.z` then turns it about
           the very axis it now lies along — a NO-OP, and the comment that used to sit here
           asserted the opposite. So the canvas swung round to the trim angle and the spar it
           hangs from stayed square, which is why the yard arms stood out past the cloth as bare
           sticks in the air. A rotation composed as Euler angles is only as good as the order it
           is read in; composed as quaternions it says what it does. Lay the spar athwartships
           FIRST, then brace the whole thing about the vertical — which is the order a real crew
           works in, and the only one that keeps the yard in the sail. */
        ym.quaternion
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), TRIM)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        ym.position.set(x + Math.sin(rakeRad) * (yy - base), yy, 0);
        group.add(tag(ym, 'yard'));
        /* recorded from the spar that was actually placed, so the braces lead to real yard arms:
           a braced yard's arms swing FORE AND AFT as well as out, and the brace is the rope that
           holds them there, so it has to be led to where the arm now is. */
        spars.push({ u, x: ym.position.x, y: yy, half: yardLen / 2,
                     armX: Math.sin(TRIM) * yardLen / 2, armZ: Math.cos(TRIM) * yardLen / 2 });
        /* ── THE DROP IS THE GAP TO THE TIER BELOW ────────────────────────────────
           Which is what the comment here always said, while the code used a fixed fraction of
           the mast segment and left the tiers floating apart from each other. A square sail
           hangs from its yard down to the yard beneath it — that IS its depth, and it is why
           the sail plan of a square-rigger reads as one continuous wall of canvas rather than
           as separate flags. The course's "tier below" is the deck, less the clearance a foot
           needs so the sail can be handled. */
        const drop = yy - prevYard;
        prevYard = yy;
        sails.push(makeSail(x + Math.sin(rakeRad) * (yy - base), yy,
                            yardLen * 0.96, drop * 0.97, canvas, group, 'square', TRIM));
      }

      /* ── MASTS STACK. ⚠ THIS LINE WAS MISSING, AND NOTHING LOOKED WRONG. ──────────────
         Every segment was drawn from the DECK, so the three masts were concentric rather than
         stepped, and because the lower mast is the longest it also finished highest: the main
         COURSE — the biggest sail on the ship — flew at the top of the rig and the topgallant
         at the bottom. The square rig was upside down on every square-rigged vessel here, and
         it read as plausible because the yards still descended in size, just in the wrong order.
         It was caught by measuring: rigTop came back 38 m on a 74 whose main truck stood at 55.

         The heel of a topmast is not at the head of the mast below it — the two are fidded
         side by side and overlap through the DOUBLING, about an eighth of the lower spar. That
         is why 32.8 + 19.7 + 9.8 m of timber makes a 56 m rig and not a 62 m one. */
      y += seg * 0.88;
    });
    if (mk.rig === 'square') mastTops.push({ u, x, y: y + (lower * 0.14) });

    if (mk.rig === 'lateen') {
      /* ── THE LATEEN IS DETERMINED BY THE SHIP, NOT BY THE MAST ─────
         Three sourced facts, and together they leave NO free parameters:
           (1) the yard is as long as the hull.  Pâris (*Essai sur la construction navale des
               peuples extra-européens*, 1841) on the Arab baggala: "the yard almost always has
               the total length of the vessel"; on the Indian patamar, "the main yard, as long
               as the boat". Whitewright 2008 on the Mediterranean lateen: "nearly as long, or
               sometimes even longer, than the vessel itself".
           (2) it is slung a THIRD of its length from the tack.        (Pâris, on the patamar)
           (3) the tack is hauled down to the stemhead.
         Fix the tack at the stem and the sling at the mast, and the yard's ANGLE follows from
         arithmetic: cos θ = (mast - stem) / (yard/3). The masthead height then falls out of it.
         That is the right way round. The mast on a lateen craft is short BECAUSE the yard is
         long — the rig gets its area from the spar, not from height — so deriving the mast from
         the yard reproduces the silhouette, while imposing a tall mast (which is what this did)
         forces the yard nearly upright and throws the sail off the ship. */
      /* ⚠ THE HULL-LENGTH YARD RULE IS FOR A LATEEN MAIN, NOT FOR A LATEEN MIZZEN.
         Pâris's baggala and patamar are lateen-RIGGED craft: the lateen is the whole engine,
         so its yard is the length of the boat. A carrack's mizzen is a steering sail on a
         square-rigged ship — it exists to help her lie closer and to balance the head sails,
         and it is small. Applying the dhow rule to it gave the carrack a 36 m yard on a 42 m
         hull and a mizzen bigger than her mainsail. The test is whether the ship carries any
         square canvas at all; if she does, this mast is a mizzen and takes Steel's proportion
         off its own mast instead. */
      const mixed = (S.masts || []).some(m => m.rig === 'square');
      const yardLen = mixed ? lower * 1.15 : L * (mk.height / maxMastShare);
      /* θ is the OBSERVABLE, and it is about 45°: that is the angle in every plate of Pâris's
         and in every photograph of a working boom or baghla. Deriving θ instead from the mast's
         fore-and-aft position (which is what the first attempt did) forced it to 65° and the
         boat read as a Bermudan sloop.
         Then comes the consequence that makes a dhow look like a dhow: a yard as long as the
         hull, slung a third of the way along at a mast set well forward, has its HEEL PROJECTING
         OUT BEYOND THE STEM. It is not an artefact — it is the most recognisable thing about
         the rig, and it falls straight out of (1) and (2) once θ is fixed. */
      const th = mixed ? 0.98 : 0.785;   // a mizzen is peaked up steeper than a dhow's main
      const dir = [Math.cos(th), Math.sin(th)];          // +x is AFT, so the yard rises aft
      const sling = [x, base + dir[1] * yardLen / 3];
      /* ── ⚠ THE YARD'S HEEL WAS SET TO THE DECK AT THE MAST ─────────────────────────
         A lateen yard rakes down and FORWARD; its heel ends up a third of a yard-length ahead
         of the mast, out over the rising forecastle. Taking its height from `base` — the deck
         at the mast — drove the heel through the deck on every lateen and settee hull, and on
         the dhow it finished 0.66 m under the planking and forward of the stem. The heel is
         bowsed down ONTO the deck, not through it; take the height from the deck beneath it. */
      const heelX = x - dir[0] * yardLen / 3;
      const heelU = Math.max(0, Math.min(1, heelX / L + 0.5));
      const heel = [heelX, deckMax(heelU, u) + B * 0.045];
      const peakPt = [heel[0] + dir[0] * yardLen, heel[1] + dir[1] * yardLen];

      /* the mast, drawn from the deck UP TO the sling — its height is the consequence, and it
         is SHORT, because a lateen takes its area from the spar rather than from height */
      const mh = sling[1] - base;
      const mm = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.020, B * 0.032, mh, 18), woodDark);
      mm.position.set(x, (base + sling[1]) / 2, 0);
      group.add(mm);

      const ylen = Math.hypot(peakPt[0] - heel[0], peakPt[1] - heel[1]);
      const ym = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.005, B * 0.011, ylen, 14), woodDark);
      ym.position.set((heel[0] + peakPt[0]) / 2, (heel[1] + peakPt[1]) / 2, 0);
      ym.rotation.z = -Math.atan2(peakPt[0] - heel[0], peakPt[1] - heel[1]);
      group.add(tag(ym, 'yard', 'Lateen yard'));

      /* The CANVAS starts at the stemhead, not at the heel: the projecting part of the yard is
         bare spar, and the tack is bowsed down to the stem. So the sail's tack is the point
         where the yard crosses over the stemhead — or the heel itself, on the after masts,
         whose shorter yards do not overhang. */
      const xStem = -0.455 * L;
      const along = Math.max(0, Math.min(yardLen * 0.5, (xStem - heel[0]) / dir[0]));
      const tack = [heel[0] + dir[0] * along, heel[1] + dir[1] * along];

      /* the clew is sheeted aft along the deck; a settee foot runs about 0.62 of its head */
      /* the clew is sheeted aft along the deck; a settee foot runs about 0.62 of its head.
         Its height comes from the deck UNDER IT, not from the deck at the mast. */
      const clewX = tack[0] + yardLen * 0.62;
      const clewU = Math.max(0, Math.min(1, clewX / L + 0.5));
      const clew = [clewX, deckMax(u, clewU) + Math.max(H.sheer(0.5) * 0.10, B * 0.10)];
      /* ── ⚠ A SETTEE IS NOT A TRIANGLE, AND THIS COMMENT KNEW IT BEFORE THE CODE DID ────
         The line above has said "a settee foot" since it was written, while the code below
         built a lateen — one triangle, tack to peak to clew. They are different sails. A
         settee is a QUADRILATERAL: the lateen's forward point is cut off, leaving a short
         luff between the tack and a throat some way up the yard, while the yard still rakes
         just as steeply. It is the characteristic sail of the dhow and of most of the
         Mediterranean and Indian Ocean craft that get called lateen-rigged loosely.
         The cut-off shows: the sail no longer runs to a needle point at the stemhead, and
         there is far less useless cloth down where the wind is slowest and the spar is
         hardest to control. Built as two triangles on the diagonal, the same way the gaff
         quadrilateral above is built, so it shares that geometry rather than inventing one. */
      if (S.settee) {
        /* ⚠ The first attempt put the throat on the line from tack to peak, which is the YARD:
           a lateen's luff IS its yard, so tack, throat and peak were collinear, the forward
           triangle had zero area, and the after one was the original lateen exactly. The render
           was correctly unchanged and the data, the code and the served files all checked out —
           only looking at the sail found it.
           Truncating a corner takes TWO new points, one along each edge that meets there. The
           cut is at the TACK, where the luff (up the yard) meets the foot (aft to the clew). */
        const throat = [tack[0] + (peakPt[0] - tack[0]) * S.settee,
                        tack[1] + (peakPt[1] - tack[1]) * S.settee];
        const foreft = [tack[0] + (clew[0] - tack[0]) * S.settee * 0.55,
                        tack[1] + (clew[1] - tack[1]) * S.settee * 0.55];
        sails.push(makeTriSail(foreft, throat, peakPt, group, 0.055));
        sails.push(makeTriSail(foreft, peakPt, clew, group, 0.055));
      } else {
        sails.push(makeTriSail(tack, peakPt, clew, group, 0.055));
      }
    }
    if (mk.rig === 'crabclaw') {
      /* Same rule, independently attested in the Pacific. Pâris on the Tongan kalia: the sail
         "is always the same length as the boat"; on the Caroline proa: "a triangular mat as long
         as the proa". Layard's Vanuatu field notes: "each spar is carefully measured to equal
         in its length the length of the canoe between the inner ends of the bow-pieces." Pâris
         also notes Fijian canoes carry LESS sail "the yards not being as long as the hull,
         which makes the mast rake more" — so the rule is diagnostic, not decorative. */
      /* ⚠ The two spars used to CONVERGE AT THE TOP and spread at the foot — an inverted V,
         which is the one shape a crab claw is not. Both spars radiate from a single TACK,
         hauled down forward, and open upward and aft. The sail is the triangle between them,
         and it is built from the spars' own endpoints so it cannot come adrift of either. */
      /* ── TWO SOURCES THAT DO NOT AGREE, AND WHICH ONE THIS SHIP IS ────────────────
         Pâris (1841) on the Tongan kalia: the sail "is always the same length as the boat" —
         and the kalia was a very large double canoe. Hōkūleʻa, which is the vessel this card
         is actually about (its own rows give "Hōkūleʻa 19.0 m" and "~50 m², two crab claws"),
         carries far less: 25 m² a side. Hull-length spars would give her 104 m² of straight
         triangle, four times what is recorded.
         So the spar is SOLVED from the attested area rather than asserted from the rule, and
         the rule is kept where it belongs — on the kalia, not on a modern reconstruction of a
         Hawaiian voyaging canoe. `sailAreaEach` is the input; the spar falls out of it. */
      const spread = 1.19 - 0.46;                       // the angle the two spars open to
      const LEECH = 0.640;                              // area factor of the hollow leech at pull 0.46
      const sparLen = S.sailAreaEach
        ? Math.sqrt(2 * S.sailAreaEach / (Math.sin(spread) * LEECH))
        : L * 0.98;
      const tack = [x - L * 0.22, base];
      const tipY = [tack[0] + Math.cos(1.19) * sparLen, tack[1] + Math.sin(1.19) * sparLen];
      const tipB = [tack[0] + Math.cos(0.46) * sparLen, tack[1] + Math.sin(0.46) * sparLen];
      [[tipY, 'Yard'], [tipB, 'Boom']].forEach(([tip, nm]) => {
        const len2 = Math.hypot(tip[0] - tack[0], tip[1] - tack[1]);
        const g2 = new THREE.CylinderGeometry(B * 0.007, B * 0.014, len2, 14);
        const m2 = new THREE.Mesh(g2, woodDark);
        m2.position.set((tack[0] + tip[0]) / 2, (tack[1] + tip[1]) / 2, 0);
        m2.rotation.z = -Math.atan2(tip[0] - tack[0], tip[1] - tack[1]);
        group.add(tag(m2, 'yard', nm));
      });
      /* the leech of a crab claw is CONCAVE, which is most of why it looks like a claw and
         also why it works: the deeply raked tips shed tip vortices and it out-performs a
         triangle of the same area on a reach (Marchaj's tunnel tests on the Pacific rigs) */
      sails.push(makeTriSail(tack, tipY, tipB, group, 0.075, S.leechPull || 0.46));
    }
    if (mk.rig === 'gaff') {
      /* ── THE GAFF SCHOONER ─────────────────────────────────────────
         A quadrilateral fore-and-aft sail set between a BOOM along the deck and a GAFF angled
         up from the mast. It is the rig that made the big American schooners possible, and the
         reason is crew: a gaff sail is handled entirely from the deck. Nobody goes aloft to
         reef it. Wyoming carried 3,730 tons on six masts with a crew of THIRTEEN, where a
         square-rigged ship of that tonnage wanted thirty or more — and that ratio, not speed,
         is why the American coal and lumber trades went to schooners. */
      /* ── ⚠ A BOOM CANNOT REACH THE MAST BEHIND IT ──────────────────
         boomL was a fraction of MAST HEIGHT with no reference to what is astern of it, so on
         a six-masted schooner — Great Eastern, Wyoming, Preussen — every boom ran straight
         through the next mast, and through any funnel standing in the gap. That is what was
         cutting the sails into the pipes. The constraint is physical and absolute: a
         fore-and-aft sail swings about its own mast and must clear the next one, which is
         precisely why schooner booms get shorter as you add masts. Only the aftermost boom
         may overhang, and it overhangs the STERN, where there is nothing to hit. */
      /* 0.78 rather than 0.86: a boom needs room to swing, and the clearance it needs is to
         the FACE of the obstruction, not to its centreline. */
      const boomL = Math.max(lower * 0.16, Math.min(lower * 0.62, gapAft * 0.78));
      const gaffL = Math.min(lower * 0.42, boomL * 0.72);
      const peak = 0.62;                                 // the gaff's angle above horizontal
      const footY = base + lower * 0.11;
      const bm2 = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.012, B * 0.016, boomL, 14), woodDark);
      bm2.rotation.z = Math.PI / 2;
      bm2.position.set(x + boomL / 2, footY, 0);
      group.add(tag(bm2, 'yard', 'Boom'));
      const gy = base + lower * 0.86;
      const gm = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.008, B * 0.012, gaffL, 14), woodDark);
      gm.rotation.z = -(Math.PI / 2 - peak);
      gm.position.set(x + Math.cos(peak) * gaffL / 2, gy + Math.sin(peak) * gaffL / 2, 0);
      group.add(tag(gm, 'yard', 'Gaff'));
      /* the sail is the quadrilateral: throat, peak, clew, tack — built from the two spars'
         own endpoints so it cannot come adrift of either */
      const throat = [x, gy], peakPt = [x + Math.cos(peak) * gaffL, gy + Math.sin(peak) * gaffL];
      const tack = [x, footY], clew = [x + boomL, footY];
      sails.push(makeTriSail(tack, throat, peakPt, group, 0.045, 1.0));
      sails.push(makeTriSail(tack, peakPt, clew, group, 0.045, 1.0));
    }
    if (mk.rig === 'junk') {
      /* ── THE BATTENED LUG, to Reddish's measured average ────────────
         Vincent Reddish scaled and averaged ELEVEN photographs of Chinese ocean-trading junks
         under sail and published the proportions (*Practical Boat Owner*, 2022): usually FIVE
         battens, rarely six; boom and battens all equal within 5%; the luff and the yard both
         two thirds of the boom; total leech 1.75 x boom; sail area 1.10 x boom²; aspect ratio
         1.1; and only 8% of the sail's width carried forward of the mast.
         That 8% balance is the number to keep — modern junk rigs run 10–15% and split rigs a
         third, but the traditional ocean junk is nearly all abaft its mast. */
      const boom = lower * 0.78;
      const sailW = boom, sailH = boom * 1.10;      // area 1.10 x boom², AR 1.1
      const nb = 5;
      /* 8% of the chord forward of the mast — the sail sits almost entirely abaft it */
      const off = sailW * (0.5 - 0.08);
      /* ⚠ TWO ERRORS LIVED HERE AND BOTH WERE VISIBLE FROM ACROSS THE ROOM.
         (1) A battened lug is a FORE-AND-AFT sail. Battens and canvas were both rotated
             athwartships — the whole sail stood across the beam like a square course, so it
             cut straight through the hull it was supposed to drive.
         (2) The canvas was positioned by its CENTRE at deck level, so half of it hung below
             the waterline. The battens, computed separately, were in the right place — which
             is exactly how the two disagreed. One number, used twice, is the fix. */
      const footY = base + lower * 0.14;             // the boom lies just above the deck
      /* ── ⚠ A BATTEN IS IN THE SAIL, NOT NEAR IT. ──────────────────────────────────────
         The canvas was sheeted out to leeward about its mast and the battens were left where
         they had been built — amidships, along the hull. A lug sail swung 29 degrees and then
         translated along its own axis puts its centre nearly half a sail-width to leeward of
         spars that never moved, so five straight rods stood out over open water with no cloth
         on them. The battens are sewn into pockets ACROSS the sail; they are the one part of a
         junk rig that cannot possibly be somewhere else. So the whole sail — boom, battens,
         yard and canvas — is one group hung on the mast, and sheeting it is a single rotation
         of that group. Nothing in it can now disagree with anything else in it. */
      const lug = new THREE.Group();
      lug.position.set(x, 0, 0);
      lug.rotation.y = -TRIM * 1.5;
      group.add(lug);
      for (let i = 0; i <= nb; i++) {
        const yy = footY + sailH * (i / nb);
        const bg = new THREE.CylinderGeometry(B * 0.004, B * 0.004, sailW, 14);
        const bm = new THREE.Mesh(bg, woodDark);
        bm.rotation.z = Math.PI / 2;                 // along the sail's chord, not across it
        bm.position.set(off, yy, 0);
        lug.add(tag(bm, 'yard', i === 0 ? 'Boom' : (i === nb ? 'Yard' : 'Batten ' + i)));
      }
      const js = makeSail(off, footY + sailH, sailW, sailH, canvas, lug, 'junk');
      sails.push(js);
    }

    /* standing rigging: shrouds from the channels out on the hull's side up to the masthead,
       rattled down with ratlines at THIRTEEN INCHES — Steel 1794 states it outright: "Each
       ratling is placed thirteen inches asunder." Lees gives 13–15 in across all cases and
       the Anatomy of Nelson's Ships gives 13 for Victory. The 14–16 in commonly used by
       modellers is looser practice, not a documented rule. */
    if (mk.shrouds) {
      const half = H.halfB * H.wl(u) * (1 - H.tumble(u));
      const topY = base + lower * 0.97;
      const shroudPts = [[], []];
      const shroudSegs = [], ratSegs = [];
      for (let s = 0; s < mk.shrouds; s++) {
        const f = (s + 1) / (mk.shrouds + 1);
        const chX = x + (f - 0.5) * L * 0.055;
        [1, -1].forEach((side, si2) => {
          const a = new THREE.Vector3(chX, base, side * half * 1.06);
          const b = new THREE.Vector3(x + Math.sin(rakeRad) * lower, topY, side * B * 0.03);
          shroudSegs.push([a, b]);
          shroudPts[si2].push([a, b]);
        });
      }
      /* a main shroud is about 4½ inches in circumference — call it 36 mm of rope */
      const shr = ropeMesh(shroudSegs, 0.018 + B * 0.0009, ropeMat);
      if (shr) group.add(tag(shr, 'shroud'));

      /* ── ⚠ RATLINES ARE NOT A UNIVERSAL FITTING ────────────────────────────────────
         They were rattled down on every set of shrouds regardless of rig, which put a rope
         LADDER up the mast of a Pacific voyaging canoe, a dhow and a junk. A ratline exists
         so hands can go aloft to work square sails on yards. A crab claw, a settee, a lug
         and a gaff are all worked FROM THE DECK — that is the whole point of them, and it is
         the reason Wyoming carried 3,730 tons with a crew of thirteen. Nobody climbed these
         rigs, so nobody built a ladder up them. The shrouds stay; they are real. */
      const RAT = 0.3302;                                  // thirteen inches, in metres
      if (mk.rig === 'square') shroudPts.forEach(side => {
        if (side.length < 2) return;
        const rise = topY - base;
        for (let h = RAT; h < rise * 0.86; h += RAT) {
          const t = h / rise;
          const pts = side.map(([a, b]) => new THREE.Vector3(
            a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t));
          for (let i = 0; i < pts.length - 1; i++) ratSegs.push([pts[i], pts[i + 1]]);
        }
      });
      /* Ratline stuff is 6–9 mm rope, but it is SERVED — wound with spun yarn against chafe —
         and the served line is two to three times the core. 34 mm is the served diameter, and it
         is also the point at which a ladder 24 m away stops being sub-pixel and starts being a
         ladder. Both facts happen to agree; where they had not, the physical one would win and
         the ratlines would simply be faint. */
      const rats = ropeMesh(ratSegs, 0.017 + B * 0.0006, ropeMat);
      if (rats) group.add(tag(rats, 'ratline'));
    }
  });

  /* bowsprit — steeved up at an angle, and on a large ship it carries its own sail */
  if (S.bowsprit) {
    const u0 = 0.02;
    const x0 = -L / 2 + H.rake(u0);
    const len = L * S.bowsprit;
    const steeve = (S.steeve || 22) * Math.PI / 180;
    const bg = new THREE.CylinderGeometry(B * 0.010, B * 0.020, len, 16);
    const bm = new THREE.Mesh(bg, woodDark);
    bm.rotation.z = Math.PI / 2 - steeve;
    bm.position.set(x0 - Math.cos(steeve) * len / 2,
                    deckAt(u0) + Math.sin(steeve) * len / 2, 0);
    group.add(tag(bm, 'bowsprit'));
  }

  S.__spars = spars; S.__mastTops = mastTops;
  return sails;
}

/* ── SAILCLOTH ────────────────────────────────────────────────────────────────────────
 * Canvas came in bolts 24 inches wide — a standard enacted in 1746 and unchanged for a
 * century — so a sail is a set of 24-inch panels seamed edge to edge, running parallel to the
 * leech. That panel pitch is the single most recognisable thing about a real sail at any
 * distance, and a smooth white quad has none of it.
 *
 * Flax canvas is not white either. It is a warm oatmeal that greys and stains with weather;
 * HMS Victory's topsails were No. 1 canvas, the heaviest of the sixteen grades.
 */
const SAIL_VERT = SHADERS['SAIL_VERT.vert'];

const SAIL_FRAG = SHADERS['SAIL_FRAG.frag'];

/* A sail is a bellied surface, not a flat quad: it takes the shape the wind puts in it, and
   that curve is most of what makes a ship under sail look alive rather than papery. */
function makeSail(x, yTop, width, height, mat, group, kind, trim) {
  /* ── A SAIL IS NOT A RECTANGLE WITH A BULGE IN IT ────────────────────────────────────
     The first version was a PlaneGeometry with a symmetric hump pushed out of the middle, and
     it read as exactly that: a flat card, bent. Three things are wrong with it, and all three
     are visible from across the room.

     THE OUTLINE. A square sail's head is straight because it is laced to a rigid yard — but
     nothing else about it is. The FOOT is cut with a ROACH, an upward curve in the middle, so
     it clears the stay below it and does not chafe; and the leeches are cut slightly hollow so
     they set flat instead of curling. A perfectly rectangular sail is a sailmaker's failure.

     THE DRAFT IS NOT IN THE MIDDLE. Maximum belly sits about 40% of the chord aft of the luff,
     not at 50%: that is what makes a sail an aerofoil rather than a bag, and it is the whole
     reason a square-rigger can sail across the wind at all.

     AND IT IS DEEPER AT THE FOOT THAN AT THE HEAD, because the head is stretched along a spar
     and the foot is held only at its two corners. That taper is most of a sail's shape.  */
  const NW = 28, NH = 20;
  const pos = [], uvs = [], idx = [];
  const roach = kind === 'square' ? 0.085 : 0.03;     // the foot's upward cut
  const hollow = 0.022;                                // the leeches' inward cut
  for (let i = 0; i <= NW; i++) {
    const u = i / NW;                                  // 0 = one leech, 1 = the other
    const arch = Math.sin(Math.PI * u);
    /* ⚠ `hollow` was declared, documented, and multiplied by 0.0 in both places it was used —
       wired but unset, the same class as `shellFirst`. The leeches of a square sail ARE cut
       hollow so the cloth does not curl and chafe on the shrouds, and it is visible: the two
       side edges bow inward instead of running dead straight. */
    const xw = (u - 0.5) * width * (1 - hollow * arch * 0.55);
    const footY = -height + roach * height * arch;     // the roach lifts the middle of the foot
    for (let j = 0; j <= NH; j++) {
      const v = j / NH;                                // 0 = head, 1 = foot
      const y = footY * v;                               // (the second `* 0.0` term went with it)
      /* draft: peak 40% aft of the luff, growing from head to foot */
      const chord = Math.pow(arch, 0.72) * (1.0 + 0.30 * Math.cos(Math.PI * (u - 0.40)));
      const depth = width * 0.115 * (0.35 + 0.65 * Math.pow(v, 0.75));
      let z = Math.max(0, chord) * depth;

      /* ── WHAT MAKES CLOTH LOOK LIKE CLOTH ─────────────────────────────────────────
         A sail is not a smooth shell. It is a limp sheet held at a few points, and every
         one of those points shows.

         WRINKLES RADIATE FROM THE CORNERS. All the load in a square sail arrives through
         the two clews and the bolt rope; the cloth between them is slack, so it creases in
         fans running diagonally inward from each corner. That fan is the single most
         recognisable thing about real canvas and no amount of smooth curvature substitutes
         for it.

         AND IT SAGS BETWEEN ITS FASTENINGS. The head is laced to the yard at intervals, not
         continuously, so it scallops between the robands — a row of shallow bights along the
         top edge that says "tied on" rather than "welded to". */
      const cx = Math.min(u, 1 - u) * 2.0;              // 0 at a leech, 1 amidships
      const cy = v;
      const corner = Math.exp(-cx * 3.4) * Math.exp(-Math.abs(cy - 1.0) * 2.2)
                   + Math.exp(-cx * 3.4) * Math.exp(-cy * 3.0);
      const crease = Math.sin((u * 9.0 + v * 5.0) * Math.PI) * corner * width * 0.016;
      const roband = Math.sin(u * Math.PI * (NW / 3)) * Math.exp(-v * 14.0) * width * 0.008;
      /* slack cloth low down luffs a little; taut cloth at the head does not */
      const slack = Math.sin(u * Math.PI * 5.0 + v * 7.0) * Math.pow(v, 2.0) * width * 0.010;
      z += crease + roband + slack;
      pos.push(xw, y, z);
      uvs.push(u, v);
    }
  }
  const row = NH + 1;
  for (let i = 0; i < NW; i++)
    for (let j = 0; j < NH; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  /* 0.61 m = the 24-inch bolt. A 30 m course therefore carries about 49 cloths. */
  const sailMat = new THREE.ShaderMaterial({
    vertexShader: SAIL_VERT, fragmentShader: SAIL_FRAG, side: THREE.DoubleSide,
    uniforms: { uPanels: { value: Math.max(4, Math.round(width / 0.61)) },
                uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
  });
  const m = new THREE.Mesh(g, sailMat);
  m.position.set(x, yTop, 0);
  /* ⚠ Square sails hang ACROSS the ship; lug, lateen and gaff sails lie ALONG it. This
     quarter-turn was applied unconditionally, which silently swung every fore-and-aft sail
     broadside-on. The rig type has to decide it. */
  if (kind === 'square') m.rotation.y = Math.PI / 2 + (trim || 0);
  m.userData.kind = kind;
  group.add(tag(m, 'sail'));
  return m;
}


/* ── A TRIANGULAR SAIL, BUILT FROM ITS THREE CORNERS ───────────────────────────────────
   A lateen, a settee and a crab-claw are TRIANGLES. The first version hung a rectangular
   PlaneGeometry near the yard and rotated it, which is why the dhow's canvas floated off the
   side of the hull: a rectangle has four corners and the spar has two ends, so there is no
   placement that makes them agree. The honest object is the triangle itself —

       A   the TACK, hauled down to the stemhead
       B   the PEAK, the upper end of the yard
       C   the CLEW, sheeted aft

   — and the head A->B is the yard, so the sail is built from the SAME two points as the spar
   and cannot come adrift of it. That is the whole fix: not an offset, a shape.

   Draft is a bubble that vanishes on all three edges, because all three are bolt-roped. */
function makeTriSail(A, B, C, group, belly, leechPull) {
  /* 18 could not resolve a corner crease or a scalloped luff — the detail existed in the
     function and died in the tessellation. 30 costs ~2.8x the triangles on sails that are a
     small fraction of a ship's geometry. */
  const N = 30, pos = [], uvs = [], idx = [];
  const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  const head = Math.hypot(B[0] - A[0], B[1] - A[1]);
  /* ── THE CONCAVE LEECH ─────────────────────────────────────────────────────────────
     A lateen's leech is straight; a CRAB CLAW's is cut deeply hollow, and that hollow is
     not decoration — it is the whole reconciliation between two attested facts that look
     contradictory. Pâris says the spars equal the length of the hull (19 m on Hōkūleʻa);
     the sail area is recorded at ~50 m² for the pair, so ~25 m² each. A straight-edged
     triangle on 19 m spars is 104 m² — four times too much. Hollow the leech and the same
     spars carry the attested area, which is exactly why the rig looks like a claw.
     Marchaj's tunnel work then explains why anyone would cut a sail away like that: the
     raked tips shed their vortices span-wise and it out-lifts a triangle of equal area. */
  const pull = leechPull === undefined ? 1.0 : leechPull;
  const ctrl = [A[0] + ((B[0] + C[0]) / 2 - A[0]) * pull,
                A[1] + ((B[1] + C[1]) / 2 - A[1]) * pull];
  /* ── ⚠ THE OLD BELLY WAS A DRUM SKIN ───────────────────────────────────────────────
     16 * sA(1-sA) * t(1-t) is the product of two parabolas, so it fell to ZERO ON EVERY
     EDGE — a membrane stretched on a rigid frame. A triangular sail is attached on ONE
     side. The luff is laced to the yard and is straight and hard; the LEECH is free
     between peak and clew and is held by nothing at all, so it is the edge that moves
     most. Pinning it flat is why these read as cardboard cut-outs.
     In this fan parameterisation sA runs 0 at the luff (on the yard) to 1 at the foot,
     and t runs 0 at the tack out to 1 at the free leech. So: */
  const DEPTH = 1.15;                                   // rebalances the new profile to the old peak
  for (let i = 0; i <= N; i++) {
    const sA = i / N;                                   // luff (on the yard) -> foot
    /* the free edge is a quadratic Bezier from peak to clew, bowed in toward the tack */
    const w = [(1 - sA) * (1 - sA) * B[0] + 2 * sA * (1 - sA) * ctrl[0] + sA * sA * C[0],
               (1 - sA) * (1 - sA) * B[1] + 2 * sA * (1 - sA) * ctrl[1] + sA * sA * C[1]];
    const Hd = w;
    /* Spanwise: zero on the yard and at the foot, which are the two attached edges, and
       full between them. This is what keeps the three corners pinned where the spars and
       the sheet actually hold them. */
    const span = Math.sin(Math.PI * Math.pow(sA, 0.62));
    for (let j = 0; j <= N; j++) {
      const t = 1 - j / N;                              // leech -> tack
      const P = lerp(A, Hd, t);
      /* DRAFT IS NOT DEEPEST AT MID-CHORD. On a sail under load it sits about 38–40% aft
         of the luff, which is where the old symmetric term put it only by accident of
         being symmetric. Here it is put there on purpose. */
      const draft = Math.sin(Math.PI * Math.pow(t, 0.72));
      /* AND THE FREE LEECH SAGS AND TWISTS. It falls away to leeward, and it falls away
         MORE ALOFT than it does low down, because the wind is stronger up there and there
         is nothing above the peak holding it. On a lateen's long leech that twist is the
         most recognisable thing about the sail at sea. */
      const sag = Math.pow(t, 2.2) * (0.55 + 0.80 * Math.pow(1 - sA, 1.4));
      const prof = draft * 0.82 + sag * 0.40;
      let z = prof * span * head * belly * DEPTH;
      /* Load enters a triangular sail at THREE POINTS and nowhere else, so the cloth
         creases in fans running inward from the tack, the peak and the clew. */
      const dA = t, dB = Math.hypot(sA, 1 - t), dC = Math.hypot(1 - sA, 1 - t);
      const corner = Math.exp(-dA * 3.0) + Math.exp(-dB * 3.4) + Math.exp(-dC * 3.4);
      z += Math.sin((sA * 7.0 + t * 11.0) * Math.PI) * corner * head * 0.016;
      /* the luff is laced to the yard at intervals, so it scallops between the lacings */
      z += Math.sin(t * Math.PI * 9.0) * Math.exp(-sA * 14.0) * head * 0.011;
      /* a loose foot does the same between tack and clew */
      z += Math.sin(t * Math.PI * 5.0) * Math.exp(-(1 - sA) * 10.0) * head * 0.009;
      /* and cloth is never taut everywhere at once */
      z += Math.sin(sA * 9.0 + t * 6.0) * span * Math.pow(t, 1.5) * head * 0.011;
      pos.push(P[0], P[1], z);
      /* uv.x = sA so the panel seams run from the yard down to the foot, which is how a
         lateen is cut; uv.y = t puts the shader's weathering gradient on the LEECH, the
         edge that flogs, is handled at every reef, and is genuinely the dirtiest. */
      uvs.push(sA, t);
    }
  }
  const row = N + 1;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    vertexShader: SAIL_VERT, fragmentShader: SAIL_FRAG, side: THREE.DoubleSide,
    uniforms: { uPanels: { value: Math.max(4, Math.round(head / 0.61)) },
                uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
  }));
  m.userData.kind = 'tri';
  group.add(tag(m, 'sail'));
  return m;
}


/* ── THE PARTS OF A SHIP ───────────────────────────────────────────────────────────────
 * Every mesh the generator makes carries its own name, its job, and the stage of building at
 * which it appears. That is what turns a rendered hull into something you can take apart:
 * the Shipwright does not hold a separate list of labels that could drift out of step with
 * the geometry — it reads the geometry's own tags.
 *
 * `stage` is the order of construction for a FRAME-FIRST (carvel) ship. Shell-first clinker
 * hulls swap 1 and 2, and the vessel's own card says which tradition it belongs to.
 */
const PARTS = {
  boat:     { stage: 6, name: "Ship's boat",
              what: 'Stowed under curved davits on the boat deck. The davits curve because the '
                  + 'boat must clear a side that flares or tumbles home on the way down. The '
                  + 'NUMBER of them was set by Board of Trade rules scaling boats to tonnage '
                  + 'rather than to people, unrevised as ships grew — which is how Titanic '
                  + 'sailed legally with 20 boats for 2,224 aboard.' },
  vent:     { stage: 4, name: 'Cowl ventilator',
              what: 'Turned into the wind to drive air below decks. Before mechanical '
                  + 'ventilation, a coal-fired boiler room, a galley and several hundred people '
                  + 'all breathed through fittings like these — which is why a period deck '
                  + 'photograph looks crowded with enormous trumpets.' },
  flightdeck: { stage: 4, name: 'Flight deck',
              what: 'The one warship surface whose shape is set by something other than the sea. '
                  + 'It overhangs the hull on both sides, and the landing strip is angled to port '
                  + 'so a pilot who misses the wires flies off and goes round again.' },
  island:   { stage: 4, name: 'The island',
              what: 'Everything that cannot go under the flight deck: bridge, flying control, '
                  + 'uptakes and radar. Small, and to starboard, because a going-around aircraft '
                  + 'swings to port.' },
  turret:   { stage: 4, name: 'Main battery',
              what: 'The turret revolves on a barbette — an armoured cylinder running down to the '
                  + 'magazine. Mounted on the centreline and superfiring, one raised behind '
                  + 'another, so both can bear ahead.' },
  /* ── the uncrewed vessel ─────────────────────────────────────────────────────────────
     Its parts have no older equivalent, which is the point of them: everything here exists
     because there is nobody aboard to do the job by hand. */
  wing:     { stage: 6, name: 'Wing sail',
              what: 'A rigid aerofoil in place of canvas. Nothing to sheet, nothing to reef and '
                  + 'nothing to tear, which is what lets the vessel sail for months uncrewed. '
                  + 'The tail vane behind it works as a weathervane: the wing pivots freely and '
                  + 'the tail holds it at a set angle to the apparent wind, so it finds and '
                  + 'keeps its own trim through every windshift.' },
  solar:    { stage: 6, name: 'Solar array',
              what: 'Power for the instruments, the computer and the satellite link. With wind '
                  + 'for propulsion and sun for electricity, the endurance limit stops being '
                  + 'fuel or food and becomes fouling and machinery.' },
  sensor:   { stage: 6, name: 'Instrument mast',
              what: 'Anemometer, satellite antenna and cameras above; echo sounders and a CTD '
                  + 'below the waterline. The cargo of this vessel is data.' },
  keel:     { stage: 0, name: 'Keel',
              what: 'The backbone: one continuous timber from stem to sternpost, and the first '
                  + 'thing laid down. Everything else is measured from it. Its depth below the '
                  + 'planking also resists leeway — a hull without one slides sideways.' },
  stempost: { stage: 0, name: 'Stem and sternpost',
              what: 'The curved timbers rising from each end of the keel. The rake of the stem '
                  + 'is one of the strongest signals of period and of where a ship was built.' },
  frames:   { stage: 1, name: 'Frames',
              what: 'The ribs. Each is a composite of several curved timbers scarfed together, '
                  + 'raised on the keel at a fixed interval called the room and space. In a '
                  + 'carvel ship these decide the shape BEFORE any plank is cut.' },
  planking: { stage: 2, name: 'Planking',
              what: 'The skin. In carvel work the planks meet edge to edge on the frames and the '
                  + 'seams are caulked; in clinker work they overlap and are riveted to each '
                  + 'other, and the shell is built first. Carvel can be scaled up; clinker cannot.' },
  crossbeam:{ stage: 3, name: 'Crossbeams',
              what: 'The lashed beams that tie the two hulls into one vessel. They are lashed, '
                  + 'not fastened rigid, on purpose: the joint has to WORK in a seaway, and a '
                  + 'rigid one would tear the hulls apart. Coir lashing can be re-served at sea; '
                  + 'a broken iron bolt cannot.' },
  platform: { stage: 3, name: 'Platform',
              what: 'The deck between the hulls, and the only flat space aboard. It carries the '
                  + 'crew, the water, the fire hearth, the breeding pigs and the seed stock — '
                  + 'and it is what made the Pacific settleable rather than merely crossable.' },
  container:{ stage: 3, name: 'Containers',
              what: 'The cargo IS the architecture. Eight feet by eight foot six by twenty or '
                  + 'forty, with corner castings identical everywhere on earth since 1968 — and '
                  + 'that standard, not the ship, is the invention. The hull is a rack built to '
                  + 'fit it. Loading a break-bulk freighter took a gang of dockers several days; '
                  + 'the same tonnage in boxes takes hours.' },
  superstructure: { stage: 3, name: 'Superstructure',
              what: 'On a passenger ship the HULL is the smaller half. Titanic\'s boat deck stands '
                  + '19 m above the waterline and the accommodation below it is most of what she '
                  + 'is — 46,328 tons of which comparatively little is hold. Each tier steps in '
                  + 'fore and aft, because the decks must taper as the hull does and because a '
                  + 'stepped profile sheds the wind that a slab would catch.' },
  bridge:   { stage: 3, name: 'Accommodation and bridge',
              what: 'Pushed to one end so nothing blocks the crane runs. The bridge has to see '
                  + 'over a stack that may be twelve boxes high, which is why it stands where it '
                  + 'does — and why the newest ships have moved it FORWARD of the boxes instead.' },
  paddle:   { stage: 4, name: 'Paddle wheels',
              what: 'Great Eastern\'s are 17 m across — taller than a house. She carried a 7.3 m '
                  + 'SCREW as well, and that is why she is such an odd ship: paddles are '
                  + 'efficient in smooth water and useless the moment a roll lifts one clear, a '
                  + 'screw works in any sea but was unproven at that size, so Brunel fitted both '
                  + 'and let them share the work.' },
  oar:      { stage: 4, name: 'Oars',
              what: 'The sail is for fair winds; the OARS are what she is. A trireme pulls 170 '
                  + 'of them on three levels, and the whole hull exists to hold them at the '
                  + 'right height above the water — which is why she is 37 m long, 3.8 m wide '
                  + 'at the waterline, and carries almost no cargo. The outrigger takes the top '
                  + 'bank outboard, and is why her famous 5.5 m beam is measured over the '
                  + 'outriggers rather than over the planking.' },
  anchor:   { stage: 3, name: 'Bower anchor',
              what: 'A 74\'s best bower weighs about 3.7 tonnes, and half the machinery in her '
                  + 'bow exists to move it: cathead, fish davit, capstan, and a 24-inch cable too '
                  + 'thick to pass round the capstan at all — it has to be nipped to a lighter '
                  + 'messenger line. The STOCK is set at right angles to the arms, and that 90° '
                  + 'is the whole invention: it rolls the anchor over until a fluke bites. '
                  + 'Without it the thing lies flat and drags.' },
  head:     { stage: 4, name: 'Head and beakhead',
              what: 'A working platform carried out beyond the stem, and the rails that sweep up '
                  + 'to it are STRUCTURE, not ornament: they stay the bowsprit sideways against '
                  + "the forestays' pull, which is the load that would otherwise tear it out of "
                  + 'the ship. The gammoning lashes it down to the stem. And the crew\'s heads '
                  + 'were out here, over the water, which is where the word comes from.' },
  transom:  { stage: 2, name: 'Transom',
              what: 'The square tuck closing the hull across the stern above the waterline. It '
                  + 'flares as it rises, so a square-sterned ship is widest at her taffrail — '
                  + 'which is also what gives her the flat canvas for a stern that could be '
                  + 'recognised at a mile.' },
  sternlight:{ stage: 3, name: 'Stern lights',
              what: 'The great windows across the transom, and the only real glazing in the ship. '
                  + 'Everywhere else light comes through a gunport or a grating, so the captain\'s '
                  + 'cabin is the one place aboard you can read without a candle.' },
  gallery:  { stage: 3, name: 'Quarter galleries',
              what: 'Cantilevered out at the after corners, where the hull has narrowed to nothing '
                  + 'and there is no side left to put a window in. Light and air for the officers '
                  + '— and the ship\'s only private necessary house.' },
  funnel:   { stage: 3, name: 'Funnel',
              what: 'Not decoration and not arbitrary: its HEIGHT is set by the draught a boiler '
                  + 'needs, because the taller the stack the harder it pulls air through the '
                  + 'grate. That is why early steamers carry a funnel out of all proportion to '
                  + 'the ship, and why forced draught later let them shrink. The rig alongside '
                  + 'is not vestigial either — until compound engines cut coal consumption '
                  + 'threefold, sail is what got you home when the bunkers ran dry.' },
  gun:      { stage: 3, name: 'Great guns',
              what: 'A 32-pounder is three metres long and weighs 2.7 tonnes; run out, a third '
                  + 'of the barrel stands outside the ship. They cannot be aimed — only the ship '
                  + 'can — which is the whole reason fleets learned to fight in line. And they '
                  + 'are why she fights on one tack at a time: the lee ports must stay shut or '
                  + 'she floods through them.' },
  stay:     { stage: 5, name: 'Stays and backstays',
              what: 'Standing rigging in the fore-and-aft plane. Stays run FORWARD from each '
                  + 'masthead and stop it falling aft; backstays run aft and take the forward '
                  + 'push of a following wind. The foremast stays lead to the bowsprit — which '
                  + 'is the entire reason a bowsprit exists.' },
  brace:    { stage: 6, name: 'Braces',
              what: 'Running rigging from each yard ARM, leading aft. Hauling one brace and '
                  + 'easing the other swings the yard round to meet the wind at an angle. They '
                  + 'are the reason a square-rigger can sail anything other than dead downwind.' },
  rail:     { stage: 3, name: 'Rail',
              what: 'The capping timber round the deck edge, following the sheer. It finishes '
                  + 'the tops of the frames and is what everyone aboard actually holds on to.' },
  grating:  { stage: 3, name: 'Grating',
              what: 'A lattice hatch cover. It has to be open, because the only ventilation for '
                  + 'the decks below comes through it — and it has to be strong enough to walk '
                  + 'on and to take a sea aboard. In heavy weather they were battened down under '
                  + 'tarpaulin, which is where the phrase comes from.' },
  capstan:  { stage: 3, name: 'Capstan',
              what: 'A vertical winch turned by bars. It is the machine that makes a big ship '
                  + 'workable by muscle: fourteen men on the bars can weigh an anchor no gang '
                  + 'could lift, and the same drum warps the ship, hoists yards and heaves guns.' },
  boat:     { stage: 3, name: "Ship's boat",
              what: 'Stowed on the beams amidships. It is the tender, the anchor-laying boat, '
                  + 'the water carrier — and the only thing between the crew and the sea if the '
                  + 'ship is lost. Bligh sailed one 6,700 km after the Bounty mutiny.' },
  top:      { stage: 4, name: 'Top',
              what: 'The platform at the head of the lower mast, carried on trestletrees and '
                  + 'crosstrees. It spreads the topmast shrouds — giving the upper mast a wide '
                  + 'enough base to be stayed at all — and doubles as a fighting platform for '
                  + 'musketeers. Nelson was shot by a man in one.' },
  deadeye:  { stage: 5, name: 'Deadeyes',
              what: 'Blocks with three holes, in pairs, rove with lanyards. They are how a shroud '
                  + 'is SET UP: hemp stretches, so standing rigging needs constant re-tensioning, '
                  + 'and a deadeye pair is a hand-powered turnbuckle you can adjust at sea.' },
  channel:  { stage: 5, name: 'Channels',
              what: 'Shelves bolted to the outside of the hull at deck level. They exist to push '
                  + 'the shrouds OUTBOARD, widening the angle at which the standing rigging '
                  + 'pulls down on the masthead. A wider base means a mast that can carry more '
                  + 'sail without being wrung out of the ship.' },
  wale:     { stage: 2, name: 'Wales',
              what: 'Thickened longitudinal strakes running the length of the hull — the girders '
                  + 'that stop a long wooden ship from hogging, drooping at the ends under its '
                  + 'own buoyancy distribution.' },
  deck:     { stage: 3, name: 'Deck',
              what: 'Not just a floor: the deck ties the two sides of the hull together against '
                  + 'the sea trying to squeeze them in, and it is the platform the guns stand on. '
                  + 'Its camber sheds water to the sides.' },
  rudder:   { stage: 3, name: 'Rudder',
              what: 'Hung on pintles down the sternpost. The stern-hung rudder reached northern '
                  + 'Europe about 1200 and replaced the steering oar; it is what let ships grow '
                  + 'beyond the size one person could steer with an oar over the quarter.' },
  mast:     { stage: 4, name: 'Mast',
              what: 'Built in stepped sections — lower mast, topmast, topgallant — each fidded '
                  + 'alongside the head of the one below through the doubling, so it can be sent '
                  + 'down in heavy weather. Steel 1794: the main mast is half the sum of the '
                  + 'lower deck length and the extreme breadth.' },
  bowsprit: { stage: 4, name: 'Bowsprit',
              what: 'A mast lying almost flat, projecting over the bow. It is what the forestays '
                  + 'lead to — without it the foremast has nothing pulling it forward, and the '
                  + 'whole rig falls aft.' },
  shroud:   { stage: 5, name: 'Shrouds',
              what: 'Standing rigging: fixed ropes from the masthead down to the channels on the '
                  + "hull's side, taking the sideways pull of the sails. Tarred against rot — "
                  + 'reddish-brown, not black; black tar is petroleum and a century too late.' },
  ratline:  { stage: 5, name: 'Ratlines',
              what: 'Light lines seized across the shrouds to make a ladder aloft. Steel 1794 '
                  + 'gives the spacing outright: thirteen inches, one comfortable rung.' },
  yard:     { stage: 6, name: 'Yard',
              what: 'The spar a square sail hangs from, slung across the mast and braced round to '
                  + 'trim the sail to the wind. Steel 1794: the main yard is seven eighths of the '
                  + 'main mast. It is octagonal amidships and tapers to two fifths at the arms.' },
  sail:     { stage: 7, name: 'Sail',
              what: 'Flax canvas, sewn from bolts twenty-four inches wide — the standard enacted '
                  + 'in 1746 — so the cloths themselves scale the sail for you. Square sails drive '
                  + 'a ship downwind; fore-and-aft sails let it work up to windward.' },
};

function tag(o, key, extra) {
  if (!o) return o;
  const P = PARTS[key];
  o.userData.part = { key, stage: P.stage, name: extra || P.name, what: P.what };
  return o;
}


/* ── DECK FURNITURE AND FITTINGS ───────────────────────────────────────────────────────
 * The difference between a hull with masts and a SHIP is almost entirely here. A ship of the
 * line's deck carried gratings over every hatch, a capstan big enough for fourteen men, boats
 * on the beams, a ladder at every change of level and a rail round the whole thing — and the
 * eye reads their absence long before it can say what is missing.
 *
 * Everything here is placed from the vessel's own dimensions and mast stations, so nothing has
 * to be positioned by hand per ship and nothing can land in the wrong place on a hull it was
 * not drawn for.
 */
function buildFittings(S, group, mats) {
  /* ⚠ THESE ARE TIMBER-SHIP FITTINGS AND THEY WERE BEING PUT ON EVERYTHING. A 400 m container
     ship was carrying wooden hatch gratings, a capstan turned by hand-spikes, wales to stop her
     hogging and a ship's boat stowed on the beams. Same failure as the carvel label: a routine
     that is right for most of the fleet, applied to all of it. Steel and iron hulls get their
     own fittings below. */
  const timberShip = !(S.build === 'iron' || S.build === 'steel');
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const deckAtU = u => H.sheer(u);
  const halfAtU = u => (H.halfB * H.wl(u)) * (1 - H.tumble(u));
  const wood = mats.woodDark, pale = mats.woodPale || mats.woodDark;

  /* ── the RAIL round the deck edge: a capping timber following the sheer ───────────── */
  {
    const pos = [], idx = [];
    const NU = 90; let base = 0;
    for (const sgn of [-1, 1]) {
      for (let i = 0; i <= NU; i++) {
        const u = 0.035 + (i / NU) * 0.93;
        const y = deckAtU(u), hb = halfAtU(u);
        const x = (u - 0.5) * L + H.rake(u);
        const r = B * 0.016;
        pos.push(x, y, sgn * (hb - r), x, y + r * 1.6, sgn * (hb - r),
                 x, y + r * 1.6, sgn * (hb + r * 0.3), x, y, sgn * (hb + r * 0.3));
      }
      for (let i = 0; i < NU; i++) {
        const a = base + i * 4, b = a + 4;
        for (let f = 0; f < 4; f++) {
          const c = (f + 1) % 4;
          idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
        }
      }
      base += (NU + 1) * 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    group.add(tag(new THREE.Mesh(g, pale), 'rail'));
  }

  /* ── HATCH GRATINGS: a lattice, because that is what they are ─────────────────────── */
  /* ── A GRATING IS A HALVING JOINT, NOT A STACK OF STICKS ───────────────────────────
     The battens were two crossed layers sitting on top of each other, which is a trellis. A
     real grating is made of ledges notched HALF THROUGH so the two sets interlock flush into
     one board — that is what makes it strong enough to walk on and to take a sea aboard, and
     it is why the holes are square-edged and the surface is flat rather than corrugated. Both
     sets now sit at the same height and the openings are the square holes between them. */
  const gratingAt = (u, w, l) => {
    const gg = new THREE.Group();
    const y = deckAtU(u) + B * 0.004;
    const x = (u - 0.5) * L;
    const t = B * 0.013;                                // the ledge, and the notch is half of it
    const pitch = B * 0.042;
    const nz = Math.max(3, Math.round(w / pitch));
    const nx = Math.max(3, Math.round(l / pitch));
    for (let i = 0; i < nz; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(l, t, t * 0.62), wood);
      bar.position.set(x, y + t / 2, -w / 2 + (i + 0.5) * (w / nz));
      gg.add(bar);
    }
    for (let i = 0; i < nx; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(t * 0.62, t, w), wood);
      bar.position.set(x - l / 2 + (i + 0.5) * (l / nx), y + t / 2, 0);
      gg.add(bar);
    }
    /* the coaming: the raised rim the grating drops into, which keeps water off the hatch */
    for (const [dx, dz, sx, sz] of [[l / 2, 0, t * 0.9, w + t], [-l / 2, 0, t * 0.9, w + t],
                                    [0, w / 2, l + t, t * 0.9], [0, -w / 2, l + t, t * 0.9]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(sx, t * 1.9, sz), pale);
      c.position.set(x + dx, y + t * 0.55, dz);
      gg.add(c);
    }
    return tag(gg, 'grating');
  };
  if (timberShip) [0.30, 0.50, 0.70].forEach(u => {
    const w = halfAtU(u) * 0.85;
    group.add(gratingAt(u, w, L * 0.055));
  });

  /* ── THE CAPSTAN, WHICH IS A MACHINE AND NOT A DRUM ────────────────────────────────
     The barrel is not smooth: it carries WHELPS — vertical ribs that give the cable something
     to bite on, because a polished cylinder would simply let it slip. Above them sits the
     drumhead, pierced square for the bars, and the spindle runs down through the deck to a
     second capstan below, so two decks of men heave on the same anchor at once. */
  if (timberShip) {
    const u = 0.62, y = deckAtU(u), R = B * 0.062;
    const cg = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.80, R, B * 0.115, 16), wood);
    barrel.position.y = y + B * 0.058;
    cg.add(barrel);
    for (let i = 0; i < 8; i++) {                       // the whelps
      const a = i / 8 * Math.PI * 2;
      const w = new THREE.Mesh(new THREE.BoxGeometry(B * 0.014, B * 0.100, B * 0.030), wood);
      w.position.set(Math.cos(a) * R * 0.92, y + B * 0.056, Math.sin(a) * R * 0.92);
      w.rotation.y = -a;
      cg.add(w);
    }
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 1.16, R * 1.02, B * 0.038, 16), pale);
    head.position.y = y + B * 0.132;
    cg.add(head);
    for (let i = 0; i < 8; i++) {                       // the bars, shipped for heaving
      const a = i / 8 * Math.PI * 2;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.009, B * 0.012, B * 0.34, 10), pale);
      bar.rotation.z = Math.PI / 2; bar.rotation.y = a;
      bar.position.set(Math.cos(a) * B * 0.17, y + B * 0.132, Math.sin(a) * B * 0.17);
      cg.add(bar);
    }
    cg.position.x = (u - 0.5) * L;
    group.add(tag(cg, 'capstan'));
  }

  /* ── THE SHIP'S BOAT, WHICH IS A HULL, SO IT COMES FROM THE HULL GENERATOR ──────────
     ⚠ It was half a squashed sphere — the one shape in this whole model with no argument behind
     it at all. And the fix was sitting in the file the entire time: a boat IS a hull, with a
     keel and a stem and a run, so it gets built by the same surfacePoint() as the ship carrying
     it. Not a new model — the same generator at a different size, which is exactly the rule
     this project holds everything else to.
     Her proportions are a launch's: L/B about 3.4, fine forward, transom-sterned and open. */
  if (timberShip && S.lwl > 25) {
    const bl = L * 0.17, u = 0.46;
    const boatSpec = {
      loa: bl, lwl: bl * 0.94, beam: bl / 3.4, draught: bl * 0.075, freeboard: bl * 0.105,
      cm: 0.62, wlPower: 2.6, stemFineness: 0.06, sternFineness: 0.42, transom: 0.20,
      forefoot: 0.26, run: 0.30, riseF: 0.55, riseA: 0.30, sheerBow: 0.9, sheerStern: 0.6,
      tumblehome: 0.0, stemRake: 0.06, sternRake: 0.02, strakes: 9, masts: [],
    };
    const bm = new THREE.Mesh(buildHullGeometry(boatSpec, 40, 14), pale);
    bm.position.set((u - 0.5) * L, deckAtU(u) + bl * 0.060, 0);
    group.add(tag(bm, 'boat'));
    for (const d of [-0.30, 0.30]) {                    // she sits on skids across the beams
      const sk = new THREE.Mesh(
        new THREE.BoxGeometry(B * 0.030, B * 0.022, bl / 3.4 * 1.5), wood);
      sk.position.set((u - 0.5) * L + d * bl, deckAtU(u) + bl * 0.012, 0);
      group.add(sk);
    }
  }
}

/* ── the TOP: the platform at the head of a lower mast ─────────────────────────────────
   A signature of a square-rigged ship and the thing whose absence makes a generated rig read
   as scaffolding. It spreads the topmast shrouds, and it is a fighting platform. */
function buildTop(r, mat) {
  const g = new THREE.Group();
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, r * 0.09, 14), mat);
  g.add(plat);
  /* the crosstrees and trestletrees under it, which are what actually carry the load */
  for (const [rx, rz] of [[r * 1.5, r * 0.13], [r * 0.16, r * 1.9]]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(rx, r * 0.11, rz), mat);
    t.position.y = -r * 0.10;
    g.add(t);
  }
  return tag(g, 'top');
}

/* ── DEADEYES: the blocks that set up the shrouds, in a row along each channel ───────── */
function buildDeadeyes(n, r, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.5, 16), mat);
    d.rotation.x = Math.PI / 2;
    d.position.z = (i - (n - 1) / 2) * r * 2.4;
    g.add(d);
  }
  return tag(g, 'deadeye');
}


/* ── THE GUNS, RUN OUT ─────────────────────────────────────────────────────────────────
 * The ports are painted by the hull shader; until now nothing came out of them, and on a
 * two-decker that is the most obvious absence on the ship. The barrels are placed from the
 * SAME two expressions the shader uses to draw the ports —
 *
 *     port centre in v : uWaterline + 0.10 + deck * 0.115
 *     ports along u    : fract(u * 26.0) == 0.5
 *
 * — so a barrel cannot come out of a blank plank, and if the port pattern is ever retuned the
 * guns follow it. Two models of where a gunport is would be exactly the drift this project
 * keeps being bitten by.
 *
 * A 32-pounder is 3 m long and weighs 2.7 tonnes; run out, about a third of the barrel is
 * outside the ship. That protrusion is what a broadside looks like from outside, and it is why
 * a ship fought on one tack at a time — the lee ports had to stay shut or she flooded.
 */
function buildGuns(S, group, mat) {
  const H = hullSurface(S);
  const decks = S.gunDecks || 0;
  if (!decks) return;
  const g = new THREE.Group();
  const len = S.beam * 0.19, r = S.beam * 0.017;
  for (let d = 0; d < decks; d++) {
    const v = 0.62 + 0.10 + d * 0.115;                  // the shader's port centre, exactly
    if (v > 0.985) continue;
    for (let k = 0; k < 26; k++) {
      const u = (k + 0.5) / 26;
      /* ⚠ And no gun stands in the COUNTER. The flare pushes the topsides outboard over the
         after body, so a barrel placed there is thrown clear of the ship and reads as a spar.
         Real ports stop where the run begins for the same physical reason: there is no flat
         side left to cut one in. */
      const aftLimit = Math.min(0.88, 1 - (S.run || 0.3) - 0.02);
      if (u < 0.13 || u > aftLimit) continue;
      const p = surfacePoint(S, H, u, v);
      for (const sgn of [-1, 1]) {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.72, r, len, 16), mat);
        bar.rotation.x = Math.PI / 2;                    // along the beam, pointing out
        bar.position.set(p[0], p[1], sgn * (p[2] + len * 0.30));
        g.add(bar);
      }
    }
  }
  group.add(tag(g, 'gun'));
}

/* ── RIGGING THAT ACTUALLY LEADS SOMEWHERE ─────────────────────────────────────────────
 * Standing rigging holds the mast up; running rigging works the ship. The model had only the
 * first, which is why the rig read as scaffolding: a real ship is a cobweb, and almost all of
 * that web is rope doing a job you can name.
 *
 *   STAYS run FORWARD from each masthead and stop it falling aft — the fore-and-aft partner of
 *   the shrouds. The foremast's lead to the bowsprit, which is the entire reason a bowsprit is
 *   there at all.
 *   BACKSTAYS run aft from the mastheads to the ship's side, taking the forward pull of a
 *   following wind.
 *   BRACES lead aft from each yard ARM. They are how the yard is swung round to trim the sail,
 *   and they are the reason a square-rigger can sail anything but dead downwind.
 */
function buildRigging(S, group, rope, spars, mastTops) {
  const H = hullSurface(S);
  const L = S.lwl;
  const line = (a, b) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a[0], a[1], a[2] || 0), new THREE.Vector3(b[0], b[1], b[2] || 0)]);
    return new THREE.Line(g, rope);
  };
  const deckAt = u => H.sheer(u);

  mastTops.forEach((m, i) => {
    /* forestay: forward and down — to the bowsprit for the foremost mast, to the deck at the
       foot of the mast ahead for the others */
    const aheadU = i === 0 ? 0.03 : mastTops[i - 1].u;
    const ax = (aheadU - 0.5) * L;
    const ay = i === 0 ? deckAt(0.06) + (S.bowsprit ? S.beam * 0.20 : 0) : deckAt(aheadU);
    group.add(tag(line([m.x, m.y], [ax, ay]), 'stay'));
    /* backstays to the ship's side, one each way */
    const bu = Math.min(0.96, m.u + 0.20);
    const bx = (bu - 0.5) * L, by = deckAt(bu);
    const hb = (H.halfB * H.wl(bu)) * (1 - H.tumble(bu));
    for (const sgn of [-1, 1]) group.add(tag(line([m.x, m.y, 0], [bx, by, sgn * hb]), 'stay'));
  });

  /* braces: from each yard arm aft and down */
  spars.forEach(sp => {
    const bu = Math.min(0.97, sp.u + 0.26);
    const bx = (bu - 0.5) * L, by = deckAt(bu);
    for (const sgn of [-1, 1])
      group.add(tag(line([sp.x + sgn * (sp.armX || 0), sp.y, sgn * (sp.armZ !== undefined ? sp.armZ : sp.half)],
                         [bx, by + sp.half * 0.10, sgn * sp.half * 0.30]),
                    'brace'));
  });
}


/* ── THE FUNNEL ────────────────────────────────────────────────────────────────────────
 * A steamer without one is not a steamer. It is also not decoration: the funnel's height is
 * set by the DRAUGHT a boiler needs — the taller the stack, the harder it pulls air through
 * the grate — which is why early steamers carry a stack out of all proportion to the ship and
 * why forced draught later let them shrink. The rig alongside it is not vestigial either:
 * until compound engines cut coal consumption threefold, sail was what got you home when the
 * bunkers ran dry.
 */
/* ── A LINER IS MOSTLY SUPERSTRUCTURE ──────────────────────────────────────────────────
 * Titanic was a hull with four funnels standing on it and nothing else, which gets her exactly
 * backwards: on a passenger ship the hull is the smaller half. Her boat deck stands 19 m above
 * the waterline and the accommodation below it is most of what she IS — 46,328 tons of which
 * comparatively little is hold. Building her as a cargo hull with a chimney is the same error
 * as drawing the container ship without her boxes.
 * Decks are stacked and stepped in from the hull's own sheer, so they follow whatever shape the
 * coefficients produced. */
function buildSuperstructure(S, group) {
  const n = S.decks || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const white = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.55, metalness: 0.2 });
  const g = new THREE.Group();
  const base = H.sheer(0.5);
  const dh = B * 0.105;                                 // one deck's height
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const len = L * (0.80 - f * 0.34);                  // each tier steps in fore and aft
    const wid = B * (0.92 - f * 0.16);
    /* ── ⚠ A DECKHOUSE IS NOT A BOX ────────────────────────────────────────────────────
       It was BoxGeometry — one constant width — sitting on a hull that narrows to a point.
       So at the bow the house was WIDER THAN THE SHIP and hung out over open water on square
       corners, which is exactly the jutting August photographed from ahead. It also ran past
       the stem into nothing.
       A deckhouse is built ON the deck, so its plan follows the deck's plan: it narrows as
       the ship narrows and stops short of the side by a WATERWAY — the gangway the crew walk
       and the scuppers drain along. Loft it from the hull's own half-breadth at each station
       and it can never overhang, on any ship, at any beam. */
    const uA = 0.5 - (len / L) / 2, uB = 0.5 + (len / L) / 2;
    const NU = 40, tp = [], ti = [];
    const inset = B * 0.055;                            // the waterway, each side
    for (let k = 0; k <= NU; k++) {
      const u = uA + (uB - uA) * k / NU;
      const deckHalf = Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]);
      const half = Math.max(B * 0.06, Math.min(wid / 2, deckHalf - inset));
      const x = (u - 0.5) * L;
      tp.push(x, -dh / 2, -half,  x, -dh / 2, half,
              x,  dh / 2, -half,  x,  dh / 2, half);
    }
    for (let k = 0; k < NU; k++) {
      const a = k * 4, b = a + 4;
      ti.push(a + 2, b + 2, a + 3,  a + 3, b + 2, b + 3);   // roof
      ti.push(a, a + 1, b,          a + 1, b + 1, b);       // sole
      ti.push(a, b, a + 2,          a + 2, b, b + 2);       // port side
      ti.push(a + 1, a + 3, b + 1,  a + 3, b + 3, b + 1);   // starboard side
    }
    /* cap the ends so the house is closed, not a tube */
    const e0 = 0, e1 = NU * 4;
    ti.push(e0, e0 + 2, e0 + 1, e0 + 1, e0 + 2, e0 + 3);
    ti.push(e1, e1 + 1, e1 + 2, e1 + 1, e1 + 3, e1 + 2);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    tg.setIndex(ti); tg.computeVertexNormals();
    const tier = new THREE.Mesh(tg, white);
    tier.position.set(-L * 0.02 + f * L * 0.03, base + dh * (i + 0.5), 0);
    g.add(tier);
    /* ── ⚠ ONE CONTINUOUS BLACK STRIP IS NOT A ROW OF WINDOWS ─────────────────────────
       It is a painted stripe, and that is exactly what it read as. A deckhouse is a row of
       SEPARATE lights with mullions between them, and the mullions are what give the eye a
       repeat unit and therefore a sense of the ship's SIZE — without them a 211 m deckhouse
       and a 30 m one look identical. Cut the strip into panes at a fixed real spacing, so
       the count follows the length instead of the length following the count. */
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len * 0.97, dh * 0.34, wid * 1.006), dark);
    strip.position.set(tier.position.x, base + dh * (i + 0.55), 0);
    g.add(strip);
    const paneW = B * 0.075;                            // a light is about this wide, always
    const nPane = Math.max(4, Math.round(len * 0.97 / paneW));
    for (let k = 1; k < nPane; k++) {
      const mull = new THREE.Mesh(
        new THREE.BoxGeometry(paneW * 0.16, dh * 0.36, wid * 1.010), white);
      mull.position.set(tier.position.x - len * 0.485 + k * (len * 0.97 / nPane),
                        base + dh * (i + 0.55), 0);
      g.add(mull);
    }
    /* ── AND A RAILING, which is what actually breaks a box ─────────────────────────────
       A deckhouse roof without one is a slab. With stanchions and three rails it acquires a
       scale, a top edge that is not a hard line, and something for the light to catch. */
    const railY = base + dh * (i + 1);
    for (const side of [-1, 1]) {
      const nSt = Math.max(6, Math.round(len / (B * 0.22)));
      const segs = [];
      for (let k = 0; k <= nSt; k++) {
        const x = tier.position.x - len / 2 + k * (len / nSt);
        const st = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.004, B * 0.004, dh * 0.30, 5), white);
        st.position.set(x, railY + dh * 0.15, side * wid / 2);
        g.add(st);
      }
      for (const h of [0.10, 0.20, 0.30]) {
        const rail = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, len, 5), white);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(tier.position.x, railY + dh * h, side * wid / 2);
        g.add(rail);
      }
    }
  }
  /* ── COWL VENTILATORS ───────────────────────────────────────────────────────────────
     The most recognisable fitting on any Victorian steamer's deck, and there is a reason
     there are so many of them: below decks there is a coal-fired boiler room, a galley and
     several hundred people, and no mechanical ventilation whatever. Air is caught by turning
     these cowls into the wind and driven below. They are why a period deck photograph looks
     crowded with what appear to be enormous trumpets. */
  if (S.funnels) {
    const cowl = new THREE.MeshStandardMaterial({ color: 0xb8483a, roughness: 0.55, metalness: 0.15 });
    for (const u of [0.30, 0.38, 0.58, 0.66, 0.74]) {
      for (const side of [-1, 1]) {
        const cy = H.sheer(u);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.017, B * 0.019, B * 0.15, 10), white);
        stem.position.set((u - 0.5) * L, cy + B * 0.075, side * B * 0.30);
        g.add(tag(stem, 'vent', 'Cowl ventilator'));
        const bell = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.038, B * 0.017, B * 0.055, 12, 1, true), cowl);
        bell.position.set((u - 0.5) * L, cy + B * 0.165, side * B * 0.30);
        bell.rotation.z = side * 0.55;                  // turned into the wind
        g.add(tag(bell, 'vent', 'Cowl ventilator',
          'Turned into the wind to drive air below. With a coal-fired boiler room, a galley and several hundred people under the deck and no mechanical ventilation at all, a ship needed a great many of them.'));
      }
    }
  }
  group.add(tag(g, 'superstructure'));
}

/* ── WHERE THE FUNNELS STAND ────────────────────────────────────────────────────────────
 * ⚠ Read by TWO callers now — the funnels themselves, and the boom clamp in the rig, which
 * has to know what is standing in the gap it is about to swing a spar through. Defined once
 * for exactly the reason this project keeps relearning: two independent derivations of the
 * same station drift, and the drift shows up as a sail through a funnel.
 */
function funnelStations(S) {
  const mu = (S.masts || []).map(m => m.at).sort((a, b) => a - b);
  const slots = [];
  if (!mu.length) return slots;
  for (let i = 0; i < mu.length - 1; i++) slots.push((mu[i] + mu[i + 1]) / 2);
  slots.push(Math.min(0.92, mu[mu.length - 1] + 0.14));
  return slots;
}

function buildFunnel(S, group) {
  const n = S.funnels || 0;
  if (!n) return;
  const H = hullSurface(S);
  const h = S.beam * 1.55, r = S.beam * 0.115;
  const black = new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.62, metalness: 0.30 });
  const band = new THREE.MeshStandardMaterial({ color: 0x8a3820, roughness: 0.55, metalness: 0.18 });
  /* ⚠ FUNNELS MUST NOT STAND WHERE MASTS DO. Fixed stations put Great Eastern's two funnels
     at 0.42 and 0.62 — exactly where two of her three masts are stepped — so they grew through
     each other. On a real auxiliary steamer the uptakes are threaded into the GAPS between the
     masts, because a boiler casing and a mast step cannot occupy the same frame. Take the mast
     positions and sit in the widest holes between them. */
  const slots = funnelStations(S);
  for (let i = 0; i < n; i++) {
    const u = slots.length ? (slots[i % slots.length] || 0.50)
                           : (n === 1 ? 0.50 : 0.42 + i * (0.20 / (n - 1)));
    const y = H.sheer(u);
    const g = new THREE.Group();
    /* ── ⚠ THE FLICKER WAS THE FUNNEL'S OWN BASE ────────────────────────────────────
       The stack ran from y = 0 to y = h with its group sitting exactly on the sheer, so its
       bottom cap was COPLANAR WITH THE DECK — z-fighting, which is what the shimmer was — and
       the aft rake then tipped half that disc below the planking and half above, so the
       fighting ran along a moving line as the camera turned.
       A funnel does not grow out of flat deck anyway. It rises from a BOILER CASING, the
       deckhouse over the fiddley that carries the uptakes; the visible stack starts at the
       top of that. Model the casing, start the stack above it, and there is no coincident
       surface left to fight. */
    const caseH = h * 0.085, caseR = r * 1.34;
    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(caseR * 0.94, caseR, caseH, 20), black);
    casing.position.y = caseH / 2 - caseH * 0.35;       // slightly sunk, so no cap meets the deck
    g.add(tag(casing, 'funnel', 'Boiler casing',
              'The deckhouse over the fiddley. The uptakes from the boilers come up inside it.'));
    /* ── ⚠ A FUNNEL'S COLOURS ARE PAINT, AND PAINT HAS NO THICKNESS ────────────────
       The band was a separate ring standing 9 cm proud of a tapering stack. Three hypotheses
       for August's flickering red tips were tested and all three failed — depth precision
       (raising the near plane changed nothing), shadow acne (disabling shadows made it
       slightly worse), and aliasing (the band measures 60 device pixels tall, not thin). What
       is certain is that two nearly-coincident surfaces are the only thing that CAN fight, and
       a funnel band is not a fitting: it is paint. So the stack is now ONE cylinder carrying
       its livery in VERTEX COLOURS, and there is no second surface left to contend with.
       Colours from the museum model August supplied: buff stack, black top. */
    const sg = new THREE.CylinderGeometry(r * 0.93, r, h, 24, 24);
    const spos = sg.attributes.position, scol = [];
    const buff = new THREE.Color(0xd8cfbb), cap = new THREE.Color(0x1b1b1d);
    for (let i = 0; i < spos.count; i++) {
      const fy = spos.getY(i) / h + 0.5;               // 0 at the base, 1 at the head
      const c = fy > 0.80 ? cap : buff;
      scol.push(c.r, c.g, c.b);
    }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
    const stack = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.66, metalness: 0.10 }));
    stack.position.y = caseH * 0.55 + h / 2;
    g.add(tag(stack, 'funnel', 'Funnel',
      'Buff with a black top. Funnel colours were a shipping line\'s registered trademark: at sea a hull is a silhouette long before a name can be read, so the livery at the head of the funnel is how a ship was known hull-down on the horizon.'));
    /* the company band at the head — the one piece of colour on a Victorian hull */
    /* the steam pipe alongside, which is what actually roars */
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.13, r * 0.13, h * 0.92, 16), black);
    pipe.position.set(-r * 1.25, caseH * 0.55 + h * 0.46, 0);
    g.add(pipe);
    g.position.set((u - 0.5) * S.lwl, y, 0);
    g.rotation.z = -0.085;                       // raked aft, as they almost always were
    group.add(tag(g, 'funnel'));
  }
}


/* ── WHAT A BOX BOAT CARRIES INSTEAD ───────────────────────────────────────────────────
 * The container ship is the one hull here whose cargo is its own architecture. Everything
 * above her deck is the boxes, stacked to a standard that is the actual invention: 8 ft by
 * 8 ft 6 in by 20 or 40 ft, corner castings identical worldwide since 1968. The ship is a
 * rack. The accommodation is pushed to one end so nothing blocks the crane runs, and the
 * bridge has to see over a stack that may be twelve high — which is why it stands where it does
 * and why modern boats have moved it forward of the boxes rather than behind them.
 */
/* ── THE RIGID WING SAIL ────────────────────────────────────────────────────────────────
 * ⚠ The USV was a bare hull with masts=[] — nothing on deck at all, which is why it read as
 * unfinished. It was, literally.
 *
 * An uncrewed sailing vessel cannot use cloth. Canvas needs hands: to sheet it, to reef it, to
 * hand it before a squall and to repair it after. So a Saildrone carries a RIGID WING — a
 * vertical aerofoil, the same section as an aircraft wing turned on end — which needs no
 * sheeting at all and cannot tear.
 *
 * And it trims itself. The TAIL VANE on its outrigger behind the wing does what a weathervane
 * does: the wing pivots freely on its post, and the tail holds it at a fixed angle to the
 * apparent wind. Set the tail's angle and the wing finds and keeps its own trim, through every
 * windshift, for months, with nobody aboard. That is the whole reason the type exists, and it
 * is the one part that must be drawn if the vessel is to make any sense.
 */
/* ── THE FLIGHT DECK ────────────────────────────────────────────────────────────────────
 * A carrier is the one warship whose shape is set by something that is not the sea. Everything
 * about it follows from needing to land an aeroplane on a moving ship.
 *
 * The ANGLED DECK is the whole idea, and it is a British one (Campbell and Cambell, 1951).
 * Before it, the landing area ran straight down the ship and aircraft already parked forward
 * were protected by a wire crash barrier; miss the wires and you hit it. Angle the landing
 * strip a few degrees to port and a pilot who misses simply flies off the bow and goes round
 * again. That one change is why jets could operate from carriers at all.
 *
 * The ISLAND is small and to STARBOARD because the deck must be clear, and to starboard
 * because a piston engine's torque pulls a going-around aircraft to port — so you put the
 * obstacle on the side it is least likely to swing toward.
 */
/* ── BOATS ON DAVITS ────────────────────────────────────────────────────────────────────
 * The row of white boats along a steamer's boat deck is one of the most recognisable things
 * about her, and the museum model of Great Eastern is lined with them.
 *
 * A DAVIT is a curved arm that swings a boat from its stowed position inboard, out over the
 * side, and lowers it. Two per boat. They are curved rather than straight for one reason: the
 * boat must clear the ship's side on the way down, and a ship's side tumbles home or flares,
 * so a straight arm would either foul the hull or need to be absurdly long.
 *
 * ⚠ And the number of them is a fact with a history. Great Eastern carried boats for a
 * fraction of the 4,000 people she was certified for, and so did every liner after her — Board
 * of Trade rules scaled boats to TONNAGE, not to souls, and had not been revised as ships grew.
 * Titanic sailed under the same rule with 20 boats for 2,224 aboard. The rule changed only
 * after she sank.
 */
function buildBoats(S, group, mats) {
  const n = S.boats || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const white = new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f3336, roughness: 0.55, metalness: 0.25 });
  const boatL = Math.min(B * 0.42, 9.0), boatB = boatL * 0.30;
  const perSide = Math.max(1, Math.round(n / 2));
  /* ── ⚠ THE BOATS WERE STOWED TOUCHING ────────────────────────────────────────────────
     Found by the clearance checker on a pair I had only just added — boat against boat. Ten
     nine-metre boats were spread across a FIXED 0.46 of the hull, which works out at 9.5 m
     between centres: half a metre of daylight between one boat and the next.
     No boat deck is stowed like that. A boat has to be swung OUT to be lowered, the falls
     need room to render, and the crew have to get between them to cast off the gripes. The
     gap is not spare space; it is working space.
     So the SPACING is the real quantity — a boat's length and a third — and the span follows
     from how many boats there are, the same way the trireme's oar spacing follows from the
     interscalmium and the portholes follow from a 3 m pitch. If they do not fit, the answer
     is fewer boats, not closer ones. */
  const gapPitch = boatL * 1.38;
  const span = Math.min(0.58, (perSide - 1) * gapPitch / L);
  for (let i = 0; i < perSide; i++) {
    const u = 0.5 - span / 2 + (i / Math.max(1, perSide - 1)) * span;
    const y = H.sheer(u);
    const half = Math.abs(surfacePoint(S, H, Math.max(0.01, Math.min(0.99, u)), 1.0)[2]);
    for (const sgn of [-1, 1]) {
      const z = sgn * (half - B * 0.045);
      /* the boat: a shallow hull, keel down, stowed fore-and-aft */
      const bg = new THREE.SphereGeometry(boatL / 2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      bg.scale(1.0, 0.42, boatB / boatL);
      bg.rotateX(Math.PI);
      const bt = new THREE.Mesh(bg, white);
      bt.position.set((u - 0.5) * L, y + B * 0.075, z);
      group.add(tag(bt, 'boat', 'Ship\'s boat',
        'Stowed under davits on the boat deck. Board of Trade rules scaled boats to TONNAGE rather than to the number of people aboard, and were not revised as ships grew — which is why Titanic sailed legally with 20 boats for 2,224 souls.'));
      /* two davits per boat, curved so the boat clears the side going down */
      for (const d of [-0.34, 0.34]) {
        const pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          pts.push(new THREE.Vector3(0, t * B * 0.16, Math.pow(t, 2.2) * B * 0.085));
        }
        const dg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, B * 0.007, 5, false);
        const dv = new THREE.Mesh(dg, dark);
        dv.position.set((u - 0.5) * L + d * boatL, y, z);
        dv.scale.z = sgn;
        group.add(tag(dv, 'boat', 'Davit',
          'Curved, because the boat has to clear a ship\'s side that flares or tumbles home on its way down. A straight arm would foul the hull or have to be absurdly long.'));
      }
    }
  }
}

function buildFlightDeck(S, group, mats) {
  if (!S.flightDeck) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const deckW = S.flightDeck;                       // full flight-deck beam in metres
  /* ⚠ 0x4a4f55 at roughness 0.92 still blew out to white under the Shipwright's key light,
     which is what made the deck read as a blank slab. A flight deck is NON-SKID: a coarse
     grit-and-epoxy coating, near-black and almost totally matt, because anything glossy up
     there is lethal to people and aircraft alike. Dark enough to survive a 3.1-intensity key. */
  const grey = new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.99, metalness: 0.0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.80, metalness: 0.12 });
  const line = new THREE.MeshStandardMaterial({ color: 0xd6d2c4, roughness: 0.85, metalness: 0.0 });
  const y = H.sheer(0.5) + B * 0.10;

  /* the deck itself: it OVERHANGS the hull on both sides, which is why a carrier's waterline
     beam and its flight-deck beam are two very different numbers */
  const fd = new THREE.Mesh(new THREE.BoxGeometry(L * 1.02, B * 0.045, deckW), grey);
  fd.position.set(0, y, 0);
  group.add(tag(fd, 'flightdeck', 'Flight deck',
    'It overhangs the hull on both sides — which is why a carrier\'s waterline beam and its flight-deck beam are entirely different numbers.'));

  /* ⚠ The angled deck was drawn as a FILLED white box 15.6 m across, which is a painted
     runway and not what a carrier looks like from anywhere. The landing area is marked by
     LINES on the same non-skid as the rest of the deck — its two edges — and the deck inside
     them is the same colour as the deck outside. */
  for (const edge of [-1, 1]) {
    const ang = new THREE.Mesh(new THREE.BoxGeometry(L * 0.62, B * 0.004, deckW * 0.010), line);
    ang.position.set(-L * 0.10, y + B * 0.025, -deckW * 0.10 + edge * deckW * 0.105);
    ang.rotation.y = 0.157;
    group.add(tag(ang, 'flightdeck', 'Angled landing area',
      'Angled about nine degrees to port so an aircraft that misses the arrestor wires flies off the bow and goes round again, instead of into the aircraft parked forward. It is what made jet operation possible.'));
  }

  /* the island: small, and to STARBOARD */
  const isl = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(L * 0.10, B * 0.28, deckW * 0.10), dark);
  box.position.y = B * 0.14;
  isl.add(box);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.006, B * 0.010, B * 0.30, 8), dark);
  mast.position.y = B * 0.42;
  isl.add(mast);
  isl.position.set(L * 0.06, y + B * 0.022, deckW * 0.40);
  group.add(tag(isl, 'island', 'The island',
    'Everything that cannot be under the deck: bridge, flying control, uptakes and radar. It is to starboard because a going-around aircraft swings to port.'));

  /* ── ⚠ THE LIFTS STOOD PROUD LIKE BOXES ON A TABLE ─────────────────────────────────
     A deck-edge lift is FLUSH with the deck when it is up — it is a piece of the deck that
     moves. Sitting it on top made it read as freight. It is now let into the surface and
     shows as a seam and a yellow-edged outline, which is all you would see from above. */
  for (const u of [0.30, 0.62]) {
    const lift = new THREE.Mesh(new THREE.BoxGeometry(L * 0.055, B * 0.008, deckW * 0.13), dark);
    lift.position.set((u - 0.5) * L, y + B * 0.0225, deckW * 0.44);
    group.add(tag(lift, 'flightdeck', 'Deck-edge lift',
      'Aircraft come up from the hangar on the deck edge rather than through the middle, so a lift out of action does not cut the flight deck in half. Flush with the deck when raised — it is a piece of the deck that moves.'));
  }

  /* ── THE MARKINGS, WHICH ARE MOST OF WHAT A FLIGHT DECK LOOKS LIKE ─────────────────
     From above, a carrier is a dark deck covered in white and yellow lines, and leaving them
     off is most of why the surface read as blank. They are not decoration: the landing
     centreline is what a pilot flies down, and the foul lines mark the ground nobody may
     stand inside while an aircraft is coming aboard. */
  const paintW = new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.95 });
  const paintY = new THREE.MeshStandardMaterial({ color: 0xc8a63a, roughness: 0.95 });
  const yTop = y + B * 0.024;
  /* the landing centreline, running down the angled deck */
  const cl = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, B * 0.003, deckW * 0.012), paintW);
  cl.position.set(-L * 0.10, yTop, -deckW * 0.10);
  cl.rotation.y = 0.157;
  group.add(tag(cl, 'flightdeck', 'Landing centreline',
    'The line a pilot flies down on approach. It runs along the angled deck, not the ship.'));
  /* the foul line, offset to starboard of it */
  const fl = new THREE.Mesh(new THREE.BoxGeometry(L * 0.52, B * 0.003, deckW * 0.008), paintY);
  fl.position.set(-L * 0.09, yTop, deckW * 0.02);
  fl.rotation.y = 0.157;
  group.add(tag(fl, 'flightdeck', 'Foul line',
    'Nothing and nobody may be inside this line while an aircraft is coming aboard.'));

  /* ── ARRESTOR WIRES ────────────────────────────────────────────────────────────────
     Four of them, athwart the angled deck, a few metres apart. The aircraft is stopped by a
     hook catching one of these and paying it out against hydraulic rams below decks — from
     about 240 km/h to nothing in roughly 100 m. */
  for (let w = 0; w < 4; w++) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.0025, B * 0.0025, deckW * 0.24, 5),
      new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.6, metalness: 0.5 }));
    wire.rotation.x = Math.PI / 2;
    wire.rotation.y = 0.157;
    wire.position.set(-L * 0.26 + w * L * 0.035, yTop + B * 0.002, -deckW * 0.14);
    group.add(tag(wire, 'flightdeck', 'Arrestor wire',
      'A hook catches one of four and pays it out against hydraulic rams below decks: about 240 km/h to a stop in roughly a hundred metres.'));
  }

  /* ── CATAPULT TRACKS ───────────────────────────────────────────────────────────────
     Two forward and one on the waist. On this class they are ELECTROMAGNETIC rather than
     steam, which is the whole reason the ship exists as a new design: a linear motor can be
     tuned to the aircraft, so it will launch something light without tearing it apart. */
  for (const c of [[-0.30, -deckW * 0.22], [-0.30, deckW * 0.10], [-0.06, -deckW * 0.26]]) {
    const cat = new THREE.Mesh(new THREE.BoxGeometry(L * 0.28, B * 0.003, deckW * 0.020), paintW);
    cat.position.set(c[0] * L, yTop, c[1]);
    if (c[0] > -0.2) cat.rotation.y = 0.157;
    group.add(tag(cat, 'flightdeck', 'Catapult track',
      'Electromagnetic on this class rather than steam. A linear motor can be tuned to the aircraft, so it will throw something light without tearing it apart.'));
  }
}

/* ── THE MAIN BATTERY ───────────────────────────────────────────────────────────────────
 * A battleship's turrets are not bolted to the deck. Each sits on a BARBETTE — an armoured
 * cylinder running down through the ship to the magazine — and the turret revolves on top of
 * it. The barbette is the real structure; the turret is the part that turns.
 *
 * They are mounted on the centreline and SUPERFIRING, one raised behind another, so both can
 * fire ahead. That arrangement is the reason a battleship has the profile it does.
 */
function buildTurrets(S, group, mats) {
  const n = S.turrets || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const cal = S.calibre || 0.40;                   // barrel calibre in metres
  const barrels = S.barrels || 3;
  const steel = new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 });
  /* two forward superfiring, the rest aft — the standard arrangement */
  const stations = n === 3 ? [0.24, 0.34, 0.78] : [0.22, 0.32, 0.70, 0.80].slice(0, n);
  stations.forEach((u, i) => {
    const base = H.sheer(u);
    const raised = (i === 1) ? B * 0.085 : 0;       // the superfiring one stands higher
    const R = B * 0.20;
    const g = new THREE.Group();
    const barb = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, B * 0.11, 20), dark);
    barb.position.y = B * 0.055;
    g.add(tag(barb, 'turret', 'Barbette',
      'The armoured cylinder running down to the magazine. The turret revolves on top of it; this is the part that actually carries the load and the armour.'));
    const tur = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, B * 0.12, 20), steel);
    tur.position.y = B * 0.17;
    g.add(tag(tur, 'turret', 'Turret',
      'Gunhouse for the main battery. Its face carries the heaviest armour on the ship, because that is what an enemy shell is aimed at.'));
    for (let b = 0; b < barrels; b++) {
      const off = (b - (barrels - 1) / 2) * cal * 2.6;
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(cal * 0.52, cal * 0.62, R * 4.4, 12), dark);
      gun.rotation.z = Math.PI / 2;
      gun.position.set(R * 2.0 * (u < 0.5 ? 1 : -1), B * 0.185, off);
      g.add(tag(gun, 'turret', 'Main gun',
        'The calibre is the ship. Everything else — the armour, the beam, the displacement — is arranged around carrying these and surviving their equals.'));
    }
    g.position.set((u - 0.5) * L, base + raised, 0);
    if (u > 0.5) g.rotation.y = Math.PI;
    group.add(tag(g, 'turret'));
  });
}

function buildWingSail(S, group, mats) {
  if (!S.wingSail) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const u = S.wingAt || 0.46;
  const base = H.sheer(u);
  const x = (u - 0.5) * L;
  const span = L * S.wingSail;                      // wing height
  const chord = span * 0.27;
  const white = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.42, metalness: 0.05 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x1b2530, roughness: 0.30, metalness: 0.15 });

  const wing = new THREE.Group();
  /* ── THE AEROFOIL ─────────────────────────────────────────────────────────────────
     Built explicitly rather than by extruding a profile: an extrusion's depth axis has to be
     rotated into place afterwards, and the first attempt put the CHORD fore-and-aft along the
     view axis, so the wing showed only its edge and read as a bare white post.
     Chord along X (fore and aft), span up Y, thickness on Z. A lens section, thickest about a
     third aft of the leading edge, and tapering in chord toward the head the way a real wing
     sail does to keep its centre of effort low. */
  const NC = 18, NSp = 10, wp = [], wi = [];
  for (let j = 0; j <= NSp; j++) {
    const v = j / NSp;
    const taper = 1.0 - 0.32 * v * v;
    const yy = v * span;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= NC; i++) {
        const t = i / NC;
        const th = 0.115 * chord * taper * Math.sin(Math.PI * Math.pow(t, 0.58));
        wp.push((t - 0.5) * chord * taper, yy, (side ? -1 : 1) * th);
      }
    }
  }
  const rowW = (NC + 1) * 2;
  for (let j = 0; j < NSp; j++)
    for (let side = 0; side < 2; side++)
      for (let i = 0; i < NC; i++) {
        const a = j * rowW + side * (NC + 1) + i, b = a + rowW;
        if (side === 0) wi.push(a, b, a + 1, a + 1, b, b + 1);
        else            wi.push(a, a + 1, b, a + 1, b + 1, b);
      }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  wg.setIndex(wi);
  wg.computeVertexNormals();
  const wm = new THREE.Mesh(wg, white);
  wing.add(tag(wm, 'wing', 'Wing sail',
    'A rigid aerofoil in place of canvas. Nothing to sheet, nothing to reef, nothing to tear — which is what lets the vessel sail for months with nobody aboard.'));
  /* the tail vane, out astern on its boom: this is what trims the wing */
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(B * 0.010, B * 0.010, chord * 2.6, 8), dark);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, span * 0.46, -chord * 1.5);
  wing.add(boom);
  const vane = new THREE.Mesh(new THREE.BoxGeometry(chord * 0.045, span * 0.34, chord * 0.95), white);
  vane.position.set(0, span * 0.46, -chord * 2.7);
  wing.add(tag(vane, 'wing', 'Tail vane',
    'A weathervane for the wing. The wing pivots freely on its post and the tail holds it at a set angle to the apparent wind, so it finds and keeps its own trim with no crew.'));
  /* The wing turns, so it cannot sit flat on the deck: it stands on a BEARING, and that post
     is what it pivots about. Setting it at deck level also drove its foot 0.11 m into the
     planking — the deck is cambered and has thickness. */
  const post = new THREE.Mesh(new THREE.CylinderGeometry(chord * 0.075, chord * 0.095, B * 0.12, 14), dark);
  post.position.set(x, base + B * 0.06, 0);
  group.add(tag(post, 'wing', 'Wing bearing',
    'The wing turns freely on this post. Nothing drives it: the tail vane sets the angle and the wind does the rest.'));
  wing.position.set(x, base + B * 0.115, 0);
  /* trimmed for a reach. At 15 degrees the wing was almost edge-on to any side view and read
     as a bare white post; a wing sail is a WING and its face has to be visible for that to be
     legible at all. 32 degrees is a normal working trim and shows the section. */
  wing.rotation.y = 0.56;
  group.add(tag(wing, 'wing'));

  /* solar panels — the other half of the endurance story, and flush with the deck */
  const pv = new THREE.MeshStandardMaterial({ color: 0x141d2b, roughness: 0.22, metalness: 0.45 });
  for (const uu of [0.24, 0.32, 0.62, 0.70, 0.78]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(L * 0.055, B * 0.008, B * 0.42), pv);
    p.position.set((uu - 0.5) * L, H.sheer(uu) + B * 0.010, 0);
    group.add(tag(p, 'solar', 'Solar array',
      'Power for the instruments, the computer and the satellite link. With wind for propulsion and sun for electricity, the endurance limit stops being fuel and becomes fouling.'));
  }
  /* the instrument pod: the reason the vessel is out there at all */
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.05, B * 0.06, B * 0.20, 12), dark);
  pod.position.set((0.84 - 0.5) * L, H.sheer(0.84) + B * 0.10, 0);
  group.add(tag(pod, 'sensor', 'Instrument mast',
    'Anemometer, satellite antenna and cameras. Below the waterline the same vessel carries echo sounders and a CTD.'));
}

function buildContainers(S, group) {
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const TEU_L = 12.19, TEU_W = 2.44, TEU_H = 2.59;      // the 40-ft box, in metres
  const cols = Math.max(4, Math.floor(B * 0.86 / TEU_W));
  const pal = [0xb0442e, 0x2f5f86, 0x8a8f93, 0x3f7a55, 0xa8792c, 0x6a4a72];
  const mats = pal.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.74, metalness: 0.14 }));
  const box = new THREE.BoxGeometry(TEU_L * 0.97, TEU_H * 0.95, TEU_W * 0.94);
  const stack = new THREE.Group();
  let n = 0;
  for (let bay = 0; bay < Math.floor(L * 0.66 / (TEU_L * 1.06)); bay++) {
    const x = -L * 0.40 + bay * TEU_L * 1.06;
    const high = 5 + ((bay * 3) % 3);                    // stows are not level; they never are
    for (let c = 0; c < cols; c++)
      for (let h = 0; h < high; h++) {
        const m = new THREE.Mesh(box, mats[(bay * 7 + c * 3 + h) % mats.length]);
        m.position.set(x, H.sheer(0.5) + TEU_H * (h + 0.5), (c - (cols - 1) / 2) * TEU_W * 1.02);
        stack.add(m); n++;
      }
  }
  group.add(tag(stack, 'container'));

  /* the accommodation block and the funnel above the engine, both right aft */
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6, metalness: 0.25 });
  const hs = H.sheer(0.5);
  const acc = new THREE.Mesh(new THREE.BoxGeometry(L * 0.055, TEU_H * 7, B * 0.72), white);
  acc.position.set(L * 0.345, hs + TEU_H * 3.5, 0);
  group.add(tag(acc, 'bridge'));
  const br = new THREE.Mesh(new THREE.BoxGeometry(L * 0.070, TEU_H * 1.1, B * 0.90), dark);
  br.position.set(L * 0.345, hs + TEU_H * 7.5, 0);
  group.add(tag(br, 'bridge'));
  /* ⚠ THE FUNNEL WAS TWICE AS WIDE AS IT WAS TALL — 15.9 m across against 8.3 m high, which
     is a squat block, not a funnel. Found by the axis sweep, not by eye: nothing about this
     ship's profile made it obvious, and it had been shipping that way since the box boat was
     built. A funnel is an UPTAKE: it exists to carry exhaust clear of the accommodation and
     the deck, so it is always taller than it is broad. */
  const fn = new THREE.Mesh(new THREE.BoxGeometry(L * 0.030, TEU_H * 5.6, B * 0.16), dark);
  fn.position.set(L * 0.405, hs + TEU_H * 9.4, 0);
  group.add(tag(fn, 'funnel', 'Funnel',
    'The uptake from the main engine, carried high enough to keep exhaust clear of the bridge and the deck. On a box boat it stands abaft the accommodation because everything forward of that is cargo.'));
}


/* ── THE HEAD AND THE STERN ────────────────────────────────────────────────────────────
 * The two ends of a ship carry almost all of its period signature, and both were simply
 * missing: the bow ended in a bare stem with a bowsprit pushed through it, and the stern just
 * stopped where the planking ran out.
 *
 * THE HEAD is not ornament. The beakhead is a working platform projecting forward of the stem,
 * and the headrails that sweep up to it are structure — they stay the bowsprit sideways against
 * the enormous fore-and-aft pull of the forestays, which is the load that would otherwise tear
 * it out of the ship. The crew's heads were also out there, over the water, which is where the
 * word comes from.
 *
 * THE STERN is where a ship was recognisable at a mile. The square tuck closes the hull above
 * the waterline; the quarter galleries are the officers' light and air, cantilevered out where
 * there is no hull to put a window in; and the stern lights are the only large glazing in the
 * ship. All three are generated from the hull's own after sections, so they fit whatever shape
 * the coefficients produced.
 */
function buildHead(S, group, mats) {
  if (!S.bowsprit) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const g = new THREE.Group();
  const stemX = -0.5 * L + H.rake(0.02);
  const deck = H.sheer(0.04);
  const reach = L * 0.085;                              // how far the head projects
  /* the beakhead platform: a narrow deck carried out beyond the stem on knees */
  const plat = new THREE.Mesh(
    new THREE.BoxGeometry(reach, B * 0.018, B * 0.30), mats.woodPale);
  plat.position.set(stemX - reach * 0.42, deck * 0.86, 0);
  plat.rotation.z = -0.13;                              // it rises toward the bowsprit
  g.add(plat);
  /* the headrails, one pair, sweeping from the bow up and forward */
  for (const sgn of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      const p = surfacePoint(S, H, 0.13 * (1 - f) + 0.012, 0.92);
      pts.push(new THREE.Vector3(
        p[0] - f * reach * 1.05,
        p[1] + f * f * deck * 0.30,
        sgn * (p[2] * (1 - f * 0.55) + B * 0.012)));
    }
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, B * 0.011, 6, false),
      mats.woodPale);
    g.add(rail);
  }
  /* gammoning: the lashing that holds the bowsprit down to the stem, and the only thing
     stopping the forestays lifting it straight out of the ship */
  const gam = new THREE.Mesh(
    new THREE.TorusGeometry(B * 0.055, B * 0.010, 6, 12), mats.woodDark);
  gam.rotation.y = Math.PI / 2;
  gam.position.set(stemX - reach * 0.15, deck * 1.02, 0);
  g.add(gam);
  group.add(tag(g, 'head'));
}

function buildStern(S, group, mats) {
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const g = new THREE.Group();
  /* the transom: a panel closing the hull across the stern, from waterline to taffrail */
  const pos = [], idx = [];
  const NV = 14, NW = 10;
  for (let j = 0; j <= NV; j++) {
    const v = 0.60 + (j / NV) * 0.40;
    /* ⚠ THE TRANSOM HAS TO GROW OUT OF THE HULL, NOT BE STUCK ONTO IT. Two earlier attempts
       failed the same way: an absolute target width (0.30 B) and an unbounded flare both give a
       plate wider than the planking it meets, so it reads as a wing bolted to a pointed stern.
       The width comes from the ship's OWN after sections — the half-breadth a little forward of
       the sternpost, where there is still hull — so the tuck is continuous with the run by
       construction. On a fine-sterned hull it is narrow, which is correct: that ship did not
       have a broad transom. */
    const p = surfacePoint(S, H, 0.985, v);
    const half = p[2] * 0.99;                           // the hull's own width, counter included
    for (let i = 0; i <= NW; i++) {
      const t = (i / NW) * 2 - 1;
      pos.push(p[0] + Math.abs(t) * L * 0.010, p[1], t * half);
    }
  }
  for (let j = 0; j < NV; j++)
    for (let i = 0; i < NW; i++) {
      const a = j * (NW + 1) + i;
      idx.push(a, a + NW + 1, a + 1, a + 1, a + NW + 1, a + NW + 2);
    }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tg.setIndex(idx); tg.computeVertexNormals();
  g.add(tag(new THREE.Mesh(tg, mats.woodDark), 'transom'));

  /* ── STERN LIGHTS, SET IN THE TRANSOM THEY BELONG TO ────────────────────────────────
     ⚠ Twice now these have been sized from a formula that ran alongside the transom's own
     geometry instead of from it, and twice they have ended up wider than the stern and off its
     centreline. The transom mesh has just been built; measure IT. Anything derived from the
     same numbers by a parallel route will drift the moment either route changes — which is the
     single failure mode this project keeps rediscovering. */
  if (S.gunDecks) {
    const glass = new THREE.MeshStandardMaterial({
      color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
    tg.computeBoundingBox();
    const tb = tg.boundingBox;
    const halfT = Math.min(tb.max.z, -tb.min.z);        // the transom's own half-width
    const yTop = tb.min.y + (tb.max.y - tb.min.y) * 0.80;
    for (let i = 0; i < 5; i++) {
      const w = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.004, (tb.max.y - tb.min.y) * 0.16, halfT * 0.24), glass);
      w.position.set(tb.max.x + L * 0.002, yTop, (i - 2) * halfT * 0.34);
      g.add(tag(w, 'sternlight'));
    }
  }

  /* quarter galleries: cantilevered out at the after corners, where there is no hull left
     to put a window in and the officers live anyway */
  if (S.gunDecks) {
    tg.computeBoundingBox();
    const tb2 = tg.boundingBox;
    const p = [tb2.max.x - L * 0.020, tb2.min.y + (tb2.max.y - tb2.min.y) * 0.62,
               Math.min(tb2.max.z, -tb2.min.z) * 0.94];
    for (const sgn of [-1, 1]) {
      /* a gallery is a small closet cantilevered off the quarter, not a barrel. About a
         sixth of the beam tall and a tenth deep — big enough for a window and a seat. */
      const q = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.020, B * 0.026, B * 0.11, 8, 1, false, 0, Math.PI),
        mats.woodPale);
      q.rotation.x = Math.PI / 2;
      q.rotation.y = sgn > 0 ? 0 : Math.PI;
      q.position.set(p[0] + L * 0.008, p[1] * 0.96, sgn * (p[2] + B * 0.012));
      g.add(tag(q, 'gallery'));
    }
  }
  group.add(g);
}


/* ── THE BOWER ANCHOR, CATTED ──────────────────────────────────────────────────────────
 * Hung at the cathead on the bow, which is where it lived at sea: too heavy to bring inboard
 * and too dangerous to tow. A 74's best bower is about 3.7 tonnes, and the whole apparatus of
 * the ship's bow — cathead, fish davit, capstan, the 24-inch cable that will not fit round the
 * capstan and has to be nipped to a messenger — exists to move it.
 *
 * The Admiralty pattern is the shape everyone recognises and the reason is mechanical: the STOCK
 * is set at right angles to the ARMS, so when the anchor lands on its side the stock rolls it
 * until one fluke bites. Without a stock it lies flat and drags, which is why the stock is the
 * part that had to be invented.
 */
function buildAnchor(S, group, mat) {
  if (!S.bowsprit) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const shank = L * 0.115;                              // a bower's shank is ~1/8 the hull
  for (const sgn of [-1, 1]) {
    const g = new THREE.Group();
    const sh = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.011, B * 0.016, shank, 14), mat);
    g.add(sh);
    /* the two arms, curving down from the crown, each ending in a fluke */
    for (const a of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.008, B * 0.012, shank * 0.52, 14), mat);
      arm.rotation.z = a * 1.05;
      arm.position.set(a * shank * 0.20, -shank * 0.42, 0);
      g.add(arm);
      const fluke = new THREE.Mesh(
        new THREE.ConeGeometry(B * 0.030, shank * 0.24, 4), mat);
      fluke.rotation.z = a * 1.05;
      fluke.position.set(a * shank * 0.40, -shank * 0.60, 0);
      g.add(fluke);
    }
    /* ⚠ the STOCK is athwart the ARMS, not in their plane — that 90° is the whole invention */
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(B * 0.020, B * 0.020, shank * 0.82), mat);
    stock.position.y = shank * 0.42;
    g.add(stock);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(B * 0.026, B * 0.007, 5, 10), mat);
    ring.position.y = shank * 0.52;
    g.add(ring);

    /* catted: hung outboard at the bow, canted so the flukes clear the planking */
    const p = surfacePoint(S, H, 0.09, 0.94);
    g.position.set(p[0], p[1] - shank * 0.12, sgn * (p[2] + B * 0.05));
    g.rotation.x = sgn * 0.30;
    g.rotation.z = 0.42;
    group.add(tag(g, 'anchor'));
  }
}


/* ── OARS, WHICH ARE THE ENGINE ────────────────────────────────────────────────────────
 * A trireme's sail is for fair winds; her OARS are what she is. 170 of them on three levels,
 * and the whole hull exists to hold them at the right height above the water — which is why
 * she is 37 m long, 3.8 m wide at the waterline, and has almost no cargo capacity at all.
 * The outrigger (parexeiresia) carries the topmost bank outboard of the hull, and it is the
 * reason the famous "beam 5.5 m" is measured over the outriggers rather than over the planking.
 */
function buildOars(S, group, mat) {
  const n = S.oarBanks || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const g = new THREE.Group();
  /* ⚠ THE THREE BANKS ARE NOT EQUAL. 62 thranitai on the top bench against 54 zygitai and 54
     thalamitai — 170 oars, not 3 x 54. The top bank is longer because it rows through the
     OUTRIGGER, which carries it outboard of the hull and lets it reach past the two banks
     below; that extra reach is also why it can be extended further fore and aft. Drawing three
     equal banks throws away the one structural fact that makes a trireme a trireme. */
  const perBankArr = S.oarsPerBank;
  const perBankOf = b => Array.isArray(perBankArr) ? perBankArr[b]
                       : (perBankArr || 27);
  /* ── ⚠ THE OARS LAY ALONG THE SHIP, NOT OUT FROM IT ────────────────────────────────
     Measured: each oar spanned 9.3 m fore-and-aft and 1.3 m outboard, on a hull 3.8 m in the
     beam. They were lying nearly parallel to the keel — which is a ship with a hedge growing
     out of the ends of it, not a ship under oar. rotation.y was 0 and PI, when reaching
     outboard needs ±PI/2. The same fault as the paddle wheels: a rotation nobody checked.

     ── AND THEY WERE TWICE TOO LONG ────────────────────────────────────────────────────
     B * 2.4 = 9.1 m. Morrison and Coates give Olympias oars of about 4.2 m, thranite a little
     longer than the two banks below. The length is not free: it follows from the
     INTERSCALMIUM, the spacing between tholes, which Vitruvius fixes at TWO CUBITS — 0.98 m
     on the Doric cubit. That spacing is what sets how far apart the rowers sit, and therefore
     how much room each has to swing, and therefore the whole geometry of the stroke. The
     thranite oar is longer only because the outrigger carries its thole further outboard, so
     it has further to reach the same water. */
  const INTERSCALMIUM = 0.98;                         // Vitruvius, two Doric cubits
  const oarLen = S.oarLen || 4.2;
  for (let bank = 0; bank < n; bank++) {
    const v = 0.70 + bank * 0.11;                     // each level higher up the side
    const out = 1.0 + bank * 0.22;                    // and further outboard
    const perBank = perBankOf(bank);
    const spread = 0.62 + bank * 0.05;                  // the top bank reaches further fore and aft
    for (let i = 0; i < perBank; i++) {
      /* rowers sit one interscalmium apart, so the tholes are spaced by a REAL LENGTH and
         the bank's extent follows from how many men are in it — not the other way round */
      const span = (perBank - 1) * INTERSCALMIUM / L;
      const u = 0.5 - span / 2 + (i / (perBank - 1)) * span + bank * 0.006;
      const p = surfacePoint(S, H, u, Math.min(0.99, v));
      for (const sgn of [-1, 1]) {
        const o = new THREE.Group();
        /* An oar is a LEVER pivoting on the thole. The loom runs INBOARD to the rower's
           hands; the shaft runs OUTBOARD to the blade. The gearing is what the whole stroke
           depends on: about 1.1 m inboard against 3.1 m outboard, so the handle moves a
           metre and the blade moves nearly three. Built along +Z, which is outboard. */
        const inb = oarLen * 0.26, outb = oarLen * 0.74;
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.010, B * 0.014, oarLen, 6), mat);
        shaft.rotation.x = Math.PI / 2;                 // lie the loom along Z: OUTBOARD
        shaft.position.z = outb / 2 - inb / 2;
        o.add(shaft);
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(B * 0.008, B * 0.075, oarLen * 0.22), mat);
        blade.position.z = outb * 0.90;
        o.add(blade);
        o.position.set(p[0], p[1], sgn * p[2] * out);
        o.rotation.y = sgn > 0 ? 0 : Math.PI;          // flips +Z outboard to the other side
        o.rotation.x = -0.34;                          // blades down toward the water
        /* what the animator needs to swing this oar: which side it is, its rest angles, and
           its bank, because the three banks do not enter the water at the same instant */
        o.userData.oar = { sgn, restY: o.rotation.y, restX: -0.34, bank };
        g.add(o);
      }
    }
  }
  group.add(tag(g, 'oar'));
}


/* ── PADDLE WHEELS ─────────────────────────────────────────────────────────────────────
 * Great Eastern's are 17 m across — taller than a house, one either side, and the single most
 * conspicuous thing about her. She also carried a 7.3 m screw, which is why she is the odd ship
 * she is: paddles are efficient in smooth water and useless when a roll lifts one clear, a screw
 * works in any sea but was still unproven at that size, so Brunel fitted BOTH and let them share.
 * The wheel is a rim on radial arms with flat floats between — and the floats are what does the
 * work, which is why they are set square to the rim and not feathered on a ship this early.
 */
function buildPaddles(S, group, mats) {
  const D = S.paddleDia || 0;
  if (!D) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const u = S.paddleAt || 0.52;
  const p = surfacePoint(S, H, u, 0.80);
  /* ── ⚠ THE AXLE WAS UNDER THE WATER ────────────────────────────────────────────────
     The wheel was hung at 0.55 of a point taken 80% up the hull side, which put its centre
     about a metre BELOW the waterline — so a 17 m wheel was submerged by more than a whole
     radius, and its housing with it. A paddle wheel does not work that way and could not:
     the axle rides ABOVE the water and only the lowest floats are ever immersed, dipping
     something like a sixth of the diameter. Any deeper and the wheel is dragging its own
     upper floats backwards through the sea, which is exactly the loss that made deep
     immersion the classic fault of an overloaded paddle steamer.
     Derived from stated quantities — the waterline is the sheer less the freeboard — rather
     than from a fraction that happened to look right. */
  const waterY = H.sheer(u) - S.freeboard;
  const axleY = waterY + D * 0.35;
  const iron = mats.iron || mats.woodDark;
  for (const sgn of [-1, 1]) {
    const g = new THREE.Group();
    const R = D / 2;
    for (let i = 0; i < 24; i++) {                     // the radial arms
      const a = i / 24 * Math.PI * 2;
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(B * 0.020, R * 2, B * 0.020), iron);
      arm.rotation.z = a;
      g.add(arm);
      const float = new THREE.Mesh(                     // and the floats that do the work
        new THREE.BoxGeometry(D * 0.030, D * 0.115, B * 0.30), mats.woodDark || mats.woodPale);
      float.position.set(Math.cos(a + Math.PI / 2) * R * 0.90,
                         Math.sin(a + Math.PI / 2) * R * 0.90, 0);
      float.rotation.z = a;
      g.add(float);
    }
    for (const r of [R, R * 0.55]) {                    // the rims
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, B * 0.012, 6, 30), iron);
      g.add(rim);
    }
    /* ── ⚠ THE WHEEL WAS TURNED EDGE-ON TO THE SHIP ────────────────────────────────
       A paddle wheel's SHAFT runs athwartships — it has to, because it is driven off an
       engine amidships and the floats must push water sternward. So the wheel's PLANE lies
       fore-and-aft, parallel to the hull side, and from abeam you see the whole circle: the
       spokes, the rim, the floats coming down at the front and lifting at the back. That is
       the image everyone has of a paddle steamer.
       Rotating the group a quarter-turn about Y put the wheel ACROSS the ship instead, so it
       was edge-on from the side and would have been shovelling water sideways. The arms are
       already built in the XY plane, which is the fore-and-aft plane; they needed no rotation
       at all. */
    g.position.set(p[0], axleY, sgn * (p[2] + B * 0.16));
    /* what the animator needs to turn this wheel: which side, and its radius, because the
       rate is not free — the float at the rim must move sternward at roughly the ship's own
       speed through the water, or the wheel is either slipping or being dragged. */
    g.userData.wheel = { sgn, R };
    group.add(tag(g, 'paddle'));
    /* the sponson: the platform carrying the wheel's weight out from the hull side */
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(D * 0.62, B * 0.16, B * 0.34), iron);
    /* ⚠ The sponson was sitting at axle height — a black box straight through the middle
       of the wheel. A sponson is the PLATFORM bracketed out from the hull at deck level that
       the paddle box stands on and the shaft bearings sit in; it belongs at the sheer, above
       the wheel entirely, not inside it. */
    box.position.set(p[0], H.sheer(u), sgn * (p[2] + B * 0.12));
    group.add(tag(box, 'paddle', 'Sponson',
      'The platform bracketed out from the hull side that carries the wheel and its shaft bearings.'));

    /* ── ⚠ THE PADDLE BOX, WHICH WAS MISSING ENTIRELY ──────────────────────────────────
       A wheel 17 m across turning beside an open deck throws a continuous sheet of water
       and coal-dirty spray, and it would sweep the deck clean of anything on it. So every
       paddle steamer ever built housed the top half of the wheel in a PADDLE BOX — and
       because it is the largest object on the ship's side, it became the thing owners
       decorated: fluted, vented, crested, and lettered with the company's name.
       Without it the wheel reads as loose machinery bolted to a hull; with it, the ship has
       the silhouette that says paddle steamer from a mile off. */
    const boxR = D * 0.60;
    const NB = 20, bp = [], bi = [];
    for (let i = 0; i <= NB; i++) {
      const a = Math.PI * (i / NB);                    // a half-round over the top
      for (let k = 0; k < 2; k++) {
        const w = (k ? 0.5 : -0.5) * B * 0.42;
        bp.push(Math.cos(a) * boxR, Math.sin(a) * boxR * 0.86, w);
      }
    }
    for (let i = 0; i < NB; i++) {
      const a0 = i * 2;
      bi.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bg.setIndex(bi); bg.computeVertexNormals();
    const bm = new THREE.Mesh(bg, mats.woodPale || iron);
    bm.position.set(p[0], axleY, sgn * (p[2] + B * 0.16));
    group.add(tag(bm, 'paddle', 'Paddle box',
      'The housing over the top of the wheel. A 17 m wheel throws a sheet of water and coal dirt that would sweep the deck; the box contains it. Being the largest thing on the ship\'s side, it is also what owners decorated.'));
    /* ── THE FAN FACE ──────────────────────────────────────────────────────────────
       The outboard face of a paddle box is the ship's one piece of display, and the pattern
       is almost always RADIAL — ribs fanning from the hub out to the rim, following the very
       spokes turning behind them. It is structural before it is ornamental: the face is a
       large thin panel that has to resist a wheel throwing water at it, and ribs from the
       centre are the cheapest way to stiffen a half-round. */
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (i / 10);
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(D * 0.020, boxR * 0.86, B * 0.030), mats.woodPale || iron);
      rib.position.set(p[0] + Math.cos(a) * boxR * 0.47,
                       axleY + Math.sin(a) * boxR * 0.40,
                       sgn * (p[2] + B * 0.16 + B * 0.21));
      rib.rotation.z = a - Math.PI / 2;
      group.add(tag(rib, 'paddle', 'Paddle-box rib',
        'The face fans from the hub because it must: a large thin panel taking the water a wheel throws at it is stiffened most cheaply by ribs running out from the centre. That it also looks well is why owners lettered and gilded it.'));
    }
    /* the vent slats along its face, which is how a real one is built and lit */
    for (let i = 1; i < 7; i++) {
      const a = Math.PI * (i / 7);
      const sl = new THREE.Mesh(new THREE.BoxGeometry(D * 0.035, B * 0.012, B * 0.40), iron);
      sl.position.set(p[0] + Math.cos(a) * boxR * 0.94,
                      axleY + Math.sin(a) * boxR * 0.81,
                      sgn * (p[2] + B * 0.16));
      sl.rotation.z = a;
      group.add(tag(sl, 'paddle', 'Paddle-box vent',
        'Slatted so the wheel does not compress the air in its own housing at every revolution.'));
    }
  }
}

/* ── assembly ──────────────────────────────────────────────────────────────────────── */

function buildShip(S, opts) {
  const FINE = !!(opts && opts.fine);
  const group = new THREE.Group();

  const sun = new THREE.Vector3(0.5, 0.72, 0.42).normalize();
  const hullMat = new THREE.ShaderMaterial({
    vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, side: THREE.DoubleSide,
    uniforms: {
      uSun: { value: sun }, uCam: { value: new THREE.Vector3() },
      uStrakes: { value: S.strakes || 26 },
      /* portholes spaced by a REAL distance — about 3 m between centres on a liner — so the
         count follows the ship's length rather than the length following the count */
      uPortholes: { value: S.portholes ? Math.round(S.lwl / 3.0) : 0 },
      /* ⚠ Both of these are LENGTHS TURNED INTO COUNTS, so they scale with the ship instead of
         being a texture frequency somebody liked. English oak planking ran about 7 m; the room
         and space of an 18th-century ship is about 0.75 m, so a 57 m hull crosses 76 frames. */
      uPlankLen: { value: Math.max(3, S.loa / (S.plankLen || 7.0)) },
      uFrames: { value: Math.max(8, S.loa / (S.roomSpace || 0.78)) },
      uCopper: { value: S.copper ? 1 : 0 },
      uCopperAge: { value: S.copperAge !== undefined ? S.copperAge : 0.55 },
      uWaterline: { value: 0.62 },
      uChequer: { value: S.chequer ? 1 : 0 },
      uGunDecks: { value: S.gunDecks || 0 },
      uTopside: { value: new THREE.Color(S.topside || '#5b4a33') },
      uIron: { value: S.iron ? 1 : 0 },
      uTime: { value: 0 },
    },
  });

  /* ── THE SHIP IS ASSEMBLED IN THE ORDER IT WAS BUILT ─────────────────────────────────
     Keel, then frames, then planking. They are all generated from the same surfacePoint(),
     so the ribs sit inside the skin and the backbone under it without a single fudge factor.
     The Shipwright hides and shows these by their tagged stage. */
  const timber = new THREE.MeshStandardMaterial({ color: 0x6b5334, roughness: 0.86 });
  group.add(tag(new THREE.Mesh(buildKeelGeometry(S), timber), 'keel'));
  if (FINE) {
    /* every frame its own object, so one rib can be picked out of the skeleton */
    for (let f = 0; f < 30; f++)
      group.add(tag(new THREE.Mesh(buildFramesGeometry(S, 1, 0.055 + f / 29 * 0.89), timber),
                    'frames', 'Frame ' + (f + 1) + ' of 30'));
    group.add(tag(new THREE.Mesh(buildStemGeometry(S, false), timber), 'stempost', 'Stem'));
    group.add(tag(new THREE.Mesh(buildStemGeometry(S, true), timber), 'stempost', 'Sternpost'));
    /* wales are a TIMBER remedy for hogging — thickened strakes acting as girders. A steel
       hull's own plating is the girder, and putting wales on one is like bracing a bridge with
       rope. */
    if (S.build !== 'iron' && S.build !== 'steel') {
      const waleMat = new THREE.MeshStandardMaterial({ color: 0x3d2f1f, roughness: 0.9 });
      group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.655, 0.030), waleMat), 'wale'));
      group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026), waleMat), 'wale'));
    }
    group.add(tag(new THREE.Mesh(buildRudderGeometry(S), timber), 'rudder'));
    /* channels: a shelf outboard of each mast, on both sides, which is what the shrouds set
       up to. Positioned from the mast stations, so they cannot land in the wrong place. */
    const HS = hullSurface(S);
    (S.masts || []).forEach(mk => {
      if (mk.rig !== 'square') return;
      for (const sgn of [-1, 1]) {
        const p = surfacePoint(S, HS, mk.at, 0.985);
        const ch = new THREE.Mesh(
          new THREE.BoxGeometry(S.lwl * 0.075, S.beam * 0.012, S.beam * 0.055), timber);
        ch.position.set(p[0], p[1] * 0.97, sgn * (p[2] + S.beam * 0.026));
        group.add(tag(ch, 'channel'));
        /* the deadeyes stand in a row along the channel's outer edge — this is where the
           shrouds actually terminate, and a channel without them reads as a bare shelf */
        const de = buildDeadeyes(Math.max(3, (mk.shrouds || 3) + 1), S.beam * 0.018, timber);
        de.rotation.y = Math.PI / 2;
        de.position.set(p[0], p[1] * 0.97 + S.beam * 0.016, sgn * (p[2] + S.beam * 0.046));
        group.add(de);
      }
    });
  } else {
    group.add(tag(new THREE.Mesh(buildFramesGeometry(S), timber), 'frames'));
  }

  const hull = new THREE.Mesh(
    FINE ? buildHullGeometry(S, 420, 72) : buildHullGeometry(S), hullMat);
  group.add(tag(hull, 'planking'));

  const deckMat = new THREE.MeshStandardMaterial({ color: 0xa08a66, roughness: 0.80,
                                                   side: THREE.DoubleSide });
  group.add(tag(new THREE.Mesh(buildDeckGeometry(S), deckMat), 'deck'));

  /* ⚠ Lambert has no specular term at all, so every timber came out matte and the whole ship
     read as cardboard under any lighting. Standard gives wood a low, broad sheen — which is
     what oiled and tarred timber actually does — and lets the key light rake the planking. */
  const mats = {
    spar: new THREE.MeshStandardMaterial({ color: 0x6a4d2c, roughness: 0.72, metalness: 0.02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x54402a, roughness: 0.78 }),
    woodPale: new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: 0.68 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.42, metalness: 0.72 }),
    canvas: new THREE.MeshStandardMaterial({ color: 0xded3b8, roughness: 0.94,
                                             side: THREE.DoubleSide }),
    /* ⚠ Standing rigging is NOT black. It is hemp tarred with Stockholm tar, which is a dark
       reddish-brown to golden-brown. True black rigging is a late-19th-century appearance and
       comes from PETROLEUM tar — so black shrouds on an 18th-century ship are an anachronism
       of about a hundred years. */
    rope: new THREE.LineBasicMaterial({ color: 0x4a3520, transparent: true, opacity: 0.78 }),
    ropeSolid: new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 0.88 }),
  };
  const sails = buildRig(S, group, mats, FINE);
  if (FINE) {
    buildGuns(S, group, mats.iron || mats.woodDark);
    if (S.__spars && S.__spars.length)
      buildRigging(S, group, mats.rope, S.__spars, S.__mastTops || []);
  }
  /* the fittings are what turn a hull with masts into a ship, and they are the reason the
     Shipwright's model is worth building separately from the globe's token */
  if (FINE) buildFittings(S, group, mats);
  if (FINE) buildFunnel(S, group);
  /* ⚠ A CARRIER HAS NO DECKHOUSE. The generic superstructure builder was stacking three
     white passenger tiers on a ship whose entire design premise is that the deck stays
     CLEAR — so the flight deck and a liner's deckhouse were occupying the same space, and
     the white box winning the depth test was read as "the flight deck blows out white".
     It was never the flight deck. A carrier's only above-deck structure is the island. */
  if (FINE && !S.flightDeck) buildSuperstructure(S, group);
  if (FINE) buildHead(S, group, mats);
  if (FINE) buildAnchor(S, group, mats.iron || mats.woodDark);
  if (FINE) buildOars(S, group, mats.woodPale);
  if (FINE) buildPaddles(S, group, mats);
  /* the transom is now continuous with the hull because the hull FLARES to meet it — see the
     counter in surfacePoint. Three earlier attempts failed by sizing the plate; none of them
     could work, because the ship had no broad stern for a plate to sit on. */
  if (FINE && S.transom) buildStern(S, group, mats);
  if (FINE && S.containers) buildContainers(S, group);
  if (S.wingSail) buildWingSail(S, group, mats);
  if (FINE && S.boats) buildBoats(S, group, mats);
  if (S.flightDeck) buildFlightDeck(S, group, mats);
  if (S.turrets) buildTurrets(S, group, mats);

  /* ── A DOUBLE CANOE IS TWO HULLS ───────────────────────────────────────────────────
     The card has always said "Austronesian double hull" and the model drew one hull, which is
     not a detail — it is the entire naval architecture. Two slender hulls carry the stability
     that a single hull of that beam could never have (1.05 m on 19 m), and the deck between
     them is the only flat space aboard: it is where the crew, the water, the pigs, the seed
     stock and the mast all live. That platform is what made the Pacific settleable.
     The rig steps on the platform, on the centreline, so it stays where it was built. */
  if (S.doubleHull) {
    const sep = S.hullSep || S.loa * 0.26;
    const hullKeys = ['keel', 'frames', 'planking', 'deck', 'stempost', 'wale', 'rudder'];
    const body = group.children.filter(o => o.userData.part && hullKeys.includes(o.userData.part.key));
    body.forEach(o => {
      const twin = o.clone();
      twin.userData.part = o.userData.part;        // clone() JSON-copies it; restore the tag
      o.position.z -= sep / 2;
      twin.position.z += sep / 2;
      group.add(twin);
    });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x6f5836, roughness: 0.82 });
    const dk = hullSurface(S);
    [0.30, 0.50, 0.70].forEach(u => {
      const cb = new THREE.Mesh(
        new THREE.BoxGeometry(S.loa * 0.035, S.beam * 0.16, sep + S.beam * 1.6), beamMat);
      cb.position.set((u - 0.5) * S.lwl, dk.sheer(u) + S.beam * 0.08, 0);
      group.add(tag(cb, 'crossbeam'));
    });
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(S.loa * 0.34, S.beam * 0.05, sep * 0.86), beamMat);
    plat.position.set(0, dk.sheer(0.5) + S.beam * 0.17, 0);
    group.add(tag(plat, 'platform'));
  }

  /* ── HOW TALL IS THE RIG? MEASURE IT, DO NOT ESTIMATE IT ─────────────────────────────
     The Yard used to reconstruct rig height from the mast data with a multiplier per rig type —
     a second, parallel model of geometry this function has just BUILT. It drifted the moment the
     lateen stopped taking its height from its mast, and cut the peak off the top of the frame.
     The bounding box is the exact answer, for every rig, including ones not written yet. */
  const bb = new THREE.Box3().setFromObject(group);
  group.userData = { hullMat, sails, spec: S,
                     rigTop: bb.max.y, keelBottom: bb.min.y,
                     extentX: bb.max.x - bb.min.x };   // a lateen yard overhangs the stem
  return group;
}

window.SHIPS_HULL = { PARTS, buildKeelGeometry, buildFramesGeometry, buildShip, buildHullGeometry, hullSurface, exponentForCm,
                      superellipseFullness };
