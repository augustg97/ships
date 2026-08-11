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

/* ── merged hoop rings, for the bands that bind a made mast ──────────────────────────
 * Each ring is a short open cylinder round a mast axis, tilted with the mast's rake.
 * One mesh per batch, for the same reason ropeMesh exists: a fleet of little cylinders
 * is a fleet of draw calls. `tilt` is the same rotation.z the mast mesh itself wears. */
function ringMesh(rings, mat) {
  const pos = [], idx = [], N = 14;
  rings.forEach(({ cx, cy, r, h, tilt }) => {
    const s = Math.sin(tilt || 0), c = Math.cos(tilt || 0);
    const base0 = pos.length / 3;
    for (const dy of [-h / 2, h / 2])
      for (let k = 0; k < N; k++) {
        const a = k / N * Math.PI * 2;
        const lx = Math.cos(a) * r;
        pos.push(cx + lx * c - dy * s, cy + lx * s + dy * c, Math.sin(a) * r);
      }
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      idx.push(base0 + k, base0 + N + k, base0 + k2,
               base0 + k2, base0 + N + k, base0 + N + k2);
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
  /* ⚠ A WELDED SHIP'S POSTS ARE INSIDE THE SHELL. A timber ship carries her stem and
     sternpost proud of the planking — they are the first timbers up and the planking rabbets
     into them. A steel ship's stem bar and stern frame are castings the PLATING CLOSES OVER:
     nothing stands proud of a welded stern. Drawn at the timber offset, the sternpost read as
     a dark stripe standing off Yamato's transom from every after bearing. The members are
     pulled one thickness inboard for steel, so they show in the skeleton stages and the shell
     covers them — which is the build order the stage card already describes. */
  const STEEL = S.build === 'steel' || S.build === 'iron';
  const inset = STEEL ? (aft ? -1.05 : 1.05) : 0;
  /* the timber follows the ship's own profile at the very end of the hull */
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const u = aft ? 1 - (1 - f) * 0.10 : f * 0.10;
    const v = aft ? f : 1 - f;
    const p = surfacePoint(S, H, u, Math.max(0, Math.min(1, v)));
    const t = 0.05 * S.draught;
    const x0 = p[0] + (inset - 1) * t, x1 = p[0] + (inset + 1) * t;
    pos.push(x0, p[1], -sided, x0, p[1], sided,
             x1, p[1], sided,  x1, p[1], -sided);
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
  const STEEL = S.build === 'steel' || S.build === 'iron';
  /* ⚠ A MOTOR SHIP'S RUDDER IS UNDER THE COUNTER, NOT HUNG PAST THE STERNPOST. The
     stern-hung plate below is a timber shape — pintles down the post, a barn door standing
     proud of the stern. On the carrier it stood 17 m past the transom and 4 m out of the
     water, in timber brown, and no baseline bearing could see it. A steel ship gets a
     balanced plate tucked wholly below the waterline and inside her own length. */
  const BULK = S.build === 'bulkhead';
  /* ── AND A JUNK'S RUDDER IS A MEDIAN RUDDER, AND IT IS ENORMOUS ──────────────────────
     Slung on the centreline abaft the stern transom, worked on tackles in a trunk rather
     than hung on pintles, so it can be raised in shoal water — and lowered it stands well
     below the bottom, where it is also the leeway board of a hull with no deep keel. The
     scale is in the ground: the Longjiang yard, the treasure ships' own, yielded an 11.07 m
     rudder post sized for a blade of roughly six metres by six. The 5.5%-of-lwl plate below
     drew a door-sized flap on a 60 m hull, invisible from every bearing. The blade takes
     the hull's own measures: chord near a tenth of the waterline, foot a quarter-draught
     below the bottom, stock standing up the transom notch toward the tiller. */
  const top = STEEL ? -S.draught * 0.08 : H.sheer(1.0) * (BULK ? 0.60 : 0.35);
  const depth = -S.draught * (STEEL ? 0.95 : BULK ? 1.25 : 0.92);
  const w = 0.030 * S.beam * (STEEL ? 0.45 : 1.0);
  const chord = S.lwl * (STEEL ? 0.035 : BULK ? 0.095 : 0.055);
  const pos = [], idx = [];
  /* a plate on the sternpost: wider at the foot, raked with the post */
  const pts = STEEL
    ? [[p[0] - chord * 1.6, top], [p[0] - chord * 0.6, top],
       [p[0] - chord * 0.75, depth], [p[0] - chord * 1.45, depth]]
    : BULK
    ? [[p[0] + chord * 0.02, top], [p[0] + chord * 0.42, top],
       [p[0] + chord * 0.92, -S.draught * 0.10], [p[0] + chord * 0.92, depth],
       [p[0] + chord * 0.02, depth]]
    : [[p[0], top], [p[0] + chord * 0.55, top],
       [p[0] + chord, depth], [p[0], depth]];
  /* ── ⚠ THE POST NOW LEANS, AND A HUNG RUDDER LEANS WITH IT ──────────────────────────
     Rake is height-proportional (see surfacePoint), so above the waterline the sternpost
     runs aft with height. A stern-hung rudder's stock is pintled DOWN THAT POST — its
     leading edge is the post's own line — and the junk's median rudder stands up the raked
     transom notch the same way. Without this shear the wooden rudders' vertical leading
     edges would open a wedge of daylight against the post they hang on. The steel plate
     lives wholly below the waterline, where the offset is zero by construction. */
  const postLean = q => q[1] > 0 ? S.sternRake * S.loa * Math.min(1, q[1] / H.sheer(1.0)) : 0;
  pts.forEach(q => pos.push(q[0] + postLean(q), q[1], -w, q[0] + postLean(q), q[1], w));
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = ((i + 1) % n) * 2;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  /* the two caps, fanned from vertex 0 — for four points this is exactly the index list
     the fixed version wrote out by hand */
  for (let i = 1; i + 1 < n; i++)
    idx.push(0, i * 2, (i + 1) * 2, 1, (i + 1) * 2 + 1, i * 2 + 1);
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
  /* ── ⚠ RAKE IS A LEAN, NOT A SHIFT ──────────────────────────────────────────────────
     H.rake(u) used to offset x uniformly at every height, so a "raked" stem was a vertical
     stem pushed bodily forward: the leading edge at u = 0 ran straight up and down at
     -lwl/2 - stemRake·loa, which is the blunt vertical bow Queen Mary 2 was called out on
     — stemRake 0.085 and no rake on screen — and it also drew every WATERLINE longer than
     the record's lwl, because the underwater body carried the whole offset too.
     A raked end leans: zero at the load waterline (that is what lwl MEANS), growing with
     height to the record's full overhang at the deck. rakeF below is that height fraction.
     H.rake(u) itself still returns the full deck-level rake, so the six deck-level callers
     (mast feet, bowsprit root, head knee, rails, deck strake) stay correct unchanged. */
  let y, z, rakeF = 0;
  if (v <= 0.62) {
    const k = v / 0.62;
    z = -t * (1 - k);
    const yy = Math.pow(Math.max(0, 1 - Math.pow(1 - k, H.nExp)), 1 / H.nExp);
    y = b * yy;
  } else {
    const k = (v - 0.62) / 0.38;
    z = fb * k;
    rakeF = k;
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
    /* ── BOW FLARE, the counter's mirror. A liner or box boat built to drive into head
       seas widens ABOVE the waterline forward: the V-sections throw water down and out,
       and the forecastle deck stands well wider than the fine entry under it. Same
       contract as the counter: entirely above v = 0.62, so the waterplane and every
       published coefficient are untouched. From the record where the record has it
       (S.bowFlare, fraction of half-beam gained at the deck at the stem). */
    if (S.bowFlare) {
      const span = Math.max(S.forefoot, 0.18);
      if (u < span) {
        const kb = (span - u) / span;
        y += (S.beam / 2) * S.bowFlare * Math.pow(kb, 1.7) * Math.pow(k, 1.3);
      }
    }
    /* ── A ROUNDED STERN rounds in PLAN: the topsides aft draw in toward the centreline
       as they rise, so the quarters curve and the taffrail is a metre or three across
       instead of the full transom width. Costanzi form (Queen Mary 2): a broad shallow
       transom at the water for the pods — that is what S.transom still draws — with the
       decks above closing to a rounded stern. Above v = 0.62 only, waterplane untouched. */
    if (S.sternRound) {
      const runStart = 1 - S.run;
      if (u > runStart) {
        const t = (u - runStart) / S.run;
        y *= 1 - S.sternRound * Math.pow(t, 2.0) * Math.pow(k, 1.5);
      }
    }
  }
  return [(u - 0.5) * L + H.rake(u) * rakeF, z, y];
}

function buildHullGeometry(S, NU = 120, NV = 34) {
  const H = hullSurface(S);
  const pos = [], nor = [], uvs = [], idx = [];

  /* ⚠ THIS WAS A SECOND COPY OF surfacePoint, WITHOUT THE COUNTER FLARE. The skin was the one
     surface in the ship built from its own private parametrisation — so when the counter was
     added to surfacePoint (see THE COUNTER above), every part keyed to the real surface grew a
     broad stern and the skin did not. That is why the transom plate stood out past the hull as
     a pair of wings: the plate was built from the true surface and the plating from a stale
     copy of it. The skin now asks the same function as the keel, the frames, the wales and the
     fittings — the failure mode this project keeps rediscovering, closed at the source. */
  const pointAt = (u, v) => surfacePoint(S, H, u, v);

  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const [x, z, y] = pointAt(u, v);
      pos.push(x, z, y);
      uvs.push(u, v);
      /* ⚠ normal by TWO-SIDED finite difference. The forward difference this replaces
         collapsed to zero at u = 1 and v = 1 — min(1, u + e) clamps to u itself — so every
         vertex on the stern edge and the sheer line carried a (0,0,0) normal, and normalize()
         of that in the shader is black. The crisp dark stripe standing at the stern from every
         after bearing was not the sternpost: it was this, and the same class drew the black
         rim along every deck edge. */
      const e = 1 / (NU * 2), f = 1 / (NV * 2);
      const a  = pointAt(Math.min(1, u + e), v), a2 = pointAt(Math.max(0, u - e), v);
      const c  = pointAt(u, Math.min(1, v + f)), c2 = pointAt(u, Math.max(0, v - f));
      const du = [a[0] - a2[0], a[1] - a2[1], a[2] - a2[2]];
      const dv = [c[0] - c2[0], c[1] - c2[1], c[2] - c2[2]];
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
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    /* ⚠ the deck edge is WHERE THE SKIN ENDS, asked of surfacePoint — not a parallel formula.
       The old halfB·wl·(1−tumble) copy predated the counter flare, so on every transom stern
       the deck stopped short of the flared skin and left a ledge round the quarter. */
    const edge = surfacePoint(S, H, u, 1);
    const b = edge[2], fb = edge[1], x = edge[0];
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
      /* ⚠ THE WINDING MUST AGREE WITH THE DECLARED NORMAL. This loop wound the deck
         clockwise-from-above — (a,c,b) — under normals declared (0,1,0), and three.js's
         double-sided flip trusts the WINDING: seen from above the faces were "back" faces,
         the up normals were flipped down, and every weather deck in the fleet was lit by
         the ground half of the hemisphere light — the round-34 "dark olive deck that goes
         black in Sea light" was a sunlit deck lit as if it faced the sea floor. The ratchet
         never saw it because a consistently wrong deck never changes; the audit's
         winding-vs-normals rule now holds the class. */
      idx.push(a, b, c, c, b, d);
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
function buildRig(S, group, mats, FINE, FURLED) {
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

  /* the area of a cloth from its own corners, for sizing its furled roll */
  const triA2 = (P, Q, R) =>
    Math.abs((Q[0] - P[0]) * (R[1] - P[1]) - (R[0] - P[0]) * (Q[1] - P[1])) / 2;

  const woodDark = mats.spar, canvas = mats.canvas;
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
  const sails = [], spars = [], mastTops = [], stayMasts = [];
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
    /* ⚠ AND THE AFTERMOST MAST'S OBSTRUCTION IS PAST THE STERN. The fallback here was
       0.5 + 0.06 — a station just abaft MIDSHIPS — so on any mast standing abaft that point
       gapAft came out NEGATIVE and the boom collapsed to its floor. Measured on Wyoming:
       booms [12.9, 12.9, 12.0, 12.0, 12.0, 6.7] — the spanker, the one boom the comment
       below says may overhang the stern, was the shortest spar on the ship, at exactly
       lower * 0.16. The photographs show the opposite: the six-masters' spanker booms were
       their LONGEST, standing well out over the counter, because aft of the taffrail there
       is nothing to hit. */
    let obstruct = nextAt !== undefined ? nextAt : 1.04;
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
    /* ── A MAST IS AS THICK AS ITS OWN LENGTH ASKS, NOT AS ITS SHIP'S BEAM ─────────────
       Every mast on a ship drew the same diameter — beam x 0.06 — so the treasure ship's
       0.6-share mizzen stood as fat as her main, and the corbita's little artemon as fat
       as the mast that carries her whole sail. Steel 1794 p.39 gives the law: "The main
       and foremasts of ships of 100 to 64 guns ... are one inch in diameter at the
       partners to every yard in length" — diameter follows the SPAR'S OWN LENGTH, and on
       these hulls' proportions beam x 0.06 lands within a few percent of that inch-per-yard
       for the TALLEST mast. So the calibration stands and every other mast scales by its
       own length. Steel's one exception is attested and large: "The mizen-masts of ships
       of 100 to 64 guns ... 3/5 of the diameter of the main-mast" (topmast 7/10) — the
       mizzen is thinner than even its length would give, because it is a lighter machine.
       Applied to the aftermost mast of a wooden three-master that carries square canvas;
       extending it past Steel's 64-100-gun domain (to the carrack's or Endurance's
       mizzen) is inference, like the height shares themselves. Junk and crabclaw masts
       take the length scaling only — China is not rigged by Steel's tables. */
    const mainLower = S.masts.reduce((mx, m2) =>
      Math.max(mx, m2.heightM !== undefined ? m2.heightM : (m2.height || 0) * steelMain), 0)
      || lower || 1;
    /* the mizzen is the AFTERMOST STATION, not the last list entry — the corbita and the
       trireme list their mains first and their bow masts second */
    const isMizzen = mk.at === Math.max(...S.masts.map(m2 => m2.at)) && S.masts.length >= 3
      && !S.iron && S.masts.some(m2 => m2.rig === 'square') && lower < mainLower * 0.95
      && (mk.rig === 'square' || mk.rig === 'gaff' || mk.rig === 'lateen');
    const mScale = lower / mainLower;
    const dScale = [isMizzen ? Math.min(mScale, 0.60) : mScale,
                    isMizzen ? Math.min(mScale, 0.70) : mScale,
                    isMizzen ? Math.min(mScale, 0.70) : mScale];
    /* Steel 1794, "Proportional Lengths of Masts": main topmast = 3/5 of the main mast;
       topgallant = 1/2 of its topmast. Cross-checked against Fincham 1843, whose measured
       ships give topmast 1.05–1.22 x extreme breadth and topgallant 0.57–0.70 x breadth.
       ⚠ The first version used 0.62 and 0.42 — the topgallant was nearly half again too long,
       which is why the rig stood 72 m over a 57 m hull instead of about 62. */
    const top = lower * 0.60, tg = top * 0.50;
    let y = base;
    /* capY tracks the HEAD of the highest drawn segment — the cap the lifts lead to. It is
       not `y`, because y advances by 0.88 of each segment (the doubling) and so ends BELOW
       the truck; a single-tier mast's one yard is slung above it. */
    let capY = base;
    /* every yard this mast crosses, recorded as built — the running rigging below is led
       from these, the braces' own rule: rope goes to where the spar actually is */
    const mastYards = [];
    /* a braced sail reaches about a tenth of the hull either side of its own mast */
    let prevYard = deckMax(u - 0.10, u + 0.10) + lower * 0.13;

    /* ── ONE CROSSED YARD, WITH ITS SAIL ──────────────────────────────────────────────
       Factored out because a mast may cross three yards — one per fidded segment, the
       18th-century rig — or six, from the record's own list (`yards`, below). Both paths
       must build the identical spar, or the fleet forks into two models of one thing. */
    const crossYard = (yy, yardLen, kind) => {
      /* ── A YARD IS AS THICK AS ITS OWN LENGTH ASKS — THE SPAR-MAKER'S OWN RATES ──────
         Steel 1794, "Proportional Diameters of Yards" (maritime.org full text): main and
         fore yards 7/10 of an inch to every yard of the length at the slings; topsail
         yards 5/8; topgallant yards 6/10; the crossjack at the fore-topsail-yard's rate.
         The steel yard keeps the same law with a rolled constant: Peking's 2017 re-masting
         delivery list cuts EVERY steel yard to length/50 at the slings, length/100 at the
         arms — six spar classes, exact — and Great Eastern's 1858 iron lower yard sits at
         50.4 (Research/IRON-MASTS.md §2). The royal takes the topgallant rate, DERIVED:
         Steel lists no royal diameter, a royal being a flying kite in 1794. Applying the
         rates outside Steel's own domain (trireme to Endurance) is inference, like the
         mast law above.
         ⚠ The old line drew every yard at beam x 0.0035 — the ship's beam, not the spar's
         length — so L/D ran 100 to 500 across the fleet where the records say 50 to 60,
         and Preussen's 26 m course yard stood 0.10 m through where the record rolls 0.53. */
      const RATE = { course: 0.700, topsail: 0.625, topgallant: 0.600, royal: 0.600 };
      const slingsD = S.iron ? yardLen / 50
                             : yardLen * (RATE[kind] || 0.625) / 36;
      /* A yard is not a cylinder: it is octagonal in the middle quarters and tapers to two
         fifths of its slings diameter at the arms. Murray 1754 gives the shipwrights' own
         sector divisions — 1.000, 0.964, 0.900, 0.700, 0.400 — and Steel's own quarter
         table agrees (yards in general: 30/31, 7/8, 7/10, 3/7 at the arm).
         ⚠ AND FOR ELEVEN ROUNDS THE TAPER WAS DEAD CODE. A CylinderGeometry defaults to
         ONE height segment, so its only ring vertices sit at the two ENDS — t was 1 at
         every vertex, the whole profile collapsed to its arm value, and each yard drew as
         a uniform stick. A per-vertex profile needs vertices along the length to land on. */
      const yg = new THREE.CylinderGeometry(slingsD / 2, slingsD / 2, yardLen, 16, 8);
      const ym = new THREE.Mesh(yg, woodDark);
      const yp = yg.attributes.position;
      for (let i = 0; i < yp.count; i++) {
        const t = Math.abs(yp.getY(i)) / (yardLen / 2);          // 0 slings, 1 arm
        /* the steel tube runs parallel through its middle half, then cones to half the
           slings diameter at the arms — which is exactly length/100 (Peking) */
        const k = S.iron
          ? (t < 0.5 ? 1.0 : 1.0 - ((t - 0.5) / 0.5) * 0.5)
          : (t < 0.25 ? 1.0 - 0.144 * (t / 0.25)
           : t < 0.75 ? 0.856 - 0.256 * ((t - 0.25) / 0.5)
                      : 0.600 - 0.200 * ((t - 0.75) / 0.25));
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
      /* the steel yard's card carries its provenance, the iron-mast rule: no tube record
         was in reach for these spars, so the RATE is the record's and the figure derived */
      if (S.iron) ym.userData.part = { ...ym.userData.part,
        what: 'A rolled ' + (S.build === 'steel' ? 'steel' : 'iron') + ' tube, parallel '
          + 'through its middle half and coned to half its slings diameter at the arms. '
          + 'Cut at length/50 at the slings, length/100 at the arms — the rate the Peking '
          + 're-masting cut every steel yard to in 2017, and Great Eastern\'s 1858 iron '
          + 'lower yard holds at 50.4. An attested rate applied to this spar\'s own '
          + 'length: the rate is the record\'s, the figure DERIVED from it.' };
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
      mastYards.push({ yy, cx: ym.position.x, half: yardLen / 2, drop });
      if (FURLED) {
        /* the roll lies along the braced yard itself, between its arms, bunt at the slings */
        const sT2 = Math.sin(TRIM), cT2 = Math.cos(TRIM), w2 = yardLen * 0.48;
        sails.push(makeFurl(
          new THREE.Vector3(ym.position.x - sT2 * w2, yy, -cT2 * w2),
          new THREE.Vector3(ym.position.x + sT2 * w2, yy, cT2 * w2),
          (yardLen * 0.96) * (drop * 0.97), furlMat(mats), group, { bunt: true }));
      } else {
        sails.push(makeSail(x + Math.sin(rakeRad) * (yy - base), yy,
                            yardLen * 0.96, drop * 0.97, canvas, group, 'square', TRIM));
      }
    };
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
    /* ── THE POLE MAST ─────────────────────────────────────────────────────────────
       A steamship still carries masts, and they carry no sail at all. Titanic's two were
       derrick posts, lookout stations and the anchorage for the wireless aerial strung
       between them — which is the only reason Carpathia heard her. The model gave her
       masts=[] and therefore no masts whatever, on a ship whose silhouette is two funnels
       plus two masts to most people who have seen a photograph of her. */
    /* ⚠ AND `rig: 'none'` FELL THROUGH TO THE SQUARE-RIG CASE. A mast built up in fidded
       sections — lower, topmast, topgallant — exists so the upper spars can be SENT DOWN in
       heavy weather, which is a thing you do because they carry sail. A ship that carries none
       has one spar. Dreadnought and Yamato were each given a lower mast plus a topmast plus a
       topgallant they had no use for: 34 m of stated mast became 56.7 m of drawn mast on a
       battleship whose real foretop stood about 40. */
    const segs = mk.rig === 'lateen' ? []                       // built below, from the yard
               : (mk.rig === 'pole' || mk.rig === 'none') ? [lower]
               : (mk.rig === 'crabclaw' || mk.rig === 'junk') ? [lower]
               : mk.rig === 'gaff' ? (mk.topmast ? [lower, lower * 0.52] : [lower])
               : [lower, top, tg];
    /* ── AN IRON MAST IS A TUBE, AND ITS DIAMETER IS THE RECORD'S ─────────────────────
       beam x 0.06 was the wooden law's calibration point, and on an iron hull it kept the
       wooden law's number with the wooden law's justification removed: a plated tube is
       not a tree, and its diameter is whatever the builder rolled. The one fleet member
       whose tubes are all attested is Great Eastern — Monday 2 ft 9 in through, Tuesday/
       Wednesday/Thursday 3 ft 6 in, Friday and the wooden Saturday 2 ft 9 in, keel-truck
       heights alongside — and on the model's own measure those tubes hold pole-length /
       diameter near 55. So: an attested `diaM` on the mast record is drawn outright; an
       iron mast without one derives its tube at poleM / 55, and its card says derived.
       An 1858 tube carries a separate wooden topmast sent down like any other spar (the
       white-lower/black-upper livery joint IS that fitting); from about 1890 a steel
       square-rigger's lower and topmast are ONE TUBE — Preussen's record says so in as
       many words — and only the topgallant stenge above steps down, at the heel
       proportion of Peking's surviving stengen (500 mm on a 20 m spar). The tube runs
       near-parallel to the doubling; a single-segment liner pole tapers hard to the
       truck, as every photograph of Titanic's masts shows. Research/IRON-MASTS.md. */
    const poleM = segs.reduce((a2, s2) => a2 + s2, 0);
    let segR;
    if (S.iron && mk.rig !== 'lateen') {
      const tubeDia = mk.diaM !== undefined ? mk.diaM : poleM / 55;
      const r0 = tubeDia / 2;
      const oneTube = mk.rig === 'square' && (S.year || 0) >= 1890;
      segR = segs.map((s2, si2) =>
        si2 === 0 ? (segs.length > 1 ? { a: r0, b: r0 * 0.96 }
                                     : { a: r0, b: r0 * 0.38 })
      : si2 === 1 ? (oneTube ? { a: r0 * 0.96, b: r0 * 0.58 }
                             : { a: r0 * 0.52, b: r0 * 0.36 })
                  : { a: r0 * 0.48, b: r0 * 0.14 });
    } else {
      segR = segs.map((s2, si2) => {
        const rr = [B * 0.030 * dScale[0], B * 0.020 * dScale[1],
                    B * 0.013 * dScale[2]][si2];
        return { a: rr, b: rr * 0.7 };
      });
    }
    const radii = segR.map(s2 => s2.a);

    segs.forEach((seg, si) => {
      if (mk.only && si >= mk.only) return;
      /* ── MAST LIVERY ────────────────────────────────────────────────────────────────
         On an iron ship the masts are painted, not oiled timber, and the museum model of
         Great Eastern shows the scheme plainly: WHITE LOWER MASTS, BLACK ABOVE. It is not
         decoration — the lower mast is a built iron tube kept white with the deckhouses, and
         the topmast and above are the sending-down spars, tarred and blacked like the rigging
         they carry. The join is at the doubling, which is exactly where the colour changes. */
      const mastMat = S.mastLivery === 'buff'
        /* the White Star scheme: masts wore the funnel buff, whole pole — not the
           white-lower/black-upper of the Great Eastern model.
           ⚠ 'buff' MEANS THE FUNNEL'S PAINT, so it is only right where masts and funnel
           genuinely shared a pot — Cunard's red funnel with 'buff' masts drew Queen Mary 2
           a scarlet signal mast. A livery that is a colour STRING is the mast's own paint,
           drawn as given. */
        ? (mats.mastBuff || (mats.mastBuff = new THREE.MeshStandardMaterial(
              { color: new THREE.Color(S.buff || 0xd8cfbb), roughness: 0.60 })))
        : (typeof S.mastLivery === 'string' && S.mastLivery[0] === '#')
        ? (mats.mastOwn || (mats.mastOwn = new THREE.MeshStandardMaterial(
              { color: new THREE.Color(S.mastLivery), roughness: 0.55, metalness: 0.15 })))
        : S.mastLivery
        ? (si === 0 ? (mats.mastWhite || (mats.mastWhite = new THREE.MeshStandardMaterial(
              { color: 0xdedad0, roughness: 0.58 })))
                    : (mats.mastBlack || (mats.mastBlack = new THREE.MeshStandardMaterial(
              { color: 0x1e2022, roughness: 0.52, metalness: 0.20 }))))
        /* ⚠ a warship's masts are the navy's grey, not oiled timber — Yamato carried a brown
           wooden pole for as long as the pole has existed */
        : S.turrets ? (mats.mastGrey || (mats.mastGrey = new THREE.MeshStandardMaterial(
              { color: 0x5a6067, roughness: 0.55, metalness: 0.30 })))
        : woodDark;
      const m = cyl(x - Math.sin(rakeRad) * (y - base), y, y + seg,
                    segR[si].a, segR[si].b, mastMat, -rakeRad);
      m.position.x = x + Math.sin(rakeRad) * (y + seg / 2 - base);
      /* the iron mast's card carries its provenance: attested diameters are the record's,
         derived ones say derived — a number with no provenance is worse than none */
      if (S.iron) m.userData.part = { ...m.userData.part,
        name: mk.wood ? 'Wooden mast' : S.build === 'steel' ? 'Steel mast' : 'Iron mast',
        what: mk.diaM !== undefined
          ? (mk.wood
             ? 'The one wooden mast on the ship, and it is wooden for a reason: the standard '
               + 'compass stood near it, and a wrought-iron tube alongside would have pulled '
               + 'the needle. Her diameter is the record\'s — 2 ft 9 in — and her stays were '
               + 'hemp where every iron mast carried 7½-inch wire.'
             : 'A wrought-iron tube, not a tree: two half-round plates butt-riveted, with '
               + 'iron discs riveted inside for stiffness. The diameter drawn here is the '
               + 'recorded one — Great Eastern\'s six masts, named Monday to Saturday, are '
               + 'on the record at 2 ft 9 in to 3 ft 6 in through. The wooden topmast above '
               + 'the tube is a sending-down spar, and the white-to-black paint joint marks '
               + 'where the iron ends and the wood begins.')
          : (mk.rig === 'square' && (S.year || 0) >= 1890)
          ? 'A rolled steel tube. Lower mast and topmast are one piece — Preussen\'s record: '
            + 'all masts and spars of steel tube except the wooden spanker gaff — and only '
            + 'the topgallant stenge above the doubling steps down and can be struck. No '
            + 'record of this tube\'s diameter was in reach, so it is DERIVED at pole '
            + 'length / 55, the proportion Great Eastern\'s attested tubes hold.'
          : 'A riveted ' + (S.build === 'steel' ? 'steel' : 'iron') + ' tube. No record of '
            + 'its diameter was in reach of this model, so the drawn figure is DERIVED at '
            + 'pole length / 55, the proportion held by the one attested set of iron tubes '
            + '(Great Eastern\'s, 1858). A derived figure, labelled as one.' };

      /* ── THE MADE MAST IS BOUND, OR IT WORKS APART ─────────────────────────────────
         No single tree yields a lower mast much over half a metre through, so a big
         ship's lower mast is MADE — several timbers coaked together round a spindle —
         and the assembly must be hooped or it opens at sea. The binding is a dated
         technology: WOOLDINGS, about a dozen close turns of tarred rope hove taut and
         nailed, each pinched between a pair of thin wooden hoops, through the 18th
         century; iron hoops driven on hot from about 1800. So the threshold is the
         TREE — a drawn diameter past 0.55 m is past what one stick gives — and the
         choice is the DATE (S.year, the year the hull is depicted at). Masts under
         the threshold are single sticks and stay bare, which is why the fluyt, the
         slaver and Endurance carry none. The count is a length turned into a count:
         one binding about every 2.6 m of the exposed lower mast, which puts eight on
         a 74's main — what the contemporary models show. */
      if (FINE && si === 0 && mk.rig === 'square' && !S.iron && radii[0] * 2 > 0.55) {
        const ironHoops = (S.year || 0) >= 1800;
        const rings = [], hoops = [];
        const lo = seg * 0.14, hi = seg * 0.76;      // partners to below the hounds
        const n = Math.max(4, Math.round((hi - lo) / 2.6));
        for (let i = 0; i < n; i++) {
          const t = (lo + (hi - lo) * (i + 0.5) / n) / seg;
          const rT = radii[0] * (1 - 0.3 * t);       // the mast's own taper
          const cx = x + Math.sin(rakeRad) * seg * t, cyy = y + seg * t;
          if (ironHoops)
            rings.push({ cx, cy: cyy, r: rT + 0.013, h: 0.10, tilt: -rakeRad });
          else {
            /* twelve turns of 3-inch rope is a band about 0.3 m deep */
            rings.push({ cx, cy: cyy, r: rT + 0.028, h: 0.30, tilt: -rakeRad });
            for (const sg of [-1, 1])
              hoops.push({ cx: cx + Math.sin(rakeRad) * sg * 0.21, cy: cyy + sg * 0.21,
                           r: rT + 0.035, h: 0.06, tilt: -rakeRad });
          }
        }
        const rm = ringMesh(rings, ironHoops
          ? (mats.ironBand || (mats.ironBand = new THREE.MeshStandardMaterial(
                { color: 0x23262a, roughness: 0.45, metalness: 0.55 })))
          : ropeMat);
        if (rm) group.add(tag(rm, ironHoops ? 'mastband' : 'woolding'));
        const hm = ringMesh(hoops, mats.woodPale || woodDark);
        if (hm) group.add(tag(hm, 'woolding', 'Woolding hoops'));
      }

      /* ── AND THE CHINESE MADE MAST IS BOUND IN ITS OWN PRACTICE ────────────────────
         The tree rule holds in China too — a pole drawn past 0.55 m through is past what
         one shan-mu gives — but the binding is not Europe's. Needham (IV:3): the heavy
         masts are compound, "built up of several separate longitudinal spars bound
         together with iron straps", and an 1842 Shanghai junk's mainmast measured
         11 ft 6 in round a little above the deck — 1.12 m through, no shrouds or stays.
         Iron bands "and wedges" were the USUAL fittings on a working junk's mast
         (Needham, Fig. 938 caption). So: flat dark iron straps at a structural interval,
         and none of the European signature — no rope wooldings, no paired pale
         pinch-hoops. The interval is DERIVED (no source gives spacing); the straps'
         existence and material are sourced. See Research/MASTHEADS.md. */
      if (FINE && si === 0 && mk.rig === 'junk' && !S.iron && radii[0] * 2 > 0.55) {
        const rings = [];
        const lo = seg * 0.10, hi = seg * 0.86;      // step to just under the halyard sheave
        const n = Math.max(3, Math.round((hi - lo) / 2.6));
        for (let i = 0; i < n; i++) {
          const t = (lo + (hi - lo) * (i + 0.5) / n) / seg;
          const rT = radii[0] * (1 - 0.3 * t);       // the pole's own taper
          rings.push({ cx: x + Math.sin(rakeRad) * seg * t, cy: y + seg * t,
                       r: rT + 0.015, h: 0.14, tilt: -rakeRad });
        }
        const rm = ringMesh(rings, mats.ironBand || (mats.ironBand =
          new THREE.MeshStandardMaterial(
            { color: 0x23262a, roughness: 0.45, metalness: 0.55 })));
        if (rm) group.add(tag(rm, 'mastband', 'Iron mast straps',
          'A great junk\'s mast is compound — no single fir yields a pole a metre through, '
          + 'so several spars are bound together with flat iron straps, the usual fitting '
          + 'on a working junk\'s mast. An 1842 Shanghai junk\'s mainmast measured 1.12 m '
          + 'through a little above the deck, and carried no shrouds or stays at all: the '
          + 'unstayed pole and its straps take the whole thrust of the sail. Strap spacing '
          + 'here is derived from the structural interval; the straps themselves are the '
          + 'record\'s (Needham, Science and Civilisation in China IV:3).'));
      }

      /* ── THE CROW'S NEST ────────────────────────────────────────────────────────
         A barrel or a bucket lashed to the mast at about two thirds of its height, reached
         by a ladder inside the mast on the big liners. Fleet and Lee were in Titanic's when
         they sighted the iceberg, and they had no binoculars: the ship's glasses had been
         locked in a cabinet whose key left with an officer reassigned at Southampton. */
      if (FINE && mk.rig === 'pole' && mk.crowsNest && si === 0) {
        const nest = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.028, B * 0.024, B * 0.045, 12, 1, true),
          mats.woodPale || woodDark);
        nest.position.set(x + Math.sin(rakeRad) * (seg * 0.66), y + seg * 0.66, 0);
        group.add(tag(nest, 'mast', "Crow's nest",
          'The lookout station, about two thirds up the foremast. Fleet and Lee were in Titanic\'s when they sighted the iceberg — without binoculars, the ship\'s glasses having been locked in a cabinet whose key left with an officer reassigned at Southampton.'));
      }
      /* ── THE TOP IS A DATED TECHNOLOGY, like the woolding and the iron hoop ──────────
         The trireme struck her masts before battle and left them ashore; no Greek warship
         or Roman merchantman depiction shows a masthead platform, and lookout duty in
         antiquity was at the BOW. The earliest tops among this fleet's types are the
         cog's, on the 13th-century town seals. So the gate is S.year, the depicted year,
         and the fail-safe runs the honest way: a hull with no stated year gets NO top —
         absence of data does not invent furniture. (Bronze Age crow's nests existed —
         Medinet Habu — but no hull here carries a mast in that gap. Research/MASTHEADS.md.)
         The TOP sits at the head of the lower mast, and the topmast is fidded through it. */
      if (FINE && mk.rig === 'square' && si === 0 && (S.year || 0) >= 1100) {
        const topR = B * 0.20, headR = radii[0] * 0.7;
        const tp = buildTop(topR, mats.woodPale, headR);
        tp.position.set(x + Math.sin(rakeRad) * (y + seg - base), y + seg * 0.90, 0);
        group.add(tp);
        /* ── THE CHEEKS AT THE HOUNDS ──────────────────────────────────────────────
           The top does not float. Bolted to either side of the masthead are two knees
           whose upper faces carry the trestletrees, and everything above — crosstrees,
           platform, the fidded topmast, the men in the top — bears on those two faces.
           The knee is deepest at the trestletrees and tapers away down the mast, which
           is the shape of the load it takes. A single-tier mast (a cog's, a trireme's)
           gets none: with no topmast to fid there is no doubling to carry, and its top
           sits on the hounds of the pole itself. */
        if (mk.only !== 1) {
          const chH = seg * 0.085, chD = radii[0] * 2.1, chW = radii[0] * 0.5;
          const topY = seg * 0.90 - topR * 0.22;       // the trestletrees' underside
          for (const sz of [-1, 1]) {
            const cg = new THREE.BoxGeometry(chD, chH, chW);
            const cp = cg.attributes.position;
            for (let i = 0; i < cp.count; i++)
              if (cp.getY(i) < 0) cp.setX(i, cp.getX(i) * 0.35);
            cg.computeVertexNormals();
            const ck = new THREE.Mesh(cg, mastMat);
            const hy = topY - chH / 2;
            ck.position.set(x + Math.sin(rakeRad) * hy, y + hy, sz * (headR + chW * 0.5));
            ck.rotation.z = -rakeRad;
            group.add(tag(ck, 'cheek'));
          }
        }
      }

      /* ── THE CORBIS — the basket that named the ship ─────────────────────────────────
         Paulus' epitome of Festus: "Corbitae dicuntur naves onerariae, quod in malo earum
         summo pro signo corbes solerent suspendi" — cargo ships are called corbitae
         because baskets were hung at the top of their mast as their sign. The type's own
         name, hoisted as an object. It is DATA (`corbis` on the hull record): only the
         hull whose record attests it wears one, at the head of her tallest mast. */
      if (FINE && S.corbis && si === 0 && mk.height === maxMastShare) {
        const wicker = mats.wicker || (mats.wicker = new THREE.MeshStandardMaterial(
          { color: 0x8a7148, roughness: 0.92, side: THREE.DoubleSide }));
        const cb = new THREE.Group();
        const bk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.25, 0.52, 12, 1, true), wicker);
        const bt = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), wicker);
        bt.rotation.x = -Math.PI / 2; bt.position.y = -0.26;
        bk.add(bt);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 16), wicker);
        rim.rotation.x = Math.PI / 2; rim.position.y = 0.26;
        bk.add(rim);
        cb.add(bk);
        /* hung off the pole's side on a short lanyard to the masthead cap */
        const hang = radii[0] * 0.7 + 0.42;
        const lan = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), ropeMat);
        lan.position.set(0, 0.54, -hang * 0.5);
        lan.rotation.x = -0.96;
        cb.add(lan);
        cb.position.set(x + Math.sin(rakeRad) * (y + seg - base), y + seg * 0.94, hang);
        group.add(tag(cb, 'corbis'));
      }
      if (mk.rig === 'square' && !mk.yards) {
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
        /* the mizzen's lowest yard is the CROSSJACK, and Steel sets its diameter at the
           fore-topsail-yard's rate — a 74 crossed no mizzen course, and the spar that
           spread her mizzen topsail's foot was a lighter stick than a course yard */
        crossYard(y + seg * (si === 0 ? courseAt : 0.88), yardLen,
                  si === 0 ? (isMizzen ? 'topsail' : 'course')
                : si === 1 ? 'topsail' : 'topgallant');
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
      capY = y + seg;
      y += seg * 0.88;
    });

    /* ── THE DOUBLED RIG, FROM THE RECORD: `yards` ON THE MAST ─────────────────────────
       One sail per fidded segment is the 18th-century rig, and it was the CEILING: three
       cloths on a mast whose record hangs six. After about 1850 the deep topsail is split
       in two (Howes' rig — a lower topsail yard fixed at the cap, an upper hoisting above
       it), later the topgallant likewise, because two shallow sails need a fraction of the
       hands one deep one does. Preussen crosses SIX yards on every mast — course, lower and
       upper topsail, lower and upper topgallant, royal — thirty square sails, and the model
       drew ten. So the record may now state the mast's own yard list, and the list is the
       rig: each named yard at its conventional fraction of the whole mast, its length a
       share of the course yard, the sail hanging to the yard below by the same drop chain
       as every other square rig here. The fractions narrow aloft, which is why a doubled
       rig reads as a WALL of canvas — the gaps a viewer can see through are exactly the
       gaps the crew could not have worked. */
    if (mk.rig === 'square' && mk.yards) {
      const T = y - base;                     // truck height above the deck at this mast
      const PLAN = {          // [fraction of T, length as a share of the course yard, diameter rate]
        course: [0.36, 1.000, 'course'],
        ltop:   [0.50, 0.93, 'topsail'],
        utop:   [0.62, 0.85, 'topsail'],
        top:    [0.55, 0.88, 'topsail'],      // the single deep topsail, for a pre-Howes list
        ltg:    [0.73, 0.73, 'topgallant'],
        utg:    [0.83, 0.62, 'topgallant'],
        tg:     [0.76, 0.68, 'topgallant'],   // single topgallant over double topsails (clipper)
        royal:  [0.92, 0.50, 'royal'],
      };
      mk.yards.map(nm => PLAN[nm]).filter(Boolean)
        .sort((a, b) => a[0] - b[0])
        .forEach(([f, r, kind]) => crossYard(base + T * f, lower * 0.875 * r,
                  kind === 'course' && isMizzen ? 'topsail' : kind));
    }

    /* ── THE GEAR THE YARDS ARE WORKED BY ──────────────────────────────────────────────
       The braces (buildRigging) swing a yard round; everything else that holds and works it
       was missing, which is why the rig still read as spars in air rather than a machine.
       LIFTS run from each yardarm up to the mast — they carry the yard's weight, and the V
       over every tier is in every sail plan ever drawn. Each upper sail SHEETS its clews to
       the arms of the yard below (the sheave in the yardarm is what the arm is FOR); the
       course, with no yard beneath it, sheets aft to the rail and hauls its TACK forward.
       And a hoisting yard rides a HALYARD whose fall comes down to the rail — on a
       single-yard mast that is the course itself, hoisted to the masthead to set sail.
       Every line is led from a point this builder has already placed — arm, clew, slings,
       cap — the braces' own rule, so nothing can lead to where a spar is not. One merged
       mesh per category per mast, which is also what the audit counts. */
    if (FINE && mk.rig === 'square' && mastYards.length) {
      const mx = h => x + Math.sin(rakeRad) * (h - base);
      const sT = Math.sin(TRIM), cT = Math.cos(TRIM);
      const V3 = (px, py, pz) => new THREE.Vector3(px, py, pz);
      /* the deck attachment: the bulwark at station uu, on side sgn */
      const rail = (uu, sgn) => {
        const uc = Math.max(0.03, Math.min(0.965, uu));
        const hz = H.halfB * H.wl(uc) * (1 - H.tumble(uc)) * 0.96;
        return V3((uc - 0.5) * L, deckAt(uc) + B * 0.012, sgn * hz);
      };
      const lifts = [], sheets = [], tacks = [], hals = [];
      mastYards.forEach((yd, k) => {
        const above = mastYards[k + 1];
        /* the lift leads to the next yard's slings — which is where the cap of this yard's
           own mast section stands in the drop chain — or to the cap itself for the topmost */
        const hL = above ? above.yy : Math.min(capY, yd.yy + yd.half * 0.9);
        for (const sgn of [1, -1])
          lifts.push([V3(yd.cx + sgn * sT * yd.half, yd.yy, sgn * cT * yd.half),
                      V3(mx(hL), hL, 0)]);
        /* the sail's clews are where makeSail put them: 0.96 of the yard, at the foot —
           unless the sail is furled, when the clew garnets have hauled them up under the
           quarters of the yard, and the sheets lead from there. A sheet led to the set
           clew of a stowed sail is a rope to a point in empty air. */
        const w2 = yd.half * (FURLED ? 0.45 : 0.96);
        const clewY = FURLED ? yd.yy - 0.4 : yd.yy - yd.drop * 0.97;
        for (const sgn of [1, -1]) {
          const clew = V3(yd.cx + sgn * sT * w2, clewY, sgn * cT * w2);
          if (k === 0) {
            sheets.push([clew, rail(u + 0.17, sgn)]);
            tacks.push([clew, rail(u - 0.15, sgn)]);
          } else {
            const below = mastYards[k - 1];
            sheets.push([clew, V3(below.cx + sgn * sT * below.half, below.yy,
                                  sgn * cT * below.half)]);
          }
        }
        /* the halyard fall, slings to the rail, sides alternating by tier. The course of a
           multi-tier rig hangs from fixed jeers and gets none; a single-tier mast's one
           yard is itself the hoisting yard. */
        if (k > 0 || mastYards.length === 1) {
          const sgn = k % 2 ? 1 : -1;
          hals.push([V3(mx(yd.yy) + B * 0.02, yd.yy, 0),
                     rail(u + 0.05 + 0.015 * k, sgn)]);
        }
      });
      const rr = B * 0.0004;
      const lm = ropeMesh(lifts, 0.012 + rr, ropeMat);  if (lm) group.add(tag(lm, 'lift'));
      const sm = ropeMesh(sheets, 0.013 + rr, ropeMat); if (sm) group.add(tag(sm, 'sheet'));
      const tm = ropeMesh(tacks, 0.013 + rr, ropeMat);  if (tm) group.add(tag(tm, 'tack'));
      const hm = ropeMesh(hals, 0.011 + rr, ropeMat);   if (hm) group.add(tag(hm, 'halyard'));
    }

    if (mk.rig === 'square') {
      mastTops.push({ u, x, y: y + (lower * 0.14) });
      /* the staysail block below needs each square mast's own station and truck height */
      stayMasts[mi] = { x, base, T: y - base };
    }
    /* a gaff masthead is a stay anchorage too — the schooner's web is drawn in
       buildRigging from these, and it is a different web from a square-rigger's */
    else if (mk.rig === 'gaff' && segs.length)
      mastTops.push({ u, x, y: y + segs[segs.length - 1] * 0.09, gaff: true });

    /* ── THE TRIPOD MAST, from the record: `tripod: true` ──────────────────────────────
       A turbine warship's pole mast vibrates — engines and gun blast both — and a fire-
       control top needs to hold a steady line on a target ten kilometres off, so the pole
       gets two STRUTS and becomes a tripod. Photograph H61017 (Dreadnought, 1906) fixes the
       geometry: the vertical leg carries the SPOTTING TOP at its head, the struts plant
       their feet on deck well ABAFT the pole and rake up forward to the join under the top,
       splayed outboard so the three feet make a stance. On Dreadnought the whole mast stood
       abaft the fore funnel — which put the spotting top in the funnel plume, the one
       design error she carried her whole life. The mast station is DATA; this builder only
       makes the declared tripod true in the drawing. */
    if (mk.tripod && (mk.rig === 'none' || mk.rig === 'pole')) {
      const legMat = S.turrets
        ? (mats.mastGrey || (mats.mastGrey = new THREE.MeshStandardMaterial(
              { color: 0x5a6067, roughness: 0.55, metalness: 0.30 })))
        : woodDark;
      const yJoin = base + lower * 0.62;
      /* direction and rake are the RECORD's: Dreadnought's fore struts planted aft at a
         hard ~26° (H61017); her main tripod mirrored, shallower, to land its feet in the
         gap between X turret and the pole. `tripod: -1` rakes the feet forward. */
      const dirn = mk.tripod === -1 ? -1 : 1;
      const legRun = dirn * Math.tan((mk.tripodRake !== undefined ? mk.tripodRake : 26)
                                     * Math.PI / 180) * (lower * 0.62);
      const spread = Math.min(B * 0.13, lower * 0.10); // and splayed outboard
      for (const sgn of [1, -1]) {
        const uFoot = Math.max(0.02, Math.min(0.98, u + legRun / L));
        const foot = new THREE.Vector3(x + legRun, deckAt(uFoot) - 0.4, sgn * spread);
        const head = new THREE.Vector3(x, yJoin, 0);
        const dir = new THREE.Vector3().subVectors(head, foot);
        const len = dir.length();
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.011, B * 0.014, len, 8), legMat);
        leg.position.copy(foot).addScaledVector(dir, 0.5);
        leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        group.add(tag(leg, 'mast', 'Tripod leg',
          'One of the two struts that brace the pole. A pole mast on a turbine ship vibrates too much to hold a rangefinder steady, so the fire-control top stands on three legs.'));
      }
      const stp = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.085, B * 0.072, 2.1, 14), legMat);
      stp.position.set(x, yJoin + 1.05, 0);
      group.add(tag(stp, 'mast', 'Spotting top',
        'The fire-control position at the masthead: observers here spot the fall of shot and correct the guns. On Dreadnought this mast stood abaft the fore funnel, so at speed the top filled with hot smoke — the famous flaw that her successors inherited for a decade.'));
    }

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
      /* the same per-mast thickness rule as the square masts above — a caravel's three
         lateens are three different trees — and the spar is tagged like every other mast */
      const mm = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.020 * dScale[0], B * 0.032 * dScale[0], mh, 18),
        woodDark);
      mm.position.set(x, (base + sling[1]) / 2, 0);
      group.add(tag(mm, 'mast'));

      const ylen = Math.hypot(peakPt[0] - heel[0], peakPt[1] - heel[1]);
      /* "Mizen-yard, 2/3 of the diameter of the main-yard" — Steel 1794's yard-diameter
         table laws the one lateen spar it knows, the crossed mizzen yard of a square-rigged
         ship, so the mixed case takes it: 2/3 of the main yard cut at the main's own rate.
         A pure lateen craft's composite yard keeps its drawn proportion — its record is a
         different tradition and still to be read (r70 candidate). */
      const mzD = mixed ? (mainLower * 0.875 * 0.700 / 36) * 2 / 3 : 0;
      const ym = new THREE.Mesh(
        new THREE.CylinderGeometry(mixed ? mzD * 0.21 : B * 0.005,
                                   mixed ? mzD * 0.50 : B * 0.011, ylen, 14), woodDark);
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
      if (FURLED) {
        /* Mediterranean and Indian Ocean practice: the yard stays aloft and the cloth is
           brailed and rolled to it. The roll runs the canvas's own stretch of the spar —
           tack to peak — not the bare overhanging heel. */
        const area = S.settee
          ? triA2(tack, peakPt, clew) * (1 - S.settee * 0.35)
          : triA2(tack, peakPt, clew);
        sails.push(makeFurl(new THREE.Vector3(tack[0], tack[1], 0),
                            new THREE.Vector3(peakPt[0], peakPt[1], 0),
                            area, furlMat(mats), group, {}));
      } else if (S.settee) {
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
        /* one cloth, same as the gaff quad — the two-triangle build tore along the shared
           diagonal because the noise terms scale with each triangle's own edges */
        sails.push(makeQuadSail(foreft, throat, peakPt, clew, group, 0.075));
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
      /* a crab claw furls by CLOSING: the boom swings up against the yard and the cloth is
         rolled between the two spars — the rig scissors shut about its own tack */
      const aB = FURLED ? 1.09 : 0.46;
      const tipY = [tack[0] + Math.cos(1.19) * sparLen, tack[1] + Math.sin(1.19) * sparLen];
      const tipB = [tack[0] + Math.cos(aB) * sparLen, tack[1] + Math.sin(aB) * sparLen];
      [[tipY, 'Yard'], [tipB, 'Boom']].forEach(([tip, nm]) => {
        const len2 = Math.hypot(tip[0] - tack[0], tip[1] - tack[1]);
        const g2 = new THREE.CylinderGeometry(B * 0.007, B * 0.014, len2, 14);
        const m2 = new THREE.Mesh(g2, woodDark);
        m2.position.set((tack[0] + tip[0]) / 2, (tack[1] + tip[1]) / 2, 0);
        m2.rotation.z = -Math.atan2(tip[0] - tack[0], tip[1] - tack[1]);
        group.add(tag(m2, 'yard', nm));
      });
      if (FURLED) {
        const area = S.sailAreaEach || 0.5 * sparLen * sparLen * Math.sin(spread) * LEECH;
        const mid = [(tipY[0] + tipB[0]) / 2, (tipY[1] + tipB[1]) / 2];
        sails.push(makeFurl(new THREE.Vector3(tack[0], tack[1], 0),
                            new THREE.Vector3(mid[0], mid[1], 0),
                            area, furlMat(mats), group, {}));
      } else {
        /* the leech of a crab claw is CONCAVE, which is most of why it looks like a claw and
           also why it works: the deeply raked tips shed tip vortices and it out-performs a
           triangle of the same area on a reach (Marchaj's tunnel tests on the Pacific rigs) */
        sails.push(makeTriSail(tack, tipY, tipB, group, 0.075, S.leechPull || 0.46));
      }
    }
    if (mk.rig === 'gaff' || (mk.rig === 'square' && mk.spanker)) {
      /* ── THE GAFF SCHOONER ─────────────────────────────────────────
         A quadrilateral fore-and-aft sail set between a BOOM along the deck and a GAFF angled
         up from the mast. It is the rig that made the big American schooners possible, and the
         reason is crew: a gaff sail is handled entirely from the deck. Nobody goes aloft to
         reef it. Wyoming carried 3,730 tons on six masts with a crew of THIRTEEN, where a
         square-rigged ship of that tonnage wanted thirty or more — and that ratio, not speed,
         is why the American coal and lumber trades went to schooners.
         ── AND THE FULL-RIGGER'S SPANKER, FROM THE RECORD: `spanker` ON A SQUARE MAST ──
         A full-rigged ship carries this same quadrilateral abaft her aftermost mast — the
         one fore-and-aft sail on the ship, and the one that balances her helm. Preussen's
         47 sails end with it. On a square mast the gaff sets LOW, under the crossed canvas:
         the throat sits at about half the lower mast, where every photograph of the
         P-liners puts it, not at 0.86 where a schooner's whole hoist would go. */
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
      /* the SET geometry decides the cloth's area whichever state it is shown in — furling
         does not change how much canvas she owns */
      const gy = base + lower * (mk.rig === 'square' ? 0.55 : 0.86);
      const setThroat = [x, gy];
      const setPeak = [x + Math.cos(peak) * gaffL, gy + Math.sin(peak) * gaffL];
      const tack = [x, footY], clew = [x + boomL, footY];
      const quadArea = triA2(tack, setThroat, setPeak) + triA2(tack, setPeak, clew);
      if (FURLED) {
        /* a gaff sail is handled entirely from the deck, and it stows the same way: halyards
           run, the GAFF COMES DOWN with the cloth folding between it and the boom, and the
           bundle is lashed along the top of the boom. The gaff rests on the stowed sail,
           just peaked above it. */
        const r = Math.max(0.05, Math.sqrt((quadArea * 0.035) / (Math.PI * Math.max(boomL, 0.1))));
        sails.push(makeFurl(new THREE.Vector3(x, footY + r * 1.1, 0),
                            new THREE.Vector3(x + boomL, footY + r * 1.1, 0),
                            quadArea, furlMat(mats), group, { radius: r }));
        const rest = 0.13;                       // the lowered gaff's slight peak
        const gm = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.008, B * 0.012, gaffL, 14), woodDark);
        gm.rotation.z = -(Math.PI / 2 - rest);
        gm.position.set(x + Math.cos(rest) * gaffL / 2,
                        footY + r * 2.2 + Math.sin(rest) * gaffL / 2, 0);
        group.add(tag(gm, 'yard', 'Gaff'));
        /* the jib-headed topsail is set flying and comes DOWN to the deck when struck —
           a furled ship shows a bare topmast, which is what the harbour photographs show */
      } else {
        const gm = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.008, B * 0.012, gaffL, 14), woodDark);
        gm.rotation.z = -(Math.PI / 2 - peak);
        gm.position.set(x + Math.cos(peak) * gaffL / 2, gy + Math.sin(peak) * gaffL / 2, 0);
        group.add(tag(gm, 'yard', 'Gaff'));
        /* the sail is the quadrilateral: throat, peak, clew, tack — built from the two spars'
           own endpoints so it cannot come adrift of either */
        /* ⚠ ONE CLOTH, NOT TWO TRIANGLES. This quad was two makeTriSail calls sharing the
           tack→peak diagonal, and every gaff sail in the fleet wore a SLIT along it: the
           corner-crease and scallop noise scales with each triangle's own luff length, and the
           two triangles' luffs differ, so the shared edge disagreed with itself by up to half a
           metre of z and the cloth tore open below the peak. A sail is one piece of canvas;
           build it as one surface and there is no seam to disagree across. */
        sails.push(makeQuadSail(tack, setThroat, setPeak, clew, group, 0.075));
        /* ── THE GAFF TOPSAIL, FROM THE RECORD: `topsail` ON THE MAST ────────────────────
           The jib-headed topsail fills the triangle between the topmast, the gaff and the
           peak — the highest canvas on the ship, set where the wind is. It is the record's
           call, not the topmast's: Wyoming's 22 sails include six of these, while the
           reference model of Great Eastern shows her six topmasts standing BARE over white
           lower masts — an auxiliary steamer's fore-and-aft canvas was her lowers. */
        if (mk.topmast && mk.topsail) {
          const topSeg = lower * 0.52;
          const truckY = base + lower * 0.88 + topSeg * 0.96;
          sails.push(makeTriSail([x, gy + lower * 0.015], [x, truckY], setPeak, group, 0.035, 0.92));
        }
      }
    }
    if (mk.rig === 'junk') {
      /* ── THE BATTENED LUG, to Reddish's measured average ────────────
         Vincent Reddish scaled and averaged ELEVEN photographs of Chinese ocean-trading junks
         under sail and published the proportions (*Practical Boat Owner*, 2022): usually FIVE
         battens, rarely six; boom and battens all equal within 5%; the luff and the yard both
         two thirds of the boom; total leech 1.75 x boom; sail area 1.10 x boom²; and only 8%
         of the sail's width carried forward of the mast.
         ⚠ THOSE NUMBERS DO NOT MAKE A RECTANGLE, AND FOR ELEVEN ROUNDS THEY WERE DRAWN AS
         ONE. A yard two thirds of the boom with a leech 1.75 booms long can only close as a
         FAN: the yard stands steep — near 60° in the photographs — and the battens swing up
         progressively to meet it, which is the high-peaked profile in every picture of an
         ocean junk, including this card's own reference photograph. Parallel battens under a
         level head gave the right proportions and the wrong ship: the rig read as a wall of
         white square sails. The spar angles ARE the sail plan, so the spars are laid first
         and the cloth is cut to them, panel by panel. The straight-line leech comes out at
         1.6 booms here; Reddish's 1.75 is measured along roached panel edges we do not cut. */
      const nb = 5;                   // Reddish: usually five battens
      const THB = 26 * Math.PI / 180; // the top batten's rake above the horizontal boom
      const THY = 60 * Math.PI / 180; // the yard's — steep, and the fan's whole character
      /* ── THE RIG STANDS CLEAR OF THE CASTLE ────────────────────────────────────────
         The after masts of a five-master step INSIDE the aft castle's span, and a boom at
         0.14 of the mast put their lower panels straight through the castle roof. The rig
         reads the castle from the SAME data the castle is built from: the foot rises over
         it, and the fan shrinks to the hoist that is left below the truck — which is also
         the record's look, the small jigger sail standing over the poop. */
      const castleTop = (S.poop && S.poop.length === 3 &&
                         u >= S.poop[0] - 0.02 && u <= S.poop[1] + 0.02)
        ? B * 0.115 * S.poop[2] * 1.10 : 0;
      const footY = base + lower * 0.14 + castleTop;   // the boom lies just above the deck
      /* peak height above the foot is boom x (2/3)(1 + sin THY) = 1.244 booms; the boom is
         sized so the PEAK, not the head rope, reaches the truck */
      const boom = Math.min(lower * 0.66, (base + lower * 0.97 - footY) / 1.244);
      const luffH = boom * (2 / 3);
      const yardL = boom * (2 / 3);
      const xF = -0.08 * boom;        // 8% of the chord stands forward of the mast
      /* ── ⚠ A BATTEN IS IN THE SAIL, NOT NEAR IT (round 11). ─────────────────────────
         The whole rig — boom, battens, yard, canvas, sheets — is one group hung on the
         mast, and sheeting it is a single rotation of that group. Nothing in it can
         disagree with anything else in it. */
      const lug = new THREE.Group();
      lug.position.set(x, 0, 0);
      lug.rotation.y = -TRIM * 1.5;
      group.add(lug);
      /* every spar as its two endpoints, boom (k=0) to yard (k=nb+1); the cloth is built
         from the SAME points, so spar and canvas cannot come adrift of each other */
      const fwd = [], aft = [];
      if (FURLED) {
        /* a junk furls by DROPPING: ease the halyard and the battens stack themselves onto
           the boom, the cloth folding between them like a closed blind. That one motion,
           worked from the deck, is most of what the rig is FOR — and the stack it leaves,
           spar on fold on spar just above the boom, is the whole look of a moored junk. */
        const dyS = B * 0.014;
        for (let k = 0; k <= nb; k++) {
          fwd.push([xF, footY + k * dyS]);
          aft.push([xF + boom, footY + k * dyS]);
        }
        fwd.push([xF, footY + (nb + 1) * dyS]);
        aft.push([xF + yardL, footY + (nb + 1) * dyS]);   // the yard lies level atop the stack
      } else {
        for (let k = 0; k <= nb; k++) {
          const a = THB * Math.pow(k / nb, 1.4); // lower battens near-level, upper ones fanned
          const f = [xF, footY + luffH * (k / (nb + 1))];
          fwd.push(f);
          aft.push([f[0] + boom * Math.cos(a), f[1] + boom * Math.sin(a)]);
        }
        fwd.push([xF, footY + luffH]);           // the throat, where the yard is slung
        aft.push([xF + yardL * Math.cos(THY), footY + luffH + yardL * Math.sin(THY)]);
      }
      for (let k = 0; k < fwd.length; k++) {
        const dx = aft[k][0] - fwd[k][0], dy = aft[k][1] - fwd[k][1];
        const len = Math.hypot(dx, dy);
        const r = B * (k === 0 ? 0.0050 : k === nb + 1 ? 0.0042 : 0.0032);
        const bg = new THREE.CylinderGeometry(r, r, len, 12);
        const bm = new THREE.Mesh(bg, woodDark);
        bm.rotation.z = Math.PI / 2 + Math.atan2(dy, dx);
        bm.position.set((fwd[k][0] + aft[k][0]) / 2, (fwd[k][1] + aft[k][1]) / 2, 0);
        lug.add(tag(bm, 'yard', k === 0 ? 'Boom' : (k === nb + 1 ? 'Yard' : 'Batten ' + k)));
      }
      if (FURLED) {
        /* the folds: between each stacked pair the cloth pooches out both sides, one
           bulge per gap — the striped bundle every photograph of a moored junk shows */
        const dyS = B * 0.014;
        for (let k = 0; k <= nb; k++) {
          const y0 = (fwd[k][1] + fwd[k + 1][1]) / 2;
          const lenK = Math.min(aft[k][0], aft[k + 1][0]) - xF;
          sails.push(makeFurl(new THREE.Vector3(xF, y0, 0),
                              new THREE.Vector3(xF + lenK, y0, 0),
                              0, furlMat(mats), lug, { radius: dyS * 0.85 }));
        }
      } else {
        /* the cloth, one panel between each pair of spars — a junk sail really is panels: the
           batten line is a hinge in the cloth, and each panel sets nearly flat */
        for (let k = 0; k <= nb; k++)
          sails.push(makeQuadSail(fwd[k], fwd[k + 1], aft[k + 1], aft[k], lug, 0.030));
      }
      /* ── THE GEAR IS WHY THE RIG WORKS, SO IT IS DRAWN ──────────────────────────────
         A sheetlet to every batten end, gathered to one point on the deck aft — the
         crowfoot in every photograph — and the halyard from the yard's slings to the
         masthead. Both live in the sail's own group: the crowfoot must swing with the sail
         it trims. The sheet lead is capped by the room the ship actually has abaft this
         mast (gapAft), because the aftermost sail of a five-master would otherwise sheet to
         a point past the taffrail, in the air. */
      const shX = xF + Math.min(boom * 1.16, gapAft * 0.90);
      /* the crowfoot lands on the castle roof where there is one — the after sheets of a
         junk really were worked from the poop deck, not led down through it */
      const sheetPt = new THREE.Vector3(shX, base + castleTop + B * 0.012, 0);
      const shSegs = [];
      for (let k = 0; k <= nb; k++)
        shSegs.push([new THREE.Vector3(aft[k][0], aft[k][1], 0), sheetPt]);
      const sh = ropeMesh(shSegs, 0.012 + B * 0.0005, ropeMat);
      if (sh) lug.add(tag(sh, 'sheet'));
      const slings = new THREE.Vector3(
        (fwd[nb + 1][0] + aft[nb + 1][0]) / 2, (fwd[nb + 1][1] + aft[nb + 1][1]) / 2, 0);
      const hal = ropeMesh([[slings, new THREE.Vector3(0, base + lower * 0.985, 0)]],
                           0.016 + B * 0.0005, ropeMat);
      if (hal) lug.add(tag(hal, 'halyard'));
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

      /* ── THE UPPER MASTS ARE STAYED TOO ─────────────────────────────────────────────
         The shrouds above stopped at the lower masthead, so every topmast and topgallant
         in the fleet stood as an unstayed pole — the one thing a fidded mast can never be,
         since sending it up is only possible because its rigging comes up after it. A
         topmast is stayed exactly as its lower mast is, one storey up: FUTTOCK shrouds run
         from the stave on the lower shrouds out to the RIM of the top — the overhang every
         hand climbed leaning backwards — where the TOPMAST shrouds set up on their own
         deadeye row and run to the topmast head, rattled down because the topsail yards
         are worked from them. The TOPGALLANT set above is a light pair set up at the
         crosstrees, no ratlines. FINE only, like the stays and braces: the coarse token
         keeps the lower rig. */
      const tiersDrawn = mk.rig === 'square'
        ? (mk.only ? Math.min(mk.only, segs.length) : segs.length) : 1;
      if (FINE && mk.rig === 'square' && tiersDrawn >= 2) {
        const platX = x + Math.sin(rakeRad) * lower;         // where buildTop stands
        const platY = base + lower * 0.90;
        const platR = B * 0.20;
        const mxAt = h => x + Math.sin(rakeRad) * (h - base);
        const topHead = base + lower * 0.88 + top * 0.97;
        const futt = [], upPts = [[], []], upSegs = [], upRats = [], tgSegs = [];
        for (let s = 0; s < mk.shrouds; s++) {
          const f = (s + 1) / (mk.shrouds + 1);
          [1, -1].forEach((side, si2) => {
            const [a, b] = shroudPts[si2][s];
            const stave = new THREE.Vector3().lerpVectors(a, b, 0.80);
            futt.push([stave, new THREE.Vector3(platX + (f - 0.5) * platR * 0.9,
                                                platY, side * platR * 0.85)]);
          });
        }
        const nT = Math.max(2, Math.round(mk.shrouds * 0.6));
        for (let s = 0; s < nT; s++) {
          const f = (s + 1) / (nT + 1);
          [1, -1].forEach((side, si2) => {
            const a = new THREE.Vector3(platX + (f - 0.5) * platR * 1.0,
                                        platY + B * 0.01, side * platR * 0.85);
            const b = new THREE.Vector3(mxAt(topHead), topHead, side * B * 0.022);
            upSegs.push([a, b]);
            upPts[si2].push([a, b]);
          });
        }
        upPts.forEach(side => {
          if (side.length < 2) return;
          const rise = topHead - platY;
          for (let h = RAT; h < rise * 0.86; h += RAT) {
            const t = h / rise;
            const pts = side.map(([a, b]) => new THREE.Vector3().lerpVectors(a, b, t));
            for (let i = 0; i < pts.length - 1; i++) upRats.push([pts[i], pts[i + 1]]);
          }
        });
        if (tiersDrawn >= 3) {
          const ctR = B * 0.085;
          /* the crosstrees at the topmast head — the spread without which a topgallant
             shroud would run straight down its own mast and stay nothing */
          const ct = new THREE.Group();
          for (const dx of [-1, 1]) {
            const bar = new THREE.Mesh(
              new THREE.BoxGeometry(B * 0.022, B * 0.014, ctR * 2.3),
              mats.woodPale || woodDark);
            bar.position.set(mxAt(topHead) + dx * B * 0.020, topHead, 0);
            ct.add(bar);
          }
          group.add(tag(ct, 'top', 'Crosstrees',
            'The light spreaders at the topmast head — trestletrees and crosstrees without '
            + 'a platform. They spread the topgallant shrouds the way the top spreads the '
            + "topmast's, one storey further up."));
          const tgHead = base + (lower + top) * 0.88 + tg * 0.95;
          const nG = Math.max(2, Math.round(mk.shrouds * 0.35));
          for (let s = 0; s < nG; s++) {
            const f = (s + 1) / (nG + 1);
            for (const side of [1, -1])
              tgSegs.push([new THREE.Vector3(mxAt(topHead) + (f - 0.5) * ctR,
                                             topHead + B * 0.008, side * ctR * 0.9),
                           new THREE.Vector3(mxAt(tgHead), tgHead, side * B * 0.014)]);
          }
        }
        const fu = ropeMesh(futt, 0.014 + B * 0.0006, ropeMat);
        if (fu) group.add(tag(fu, 'shroud', 'Futtock shrouds'));
        const up = ropeMesh(upSegs, 0.014 + B * 0.0007, ropeMat);
        if (up) group.add(tag(up, 'shroud', 'Topmast shrouds'));
        const ur = ropeMesh(upRats, 0.014 + B * 0.0005, ropeMat);
        if (ur) group.add(tag(ur, 'ratline', 'Topmast ratlines'));
        const tgm = ropeMesh(tgSegs, 0.010 + B * 0.0004, ropeMat);
        if (tgm) group.add(tag(tgm, 'shroud', 'Topgallant shrouds'));
      }
    }
  });

  /* ── MAST-TO-MAST STAYSAILS, FROM THE RECORD: `staysails: n` ON THE AFTER MAST ─────────
     The canvas BETWEEN a square-rigger's masts. A late full-rigger's stays run from high on
     each mast down and forward to the mast ahead, and they carry sail — Preussen's record is
     47 sails and twelve of them are these, three in each of her four gaps, the staircase of
     triangles every photograph of her shows threading the square canvas. They are not
     decoration: staysails pull on a reach when the square sails blanket each other, and they
     were the last canvas struck in a blow. Same rule as the jibs — each sail's luff IS its
     stay, drawn from the same two points, so stay and sail cannot come adrift of one another.
     The lowest stay runs topmast-head to the cap of the mast ahead; the suit climbs from
     there toward the truck. */
  S.masts.forEach((mk, mi) => {
    if (!mk.staysails || !mi) return;
    const aftM = stayMasts[mi], fwdM = stayMasts[mi - 1];
    if (!aftM || !fwdM) return;
    for (let k = 0; k < mk.staysails; k++) {
      const t = mk.staysails === 1 ? 0.5 : k / (mk.staysails - 1);
      const hi = [aftM.x, aftM.base + aftM.T * (0.55 + 0.38 * t)];
      const lo = [fwdM.x, fwdM.base + fwdM.T * (0.33 + 0.38 * t)];
      const st = ropeMesh([[new THREE.Vector3(lo[0], lo[1], 0),
                            new THREE.Vector3(hi[0], hi[1], 0)]], 0.016 + B * 0.0005, ropeMat);
      if (st) group.add(tag(st, 'stay'));
      const at = f => [lo[0] + (hi[0] - lo[0]) * f, lo[1] + (hi[1] - lo[1]) * f];
      /* tack near the stay's foot, head hoisted close under the after masthead, clew sheeted
         down and aft — the leech falls steeply, the foot runs nearly level, which is the
         shape the photographs show. Flat cloth, like the jibs: a staysail is set on a taut
         stay, not bagged out like a course. */
      const tack = at(0.08), head = at(0.90);
      const clew = [hi[0] - (hi[0] - lo[0]) * 0.24, lo[1] + (hi[1] - lo[1]) * 0.10];
      /* furled, a staysail runs DOWN its own stay: the cloth gathers along the foot of the
         stay it hoists on and is lashed there — the stay stays, the triangle goes */
      const ss = FURLED
        ? makeFurl(new THREE.Vector3(at(0.04)[0], at(0.04)[1], 0),
                   new THREE.Vector3(at(0.28)[0], at(0.28)[1], 0),
                   triA2(tack, head, clew), furlMat(mats), group, {})
        : makeTriSail(tack, head, clew, group, 0.028, 0.96);
      /* a real half-metre of z between neighbours where the suits cross, the jib rule */
      if (ss) ss.position.z = (k - (mk.staysails - 1) / 2) * B * 0.020;
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
    /* a point f of the way out along the spar, from its root at the stemhead */
    const spritAt = f => [x0 - Math.cos(steeve) * len * f,
                          deckAt(u0) + Math.sin(steeve) * len * f];

    /* ── THE BOBSTAY, WHICH IS WHY THE SPAR STAYS IN THE SHIP ────────────────────────
       Every stay the bowsprit anchors pulls UP on it; the bobstay is the chain from the
       stem at the waterline that pulls back down, and a sprit carrying headsails without
       one is a spar about to be lifted out of the ship. Two, on the big schooners —
       inner and cap. */
    if (S.headsails) {
      const stemFoot = new THREE.Vector3(x0 + B * 0.03, 0.5, 0);
      const bobSegs = [0.52, 0.93].map(f => {
        const p = spritAt(f);
        return [stemFoot, new THREE.Vector3(p[0], p[1] - B * 0.012, 0)];
      });
      const bob = ropeMesh(bobSegs, 0.030 + B * 0.0008, ropeMat);
      if (bob) group.add(tag(bob, 'stay', 'Bobstay',
        'The chain from the stem at the waterline that holds the bowsprit DOWN. Every '
        + 'headsail stay pulls up on the spar; this is the counter-pull that keeps it in '
        + 'the ship.'));
    }

    /* ── THE HEADSAILS, WHICH ARE THE FRONT OF THE SHIP'S SILHOUETTE ─────────────────
       `headsails: n` in the record hangs n triangular sails on stays running from stations
       along the bowsprit up the foremast: the fore staysail tacked near the stemhead and
       hoisted to the hounds, the outermost flying jib tacked at the cap and hoisted to the
       topmast truck. Each sail's luff IS its stay, so stay and sail are drawn from the same
       two points and cannot come adrift of one another. On the six-masted schooners this
       suit — worked by the hoisting engine, like everything else forward — was five sails. */
    if (S.headsails && S.masts && S.masts.length) {
      const fm = S.masts[0];
      const steelMain = (S.lwl + S.beam) / 2;
      const flower = fm.heightM !== undefined ? fm.heightM : fm.height * steelMain;
      const fx = (fm.at - 0.5) * L + H.rake(fm.at);
      const fbase = deckAt(fm.at);
      const hounds = fbase + flower * 0.78;
      /* the outermost stay stops at the topmast HEAD, short of the truck — hoisted to the
         truck itself the flying jib lies in the fore topsail's own triangle.
         ⚠ A SQUARE FOREMAST HAS A TOPMAST BY CONSTRUCTION — the fidded second segment —
         and the flying jib runs to ITS head. Capped at 0.94 of the lower mast, Preussen's
         four jibs stacked into the bottom quarter of a 45 m foremast and read as a squashed
         fan; the real suit climbs to the fore topmast head, which is most of what makes a
         P-liner's head profile. */
      const truck = fbase + (fm.topmast ? flower * 0.88 + flower * 0.52 * 0.80
                           : fm.rig === 'square' ? flower * 0.88 + flower * 0.60 * 0.72
                           : flower * 0.94);
      const n = S.headsails;
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 0.6 : k / (n - 1);
        const tack = spritAt(0.10 + 0.86 * t);
        const head = [fx, hounds + (truck - hounds) * t];
        const staySeg = [new THREE.Vector3(tack[0], tack[1], 0),
                         new THREE.Vector3(head[0], head[1], 0)];
        const st = ropeMesh([staySeg], 0.020 + B * 0.0006, ropeMat);
        if (st) group.add(tag(st, 'stay'));
        const luff = Math.hypot(head[0] - tack[0], head[1] - tack[1]);
        const clew = [tack[0] + (fx - tack[0]) * 0.52, tack[1] + luff * 0.13];
        /* ⚠ THE CLOTH AMPLITUDE SCALES WITH THE LUFF, AND A JIB'S LUFF IS ENORMOUS.
           makeTriSail's wrinkle terms were sized on 20–30 m sail luffs; a flying jib's stay
           runs 45 m, and at the gaff sails' belly the suit rendered as limp laundry — five
           deeply-creased cloths interleaving through one another. A working jib is the
           FLATTEST sail on the ship: it is set flying on a bar-taut stay. Small belly,
           near-straight leech, and a real half-metre of z between neighbouring sails so
           the overlapping suit reads as separate sails. */
        /* furled, a jib is downhauled to its tack and stowed in a bundle lying ALONG the
           bowsprit — the lumpy line along the sprit in every harbour photograph of a
           schooner. The first cut ran the bundle up the STAY instead, and the head rig
           wore a row of standing cocoons: the downhaul brings the cloth to the tack, but
           the crew lashes it to the SPAR, not to the wire. */
        let hs;
        if (FURLED) {
          const luff2 = Math.hypot(head[0] - tack[0], head[1] - tack[1]);
          const halfF = Math.min(0.14, (luff2 * 0.075) / len);
          const fT = 0.10 + 0.86 * t;
          const bA = spritAt(Math.max(0.02, fT - halfF)), bB = spritAt(Math.min(0.98, fT + halfF));
          hs = makeFurl(new THREE.Vector3(bA[0], bA[1] + B * 0.012, 0),
                        new THREE.Vector3(bB[0], bB[1] + B * 0.012, 0),
                        triA2(tack, head, clew), furlMat(mats), group, {});
        } else {
          hs = makeTriSail(tack, head, clew, group, 0.020, 0.97);
        }
        if (hs) hs.position.z = (k - (n - 1) / 2) * B * 0.032;
      }
    }
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
      /* ⚠ AND IT BELLIES FORWARD, NOT AFT — every square sail on every ship had this
         backwards. The belly was clamped to local +z, and `m.rotation.y = PI/2` maps local +z
         onto hull +x, which this file's own comments define as AFT (line ~964, "+x is AFT";
         line ~3132, "bow at -x"). So the canvas sat permanently abaft its yard and you could
         see the masts standing in front of the sails from ahead.
         A square sail bellies to LEEWARD. A square-rigger's working condition is the wind
         abaft the beam — that is the whole point of the rig — so the cloth sets FORWARD of
         the yard and the mast, pressing away from them. Aft of the mast is what a sail looks
         like when it is aback: caught on the wrong side, driving the ship astern. It is the
         one sail attitude that means the ship is in trouble, and the fleet was wearing it. */
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
      /* ⚠ MIRRORED HERE, AFTER THE CLOTH DETAIL, AND THAT ORDER IS THE WHOLE CORRECTION.
         The belly must end up FORWARD — see the note above — but negating it at the top of the
         loop was wrong twice over: the crease, roband and slack terms are all written as
         POSITIVE additions to a positive belly, so against a negative one they pushed back
         toward the plane and through it, and the cloth crumpled through itself. The first
         attempt produced sails that read as narrow strips instead of full courses.
         Mirroring the finished vertex keeps every one of those relationships intact and simply
         reflects the whole sail. computeVertexNormals() below then derives normals from the
         reflected winding, so the lighting follows it. */
      pos.push(xw, y, -z);
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
      /* ── ⚠ THE CREASES IGNORED THE SET OF THE SAIL ─────────────────────────────────
         Every crease term below scaled with the LUFF alone, tuned on the lateen's 20–30 m
         yards — so a flying jib on a 45 m stay wore over two metres of summed wrinkle,
         and the whole head suit of any big square-rigger hung like laundry however small
         its `belly` said its draft was. A crease is SLACK, and how much slack a sail
         carries is exactly what `belly` already states: a lateen bags, a jib is set
         flying on a bar-taut stay and is the flattest cloth on the ship. So the creases
         follow the sail's own set, normalised to the lateen they were tuned on, and a
         sail set softer than the lateen gains nothing (the cap). */
      const slack = Math.min(1.0, belly / 0.055);
      /* Load enters a triangular sail at THREE POINTS and nowhere else, so the cloth
         creases in fans running inward from the tack, the peak and the clew. */
      const dA = t, dB = Math.hypot(sA, 1 - t), dC = Math.hypot(1 - sA, 1 - t);
      const corner = Math.exp(-dA * 3.0) + Math.exp(-dB * 3.4) + Math.exp(-dC * 3.4);
      z += Math.sin((sA * 7.0 + t * 11.0) * Math.PI) * corner * head * 0.016 * slack;
      /* the luff is laced to the yard at intervals, so it scallops between the lacings */
      z += Math.sin(t * Math.PI * 9.0) * Math.exp(-sA * 14.0) * head * 0.011 * slack;
      /* a loose foot does the same between tack and clew */
      z += Math.sin(t * Math.PI * 5.0) * Math.exp(-(1 - sA) * 10.0) * head * 0.009 * slack;
      /* and cloth is never taut everywhere at once */
      z += Math.sin(sA * 9.0 + t * 6.0) * span * Math.pow(t, 1.5) * head * 0.011 * slack;
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

/* ── THE QUADRILATERAL SAIL, AS ONE CLOTH ──────────────────────────────────────────────
 * A gaff sail and a settee are four-cornered, and both were built as two triangles on the
 * diagonal — which put a SEAM through the middle of a single piece of canvas, and the seam
 * showed: the crease and scallop noise in makeTriSail scales with each triangle's own luff,
 * the two luffs differ, so the shared edge carried two different z values and the sail hung
 * open along it. One parameterisation over the whole quad has no edge to disagree across.
 *
 * Corners: A tack (luff foot), B throat (luff head), C peak (outer end of the spar the head
 * is laced to), D clew (outer end of the foot). Luff A→B and head B→C are bent to spars and
 * lie hard; the LEECH C→D is held by nothing but the sheet, so it is the edge that sags and
 * twists — most aloft, where the wind is stronger and the peak is the only thing above it. */
function makeQuadSail(A, B, C, D, group, belly) {
  const N = 30, pos = [], uvs = [], idx = [];
  const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  /* draft scales with the CHORD — the foot — as it does on the real sail; the panels are
     cut parallel to the leech, so their count comes from the chord too */
  const chord = Math.hypot(D[0] - A[0], D[1] - A[1]);
  const DEPTH = 1.15;
  for (let i = 0; i <= N; i++) {
    const su = i / N;                                   // luff -> leech, along the chord
    const foot = lerp(A, D, su), head = lerp(B, C, su);
    for (let j = 0; j <= N; j++) {
      const sv = j / N;                                 // foot -> head, up the hoist
      const P = lerp(foot, head, sv);
      /* draft deepest about 38% aft of the luff, zero on the luff and at the leech */
      const draft = Math.sin(Math.PI * Math.pow(su, 0.72));
      /* zero at foot and head, which are laced to their spars */
      const vert = Math.sin(Math.PI * Math.pow(sv, 0.62));
      /* the free leech sags to leeward, more aloft — and dies at the laced edges */
      const sag = Math.pow(su, 2.2) * (0.50 + 0.70 * Math.pow(sv, 1.4)) *
                  Math.sin(Math.PI * Math.pow(sv, 0.75));
      let z = (draft * vert * 0.82 + sag * 0.40) * chord * belly * DEPTH;
      /* load enters at the four corners, so the cloth creases in fans running in from each */
      const dA = Math.hypot(su, sv),         dB = Math.hypot(su, 1 - sv),
            dC = Math.hypot(1 - su, 1 - sv), dD = Math.hypot(1 - su, sv);
      const corner = Math.exp(-dA * 3.0) + Math.exp(-dB * 3.4) +
                     Math.exp(-dC * 3.4) + Math.exp(-dD * 3.0);
      z += Math.sin((su * 7.0 + sv * 11.0) * Math.PI) * corner * chord * 0.014;
      /* the luff rides on mast hoops, the head and foot are laced — all scallop between
         their fastenings */
      z += Math.sin(sv * Math.PI * 9.0) * Math.exp(-su * 14.0) * chord * 0.010;
      z += Math.sin(su * Math.PI * 7.0) * Math.exp(-(1 - sv) * 12.0) * chord * 0.008;
      z += Math.sin(su * Math.PI * 5.0) * Math.exp(-sv * 10.0) * chord * 0.008;
      /* and cloth is never taut everywhere at once */
      z += Math.sin(su * 9.0 + sv * 6.0) * draft * vert * chord * 0.010;
      pos.push(P[0], P[1], z);
      /* seams parallel to the leech; the weathering gradient lands ON the leech, the edge
         that flogs and is handled at every reef */
      uvs.push(su, su);
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
    uniforms: { uPanels: { value: Math.max(4, Math.round(chord / 0.61)) },
                uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
  }));
  m.userData.kind = 'quad';
  group.add(tag(m, 'sail'));
  return m;
}


/* ── THE FURLED SAIL ──────────────────────────────────────────────────────────────────
 * The references mostly show ships with their canvas STOWED — rolled and gasketed along the
 * spar it is bent to — because that is how a ship spends most of her life. A furled sail is
 * not a smaller sail: it is a roll of cloth, and its whole character is in three things.
 *
 * THE RADIUS IS THE SAIL'S OWN AREA, put back on the spar: roll cross-section = cloth area x
 * stowed thickness / roll length, so a course stows fat and a royal stows thin, from the same
 * arithmetic. Nothing here is a chosen size.
 *
 * THE GASKETS PINCH IT. The roll is lashed to the spar at intervals, and the cloth bulges
 * between the lashings — the scalloped profile is the single most recognisable thing about
 * furled canvas at any distance.
 *
 * AND A SQUARE SAIL IS STOWED WITH A BUNT: the harbour stow gathers the body of the cloth
 * into a swelling at the slings, tapering out to almost nothing at the yardarms, which is why
 * a laid-up square-rigger's yards read as cigars and not as pipes.
 */
function makeFurl(A, B, area, mat, group, o) {
  o = o || {};
  const axis = new THREE.Vector3().subVectors(B, A);
  const len = axis.length();
  if (len < 0.05) return null;
  axis.multiplyScalar(1 / len);
  /* stowed cloth runs about 5.5 cm thick, canvas plus trapped air — a roll is loose */
  const r0 = o.radius !== undefined ? o.radius
           : Math.max(0.05, Math.sqrt((area * 0.055) / (Math.PI * Math.max(len, 0.1))));
  /* two unit vectors across the roll; the guard is for near-vertical spars (a closed
     crab claw), where projecting -Y degenerates */
  const up = Math.abs(axis.y) > 0.94 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const e1 = new THREE.Vector3().crossVectors(up, axis).normalize();
  const e2 = new THREE.Vector3().crossVectors(axis, e1).normalize();
  const NA = Math.max(24, Math.min(64, Math.round(len / 0.5))), NR = 12;
  const nG = Math.max(3, Math.round(len / 2.0));      // a gasket about every two metres
  const pos = [], idx = [];
  for (let i = 0; i <= NA; i++) {
    const t = i / NA;
    /* the cloth runs out toward the ends of the roll */
    let R = r0 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.30);
    if (o.bunt) R *= 0.72 + 0.68 * Math.exp(-Math.pow((t - 0.5) / 0.16, 2));
    /* the gasket pinch, narrow at each lashing, full cloth between */
    R *= 1 - 0.24 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * t * nG), 5.0);
    const P = new THREE.Vector3().copy(A).addScaledVector(axis, t * len)
      /* the roll hangs a little off the spar's own line, on the side the cloth gathers */
      .addScaledVector(e2, -r0 * 0.30);
    for (let j = 0; j <= NR; j++) {
      const th = (j / NR) * Math.PI * 2;
      /* cloth, not machined metal: shallow longitudinal creases ride round the roll */
      const rr = R * (1 + 0.05 * Math.sin(th * 5 + t * 31) + 0.035 * Math.sin(th * 9 - t * 57));
      pos.push(P.x + (e1.x * Math.cos(th) + e2.x * Math.sin(th)) * rr,
               P.y + (e1.y * Math.cos(th) + e2.y * Math.sin(th)) * rr,
               P.z + (e1.z * Math.cos(th) + e2.z * Math.sin(th)) * rr);
    }
  }
  const row = NR + 1;
  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NR; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.userData.kind = 'furl';
  group.add(tag(m, 'sail', o.name || 'Furled sail',
    'The canvas stowed: rolled along the spar it is bent to and lashed with gaskets. The '
    + 'roll\'s girth is the sail\'s own area put back on the spar, which is why a course '
    + 'stows fat and a royal thin.'));
  return m;
}

/* one cloth material for every furled roll on a ship — the sail shader's own flax, without
   the translucency, because a rolled sail is many layers deep and passes no light.
   ⚠ The value is LINEAR and darker than the shader's 0.680: a MeshStandardMaterial goes
   through ACES and the sRGB transfer, which the sail's ShaderMaterial does not, so matching
   the NUMBER made the rolls render near paper-white against buff canvas. Matched by eye
   against the set sails in the same light instead. */
function furlMat(mats) {
  return mats.furl || (mats.furl = new THREE.MeshStandardMaterial(
    { color: new THREE.Color(0.185, 0.163, 0.118), roughness: 0.94 }));
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
  hangar:   { stage: 4, name: 'Hangar and gallery decks',
              what: 'The space between the hull and the flight deck is built, not air: the '
                  + 'hangar bays and the gallery decks around them. The deck-edge lifts open '
                  + 'into it, which is why its sides are doors.' },
  aircraft: { stage: 7, name: 'Deck park',
              what: 'The air wing is what the ship is FOR, and some of it lives on deck: '
                  + 'parked with wings folded, clear of the angled deck and the foul line, '
                  + 'because a landing aircraft owns everything inside them.' },
  screw:    { stage: 3, name: 'Screw',
              what: 'Manganese bronze, below the waterline — the one golden thing on a grey '
                  + 'hull, and what she has instead of everything the sailing fleet carried '
                  + 'aloft. Visible only in dry dock, which is where the Shipwright builds her.' },
  turret:   { stage: 4, name: 'Main battery',
              what: 'The turret revolves on a barbette — an armoured cylinder running down to the '
                  + 'magazine. Mounted on the centreline and superfiring, one raised behind '
                  + 'another, so both can bear ahead.' },
  aa:       { stage: 4, name: 'High-angle battery',
              what: 'Twin high-angle guns on open mounts along the superstructure edge, barrels '
                  + 'elevated the way no surface gun ever points. By the time this ship was laid '
                  + 'down the fight she was built for had moved into the air, and her upperworks '
                  + 'grew the guns to answer it.' },
  catapult: { stage: 4, name: 'Aircraft catapult',
              what: 'The quarterdeck is a runway eighteen metres long. A cordite charge throws a '
                  + 'floatplane off the beam before the deck ends; the crane at the stern lifts '
                  + 'it back aboard after it lands on the sea. Every battleship carried her own '
                  + 'eyes — over the horizon is where the guns outrange the rangefinder.' },
  floatplane: { stage: 7, name: 'Floatplane',
              what: 'The ship\'s reconnaissance aircraft, on a single main float so it can land '
                  + 'on the open sea and be craned back aboard. It spots the fall of shot beyond '
                  + 'the horizon — the guns outrange the rangefinder, and until radar this was '
                  + 'the only answer.' },
  aaLight:  { stage: 4, name: 'Light anti-aircraft battery',
              what: 'Triple 25 mm automatic guns in shielded mounts on raised bandstands along '
                  + 'the amidships structure — the close-in layer under the heavy high-angle '
                  + 'battery. She completed with eight of these mounts; by 1945 refits had '
                  + 'multiplied the barrels sixfold, which is a fair record of how the war at '
                  + 'sea actually went.' },
  searchlight: { stage: 4, name: 'Searchlight platform',
              what: 'Arc searchlights on platforms winged out from the tower. Night action was '
                  + 'doctrine — the battle line trained to fight in the dark, and before radar '
                  + 'the only way to lay guns at night was to hold the enemy in one of these '
                  + 'beams. A metre and a half of carbon-arc mirror, worked from a director.' },
  hatch:    { stage: 4, name: 'Stowage hatch',
              what: 'On a big-gun ship the quarterdeck gear lives BELOW. The muzzle blast of the '
                  + 'main battery would wreck an open boat or a parked aircraft, so boats and '
                  + 'floatplanes stow under the deck and come up through these flush hatches to '
                  + 'the crane — which is why her decks look so strangely empty for a ship with '
                  + 'a crew of three thousand.' },
  net:      { stage: 4, name: 'Torpedo net defence',
              what: 'A moored battleship\'s answer to the locomotive torpedo: steel booms forty '
                  + 'feet long, hinged along the side, swung out at anchor to hang a steel-wire '
                  + 'net clear of the hull. At sea the booms stow in a row of diagonals against '
                  + 'the plating with the net rolled on its shelf — the row is most of what '
                  + 'dates a photograph of her. Fitted from completion; landed early in the '
                  + 'war, when net-cutting pistols and the drag on speed had beaten the idea.' },
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
  bulb:     { stage: 2, name: 'Bulbous bow',
              what: 'A bulb below the waterline forward, making its own wave a little ahead of '
                  + 'the bow wave and out of phase with it, so the two partly cancel. Worth '
                  + 'several per cent on a hull burning a hundred tonnes of fuel a day, which '
                  + 'is the entire reason every ship of this kind built since the 1960s has one.' },
  forecast: { stage: 3, name: 'Forecastle',
              what: 'The raised deck right forward, carrying the windlass and the mooring gear. '
                  + 'It also keeps green water off the forward container stack — which is the '
                  + 'stack that goes overboard when one does.' },
  lashing:  { stage: 7, name: 'Lashing bridge',
              what: 'A steel gantry between bays that the deck stacks are lashed to. Without it '
                  + 'the rods can only reach the second tier, and everything above that is held '
                  + 'down by the corner castings and hope.' },
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
  paddlebox:{ stage: 4, name: 'Paddle box',
              what: 'The housing over the top half of the wheel. A 17 m wheel turning at speed '
                  + 'throws a continuous sheet of water and coal-dirty spray that would sweep '
                  + 'the deck clean; the box contains it. Being the largest object on the '
                  + 'ship\'s side, it is also the one owners decorated — fluted, vented, '
                  + 'gilded, and lettered with the company\'s name.' },
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
  cathead:  { stage: 3, name: 'Cathead',
              what: 'The beam standing out over the bow that the anchor hangs from. Weighing '
                  + 'is a tackle problem: the ring must be caught, lifted clear of the water '
                  + 'and swung outboard of the planking, and the cathead is the crane that '
                  + 'does it — its sheaves take the cat tackle, and the anchor rides fished '
                  + 'along the topside from its tip until the next letting-go.' },
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
  bowtransom: { stage: 2, name: 'Bow transom',
              what: 'A bulkhead-built hull does not come to a stem. The forwardmost bulkhead is '
                  + 'the bow, planked straight across — the flat face that makes a junk '
                  + 'unmistakable from ahead, and the reason the build needs no keel-and-stem '
                  + 'backbone to hang the planking on.' },
  sterntransom: { stage: 2, name: 'Stern transom',
              what: 'The aftermost bulkhead, planked across and carried up with the sheer. The '
                  + 'rudder hangs just abaft it on the centreline, working in the open notch '
                  + 'the two quarters leave between them.' },
  poop:     { stage: 4, name: 'Aft castle',
              what: 'The tiered quarters over the after deck. On the treasure ships this was '
                  + 'the embassy itself: envoys, clerks, pilots and the shrine to Tianfei, the '
                  + 'sailors\' goddess, all lived here above the helm.' },
  sheet:    { stage: 6, name: 'Sheets',
              what: 'The rope at each clew — a sail\'s lower corner — that trims it to the '
                  + 'wind. Each square sail sheets to the arms of the yard below it (the '
                  + 'sheave in the yardarm is what the arm is for); the course sheets aft to '
                  + 'the rail. A battened lug carries a sheetlet to every batten end, gathered '
                  + 'through blocks to a single fall — the whole sail worked by a few hands on '
                  + 'deck, which is why no junk ever needed men aloft.' },
  halyard:  { stage: 6, name: 'Halyard',
              what: 'The line that hoists the yard. On a square-rigger the upper yards ride '
                  + 'up and down their masts by it and its fall comes down to the rail; on a '
                  + 'junk it is the one heavy lift aboard — sail, battens, boom and yard all '
                  + 'rise on it, and reefing is simply letting it go.' },
  sternlight:{ stage: 3, name: 'Stern lights',
              what: 'The great windows across the transom, and the only real glazing in the ship. '
                  + 'Everywhere else light comes through a gunport or a grating, so the captain\'s '
                  + 'cabin is the one place aboard you can read without a candle.' },
  taffrail: { stage: 3, name: 'Taffrail',
              what: 'The rail crowning the stern, carried up over the sheer and rising toward the '
                  + 'centre with the poop\'s own camber. It is the highest timber of the hull '
                  + 'proper, and on a man-of-war it carried the carved work and the stern '
                  + 'lanterns by which one ship knew another at night.' },
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
  cluster:  { stage: 3, name: 'Mast and stack cluster',
              what: 'The exhaust rank, signal mast and communications radomes, packed amidships '
                  + 'in one sculpted cluster — a modern motor vessel’s whole topside identity '
                  + 'in one place, as much her silhouette as four buff funnels were Titanic’s. '
                  + 'No published drawing gives these heights: every figure is DERIVED from the '
                  + 'photograph on this card, scaled against the recorded length. Derived '
                  + 'figures, labelled as such.' },
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
                  + 'musketeers. Nelson was shot by a man in one. It is a medieval invention: '
                  + 'no classical ship carried one, and the earliest among these types are on '
                  + 'the 13th-century seals of the cog towns.' },
  corbis:   { stage: 4, name: 'The corbis',
              what: 'The basket hung at the mainmast head — the thing that named the ship. '
                  + 'Festus: cargo ships are called corbitae "because baskets used to be hung '
                  + 'at the top of their mast as their sign". Roman merchantmen carried no '
                  + 'masthead platform at all; the lookout stood at the bow, and the masthead '
                  + 'carried the halyard sheaves, the lifts — and, on this type, its own name '
                  + 'in wicker.' },
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
                  + 'beyond the size one person could steer with an oar over the quarter. China '
                  + 'was there a millennium earlier: the Han pottery boat models of the first '
                  + 'century show an axial rudder at the transom, slung on tackles in a trunk '
                  + 'rather than hung on pintles, so it could be raised in shoal water — and on '
                  + 'the great junks lowered below the bottom, where it is also the leeway board '
                  + 'of a hull that has no deep keel to grip the water.' },
  mast:     { stage: 4, name: 'Mast',
              what: 'Built in stepped sections — lower mast, topmast, topgallant — each fidded '
                  + 'alongside the head of the one below through the doubling, so it can be sent '
                  + 'down in heavy weather. Steel 1794: the main mast is half the sum of the '
                  + 'lower deck length and the extreme breadth.' },
  woolding: { stage: 4, name: 'Wooldings',
              what: 'Rope bands hooped round the lower mast. No single tree yields a mast most '
                  + 'of a metre through, so a big ship\'s lower mast is MADE — several timbers '
                  + 'coaked together — and the assembly must be bound or it works apart at sea. '
                  + 'Each woolding is about a dozen turns of tarred rope hove taut and nailed, '
                  + 'pinched between two thin wooden hoops. Iron hoops replaced them from about '
                  + '1800.' },
  mastband: { stage: 4, name: 'Mast hoops',
              what: 'Iron hoops shrunk onto a made wooden mast — driven on hot, they grip as '
                  + 'they cool. They do the work rope wooldings did before about 1800: binding '
                  + 'the separate timbers of a built-up lower mast into one spar.' },
  cheek:    { stage: 4, name: 'Cheeks',
              what: 'Timber knees bolted to either side of the masthead at the hounds. Their '
                  + 'upper faces carry the trestletrees, and everything above — crosstrees, top '
                  + 'platform, the fidded heel of the topmast, the men stationed aloft — bears '
                  + 'on those two faces.' },
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
  lift:     { stage: 6, name: 'Lifts',
              what: 'The ropes from each yardarm up to the masthead that carry the yard\'s '
                  + 'weight and hold it square. With the sail furled they are all that holds '
                  + 'the arms up, and they are why every sail plan ever drawn shows a V of '
                  + 'rope over each tier of canvas.' },
  tack:     { stage: 6, name: 'Tacks',
              what: 'The rope that hauls a course\'s clew forward and down. On the wind the '
                  + 'weather tack is hauled hard to the bow: it gives the lowest sail a taut '
                  + 'leading edge, which is what turns loose canvas into something that can '
                  + 'drive a ship across the wind rather than only before it.' },
  yard:     { stage: 6, name: 'Yard',
              what: 'The spar a square sail hangs from, slung across the mast and braced round to '
                  + 'trim the sail to the wind. Steel 1794: the main yard is seven eighths of the '
                  + 'main mast, and as thick as its own length asks — seven tenths of an inch to '
                  + 'every yard of length at the slings for a course yard, lighter rates aloft. '
                  + 'It is octagonal amidships and tapers to two fifths at the arms.' },
  sail:     { stage: 7, name: 'Sail',
              what: 'Flax canvas, sewn from bolts twenty-four inches wide — the standard enacted '
                  + 'in 1746 — so the cloths themselves scale the sail for you. Square sails drive '
                  + 'a ship downwind; fore-and-aft sails let it work up to windward.' },
  deckhouse: { stage: 5, name: 'Deckhouse',
              what: 'On a big wooden ship the hold is cargo, all of it, so the crew lives on '
                  + 'deck: galley, cabins and the engine room stand in white houses on the '
                  + 'weather deck. The forward house holds the donkey boiler and hoisting '
                  + 'engine — the machinery that let thirteen hands work a six-master\'s gear.' },
  helm:     { stage: 5, name: 'The wheel',
              what: 'Right aft, in the open, where the helmsman can watch the leeches and the '
                  + 'sea coming up astern. On the great schooners it drove the rudder through a '
                  + 'screw gear under the wheel box — one man could hold a ship of nearly four '
                  + 'thousand tons.' },
};

function tag(o, key, extra, what) {
  if (!o) return o;
  const P = PARTS[key];
  /* ⚠ the fourth argument existed at two call sites (crow's nest, topmast crosstrees) for
     rounds before the signature accepted it — a bespoke card text silently dropped. */
  o.userData.part = { key, stage: P.stage, name: extra || P.name, what: what || P.what };
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
    /* on a steel ship the capping is a steel bulwark rail, in the topside's company */
    const railMat = (S.build === 'steel' || S.build === 'iron')
      ? new THREE.MeshStandardMaterial({ color: 0x4a5057, roughness: 0.58, metalness: 0.42 })
      : pale;
    group.add(tag(new THREE.Mesh(g, railMat), 'rail'));
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

  /* ── THE DECKHOUSE, FROM THE RECORD: `deckhouses: [{a, b, hM, wF}]` ─────────────────
     On a big wooden ship the crew does not live below — the hold is CARGO, all of it, and
     the galley, the engine room and the cabins stand in white houses on the weather deck.
     A six-master's profile is her hull, her rig, and these: the forward house with the
     donkey boiler and hoisting engine, the long after house with the accommodation. Each
     entry is a span in u (a..b), a height, and a width as a fraction of the local beam.
     The walls are sunk half a metre into the deck because the deck SHEERS — a box set on
     the sheer at one end floats at the other. */
  if (S.deckhouses && S.deckhouses.length) {
    const white = mats.houseWhite || (mats.houseWhite = new THREE.MeshStandardMaterial(
      { color: 0xd8d3c5, roughness: 0.68 }));
    const glass = mats.houseGlass || (mats.houseGlass = new THREE.MeshStandardMaterial(
      { color: 0x22262c, roughness: 0.35, metalness: 0.15 }));
    for (const hs of S.deckhouses) {
      const um = (hs.a + hs.b) / 2;
      const hx = (um - 0.5) * L;
      const hl = (hs.b - hs.a) * L;
      const hw = halfAtU(um) * 2 * (hs.wF || 0.66);
      const yb = Math.min(deckAtU(hs.a), deckAtU(um), deckAtU(hs.b)) - 0.5;
      const hh = hs.hM + 0.5;
      const hg = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(hl, hh, hw), white);
      walls.position.set(hx, yb + hh / 2, 0);
      hg.add(walls);
      /* the roof overhangs a hand's breadth all round, which is what throws the shadow
         line that makes a house read as a house rather than a crate */
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(hl + B * 0.024, B * 0.012, hw + B * 0.024), pale);
      roof.position.set(hx, yb + hh + B * 0.006, 0);
      hg.add(roof);
      /* a row of small lights down each side, dark glass in white walls */
      const nw = Math.max(2, Math.round(hl / 2.6));
      for (let i = 0; i < nw; i++) {
        const wx = hx - hl / 2 + (i + 0.5) * (hl / nw);
        for (const sgn of [-1, 1]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.06), glass);
          win.position.set(wx, yb + hh * 0.68, sgn * (hw / 2 + 0.01));
          hg.add(win);
        }
      }
      group.add(tag(hg, 'deckhouse'));
    }
  }

  /* ── THE WHEEL, FROM THE RECORD: `helmAt` ──────────────────────────────────────────
     Right aft, in the open, where the helmsman can watch the leeches and the sea coming
     up astern. On the great schooners it drove the rudder through a screw gear under the
     wheel box — one man could hold a ship of nearly four thousand tons. */
  if (S.helmAt !== undefined) {
    const u = S.helmAt, y = deckAtU(u), x = (u - 0.5) * L;
    const R = Math.max(0.55, B * 0.048);
    const hg = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(R * 1.6, R * 0.9, R * 0.9), pale);
    box.position.set(x + R * 0.9, y + R * 0.45, 0);
    hg.add(box);
    const wg = new THREE.Group();
    wg.position.set(x, y + R * 1.35, 0);
    wg.rotation.y = Math.PI / 2;                       // the wheel faces fore and aft
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, R * 0.055, 10, 26), wood);
    wg.add(rim);
    for (let i = 0; i < 5; i++) {                      // spokes, through the hub
      const a = i * Math.PI / 5;
      const sp = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.035, R * 0.035, R * 1.5, 8), wood);
      sp.rotation.z = a;
      wg.add(sp);
    }
    hg.add(wg);
    group.add(tag(hg, 'helm'));
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
function buildTop(r, mat, mastR) {
  const g = new THREE.Group();
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, r * 0.09, 14), mat);
  g.add(plat);
  /* The frame under it, as it was actually framed: a PAIR of trestletrees fore-and-aft
     along each side of the masthead — resting on the cheeks, leaving between them the
     slot the topmast heel is fidded into — and a pair of crosstrees notched over them,
     carrying the platform. The first version drew one timber of each, centred, passing
     THROUGH the mast — a frame that could not have been assembled around the spar it
     holds. */
  const zT = mastR ? mastR + r * 0.055 : r * 0.13;
  for (const sz of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, r * 0.13, r * 0.11), mat);
    t.position.set(0, -r * 0.155, sz * zT);
    g.add(t);
  }
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.14, r * 0.10, r * 1.9), mat);
    t.position.set(sx * r * 0.40, -r * 0.075, 0);
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
function buildRigging(S, group, mats, spars, mastTops) {
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  /* ⚠ These were THREE.Line objects in LineBasicMaterial — the one survivor of the round
     that turned the standing rigging into lit prism geometry, so the stays and braces
     stayed flat unlit hairlines beside shrouds that take the light. Same rope, same model:
     merged prisms, one mesh per category, with a real diameter — a 74's mainstay is the
     thickest rope on the ship. */
  const ropeMat = mats.ropeSolid || mats.spar;
  const staySegs = [], braceSegs = [];
  const line = (a, b) => [new THREE.Vector3(a[0], a[1], a[2] || 0),
                          new THREE.Vector3(b[0], b[1], b[2] || 0)];
  const deckAt = u => H.sheer(u);

  mastTops.forEach((m, i) => {
    /* ── A SCHOONER'S WEB IS NOT A SQUARE-RIGGER'S ─────────────────────────────────────
       The square rig's forestay leads to the DECK at the foot of the mast ahead — and on a
       gaff rig that line passes straight through the middle of the sail standing in that
       gap, and a standing backstay stands in the arc its own boom swings through. Neither
       was ever rigged on a schooner. What she carries instead is the SPRING STAY, masthead
       to masthead, above the gaffs — the near-horizontal line that ties the whole rig
       together in every photograph of the six-masters — with the foremast stayed forward
       to the bowsprit, which the headsail stays already do. */
    if (m.gaff) {
      const prev = mastTops[i - 1];
      if (prev) staySegs.push(line([m.x, m.y], [prev.x, prev.y - 0.4]));
      else if (S.bowsprit && !S.headsails) {
        const stv = (S.steeve || 22) * Math.PI / 180;
        const blen = L * S.bowsprit;
        staySegs.push(line([m.x, m.y],
          [-L / 2 - Math.cos(stv) * blen * 0.9, deckAt(0.02) + Math.sin(stv) * blen * 0.9]));
      }
      return;
    }
    /* forestay: forward and down — to the bowsprit for the foremost mast, to the deck at the
       foot of the mast ahead for the others */
    const aheadU = i === 0 ? 0.03 : mastTops[i - 1].u;
    const ax = (aheadU - 0.5) * L;
    const ay = i === 0 ? deckAt(0.06) + (S.bowsprit ? S.beam * 0.20 : 0) : deckAt(aheadU);
    staySegs.push(line([m.x, m.y], [ax, ay]));
    /* backstays to the ship's side, one each way */
    const bu = Math.min(0.96, m.u + 0.20);
    const bx = (bu - 0.5) * L, by = deckAt(bu);
    const hb = (H.halfB * H.wl(bu)) * (1 - H.tumble(bu));
    for (const sgn of [-1, 1]) staySegs.push(line([m.x, m.y, 0], [bx, by, sgn * hb]));
  });

  /* braces: from each yard arm aft and down */
  spars.forEach(sp => {
    const bu = Math.min(0.97, sp.u + 0.26);
    const bx = (bu - 0.5) * L, by = deckAt(bu);
    for (const sgn of [-1, 1])
      braceSegs.push(line([sp.x + sgn * (sp.armX || 0), sp.y, sgn * (sp.armZ !== undefined ? sp.armZ : sp.half)],
                          [bx, by + sp.half * 0.10, sgn * sp.half * 0.30]));
  });

  const st = ropeMesh(staySegs, 0.020 + B * 0.0009, ropeMat);
  if (st) group.add(tag(st, 'stay'));
  const br = ropeMesh(braceSegs, 0.010 + B * 0.0004, ropeMat);
  if (br) group.add(tag(br, 'brace'));
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
/* ── ONE DERIVATION OF THE HOUSE ───────────────────────────────────────────────────────
 * ⚠ Read by FOUR callers — the superstructure, the boats, the funnels and the audit — for
 * the same reason landingStrip() and turretStations() exist: two derivations of one deck
 * drift apart, and the drift is a boat stowed four decks below its own davits.
 *
 * And the tiers are NOT a centred wedding cake, which is what `0.80 − f * 0.34` built: equal
 * steps fore and aft about midships. A liner's FRONTS ALIGN, because she is conned from the
 * forward end of her top deck and the officers' house stacks directly beneath the bridge; her
 * AFTS CASCADE, because each roof aft of the tier above is the open promenade of the deck
 * below. That is why a liner's profile leans forward. Where the house stands comes from the
 * record (houseAt) when the record has it. */
function linerHouse(S) {
  const n = S.decks || 0;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  /* ── ⚠ A TWEEN-DECK IS A HEIGHT, NOT A BEAM ──────────────────────────────────────────
     beam·0.105 gives Titanic 2.96 m a deck, which is the Edwardian tween-deck and why it
     survived — but it is a coincidence of her proportions, not a law. On Queen Mary 2's
     41 m beam it dealt 4.3 m decks, and thirteen of them put her funnel top near 100 m
     over the water against the record's 61.7: the whole ship drawn half again too tall,
     audit-green, because nothing compared a height with a record. Where the record gives
     the tween-deck (deckM — hers derives from 72 m keel-to-funnel over 18 decks), use it;
     the derivation stays for hulls whose proportions it was calibrated on. */
  const base = H.sheer(0.5), dh = S.deckM || B * 0.105, inset = B * 0.055;
  const [hA, hB] = (S.houseAt && S.houseAt.length === 2) ? S.houseAt : [0.10, 0.90];
  /* ── ⚠ NOT EVERY HOUSE CRESTS FORWARD ────────────────────────────────────────────────
     The aligned-fronts/cascading-afts rule below is the LINER's logic — conned from the
     forward end of her top deck. A motor yacht is built the other way about: a long low
     foredeck, each tier's front further AFT than the one below (the ramp every profile of
     Azzam shows), the compact top abaft midships, and the afts terracing down to a low
     stern deck. Which way the house runs is a fact about the ship, so it comes from the
     RECORD: houseCrest is the TOP tier's u-span, tiers interpolate straight from houseAt
     (tier 0) to it, and with no houseCrest the default reproduces the liner formula
     exactly — hA + 0.024·i/n forward, hB − 0.14·i/n aft. */
  const crest = (S.houseCrest && S.houseCrest.length === 2) ? S.houseCrest
    : [hA + 0.024 * (n - 1) / n, hB - 0.14 * (n - 1) / n];
  const tiers = [];
  /* ── A TIER CAN BE SHELL, NOT HOUSE ────────────────────────────────────────────────
     On the Edwardian liners the side PLATING carried up past the sheer deck: Titanic's
     550 ft bridge superstructure was shell — black, flush with the hull side save a plate's
     step — and the white house stood on top of it. `shellTiers` counts how many of the
     lower tiers are that: full-breadth, nearly flush, painted the topside colour by the
     superstructure builder. Drawing them as inset white house was why her profile showed
     one white slab where the record shows black to B deck and white above. */
  const ns = S.shellTiers || 0;
  /* ── A MODERN LINER'S BOATS LIVE IN A RECESS, NOT ON THE ROOF ─────────────────────────
     SOLAS moved them down: Queen Mary 2 carries her 22 boats on Deck 8, in an open gallery
     cut into the bottom of the white house, and that dark band with white hulls in it is
     one of the things the eye uses to read her. boatsRecessed marks the first house tier
     above the shell as that gallery; buildBoats stows into it and the wall builder paints
     its void dark. The boats then hang at recess height by the same derivation the walls
     stand on. */
  const recessTier = (S.boatsRecessed && S.boats) ? ns : -1;
  for (let i = 0; i < n; i++) {
    const shell = i < ns;
    const wid = shell ? B : B * (0.92 - (i / n) * 0.16);
    const ins = shell ? B * 0.015 : inset;
    /* ── ⚠ THE AFT STEP-BACK IS A FRACTION OF THE HOUSE, NOT A FIXED SLICE PER DECK ────
       This was `hB - i * 0.045`: every tier ended 4.5% of the SHIP'S LENGTH further forward
       than the one below. On Titanic's three decks that is a gentle 13% total and looks
       right, which is why it survived. On a modern liner's thirteen it is 58% — the top of
       the house ends past midships — and Queen Mary 2 came out as a thirteen-step ziggurat
       instead of the near-vertical slab she is. The quantity that should be constant is the
       TOTAL set-back of the house, not the set-back per deck: a tall house steps the same
       distance overall, in smaller steps. 0.14 reproduces the old figure at n=3 (0.047 a
       tier) and stops the staircase at any height. */
    const f = n > 1 ? i / (n - 1) : 0;
    const uA = hA + (crest[0] - hA) * f, uB = hB + (crest[1] - hB) * f;
    /* the tier stops short of the deck edge by a WATERWAY, lofted from the hull's own
       half-breadth so it can never overhang, on any ship, at any beam (the round-4 fault) */
    const half = (u) => {
      const uu = Math.max(0.001, Math.min(0.999, u));
      return Math.max(B * 0.06, Math.min(wid / 2,
        Math.abs(surfacePoint(S, H, uu, 1.0)[2]) - ins));
    };
    tiers.push({ uA, uB, y0: base + dh * i, y1: base + dh * (i + 1), half, shell,
                 recess: i === recessTier });
  }
  /* `recorded` marks a house the RECORD located (houseAt) as opposed to the default span.
     It decides which deck a funnel's recorded height is measured from — see buildFunnel. */
  return { n, base, dh, top: base + dh * n, tiers,
           recorded: !!(S.houseAt && S.houseAt.length === 2) };
}

function buildSuperstructure(S, group) {
  const n = S.decks || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const white = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
  const g = new THREE.Group();
  const T = linerHouse(S);
  const paneW = B * 0.075;                            // a light is about this wide, always
  const face = new THREE.Color(0xe4e2dc);
  /* ⚠ A liner's windows are not black. They are a strake of small lights in a white wall,
     reflecting sky, and there is far more wall than glass — glass at 0x20242a read as AIR and
     the white between as unsupported plates. Lighter glass, and mullions wide enough that
     white wins along the length. */
  const glass = new THREE.Color(0x6d7a86);
  const wallMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.60, side: THREE.DoubleSide });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xe4e2dc, roughness: 0.60, side: THREE.DoubleSide });

  /* ── ⚠ VERTEX COLOUR CANNOT PAINT A BAND THAT HAS NO VERTICES ──────────────────────
     The band's own edges are VERTEX ROWS, and the wall is stationed finely enough along its
     run that a 1.4 m mullion has vertices to sit between (the multiply-by-zero family: a
     feature a mesh has no resolution for simply does not appear).
     ── AND THE END OF A TIER IS A WALL, NOT A CAP. The old shell closed its ends with one
     blank quad-strip each — a single station's colour stretched across the whole face — so
     from ahead the house was stepped plates with NO FRONTS. Wind ONE banded wall around the
     whole perimeter instead: the lights march around the corners by construction, and a
     blank front is no longer a thing this builder can build. Arc length carries the mullion
     rhythm through the turns. */
  /* glassSpec, when given, replaces the liner's small-light glass with a CONTINUOUS band:
     dark at the sill, lightening toward the head, because a long run of tinted glazing
     reflects more sky the higher the eye's line strikes it. Without it the colours are
     byte-identical to the old path — the band style is a record's choice, never a default. */
  const wallLoft = (path, y0, y1, rows, band, pw, mulFrac, faceCol, glassSpec) => {
    const tp = [], tc = [], ti = [];
    const R = rows.length;
    const fc = faceCol || face;
    let s = 0;
    for (let k = 0; k < path.length; k++) {
      if (k) s += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
      const frac = ((s / pw) % 1 + 1) % 1;
      const isMul = frac < mulFrac;
      for (const rf of rows) {
        const inBand = rf > band[0] && rf < band[1];
        const c = (inBand && !isMul)
          ? (glassSpec
              ? glassSpec.lo.clone().lerp(glassSpec.hi,
                  (rf - band[0]) / Math.max(0.001, band[1] - band[0]))
              : glass)
          : fc;
        tp.push(path[k].x, y0 + rf * (y1 - y0), path[k].z);
        tc.push(c.r, c.g, c.b);
      }
    }
    for (let k = 0; k + 1 < path.length; k++)
      for (let r = 0; r + 1 < R; r++) {
        const a = k * R + r, b = (k + 1) * R + r;
        ti.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
    gg.setIndex(ti); gg.computeVertexNormals();
    /* ⚠ DoubleSide, and not as a shortcut: a hand-wound wall will face the wrong way
       somewhere, and under FrontSide those faces are holes that depend on where you stand —
       measured once at 26 of 72 bearings seeing straight through. */
    return new THREE.Mesh(gg, wallMat);
  };

  /* the closed perimeter of one tier: starboard forward→aft, across the stern, port aft→
     forward, across the front, ending on the start point.
     ⚠ THE STATIONS MUST RESOLVE THE RHYTHM THEY CARRY. The default step, paneW·0.5, is
     exactly two stations per mullion period — the small-lights rhythm samples cleanly by
     construction. A band with its own pitch (tierBands) sampled at that step ALIASES: 0.3 m
     balcony dividers on a 2.6 m pitch landed wherever the 1.5 m stations happened to fall,
     and the band read as blocky dashes. A banded wall is stationed from its own pier width. */
  const perim = (t, step) => {
    const st = step || paneW * 0.5;
    const pts = [];
    const NU = Math.max(60, Math.round((t.uB - t.uA) * L / st));
    for (let k = 0; k <= NU; k++) {
      const u = t.uA + (t.uB - t.uA) * k / NU;
      pts.push({ x: (u - 0.5) * L, z: t.half(u) });
    }
    const hb = t.half(t.uB), NB = Math.max(6, Math.round(2 * hb / st));
    for (let k = 1; k <= NB; k++)
      pts.push({ x: (t.uB - 0.5) * L, z: hb - 2 * hb * k / NB });
    for (let k = 1; k <= NU; k++) {
      const u = t.uB - (t.uB - t.uA) * k / NU;
      pts.push({ x: (u - 0.5) * L, z: -t.half(u) });
    }
    const hf = t.half(t.uA), NF = Math.max(6, Math.round(2 * hf / st));
    for (let k = 1; k <= NF; k++)
      pts.push({ x: (t.uA - 0.5) * L, z: -hf + 2 * hf * k / NF });
    return pts;
  };

  /* the roof is a plate over the tier's own plan — ShapeGeometry from the same perimeter,
     so the two cannot disagree. rotateX(+90°) maps shape-y onto world z unmirrored. */
  const roofPlate = (t, y) => {
    const pts = perim(t);
    const sh = new THREE.Shape();
    sh.moveTo(pts[0].x, pts[0].z);
    for (let k = 1; k < pts.length; k++) sh.lineTo(pts[k].x, pts[k].z);
    const gg = new THREE.ShapeGeometry(sh);
    gg.rotateX(Math.PI / 2);
    gg.translate(0, y, 0);
    return new THREE.Mesh(gg, plateMat);
  };

  /* ── ⚠ THE RAIL FOLLOWS THE SAME EDGE THE STANCHIONS DO ─────────────────────────────
     One polyline in, posts and bars out — resampled together, so a handrail can never float
     beside its own posts again (the round-25 fault: rails at a constant half-breadth while
     the posts followed the lofted edge, three to five metres apart). */
  const up = new THREE.Vector3(0, 1, 0);
  const railRun = (pts, y) => {
    const step = B * 0.22, Q = [];
    let acc = 0;
    Q.push(pts[0]);
    for (let k = 1; k < pts.length; k++) {
      acc += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
      if (acc >= step || k === pts.length - 1) { Q.push(pts[k]); acc = 0; }
    }
    const dh = T.dh;
    for (const q of Q) {
      const st = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.004, B * 0.004, dh * 0.30, 5), white);
      st.position.set(q.x, y + dh * 0.15, q.z);
      g.add(st);
    }
    for (let k = 0; k + 1 < Q.length; k++) {
      const a = Q[k], b = Q[k + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.01) continue;
      const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      for (const h of [0.10, 0.20, 0.30]) {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, len, 5), white);
        bar.position.set((a.x + b.x) / 2, y + dh * h, (a.z + b.z) / 2);
        bar.quaternion.setFromUnitVectors(up, dir);
        g.add(bar);
      }
    }
  };

  const rows = [0.0, 0.46, 0.475, 0.665, 0.68, 1.0];  // sole, band edges, roof
  /* a shell tier wears the hull's own paint, and its lights read as a window row cut in
     black plating — which is exactly what C-deck's were.
     ⚠ UNLESS THE RECORD PAINTS THE STRAKE ITSELF: Queen Mary 2's shell carries up TWO decks
     past the black in a WHITE sheer strake with a square-window colonnade on each — the
     photograph shows black to 17 m and white plating above — so the paint of the shell
     tiers is a recorded livery (shellTopside), not always the topside's. */
  const shellCol = new THREE.Color(S.shellTopside || S.topside || '#3a3a3c');
  /* a boat gallery is an OPENING: its back wall stands in shadow behind the boats, so the
     tier is drawn dark and unglazed, and the boats hang in front of it */
  const recessCol = new THREE.Color(0x24272b);
  /* ── A MODERN TIER WEARS A WINDOW BAND, NOT A STRAKE OF SMALL LIGHTS ────────────────
     The small-lights-with-wide-mullions treatment is the Edwardian liner's: more wall than
     glass. Queen Mary 2's tiers above the boats are BALCONY rows — a dark void over most of
     the tier height, divided at cabin pitch — and Azzam's are long runs of tinted glazing.
     Both are the same class: a continuous dark band the record declares (tierBands: which
     tiers, band edges as tier-height fractions, divider pitch in metres, pier fraction,
     kind 'balcony' | 'glass'), drawn by the same wallLoft the ribbon uses. The recess tier
     never bands — it is an opening, not a wall. */
  const TB = S.tierBands;
  /* the shell strake may carry its own recorded row — Queen Mary 2's white strake wears a
     colonnade of ~1.4 m square windows at 2.5 m pitch, twice the height of the Edwardian
     C-deck lights the default draws — same band mechanism, its own record (shellBands) */
  const SB = S.shellBands;
  for (let i = 0; i < T.n; i++) {
    const t = T.tiers[i];
    /* ⚠ built in ABSOLUTE coordinates, y0 to y1 — the old walls were built about their own
       centre and never positioned, so the whole house sat below the waterline for as long as
       it existed while the rails alone stood correctly. Nothing here waits to be positioned. */
    const bandRec = (TB && !t.recess && i >= TB.from && i <= TB.to) ? TB
                  : ((SB && t.shell && !t.recess) ? SB : null);
    if (bandRec) {
      const lo = new THREE.Color(bandRec.kind === 'balcony' ? 0x20262b : 0x272e35);
      const hi = new THREE.Color(bandRec.kind === 'balcony' ? 0x424c54 : 0x4a545d);
      const bRows = [0.0, bandRec.bot, bandRec.bot + 0.02, bandRec.top - 0.02, bandRec.top, 1.0];
      const pf = bandRec.pierFrac !== undefined ? bandRec.pierFrac : 0.16;
      const bStep = Math.max(0.25, (bandRec.pitchM || paneW) * Math.min(0.5, pf || 0.5));
      g.add(wallLoft(perim(t, bStep), t.y0, t.y1, bRows, [bandRec.bot, bandRec.top],
                     bandRec.pitchM || paneW, pf,
                     t.shell ? shellCol : null, { lo, hi }));
    } else {
      g.add(wallLoft(perim(t), t.y0, t.y1, rows, t.recess ? [2, 3] : [0.46, 0.68], paneW, 0.52,
                     t.recess ? recessCol : (t.shell ? shellCol : null)));
    }
    g.add(roofPlate(t, t.y1));
    if (i === T.n - 1) {
      railRun(perim(t), t.y1);                        // the boat deck is railed all round
    } else {
      /* the exposed roof aft of the tier above is the promenade of this deck — railed along
         its sides and across its aft end, like the real thing */
      const tAbove = T.tiers[i + 1];
      if (t.uB > tAbove.uB + 0.012) {
        const pr = [];
        const NP = Math.max(4, Math.round((t.uB - tAbove.uB) * L / (paneW * 0.5)));
        for (let k = 0; k <= NP; k++) {
          const u = tAbove.uB + (t.uB - tAbove.uB) * k / NP;
          pr.push({ x: (u - 0.5) * L, z: t.half(u) });
        }
        const hb = t.half(t.uB);
        pr.push({ x: (t.uB - 0.5) * L, z: -hb });
        for (let k = NP; k >= 0; k--) {
          const u = tAbove.uB + (t.uB - tAbove.uB) * k / NP;
          pr.push({ x: (u - 0.5) * L, z: -t.half(u) });
        }
        railRun(pr, t.y1);
      }
    }
  }

  /* ── THE BRIDGE ──────────────────────────────────────────────────────────────────────
     "Stepped plates, no fronts" was the Titanic for twenty-seven rounds, and the front of a
     liner is not a plate: it is where she is CONNED. A wheelhouse stands at the forward end
     of the boat deck — more glass than wall, because it exists to be seen out of — and open
     WINGS run from its sides to the ship's own side, because a 28 m beam has to be conned
     from its edges when she comes alongside. */
  const top = T.tiers[T.n - 1];
  /* ── ⚠ A CLUSTER WITH A BLOCK IS THE BRIDGE ─────────────────────────────────────────
     Where the record declares a cluster block (blockU), that block IS the conning
     structure — Azzam's bridge is the glass front of her equipment block — and the
     generic wheelhouse would stand inside it: with her crest at the block's own forward
     face, the two boxes occupy the same air. The record already says who cons the ship;
     honour it. */
  if (S.cluster && S.cluster.blockU) { group.add(tag(g, 'superstructure')); return; }
  const bg = new THREE.Group();
  const uW0 = top.uA + 0.004, uW1 = Math.min(top.uB, uW0 + 0.030);
  const whHalf = Math.min(B * 0.27, top.half(uW0) - B * 0.01);
  const whT = {
    uA: uW0, uB: uW1, half: () => whHalf,
  };
  const whH = T.dh * 0.92;
  bg.add(wallLoft(perim(whT), T.top, T.top + whH,
                  [0.0, 0.30, 0.33, 0.82, 0.85, 1.0], [0.30, 0.85], paneW * 1.5, 0.30));
  bg.add(roofPlate(whT, T.top + whH));
  for (const sgn of [-1, 1]) {
    const uMid = (uW0 + uW1) / 2;
    const hullHalf = Math.abs(surfacePoint(S, H, uMid, 1.0)[2]);
    if (hullHalf > whHalf + B * 0.02) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry((uW1 - uW0) * L, T.dh * 0.06, hullHalf - whHalf), plateMat);
      wing.position.set((uMid - 0.5) * L, T.top + T.dh * 0.03, sgn * (whHalf + hullHalf) / 2);
      bg.add(wing);
      /* the wing ends at the ship's side, railed — flush, not overhanging */
      const wx0 = (uW0 - 0.5) * L, wx1 = (uW1 - 0.5) * L;
      const wpts = [{ x: wx0, z: sgn * whHalf }, { x: wx0, z: sgn * hullHalf },
                    { x: wx1, z: sgn * hullHalf }, { x: wx1, z: sgn * whHalf }];
      railRun(wpts, T.top + T.dh * 0.06);
    }
  }
  const bTag = tag(bg, 'bridge', 'Navigating bridge');
  bTag.userData.part.what =
    'The ship is conned from here: a wheelhouse at the forward end of the boat deck, more '
    + 'glass than wall, with open wings running to the ship\'s sides — a 28 m beam is brought '
    + 'alongside a pier by an officer standing at its very edge.';
  g.add(bTag);

  /* ── COWL VENTILATORS, ON THE BOAT DECK ─────────────────────────────────────────────
     The most recognisable fitting on a Victorian steamer, and for as long as the tiers have
     existed they stood at the SHEER, at B*0.30 off centre — which the house walls enclose —
     so every cowl was buried inside the accommodation and none was ever seen. They stand on
     the TOP of the house, where the air is: below decks there is a coal-fired boiler room, a
     galley and several hundred people, and no mechanical ventilation whatever. Stationed
     clear of the funnel casings by the funnels' own derivation.
     ⚠ AND THE COWL DIED WITH THAT FACT. Forced-draught fans took the job by mid-century;
     a welded post-1950 ship breathes through louvres in her casings, and cowls on Queen
     Mary 2's roof were the same anachronism as a gilt cove on her hull — the audit's
     year-1950 dress gate, applied to fittings. */
  if (S.funnels && !(S.year >= 1950)) {
    const cowl = new THREE.MeshStandardMaterial({ color: 0xb8483a, roughness: 0.55, metalness: 0.15 });
    const fst = funnelStations(S);
    const caseR = S.beam * 0.115 * 1.34;
    for (const f of [0.16, 0.30, 0.44, 0.58, 0.72, 0.86]) {
      const u = top.uA + f * (top.uB - top.uA);
      if (fst.some(uf => Math.abs(u - uf) * L < caseR + B * 0.06)) continue;
      for (const side of [-1, 1]) {
        const z = side * top.half(u) * 0.62;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.017, B * 0.019, B * 0.15, 10), white);
        stem.position.set((u - 0.5) * L, T.top + B * 0.075, z);
        g.add(tag(stem, 'vent', 'Cowl ventilator'));
        const bell = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.038, B * 0.017, B * 0.055, 12, 1, true), cowl);
        bell.position.set((u - 0.5) * L, T.top + B * 0.165, z);
        bell.rotation.z = side * 0.55;                // turned into the wind
        g.add(tag(bell, 'vent', 'Cowl ventilator',
          'Turned into the wind to drive air below. With a coal-fired boiler room, a galley and several hundred people under the deck and no mechanical ventilation at all, a ship needed a great many of them.'));
      }
    }
  }
  group.add(tag(g, 'superstructure'));
}

/* ── THE RAISED ENDS: FORECASTLE AND POOP ──────────────────────────────────────────────
 * A liner's sheer line was not the top of her shell. On the Olympic class the plating rose
 * one deck above the shelter deck in three places — a 128 ft forecastle, the 550 ft bridge
 * superstructure, and a 106 ft poop — with two ~50 ft WELL DECKS cut between them, and that
 * alternation of black wall and open well is a large part of the recognisable profile. The
 * record closes on itself: 128 + 50 + 550 + 50 + 106 = 884 ft against her 882.75 ft overall,
 * so the two ends are DERIVED — the recorded house (houseAt) minus a recorded well (wellM)
 * on each side, running out to the hull's own extremities. Their lengths then fall out at
 * 39 m and ~26 m drawn (the counter overhang carries the rest of the poop's 32 m), and the
 * BREAKS — the thing the eye reads — stand at the record's stations.
 * The walls follow the hull's own half-breadth (flush shell, not inset house) and the hull's
 * own sheer, in the hull's own paint. */
function buildRaisedEnds(S, group) {
  if (!(S.wellM && S.houseAt && S.houseAt.length === 2 && S.decks)) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam, dh = S.deckM || B * 0.105;
  const wellU = S.wellM / L;
  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(S.topside || '#3a3a3c'), roughness: 0.58, metalness: 0.22,
    side: THREE.DoubleSide });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd3c9b4, roughness: 0.72, side: THREE.DoubleSide });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
  const halfAt = u => Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]) - B * 0.015;
  const up = new THREE.Vector3(0, 1, 0);

  const mk = (u0, u1, label, what) => {
    const g = new THREE.Group();
    const N = Math.max(10, Math.round((u1 - u0) * L / 1.6));
    /* the perimeter, wound like the house's: starboard fwd→aft, aft end, port aft→fwd,
       fwd end — each station carrying its own u so the wall can follow the sheer */
    const path = [];
    for (let k = 0; k <= N; k++) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L, z: halfAt(u) }); }
    path.push({ u: u1, x: (u1 - 0.5) * L, z: -halfAt(u1) });
    for (let k = N; k >= 0; k--) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L, z: -halfAt(u) }); }
    path.push({ u: u0, x: (u0 - 0.5) * L, z: halfAt(u0) });
    /* the wall: two vertex rows, base sunk a little into the shell (no coplanar cap to
       fight), head one deck-height over the local sheer */
    const tp = [], ti = [];
    for (const p of path) {
      const ys = H.sheer(p.u);
      tp.push(p.x, ys - dh * 0.15, p.z, p.x, ys + dh, p.z);
    }
    for (let k = 0; k + 1 < path.length; k++) {
      const a = k * 2, b = a + 2;
      ti.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    wg.setIndex(ti); wg.computeVertexNormals();
    g.add(new THREE.Mesh(wg, wallMat));
    /* the deck: a planked strip lofted station by station at sheer + dh, so it carries the
       hull's own sheer out to the end rather than lying flat across it */
    const dp = [], di = [];
    for (let k = 0; k <= N; k++) {
      const u = u0 + (u1 - u0) * k / N, y = H.sheer(u) + dh, h = halfAt(u);
      dp.push((u - 0.5) * L, y, -h, (u - 0.5) * L, y, h);
    }
    for (let k = 0; k < N; k++) { const a = k * 2, b = a + 2; di.push(a, b, a + 1, a + 1, b, b + 1); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    dg.setIndex(di); dg.computeVertexNormals();
    g.add(new THREE.Mesh(dg, deckMat));
    /* railed all round, posts and three bars resampled from the same perimeter the wall
       stands on (the round-25 lesson: one polyline in, posts and rails out) */
    const step = B * 0.22, Q = [];
    let acc = 0; Q.push(path[0]);
    for (let k = 1; k < path.length; k++) {
      acc += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
      if (acc >= step || k === path.length - 1) { Q.push(path[k]); acc = 0; }
    }
    for (const q of Q) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.004, B * 0.004, dh * 0.30, 5), railMat);
      st.position.set(q.x, H.sheer(q.u) + dh + dh * 0.15, q.z);
      g.add(st);
    }
    for (let k = 0; k + 1 < Q.length; k++) {
      const a = Q[k], b = Q[k + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 0.01) continue;
      const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      const ym = (H.sheer(a.u) + H.sheer(b.u)) / 2 + dh;
      for (const hf of [0.10, 0.20, 0.30]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, len, 5), railMat);
        bar.position.set((a.x + b.x) / 2, ym + dh * hf, (a.z + b.z) / 2);
        bar.quaternion.setFromUnitVectors(up, dir);
        g.add(bar);
      }
    }
    group.add(tag(g, 'forecast', label, what));
  };

  const [hA, hB] = S.houseAt;
  mk(0.004, hA - wellU, 'Forecastle',
     'The shell carried one deck higher at the bow: anchor gear, windlass and the break of the deck. Between here and the bridge superstructure lies the forward well deck — on Titanic it was Third Class open space, and the first place the sea came aboard.');
  mk(hB + wellU, 0.996, 'Poop deck',
     'The raised aft deck, and on Titanic the last of her to stay dry. The aft well deck between the poop and the superstructure was Third Class promenade; the docking bridge stood here, from which she was conned going astern.');
}

/* ── WHERE THE FUNNELS STAND ────────────────────────────────────────────────────────────
 * ⚠ Read by TWO callers now — the funnels themselves, and the boom clamp in the rig, which
 * has to know what is standing in the gap it is about to swing a spar through. Defined once
 * for exactly the reason this project keeps relearning: two independent derivations of the
 * same station drift, and the drift shows up as a sail through a funnel.
 */
function funnelStations(S) {
  /* ⚠ AND WHERE THERE ARE MORE FUNNELS THAN GAPS, THEY STACKED UP IN ONE PLACE.
     The rule below threads uptakes into the holes between masts, which is right for an
     auxiliary steamer and wrong for a liner: Titanic has two pole masts, so two slots, and her
     FOUR funnels cycled over them — all four crammed into the after half of a 269 m ship,
     two of them inside each other. A ship whose funnels are her silhouette gets them from the
     record instead, as stations along her length. */
  if (S.funnelAt && S.funnelAt.length) return S.funnelAt.slice();
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
  /* ⚠ ONE CONSTANT FOR EVERY SHIP FROM A VICTORIAN PACKET TO A BATTLESHIP. beam x 1.55 gave
     Titanic 43.7 m of funnel against a real 19 above the boat deck, and Yamato 60 m against 28
     — so on both of them the stacks were the tallest thing aboard and read as chimneys on a
     factory. Height comes from the record when the record is in the data. */
  const h = S.funnelH !== undefined ? S.funnelH : S.beam * 1.55;
  /* ⚠ SISTER FUNNELS ARE NOT ALWAYS THE SAME FUNNEL. Dreadnought's aft stack served twice
     the boilers of her fore one and photographs show it plainly fatter; one shared radius
     drew them as twins. `funnelScale` is a per-funnel radius factor from the record. */
  const r = S.beam * 0.115;
  const black = new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.62, metalness: 0.30 });
  const band = new THREE.MeshStandardMaterial({ color: 0x8a3820, roughness: 0.55, metalness: 0.18 });
  /* ⚠ FUNNELS MUST NOT STAND WHERE MASTS DO. Fixed stations put Great Eastern's two funnels
     at 0.42 and 0.62 — exactly where two of her three masts are stepped — so they grew through
     each other. On a real auxiliary steamer the uptakes are threaded into the GAPS between the
     masts, because a boiler casing and a mast step cannot occupy the same frame. Take the mast
     positions and sit in the widest holes between them. */
  const slots = funnelStations(S);
  /* ⚠ THE STACK STANDS ON ITS OWN DECK, NOT ON THE SHEER. funnelH is the record's number,
     and the record measures a funnel above the deck it stands on — for Titanic the BOAT
     deck. Rising from the sheer, her 19 m stacks spent 12 m hidden inside the house and
     showed 7, with the black top half the visible funnel instead of a fifth of it. The
     uptake exits through the highest tier covering its station — the house's own
     derivation, so the two cannot disagree.
     ⚠ BUT ONLY WHERE THE RECORD LOCATED THE HOUSE (houseAt). Where the house is the default
     abstraction, the recorded funnel height keeps the SHEER as its datum: raising Great
     Eastern's 30 m stacks onto an inferred house top made them out-tower her own foremast,
     which no period image supports — her funnels rose from the open upper deck between low
     houses, and the audit caught the contradiction (right, 2 for 6 lifetime). */
  const T = (S.decks && !S.turrets && !S.flightDeck) ? linerHouse(S) : null;
  /* ── ⚠ THE RAKE IS THE SHIP'S, AND THE CASING DOES NOT SHARE IT ────────────────────
     funnelRake is the record's inclination in degrees aft — the Olympic class raked masts
     and funnels 2 inches to the foot (9.46°), Yamato's single trunked uptake leaned 25°
     and that lean is most of her broadside identity, Dreadnought's stacks stood plumb (0).
     The default is the mild aft lean nearly every steamer wore. The casing stands plumb —
     it is a DECKHOUSE, the house over the fiddley, vertical walls by construction — and
     only the UPTAKE rakes.
     ⚠ AND THE RAKE IS A SHEAR, NOT A ROTATION (round 72). A yard builds an inclined
     cylinder CUT HORIZONTAL at base and head; rotating a straight stack instead swung its
     base rim r·sinθ below the deck — Queen Mary 2's 9.4 m casing at 12° buried its rim
     2.3 m into her house (the audit's find), Titanic's four sat 1.1 m into hers — and
     shortened the drawn stack to h·cosθ when the record's height is measured vertically.
     The shear is baked into the vertices: every horizontal section stays horizontal, the
     base rim lies flat near the casing floor where it cannot leave the ship, and the head
     stands at the record's height exactly. The audit reads the lean off these same
     vertices, so a shear, a tilt or any future mechanism measures alike. */
  const rakeDeg = S.funnelRake !== undefined ? S.funnelRake : 4.87;
  const th = rakeDeg * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const u = slots.length ? (slots[i % slots.length] || 0.50)
                           : (n === 1 ? 0.50 : 0.42 + i * (0.20 / (n - 1)));
    let y = H.sheer(u);
    if (T && T.recorded)
      for (const t of T.tiers) if (u >= t.uA && u <= t.uB) y = Math.max(y, t.y1);
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
    const ri = r * ((S.funnelScale || [])[i] || 1);
    const caseH = h * 0.085, caseR = ri * 1.34;
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
    /* the root sits just above the casing floor: at the floor itself the stack's flat base
       cap would be coplanar with the casing's own bottom disc — the two-surface fight the
       casing was built to end */
    const rootY = -caseH * 0.30, topY = caseH * 0.55 + h, L = topY - rootY;
    const sg = new THREE.CylinderGeometry(ri * 0.93, ri, L, 24, 24);
    const spos = sg.attributes.position, scol = [];
    /* ⚠ THE BUFF-AND-BLACK IS A SHIPPING LINE'S TRADEMARK, AND A WARSHIP HAS NO SHIPPING
       LINE. Yamato wore a liner's funnel for as long as she has existed here. A navy's funnel
       is the navy's grey, black at the head where the smoke has it anyway. */
    const warship = !!S.turrets;
    /* ⚠ THE BUFF IS THE LINE'S, NOT THE FLEET'S. One constant painted P&O and White Star the
       same colour. Where the record supplies the line's buff it comes from the data (S.buff);
       for White Star the exact shade is CONTESTED — tan, orange-yellow and near-pink are all
       defended in the literature — and the data says so where it is set. */
    const buff = new THREE.Color(warship ? 0x596066 : (S.buff || 0xd8cfbb)), cap = new THREE.Color(0x1b1b1d);
    /* the cap is measured down from the HEAD, so the buried root does not stretch the livery */
    const capFrom = topY - (warship ? 0.12 : 0.20) * h;
    for (let j = 0; j < spos.count; j++) {
      const ya = spos.getY(j) + (topY + rootY) / 2;
      const c = ya > capFrom ? cap : buff;
      scol.push(c.r, c.g, c.b);
    }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
    /* the shear: x' = x + tan(θ)·(height above the base cut). applyMatrix4 carries the
       normals through the inverse transpose, so the shading is the inclined surface's own */
    const shear = Math.tan(th);
    sg.applyMatrix4(new THREE.Matrix4().set(
      1, shear, 0, shear * L / 2,
      0, 1,     0, 0,
      0, 0,     1, 0,
      0, 0,     0, 1));
    const stack = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.66, metalness: 0.10 }));
    stack.position.y = (topY + rootY) / 2;
    g.add(tag(stack, 'funnel', 'Funnel',
      'Buff with a black top. Funnel colours were a shipping line\'s registered trademark: at sea a hull is a silhouette long before a name can be read, so the livery at the head of the funnel is how a ship was known hull-down on the horizon.'));
    /* the company band at the head — the one piece of colour on a Victorian hull */
    /* the steam pipe alongside, which is what actually roars — its foot pinned inside the
       casing footprint and sheared parallel, so it emerges through the casing top and cannot
       float when the stack leans hard */
    const Lp = L - h * 0.08;
    const pgeo = new THREE.CylinderGeometry(ri * 0.13, ri * 0.13, Lp, 16);
    pgeo.applyMatrix4(new THREE.Matrix4().set(
      1, shear, 0, shear * Lp / 2,
      0, 1,     0, 0,
      0, 0,     1, 0,
      0, 0,     0, 1));
    const pipe = new THREE.Mesh(pgeo, black);
    pipe.position.set(-ri * 1.25, rootY + Lp / 2, 0);
    g.add(pipe);
    g.position.set((u - 0.5) * S.lwl, y, 0);
    group.add(tag(g, 'funnel'));
  }
}

/* ── THE MODERN MAST-AND-STACK CLUSTER ─────────────────────────────────────────────────
 * A motor vessel of the satellite age carries her topside identity in one place: the
 * exhaust rank, the signal mast and the communications radomes, packed amidships in a
 * single sculpted cluster. It is as much her silhouette as four buff funnels were
 * Titanic's — Azzam without it read as a bare white wedge for three rounds.
 * ⚠ EVERY DIMENSION COMES FROM THE VESSEL'S `cluster` RECORD, AND THE RECORD SAYS WHERE
 * IT CAME FROM. For Azzam no published drawing gives these heights; they are DERIVED
 * from the delivery photograph on her card, scaled against her recorded 180.6 m — the
 * scale fixed by waterline and stem, cross-checked against her 9.0 m freeboard. Each
 * part's card states the derivation (rule 10). Stations are u along the waterline from
 * the bow; heights are metres over the load line, the plate's own datum.
 * The cluster's FEET stand on the linerHouse roof — the derivation the walls, boats and
 * funnels already stand on — and its recorded heights reach UP from the water, so if the
 * house is ever re-derived the cluster rides the roof and cannot float or bury (the
 * class of Queen Mary 2's buried casing, round 72).
 * Rakes are SHEARS, not rotations (round 72): a yard builds an inclined tube cut
 * horizontal at base and head, so the base rim lies flat on its roof at any angle and
 * the head stands at the record's height exactly. */
function buildCluster(S, group) {
  const C = S.cluster;
  if (!C) return;
  const L = S.lwl, B = S.beam;
  const T = S.decks ? linerHouse(S) : null;
  const roof = T ? T.top : hullSurface(S).sheer(0.5);
  const X = u => (u - 0.5) * L;
  const g = new THREE.Group();

  const white  = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60,
                                                  side: THREE.DoubleSide });
  const glass  = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.22,
                                                  metalness: 0.55 });
  const domeMt = new THREE.MeshStandardMaterial({ color: 0xeae8e2, roughness: 0.45 });
  const finMt  = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.32,
                                                  metalness: 0.45 });

  /* the equipment blocks. Fore-aft extents and heights are the plate's; the WIDTHS are
     not readable from a profile photograph, so they are derived from the beam and the
     derivation is stated here: the lower block a house tier's width, the mast block
     narrower, as every overhead photograph of a vessel of this type shows. */
  const wLower = B * 0.62, wUpper = B * 0.40;
  if (C.blockU) {
    const [uA, uB] = C.blockU;
    const h = C.blockTopM - roof;
    const blk = new THREE.Mesh(new THREE.BoxGeometry((uB - uA) * L, h + 0.3, wLower), white);
    blk.position.set((X(uA) + X(uB)) / 2, roof - 0.3 + (h + 0.3) / 2, 0);
    g.add(tag(blk, 'cluster', 'Equipment block',
      'The raised tier the cluster stands on. Its extent and height are derived from the plate; its width from the beam, a profile photograph having no width in it.'));
  }
  if (C.upperU) {
    const [uA, uB] = C.upperU;
    const h = C.upperTopM - C.blockTopM;
    const blk = new THREE.Mesh(new THREE.BoxGeometry((uB - uA) * L, h + 0.2, wUpper), white);
    blk.position.set((X(uA) + X(uB)) / 2, C.blockTopM - 0.2 + (h + 0.2) / 2, 0);
    g.add(tag(blk, 'cluster', 'Mast block',
      'The upper block the mast and forward radomes stand on. Derived from the plate.'));
  }
  /* the swept glass sheet running from the lower roof up the mast block's face — the
     long dark parallelogram every photograph of her shows forward of the mast */
  if (C.glassFootU !== undefined && C.upperU) {
    const x0 = X(C.glassFootU), y0 = C.blockTopM;
    const x1 = X(C.upperU[0]),  y1 = C.upperTopM;
    const run = x1 - x0, rise = y1 - y0, len = Math.hypot(run, rise);
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(len + 0.4, 0.18, wUpper * 0.98), glass);
    sheet.rotation.z = Math.atan2(rise, run);
    sheet.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.05, 0);
    g.add(tag(sheet, 'cluster', 'Glass sweep',
      'The raked dark-glass sheet forward of the mast block. Angle and extent derived from the plate.'));
  }
  /* the fairing sweeping the lower block's roof down aft — the tail the stack rises from */
  if (C.fairAftU !== undefined && C.blockU) {
    const x0 = X(C.blockU[1]), x1 = X(C.fairAftU);
    const hw = wLower * 0.42;
    const A0 = [x0, roof - 0.25, -hw], Btop = [x0, C.blockTopM, -hw], C0 = [x1, roof - 0.25, -hw];
    const A1 = [x0, roof - 0.25,  hw], B1 = [x0, C.blockTopM,  hw], C1 = [x1, roof - 0.25,  hw];
    const v = [];
    const put = (...ps) => ps.forEach(p => v.push(...p));
    put(A0, Btop, C0,  A1, C1, B1);                      // the two triangular ends
    put(Btop, B1, C1,  Btop, C1, C0);                    // the sloping top
    put(A0, C0, C1,  A0, C1, A1);                        // the bottom, buried in the roof
    put(A0, A1, B1,  A0, B1, Btop);                      // the face against the block
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    wg.computeVertexNormals();
    g.add(tag(new THREE.Mesh(wg, white), 'cluster', 'Stack fairing',
      'The swept fairing running the roof down aft of the stack. Profile derived from the plate.'));
  }

  /* the stack: a dark raked casing fin carrying a close rank of polished uptake pipes.
     ⚠ THE RAKE IS FORWARD — the plate is unambiguous, each pipe edge leans toward the
     stem — and it is drawn as the record states it, not as convention expects. */
  if (C.stack) {
    const K = C.stack;
    const rakeF = -Math.tan((K.rakeFwdDeg || 0) * Math.PI / 180);   // forward is -x
    const rootY = C.blockTopM - 1.2;
    if (K.finU !== undefined) {
      const finH = K.finTopM - (rootY - 0.6);
      const fg = new THREE.BoxGeometry(K.finChordM || 4.2, finH, 3.4);
      fg.applyMatrix4(new THREE.Matrix4().set(
        1, rakeF, 0, rakeF * finH / 2,
        0, 1,     0, 0,
        0, 0,     1, 0,
        0, 0,     0, 1));
      const fin = new THREE.Mesh(fg, finMt);
      fin.position.set(X(K.finU), (rootY - 0.6) + finH / 2, 0);
      g.add(tag(fin, 'cluster', 'Stack casing',
        'The dark raked casing the uptakes rise through. Height and rake derived from the plate.'));
    }
    const n = K.pipes || 4;
    const [u0, u1] = K.uBase;                             // forward, aft
    const steel = new THREE.Color(0xb9bcbf), band = new THREE.Color(0x9c2f24),
          rim = new THREE.Color(0x2a2c2e);
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0 : i / (n - 1);                // 0 forward, 1 aft
      const u = u0 + (u1 - u0) * f;
      const top = K.topFwdM + (K.topAftM - K.topFwdM) * f;
      const Lp = top - rootY, r = (K.pipeDiaM || 1.4) / 2;
      const pg = new THREE.CylinderGeometry(r * 0.96, r, Lp, 20, 24);
      const pos = pg.attributes.position, col = [];
      for (let j = 0; j < pos.count; j++) {
        const ya = pos.getY(j) + Lp / 2;                  // 0 at base, Lp at head
        const c = ya > Lp - 0.25 ? rim : (ya > Lp - 1.6 && ya < Lp - 0.9) ? band : steel;
        col.push(c.r, c.g, c.b);
      }
      pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      pg.applyMatrix4(new THREE.Matrix4().set(
        1, rakeF, 0, rakeF * Lp / 2,
        0, 1,     0, 0,
        0, 0,     1, 0,
        0, 0,     0, 1));
      const pipe = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.30, metalness: 0.85 }));
      pipe.position.set(X(u), rootY + Lp / 2, 0);
      g.add(tag(pipe, 'cluster', 'Exhaust pipe',
        'One of the polished uptakes, raked forward as the plate shows — the lean measured off the photograph at about fifteen degrees, drawn as a shear so the base sits flat in its casing and the head stands at the derived height. The heights are derived; no drawing of this plant is published.'));
    }
  }

  /* the radomes: paired or single spheres on short pedestals. A pair reads from abeam as
     one blob wider than it is tall, which is exactly what the plate shows — the sphere
     DIAMETER is the plate's vertical measure, the pairing resolves its width. */
  for (const d of C.domes || []) {
    const base = d.upper ? C.upperTopM : roof;
    const stations = d.pair ? [[d.dM / 2 + 0.25, 0.55], [-(d.dM / 2 + 0.25), -0.55]] : [[0, 0]];
    for (const [dz, dx] of stations) {
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(d.dM * 0.16, d.dM * 0.19, 1.1, 12), white);
      ped.position.set(X(d.u) + dx, base - 0.25 + 0.55, dz);
      g.add(tag(ped, 'cluster', 'Radome pedestal',
        'Stands the dome clear of the deck wash. Derived from the plate.'));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(d.dM / 2, 24, 16), domeMt);
      dome.position.set(X(d.u) + dx, base - 0.25 + 1.1 + d.dM * 0.44, dz);
      g.add(tag(dome, 'cluster', 'Radome',
        'A weatherproof shell over a stabilised satellite dish — the sphere is the cheapest shape that lets the antenna inside slew freely. Diameter and station derived from the plate against the recorded length.'));
    }
  }

  /* the signal mast: a white tapering tower on the mast block, raked aft, carrying its
     spreader platforms and the masthead whip */
  if (C.mast) {
    const M = C.mast;
    const rakeA = Math.tan((M.rakeAftDeg || 0) * Math.PI / 180);    // aft is +x
    const baseY = C.upperTopM - 0.4, headY = M.topM;
    const Lm = headY - baseY, r0 = (M.baseDiaM || 2.7) / 2;
    const mg = new THREE.CylinderGeometry(r0 * 0.22, r0, Lm, 20, 16);
    mg.applyMatrix4(new THREE.Matrix4().set(
      1, rakeA, 0, rakeA * Lm / 2,
      0, 1,     0, 0,
      0, 0,     1, 0,
      0, 0,     0, 1));
    const mastMesh = new THREE.Mesh(mg, white);
    mastMesh.position.set(X(M.u), baseY + Lm / 2, 0);
    g.add(tag(mastMesh, 'mast', 'Signal mast',
      'The communications tower: no sail ever hung here. Height over water and the aft rake are derived from the plate — no published drawing gives them. A derived figure, labelled as one.'));
    const axisX = y => X(M.u) + rakeA * (y - baseY);
    (M.yardsM || []).forEach((yh, i) => {
      /* slender: the plate shows the spreaders as LINES off the tower, not decks — a deep
         chord here read as a stacked radar tower on the first capture */
      const chord = 1.1 - i * 0.15, span = 7.5 - i * 1.5;
      const plat = new THREE.Mesh(new THREE.BoxGeometry(chord, 0.14, span), white);
      plat.position.set(axisX(yh), yh, 0);
      g.add(tag(plat, 'mast', 'Spreader platform',
        'Carries the aerials that must see past the mast. Heights derived from the plate.'));
      if (i === (M.yardsM || []).length - 1) {
        for (const dz of [-1.4, 1.4]) {
          const sm = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), domeMt);
          sm.position.set(axisX(yh), yh + 0.6, dz);
          g.add(tag(sm, 'mast', 'Aerial dome', 'Small radome on the upper spreader. Derived.'));
        }
      }
    });
    if (M.whipM) {
      const Lw = M.whipM - (headY - 0.3);
      const wg2 = new THREE.CylinderGeometry(0.025, 0.05, Lw, 8);
      wg2.applyMatrix4(new THREE.Matrix4().set(
        1, rakeA, 0, rakeA * Lw / 2,
        0, 1,     0, 0,
        0, 0,     1, 0,
        0, 0,     0, 1));
      const whip = new THREE.Mesh(wg2, white);
      whip.position.set(axisX(headY - 0.3), (headY - 0.3) + Lw / 2, 0);
      g.add(tag(whip, 'mast', 'Masthead whip',
        'The HF whip at the truck — the highest fitting aboard. Derived from the plate.'));
    }
  }

  group.add(tag(g, 'cluster'));
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
  /* the 9 m cap is Titanic's 30-footers; a modern liner's boat-tender is a recorded size
     (Queen Mary 2: 11.92 m Schat-Harding boats), so the record overrides where it speaks */
  const boatL = S.boatLM || Math.min(B * 0.42, 9.0), boatB = boatL * 0.30;
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
  let gapPitch = boatL * 1.38;
  /* ── ⚠ AND THEY STOW ON THE BOAT DECK, WHICH IS A PLACE, NOT A PHRASE ───────────────
     The card has said "stowed under davits on the boat deck" the whole time, and the builder
     put every boat at the HULL SHEER — on a liner that is the well of the promenade, four
     decks below the deck the boats are named for, and the row of white hulls read as blisters
     riveted to the ship's side. The boat deck is the TOP OF THE HOUSE: taken from
     linerHouse(), the same derivation the walls and the funnels stand on, clear of the
     bridge at its forward end. A ship with no house keeps her boats at the sheer, which for
     her is the boat deck. */
  const T = S.decks ? linerHouse(S) : null;
  /* recessed boats stow in the gallery tier linerHouse marked, not on the roof —
     same object, same derivation, so the boats cannot drift from their own recess */
  const recT = T ? T.tiers.find(t => t.recess) : null;
  const topT = recT || (T ? T.tiers[T.n - 1] : null);
  const u0A = topT ? topT.uA + 0.045 : null, u0B = topT ? topT.uB - 0.025 : null;
  let ps = perSide;
  if (topT) {
    const avail = (u0B - u0A) * L;
    /* the pitch may close up to a boat's length and a third-of-a-third before boats are cut —
       and then it is fewer boats, never closer ones */
    if ((ps - 1) * gapPitch > avail)
      gapPitch = Math.max(boatL * 1.30, avail / Math.max(1, ps - 1));
    if ((ps - 1) * gapPitch > avail) ps = Math.floor(avail / gapPitch) + 1;
  }
  const span = topT ? (ps - 1) * gapPitch / L
                    : Math.min(0.58, (ps - 1) * gapPitch / L);
  const uMid = topT ? (u0A + u0B) / 2 : 0.5;
  for (let i = 0; i < ps; i++) {
    const u = uMid - span / 2 + (i / Math.max(1, ps - 1)) * span;
    /* in a recess the boat stands on the gallery SOLE (y0), under the decks above;
       on an open boat deck it stands on the roof (y1) */
    const deckY = recT ? recT.y0 + 0.15 : (topT ? topT.y1 : H.sheer(u));
    const half = topT ? topT.half(u)
                      : Math.abs(surfacePoint(S, H, Math.max(0.01, Math.min(0.99, u)), 1.0)[2]);
    for (const sgn of [-1, 1]) {
      /* recessed boats hang proud of the gallery's dark back wall, inside the hull side */
      const z = sgn * (recT ? half + boatB * 0.35 : half - B * 0.045);
      /* the boat: a shallow hull, keel down, stowed fore-and-aft on its chocks */
      const bg = new THREE.SphereGeometry(boatL / 2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      bg.scale(1.0, 0.42, boatB / boatL);
      bg.rotateX(Math.PI);
      const bt = new THREE.Mesh(bg, white);
      bt.position.set((u - 0.5) * L, deckY + boatL * 0.21 + 0.10, z);
      group.add(tag(bt, 'boat', 'Ship\'s boat',
        recT
          ? 'Stowed in an open gallery cut into the superstructure — SOLAS pushed a modern liner\'s boats down from the roof to where the sea is nearer and the embarkation shorter. On Queen Mary 2 the drop is still about 24 m, among the longest afloat, and she carries a rating for it.'
          : 'Stowed under davits on the boat deck. Board of Trade rules scaled boats to TONNAGE rather than to the number of people aboard, and were not revised as ships grew — which is why Titanic sailed legally with 20 boats for 2,224 souls.'));
      /* in a recess the davit gear lives in the gallery ceiling and does not read at hull
         scale; on an open deck, two davits per boat, standing ON the deck, curved so the
         boat clears the side */
      if (recT) continue;
      for (const d of [-0.34, 0.34]) {
        const pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          pts.push(new THREE.Vector3(0, t * B * 0.16, Math.pow(t, 2.2) * B * 0.085));
        }
        const dg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, B * 0.007, 5, false);
        const dv = new THREE.Mesh(dg, dark);
        dv.position.set((u - 0.5) * L + d * boatL, deckY, z);
        dv.scale.z = sgn;
        group.add(tag(dv, 'boat', 'Davit',
          'Curved, because the boat has to clear a ship\'s side that flares or tumbles home on its way down. A straight arm would foul the hull or have to be absurdly long.'));
      }
    }
  }
}

/* ── THE SCREWS ─────────────────────────────────────────────────────────────────────────
 * Below the waterline, so afloat they are invisible — but the Shipwright builds her DRY,
 * stage by stage, and a motor ship in dry dock with a bare run aft is missing the machinery
 * that makes her a motor ship. Drawn only where the data declares them (S.screws), because a
 * guessed screw count is a claim about a real ship's engine room. Manganese bronze, which is
 * why they are the one golden thing on a grey hull.
 */
function buildScrews(S, group) {
  const n = S.screws || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam, D = S.draught;
  const p = surfacePoint(S, H, 1.0, 0);
  const bronze = new THREE.MeshStandardMaterial({ color: 0xa8845c, roughness: 0.38,
                                                  metalness: 0.82 });
  const r = Math.min(D * 0.55, B * 0.20) / 2;
  const y = -D * 0.62;
  const zs = n === 1 ? [0]
           : n === 2 ? [-B * 0.16, B * 0.16]
           : n === 3 ? [0, -B * 0.18, B * 0.18]
           :           [-B * 0.10, B * 0.10, -B * 0.23, B * 0.23];
  const bladeGeo = new THREE.SphereGeometry(1, 8, 6);
  zs.forEach((z, i) => {
    const scr = new THREE.Group();
    /* outboard shafts emerge from the run further forward than the inboard pair */
    const x = p[0] - L * (Math.abs(z) > B * 0.12 ? 0.085 : 0.060);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.20, r * 0.55, 8),
                               bronze);
    hub.rotation.z = Math.PI / 2;
    scr.add(hub);
    for (let b = 0; b < 5; b++) {
      const arm = new THREE.Group();
      const bl = new THREE.Mesh(bladeGeo, bronze);
      bl.scale.set(r * 0.16, r * 0.52, r * 0.34);
      bl.position.y = r * 0.55;
      bl.rotation.y = 0.55;                       // the pitch, which is what a screw IS
      arm.add(bl);
      arm.rotation.x = b * Math.PI * 2 / 5;
      scr.add(arm);
    }
    /* the shaft, running forward into the run */
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.10, r * 0.10, L * 0.035, 6),
                                 bronze);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -L * 0.0175;
    scr.add(shaft);
    scr.position.set(x, y, z);
    group.add(tag(scr, 'screw', 'Screw',
      'Manganese bronze, below the waterline. What she has instead of everything the sailing fleet carries aloft.'));
  });
}

/* the landing area's own geometry — ONE derivation, shared with the audit. Axis centre,
   rotation about y, half-length and half-width, in the ship's frame (bow at -x, starboard +z).
   The aft end of the axis sits near the centreline at the round-down; the forward end reaches
   the port deck edge just forward of amidships — nine degrees, which is the whole invention. */
function landingStrip(S) {
  const L = S.lwl, deckW = S.flightDeck;
  return { cx: L * 0.14, cz: -deckW * 0.177, rot: -0.157,
           halfLen: L * 0.31, halfW: deckW * 0.105 };
}

function buildFlightDeck(S, group, mats) {
  if (!S.flightDeck) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const deckW = S.flightDeck;                       // full flight-deck beam in metres
  /* ── THE PAINT IS AN ALBEDO, NOT A TONE (round 35). ─────────────────────────────────
     She read as a black cutout in both views: deck 0x23272b, island 0x2b3036, casing
     0x363b41 — soot values, each authored to LOOK right under one rig and wrong under the
     other. (The old note here blamed a blow-out under the 3.1 key; round 26 already found
     that blow-out was a liner deckhouse occupying the same pixels, and the deck was then
     darkened anyway.) Measured against the 8 April 2017 sea-trials broadside (US Navy, PD):
     the island in sun reads as bright as the wake foam (lum 197/255), the deck ~0.9× of
     that, sunlit verticals ~0.8×, the hull shell 0.2–0.4× — the only near-black anywhere
     on a Ford is the SHADOW under the deck-edge overhang, and the renderer casts that
     itself. So the materials now carry the paints, not the compensations: FS 26270 haze
     grey on every vertical, MIL-PRF-24667 non-skid on the deck. The weathered non-skid
     shade is CONTESTED — a fresh coat is near-black, worn decks in overheads read a full
     mid grey; 0x4e5357 sits where the trials photos do. A flight deck stays matt: anything
     glossy up there is lethal to people and aircraft alike. */
  const HAZE = 0x848a8e;
  const grey = new THREE.MeshStandardMaterial({ color: 0x4e5357, roughness: 0.99, metalness: 0.0 });
  const dark = new THREE.MeshStandardMaterial({ color: HAZE, roughness: 0.70, metalness: 0.15 });
  const line = new THREE.MeshStandardMaterial({ color: 0xd6d2c4, roughness: 0.85, metalness: 0.0 });
  const y = H.sheer(0.5) + B * 0.10;

  /* the deck itself: it OVERHANGS the hull on both sides, which is why a carrier's waterline
     beam and its flight-deck beam are two very different numbers */
  const fd = new THREE.Mesh(new THREE.BoxGeometry(L * 1.02, B * 0.045, deckW), grey);
  fd.position.set(0, y, 0);
  group.add(tag(fd, 'flightdeck', 'Flight deck',
    'It overhangs the hull on both sides — which is why a carrier\'s waterline beam and its flight-deck beam are entirely different numbers.'));

  /* ── ⚠ THE DECK WAS A SLAB FLOATING OVER THE HULL ──────────────────────────────────
     From any low bearing you could see under the flight deck, across open air, to the sea
     on the far side: nothing connected the deck to the sheer. On the ship that space is
     BUILT — the hangar and the gallery decks — and the overhang is only ever at the edges.
     Lofted from the hull's own half-breadth, so the casing cannot disagree with the sheer
     it stands on. */
  /* the casing is the shell carried up — the same haze grey as everything vertical. Its
     rendered darkness must come from the deck-edge overhang's SHADOW, as it does on the
     ship, not from a darker paint. */
  const caseMat = new THREE.MeshStandardMaterial({ color: HAZE, roughness: 0.62,
                                                   metalness: 0.25, side: THREE.DoubleSide });
  const hg = new THREE.Group();
  const NUH = 36, u0 = 0.05, u1 = 0.95;
  const yTopC = y - B * 0.020;
  const hzAt = u => Math.abs(surfacePoint(S, H, u, 1.0)[2]) * 0.995;
  for (const sgn of [-1, 1]) {
    const pos2 = [], idx2 = [];
    for (let i = 0; i <= NUH; i++) {
      const u = u0 + (i / NUH) * (u1 - u0);
      const sp = surfacePoint(S, H, u, 1.0);
      pos2.push(sp[0], sp[1] - B * 0.012, sgn * hzAt(u),
                sp[0], yTopC,             sgn * hzAt(u));
    }
    for (let i = 0; i < NUH; i++) {
      const a = i * 2;
      idx2.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
    wg.setIndex(idx2); wg.computeVertexNormals();
    hg.add(new THREE.Mesh(wg, caseMat));
  }
  /* the casing's ends, closed across the hull */
  for (const ue of [u0, u1]) {
    const spe = surfacePoint(S, H, ue, 1.0);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.004, yTopC - (spe[1] - B * 0.012), 2 * hzAt(ue)), caseMat);
    cap.position.set(spe[0], (yTopC + spe[1] - B * 0.012) / 2, 0);
    hg.add(cap);
  }
  /* the hangar bay openings, flush in the casing side — under the deck-edge lifts to
     starboard, because that is where the aircraft actually pass */
  const openMat = new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.92 });
  for (const [uo, sgn] of [[0.30, 1], [0.62, 1], [0.44, -1]]) {
    const spo = surfacePoint(S, H, uo, 1.0);
    const gapH = yTopC - (spo[1] - B * 0.012);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.045, gapH * 0.55, B * 0.006), openMat);
    door.position.set(spo[0], spo[1] + gapH * 0.42, sgn * (hzAt(uo) + B * 0.002));
    hg.add(door);
  }
  group.add(tag(hg, 'hangar', 'Hangar and gallery decks',
    'The space between the hull and the flight deck is built, not air: the hangar bays and the gallery decks around them. The deck-edge lifts open into it, which is why its sides are doors.'));

  /* ⚠ The angled deck was drawn as a FILLED white box 15.6 m across, which is a painted
     runway and not what a carrier looks like from anywhere. The landing area is marked by
     LINES on the same non-skid as the rest of the deck — its two edges — and the deck inside
     them is the same colour as the deck outside. */
  /* ⚠ AND IT RAN THE WRONG WAY ON THE WRONG HALF OF THE SHIP. The strip was centred forward
     of amidships with its forward end drifting to STARBOARD — a mirror of the real geometry,
     with the arrestor wires beside the bow catapults. A landing area exists so that a missed
     wire flies off the BOW and goes round: it begins at the stern round-down near the
     centreline and runs forward-PORT. Its geometry is one derivation now — landingStrip() —
     shared with the audit, so the marks, the wires and the parking rule cannot disagree. */
  const LS = landingStrip(S);
  const aftX = Math.cos(LS.rot), aftZ = -Math.sin(LS.rot);   // unit vector down the axis, aft
  for (const edge of [-1, 1]) {
    const ang = new THREE.Mesh(new THREE.BoxGeometry(L * 0.62, B * 0.004, deckW * 0.010), line);
    ang.position.set(LS.cx, y + B * 0.025, LS.cz + edge * LS.halfW);
    ang.rotation.y = LS.rot;
    group.add(tag(ang, 'flightdeck', 'Angled landing area',
      'Angled about nine degrees to port so an aircraft that misses the arrestor wires flies off the bow and goes round again, instead of into the aircraft parked forward. It is what made jet operation possible.'));
  }

  /* ── THE ISLAND, WHICH WAS A BOX AND A STICK ──────────────────────────────────────
     The survey ranked this ship crudest in the fleet — 337 metres of it in fifty-four meshes —
     and the flight deck was not the reason: its markings, wires, catapults and flush lifts
     were all there. It was the island, drawn as one slab with a cylinder on top.
     An island is the only part of a carrier that is allowed to be tall, so everything that
     cannot go under an armoured flat deck is stacked into it, and its shape is a list of those
     things: navigating bridge low and forward where the ship is conned; flying control ABOVE
     and AFT, where a controller can see the landing area and the round-down behind him; the
     uptakes from eight boilers or two reactors carried up through the middle; and a mast whose
     job is height for the radar. Each level steps in from the one below because each carries
     less, and because the whole tower has to keep its weight off the deck edge.
     Everything below is built to touch the piece under it — the survey's other finding this
     round was a funnel attached to nothing, and a tower is exactly where that happens. */
  const isl = new THREE.Group();
  /* ⚠ 0x6a757f at metalness 0.30 blew out to a solid white stripe under the 3.1 key —
     the same class as the flight-deck note above, on its first capture. Windows read DARK
     from outside; the sternlight glass already knew the recipe. */
  const glassI = new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
  /* ⚠ 0xb9b2a4 over L·0.055 was a 17 m cream stripe down the island's face, and from
     broadside it read as the bridge glass blowing out — the raycast said radar. A SPY
     array face is a panel about four metres across, a shade lighter than the structure. */
  const radarM = new THREE.MeshStandardMaterial({ color: 0x6f7780, roughness: 0.85 });
  const islW = deckW * 0.105;
  /* the tiers, each standing on the one below: length, width, height, and how far aft it sits */
  const tiers = [[L * 0.115, islW,        B * 0.155, 0.0],
                 [L * 0.090, islW * 0.90, B * 0.105, -L * 0.006],
                 [L * 0.052, islW * 0.78, B * 0.080, -L * 0.014]];
  let yy = 0;
  tiers.forEach((t, ti) => {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(t[0], t[2], t[1]), dark);
    blk.position.set(t[3], yy + t[2] / 2, 0);
    isl.add(blk);
    /* the bridge and flying control are mostly glass — that is what they are FOR. More
       mullion than pane (the round-22 lesson from the liner deckhouses), so the band reads
       as a row of windows rather than as a stripe of anything. */
    if (ti >= 1) {
      const winH = t[2] * 0.30, winY = yy + t[2] * 0.64;
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(t[0] * 0.94, winH, t[1] * 1.01), glassI);
      win.position.set(t[3], winY, 0);
      isl.add(win);
      const nM = Math.max(3, Math.round(t[0] / 2.2));
      for (let m = 0; m <= nM; m++) {
        const mull = new THREE.Mesh(
          new THREE.BoxGeometry(B * 0.006, winH * 1.06, t[1] * 1.015), dark);
        mull.position.set(t[3] - t[0] * 0.47 + (m / nM) * t[0] * 0.94, winY, 0);
        isl.add(mull);
      }
    }
    yy += t[2];
  });
  /* the uptakes, carried up through the after end of the tower */
  for (const zz of [-islW * 0.22, islW * 0.22]) {
    const up = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.020, B * 0.115, islW * 0.34), dark);
    up.position.set(L * 0.038, tiers[0][2] + B * 0.0575, zz);
    isl.add(up);
  }
  /* the flat radar arrays, fixed to the tower's faces — no rotating dish, which is the
     single most recognisable thing about a modern warship's upperworks */
  for (const f of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const pan = new THREE.Mesh(
      new THREE.BoxGeometry(f[0] ? L * 0.008 : L * 0.016, B * 0.058,
                            f[0] ? islW * 0.55 : islW * 0.06), radarM);
    pan.position.set(-L * 0.006 + f[0] * L * 0.046, tiers[0][2] + B * 0.052,
                     f[1] * islW * 0.47);
    pan.rotation.z = f[0] * 0.10;
    isl.add(pan);
  }
  const mastTop = tiers.reduce((a, t) => a + t[2], 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.005, B * 0.011, B * 0.26, 8), dark);
  mast.position.set(-L * 0.014, mastTop + B * 0.13, 0);
  isl.add(mast);
  for (const yq of [0.10, 0.19]) {
    const yard = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, islW * (1.05 - yq * 2.0), 6), dark);
    yard.rotation.x = Math.PI / 2;
    yard.position.set(-L * 0.014, mastTop + B * yq, 0);
    isl.add(yard);
  }
  isl.position.set(L * 0.06, y + B * 0.022, deckW * 0.40);
  group.add(tag(isl, 'island', 'The island',
    'Everything that cannot be under the deck: bridge, flying control, uptakes and radar. It is to starboard because a going-around aircraft swings to port.'));

  /* ── ⚠ THE LIFTS STOOD PROUD LIKE BOXES ON A TABLE ─────────────────────────────────
     A deck-edge lift is FLUSH with the deck when it is up — it is a piece of the deck that
     moves. Sitting it on top made it read as freight. It is now let into the surface and
     shows as a seam and a yellow-edged outline, which is all you would see from above. */
  for (const u of [0.30, 0.62]) {
    /* a lift IS deck — it wears the non-skid, not the vertical-surface haze grey */
    const lift = new THREE.Mesh(new THREE.BoxGeometry(L * 0.055, B * 0.008, deckW * 0.13), grey);
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
  cl.position.set(LS.cx, yTop, LS.cz);
  cl.rotation.y = LS.rot;
  group.add(tag(cl, 'flightdeck', 'Landing centreline',
    'The line a pilot flies down on approach. It runs along the angled deck, not the ship.'));
  /* the foul line, offset to starboard of it */
  const fl = new THREE.Mesh(new THREE.BoxGeometry(L * 0.52, B * 0.003, deckW * 0.008), paintY);
  fl.position.set(LS.cx - L * 0.01, yTop, LS.cz + deckW * 0.16);
  fl.rotation.y = LS.rot;
  group.add(tag(fl, 'flightdeck', 'Foul line',
    'Nothing and nobody may be inside this line while an aircraft is coming aboard.'));

  /* ── ARRESTOR WIRES ────────────────────────────────────────────────────────────────
     THREE on this class — the AAG turbo-electric gear, down from the Nimitz's four — athwart
     the AFT end of the landing area, which is where a hook actually crosses the deck. The
     aircraft is stopped by catching one and paying it out against the engine below decks —
     from about 240 km/h to nothing in roughly 100 m. */
  for (let w = 0; w < 3; w++) {
    const along = L * (0.185 + w * 0.04);            // down the axis from its centre, aft
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.0025, B * 0.0025, deckW * 0.24, 5),
      new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.6, metalness: 0.5 }));
    wire.rotation.x = Math.PI / 2;
    wire.rotation.y = LS.rot;
    wire.position.set(LS.cx + along * aftX, yTop + B * 0.002, LS.cz + along * aftZ);
    group.add(tag(wire, 'flightdeck', 'Arrestor wire',
      'A hook catches one of three and pays it out against the arresting engine below decks: about 240 km/h to a stop in roughly a hundred metres.'));
  }

  /* ── CATAPULT TRACKS ───────────────────────────────────────────────────────────────
     Two forward and one on the waist. On this class they are ELECTROMAGNETIC rather than
     steam, which is the whole reason the ship exists as a new design: a linear motor can be
     tuned to the aircraft, so it will launch something light without tearing it apart. */
  for (const c of [[-0.30, -deckW * 0.22], [-0.30, deckW * 0.10], [-0.06, -deckW * 0.26]]) {
    const cat = new THREE.Mesh(new THREE.BoxGeometry(L * 0.28, B * 0.003, deckW * 0.020), paintW);
    cat.position.set(c[0] * L, yTop, c[1]);
    /* the waist catapult launches across the angled deck, so it lies along the same axis */
    if (c[0] > -0.2) cat.rotation.y = LS.rot;
    group.add(tag(cat, 'flightdeck', 'Catapult track',
      'Electromagnetic on this class rather than steam. A linear motor can be tuned to the aircraft, so it will throw something light without tearing it apart.'));
  }

  if (S.deckPark) buildDeckPark(S, group, y);
}

/* ── THE DECK PARK ─────────────────────────────────────────────────────────────────────
 * A carrier with a bare deck reads as a runway, not a warship at work. Parked aircraft go
 * where the deck is not working: the bow park to starboard of the catapults, the street
 * along the starboard side aft of the island, and the fantail — never inside the angled
 * landing area and never across the foul line, which is what those lines are FOR.
 */
function buildAircraft(mats) {
  /* an 18 m strike fighter in real metres — wheels on y = 0, nose toward -x, wings FOLDED,
     which is how a parked naval fighter actually stands and the most legible single fact
     about a deck park. Fuselage, radome, canopy, folded outer panels standing up, twin
     canted fins, stabs, and the gear it stands on. */
  const ac = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.BoxGeometry(13.2, 1.5, 1.9), mats.acSkin);
  fus.position.set(0.6, 1.55, 0); ac.add(fus);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.18, 5.0, 8), mats.acSkin);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(-8.5, 1.55, 0); ac.add(nose);
  const can = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 1.1), mats.acGlass);
  can.position.set(-4.6, 2.5, 0); ac.add(can);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.15, 3.3), mats.acSkin);
    wing.position.set(-0.4, 2.0, s * 2.6); wing.rotation.y = s * 0.3; ac.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.13, 2.5), mats.acSkin);
    tip.position.set(0.4, 3.05, s * 4.5); tip.rotation.x = -s * 1.25; ac.add(tip);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 0.16), mats.acSkin);
    fin.position.set(5.2, 3.35, s * 1.15); fin.rotation.x = s * 0.35; fin.rotation.z = -0.35;
    ac.add(fin);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.1), mats.acSkin);
    stab.position.set(6.6, 1.7, s * 1.9); stab.rotation.y = s * 0.45; ac.add(stab);
    const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.85, 6), mats.acDark);
    mg.position.set(1.1, 0.43, s * 1.0); ac.add(mg);
  }
  const ng = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 6), mats.acDark);
  ng.position.set(-6.3, 0.43, 0); ac.add(ng);
  return ac;
}

function buildDeckPark(S, group, yDeck) {
  const L = S.lwl, deckW = S.flightDeck;
  const mats = {
    /* flat tactical grey — anything brighter blows out under the Shipwright's 3.1 key,
       the flight-deck lesson again */
    acSkin:  new THREE.MeshStandardMaterial({ color: 0x646b71, roughness: 0.88, metalness: 0.10 }),
    acGlass: new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 }),
    acDark:  new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.70, metalness: 0.20 }),
  };
  /* [x/L, z/deckW, heading]: the bow park, the street, the fantail. Clear of the landing
     area and the foul line by construction — and the audit re-checks every spot against
     landingStrip() rather than trusting these numbers. Headings vary the way a real park
     does, deterministically by index. */
  const spots = [
    [-0.43, 0.30, 2.45], [-0.38, 0.30, 2.30], [-0.33, 0.30, 2.55], [-0.28, 0.30, 2.40],
    [ 0.19, 0.33, 1.85], [ 0.245, 0.33, 2.05], [ 0.30, 0.33, 1.90], [ 0.355, 0.33, 2.10],
    [ 0.40, 0.23, 2.95], [ 0.455, 0.23, 3.05], [ 0.40, 0.32, 2.90], [ 0.455, 0.32, 3.10],
  ];
  const yTop = yDeck + S.beam * 0.0225;
  for (let i = 0; i < Math.min(S.deckPark, spots.length); i++) {
    const ac = buildAircraft(mats);
    ac.position.set(spots[i][0] * L, yTop, spots[i][1] * deckW);
    ac.rotation.y = spots[i][2];
    group.add(tag(ac, 'aircraft'));
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
/* Stations from the record when the record is in the data — the funnelStations rule again,
 * and read by TWO callers: the turrets themselves and the citadel, which spans the gap the
 * end turrets leave. Two derivations of where the battery stands is a superstructure built
 * over a magazine. */
function turretStations(S) {
  const n = S.turrets || 0;
  if (S.turretAt && S.turretAt.length) return S.turretAt.slice(0, n);
  /* two forward superfiring, the rest aft — the standard arrangement */
  return (n === 3 ? [0.24, 0.34, 0.78] : [0.22, 0.32, 0.70, 0.80]).slice(0, n);
}

/* ⚠ A GUNHOUSE IS SIZED BY ITS GUN, NOT BY THE SHIP. beam x 0.20 drew Dreadnought's twin
 * 12-inch houses ten metres across against a real nine — and the proof is on her own deck:
 * the mainmast tripod stood BETWEEN X and Y turrets on the real ship, and at beam-derived
 * size there is no gap between them to stand in. Real houses measure by calibre: a twin
 * 12-inch about 9 m over the plates, Yamato's triple 46 cm about 13.5 m — one slope,
 * R = calibre x 15.4, hits both. The beam cap keeps a big gun on a narrow hull sane. */
function turretRadius(S) {
  return Math.min(S.beam * 0.22, (S.calibre || 0.40) * 15.4);
}

/* One gunhouse, any calibre — the main battery and the secondaries are the same object at
 * two sizes, so they are one derivation. Faces the BOW (−x); the caller turns an aft mount.
 * `riser` extends the barbette downward, for a superfiring mount whose barbette has a whole
 * extra deck level to cross before it reaches the magazine. */
function gunhouse(S, R, cal, barrels, riser, mats) {
  const B = S.beam;
  const steel = mats.turretSteel || (mats.turretSteel =
    new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
  const dark = mats.turretDark || (mats.turretDark =
    new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
  const g = new THREE.Group();
  /* ⚠ THE BARBETTE RUNS TO THE DECK, ESPECIALLY WHEN THE TURRET IS RAISED. The superfiring
     mount was lifted by moving its whole group up, so its barbette bottom floated exactly the
     raise above the planking — attached to nothing below, and the contact audit could not see
     it because the barbette touches the gunhouse above. The raise is extra barbette. */
  const barbH = R * 0.55 + riser + 0.5;            // the 0.5 buries the bottom cap in the deck
  const barb = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, barbH, 20), dark);
  barb.position.y = R * 0.55 - barbH / 2;
  g.add(tag(barb, 'turret', 'Barbette',
    'The armoured cylinder running down to the magazine. The turret revolves on top of it; this is the part that actually carries the load and the armour.'));
  /* the gunhouse: sloped sides, longer than it is wide, face toward the bow */
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.78, R * 1.05, R * 0.62, 20), steel);
  tur.position.y = R * 0.83;
  tur.scale.x = 1.28;
  g.add(tag(tur, 'turret', 'Turret',
    'Gunhouse for the main battery. Its face carries the heaviest armour on the ship, because that is what an enemy shell is aimed at.'));
  /* ⚠ THE GUNS POINT PAST THE BOW, NOT THE STERN. They pointed at +x, which the carrier's
     catapults prove is the stern — every forward turret on every battleship faced backwards.
     And the barrel is the CALIBRE'S length, about 45 calibres for a naval rifle of the era:
     tying it to the turret radius gave Yamato 34 m of barrel against a real 21. */
  const barrelL = cal * (S.calLen || 45);
  for (let b = 0; b < barrels; b++) {
    const off = (b - (barrels - 1) / 2) * cal * 2.6;
    const gun = new THREE.Mesh(
      new THREE.CylinderGeometry(cal * 0.52, cal * 0.62, barrelL, 12), dark);
    gun.rotation.z = Math.PI / 2;
    gun.position.set(-(R * 0.85 + barrelL / 2 - R * 0.45), R * 0.90, off);
    g.add(tag(gun, 'turret', 'Main gun',
      'The calibre is the ship. Everything else — the armour, the beam, the displacement — is arranged around carrying these and surviving their equals.'));
  }
  /* the rangefinder across the gunhouse rear — the pair of ears every big-gun turret grew
     once fire control moved into the turret itself. ⚠ Sized R*2 + calibre*2, not R*2.5:
     Yamato's were 15 m across a 13.5 m house (this gives 15.1); at 2.5R a WING turret's
     ears reached past the ship's own side. */
  if (cal >= 0.2) {
    const rf = new THREE.Mesh(
      new THREE.CylinderGeometry(cal * 0.55, cal * 0.55, R * 2 + cal * 2, 10), dark);
    rf.rotation.x = Math.PI / 2;
    rf.position.set(R * 0.72, R * 1.05, 0);
    g.add(tag(rf, 'turret', 'Turret rangefinder',
      'The optical rangefinder across the rear of the gunhouse — its ears stick out both sides. Yamato\'s were 15 m across, the largest ever put in a turret.'));
  }
  return g;
}

function buildTurrets(S, group, mats) {
  const n = S.turrets || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const cal = S.calibre || 0.40;                   // barrel calibre in metres
  const barrels = S.barrels || 3;
  const stations = turretStations(S);
  const raise = S.turretRaise || stations.map((u, i) => (n >= 3 && i === 1) ? 1 : 0);
  /* ── ⚠ THE MAIN BATTERY IS NOT ALWAYS ON THE CENTRELINE ──────────────────────────────
     Dreadnought carried ten guns in five turrets and this builder could only draw the
     three that stood on the centreline — P and Q, the WING pair that gave her an eight-gun
     broadside, had nowhere to stand, so her card said five turrets over a drawing of
     three. `turretSide` is a parallel array (like `turretRaise`): 0 is the centreline,
     ±1 stands the mount at the deck edge that side. A wing mount trains FORE-AND-AFT at
     rest like every other mount, and photograph H61017 shows P trained toward the bow. */
  const sides = S.turretSide || [];
  stations.forEach((u, i) => {
    const base = H.sheer(u);
    const raised = raise[i] ? B * 0.085 : 0;       // the superfiring one stands higher
    const R = turretRadius(S);
    const side = sides[i] || 0;
    const g = gunhouse(S, R, cal, barrels, raised, mats);
    const z = side ? side * (Math.abs(surfacePoint(S, H, u, 1.0)[2]) - R * 1.02) : 0;
    g.position.set((u - 0.5) * L, base + raised, z);
    if (!side && u > 0.5) g.rotation.y = Math.PI;
    group.add(tag(g, 'turret'));
  });
}

/* ── THE CITADEL ────────────────────────────────────────────────────────────────────────
 * ⚠ A BATTLESHIP IS NOT A LINER. The generic deckhouse gave Yamato four white passenger
 * tiers with window bands over 80% of her length — and the main battery, the thing the ship
 * IS, was buried inside them: not one turret visible from any of twelve bearings. The whole
 * class was wrong, not a parameter of it.
 * A warship's superstructure is a compact grey CITADEL, and its extent is not a styling
 * choice: it fills the gap between the end turrets, because everywhere else the deck belongs
 * to the guns' arcs. So its span is DERIVED from the turret stations. On top of it stand the
 * bridge tower forward and whatever secondary mounts the record gives.
 */
function buildCitadel(S, group, mats) {
  if (!S.turrets) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const stations = turretStations(S);
  const R = turretRadius(S);
  /* ⚠ a WING mount does not bound the citadel fore-and-aft — it stands BESIDE it. Only the
     centreline battery decides where the house may run; the wings decide how WIDE (below). */
  const tSides = S.turretSide || [];
  const centre = stations.filter((u, i) => !tSides[i]);
  const wings = stations.map((u, i) => ({ u, s: tSides[i] || 0 })).filter(w => w.s)
    .map(w => ({ u: w.u, z: Math.abs(surfacePoint(S, H,
        Math.max(0.001, Math.min(0.999, w.u)), 1.0)[2]) - R * 1.02 }));
  const fwd = centre.filter(u => u < 0.5), aft = centre.filter(u => u >= 0.5);
  /* ⚠ the gunhouse is stretched 1.28x fore-and-aft, so its half-LENGTH is 1.34R; the old
     R*1.1 margin buried every end turret's nose a quarter-radius into the citadel face.
     1.40 clears the house by a sliver, which is the real look — they nearly abut. */
  const m = (R * 1.40) / L;
  let uA = fwd.length ? Math.max(...fwd) + m : 0.36;
  let uB = aft.length ? Math.min(...aft) - m : 0.68;
  /* ⚠ THE BRIDGE IS NOT NAILED TO THE MAST. Deriving the tower from masts[0] was right for
     the pagoda ships, where mast and tower are one structure — and wrong the moment the
     record moved Dreadnought's mast to where it stood, abaft the fore funnel: the bridge
     would have gone with it. `towerAt` is the record's own bridge station; without it the
     old derivation holds. */
  const towerU = S.towerAt !== undefined ? S.towerAt
               : (S.masts && S.masts[0]) ? S.masts[0].at : (uA + 0.03);
  uA = Math.min(uA, towerU - (B * 0.20) / L);       // the tower stands on the citadel
  const wall = new THREE.MeshStandardMaterial({ color: 0x666c73, roughness: 0.60, metalness: 0.22,
                                                side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4b5157, roughness: 0.58, metalness: 0.25 });
  const glaze = new THREE.MeshStandardMaterial({ color: 0x171b1f, roughness: 0.35, metalness: 0.30 });
  /* ── THE CITADEL SEATS EVERY MOUNT THE RECORD DECLARES ────────────────────────────────
     A barbette must stand on plating, so the deck runs forward or aft to cover the end
     secondaries — on the real ship the shelter deck runs right up round No.2 barbette for
     exactly this reason. Derived, so a record with more mounts gets a longer citadel. */
  (S.secondaries || []).forEach(sec => {
    if (sec.wing) return;                           // a wing pair stands abeam, inside the span
    const rB = (B * (sec.scale || 0.085) * 1.15) / L;
    uA = Math.min(uA, sec.at - rB);
    uB = Math.max(uB, sec.at + rB);
  });
  const g = new THREE.Group();
  const base = H.sheer((uA + uB) / 2);
  const dh = B * 0.080;
  /* one half-breadth derivation for the tier walls and everything that stands at them, so a
     mount placed "at the deck edge" is at the edge the loft actually drew.
     ── THE WAIST ⚠ ──────────────────────────────────────────────────────────────────────
     A wing turret needs the deck it stands on, so the house PINCHES where the wings are:
     the wall comes in to clear the barbette and its training circle, which is why the real
     Dreadnought's superstructure is two blocks — bridge forward, shelter aft — joined by a
     narrow spine between the wing barbettes, with the funnel casings standing proud of it.
     Derived from the wing stations, so a record without wings keeps its full house. */
  const tierHalf = (u, t) => {
    const full = Math.max(B * 0.06,
      Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]) - B * 0.06
      - t * B * 0.045);
    let half = full;
    for (const w of wings) {
      /* the hard zone must outlast the gunhouse itself — it is stretched 1.28x, so its
         half-length is 1.34R; easing back to full width any sooner ran the wall through
         the house's front quarter, which the audit caught on the first build */
      const du = Math.abs(u - w.u) * L, hard = R * 1.40, reach = R * 1.75;
      if (du >= reach) continue;
      const capW = Math.max(B * 0.055, w.z - R * 1.12);
      const e = Math.max(0, (du - hard) / (reach - hard));
      half = Math.min(half, capW + (full - capW) * e * e);
    }
    return half;
  };
  /* two stepped decks, lofted from the hull's own half-breadth so they cannot overhang —
     the liner house learned that rule the hard way and it holds here */
  const tiers = [[uA, uB], [uA + 0.012, uB - 0.045]];
  const tierTop = [];
  tiers.forEach(([a, b], t) => {
    const NU = 40;
    const y0 = base + dh * t - (t === 0 ? 0.4 : 0);  // ground tier sinks into the sheer
    const y1 = base + dh * (t + 1);
    const tp = [], ti = [];
    for (let k = 0; k <= NU; k++) {
      const u = a + (b - a) * k / NU;
      const half = tierHalf(u, t);
      const x = (u - 0.5) * L;
      tp.push(x, y0, -half,  x, y0, half,  x, y1, -half,  x, y1, half);
    }
    for (let k = 0; k < NU; k++) {
      const A0 = k * 4, B0 = A0 + 4;
      ti.push(A0, B0, A0 + 2,  A0 + 2, B0, B0 + 2);          // port wall
      ti.push(A0 + 1, A0 + 3, B0 + 1,  A0 + 3, B0 + 3, B0 + 1); // starboard wall
      ti.push(A0 + 2, B0 + 2, A0 + 3,  A0 + 3, B0 + 2, B0 + 3); // roof
    }
    for (const e of [0, NU * 4]) ti.push(e, e + 2, e + 1,  e + 1, e + 2, e + 3); // end caps
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    tg.setIndex(ti); tg.computeVertexNormals();
    g.add(tag(new THREE.Mesh(tg, wall), 'superstructure',
      t === 0 ? 'Citadel deck' : 'Shelter deck'));
    tierTop.push(y1);
  });
  /* ── THE BRIDGE TOWER ─────────────────────────────────────────────────────────────────
     Stacked and narrowing — the pagoda. Height from the record (`towerH`, metres above the
     weather deck); the pole mast the rig builder steps at the same station rises out of it. */
  const towerH = S.towerH !== undefined ? S.towerH : B * 0.55;
  const K = Math.max(2, Math.min(6, Math.round(towerH / (B * 0.11))));
  const tx = (towerU - 0.5) * L;
  const levels = [];                                // the searchlight platforms hang off these
  let y = tierTop[0];
  for (let k = 0; k < K; k++) {
    const f = k / Math.max(1, K - 1);
    const w = B * (0.34 - 0.20 * f), d = B * (0.40 - 0.22 * f);
    const lh = (base + towerH - tierTop[0]) / K;
    levels.push({ y0: y, lh, w, d });
    const lvl = new THREE.Mesh(new THREE.BoxGeometry(d, lh, w), k % 2 ? dark : wall);
    lvl.position.set(tx, y + lh / 2, 0);
    g.add(tag(lvl, 'superstructure', k === K - 1 ? 'Bridge' : 'Tower level ' + (k + 1),
      k === K - 1 ? 'The compass platform at the head of the tower. Everything below it is fire control, flag space and searchlight platforms, stacked because the centreline is the only real estate there is.' : undefined));
    /* the top two levels carry the glazing band — proud of the face, so nothing is coplanar */
    if (k >= K - 2) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(d * 1.03, lh * 0.30, w * 1.03), glaze);
      band.position.set(tx, y + lh * 0.62, 0);
      g.add(tag(band, 'superstructure', 'Bridge glazing'));
    }
    y += lh;
  }
  /* the main rangefinder across the tower head — on Yamato a 15 m pair of ears */
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.016, B * 0.016, B * 0.40, 10), dark);
  rf.rotation.x = Math.PI / 2;
  rf.position.set(tx, y + B * 0.020, 0);
  g.add(tag(rf, 'superstructure', 'Main rangefinder',
    'The primary optical rangefinder for the main battery, at the highest point that will hold one: range accuracy is baseline times height.'));
  /* ── THE SEARCHLIGHT PLATFORMS, from the record: `searchlights: N` ───────────────────
     Winged out from the tower flanks in pairs, one pair per level working upward — the
     bristling profile that made the type's silhouette. Each platform is a bracketed round
     wing with a carbon-arc drum on a pedestal, glass face outboard. Derived from the
     tower's own levels, so a taller or shorter pagoda carries them at its own heights. */
  if (S.searchlights) {
    const nPairs = Math.min(Math.ceil(S.searchlights / 2), Math.max(1, K - 2));
    for (let p = 0; p < nPairs; p++) {
      const lv = levels[Math.min(1 + p, K - 1)];
      for (const sgn of [1, -1]) {
        const zc = sgn * (lv.w / 2 + 1.25);
        const sl = new THREE.Group();
        /* the bracket spans from the tower face under the platform, so the wing hangs on
           structure rather than on air */
        const bk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 2.6), dark);
        bk.position.set(0, -0.55, -sgn * 0.7);
        sl.add(tag(bk, 'searchlight', 'Platform bracket'));
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.35, 0.28, 12), dark);
        sl.add(tag(plat, 'searchlight', 'Searchlight platform'));
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.65, 10), dark);
        ped.position.y = 0.45;
        sl.add(ped);
        /* the drum, axis outboard, mirror face proud */
        const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.95, 14), wall);
        dr.rotation.x = Math.PI / 2;
        dr.position.y = 1.35;
        sl.add(tag(dr, 'searchlight', 'Searchlight'));
        const face = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.70, 0.10, 14), glaze);
        face.rotation.x = Math.PI / 2;
        face.position.set(0, 1.35, sgn * 0.50);
        sl.add(tag(face, 'searchlight', 'Searchlight mirror'));
        sl.position.set(tx, lv.y0 + 0.55, zc);
        g.add(tag(sl, 'searchlight'));
      }
    }
  }
  /* ── THE SECONDARY BATTERY, from the record ──────────────────────────────────────────
     A mount trains fore-and-aft past its own end of the ship — at rest EVERY mount does,
     which the Kure fitting-out photographs show; trained abeam the wing pair read as bare
     drums from broadside, barrels foreshortened to nothing. `wing: true` is a PAIR at the
     upper tier's deck edge, port and starboard. `deck` is how many levels above the citadel
     roof the mount stands; the gunhouse riser carries its barbette down through the
     intervening height, so a raised mount cannot float — the main battery's round-26 rule. */
  (S.secondaries || []).forEach(sec => {
    const R2 = B * (sec.scale || 0.085);
    const lvl = sec.deck || 0;
    const posns = sec.wing
      ? [1, -1].map(sgn => ({ z: sgn * (tierHalf(sec.at, 1) - R2 * 1.15),
                              y: tierTop[1] - 0.15,
                              rot: sec.at > towerU ? Math.PI : 0, riser: 0 }))
      : [{ z: 0, y: tierTop[0] + dh * lvl - 0.15,
           rot: sec.at > towerU ? Math.PI : 0, riser: dh * lvl }];
    posns.forEach(p => {
      const sg = gunhouse(S, R2, sec.cal || 0.15, sec.barrels || 3, p.riser, mats);
      sg.position.set((sec.at - 0.5) * L, p.y, p.z);
      sg.rotation.y = p.rot;
      g.add(tag(sg, 'turret', 'Secondary battery'));
    });
  });
  buildAA(S, g, { tierTop, tierHalf, dh }, mats);
  buildAALight(S, g, { tierTop, tierHalf, dh }, mats);
  group.add(tag(g, 'superstructure'));
}

/* ── THE HIGH-ANGLE BATTERY ─────────────────────────────────────────────────────────────
 * Twin heavy AA mounts along the upper citadel edge, mirrored port and starboard, from the
 * record: `aa: [{at: …}, …]`, one entry per side-pair. Open mounts — a platform, a pedestal,
 * a shield block and two barrels ELEVATED, because the elevated barrel is the whole legible
 * difference between an AA gun and everything else on deck. */
function buildAA(S, g, T, mats) {
  if (!S.aa || !S.aa.length) return;
  const B = S.beam, L = S.lwl;
  const steel = mats.turretSteel || (mats.turretSteel =
    new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
  const dark = mats.turretDark || (mats.turretDark =
    new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
  S.aa.forEach(m => {
    const cal = m.cal || 0.127;
    const barrelL = cal * (m.calLen || 40);
    for (const sgn of [1, -1]) {
      const z = sgn * (T.tierHalf(m.at, 1) - 2.0);
      const mount = new THREE.Group();
      /* the platform is the sponson the crew stand on */
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.35, 16), dark);
      plat.position.y = 0.175;
      mount.add(tag(plat, 'aa', 'Gun platform'));
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 1.1, 12), dark);
      ped.position.y = 0.9;
      mount.add(ped);
      /* the shield: an open-backed box, face outboard */
      const shield = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 2.0), steel);
      shield.position.y = 2.1;
      mount.add(tag(shield, 'aa', 'High-angle mount'));
      /* twin barrels, elevated — trained outboard like the rest of the ready battery */
      for (const off of [-0.55, 0.55]) {
        const gun = new THREE.Mesh(
          new THREE.CylinderGeometry(cal * 0.55, cal * 0.7, barrelL, 8), dark);
        gun.rotation.x = sgn * (Math.PI / 2 - 0.7);            // 40 degrees up, muzzle outboard
        gun.position.set(off, 2.6 + Math.cos(0.7) * barrelL * 0.30,
                         sgn * Math.sin(0.7) * barrelL * 0.35);
        mount.add(tag(gun, 'aa', 'High-angle gun'));
      }
      mount.position.set((m.at - 0.5) * L, T.tierTop[1], z);
      g.add(tag(mount, 'aa'));
    }
  });
}

/* ── THE LIGHT BATTERY ──────────────────────────────────────────────────────────────────
 * Triple 25 mm automatic mounts along the amidships structure, from the record:
 * `aaLight: [{at}, …]`, one entry per side-pair — the close-in layer under the heavy
 * high-angle guns. The BANDSTAND is the legible fact: each mount stands on a raised drum
 * tub proud of the shelter deck, because an automatic gun needs clear sky over a deck
 * already crowded with the heavy mounts' arcs. Shielded, as the as-completed mounts were;
 * three slim barrels elevated together, which is what tells the eye "automatic" at a
 * distance the barrels themselves cannot be read at. */
function buildAALight(S, g, T, mats) {
  if (!S.aaLight || !S.aaLight.length) return;
  const B = S.beam, L = S.lwl;
  const steel = mats.turretSteel || (mats.turretSteel =
    new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 }));
  const dark = mats.turretDark || (mats.turretDark =
    new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.40 }));
  S.aaLight.forEach(m => {
    for (const sgn of [1, -1]) {
      const mount = new THREE.Group();
      /* the bandstand: support drum rising from the shelter-deck roof, tub lip on top */
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 2.4, 14), dark);
      drum.position.y = 1.0;                        // base sunk 0.2 into the roof plating
      mount.add(tag(drum, 'aaLight', 'Bandstand'));
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 14), dark);
      tub.position.y = 2.4;
      mount.add(tag(tub, 'aaLight', 'Gun tub'));
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.8, 10), dark);
      ped.position.y = 3.0;
      mount.add(ped);
      /* the shield: open-backed, face outboard with the guns */
      const shield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 1.6), steel);
      shield.position.y = 3.9;
      mount.add(tag(shield, 'aaLight', 'Triple 25 mm mount'));
      /* three barrels close abreast, elevated — the automatic-battery signature */
      for (const off of [-0.34, 0, 0.34]) {
        const gun = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.06, 2.1, 6), dark);
        gun.rotation.x = sgn * (Math.PI / 2 - 0.8);   // ~46 degrees up, muzzles outboard
        gun.position.set(off, 4.35 + Math.cos(0.8) * 0.65,
                         sgn * Math.sin(0.8) * 0.85);
        mount.add(tag(gun, 'aaLight', '25 mm gun'));
      }
      mount.position.set((m.at - 0.5) * L, T.tierTop[1],
                         sgn * (T.tierHalf(m.at, 1) - 1.7));
      g.add(tag(mount, 'aaLight'));
    }
  });
}

/* ── THE FLOATPLANE ─────────────────────────────────────────────────────────────────────
 * A catapult observation biplane in real metres — main float bottom on y = 0, nose toward
 * -x, about nine and a half metres of aircraft. Built the way buildAircraft builds the
 * strike fighter: the most legible single facts first. For a floatplane those are the one
 * big CENTRAL FLOAT under a two-bay BIPLANE, the round engine ahead of an open glazed
 * canopy, and the red discs — so all four are geometry. */
function buildFloatplane(fm) {
  const ac = new THREE.Group();
  /* the main float: what makes it a seaplane. Fatter forward, tapering aft */
  const flt = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.30, 6.2, 10), fm.skin);
  flt.rotation.z = Math.PI / 2;
  flt.position.set(-0.6, 0.42, 0);
  ac.add(tag(flt, 'floatplane', 'Main float'));
  for (const sx of [-2.1, 0.6])                     // float struts up to the fuselage
    for (const sz of [-0.28, 0.28]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.35, 6), fm.dark);
      st.position.set(sx, 1.45, sz);
      ac.add(st);
    }
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 6.6, 10), fm.skin);
  fus.rotation.z = Math.PI / 2;
  fus.position.set(0.4, 2.35, 0);
  ac.add(tag(fus, 'floatplane', 'Floatplane'));
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.16, 1.5, 10), fm.skin);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(4.45, 2.35, 0);
  ac.add(tail);
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.0, 12), fm.dark);
  cowl.rotation.z = Math.PI / 2;
  cowl.position.set(-3.3, 2.35, 0);
  ac.add(tag(cowl, 'floatplane', 'Engine cowling'));
  for (const r of [0, Math.PI / 2]) {               // the propeller, stopped on the cross
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.5, 0.28), fm.dark);
    bl.rotation.x = r;
    bl.position.set(-3.9, 2.35, 0);
    ac.add(bl);
  }
  const can = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.75), fm.glass);
  can.position.set(0.3, 2.95, 0);
  ac.add(tag(can, 'floatplane', 'Canopy'));
  const wingLo = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 10.8), fm.skin);
  wingLo.position.set(-0.7, 1.95, 0);
  ac.add(tag(wingLo, 'floatplane', 'Lower wing'));
  const wingHi = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 11.2), fm.skin);
  wingHi.position.set(-1.2, 3.65, 0);
  ac.add(tag(wingHi, 'floatplane', 'Upper wing'));
  for (const s of [-1, 1]) {
    for (const sx of [-1.6, -0.3]) {                // interplane struts, the two-bay pair
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.72, 6), fm.dark);
      st.position.set(sx, 2.8, s * 4.6);
      ac.add(st);
    }
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), fm.dark);
    cb.position.set(-1.0, 3.2, s * 0.6);            // cabane struts at the fuselage
    ac.add(cb);
    const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 1.5, 8), fm.skin);
    tf.rotation.z = Math.PI / 2;
    tf.position.set(0.1, 1.05, s * 4.7);            // wingtip stabilising floats
    ac.add(tag(tf, 'floatplane', 'Wingtip float'));
    const ts = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), fm.dark);
    ts.position.set(0.1, 1.6, s * 4.7);
    ac.add(ts);
    /* the hinomaru: a red disc through the fuselage and one on each upper wing panel —
       the single most identifying mark on the aircraft, so it is geometry, not paint */
    const wd = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), fm.red);
    wd.position.set(-1.2, 3.65, s * 3.4);
    ac.add(wd);
  }
  const fd = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.10, 16), fm.red);
  fd.rotation.x = Math.PI / 2;
  fd.position.set(1.6, 2.4, 0);
  ac.add(fd);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 0.10), fm.skin);
  fin.position.set(4.6, 3.35, 0);
  ac.add(tag(fin, 'floatplane', 'Fin'));
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.10, 3.4), fm.skin);
  stab.position.set(4.4, 2.6, 0);
  ac.add(stab);
  return ac;
}

/* ── THE STERN AVIATION DECK ────────────────────────────────────────────────────────────
 * A battleship's quarterdeck aft of the last turret was not spare space: it was her airfield.
 * Two trainable catapults at the deck edge, port and starboard, angled outboard so the
 * launch clears the stern — and the crane right aft, because a floatplane lands on the SEA
 * and has to be lifted back aboard. From the record: `catapults: {at, lenM}`, `sternCrane`.
 * The carrier draws her own catapults; this is the QUARTERDECK kind, on the sheer. */
function buildSternAviation(S, group) {
  if (!S.catapults) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const dark = new THREE.MeshStandardMaterial({ color: 0x4b5157, roughness: 0.58, metalness: 0.25 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x5c6167, roughness: 0.62, metalness: 0.35 });
  const u = S.catapults.at || 0.92;
  const len = S.catapults.lenM || B * 0.5;
  const deckY = H.sheer(u);
  const half = Math.abs(surfacePoint(S, H, u, 1.0)[2]);
  let portCat = null;
  for (const sgn of [1, -1]) {
    const g = new THREE.Group();
    /* the turntable pedestal the beam trains on */
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.0, 14), dark);
    ped.position.y = 0.5;
    g.add(tag(ped, 'catapult', 'Catapult turntable'));
    /* the launch beam: a box girder with the trolley rail proud on top */
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 1.4), steel);
    beam.position.y = 1.45;
    g.add(tag(beam, 'catapult'));
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.18, 0.5), dark);
    rail.position.y = 1.99;
    g.add(tag(rail, 'catapult', 'Launch rail'));
    g.position.set((u - 0.5) * L, deckY, sgn * (half - 2.6));
    g.rotation.y = -sgn * 0.6;                    // trained outboard-aft, a V opening astern
    group.add(tag(g, 'catapult'));
    if (sgn === 1) portCat = g;
  }
  if (S.sternCrane) {
    const g = new THREE.Group();
    const uC = Math.min(0.985, u + len * 0.75 / L);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 9.0, 12), dark);
    post.position.y = 4.5;
    g.add(tag(post, 'catapult', 'Crane post'));
    const jibL = len * 0.65;
    const jib = new THREE.Mesh(new THREE.BoxGeometry(jibL, 0.6, 0.6), steel);
    /* raked up and aft over the stern, where the aircraft it recovers is */
    jib.position.set(Math.cos(0.6) * jibL / 2, 9.0 + Math.sin(0.6) * jibL / 2, 0);
    jib.rotation.z = 0.6;
    g.add(tag(jib, 'catapult', 'Aircraft crane'));
    g.position.set((uC - 0.5) * L, H.sheer(uC), 0);
    group.add(tag(g, 'catapult'));
  }
  /* ── THE AIRCRAFT THEMSELVES, from the record: `floatplanes: N` ──────────────────────
     One rides the port catapult, nose at the launch end — built INSIDE the catapult group
     so plane and beam train together and cannot come apart, the lateen's lesson. The rest
     park on the centreline forward of the catapults, seated on the deck's own camber. */
  if (S.floatplanes) {
    const fm = {
      skin:  new THREE.MeshStandardMaterial({ color: 0x82877e, roughness: 0.85, metalness: 0.08 }),
      dark:  new THREE.MeshStandardMaterial({ color: 0x2f3438, roughness: 0.70, metalness: 0.20 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 }),
      red:   new THREE.MeshStandardMaterial({ color: 0x9c2f28, roughness: 0.60, metalness: 0.05 }),
    };
    if (portCat) {
      const p0 = buildFloatplane(fm);
      p0.position.y = 2.08;                       // float on the launch rail
      p0.rotation.y = Math.PI;                    // nose at the outboard-aft launch end
      portCat.add(tag(p0, 'floatplane'));
    }
    for (let i = portCat ? 1 : 0; i < S.floatplanes; i++) {
      const p = buildFloatplane(fm);
      const uP = u - 0.045 - 0.042 * (i - 1);
      const bC = Math.abs(surfacePoint(S, H, uP, 1.0)[2]);
      p.position.set((uP - 0.5) * L, H.sheer(uP) + bC * 0.035, 0);
      p.rotation.y = (i % 2 ? -1 : 1) * 0.28;     // pushed about by hand, not ruled lines
      group.add(tag(p, 'floatplane'));
    }
  }
}

/* ── THE STOWAGE HATCHES ────────────────────────────────────────────────────────────────
 * On a big-gun ship the quarterdeck gear lives BELOW the deck: main-battery muzzle blast
 * would wreck an open boat or a parked aircraft, so boats and floatplanes stow under
 * armoured covers and come up to the crane through these. From the record:
 * `deckHatches: [{at, z, lenM, widM}]`, z a signed fraction of the half-breadth at the
 * station. Seated on the deck's own camber — the same cosine buildDeckGeometry draws — so
 * a hatch amidships cannot float over the crown nor sink at the deck edge. */
function buildDeckHatches(S, group) {
  if (!S.deckHatches || !S.deckHatches.length) return;
  const H = hullSurface(S);
  const L = S.lwl;
  const dark = new THREE.MeshStandardMaterial({ color: 0x3f444a, roughness: 0.66, metalness: 0.25 });
  const cover = new THREE.MeshStandardMaterial({ color: 0x565c61, roughness: 0.72, metalness: 0.22 });
  S.deckHatches.forEach(hc => {
    const u = hc.at, b = Math.abs(surfacePoint(S, H, u, 1.0)[2]);
    const zP = (hc.z || 0) * b;
    const camber = Math.cos((zP / b) * Math.PI / 2) * b * 0.035;
    const g = new THREE.Group();
    const coam = new THREE.Mesh(new THREE.BoxGeometry(hc.lenM, 0.55, hc.widM), dark);
    coam.position.y = 0.12;                       // base sunk through the camber it spans
    g.add(tag(coam, 'hatch', 'Hatch coaming'));
    const lid = new THREE.Mesh(new THREE.BoxGeometry(hc.lenM * 0.96, 0.16, hc.widM * 0.92), cover);
    lid.position.y = 0.47;
    g.add(tag(lid, 'hatch', 'Hatch cover'));
    for (let s = 1; s <= 2; s++) {                // the cover is sections; the seams say so
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, hc.widM * 0.92), dark);
      strip.position.set((s / 3 - 0.5) * hc.lenM * 0.96, 0.57, 0);
      g.add(strip);
    }
    g.position.set((u - 0.5) * L, H.sheer(u) + camber, zP);
    group.add(tag(g, 'hatch'));
  });
}

/* ── THE TORPEDO NET DEFENCE ───────────────────────────────────────────────────────────
 * `netDefence` on the record hangs the anti-torpedo outfit on the hull side: a shelf along
 * the plating with the steel-wire net rolled on it, and the 40 ft booms (Torpedo net,
 * Wikipedia: 12 m spars, pinned at or below the main-deck edge, swung against the ship at
 * sea) stowed in the row of down-aft diagonals that is the most conspicuous thing in
 * photograph H61017. Everything is pinned to surfacePoint at its own station and height, so
 * the row follows the hull's taper toward the ends instead of standing off it.
 * One derivation — netDefenceGeom — for this builder and for the audit rule. */
function netDefenceGeom(S) {
  if (!S.netDefence) return null;
  const nd = S.netDefence;
  const u0 = nd.from !== undefined ? nd.from : 0.28;
  const u1 = nd.to !== undefined ? nd.to : 0.92;
  const boomM = 12.2;                          // the record's 40 ft spar
  const slant = 14 * Math.PI / 180;            // stowed droop below horizontal, H61017
  const du = boomM * Math.cos(slant) / S.lwl;  // fore-aft run of a stowed boom
  const drop = boomM * Math.sin(slant);        // how far the tip hangs below the heel
  const shelfY = hullSurface(S).sheer(0.5) * 0.58;  // the shelf line, ~main-deck edge
  const lastHeel = u1 - du;                    // every tip stays on the run
  const n = Math.max(3, Math.round((lastHeel - u0) * S.lwl / 8.3) + 1);
  const heels = [];
  for (let i = 0; i < n; i++) heels.push(u0 + (lastHeel - u0) * i / (n - 1));
  return { u0, u1, boomM, du, drop, shelfY, heels };
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
  for (const sgn of [1, -1]) {
    /* the shelf: a chain of plates riding the hull's own curve, each aligned to the local
       tangent and overlapped 6% so the chain closes over it */
    const NSEG = 18;
    for (let i = 0; i < NSEG; i++) {
      const ua = sA + (sB - sA) * i / NSEG, ub = sA + (sB - sA) * (i + 1) / NSEG;
      const a = sideAt(ua, G.shelfY), b = sideAt(ub, G.shelfY);
      const dx = b[0] - a[0], dz = sgn * (b[2] - a[2]);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(Math.hypot(dx, dz) * 1.06, 0.09, 0.55), shelfMat);
      plate.position.set((a[0] + b[0]) / 2, G.shelfY, sgn * ((a[2] + b[2]) / 2 + 0.22));
      plate.rotation.y = Math.atan2(-dz, dx);
      group.add(tag(plate, 'net', 'Net shelf'));
    }
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
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.34), steel);
      hinge.position.copy(A);
      group.add(tag(hinge, 'net', 'Boom hinge'));
    }
  }
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

function buildContainers(S, group, coarse) {
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const TEU_L = 12.19, TEU_W = 2.44, TEU_H = 2.59;      // the 40-ft box, in metres
  const pal = [0xb0442e, 0x2f5f86, 0x8a8f93, 0x3f7a55, 0xa8792c, 0x6a4a72];
  const mats = pal.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.74, metalness: 0.14 }));
  const box = new THREE.BoxGeometry(TEU_L * 0.97, TEU_H * 0.95, TEU_W * 0.94);
  const stack = new THREE.Group();

  /* ── ⚠ THE STOW WAS A RECTANGULAR BLOCK, AND MEANT NOT TO BE ──────────────────────────
     `high = 5 + ((bay * 3) % 3)` is always 5, because three times anything is divisible by
     three. The comment beside it said "stows are not level; they never are" and the code made
     one perfectly level slab, 245 m long and 5 boxes high, everywhere. Nobody would read that
     as a ship.
     A real stow has a shape, and the shape has reasons:
       * it is highest a little abaft amidships and steps DOWN toward the bow, because the
         forward stack takes the weather and because trim wants the weight aft of the middle;
       * the outboard columns are lower than the centre — SOLAS requires a line of sight from
         the bridge to the water no more than two ship-lengths ahead, and that sightline is
         bought by cutting the wings down;
       * the bays are separated by hatch covers and every third one by a lashing bridge, so
         the deck is not one continuous mass;
       * a bay is 40 ft or two of 20 ft, and the 20 ft bays are visibly shorter.
     None of that is decoration. Each line is a constraint the real stow is solving. */
  /* ── ⚠ AND THE DECK NARROWS, WHICH THE CARGO DID NOT ─────────────────────────────────
     Found by the spin survey, from every bow bearing: the stow, the hatch covers and the
     forecastle were all one constant width on a hull whose deck tapers to a stem. At bay 0
     the deck is 35 m across and the hatch cover was 53, so the cover and the outer four
     columns of boxes stood over open water — white plates hanging in the air past the ship's
     side. Same class as "a deckhouse is not a box" (round 22), recurring in the cargo system:
     EVERYTHING THAT STANDS ON THE DECK FOLLOWS THE DECK'S OWN PLAN. One derivation of the
     edge, read by every part that stands on it. */
  const deckHalfAt = x => {
    const u = Math.max(0.001, Math.min(0.999, 0.5 + x / L));
    return Math.abs(surfacePoint(S, H, u, 1.0)[2]);
  };
  const deckY = H.sheer(0.5);

  /* ── THE LAYOUT IS SET BY THE HOUSE ──────────────────────────────────────────────────
     The accommodation stands over the engine, right aft, so nothing blocks the crane runs;
     the stow fills every bay of deck around it. Its stations are fixed here, first, and the
     bays are laid around them — the reverse order is how a 30 m gap of bare deck opened
     between the last bay and the house. */
  const DK = 2.9;                                       // one deck of the house, in metres
  const N_DECKS = 8;                                    // cabin decks under the wheelhouse
  const accX = L * 0.345, accL = L * 0.050, accW = B * 0.70;
  const casL = L * 0.042, casW = B * 0.34;
  const casX = accX + accL / 2 + casL / 2;              // the engine casing abuts the house

  const hatch = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.85, metalness: 0.2 });
  const lash = new THREE.MeshStandardMaterial({ color: 0x6d7176, roughness: 0.7, metalness: 0.45 });
  const pitch = TEU_L * 1.06;
  const lashM = B * 0.02;                               // lashings and the walkway at the edge
  /* a bay exists wherever six columns fit and the house does not stand */
  const bays = [];
  for (let x = -L * 0.44 + pitch / 2; x + pitch / 2 < L * 0.48; x += pitch) {
    const half = Math.min(B * 0.43, deckHalfAt(x - pitch / 2), deckHalfAt(x + pitch / 2)) - lashM;
    const nc = Math.floor((half * 2) / (TEU_W * 1.02));
    if (nc < 6) continue;                               // forward of this is forecastle deck
    if (x + pitch / 2 > accX - accL / 2 - 3 && x - pitch / 2 < casX + casL / 2 + 3) continue;
    bays.push([x, nc]);
  }
  const foreBays = bays.filter(b => b[0] < accX).length;
  bays.forEach(([x, nc], i) => {
    /* the profile: 4 high at the bow rising to 8 a little abaft amidships, easing toward the
       house; the bays abaft the funnel sit lower. ⚠ The peak is CAPPED BY THE BRIDGE — the
       wheelhouse floor is above the tallest stack forward of it, because a bridge that cannot
       see over its own cargo is not a bridge. That is the constraint the audit now asserts. */
    const t = i / Math.max(1, foreBays - 1);
    const centreHigh = x > accX ? 5
                     : Math.max(3, Math.round(4 + 4 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.68)));
    const stowHalf = nc * TEU_W * 1.02 / 2;
    /* the bay stands on the deck AT ITS OWN STATION — the bow sheer lifts the foredeck
       1.4 m above amidships, and a stow based on the amidships height was buried in it */
    const bayY = Math.max(H.sheer(Math.max(0.001, 0.5 + (x - pitch / 2) / L)),
                          H.sheer(Math.min(0.999, 0.5 + (x + pitch / 2) / L)));
    /* the hatch cover under the bay, sized to the bay it serves */
    const hc = new THREE.Mesh(
      new THREE.BoxGeometry(TEU_L * 1.00, TEU_H * 0.22, stowHalf * 2 + 1.0), hatch);
    hc.position.set(x, bayY + TEU_H * 0.11, 0);
    stack.add(hc);
    const highAt = c => {
      /* the wings come down: full height on the centreline, two tiers less at the rail */
      const wing = Math.abs(c - (nc - 1) / 2) / ((nc - 1) / 2 || 1);
      return Math.max(2, Math.round(centreHigh - wing * wing * 2.6));
    };
    if (coarse) {
      /* ── ⚠ THE MAP HAD NO CONTAINERS AT ALL, AND A CONTAINER SHIP IS HER CARGO ────────
         buildContainers was gated on FINE, so the Sea view — which builds the coarse hull —
         drew a 400 m box boat as a bare black hull. The deck cargo IS the silhouette of that
         ship; without it there is nothing to recognise, which is exactly what August saw
         looking down at one.
         Drawing two thousand individual boxes per hull on a map carrying a whole era's fleet
         is not the answer either. At map scale a single container is far below a pixel, and
         what actually reads is the STEPPED PROFILE — the stow rising from the bow, the wings
         coming down at the rail. So the coarse build emits one box per TIER spanning the
         columns that reach it: the same silhouette, the same colours, about a tenth of the
         meshes. */
      for (let hI = 0; hI < centreHigh; hI++) {
        let n = 0;
        for (let c = 0; c < nc; c++) if (highAt(c) > hI) n++;
        if (!n) continue;
        const w = n * TEU_W * 1.02;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(TEU_L * 0.97, TEU_H * 0.95, w),
          mats[(i * 7 + hI * 3) % mats.length]);
        m.position.set(x, bayY + TEU_H * (0.22 + hI + 0.5), 0);
        stack.add(m);
      }
    } else {
      for (let c = 0; c < nc; c++) {
        const high = highAt(c);
        for (let h = 0; h < high; h++) {
          const m = new THREE.Mesh(box, mats[(i * 7 + c * 3 + h) % mats.length]);
          m.position.set(x, bayY + TEU_H * (0.22 + h + 0.5),
                         (c - (nc - 1) / 2) * TEU_W * 1.02);
          stack.add(m);
        }
      }
    }
    /* a lashing bridge every third bay, two tiers high, spanning its own bay */
    if (i % 3 === 2 && x < accX) {
      const lb = new THREE.Mesh(
        new THREE.BoxGeometry(TEU_L * 0.10, TEU_H * 2.1, stowHalf * 2 + 1.2), lash);
      lb.position.set(x + TEU_L * 0.55, bayY + TEU_H * 1.3, 0);
      stack.add(lb);
    }
  });
  group.add(tag(stack, 'container'));

  /* ── AND THE BOW OF A MOTOR SHIP IS A BULB ────────────────────────────────────────────
     A displacement hull driven at a fixed speed makes a bow wave, and the bow wave is most of
     the resistance. The bulb makes a second wave a little ahead of it, out of phase, and the
     two partly cancel — worth several per cent of fuel on a hull that burns a hundred tonnes
     a day, which is why every ship of this kind built since the 1960s has one. It is the
     single feature that most says "modern" about a profile, and it was missing. */
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x8d2f26, roughness: 0.7, metalness: 0.2 });
  const bulbR = S.beam * 0.115;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbR, 18, 12), bulbMat);
  bulb.scale.set(2.5, 1.0, 1.0);
  /* ⚠ NOTHING HANGS BELOW THE BASELINE — she has to sit on docking blocks, and they take her
     weight on the keel. At -draught·0.62 this bulb's underside was 0.97 m below the keel
     (r33 measurement), which no ship ever built could dock with. The bulb rides as deep as
     it can while its underside fairs to the baseline. */
  bulb.position.set(-L * 0.495, Math.max(-S.draught * 0.62, bulbR - S.draught), 0);
  group.add(tag(bulb, 'bulb'));

  /* the forecastle: mooring gear, windlass and the break of the deck, right forward.
     ⚠ It was 36.8 m wide on a foredeck 24 m across, and centred on the AMIDSHIPS deck height
     while the bow sheer had lifted the deck 1.7 m above that — a box overhanging both sides
     and sunk in the deck at once. Width and height both come from its own station now. */
  const steelPale = new THREE.MeshStandardMaterial({ color: 0xc8c4bb, roughness: 0.62 });
  const fcX = -L * 0.46;
  const fcY = H.sheer(Math.max(0.001, 0.5 + fcX / L));
  const fcHalf = Math.min(deckHalfAt(fcX - L * 0.022), deckHalfAt(fcX + L * 0.022)) - B * 0.012;
  const fc = new THREE.Mesh(new THREE.BoxGeometry(L * 0.044, TEU_H * 1.1, fcHalf * 2), steelPale);
  fc.position.set(fcX, fcY + TEU_H * 0.55, 0);
  group.add(tag(fc, 'forecast'));
  /* the foremast on it — navigation lights and the lookout's mast, the only thing standing
     forward of the stow */
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6, metalness: 0.25 });
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 12, 8), white);
  fm.position.set(fcX, fcY + TEU_H * 1.1 + 6, 0);
  group.add(tag(fm, 'mast', 'Foremast'));

  /* ── THE ACCOMMODATION IS A TOWER THE CREW LIVE IN, WITH THE WHEELHOUSE ON TOP ───────
     It was one blank white box with a dark lid, and — measured against her own stow — the lid
     stood 18 m above the deck while the boxes amidships reached 21: THE BRIDGE COULD NOT SEE
     OVER THE CARGO, which is the one constraint the card text states ("the bridge has to see
     over a stack that may be twelve high"). So the tower's height is not styling: eight cabin
     decks put the wheelhouse floor above the tallest stack, and the audit asserts it. Each
     cabin deck shows as a row of lights — more wall than glass, the round-22 lesson — and the
     bridge wings run out to the ship's own side, because a berthing officer needs to see the
     hull touch the quay. */
  const hs = deckY;
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });
  const houseG = new THREE.Group();
  const blockH = N_DECKS * DK;
  const blk = new THREE.Mesh(new THREE.BoxGeometry(accL, blockH, accW), white);
  blk.position.set(accX, hs + blockH / 2, 0);
  houseG.add(blk);
  /* the window bands, fore and aft faces, one per cabin deck; deck 0 is stores and stays
     blank steel. Shared geometries — one band and one mullion, positioned many times. */
  const bandG = new THREE.BoxGeometry(0.28, DK * 0.30, accW * 0.86);
  const mullG = new THREE.BoxGeometry(0.34, DK * 0.32, 0.42);
  const nMull = Math.round(accW * 0.86 / 2.3);
  for (let d = 1; d < N_DECKS; d++) {
    const wy = hs + d * DK + DK * 0.62;
    for (const side of [-1, 1]) {
      const fx = accX + side * accL / 2;
      const band = new THREE.Mesh(bandG, glassM);
      band.position.set(fx, wy, 0);
      houseG.add(band);
      for (let m = 0; m <= nMull; m++) {
        const mull = new THREE.Mesh(mullG, white);
        mull.position.set(fx, wy, -accW * 0.43 + (m / nMull) * accW * 0.86);
        houseG.add(mull);
      }
    }
  }
  /* the stair towers, a glazed strip down each side wall */
  const stairG = new THREE.BoxGeometry(2.2, blockH * 0.82, 0.28);
  for (const side of [-1, 1]) {
    const st = new THREE.Mesh(stairG, glassM);
    st.position.set(accX - accL * 0.28, hs + blockH * 0.47, side * accW / 2);
    houseG.add(st);
  }
  /* the wheelhouse, and the wings out to the ship's side */
  const whH = DK * 1.15, whY = hs + blockH;
  const wh = new THREE.Mesh(new THREE.BoxGeometry(accL * 0.80, whH, accW), white);
  wh.position.set(accX, whY + whH / 2, 0);
  houseG.add(wh);
  const whGlass = new THREE.Mesh(new THREE.BoxGeometry(0.28, whH * 0.44, accW * 0.92), glassM);
  whGlass.position.set(accX - accL * 0.40, whY + whH * 0.60, 0);
  houseG.add(whGlass);
  const nWm = Math.round(accW * 0.92 / 1.7);
  for (let m = 0; m <= nWm; m++) {
    const mull = new THREE.Mesh(mullG, white);
    mull.position.set(accX - accL * 0.40, whY + whH * 0.60, -accW * 0.46 + (m / nWm) * accW * 0.92);
    houseG.add(mull);
  }
  const wingSpan = B * 1.05;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(accL * 0.34, 0.4, wingSpan), white);
  wing.position.set(accX - accL * 0.23, whY + 0.2, 0);
  houseG.add(wing);
  /* the wing screens — the glass windbreak at each tip — and the struts that carry the
     cantilever back to the house wall: a wing on nothing is the lid fault over again */
  for (const side of [-1, 1]) {
    const scr = new THREE.Mesh(new THREE.BoxGeometry(accL * 0.30, 1.15, 0.25), glassM);
    scr.position.set(accX - accL * 0.23, whY + 1.0, side * (wingSpan / 2 - 0.3));
    houseG.add(scr);
    const run = wingSpan / 2 - accW / 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, Math.hypot(run, DK) * 1.02, 6), white);
    strut.position.set(accX - accL * 0.23, whY - DK / 2, side * (accW / 2 + run / 2));
    strut.rotation.x = side * Math.atan2(run, DK);
    houseG.add(strut);
  }
  group.add(tag(houseG, 'bridge'));
  /* the radar mast on the wheelhouse roof: the pole, the two radar bars turning above
     everything, and a signal yard */
  const mastG = new THREE.Group();
  const mastX = accX + accL * 0.10, mastB = whY + whH;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 8, 8), white);
  pole.position.set(mastX, mastB + 4, 0);
  mastG.add(pole);
  const barG = new THREE.BoxGeometry(0.35, 0.28, 3.6);
  const bar1 = new THREE.Mesh(barG, dark); bar1.position.set(mastX, mastB + 8.2, 0); mastG.add(bar1);
  const bar2 = new THREE.Mesh(barG, dark); bar2.position.set(mastX, mastB + 6.4, 0);
  bar2.rotation.y = 0.6; mastG.add(bar2);
  const yardM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7, 6), white);
  yardM.rotation.x = Math.PI / 2;
  yardM.position.set(mastX, mastB + 5.2, 0);
  mastG.add(yardM);
  group.add(tag(mastG, 'mast', 'Radar mast'));
  /* the lifeboats, one each side in davits at the second cabin deck — the orange capsule is
     the most recognisable safety fitting on any modern ship */
  const boatM = new THREE.MeshStandardMaterial({ color: 0xcc5a24, roughness: 0.5 });
  for (const side of [-1, 1]) {
    const bG = new THREE.Group();
    const by = hs + DK * 2.2, bz = side * (accW / 2 + 1.35);
    const boat = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 6.2, 4, 10), boatM);
    boat.rotation.z = Math.PI / 2;
    boat.position.set(accX + accL * 0.06, by, bz);
    bG.add(boat);
    for (const dx of [-2.6, 2.6]) {
      const dav = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), white);
      dav.position.set(accX + accL * 0.06 + dx, by + 1.7, side * (accW / 2 + 0.65));
      dav.rotation.x = side * 0.38;
      bG.add(dav);
    }
    group.add(tag(bG, 'boat', 'Lifeboat'));
  }

  /* ⚠ THE FUNNEL WAS TWICE AS WIDE AS IT WAS TALL — 15.9 m across against 8.3 m high, which
     is a squat block, not a funnel. Found by the axis sweep, not by eye: nothing about this
     ship's profile made it obvious, and it had been shipping that way since the box boat was
     built. A funnel is an UPTAKE: it exists to carry exhaust clear of the accommodation and
     the deck, so it is always taller than it is broad. */
  /* ── ⚠ AND IT WAS STANDING ON NOTHING ────────────────────────────────────────────────
     The survey found this funnel seventeen metres from the nearest part of the ship, its base
     forty-seven metres up, hanging abaft the deckhouse over open deck. A funnel is the top of
     an UPTAKE: it rises out of the engine casing, which is the after part of the accommodation
     block, and the whole column is continuous from the engine room to the sky. Build the casing
     and the funnel has something to stand on — which is also why a real one sits where it does. */
  const casH = DK * 4;
  const casing = new THREE.Mesh(new THREE.BoxGeometry(casL, casH, casW), white);
  casing.position.set(casX, hs + casH / 2, 0);
  group.add(tag(casing, 'bridge'));
  const fnG = new THREE.Group();
  const fnH = 13;
  const fn = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.6, fnH, 20), dark);
  fn.scale.x = 1.6;
  fn.position.set(casX, hs + casH + fnH / 2 - 1, 0);
  fn.rotation.z = -0.05;                                // raked, the way an uptake leans aft
  fnG.add(fn);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.9, 20), lash);
  cap.scale.x = 1.6;
  cap.position.set(casX + 0.6, hs + casH + fnH - 1.2, 0);
  cap.rotation.z = -0.05;
  fnG.add(cap);
  for (const dz of [-1.0, 1.0]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 8), dark);
    pipe.position.set(casX + 0.7, hs + casH + fnH - 0.4, dz);
    fnG.add(pipe);
  }
  group.add(tag(fnG, 'funnel', 'Funnel',
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
  /* ⚠ THE BEAKHEAD DIED WITH THE WOODEN HULL — and it was BORN with the galleon. The old
     gate (any wooden bowsprit) hung a head on the carrack, the caravel, the corbita and a
     1909 schooner, none of which carried one; whether a ship has a head is a fact of the
     record, so it is DATA: `head: 1` is knee, one pair of rails and the gammoning (a
     clipper's light head); `head: 2` adds the second rail pair, the head timbers and the
     platform (the man-of-war's working beakhead). No field, no head.
     ⚠ And the first drawing of it was the fault the survey caught from every bearing: a
     platform BOX floating in air beside the stem, rails that ended short of everything.
     Every part here now takes both its ends from geometry that exists — the stem's own
     profile, the bowsprit's own line, the rail curves themselves — so nothing CAN float. */
  S.__catheads = null;
  if (!S.bowsprit || S.iron) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;

  /* ── CATHEADS, for every frame-built wooden hull with a bowsprit ──────────────────────
     Catting the anchor is medieval; the beakhead is not. The carrack and caravel keep
     their bare stems and still get the beam their anchor hangs from. The tips are stashed
     on the spec (the __spars pattern) so buildAnchor hangs from the SAME point this drew. */
  if (S.build === 'frame') {
    const uc = 0.105;
    const pd = surfacePoint(S, H, uc, 1.0);
    const blen = B * 0.26, sq = B * 0.042, ang = 0.70;   // 40° forward of athwart
    S.__catheads = [];
    for (const sgn of [-1, 1]) {
      const cg = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.BoxGeometry(sq, sq, blen), mats.woodDark);
      beam.position.z = blen / 2;
      cg.add(beam);
      /* the supporting knee, from the topside up to the beam's underside */
      const kn = new THREE.Mesh(new THREE.BoxGeometry(sq * 0.7, B * 0.06, sq * 0.7), mats.woodDark);
      kn.position.set(0, -B * 0.038, blen * 0.30);
      cg.add(kn);
      cg.position.set(pd[0], pd[1] + B * 0.012, sgn * pd[2] * 0.55);
      cg.rotation.y = sgn > 0 ? -ang : Math.PI + ang;    // outboard and forward, both sides
      cg.rotation.x = -sgn * 0.06;                       // a slight up-cant at the tip
      group.add(tag(cg, 'cathead'));
      /* the tip, measured through the SAME transform the beam gets — a parallel formula
         here is the drift bug this project keeps rediscovering */
      const tip = new THREE.Vector3(0, 0, blen).applyEuler(cg.rotation).add(cg.position);
      S.__catheads.push({ x: tip.x, y: tip.y, z: tip.z });
    }
  }

  const grade = S.head || 0;
  if (!grade) return;
  const g = new THREE.Group();

  /* the bowsprit's own line, the same numbers buildRig used to place the spar */
  const x0 = -L / 2 + H.rake(0.02);
  const y0 = H.sheer(0.02);
  const steeve = (S.steeve || 22) * Math.PI / 180;
  const spritY = x => y0 + Math.tan(steeve) * (x0 - x);

  /* ── THE KNEE OF THE HEAD ─────────────────────────────────────────────────────────────
     The curved timber on the stem's forward face that carries the whole head. Its back
     edge is SAMPLED off the stem (surfacePoint at u→0), its top stands just clear beneath
     the bowsprit's own line — so it grows out of the hull and stops under the spar by
     construction, at any rake and any steeve the data declares. */
  const stemEdge = v => surfacePoint(S, H, 0.004, v);
  const base = stemEdge(0.66);                          // just above the waterline
  const top = stemEdge(1.0);                            // the stem head at the deck
  /* the head PROJECTS — a 74's beak stands metres beyond the rabbet, and the first cut of
     this builder put the nose 1.2 m out and the whole structure vanished against the bow */
  const kneeX = top[0] - L * (grade >= 2 ? 0.050 : 0.034);
  const kneeTopY = spritY(kneeX) - B * 0.020;
  const shape = new THREE.Shape();
  shape.moveTo(base[0], base[1]);
  for (const v of [0.75, 0.85, 0.93, 1.0]) {
    const p = stemEdge(v);
    shape.lineTo(p[0], p[1]);
  }
  shape.lineTo(top[0] - L * 0.004, kneeTopY);           // up the stem head to the slot
  shape.lineTo(kneeX, kneeTopY);                        // the flat the gammoning grips
  shape.quadraticCurveTo(kneeX - L * 0.014, kneeTopY - B * 0.10,
                         base[0] - L * 0.012, base[1] + B * 0.04);
  shape.quadraticCurveTo(base[0] - L * 0.004, base[1] + B * 0.01, base[0], base[1]);
  const kneeTh = B * 0.035;
  /* pale, deliberately — the cutwater against the dark wale is how the bow profile reads */
  const knee = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: kneeTh, bevelEnabled: false }), mats.woodPale);
  knee.position.z = -kneeTh / 2;
  g.add(knee);

  /* ── THE HEADRAILS ────────────────────────────────────────────────────────────────────
     Aft end planted ON the skin, forward end landed ON the knee just drawn — the two
     objects the old rails floated between. The droop in the middle is the S the real
     rails carry. The curves are kept; everything else in the head is indexed off them. */
  const railR = B * 0.013;
  const rails = [];                                     // [side][pair] -> curve
  const pairs = grade >= 2 ? 2 : 1;
  for (const sgn of [-1, 1]) {
    const side = [];
    for (let r = 0; r < pairs; r++) {
      const aftU = r === 0 ? 0.085 : 0.050;
      const aftV = r === 0 ? 0.96 : 0.86;
      const dropY = r === 0 ? 0.04 : 0.05;
      const a = surfacePoint(S, H, aftU, aftV);
      const land = new THREE.Vector3(kneeX + L * 0.006, kneeTopY - B * (0.030 + r * 0.095),
                                     sgn * (kneeTh / 2 + railR * 0.4));
      const p0 = new THREE.Vector3(a[0], a[1], sgn * (a[2] + railR * 0.4));
      const mid1 = new THREE.Vector3(
        p0.x + (land.x - p0.x) * 0.38, p0.y + (land.y - p0.y) * 0.30 - B * dropY,
        sgn * ((a[2] + railR * 0.4) * 0.62 + Math.abs(land.z) * 0.38));
      const mid2 = new THREE.Vector3(
        p0.x + (land.x - p0.x) * 0.74, p0.y + (land.y - p0.y) * 0.72 - B * dropY * 0.5,
        sgn * ((a[2] + railR * 0.4) * 0.24 + Math.abs(land.z) * 0.76));
      const curve = new THREE.CatmullRomCurve3([p0, mid1, mid2, land]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, railR, 6, false), mats.woodPale));
      side.push(curve);
    }
    rails.push(side);
  }

  if (grade >= 2) {
    /* timbers and platform live FORWARD OF THE STEM — placed by asking the rail curve
       itself where it passes the stem head, so nothing lands on the bow planking. The
       first cut spaced them by blind fractions and laid planks through the bulwark. */
    let fStem = 0.5;
    for (let i = 0; i <= 40; i++)
      if (rails[0][0].getPoint(i / 40).x < top[0]) { fStem = i / 40; break; }
    /* head timbers: the verticals joining upper rail to lower, ends taken from the rail
       curves themselves so they cannot miss */
    for (let k = 0; k < 3; k++) {
      const f = fStem + (0.92 - fStem) * (0.18 + k * 0.32);
      for (const side of rails) {
        const a = side[0].getPoint(f), b = side[1].getPoint(f);
        const d = b.clone().sub(a);
        const t = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.009, B * 0.009, d.length(), 6), mats.woodPale);
        t.position.copy(a).addScaledVector(d, 0.5);
        t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        g.add(t);
      }
    }
    /* the platform: gratings laid athwart between the upper rails — a working deck, the
       crew's heads, spanning rail to rail rather than floating beside the stem */
    for (let k = 0; k < 4; k++) {
      const f = fStem + (0.90 - fStem) * (0.12 + k * 0.25);
      const pp = rails[0][0].getPoint(f), ps = rails[1][0].getPoint(f);
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(L * 0.014, B * 0.010, Math.abs(pp.z - ps.z) * 0.98 + B * 0.02),
        mats.woodPale);
      plank.position.set((pp.x + ps.x) / 2, (pp.y + ps.y) / 2 - railR * 0.8, (pp.z + ps.z) / 2);
      g.add(plank);
    }
  }

  /* ── THE GAMMONING ────────────────────────────────────────────────────────────────────
     Rope, not timber — the turns that lash the bowsprit down onto the knee against the
     lift of every forestay. Wound as a helix around the spar's own line and the knee top
     it grips, three visible turns. */
  const gx = top[0] - L * 0.012;                        // the slot, just clear of the stem head
  const gy = spritY(gx) + B * 0.032;                    // over the spar's own line there
  const gBot = kneeTopY - B * 0.13;                     // under the knee's gripping flat
  const cy = (gy + gBot) / 2, semiY = (gy - gBot) / 2, semiZ = B * 0.030;
  const gpts = [];
  const TURNS = 3, SEG = 22;
  for (let i = 0; i <= TURNS * SEG; i++) {
    const t = (i / SEG) * Math.PI * 2;
    gpts.push(new THREE.Vector3(
      gx - B * 0.022 + (i / (TURNS * SEG)) * B * 0.055,
      cy + semiY * Math.cos(t), semiZ * Math.sin(t)));
  }
  g.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gpts), TURNS * SEG, B * 0.008, 5, false),
    mats.ropeSolid));

  group.add(tag(g, 'head'));
}

function buildStern(S, group, mats) {
  /* ⚠ THE FURNITURE WAS BURIED INSIDE THE SHIP SHE WAS BUILT FOR. The old fitted plate was
     sampled at u = 0.985 — and once the counter flare carried the SKIN to u = 1.0, the plate,
     the five lights keyed to its bounding box and the gallery barrels all stood a half-metre
     INSIDE the hull. From dead astern (the r58 `#z=`/`#y=` captures, the first ever taken)
     the 74 showed a bare planked wall: no lights, no galleries, no taffrail, and two barrel
     ends poking out at the quarters. The hull's own end cap — shader-planked, seamed, painted
     — IS the transom face now, and everything here is placed off surfacePoint(u = 1), the one
     function that owns the stern: no plate, no second parametrisation, nothing to drift. */
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const g = new THREE.Group();
  const fb = H.sheer(1.0);
  /* the aft face: x is constant over height at u = 1, half-breadth is not */
  const xF = surfacePoint(S, H, 1.0, 1.0)[0];
  const atH = zH => surfacePoint(S, H, 1.0, 0.62 + 0.38 * Math.max(0, Math.min(1, zH / fb)));
  const halfAt = zH => atH(zH)[2];
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1d2a2b, roughness: 0.18, metalness: 0.42 });

  /* ── STERN LIGHTS — rows of glazed cabin windows across the face ─────────────────────
     Whether a ship carried them is a fact of the record, so it is DATA (`sternLights`, the
     `head:` idiom): the 74 and the Indiaman show two tiers, the fluyt's narrow tuck one; a
     cog, a 1501 nau, a clipper's counter and Wyoming's flat schooner transom show none.
     Each row sits at its own height with its own width, because the counter flares as it
     rises — the rows read the trapezoid off the surface instead of sharing one width. */
  const rows = S.sternLights || 0;
  const rowZ = [];
  for (let r = 0; r < rows; r++)
    rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));
  const wh = fb * 0.16;                                  // one row of glazing, framed
  for (const zc of rowZ) {
    const hw = halfAt(zc) * 0.84;
    const N = Math.max(3, Math.min(7, Math.round((2 * hw) / (B * 0.095))));
    const pitch = (2 * hw) / N, ww = pitch * 0.64;
    for (let i = 0; i < N; i++) {
      const zi = -hw + pitch * (i + 0.5);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(B * 0.012, wh, ww), mats.woodPale);
      fr.position.set(xF + B * 0.006, zc, zi);
      g.add(tag(fr, 'sternlight'));
      const gl = new THREE.Mesh(
        new THREE.BoxGeometry(B * 0.012, wh - B * 0.016, ww - B * 0.014), glass);
      gl.position.set(xF + B * 0.007, zc, zi);
      g.add(tag(gl, 'sternlight'));
      const mu = new THREE.Mesh(
        new THREE.BoxGeometry(B * 0.013, wh - B * 0.016, B * 0.006), mats.woodPale);
      mu.position.set(xF + B * 0.0075, zc, zi);
      g.add(tag(mu, 'sternlight'));
    }
    /* the mouldings that band the stern above and below each tier — the horizontal lines
       every stern drawing shows. Tagged as the transom: they are its structure, and they
       keep the stage card reachable now that the face itself is the hull's own cap. */
    for (const zm of [zc - wh * 0.80, zc + wh * 0.80]) {
      const w2 = halfAt(zm) * 0.94;
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.008, B * 0.008, w2 * 2, 6), mats.woodDark);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(xF + B * 0.004, zm, 0);
      g.add(tag(rail, 'transom'));
    }
  }

  /* ── THE TAFFRAIL — the crown rail across the top of the stern ───────────────────────
     It rises toward the centre, because the real rail followed the poop's crown, and it is
     what stops the stern reading as a wall that simply runs out of planks at the sheer. */
  if (rows || S.gunDecks) {
    const halfT = halfAt(fb) * 0.97;
    const hR = B * 0.055;
    const arc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xF, fb + hR, -halfT),
      new THREE.Vector3(xF, fb + hR * 1.35, 0),
      new THREE.Vector3(xF, fb + hR, halfT)]);
    g.add(tag(new THREE.Mesh(
      new THREE.TubeGeometry(arc, 16, B * 0.011, 6, false), mats.woodDark), 'taffrail'));
    const NB = 5;
    for (let i = 0; i < NB; i++) {
      const p = arc.getPoint(i / (NB - 1));
      const h = p.y - fb;
      const bal = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.005, B * 0.005, h, 5), mats.woodPale);
      bal.position.set(xF, fb + h / 2, p.z);
      g.add(tag(bal, 'taffrail'));
    }
  }

  /* ── QUARTER GALLERIES — the officers' bays wrapped round the after corners ──────────
     A drum lofted AROUND the corner line the stern face and the topside share, so every
     edge of it lies on the surface by construction: at each height the corner is sampled
     off surfacePoint and the bay swells aft-and-outboard from it, nothing at the bottom
     (the finial drop every drawing shows), full at the top, capped with its own cornice.
     Storeys follow the stern-light tiers, because the galleries were the same cabins
     carried round the corner — their panes sit at the SAME heights as the rows. */
  if (S.gunDecks) {
    const zG0 = fb * 0.30, zG1 = fb * (rows >= 2 ? 0.88 : 0.62);
    const NZ = 8, NA = 5, rMax = B * 0.052;
    const rAt = zH => {
      const t = (zH - zG0) / (zG1 - zG0);
      return rMax * Math.pow(Math.min(1, t / 0.30), 0.8);
    };
    for (const sgn of [-1, 1]) {
      const gp = [], gi = [];
      for (let j = 0; j <= NZ; j++) {
        const zH = zG0 + (zG1 - zG0) * (j / NZ);
        const c = atH(zH);
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
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
      gg.setIndex(gi); gg.computeVertexNormals();
      const bay = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({
        color: 0x9c8259, roughness: 0.68, side: THREE.DoubleSide }));
      g.add(tag(bay, 'gallery'));
      /* the cornice closing the drum's top */
      const cT = atH(zG1);
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(rMax * 1.12, rMax * 1.12, B * 0.012, 10), mats.woodDark);
      lid.position.set(xF, zG1 + B * 0.006, sgn * cT[2] * 0.995);
      g.add(tag(lid, 'gallery'));
      /* panes at the tier heights, looking out over the quarter */
      for (const zc of (rowZ.length ? rowZ : [(zG0 + zG1) / 2])) {
        if (zc < zG0 + wh * 0.5 || zc > zG1 - wh * 0.4) continue;
        const c = atH(zc), r = rAt(zc);
        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(B * 0.010, wh * 0.8, B * 0.045), glass);
        pane.position.set(xF + (r + B * 0.004) * Math.SQRT1_2,
                          zc, sgn * (c[2] * 0.995 + (r + B * 0.004) * Math.SQRT1_2));
        pane.rotation.y = -sgn * Math.PI / 4;
        g.add(tag(pane, 'gallery'));
      }
    }
  }
  group.add(g);
}


/* ── THE ENDS OF A BULKHEAD HULL ARE BULKHEADS ─────────────────────────────────────────
 * A junk does not converge to a stem and a sternpost: the hull is built bulkhead-first and
 * the outermost bulkheads ARE the ends, planked straight across. The model gave every hull
 * the European backbone, so a ship whose own stage card teaches bulkhead-first construction
 * wore a stem — the one member her tradition exists to do without — and ran out past it to
 * an open, uncapped shell end. Both caps are lofted from the hull's own end sections
 * (measure the surface, never run a parallel formula — the failure mode this project keeps
 * rediscovering), so they meet the planking exactly at any fineness the data declares.
 */
function buildJunkEnds(S, group) {
  const H = hullSurface(S);
  const L = S.lwl;
  const plank = new THREE.MeshStandardMaterial({
    color: 0x4a3620, roughness: 0.88, side: THREE.DoubleSide });
  for (const bow of [true, false]) {
    const u0 = bow ? 0.002 : 0.998;
    const pos = [], idx = [];
    const NV = 16, NW = 8;
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const p = surfacePoint(S, H, u0, v);
      /* a slight outward lip at the centreline so the cap reads as planked proud of the
         shell rather than flush with the cut */
      const lip = (bow ? -1 : 1) * L * 0.004;
      for (let i = 0; i <= NW; i++) {
        const t = (i / NW) * 2 - 1;
        pos.push(p[0] + (1 - Math.abs(t)) * lip, p[1], t * p[2] * 0.996);
      }
    }
    for (let j = 0; j < NV; j++)
      for (let i = 0; i < NW; i++) {
        const a = j * (NW + 1) + i;
        idx.push(a, a + NW + 1, a + 1, a + 1, a + NW + 1, a + NW + 2);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    group.add(tag(new THREE.Mesh(g, plank), bow ? 'bowtransom' : 'sterntransom'));
  }
}


/* ── THE AFT CASTLE ────────────────────────────────────────────────────────────────────
 * The tiered quarters over a junk's after deck, from the record's own pictures: every Ming
 * illustration and every reconstruction of the treasure ships shows the stern built up in
 * stepped timber tiers, because the ship was an embassy and the embassy lived aft. Declared
 * in the data as `poop: [from, to, tiers]`; the walls follow the hull's own half-breadth
 * and sheer (the buildRaisedEnds idiom — a wall lofted off the real surface cannot
 * overhang), each tier steps inboard of the one below, and each carries its roof out past
 * its walls, which is the one line of the silhouette that says China rather than Europe.
 */
function buildJunkCastle(S, group) {
  if (!(S.poop && S.poop.length === 3)) return;
  const [pA, pB, tiers] = S.poop;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const dh = B * 0.115;                               // one deck of headroom per tier
  const wall = new THREE.MeshStandardMaterial({
    color: 0x6a4d28, roughness: 0.82, side: THREE.DoubleSide });
  const roofM = new THREE.MeshStandardMaterial({
    color: 0x35281a, roughness: 0.90, side: THREE.DoubleSide });
  const lattice = new THREE.MeshStandardMaterial({ color: 0x271c10, roughness: 0.94 });
  const g = new THREE.Group();
  for (let t = 0; t < tiers; t++) {
    const u0 = pA + 0.030 * t, u1 = pB - 0.012 * t;
    const inset = B * (0.030 + 0.055 * t);
    const half = u => Math.max(B * 0.10,
      Math.abs(surfacePoint(S, H, Math.max(0.001, Math.min(0.999, u)), 1.0)[2]) - inset);
    const y0 = u => H.sheer(u) + dh * t, y1 = u => H.sheer(u) + dh * (t + 1);
    const N = Math.max(8, Math.round((u1 - u0) * L / 1.8));
    /* the perimeter, wound once round: starboard fwd→aft, port aft→fwd, closed */
    const path = [];
    for (let k = 0; k <= N; k++) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L + H.rake(u), z: half(u) }); }
    for (let k = N; k >= 0; k--) { const u = u0 + (u1 - u0) * k / N; path.push({ u, x: (u - 0.5) * L + H.rake(u), z: -half(u) }); }
    path.push(path[0]);
    const tp = [], ti = [];
    for (const p of path)
      tp.push(p.x, y0(p.u) - dh * 0.10, p.z, p.x, y1(p.u), p.z);
    for (let k = 0; k + 1 < path.length; k++) {
      const a = k * 2, b = a + 2;
      ti.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    wg.setIndex(ti); wg.computeVertexNormals();
    g.add(new THREE.Mesh(wg, wall));
    /* the roof, lofted from the same stations and carried OUT past the walls */
    const ov = B * 0.045;
    const rp = [], ri = [];
    for (let k = 0; k <= N; k++) {
      const u = u0 + (u1 - u0) * k / N;
      const ext = (k === 0 ? -1 : k === N ? 1 : 0) * L * 0.006;
      rp.push((u - 0.5) * L + H.rake(u) + ext, y1(u) + dh * 0.02, -(half(u) + ov),
              (u - 0.5) * L + H.rake(u) + ext, y1(u) + dh * 0.02, (half(u) + ov));
    }
    for (let k = 0; k < N; k++) { const a = k * 2, b = a + 2; ri.push(a, b, a + 1, a + 1, b, b + 1); }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rg.setIndex(ri); rg.computeVertexNormals();
    g.add(new THREE.Mesh(rg, roofM));
    /* lattice openings down each side — the thing that says QUARTERS rather than crate.
       Placed at their own stations off the same half-breadth the wall stands on, so they
       sit in the wall's face by construction. */
    const K = Math.max(2, Math.round((u1 - u0) * L / 3.2));
    for (let k = 1; k < K; k++) {
      const u = u0 + (u1 - u0) * (k / K);
      for (const sgn of [-1, 1]) {
        const w = new THREE.Mesh(
          new THREE.BoxGeometry(L * 0.012, dh * 0.44, B * 0.006), lattice);
        w.position.set((u - 0.5) * L + H.rake(u),
                       (y0(u) + y1(u)) / 2 + dh * 0.06, sgn * half(u));
        g.add(w);
      }
    }
  }
  group.add(tag(g, 'poop'));
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
function buildAnchor(S, group, mats) {
  if (!S.bowsprit) return;
  const mat = mats.iron || mats.woodDark;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  /* ⚠ AN ANCHOR DOES NOT SCALE WITH THE SHIP. ~1/8 of the hull is right for the wooden
     sizes the rule was calibrated on — a 74's best bower shank runs about 5.5 m on a 53 m
     hull — but iron hulls kept growing and forged anchors did not: Titanic's centre anchor,
     the largest ever hand-forged, is 5.7 m OVER ALL on 269 m of ship. Linear scaling hung a
     10.6 m anchor on the 92 m steamer and a 17 m one on Preussen, laid across the whole
     forecastle. So the shank grows with the hull up to the size a forge can make, then
     nearly stops. */
  const shank = Math.min(L, 48) * 0.115 + Math.max(0, L - 48) * 0.004;
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

    /* ── CATTED MEANS HUNG FROM THE CATHEAD ─────────────────────────────────────────────
       The survey saw the old placement from every bearing: an anchor GLUED flat across the
       gunports, ring in the air, hanging from nothing — the funnel-attached-to-nothing
       class. Where buildHead drew catheads it stashed their measured tips; the ring now
       hangs a cable's width below the tip, the shank drops clear of the planking, and the
       cat pendant is drawn from tip to ring so the eye can see what carries the weight. */
    const cat = S.__catheads && S.__catheads[sgn > 0 ? 1 : 0];
    if (cat) {
      /* CATTED AND FISHED, not dangling: hung vertically a 74's 5.5 m anchor puts its
         flukes in the sea — the real stow is the ring at the cathead and the shank fished
         aft-down along the topside until the flukes rest at the fore channel. Ring end and
         fluke end are both computed onto real geometry: the measured cathead tip, and the
         skin at the station one shank-length abaft it. */
      const ring = new THREE.Vector3(cat.x, cat.y - B * 0.035, cat.z);
      const uT = Math.min(0.32, 0.105 + (shank * 1.05) / L);
      /* the fluke end rides just under the rail — the shank LIES ALONG the sheer. Dropped
         to a fixed height it fought the rising bow line and read twice as steep as it was. */
      const fb = H.sheer(uT);
      const vT = Math.max(0.70, Math.min(0.95,
        0.62 + 0.38 * ((ring.y - B * 0.10) / Math.max(0.01, fb))));
      const tpv = surfacePoint(S, H, uT, vT);
      const tp = new THREE.Vector3(tpv[0], tpv[1], sgn * (tpv[2] + B * 0.030));
      const d = tp.clone().sub(ring).normalize();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
      /* roll the crown fork toward the hull's plane — un-rolled it stands VERTICAL, one
         fluke diving three metres down across the gunports and one spiking over the rail */
      g.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), sgn * 1.25));
      g.position.copy(ring).addScaledVector(d, shank * 0.52);
      const pend = ropeMesh([[new THREE.Vector3(cat.x, cat.y, cat.z), ring]],
                            0.018 + B * 0.0006, mats.ropeSolid || mat);
      if (pend) group.add(tag(pend, 'anchor', 'Cat pendant'));
      group.add(tag(g, 'anchor'));
      continue;
    }
    /* no cathead drawn (iron bows, the shell-built corbita): stowed against the bow */
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
    /* ── ⚠ THE PADDLE BOX FACED INWARD, WHICH IS TO SAY IT WAS NOT THERE ─────────────────
       The box was a hand-wound triangle strip, and every face of it pointed at the wheel.
       computeVertexNormals derives normals FROM the winding, so normals and winding agreed —
       the round-35 winding audit saw nothing — while under FrontSide the largest object on
       the ship's side was culled from every bearing: twelve bearings of survey showed a naked
       wheel with eleven ribs floating in the air beside it, and nobody could say from the
       picture WHY there was no box. A surface's facing is a render fact, so the audit now
       asks it with rays (`you can see through the paddle box`).

       And the strip was the wrong OBJECT — the A11 lesson again. A paddle box is not a band
       hung over a wheel: it is a closed drum SPRUNG FROM THE SPONSON — a circular segment,
       chord down, standing on the platform at deck level, shut by a face at each end. The
       band's ends hung at axle height, two and a half metres below the deck with nothing
       under them. Built from the chord, the parts cannot come apart: the platform spans the
       chord because the chord is where the box stops. */
    const bw = B * 0.42;                              // housing width athwartships
    const boxRx = D * 0.60, boxRy = D * 0.60 * 0.86;  // the crown, slightly flattened
    const h0 = Math.min(Math.max(H.sheer(u) - axleY, boxRy * 0.12), boxRy * 0.55);
    const th0 = Math.asin(h0 / boxRy);                // where the arc springs from the deck
    const xc = boxRx * Math.cos(th0);                 // half the chord
    const spon = new THREE.Mesh(
      new THREE.BoxGeometry(xc * 2.16, B * 0.055, bw * 1.06), iron);
    spon.position.set(p[0], axleY + h0 - B * 0.0275, sgn * (p[2] + B * 0.16));
    group.add(tag(spon, 'paddle', 'Sponson',
      'The platform bracketed out from the hull side at deck level that carries the wheel\'s shaft bearings and the box above. Everything over it is housing; everything under it is wheel.'));

    /* one group per box, mirrored to port BY ROTATION — the same trap as the winding: a
       negative scale re-hands every triangle it touches, and the port box would face inward
       again. A half-turn about Y moves the geometry without re-handing it. */
    const bg = new THREE.Group();
    bg.position.set(p[0], axleY, sgn * (p[2] + B * 0.16));
    if (sgn < 0) bg.rotation.y = Math.PI;
    const NB = 22, arc = [];
    for (let i = 0; i <= NB; i++) {
      const a = th0 + (Math.PI - 2 * th0) * (i / NB);
      arc.push([Math.cos(a) * boxRx, Math.sin(a) * boxRy]);
    }
    const bp = [], bi = [];
    for (let i = 0; i <= NB; i++)                     // the drum, wound to face OUT
      bp.push(arc[i][0], arc[i][1], -bw / 2, arc[i][0], arc[i][1], bw / 2);
    for (let i = 0; i < NB; i++) {
      const a0 = i * 2;
      bi.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
    }
    for (const side of [1, -1]) {                     // the two faces, shut
      const w = side * bw / 2, c0 = bp.length / 3;
      bp.push(0, (h0 + boxRy) / 2, w);                // a fan about an interior point
      for (const [x, y] of arc) bp.push(x, y, w);
      for (let i = 0; i < NB; i++)
        if (side > 0) bi.push(c0, c0 + 1 + i, c0 + 2 + i);
        else          bi.push(c0, c0 + 2 + i, c0 + 1 + i);
      if (side > 0) bi.push(c0, c0 + 1 + NB, c0 + 1); // the chord edge, shut on the sponson
      else          bi.push(c0, c0 + 1, c0 + 1 + NB);
    }
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bgeo.setIndex(bi); bgeo.computeVertexNormals();
    bg.add(tag(new THREE.Mesh(bgeo, iron), 'paddlebox', 'Paddle box',
      'The housing over the top half of the wheel, sprung from the sponson at deck level. A 17 m wheel throws a sheet of water and coal dirt that would sweep the deck; the box contains it. Being the largest thing on the ship\'s side, it is also what owners decorated.'));
    /* ── THE FAN FACE ──────────────────────────────────────────────────────────────
       The outboard face of a paddle box is the ship's one piece of display, and the pattern
       is almost always RADIAL. It is structural before it is ornamental: the face is a large
       thin panel that has to resist a wheel throwing water at it, and ribs fanning from the
       centre are the cheapest way to stiffen a half-round. The fan roots at the BASE of the
       face rather than the axle — the axle is below the deck, and the panel being stiffened
       stops at the chord. */
    for (let i = 0; i <= 10; i++) {
      const b = Math.PI * (i / 10);
      const A = Math.pow(Math.cos(b) / boxRx, 2) + Math.pow(Math.sin(b) / boxRy, 2);
      const B2 = 2 * h0 * Math.sin(b) / (boxRy * boxRy);
      const C = (h0 * h0) / (boxRy * boxRy) - 1;
      const t = (-B2 + Math.sqrt(B2 * B2 - 4 * A * C)) / (2 * A);  // chord centre → arc
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(D * 0.020, t * 0.92, B * 0.030), mats.woodPale || iron);
      rib.position.set(Math.cos(b) * t * 0.5, h0 + Math.sin(b) * t * 0.5, bw / 2 + B * 0.014);
      rib.rotation.z = b - Math.PI / 2;
      bg.add(tag(rib, 'paddlebox', 'Paddle-box rib',
        'The face fans from its base because it must: a large thin panel taking the water a wheel throws at it is stiffened most cheaply by ribs running out from the centre. That it also looks well is why owners lettered and gilded it.'));
    }
    /* the vent slats, raised louvres on the drum itself */
    for (let i = 1; i < 7; i++) {
      const a = th0 + (Math.PI - 2 * th0) * (i / 7);
      const sl = new THREE.Mesh(new THREE.BoxGeometry(D * 0.035, B * 0.012, bw * 0.96), iron);
      sl.position.set(Math.cos(a) * boxRx * 1.004, Math.sin(a) * boxRy * 1.004, 0);
      sl.rotation.z = a;
      bg.add(tag(sl, 'paddlebox', 'Paddle-box vent',
        'Slatted so the wheel does not compress the air in its own housing at every revolution.'));
    }
    group.add(bg);
  }
}

/* ── assembly ──────────────────────────────────────────────────────────────────────── */

function buildShip(S, opts) {
  const FINE = !!(opts && opts.fine);
  /* the canvas STATE: set (under way) or furled (stowed on the spars). A view's choice,
     not a fact of the ship, so it arrives as an option — the record owns what canvas she
     carries, the caller owns whether she is shown wearing it. */
  const FURLED = !!(opts && opts.furled);
  const group = new THREE.Group();

  const sun = new THREE.Vector3(0.5, 0.72, 0.42).normalize();
  /* ── THE DRESS IS A DATE ─────────────────────────────────────────────────────────────
     The restored plating pass painted one Victorian scheme fleet-wide — salmon antifouling,
     gilt cove line, riveted lands — on ships from 1858 to 2017. Each of those is a dated
     technology: mercuric/arsenical "pink" compositions give way to oxide red-browns around
     1890; riveting gives way to all-welded construction around 1950; the gilt cove line is a
     documented per-ship fact (Olympic-class carried one, no warship did), so it is a data
     field, not a rule. S.year is the year the hull is DEPICTED at, set in vessels.json. */
  const yearBuilt = S.year || 0;
  const WELDED = !!S.iron && yearBuilt >= 1950;
  const bottom = new THREE.Color();
  if (S.bottom) bottom.set(S.bottom);                       // per-ship record (Yamato's IJN hull-red)
  else if (yearBuilt >= 1955) bottom.setRGB(0.42, 0.13, 0.10);  // modern oxide red
  else if (yearBuilt >= 1890) bottom.setRGB(0.36, 0.12, 0.09);  // early-composition red-brown
  else bottom.setRGB(0.86, 0.55, 0.47);                     // Victorian salmon — the Great Eastern model
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
      uWeld: { value: WELDED ? 1 : 0 },
      uBottom: { value: bottom },
      uCove: { value: S.cove ? 1 : 0 },
      uBoot: { value: new THREE.Color(S.boot || '#ffffff') },
      uBootOn: { value: S.boot ? 1 : 0 },
      uTime: { value: 0 },
    },
  });

  /* ── THE SHIP IS ASSEMBLED IN THE ORDER IT WAS BUILT ─────────────────────────────────
     Keel, then frames, then planking. They are all generated from the same surfacePoint(),
     so the ribs sit inside the skin and the backbone under it without a single fudge factor.
     The Shipwright hides and shows these by their tagged stage. */
  /* ── ⚠ THE FITTINGS FOLLOW THE BUILD ─────────────────────────────────────────────────
     Found on the carrier, from her stern quarter: every hull was getting the timber-era
     fittings — brown backbone, timber rail and transom, and a barn-door rudder hung on the
     sternpost, standing 17 m past a nuclear carrier's stern and 4 m out of the water. The
     baseline bearing hides the stern, so the frame ratchet sat green throughout. The stage
     card has said "STEEL: FRAMES, THEN WELDED PLATE" all along; the geometry now listens. */
  const STEEL = S.build === 'steel' || S.build === 'iron';
  const timber = STEEL
    ? new THREE.MeshStandardMaterial({ color: 0x3d4147, roughness: 0.52, metalness: 0.55 })
    : new THREE.MeshStandardMaterial({ color: 0x6b5334, roughness: 0.86 });
  group.add(tag(new THREE.Mesh(buildKeelGeometry(S), timber), 'keel'));
  if (FINE) {
    /* every frame its own object, so one rib can be picked out of the skeleton */
    for (let f = 0; f < 30; f++)
      group.add(tag(new THREE.Mesh(buildFramesGeometry(S, 1, 0.055 + f / 29 * 0.89), timber),
                    'frames', 'Frame ' + (f + 1) + ' of 30'));
    /* ⚠ A BULKHEAD-BUILT HULL HAS NO STEM AND NO STERNPOST — the outermost bulkheads are
       the ends, planked across. Giving a junk the European backbone contradicted the stage
       card standing right under her: "bulkheads, then planking". */
    if (S.build === 'bulkhead') {
      buildJunkEnds(S, group);
    } else {
      group.add(tag(new THREE.Mesh(buildStemGeometry(S, false), timber), 'stempost', 'Stem'));
      group.add(tag(new THREE.Mesh(buildStemGeometry(S, true), timber), 'stempost', 'Sternpost'));
    }
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

  /* the weather deck keys off what the DECK was, not what the hull was: liners and
     battleships stayed planked to the end — Titanic's teak, Yamato's hinoki — but a flight
     deck and a container ship's weather deck are bare steel. ⚠ And the covering is a fact
     of the SHIP, not of two cargo types: the round-35 winding fix lit the decks properly
     for the first time and exposed a planked timber deck on the 2026 composite USV, which
     the heuristic below had been guessing at invisibly. `deckSteel` in the record overrides
     the guess. */
  const steelDeck = STEEL && (S.deckSteel !== undefined ? S.deckSteel
                                                        : (S.flightDeck || S.containers));
  const deckMat = steelDeck
    ? new THREE.MeshStandardMaterial({ color: 0x494e54, roughness: 0.85, metalness: 0.25,
                                       side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ color: 0xa08a66, roughness: 0.80,
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
       of about a hundred years. (The old unlit LineBasicMaterial `rope` is gone: every line
       aboard is now prism geometry in this one material, and takes the light.) */
    ropeSolid: new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 0.88 }),
  };
  const sails = buildRig(S, group, mats, FINE, FURLED);
  if (FINE) {
    buildGuns(S, group, mats.iron || mats.woodDark);
    if (S.__spars && S.__spars.length)
      buildRigging(S, group, mats, S.__spars, S.__mastTops || []);
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
  /* ⚠ AND A BATTLESHIP HAS NO DECKHOUSE EITHER — the same class of fault as the carrier's:
     the liner builder gave Yamato four white window-banded passenger tiers over 80% of her
     length, and the main battery was buried inside them. A turreted ship gets the citadel. */
  if (FINE && !S.flightDeck && !S.turrets) buildSuperstructure(S, group);
  if (FINE && S.cluster) buildCluster(S, group);
  if (FINE && !S.flightDeck && !S.turrets) buildRaisedEnds(S, group);
  if (FINE) buildJunkCastle(S, group);
  if (FINE && S.turrets) buildCitadel(S, group, mats);
  if (FINE) buildSternAviation(S, group);
  if (FINE) buildDeckHatches(S, group);
  if (FINE) buildHead(S, group, mats);
  if (FINE) buildAnchor(S, group, mats);
  if (FINE && S.netDefence) buildNetDefence(S, group);
  if (FINE) buildOars(S, group, mats.woodPale);
  if (FINE) buildPaddles(S, group, mats);
  if (FINE) buildScrews(S, group);
  /* the transom is now continuous with the hull because the hull FLARES to meet it — see the
     counter in surfacePoint. Three earlier attempts failed by sizing the plate; none of them
     could work, because the ship had no broad stern for a plate to sit on. */
  /* ⚠ AND A STEEL SHIP'S TRANSOM IS HER OWN SHELL PLATING, NOT A FITTED PANEL. The plate was
     a MeshStandardMaterial in scene light — full-lit pale grey against the shader-lit hull,
     no plating, no boot-top, corners standing past the skin — the stern-quarter read carried
     in HANDOFF since round 27. The hull mesh already closes its ends with a cap drawn by the
     hull shader; now that the skin flares with the counter, that cap IS the transom, in the
     ship's own paint above the boot-top and antifouling below it. Timber ships keep the
     fitted plate: theirs really was a separate structure, with lights and galleries in it. */
  if (FINE && S.transom && S.build !== 'steel' && S.build !== 'iron')
    buildStern(S, group, mats);
  if (S.containers) buildContainers(S, group, !FINE);   /* the map needs her cargo too */
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
  group.userData = { hullMat, sails, spec: S, furled: FURLED,
                     rigTop: bb.max.y, keelBottom: bb.min.y,
                     extentX: bb.max.x - bb.min.x,     // a lateen yard overhangs the stem
                     /* ── THE FLOAT DATUM IS A CONSTRUCTION FACT, NOT A MEASUREMENT ──────
                        surfacePoint puts the load waterline at local y = 0 (v = 0.62 → z = 0)
                        and bottoms the skin at exactly -draught; measured r33, the skin error
                        is 0.000 on all 25 hulls. Float her by putting THIS at the mean water
                        plane. keelBottom + draught is NOT the waterline: the Box3 floor is
                        the keel timber, the screw or the bulb — appendages below the baseline
                        — and it overstated the float by 0.03–0.97 m fleet-wide, which is the
                        "2 m of antifouling in the air" of rounds 31–32. If the parametrisation
                        ever moves the waterline off y = 0, change it HERE and nowhere else. */
                     waterlineY: 0 };
  return group;
}

window.SHIPS_HULL = { PARTS, buildKeelGeometry, buildFramesGeometry, buildShip, buildHullGeometry, hullSurface, exponentForCm,
                      superellipseFullness, surfacePoint, landingStrip, linerHouse, netDefenceGeom };
