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
    const base = S.freeboard + rise * Math.pow(s, 2.8);
    /* ── STERN TERRACES (sternSteps, from the record) ─────────────────────────────────
       A terraced stern descends in DECKS, not in a swept sheer: each recorded span holds
       its own deck height, and the drop between spans is a vertical break the mesh gives
       an edge to (snap stations, hullStations below). The record measures the bulwark CAP
       line the silhouette shows (topM, drawn by buildSternTerraces); deckM is the derived
       floor behind it. A span without deckM — the main aft deck — keeps the hull's own
       sheer. Record-gated: no sternSteps, byte-identical. */
    if (S.sternSteps)
      for (const st of S.sternSteps.steps)
        if (u >= st.u[0] && u <= st.u[1] && st.deckM !== undefined)
          return Math.min(base, st.deckM);
    return base;
  };
  /* the bulwark cap line over a terraced stern: the height the broadside actually reads.
     Raked linearly across each span, because the plate reads every cap sweeping down
     toward its own break. null anywhere the record has no terrace. */
  const stepTop = u => {
    if (!S.sternSteps) return null;
    for (const st of S.sternSteps.steps)
      if (u >= st.u[0] && u <= st.u[1]) {
        const t = (u - st.u[0]) / (st.u[1] - st.u[0]);
        return st.topM[0] + (st.topM[1] - st.topM[0]) * t;
      }
    return null;
  };
  /* tumblehome grows above the waterline; quoted as the fraction of half-beam lost at deck */
  const tumble = u => S.tumblehome * fullness(u, 1.4, 0.55, 0.7);

  /* ── THE RECORD'S LOA OWNS THE OVERHANG (round 129) ─────────────────────────────────
     The loft granted stemRake·loa + sternRake·loa of overhang ON TOP of the lwl, and
     nothing checked the sum against the record's LENGTH OVERALL: 21 of 33 hulls drew
     past their own cards — Yamato +6.1 m, the clipper +4.6 (the r113/r115/r128 class;
     fleet table in build/measure-fleet-loa-r129-before.txt). The rakes are the SHAPE of
     the overhang; loa − lwl is its SIZE, and the record owns it. One scale on both ends
     preserves the authored stem:stern ratio; at 1 nothing moves, and a record whose loa
     stands beyond lwl + rakes (wyoming, preussen) is untouched — under-length is a
     record-semantics question, not a clamp. */
  const rakeAllow = ((S.stemRake || 0) + (S.sternRake || 0)) * S.loa;
  const rakeScale = rakeAllow > 0
    ? Math.min(1, Math.max(0, S.loa - S.lwl) / rakeAllow) : 1;

  /* the profile of the stem and the sternpost, as an x-offset that rakes the ends */
  const rake = u => {
    if (u < S.forefoot) {
      const k = (S.forefoot - u) / S.forefoot;
      return -S.stemRake * rakeScale * k * k * S.loa;
    }
    if (u > 1 - S.run) {
      const k = (u - (1 - S.run)) / S.run;
      return S.sternRake * rakeScale * k * k * S.loa;
    }
    return 0;
  };

  return { nExp, halfB, wl, keel, sheer, tumble, rake, stepTop };
}

/* ── THE STATION LIST, WITH SNAP PAIRS AT EVERY TERRACE BREAK ─────────────────────────
 * A height that lives on a vertex cannot have an edge (the snapBand lesson, round 92, now
 * in its third guise): uniform stations put a terrace break inside a 1.5 m quad and the
 * deck INTERPOLATES the drop into a ramp. A pair of stations 4 mm apart at each break
 * gives the drop a quad too narrow to smear, so the step lands vertical at its recorded u
 * on any tessellation. Hulls without sternSteps get the same uniform list as before. */
function hullStations(S, NU) {
  const us = [];
  for (let i = 0; i <= NU; i++) us.push(i / NU);
  if (S.sternSteps) {
    const E = 1e-5;
    for (const st of S.sternSteps.steps) {
      const b = st.u[0];
      if (b > 0 && b < 1) us.push(b - E, b + E);
    }
    us.sort((a, b) => a - b);
  }
  return us;
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
    /* ⚠ THE BAR MUST FIT INSIDE THE ENTRY IT STRENGTHENS. A fixed siding of 5.5% of beam
       is wider than a fine bow's own half-breadth over most of the stem's run, so on Azzam
       (stemFineness 0.03) the dark bar broke through the white shell and read as an arc of
       z-fighting speckle down her stem in the first true broadside. And clamping to the
       breadth AT THE PROFILE POINT is not enough: the bar stands aft of the leading edge,
       where an acute entry is still only centimetres wide, so each FACE of the section is
       sized from the shell at its own x — half the local breadth, never the full siding —
       and the bar becomes the wedge the plating actually closes over. A timber stem stands
       proud by design and keeps its constant siding. */
    let sF = sided, sA = sided;
    if (STEEL) {
      const vv = Math.max(0, Math.min(1, v));
      /* the x-offsets are already signed (aft insets run forward), so u follows x directly */
      const bF = Math.abs(surfacePoint(S, H,
        Math.max(0, Math.min(1, u + (x0 - p[0]) / S.lwl)), vv)[2]);
      const bA = Math.abs(surfacePoint(S, H,
        Math.max(0, Math.min(1, u + (x1 - p[0]) / S.lwl)), vv)[2]);
      sF = Math.min(sided, Math.max(0.015, bF * 0.5));
      sA = Math.min(sided, Math.max(0.015, bA * 0.5));
    }
    pos.push(x0, p[1], -sF, x0, p[1], sF,
             x1, p[1], sA,  x1, p[1], -sA);
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

/* ── STEERING IS A FACT OF THE RECORD (round 121) ─────────────────────────────────────
   The rudder went aboard every hull unconditionally, so the 68,000 BP dugout hung a
   pintled stern rudder her card refuses ("Paddled"), the voyaging canoe carried one on
   EACH hull against her own row — "a long paddle, not a rudder" — and the sewn dhow's
   hung on pintles, which are iron hinges, under a construction row reading "no iron".
   The record now declares the kind — paddle | quarter | median | stern | steel — and
   the build-string guess survives only as the fallback for a record that has not
   declared, which the audit convicts. */
function steeringOf(S) {
  if (S.steering) return S.steering;
  return (S.build === 'steel' || S.build === 'iron') ? 'steel'
       : S.build === 'bulkhead' ? 'median' : 'stern';
}

/* ── A QUARTER RUDDER IS AN OAR GROWN INTO A FITTING ──────────────────────────────────
   One over each quarter, pivoting against the rail, blade standing down beside the run —
   the steering of the whole ancient Mediterranean (the trireme's pair of pēdalia; the
   great quarter rudders the Sidon and Portus reliefs carve on Roman merchantmen) and of
   the sewn Indian Ocean ships, which have no iron to hang a pintle with. No ancient
   steering oar survives to measure, so everything is sized off the hull's own record:
   blade breadth from the draught, the loom from the blade. The loom rakes aft rising, as
   the reliefs draw it, which walks the blade FORWARD along the run as it descends — and
   the run is a widening surface there, so the blade's whole footprint is sampled against
   the skin and the fitting stands just proud of the widest point it spans; a through-beam
   bracket closes the gap back to the rail, which is also what the reliefs show the loom
   working against. One geometry per side: loom, tiller, bracket, blade. */
function buildQuarterRudderGeometry(S, sgn) {
  const H = hullSurface(S);
  const uM = 0.945;                                 // abaft the aftmost tholes, on the quarter
  const pm = surfacePoint(S, H, uM, 1.0);
  const chord = Math.max(0.35, S.draught * 0.38);
  const r = chord * 0.16;
  const rake = 0.22;
  const yHead = pm[1] + Math.max(0.8, pm[1] * 0.55);
  const yHeel = -S.draught * 0.92;
  const yT = 0.12 * pm[1];                          // blade shoulders just above the water
  const xAt = y => pm[0] + rake * (y - pm[1]);
  /* the blade's own u-footprint, sampled against the skin at every height it spans */
  const uOf = x => Math.min(1, Math.max(0.8, x / S.lwl + 0.5));
  const uLo = uOf(xAt(yHeel) - chord * 0.55), uHi = uOf(xAt(yT) + chord * 0.55);
  let zClear = 0;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 8; j++)
    zClear = Math.max(zClear, Math.abs(
      surfacePoint(S, H, uLo + (uHi - uLo) * i / 12, j / 8)[2]));
  const w = chord * 0.05;
  const zP = sgn * Math.max(pm[2] + r * 0.55, zClear + w + r * 0.6);
  const pos = [], idx = [];
  const N = 8;
  /* octagonal rings in the x-z plane (looms) and the x-y plane (the tiller) */
  const ringY = (y, rr) => { const b = pos.length / 3;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2;
      pos.push(xAt(y) + Math.cos(a) * rr, y, zP + Math.sin(a) * rr); }
    return b; };
  const ringZ = (z, rr) => { const b = pos.length / 3;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2;
      pos.push(xAt(yHead) + Math.cos(a) * rr, yHead + Math.sin(a) * rr, z); }
    return b; };
  const tube = (a, b2, flip) => { for (let i = 0; i < N; i++) { const j = (i + 1) % N;
    if (flip) idx.push(a + i, b2 + i, a + j, a + j, b2 + i, b2 + j);
    else      idx.push(a + i, a + j, b2 + i, a + j, b2 + j, b2 + i); } };
  /* the loom, head down to heel; a fan cap each end, single winding (the r118 lesson) */
  const rHead = ringY(yHead, r * 0.85), rHeel = ringY(yHeel + chord * 0.25, r * 0.8);
  tube(rHead, rHeel, false);
  for (let i = 1; i + 1 < N; i++) idx.push(rHead, rHead + i + 1, rHead + i);
  for (let i = 1; i + 1 < N; i++) idx.push(rHeel, rHeel + i, rHeel + i + 1);
  /* the tiller: a bar from the head, inboard, for the helmsman — stopping short of the
     centreline, or the pair meet in the middle and fight through each other */
  const tLen = Math.min(Math.max(0.8, S.beam * 0.22), Math.abs(zP) * 0.8);
  const t0 = ringZ(zP, r * 0.5);
  const t1 = ringZ(zP - sgn * tLen, r * 0.45);
  tube(t0, t1, sgn > 0);
  for (let i = 1; i + 1 < N; i++)
    if (sgn > 0) idx.push(t1, t1 + i + 1, t1 + i);
    else         idx.push(t1, t1 + i, t1 + i + 1);
  /* prisms — the rudder plate's own side-quads-plus-fan-caps pattern, offset by base */
  const prism = (pts, zA, zB) => {
    const b0 = pos.length / 3;
    const lo = Math.min(zA, zB), hi = Math.max(zA, zB);
    pts.forEach(q => pos.push(q[0], q[1], lo, q[0], q[1], hi));
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = b0 + i * 2, b2 = b0 + ((i + 1) % n) * 2;
      idx.push(a, a + 1, b2, b2, a + 1, b2 + 1);
    }
    for (let i = 1; i + 1 < n; i++)
      idx.push(b0, b0 + i * 2, b0 + (i + 1) * 2, b0 + 1, b0 + (i + 1) * 2 + 1, b0 + i * 2 + 1);
  };
  /* the blade: a flat plate carried on the loom's own line, shoulders to heel */
  prism([[xAt(yT), yT],
         [xAt(yT) + chord * 0.50, yT - chord * 0.35],
         [xAt(yHeel) + chord * 0.55, yHeel + chord * 0.30],
         [xAt(yHeel), yHeel],
         [xAt(yHeel) - chord * 0.45, yHeel + chord * 0.30],
         [xAt(yT) - chord * 0.40, yT - chord * 0.35]],
        zP - w, zP + w);
  /* the bracket: a through-beam under the rail cap, hull side out to the loom */
  const yB = pm[1] - 0.10;
  prism([[xAt(yB) - chord * 0.15, yB + chord * 0.11],
         [xAt(yB) + chord * 0.15, yB + chord * 0.11],
         [xAt(yB) + chord * 0.15, yB - chord * 0.11],
         [xAt(yB) - chord * 0.15, yB - chord * 0.11]],
        sgn * (pm[2] - 0.10), zP);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function buildRudderGeometry(S) {
  const H = hullSurface(S);
  const p = surfacePoint(S, H, 1.0, 0);
  const kind = steeringOf(S);
  const STEEL = kind === 'steel';
  /* ⚠ A MOTOR SHIP'S RUDDER IS UNDER THE COUNTER, NOT HUNG PAST THE STERNPOST. The
     stern-hung plate below is a timber shape — pintles down the post, a barn door standing
     proud of the stern. On the carrier it stood 17 m past the transom and 4 m out of the
     water, in timber brown, and no baseline bearing could see it. A steel ship gets a
     balanced foil tucked wholly below the waterline and inside her own length. */
  const BULK = kind === 'median';
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
  /* ── ⚠ A BALANCED RUDDER IS A FOIL (round 153) ──────────────────────────────────────
     A steel ship's rudder is a streamlined body working as a wing in water: round nose,
     thickness peaking near a quarter of the chord, closing to a near-sharp trailing
     edge. The slab it replaces ran full thickness to its trailing edge on every
     steel-steered hull — twelve of them. The loft keeps the plate's own LE/TE lines top
     and bottom, so the bounding box — which the Shipwright's camera fit reads (r152) —
     cannot move by construction. Wholly below the waterline, where postLean is zero by
     construction, so the rows carry no lean term. Emitted as unindexed triangles:
     every arris its own vertices (r146/r147). */
  if (STEEL) {
    const FS = [0.00, 0.03, 0.10, 0.25, 0.45, 0.65, 0.82, 1.00];  // chord stations
    const FF = [0.00, 0.55, 0.85, 1.00, 0.92, 0.72, 0.45, 0.06];  // half-thickness / w
    const rows = [
      { y: top,   xLE: p[0] - chord * 1.6,  xTE: p[0] - chord * 0.6 },
      { y: depth, xLE: p[0] - chord * 1.45, xTE: p[0] - chord * 0.75 },
    ];
    const ring = r => {
      const q = [];
      for (let i = FS.length - 1; i >= 0; i--)                    // TE → nose, −z side
        q.push([r.xLE + FS[i] * (r.xTE - r.xLE), r.y, -FF[i] * w]);
      for (let i = 1; i < FS.length; i++)                         // nose → TE, +z side
        q.push([r.xLE + FS[i] * (r.xTE - r.xLE), r.y,  FF[i] * w]);
      return q;                                                   // closed loop of 15
    };
    const rT = ring(rows[0]), rB = ring(rows[1]), n = rT.length, tri = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri.push(rT[i], rB[i], rB[j], rT[i], rB[j], rT[j]);         // wall, outward
    }
    const cen = r => r.reduce((a, q2) => [a[0] + q2[0] / n, a[1] + q2[1] / n,
                                          a[2] + q2[2] / n], [0, 0, 0]);
    const cT = cen(rT), cB = cen(rB);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tri.push(cT, rT[i], rT[j]);                                 // top cap, +y out
      tri.push(cB, rB[j], rB[i]);                                 // bottom cap, −y out
    }
    const flat = [];
    for (const q of tri) flat.push(q[0], q[1], q[2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
    geo.computeVertexNormals();
    return geo;
  }
  const pos = [], idx = [];
  /* a plate on the sternpost: wider at the foot, raked with the post */
  const pts = BULK
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
     edges would open a wedge of daylight against the post they hang on. (The steel foil
     returned above this: wholly below the waterline, its lean is zero by construction.) */
  /* H.rake(1.0), not sternRake·loa re-derived: since round 129 the loft clamps the rakes
     to the record's loa, and a post re-deriving the raw product would lean past the hull
     it hangs on. One source of truth. */
  const postLean = q => q[1] > 0 ? H.rake(1.0) * Math.min(1, q[1] / H.sheer(1.0)) : 0;
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
  /* ── A STEM IS ROLLED PLATE OR SIDED TIMBER, NOT A MATHEMATICAL EDGE ────────────────
     wl(u) runs to zero at the bow, so a fine entry collapses the two sides of the shell to
     within millimetres of each other over the last several metres: they z-fight as speckle
     from any broadside bearing, and the leading edge falls visibly short of the profile,
     leaving the dark post to fill the wedge — Azzam's stem arc, found by hiding parts one
     at a time. A real bow CLOSES: the shell lands on the stem's own siding — the rabbet —
     so the surface carries a minimum half-breadth there, decaying inboard, sized from the
     same 5.5%-of-beam siding the posts and keel already use. Timber posts stand proud of
     this and cover the landing exactly as before; the steel post now hides inside a shell
     that finally has room for it. */
  const b = Math.max(H.halfB * H.wl(u),
                     0.4 * 0.055 * S.beam / 2 * Math.max(0, 1 - u / 0.05));
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

  const US = hullStations(S, NU);
  /* a terrace break: the finite difference must not straddle it, or the smeared normal
     shades the crisp step as if it were a swept sheer. Stations of a snap pair difference
     one-sided, AWAY from their break. */
  const brks = S.sternSteps ? S.sternSteps.steps.map(st => st.u[0]).filter(b => b > 0 && b < 1) : [];
  const nearBrk = u => { for (const b of brks) if (Math.abs(u - b) < 1e-4) return b; return null; };

  for (let i = 0; i < US.length; i++) {
    const u = US[i];
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
      let uF = Math.min(1, u + e), uB = Math.max(0, u - e);
      const bk = nearBrk(u);
      if (bk !== null) { if (u <= bk) uF = u; else uB = u; }
      const a  = pointAt(uF, v), a2 = pointAt(uB, v);
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
  for (let i = 0; i < US.length - 1; i++) {
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
/* ── THE DECK COVERING IS A FACT OF THE RECORD, NOT A GUESS OFF THE HULL (round 106) ────
   Azzam's guest terraces read the fleet's gray steel because `deckSteel: true` was the only
   vocabulary the model had — and the builder's spec, as the BOAT International directory
   carries it, says 2,200 m² of laid teak. So the record may now state the covering itself:
   `hull.deck = { covering, provenance }`, drawn from this registry. The old deckSteel /
   deckLaid heuristic remains ONLY as the fallback, and the part card names which one
   answered (rule 10: a fallback is labelled as one). Plank dimensions are CLASS defaults
   except where the record attests one — hinoki and pine carry 127 mm because their one
   ship each has that width on record (Skulski's Yamato: 127 × 76 mm; the Olympic-class
   record: 5 in × 3 in) — and either way a plank sits below what any plate here can
   resolve; the card says which kind of number it got. */
const DECK_COVERINGS = {
  teak:   { mode: 1, col: 0x8a7250, plankW: 0.09, buttL: 2.4,
            name: 'Weather deck — laid teak' },
  hinoki: { mode: 1, col: 0xb3a17c, plankW: 0.127, buttL: 7.0,
            name: 'Weather deck — laid hinoki' },
  pine:   { mode: 1, col: 0xc0ad84, plankW: 0.127, buttL: 6.5,
            name: 'Weather deck — laid pine' },
  wood:   { mode: 1, col: 0xa08a66, plankW: 0.15, buttL: 6.5,
            name: 'Weather deck — laid planking' },
  steel:  { mode: 2, col: 0x494e54, plankW: 0, buttL: 1,
            name: 'Weather deck — painted steel' },
  bare:   { mode: 0, col: 0xa08a66, plankW: 0, buttL: 1,
            name: 'Deck — bare timber' },
};
/* the weather deck keys off what the DECK was, not what the hull was — one judgement,
   asked in one place, so the deck material and the deck furniture cannot disagree */
function deckCovering(S) {
  const rec = S.deck && S.deck.covering;
  if (rec && DECK_COVERINGS[rec])
    return Object.assign({ kind: rec, recorded: true,
      what: DECK_COVERINGS[rec].name.replace('Weather deck — ', 'The covering is ')
            + ', from the record. ' + (S.deck.provenance || '') }, DECK_COVERINGS[rec]);
  const heurSteel = (S.build === 'steel' || S.build === 'iron')
      && (S.deckSteel !== undefined ? S.deckSteel : !!(S.flightDeck || S.containers));
  const kind = heurSteel ? 'steel' : S.deckLaid === false ? 'bare' : 'wood';
  return Object.assign({ kind, recorded: false,
    what: 'INFERRED — no recorded covering: ' + (heurSteel
      ? 'a working steel motor ship’s weather deck is bare painted plate.'
      : kind === 'bare' ? 'this hull carries no laid deck at all.'
      : 'a planked ship’s weather deck is laid fore-and-aft. Plank dimensions are '
        + 'class defaults, below what the sources can resolve.') }, DECK_COVERINGS[kind]);
}

function buildDeckGeometry(S, NU = 120) {
  const H = hullSurface(S);
  const pos = [], nor = [], uvs = [], idx = [];
  const US = hullStations(S, NU);
  for (let i = 0; i < US.length; i++) {
    const u = US[i];
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
  for (let i = 0; i < US.length - 1; i++) {
    /* the slot between a snap pair is a terrace RISER — a vertical face, and these declared
       up normals would light it as floor. buildSternTerraces closes it with its own panel. */
    if (US[i + 1] - US[i] < 1e-4) continue;
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

/* ── THE OPEN HULL: an undecked hull is a CAVITY, not a cap (round 122) ────────────────
   The dugout's record refuses a deck (deckLaid: false) and her stage card says in terms
   what she is — "a tree with the inside taken out" — yet the model capped her sheer with
   a "bare timber" surface, which is a DECK by any other name. A monoxylon is open: what
   the viewer should see over the rail is the carved inner surface running down past the
   waterline to a floor. Three pieces, one geometry: the RIM (the top of the log's own
   wall, outer sheer edge to inner edge — over the solid ends it widens to the whole
   half-breadth, which is what an uncarved end looks like from above), the inner WALLS
   (the outer skin offset inboard by the wall siding, so the rim shows the real
   thickness), and the FLOOR (the bottom siding above the outer bottom — BELOW the load
   waterline, as a floating hull's floor is; the depth-mask plug in buildShip keeps the
   drawn sea from rendering inside). The cavity closes toward the ends by lerping the
   open section back to the flat top wherever the bottom gets too thin to carve, so the
   ends stay solid and there is no seam to leak. Wall and bottom sidings are DERIVED
   class defaults — the part card names them and says so (rule 10). */
function buildOpenHullGeometry(S, NU = 96, which) {
  const H = hullSurface(S);
  /* a carver leaves more bottom than side; a planked open hull's wall is its plank */
  const tw = S.build === 'dugout' ? Math.max(0.03, S.beam * 0.045)
                                  : Math.max(0.02, S.beam * 0.020);
  const tb = S.build === 'dugout' ? tw * 1.8
                                  : Math.max(0.04, S.draught * 0.06);
  const NV = 7;                       // wall samples, rim to floor
  const K = NV + 3;                   // + floor samples in to the centreline
  const pos = [], idx = [];
  const US = hullStations(S, NU);
  /* `which` picks a piece so the two can wear their own materials: the RIM is dressed
     timber — the fire never touches the gunwale, the adze does — while the CAVITY is
     what the hollowing left. Omitted, both build into one geometry (the fallback). */
  const wantRim = which !== 'cavity', wantCav = which !== 'rim';

  /* where can the cavity exist? enough bottom under the floor, enough breadth for walls */
  const eligible = u => u > 0.05 && u < 0.95
    && S.draught * H.keel(u) > tb * 1.4
    && surfacePoint(S, H, u, 1)[2] - tw > 0.01;
  let i0 = -1, i1 = -1;
  for (let i = 0; i < US.length; i++)
    if (eligible(US[i])) { if (i0 < 0) i0 = i; i1 = i; }
  if (i0 < 0 || i1 - i0 < 4)          // nothing to carve
    return wantRim ? buildDeckGeometry(S, NU) : new THREE.BufferGeometry();

  /* the interior half-section at station index i: K points, rim inner edge to centreline.
     a = 0 collapses it onto the flat top, which is how the ends stay solid. */
  const section = i => {
    const u = US[i];
    const s = (i - i0) / (i1 - i0);
    const ss = t => { const c = Math.min(1, Math.max(0, t / 0.12)); return c * c * (3 - 2 * c); };
    const a = ss(s) * ss(1 - s);
    const t = S.draught * H.keel(u);
    const vF = 0.62 * tb / t;                       // v where the floor cuts the section
    const edge = surfacePoint(S, H, u, 1);
    const yiTop = Math.max(0, edge[2] - tw);
    const open = [];
    for (let j = 0; j <= NV; j++) {
      const p = surfacePoint(S, H, u, 1 - (1 - vF) * j / NV);
      open.push([p[0], p[1], Math.max(0, p[2] - tw)]);
    }
    const fl = open[NV];                            // sits exactly at -t + tb
    open.push([fl[0], fl[1], fl[2] * 0.5], [fl[0], fl[1], 0]);
    const out = [];
    for (let k = 0; k < K; k++) {
      const cz = yiTop * (1 - k / (K - 1));         // the closed (flat-top) profile
      out.push([edge[0] + (open[k][0] - edge[0]) * a,
                edge[1] + (open[k][1] - edge[1]) * a,
                cz + (open[k][2] - cz) * a]);
    }
    out.rimInner = yiTop; out.edge = edge;
    return out;
  };

  /* winding: seen from above the visible faces are the cavity's — swap per side so the
     computed normals face up and inboard on both (the r34 winding-vs-normals class) */
  const quad = (sgn, a, b, c, d) => {
    if (sgn > 0) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, b, c, d);
  };

  for (const sgn of [1, -1]) {
    if (wantRim) {
      /* the rim, full length: solid top over the uncarved ends, wall-top in the run */
      const base = pos.length / 3;
      for (let i = 0; i < US.length; i++) {
        const e = surfacePoint(S, H, US[i], 1);
        const inner = (i >= i0 && i <= i1) ? Math.max(0, e[2] - tw) : 0;
        pos.push(e[0], e[1], sgn * e[2], e[0], e[1], sgn * inner);
      }
      for (let i = 0; i < US.length - 1; i++) {
        if (US[i + 1] - US[i] < 1e-4) continue;
        const a = base + i * 2;
        quad(sgn, a, a + 2, a + 1, a + 3);
      }
    }
    if (wantCav) {
      /* the cavity: walls and floor, one strip grid over the run */
      const cav = pos.length / 3;
      for (let i = i0; i <= i1; i++) {
        const row = section(i);
        for (const p of row) pos.push(p[0], p[1], sgn * p[2]);
      }
      for (let i = 0; i < i1 - i0; i++) {
        if (US[i0 + i + 1] - US[i0 + i] < 1e-4) continue;
        for (let k = 0; k < K - 1; k++) {
          const a = cav + i * K + k;
          quad(sgn, a, a + K, a + 1, a + K + 1);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ── THE TERRACED STERN: risers, bulwarks and the transom parapet (sternSteps) ─────────
 * hullSurface.sheer() already lowers the after decks span by span, and the shell, the deck
 * cap and the frames follow because they all ask surfacePoint. This builds what the drop
 * exposes: the transverse RISER closing each break (the deck loft leaves that slot open —
 * its declared up normals would light a vertical face as floor), the solid BULWARK whose
 * raked cap line is the height the broadside actually measures, and the parapet across the
 * transom. Everything is asked of surfacePoint, so the walls stand flush with the shell —
 * counter flare included — and cannot drift from it. */
function buildSternTerraces(S, group, hullMat) {
  if (!S.sternSteps) return;
  const H = hullSurface(S);
  const g = new THREE.Group();
  const E = 1e-5, TH = 0.15;                       // parapet plate thickness, inboard
  const capH = S.capM || 0.2;                      // cap face height — the measured strip
  /* ── THE PARAPET IS THE SHELL, CONTINUED — SO IT TAKES THE SHELL'S LIGHT ─────────────
     Measured round 102 (build/terrace-tone-before.json): the same white paint on the same
     near-vertical orientation read 216 sRGB on the parapet and 89 on the shell an arm's
     length below it, because MeshStandardMaterial is lit by the scene through ACES while
     the shell is lit by HULL_FRAG's own sun. STEEL_FRAG is that recipe on a plain colour,
     and the uniforms are the hull material's OWN uSun/uCam objects, so the wall cannot
     drift from the shell it stands on. */
  const steel = hex => new THREE.ShaderMaterial({
    vertexShader: SHADERS['STEEL_VERT.vert'], fragmentShader: SHADERS['STEEL_FRAG.frag'],
    side: THREE.DoubleSide,
    uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam,
                uCol: { value: new THREE.Color(hex) } } });
  const white = steel(S.topside || '#e4e2dc');
  const capMat = steel('#4a5057');
  /* the stair flights are deck furniture between two floors of the SAME covering, so they
     take deckCovering()'s one judgement: a yacht treads her flights in the deck's own laid
     timber, and white steel steps between two teak terraces disagree with both floors they
     join. Gated to a RECORDED laid covering — an inferred one keeps the topside white the
     fleet has always drawn, byte-identical. Plank seams on a 28 cm tread are below anything
     a plate can resolve, so the tread is the covering's plain timber in the shell's light. */
  const cover = deckCovering(S);
  const tread = cover.recorded && cover.mode === 1 ? steel(cover.col) : white;
  /* the glass follows the HOUSE's glazing system — the wallLoft recipe and the tierBands
     'glass' lo/hi — because a terrace door matches the windows above it, not the paint */
  const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.60,
    side: THREE.DoubleSide });
  const gLo = new THREE.Color(0x272e35), gHi = new THREE.Color(0x4a545d);
  const glassQuad = (x, z0, z1, y0, y1) => {
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(
      [x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
    gg.setAttribute('color', new THREE.Float32BufferAttribute(
      [gLo.r, gLo.g, gLo.b, gLo.r, gLo.g, gLo.b,
       gHi.r, gHi.g, gHi.b, gHi.r, gHi.g, gHi.b], 3));
    gg.setIndex([0, 1, 2, 0, 2, 3]); gg.computeVertexNormals();
    return new THREE.Mesh(gg, glassMat);
  };

  /* a quad strip through equal-length section loops; wrap closes the profile into a box
     strip, ends caps the first and last sections */
  const loft = (secs, mat, wrap, ends) => {
    const pos = [], idx = [];
    const P = secs[0].length;
    for (const sec of secs) for (const p of sec) pos.push(p[0], p[1], p[2]);
    for (let i = 0; i < secs.length - 1; i++)
      for (let f = 0; f < (wrap ? P : P - 1); f++) {
        const c = (f + 1) % P;
        idx.push(i * P + f, (i + 1) * P + f, i * P + c,
                 i * P + c, (i + 1) * P + f, (i + 1) * P + c);
      }
    if (ends) {
      const l = (secs.length - 1) * P;
      idx.push(0, 1, 2, 0, 2, 3, l, l + 2, l + 1, l, l + 3, l + 2);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setIndex(idx); gg.computeVertexNormals();
    return new THREE.Mesh(gg, mat);
  };
  const edgeAt = u => surfacePoint(S, H, u, 1);

  for (let si = 0; si < S.sternSteps.steps.length; si++) {
    const st = S.sternSteps.steps[si];
    const u0 = st.u[0] + E, u1 = st.u[1] - E;

    /* the side bulwarks: white plate from just under the deck up to the cap, both sides,
       stationed every couple of metres so the cap rake and the flare both carry */
    const N = Math.max(2, Math.ceil((u1 - u0) * S.lwl / 2));
    for (const sgn of [-1, 1]) {
      const wall = [], cap = [];
      for (let i = 0; i <= N; i++) {
        const u = u0 + (i / N) * (u1 - u0);
        const p = edgeAt(u);
        const x = p[0], fb = p[1], ye = Math.abs(p[2]);
        const top = H.stepTop(u);
        wall.push([[x, fb - 0.3, sgn * (ye - TH)], [x, top - capH, sgn * (ye - TH)],
                   [x, top - capH, sgn * ye],      [x, fb - 0.3, sgn * ye]]);
        cap.push([[x, top - capH, sgn * (ye - TH - 0.02)], [x, top, sgn * (ye - TH - 0.02)],
                  [x, top, sgn * (ye + 0.03)],             [x, top - capH, sgn * (ye + 0.03)]]);
      }
      g.add(tag(loft(wall, white, true, true), 'terrace'));
      g.add(tag(loft(cap, capMat, true, true), 'terrace'));
    }

    /* the riser closing this span's forward break, where the deck above actually drops */
    const b = st.u[0];
    const dF = H.sheer(b - E), dA = H.sheer(b + E);
    if (dF - dA > 0.02) {
      const eF = edgeAt(b - E), eA = edgeAt(b + E);
      const rows = [[], []];
      for (let k = 0; k <= 8; k++) {
        const kk = k / 8;
        rows[0].push([eF[0], eF[1] + Math.cos((kk - 0.5) * Math.PI) * eF[2] * 0.035,
                      eF[2] * (1 - 2 * kk)]);
        rows[1].push([eA[0], eA[1] + Math.cos((kk - 0.5) * Math.PI) * eA[2] * 0.035,
                      eA[2] * (1 - 2 * kk)]);
      }
      g.add(tag(loft(rows, white, false, false), 'terrace'));

      /* deck camber crowns 0.035·half on the centreline; local height at any z needs it */
      const zwA = Math.abs(eA[2]), zwF = Math.abs(eF[2]);
      const crownAt = (z, edgeY, zw) => edgeY + 0.035 * zw * Math.cos(z * Math.PI / (2 * zw));

      if (dF - dA > 2.0) {
        /* ── A FULL-HEIGHT RISER IS A WALL YOU LIVE BEHIND, NOT A PLATE ────────────────
           The delivery photograph reads the house's aft face dark with glazing over the
           terraces; its 6.6 px/m cannot place individual lights, so the ARRANGEMENT is
           inferred: a tinted band between white piers, and a pair of doors to the deck on
           the centreline — the saloon opens onto the first terrace. Panels stand 25 mm
           proud of the steel face so no two surfaces share a plane. */
        const xg = eA[0] + 0.025;
        const head = dF - 0.45;
        const sill = crownAt(0, dA, zwA) + 1.0;
        const zBand = zwA * 0.72;
        const doorTag = (m, nm, what) => tag(m, 'terrace', nm, what);
        g.add(doorTag(glassQuad(xg, -zBand, -1.55, sill, head), 'Terrace glazing',
          'The tinted band across the house’s aft face, looking down the terraces. '
          + 'The delivery photograph reads this wall dark against the white; the pane '
          + 'arrangement is inferred — the plate’s scale cannot place it.'));
        g.add(doorTag(glassQuad(xg, 1.55, zBand, sill, head), 'Terrace glazing',
          'The tinted band across the house’s aft face, looking down the terraces. '
          + 'The delivery photograph reads this wall dark against the white; the pane '
          + 'arrangement is inferred — the plate’s scale cannot place it.'));
        for (const sgn of [-1, 1])
          g.add(doorTag(glassQuad(xg, sgn * 0.10, sgn * 1.45,
                                  crownAt(sgn * 0.8, dA, zwA) + 0.02, head),
            'Terrace doors',
            'Glazed doors from the saloon onto the highest terrace, glass to the sill. '
            + 'Attested by the dark aft face in the delivery photograph; their exact '
            + 'width is inferred.'));
      } else if (dF - dA > 0.25) {
        /* ── A BREAK YOU CAN STAND AT IS A BREAK YOU CAN WALK DOWN ─────────────────────
           Twin flights against the riser, one each side, closed risers in the yacht
           manner. Their tops land flush with the upper deck and they hide behind the
           next span's bulwark, which is why the round-98 broadside envelope never saw
           them — consistent with, not contradicted by, the plate. */
        for (const sgn of [-1, 1]) {
          const zs = sgn * (zwA - 1.75);
          const yb = crownAt(zs, dA, zwA), yt = crownAt(zs, dF, zwF);
          const dl = yt - yb;
          const n = Math.max(2, Math.round(dl / 0.19)), rise = dl / n, treadD = 0.28;
          const flight = new THREE.Group();
          for (let j = 0; j < n; j++) {          // j = 0 the top tread, at the riser
            const hgt = (yt - j * rise) - yb;
            const step = new THREE.Mesh(new THREE.BoxGeometry(treadD, hgt, 1.3), tread);
            step.position.set(eA[0] + 0.02 + (j + 0.5) * treadD, yb + hgt / 2, zs);
            flight.add(step);
          }
          g.add(tag(flight, 'stair', 'Terrace stair',
            cover.recorded && cover.mode === 1
              ? 'Twin flights closing each terrace break, trodden in the deck’s own '
                + 'recorded covering — a yacht’s flights match the floors they join. '
                + 'Tread and rise are the builder’s convention; no plate resolves them.'
              : undefined));
        }
      }
    }
  }

  /* the parapet across the transom: the lowest terrace is open to the sea over the stern
     only through this wall, and the plate reads its cap at the aftmost step's aft height */
  const pT = edgeAt(1 - E);
  const xT = pT[0], fbT = pT[1], bT = Math.abs(pT[2]), topT = H.stepTop(1);
  if (topT !== null && topT > fbT + 0.1) {
    const secs = [];
    for (let k = 0; k <= 8; k++) {
      const y = bT * (1 - 2 * k / 8);
      secs.push([[xT - TH, fbT - 0.3, y], [xT - TH, topT - capH, y],
                 [xT, topT - capH, y],    [xT, fbT - 0.3, y]]);
    }
    g.add(tag(loft(secs, white, true, true), 'terrace'));
    const capS = [];
    for (let k = 0; k <= 8; k++) {
      const y = bT * (1 - 2 * k / 8);
      capS.push([[xT - TH - 0.02, topT - capH, y], [xT - TH - 0.02, topT, y],
                 [xT + 0.03, topT, y],             [xT + 0.03, topT - capH, y]]);
    }
    g.add(tag(loft(capS, capMat, true, true), 'terrace'));
  }
  group.add(g);
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
/* ── A RECORD MAY ATTEST THE FLAG-BUTTON, NOT THE SPAR ────────────────────────────────
   Preussen's record carries one mast figure and its datum is the TRUCK: "Masthöhe: 68 m
   (Kiel-Flaggenknopf), 58 m (Deck-Flaggenknopf)" — one number for all five masts, because
   the Laeisz Standardrigg cut interchangeable spars. No lower-mast length is attested
   anywhere in reach. So `truckM` on a square mast record states deck-to-truck, the figure
   the source names, and the stack is SOLVED for it here, beside the constants the solution
   depends on: the drawn truck stands at 0.88·(lower + top) + tg above the step — the 0.88
   doubling advance, Steel's 0.60 topmast and 0.30 topgallant — so lower = truckM / 1.708
   for the full stack, 1.48 truncated at two segments by `only`, 1.00 at one. Encoding the
   solved lower in the DATA instead would bake these constants into the record and drift
   silently the day they change. */
function mastLowerOf(mk, steelMain) {
  if (mk.truckM !== undefined && mk.rig === 'square') {
    const K = mk.only === 1 ? 1.0
            : mk.only === 2 ? 0.88 + 0.60
            : 0.88 * (1 + 0.60) + 0.30;
    return mk.truckM / K;
  }
  return mk.heightM !== undefined ? mk.heightM : (mk.height || 0) * steelMain;
}
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
       is nothing to hit.
       ⚠ AND ONLY A DRAWN FUNNEL OBSTRUCTS — see drawnFunnelStations. The slot list's
       virtual after-station clamped the steamer's spanker against a stack that is not
       there. openAft says nothing at all stands abaft this mast; gapAft keeps the virtual
       1.04 stern station in that case, because the junk sheet lead below still needs the
       room the SHIP has, not the room the sail plan takes. */
    let obstruct = nextAt !== undefined ? nextAt : Infinity;
    drawnFunnelStations(S).forEach(fu => {
      if (fu > u + 1e-4 && fu < obstruct) obstruct = fu;
    });
    const openAft = obstruct === Infinity;
    const gapAft = (Math.min(obstruct, 1.04) - u) * L;
    const x = (u - 0.5) * L + H.rake(u);
    /* ── ⚠ A MAST IS STEPPED ON THE DECK IT STANDS ON ───────────────────────────────────
       Every mast started at the SHEER, which is right for a ship whose weather deck is her
       top deck and wrong for anything with a house over it: Queen Mary 2's signal mast ran
       from 17.6 m — the main-deck sheer — straight up THROUGH ten decks of accommodation and
       out of the roof, so 29 m of its 45 m length was inside the ship and the 16 m that
       showed read as a wire. The same reasoning the funnel already uses: the uptake exits
       through the highest tier covering its station, from the house's own derivation, so the
       two cannot disagree.
       ⚠ AND WHICH DATUM A RECORDED HEIGHT USES IS A FACT ABOUT THE RECORD, not about the
       ship — the same trap the funnel hit, where `funnelH` means "above the boat deck" on
       Titanic and "above the sheer" on Great Eastern. Every existing heightM in this data was
       read against the SHEER, so flipping the datum fleet-wide would silently shorten masts
       that are currently right. `mastStep: 'house'` says the recorded height is measured from
       the house roof; without it nothing moves. */
    let base = deckAt(u);
    if (S.mastStep === 'house' && S.decks) {
      const HT = linerHouse(S);
      for (const t of HT.tiers) if (u >= t.uA && u <= t.uB) base = Math.max(base, t.y1);
    }
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
    const lower = mastLowerOf(mk, steelMain);
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
      Math.max(mx, mastLowerOf(m2, steelMain)), 0)
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
    /* the HEAD of each drawn segment, by section — the sheave a hoisting yard's tie runs
       over is in the head of its OWN mast section (Falconer's encornail: "the sheave-hole
       in a top-mast-head, through which the top-sail-tye is reeved"), so the running gear
       below needs every section's head, not just the highest one that capY keeps */
    const segHeads = [];
    /* a braced sail reaches about a tenth of the hull either side of its own mast */
    let prevYard = deckMax(u - 0.10, u + 0.10) + lower * 0.13;

    /* ── ONE CROSSED YARD, WITH ITS SAIL ──────────────────────────────────────────────
       Factored out because a mast may cross three yards — one per fidded segment, the
       18th-century rig — or six, from the record's own list (`yards`, below). Both paths
       must build the identical spar, or the fleet forks into two models of one thing. */
    /* `hoist` records how the yard is gotten up and held — {tie: si} for a yard that
       hoists on section si (its fall must lead over that section's head), 'jeers' for a
       course swayed up in tackles at the lower masthead, 'fixed' for a yard slung or
       trussed in place with no fall at all (crossjack, doubled-rig course, lower topsail,
       lower topgallant). The running gear below draws from this record, so a rope can
       only ever lead to the mechanism the yard actually rides. */
    const crossYard = (yy, yardLen, kind, hoist) => {
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
      mastYards.push({ yy, cx: ym.position.x, half: yardLen / 2, drop, hoist });
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

      /* ── THE KARCHESION — the ancient masthead, drawn as the fitting it was ──────────
         What stood at an ancient masthead instead of a top: the karchesion. Asclepiades
         of Myrlea (in Athenaeus 11.49): the mast's foot is the heel, its middle the neck,
         and its head the karchesion — the same word as the two-handled cup, which is
         about its shape. It is the block the yard hoists to: the halyard runs over a
         sheave in the head and falls to the deck, and without it the lines the rig
         already draws converged on a bare pole that could hoist nothing. Gated like the
         top but on the OTHER side of 1100 — the two fittings are mutually exclusive at
         one masthead — and only on a single-tier pole, which every ancient mast is.
         Form and size are DERIVED from the pole (no ancient masthead survives); the
         card says so. Research/MASTHEADS.md §3. */
      if (FINE && mk.rig === 'square' && si === 0 && mk.only === 1
          && S.year !== undefined && S.year < 1100) {
        const hR = radii[0] * 0.7;                     // the pole at the hounds
        const kg = new THREE.Group();
        /* the head block, its lip flaring above the sheave — the cup the name draws */
        const blkH = hR * 4.2, blkW = hR * 3.0, blkD = hR * 2.2;
        const blk = new THREE.Mesh(new THREE.BoxGeometry(blkD, blkH, blkW), mastMat);
        kg.add(blk);
        const lip = new THREE.Mesh(
          new THREE.BoxGeometry(blkD * 1.18, hR * 0.7, blkW * 1.18), mastMat);
        lip.position.y = blkH / 2 - hR * 0.35;
        kg.add(lip);
        /* the sheave slot, dark through the block fore and aft, and the pin it turns on */
        const slotMat = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
          { color: 0x17120c, roughness: 0.95 }));
        const slot = new THREE.Mesh(
          new THREE.BoxGeometry(blkD * 1.02, blkH * 0.52, hR * 0.42), slotMat);
        slot.position.y = -hR * 0.3;
        kg.add(slot);
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(hR * 0.26, hR * 0.26, blkW * 1.12, 8), slotMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.y = -hR * 0.3;
        kg.add(pin);
        /* the block IS the head: its top face is the truck of the pole */
        const hY = y + seg - blkH / 2;
        kg.position.set(x + Math.sin(rakeRad) * (hY - base), hY, 0);
        kg.rotation.z = -rakeRad;
        group.add(tag(kg, 'karchesion'));
      }

      /* ── THE JUNK MASTHEAD IS A SHEAVE THROUGH THE POLE ──────────────────────────────
         Needham IV:3 (Fig. 927 key, item 34): junk halyards run through "sheave pins
         passing through both masts and securing double halyard sheaves" — no external
         block, no karchesion, no top. The sheaves turn in slots cut through the masthead
         itself, on a pin through both cheeks. Drawn as the two dark slots and the proud
         pin ends; sizes are DERIVED from the pole (no measured junk masthead was in
         reach) and the card says so. Research/MASTHEADS.md §4. */
      if (FINE && mk.rig === 'junk' && si === 0) {
        const hR = segR[0].b;                          // the pole at the head
        const sg2 = new THREE.Group();
        const slotMat2 = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
          { color: 0x17120c, roughness: 0.95 }));
        for (const zz of [1, -1]) {
          const slot = new THREE.Mesh(
            new THREE.BoxGeometry(hR * 3.4, hR * 1.5, hR * 0.42), slotMat2);
          slot.position.z = zz * hR * 0.33;
          sg2.add(slot);
        }
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(hR * 0.26, hR * 0.26, hR * 2.9, 8), slotMat2);
        pin.rotation.x = Math.PI / 2;
        sg2.add(pin);
        const hY = y + seg * 0.965;
        sg2.position.set(x + Math.sin(rakeRad) * (hY - base), hY, 0);
        sg2.rotation.z = -rakeRad;
        group.add(tag(sg2, 'sheave'));
      }

      /* ── THE CORBIS — the basket that named the ship ─────────────────────────────────
         Paulus' epitome of Festus: "Corbitae dicuntur naves onerariae, quod in malo earum
         summo pro signo corbes solerent suspendi" — cargo ships are called corbitae
         because baskets were hung at the top of their mast as their sign. The type's own
         name, hoisted as an object. It is DATA (`corbis` on the hull record): only the
         hull whose record attests it wears one, at the head of her tallest mast. */
      /* "tallest mast" via lower === mainLower: form-independent, same class as the yard's
         share — `mk.height === maxMastShare` was NaN against a heightM record */
      if (FINE && S.corbis && si === 0 && lower === mainLower) {
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
        /* the record may attest the course yard itself (Preussen: "Länge Großrah:
           32 m") — an attested spar beats Steel's share of a derived mast */
        const courseL = mk.courseYardM !== undefined ? mk.courseYardM : lower * 0.875;
        const yardLen = si === 0 ? courseL
                      : si === 1 ? courseL * 0.714
                      : courseL * 0.714 * 0.667;
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
        /* how this yard gets up, from the sources (Research/MASTHEADS.md §4): the one
           yard of a single-tier mast hoists to its own masthead; a course under upper
           tiers hangs in JEERS — Falconer: "an assemblage of tackles, by which the lower
           yards of a ship are hoisted up along the mast" — except the crossjack, which
           hung in standing slings and gets nothing; every upper yard rides a TIE over
           the sheave in its own section's head. */
        crossYard(y + seg * (si === 0 ? courseAt : 0.88), yardLen,
                  si === 0 ? (isMizzen ? 'topsail' : 'course')
                : si === 1 ? 'topsail' : 'topgallant',
                  si > 0 || tiers === 1 ? { tie: si }
                : isMizzen ? 'fixed' : S.iron ? 'fixed' : 'jeers');
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
      segHeads[si] = capY;
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
      /* which of these yards HOIST is the Howes arrangement itself: the course sits on
         its truss and the lower topsail and lower topgallant hang fixed at the caps —
         that is the whole point of doubling, the fixed yard needs no hands to sway it —
         while each upper yard rides a tie over the head of its own section: the deep or
         upper topsail on the topmast, the topgallants and the royal on the spar above
         the second doubling. Jeers are gone from this rig; by its date the lower yards
         sit on iron trusses. Research/MASTHEADS.md §4. */
      const HOIST = { course: 'fixed', ltop: 'fixed', ltg: 'fixed',
                      top: { tie: 1 }, utop: { tie: 1 },
                      tg: { tie: 2 }, utg: { tie: 2 }, royal: { tie: 2 } };
      /* the record may attest the course yard itself (Preussen: "Länge Großrah: 32 m;
         Royalrah: 16 m" — and 16/32 is EXACTLY the royal's 0.50 share below, the record
         confirming the plan's own fractions). An attested spar beats Steel's 7/8 of a
         derived mast. */
      const courseL = mk.courseYardM !== undefined ? mk.courseYardM : lower * 0.875;
      mk.yards.filter(nm => PLAN[nm])
        .sort((a, b) => PLAN[a][0] - PLAN[b][0])
        .forEach(nm => { const [f, r, kind] = PLAN[nm];
          crossYard(base + T * f, courseL * r,
                    kind === 'course' && isMizzen ? 'topsail' : kind, HOIST[nm]); });
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
        /* the true deck edge, asked of the surface (r100) — 0.96 keeps the pin rail
           deliberately just inboard of it */
        const hz = Math.abs(surfacePoint(S, H, uc, 1)[2]) * 0.96;
        return V3((uc - 0.5) * L, deckAt(uc) + B * 0.012, sgn * hz);
      };
      const lifts = [], sheets = [], tacks = [], hals = [], jeers = [];
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
        /* the fall, from the mechanism the yard was recorded to ride (crossYard's
           `hoist`), sides alternating by tier. A HOISTING yard's tie leads up from the
           slings, over the sheave in the head of its OWN mast section — the karchesion
           on an ancient pole, the top's sheave on the cog, Falconer's encornail in the
           topmast head, and each section above likewise — and only then down to the
           rail. ⚠ Drawn slings-to-rail direct, as every upper yard was through r78, it
           is a rope that could hoist nothing: the r78 fault one tier up. A FIXED yard
           (crossjack, doubled-rig course, lower topsail, lower topgallant) gets no fall
           at all, and the course of a classic multi-tier rig hangs in its JEERS below. */
        if (yd.hoist && yd.hoist.tie !== undefined) {
          const sgn = k % 2 ? 1 : -1;
          const hy = segHeads[yd.hoist.tie] !== undefined ? segHeads[yd.hoist.tie] : capY;
          const hd = V3(mx(hy), hy, 0);
          hals.push([V3(mx(yd.yy) + B * 0.02, yd.yy, 0), hd],
                    [hd, rail(u + 0.05 + 0.015 * k, sgn)]);
        } else if (yd.hoist === 'jeers' && segHeads[0] !== undefined) {
          /* Falconer's JEARS: "two strong tackles, each of which has two blocks, viz.
             one fastened to the lower-mast-head, and the other to the middle of the
             yard", the falls leading down to the deck. Drawn as the pair either side of
             the slings — block to block, then the fall to the deck beside the mast —
             with same-side falls, a stated simplification of Falconer's crossed ones. */
          const jb = base + (segHeads[0] - base) * 0.86;   // just under the top
          const zo = Math.max(0.25, B * 0.03);
          const dY = deckAt(u) + B * 0.012;
          for (const sgn of [1, -1]) {
            const blk = V3(yd.cx + sgn * sT * zo * 1.5, yd.yy, sgn * cT * zo * 1.5);
            jeers.push([V3(mx(jb), jb, sgn * zo), blk],
                       [blk, V3((u + 0.02 - 0.5) * L, dY, sgn * zo)]);
          }
        }
      });
      const rr = B * 0.0004;
      const lm = ropeMesh(lifts, 0.012 + rr, ropeMat);  if (lm) group.add(tag(lm, 'lift'));
      const sm = ropeMesh(sheets, 0.013 + rr, ropeMat); if (sm) group.add(tag(sm, 'sheet'));
      const tm = ropeMesh(tacks, 0.013 + rr, ropeMat);  if (tm) group.add(tag(tm, 'tack'));
      const hm = ropeMesh(hals, 0.011 + rr, ropeMat);   if (hm) group.add(tag(hm, 'halyard'));
      /* the jeers are the heaviest purchase on the ship, and draw a little heavier */
      const jm2 = ropeMesh(jeers, 0.015 + rr, ropeMat); if (jm2) group.add(tag(jm2, 'jeers'));
    }

    /* ⚠ STAYS ANCHOR ON THE DRAWN TRUCK, NOT ON AN ESTIMATE OF IT. `y + lower*0.14` stood
       3.0 / 3.4 / 9.3 m above the built mastheads on the 74's three masts (measured against
       the mast meshes themselves, r99), so every stay and backstay in the square fleet
       converged on a point in open air — invisible from a distance because a rope is thin.
       segHeads holds the cap of every segment this loop actually drew; the last one IS the
       truck. The collar sits a few percent of that segment below the cap, at the raked
       masthead's own x — the un-raked station x put a 5°-raked mizzen's stay head 3 m
       forward of its truck. */
    /* the segment cylinder tilts about its own CENTRE, so a raked cap stands below capY by
       (1 − cos)·seg/2 — 0.2 mm at 5° of rake and 0.93 m at the corbita's 48° artemon,
       which is exactly where the audit caught the first version of this fix */
    /* `only` truncates the DRAWN stack short of the record's segment list, so the top
       drawn segment is segHeads' last entry, not segs' — the corbita draws one of two */
    const segL = segHeads.length ? (segs[segHeads.length - 1] || 0) : 0;
    const cosR = Math.cos(rakeRad), sinR = Math.sin(rakeRad);
    const truckY = segHeads.length
      ? segHeads[segHeads.length - 1] - (1 - cosR) * segL / 2 - cosR * segL * 0.04
      : y + (lower * 0.14);
    const truckX = segHeads.length
      ? x + sinR * (segHeads[segHeads.length - 1] - base) - sinR * segL * 0.04
      : x + sinR * (truckY - base);
    if (mk.rig === 'square') {
      mastTops.push({ u, x: truckX, y: truckY });
      /* the staysail block below needs each square mast's own station and truck height */
      stayMasts[mi] = { x, base, T: y - base };
    }
    /* a gaff masthead is a stay anchorage too — the schooner's web is drawn in
       buildRigging from these, and it is a different web from a square-rigger's */
    else if (mk.rig === 'gaff' && segs.length)
      mastTops.push({ u, x: truckX, y: truckY, gaff: true });

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
      /* ⚠ THE YARD'S SHARE MUST NOT ASSUME THE RECORD'S FORM. `mk.height / maxMastShare`
         is the same ratio as `lower / mainLower` when heights are Steel shares — but a
         record with an ATTESTED height in metres (`heightM`) has no `height` at all, and
         the first galley arrived with NaN in both masts, both yards and both sails, a
         black canvas with working panels. mScale is the identical ratio computed from
         whichever form the record actually carries. */
      const yardLen = mixed ? lower * 1.15 : L * mScale;
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
         the FACE of the obstruction, not to its centreline.
         ── ⚠ THE STERN IS NOT AN OBSTRUCTION (r99, taken r101) ─────────────────────────
         Swing clearance is a collision term, and aft of the taffrail there is nothing to
         collide with — discounting the open aftermost boom by 0.78 of the room to a virtual
         stern station made the boom scale with HULL LENGTH abaft the mast instead of with
         the sail plan: roomy on Wyoming's 110 m, strangling on the 74's 51 m, where the
         driver drew 7.6 m against Steel's listed 13–17. Open water gets the sail plan's own
         terms instead: the 0.62 share of the lower mast, bounded by how far a driver boom
         can stand past the taffrail and still be worked — its sheet lands on the taffrail
         or a buffer on it, and no plan hangs much more than a third of the boom outboard of
         that anchorage. gapAft * 1.6 is that bound, calibrated on the one attested spar in
         reach: it puts the 74's boom at 15.5 m, the middle of Steel's table. */
      const boomL = openAft
        ? Math.max(lower * 0.16, Math.min(lower * 0.62, gapAft * 1.6))
        : Math.max(lower * 0.16, Math.min(lower * 0.62, gapAft * 0.78));
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
      /* ⚠ the halyard leads OVER the sheave in the masthead — Needham's "sheave pins
         passing through both masts" — and its fall comes down to the deck abaft the
         mast, where the sail is worked. Drawn slings-to-masthead and stopped, it was a
         rope with no fall to haul on: the r78 fault in Chinese dress. The sheave the
         lead implies is drawn on the pole itself, in the mast build above. */
      const shv = new THREE.Vector3(0, base + lower * 0.965, 0);
      const hal = ropeMesh([[slings, shv],
                            [shv, new THREE.Vector3(B * 0.05, base + castleTop + B * 0.012,
                                                    B * 0.03)]],
                           0.016 + B * 0.0005, ropeMat);
      if (hal) lug.add(tag(hal, 'halyard'));
    }

    /* standing rigging: shrouds from the channels out on the hull's side up to the masthead,
       rattled down with ratlines at THIRTEEN INCHES — Steel 1794 states it outright: "Each
       ratling is placed thirteen inches asunder." Lees gives 13–15 in across all cases and
       the Anatomy of Nelson's Ships gives 13 for Victory. The 14–16 in commonly used by
       modellers is looser practice, not a documented rule. */
    if (mk.shrouds) {
      /* the channels stand off the TRUE deck edge (r100) — the old parallel formula put
         them inboard of a flared topside */
      const half = Math.abs(surfacePoint(S, H, u, 1)[2]);
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
      const flower = mastLowerOf(fm, steelMain);
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
  stowage:  { stage: 7, name: 'Stowed gear',
              what: 'Gear lying on the floor of an open hull. A hull with no deck hides '
                  + 'nothing: what she carries sits in the bottom, in sight over the rail.' },
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
  livery:   { stage: 7, name: 'Livery',
              what: 'The operator’s name painted on the shell and the ship’s own name and port '
                  + 'on the stern. On a ship whose hull is a fifteen-metre wall of plate, the '
                  + 'lettering is the largest single mark on her — sized to be read from another '
                  + 'ship, not from a quay.' },
  paddle:   { stage: 4, name: 'Paddle wheels',
              what: 'Great Eastern\'s are 17 m across — taller than a house — each wheel hanging '
                  + 'thirty flat boards of 13 feet by 3 on its radial arms. She carried a 7.3 m '
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
  spur:     { stage: 3, name: 'Spur',
              what: 'The long beak at the bow, riding above the water. It is NOT a ram: the '
                  + 'underwater bronze ram died with antiquity, and what replaced it is a '
                  + 'boarding bridge — the spur crosses the enemy\'s rail, locks the two hulls '
                  + 'together, and the soldiers go over it. Its length also fixes the gun\'s '
                  + 'minimum range: the courser fires past it at a target the spur is about '
                  + 'to touch.' },
  apostis:  { stage: 3, name: 'Rowing frame',
              what: 'The rectangular frame the oars actually pivot on, standing well outboard '
                  + 'of the planking on crossbeams — the reason a galley\'s fighting beam is '
                  + 'nearly two metres more than her hull\'s. The hull is a canoe; the frame '
                  + 'is the engine room bolted on top of it. Between the benches runs the '
                  + 'corsia, the raised central gangway, the only way fore and aft.' },
  bench:    { stage: 4, name: 'Rowing bench',
              what: 'One bench, one great oar, three to four men — rowing a scaloccio, standing '
                  + 'into the stroke and falling back. The older way, alla sensile, put three '
                  + 'separate oars on each bench with one skilled man on each; a scaloccio '
                  + 'needs only the inboard man to be a rower, and the rest to pull. That is '
                  + 'why every fleet converted to it, and why chained men could row it.' },
  gundeck:  { stage: 5, name: 'Gun deck',
              what: 'The deck built across the rowing frame, over the rowers\' heads — the '
                  + 'reason the galleass exists. Guns stand on it and fire outboard over the '
                  + 'oars, the broadside a war galley structurally cannot mount because her '
                  + 'sides at gun height are full of oars. At Lepanto the fire from six of '
                  + 'these decks broke up the Ottoman line\'s order before the fleets '
                  + 'touched, which is why the galleasses were stationed ahead of the line.' },
  sangjang: { stage: 5, name: 'Sangjang wall',
              what: 'The heavy plank belt between the hull\'s gunwale and the fighting deck '
                  + 'above it. The rowers on the oar deck work behind it, under cover; a '
                  + 'boarding party that has climbed the two metres of hull side finds another '
                  + 'storey of timber standing over the rail. The old drawings paint a dragon '
                  + 'along this belt and cut a row of small ports just under the deck line.' },
  maku:     { stage: 5, name: 'Maku',
              what: 'The cloth band hung from the fighting deck\'s overhung edge over the '
                  + 'oar band — white under a dark scalloped hem in the Busan scroll, which '
                  + 'dresses hull after hull of the anchored fleet in it and hangs the '
                  + 'atakebune\'s in the same cut, inverted, under sail. Dress and '
                  + 'concealment both: an arquebusier behind it cannot be counted.' },
  sama:     { stage: 5, name: 'Sama',
              what: 'A loophole cut in the shield wall, one of a row down each side — the '
                  + 'arquebus and the bow fire from behind the planking. On a hull too light '
                  + 'to bear cannon recoil, these slots are the broadside.' },
  tower:    { stage: 5, name: 'Commander\'s tower',
              what: 'The janggundae, the roofed pavilion standing on the fighting deck '
                  + 'amidships. The commander fights the ship from it, in sight of his own '
                  + 'crew and the rest of the squadron — a Joseon fleet was signalled by '
                  + 'flag and drum from these towers. Every surviving drawing of a '
                  + 'panokseon shows it standing clear above the bulwarks.' },
  arrumbada: { stage: 3, name: 'Bow platform',
              what: 'The fighting platform over the bow, spanning the full width of the rowing '
                  + 'frame. The guns stand on it and the boarding party masses on it, over the '
                  + 'heel of the spur. All of a galley\'s violence is concentrated on these few '
                  + 'square metres of deck; everything abaft it is propulsion.' },
  fortress: { stage: 3, name: 'Bow fortress',
              what: 'The round fighting deck the Arsenal built over the bow in the 1570–71 '
                  + 'conversions, its parapet sweeping from one rail around the stem to the '
                  + 'other. The heavy battery stands on it and fires ahead and on both bows '
                  + 'through ports in the curve — an arc of fire, not a single axis, which is '
                  + 'why an Ottoman line could not row past without losing its dressing.' },
  canopy:   { stage: 7, name: 'Stern awning',
              what: 'Canvas arched over the poop, where the captain and the officers live — '
                  + 'the only cover aboard a ship whose entire deck is benches. Struck before '
                  + 'action, like the rig.' },
  anchor:   { stage: 3, name: 'Bower anchor',
              what: 'A 74\'s best bower weighs about 3.7 tonnes, and half the machinery in her '
                  + 'bow exists to move it: cathead, fish davit, capstan, and a 24-inch cable too '
                  + 'thick to pass round the capstan at all — it has to be nipped to a lighter '
                  + 'messenger line. The STOCK is set at right angles to the arms, and that 90° '
                  + 'is the whole invention: it rolls the anchor over until a fluke bites. '
                  + 'Without it the thing lies flat and drags.' },
  grapnel:  { stage: 3, name: 'Grapnel anchor',
              what: 'The Indian Ocean\'s own ground tackle, and the one anchor in this fleet '
                  + 'lifted from its own ship\'s wreck: a wooden shank carrying four wrought-'
                  + 'iron arms that cross at two levels, with a heavy cast-iron bell between '
                  + 'them for weight — the Belitung ship\'s anchor, drawn to the excavation '
                  + 'drawing\'s own scale. A grapnel needs no stock: whichever way it lands, '
                  + 'an arm points down and bites. It lives loose on deck at the bow, a coir '
                  + 'cable bent to the shank head, and the crew works it by direct pull.' },
  stoneAnchor: { stage: 3, name: 'Stone anchor',
              what: 'The Chinese sea-ship\'s ground tackle in an eyewitness\'s one sentence '
                  + '(Xu Jing, 1124): below the bow winch hangs the anchor-stone, clamped on '
                  + 'its two sides by two wooden hooks, on a rattan cable thick as a rafter '
                  + 'and five hundred feet long. The form drawn here is that sentence\'s own '
                  + 'object as excavation recovered it: two shank timbers pegged together '
                  + 'with cross battens, each sweeping out to a curved fluke point, and the '
                  + 'stone wedged crosswise through the gap between them — its ends standing '
                  + 'out both sides as the stock, so a fluke always points down to bite. One '
                  + 'such anchor came up off the Korean coast still jointed, stone and arm '
                  + 'together, from the sea road Chinese traders sailed to Goryeo. There is '
                  + 'no iron in it anywhere; the wood rotted off every other stone found.' },
  ironAnchors: { stage: 3, name: 'Four-claw anchor',
              what: 'The Chinese sea anchor as the Tiangong kaiwu forges it: four claws '
                  + 'made first, then joined section by section to a wrought-iron shank — '
                  + 'the largest single thing under furnace and hammer, welded by crews '
                  + 'on a timber stage with chain slings. No stock and no wood anywhere: '
                  + 'whichever way it lands, a claw points down and bites. A state grain '
                  + 'ship carried five or six; the mightiest, the "house-guarding anchor" '
                  + 'of about 500 catties, went down only in the last extremity, and the '
                  + 'crew\'s name for its cable — ben shen, the ship\'s own life — says '
                  + 'what hung on it. The cables themselves are split green bamboo, '
                  + 'boiled and twisted.' },
  woodAnchor: { stage: 3, name: 'Wooden anchor and its stone',
              what: 'The Korean tradition\'s ground tackle: an oak shank — the 닻채 — with '
                  + 'hook-arms spread from it like branches, usually four, two hung to a '
                  + 'side; a crossbar fixed through the head where the cable bends on; and '
                  + 'a long rectangular stone lashed across the frame, because oak alone '
                  + 'will not sink — the stone carries the anchor down and drives the hooks '
                  + 'into the tidal mud. The West Sea keeps the record of the type: 154 '
                  + 'anchor stones lifted off Taean and Incheon since 2008, rope grooves '
                  + 'still cut in them, the largest over two metres and 300 to 700 kg, and '
                  + 'the wooden anchors found beside them carbon-dated from the second '
                  + 'century BC into this ship\'s own dynasty. Her navy\'s album draws the '
                  + 'anchor on the warship plate beside mast, oars and rudder.' },
  yotsumeAnchor: { stage: 3, name: 'Yotsume-ikari',
              what: 'The wasen tradition\'s ground tackle: the four-claw forged iron anchor, '
                  + 'named for its making — a square iron bar split at the foot and the '
                  + 'quarters bent outward into claws, an elongated ring at the head carrying '
                  + 'the free ring the cable bends to. No stock and no wood: whichever way it '
                  + 'lands, a claw points down and bites. Iron on a warship is the era\'s own '
                  + 'pattern — from the early 15th century the warships and special ships '
                  + 'carried the four-claw iron anchor alongside the wood-stone anchors that '
                  + 'stayed the ordinary ships\' mainstay into the mid-1600s — and the Busan '
                  + 'scroll of 1593 draws the anchored barrier fleet riding to its cables, '
                  + 'the anchor itself at the line\'s end, claws recurved. Forty-nine survive '
                  + 'in one measured corpus, 1.05 to 3.03 m; none of them a Sengoku '
                  + 'warship\'s. The corpus measures its members: the arms are flat forged '
                  + 'bars, about a thirtieth of the length wide at the root and thinning to '
                  + 'a blade at the point, and its one weighed anchor — 2.8 m, raised off '
                  + 'Kozushima, 330-340 kg on a forklift — sets the class\'s weight. The '
                  + 'drawn iron weighs that record: the shank, the one member the corpus '
                  + 'table leaves unmeasured, is solved to carry the recorded mass.' },
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
              what: 'The line that hoists the yard, and it must go over a masthead to do it: '
                  + 'the tie leads up from the yard\'s slings, through the sheave in the head '
                  + 'of the yard\'s own mast section — Falconer\'s 1780 dictionary keeps a '
                  + 'word just for the topmast\'s, the encornail, "the sheave-hole in a '
                  + 'top-mast-head, through which the top-sail-tye is reeved" — and only then '
                  + 'falls to the rail. On a junk it is the one heavy lift aboard: sail, '
                  + 'battens, boom and yard all rise on it over the sheave in the pole\'s own '
                  + 'head, and reefing is simply letting it go.' },
  jeers:    { stage: 6, name: 'Jeers',
              what: 'The heaviest purchase on the ship. Falconer, 1780: "an assemblage of '
                  + 'tackles, by which the lower yards of a ship are hoisted up along the '
                  + 'mast" — in a ship of war "two strong tackles, each of which has two '
                  + 'blocks, viz. one fastened to the lower-mast-head, and the other to the '
                  + 'middle of the yard", the falls leading down to the deck. The course '
                  + 'yard, tons of timber, hangs in these; the drawing leads both falls down '
                  + 'their own side where Falconer crosses them behind the mast.' },
  sheave:   { stage: 4, name: 'Masthead sheave',
              what: 'The Chinese masthead: no top, no block, no fitting at all — the sheave '
                  + 'turns in a slot cut through the head of the pole itself, on a pin '
                  + 'through both cheeks. Needham records junk halyards running through '
                  + '"sheave pins passing through both masts and securing double halyard '
                  + 'sheaves", so two slots are drawn. Sizes are DERIVED from the pole; no '
                  + 'measured junk masthead was in reach of this model.' },
  sternlight:{ stage: 3, name: 'Stern lights',
              what: 'The great windows across the transom, and the only real glazing in the ship. '
                  + 'Everywhere else light comes through a gunport or a grating, so the captain\'s '
                  + 'cabin is the one place aboard you can read without a candle. Each tier is a '
                  + 'pierced sash wall: lights nearly shoulder to shoulder, each a grid of small '
                  + 'panes set behind its glazing bars — crown glass cast no metre sheet. Grid, '
                  + 'pier and pitch are record fields; on the 74 they are read off the RMG Bellona '
                  + 'model (SLR0338) at ~55 px/m, and the record says which ships carry a class '
                  + 'default instead.' },
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
  terrace:  { stage: 3, name: 'Stern terraces',
              what: 'The stepped after decks and their solid bulwarks, descending from the main '
                  + 'deck to a low platform at the transom. Each step is a deck you can stand '
                  + 'on, walled by a faired steel parapet whose cap line is what the broadside '
                  + 'photograph actually shows.' },
  stair:    { stage: 3, name: 'Terrace stair',
              what: 'Twin flights against the riser at each break, closed risers in the yacht '
                  + 'manner, tops flush with the deck above. They stand behind the next '
                  + 'bulwark aft, which is why a broadside cannot see them.' },
  waterway: { stage: 3, name: 'Waterway',
              what: 'The margin plank at the deck edge, thicker than the deck it borders and '
                  + 'standing a little proud of it. The gutter its inboard edge makes against '
                  + 'the deck carries shipped water aft along the bulwark to the scuppers, '
                  + 'which is what names it. It is tarred with the seams, so it reads as a '
                  + 'dark band framing the deck — on a teak-decked liner as much as on a '
                  + 'seventy-four.' },
  grating:  { stage: 3, name: 'Grating',
              what: 'A lattice hatch cover. It has to be open, because the only ventilation for '
                  + 'the decks below comes through it — and it has to be strong enough to walk '
                  + 'on and to take a sea aboard. In heavy weather they were battened down under '
                  + 'tarpaulin, which is where the phrase comes from.' },
  capstan:  { stage: 3, name: 'Capstan',
              what: 'A vertical winch turned by bars, drawn from the record: whelp timbers run '
                  + 'from drumhead to deck, flaring like buttresses to enlarge the sweep, with '
                  + 'chocks wedged between and two iron pawls on deck to stop the recoil '
                  + '(Falconer 1769). The bars ship through square holes at breast height — '
                  + 'the whole machine is sized to the men who walk it round. Hulls whose '
                  + 'traditions used other gear carry no capstan.' },
  windlass: { stage: 3, name: 'Windlass',
              what: 'A horizontal winch: an eight-square barrel turned by handspikes '
                  + 'thrust into holes bored through its body, the crew rising together on '
                  + 'the bars to a song. On the cog it lies athwartships at the aftcastle, '
                  + 'forward of the helm — the reconstructed Bremen ship carries it there. '
                  + 'On the Chinese seagoing tradition it lies at the bow between the two '
                  + 'mooring posts: Xu Jing watched one worked in 1124, winding a rattan '
                  + 'cable as thick as a rafter, and the Tiangong Kaiwu of 1637 names the '
                  + 'machine that breaks out the iron anchors. The Korean horong is the '
                  + 'same machine at the bow with its own working: two long bars pass '
                  + 'clean through the drum, crossed, and four men heave at the four '
                  + 'ends — the album of the Joseon navy drew it around 1797, and the '
                  + 'rebuilt grain ship of 2011 works it still. On the Roman grain run '
                  + 'the machines stand in a gear list: Lucian\'s visitor, walking the '
                  + 'giant Isis at Piraeus around AD 165, counts the anchors and their '
                  + 'winding machines among the ship\'s wonders. Drawn only where the '
                  + 'record attests one.' },
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
  karchesion:{ stage: 4, name: 'Karchesion',
              what: 'The masthead itself, by its ancient name. Asclepiades of Myrlea, quoted '
                  + 'by Athenaeus: the foot of the mast is the heel, the middle is the neck, '
                  + 'and the head is the karchesion — the same word as a two-handled drinking '
                  + 'cup, which is roughly its shape. It is the block the yard hoists to: a '
                  + 'sheave turns on a pin through the head, the halyard runs over it and '
                  + 'falls to the rail. No ancient masthead survives, so the block\'s form and '
                  + 'size here are DERIVED from the pole; the reconstruction Olympias carries '
                  + 'the same gear in the same place.' },
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
  logtop:   { stage: 1, name: 'The log, before hollowing',
              what: 'The felled trunk\'s upper face. The hollowing stage removes it — burning '
                  + 'and adze work take everything inside the rim, and what remains of this '
                  + 'surface afterwards is the rim itself.' },
  quarterRudder: { stage: 3, name: 'Quarter rudders',
              what: 'A steering oar grown into a fitting: one over each quarter, its loom '
                  + 'working against a through-beam at the rail, its blade standing down '
                  + 'beside the run. The whole ancient Mediterranean steered this way — a '
                  + 'pair, handled together by one helmsman — and the sewn ships of the '
                  + 'Indian Ocean lashed theirs on, having no iron to hang a pintle with. '
                  + 'It is not a lesser rudder: it balances about its own shaft, so it turns '
                  + 'light in the hand, and it lifts clear in shoal water. What replaced it '
                  + 'was cheaper to build heavy — a sternpost hinge grows with the ship.' },
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
  /* ⚠ AND THE SAME FAILURE ONE SIZE DOWN (r120): "timber" put HOLD furniture on hulls with no
     hold. A grating covers a hatch — an opening through a laid deck — and a capstan stands ON
     a deck and heaves cable a crew this size hauls by hand; the 8.6 m dugout and the voyaging
     canoe (the record's deckLaid: false, an open log and a lashed platform between two open
     hulls) carried three gratings and a bar-capstan for as long as buildFittings has existed.
     deckCovering() already promises "the deck material and the deck furniture cannot
     disagree" — the furniture just never asked it. Now it does. */
  const laidDeck = deckCovering(S).mode === 1;
  /* an OPEN hull (mode 0) has no deck at all, so it has no deck EDGE: the rim of the
     hull wall is the gunwale (round 122), and a fitted capping rail is assembly timber
     the record refuses. Found twice in one frame: the dugout's rail z-fighting her new
     rim, and the canoe's rail — never in the twin-hull clone list — running the full
     length at the CENTRELINE, floating over open water fore and aft of the platform. */
  const openHull = deckCovering(S).mode === 0;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const deckAtU = u => H.sheer(u);
  /* ⚠ the deck edge is WHERE THE SKIN ENDS, asked of surfacePoint — the deck builder's own
     lesson, and this line was the rail's stale copy of it: no counter flare, no bow flare,
     no rounded stern, no stem rabbet. Measured before the fix (r100): 20 of 33 hulls had
     the rail over half a metre inboard of the true edge — the carrier 4.9 m at the counter
     — and Queen Mary 2's hung 4.1 m OUTBOARD of her rounded stern, in open air. Everything
     in this function that means "the deck edge" asks the surface now: the rail, the
     open-walkway test, the gratings, the deckhouse widths. */
  const halfAtU = u => Math.abs(surfacePoint(S, H, u, 1)[2]);
  const wood = mats.woodDark, pale = mats.woodPale || mats.woodDark;

  /* ── the RAIL round the deck edge: a capping timber following the sheer ─────────────
     ── ⚠ AND A RAIL CAPS A DECK EDGE, SO WHERE THE HOUSE IS THE SHIP'S SIDE THERE IS NONE.
     This ran the whole length on every hull. On a ship whose superstructure carries out to
     the shell — Queen Mary 2 — the capping section landed 16 cm outboard of the white wall,
     two near-parallel surfaces on a 345 m ship, which is z-fighting by construction: a torn,
     crawling dark line along the strake for the whole length of the ship. That is the
     flicker. Proved by hiding parts one at a time under a fixed camera — the rail is the
     only one whose removal takes it away, and hiding the hull's deck fittings altogether
     leaves the strake clean.
     There is no such rail on the real ship either: her Deck 7 promenade is INSIDE the shell.
     So the rail is emitted only over the spans where the deck is genuinely open — the
     forecastle, the poop, and any stretch where the house stands far enough inboard to leave
     a walkway. A hull with no house has no closed span and comes out vertex-identical.
     And a hull with no DECK has no deck edge anywhere: the open hulls skip the whole rail. */
  if (!openHull) {
    const pos = [], idx = [];
    const NU = 90; let base = 0;
    const T = S.decks ? linerHouse(S) : null;
    const t0 = T && T.tiers.length ? T.tiers[0] : null;
    const open = (u) => {
      /* a terraced stern owns its own deck edge: the bulwark and its cap are built by
         buildSternTerraces, and a second capping ridden along the old sheer line here
         would hang in the air over the lowered decks */
      if (H.stepTop(u) !== null) return false;
      if (!t0 || u < t0.uA || u > t0.uB) return true;
      /* the house is here: is there deck left outboard of it to stand on? */
      return halfAtU(u) - t0.half(u) > B * 0.045;
    };
    for (const sgn of [-1, 1]) {
      /* walk the same 91 stations as before and cut the strip into open RUNS */
      let run = [];
      const flush = () => {
        if (run.length < 2) { run = []; return; }
        const start = base;
        for (const q of run) {
          /* ── ⚠ A CAPPING IS A ROLLED SECTION, NOT A FRACTION OF BEAM ────────────────
             B·0.016 deals Azzam a 0.33 m section whose dark face reads 0.53 m in profile;
             her broadside measures the deck-edge strip at 0.11–0.33 m (median 0.2). capM
             is that measured face height, where a plate has given one — record-gated, so
             every unmeasured hull keeps the derivation and stays vertex-identical. */
          const r = S.capM ? S.capM / 1.6 : B * 0.016;
          pos.push(q.x, q.y, sgn * (q.hb - r), q.x, q.y + r * 1.6, sgn * (q.hb - r),
                   q.x, q.y + r * 1.6, sgn * (q.hb + r * 0.3), q.x, q.y, sgn * (q.hb + r * 0.3));
        }
        for (let i = 0; i < run.length - 1; i++) {
          const a = start + i * 4, b = a + 4;
          for (let f = 0; f < 4; f++) {
            const c = (f + 1) % 4;
            idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
          }
        }
        base += run.length * 4;
        run = [];
      };
      for (let i = 0; i <= NU; i++) {
        const u = 0.035 + (i / NU) * 0.93;
        if (!open(u)) { flush(); continue; }
        run.push({ x: (u - 0.5) * L + H.rake(u), y: deckAtU(u), hb: halfAtU(u) });
      }
      flush();
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

  /* ── THE WATERWAY: the margin plank at the deck edge ──────────────────────────────
     A laid deck does not run its planks to the skin: the outermost timber is the
     waterway, thicker than the deck, standing proud of it, tarred with the seams —
     the dark band framing every planked deck, and the gutter that carries shipped
     water aft to the scuppers. So it belongs to the DECK, not the hull: any planked
     weather deck gets one (a teak-decked liner as much as a seventy-four), a bare
     steel deck does not, and a hull with no laid deck at all — the record's
     deckLaid: false, the dugout and the voyaging canoe — has no margin to plank.
     It hugs the deck's own edge, asked of surfacePoint like the deck itself. */
  if (deckCovering(S).mode === 1) {
    const pos = [], idx = [];
    const NU = 90; let vbase = 0;
    const w = Math.min(Math.max(B * 0.02, 0.15), 0.45);   // a plank's width, from the beam
    for (const sgn of [-1, 1]) {
      for (let i = 0; i <= NU; i++) {
        const u = 0.035 + (i / NU) * 0.93;
        const e = surfacePoint(S, H, u, 1);
        const x = e[0], fb = e[1], hb = e[2];
        const wu = Math.min(w, hb * 0.55);
        const yT = fb + 0.034, yB = fb - 0.012;           // proud of the deck, heel buried
        pos.push(x, yT, sgn * (hb - wu), x, yT, sgn * hb,
                 x, yB, sgn * hb,       x, yB, sgn * (hb - wu));
      }
      for (let i = 0; i < NU; i++) {
        const a = vbase + i * 4, b = a + 4;
        for (let f = 0; f < 4; f++) {
          const c = (f + 1) % 4;
          idx.push(a + f, b + f, a + c, a + c, b + f, b + c);
        }
      }
      vbase += (NU + 1) * 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const wwMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 0.88 });
    group.add(tag(new THREE.Mesh(g, wwMat), 'waterway'));
  }

  /* ── HATCH GRATINGS: a lattice, because that is what they are ─────────────────────── */
  /* ── A GRATING IS A HALVING JOINT, NOT A STACK OF STICKS ───────────────────────────
     The battens were two crossed layers sitting on top of each other, which is a trellis. A
     real grating is made of ledges notched HALF THROUGH so the two sets interlock flush into
     one board — that is what makes it strong enough to walk on and to take a sea aboard, and
     it is why the holes are square-edged and the surface is flat rather than corrugated.
     Drawn as that board now: one lofted geometry whose top is the flush surface of both sets
     and whose openings are square holes with walls going down through it, replacing the ~20
     loose boxes per hatch (≈1,100 fleet-wide) the old build stacked. The mesh is sized to the
     human body, so it is in METRES, not fractions of beam — openings about three inches
     square, small enough that a heel cannot go through, battens about two and a half inches
     sided, the board three inches deep (established English practice; Steel tables gratings
     at these scantlings for every rate). What shows through the openings is the unlit
     hatchway, so a dark plate lies under the holes: the deck planking does not. */
  const hatchVoid = new THREE.MeshStandardMaterial({ color: 0x0b0906, roughness: 1.0 });
  const quadInto = (acc, p1, p2, p3, p4) => {
    const b = acc.pos.length / 3;
    acc.pos.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
                 p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]);
    const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
    const vx = p4[0] - p1[0], vy = p4[1] - p1[1], vz = p4[2] - p1[2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const m = Math.hypot(n[0], n[1], n[2]) || 1;
    for (let k = 0; k < 4; k++) acc.nrm.push(n[0] / m, n[1] / m, n[2] / m);
    acc.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const accMesh = (acc, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nrm, 3));
    g.setIndex(acc.idx);
    return new THREE.Mesh(g, mat);
  };
  const gratingAt = (u, w, l) => {
    const gg = new THREE.Group();
    const y = deckAtU(u) + B * 0.004;
    const x = (u - 0.5) * L;
    const t = B * 0.013;                                // the coaming module, from the beam
    const BAR = 0.06, PITCH = 0.135;                    // batten sided and hole pitch, metres
    const depth = Math.min(0.075, t + B * 0.004);       // board depth; heel never below the deck
    const yT = y + t, yB = yT - depth;                  // flush top at the old bars' own line
    const nx = Math.max(2, Math.round((l - BAR) / PITCH));
    const nz = Math.max(2, Math.round((w - BAR) / PITCH));
    const px = (l - BAR) / nx, pz = (w - BAR) / nz;     // true pitch, so the frame closes
    const X0 = x - l / 2, Z0 = -w / 2;
    const A = { pos: [], nrm: [], idx: [] };
    const topQ = (x0, x1, z0, z1, yy) =>
      quadInto(A, [x0, yy, z0], [x0, yy, z1], [x1, yy, z1], [x1, yy, z0]);
    /* the top: full-length batten strips, and between them the ledges' tops between holes */
    for (let j = 0; j <= nz; j++) {
      const za = Z0 + j * pz;
      topQ(X0, X0 + l, za, za + BAR, yT);
    }
    for (let j = 0; j < nz; j++) {
      const za = Z0 + j * pz + BAR, zb = Z0 + (j + 1) * pz;
      for (let k = 0; k <= nx; k++) {
        const xa = X0 + k * px;
        topQ(xa, xa + BAR, za, zb, yT);
      }
    }
    /* the holes: four walls each, from the top down through the board, facing inward */
    for (let j = 0; j < nz; j++) {
      const za = Z0 + j * pz + BAR, zb = Z0 + (j + 1) * pz;
      for (let k = 0; k < nx; k++) {
        const xa = X0 + k * px + BAR, xb = X0 + (k + 1) * px;
        quadInto(A, [xa, yB, za], [xa, yT, za], [xa, yT, zb], [xa, yB, zb]);
        quadInto(A, [xb, yB, zb], [xb, yT, zb], [xb, yT, za], [xb, yB, za]);
        quadInto(A, [xb, yB, za], [xb, yT, za], [xa, yT, za], [xa, yB, za]);
        quadInto(A, [xa, yB, zb], [xa, yT, zb], [xb, yT, zb], [xb, yB, zb]);
      }
    }
    gg.add(accMesh(A, wood));
    /* the coaming: the raised rim the grating drops into, which keeps water off the hatch —
       a mitred ring lofted round the hatch in one piece: outer face with its heel buried in
       the deck, a chamfer easing the top outer edge, and an inner face running down past the
       board's own edge, which is the rabbet land the grating rests on */
    const C = { pos: [], nrm: [], idx: [] };
    const sect = [[0.45 * t, y - 0.4 * t],              // outer face foot, in the deck
                  [0.45 * t, y + 1.2 * t],              // chamfer springs here
                  [0.15 * t, y + 1.5 * t],              // top, outboard edge
                  [-0.45 * t, y + 1.5 * t],             // top, inboard edge
                  [-0.45 * t, y + 0.7 * t]];            // inner face, down past the board
    const hx = l / 2, hz = w / 2;
    for (let s = 0; s < sect.length - 1; s++) {
      const [d1, h1] = sect[s], [d2, h2] = sect[s + 1];
      for (const sg of [1, -1]) {
        /* the head-ledge sides of the rim, running athwart at x = ±(hx+d) */
        {
          const A1 = [x + sg * (hx + d1), h1, -(hz + d1)],
                B1 = [x + sg * (hx + d1), h1, +(hz + d1)],
                A2 = [x + sg * (hx + d2), h2, -(hz + d2)],
                B2 = [x + sg * (hx + d2), h2, +(hz + d2)];
          if (sg > 0) quadInto(C, B1, A1, A2, B2);
          else        quadInto(C, A1, B1, B2, A2);
        }
        /* the coamings proper, running fore and aft at z = ±(hz+d) */
        {
          const A1 = [x - (hx + d1), h1, sg * (hz + d1)],
                B1 = [x + (hx + d1), h1, sg * (hz + d1)],
                A2 = [x - (hx + d2), h2, sg * (hz + d2)],
                B2 = [x + (hx + d2), h2, sg * (hz + d2)];
          if (sg > 0) quadInto(C, A1, B1, B2, A2);
          else        quadInto(C, B1, A1, A2, B2);
        }
      }
    }
    gg.add(accMesh(C, pale));
    /* the hatchway under the board: dark, because it opens on the unlit space below */
    const V = { pos: [], nrm: [], idx: [] };
    quadInto(V, [X0, yB + 0.004, Z0], [X0, yB + 0.004, Z0 + w],
                [X0 + l, yB + 0.004, Z0 + w], [X0 + l, yB + 0.004, Z0]);
    gg.add(accMesh(V, hatchVoid));
    return tag(gg, 'grating');
  };
  if (timberShip && laidDeck) [0.30, 0.50, 0.70].forEach(u => {
    const w = halfAtU(u) * 0.85;
    group.add(gratingAt(u, w, L * 0.055));
  });

  /* ── THE CAPSTAN, FROM THE RECORD: `capstan: {whelps, bars, drumDiaM?, paint?}` ─────
     Falconer 1769, CAPSTERN: the whelps "rise out from the main body … like buttresses,
     to enlarge the sweep" and "reach downwards from the lower part of the drum-head to
     the deck"; chocks (ENTREMISES) wedge between them; two iron pawls on deck stop the
     recoil "which might greatly endanger the men who heave"; the men heave "setting
     their breasts against" the bars — so the bar plane is a HUMAN height, not a fraction
     of the beam, and the whole machine clamps to the men who work it. Proportions are
     reads of Falconer pl. II fig 11 (H ≈ 0.86·D, neck 0.82·D flaring to 1.0·D at deck)
     and RMG SLR0338 (bars shipped, tips ≈ 2.5·D out, inner-works red on the 74).
     Until r172 this was drawn by `timberShip && laidDeck` — a Georgian bar capstan on a
     trireme, a Song junk and the Bremen-class cog, with parallel-box whelps floating
     clear of deck and drumhead both, no pawls, and bars at 1.9–2.0 m over the big
     hulls' decks. The record draws it now; silence draws nothing (rule 10). */
  if (S.capstan) {
    const u = 0.62, y = deckAtU(u);
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
    const D = S.capstan.drumDiaM || clampN(B * 0.11, 0.95, 1.55);
    const H = clampN(0.86 * D, 1.15, 1.35);
    const headT = 0.30 * H, whelpH = H - headT;
    const nW = S.capstan.whelps || 6, nB = S.capstan.bars || 6;
    const body = S.capstan.paint === 'red'
      ? (mats.capRed || (mats.capRed = new THREE.MeshStandardMaterial(
          { color: 0x7a3226, roughness: 0.72 })))
      : wood;
    const iron = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
      { color: 0x2a2d31, roughness: 0.52, metalness: 0.55 }));
    const cg = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(D * 0.16, D * 0.16, whelpH, 12), body);
    core.name = 'cap-core'; core.position.y = y + whelpH / 2; cg.add(core);
    /* the whelp: an extruded profile, deck to drumhead underside, outer edge flaring
       from 0.41·D at the neck through the surge to 0.50·D at the deck */
    const wp = new THREE.Shape();
    wp.moveTo(D * 0.13, 0); wp.lineTo(D * 0.50, 0);
    wp.lineTo(D * 0.455, whelpH * 0.38); wp.lineTo(D * 0.41, whelpH);
    wp.lineTo(D * 0.13, whelpH); wp.closePath();
    const wGeo = new THREE.ExtrudeGeometry(wp, { depth: D * 0.15, bevelEnabled: false });
    wGeo.translate(0, 0, -D * 0.075);
    for (let i = 0; i < nW; i++) {
      const w = new THREE.Mesh(wGeo, body);
      w.name = 'cap-whelp'; w.position.y = y; w.rotation.y = -(i / nW) * Math.PI * 2;
      cg.add(w);
    }
    /* the chocks — Falconer's entremises, "small wedges … placed between the whelps",
       one band under the drumhead and one at the foot */
    const ch = new THREE.Shape();
    ch.moveTo(D * 0.16, 0); ch.lineTo(D * 0.40, 0);
    ch.lineTo(D * 0.37, whelpH * 0.14); ch.lineTo(D * 0.16, whelpH * 0.14); ch.closePath();
    const chGeo = new THREE.ExtrudeGeometry(ch, { depth: D * 0.13, bevelEnabled: false });
    chGeo.translate(0, 0, -D * 0.065);
    for (let i = 0; i < nW; i++) {
      const a = ((i + 0.5) / nW) * Math.PI * 2;
      for (const yy of [y + whelpH * 0.02, y + whelpH * 0.82]) {
        const c = new THREE.Mesh(chGeo, body);
        c.name = 'cap-chock'; c.position.y = yy; c.rotation.y = -a;
        cg.add(c);
      }
    }
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(D * 0.50, D * 0.46, headT, 20), body);
    head.name = 'cap-head'; head.position.y = y + whelpH + headT / 2; cg.add(head);
    const barY = y + H - headT / 2;                     // breast height by construction
    for (let i = 0; i < nB; i++) {                      // shipped, as the model ships them
      const a = (i / nB) * Math.PI * 2;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(D * 0.020, D * 0.026, D * 2.1, 8), pale);
      bar.name = 'cap-bar';
      bar.rotation.z = Math.PI / 2; bar.rotation.y = a;
      bar.position.set(Math.cos(a) * D * 1.35, barY, Math.sin(a) * D * 1.35);
      cg.add(bar);
    }
    for (const sgn of [1, -1]) {                        // the pawls, on deck, in the intervals
      const p = new THREE.Mesh(new THREE.BoxGeometry(D * 0.22, D * 0.05, D * 0.06), iron);
      p.name = 'cap-pawl';
      const a = (0.5 / nW) * Math.PI * 2 + (sgn > 0 ? 0 : Math.PI);
      p.position.set(Math.cos(a) * D * 0.52, y + D * 0.025, Math.sin(a) * D * 0.52);
      p.rotation.y = -a;
      cg.add(p);
    }
    cg.position.x = (u - 0.5) * L;
    group.add(tag(cg, 'capstan'));
  }

  /* ── THE WINDLASS, FROM THE RECORD:
     `windlass: {atU, barrelLenM, barrelDiaM, postHM?, throughBars?}`
     Three traditions, each in its record's place. The Bremen cog's (r173): athwartships at
     the aftcastle, forward of the helm (Ellmers, DSM), barrel 4.5 × 0.60 m (the Kiel
     replica's build record, Baykowski 1991). The Chinese bow machine (r174): Xu Jing
     watched it worked in 1124 — 船首兩頰柱中，有車輪，上綰藤索 — a wheel between the two
     cheek-posts at the head, the cable wound on it; the Tiangong Kaiwu (1637) names the
     machine (雲車) and the two bow posts the cable belays to (將軍柱). When the record
     gives postHM, the standards are those mooring posts, rising past the barrel to take
     the cable's turns. The Korean horong (r175): the Joseon navy's own album (the
     Gakseondobon, c. 1797) draws it at the bow of the grain ship, and the living
     tradition gives its working — two long bars through the drum, crossed, four men;
     the record says throughBars and the bars straddle the axis. Falconer's WINDLASS
     supplies the class mechanism, named as
     defaults in the provenance: a timber "supported at the two ends by two frames of
     wood", turned by handspikes "thrust into holes bored through the body", its "lower
     part ... about a foot above the deck" — so the axis stands at 0.30 + D/2 over the
     deck, clamped to [0.45, 0.90] m: a standing man levers the spike, and no record can
     move the work out of his reach. The barrel is eight-square: a baulk is worked
     eight-square where the holes are bored. Silence draws nothing: only a windlass
     record draws one. */
  if (S.windlass) {
    const u = S.windlass.atU || 0.5, y = deckAtU(u);
    const clampW = (v, a, b) => Math.max(a, Math.min(b, v));
    const len = S.windlass.barrelLenM || B * 0.55;
    const D = S.windlass.barrelDiaM || 0.5;
    const axisY = y + clampW(0.30 + D / 2, 0.45, 0.90);
    const wg = new THREE.Group();
    /* the barrel: eight flats, non-indexed so the normals are the faces' own */
    const bGeo = new THREE.CylinderGeometry(D / 2, D / 2, len, 8, 1).toNonIndexed();
    bGeo.computeVertexNormals();
    const bar = new THREE.Mesh(bGeo, wood);
    bar.name = 'win-barrel'; bar.rotation.x = Math.PI / 2;
    bar.position.y = axisY; wg.add(bar);
    /* the standards — Falconer's "two frames of wood", or, where the record gives
       postHM, the Chinese tradition's mooring posts (頰柱/將軍柱) rising past the
       barrel — with the journal turning in each */
    const stH = S.windlass.postHM || (axisY - y) + D * 0.42;
    for (const sg of [1, -1]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.30, stH, 0.26), wood);
      st.name = 'win-standard';
      st.position.set(0, y + stH / 2, sg * (len / 2 + 0.13));
      wg.add(st);
      const j = new THREE.Mesh(
        new THREE.CylinderGeometry(D * 0.18, D * 0.18, 0.32, 10), wood);
      j.name = 'win-journal'; j.rotation.x = Math.PI / 2;
      j.position.set(0, axisY, sg * (len / 2 + 0.10));
      wg.add(j);
    }
    /* the bars: Falconer's two handspikes shipped in the bored holes as the crew left
       them — or, where the record says throughBars, the Korean horong's pair (r175):
       two long bars PASSING THROUGH the drum at different stations, crossed, a man's
       grip at each of the four ends — "긴 막대 2개를 다른 위치에서 관통하게 만들어야
       튼튼하다", the living tradition's own structural sentence */
    if (S.windlass.throughBars) {
      /* at rest the bars lie LOW — a bar longer than twice the axis height cannot
         stand near the vertical without stabbing the deck (measure_ship caught the
         first draft doing exactly that), and the rebuilt grain ship's photo shows
         them left near-horizontal */
      for (const [zf, ang] of [[-0.20, 1.15], [0.28, -1.15]]) {
        const spL = 2.0;
        const sp = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, spL, 8), pale);
        sp.name = 'win-bar';
        sp.rotation.z = ang;
        sp.position.set(0, axisY, zf * len);
        wg.add(sp);
      }
    } else {
      for (const [zf, ang] of [[-0.22, 0.55], [0.30, -0.35]]) {
        const spL = 1.7, seat = 0.22;
        const sp = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.030, spL, 8), pale);
        sp.name = 'win-spike';
        sp.rotation.z = ang;
        const dx = -Math.sin(ang), dy = Math.cos(ang);
        sp.position.set(dx * (spL / 2 - seat), axisY + dy * (spL / 2 - seat), zf * len);
        wg.add(sp);
      }
    }
    wg.position.x = (u - 0.5) * L;
    group.add(tag(wg, 'windlass'));
  }

  /* ── THE COMPOSITE GRAPNEL, FROM THE RECORD:
     `grapnel: {atU, spanM, bellDiaM, bellHM, shankM, armDiaM?, shankDiaM?}`
     The Belitung wreck's own anchor (Flecker 2001; Flecker in Krahl et al. 2010, figs.
     84–85): four wrought-iron arms protruding straight outward, crossing at two levels,
     separated vertically by a heavy bell-shaped cast-iron disk with a hole through its
     centre for the wooden shank; only the shank's lower end survived. Every dimension
     here is read off fig. 84 against its own 100 cm scale bar except the shank's
     length, which is a reconstruction the provenance names. The stow is the
     tradition's documented one — loose on deck at the bow (Lockerbie; the Maqāmāt
     images hang theirs at the prow) — so the anchor lies as a dumped grapnel lies:
     spun 45° on its own shank so two arms splay to the deck and two stand up, crown
     riding on the splayed pair, shank head down on the planking. The group is settled
     onto the deck by its own measured bounding box, not by trigonometry, so the arm
     tips land ON the deck at any span. Silence draws nothing: only a grapnel record
     draws one. */
  if (S.grapnel) {
    const gp = S.grapnel;
    const u = gp.atU || 0.10, yD = deckAtU(u);
    const span = gp.spanM || 1.72;
    const bellD = gp.bellDiaM || 0.55, bellH = gp.bellHM || 0.13;
    const shankL = gp.shankM || 1.8;
    const armD = gp.armDiaM || 0.10, shD = gp.shankDiaM || 0.16;
    const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
      { color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
    const g = new THREE.Group();
    /* upright local frame, origin at the bell's centre, shank along +Y.
       One arm pair above the bell, the crossing pair below — fig. 84's own stack. */
    for (const [lvl, dirZ] of [[1, false], [-1, true]]) {
      const yA = lvl * (bellH / 2 + armD * 0.55);
      for (const sg of [1, -1]) {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(armD * 0.40, armD * 0.50, span / 2, 10), ironG);
        arm.name = 'grap-arm';
        if (dirZ) { arm.rotation.x = Math.PI / 2; arm.position.set(0, yA, sg * span / 4); }
        else      { arm.rotation.z = Math.PI / 2; arm.position.set(sg * span / 4, yA, 0); }
        g.add(arm);
        /* the drawn tips swell — the plate's own read, concretion and all */
        const tip = new THREE.Mesh(new THREE.SphereGeometry(armD * 0.62, 10, 8), ironG);
        tip.name = 'grap-tip';
        tip.position.set(dirZ ? 0 : sg * span / 2, yA, dirZ ? sg * span / 2 : 0);
        g.add(tip);
      }
    }
    /* the bell: flaring downward, apex up, the shank through its centre hole */
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(shD * 0.62, bellD / 2, bellH, 16), ironG);
    bell.name = 'grap-bell';
    g.add(bell);
    /* the shank: hardwood, its foot protruding below the bell as the plate draws it */
    const yLo = -(bellH / 2 + armD + 0.12);
    const sh = new THREE.Mesh(
      new THREE.CylinderGeometry(shD * 0.44, shD * 0.50, shankL, 12), wood);
    sh.name = 'grap-shank';
    sh.position.y = yLo + shankL / 2;
    g.add(sh);
    /* stow: lay the shank aft along the deck, dipping to put the head on the planking,
       spun 45° so the arm cross rests as a tripod — two tips down, two up — and yawed
       a little to port so the head and its cable land BESIDE the foremast's step, not
       on it (measured: the axis-aligned first draft put the head at u 0.165 against a
       mast foot at u 0.145) */
    const hC = span / 2 * 0.707 + armD * 0.62;
    const tilt = Math.asin(Math.max(0, Math.min(0.6, (hC - shD / 2) / shankL)));
    const q = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), gp.yaw != null ? gp.yaw : 0.30);
    q.multiply(new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -(Math.PI / 2 + tilt)));
    q.multiply(new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4));
    g.quaternion.copy(q);
    g.position.set((u - 0.5) * L, yD, gp.offZ || 0);
    /* settle onto the deck by measurement, not trigonometry */
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    g.position.y += (yD - bb.min.y);
    /* the coir cable: bent round the shank head, the rest flaked in a coil beside it —
       coil and cable each rest on the deck at their OWN station (the sheer falls going
       aft, so a coil set at the crown's deck height would float at its own) */
    g.updateMatrixWorld(true);
    const headW = new THREE.Vector3(0, yLo + shankL, 0).applyMatrix4(g.matrixWorld);
    const coilC = new THREE.Vector3(headW.x + 0.10, 0, headW.z - 0.45);
    coilC.y = deckAtU(coilC.x / L + 0.5) + 0.055;
    const coil = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.055, 8, 20), mats.ropeSolid || wood);
    coil.name = 'grap-coil';
    coil.rotation.x = Math.PI / 2;
    coil.position.copy(coilC);
    const mid = headW.clone().lerp(coilC, 0.5);
    mid.y = deckAtU(mid.x / L + 0.5) + 0.06;
    const cable = ropeMesh([[headW, mid], [mid, coilC.clone().add(new THREE.Vector3(0, 0.03, 0))]],
                           0.028, mats.ropeSolid || wood);
    const ag = new THREE.Group();
    ag.add(g); ag.add(coil);
    /* named like every other anchor's cable (st-/wa-/ia-), so the rest rule can
       ask about the iron without the cordage in its box */
    if (cable) { cable.name = 'grap-cable'; ag.add(cable); }
    group.add(tag(ag, 'grapnel'));
  }

  /* ── THE STONE ANCHOR, FROM THE RECORD:
     `stoneAnchor: {atU?, armLenM?, armWM?, armDM?, hornM?, hornOffM?, seatM?,
                    battenM?, stoneLenM?, stoneWM?, stoneTM?, cableDiaM?, offZ?}`
     Xu Jing's own sentence (Gaoli tujing 1124, 卷34 — the same passage that drew the
     r174 windlass): 下垂矴石，石兩旁，夾以二木鈎 — below the winch hangs the
     anchor-stone, clamped on its two sides by two wooden hooks, on a rattan cable
     thick as a rafter. Since r199 the FORM is the excavated one: the two-shank
     stone-insert anchor of the 2017 마도해역 시굴조사 보고서 — two cheek timbers,
     seat faces inward the stone's thickness apart, each sweeping outward to a
     curved fluke point; cross battens tenoned through the arm's three square
     mortises; the stone through the gap near the butt, its ends projecting both
     sides as the STOCK, forcing the fluke plane vertical on the bottom. Timber
     dimensions are the 마도해역-212 arm's, measured off the report's 1/10 drawing
     (4.06 px/cm against its 50 cm bar); the stone is the same find's printed
     record — the pair was raised still articulated (결구된 채), the one find in
     the tradition where arm and stone are one object. A printed same-form
     sibling exists since r203: the 송호리1호선 report (2025) catalogues a
     one-piece oak half at 149.5 cm aboard a hull dated AD 1021–1158 — print
     agreeing with the drawing-measured 1.49 m to half a centimetre. The stone's two broad faces
     are what the cheeks clamp: 石兩旁 lands on the artifact exactly. The drawn
     ship is under way, so the anchor rides recovered (遇行則卷其輪而收之): laid on
     the open foredeck between the stem and its own windlass, head aft, the cable
     bent round the mid batten where the report's own schematic wraps it and led
     to the barrel (上綰藤索). The assembly is cruciform in section — horns one
     axis, stone the other — so flat-on-deck is impossible: it lies at repose,
     rolled onto one stone end and one horn, then settled to the deck by
     measurement. Dimensions default to the 212 record. Silence draws nothing:
     only a stoneAnchor record draws one. */
  if (S.stoneAnchor) {
    const sa = S.stoneAnchor;
    const u = (sa.atU != null) ? sa.atU : -0.02;
    const armL = sa.armLenM || 1.49, armW = sa.armWM || 0.16,
          armD = sa.armDM || 0.15;
    const hornM = sa.hornM || 0.81, hornOff = sa.hornOffM || 0.285;
    const seatM = sa.seatM || 1.15;
    const batt = sa.battenM || [0.58, 0.90, 1.37];
    const stoneL = sa.stoneLenM || 1.09, stoneW = sa.stoneWM || 0.29,
          stoneT = sa.stoneTM || 0.10;
    const cabR = (sa.cableDiaM || 0.10) / 2;
    const offZ = sa.offZ || 0;
    const stoneM = mats.anchStone || (mats.anchStone = new THREE.MeshStandardMaterial(
      { color: 0x7d7a70, roughness: 0.92, metalness: 0.02 }));
    const g = new THREE.Group();
    /* local frame: fluke tips at y 0 (the cable end), -Y down the run to the
       butt; the horns splay ±z, the stone crosses ±x */
    const bodyL = armL - hornM;
    for (const sg of [1, -1]) {
      const zc = sg * (stoneT + armD) / 2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(armW, bodyL, armD), wood);
      body.name = 'st-cheek';
      body.position.set(0, -(hornM + bodyL / 2), zc);
      g.add(body);
      /* the fluke sweep, the 212 arm's own curve: off-axis toward the face
         opposite the seats, the tip 0.285 out over the outer 0.81 of run,
         depth tapering to the drawn ~0.07 point */
      const NSEG = 5, tipL = 0.12;
      const zAt = t => zc + sg * hornOff * t * t;
      const yAt = t => -hornM * (1 - t);
      const dAt = t => armD * (1 - t) + 0.07 * t;
      const tCap = 1 - tipL / hornM;
      for (let i = 0; i < NSEG; i++) {
        const t0 = tCap * i / NSEG, t1 = tCap * (i + 1) / NSEG;
        const dy = yAt(t1) - yAt(t0), dz = zAt(t1) - zAt(t0);
        const seg = new THREE.Mesh(
          new THREE.BoxGeometry(armW, Math.hypot(dy, dz) + 0.02,
                                dAt((t0 + t1) / 2)), wood);
        seg.name = 'st-cheek';
        seg.rotation.x = Math.atan2(dz, dy);
        seg.position.set(0, (yAt(t0) + yAt(t1)) / 2, (zAt(t0) + zAt(t1)) / 2);
        g.add(seg);
      }
      /* the point — one cone per cheek, the audit's structural find */
      const dyT = yAt(1) - yAt(tCap), dzT = zAt(1) - zAt(tCap);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(dAt(tCap) * 0.5, tipL, 10), wood);
      tip.name = 'st-tip';
      tip.rotation.x = Math.atan2(dzT, dyT);
      tip.position.set(0, (yAt(tCap) + yAt(1)) / 2, (zAt(tCap) + zAt(1)) / 2);
      g.add(tip);
    }
    /* the stone through the gap: length ±x (the stock's own axis), width along
       the run in the drawn 0.25 m waist seats, thickness filling the gap —
       the cheeks clamp its two broad faces, 石兩旁 */
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(stoneL, stoneW, stoneT), stoneM);
    stone.name = 'st-stone';
    stone.position.set(0, -seatM, 0);
    g.add(stone);
    /* battens through the arm's three square mortises, standing just proud of
       both cheeks — the joint is pegged, not lashed */
    for (const by of batt) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.055, stoneT + 2 * armD + 0.04), wood);
      b.name = 'st-batten';
      b.position.set(0, -by, 0);
      g.add(b);
    }
    /* stow: shank fore-and-aft on the foredeck, head aft toward the windlass —
       rotZ(-90°) maps local +Y aft — pitched to the deck's own gradient (the
       r183 measure), then ROLLED about its own shank: the assembly is cruciform
       in section and a rigid cruciform on a plane rests on two adjacent limbs,
       one stone end and one horn low. Flat-on-deck would stab a horn through
       the planking. */
    const uH = Math.max(0, u), uT = Math.max(0, u - (armL + 0.6) / L);
    const slope = (uH - uT) > 1e-6
      ? (deckAtU(uH) - deckAtU(uT)) / ((uH - uT) * L) : 0;
    g.rotation.z = -Math.PI / 2 + Math.atan(slope);
    g.rotation.x = 0.87;
    const yD = deckAtU(uH);
    g.position.set((u - 0.5) * L, yD, offZ);
    /* settle onto the deck by measurement, not trigonometry (the grapnel's own rule) */
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    g.position.y += (yD - bb.min.y);
    g.updateMatrixWorld(true);
    /* the rattan cable: a wrap round the mid batten — where the report's own
       complete-form schematic bends it on — led out between the horns to the
       barrel, where the text winds the rest (上綰藤索); no coil on deck */
    const yBend = -(batt.length > 1 ? batt[1] : 0.90);
    const wrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.055 + cabR, cabR, 8, 20), mats.ropeSolid || wood);
    wrap.name = 'st-cable';
    wrap.position.set(0, yBend, 0);
    g.add(wrap);
    g.updateMatrixWorld(true);
    const bend = new THREE.Vector3(0, yBend + 0.09, 0).applyMatrix4(g.matrixWorld);
    const wl = S.windlass;
    const uW = wl ? (wl.atU || 0.10) : 0.10;
    const barrelPt = new THREE.Vector3(
      (uW - 0.5) * L - (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2,
      deckAtU(uW) + 0.30 + (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2, offZ * 0.4);
    const cable = ropeMesh([[bend, barrelPt]], cabR, mats.ropeSolid || wood);
    const ag = new THREE.Group();
    ag.add(g);
    if (cable) { cable.name = 'st-cable'; ag.add(cable); }
    group.add(tag(ag, 'stoneAnchor'));
  }

  /* ── THE FOUR-CLAW IRON ANCHORS, FROM THE RECORD:
     `ironAnchors: {sheetAtU?, pairAtU?, pairOffZ?, sheetLenM?, bowerLenM?,
                    sternAtU?, sternOffZ?, sternLenM?, yaw?}`
     The Tiangong Kaiwu carries this object in two chapters. 錘鍛 gives the FORM
     (fetched whole, r184): 錘法先成四爪，以次逐節接身 — the forging method first
     makes the four claws, then joins them section by section to the shank; war-ships
     and sea-ships carry anchors up to a thousand jun; the anchor is the largest thing
     under furnace and hammer. 舟車 gives the INVENTORY (r174's own text): five or six
     iron anchors to a grain ship, the mightiest the 看家錨 at about 500 catties
     RECORDED, two worked at the head, two at the stern, the cable belayed to the two
     general's-posts and broken out by the yun-che windlass. No text gives a dimension:
     lengths are CALIBRATED from the excavated corpus (r188) — the Penglai naval-fortress
     anchor of 1984, 全長 2.15 m at 456 kg (Matsui 2013 fig. 3, after 王冠倬 2000),
     cube-scales the recorded 500-catty (~295 kg) sheet to 1.86 m full length and the
     300-catty pair inference to 1.57 m; part proportions are MEASURED from the same
     find's own drawing (r189, fig. 3a self-scaled); member SECTIONS are SOLVED from
     each anchor's recorded weight at 7850 kg/m³, their ratios from the same
     harbour's 2005 caliper record (r190) — all named in the provenance. The record fields carry the FULL crown-to-ring length
     a find's 全長 measures (the r187 yotsume convention): the builder splits it so the
     drawn ring top lands at the field's value. Drawn recovered, all five: the bow-worked three on the foredeck,
     the stern pair (梢用二枝, r185) on the poop's top tier roof — the surface the ray
     map measured continuous and clear, and the one the after-sheets are already
     worked from. Each lies as the fleet's stowed anchors lie (r182/r183), spun 45°
     so two claws splay to the planking and two stand up, pitched to its surface's
     own gradient, settled onto it by its own measured box. Cables: the head pair's
     led to the two general's-posts the text belays them to, the sheet's to the
     barrel that breaks it out; the stern pair's — no text names a stern belay —
     flaked in coils beside them. Silence draws nothing: only an ironAnchors record
     draws them. */
  if (S.ironAnchors) {
    const ia = S.ironAnchors;
    const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
      { color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
    const ag = new THREE.Group();
    const wl = S.windlass;
    const uW = wl ? (wl.atU || 0.10) : 0.10;
    const wLen = wl ? (wl.barrelLenM || B * 0.55) : B * 0.55;
    const wDia = wl ? (wl.barrelDiaM || 0.5) : 0.5;
    /* one anchor: origin at the crown's centre, shank along +Y to the head eye.
       fullL is the find convention's 全長 — crown BOTTOM to ring top — and the parts
       are placed so that span equals the field exactly. Proportions are MEASURED from
       the calibrator's own drawing (Matsui 2013 fig. 3a, the Penglai find, r189 —
       fig3a self-scales at 全長 2.15 m, read at 322.8 px/m; fractions of 全長): the
       claw springs at the shank foot, runs near-flat to r 0.14, rises through an
       elbow to its point at (0.339, +0.201) — the in-plane pair's mean; the head
       is a small forged eye 0.062 wide. Sections are NOT the plate's: its line
       weights starve the iron to a third of the recorded mass (r190). */
    const IA_P = {
      crownR: 0.0391,                    /* crown ball — bottom lands at −0.0391 */
      ringR: 0.0216, ringT: 0.0095,      /* the eye: centre radius, tube */
      claw: [[0.000, 0.035], [0.140, 0.060],   /* [r, y] centreline stations —  */
             [0.260, 0.135], [0.315, 0.180]],  /* the plate's own (r189)        */
      tip: [0.339, 0.201],               /* the measured point the cone lands on */
      /* SECTIONS (r190): the plate's line weights starved the iron — they summed
         to 156 kg against the find's captioned 456. Section RATIOS are the same
         harbour's caliper record (the 2005 dredge brief: shank ⌀8.5 to claw ⌀7,
         one diameter over the claw's length, a fall to the point); the absolute
         scale t is SOLVED per anchor below so the drawn iron weighs the record's
         own mass. Fractions of 全長 at t = 1. */
      shTop: 0.01932, shBot: 0.0253,
      clawS: [0.01838, 0.01838, 0.01562, 0.01103]
    };
    /* iron volume of one anchor as a fraction of 全長³ at section scale t —
       crown ball and head eye are the plate's (r189) and stay fixed; shank and
       claw sections scale. The audit integrates this same sum from the built
       scene (V-MASS). */
    const iaFrus = (r0, r1, h) => Math.PI * h / 3 * (r0 * r0 + r0 * r1 + r1 * r1);
    const iaVolF = (t) => {
      let v = 4 / 3 * Math.PI * Math.pow(IA_P.crownR, 3)
            + 2 * Math.PI * Math.PI * IA_P.ringR * IA_P.ringT * IA_P.ringT;
      const ringC = 1 - IA_P.crownR - IA_P.ringR - IA_P.ringT;
      v += iaFrus(IA_P.shBot * t, IA_P.shTop * t, ringC - IA_P.ringR);
      let c = 0;
      for (let s = 0; s + 1 < IA_P.claw.length; s++)
        c += iaFrus(IA_P.clawS[s] * t, IA_P.clawS[s + 1] * t,
                    Math.hypot(IA_P.claw[s + 1][0] - IA_P.claw[s][0],
                               IA_P.claw[s + 1][1] - IA_P.claw[s][1]));
      const last = IA_P.claw[IA_P.claw.length - 1];
      c += Math.PI * Math.pow(IA_P.clawS[3] * t, 2)
         * Math.hypot(IA_P.tip[0] - last[0], IA_P.tip[1] - last[1]) / 3;
      return v + 4 * c;
    };
    const makeAnchor = (fullL, kg) => {
      /* the mass solve: the record's weight is the one dimension the 舟車 text
         gives — wrought iron 7850 kg/m³, bisect t so drawn iron = the record */
      const need = kg / (7850 * fullL * fullL * fullL);
      let lo = 0.2, hi = 6;
      for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        if (iaVolF(mid) < need) lo = mid; else hi = mid;
      }
      const t = (lo + hi) / 2;
      const g2 = new THREE.Group();
      g2.name = 'ia-grp';
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(fullL * IA_P.crownR, 10, 8), ironG);
      crown.name = 'ia-crown'; g2.add(crown);
      const ringC = fullL * (1 - IA_P.crownR - IA_P.ringR - IA_P.ringT);
      const shankL = ringC - fullL * IA_P.ringR;
      const sh = new THREE.Mesh(
        new THREE.CylinderGeometry(fullL * IA_P.shTop * t, fullL * IA_P.shBot * t,
                                   shankL, 10), ironG);
      sh.name = 'ia-shank'; sh.position.y = shankL / 2; g2.add(sh);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(fullL * IA_P.ringR, fullL * IA_P.ringT, 8, 18), ironG);
      ring.name = 'ia-ring'; ring.position.y = ringC; g2.add(ring);
      /* four claws at 90°, each the measured polyline — cylinder sections between
         the plate's own stations, a cone to the measured point */
      for (let k = 0; k < 4; k++) {
        const cg2 = new THREE.Group();
        cg2.rotation.y = k * Math.PI / 2;
        const P = IA_P.claw.map((p, pi) =>
          [p[0] * fullL, p[1] * fullL, IA_P.clawS[pi] * t * fullL]);
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
    };
    /* stow one anchor lying on its surface: crown at u, head aft, spun 45° on its
       own shank, pitched to the surface's gradient over its own length, settled by
       measurement (the r182/r183 rules). The surface defaults to the weather deck;
       the stern pair passes the poop top's own function (r185). */
    const stow = (g2, fullL, u, offZ, surf) => {
      const sAt = surf || deckAtU;
      const uA = Math.min(1, u + fullL / L);
      const s = (uA - u) > 1e-6
        ? (sAt(uA) - sAt(u)) / ((uA - u) * L) : 0;
      const q = new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(0, 1, 0), ia.yaw || 0);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), -Math.PI / 2 + Math.atan(s)));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), Math.PI / 4));
      g2.quaternion.copy(q);
      const yD = sAt(u);
      g2.position.set((u - 0.5) * L, yD, offZ);
      g2.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(g2);
      g2.position.y += (yD - bb.min.y);
      g2.updateMatrixWorld(true);
      /* the ring's world point, for the cable */
      return new THREE.Vector3(
        0, fullL * (1 - IA_P.crownR - IA_P.ringR - IA_P.ringT), 0)
        .applyMatrix4(g2.matrixWorld);
    };
    const cableTo = (from, to, r) => {
      const mid = from.clone().lerp(to, 0.5);
      mid.y = deckAtU(Math.max(0, Math.min(1, mid.x / L + 0.5))) + 0.07;
      const c = ropeMesh([[from, mid], [mid, to]], r, mats.ropeSolid || wood);
      if (c) { c.name = 'ia-cable'; ag.add(c); }
    };
    /* the sheet anchor, centreline, forward of the pair */
    if (ia.sheetLenM !== 0) {
      const fL = ia.sheetLenM || 1.86;
      const g2 = makeAnchor(fL, ia.sheetKg || 295);
      const ringP = stow(g2, fL, ia.sheetAtU != null ? ia.sheetAtU : 0.030, 0);
      ag.add(g2);
      /* its cable — the one the text names 本身 — led to the barrel that lifts it */
      const barrelPt = new THREE.Vector3(
        (uW - 0.5) * L - wLen * 0.18, deckAtU(uW) + 0.30 + wDia / 2, 0);
      cableTo(ringP, barrelPt, 0.035);
    }
    /* the head pair, one to each side, cables to their own general's-posts */
    if (ia.bowerLenM !== 0) {
      const fL = ia.bowerLenM || 1.57;
      for (const sg of [1, -1]) {
        const g2 = makeAnchor(fL, ia.bowerKg || 177);
        const ringP = stow(g2, fL, ia.pairAtU != null ? ia.pairAtU : 0.060,
                           sg * (ia.pairOffZ || 2.4));
        ag.add(g2);
        const postPt = new THREE.Vector3(
          (uW - 0.5) * L, deckAtU(uW) + 0.55, sg * (wLen / 2 + 0.13));
        cableTo(ringP, postPt, 0.030);
      }
    }
    /* the stern pair (梢用二枝): stations RECORDED, surface MEASURED (r185 ray map,
       build/staging/r185): the poop's top tier roof is continuous u 0.68–1.00 at
       sheer + dh·(tiers + 0.02), ~11 m clear abeam at the stern stations — and it is
       already the drawn ship's aft working deck: the junk after-sheets land on it
       (the crowfoot rule above). The stern BELAY is in no text: each cable is bent
       to its ring and flaked in a coil beside it — a stow, not an invented lead
       (the r182 grapnel standing). Coil from rope segments, never a torus: the
       audit counts anchors by their ring tori. */
    if (ia.sternAtU != null && ia.sternLenM !== 0 && S.poop && S.poop.length === 3) {
      const fL = ia.sternLenM || 1.57;
      const dhP = B * 0.115;
      const poopTop = u => deckAtU(u) + dhP * (S.poop[2] + 0.02);
      const ropeM = mats.ropeSolid || wood;
      for (const sg of [1, -1]) {
        const g2 = makeAnchor(fL, ia.sternKg || 177);
        const zA = sg * (ia.sternOffZ || 2.4);
        const ringP = stow(g2, fL, ia.sternAtU, zA, poopTop);
        ag.add(g2);
        /* the coil: two flaked rings just aft of the ring, inboard, on the same roof */
        const cu = ia.sternAtU + (fL + 0.55) / L;
        const coilC = new THREE.Vector3(
          (cu - 0.5) * L, poopTop(cu) + 0.055, sg * ((ia.sternOffZ || 2.4) - 0.55));
        const segs = [];
        for (let k = 0; k < 10; k++) {
          const a1 = (k / 10) * 2 * Math.PI, a2 = ((k + 1) / 10) * 2 * Math.PI;
          for (const [rr, dy] of [[0.33, 0], [0.24, 0.055]])
            segs.push([new THREE.Vector3(coilC.x + Math.cos(a1) * rr, coilC.y + dy,
                                         coilC.z + Math.sin(a1) * rr),
                       new THREE.Vector3(coilC.x + Math.cos(a2) * rr, coilC.y + dy,
                                         coilC.z + Math.sin(a2) * rr)]);
        }
        const coil = ropeMesh(segs, 0.030, ropeM);
        if (coil) { coil.name = 'ia-coil'; ag.add(coil); }
        /* the cable: ring down to the coil's near edge */
        const cEnd = new THREE.Vector3(coilC.x, coilC.y + 0.09, coilC.z + sg * 0.33);
        const cMid = ringP.clone().lerp(cEnd, 0.5);
        cMid.y = Math.max(cEnd.y + 0.05, ringP.y - 0.18);
        const cb = ropeMesh([[ringP, cMid], [cMid, cEnd]], 0.030, ropeM);
        if (cb) { cb.name = 'ia-cable'; ag.add(cb); }
      }
    }
    group.add(tag(ag, 'ironAnchors'));
  }

  /* ── THE KOREAN WOODEN ANCHOR AND ITS STONE, FROM THE RECORD ────────────────────────
     `woodAnchor: {atU?, offZ?, yaw?, shankM?, armM?, arms?, stoneLenM?,
                   stoneWM?, stoneTM?, stoneKg?, stoneSecM?, cableDiaM?}`
     The composite the West Sea record preserves: an oak shank (닻채), hook-arms hung
     both sides of it (닻가지 — TWO on every stock-anchor the form study draws:
     그림 16 A–D, the stone-stock schematic 그림 17, and all six artifact
     reconstructions; the dictionary's '보통 네 갈고리' is CONTESTED as the
     stockless hooked form, the study's E, whose analogue is a modern grapnel),
     and a long rectangular anchor-stone (닻돌) lashed across the shank's face to
     sink the frame — 154 such stones lifted off Taean/Incheon 2008–2019, rope
     grooves cut for the lashing, the wooden anchors beside them radiocarbon-dated
     2nd c. BC through Joseon. The stone IS the stock: the 2023 report 『한국의
     닻돌』 calls it 석제 닻장, and the form study the report itself cites — 홍광희
     2013, 「전통 나무닻의 생김새 연구」, 해양문화재 6, 107–143 (fetched whole,
     r195) — argues a wooden crossbar beside a stone stock is redundant and draws
     none; its survey of the picture sources also puts the traditional wooden stock,
     where one IS used, at the ARMS' top height, never at the cable end the way a
     modern anchor wears it. The pre-r195 form drew exactly that modern crossbar,
     and V-WSTOCK now convicts it. SHANK LENGTH derives from the stone: the
     institute's reconstruction figure draws stone/shank ST_RATIO 0.51 (measured
     r194/r195), and the study names the mechanism — the shank made long against
     the wood's own buoyancy — so a record with no shankM takes stoneLenM /
     ST_RATIO; V-WSHANK audits by the same constant. Station and frame are the
     figure's (r194): stone centre ST_FRAC 0.55 of the shank above the foot
     (figure 0.57, 표민대화 중앙부); arms are timbers CROSSING the shank at XA_FRAC
     0.35 above the foot (figure 0.35), whipped at staggered stations, carved
     points splayed below, blunt upper ends DERIVED up to the stone's underside so
     they brace it at any shank length; a spreader board across the splay; two
     treenails pinned through each crossing (표민대화 draws two 나무못 at the
     joint, and both separately-made arms recovered carry two peg holes — Hong
     2013 artifacts ④⑥). The ARM TIMBER itself is RECORDED since r197:
     진도-641, the Jindo arm (= artifact ④), catalogued at 190 × 19.6 cm in
     the Myeongnyang report Ⅰ (2015, p. 467) — ARM_LEN/ARM_SEC below, the
     whole drawn run root to point held to the record. CONTESTED, the joint:
     that artifact's own peg stations sit 0.35–0.55 m from its lap-notched
     root, the economy of Hong's foot-rooted variant, not the drawn crossed
     frame's longer blunt limb — the institute's frame stays the drawn one,
     the artifact's stations named. The cable seized to the shank head with whipped turns,
     the figure's own detail. Lashing: end turns in the stone's grooves, crossed
     frapping over the midbody (the 2021 reproduction). No stone has been found
     still lashed on — the report says so, and the provenance carries it. The
     drawn ship is under way, so the anchor lies recovered on the foredeck (the
     fleet stow, r182–r185): shank fore-and-aft with the arms forward, rolled 45°
     so no member stands upright, pitched to the deck's own gradient, settled by
     box; the cable bent at the shank head and led to the horong's barrel, where
     the machine holds the rest — no coil on deck. Silence draws nothing: only a
     woodAnchor record draws one. */
  if (S.woodAnchor) {
    const wa = S.woodAnchor;
    const u = (wa.atU != null) ? wa.atU : 0.05;
    const stoneL = wa.stoneLenM || 2.0;
    /* the stone's section is the record's own two faces since r201 — stoneWM
       the 너비 laid along the shank's axis, stoneTM the 두께 standing off its
       face (명량21-17: 166 × 53 × 29, 458 kg — the excavated stone at its own
       size, r199 rule); a square stoneSecM record keeps the pre-r201
       proportions as the legacy fallback */
    const stoneH = wa.stoneWM || (wa.stoneSecM || 0.30) * 0.83;
    const stoneT = wa.stoneTM || wa.stoneSecM || 0.30;
    /* the shank from its own stone — the figure's stone/shank ST_RATIO, the form
       study's long-shank rule (oak's buoyancy); a record shankM still outranks */
    const ST_RATIO = 0.51;
    const shankL = wa.shankM || stoneL / ST_RATIO, shD = 0.20;
    /* the arm timber from its own record — 진도-641, the one recovered arm
       published with dimensions (『진도 명량대첩로 해역 수중발굴조사 보고서 Ⅰ』
       2015, p. 467): oak, 190 × 19.6 cm root to carved point, lap-notched at
       the root for the shank, two peg stations 0.35–0.55 m from that end; the
       catalogue drawing reproduces its printed numbers against its own 1 m bar
       (r197, 8.79 px/cm — plans 188.7/189.0 cm, section circle 16–18 cm).
       ARM_LEN is the WHOLE timber including the point; the hook limb below the
       crossing is what remains after the derived blunt limb and the tip cone's
       reach (1.1·armD, the cone as placed below) take theirs. A record armM
       (hook limb) or armSecM outranks. */
    const ARM_LEN = 1.90, ARM_SEC = 0.196;
    const armD = wa.armSecM || ARM_SEC;
    const nArms = wa.arms || 2;
    const cabR = (wa.cableDiaM || 0.10) / 2;
    const offZ = wa.offZ || 0;
    const stoneM = mats.anchStone || (mats.anchStone = new THREE.MeshStandardMaterial(
      { color: 0x7d7a70, roughness: 0.92, metalness: 0.02 }));
    const ropeM = mats.ropeSolid || wood;
    /* local frame: origin at the shank head where the cable bends on, -Y down the
       shank to the foot; the stone rides the +Z face at the shank's middle */
    const ai = new THREE.Group();
    const shank = new THREE.Mesh(
      new THREE.CylinderGeometry(shD * 0.42, shD * 0.55, shankL, 10), wood);
    shank.name = 'wa-shank';
    shank.position.y = -shankL / 2;
    ai.add(shank);
    /* the cable's seizing at the shank head — the figure whips the bend on with
       rope turns; no wooden crossbar crosses here (Hong 2013: the modern station,
       not the tradition's — the stone below is this anchor's 닻장) */
    for (const yS of [-0.05, -0.10, -0.15]) {
      const sz = new THREE.Mesh(
        new THREE.TorusGeometry(shD * 0.53, 0.022, 8, 20), ropeM);
      sz.name = 'wa-seize';
      sz.rotation.x = Math.PI / 2;
      sz.position.set(0, yS, 0);
      ai.add(sz);
    }
    /* the stone at the shank's middle — ST_FRAC of the shank above the foot, the
       class constant V-WSTATION audits by (figure 0.57, 표민대화 중앙부) */
    const ST_FRAC = 0.55;
    const yStone = -shankL * (1 - ST_FRAC);
    const zStone = shD * 0.55 + stoneT / 2;
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(stoneL, stoneH, stoneT), stoneM);
    stone.name = 'wa-stone';
    stone.position.set(0, yStone, zStone);
    ai.add(stone);
    /* the crossed-arm frame: each 닻가지 is a timber crossing the shank — carved
       point splayed outward-down, blunt upper end standing to the stone's underside,
       whipped where it crosses. Two hooks — the study's stock-anchor count — are
       two single timbers in the stone's own plane, splayed opposite, each at its
       own whipped station; a four-hook record draws two pairs in perpendicular
       planes. The timber's whole run, root to carved point, is the record's —
       진도-641's 1.90 m — so the hook limb is ARM_LEN less the derived blunt
       limb and the tip's reach; a record armM overrides the hook limb. */
    /* splay from the shank, rad — MEASURED r196: six limb chords, tip to root,
       across 그림 16 (A) 22°/27°, (C) 19°/26° and the institute figure ~19°/17°,
       mean 21.6°; the pre-r196 0.78 (45°) was a drawn default, twice the plates */
    const TH = 0.38;
    const XA_FRAC = 0.35;               /* crossing above the foot — figure, r195 */
    const yX = -shankL * (1 - XA_FRAC);
    /* the blunt limb is DERIVED, crossing to the stone's underside, so the arms
       brace the stone at any shank length — the figure's structure, not a knob */
    const BL = (yStone - stoneH / 2 - yX) / Math.cos(TH) + armD * 0.4;
    const HL = wa.armM || Math.max(ARM_LEN - BL - 1.1 * armD, armD * 2);
    /* the figure whips the crossings at STAGGERED stations, ~0.12 of the shank
       apart — crossed at one point they read as a wheel's spokes, not a frame.
       Each entry is [plane angle, station, splay signs]: the two-hook form is one
       timber per station, splayed opposite in the stone's plane. */
    const SEP = shankL * 0.058;
    const pairs = (nArms >= 4)
      ? [[0, SEP, [1, -1]], [Math.PI / 2, -SEP, [1, -1]]]
      : [[0, SEP, [1]], [0, -SEP, [-1]]];
    for (const [ph, st, sgs] of pairs) for (const sg of sgs) {
      const yXp = yX + st;
      /* timber axis +Y runs from the point end up to the blunt end */
      const dir = new THREE.Vector3(
        sg * Math.sin(TH) * Math.cos(ph), Math.cos(TH),
        sg * Math.sin(TH) * Math.sin(ph));
      const timber = new THREE.Mesh(
        new THREE.CylinderGeometry(armD * 0.45, armD * 0.55, BL + HL, 10), wood);
      timber.name = 'wa-arm';
      timber.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      timber.position.set(0, yXp, 0);
      timber.position.addScaledVector(dir, (BL - HL) / 2);
      ai.add(timber);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(armD * 0.42, armD * 1.2, 10), wood);
      tip.name = 'wa-tip';
      tip.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir.clone().negate());
      tip.position.set(0, yXp, 0);
      tip.position.addScaledVector(dir, -(HL + armD * 0.5));
      ai.add(tip);
    }
    /* one whipping at each pair's own crossing (the figure's white bands) */
    for (const yW of [yX + SEP, yX - SEP]) {
      const whip = new THREE.Mesh(
        new THREE.TorusGeometry(shD * 0.8, 0.025, 8, 20), ropeM);
      whip.name = 'wa-whip';
      whip.rotation.x = Math.PI / 2;
      whip.position.set(0, yW, 0);
      ai.add(whip);
    }
    /* two treenails through each crossing — 표민대화 draws two 나무못 at the
       joint, and both separately-made arms recovered carry two square peg holes
       (Hong 2013, artifacts ④ Jindo and ⑥ Gwangyang) */
    for (const [ph, st] of pairs) {
      const nrm = new THREE.Vector3(-Math.sin(ph), 0, Math.cos(ph));
      for (const dy of [0.07, -0.07]) {
        const peg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, shD + 0.16, 8), wood);
        peg.name = 'wa-peg';
        peg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
        peg.position.set(0, yX + st + dy, 0);
        ai.add(peg);
      }
    }
    /* the spreader board across the splay, as the figure draws it */
    const spread = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(1.35, stoneL * 0.68), 0.05, 0.16), wood);
    spread.name = 'wa-spread';
    spread.rotation.z = 0.14; spread.rotation.y = 0.25;
    spread.position.set(0.05, yX - 0.28, 0.05);
    ai.add(spread);
    /* the lashing the reproduction photographs: end turns seated in the stone's own
       rope grooves, crossed frapping over the midbody binding stone to shank */
    const zHalfAll = (zStone + stoneT / 2 + shD * 0.55) / 2;
    const addTurn = (x, tilt, wrapShank) => {
      const holder = new THREE.Group();
      const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 24), ropeM);
      t.name = 'wa-band';
      t.rotation.y = Math.PI / 2;
      if (wrapShank) {
        t.scale.set(zHalfAll + 0.03, stoneH * 0.63, 1);
        t.position.z = zHalfAll - shD * 0.55;
      } else {
        t.scale.set(stoneT * 0.62, stoneH * 0.63, 1);
        t.position.z = zStone;
      }
      holder.add(t);
      holder.rotation.z = tilt;
      holder.position.set(x, yStone, 0);
      ai.add(holder);
    };
    for (const sgx of [1, -1]) {
      addTurn(sgx * stoneL * 0.280, 0, false);          /* groove turns, each end */
      addTurn(sgx * stoneL * 0.335, 0, false);
      addTurn(sgx * stoneL * 0.150, sgx * 0.42, true);  /* the crossed frapping */
      addTurn(sgx * stoneL * 0.050, -sgx * 0.42, true);
    }
    /* stow: roll 45° about the shank's own axis, then lay the shank fore-and-aft,
       arms forward, pitched to the deck's own gradient (the r183 rule — settled
       flat it would stab its forward points through the rising planking) */
    ai.rotation.y = Math.PI / 4;
    const g = new THREE.Group();
    g.add(ai);
    /* the fore-aft footprint shortens with yaw, and the pitch follows the deck
       along the shank's own line, not the centreline's (gradient × cos yaw) */
    const cosYaw = Math.cos(wa.yaw || 0);
    const uH = Math.max(0, u), uT = Math.max(0, u - (shankL + 0.6) * cosYaw / L);
    const slope = (uH - uT) > 1e-6
      ? (deckAtU(uH) - deckAtU(uT)) / ((uH - uT) * L) : 0;
    g.rotation.z = -Math.PI / 2 + Math.atan(slope * cosYaw);
    if (wa.yaw) g.rotation.y = wa.yaw;
    const yD = deckAtU(uH);
    g.position.set((u - 0.5) * L, yD, offZ);
    /* settle onto the deck by measurement, not trigonometry (the grapnel's rule) */
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    g.position.y += (yD - bb.min.y);
    g.updateMatrixWorld(true);
    /* the cable: bent at the shank head above the crossbar, led to the horong's
       barrel, where the machine holds the rest — no coil on deck (r183) */
    const head = new THREE.Vector3(0, 0, 0).applyMatrix4(g.matrixWorld)
      .add(new THREE.Vector3(0.05, 0.06, 0));
    const wl = S.windlass;
    const uW = wl ? (wl.atU || 0.10) : 0.10;
    /* the lead ends INSIDE the drum's forward face — the turns are wound on, and
       a rope that stops a pixel short of the barrel is a part attached to nothing */
    const barrelPt = new THREE.Vector3(
      (uW - 0.5) * L - (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2 + 0.18,
      deckAtU(uW) + 0.30 + (wl ? (wl.barrelDiaM || 0.5) : 0.5) / 2, offZ * 0.4);
    const cable = ropeMesh([[head, barrelPt]], cabR, mats.ropeSolid || wood);
    const ag = new THREE.Group();
    ag.add(g);
    if (cable) { cable.name = 'wa-cable'; ag.add(cable); }
    group.add(tag(ag, 'woodAnchor'));
  }

  /* ── THE JAPANESE FOUR-CLAW IRON ANCHOR, FROM THE RECORD ────────────────────────────
     `yotsumeAnchor: {atU?, offZ?, yaw?, lenM?, kg?, armFrac?, cableDiaM?}`
     The 四爪碇 the wasen tradition names for its making — a square iron bar split at
     the foot into four claws bent outward (Minamichita wasen museum, verbatim), the
     head carrying an elongated anchor ring with a free accessory ring through it that
     the cable bends to (Matsui 2013 fig. 1, the corpus's own part names). Era and
     class: from the 1433 Jingu Kogo engi emaki and the 1486 Boshi nyuminki, warships
     and special ships carried the four-claw iron anchor alongside wood-stone anchors
     from the first half of the 15th century (Ishii 1983 via Matsui); her own card's
     plate — the Busan barrier of 1593, at anchor — draws the recurved-claw anchor at
     the cable's end. NO dimension is recorded for a sekibune: lenM defaults to 2.0 m,
     a class default inside the measured corpus (1.05–3.03 m, Matsui table 1); kg
     defaults by the corpus's one weighed anchor (Kozushima, 2.8 m, 330–340 kg by
     forklift, 約90貫, cube-scaled: 15.26 kg per m³ of 全長³) — a direct-pull
     load for a crew with no winch (her rokuro is JUDGED SILENT, r176). Arm and ring
     sections are the corpus's own (表1, r191); the shank is solved from the mass,
     the one member the table does not record. Drawn recovered
     on the open foredeck forward of the so-yagura (the fleet stow, r182–r186): rolled
     45° so two claws splay to the planking and two stand up, pitched to the deck's
     own gradient, settled by measured box; the cable bent to the accessory ring and
     flaked in a coil beside it — no belay is attested and no machine exists to lead
     it to (the r182/r185 standing). Coil from rope segments, never a torus: the
     audit counts this anchor by its two ring tori. Silence draws nothing: only a
     yotsumeAnchor record draws one. */
  if (S.yotsumeAnchor) {
    const ya = S.yotsumeAnchor;
    const lenM = ya.lenM || 2.0;
    const u = (ya.atU != null) ? ya.atU : 0.045;
    const offZ = ya.offZ || 0;
    const ironG = mats.capIron || (mats.capIron = new THREE.MeshStandardMaterial(
      { color: 0x2a2622, roughness: 0.62, metalness: 0.45 }));
    const ag = new THREE.Group();
    /* local frame: origin at the crown, shank along +Y; the teardrop head ring
       takes the top of the length, the arms splay from the crown.
       MEMBER SECTIONS ARE THE RECORD'S (r191, r192): 表1 of the corpus paper
       (Matsui 2013 p.38) measures all 49 anchors at member level — the arms
       are RECTANGULAR forged bars, 最大幅×最大厚 at the root falling to a wide
       thin blade at the fluke tip. Corpus means for the ≥190 cm class
       (fractions of 全長): root 0.0346×0.0198, tip 0.0220×0.0058. Both rings
       take the type anchor the class already cites (Onominato a, #29: AR
       44×19 bar 3 on 269; AcR ⌀36 section 4×4.5). The SHANK's two stations
       are the Pacific corpus's calipers (r192: 二宮 2014, 東京海洋大学, 表3 —
       the companion survey, 144 anchors Ibaraki–Wakayama): the root boss
       where the four arms forge on, 0.0491×0.0764 of 全長, and the clean
       upper bar, 0.0214×0.0303, sorted (min,max) since mounting sets which
       face is 正面. The r191 contest resolved: the monument photographs'
       0.023–0.034 was the upper bar, the old solve's 0.047 the root — a hard
       taper, not a uniform bar. The KNEE where taper meets bar is the one
       dimension no table records: it is SOLVED so the drawn iron weighs the
       record's kg at 7850 kg/m³ — mass from the corpus's one weighed anchor
       (Kozushima, 2.8 m, 330–340 kg by forklift, 約90貫) cube-scaled through
       the record field. A kg outside the drawn form's own solvable band
       clamps the knee and V-YMASS convicts honestly — a contest, not a knob. */
    const YA_P = {
      arW0: 0.0346, arT0: 0.0198,    /* arm root w×t, corpus mean (表1) */
      arW1: 0.0220, arT1: 0.0058,    /* fluke-tip blade w×t */
      rSemiV: 0.0818, rSemiH: 0.0353, rBar: 0.0056,  /* head ring, Onominato a */
      acR: 0.0590, acBar: 0.0079,    /* accessory ring centre R, tube */
      shRw: 0.0491, shRt: 0.0764,    /* shank root boss w×t (表3, sorted) */
      shMw: 0.0214, shMt: 0.0303     /* shank upper bar w×t (表3, sorted) */
    };
    const armF = ya.armFrac || 0.30;
    /* arm stations along the developed run (0.62/0.26/0.16 of armL): width and
       thickness linear root→tip; each drawn piece is a 4-segment cylinder —
       a square bar — with its faces axis-aligned and a per-piece z-scale for
       the thickness, so the drawn section is the record's at the stations */
    const yaW = (f) => YA_P.arW0 + (YA_P.arW1 - YA_P.arW0) * f;
    const yaT = (f) => YA_P.arT0 + (YA_P.arT1 - YA_P.arT0) * f;
    const F1 = 0.62 / 1.04, F2 = 0.88 / 1.04;
    const w0 = yaW(0), w1 = yaW(F1), w2 = yaW(F2);
    const zs1 = (yaT(0) / w0 + yaT(F1) / w1) / 2;
    const zs2 = (yaT(F1) / w1 + yaT(F2) / w2) / 2;
    const zsT = yaT(F2) / w2;
    const shankL = lenM * (1 - 2 * YA_P.rSemiV);
    /* the mass solve: iron volume of everything but the shank, analytically —
       the same sums V-YMASS integrates from the built scene */
    const yaKg = ya.kg || Math.round(335 * Math.pow(lenM / 2.8, 3));
    const sqFrus = (wa, wb, h) => h / 3 * (wa * wa + wa * wb + wb * wb);
    let vOther = 4 * (zs1 * sqFrus(w0, w1, 0.62 * armF)
                    + zs2 * sqFrus(w1, w2, 0.26 * armF)
                    + zsT * w2 * w2 * 0.16 * armF / 3)
      + 2 * Math.PI * Math.PI * (YA_P.rSemiH - YA_P.rBar) * YA_P.rBar * YA_P.rBar
        * (YA_P.rSemiV / YA_P.rSemiH)
      + 2 * Math.PI * Math.PI * YA_P.acR * YA_P.acBar * YA_P.acBar;
    vOther *= lenM * lenM * lenM;
    /* the shank at the record's stations: rectangular, tapering from the root
       boss to the upper bar. Drawn as two 4-segment frustums (piecewise mean
       thickness ratios cut the scaled-frustum artifact at the crown to −2.2%)
       and a prism above the knee. The knee height is the one unrecorded
       dimension — solved, linearly, so the drawn iron weighs the record. */
    const shWr = YA_P.shRw * lenM, shTr = YA_P.shRt * lenM;
    const shWm = YA_P.shMw * lenM, shTm = YA_P.shMt * lenM;
    const shRr = shTr / shWr, shRm = shTm / shWm;
    const shWmid = (shWr + shWm) / 2, shRmid = (shRr + shRm) / 2;
    const zsA = (shRr + shRmid) / 2, zsB = (shRmid + shRm) / 2;
    const vPrism = shRm * shWm * shWm * shankL;
    const vTaper = zsA * sqFrus(shWr, shWmid, shankL / 2)
                 + zsB * sqFrus(shWmid, shWm, shankL / 2);
    const shH = shankL * Math.max(0.05, Math.min(1,
      (yaKg / 7850 - vOther - vPrism) / (vTaper - vPrism)));
    const ai = new THREE.Group();
    ai.name = 'ya-grp';
    /* a 4-segment cylinder IS a square bar; scale.x carries the record's W:T */
    const shBar = (wa, wb, h, zs) => {
      const geo = new THREE.CylinderGeometry(wb / Math.SQRT2, wa / Math.SQRT2, h, 4);
      geo.rotateY(Math.PI / 4);
      const m = new THREE.Mesh(geo, ironG);
      m.scale.x = zs;
      m.name = 'ya-shank';
      return m;
    };
    const shA = shBar(shWr, shWmid, shH / 2, zsA);
    shA.position.y = shH / 4;
    const shB = shBar(shWmid, shWm, shH / 2, zsB);
    shB.position.y = shH * 0.75;
    const shC = shBar(shWm, shWm, shankL - shH, shRm);
    shC.position.y = shH + (shankL - shH) / 2;
    ai.add(shA); ai.add(shB); ai.add(shC);
    /* the anchor ring: the teardrop loop of the bar itself — outer oval
       0.164×0.071 of 全長, bar 0.011, elongation the record's own 2.32 */
    const arR = lenM * (YA_P.rSemiH - YA_P.rBar), arBar = lenM * YA_P.rBar;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(arR, arBar, 8, 20), ironG);
    ring.name = 'ya-ring';
    ring.scale.y = YA_P.rSemiV / YA_P.rSemiH;
    /* tucked 0.01·len over the shank top: the loop is forged from the bar
       itself and its root merges into it — a butt joint reads as a crack */
    ring.position.y = lenM - lenM * YA_P.rSemiV - lenM * 0.01;
    ai.add(ring);
    /* the accessory ring: round and stout (the record's 4×4.5 section), free
       through the anchor ring's opening — plane athwart, hung inside the eye */
    const acR = lenM * YA_P.acR, acBar = lenM * YA_P.acBar;
    const acr = new THREE.Mesh(
      new THREE.TorusGeometry(acR, acBar, 8, 20), ironG);
    acr.name = 'ya-acring';
    acr.rotation.y = Math.PI / 2;
    acr.position.y = lenM - acR - 2 * acBar;
    ai.add(acr);
    /* four claws at 90°: out from the crown near-flat, then the fluke recurves up —
       the plate's own drawn sweep (r187), sections the table's rectangular bars */
    const armL = lenM * armF;
    const rectSeg = (wa, wb, h, zs) => {
      const geo = new THREE.CylinderGeometry(
        wb / Math.SQRT2, wa / Math.SQRT2, h, 4);
      geo.rotateY(Math.PI / 4);
      const m = new THREE.Mesh(geo, ironG);
      m.scale.x = zs;      /* thickness lies IN the sweep plane — the recurve
                              bends the bar about its weak axis; width athwart */
      return m;
    };
    for (let k = 0; k < 4; k++) {
      const cg2 = new THREE.Group();
      cg2.rotation.y = k * Math.PI / 2 + Math.PI / 4;
      const a1 = 1.62, l1 = armL * 0.62;           /* 93° from +Y: just below flat */
      const s1 = rectSeg(w0 * lenM, w1 * lenM, l1, zs1);
      s1.name = 'ya-arm'; s1.rotation.z = -a1;
      s1.position.set(Math.sin(a1) * l1 / 2, Math.cos(a1) * l1 / 2, 0);
      cg2.add(s1);
      const P1x = Math.sin(a1) * l1, P1y = Math.cos(a1) * l1;
      const a2 = 0.90, l2 = armL * 0.26;           /* recurving up toward the head */
      const s2 = rectSeg(w1 * lenM, w2 * lenM, l2, zs2);
      s2.name = 'ya-arm'; s2.rotation.z = -a2;
      s2.position.set(P1x + Math.sin(a2) * l2 / 2, P1y + Math.cos(a2) * l2 / 2, 0);
      cg2.add(s2);
      const ch = armL * 0.16;
      const tipGeo = new THREE.ConeGeometry(w2 * lenM / Math.SQRT2, ch, 4);
      tipGeo.rotateY(Math.PI / 4);
      const tip = new THREE.Mesh(tipGeo, ironG);
      tip.scale.x = zsT;
      tip.name = 'ya-tip'; tip.rotation.z = -a2;
      tip.position.set(P1x + Math.sin(a2) * (l2 + ch / 2 - 0.01),
                       P1y + Math.cos(a2) * (l2 + ch / 2 - 0.01), 0);
      cg2.add(tip);
      ai.add(cg2);
    }
    /* stow (the fleet rule): yaw, pitch to the deck's own gradient along the shank's
       line, roll 45° on the shank so two claws splay to the planking; settle by box */
    const g = new THREE.Group();
    g.add(ai);
    const cosYaw = Math.cos(ya.yaw || 0);
    const uH2 = Math.min(1, u + lenM * cosYaw / L);
    const slope = (uH2 - u) > 1e-6
      ? (deckAtU(uH2) - deckAtU(u)) / ((uH2 - u) * L) : 0;
    const q = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), ya.yaw || 0);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1), -Math.PI / 2 + Math.atan(slope * cosYaw)));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), Math.PI / 4));
    g.quaternion.copy(q);
    const yD = deckAtU(u);
    g.position.set((u - 0.5) * L, yD, offZ);
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    g.position.y += (yD - bb.min.y);
    g.updateMatrixWorld(true);
    /* the sheer function is the RAIL line, not always the drawn planking — on this
       hull the foredeck plank lies 0.33 m under it (measured, r187). Ask the
       surface itself (the r185 principle moved into the builder): ray straight
       down at the assembly's own centre through what is already built, skip this
       anchor and anything that cannot bear, and seat the box on the first hit.
       If nothing answers, the deckAtU seat above stands. */
    const NOBEAR = { stay: 1, shroud: 1, halyard: 1, brace: 1, lift: 1,
                     sheet: 1, tack: 1, ratline: 1, oar: 1 };
    group.updateMatrixWorld(true);
    const bb2 = new THREE.Box3().setFromObject(g);
    const bbc = bb2.getCenter(new THREE.Vector3());
    const rc = new THREE.Raycaster();
    rc.set(new THREE.Vector3(bbc.x, bb2.max.y + 2, bbc.z), new THREE.Vector3(0, -1, 0));
    const seat = rc.intersectObject(group, true).filter(h => {
      for (let e = h.object; e; e = e.parent) if (e === g) return false;
      for (let e = h.object; e; e = e.parent)
        if (e.userData && e.userData.part) return !NOBEAR[e.userData.part.key];
      return true;
    });
    if (seat.length) {
      g.position.y += (seat[0].point.y - bb2.min.y);
      g.updateMatrixWorld(true);
    }
    /* the accessory ring's world point, for the cable */
    const ringP = new THREE.Vector3(0, lenM - acR - 2 * acBar, 0)
      .applyMatrix4(ai.matrixWorld);
    /* the coil: the cable flaked BESIDE the head, moved toward the centreline — not
       aft of it, where a foredeck stow would put it under the deck break (measured,
       r187: the so-yagura face stands 0.5 m over the foredeck at u 0.10, and a coil
       flaked aft of the head sank beneath it). No belay is attested, no machine
       exists to lead it to; a stow, not an invented lead */
    const cabR = (ya.cableDiaM || 0.06) / 2;
    const ropeM = mats.ropeSolid || wood;
    const cu = Math.max(0, Math.min(1, (ringP.x / L) + 0.5));
    const coilZ = ringP.z - Math.sign(ringP.z || 1) * 0.75;
    const coilC = new THREE.Vector3(
      (cu - 0.5) * L, deckAtU(cu) + 0.05, coilZ);
    /* the coil sits on the measured plank too, not the rail line */
    rc.set(new THREE.Vector3(coilC.x, coilC.y + 3, coilC.z), new THREE.Vector3(0, -1, 0));
    const cSeat = rc.intersectObject(group, true).filter(h => {
      for (let e = h.object; e; e = e.parent) if (e === g) return false;
      for (let e = h.object; e; e = e.parent)
        if (e.userData && e.userData.part) return !NOBEAR[e.userData.part.key];
      return true;
    });
    if (cSeat.length) coilC.y = cSeat[0].point.y + 0.05;
    const segs = [];
    for (let k = 0; k < 10; k++) {
      const b1 = (k / 10) * 2 * Math.PI, b2 = ((k + 1) / 10) * 2 * Math.PI;
      for (const [rr, dy] of [[0.30, 0], [0.22, 0.05]])
        segs.push([new THREE.Vector3(coilC.x + Math.cos(b1) * rr, coilC.y + dy,
                                     coilC.z + Math.sin(b1) * rr),
                   new THREE.Vector3(coilC.x + Math.cos(b2) * rr, coilC.y + dy,
                                     coilC.z + Math.sin(b2) * rr)]);
    }
    const coil = ropeMesh(segs, cabR, ropeM);
    if (coil) { coil.name = 'ya-coil'; ag.add(coil); }
    const cEnd = new THREE.Vector3(coilC.x, coilC.y + 0.08, coilC.z);
    const cMid = ringP.clone().lerp(cEnd, 0.5);
    cMid.y = Math.max(cEnd.y + 0.04, ringP.y - 0.15);
    const cb = ropeMesh([[ringP, cMid], [cMid, cEnd]], cabR, ropeM);
    if (cb) { cb.name = 'ya-cable'; ag.add(cb); }
    ag.add(g);
    group.add(tag(ag, 'yotsumeAnchor'));
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
  if (timberShip && laidDeck && S.lwl > 25) {
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
      /* the one pair of meshes in the fleet that carried no part tag (r99) — and the rule
         is a rule: the geometry is the source of the labels, so an untagged mesh is a part
         the picker cannot name */
      group.add(tag(sk, 'boat', 'Boat skids'));
    }
  }

  /* ── QUARTER BOATS IN RADIAL DAVITS, FROM THE RECORD: `davitBoats: [{u, lM}]` ────────
     A working ship keeps her sea boats swung OUTBOARD, because a boat on skids takes minutes
     of tackle work to launch and a man overboard has seconds. Each entry hangs a boat on
     each side at station u, length lM in metres — Endurance's pair at the quarters is in
     every Hurley plate, canvas-covered, keel above the rail. The boat comes from the same
     hull generator as the ship carrying it (the skid boat's own rule), and every position
     is sampled off surfacePoint at the boat's own station, so a fuller or finer hull moves
     its boats with its side. */
  if (S.davitBoats && S.davitBoats.length) {
    const iron = new THREE.MeshStandardMaterial(
      { color: 0x2a2723, roughness: 0.55, metalness: 0.45 });
    for (const db of S.davitBoats) {
      const bl = db.lM;
      const bb = bl / 3.4;                              // the launch proportions, as amidships
      const qSpec = {
        loa: bl, lwl: bl * 0.94, beam: bb, draught: bl * 0.075, freeboard: bl * 0.105,
        cm: 0.62, wlPower: 2.6, stemFineness: 0.06, sternFineness: 0.42, transom: 0.20,
        forefoot: 0.26, run: 0.30, riseF: 0.55, riseA: 0.30, sheerBow: 0.9, sheerStern: 0.6,
        tumblehome: 0.0, stemRake: 0.06, sternRake: 0.02, strakes: 9, masts: [],
      };
      const qGeo = buildHullGeometry(qSpec, 40, 14);
      for (const sgn of [-1, 1]) {
        const [bx, railY, railZ] = surfacePoint(S, H, db.u, 1);
        const bz = sgn * (railZ + bb * 0.55);           // centreline clear of the shell
        const keelY = railY + 0.25;                     // hung high — keel above the rail
        const bm = new THREE.Mesh(qGeo, pale);
        bm.position.set(bx, keelY + bl * 0.075, bz);
        group.add(tag(bm, 'boat', 'Quarter boat',
          'The sea boat, swung outboard in radial davits and kept there at sea: a boat '
          + 'stowed inboard takes minutes of tackle work to launch, and a man overboard '
          + 'has seconds. Canvas-covered against spray and, down here, against ice.'));
        /* the davits: a round iron bar rising through the rail and curving outboard in a
           quarter circle, one at each end of the boat, with a fall from the arc's tip to
           the boat's hoisting ring. Radial pattern, 1912's own. */
        const headY = keelY + bl * 0.075 + bl * 0.105 + 0.55;  // above the gunwale
        const reach = Math.abs(bz) - (railZ - 0.12);    // post inside the rail to over the boat
        for (const e of [-1, 1]) {
          const dx = bx + e * bl * 0.46;
          const postZ = sgn * (railZ - 0.12);
          const hp = headY - (railY - 0.5);             // socketed below the rail
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.068, hp, 10), iron);
          post.position.set(dx, railY - 0.5 + hp / 2, postZ);
          group.add(tag(post, 'boat', 'Davit'));
          /* the arc: quarter torus in the athwartships plane, from the post head (tangent
             vertical) over to the fall point above the boat's centreline (tangent horizontal) */
          const arc = new THREE.Mesh(
            new THREE.TorusGeometry(reach, 0.052, 8, 14, Math.PI / 2), iron);
          arc.rotation.y = sgn * Math.PI / 2;           // into the YZ plane, bending outboard:
          /* arc angle 0 lands on the post head (tangent vertical), π/2 over the boat's
             centreline (tangent horizontal) — checked against both signs of sgn */
          arc.position.set(dx, headY, postZ + sgn * reach);
          group.add(tag(arc, 'boat', 'Davit'));
          /* the fall, from the arc tip down to the boat's end */
          const tipY = headY + reach;
          const endY = keelY + bl * 0.075 + bl * 0.105;
          const fall = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, tipY - endY, 6), iron);
          fall.position.set(dx, (tipY + endY) / 2, bz);
          group.add(tag(fall, 'boat', 'Davit fall'));
        }
      }
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
    /* backstays set up at the ship's side — the true edge, asked of the surface (r100) */
    const hb = Math.abs(surfacePoint(S, H, bu, 1)[2]);
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
  /* ── ⚠ A DECK'S HEIGHT IS HEADROOM, NOT A FRACTION OF BEAM ──────────────────────────
     The default was B * 0.105, which is right for Titanic (28.2 m beam -> 2.96 m) and right
     for nothing else by anything but coincidence. Queen Mary 2's 41 m beam gave 4.30 m decks —
     45% too tall — so ten decks made 43 m of house on 17 m of freeboard and she towered over
     her own hull; Azzam's 20.8 m gave 2.18 m, too short to stand up in. A deck is sized by the
     person walking through it and has been about three metres since iron, on any beam.
     Every hull that already carried decks has been pinned to its current value in the data, so
     this change moves nothing that was right; the DEFAULT is now the human dimension, which is
     what any vessel added from here inherits. */
  const base = H.sheer(0.5), dh = S.deckM || Math.min(B * 0.105, 3.0), inset = B * 0.055;
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
  /* ── ⚠ A MEASURED TIER EDGE PINS THE INTERPOLATION ───────────────────────────────────
     The straight houseAt→houseCrest line is a derivation, and on Azzam it missed the top
     step: her tier-3 terrace roofline reads u 0.73 on the plate while the line puts it
     at 0.71, because the crest's own wall stops at 0.66 and the last step aft is bigger
     than the steps below it. tierAftU records the aft edges the photograph actually
     gives, keyed by tier index; tiers between pinned points interpolate straight, so a
     record with no pins reproduces the single line exactly. */
  /* ⚠ AND THE FORWARD EDGES NEED PINNING FOR THE SAME REASON THE AFT ONES DID. The straight
     houseAt→houseCrest interpolation makes the front of the house a constant-slope staircase.
     That is right for a ship whose front IS a ramp, and wrong for Queen Mary 2, whose plates
     show something quite different: four SHORT STEEP terraces climbing off the foredeck over
     about a tenth of her length, and then a near-vertical block carrying the bridge. A single
     slope cannot be both, and averaging them is what has made her look wrong three times.
     tierForeU is tierAftU's mirror: forward edges read off the photograph, keyed by tier, with
     straight interpolation between pins — so a record with no pins reproduces the old single
     line exactly and no existing hull moves. */
  const mkPin = (edge, first, last, rec) => {
    const pin = { 0: first, [n - 1]: last };
    for (const k in (rec || {})) {
      const ti = +k;
      if (ti > 0 && ti < n - 1) pin[ti] = rec[k];
    }
    const idx = Object.keys(pin).map(Number).sort((a, b) => a - b);
    return i => {
      if (pin[i] !== undefined) return pin[i];
      let lo = idx[0], hi = idx[idx.length - 1];
      for (const q of idx) if (q < i) lo = q;
      for (let j = idx.length - 1; j >= 0; j--) if (idx[j] > i) hi = idx[j];
      return pin[lo] + (pin[hi] - pin[lo]) * (i - lo) / (hi - lo);
    };
  };
  const aftAt  = mkPin('aft',  hB, crest[1], S.tierAftU);
  const foreAt = mkPin('fore', hA, crest[0], S.tierForeU);
  /* ── ⚠ A TWEEN-DECK IS ONE NUMBER, AND A YACHT'S TIERS ARE NOT ALL THE SAME HEIGHT ──
     deckM stacked Azzam's four tiers at 3.05 m each and every deck line landed 1.2-2.3 m
     below the plate: the broadside's silhouette, read where each roof is exposed, puts her
     floors at 13.5, 17.4 and 20.0 m over the water beneath a 22.5 m top — one 4.5 m main
     tier under three shorter ones, which no single deckM can spell. tierFloorsM records
     the measured floor heights (tiers 1..n-1, metres over the waterline) and houseTopM
     the roof; a record without them stacks dh exactly as before, so no other hull moves. */
  const floorY = i => (i >= n) ? (S.houseTopM !== undefined ? S.houseTopM : base + dh * n)
    : (i <= 0) ? base
    : (S.tierFloorsM && S.tierFloorsM[i - 1] !== undefined) ? S.tierFloorsM[i - 1]
    : base + dh * i;
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
  /* ── ⚠ A MODERN HOUSE IS FLUSH-SIDED, AND THE TAPER IS WHAT MADE HER A ZIGGURAT ──────
     Every tier was drawn 1.6% of the beam narrower than the one below (0.92 − i/n·0.16),
     which on Titanic's three decks is a 0.4 m total set-in nobody can see, and on Queen
     Mary 2's ten is a 0.66 m LEDGE at every deck for the whole length of the ship. Each
     ledge gets its own roofPlate, so the profile came out as eleven white lips with dark
     bands between — a stack of pancakes, and the single loudest reason three attempts at
     her read as wrong. A liner built since SOLAS moved the boats down has ONE plane from
     the boat gallery to the top terrace, with the balconies recessed INTO it; the plan
     steps fore and aft, never sideways. houseTaper is that set-in as a fraction of the
     beam over the whole house; 0.16 is the old value and every existing hull keeps it. */
  const taper = S.houseTaper !== undefined ? S.houseTaper : 0.16;
  /* ── ⚠ A WALL IS SIZED BY THE SHELL AT ITS OWN STATION, RAKE AND ALL ────────────────
     Tier pins are x/lwl read off plates and profiles, but the loft sampled the shell AT
     u AS IF x were (u − 0.5)·lwl — no rake — and clamped at 0.999. Inside the rake spans
     that reads the shell up to a rake's length away from the wall it sizes (always the
     narrower station, so the error hid inboard), and nothing past the perpendicular can
     be drawn at all: Queen Mary 2's fantail edge is MEASURED at u 1.008, over the counter
     (r162 chain closure; the 2011 Southampton astern plate), and her stern stopped 5 m
     short at the strake face. r163 fixed it for a record that pins any edge past u 1.0;
     r167 re-lofted the FLEET, measured first (build/staging/r167/bias-before.json): the
     bias was nil where a house sits inboard of the rake spans (azzam, steamer) and
     0.05–0.31 m where a tier edge enters one (titanic +0.05 aft, great-eastern +0.08,
     the warship tiers up to +0.31 at the bow — consumed only by fittings and boats,
     since turret and flight-deck hulls draw no house walls). Every half-breadth now
     inverts the deck-edge x truly (bisection — both rake terms are monotone in u), so
     each wall stands one waterway inside the shell AT ITS OWN STATION, on every hull,
     and a pin past the perpendicular sweeps home with the counter as before. */
  const qAtX = (x) => {
    if (x <= -0.5 * L + H.rake(0)) return 0;
    if (x >= 0.5 * L + H.rake(1)) return 1;
    let lo = 0, hi = 1;
    for (let it = 0; it < 32; it++) {
      const q = (lo + hi) / 2;
      if ((q - 0.5) * L + H.rake(q) < x) lo = q; else hi = q;
    }
    return (lo + hi) / 2;
  };
  for (let i = 0; i < n; i++) {
    const shell = i < ns;
    const wid = shell ? B : B * (1 - taper * (0.5 + i / n));   // ≡ 0.92 − i/n·0.16 at 0.16
    const ins = shell ? B * 0.015 : (taper < 0.06 ? B * 0.015 : inset);
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
    const uA = foreAt(i), uB = aftAt(i);
    /* the tier stops short of the deck edge by a WATERWAY, lofted from the hull's own
       half-breadth so it can never overhang, on any ship, at any beam (the round-4 fault) */
    const half = (u) => {
      const uu = qAtX((u - 0.5) * L);
      return Math.max(B * 0.06, Math.min(wid / 2,
        Math.abs(surfacePoint(S, H, uu, 1.0)[2]) - ins));
    };
    /* ── ⚠ A MOTOR YACHT'S FRONT IS ONE SURFACE, NOT A STAIRCASE ─────────────────────
       With vertical fronts pinned at foreAt(i), the house climbs off the foredeck in steps —
       right for the liner the pins were built for, wrong for a hull like Azzam whose broadside
       shows every tier's front RAKED so its head lands on the next front's foot: the composite
       line from foredeck to crest is one continuous sculpted ramp. uAHead is where a tier's
       front arrives at its own ceiling; the crest carries the slope of the tier below it, held
       inside its own span. Record-gated (houseRamp) — a record without it is vertex-identical. */
    const uAHead = S.houseRamp
      ? (i < n - 1 ? foreAt(i + 1)
                   : Math.min(uA + (n > 1 ? uA - foreAt(n - 2) : 0.02),
                              uA + (uB - uA) * 0.45))
      : undefined;
    /* ── ⚠ A TIER'S SIDES CAN OUTRUN ITS OWN AFT FACE (round 165) ───────────────────
       Queen Mary 2's terraces sit RECESSED between side balcony wings — the 2016
       aerial reads enclosed structure running aft past each deep terrace's centre
       face — so ending the whole tier at one u cut the wings off and left every
       terrace a full-width shelf. tierWings records, per tier, the u the wing tip
       reaches (aftU) and its inboard depth in metres (depthM); the perimeter winds
       the notched plan, so the balcony band, the roof plate and the rails all
       inherit the wings from the one path. Record-gated: no tierWings, no wing
       fields, vertex-identical. */
    const wr = S.tierWings ? S.tierWings[i] : undefined;
    /* ── AND A TIER'S AFT FACE CAN BE ROUND IN PLAN (round 166) ──────────────────────
       The jacuzzi step's aft rail sweeps convex-aft between its r165 wing decks on
       the 2016 aerial; the model cut it square across. tierRound records, per tier,
       the SAGITTA of that sweep — how far the face's centre stands aft of the chord
       through its notch corners — and the perimeter bends the centre-face leg into
       the arc, so the wall, the roof plate, the balcony band and the rail cap all
       inherit the round from the one path. The builder refuses an arc whose apex
       would outrun the tier's own wing chamfer (or, unwinged, the terrace floor
       below): an impossible record draws no bulge, and the audit convicts both the
       arithmetic and the missing bulge. Record-gated: no tierRound, vertex-identical. */
    const rr = S.tierRound ? S.tierRound[i] : undefined;
    const wingUi = (wr && wr.aftU > uB + 1e-6) ? wr.aftU : undefined;
    const pitchU = ((S.tierBands && S.tierBands.pitchM) || 2.6) / L;
    const rrOK = rr && rr.sagittaM > 0.01 &&
      uB + rr.sagittaM / L <
        (wingUi !== undefined ? wingUi : (i ? tiers[i - 1].uB : uB)) - pitchU;
    tiers.push({ uA, uB, uAHead, y0: floorY(i), y1: floorY(i + 1), half, shell,
                 recess: i === recessTier,
                 wingU: wingUi,
                 wingDepth: wr ? wr.depthM : undefined,
                 roundM: rrOK ? rr.sagittaM : undefined });
  }
  /* `recorded` marks a house the RECORD located (houseAt) as opposed to the default span.
     It decides which deck a funnel's recorded height is measured from — see buildFunnel. */
  return { n, base, dh, top: floorY(n), tiers,
           recorded: !!(S.houseAt && S.houseAt.length === 2) };
}

function buildSuperstructure(S, group, hullMat) {
  const n = S.decks || 0;
  if (!n) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const white = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.60 });
  const g = new THREE.Group();
  const T = linerHouse(S);
  /* ── A TIER ROOF YOU CAN STAND ON IS A DECK, AND A DECK HAS A COVERING (round 108) ────
     Every exposed tier roof here is a walkable deck — the promenades are railed as such —
     yet they stayed 0xe4e2dc MeshStandard plates while the weather deck below took the
     recorded covering: Azzam read white paving stones over teak terraces, and her builder's
     2,200 m² of laid teak is far more area than her weather deck alone can carry. So the
     roofs ask deckCovering()'s one judgement too. STAGED like r106: only a RECORDED laid
     covering flips — ships on the INFERRED fallback keep the byte-identical plateMat,
     because a liner's boat deck being planked is a fact to RECORD per ship first, not
     infer (azzam r108; titanic, queen-mary-2 r109; great-eastern r110). */
  /* ── ⚠ AND A RECORD COVERS THE DECK IT NAMES, NOT EVERY DECK ABOVE IT ───────────────
     r108 gave every tier roof the recorded covering. On a three-deck Edwardian liner that is
     defensible — Titanic's boat deck IS in the same specification as her weather deck. On a
     TEN-deck hull it is not: Queen Mary 2's source attests the wrap-around Promenade, deck 7,
     nearly 600 m of laid teak — and deck 7 is this model's weather deck, so the record is
     already honoured there. Extending it upward painted her sun deck, her funnel casing and
     every aft terrace one khaki field, which is the loudest thing about her from any angle
     above the beam and is not what the photographs show: her upper decks are pale coated
     plate with teak in places. The record's own provenance says so in as many words —
     "RECORDED for the promenade, EXTENDED above". An inference wearing a record's clothes.
     So the extension is a RECORD now (deck.roofs), not a rule. Azzam keeps it and states why:
     2,200 m² of laid teak is far more area than her weather deck alone can carry, so her
     terraces are the rest of it. Nothing else claims it, and nothing without decks can care. */
  const cover = deckCovering(S);
  const roofsLaid = !!(S.deck && S.deck.roofs);
  /* ── ⚠ AND THE ROOF THE CLUSTER STANDS ON IS NOT A TERRACE (round 159) ──────────────
     The r108 extension carried Azzam's teak to every tier roof, crest included, and the
     delivery-trials aerial refutes exactly one of them: the crest top around the radome
     pedestals and the mast foot is white coated plate, with the teak one level down on
     the ringing terraces (Research/AZZAM-PLATES.md, plate 2). So deck.roofs can answer
     'terraces': the covering reaches every exposed tier roof EXCEPT the top tier's,
     which stays plate. true and false keep their exact meanings. */
  const roofsBareTop = !!(S.deck && S.deck.roofs === 'terraces');
  const roofDeckMat = (hullMat && roofsLaid && cover.recorded && cover.mode === 1)
    ? new THREE.ShaderMaterial({
        vertexShader: SHADERS['DECK_VERT.vert'], fragmentShader: SHADERS['DECK_FRAG.frag'],
        uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam,
                    uCol:    { value: new THREE.Color(cover.col) },
                    uMode:   { value: cover.mode },
                    uPlankW: { value: cover.plankW || 1 },
                    uButtL:  { value: cover.buttL || 1 } } })
    : null;
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
  /* `shear`, when given, displaces a station in x as a function of the row fraction — how a
     raked front is wound without breaking the loop: the front-leg stations lean back with
     height while the side stations stand, and the one quad at each corner carries the twist.
     Shared topology means the wall can never open a seam against itself. */
  /* `grp` ({L, groups}), when given, replaces the arc-length mullion rhythm with the
     record's own WINDOW GROUPS: [uStart, uEnd, pitchM, pierFrac] in hull u, pitchM 0 a
     continuous run. The glazing then exists only inside a group — long blank wall between
     groups, which is what the broadside of a yacht actually shows — and the light/pier
     rhythm phases from each group's own forward edge, so the first light lands where the
     plate puts it. Membership is decided on the SHEARED x, so a raked front whose head
     crosses into a group glazes with it. */
  const wallLoft = (path, y0, y1, rows, band, pw, mulFrac, faceCol, glassSpec, shear, grp) => {
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
        let glazed = !isMul;
        if (grp) {
          const uu = (path[k].x + (shear ? shear(path[k], rf) : 0)) / grp.L + 0.5;
          glazed = false;
          for (const gr of grp.groups) {
            const relM = (uu - gr[0]) * grp.L;
            const spanM = (gr[1] - gr[0]) * grp.L;
            /* 0.2 mm slack against the 1 mm snap pairs: the vertex this side of a
               boundary resolves cleanly, the one beyond it resolves cleanly */
            if (relM > 2e-4 && relM < spanM - 2e-4) {
              const p = gr[2] || 0;
              glazed = !p || relM % p <= p * (1 - (gr[3] || 0)) + 1e-3;
              break;
            }
          }
        }
        const c = (inBand && glazed)
          ? (glassSpec
              ? glassSpec.lo.clone().lerp(glassSpec.hi,
                  (rf - band[0]) / Math.max(0.001, band[1] - band[0]))
              : glass)
          : fc;
        tp.push(path[k].x + (shear ? shear(path[k], rf) : 0),
                y0 + rf * (y1 - y0), path[k].z);
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
  /* ── A TIER'S AFT CAP IS A CHORD, OR THE RECORD'S OWN ARC (round 166) ────────────
     One emitter for the stern-crossing leg — the wall winding, the wing-rail cap and
     the promenade cap all take their points from it, so the rail can never disagree
     with the wall it rides. Straight: the old constant-x leg, byte for byte. Round
     (t.roundM): a circular arc through the same two corners bulging AFT by the
     recorded sagitta at centreline — hull +x is aft. Emits from +h to −h exclusive
     of the start point, ending exactly on the port corner. */
  const capPts = (t, h, st) => {
    const xF = (t.uB - 0.5) * L;
    const s = t.roundM || 0;
    const N = Math.max(6, Math.round(2 * h / st));
    const out = [];
    if (s > 0.01 && s < h * 0.9) {
      const R = (h * h + s * s) / (2 * s);
      const xc = xF + s - R;
      for (let k = 1; k <= N; k++) {
        const z = h - 2 * h * k / N;
        out.push({ x: xc + Math.sqrt(Math.max(0, R * R - z * z)), z });
      }
    } else {
      for (let k = 1; k <= N; k++) out.push({ x: xF, z: h - 2 * h * k / N });
    }
    return out;
  };

  const perim = (t, step) => {
    const st = step || paneW * 0.5;
    const pts = [];
    /* ── A WINGED TIER'S PLAN IS A NOTCH, NOT A CAP (round 165) ──────────────────────
       The sides run aft to the wing tips, the centre face stays at the tier's own
       recorded aft edge, and the terrace below sits recessed between the wings. One
       winding still — the band rhythm marches around the wing walls by arc length,
       exactly as it turns every other corner. The tip is cut with a one-bay chamfer
       at the inboard corner (the angled ends the plates show; the exact cut is below
       plate resolution), and the wing's inboard face rides half() at a constant
       depth, so the wing sweeps with the shell like everything the loft carries.
       A tier without wingU takes the old path, byte for byte. */
    if (t.wingU !== undefined) {
      const dep = t.wingDepth || B * 0.1;
      const inz = (u) => Math.max(B * 0.04, t.half(u) - dep);
      const chU = Math.min((S.tierBands && S.tierBands.pitchM) || paneW * 2,
                           (t.wingU - t.uB) * L * 0.6) / L;
      const leg = (u0, u1, zf) => {
        const N = Math.max(8, Math.round(Math.abs(u1 - u0) * L / st));
        for (let k = pts.length ? 1 : 0; k <= N; k++) {
          const u = u0 + (u1 - u0) * k / N;
          pts.push({ x: (u - 0.5) * L, z: zf(u) });
        }
      };
      leg(t.uA, t.wingU, u => t.half(u));                          // stbd, out to the tip
      pts.push({ x: (t.wingU - chU - 0.5) * L, z: inz(t.wingU - chU) });   // the chamfer
      leg(t.wingU - chU, t.uB, u => inz(u));                       // wing inboard face
      for (const q of capPts(t, inz(t.uB), st)) pts.push(q);       // the centre face
      leg(t.uB, t.wingU - chU, u => -inz(u));                      // port inboard face
      pts.push({ x: (t.wingU - 0.5) * L, z: -t.half(t.wingU) });   // port chamfer
      leg(t.wingU, t.uA, u => -t.half(u));                         // port side forward
      const hf = t.half(t.uA), NF = Math.max(6, Math.round(2 * hf / st));
      for (let k = 1; k <= NF; k++)
        pts.push({ x: (t.uA - 0.5) * L, z: -hf + 2 * hf * k / NF });
      return pts;
    }
    const NU = Math.max(60, Math.round((t.uB - t.uA) * L / st));
    for (let k = 0; k <= NU; k++) {
      const u = t.uA + (t.uB - t.uA) * k / NU;
      pts.push({ x: (u - 0.5) * L, z: t.half(u) });
    }
    for (const q of capPts(t, t.half(t.uB), st)) pts.push(q);
    for (let k = 1; k <= NU; k++) {
      const u = t.uB - (t.uB - t.uA) * k / NU;
      pts.push({ x: (u - 0.5) * L, z: -t.half(u) });
    }
    const hf = t.half(t.uA), NF = Math.max(6, Math.round(2 * hf / st));
    for (let k = 1; k <= NF; k++)
      pts.push({ x: (t.uA - 0.5) * L, z: -hf + 2 * hf * k / NF });
    return pts;
  };

  /* ── ⚠ A COLOUR THAT LIVES ON A VERTEX CANNOT HAVE AN EDGE ──────────────────────────
     The band's pier is 12% of a 2.6 m cabin pitch — 31 cm of white between balconies. It was
     drawn by stationing the wall every 31 cm and painting one station white, which sounds
     right and is not: the strip interpolates between vertices, so ONE white station bleeds a
     full quad each way and the pier arrives 93 cm wide. White then wins a third of the run
     and Queen Mary 2 read as a spreadsheet — a lattice of pale boxes rather than a dark
     balcony wall with thin dividers. Widening the mullion, narrowing it, or stationing finer
     all trade one blur for another, because the quantity has no edge to sharpen.
     Give it one: insert a PAIR of stations a millimetre apart at every pier boundary. The
     quad between them is 2 mm wide, so the gradient has nowhere to spread and the pier lands
     at its recorded width, on any pitch, at any beam. Called only for banded walls, so no
     unbanded hull moves. */
  const snapBand = (pts, pitch, pierFrac) => {
    if (!pitch || pitch <= 0) return pts;
    const eps = 0.001;
    const out = [pts[0]];
    let s = 0;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      const seg = Math.hypot(b.x - a.x, b.z - a.z);
      if (seg > 1e-9) {
        /* every boundary of the form (n + 0)·pitch and (n + pierFrac)·pitch inside this leg */
        const n0 = Math.floor(s / pitch);
        for (let n = n0; n <= Math.floor((s + seg) / pitch) + 1; n++) {
          for (const f of [0, pierFrac]) {
            const sb = (n + f) * pitch;
            if (sb <= s + eps || sb >= s + seg - eps) continue;
            for (const d of [-eps, +eps]) {
              const t2 = (sb + d - s) / seg;
              out.push({ x: a.x + (b.x - a.x) * t2, z: a.z + (b.z - a.z) * t2 });
            }
          }
        }
        s += seg;
      }
      out.push(b);
    }
    return out;
  };

  /* snapBand's sibling for GROUPED walls: the colour edges live at hull-u positions (group
     ends, and every light/pier boundary inside a group), not on an arc-length rhythm — so
     the pairs go in where a leg CROSSES those x stations. Front and stern cross-legs never
     cross one (their x is constant), which is what lets a group that reaches a tier's end
     glaze the whole end face. Same 1 mm pairs, same reason: a colour on a vertex cannot
     have an edge unless the vertices give it one. */
  const snapGroupsX = (pts, groups, spanL) => {
    const edges = [];
    for (const gr of groups) {
      const x0 = (gr[0] - 0.5) * spanL, x1 = (gr[1] - 0.5) * spanL;
      edges.push(x0, x1);
      const pitch = gr[2] || 0;
      if (pitch > 0) {
        const light = pitch * (1 - (gr[3] || 0));
        const span = (gr[1] - gr[0]) * spanL;
        for (let sM = 0; sM <= span; sM += pitch) {
          if (sM > 0) edges.push(x0 + sM);
          if (sM + light < span) edges.push(x0 + sM + light);
        }
      }
    }
    const eps = 0.001, out = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      const dx = b.x - a.x;
      if (Math.abs(dx) > 1e-9) {
        const cross = edges
          .map(xe => (xe - a.x) / dx)
          .filter(t2 => t2 > 1e-6 && t2 < 1 - 1e-6)
          .sort((p, q) => p - q);
        for (const t2 of cross) {
          for (const d of [-eps, +eps]) {
            const tt = t2 + d / Math.abs(dx);
            if (tt <= 0 || tt >= 1) continue;
            out.push({ x: a.x + dx * tt, z: a.z + (b.z - a.z) * tt });
          }
        }
      }
      out.push(b);
    }
    return out;
  };

  /* the roof is a plate over the tier's own plan — ShapeGeometry from the same perimeter,
     so the two cannot disagree. rotateX(+90°) maps shape-y onto world z unmirrored. */
  const roofPlate = (t, y, bare) => {
    const pts = perim(t);
    const sh = new THREE.Shape();
    sh.moveTo(pts[0].x, pts[0].z);
    for (let k = 1; k < pts.length; k++) sh.lineTo(pts[k].x, pts[k].z);
    const gg = new THREE.ShapeGeometry(sh);
    gg.rotateX(Math.PI / 2);
    gg.translate(0, y, 0);
    if (roofDeckMat && !bare) {
      /* DECK_FRAG lights by the DECLARED normal (the round-34 lesson), and rotateX(+90°)
         leaves ShapeGeometry's normals facing DOWN — plateMat's DoubleSide flip forgave
         that, a one-sun shader does not. Wind the top as the front face and declare up. */
      const ix = gg.getIndex().array;
      for (let k = 0; k + 2 < ix.length; k += 3) {
        const t2 = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t2;
      }
      const na = gg.getAttribute('normal');
      for (let k = 0; k < na.count; k++) na.setXYZ(k, 0, 1, 0);
      /* tagged superstructure, NOT 'deck': part.deck is the WEATHER deck to every audit
         rule that measures against it (the waterway rides ITS crown, not the boat deck's) */
      return tag(new THREE.Mesh(gg, roofDeckMat), 'superstructure',
                 cover.name.replace('Weather deck', 'House deck'), cover.what);
    }
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

  /* ── THE FANTAIL RAIL IS A WINDSCREEN, NOT AN OPEN RAIL (round 166) ─────────────────
     Both aft-quarter plates read the fantail's swept edge carrying a continuous
     translucent windscreen band under a dark top rail — panel posts and framing
     resolved on the 2011 astern plate, a person leaning on the top rail the height
     witness — where the model railed it open like every other deck. The screen rides
     the SAME path the rail rode; the panels lean OUTBOARD by the recorded angle, each
     top vertex displaced along its own point's horizontal normal (tangent × up, the
     sternLivery construction), so the sweep cannot open a seam against the deck edge
     it stands on. Record-gated: no fantailScreen, the open railRun, byte for byte. */
  const screen = S.fantailScreen;
  const glassMat = screen ? new THREE.MeshStandardMaterial({
    color: 0xaebfca, roughness: 0.22, metalness: 0.08,
    transparent: true, opacity: 0.42, depthWrite: false,
    side: THREE.DoubleSide }) : null;
  const screenRailMat = screen ? new THREE.MeshStandardMaterial({
    color: 0x4a3826, roughness: 0.55 }) : null;
  const windscreen = (pts, y) => {
    const hM = screen.hM, lean = Math.tan(screen.leanDeg * Math.PI / 180) * hM;
    const off = pts.map((p, k) => {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      let nx = -(b.z - a.z), nz = b.x - a.x;
      const nl = Math.hypot(nx, nz) || 1;
      return { x: nx / nl * lean, z: nz / nl * lean };
    });
    const sp = [], si = [];
    for (let k = 0; k < pts.length; k++)
      sp.push(pts[k].x, y, pts[k].z,
              pts[k].x + off[k].x, y + hM, pts[k].z + off[k].z);
    for (let k = 0; k + 1 < pts.length; k++)
      si.push(2 * k, 2 * k + 2, 2 * k + 1, 2 * k + 1, 2 * k + 2, 2 * k + 3);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sg.setIndex(si); sg.computeVertexNormals();
    const strip = new THREE.Mesh(sg, glassMat);
    strip.name = 'fantailScreen';
    g.add(strip);
    /* posts at panel pitch, leaning with the glass; the dark handrail rides the head */
    const post = k => {
      const d = new THREE.Vector3(off[k].x, hM, off[k].z);
      const len = d.length();
      const st2 = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.003, B * 0.003, len, 5), white);
      st2.position.set(pts[k].x + off[k].x / 2, y + hM / 2, pts[k].z + off[k].z / 2);
      st2.quaternion.setFromUnitVectors(up, d.normalize());
      g.add(st2);
    };
    let acc = 0;
    post(0);
    for (let k = 1; k < pts.length; k++) {
      acc += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
      if (acc >= 2.0 || k === pts.length - 1) { post(k); acc = 0; }
    }
    for (let k = 0; k + 1 < pts.length; k++) {
      const ax = pts[k].x + off[k].x, az = pts[k].z + off[k].z;
      const bx = pts[k + 1].x + off[k + 1].x, bz = pts[k + 1].z + off[k + 1].z;
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.01) continue;
      const dir = new THREE.Vector3(bx - ax, 0, bz - az).normalize();
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.0045, B * 0.0045, len, 6), screenRailMat);
      bar.position.set((ax + bx) / 2, y + hM, (az + bz) / 2);
      bar.quaternion.setFromUnitVectors(up, dir);
      g.add(bar);
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
    /* the ramped front: front-leg stations (exactly on the front plane — snapBand's
       interpolated insertions between two such stations stay on it to the bit) lean back
       from the tier's floor front to its ceiling front */
    const xF = (t.uA - 0.5) * L;
    const rampShear = t.uAHead !== undefined
      ? (pt, rf) => (Math.abs(pt.x - xF) < 1e-6 ? rf * (t.uAHead - t.uA) * L : 0)
      : null;
    /* the roof and the crest rail stand on the plan the tier ARRIVES at, so a ramped
       tier's roof is a brim over its own raked front rather than a shelf ahead of it */
    const tCeil = t.uAHead !== undefined
      ? { uA: t.uAHead, uB: t.uB, half: t.half,
          wingU: t.wingU, wingDepth: t.wingDepth, roundM: t.roundM } : t;
    if (bandRec) {
      const lo = new THREE.Color(bandRec.kind === 'balcony' ? 0x20262b : 0x272e35);
      const hi = new THREE.Color(bandRec.kind === 'balcony' ? 0x424c54 : 0x4a545d);
      /* ── A GLAZING SILL IS A HEIGHT THE PLATE GIVES, NOT A FRACTION OF A TIER ────────
         bot/top place the band as fractions of whatever tier height the model happens to
         have, so a mis-sized tier drags its glazing with it. bandsM, keyed by tier index,
         records what the plate actually reads — [sill, head] in metres over the waterline —
         and converts here against the tier's own floors. Absent, the fractions stand. */
      const bm = bandRec.bandsM ? bandRec.bandsM[i] : null;
      const tierH = t.y1 - t.y0;
      const bBot = bm ? Math.max(0.02, (bm[0] - t.y0) / tierH) : bandRec.bot;
      const bTop = bm ? Math.min(0.98, (bm[1] - t.y0) / tierH) : bandRec.top;
      const bRows = [0.0, bBot, bBot + 0.02, bTop - 0.02, bTop, 1.0];
      const pf = bandRec.pierFrac !== undefined ? bandRec.pierFrac : 0.16;
      const pitch = bandRec.pitchM || paneW;
      /* the wall's own stations only have to follow the SHAPE now — snapBand puts the
         colour edges in, so the step is a geometry choice rather than a rhythm one */
      const bStep = Math.max(0.6, pitch * 0.5);
      const grpList = bandRec.groups ? bandRec.groups[i] : null;
      if (grpList) {
        /* the record gives this tier its own window GROUPS — blank wall between them */
        g.add(wallLoft(snapGroupsX(perim(t, bStep), grpList, L), t.y0, t.y1, bRows,
                       [bBot, bTop], pitch, pf,
                       t.shell ? shellCol : null, { lo, hi }, rampShear,
                       { L, groups: grpList }));
      } else {
        g.add(wallLoft(snapBand(perim(t, bStep), pitch, pf), t.y0, t.y1, bRows,
                       [bBot, bTop], pitch, pf,
                       t.shell ? shellCol : null, { lo, hi }, rampShear));
      }
    } else {
      g.add(wallLoft(perim(t), t.y0, t.y1, rows, t.recess ? [2, 3] : [0.46, 0.68], paneW, 0.52,
                     t.recess ? recessCol : (t.shell ? shellCol : null), null, rampShear));
    }
    g.add(roofPlate(tCeil, t.y1, roofsBareTop && i === T.n - 1));
    if (i === T.n - 1) {
      railRun(perim(tCeil), t.y1);                    // the boat deck is railed all round
    } else {
      /* the exposed roof aft of the tier above is the promenade of this deck — railed along
         its sides and across its aft end, like the real thing */
      /* ── ⚠ AND THE ROOF FORWARD OF THE TIER ABOVE IS A DECK TOO ──────────────────────
         This railed only the AFT exposed roof, because the liner the rule was written for
         cascades aft and crests forward, so forward roofs did not exist. A motor yacht is
         built the other way about: Azzam's tiers step back going FORWARD, and each of those
         three roofs came out as a bare white plate 14 m long — a stack of paving stones, and
         the loudest thing wrong with her from above. A roof you can stand on carries a rail
         whichever end of the ship it faces. */
      const tAbove = T.tiers[i + 1];
      const promPath = (uEnd, uStart, capAt) => {
        const pr = [];
        const NP = Math.max(4, Math.round(Math.abs(uStart - uEnd) * L / (paneW * 0.5)));
        for (let k = 0; k <= NP; k++) {
          const u = uEnd + (uStart - uEnd) * k / NP;
          pr.push({ x: (u - 0.5) * L, z: t.half(u) });
        }
        /* the cap across the aft end: the tier's own recorded arc where the cap
           sits ON the tier's own face, the straight chord everywhere else */
        if (t.roundM !== undefined && capAt === t.uB) {
          for (const q of capPts(t, t.half(capAt), paneW * 0.5)) pr.push(q);
        } else {
          pr.push({ x: (capAt - 0.5) * L, z: -t.half(capAt) });
        }
        for (let k = NP; k >= 0; k--) {
          const u = uEnd + (uStart - uEnd) * k / NP;
          pr.push({ x: (u - 0.5) * L, z: -t.half(u) });
        }
        return pr;
      };
      const promenade = (uEnd, uStart, capAt) => railRun(promPath(uEnd, uStart, capAt), t.y1);
      /* ── AND THE WING STRIPS ARE DECKS TOO (round 165) ───────────────────────────
         A winged tier's roof runs aft along the sides past its own centre face; the
         exposed strip on each wing carries a rail out to the tip, around the chamfer
         and along the inboard edge, and the cap across the notch rails the terrace
         edge at the tier's own face. The rail starts aft of the tier above's own
         footprint — its wing tip where it has one. Without wings on this tier the
         path is the old promenade exactly. */
      const aStart = tAbove.wingU !== undefined ? tAbove.wingU : tAbove.uB;
      if (t.wingU !== undefined) {
        if (t.wingU > aStart + 0.012) {
          const dep = t.wingDepth || B * 0.1;
          const inz = (u) => Math.max(B * 0.04, t.half(u) - dep);
          const chU = Math.min((S.tierBands && S.tierBands.pitchM) || paneW * 2,
                               (t.wingU - t.uB) * L * 0.6) / L;
          const wp = [];
          const wleg = (u0, u1, zf) => {
            const N = Math.max(4, Math.round(Math.abs(u1 - u0) * L / (paneW * 0.5)));
            for (let k = wp.length ? 1 : 0; k <= N; k++) {
              const u = u0 + (u1 - u0) * k / N;
              wp.push({ x: (u - 0.5) * L, z: zf(u) });
            }
          };
          wleg(aStart, t.wingU, u => t.half(u));
          wp.push({ x: (t.wingU - chU - 0.5) * L, z: inz(t.wingU - chU) });
          wleg(t.wingU - chU, Math.max(t.uB, aStart), u => inz(u));
          const capAt = Math.max(t.uB, aStart), hn = inz(capAt);
          if (t.roundM !== undefined && capAt === t.uB) {
            for (const q of capPts(t, hn, paneW * 0.5)) wp.push(q);
          } else {
            wp.push({ x: (capAt - 0.5) * L, z: -hn });
          }
          wleg(Math.max(t.uB, aStart), t.wingU - chU, u => -inz(u));
          wp.push({ x: (t.wingU - 0.5) * L, z: -t.half(t.wingU) });
          wleg(t.wingU, aStart, u => -t.half(u));
          railRun(wp, t.y1);
        }
      } else if (t.uB > aStart + 0.012) {
        /* the fantail's own edge: the recorded windscreen where the record names
           this tier, the open promenade rail everywhere else */
        if (screen && screen.tier === i) windscreen(promPath(aStart, t.uB, t.uB), t.y1);
        else promenade(aStart, t.uB, t.uB);
      }
      /* a ramped tier's roof begins where its raked front ARRIVES — on the next tier's own
         foot — so the bare forward plates (and their rails) cease to exist with the steps */
      const fFront = t.uAHead !== undefined ? t.uAHead : t.uA;
      if (fFront < tAbove.uA - 0.012) promenade(tAbove.uA, fFront, fFront);
    }
  }

  /* ── ⚠ THE HULL'S PAINT DOES NOT STOP AT THE HULL ───────────────────────────────────
     Queen Mary 2's black rises over the counter: at the stern face the name is painted on
     black and ONE deck of white shows below the fantail rail, where the model dressed both
     shell strakes white the whole way round (every aft-quarter plate, both era ends —
     sternLivery provenance). The riser is PAINT ON THE SHELL, so it is drawn as paint: a
     strip riding the strake walls' own half(), its TOP EDGE the paint line — a colour on a
     vertex cannot have an edge, and a diagonal boundary crosses both stations and rows, so
     the edge has to be geometry. The line runs straight in u from the recorded knee
     (fromU, where it leaves the level sheer) to the recorded strake boundary at the stern
     extremity (strakes: how many white strakes the black swallows at the face); the strip
     stands 3 cm proud, parallel — never crossing — the wall it covers. Record-gated:
     a hull without sternLivery is vertex-identical. */
  const livery = S.sternLivery;
  const shellsN = T.tiers.filter(t => t.shell).length;
  if (livery && livery.strakes > 0 && shellsN > 0) {
    const kL = Math.min(livery.strakes, shellsN);
    const topY = T.tiers[kL - 1].y1;
    const t0 = T.tiers[0];
    const xTip = (t0.uB - 0.5) * L;
    const xKnee = Math.max((livery.fromU - 0.5) * L, (t0.uA - 0.5) * L + 1);
    const yAt = x => T.base + (topY - T.base) *
      Math.min(1, Math.max(0, (x - xKnee) / Math.max(1e-6, xTip - xKnee)));
    const liveryCol = new THREE.Color(S.topside || '#1d1d1f');
    for (let i = 0; i < kL; i++) {
      const t = T.tiers[i];
      /* this tier's own start: where the rising line reaches its floor */
      const xA = xKnee + (t.y0 - T.base) / Math.max(1e-6, topY - T.base) * (xTip - xKnee);
      const uA = Math.max(t.uA, xA / L + 0.5), uB = t.uB;
      if (uB - uA < 1e-4) continue;
      const pts = [];
      const NU = Math.max(12, Math.round((uB - uA) * L));       // ~1 m stations
      for (let q = 0; q <= NU; q++) {                            // starboard, fwd→aft
        const u = uA + (uB - uA) * q / NU;
        pts.push({ x: (u - 0.5) * L, z: t.half(u) });
      }
      const hb = t.half(uB), NB = Math.max(8, Math.round(2 * hb));
      for (let q = 1; q <= NB; q++)                              // across the stern face
        pts.push({ x: (uB - 0.5) * L, z: hb - 2 * hb * q / NB });
      for (let q = 1; q <= NU; q++) {                            // port, aft→fwd
        const u = uB - (uB - uA) * q / NU;
        pts.push({ x: (u - 0.5) * L, z: -t.half(u) });
      }
      const sp = [], sc = [], si = [];
      for (let q = 0; q < pts.length; q++) {
        const a = pts[Math.max(0, q - 1)], b = pts[Math.min(pts.length - 1, q + 1)];
        let nx = -(b.z - a.z), nz = b.x - a.x;                   // tangent × up: outboard
        const nl = Math.hypot(nx, nz) || 1;
        nx = nx / nl * 0.03; nz = nz / nl * 0.03;
        const yTop = Math.min(t.y1, yAt(pts[q].x));
        sp.push(pts[q].x + nx, t.y0, pts[q].z + nz,
                pts[q].x + nx, yTop, pts[q].z + nz);
        sc.push(liveryCol.r, liveryCol.g, liveryCol.b,
                liveryCol.r, liveryCol.g, liveryCol.b);
      }
      for (let q = 0; q + 1 < pts.length; q++)
        si.push(2 * q, 2 * q + 2, 2 * q + 1, 2 * q + 1, 2 * q + 2, 2 * q + 3);
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      sg.setIndex(si); sg.computeVertexNormals();
      const strip = new THREE.Mesh(sg, wallMat);
      strip.name = 'sternLivery';
      g.add(strip);
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
  /* ── ⚠ A BRIDGE WING OVERHANGS, AND THE PIER IS WHY ─────────────────────────────────
     The wings were built to stop at the ship's own side ("flush, not overhanging"), which
     is right for a hull conned from a deck inside her sheer and wrong for every ship since
     the war: an officer laying a 41 m beam against a quay has to see the shell plating go
     home, so the wing is cantilevered OUT past it — Queen Mary 2 is 41 m on the waterline
     and 45 m across the bridge wings, and that pair of shoulders is one of the two or three
     things the eye uses to know her. bridgeBeamM is the recorded breadth ACROSS the wings,
     in metres — the number a register actually carries — not a delta from a hull half-
     breadth that varies with where the bridge happens to stand; unset keeps the flush wing
     every earlier hull was built with.
     The wheelhouse itself is sized by the record too — bridgeM is its fore-and-aft depth in
     metres and bridgeHalf its half-breadth as a fraction of the beam — because a 10 m box
     on a 345 m ship is a hut, and hers runs nearly the full width of the deck. */
  const bg = new THREE.Group();
  const uW0 = top.uA + 0.004;
  const uW1 = Math.min(top.uB, uW0 + (S.bridgeM ? S.bridgeM / L : 0.030));
  const whHalf = Math.min(B * (S.bridgeHalf || 0.27), top.half(uW0) - B * 0.01);
  const whT = {
    uA: uW0, uB: uW1, half: () => whHalf,
  };
  const whH = T.dh * 0.92;
  bg.add(wallLoft(perim(whT), T.top, T.top + whH,
                  [0.0, 0.30, 0.33, 0.82, 0.85, 1.0], [0.30, 0.85], paneW * 1.5, 0.30));
  /* the wheelhouse stands on the top tier's roof, so under 'terraces' it is as bare as
     the plate it stands on (r161: QM2's above-crest works read white on both aerials) */
  bg.add(roofPlate(whT, T.top + whH, roofsBareTop));
  const wingBeam = S.bridgeBeamM || 0;
  for (const sgn of [-1, 1]) {
    const uMid = (uW0 + uW1) / 2;
    const hullHalf = wingBeam ? wingBeam / 2
                              : Math.abs(surfacePoint(S, H, uMid, 1.0)[2]);
    if (hullHalf > whHalf + B * 0.02) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry((uW1 - uW0) * L, T.dh * 0.06, hullHalf - whHalf), plateMat);
      wing.position.set((uMid - 0.5) * L, T.top + T.dh * 0.03, sgn * (whHalf + hullHalf) / 2);
      bg.add(wing);
      const wx0 = (uW0 - 0.5) * L, wx1 = (uW1 - 0.5) * L;
      const wpts = [{ x: wx0, z: sgn * whHalf }, { x: wx0, z: sgn * hullHalf },
                    { x: wx1, z: sgn * hullHalf }, { x: wx1, z: sgn * whHalf }];
      /* a cantilevered wing carries a solid parapet, not open rail: it is a working deck
         over the ship's side and the thing that reads in profile is its shoulder */
      if (wingBeam > 0) {
        const par = new THREE.Mesh(
          new THREE.BoxGeometry((uW1 - uW0) * L, T.dh * 0.34, B * 0.012), plateMat);
        par.position.set((uMid - 0.5) * L, T.top + T.dh * 0.23, sgn * hullHalf);
        bg.add(par);
        const end = new THREE.Mesh(
          new THREE.BoxGeometry(B * 0.012, T.dh * 0.34, hullHalf - whHalf), plateMat);
        end.position.set((uW0 - 0.5) * L, T.top + T.dh * 0.23, sgn * (whHalf + hullHalf) / 2);
        bg.add(end);
      } else {
        railRun(wpts, T.top + T.dh * 0.06);
      }
    }
  }
  const bTag = tag(bg, 'bridge', 'Navigating bridge');
  bTag.userData.part.what =
    'The ship is conned from here: a wheelhouse at the forward end of the boat deck, more '
    + 'glass than wall, with wings running out to — and on a modern ship past — her sides, '
    + 'because a beam this wide is brought alongside a pier by an officer standing at its '
    + 'very edge, watching the plating go home.';
  g.add(bTag);

  /* ── ⚠ THE TOP OF A LINER IS NOT A TABLE ────────────────────────────────────────────
     With the tiers flush-sided and the terraces measured, Queen Mary 2's crest came out as
     220 m of blank white plate carrying one funnel and a wire, which is the loudest thing
     wrong with her from any angle above the beam: a real sun deck is the most crowded deck
     on the ship. And the plate SAYS what stands there — segmenting her silhouette above the
     top-deck line returns each structure's u-span and its height over the water, and every
     one of those numbers was already measured and then thrown away.
     topWorks is that list: {u0, u1, hM, half, kind} per structure, hM above the crest roof,
     half as a fraction of the tier's own half-breadth. 'house' is a white deckhouse with a
     window band, 'dome' a radome, 'uptake' a dark stack, 'casing' a low white machinery
     housing. Nothing is drawn for a hull whose record has no list, so no other ship moves. */
  const works = S.topWorks || [];
  if (works.length) {
    const wg = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.62, metalness: 0.30 });
    for (const w of works) {
      const uM = (w.u0 + w.u1) / 2;
      const len = Math.max(1, (w.u1 - w.u0) * L);
      const half = Math.max(B * 0.05, top.half(uM) * (w.half !== undefined ? w.half : 0.55));
      const x = (uM - 0.5) * L, h = w.hM;
      if (w.kind === 'dome') {
        const d = new THREE.Mesh(
          new THREE.SphereGeometry(Math.min(h, len / 2), 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          plateMat);
        d.position.set(x, T.top, 0);
        wg.add(tag(d, 'bridge', 'Radome',
          'A radar scanner under a weatherproof shell. She carries more than one because a '
          + 'single set blind astern of her own funnel is no use in the Western Approaches.'));
      } else if (w.kind === 'uptake') {
        const c = new THREE.Mesh(
          new THREE.CylinderGeometry(len * 0.34, len * 0.40, h, 14), dark);
        c.position.set(x, T.top + h / 2, 0);
        wg.add(tag(c, 'funnel', 'Gas turbine uptake',
          'The gas turbines do not sit in the machinery spaces at all — they are in a housing '
          + 'abaft the funnel, because their intake and exhaust are too big to trunk that far '
          + 'down through a passenger ship.'));
      } else {
        /* a house or a casing: one banded wall and a plate, from the same loft the tiers use */
        const wt = { uA: w.u0, uB: w.u1, half: () => half };
        const band = w.kind === 'casing' ? null : [0.34, 0.80];
        wg.add(wallLoft(perim(wt, Math.max(0.6, paneW * 0.5)), T.top, T.top + h,
                        band ? [0.0, band[0], band[0] + 0.03, band[1] - 0.03, band[1], 1.0]
                             : [0.0, 0.5, 1.0],
                        band || [2, 3], paneW * 1.3, 0.42));
        /* deck works stand on the crest too — bare under 'terraces', like the wheelhouse */
        wg.add(roofPlate(wt, T.top + h, roofsBareTop));
      }
    }
    const wTag = tag(wg, 'superstructure', 'Deck works');
    wTag.userData.part.what =
      'What stands on the open top deck: machinery casings, the funnel housing, radar, and '
      + 'the deckhouses over the public rooms. Their positions and heights are read off a '
      + 'scale profile of the ship, one structure at a time.';
    g.add(wTag);
  }

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
    const fst = drawnFunnelStations(S);   // a cowl dodges a real casing, not an empty slot
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

/* ⚠ A SLOT IS NOT A FUNNEL. funnelStations() lists every station a funnel COULD occupy —
   the gaps between masts plus a virtual after-slot at 0.92 — and buildFunnel draws only the
   first S.funnels of them. Anything that asks "does a stack stand here" must ask about the
   DRAWN stations: the steamer's spanker boom was clamped to 5.4 m by a phantom funnel at
   0.92 that her one real funnel (at 0.26) never occupied, and cowl ventilators were skipped
   around the same empty air. One funnel, one entry, in drawing order — duplicates kept,
   because the modulo cycling is buildFunnel's own behaviour for records without funnelAt. */
function drawnFunnelStations(S) {
  const n = S.funnels || 0;
  if (!n) return [];
  const slots = funnelStations(S), out = [];
  for (let i = 0; i < n; i++)
    out.push(slots.length ? (slots[i % slots.length] || 0.50)
                          : (n === 1 ? 0.50 : 0.42 + i * (0.20 / (n - 1))));
  return out;
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
  const stations = drawnFunnelStations(S);
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
    const u = stations[i];
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
    /* ── ⚠ A FUNNEL IS AN OVAL, AND ON A MODERN LINER A VERY LONG ONE ──────────────────
       Round is the easy solid and it is what every stack here has been. A real uptake
       casing is longer fore-and-aft than athwartships, because that is the shape the
       boiler flat under it has and the shape that costs least in wind resistance: Queen
       Mary 2's measures 24 m fore-and-aft on a 12 m width, and drawn round she came out
       either too narrow to see (at the true width) or a barrel wider than her own bridge
       (at the true length). funnelOval is the fore-and-aft axis as a multiple of the
       athwartships one; 1 is round and is what every existing funnel keeps. */
    const oval = S.funnelOval || 1;
    const caseH = h * 0.085, caseR = ri * 1.34;
    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(caseR * 0.94, caseR, caseH, 20), black);
    if (oval !== 1) casing.scale.x = oval;
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
    /* the oval goes on BEFORE the shear: x' = oval·x + tan(θ)·y keeps the lean the record's
       number, where shearing first and stretching after would multiply the two */
    if (oval !== 1) sg.scale(oval, 1, 1);
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
    /* tagged, because an untagged mesh folds into its parent's row and fattens it: the r103
       audit read Endurance's funnel 1.83 m fore-and-aft because this pipe, nameless, merged
       into the stack's own bounding box (and the r99 rule already says the picker must be
       able to name every part) */
    g.add(tag(pipe, 'funnel', 'Steam pipe',
      'The waste-steam pipe alongside the uptake — what actually roars when the safety '
      + 'valves lift.'));
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

  /* ── WHAT EACH ELEMENT STANDS ON ──────────────────────────────────────────────────────
     A cluster element declares its footing: onTier (a dome standing on that tier's roof
     terrace) or fairFootTier (the terrace the fairing lands on). Azzam's plate reads all
     three aft domes with bases at 19.5–19.8 m — the tier-3 terrace, a full deck module
     below the crest roof they were footed on through round 76 — and the fairing's swept
     line crosses 22 m at u 0.679 on its way down to the same terrace. */
  const tierRoof = ti => (T && T.tiers[ti]) ? T.tiers[ti].y1 : roof;
  const fairFootY = (C.fairFootTier !== undefined ? tierRoof(C.fairFootTier) : roof) - 0.25;
  /* the local surface the stack rises from: the block's roof forward of its aft end, the
     fairing's sloping top over the tail, the footing terrace abaft the foot. Roots bury
     a fixed depth below this — a root hung from blockTopM would stand the aft pipes and
     the casing fin in the air once the fairing sweeps to the terrace. */
  const supportAt = u => {
    if (!C.blockU) return roof;
    if (u <= C.blockU[1]) return C.blockTopM;
    if (C.fairAftU !== undefined && u <= C.fairAftU) {
      const s = (u - C.blockU[1]) / (C.fairAftU - C.blockU[1]);
      return C.blockTopM + (fairFootY - C.blockTopM) * s;
    }
    return C.fairFootTier !== undefined ? tierRoof(C.fairFootTier) : roof;
  };
  /* the fairing's plan half-width at a station — the quadratic ogive taper the tail
     shows from above. Zero abaft the foot; the full block width forward of the tail. */
  const spineHalfAt = u => {
    if (!C.blockU || C.fairAftU === undefined) return 0;
    if (u <= C.blockU[1]) return wLower / 2;
    if (u >= C.fairAftU) return 0;
    const s = (u - C.blockU[1]) / (C.fairAftU - C.blockU[1]);
    return 0.9 + (wLower * 0.42 - 0.9) * (1 - s) * (1 - s);
  };
  /* the filler exists to carry the cluster's footing UP from a house roof that stops short
     of the block top. Where the record's houseTopM puts the roof AT the block top, there is
     no gap to fill — and a zero-height box would lay its cap in the crest roof plate's own
     plane, which is the two-surfaces flicker by construction. */
  if (C.blockU && C.blockTopM - roof > 0.05) {
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
  /* the fairing sweeping the lower block's roof down aft — the tail the stack rises from.
     ⚠ IT LANDS ON THE TERRACE, NOT THE CREST ROOF: the plate's swept line crosses 22 m at
     u 0.679 and reaches the tier-3 terrace at its foot. And it is a TAIL in plan, not a
     prism — it narrows from the block's width to a spine at the foot, because the
     terrace-footed radome pairs stand either side of it, and a constant-width wedge at
     terrace height would pass straight through their shells. The profile is the plate's;
     the plan taper is derived, a profile photograph having no width in it. */
  if (C.fairAftU !== undefined && C.blockU) {
    const x0 = X(C.blockU[1]), x1 = X(C.fairAftU);
    const hw = wLower * 0.42;
    const sTop = s => C.blockTopM + (fairFootY - C.blockTopM) * s;
    const sHalf = s => 0.9 + (hw - 0.9) * (1 - s) * (1 - s);
    const N = 12, v = [];
    const quad = (a, b, c, d) => { v.push(...a, ...b, ...c, ...a, ...c, ...d); };
    for (let i = 0; i < N; i++) {
      const s0 = i / N, s1 = (i + 1) / N;
      const xA = x0 + (x1 - x0) * s0, xB = x0 + (x1 - x0) * s1;
      const wA = sHalf(s0), wB = sHalf(s1);
      const tA = sTop(s0), tB = sTop(s1);
      quad([xA, tA, -wA], [xB, tB, -wB], [xB, fairFootY, -wB], [xA, fairFootY, -wA]);
      quad([xA, fairFootY, wA], [xB, fairFootY, wB], [xB, tB, wB], [xA, tA, wA]);
      quad([xA, tA, wA], [xB, tB, wB], [xB, tB, -wB], [xA, tA, -wA]);
      quad([xA, fairFootY, -wA], [xB, fairFootY, -wB], [xB, fairFootY, wB], [xA, fairFootY, wA]);
    }
    quad([x0, fairFootY, -hw], [x0, C.blockTopM, -hw], [x0, C.blockTopM, hw], [x0, fairFootY, hw]);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    wg.computeVertexNormals();
    g.add(tag(new THREE.Mesh(wg, white), 'cluster', 'Stack fairing',
      'The swept tail running the block roof down to the aft terrace. Profile derived from the plate — it crosses 22 m at u 0.679 and lands at the recorded foot; the plan taper is derived, the radome pairs standing either side of the spine.'));
  }

  /* the stack: a dark raked casing fin carrying a close rank of polished uptake pipes.
     ⚠ THE RAKE IS FORWARD — the plate is unambiguous, each pipe edge leans toward the
     stem — and it is drawn as the record states it, not as convention expects. */
  if (C.stack) {
    const K = C.stack;
    const rakeF = -Math.tan((K.rakeFwdDeg || 0) * Math.PI / 180);   // forward is -x
    /* each element roots a fixed depth below its own supporting surface — over the swept
       tail that surface falls away aft, and a root hung from the block top would stand
       the aft pipes and the fin in the air above it */
    if (K.finU !== undefined) {
      const finRoot = supportAt(K.finU) - 1.8;
      const finH = K.finTopM - finRoot;
      const fg = new THREE.BoxGeometry(K.finChordM || 4.2, finH, 3.4);
      fg.applyMatrix4(new THREE.Matrix4().set(
        1, rakeF, 0, rakeF * finH / 2,
        0, 1,     0, 0,
        0, 0,     1, 0,
        0, 0,     0, 1));
      const fin = new THREE.Mesh(fg, finMt);
      fin.position.set(X(K.finU), finRoot + finH / 2, 0);
      g.add(tag(fin, 'cluster', 'Stack casing',
        'The dark raked casing the uptakes rise through. Height and rake derived from the plate.'));
    }
    const n = K.pipes || 4;
    const [u0, u1] = K.uBase;                             // forward, aft
    /* ⚠ A RED BAND IS A LIVERY AND A LIVERY HAS TO BE SEEN TO BE CLAIMED. This was
       painted on unconditionally, read off the small delivery photograph; the Bremen
       broadside at six times that scale shows four plain steel uptakes behind the white
       fairing with no band on any of them, and the band was the one thing making a motor
       yacht's exhausts read as a liner's funnel. It is a record's declaration now
       (stack.bandCol) and nothing wears one by default. */
    const steel = new THREE.Color(0xb9bcbf),
          band = K.bandCol ? new THREE.Color(K.bandCol) : null,
          rim = new THREE.Color(0x2a2c2e);
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0 : i / (n - 1);                // 0 forward, 1 aft
      const u = u0 + (u1 - u0) * f;
      const top = K.topFwdM + (K.topAftM - K.topFwdM) * f;
      const rootY = supportAt(u) - 1.2;
      const Lp = top - rootY, r = (K.pipeDiaM || 1.4) / 2;
      const pg = new THREE.CylinderGeometry(r * 0.96, r, Lp, 20, 24);
      const pos = pg.attributes.position, col = [];
      for (let j = 0; j < pos.count; j++) {
        const ya = pos.getY(j) + Lp / 2;                  // 0 at base, Lp at head
        const c = ya > Lp - 0.25 ? rim
                : (band && ya > Lp - 1.6 && ya < Lp - 0.9) ? band : steel;
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
     DIAMETER is the plate's vertical measure, the ±0.55 m fore-aft stagger resolves the
     blob's width. A dome with onTier stands on that tier's roof terrace; the plate reads
     the shells almost on the deck (bases 19.5–19.8 m over a 19.4 m terrace), so the
     sphere bottom sits 0.3 m over its footing and the pedestal hides under the bulge.
     A pair amidst the fairing's run takes its athwartships stance off the spine's local
     half-width plus a working clearance — the stance is derived, the profile photograph
     having no width in it. */
  for (const d of C.domes || []) {
    const base = d.upper ? C.upperTopM : (d.onTier !== undefined ? tierRoof(d.onTier) : roof);
    const spine = (!d.upper && supportAt(d.u) > base + 0.1) ? spineHalfAt(d.u) : 0;
    const off = Math.max(d.dM / 2 + 0.25, spine + d.dM / 2 + 0.5);
    const stations = d.pair ? [[off, 0.55], [-off, -0.55]] : [[0, 0]];
    for (const [dz, dx] of stations) {
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(d.dM * 0.16, d.dM * 0.19, 0.9, 12), white);
      ped.position.set(X(d.u) + dx, base + 0.2, dz);
      g.add(tag(ped, 'cluster', 'Radome pedestal',
        'Stands the dome clear of the deck wash. Derived from the plate.'));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(d.dM / 2, 24, 16), domeMt);
      dome.position.set(X(d.u) + dx, base + 0.3 + d.dM / 2, dz);
      g.add(tag(dome, 'cluster', 'Radome',
        'A weatherproof shell over a stabilised satellite dish — the sphere is the cheapest shape that lets the antenna inside slew freely. Diameter, station and base height derived from the plate against the recorded length.'));
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
  /* ── ⚠ A MODERN YACHT'S TENDERS STOW INSIDE THE SHELL ────────────────────────────────
     boatsInboard: the record says the boats live in a garage within the hull. Azzam grew
     from a 145 m concept to 180.6 m partly to make room for tenders INSIDE, and her
     delivery photograph shows a bare topside — the four white boats this builder used to
     stand on her crest contradicted the ship's own photograph on the card beside her.
     An inboard record draws nothing topside, whatever the count says; the card carries
     the stowage instead. */
  if (S.boatsInboard) return;
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
      /* ⚠ A RECESS IS A HOLE, AND WHAT STOWS IN IT IS INBOARD OF THE SIDE. This read
         `half + boatB * 0.35` under a comment saying "inside the hull side", and it is the
         other sign: it hung all 22 boats OUTSIDE the tier wall, so Queen Mary 2 measured
         45.4 m across a 41 m beam and her boats stood off her flank like panniers. They
         belong in the gallery — outer flank just proud of the dark back wall so they read,
         the whole boat inside the ship's own side, which is the point of putting them
         there. (The comment was right and the arithmetic was not; only a measured breadth
         could tell them apart.) */
      const z = sgn * (recT ? half - boatB * 0.35 : half - B * 0.045);
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
     beam and its flight-deck beam are two very different numbers. Its LENGTH is its own
     attested figure too (flightDeckLen — 1,092 ft on a 1,106 ft ship), not the hull's:
     drawn from lwl it stood 10.5 m SHORTER than the shell, with the fantail proud of the
     round-down, which no photograph of a Ford supports. Anchored so the round-down
     overhangs the fantail and bow tip → round-down spans the record's loa exactly — the
     deck, not the shell, is what a carrier's length overall measures to (r137). */
  const dkL = S.flightDeckLen || L * 1.02;
  const dkCx = S.flightDeckLen ? (-L / 2 + H.rake(0) + S.loa - dkL / 2) : 0;
  const fd = new THREE.Mesh(new THREE.BoxGeometry(dkL, B * 0.045, deckW), grey);
  fd.position.set(dkCx, y, 0);
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
  /* ── THE TOWER IS ONE LOFT (round 146) ─────────────────────────────────────────────
     Until r146 the island was three stacked slabs with a glass box laid over each upper
     tier and a picket of 22 mullion boxes over the glass — 27 boxes faking one welded
     structure, the r144 step class stood on end. The tower is one loft now, on the same
     tier stations: the faces CANT inward as they rise (the Ford's flat panels lean for
     radar-cross-section shaping), the corners are chamfered, each level steps in across
     a real shelf, and the bridge and flying-control bands are ROWS OF WINDOWS LET INTO
     THE FACE — glass set back behind structural piers with a jamb, sill and head to
     every opening, the r141/r142 pierced-wall law wrapped round a loft. One geometry,
     two material groups (structure, glass). Paired stations keep every shelf, sill and
     head sharp; paired perimeter points keep every arris and jamb sharp (the snapBand
     lesson — an edge must be GIVEN, not hoped for). End grain closed both ends. */
  const CANT = 0.10, CHAM = 1.1, NP = 11, PIER = 0.15, REV = 0.28;
  let yB = 0;
  const lv = tiers.map(t => {
    const o = { y0: yB, h: t[2], a: t[0] / 2, b: t[1] / 2, cx: t[3] };
    /* window run clamped so the outermost pier lands exactly at the canted-top chamfer */
    o.run = Math.min(t[0] * 0.47, o.a - o.h * CANT - CHAM - PIER);
    yB += t[2];
    return o;
  });
  const sta = [];
  lv.forEach((v, ti) => {
    sta.push({ v, y: v.y0, d: 0 });
    if (ti >= 1) {
      const lo = v.y0 + v.h * 0.49, hi = v.y0 + v.h * 0.79;
      sta.push({ v, y: lo, d: 0 }, { v, y: lo + 0.02, d: REV },
               { v, y: hi - 0.02, d: REV }, { v, y: hi, d: 0 });
    }
    sta.push({ v, y: v.y0 + v.h, d: 0 });
  });
  /* one station's perimeter, walked so every winding faces OUT (+x face toward +z,
     +z face toward −x: axis × tangent = outward, the r145 rule). Points flagged w
     are pane edges; on inset stations they move in by the reveal, and the paired
     unflagged point beside each stays on the face — the quad between them is the jamb. */
  const ring = (st) => {
    const v = st.v, sh = v.h * CANT * ((st.y - v.y0) / v.h);
    const a = v.a - sh, b = v.b - sh, c = v.cx, d = st.d;
    const pts = [];
    const P = (x, z, w) => pts.push([x, z, !!w]);
    const edges = [];
    for (let j = 0; j <= NP; j++) {
      const xj = v.run - (j / NP) * 2 * v.run;
      edges.push([xj + PIER, j > 0], [xj + PIER, false],
                 [xj - PIER, false], [xj - PIER, j < NP]);
    }
    P(c + a, -(b - CHAM)); P(c + a, -(b - CHAM));
    P(c + a, b - CHAM);    P(c + a, b - CHAM);
    P(c + a - CHAM, b);    P(c + a - CHAM, b);
    edges.forEach(([x, w]) => P(c + x, b - (w ? d : 0), w));
    P(c - a + CHAM, b);    P(c - a + CHAM, b);
    P(c - a, b - CHAM);    P(c - a, b - CHAM);
    P(c - a, -(b - CHAM)); P(c - a, -(b - CHAM));
    P(c - a + CHAM, -b);   P(c - a + CHAM, -b);
    edges.slice().reverse().forEach(([x, w]) => P(c + x, -(b - (w ? d : 0)), w));
    P(c + a - CHAM, -b);   P(c + a - CHAM, -b);
    return pts;
  };
  const K = 16 + 8 * (NP + 1), pos = [], flag = [];
  const rings = sta.map(st => ring(st));
  const addRing = (r, ya) => { const base = pos.length / 3;
    r.forEach(([x, z, w]) => { pos.push(x, ya, z); flag.push(w); }); return base; };
  const bases = sta.map((st, i) => addRing(rings[i], st.y));
  const iDark = [], iGlass = [];
  const row = (A, Bq, glassRow) => {
    for (let k = 0; k < K; k++) {
      const a2 = A + k, b2 = A + (k + 1) % K;
      const pane = glassRow && flag[a2] && flag[b2];
      (pane ? iGlass : iDark).push(a2, Bq + k, b2, b2, Bq + k, Bq + (k + 1) % K);
    }
  };
  /* wall rows run within a tier only; each shelf and each cap gets its OWN duplicated
     rings, so horizontal grain cannot tilt the wall's vertex normals — the cap fan's
     uneven triangles striped the whole lower face at the window rhythm before — and a
     shelf earns a sharp arris the same way the corners do */
  const shared = s => sta[s].v === sta[s + 1].v && sta[s].d === sta[s + 1].d;
  for (let s = 0; s < sta.length - 1; s++)
    if (shared(s))
      row(bases[s], bases[s + 1], sta[s].d > 0);
  /* shelves and the sill/head rows — anywhere the section jumps — on their own rings */
  for (let s = 0; s < sta.length - 1; s++)
    if (!shared(s))
      row(addRing(rings[s], sta[s].y), addRing(rings[s + 1], sta[s + 1].y), false);
  /* end grain closed both ends — fan caps, wound outward, on their own rims */
  const R0 = addRing(rings[0], 0);
  const c0 = pos.length / 3; pos.push(lv[0].cx, 0, 0); flag.push(false);
  for (let k = 0; k < K; k++) iDark.push(c0, R0 + k, R0 + (k + 1) % K);
  const RT = addRing(rings[sta.length - 1], yB);
  const cT = pos.length / 3; pos.push(lv[2].cx, yB, 0); flag.push(false);
  for (let k = 0; k < K; k++) iDark.push(cT, RT + (k + 1) % K, RT + k);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tg.setIndex(iDark.concat(iGlass));
  tg.addGroup(0, iDark.length, 0);
  tg.addGroup(iDark.length, iGlass.length, 1);
  tg.computeVertexNormals();
  isl.add(new THREE.Mesh(tg, [dark, glassI]));
  /* the uptakes, carried up through the after end of the tower */
  for (const zz of [-islW * 0.22, islW * 0.22]) {
    const up = new THREE.Mesh(
      new THREE.BoxGeometry(L * 0.020, B * 0.115, islW * 0.34), dark);
    up.position.set(L * 0.038, tiers[0][2] + B * 0.0575, zz);
    isl.add(up);
  }
  /* the flat radar arrays, fixed to the tower's faces — no rotating dish, which is the
     single most recognisable thing about a modern warship's upperworks. The faces cant
     now, so each panel sits ON its own face and leans WITH it, a fifth of its thickness
     proud — at the old fixed offsets the side panels floated 0.13 m clear of the leaning
     wall and the aft panel stood 1.8 m out of it at the top. */
  for (const f of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const pan = new THREE.Mesh(
      new THREE.BoxGeometry(f[0] ? L * 0.008 : L * 0.016, B * 0.058,
                            f[0] ? islW * 0.55 : islW * 0.06), radarM);
    const py = tiers[0][2] + B * 0.052;
    const vv = lv[1], sh2 = vv.h * CANT * ((py - vv.y0) / vv.h);
    if (f[0]) {
      pan.position.set(vv.cx + f[0] * (vv.a - sh2 - L * 0.004 + 0.19), py, 0);
      pan.rotation.z = f[0] * CANT;
    } else {
      pan.position.set(vv.cx, py, f[1] * (vv.b - sh2 + islW * 0.006));
      pan.rotation.x = -f[1] * CANT;
    }
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
/* ⚠ AN AIRFRAME IS ONE BODY, NOT A CONE ABUTTING A BRICK (round 145). Until r145 each
 * parked fighter was ten boxes and a cone: a 13.2 m rectangular slab with a nose cone
 * abutting it — the r144 step class again, two meshes pretending to be one body — slab
 * wings swung about y to fake sweep, rectangular fins and stabs. 120 of the carrier's
 * 169 box meshes, the fleet's largest named box class after the ro blades closed.
 * Now the airframe is ONE lofted fuselage from radome tip to nozzles, a glass bubble
 * canopy, and every flying surface a real planform. Six geometries built ONCE and shared
 * by all twelve aircraft, because a deck park is twelve of the same airframe (the r144
 * ro-blade rule). Port surfaces are the same geometry under a -PI/2 rotation where
 * starboard takes +PI/2 — proper rotations, so every winding stays outward and no
 * negative scale is needed (the r118 normals lesson). The gear stays cylinders because
 * a strut IS a round leg (the loom rule). */
function airframeGeometries() {
  /* the fuselage loft: stations [x, halfW, halfH, yCentre], sections superelliptic
     (exponent 2.5 — a jet body is rounder than a brick, squarer than a tube). The
     y/z envelope is the old box's own: y 0.80–2.30, z ±0.95. */
  const stations = [
    [-11.0, 0.10, 0.10, 1.55],
    [ -9.2, 0.52, 0.50, 1.55],
    [ -6.0, 0.95, 0.72, 1.52],
    [ -3.0, 0.95, 0.75, 1.55],
    [  0.5, 0.95, 0.72, 1.52],
    [  4.0, 0.85, 0.62, 1.47],
    [  7.5, 0.48, 0.38, 1.42]];
  const K = 12, pos = [], idx = [];
  const se = (v, m) => m * Math.sign(v) * Math.pow(Math.abs(v), 2 / 2.5);
  stations.forEach(([x, w, h, yc]) => {
    for (let k = 0; k < K; k++) { const th = (k / K) * 2 * Math.PI;
      pos.push(x, yc + se(Math.sin(th), h), se(Math.cos(th), w)); }
  });
  for (let s = 0; s < stations.length - 1; s++)
    for (let k = 0; k < K; k++) {
      const a = s * K + k, b = s * K + (k + 1) % K;
      idx.push(a, a + K, b, b, a + K, b + K);
    }
  /* end grain closed both ends — fan caps, wound outward */
  const c0 = pos.length / 3; pos.push(-11.0, 1.55, 0);
  for (let k = 0; k < K; k++) idx.push(c0, k, (k + 1) % K);
  const c1 = pos.length / 3; pos.push(7.5, 1.42, 0);
  const last = (stations.length - 1) * K;
  for (let k = 0; k < K; k++) idx.push(c1, last + (k + 1) % K, last + k);
  const fus = new THREE.BufferGeometry();
  fus.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fus.setIndex(idx); fus.computeVertexNormals();

  /* a flying surface is a planform, not a rectangle: a polygon in the shape plane,
     extruded its own thickness, the thickness centred on the plane */
  const plate = (pts, t) => {
    const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
    return g;
  };

  return {
    fus,
    canopy: new THREE.SphereGeometry(1, 8, 6),
    /* inner wing, planform (x chord, span): LERX strake at the root sweeping into a
       37-degree leading edge, tip chord 2.0 at the fold line 4.3 out */
    wing: plate([[-4.2, 1.0], [-2.4, 1.6], [-0.6, 4.3], [1.4, 4.3], [1.6, 1.0]], 0.15),
    /* folded outer panel, planform (x chord, up when standing): root chord matching
       the inner tip chord across the fold, missile-rail step at the tip */
    tip: plate([[-0.6, 0.0], [1.4, 0.0], [1.05, 1.9], [0.5, 2.4], [-0.3, 2.4]], 0.13),
    /* fin, planform (x chord, height): swept, tapered, notched trailing tip */
    fin: plate([[3.6, 0.0], [5.2, 2.9], [6.5, 2.9], [6.7, 1.0], [6.3, 0.0]], 0.16),
    /* stab, planform (x chord, span): swept and tapered like the wing, smaller */
    stab: plate([[5.3, 0.5], [6.5, 2.3], [7.4, 2.3], [7.8, 1.2], [7.6, 0.5]], 0.12),
  };
}

function buildAircraft(mats, G) {
  /* an 18 m strike fighter in real metres — wheels on y = 0, nose toward -x, wings
     FOLDED, which is how a parked naval fighter actually stands and the most legible
     single fact about a deck park */
  const ac = new THREE.Group();
  ac.add(new THREE.Mesh(G.fus, mats.acSkin));
  const can = new THREE.Mesh(G.canopy, mats.acGlass);
  can.scale.set(1.5, 0.55, 0.62); can.position.set(-4.6, 2.30, 0);
  ac.add(can);
  for (const s of [-1, 1]) {
    /* the shape plane lies down: +PI/2 about x sends the span to starboard, -PI/2
       to port — one geometry, two proper rotations, both windings outward */
    const wing = new THREE.Mesh(G.wing, mats.acSkin);
    wing.rotation.x = s * Math.PI / 2;
    wing.position.y = 2.0;
    ac.add(wing);
    const tip = new THREE.Mesh(G.tip, mats.acSkin);
    tip.rotation.x = s * 0.25;                     /* standing, leaning a little outboard */
    tip.position.set(0, 2.0, s * 4.3);
    ac.add(tip);
    const fin = new THREE.Mesh(G.fin, mats.acSkin);
    fin.rotation.x = s * 0.30;                     /* canted outward */
    fin.position.set(0, 2.05, s * 0.78);
    ac.add(fin);
    const stab = new THREE.Mesh(G.stab, mats.acSkin);
    stab.rotation.x = s * Math.PI / 2;
    stab.position.y = 1.5;
    ac.add(stab);
    /* the strut runs UP to the belly flare it hangs from — the old box had a flat
       bottom at 0.80 across the full width; the loft's belly curves away from its
       side, so a strut parked at the old height would float in air under it */
    const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.25, 6), mats.acDark);
    mg.position.set(1.1, 0.62, s * 0.92); ac.add(mg);
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
  const G = airframeGeometries();                  // one airframe, twelve aircraft
  for (let i = 0; i < Math.min(S.deckPark, spots.length); i++) {
    const ac = buildAircraft(mats, G);
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
     weather deck); the pole mast the rig builder steps at the same station rises out of it.
     Until r151 the tower was K stacked boxes with a proud glass box wrapped round each of
     the top two levels — the r144 step class again, and a crate stack is not a welded
     structure. One loft now, on the same level stations (the r146 island law): the section
     is rounded forward — big chamfers at the front corners, small at the back — walls
     vertical within a level, every step earning a real shelf on its own duplicated rings,
     and the glazing bands ROWS OF WINDOWS LET INTO THE FACE, glass set back behind
     structural piers with a jamb, sill and head to every opening, on the front face and
     both sides (the aft face carries trunking and ladders on the real ship, not glass).
     One geometry, two material groups (structure, glass); paired stations and paired
     perimeter points keep every arris, shelf and jamb sharp; crown closed, heel buried
     0.30 in the citadel roof. Proven offline first in build/staging-r151-pagoda.mjs. */
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
    y += lh;
  }
  {
    const PIER = 0.15, REV = 0.28, HEEL = 0.30;
    const sec = levels.map((lv, k) => {
      const a = lv.d / 2, b = lv.w / 2;
      const cf = b * 0.42, cb = b * 0.22;
      return {
        y0: lv.y0, y1: lv.y0 + lv.lh, a, b, cf, cb,
        xr: Math.min(a * 0.45, a - cf - PIER - 0.10, a - cb - PIER - 0.10),
        zr: Math.max(0.30, b - cf - PIER - 0.10),
        win: k >= K - 2
      };
    });
    /* window count from the head level's own runs, one count for the whole loft */
    const NS = Math.max(2, Math.round(sec[K - 1].xr / 0.55));
    const NF = Math.max(2, Math.round(sec[K - 1].zr / 0.55));
    const sta = [];
    sec.forEach((v, k) => {
      sta.push({ v, y: k ? v.y0 : v.y0 - HEEL, d: 0 });
      if (v.win) {
        const lo = v.y0 + (v.y1 - v.y0) * 0.47, hi = v.y0 + (v.y1 - v.y0) * 0.77;
        sta.push({ v, y: lo, d: 0 }, { v, y: lo + 0.02, d: REV },
                 { v, y: hi - 0.02, d: REV }, { v, y: hi, d: 0 });
      }
      sta.push({ v, y: v.y1, d: 0 });
    });
    /* one station's perimeter, walked CCW from above so every winding faces OUT (the
       r145 rule); points flagged w are pane edges, moved in by the reveal on inset
       stations while the paired unflagged point stays on the face — the quad between
       them is the jamb (the island's own walker, with a windowed FRONT face added) */
    const ring = (st) => {
      const v = st.v, a = v.a, b = v.b, cf = v.cf, cb = v.cb, d = st.d;
      const pts = [];
      const P = (x, z, w) => pts.push([x, z, !!w]);
      const runE = (r, n) => {
        const e = [];
        for (let j = 0; j <= n; j++) {
          const t = r - (j / n) * 2 * r;
          e.push([t + PIER, j > 0], [t + PIER, false],
                 [t - PIER, false], [t - PIER, j < n]);
        }
        return e;
      };
      const sE = runE(v.xr, NS), fE = runE(v.zr, NF);
      P(a, -(b - cb)); P(a, -(b - cb));
      P(a, b - cb);    P(a, b - cb);
      P(a - cb, b);    P(a - cb, b);
      sE.forEach(([x, w]) => P(x, b - (w ? d : 0), w));
      P(-a + cf, b);   P(-a + cf, b);
      P(-a, b - cf);   P(-a, b - cf);
      fE.forEach(([z, w]) => P(-a + (w ? d : 0), z, w));
      P(-a, -(b - cf)); P(-a, -(b - cf));
      P(-a + cf, -b);   P(-a + cf, -b);
      sE.slice().reverse().forEach(([x, w]) => P(x, -(b - (w ? d : 0)), w));
      P(a - cb, -b);   P(a - cb, -b);
      return pts;
    };
    const pos = [], flag = [];
    const rings = sta.map(st => ring(st));
    const KP = rings[0].length;
    const addRing = (r, ya) => {
      const b0 = pos.length / 3;
      r.forEach(([x, z, w]) => { pos.push(x, ya, z); flag.push(w); });
      return b0;
    };
    const bases = sta.map((st, i) => addRing(rings[i], st.y));
    const iWall = [], iGlass = [];
    const row = (A, Bq, glassRow) => {
      for (let k = 0; k < KP; k++) {
        const a2 = A + k, b2 = A + (k + 1) % KP;
        const pane = glassRow && flag[a2] && flag[b2];
        (pane ? iGlass : iWall).push(a2, Bq + k, b2, b2, Bq + k, Bq + (k + 1) % KP);
      }
    };
    /* wall rows run within a level only; each shelf, sill and head gets its OWN
       duplicated rings, so horizontal grain cannot tilt the wall's vertex normals
       (the r146 striping mechanism, impossible by construction) */
    const shared = s => sta[s].v === sta[s + 1].v && sta[s].d === sta[s + 1].d;
    for (let s = 0; s < sta.length - 1; s++)
      if (shared(s)) row(bases[s], bases[s + 1], sta[s].d > 0);
    for (let s = 0; s < sta.length - 1; s++)
      if (!shared(s))
        row(addRing(rings[s], sta[s].y), addRing(rings[s + 1], sta[s + 1].y), false);
    /* end grain closed both ends — fan caps, wound outward, on their own rims */
    const R0 = addRing(rings[0], sta[0].y);
    const c0 = pos.length / 3; pos.push(0, sta[0].y, 0); flag.push(false);
    for (let k = 0; k < KP; k++) iWall.push(c0, R0 + k, R0 + (k + 1) % KP);
    const RT = addRing(rings[sta.length - 1], sta[sta.length - 1].y);
    const cT = pos.length / 3; pos.push(0, sta[sta.length - 1].y, 0); flag.push(false);
    for (let k = 0; k < KP; k++) iWall.push(cT, RT + (k + 1) % KP, RT + k);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setIndex(iWall.concat(iGlass));
    tg.addGroup(0, iWall.length, 0);
    tg.addGroup(iWall.length, iGlass.length, 1);
    tg.computeVertexNormals();
    const tw = new THREE.Mesh(tg, [wall, glaze]);
    tw.position.set(tx, 0, 0);
    g.add(tag(tw, 'superstructure', 'Bridge tower',
      'The tower foremast, one welded structure: the compass platform at its head behind rows of glazing let into the face, and beneath it fire control, flag space and the searchlight platforms, stacked because the centreline is the only real estate there is.'));
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
    /* the bracket, built once and shared by every platform (r144): a cantilevered wing
       platform stands on tapering web plates — deep at the tower face, raking in a
       hollow curve to a thin toe under the platform rim — not on a slab of one depth.
       Three webs, one BufferGeometry, verts unshared so every arris is flat-shaded
       sharp. The local frame is the same at every level because the platform stands a
       fixed 1.25 out from its own tower face; port is the starboard geometry under a
       PI turn about y (r118, proper rotation). Fits proven offline first in
       build/staging-r149-bracket.mjs. */
    const webShape = new THREE.Shape(
      [[-1.45, -0.10], [0.90, -0.10], [0.90, -0.30],
       [0.31, -0.34], [-0.28, -0.47], [-0.86, -0.68], [-1.45, -0.98]]
      .map(p => new THREE.Vector2(p[0], p[1])));
    const web = new THREE.ExtrudeGeometry(webShape, { depth: 0.08, bevelEnabled: false });
    web.translate(0, 0, -0.04);
    web.rotateY(-Math.PI / 2);       // shape plane to (z outboard, y up), thickness fore-aft
    const wp = (web.index ? web.toNonIndexed() : web).attributes.position;
    const bkPos = [];
    for (const wx of [-0.51, 0, 0.51])
      for (let i = 0; i < wp.count; i++)
        bkPos.push(wp.getX(i) + wx, wp.getY(i), wp.getZ(i));
    const bkGeo = new THREE.BufferGeometry();
    bkGeo.setAttribute('position', new THREE.Float32BufferAttribute(bkPos, 3));
    bkGeo.computeVertexNormals();
    for (let p = 0; p < nPairs; p++) {
      const lv = levels[Math.min(1 + p, K - 1)];
      for (const sgn of [1, -1]) {
        const zc = sgn * (lv.w / 2 + 1.25);
        const sl = new THREE.Group();
        /* the webs span from the tower face to under the platform rim, so the wing
           hangs on structure rather than on air; the root below this level's own floor
           is buried inside the wider level below */
        const bk = new THREE.Mesh(bkGeo, dark);
        if (sgn < 0) bk.rotation.y = Math.PI;
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

/* ── THE READY BATTERY'S SHIELDS (round 150) ────────────────────────────────────────────
 * A shielded gun mount IS near-boxy in life, so the fix is the shield's own form — chamfer
 * and rake, not a loft for its own sake. Two shells, each built ONCE per hull and shared by
 * every mount of its class (r144): the high-angle gunhouse an eight-sided chamfered house,
 * walls vertical to a knuckle then raking to a flat crown, floor and crown closed; the
 * 25 mm shield an open-backed faceted wrap raking inward, 5 cm plate with its top, bottom
 * and end grain closed. Both live strictly inside the box they replace, so every recorded
 * fit holds. Face outboard at +z in the mesh's own frame; the port mount turns the same
 * geometry PI about y (r118) — both planforms are their own x-mirror, so the turn is exact.
 * Verts unshared, every face flat, so every arris is sharp (the r146/r147 striping
 * mechanism impossible by construction). Sim: build/staging-r150-mounts.mjs, 31/31. */
function aaHouseGeometry() {
  const R0 = [[-0.78, 1.00], [0.78, 1.00], [1.20, 0.58], [1.20, -0.70],
              [0.90, -1.00], [-0.90, -1.00], [-1.20, -0.70], [-1.20, 0.58]];
  const R2 = [[-0.72, 0.62], [0.72, 0.62], [1.04, 0.34], [1.04, -0.62],
              [0.78, -0.86], [-0.78, -0.86], [-1.04, -0.62], [-1.04, 0.34]];
  const rings = [{ y: 0, p: R0 }, { y: 0.95, p: R0 }, { y: 1.70, p: R2 }];
  const v = [];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const n = R0.length;
  for (let r = 0; r + 1 < rings.length; r++)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, lo = rings[r], hi = rings[r + 1];
      quad([lo.p[i][0], lo.y, lo.p[i][1]], [lo.p[j][0], lo.y, lo.p[j][1]],
           [hi.p[j][0], hi.y, hi.p[j][1]], [hi.p[i][0], hi.y, hi.p[i][1]]);
    }
  const cen = ring => {
    let x = 0, z = 0;
    for (const p of ring.p) { x += p[0]; z += p[1]; }
    return [x / n, ring.y, z / n];
  };
  const top = rings[2], bot = rings[0], cT = cen(top), cB = cen(bot);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(cT, [top.p[i][0], top.y, top.p[i][1]], [top.p[j][0], top.y, top.p[j][1]]);
    tri(cB, [bot.p[j][0], bot.y, bot.p[j][1]], [bot.p[i][0], bot.y, bot.p[i][1]]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

function aaLightShieldGeometry() {
  const RX = 0.92, RZ = 0.78, T = 0.05, H = 1.25, TOP = 0.65, N = 7;
  const th0 = -Math.PI * 7 / 12, th1 = Math.PI * 7 / 12;      // ±105°, open inboard
  const sta = [];
  for (let k = 0; k <= N; k++) {
    const th = th0 + (th1 - th0) * k / N;
    sta.push([Math.sin(th), Math.cos(th)]);
  }
  const pt = (k, s, rx, rz, y) => [sta[k][0] * rx * s, y, sta[k][1] * rz * s];
  const oB = k => pt(k, 1, RX, RZ, 0),       oT = k => pt(k, TOP, RX, RZ, H);
  const iB = k => pt(k, 1, RX - T, RZ - T, 0), iT = k => pt(k, TOP, RX - T, RZ - T, H);
  const v = [];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  for (let k = 0; k < N; k++) {
    quad(oB(k), oB(k + 1), oT(k + 1), oT(k));            // outer face
    quad(iB(k + 1), iB(k), iT(k), iT(k + 1));            // inner face
    quad(oT(k), oT(k + 1), iT(k + 1), iT(k));            // top grain
    quad(oB(k + 1), oB(k), iB(k), iB(k + 1));            // bottom grain
  }
  quad(oB(0), oT(0), iT(0), iB(0));                      // θ0 end grain
  quad(oT(N), oB(N), iB(N), iT(N));                      // θ1 end grain
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
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
  const houseGeo = aaHouseGeometry();               // ONE shell, shared by all six (r144)
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
      /* the gunhouse: chamfered walls to a knuckle, raked crown, face outboard; the
         pedestal top (1.45) runs 0.20 up through its floor (1.25), so it stands on
         structure. The barrels elevate through the raked upper face as the real
         mount's did. */
      const shield = new THREE.Mesh(houseGeo, steel);
      shield.position.y = 1.25;
      if (sgn < 0) shield.rotation.y = Math.PI;
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
  const wrapGeo = aaLightShieldGeometry();          // ONE shell, shared by all eight (r144)
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
      /* the shield: an open-backed faceted wrap raking inward, face outboard with the
         guns; the pedestal stands inside its open base ring, on the carriage the wrap
         actually hung from. */
      const shield = new THREE.Mesh(wrapGeo, steel);
      shield.position.y = 3.275;
      if (sgn < 0) shield.rotation.y = Math.PI;
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
 * -x, about nine and a half metres of aircraft. The most legible single facts are
 * geometry: the one big CENTRAL FLOAT under a two-bay BIPLANE, the round engine ahead of
 * a glazed canopy, and the red discs.
 * ⚠ AN AIRFRAME IS ONE BODY here too (round 148, the r145 law reaching the catapult
 * aircraft). The fuselage was three abutting cylinders — cowl, barrel, tail cone, the
 * r144 step class — and every flying surface a rectangular slab. Now the fuselage is ONE
 * superelliptic loft cowl-lip to tail post, the cowl a second material group (a material
 * boundary has a hard edge by construction, the r146 lesson), and wings, fin, stab and
 * the three propeller blades are real planforms (the r145 plate law). Struts and floats
 * stay cylinders — a strut IS a round leg, the loom rule. Geometries are built ONCE and
 * shared by every aircraft aboard (the r144 one-timber rule); port surfaces are the
 * starboard geometry under a proper rotation (r118, windings outward). */
function floatplaneGeometries() {
  /* the fuselage loft: stations [x, halfW, halfH, yCentre], sections superelliptic
     (exponent 2.5), inside the old three cylinders' own envelope: cowl x −3.8..−2.8
     r 0.58, barrel r 0.52 about y 2.35, tail cone closing to r 0.16 at x 5.2 */
  const stations = [
    [-3.80, 0.55, 0.55, 2.35],
    [-3.45, 0.58, 0.58, 2.35],
    [-2.85, 0.56, 0.56, 2.35],
    [-2.20, 0.50, 0.52, 2.35],
    [-0.60, 0.46, 0.52, 2.35],
    [ 1.00, 0.40, 0.48, 2.37],
    [ 2.40, 0.30, 0.38, 2.40],
    [ 3.70, 0.19, 0.26, 2.42],
    [ 4.50, 0.10, 0.16, 2.42],
    [ 5.20, 0.03, 0.075, 2.42]];
  const K = 12, pos = [], idx = [];
  const se = (v, m) => m * Math.sign(v) * Math.pow(Math.abs(v), 2 / 2.5);
  stations.forEach(([x, w, h, yc]) => {
    for (let k = 0; k < K; k++) { const th = (k / K) * 2 * Math.PI;
      pos.push(x, yc + se(Math.sin(th), h), se(Math.cos(th), w)); }
  });
  const row = s => { for (let k = 0; k < K; k++) {
    const a = s * K + k, b = s * K + (k + 1) % K;
    idx.push(a, a + K, b, b, a + K, b + K); } };
  /* the cowl is the first two bays plus the nose cap — material group 0, the radial
     engine's dark ring; the rest of the tube and the tail cap are group 1, the skin */
  row(0); row(1);
  const c0 = pos.length / 3; pos.push(-3.80, 2.35, 0);
  for (let k = 0; k < K; k++) idx.push(c0, k, (k + 1) % K);
  const cowlEnd = idx.length;
  for (let s = 2; s < stations.length - 1; s++) row(s);
  const c1 = pos.length / 3; pos.push(5.20, 2.42, 0);
  const last = (stations.length - 1) * K;
  for (let k = 0; k < K; k++) idx.push(c1, last + (k + 1) % K, last + k);
  const fus = new THREE.BufferGeometry();
  fus.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fus.setIndex(idx);
  fus.addGroup(0, cowlEnd, 0);
  fus.addGroup(cowlEnd, idx.length - cowlEnd, 1);
  fus.computeVertexNormals();

  /* a flying surface is a planform, not a rectangle — the r145 plate law */
  const plate = (pts, t) => {
    const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
    return g;
  };
  const blade = plate([[-0.05, 0.14], [-0.10, 0.50], [-0.135, 0.85], [-0.11, 1.10],
                       [-0.02, 1.235], [0.09, 1.13], [0.125, 0.88], [0.10, 0.50],
                       [0.05, 0.14]], 0.055);
  blade.rotateY(Math.PI / 2);            // chord across the disc, thickness fore-aft
  return {
    fus,
    canopy: new THREE.SphereGeometry(1, 8, 6),
    /* per-side planforms (x chord, span outboard): near-constant chord with rounded
       tips, the observation biplane's own wing. +PI/2 about x sends the span to
       starboard, -PI/2 to port — one geometry, both sides, windings outward */
    wingHi: plate([[-2.075, 0.0], [-2.05, 2.0], [-1.98, 3.8], [-1.86, 4.9],
                   [-1.62, 5.45], [-1.28, 5.60], [-0.95, 5.52], [-0.70, 5.18],
                   [-0.55, 4.60], [-0.44, 3.40], [-0.35, 1.4], [-0.325, 0.0]], 0.12),
    wingLo: plate([[-1.525, 0.0], [-1.505, 2.0], [-1.45, 3.6], [-1.34, 4.6],
                   [-1.12, 5.15], [-0.80, 5.40], [-0.46, 5.32], [-0.22, 4.95],
                   [-0.06, 4.40], [0.05, 3.2], [0.115, 1.2], [0.125, 0.0]], 0.12),
    /* the fin and rudder in one rounded planform (x, y up), root buried in the loft */
    fin: plate([[3.95, 2.42], [4.02, 3.00], [4.18, 3.55], [4.45, 3.90], [4.80, 4.02],
                [5.12, 3.92], [5.30, 3.60], [5.34, 3.15], [5.30, 2.70], [5.28, 2.42]],
               0.10),
    stab: plate([[3.80, 0.0], [3.83, 0.9], [3.93, 1.35], [4.12, 1.60], [4.42, 1.70],
                 [4.72, 1.60], [4.92, 1.30], [5.00, 0.8], [5.04, 0.0]], 0.10),
    blade,
  };
}

function buildFloatplane(fm, G) {
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
  const fus = new THREE.Mesh(G.fus, [fm.dark, fm.skin]);
  ac.add(tag(fus, 'floatplane', 'Floatplane'));
  /* three blades and a spinner, stopped where the last swing left them */
  for (let b = 0; b < 3; b++) {
    const bl = new THREE.Mesh(G.blade, fm.dark);
    bl.rotation.x = b * 2 * Math.PI / 3 + 0.5;
    bl.position.set(-3.90, 2.35, 0);
    ac.add(bl);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.30, 8), fm.dark);
  hub.rotation.z = Math.PI / 2;
  hub.position.set(-3.98, 2.35, 0);
  ac.add(hub);
  const can = new THREE.Mesh(G.canopy, fm.glass);
  can.scale.set(1.15, 0.40, 0.36);
  can.position.set(0.30, 2.82, 0);
  ac.add(tag(can, 'floatplane', 'Canopy'));
  const fin = new THREE.Mesh(G.fin, fm.skin);
  ac.add(tag(fin, 'floatplane', 'Fin'));
  for (const s of [-1, 1]) {
    const wHi = new THREE.Mesh(G.wingHi, fm.skin);
    wHi.rotation.x = s * Math.PI / 2;
    wHi.position.y = 3.65;
    ac.add(tag(wHi, 'floatplane', 'Upper wing'));
    const wLo = new THREE.Mesh(G.wingLo, fm.skin);
    wLo.rotation.x = s * Math.PI / 2;
    wLo.position.y = 1.95;
    ac.add(tag(wLo, 'floatplane', 'Lower wing'));
    const stab = new THREE.Mesh(G.stab, fm.skin);
    stab.rotation.x = s * Math.PI / 2;
    stab.position.y = 2.60;
    ac.add(stab);
    /* interplane struts stand in the overlap of the two tapered chords at their own
       span — the old pair sat at the rectangles' stations, one of them forward of
       the lower wing's leading edge and one aft of the upper's trailing edge */
    for (const sx of [-1.22, -0.68]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.72, 6), fm.dark);
      st.position.set(sx, 2.8, s * 4.55);
      ac.add(st);
    }
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), fm.dark);
    cb.position.set(-1.0, 3.22, s * 0.6);           // cabane struts at the fuselage
    ac.add(cb);
    const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 1.5, 8), fm.skin);
    tf.rotation.z = Math.PI / 2;
    tf.position.set(-0.70, 1.05, s * 4.7);          // wingtip floats, at mid-chord
    ac.add(tag(tf, 'floatplane', 'Wingtip float'));
    const ts = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), fm.dark);
    ts.position.set(-0.70, 1.6, s * 4.7);
    ac.add(ts);
    /* the hinomaru: a red disc through the fuselage and one on each upper wing panel —
       the single most identifying mark on the aircraft, so it is geometry, not paint */
    const wd = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), fm.red);
    wd.position.set(-1.2, 3.65, s * 3.4);
    ac.add(wd);
  }
  const fd = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.10, 16), fm.red);
  fd.rotation.x = Math.PI / 2;
  fd.position.set(1.6, 2.38, 0);
  ac.add(fd);
  return ac;
}

/* ── OPEN STEELWORK MEMBERS (round 152) ─────────────────────────────────────────────────
 * A box member from end-face centre A to end-face centre B, section w × h, twelve
 * triangles, verts unshared so every arris is flat-shaded sharp (r146/r147). endX mitres
 * the end faces onto constant-x planes, so a raking chord's cap cannot poke past the
 * envelope its own end-face centre sits on. Proven offline in
 * build/staging-r152-aviation.mjs before it touched the app. */
function emitBar(out, A, B, w, h, endX) {
  const ax = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const len = Math.hypot(ax[0], ax[1], ax[2]);
  const u = [ax[0] / len, ax[1] / len, ax[2] / len];
  /* nW = unit(u × ŷ); degenerate for vertical members, where x̂ serves */
  let nW = [u[2], 0, -u[0]];
  let m = Math.hypot(nW[0], nW[1], nW[2]);
  if (m < 1e-6) { nW = [1, 0, 0]; m = 1; }
  nW = [nW[0] / m, nW[1] / m, nW[2] / m];
  const nH = [u[1] * nW[2] - u[2] * nW[1], u[2] * nW[0] - u[0] * nW[2],
              u[0] * nW[1] - u[1] * nW[0]];
  const c = (P, sw, sh) => {
    const p = [P[0] + nW[0] * sw * w / 2 + nH[0] * sh * h / 2,
               P[1] + nW[1] * sw * w / 2 + nH[1] * sh * h / 2,
               P[2] + nW[2] * sw * w / 2 + nH[2] * sh * h / 2];
    if (endX && Math.abs(u[0]) > 1e-6) {
      const t = (P[0] - p[0]) / u[0];
      p[0] = P[0]; p[1] += u[1] * t; p[2] += u[2] * t;
    }
    return p;
  };
  const v = [c(A, -1, -1), c(A, 1, -1), c(A, 1, 1), c(A, -1, 1),
             c(B, -1, -1), c(B, 1, -1), c(B, 1, 1), c(B, -1, 1)];
  const quad = (a, b, cc, d) => out.push(v[a], v[b], v[cc], v[a], v[cc], v[d]);
  quad(0, 3, 2, 1); quad(4, 5, 6, 7);
  quad(0, 1, 5, 4); quad(2, 3, 7, 6);
  quad(1, 2, 6, 5); quad(3, 0, 4, 7);
}

function trisGeometry(tris) {
  const pos = new Float32Array(tris.length * 3);
  for (let i = 0; i < tris.length; i++) {
    pos[i * 3] = tris[i][0]; pos[i * 3 + 1] = tris[i][1]; pos[i * 3 + 2] = tris[i][2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/* ── THE CATAPULT IS A TRUSS (round 152) ────────────────────────────────────────────────
 * Kure's launch beam was a box-girder TRUSS — chords, verticals and diagonals with open
 * air between them — not a plate crate. Local frame centred like the
 * BoxGeometry(len, 0.9, 1.4) it replaces; two Warren-with-verticals side trusses, top
 * cross-beams under the rail at every panel point, bottom cross-struts at every other.
 * Panel pitch ~1.62 m derived from the record's own lenM, no tuned count. */
const TR_D = 0.90, TR_W = 1.40, TR_C = 0.14, TR_V = 0.10, TR_G = 0.09, TR_X = 0.10;
function catapultTrussTris(len) {
  const out = [];
  const yB = -TR_D / 2 + TR_C / 2, yT = TR_D / 2 - TR_C / 2;   // chord centrelines
  const zS = TR_W / 2 - TR_C / 2;                              // side-truss planes
  const x0 = -len / 2, x1 = len / 2;
  for (const sz of [-1, 1]) {
    emitBar(out, [x0, yB, sz * zS], [x1, yB, sz * zS], TR_C, TR_C);
    emitBar(out, [x0, yT, sz * zS], [x1, yT, sz * zS], TR_C, TR_C);
  }
  const N = Math.max(6, Math.round(len / 1.62));
  const px = i => (x0 + TR_C / 2) + (i / N) * (len - TR_C);    // panel points, inset
  for (let i = 0; i <= N; i++) {
    for (const sz of [-1, 1])
      emitBar(out, [px(i), yB, sz * zS], [px(i), yT, sz * zS], TR_V, TR_V);
    emitBar(out, [px(i), yT, -zS], [px(i), yT, zS], TR_X, TR_X);
    if (i % 2 === 0 && i < N)
      emitBar(out, [px(i), yB, -zS], [px(i), yB, zS], TR_G, TR_G);
  }
  for (let i = 0; i < N; i++)
    for (const sz of [-1, 1]) {
      const a = i % 2 ? [px(i), yT, sz * zS] : [px(i), yB, sz * zS];
      const b = i % 2 ? [px(i + 1), yB, sz * zS] : [px(i + 1), yT, sz * zS];
      emitBar(out, a, b, TR_G, TR_G);
    }
  return out;
}

/* ── AND THE LAUNCH RAIL IS A SLOTTED GIRDER (round 152) ────────────────────────────────
 * The trolley ran a slot down the rail's middle; a rail with a one-piece top face has
 * nothing for a shuttle to run in. Local frame centred like the
 * BoxGeometry(len·0.96, 0.18, 0.5) it replaces: foot flange full width, narrow web, and
 * the head split into two rail strips either side of the slot. The strip tops stay at
 * +0.09, so the floatplane's float still seats at 2.08 exactly. */
const RL_HH = 0.09, RL_HW = 0.25, RL_FT = 0.045, RL_WEB = 0.05, RL_HD = 0.06, RL_SLOT = 0.055;
function railGirderTris(len) {
  const out = [], L = len * 0.96, x0 = -L / 2, x1 = L / 2;
  const slab = (yLo, yHi, zLo, zHi) =>
    emitBar(out, [x0, (yLo + yHi) / 2, (zLo + zHi) / 2],
                 [x1, (yLo + yHi) / 2, (zLo + zHi) / 2], zHi - zLo, yHi - yLo);
  slab(-RL_HH, -RL_HH + RL_FT, -RL_HW, RL_HW);                 // foot flange
  slab(-RL_HH + RL_FT, RL_HH - RL_HD, -RL_WEB, RL_WEB);        // web
  slab(RL_HH - RL_HD, RL_HH, RL_SLOT, RL_HW);                  // head strip, +z
  slab(RL_HH - RL_HD, RL_HH, -RL_HW, -RL_SLOT);                // head strip, −z
  return out;
}

/* ── AND THE CRANE JIB IS A TAPERING LATTICE (round 152) ────────────────────────────────
 * A crane jib narrows toward its head — four raking chords, zig-zag lacing on the two
 * side faces (the faces a broadside reads), transverse rungs top and bottom (a single
 * zig-zag across z cannot be its own z-mirror), a frame at each end and the sheave
 * housing at the head. Local frame centred like the BoxGeometry(jibL, 0.6, 0.6) it
 * replaces — heel at −x against the post, head at +x over the stern. */
const JB_H0 = 0.60, JB_H1 = 0.24, JB_C = 0.085, JB_L = 0.055;
function craneJibTris(jibL) {
  const out = [];
  const x0 = -jibL / 2, x1 = jibL / 2;
  const half = x => (JB_H0 + (JB_H1 - JB_H0) * (x - x0) / jibL) / 2 - JB_C / 2;
  const chord = (sy, sz, x) => [x, sy * half(x), sz * half(x)];
  for (const sy of [-1, 1]) for (const sz of [-1, 1])
    emitBar(out, chord(sy, sz, x0), chord(sy, sz, x1), JB_C, JB_C, true);
  const M = Math.max(5, Math.round(jibL / 1.4));
  const px = i => x0 + (i / M) * jibL;
  for (let i = 0; i < M; i++) {
    const a = i % 2 ? 1 : -1, b = -a;
    for (const s of [-1, 1])
      emitBar(out, chord(a, s, px(i)), chord(b, s, px(i + 1)), JB_L, JB_L, true);
  }
  for (let i = 1; i < M; i++)
    for (const sy of [-1, 1])
      emitBar(out, chord(sy, -1, px(i)), chord(sy, 1, px(i)), JB_L, JB_L);
  for (const x of [x0 + JB_C / 2, x1 - JB_C / 2]) {
    for (const sy of [-1, 1])
      emitBar(out, chord(sy, -1, x), chord(sy, 1, x), JB_L, JB_L);
    for (const sz of [-1, 1])
      emitBar(out, chord(-1, sz, x), chord(1, sz, x), JB_L, JB_L);
  }
  emitBar(out, [x1 - 0.30, 0, 0], [x1, 0, 0], 0.34, 0.18);     // sheave housing
  /* a raking chord's tilted section grazes micrometres past the envelope at the
     heel; clamp every corner to the old box's own faces, so the mesh's extreme
     points — which the Shipwright's camera fit reads — are EXACTLY the old box's.
     A 2 mm inset here moved the jib tip, refitted the camera by a sub-pixel and
     ghosted every silhouette in the frame (r152's own lesson). */
  for (const p of out) {
    p[1] = Math.max(-JB_H0 / 2, Math.min(JB_H0 / 2, p[1]));
    p[2] = Math.max(-JB_H0 / 2, Math.min(JB_H0 / 2, p[2]));
  }
  return out;
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
  /* one truss and one rail geometry, built once and shared by both mounts (r144);
     both live strictly inside the boxes they replace */
  const trussGeo = trisGeometry(catapultTrussTris(len));
  const railGeo = trisGeometry(railGirderTris(len));
  let portCat = null;
  for (const sgn of [1, -1]) {
    const g = new THREE.Group();
    /* the turntable pedestal the beam trains on */
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.0, 14), dark);
    ped.position.y = 0.5;
    g.add(tag(ped, 'catapult', 'Catapult turntable'));
    /* the launch beam: a Warren truss with the slotted trolley rail on its chords */
    const beam = new THREE.Mesh(trussGeo, steel);
    beam.position.y = 1.45;
    g.add(tag(beam, 'catapult'));
    const rail = new THREE.Mesh(railGeo, dark);
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
    const jib = new THREE.Mesh(trisGeometry(craneJibTris(jibL)), steel);
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
    const G = floatplaneGeometries();             // one airframe, every aircraft aboard
    if (portCat) {
      const p0 = buildFloatplane(fm, G);
      p0.position.y = 2.08;                       // float on the launch rail
      p0.rotation.y = Math.PI;                    // nose at the outboard-aft launch end
      portCat.add(tag(p0, 'floatplane'));
    }
    for (let i = portCat ? 1 : 0; i < S.floatplanes; i++) {
      const p = buildFloatplane(fm, G);
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
 * station. The part's own card says FLUSH, and a hatch is a cover dropped INTO a coaming:
 * one loft per hatch — a mitred coaming ring (outer face, chamfered top edge, rim flat,
 * inner reveal) with the armoured cover set a reveal below the rim and its section seams
 * recessed grooves. The old form was a lid box stacked ON a coaming box with two seam
 * strips proud of the lid. Every vertex is seated on the deck's own sheer and camber at
 * its OWN station, so a 12 m coaming can neither float over the crown nor sink at the
 * deck edge. Flat per-quad normals: every arris sharp, and no shared rim for uneven cap
 * triangles to stripe (the r146 mechanism). */
function buildDeckHatches(S, group) {
  if (!S.deckHatches || !S.deckHatches.length) return;
  const H = hullSurface(S);
  const L = S.lwl;
  const dark = new THREE.MeshStandardMaterial({ color: 0x3f444a, roughness: 0.66, metalness: 0.25 });
  const cover = new THREE.MeshStandardMaterial({ color: 0x565c61, roughness: 0.72, metalness: 0.22 });
  const deckAt = (u, z) => {                       // the deck surface near the hatch
    const b = Math.abs(surfacePoint(S, H, u, 1.0)[2]) || 1e-6;
    return H.sheer(u) + Math.cos(Math.min(1, Math.abs(z) / b) * Math.PI / 2) * b * 0.035;
  };
  S.deckHatches.forEach(hc => {
    const u0 = hc.at, zP = (hc.z || 0) * Math.abs(surfacePoint(S, H, u0, 1.0)[2]);
    const y0 = deckAt(u0, zP);
    const dY = (dx, dz) => deckAt(u0 + dx / L, zP + dz) - y0;
    const hx = hc.lenM / 2, hz = hc.widM / 2;
    const T = 0.14, RIM = 0.28, CH = 0.04, HEEL = 0.25, DROP = 0.10;
    const GW = 0.08, GD = 0.04;                    // seam groove width and depth
    const acc = { pos: [], nrm: [], idx: [] };
    const quad = (p1, p2, p3, p4) => {
      const b = acc.pos.length / 3;
      acc.pos.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
                   p3[0], p3[1], p3[2], p4[0], p4[1], p4[2]);
      const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
      const vx = p4[0] - p1[0], vy = p4[1] - p1[1], vz = p4[2] - p1[2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const m = Math.hypot(n[0], n[1], n[2]) || 1;
      for (let k = 0; k < 4; k++) acc.nrm.push(n[0] / m, n[1] / m, n[2] / m);
      acc.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    /* the ring: section from outer foot up over the rim and down to the cover land, run
       round all four sides at proportional stations so the corners mitre and every
       vertex rides its own patch of deck */
    const sect = [[0, -HEEL], [0, RIM - CH], [CH, RIM], [T, RIM], [T, RIM - DROP]];
    const NX = Math.max(2, Math.round(hc.lenM / 2.5));
    const NZ = Math.max(2, Math.round(hc.widM / 1.5));
    const P = (x, h, z) => [x, h + dY(x, z), z];
    for (let s = 0; s < sect.length - 1; s++) {
      const [i1, h1] = sect[s], [i2, h2] = sect[s + 1];
      for (const sg of [1, -1]) {
        for (let k = 0; k < NX; k++) {             // fore-and-aft sides, subdivided in x
          const xa1 = (k / NX * 2 - 1) * (hx - i1), xb1 = ((k + 1) / NX * 2 - 1) * (hx - i1);
          const xa2 = (k / NX * 2 - 1) * (hx - i2), xb2 = ((k + 1) / NX * 2 - 1) * (hx - i2);
          const A1 = P(xa1, h1, sg * (hz - i1)), B1 = P(xb1, h1, sg * (hz - i1));
          const A2 = P(xa2, h2, sg * (hz - i2)), B2 = P(xb2, h2, sg * (hz - i2));
          if (sg > 0) quad(A1, B1, B2, A2); else quad(B1, A1, A2, B2);
        }
        for (let k = 0; k < NZ; k++) {             // the ends, subdivided in z
          const za1 = (k / NZ * 2 - 1) * (hz - i1), zb1 = ((k + 1) / NZ * 2 - 1) * (hz - i1);
          const za2 = (k / NZ * 2 - 1) * (hz - i2), zb2 = ((k + 1) / NZ * 2 - 1) * (hz - i2);
          const A1 = P(sg * (hx - i1), h1, za1), B1 = P(sg * (hx - i1), h1, zb1);
          const A2 = P(sg * (hx - i2), h2, za2), B2 = P(sg * (hx - i2), h2, zb2);
          if (sg > 0) quad(B1, A1, A2, B2); else quad(A1, B1, B2, A2);
        }
      }
    }
    const coamIdx = acc.idx.length;
    /* the cover: a plate on the land inside the ring, its section seams recessed grooves */
    const cx = hx - T, cz = hz - T, yc = RIM - DROP;
    const seams = [-cx / 1.5, cx / 1.5];           // thirds — three armoured sections
    const edges = [-cx];
    for (const sc of seams) edges.push(sc - GW / 2, sc + GW / 2);
    edges.push(cx);
    const zrow = (x0, x1, yy) => {                 // a full-width row of top quads
      for (let k = 0; k < NZ; k++) {
        const z0 = (k / NZ * 2 - 1) * cz, z1 = ((k + 1) / NZ * 2 - 1) * cz;
        quad(P(x0, yy, z0), P(x0, yy, z1), P(x1, yy, z1), P(x1, yy, z0));
      }
    };
    for (let i = 0; i < edges.length; i += 2) zrow(edges[i], edges[i + 1], yc);
    for (const sc of seams) {
      const x0 = sc - GW / 2, x1 = sc + GW / 2;
      zrow(x0, x1, yc - GD);                       // groove floor
      for (let k = 0; k < NZ; k++) {               // groove walls, facing each other
        const z0 = (k / NZ * 2 - 1) * cz, z1 = ((k + 1) / NZ * 2 - 1) * cz;
        quad(P(x0, yc - GD, z0), P(x0, yc - GD, z1), P(x0, yc, z1), P(x0, yc, z0));
        quad(P(x1, yc - GD, z1), P(x1, yc - GD, z0), P(x1, yc, z0), P(x1, yc, z1));
      }
      for (const sg of [1, -1]) {                  // groove ends, sealed against the ring
        const q = [P(x0, yc - GD, sg * cz), P(x1, yc - GD, sg * cz),
                   P(x1, yc, sg * cz), P(x0, yc, sg * cz)];
        if (sg > 0) quad(q[1], q[0], q[3], q[2]); else quad(q[0], q[1], q[2], q[3]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nrm, 3));
    geo.setIndex(acc.idx);
    geo.addGroup(0, coamIdx, 0);
    geo.addGroup(coamIdx, acc.idx.length - coamIdx, 1);
    const g = new THREE.Group();
    g.add(tag(new THREE.Mesh(geo, [dark, cover]), 'hatch', 'Stowage hatch'));
    g.position.set((u0 - 0.5) * L, y0, zP);
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

  /* ── THE LAYOUT IS SET BY THE ISLANDS ────────────────────────────────────────────────
     The stow fills every bay of deck the islands leave free, so their stations are fixed
     here, first, and the bays are laid around them — the reverse order is how a 30 m gap
     of bare deck opened between the last bay and the house. */
  const DK = 2.9;                                       // one deck of the house, in metres
  const N_DECKS = S.deckHouseDecks || 8;                // cabin decks under the wheelhouse
  /* ── THE ISLAND STATIONS ARE THE RECORD'S, WHERE THE RECORD HAS THEM (round 113) ─────
     The default is the classic box boat: one island right aft, the engine casing abutting
     it, because everything forward of the engine room is cargo. But the largest ships
     built since ~2015 are TWIN-ISLAND — the Imabari 20000 design stands the navigation
     bridge in the fore third (Ever Given's own loading computer puts her highest point
     245.35 m forward of the aft perpendicular) and the funnel on its own engine casing
     semi-aft, so the sightline no longer caps the stow between them. hull.bridgeU and
     hull.funnelU carry the stations as u from the stem; absent, the defaults reproduce
     the single-island ship exactly. */
  const accU = (S.bridgeU !== undefined) ? S.bridgeU : 0.845;
  const accX = L * (accU - 0.5), accL = L * 0.050, accW = B * 0.70;
  const casL = L * 0.042, casW = B * 0.34;
  const casX = (S.funnelU !== undefined) ? L * (S.funnelU - 0.5)
             : accX + accL / 2 + casL / 2;              // default: the casing abuts the house
  const twin = casX - accX > accL;                      // the funnel stands as its own island

  const hatch = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.85, metalness: 0.2 });
  const lash = new THREE.MeshStandardMaterial({ color: 0x6d7176, roughness: 0.7, metalness: 0.45 });
  const pitch = TEU_L * 1.06;
  const lashM = B * 0.02;                               // lashings and the walkway at the edge
  /* a bay exists wherever six columns fit and the house does not stand */
  const bays = [];
  for (let x = -L * 0.44 + pitch / 2; x + pitch / 2 < L * 0.48; x += pitch) {
    const half = Math.min(B * (S.stowBeamF || 0.43),
                          deckHalfAt(x - pitch / 2), deckHalfAt(x + pitch / 2)) - lashM;
    const nc = Math.floor((half * 2) / (TEU_W * 1.02));
    if (nc < 6) continue;                               // forward of this is forecastle deck
    /* a bay stands nowhere an island stands — one gap for the single-island ship, two
       when the record separates the bridge from the funnel */
    const aftGapX = twin ? accX + accL / 2 + 3 : casX + casL / 2 + 3;
    if (x + pitch / 2 > accX - accL / 2 - 3 && x - pitch / 2 < aftGapX) continue;
    if (twin && x + pitch / 2 > casX - casL / 2 - 3 && x - pitch / 2 < casX + casL / 2 + 3) continue;
    bays.push([x, nc]);
  }
  const foreBays = bays.filter(b => b[0] < accX).length;
  bays.forEach(([x, nc], i) => {
    /* the profile: 4 high at the bow rising to 8 a little abaft amidships, easing toward the
       house; the bays abaft the funnel sit lower. ⚠ The peak is CAPPED BY THE BRIDGE — the
       wheelhouse floor is above the tallest stack forward of it, because a bridge that cannot
       see over its own cargo is not a bridge. That is the constraint the audit now asserts. */
    const peak = S.stowTiers || 8;
    let centreHigh;
    if (twin) {
      /* the twin-island profile: moving the bridge forward is what BUYS the tall stow abaft
         it, so that is where the height goes. The weather still steps the bow-most bays
         down, the bays beside the funnel island keep a tier of clearance for its uptakes,
         and the last bay over the mooring deck drops two. */
      if (x < accX) centreHigh = Math.max(4, peak - 1 - Math.max(0, 2 - i));
      else {
        centreHigh = peak;
        if (Math.abs(x - casX) < casL / 2 + pitch) centreHigh = peak - 1;
        if (i === bays.length - 1) centreHigh = peak - 2;
      }
    } else {
      const t = i / Math.max(1, foreBays - 1);
      centreHigh = x > accX ? 5
                 : Math.max(3, Math.round((peak - 4) + 4 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.68)));
    }
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
      /* the wings come down: full height on the centreline, two tiers less at the rail —
         except on the twin-island ship, whose forward bridge buys back the SOLAS sightline
         the wing cut used to pay for, so her top runs nearly flat to a slight shoulder */
      const wing = Math.abs(c - (nc - 1) / 2) / ((nc - 1) / 2 || 1);
      return Math.max(2, Math.round(centreHigh - wing * wing * (twin ? 1.2 : 2.6)));
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
  /* on the twin-island ship the casing is the funnel's WHOLE island: the uptake column
     rises from the engine room through the stow's own height, in the operator's hull
     colour, and only a short stack stands above it. On the single-island ship it stays
     the low white block abaft the house it always was. */
  const casH = twin ? TEU_H * ((S.stowTiers || 8) + 0.9) : DK * 4;
  const casMat = twin
    ? new THREE.MeshStandardMaterial({ color: S.topside || '#2a4038', roughness: 0.62, metalness: 0.22 })
    : white;
  const casing = new THREE.Mesh(new THREE.BoxGeometry(casL, casH, casW), casMat);
  casing.position.set(casX, hs + casH / 2, 0);
  if (twin) group.add(tag(casing, 'funnel', 'Engine casing',
    'The funnel’s own island: the uptake from the semi-aft engine room, carried '
    + 'through the height of the stow it stands among. On a twin-island ship the bridge '
    + 'no longer marks where the engine is — this does.'));
  else group.add(tag(casing, 'bridge'));
  const fnG = new THREE.Group();
  const fnH = twin ? 6 : 13;
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


/* ── THE LIVERY IS PART OF THE SHIP ────────────────────────────────────────────────────
 * A modern merchant hull carries her operator's name in letters the height of a house —
 * on Ever Given the word EVERGREEN spans over a hundred metres of shell and is, to most
 * viewers, the single most recognisable thing about her. A hull record opts in with
 * hull.livery = { side, stern: [name, port], … }; the letters are drawn into a canvas one
 * character at a time (so the tracking can fill the run the photographs show) and stand a
 * hand's breadth off the shell on the parallel midbody, where the side is a vertical wall.
 * A plane turned about Y still shows its FRONT face, so neither side mirrors: like the
 * real ship, the name starts at the bow on one side and at the stern on the other, and
 * reads left-to-right from both. */
function buildLivery(S, group) {
  const H = hullSurface(S);
  const L = S.lwl, lv = S.livery;
  if (!lv) return;
  const paint = '#eef0ec';
  const makeTex = (lines) => {
    const cv = document.createElement('canvas');
    cv.width = 2048;
    cv.height = lines.length > 1 ? 512 : 256;
    const cx = cv.getContext('2d');
    cx.fillStyle = paint;
    cx.textBaseline = 'alphabetic';
    const rowH = cv.height / lines.length;
    lines.forEach((text, r) => {
      const fs = Math.round(rowH * (lines.length > 1 ? 0.62 : 0.86));
      cx.font = '700 ' + fs + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
      const ws = Array.from(text, ch => cx.measureText(ch).width);
      const tot = ws.reduce((a, b) => a + b, 0);
      const run = cv.width * (lines.length > 1 ? 0.42 + 0.4 * (tot / cv.width) : 0.98);
      const gap = (Math.min(run, cv.width * 0.98) - tot) / Math.max(1, text.length - 1);
      let x = (cv.width - Math.min(run, cv.width * 0.98)) / 2;
      const y = rowH * r + rowH * 0.82;
      Array.from(text).forEach((ch, i) => { cx.fillText(ch, x, y); x += ws[i] + Math.max(0, gap); });
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  const mkMat = tex => new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.55, metalness: 0.05,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const deckY = H.sheer(0.5);
  /* the operator's name amidships, both sides, on the parallel midbody */
  if (lv.side) {
    const wM = L * (lv.sideRun || 0.30);
    const hM = lv.sideH || Math.max(4, S.freeboard * 0.45);
    const uC = (lv.sideU !== undefined) ? lv.sideU : 0.48;
    const xC = L * (uC - 0.5);
    const half = Math.abs(surfacePoint(S, H, uC, 1.0)[2]);
    const yC = deckY - hM * 0.5 - (lv.sideDrop !== undefined ? lv.sideDrop : 1.6);
    for (const side of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM),
                               mkMat(makeTex([lv.side])));
      m.position.set(xC, yC, side * (half + 0.15));
      if (side < 0) m.rotation.y = Math.PI;
      group.add(tag(m, 'livery'));
    }
  }
  /* the ship's own name and port of registry on the stern */
  if (lv.stern && lv.stern.length) {
    const wM = S.beam * 0.42, hM = wM * 0.25;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mkMat(makeTex(lv.stern)));
    m.position.set(L * 0.5 + 0.15, deckY - S.freeboard * 0.42, 0);
    m.rotation.y = Math.PI / 2;
    group.add(tag(m, 'livery', 'Stern name',
      'Name and port of registry, white on the transom — the address every ship carries.'));
  }
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
     rises — the rows read the trapezoid off the surface instead of sharing one width.
     The tier itself is a pierced sash-wall (round 171): ONE extruded shape per tier
     whose apertures are the panes — N lights of the record's grid (sternLightPanes) at
     the record's pitch (sternLightPitchM), each light filling (1 − sternLightPierFrac)
     of it. The timber left standing between hole groups IS the pilaster and between
     panes the glazing bar; ONE glass sheet per tier lies BEHIND the bars, inside the
     frame depth, because a sash holds its panes in a rebate. Until r171 each light was
     three stacked slabs — solid wall, glass floating 0.001·B PROUD of it, a single
     stick prouder still: 2×1 uncastable panes where SLR0338 resolves 3×3, and 36% of
     the tier was blank wall between lights. */
  const rows = S.sternLights || 0;
  const rowZ = [];
  for (let r = 0; r < rows; r++)
    rowZ.push(fb * (rows === 1 ? 0.55 : 0.42 + 0.30 * r));
  const wh = fb * 0.16;                                  // one tier of glazing, framed
  const [plC, plR] = S.sternLightPanes || [3, 3];
  const pierF = S.sternLightPierFrac !== undefined ? S.sternLightPierFrac : 0.26;
  const pitchT = S.sternLightPitchM || 1.25;
  const barW = 0.045, sashT = B * 0.012;
  for (const zc of rowZ) {
    const hw = halfAt(zc) * 0.84;
    const N = Math.max(3, Math.min(7, Math.round((2 * hw) / pitchT)));
    const pitch = (2 * hw) / N, lw = pitch * (1 - pierF), gh = wh * 0.80;
    const pw = (lw - (plC - 1) * barW) / plC, ph = (gh - (plR - 1) * barW) / plR;
    const sash = new THREE.Shape();
    sash.moveTo(-hw, zc - wh / 2); sash.lineTo(hw, zc - wh / 2);
    sash.lineTo(hw, zc + wh / 2); sash.lineTo(-hw, zc + wh / 2); sash.closePath();
    for (let i = 0; i < N; i++) {
      const zi = -hw + pitch * (i + 0.5);
      for (let cx = 0; cx < plC; cx++) for (let cy = 0; cy < plR; cy++) {
        const h0 = zi - lw / 2 + cx * (pw + barW), v0 = zc - gh / 2 + cy * (ph + barW);
        const hole = new THREE.Path();
        hole.moveTo(h0, v0); hole.lineTo(h0 + pw, v0);
        hole.lineTo(h0 + pw, v0 + ph); hole.lineTo(h0, v0 + ph); hole.closePath();
        sash.holes.push(hole);
      }
    }
    const fr = new THREE.Mesh(
      new THREE.ExtrudeGeometry(sash, { depth: sashT, bevelEnabled: false }),
      mats.woodPale);
    fr.rotation.y = Math.PI / 2;               // shape (breadth, height) → ship (z, y)
    fr.position.set(xF + B * 0.002, 0, 0);
    g.add(tag(fr, 'sternlight'));
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.012, gh, 2 * hw), glass);
    gl.position.set(xF + B * 0.004, zc, 0);
    g.add(tag(gl, 'sternlight'));
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
      /* ⚠ THE ARM PLANE LIES IN THE HULL'S OWN TANGENT PLANE. The fixed 1.25 rad roll here
         left the fork nearly athwartships: one fluke buried two metres INSIDE the planking
         and the other standing 3.0 m proud of the side in open air (measured, r99, on a
         14.6 m beam whose skin at that station is 5 m from centre). The stow every broadside
         photograph of a preserved two-decker shows is the anchor's full profile flat against
         the topside — which requires the fork's plane parallel to the skin — with the stock
         athwart at the ring end, where the bow has already narrowed away from it. That
         orientation is not a constant roll; it is the hull's outward normal at the fluke
         station, so the anchor's frame is built FROM the surface: shank along the fished
         lead, arms across the outward normal, stock along it. */
      const nu = surfacePoint(S, H, Math.min(1, uT + 0.01), vT);
      const nv = surfacePoint(S, H, uT, Math.min(0.99, vT + 0.02));
      const tU = new THREE.Vector3(nu[0] - tpv[0], nu[1] - tpv[1], nu[2] - tpv[2]);
      const tV = new THREE.Vector3(nv[0] - tpv[0], nv[1] - tpv[1], nv[2] - tpv[2]);
      const nrm = tU.cross(tV).normalize();
      if (nrm.z < 0) nrm.negate();                       // outward on the +z surface
      nrm.z *= sgn;                                      // mirrored to this side
      const yA = d.clone().negate();                     // local +Y: ring end of the shank
      const xA = new THREE.Vector3().crossVectors(yA, nrm).normalize();  // fork, along the side
      const zA = new THREE.Vector3().crossVectors(xA, yA).normalize();   // stock, off the side
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
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
  /* ⚠ THE SPACING IS A FACT OF THE VESSEL, NOT A UNIVERSAL. Vitruvius's two Doric cubits
     (0.98 m) is the TRIREME'S interscalmium; a sixteenth-century galley's benches sit about
     1.2 m apart, because four men swing on one loom instead of one man on his own oar. The
     record carries it; the default stays Vitruvius for the hulls that predate records. */
  const INTERSCALMIUM = S.interscalmium || 0.98;      // Vitruvius, two Doric cubits
  const oarLen = S.oarLen || 4.2;
  /* ── A GALLEY ROWS THROUGH HER FRAME, NOT THROUGH HER SIDE ───────────────────────────
     Where the record carries an apostis, the tholes stand ON it: the pivot is the frame's
     own outboard beam, at the frame's height, outboard of the planking — which is the whole
     reason the frame exists. The trireme keeps her hull-side tholes; her outrigger carries
     only the top bank, and that offset is already in `out` below. buildGalleyWorks draws
     the beam these oars pivot on, from the same record fields, so they cannot disagree. */
  const AP = S.apostis;
  const pdMid = AP && surfacePoint(S, H, 0.5, 1.0);
  const apZ = AP && Math.abs(pdMid[2]) + AP.out;
  const apY = AP && pdMid[1] + B * 0.115;             // the frame rides at gunwale height
  /* ── AND A RO IS NOT A SWEEP (round 115) ─────────────────────────────────────────────
     The oar of Japan and Korea is a SCULL: two timbers scarfed at an obtuse angle — the
     loom the sculler holds, rising inboard to a standing man's hands, and the long blade
     limb trailing AFT and down, its flat face near-vertical and its tip always in the
     water. It rests on a pin at the rail and works like a fish's tail, which is why it
     never lifts and never feathers. Round 90 drew the sekibune's forty ro as
     perpendicular western sweeps and recorded the simplification; oarStyle 'ro' is that
     record cashed, for her and for the panokseon whose card says the same word.
     Turnbull FSFE2; both cards' own texts carry the scull. */
  const RO = S.oarStyle === 'ro';
  /* ── AND THE BLADE IS ONE SCARFED TIMBER, NOT A STEP (round 144) ─────────────────────
     Until r144 each ro blade was a limb box with a wider face box overlaid near the tip —
     a stepped widening at 0.54·outb that no sculling blade has. A ro's blade is hewn and
     scarfed from one timber: the face deepens CONTINUOUSLY from the loom scarf to its
     widest just short of the tip, then eases to the tip itself. One loft, shared by every
     blade in the hull because they are the same timber, stations inside the old boxes'
     own envelope — depth B*0.033 at the pin to B*0.052 at 0.82·outb, the face's B*0.004
     drop carried out with it — end grain closed both ends, single winding on DoubleSide
     (the r118 normals lesson). The loom stays a cylinder because a loom IS a round spar. */
  const roInb = oarLen * 0.38, roOutb = oarLen * 0.62;
  /* one closed quad-section loft, the shared construction for BOTH blade laws — stations
     [zFrac, halfW/B, halfD/B, yOff/B], z = zFrac·runLen, end grain closed both ends,
     single winding on DoubleSide (the r118/r156 normals law) */
  const bladeLoft = (prof, runLen) => {
    const bp = { pos: [], idx: [] };
    const quadB = (a2, b2, c2, d2) => { const k = bp.pos.length / 3;
      bp.pos.push(...a2, ...b2, ...c2, ...d2);
      bp.idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
    const rings = prof.map(([f, w, d2, y]) => { const z = f * runLen,
        xw = w * B, yd = d2 * B, yc = y * B;
      return [[-xw, yc - yd, z], [xw, yc - yd, z],
              [xw, yc + yd, z], [-xw, yc + yd, z]]; });
    for (let s = 0; s < rings.length - 1; s++)
      for (let e = 0; e < 4; e++) {
        const e2 = (e + 1) % 4;
        quadB(rings[s][e], rings[s + 1][e], rings[s + 1][e2], rings[s][e2]);
      }
    quadB(...rings[0]);                                    /* pin end grain */
    quadB(...[...rings[rings.length - 1]].reverse());      /* tip end grain */
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bp.pos, 3));
    geo.setIndex(bp.idx); geo.computeVertexNormals();
    return geo;
  };
  let bladeRo = null, matRo = null;
  if (RO) {
    matRo = mat.clone(); matRo.side = THREE.DoubleSide;
    bladeRo = bladeLoft([              /* [z/outb, halfW/B, halfD/B, yOff/B] */
      [0.00, 0.0050, 0.0165,  0.0000],
      [0.20, 0.0049, 0.0180, -0.0010],
      [0.42, 0.0046, 0.0215, -0.0025],
      [0.62, 0.0043, 0.0250, -0.0038],
      [0.82, 0.0039, 0.0260, -0.0040],
      [1.00, 0.0033, 0.0205, -0.0040]], roOutb);
  }
  /* ── AND A SWEEP'S BLADE IS ALSO ONE TIMBER, NOT A CRATE (round 168) ─────────────────
     The fleet probe ranked the oared fleet's 270 sweep blades the largest boxy class
     left after the containers (which are boxes because a container IS a box): every
     blade was a 12-triangle BoxGeometry — the same depth at the neck as at the tip,
     which no blade hewn from a timber has — and the crate overran the oar itself:
     centred at 0.90·outb with an 0.11·oarLen half-length, its corner stood at
     1.049·outb, five per cent past the oar's own recorded length. The blade takes the
     ro's one-timber law with the sweep's own SYMMETRIC section (a sweep feathers, so
     its face carries no ro camber): shaft-round at the neck where the loom scarfs in,
     deepening continuously to its widest just short of the tip, easing to the tip at
     1.00·outb exactly — an oar stops at its own record. Stations sit inside the old
     crate's own envelope (max half-depth the crate's 0.0375·B). One loft and one loom
     spar shared by every sweep in the hull, because they are the same timber. */
  let bladeSw = null, matSw = null, loomSwGeo = null;
  const swInb = oarLen * 0.26, swOutb = oarLen * 0.74;
  if (!RO && n) {
    matSw = mat.clone(); matSw.side = THREE.DoubleSide;
    bladeSw = bladeLoft([              /* [z/outb, halfW/B, halfD/B, yOff/B] */
      [0.70, 0.0100, 0.0100, 0],
      [0.78, 0.0070, 0.0200, 0],
      [0.86, 0.0050, 0.0300, 0],
      [0.93, 0.0042, 0.0365, 0],
      [0.97, 0.0038, 0.0375, 0],
      [1.00, 0.0028, 0.0260, 0]], swOutb);
    /* the loom stops in the blade's neck instead of running to the tip inside it — the
       old full-length spar poked its round head through the thin blade's faces for the
       last quarter of the run, a 7.6 cm cylinder in a 3 cm slab on the trireme */
    loomSwGeo = new THREE.CylinderGeometry(B * 0.010, B * 0.014, swInb + swOutb * 0.72, 6);
  }
  for (let bank = 0; bank < n; bank++) {
    const v = RO ? 0.96 : 0.70 + bank * 0.11;         // a ro pivots ON the rail; sweep banks ride the side
    const out = 1.0 + bank * 0.22;                    // and further outboard
    const perBank = perBankOf(bank);
    const spread = 0.62 + bank * 0.05;                  // the top bank reaches further fore and aft
    for (let i = 0; i < perBank; i++) {
      /* rowers sit one interscalmium apart, so the tholes are spaced by a REAL LENGTH and
         the bank's extent follows from how many men are in it — not the other way round */
      const span = (perBank - 1) * INTERSCALMIUM / L;
      const uc = AP ? (AP.from + AP.to) / 2 : 0.5;    // the frame's own middle, else amidships
      const u = uc - span / 2 + (i / (perBank - 1)) * span + bank * 0.006;
      const p = surfacePoint(S, H, u, Math.min(0.99, v));
      for (const sgn of [-1, 1]) {
        const o = new THREE.Group();
        if (RO) {
          const inb = roInb, outb = roOutb;
          const DOG = 0.35;                           // the scarf angle between the limbs
          /* the blade: the shared loft above — one flat timber, face near-vertical,
             widening continuously toward the tip, pivot pin at the origin */
          o.add(new THREE.Mesh(bladeRo, matRo));
          /* the loom, scarfed up-inboard from the pin to the sculler's hands */
          const loom = new THREE.Mesh(
            new THREE.CylinderGeometry(B * 0.011, B * 0.014, inb, 6), mat);
          loom.rotation.x = Math.PI / 2 + DOG;
          loom.position.set(0, inb * 0.5 * Math.sin(DOG), -inb * 0.5 * Math.cos(DOG));
          o.add(loom);
          o.position.set(p[0], p[1], sgn * p[2]);
          /* attitude: raked aft in plan, pitched so the tip runs under the surface. One
             direction vector set as a quaternion, because an Euler pitch about the
             ship's own X on an aft-raked oar is part roll. The rake GROWS toward the
             ends: amidships a sculler faces square out, but at the narrow bow and stern
             stations his loom would cross the centreline and stand over the foredeck as
             a bare stick — the first spin capture showed exactly that thicket — so the
             end ro trail nearly fore-and-aft, and the cap below is geometric: no handle
             can reach past the hull's own half-breadth at its station. */
          let psi = 0.62 + 0.55 * Math.pow(2 * Math.abs(u - 0.5), 2);
          const spanIn = inb * Math.cos(DOG), lim = Math.abs(p[2]) * 0.85;
          if (spanIn * Math.cos(psi) > lim) psi = Math.acos(lim / spanIn);
          const hyp = Math.hypot(outb, p[1] + 0.5), c = outb / hyp;
          const dir = new THREE.Vector3(Math.sin(psi) * c, -(p[1] + 0.5) / hyp,
                                        sgn * Math.cos(psi) * c);
          o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
          /* each man works his own ro to his own time — the phase is his, not a
             coxswain's; the animator keeps the blade buried */
          o.userData.oar = { sgn, bank, style: 'ro', qRest: o.quaternion.clone(),
                             ph: (i * 0.618 + (sgn > 0 ? 0 : 0.31)) % 1, outb };
          g.add(o);
          continue;
        }
        /* An oar is a LEVER pivoting on the thole. The loom runs INBOARD to the rower's
           hands; the shaft runs OUTBOARD to the blade. The gearing is what the whole stroke
           depends on: about 1.1 m inboard against 3.1 m outboard, so the handle moves a
           metre and the blade moves nearly three. Built along +Z, which is outboard. */
        const inb = swInb, outb = swOutb;
        const shaft = new THREE.Mesh(loomSwGeo, mat);
        shaft.rotation.x = Math.PI / 2;                 // lie the loom along Z: OUTBOARD
        shaft.position.z = (outb * 0.72 - inb) / 2;
        o.add(shaft);
        o.add(new THREE.Mesh(bladeSw, matSw));
        if (AP) o.position.set(p[0], apY, sgn * apZ);
        else o.position.set(p[0], p[1], sgn * p[2] * out);
        o.rotation.y = sgn > 0 ? 0 : Math.PI;          // flips +Z outboard to the other side
        /* the rest angle is GEOMETRY, not a constant: the blade rests AWASH, so the slope
           follows from the thole's height over the water and the oar's outboard reach —
           the same law for a hull-side thole as for an apostis thole. The old branch held
           the hull-side case at the trireme's −0.34 constant, which the comment above it
           already contradicted: on the panokseon it buried every blade a metre deep, and
           on the 1.2 m-draught sekibune the audit caught the blades below her own keel. */
        const restX = AP ? -Math.atan2(apY + B * 0.02, outb)
                         : -Math.atan2(Math.max(0.15, p[1]) + B * 0.02, outb);
        o.rotation.x = restX;
        /* what the animator needs to swing this oar: which side it is, its rest angles, and
           its bank, because the three banks do not enter the water at the same instant */
        o.userData.oar = { sgn, restY: o.rotation.y, restX, bank };
        g.add(o);
      }
    }
  }
  group.add(tag(g, 'oar'));
}


/* ── THE GALLEY'S MACHINERY ────────────────────────────────────────────────────────────
 * What separates a sixteenth-century war galley from a big trireme is all above the deck,
 * and all of it is in the record: the SPUR (a boarding bridge where antiquity carried a
 * ram), the APOSTIS (the rectangular rowing frame standing outboard of the planking — the
 * hull is a canoe, the frame is the engine room bolted on top), the ARRUMBADA (the bow
 * fighting platform the guns stand on — a galley's guns all bear FORWARD, aimed by aiming
 * the ship), and the tent over the poop. Sources: Guilmartin, Gunpowder and Galleys;
 * Morrison (ed.), The Age of the Galley. No complete hull survives; the proportions here
 * follow the arsenal records those works reprint.
 *
 * Everything takes both its ends from geometry that exists — the stem's own profile, the
 * deck edge's own curve — the head-timbers' law: nothing CAN float.
 */
function buildGalleyWorks(S, group, mats) {
  const AP = S.apostis;
  if (!S.spur && !AP && !S.gunDeck && !S.tower) return;
  const H = hullSurface(S);
  const L = S.lwl, B = S.beam;
  const timber = mats.woodDark, pale = mats.woodPale;

  /* one beam between two computed points — quaternion from the segment itself */
  const beamAB = (a, b, w, h, mat) => {
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, h), mat);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.position.copy(a).addScaledVector(d, len / 2);
    return m;
  };
  /* a tapered square-sectioned beam between two computed points — the spur's trick */
  const sparAB = (a, b, rFoot, rTip, mat) => {
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTip, rFoot, len, 4, 1), mat);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.rotateY(Math.PI / 4);
    m.position.copy(a).addScaledVector(d, len / 2);
    return m;
  };
  /* a plank with eased edges — a working timber's arrises are never left sharp */
  const plankGeo = (w, h, len) => {
    const c = Math.min(w, h) * 0.28, hw = w / 2, hh = h / 2;
    const s = new THREE.Shape();
    s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.lineTo(hw, -hh + c);
    s.lineTo(hw, hh - c); s.lineTo(hw - c, hh); s.lineTo(-hw + c, hh);
    s.lineTo(-hw, hh - c); s.lineTo(-hw, -hh + c); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    g.translate(0, 0, -len / 2);
    return g;
  };
  /* a laid deck in one extrusion: the section carries a V-seam at every plank edge,
     so the seams are geometry with real edges, not paint (the snapBand law). Extruded
     along local z; rotate the mesh a quarter turn and the planks run fore-and-aft.
     Pitch is in METRES — a deck plank is a real-world width, not a fraction of beam. */
  const deckGeo = (width, t, len, pitch) => {
    const hw = width / 2, hh = t / 2, c = t * 0.35;
    const g = 0.007, d = t * 0.40;                   // seam half-width and depth
    const s = new THREE.Shape();
    s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.lineTo(hw, -hh + c);
    s.lineTo(hw, hh - c); s.lineTo(hw - c, hh);
    const n = Math.max(1, Math.round(width / pitch));
    for (let k = n - 1; k >= 1; k--) {               // top edge right to left, seam by seam
      const z = -hw + (k / n) * width;
      s.lineTo(z + g, hh); s.lineTo(z, hh - d); s.lineTo(z - g, hh);
    }
    s.lineTo(-hw + c, hh); s.lineTo(-hw, hh - c); s.lineTo(-hw, -hh + c);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    return geo;
  };

  const pdMid = surfacePoint(S, H, 0.5, 1.0);
  const deckY = pdMid[1];
  const apZ = AP ? Math.abs(pdMid[2]) + AP.out : Math.abs(pdMid[2]);
  const apY = deckY + B * 0.115;                       // same law as the tholes in buildOars

  /* ── THE SPUR ──────────────────────────────────────────────────────────────────────
     A tapered square-sectioned spar from the stem head, riding above the water, tip a
     little high. Heel buried in the bow so it grows out of structure, iron-shod at the
     point. Its two cheek knees run back to the hull's own skin. */
  if (S.spur) {
    const p0 = surfacePoint(S, H, 0.002, 1.0);
    const heel = new THREE.Vector3(p0[0] + B * 0.20, p0[1] * 0.62, 0);
    const tip = new THREE.Vector3(p0[0] - S.spur, p0[1] * 0.62 + S.spur * 0.10, 0);
    const dir = tip.clone().sub(heel).normalize();
    const slen = heel.distanceTo(tip);
    const sg = new THREE.CylinderGeometry(B * 0.020, B * 0.042, slen, 4, 1);
    const spar = new THREE.Mesh(sg, timber);
    spar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    spar.rotation.z += 0; spar.rotateY(Math.PI / 4);   // square section, flats up
    spar.position.copy(heel).addScaledVector(dir, slen / 2);
    group.add(tag(spar, 'spur'));
    const shoe = new THREE.Mesh(new THREE.ConeGeometry(B * 0.018, B * 0.10, 4), mats.iron);
    shoe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    shoe.position.copy(tip).addScaledVector(dir, B * 0.04);
    group.add(tag(shoe, 'spur', 'Spur shoe'));
    for (const sgn of [-1, 1]) {
      const pk = surfacePoint(S, H, 0.030, 0.90);
      const a = new THREE.Vector3(pk[0], pk[1], sgn * pk[2]);
      const b = heel.clone().addScaledVector(dir, slen * 0.30);
      group.add(tag(beamAB(a, b, B * 0.026, B * 0.030, timber), 'spur', 'Cheek knee'));
    }
  }

  /* ── THE APOSTIS, WITH ITS BENCHES AND THE CORSIA ──────────────────────────────────
     The rowing frame drawn as the cross-sections draw it (Burlet's Réale sections in
     Morrison (ed.), The Age of the Galley; Guilmartin, Gunpowder and Galleys), every
     member carried by the one below it. The BACCALARI cantilever from the hull's own
     rail — foot on the sheer at each oar station — up to the apostis, whose rail rides
     on their heads at exactly the height and offset the oars in buildOars pivot at
     (same fields, same law, so they cannot disagree). The BANDA, the stringer the
     benches' outboard ends rest on, lies where the midships beam's top face passes
     bench height — pure geometry from the beam's own run, and since the sheer only
     rises from amidships every other station notches deeper into its beam: nothing
     CAN float. Inboard the bench end sits on the corsia's ledge, and ahead of every
     bench stands the PEDAGNA, the sloped footboard a scaloccio crew steps up onto and
     falls back from — the stroke IS climb-and-fall, so a bench without one is not a
     rowing bench. A thole pin stands on the rail at each station, bow side of its oar,
     which is the side the stroke bears on. */
  if (AP) {
    const xF = (AP.from - 0.5) * L, xT = (AP.to - 0.5) * L;
    const inter = S.interscalmium || 0.98;
    const perBank = Array.isArray(S.oarsPerBank) ? S.oarsPerBank[0] : (S.oarsPerBank || 24);
    const railH = B * 0.040;
    const benchT = B * 0.014;
    const benchY = deckY + B * 0.073;                  // seat law unchanged — oars aim at it
    const bUnder = benchY - benchT / 2;
    /* the beams' shared run, midships: foot on the sheer, head under the rail with a
       working overlap, tip standing a hand proud past the apostis as every plate draws */
    const footZ0 = Math.abs(pdMid[2]) - B * 0.020;
    const headY = apY - B * 0.026, headZ = apZ + B * 0.020;
    const beamHalf = B * 0.019;
    const bandaD = B * 0.016, bandaW = B * 0.050;
    const tB = (bUnder - bandaD - (deckY + beamHalf)) / (headY - deckY);
    const bandaZ = footZ0 + Math.max(0.15, Math.min(0.92, tB)) * (headZ - footZ0);
    const span = (perBank - 1) * inter / L;
    const uc = (AP.from + AP.to) / 2;
    for (const sgn of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(xT - xF, railH, B * 0.034), timber);
      rail.position.set((xF + xT) / 2, apY, sgn * apZ);
      group.add(tag(rail, 'apostis'));
      const banda = new THREE.Mesh(
        new THREE.BoxGeometry(xT - xF, bandaD, bandaW), timber);
      banda.position.set((xF + xT) / 2, bUnder - bandaD / 2, sgn * bandaZ);
      group.add(tag(banda, 'apostis', 'Banda',
        'The stringer along the beams that the benches’ outboard ends rest on.'));
      /* baccalari at the oar stations — the same interscalmium arithmetic as buildOars */
      for (let i = 0; i < perBank; i++) {
        const u = uc - span / 2 + (i / (perBank - 1)) * span;
        const pd = surfacePoint(S, H, u, 1.0);
        const a = new THREE.Vector3(pd[0], pd[1], sgn * (Math.abs(pd[2]) - B * 0.020));
        const b = new THREE.Vector3(pd[0], headY, sgn * headZ);
        group.add(tag(sparAB(a, b, B * 0.017, B * 0.011, timber), 'apostis', 'Baccalaro',
          'The cantilever from the gunwale that carries the rowing frame.'));
        /* the thole pin, bow side of its oar */
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(B * 0.008, B * 0.008, B * 0.055, 6), timber);
        pin.position.set(pd[0] - 0.06, apY + railH / 2 + B * 0.018, sgn * apZ);
        group.add(tag(pin, 'apostis', 'Thole'));
        /* the bench: corsia ledge to banda, outer end trailing aft — the rower faces the
           stern, and at the finish the loom lies over the bench angled inboard-bow-ward,
           so the bench parallels it. (The old sign sent the outer end bow-ward while this
           comment said aft — the comment was right, the arithmetic was the other sign.) */
        const bLen = apZ - B * 0.010 - B * 0.088;
        const bench = new THREE.Mesh(plankGeo(B * 0.055, benchT, bLen), pale);
        bench.position.set(pd[0], benchY, sgn * (B * 0.088 + bLen / 2));
        bench.rotation.y = sgn * 0.17;
        group.add(tag(bench, 'bench'));
        /* the pedagna: sloped footboard a half-interscalmium abaft the bench, lower edge
           in the deck, rising toward the stern — what the crew stands up onto */
        const pLen = bLen * 0.62;
        const ped = new THREE.Mesh(plankGeo(B * 0.032, B * 0.010, pLen), pale);
        ped.position.set(pd[0] + inter * 0.5, deckY + B * 0.008,
                         sgn * (B * 0.080 + pLen / 2));
        ped.rotation.set(0, sgn * 0.17, 0.6);
        group.add(tag(ped, 'bench', 'Pedagna',
          'The footboard. A scaloccio stroke is climb-and-fall: step up, drop back.'));
      }
    }
    const corsia = new THREE.Mesh(
      new THREE.BoxGeometry(xT - xF, B * 0.086, B * 0.17), timber);
    corsia.position.set((xF + xT) / 2, deckY + B * 0.043, 0);
    group.add(tag(corsia, 'apostis', 'Corsia',
      'The raised gangway down the centreline, the only way fore and aft on a deck that '
      + 'is otherwise benches. The boatswain walks it; so does everyone going forward to fight.'));
  }

  /* ── THE GUN DECK OVER THE ROWERS ──────────────────────────────────────────────────
     What makes a galleass a galleass. A merchant great galley's hull is deep enough to
     carry a second deck clear over the rowers' heads, spanning the full width of the
     rowing frame, and the guns stand ON it and fire outboard OVER the oars — the
     broadside a war galley structurally cannot mount, because her sides at gun height
     are full of oars. The deck rides on stanchions standing on the apostis rails; a
     solid waist-high screen runs along each edge, and the muzzles look over it.
     Record-driven: gunDeck {from, to, height (m over the deck edge), gunsPerSide}.
     Sources: Guilmartin, Gunpowder and Galleys; Morrison (ed.), The Age of the Galley;
     Grevenbroeck's drawing of a Venetian galleass (the card's own plate). */
  if (S.gunDeck && !AP) {
    /* ── THE PANOK: THE SAME DECK, WITHOUT THE FRAME ─────────────────────────────────
       The Korean answer to the galleass's problem, half a century earlier. A panokseon
       carries no apostis — her oars pivot at the hull's own side — so the fighting deck
       (the sangjang, the "board roof" the ship is NAMED for) stands on stanchions rising
       from the gunwale itself, and its beam-ends overhang the side (GD.over, metres) the
       way every crossbeam in a Korean hull pierces the planking. Its width therefore
       follows the hull's own rail line, station by station off surfacePoint — not a
       constant frame width, which would float off both ends of a hull this full — the
       head-timbers' law again. And the screen is no waist-high rail but a plank BULWARK
       (GD.screenH, metres): the storey a Japanese boarding party would have to climb,
       which is the whole argument of the type. Sources: Hong Sun-jae, 'Understanding
       the Structure of the Panokseon' (Military History 135, 2025); Underwood, Korean
       Boats and Ships (1934). */
    const GD = S.gunDeck;
    const gdY = deckY + GD.height;
    const over = GD.over !== undefined ? GD.over : B * 0.045;
    const N = 22;
    const sx = [], railY = [], halfW = [];
    for (let i = 0; i <= N; i++) {
      const u = GD.from + (GD.to - GD.from) * i / N;
      const pd = surfacePoint(S, H, u, 1.0);
      sx.push(pd[0]); railY.push(pd[1]); halfW.push(Math.abs(pd[2]) + over);
    }
    /* the deck: one lofted strip between the two edge curves, single winding on a
       DoubleSide clone so the rowers' side of their own roof is not a hole.
       ⚠ r156: this was the both-ways index trick — the same triangles indexed again
       in opposite winding, SHARING vertices — and computeVertexNormals cancels each
       shared vertex to an exact zero or to ~1e-16 of FP dust that normalize()
       amplifies to a full unit vector in an arbitrary direction: the plank lit as
       alternating unlit / skyward / upside-down bands, the r118 sangjang symptom.
       The audit's round-156 rule convicts the pattern itself. */
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      pos.push(sx[i], gdY, -halfW[i], sx[i], gdY, halfW[i]);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dg.setIndex(idx); dg.computeVertexNormals();
    const paleDS = pale.clone(); paleDS.side = THREE.DoubleSide;
    group.add(tag(new THREE.Mesh(dg, paleDS), 'gundeck', GD.name, GD.what));
    const surfY = gdY + B * 0.007;
    const shH = GD.screenH !== undefined ? GD.screenH : B * 0.042;
    /* a record that carries sama, or a battery firing through the wall, gets that
       wall built pierced, below — the segment bulwark here would only be torn
       open again */
    const nSama = Math.max(0, GD.loops | 0);
    const nG = Math.max(0, GD.gunsPerSide | 0);
    /* ── THE CLAMP IS ONE BENT TIMBER, NOT A CHAIN (round 143) ───────────────────────
       The fore-and-aft timber under the deck lip — the one the deck's edge rides on
       and the walls tuck their heads into. Until r143 it was drawn as N chord boxes a
       side, the segment class the sama wall (r140), the gun-port bulwark (r141) and
       the sangjang belt (r142) each closed one storey at a time: a kink, a wedge gap
       and its own facet shading at every joint. A real clamp is bent round the deck
       edge in one piece per side. Lofted station by station on the same stations,
       section where every chord's section was — B*0.030 deep, B*0.028 athwart, axis
       at gdY − B*0.016 / halfW − B*0.014 — so nothing that abuts it moves. Single
       winding on a DoubleSide material, the r118 normals lesson. */
    const timberC = timber.clone(); timberC.side = THREE.DoubleSide;
    for (const sgn of [-1, 1]) {
      for (let i = 0; i <= N; i += 2) {
        /* stanchions stand ON the rail — foot at the gunwale the surface owns */
        const a = new THREE.Vector3(sx[i], railY[i], sgn * (halfW[i] - over));
        const b = new THREE.Vector3(sx[i], gdY, sgn * (halfW[i] - B * 0.020));
        group.add(tag(beamAB(a, b, B * 0.020, B * 0.020, timber), 'gundeck', 'Stanchion'));
      }
      {
        const cvh = B * 0.015, cah = B * 0.014, cyC = gdY - B * 0.016;
        const zCl = i => halfW[i] - B * 0.014;
        const cp = { pos: [], idx: [] };
        const quadCl = (a2, b2, c2, d2) => { const k = cp.pos.length / 3;
          cp.pos.push(...a2, ...b2, ...c2, ...d2);
          cp.idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
        for (let i = 0; i < N; i++) {
          const xA = sx[i], xB = sx[i + 1], zA = zCl(i), zB = zCl(i + 1);
          quadCl([xA, cyC + cvh, sgn * (zA - cah)], [xB, cyC + cvh, sgn * (zB - cah)],
                 [xB, cyC + cvh, sgn * (zB + cah)], [xA, cyC + cvh, sgn * (zA + cah)]);
          quadCl([xA, cyC - cvh, sgn * (zA - cah)], [xB, cyC - cvh, sgn * (zB - cah)],
                 [xB, cyC - cvh, sgn * (zB + cah)], [xA, cyC - cvh, sgn * (zA + cah)]);
          quadCl([xA, cyC - cvh, sgn * (zA + cah)], [xB, cyC - cvh, sgn * (zB + cah)],
                 [xB, cyC + cvh, sgn * (zB + cah)], [xA, cyC + cvh, sgn * (zA + cah)]);
          quadCl([xA, cyC - cvh, sgn * (zA - cah)], [xB, cyC - cvh, sgn * (zB - cah)],
                 [xB, cyC + cvh, sgn * (zB - cah)], [xA, cyC + cvh, sgn * (zA - cah)]);
        }
        for (const iE of [0, N])                          /* end grain */
          quadCl([sx[iE], cyC - cvh, sgn * (zCl(iE) - cah)],
                 [sx[iE], cyC - cvh, sgn * (zCl(iE) + cah)],
                 [sx[iE], cyC + cvh, sgn * (zCl(iE) + cah)],
                 [sx[iE], cyC + cvh, sgn * (zCl(iE) - cah)]);
        const cg2 = new THREE.BufferGeometry();
        cg2.setAttribute('position', new THREE.Float32BufferAttribute(cp.pos, 3));
        cg2.setIndex(cp.idx); cg2.computeVertexNormals();
        group.add(tag(new THREE.Mesh(cg2, timberC), 'gundeck', 'Deck clamp'));
      }
      if (!nSama && !nG) for (let i = 0; i < N; i++) {
        /* the bulwark above the clamp, segment by segment along the curved edge —
           the class default where no record cuts openings through it */
        const ba = new THREE.Vector3(sx[i], surfY + shH / 2, sgn * (halfW[i] - B * 0.006));
        const bb = new THREE.Vector3(sx[i + 1], surfY + shH / 2, sgn * (halfW[i + 1] - B * 0.006));
        group.add(tag(beamAB(ba, bb, shH, B * 0.012, timber), 'gundeck', 'Bulwark',
          'Heavy plank, chest-high, around the whole fighting deck — the rowers below it, '
          + 'the marines behind it, and the reason boarding a panokseon means climbing.'));
      }
    }
    /* and the ends CLOSE: an athwartships panel at each end of the fighting deck. Every
       drawing shows the bulwark wrapping the bow and stern of the panok; an open end
       would hand a boarding party the one unwalled way in. Seen from dead ahead or dead
       astern — the bearings a fleet actually met her on — these two panels are most of
       what shows. */
    for (const uE of [GD.from, GD.to]) {
      const pd = surfacePoint(S, H, uE, 1.0);
      const hwE = Math.abs(pd[2]) + over;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(B * 0.012, shH, hwE * 2 - B * 0.012), timber);
      panel.position.set(pd[0], surfY + shH / 2, 0);
      group.add(tag(panel, 'gundeck', 'End bulwark'));
    }
    const portMat = new THREE.MeshStandardMaterial({ color: 0x17120c, roughness: 0.95 });
    /* ── THE SANGJANG WALL: THE OAR DECK'S OWN PROTECTION (round 118) ─────────────────
       Between the hull's rail and the fighting deck the class default is open
       stanchions, which is a pavilion, not protection — and the panokseon's own plate
       (the late-Joseon jeonseon drawing on her card) closes this band on both sides it
       shows with a painted plank belt pierced by a row of small ports under the deck
       line; her card's Decks row calls the oar deck protected. Record-driven:
       GD.walls closes the band, GD.wallPorts counts the port row a side, and
       sangjangProvenance in the record carries what the plate attests and at what
       scale. The wall is lofted station by station between rail and deck clamp
       exactly as the stanchions rake, set one post-face inboard so the posts stand
       proud of the planking (the yakata's law); the ends close with lofted trapezoid
       panels, because the band's foot follows the hull's rail and its head follows
       the overhung deck edge — a box here would hang its foot corners over open
       water, the galleass fortress lesson (r116). The ro pivot at the rail, so the
       oars work under the wall's own foot seam. */
    if (GD.walls) {
      const wIn = B * 0.006;                     // one post-face: walls inboard, posts proud
      const headY = gdY - B * 0.016;             // the clamp line the wall head tucks into
      /* ⚠ single winding on a DoubleSide material, NOT the deck's both-ways index
         trick: duplicated opposite-winding triangles SHARE vertices, so
         computeVertexNormals sums each vertex's normals to zero length, and the
         first render of this wall came out washed near-white along half its run —
         the red-paint diagnosis capture proved the plank was there and the light
         was broken. DoubleSide flips clean normals in the shader instead. */
      const timberDS = timber.clone(); timberDS.side = THREE.DoubleSide;
      /* ── THE PORT ROW IS OPENINGS NOW (round 142, the r140/r141 law one storey
         down). The plate's row of small square ports under the deck line was drawn
         as dark plates PROUD of the belt — paint, while the record's own word has
         been "pierced" since r118. Now the belt itself is built pierced, exactly as
         the fighting-deck wall above: stations of the loft plus both edges of every
         port, each port a real OPENING through the plank with jamb, sill and head
         reveal faces the plank's own gauge deep, and a near-black board a hand
         inboard so the port reads into the oar deck's shadow from every outboard
         bearing. Positions and sizes are the drawn row's exactly: 16 a side under
         the deck line, 0.52 m of daylight, 0.50 m tall. The plank takes the
         bulwark's own gauge (B*0.012) and thickens INBOARD, so the outer face —
         the face the plate attests and the posts stand proud of — does not move.
         The belt RAKES between rail and clamp, so every z is interpolated at its
         own height along the rake. Single winding on DoubleSide, the r118 lesson. */
      const tS = B * 0.012;
      const nP = Math.max(0, GD.wallPorts | 0);
      const duP = 0.26 / L;
      const yPc = headY - 0.42, ypS = yPc - 0.25, ypH = yPc + 0.25;
      const portDSS = portMat.clone(); portDSS.side = THREE.DoubleSide;
      /* stations: the loft's own N plus both edges of every port, sorted */
      const usS = [], portsS = [];
      for (let i = 0; i <= N; i++) usS.push(GD.from + (GD.to - GD.from) * i / N);
      for (let j = 0; j < nP; j++) {
        const uj = GD.from + (GD.to - GD.from) * (j + 0.5) / nP;
        portsS.push([uj - duP, uj + duP]); usS.push(uj - duP, uj + duP);
      }
      usS.sort((a, b) => a - b);
      const inPort = u => portsS.some(s => u > s[0] + 1e-9 && u < s[1] - 1e-9);
      /* the belt's frame at a station: foot on the rail, head at the clamp, and
         its z at any height interpolated along the rake between them */
      const stS = u => {
        const p = surfacePoint(S, H, u, 1.0);
        const footY = p[1] - B * 0.010;
        const footZ = Math.abs(p[2]) - wIn;
        const headZ = Math.abs(p[2]) + over - B * 0.020 - wIn;
        return { x: p[0], footY,
                 z: y => footZ + (headZ - footZ) * (y - footY) / (headY - footY) };
      };
      for (const sgn of [-1, 1]) {
        const wallS = { pos: [], idx: [] }, revS = { pos: [], idx: [] };
        const quadS = (gq, a, b, c, d) => {
          const k = gq.pos.length / 3;
          gq.pos.push(...a, ...b, ...c, ...d);
          gq.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
        };
        for (let i = 0; i < usS.length - 1; i++) {
          if (usS[i + 1] - usS[i] < 1e-7) continue;   // a port edge on a loft station
          const a = stS(usS[i]), b = stS(usS[i + 1]);
          const oA = y => sgn * a.z(y), oB = y => sgn * b.z(y);
          const iA = y => sgn * (a.z(y) - tS), iB = y => sgn * (b.z(y) - tS);
          /* below the sills and above the heads the belt runs unbroken */
          quadS(wallS, [a.x, a.footY, oA(a.footY)], [b.x, b.footY, oB(b.footY)],
                       [b.x, ypS, oB(ypS)], [a.x, ypS, oA(ypS)]);
          quadS(wallS, [a.x, a.footY, iA(a.footY)], [b.x, b.footY, iB(b.footY)],
                       [b.x, ypS, iB(ypS)], [a.x, ypS, iA(ypS)]);
          quadS(wallS, [a.x, ypH, oA(ypH)], [b.x, ypH, oB(ypH)],
                       [b.x, headY, oB(headY)], [a.x, headY, oA(headY)]);
          quadS(wallS, [a.x, ypH, iA(ypH)], [b.x, ypH, iB(ypH)],
                       [b.x, headY, iB(headY)], [a.x, headY, iA(headY)]);
          /* head and foot seams closed, plank-edge wide */
          quadS(wallS, [a.x, headY, iA(headY)], [b.x, headY, iB(headY)],
                       [b.x, headY, oB(headY)], [a.x, headY, oA(headY)]);
          quadS(wallS, [a.x, a.footY, oA(a.footY)], [b.x, b.footY, oB(b.footY)],
                       [b.x, b.footY, iB(b.footY)], [a.x, a.footY, iA(a.footY)]);
          /* the port band: belt only between ports — a span inside a port is the hole */
          if (!inPort((usS[i] + usS[i + 1]) / 2)) {
            quadS(wallS, [a.x, ypS, oA(ypS)], [b.x, ypS, oB(ypS)],
                         [b.x, ypH, oB(ypH)], [a.x, ypH, oA(ypH)]);
            quadS(wallS, [a.x, ypS, iA(ypS)], [b.x, ypS, iB(ypS)],
                         [b.x, ypH, iB(ypH)], [a.x, ypH, iA(ypH)]);
          }
        }
        /* end grain under the athwartships closures */
        for (const uE of [usS[0], usS[usS.length - 1]]) {
          const e = stS(uE);
          quadS(wallS, [e.x, e.footY, sgn * (e.z(e.footY) - tS)],
                       [e.x, e.footY, sgn * e.z(e.footY)],
                       [e.x, headY, sgn * e.z(headY)],
                       [e.x, headY, sgn * (e.z(headY) - tS)]);
        }
        /* each port: jambs, sill and head through the plank */
        for (const [uL2, uR2] of portsS) {
          const l = stS(uL2), r = stS(uR2);
          const oL = y => sgn * l.z(y), iL = y => sgn * (l.z(y) - tS);
          const oR = y => sgn * r.z(y), iR = y => sgn * (r.z(y) - tS);
          quadS(revS, [l.x, ypS, oL(ypS)], [l.x, ypS, iL(ypS)],
                      [l.x, ypH, iL(ypH)], [l.x, ypH, oL(ypH)]);
          quadS(revS, [r.x, ypS, oR(ypS)], [r.x, ypS, iR(ypS)],
                      [r.x, ypH, iR(ypH)], [r.x, ypH, oR(ypH)]);
          quadS(revS, [l.x, ypS, oL(ypS)], [r.x, ypS, oR(ypS)],
                      [r.x, ypS, iR(ypS)], [l.x, ypS, iL(ypS)]);
          quadS(revS, [l.x, ypH, oL(ypH)], [r.x, ypH, oR(ypH)],
                      [r.x, ypH, iR(ypH)], [l.x, ypH, iL(ypH)]);
        }
        const mkS = (gq, mat, name, what) => {
          const bg = new THREE.BufferGeometry();
          bg.setAttribute('position', new THREE.Float32BufferAttribute(gq.pos, 3));
          bg.setIndex(gq.idx); bg.computeVertexNormals();
          group.add(tag(new THREE.Mesh(bg, mat), 'sangjang', name, what));
        };
        mkS(wallS, timberDS, 'Sangjang belt',
            'The closed plank belt between the gunwale and the fighting deck — the '
            + 'oar deck\'s own protection. The rowers work behind it, and the ro '
            + 'reach out under its foot seam.');
        mkS(revS, timberDS, 'Oar-deck port',
            'The row of small square ports her plate draws under the deck line, cut '
            + 'through the belt — from outside each is a dark square in the plank, '
            + 'reading into the oar deck\'s own shadow.');
        /* the shadow boards: one dark plane behind each port, a hand inboard, so the
           opening reads into the deck's shadow rather than through to the far wall */
        const brdS = { pos: [], idx: [] };
        const mrgS = 0.06;
        for (const [uL2, uR2] of portsS) {
          const l = stS(uL2), r = stS(uR2);
          /* the belt rakes outboard as it rises: clamp the board inboard of the
             band's most-inboard face, which is its foot */
          const zb = sgn * (Math.min(l.z(ypS - mrgS), r.z(ypS - mrgS)) - tS - 0.08);
          const x0 = Math.min(l.x, r.x) - mrgS, x1 = Math.max(l.x, r.x) + mrgS;
          const k = brdS.pos.length / 3;
          brdS.pos.push(x0, ypS - mrgS, zb, x1, ypS - mrgS, zb,
                        x1, ypH + mrgS, zb, x0, ypH + mrgS, zb);
          brdS.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
        }
        mkS(brdS, portDSS, 'Oar-deck port');
      }
      /* the end closures, lofted foot-to-head like the sides */
      for (const uE of [GD.from, GD.to]) {
        const pd = surfacePoint(S, H, uE, 1.0);
        const zf = Math.abs(pd[2]) - wIn, zh = Math.abs(pd[2]) + over - B * 0.020 - wIn;
        const ep = [pd[0], pd[1] - B * 0.010, -zf,  pd[0], pd[1] - B * 0.010, zf,
                    pd[0], headY, zh,               pd[0], headY, -zh];
        const eg = new THREE.BufferGeometry();
        eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
        eg.setIndex([0, 1, 2, 0, 2, 3]);
        eg.computeVertexNormals();
        group.add(tag(new THREE.Mesh(eg, timberDS), 'sangjang',
                      uE === GD.from ? 'Oar-deck end wall, forward' : 'Oar-deck end wall, aft'));
      }
    }
    /* ── THE MAKU: THE CLOTH HER OWN PLATE HANGS AT THE BAND (round 119; the valance
       corrected round 170) ─────────────────────────────────────────────────────────
       The Busan boat-barrier scroll of 1593 — the sekibune's own plate — draws NO
       plank belt between rail and fighting deck: on hull after hull of the anchored
       fleet it hangs CLOTH there, a white band under a dark scalloped hem, falling
       from the yagura's overhung deck edge and lapping the sheer; the atakebune
       amidships wears the same dress inverted, dark with white scallops, and wears
       it under sail. So GD.walls is refuted for this class by its own plate, and
       the record field is GD.maku: a lofted cloth strip per side, head hung under
       the deck clamp, hem riding clear of the rail cap so the ro work out from
       under it — the sangjang's own law. The valance is GEOMETRY, because a colour
       that lives on a vertex cannot have an edge — and since r170 it is the plate's
       own valance. r119 hung spaced half-discs off the band's FOOT while the record
       said "white cloth UNDER a dark scalloped hem": the comment right, the
       arithmetic the other sign. On every hull of the scroll that resolves the
       border (the atakebune crop above all) the scallops hang from the HEAD,
       tangent, cut from one strip, white cusps rising between them — so one mesh a
       side: contiguous semicircles of half the recorded bay (GD.makuBayM), lofted
       ON the band's own surface, flat edge on the head line, lying 8 mm proud
       along the outboard normal, the second cloth a real valance is. Arc segments
       scale with the radius so vertex spacing stays under the audit's coverage
       reach at any recorded bay. Sides only: the plate shows the band only in
       broadside, and the ends keep the open stanchions the class default draws.
       Single winding on DoubleSide, the r118 normals lesson. */
    if (GD.maku) {
      const clothMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.94,
                                                        side: THREE.DoubleSide });
      const valMat = new THREE.MeshStandardMaterial({ color: 0x252a38, roughness: 0.94,
                                                      side: THREE.DoubleSide });
      const lipIn = B * 0.010;      // hung just inside the deck lip
      const tuck = 0.10;            // the hem swings a hand's-breadth inboard
      const clear = 0.15;           // and rides clear of the rail cap, over the ro
      const headYc = gdY - B * 0.016;
      /* the cloth is one parametric surface both pieces share: f along the band,
         s down it — 0 the head under the clamp, 1 the hem over the rail */
      const atCloth = (f, s, sgn) => {
        const t = Math.min(1, Math.max(0, f)) * N;
        const i = Math.min(N - 1, Math.floor(t)), w = t - i;
        const xx = sx[i] + (sx[i + 1] - sx[i]) * w;
        const ry = railY[i] + (railY[i + 1] - railY[i]) * w;
        const hw = halfW[i] + (halfW[i + 1] - halfW[i]) * w;
        return [xx, headYc + (ry + clear - headYc) * s, sgn * (hw - lipIn - tuck * s)];
      };
      const depCloth = f => {
        const t = Math.min(1, Math.max(0, f)) * N;
        const i = Math.min(N - 1, Math.floor(t)), w = t - i;
        return headYc - (railY[i] + (railY[i + 1] - railY[i]) * w + clear);
      };
      const bayM = GD.makuBayM !== undefined ? GD.makuBayM : 0.7;
      const bandLen = Math.abs(sx[N] - sx[0]);
      const nSc = Math.max(4, Math.round(bandLen / bayM));
      const pitchF = 1 / nSc, rM = bandLen / nSc / 2;
      const SEG = Math.max(12, Math.ceil(Math.PI * rM / 0.07));
      const lay = 0.008;
      for (const sgn of [-1, 1]) {
        const cpos = [], cidx = [];
        for (let i = 0; i <= N; i++) {
          cpos.push(sx[i], headYc,           sgn * (halfW[i] - lipIn),
                    sx[i], railY[i] + clear, sgn * (halfW[i] - lipIn - tuck));
          if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
        cg.setIndex(cidx); cg.computeVertexNormals();
        group.add(tag(new THREE.Mesh(cg, clothMat), 'maku', 'Maku',
          'The cloth band the Busan scroll hangs along the yagura band on hull after '
          + 'hull of the anchored fleet — white, under a dark scalloped hem. Dress and '
          + 'concealment both: an arquebusier behind it cannot be counted.'));
        /* the valance: one strip of cloth a side — tangent semicircles hanging from
           the head line, radius half the recorded bay, on the band's own surface */
        const vpos = [], vidx = [];
        for (let j = 0; j < nSc; j++) {
          const fc = (j + 0.5) * pitchF;
          const base = vpos.length / 3;
          const ap = atCloth(fc, 0, sgn);
          vpos.push(ap[0], ap[1], ap[2] + sgn * lay);
          for (let k = 0; k <= SEG; k++) {
            const th = Math.PI + Math.PI * k / SEG;
            const f = fc + Math.cos(th) * pitchF / 2;
            const d = -Math.sin(th) * rM;
            const p = atCloth(f, Math.min(1, d / Math.max(depCloth(f), 1e-6)), sgn);
            vpos.push(p[0], p[1], p[2] + sgn * lay);
            if (k) vidx.push(base, base + k, base + k + 1);
          }
        }
        const vg = new THREE.BufferGeometry();
        vg.setAttribute('position', new THREE.Float32BufferAttribute(vpos, 3));
        vg.setIndex(vidx); vg.computeVertexNormals();
        group.add(tag(new THREE.Mesh(vg, valMat), 'maku', 'Maku valance',
          'The dark scalloped border at the cloth band\'s head — tangent semicircles '
          + 'cut from one strip, hanging from the line the cloth itself hangs from, as '
          + 'the scroll draws them on hull after hull. Until round 170 the scallops '
          + 'were drawn spaced apart and off the band\'s foot; the plate hangs them '
          + 'touching, at the head.'));
      }
    }
    /* ── THE TATE-ITA, PIERCED (round 140) ────────────────────────────────────────────
       The sama: firing slots for bow and arquebus in a row along the wall — what the
       wall is FOR on a hull that mounts no broadside. Record-driven: GD.loops a side.
       Until r140 each was a dark plate straddling the plank — paint, not a slot — and
       the survey named the class (samax26). Now the wall itself is built pierced, the
       r136 grating-hole law: one lofted plank wall per side following the deck edge's
       own curve, each sama a real OPENING through it with reveal faces the plank's own
       thickness deep, and a near-black board a hand inboard of each opening so the slot
       reads into shadow from every outboard bearing — the same interior darkness the
       hatchway plate gives the gratings. Positions, sizes and the row line are the
       plate row's exactly: centre 0.60·shH over the deck, 0.24·shH tall, 0.10 m wide.
       Source: ja "sekibune": the tate-ita carry sama (狭間), slots for bow and arquebus.
       Round 141 drives the same law from the battery: on a hull with no rowing frame
       the guns fire through this wall — the panokseon's broadside — so where the
       record carries gunsPerSide instead of loops, the openings are her gun ports,
       square and cut low so each muzzle clears its own timber bed. No hull in the
       fleet records both.
       Single winding on DoubleSide throughout — the r118 normals lesson. */
    if (nSama || nG) {
      const t = B * 0.012;                     // the plank the segments drew, kept
      const nOp = nSama || nG;
      /* slot half-width: a sama is 0.10 m of daylight; a gun port is the plate row's
         own square, B·0.055 a side, centred on the battery's axis height */
      const opHalf = nSama ? 0.05 : B * 0.0275;
      const du = opHalf / L;                   // and the same half-width in u
      const yB2 = surfY, yT2 = surfY + shH;
      const yAx = surfY + B * 0.042;           // the drawn battery's own axis height
      const yS = nSama ? surfY + shH * 0.48 : yAx - opHalf;
      const yH2 = nSama ? surfY + shH * 0.72 : yAx + opHalf;
      const timberDS2 = timber.clone(); timberDS2.side = THREE.DoubleSide;
      const portDS = portMat.clone(); portDS.side = THREE.DoubleSide;
      /* stations: the loft's own N plus both edges of every slot, sorted */
      const us = [], slots = [];
      for (let i = 0; i <= N; i++) us.push(GD.from + (GD.to - GD.from) * i / N);
      for (let j = 0; j < nOp; j++) {
        const uj = GD.from + (GD.to - GD.from) * (j + 0.5) / nOp;
        slots.push([uj - du, uj + du]); us.push(uj - du, uj + du);
      }
      us.sort((a, b) => a - b);
      const inSlot = u => slots.some(s => u > s[0] + 1e-9 && u < s[1] - 1e-9);
      const st = u => { const p = surfacePoint(S, H, u, 1.0);
                        return { x: p[0], w: Math.abs(p[2]) + over - B * 0.006 }; };
      for (const sgn of [-1, 1]) {
        const wall = { pos: [], idx: [] }, rev = { pos: [], idx: [] };
        const quad = (g, a, b, c, d) => {
          const k = g.pos.length / 3;
          g.pos.push(...a, ...b, ...c, ...d);
          g.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
        };
        for (let i = 0; i < us.length - 1; i++) {
          if (us[i + 1] - us[i] < 1e-7) continue;   // a slot edge on a loft station
          const a = st(us[i]), b = st(us[i + 1]);
          const zoA = sgn * (a.w + t / 2), zoB = sgn * (b.w + t / 2);
          const ziA = sgn * (a.w - t / 2), ziB = sgn * (b.w - t / 2);
          /* below the sill and above the head the wall runs unbroken */
          quad(wall, [a.x, yB2, zoA], [b.x, yB2, zoB], [b.x, yS, zoB], [a.x, yS, zoA]);
          quad(wall, [a.x, yB2, ziA], [b.x, yB2, ziB], [b.x, yS, ziB], [a.x, yS, ziA]);
          quad(wall, [a.x, yH2, zoA], [b.x, yH2, zoB], [b.x, yT2, zoB], [a.x, yT2, zoA]);
          quad(wall, [a.x, yH2, ziA], [b.x, yH2, ziB], [b.x, yT2, ziB], [a.x, yT2, ziA]);
          quad(wall, [a.x, yT2, ziA], [b.x, yT2, ziB], [b.x, yT2, zoB], [a.x, yT2, zoA]);
          /* the slot band: wall only between slots — a span inside a slot is the hole */
          if (!inSlot((us[i] + us[i + 1]) / 2)) {
            quad(wall, [a.x, yS, zoA], [b.x, yS, zoB], [b.x, yH2, zoB], [a.x, yH2, zoA]);
            quad(wall, [a.x, yS, ziA], [b.x, yS, ziB], [b.x, yH2, ziB], [a.x, yH2, ziA]);
          }
        }
        /* end grain at the wall's own ends, under the athwartships panels */
        for (const uE of [us[0], us[us.length - 1]]) {
          const e = st(uE);
          quad(wall, [e.x, yB2, sgn * (e.w - t / 2)], [e.x, yB2, sgn * (e.w + t / 2)],
                     [e.x, yT2, sgn * (e.w + t / 2)], [e.x, yT2, sgn * (e.w - t / 2)]);
        }
        /* each sama: jambs, sill and head through the plank, and the shadow board */
        for (const [uL2, uR2] of slots) {
          const l = st(uL2), r = st(uR2);
          quad(rev, [l.x, yS, sgn * (l.w + t / 2)], [l.x, yS, sgn * (l.w - t / 2)],
                    [l.x, yH2, sgn * (l.w - t / 2)], [l.x, yH2, sgn * (l.w + t / 2)]);
          quad(rev, [r.x, yS, sgn * (r.w + t / 2)], [r.x, yS, sgn * (r.w - t / 2)],
                    [r.x, yH2, sgn * (r.w - t / 2)], [r.x, yH2, sgn * (r.w + t / 2)]);
          quad(rev, [l.x, yS, sgn * (l.w + t / 2)], [r.x, yS, sgn * (r.w + t / 2)],
                    [r.x, yS, sgn * (r.w - t / 2)], [l.x, yS, sgn * (l.w - t / 2)]);
          quad(rev, [l.x, yH2, sgn * (l.w + t / 2)], [r.x, yH2, sgn * (r.w + t / 2)],
                    [r.x, yH2, sgn * (r.w - t / 2)], [l.x, yH2, sgn * (l.w - t / 2)]);
        }
        const mk = (g, mat, name, what) => {
          const bg = new THREE.BufferGeometry();
          bg.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
          bg.setIndex(g.idx); bg.computeVertexNormals();
          group.add(tag(new THREE.Mesh(bg, mat),
                        name === 'Tate-ita' || name === 'Bulwark' ? 'gundeck'
                                                                  : nSama ? 'sama' : 'gun',
                        name, what));
        };
        if (nSama) {
          mk(wall, timberDS2, 'Tate-ita',
             'The shield planking around the fighting deck, pierced by the sama — thinner '
             + 'than an atakebune\'s, and the storey a boarding party has to climb.');
          mk(rev, timberDS2, 'Sama',
             'Firing slots for bow and arquebus, cut through the tate-ita — the wall\'s '
             + 'whole purpose on a hull that mounts no broadside.');
        } else {
          mk(wall, timberDS2, 'Bulwark',
             'Heavy plank, chest-high, around the whole fighting deck — the rowers below it, '
             + 'the marines behind it, and the reason boarding a panokseon means climbing.');
          mk(rev, timberDS2, 'Gun port',
             'A square port for each chongtong, cut low through the bulwark so the muzzle '
             + 'clears its own bed and stands out of the plank. The gunners reload behind '
             + 'the wall; from outside the broadside is a row of dark squares under an '
             + 'unbroken wall top.');
        }
        /* the shadow boards: one dark plane behind each slot, a hand inboard, so the
           opening reads into the deck's own shadow rather than through to the far wall */
        const brd = { pos: [], idx: [] };
        const quadB = (a, b, c, d) => {
          const k = brd.pos.length / 3;
          brd.pos.push(...a, ...b, ...c, ...d);
          brd.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
        };
        const mrg = 0.06;
        for (const [uL2, uR2] of slots) {
          const l = st(uL2), r = st(uR2);
          const zb = sgn * ((l.w + r.w) / 2 - t / 2 - 0.08);
          const x0 = Math.min(l.x, r.x) - mrg, x1 = Math.max(l.x, r.x) + mrg;
          quadB([x0, yS - mrg, zb], [x1, yS - mrg, zb],
                [x1, yH2 + mrg, zb], [x0, yH2 + mrg, zb]);
        }
        mk(brd, portDS, nSama ? 'Sama' : 'Gun port', undefined);
      }
    }
    /* the battery: gunsPerSide pieces a side, each firing THROUGH its own port in the
       pierced wall above — barrel and timber bed only; the port is an opening now,
       framed by its reveals with the dark board behind it, not a plate on the face */
    for (const sgn of [-1, 1]) for (let j = 0; j < nG; j++) {
      const u = GD.from + (GD.to - GD.from) * (j + 0.5) / nG;
      const pd = surfacePoint(S, H, u, 1.0);
      const hw = Math.abs(pd[2]) + over;
      const len = B * 0.22, r = B * 0.014;
      const g = new THREE.Group();
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.72, r, len, 12), mats.iron);
      bar.rotation.x = sgn * Math.PI / 2;              // +Y to ±Z: muzzle outboard
      g.add(bar);
      const carr = new THREE.Mesh(
        new THREE.BoxGeometry(r * 3.2, r * 2.4, len * 0.48), timber);
      carr.position.set(0, -r * 2.0, -sgn * len * 0.18);
      g.add(carr);
      g.position.set((u - 0.5) * L, surfY + r * 3.0, sgn * (hw - len * 0.30));
      group.add(tag(g, 'gun', 'Deck piece',
        'A bronze chongtong — cheonja, jija, hyeonja or hwangja, "heaven, earth, black, '
        + 'yellow", by size — on a timber bed, firing iron shot or the daejanggunjeon '
        + 'heavy arrow over the bulwark. The Joseon navy fought at range with these; '
        + 'the Japanese fleet it faced carried almost no shipboard cannon at all.'));
    }
  }

  if (S.gunDeck && AP) {
    /* Carried, member by member, the same law as the telaro one storey down: the
       stanchions stand on the apostis rails, the fore-and-aft clamps ride on their
       heads, the deck beams span clamp to clamp with their ends showing at the deck
       edge, and the planking lies on the beams. What this block drew before r135 was
       a slab floating between two sticks — no beams at all, a featureless underside
       over the rowers' heads, and every mesh a plain box. Same sources as the deck's
       own comment above: Guilmartin; Morrison (ed.), The Age of the Galley. */
    const GD = S.gunDeck;
    const xF = (GD.from - 0.5) * L, xT = (GD.to - 0.5) * L;
    const gdY = deckY + GD.height;
    const width = 2 * apZ + B * 0.05;
    const deckT = B * 0.014;
    const deck = new THREE.Mesh(deckGeo(width, deckT, xT - xF, 0.30), pale);
    deck.rotation.y = Math.PI / 2;                     // planks fore-and-aft
    deck.position.set((xF + xT) / 2, gdY, 0);
    group.add(tag(deck, 'gundeck'));
    const surfY = gdY + B * 0.007;                     // the planking's upper face
    const bmD = B * 0.026, bmW = B * 0.030;            // deck beam scantlings
    const clH = B * 0.032, clW = B * 0.030;            // clamp scantlings
    const bmTop = gdY - deckT / 2;                     // the beams touch the planking,
    const clTop = bmTop - bmD;                         // the clamps touch the beams
    const nPost = 12;
    for (let i = 0; i <= nPost; i++) {
      const x = xF + (xT - xF) * i / nPost;
      const beam = new THREE.Mesh(plankGeo(bmW, bmD, width - B * 0.004), timber);
      beam.position.set(x, bmTop - bmD / 2, 0);
      group.add(tag(beam, 'gundeck', 'Deck beam',
        'Athwartships from clamp to clamp, one at every stanchion — the rowers pull '
        + 'under these, and the guns recoil over them.'));
    }
    for (const sgn of [-1, 1]) {
      const clZ = sgn * (width / 2 - B * 0.025);       // directly over the apostis rail
      /* the clamp — the fore-and-aft timber the beam ends rest on — and its stanchions,
         standing on the apostis rail, which is what carries the whole deck's weight */
      const clamp = new THREE.Mesh(plankGeo(clW, clH, xT - xF), timber);
      clamp.rotation.y = Math.PI / 2;
      clamp.position.set((xF + xT) / 2, clTop - clH / 2, clZ);
      group.add(tag(clamp, 'gundeck', 'Deck clamp'));
      for (let i = 0; i <= nPost; i++) {
        const x = xF + (xT - xF) * i / nPost;
        const a = new THREE.Vector3(x, apY, sgn * apZ);
        const b = new THREE.Vector3(x, clTop - clH + B * 0.004, clZ);   // head in the clamp
        group.add(tag(sparAB(a, b, B * 0.013, B * 0.010, timber), 'gundeck', 'Stanchion'));
      }
      /* the screen: the gunners' and rowers' only cover, and the line the muzzles
         clear — planking under an eased cap standing a little proud, not a slab */
      const shH = B * 0.042, capH = B * 0.010;
      const scr = new THREE.Mesh(plankGeo(B * 0.012, shH - capH, xT - xF), timber);
      scr.rotation.y = Math.PI / 2;
      scr.position.set((xF + xT) / 2, surfY + (shH - capH) / 2, sgn * (width / 2 - B * 0.006));
      group.add(tag(scr, 'gundeck', 'Screen'));
      const cap = new THREE.Mesh(plankGeo(B * 0.020, capH, xT - xF), timber);
      cap.rotation.y = Math.PI / 2;
      cap.position.set((xF + xT) / 2, surfY + shH - capH / 2, sgn * (width / 2 - B * 0.006));
      group.add(tag(cap, 'gundeck', 'Screen cap'));
    }
    /* the broadside: gunsPerSide pieces a side, muzzles outboard over the screen */
    const nG = Math.max(0, GD.gunsPerSide | 0);
    for (const sgn of [-1, 1]) for (let j = 0; j < nG; j++) {
      const u = GD.from + (GD.to - GD.from) * (j + 0.5) / nG;
      const x = (u - 0.5) * L;
      const len = B * 0.42, r = B * 0.017;
      const g = new THREE.Group();
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.72, r, len, 12), mats.iron);
      bar.rotation.x = sgn * Math.PI / 2;              // +Y to ±Z: muzzle outboard
      g.add(bar);
      const carr = new THREE.Mesh(
        new THREE.BoxGeometry(r * 3.2, r * 2.4, len * 0.48), timber);
      carr.position.set(0, -r * 2.0, -sgn * len * 0.18);
      g.add(carr);
      g.position.set(x, surfY + r * 3.0, sgn * (width / 2 - len * 0.30));
      group.add(tag(g, 'gun', 'Broadside piece',
        'A sacre or demi-culverin on the gun deck, firing over the oars. Eight or nine '
        + 'a side is a weight of metal no galley can answer: her guns all face forward.'));
    }
  }

  /* ── THE COMMANDER'S TOWER ─────────────────────────────────────────────────────────
     The janggundae: a roofed pavilion on posts, standing on the fighting deck amidships,
     where the commanding officer stands through the action — visible to his whole crew
     and to the rest of the squadron, which is how a Joseon fleet was signalled. Every
     drawing of a panokseon shows it: the Gakseon dobon draws the pavilion with its
     hipped roof standing clear above the bulwarks. Record-driven: tower {at, w, h}. */
  if (S.tower) {
    const T = S.tower;
    const xC = (T.at - 0.5) * L;
    const baseY = S.gunDeck ? deckY + S.gunDeck.height + B * 0.007 : deckY;
    const platY = baseY + T.h;
    const hw = T.w / 2;
    const tg = new THREE.Group();
    if (T.walls) {
    /* ── THE WALLED YAKATA, FRAMED AND PLANKED (round 139; form round 117) ──────────
       The Busan boat-barrier scroll of 1593 — this hull's own plate — draws the
       commander's cabin as a CLOSED plank house under a ridged plank roof, and on
       several cabins it hangs CLOTH in wall openings. Round 117 drew the house as
       box slabs and recorded the curtain as not drawn; this round the house is
       carried structure and the curtain hangs. Each piece carries the next (the
       r133 law): groundsills on the yagura, corner posts sill to plate, wall plates
       at the eave line, and the walls are seam-planked boards landed on that frame
       — deckGeo stood on edge, so every board edge is geometry (the snapBand law).
       One opening a side under the eaves with jambs, head and sill timbers, the
       curtain lofted inside it; the doorway is a framed opening with the dark door
       recessed INTO it, not a plate proud of the wall. Footprint, eave line and the
       r117 ridge law are kept exactly: the ridge stands pitch*hw over the wall-top
       line and the eave tip drops pitch*ovh below it, which is what keeps gable
       hypotenuse and roof soffit on one line. Openings are DERIVED (plan-scale
       read, no Sengoku sekibune survives); the cloth is the scroll's. */
      const hl = (T.len || T.w) / 2;
      const eaveY = baseY + T.h;
      const wt = 0.06;
      const sillH = 0.07, plateH = 0.08;
      const bandLo = baseY + sillH, bandHi = eaveY - plateH;   // the planking spans the frame
      /* the frame: sills and plates, chamfered working timber */
      for (const sgn of [-1, 1]) {                             // side sills + wall plates
        const sill = new THREE.Mesh(plankGeo(0.10, sillH, hl * 2), timber);
        sill.rotation.y = Math.PI / 2;
        sill.position.set(xC, baseY + sillH / 2, sgn * (hw - wt / 2));
        tg.add(sill);
        const plate = new THREE.Mesh(plankGeo(0.10, plateH, hl * 2 + 0.06), timber);
        plate.rotation.y = Math.PI / 2;
        plate.position.set(xC, eaveY - plateH / 2, sgn * (hw - wt / 2));
        tg.add(plate);
      }
      for (const sgn of [-1, 1]) {                             // end sills + wall plates
        const sill = new THREE.Mesh(plankGeo(0.10, sillH, hw * 2 - wt * 2), timber);
        sill.position.set(xC + sgn * (hl - wt / 2), baseY + sillH / 2, 0);
        tg.add(sill);
        const plate = new THREE.Mesh(plankGeo(0.10, plateH, hw * 2 - wt * 2), timber);
        plate.position.set(xC + sgn * (hl - wt / 2), eaveY - plateH / 2, 0);
        tg.add(plate);
      }
      /* corner posts, one timber sill to plate, square with a working taper */
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        const px = xC + dx * (hl - B * 0.011), pz = dz * (hw - B * 0.011);
        tg.add(sparAB(new THREE.Vector3(px, baseY, pz),
                      new THREE.Vector3(px, eaveY, pz), B * 0.0190, B * 0.0165, timber));
      }
      /* a planked wall band: deckGeo stood on edge — width becomes height, the
         V-seamed face turns outboard, boards run the wall's length. rotY turns the
         seam face: +PI/2 -> +z, -PI/2 -> -z, 0 -> -x (fore), PI -> +x (aft) */
      const wallBand = (h, len, rotY) => {
        const g = deckGeo(h, wt, len, 0.30);
        g.rotateZ(Math.PI / 2);
        if (rotY) g.rotateY(rotY);
        return new THREE.Mesh(g, timber);
      };
      /* side walls: one opening a side under the eaves, curtain hung in it */
      const wo = 1.10, ho = 0.55;
      const headYo = eaveY - 0.28, sillYo = headYo - ho;
      const clothMatT = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.94,
                                                         side: THREE.DoubleSide });
      for (const sgn of [-1, 1]) {
        const zW = sgn * (hw - wt / 2);
        const rotY = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
        const lo = wallBand(sillYo - bandLo, hl * 2, rotY);          // sole to opening sill
        lo.position.set(xC, (bandLo + sillYo) / 2, zW);
        tg.add(lo);
        const hi = wallBand(bandHi - headYo, hl * 2, rotY);          // opening head to plate
        hi.position.set(xC, (headYo + bandHi) / 2, zW);
        tg.add(hi);
        const segL = (hl * 2 - wo) / 2;                              // beside the opening
        for (const dx of [-1, 1]) {
          const mid = wallBand(ho, segL, rotY);
          mid.position.set(xC + dx * (wo / 2 + segL / 2), (sillYo + headYo) / 2, zW);
          tg.add(mid);
        }
        /* the opening's own frame, proud of the planking like the posts */
        const zP = sgn * (hw - wt / 2 + 0.020);
        for (const dx of [-1, 1]) {                                  // jamb studs
          const jamb = new THREE.Mesh(plankGeo(0.05, 0.05, ho + 0.16), timber);
          jamb.rotation.x = Math.PI / 2;
          jamb.position.set(xC + dx * (wo / 2 + 0.025), (sillYo + headYo) / 2, zP);
          tg.add(jamb);
        }
        for (const [yF, dy] of [[headYo, 0.025], [sillYo, -0.025]]) { // head and sill timbers
          const strip = new THREE.Mesh(plankGeo(0.05, 0.05, wo + 0.26), timber);
          strip.rotation.y = Math.PI / 2;
          strip.position.set(xC, yF + dy, zP);
          tg.add(strip);
        }
        /* the curtain the scroll hangs in the opening — head under the head timber,
           hem sagging and swung a hand inboard; deterministic folds, single winding
           on DoubleSide (the r118 normals lesson) */
        const nC = 10, cpos = [], cidx = [];
        for (let i = 0; i <= nC; i++) {
          const t = i / nC, x = xC - wo / 2 + wo * t;
          const sag = 0.05 * Math.sin(Math.PI * t) + 0.02 * Math.sin(3 * Math.PI * t + 1.0);
          const zTop = sgn * (hw - wt - 0.015);
          const zHem = sgn * (hw - wt - 0.055 - 0.03 * Math.sin(2 * Math.PI * t));
          cpos.push(x, headYo - 0.01, zTop, x, sillYo - 0.06 + sag, zHem);
          if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
        cg.setIndex(cidx); cg.computeVertexNormals();
        tg.add(new THREE.Mesh(cg, clothMatT));
      }
      /* fore wall: the doorway framed, the dark door recessed into it */
      const doorMat = mats.slotDark || (mats.slotDark = new THREE.MeshStandardMaterial(
        { color: 0x17120c, roughness: 0.95 }));
      const doorW = 0.72, doorH = Math.min(T.h * 0.72, 1.5);
      const doorTop = bandLo + doorH;
      const endLen = hw * 2 - wt * 2, xF = xC - (hl - wt / 2);
      for (const dz of [-1, 1]) {                                  // planking beside the door
        const seg = wallBand(bandHi - bandLo, (endLen - doorW) / 2, 0);
        seg.position.set(xF, (bandLo + bandHi) / 2, dz * (doorW / 2 + (endLen - doorW) / 4));
        tg.add(seg);
      }
      const hdr = wallBand(bandHi - doorTop, doorW, 0);            // header over the door
      hdr.position.set(xF, (doorTop + bandHi) / 2, 0);
      tg.add(hdr);
      const xP = xC - hl - 0.012;
      for (const dz of [-1, 1]) {                                  // door jambs, proud
        const jamb = new THREE.Mesh(plankGeo(0.05, 0.05, doorH + 0.10), timber);
        jamb.rotation.x = Math.PI / 2;
        jamb.position.set(xP, bandLo + doorH / 2, dz * (doorW / 2 + 0.025));
        tg.add(jamb);
      }
      const lintel = new THREE.Mesh(plankGeo(0.05, 0.05, doorW + 0.26), timber);
      lintel.position.set(xP, doorTop + 0.025, 0);
      tg.add(lintel);
      const doorG = plankGeo(doorW - 0.04, 0.035, doorH - 0.04);   // the door itself, recessed
      doorG.rotateX(Math.PI / 2); doorG.rotateY(Math.PI / 2);
      const door = new THREE.Mesh(doorG, doorMat);
      door.position.set(xC - hl + 0.048, bandLo + doorH / 2, 0);
      tg.add(door);
      /* aft wall: planked full */
      const aft = wallBand(bandHi - bandLo, endLen, Math.PI);
      aft.position.set(xC + (hl - wt / 2), (bandLo + bandHi) / 2, 0);
      tg.add(aft);
      /* a waist batten each side — the scroll draws the wall planking in bands */
      for (const sgn of [-1, 1]) {
        const bat = new THREE.Mesh(plankGeo(B * 0.012, B * 0.010, hl * 2), pale);
        bat.rotation.y = Math.PI / 2;
        bat.position.set(xC, baseY + T.h * 0.55, sgn * hw);
        tg.add(bat);
      }
      /* the ridged plank roof — boards run ridge to eave with real seam edges;
         the r117 alignment law kept exactly */
      const ovh = Math.min(0.35, hw * 0.25);             // eaves overhang
      const pitch = 0.42;
      const ridgeY = eaveY + pitch * hw;                 // ridge over the wall-top line
      const tipY = eaveY - pitch * ovh;                  // eave tip, below it at the same pitch
      const slope = Math.hypot(hw + ovh, ridgeY - tipY);
      for (const sgn of [-1, 1]) {
        const plane = new THREE.Mesh(
          deckGeo(hl * 2 + ovh * 2, 0.045, slope, 0.30), pale);
        plane.rotation.x = sgn * Math.atan(pitch);
        plane.position.set(xC, (ridgeY + tipY) / 2 + 0.03, sgn * (hw + ovh) / 2);
        tg.add(plane);
      }
      /* gable boards close the triangle under each end of the roof, at the roof's
         pitch — corners truncated like every other working timber here, with the
         cuts INSIDE the triangle so the hypotenuse stays exactly on the soffit
         line (the r117 open-wedge law): vertical cuts at the feet, hidden by the
         posts, and a flat under the apex, hidden by the ridge cap */
      for (const sgn of [-1, 1]) {
        const c = 0.04, apX = pitch * hw;
        const shp = new THREE.Shape();
        shp.moveTo(-hw + c, 0); shp.lineTo(hw - c, 0);
        shp.lineTo(hw - c, pitch * c);
        shp.lineTo(c * 0.5, apX - pitch * c * 0.5);
        shp.lineTo(-c * 0.5, apX - pitch * c * 0.5);
        shp.lineTo(-hw + c, pitch * c); shp.closePath();
        const gable = new THREE.Mesh(
          new THREE.ExtrudeGeometry(shp, { depth: wt, bevelEnabled: false }), timber);
        gable.rotation.y = Math.PI / 2;
        gable.position.set(xC + sgn * hl - (sgn > 0 ? wt : 0), eaveY, 0);
        tg.add(gable);
      }
      const capR = new THREE.Mesh(                       // the ridge cap
        plankGeo(0.16, 0.07, hl * 2 + ovh * 2 + 0.10), timber);
      capR.rotation.y = Math.PI / 2;
      capR.position.set(xC, ridgeY + 0.06, 0);
      tg.add(capR);
    } else {
    /* ── THE OPEN JANGGUNDAE, AS THE PLATE DRAWS IT (round 133) ─────────────────────
       The Gakseon dobon draws a pavilion, and what stood here was staging: two rail
       lines held only at their corners, a platform with no way up from the deck it
       serves, and a roof too flat to read from any committed view. Structure now,
       each piece carrying the next: four round columns run in one timber from the
       fighting deck to the eaves; an edge-beam frame at platform height carries the
       floor; the rails span column to column with turned balusters under them, the
       forward side left open at the middle where the ladder lands; and the hip roof
       stands at the drawing's own prominence — hip rafters on the arrises, a fascia
       closing each eave, a finial at the apex. Plan and heights stay the record's
       {at, w, h}; the form is the plate's, the scantlings derived. */
    const colR = B * 0.014, eaveY = platY + 1.9, railH = 0.95;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {          // columns, deck to eaves
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(colR * 0.85, colR, eaveY - baseY, 10), timber);
      col.position.set(xC + dx * hw, (baseY + eaveY) / 2, dz * hw);
      tg.add(col);
    }
    const pw = T.w + 4 * colR;                                     // floor lips past the columns
    for (const sgn of [-1, 1]) {                                   // the edge-beam frame
      const bx = new THREE.Mesh(new THREE.BoxGeometry(pw, B * 0.020, B * 0.024), timber);
      bx.position.set(xC, platY - B * 0.014, sgn * hw);
      tg.add(bx);
      const bz = new THREE.Mesh(new THREE.BoxGeometry(B * 0.024, B * 0.020, pw), timber);
      bz.position.set(xC + sgn * hw, platY - B * 0.014, 0);
      tg.add(bz);
    }
    const plat = new THREE.Mesh(new THREE.BoxGeometry(pw, B * 0.006, pw), pale);
    plat.position.set(xC, platY, 0);
    tg.add(plat);
    /* the balustrade — rails from column to column, balusters at a hand's span;
       the commander stands at the rail, he does not hide behind a wall */
    /* rails run centre-to-centre and bury their ends in the columns — a tenon,
       not a butt joint hanging a gap off the column face */
    const balR = B * 0.0045, span = T.w - colR, gate = 0.62;
    const railSec = [B * 0.014, B * 0.011];
    for (const side of ['aft', 'port', 'stbd', 'fwd']) {
      const fwd = side === 'fwd';
      const mkRail = (len, cx, cz, alongX) => {
        const r = new THREE.Mesh(new THREE.BoxGeometry(
          alongX ? len : railSec[0], railSec[1], alongX ? railSec[0] : len), timber);
        r.position.set(cx, platY + railH, cz);
        tg.add(r);
      };
      const alongX = side === 'port' || side === 'stbd';
      const off = side === 'aft' ? [hw, 0] : side === 'fwd' ? [-hw, 0]
                : side === 'port' ? [0, -hw] : [0, hw];
      if (fwd) {                                                   // gate amidships for the ladder
        const seg = (span - gate) / 2;
        mkRail(seg, xC + off[0], -(gate + seg) / 2, false);
        mkRail(seg, xC + off[0], (gate + seg) / 2, false);
        for (const sgn of [-1, 1]) {                               // gate stanchions carry the rail ends
          const gp = new THREE.Mesh(
            new THREE.CylinderGeometry(balR * 1.8, balR * 1.8, railH, 6), timber);
          gp.position.set(xC + off[0], platY + railH / 2, sgn * gate / 2);
          tg.add(gp);
        }
      } else {
        mkRail(span, xC + off[0], off[1], alongX);
      }
      const n = Math.max(4, Math.round(span / 0.33));
      for (let j = 0; j <= n; j++) {
        const t = -span / 2 + span * j / n;
        if (fwd && Math.abs(t) < gate / 2) continue;
        const bal = new THREE.Mesh(
          new THREE.CylinderGeometry(balR, balR, railH - 0.06, 6), timber);
        const bx = alongX ? xC + t : xC + off[0];
        const bz = alongX ? off[1] : t;
        bal.position.set(bx, platY + railH / 2, bz);
        tg.add(bal);
      }
    }
    /* the ladder — the way up exists, raked from the fighting deck to the gate */
    const run = 1.15, footX = xC - hw - run;
    for (const sgn of [-1, 1]) {
      tg.add(beamAB(new THREE.Vector3(footX, baseY, sgn * 0.26),
                    new THREE.Vector3(xC - hw + 0.04, platY, sgn * 0.26),
                    0.05, 0.10, timber));
    }
    const rungs = 7;
    for (let j = 1; j < rungs; j++) {
      const t = j / rungs;
      const rung = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.0028, B * 0.0028, 0.52, 6), pale);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(footX + (xC - hw + 0.04 - footX) * t,
                        baseY + (platY - baseY) * t, 0);
      tg.add(rung);
    }
    /* the hip roof — a moim roof over a square plan, hips on the diagonals */
    const ovh = 0.55, eaveR = (hw + ovh) * Math.SQRT2, pitch = 0.55;
    const roofH = pitch * (hw + ovh);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(eaveR, roofH, 4), timber);
    roof.rotation.y = Math.PI / 4;                     // flats fore-and-aft, hips at the corners
    roof.position.set(xC, eaveY + roofH / 2, 0);
    tg.add(roof);
    const apex = new THREE.Vector3(xC, eaveY + roofH, 0);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {          // hip rafters on the arrises
      const corner = new THREE.Vector3(xC + dx * (hw + ovh), eaveY + 0.02, dz * (hw + ovh));
      tg.add(beamAB(apex.clone().setY(apex.y + 0.03), corner, 0.07, 0.07, timber));
    }
    for (const [fx, fz, alongX] of [[hw + ovh, 0, false], [-(hw + ovh), 0, false],
                                    [0, hw + ovh, true], [0, -(hw + ovh), true]]) {
      const fas = new THREE.Mesh(new THREE.BoxGeometry(                // fascia closing each eave
        alongX ? 2 * (hw + ovh) : 0.05, 0.13, alongX ? 0.05 : 2 * (hw + ovh)), pale);
      fas.position.set(xC + fx, eaveY, fz);
      tg.add(fas);
    }
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.5, 8), timber);
    fin.position.set(xC, eaveY + roofH + 0.22, 0);
    tg.add(fin);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), timber);
    knob.position.set(xC, eaveY + roofH + 0.50, 0);
    tg.add(knob);
    }
    /* the record may name its own tower — the sekibune's yakata is not a janggundae —
       and the Joseon text stays as the default the class was built from */
    group.add(tag(tg, 'tower', T.name, T.what
      || 'The janggundae, the roofed pavilion amidships the commander fights the ship from. '
      + 'At Myeongnyang Yi Sun-sin stood on one of these, in the first ship in the line, '
      + 'for most of a day, in sight of thirteen crews who had watched the rest of their '
      + 'navy destroyed eight weeks before.'));
  }

  /* ── THE ARRUMBADA, AND THE GUNS THAT FACE FORWARD ─────────────────────────────────
     The platform spans the rowing frame's full width over the spur's heel. The courser
     sits on the centreline; the flankers beside it. Aimed by aiming the ship. */
  if (S.bowGuns && !S.bowFortress) {
    const u0 = 0.030, u1 = AP ? AP.from : 0.17;
    const pA0 = surfacePoint(S, H, u0, 1.0), pA1 = surfacePoint(S, H, u1, 1.0);
    /* Where a gun deck runs over the rowers, the bow platform is its forward
       continuation: the galleass fights her bow battery at the gun deck's own level,
       so the two decks meet in one line. A plain galley keeps it at the deck edge. */
    const topY = (S.gunDeck ? deckY + S.gunDeck.height
                            : Math.max(pA0[1], pA1[1])) + B * 0.023;
    const width = 2 * apZ - B * 0.038;
    const platT = B * 0.019;
    const plat = new THREE.Mesh(deckGeo(width, platT, pA1[0] - pA0[0], 0.28), timber);
    plat.rotation.y = Math.PI / 2;                     // planks fore-and-aft
    plat.position.set((pA0[0] + pA1[0]) / 2, topY, 0);
    group.add(tag(plat, 'arrumbada'));
    /* the beams under the planking, and the posts that carry their span down to the
       bow deck, standing where the deck actually is (the head-timbers' law). Before
       r135 the posts were gated on S.gunDeck, which no arrumbada hull carries — dead
       code, and the galley's platform stood on nothing forward of the apostis. */
    const bmD = B * 0.024;
    const bmTop = topY - platT / 2;
    for (const u of [u0 + 0.012, (u0 + u1) / 2, u1 - 0.012]) {
      const pd = surfacePoint(S, H, u, 1.0);
      const beam = new THREE.Mesh(plankGeo(B * 0.026, bmD, width - B * 0.008), timber);
      beam.position.set(pd[0], bmTop - bmD / 2, 0);
      group.add(tag(beam, 'arrumbada', 'Platform beam'));
    }
    for (const u of [u0 + 0.012, u1 - 0.012]) for (const sgn of [-1, 1]) {
      const pd = surfacePoint(S, H, u, 1.0);
      const zP = sgn * Math.max(B * 0.06, Math.abs(pd[2]) - B * 0.03);
      const a = new THREE.Vector3(pd[0], pd[1], zP);
      const b = new THREE.Vector3(pd[0], bmTop - bmD + B * 0.004, zP);  // head in its beam
      group.add(tag(sparAB(a, b, B * 0.014, B * 0.011, timber),
                    'arrumbada', 'Platform post'));
    }
    /* breastwork across the front — planking under an eased cap standing a little
       proud; the boarding party crouches behind it */
    const bwH = B * 0.082, bcH = B * 0.012;
    const breast = new THREE.Mesh(plankGeo(B * 0.016, bwH - bcH, width), timber);
    breast.position.set(pA0[0] + B * 0.008, topY + B * 0.007 + (bwH - bcH) / 2, 0);
    group.add(tag(breast, 'arrumbada', 'Breastwork'));
    const bcap = new THREE.Mesh(plankGeo(B * 0.026, bcH, width), timber);
    bcap.position.set(pA0[0] + B * 0.008, topY + B * 0.007 + bwH - bcH / 2, 0);
    group.add(tag(bcap, 'arrumbada', 'Breastwork cap'));
    /* the platform's edge beams run aft to the apostis rails — tied into the frame,
       heavier where they land on it */
    if (AP) {
      const xF = (AP.from - 0.5) * L;
      for (const sgn of [-1, 1]) {
        const a = new THREE.Vector3(pA0[0] + B * 0.06, topY - B * 0.012, sgn * (width / 2 - B * 0.02));
        const b = new THREE.Vector3(xF + B * 0.02, apY, sgn * apZ);
        group.add(tag(sparAB(a, b, B * 0.011, B * 0.013, timber), 'arrumbada', 'Edge beam'));
      }
    }
    /* the battery: centreline courser, then flankers in pairs, every muzzle forward */
    const gmat = mats.iron;
    const mkGun = (len, r, z, yaw) => {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 14), gmat);
      bar.rotation.z = Math.PI / 2;                    // +Y to −X: muzzle toward the bow
      g.add(bar);
      const carriage = new THREE.Mesh(
        new THREE.BoxGeometry(len * 0.48, r * 2.4, r * 3.2), timber);
      carriage.position.set(len * 0.18, -r * 2.0, 0);
      g.add(carriage);
      g.position.set(pA0[0] + len / 2 - B * 0.19, topY + r * 3.0, z);
      g.rotation.y = yaw;
      return g;
    };
    group.add(tag(mkGun(B * 0.65, B * 0.028, 0, 0), 'gun', 'Courser',
      'The centreline heavy gun — a full cannon throwing a 50-pound ball. It is laid by '
      + 'steering the galley, and fired once, at fifty metres or less, as the spur came on.'));
    const flankers = Math.max(0, (S.bowGuns | 0) - 1);
    for (let j = 0; j < flankers; j++) {
      const side = j % 2 ? -1 : 1, rank = Math.floor(j / 2);
      const z = side * (B * 0.115 + rank * B * 0.105);
      group.add(tag(mkGun(B * 0.42, B * 0.017, z, side * 0.05), 'gun', 'Flanking piece'));
    }
  }

  /* ── THE BOW FORTRESS, AND THE BATTERY THAT FIRES ALL ROUND THE BOW ────────────────
     The Lepanto conversions carried no flat arrumbada: the Arsenal built a ROUND
     fortress over the bow — a fighting deck whose parapet sweeps from one apostis rail
     around the stem to the other, the heavy pieces firing ahead and on both bows
     through ports in the curve. Record-driven: bowFortress {from, to, parapetH}; the
     plan is a half-ellipse closing round the stem, the deck in one plane with the gun
     deck (the two meet in one line at `to`). The rim's overhang past the fine bow
     rides on raked posts standing on the hull's own deck edge — the head-timbers' law.
     Sources: Guilmartin, Gunpowder and Galleys; the rounded bow structure the
     contemporary Lepanto depictions draw. Form derived, and the record's
     bowFortressProvenance says so. The galley keeps her flat arrumbada; this branch
     never runs for her. */
  if (S.bowGuns && S.bowFortress) {
    const F = S.bowFortress;
    const topY = (S.gunDeck ? deckY + S.gunDeck.height
                            : surfacePoint(S, H, F.to, 1.0)[1]) + B * 0.023;
    const wF = apZ + B * 0.025;                        // meets the gun deck at its own width
    const K = 22;
    const arcU = k => F.to - (F.to - F.from) * Math.cos(-Math.PI / 2 + Math.PI * k / K);
    const arc = [];
    for (let k = 0; k <= K; k++)
      arc.push(new THREE.Vector3((arcU(k) - 0.5) * L, topY,
                                 wF * Math.sin(-Math.PI / 2 + Math.PI * k / K)));
    const cen = new THREE.Vector3((F.to - 0.5) * L, topY, 0);
    /* the deck: a fan from the aft edge's centre out to the curve — single winding on
       a DoubleSide clone; the both-ways index trick cancelled its normals (r156) */
    const pos = [cen.x, cen.y, cen.z], idx = [];
    for (const p of arc) pos.push(p.x, p.y, p.z);
    for (let k = 1; k < K + 1; k++) idx.push(0, k, k + 1);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    fg.setIndex(idx); fg.computeVertexNormals();
    const paleDS = pale.clone(); paleDS.side = THREE.DoubleSide;
    group.add(tag(new THREE.Mesh(fg, paleDS), 'fortress'));
    const pH = F.parapetH || B * 0.14;
    const fsY = topY + B * 0.007;
    for (let k = 0; k < K; k++) {
      const a = new THREE.Vector3(arc[k].x, fsY + pH / 2, arc[k].z);
      const b = new THREE.Vector3(arc[k + 1].x, fsY + pH / 2, arc[k + 1].z);
      group.add(tag(beamAB(a, b, pH, B * 0.014, timber), 'fortress', 'Parapet'));
    }
    /* raked posts: head at the rim, foot on the hull's own deck edge at that station */
    for (let k = 0; k <= K; k += 2) {
      const pd = surfacePoint(S, H, Math.min(Math.max(arcU(k), 0.004), 1), 1.0);
      const zMax = Math.max(Math.abs(pd[2]) - B * 0.02, B * 0.02);
      const zF = Math.sign(arc[k].z || 1) * Math.min(Math.abs(arc[k].z), zMax);
      const a = new THREE.Vector3(pd[0], pd[1], zF);
      const b = new THREE.Vector3(arc[k].x, topY - B * 0.008, arc[k].z);
      group.add(tag(beamAB(a, b, B * 0.022, B * 0.022, timber), 'fortress', 'Fortress post'));
    }
    /* the battery, radial: courser dead ahead at the nose, flanker pairs trained out
       on the bows — each piece laid along the local radius, its muzzle in a port */
    const portMat = new THREE.MeshStandardMaterial({ color: 0x17120c, roughness: 0.95 });
    const nB = Math.max(1, S.bowGuns | 0);
    const nRank = Math.max(1, (nB - 1) / 2);
    const angs = [0];
    for (let rk = 1; rk <= (nB - 1) / 2; rk++) { const a0 = rk * 0.84 / nRank; angs.push(a0, -a0); }
    const rimAt = a0 => new THREE.Vector3(
      (F.to - (F.to - F.from) * Math.cos(a0) - 0.5) * L, topY, wF * Math.sin(a0));
    let big = true;
    for (const a0 of angs) {
      const rim = rimAt(a0);
      const dir = rim.clone().sub(cen).setY(0).normalize();
      const len = big ? B * 0.65 : B * 0.42, r = big ? B * 0.028 : B * 0.017;
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 14), mats.iron);
      bar.rotation.z = Math.PI / 2;                    // +Y to −X: muzzle toward the rim
      g.add(bar);
      const carr = new THREE.Mesh(new THREE.BoxGeometry(len * 0.48, r * 2.4, r * 3.2), timber);
      carr.position.set(len * 0.18, -r * 2.0, 0);
      g.add(carr);
      g.position.copy(cen).addScaledVector(dir, cen.distanceTo(rim) - len * 0.45)
        .setY(fsY + r * 3.0);
      g.rotation.y = Math.atan2(dir.z, -dir.x);
      g.userData.gun = { style: 'fortress', tip: [-len * 0.5, 0, 0] };
      group.add(tag(g, 'gun', big ? 'Courser' : 'Flanking piece', big
        ? 'The centreline heavy gun of the bow battery, firing dead ahead through the '
          + 'fortress parapet. At Lepanto this fire, opened as the Ottoman centre rowed '
          + 'down on the anchored galleasses, was the first sustained heavy bombardment '
          + 'a galley fleet had ever taken from shipboard.'
        : 'A flanker on the round fortress, trained out on the bow. The curve is the '
          + 'point: a galley cannot row past on either side without crossing its fire.'));
      /* the port: a dark plate straddling the parapet where the muzzle crosses it */
      const d1 = 0.07;
      const pa = rimAt(a0 - d1).setY(fsY + pH * 0.42);
      const pb = rimAt(a0 + d1).setY(fsY + pH * 0.42);
      group.add(tag(beamAB(pa, pb, pH * 0.52, B * 0.024, portMat), 'gun', 'Gun port',
        'The opening in the parapet the piece fires through.'));
      big = false;
    }
  }

  /* ── THE CHASERS AFT ───────────────────────────────────────────────────────────────
     The record's own Guns row carries them: pieces at the after end of the fighting
     deck, firing astern — the answer to being overtaken by anything her oars cannot
     outrun. They stand either side of the centreline at the gun deck's aft edge,
     muzzles over the poop and its tent (the ridge tops out below the fighting deck's
     plane, measured before this was built). Record-driven: sternGuns, a COUNT — the
     record's sternGunsProvenance carries the bound the unnumbered plural supports. */
  if (S.sternGuns && S.gunDeck) {
    const GD = S.gunDeck;
    const chY = deckY + GD.height + B * 0.007;
    const len = B * 0.42, r = B * 0.017;
    const n = Math.max(1, S.sternGuns | 0);
    for (let j = 0; j < n; j++) {
      const side = j % 2 ? -1 : 1, rank = Math.floor(j / 2);
      const z = side * (B * 0.12 + rank * B * 0.11);
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len, 12), mats.iron);
      bar.rotation.z = -Math.PI / 2;                   // +Y to +X: muzzle astern
      g.add(bar);
      const carr = new THREE.Mesh(new THREE.BoxGeometry(len * 0.48, r * 2.4, r * 3.2), timber);
      carr.position.set(-len * 0.18, -r * 2.0, 0);
      g.add(carr);
      g.position.set((GD.to - 0.5) * L - len * 0.20, chY + r * 3.0, z);
      g.userData.gun = { style: 'chaser', tip: [len * 0.5, 0, 0] };
      group.add(tag(g, 'gun', 'Stern chaser',
        'A chaser at the after end of the fighting deck, laid astern over the poop '
        + 'tent. The card says "chasers aft" and gives no number; two are drawn, the '
        + 'least the plural supports.'));
    }
  }

  /* ── THE TENT OVER THE POOP ────────────────────────────────────────────────────────
     A ridge of canvas on a pole, feet on the deck edge at every station — it follows the
     sheer and the narrowing quarter, so it cannot stand off the hull. */
  if (S.sternCanopy) {
    const C = S.sternCanopy, N = 10;
    const ridgeH = B * 0.20;
    const pos = [], idx = [];
    const ridge = [];
    for (let k = 0; k <= N; k++) {
      const u = C.from + (C.to - C.from) * k / N;
      const pd = surfacePoint(S, H, u, 1.0);
      const zE = Math.abs(pd[2]) - B * 0.006;
      const yR = pd[1] + ridgeH;
      ridge.push(new THREE.Vector3(pd[0], yR, 0));
      pos.push(pd[0], pd[1], zE, pd[0], yR, 0, pd[0], pd[1], -zE);
    }
    for (let k = 0; k < N; k++) {
      const a = k * 3, b = a + 3;
      idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cg.setIndex(idx); cg.computeVertexNormals();
    group.add(tag(new THREE.Mesh(cg, mats.canvas), 'canopy'));
    group.add(tag(beamAB(ridge[0], ridge[N], B * 0.016, B * 0.016, timber),
                  'canopy', 'Ridgepole'));
    for (const k of [0, N]) {
      const u = C.from + (C.to - C.from) * k / N;
      const pd = surfacePoint(S, H, u, 1.0);
      const foot = new THREE.Vector3(pd[0], pd[1], 0);
      group.add(tag(beamAB(foot, ridge[k], B * 0.014, B * 0.014, timber),
                    'canopy', 'Tent post'));
    }
  }
}


/* ── PADDLE WHEELS ─────────────────────────────────────────────────────────────────────
 * Great Eastern's are 17 m across — taller than a house, one either side, and the single most
 * conspicuous thing about her. She also carried a 7.3 m screw, which is why she is the odd ship
 * she is: paddles are efficient in smooth water and useless when a roll lifts one clear, a screw
 * works in any sea but was still unproven at that size, so Brunel fitted BOTH and let them share.
 * The wheel is a rim on radial arms with flat floats between — and the floats are what does the
 * work, which is why they are set square to the rim and not feathered on a ship this early.
 */
/* ── FLOOR STOWAGE: AN OPEN HULL SHOWS HER GEAR ────────────────────────────────────────
 * The two undecked hulls (deckLaid: false — the dugout and the voyaging canoe) carried
 * bare floors from the day they were hollowed: a hull with no deck hides nothing, what she
 * carries lies on the bottom in plain sight, and an empty hollow reads as a model rather
 * than a working boat. What is drawn is what each record itself attests. The dugout's own
 * steering row is "the paddle itself — nothing is hung on the hull" and her one measured
 * figure is a paddled crossing (Kaifu's Sugime, 2019); an open hull on a 70–90 km leg
 * bails or founders. The canoe's rows say "a long paddle, not a rudder" and "lashed-lug
 * planking, no metal at all" — a lashed ship carries her cordage as stores. The paddle IN
 * USE is crew gear and no crew is drawn (round 121); what is drawn here is the spare,
 * stowed. Forms are DERIVED and every part card names its source: the oldest recovered
 * paddles (Star Carr ~9000 BC, Tybrind Vig ~4400 BC) and the one-piece scoop and sennit
 * line of Haddon & Hornell, Canoes of Oceania.
 * Placement is asked of the carved floor's own geometry — the same wall/bottom sidings as
 * buildOpenHullGeometry — and every piece rests on the HIGHEST floor its length crosses
 * and is clamped inside the floor's half-breadth over its whole span, so nothing can
 * stand outside the walls or sink through the rising floor on any open hull. */
function buildFloorStowage(S, group, mats) {
  const H = hullSurface(S);
  const tw = S.build === 'dugout' ? Math.max(0.03, S.beam * 0.045)
                                  : Math.max(0.02, S.beam * 0.020);
  const tb = S.build === 'dugout' ? tw * 1.8 : Math.max(0.04, S.draught * 0.06);
  /* the carved run, by the cavity's own eligibility test */
  const eligible = u => u > 0.05 && u < 0.95
    && S.draught * H.keel(u) > tb * 1.4
    && surfacePoint(S, H, u, 1)[2] - tw > 0.01;
  let uLo = -1, uHi = -1;
  for (let u = 0.05; u <= 0.951; u += 0.005)
    if (eligible(u)) { if (uLo < 0) uLo = u; uHi = u; }
  if (uLo < 0 || uHi - uLo < 0.2) return;          // nothing carved, nowhere to stow
  const vF = u => 0.62 * tb / (S.draught * H.keel(u));
  const floorY = u => surfacePoint(S, H, u, vF(u))[1];
  const floorHalf = u => Math.max(0, surfacePoint(S, H, u, vF(u))[2] - tw);
  const over = (u0, u1, f, pick) => {
    let r = pick > 0 ? -1e9 : 1e9;
    for (let i = 0; i <= 8; i++) {
      const val = f(Math.min(uHi, Math.max(uLo, u0 + (u1 - u0) * i / 8)));
      r = pick > 0 ? Math.max(r, val) : Math.min(r, val);
    }
    return r;
  };
  const xAt = u => (u - 0.5) * S.lwl;
  const pale = mats.woodPale;
  const scoopMat = new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: 0.8,
                                                    side: THREE.DoubleSide });
  const fibre = new THREE.MeshStandardMaterial({ color: 0x8f7442, roughness: 0.95 });

  /* a one-piece paddle: shaft and a leaf blade, lying fore-and-aft */
  const paddle = (len, bladeL, bladeW, name, what) => {
    const g = new THREE.Group();
    const shaftR = Math.max(0.016, len * 0.012);
    const shaftL = len - bladeL * 0.7;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(shaftR, shaftR * 0.85, shaftL, 8), pale);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -len / 2 + shaftL / 2;
    g.add(shaft);
    const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), pale);
    blade.scale.set(bladeL / 2, shaftR * 0.85, bladeW / 2);
    blade.position.x = len / 2 - bladeL / 2;
    g.add(blade);
    g.userData.restR = shaftR;
    return tag(g, 'stowage', name, what);
  };
  /* the one-piece scoop: an open half-shell with a grip at the after end */
  const bailer = (r, name, what) => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      scoopMat);
    bowl.scale.set(1.5, 0.55, 1);
    g.add(bowl);
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 1.1, 8), pale);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(r * 1.85, -r * 0.08, 0);
    g.add(grip);
    g.userData.restR = r * 0.55;
    return tag(g, 'stowage', name, what);
  };
  /* a coiled line: two turns, the lower full, the upper settled into it */
  const coil = (R, rt, name, what) => {
    const g = new THREE.Group();
    for (const [rr, tt, dy] of [[R, rt, 0], [R * 0.82, rt * 0.9, rt * 0.9]]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(rr, tt, 8, 24), fibre);
      t.rotation.x = Math.PI / 2;
      t.position.y = dy;
      g.add(t);
    }
    g.userData.restR = rt;
    return tag(g, 'stowage', name, what);
  };
  /* rest an item on the floor: highest floor over its span, walls respected */
  const place = (item, uC, halfLenM, halfWidM, zWant, rotY) => {
    const u0 = uC - halfLenM / S.lwl, u1 = uC + halfLenM / S.lwl;
    const y = over(u0, u1, floorY, +1) + item.userData.restR + 0.004;
    const zRoom = over(u0, u1, floorHalf, -1) - halfWidM - 0.01;
    const z = Math.sign(zWant || 1) * Math.min(Math.abs(zWant), Math.max(0, zRoom));
    item.position.set(xAt(uC), y, z);
    if (rotY) item.rotation.y = rotY;
    group.add(item);
  };

  if (S.build === 'dugout') {
    const paddleWhat = 'Paddling is the record’s own steering row — "the paddle '
      + 'itself — nothing is hung on the hull" — and her one measured figure is a '
      + 'paddled crossing (Kaifu’s Sugime, Taiwan→Yonaguni, 2019). The paddle in '
      + 'use is crew gear and no crew is drawn; this is the spare, stowed on the floor. No '
      + 'Pleistocene paddle survives: the one-piece shaft and narrow leaf blade are DERIVED '
      + 'from the oldest recovered paddles (Star Carr, ~9000 BC; Tybrind Vig, ~4400 BC).';
    place(paddle(1.5, 0.5, 0.15, 'Spare paddle — stowed', paddleWhat),
          0.42, 0.75, 0.085, S.beam * 0.14, Math.PI);
    place(paddle(1.5, 0.5, 0.15, 'Spare paddle — stowed', paddleWhat),
          0.58, 0.75, 0.085, -S.beam * 0.14, 0);
    place(bailer(0.09, 'Bailer — carved scoop',
      'An open hull in a seaway ships water, and a 70–90 km open-water leg has '
      + 'nowhere to empty her: bailing is as old as the open boat. No Pleistocene bailer '
      + 'survives; the one-piece scoop is DERIVED from the form recorded across the '
      + 'Pacific in Haddon & Hornell, Canoes of Oceania (1936–38).'),
          0.34, 0.14, 0.10, -S.beam * 0.06, 0);
  } else if (S.doubleHull) {
    /* the lashed double canoe. A NEW open hull gets no gear from this branch: its gear
       must be decided from its own record, and the audit's bare-floor arm will demand
       exactly that decision rather than letting it inherit another ship's stores. */
    place(paddle(3.4, 1.0, 0.28, 'Steering paddle — stowed',
      'Her own card row: steering is "a long paddle, not a rudder" (Finney 1977; '
      + 'Polynesian Voyaging Society logs). In use the sweep is handled over the quarter '
      + 'by the steersman — nothing is mounted on the hull, and no crew is drawn. The '
      + 'spare stows in the bottom of the hull.'),
          0.50, 1.7, 0.15, S.beam * 0.10, 0);
    place(bailer(0.11, 'Bailer — carved scoop',
      'Both hulls are open and are bailed by hand under way — Polynesian Voyaging '
      + 'Society crews still stand bailing watches. The one-piece scoop with its spade '
      + 'grip is the recorded Oceanic form (Haddon & Hornell, Canoes of Oceania, '
      + '1936–38).'),
          0.66, 0.17, 0.12, -S.beam * 0.08, 0);
    const cR = Math.min(0.16, Math.max(0.06, floorHalf(0.74) * 0.7));
    place(coil(cR, Math.min(0.03, cR * 0.35), 'Lashing line — coiled spare',
      'Her construction row: "lashed-lug planking, no metal at all". A lashed ship is '
      + 'held together by cordage and carries it as stores; the traditional line is '
      + 'sennit — braided coconut fibre (Haddon & Hornell, Canoes of Oceania). The '
      + 'coil is the spare.'),
          0.74, cR + 0.03, cR + 0.03, S.beam * 0.05, 0);
  }
}

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
  /* ── THE FLOAT IS THE RECORDED BOARD (round 169) ─────────────────────────────────────
     The r168 probe sweep ranked these meshes the largest boxy class after the containers,
     and the judgment came back from the record: a float IS a flat board — "the propelling
     boards fixed on the radiating arms" (Young's Nautical Dictionary, 1863) — so the box
     stays. What was wrong was every number on it: 24 floats of 7.6 × 2.0 m, both
     dimensions roughly double their record, half a metre thick, on 0.5 m square arms of
     which half exactly coincided (a full-diameter spoke at angle a IS the spoke at a+π).
     Lindsay's specification table (History of Merchant Shipping IV, 1876) gives each
     wheel 30 floats, 13 ft by 3 ft; the wheel is drawn from those numbers and the housing
     from her recorded breadths — 118 ft over the wheels, 120 ft over the boxes — so the
     appearance falls out of the record. Board thickness is unattested; 0.10 m is a class
     default. */
  const NF = S.paddleFloats || 24;
  const fLen = S.paddleFloatLenM || B * 0.30;          // along the axle
  const fDeep = S.paddleFloatDeepM || D * 0.115;       // radial — the board's width
  const fThick = 0.10;
  const R = D / 2;
  /* floats tip out at half the recorded breadth over the wheels; the drum face clears
     them by a hand's breadth; the face ornament stops at the breadth over the boxes */
  const owHalf = S.paddleOverWheelsM ? S.paddleOverWheelsM / 2 : p[2] + B * 0.16 + fLen / 2;
  const obHalf = S.paddleOverBoxesM ? S.paddleOverBoxesM / 2 : owHalf + B * 0.02;
  const zc = owHalf - fLen / 2;                        // the wheel's own plane
  for (const sgn of [-1, 1]) {
    const g = new THREE.Group();
    /* one full-diameter spoke serves the float at each end, so an even count wants NF/2
       arms — the old 24 repeated themselves after twelve, and half the iron in the wheel
       was drawn twice in the same place */
    for (let i = 0; i < NF / 2; i++) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(D * 0.018, R * 2, Math.max(0.14, D * 0.009)), iron);
      arm.rotation.z = i / NF * Math.PI * 2;
      arm.name = 'Wheel arm';
      g.add(arm);
    }
    for (let i = 0; i < NF; i++) {                     // the boards that do the work
      const a = i / NF * Math.PI * 2;
      const float = new THREE.Mesh(
        new THREE.BoxGeometry(fThick, fDeep, fLen), mats.woodDark || mats.woodPale);
      const r0 = R - fDeep / 2;                        // outer edge ON the rim circle
      float.position.set(Math.cos(a + Math.PI / 2) * r0,
                         Math.sin(a + Math.PI / 2) * r0, 0);
      float.rotation.z = a;
      float.name = 'Float';
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
    g.position.set(p[0], axleY, sgn * zc);
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
    /* the housing derives from the record too: its inner face meets the ship's side, its
       drum face stands a hand's breadth clear of the float tips, and its face ornament
       stops at half the recorded breadth over the boxes */
    const zo = owHalf + 0.10, zi = p[2];
    const bw = zo - zi;                               // housing width athwartships
    const zbc = (zo + zi) / 2;
    const boxRx = D * 0.60, boxRy = D * 0.60 * 0.86;  // the crown, slightly flattened
    const h0 = Math.min(Math.max(H.sheer(u) - axleY, boxRy * 0.12), boxRy * 0.55);
    const th0 = Math.asin(h0 / boxRy);                // where the arc springs from the deck
    const xc = boxRx * Math.cos(th0);                 // half the chord
    const spon = new THREE.Mesh(
      new THREE.BoxGeometry(xc * 2.16, B * 0.055, bw * 1.06), iron);
    spon.position.set(p[0], axleY + h0 - B * 0.0275, sgn * zbc);
    group.add(tag(spon, 'paddle', 'Sponson',
      'The platform bracketed out from the hull side at deck level that carries the wheel\'s shaft bearings and the box above. Everything over it is housing; everything under it is wheel.'));

    /* one group per box, mirrored to port BY ROTATION — the same trap as the winding: a
       negative scale re-hands every triangle it touches, and the port box would face inward
       again. A half-turn about Y moves the geometry without re-handing it. */
    const bg = new THREE.Group();
    bg.position.set(p[0], axleY, sgn * zbc);
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
      const rT = Math.max(0.12, obHalf - zo);         // the ornament stops AT the record
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(D * 0.020, t * 0.92, rT), mats.woodPale || iron);
      rib.position.set(Math.cos(b) * t * 0.5, h0 + Math.sin(b) * t * 0.5, bw / 2 + rT / 2);
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
      /* ── THE FREEBOARD CARRIES THE ROWS THE PLATE SHOWS, WHERE IT SHOWS THEM ────────
         hullRows is the record's own read of the hull-side glazing: window and porthole
         GROUPS with real u-spans, heights over the waterline in metres, real pitches —
         not a count marching the whole length. Heights map into the loft's freeboard band
         (v from uWaterline at the load line to 1.0 at the deck edge), so the rows parallel
         the sheer. Sixteen group slots; a hull without the record uploads zeros and the
         shader's loop breaks before reading one. */
      ...(() => {
        const HR = (S.hullRows && S.hullRows.groups) ? S.hullRows.groups.slice(0, 16) : [];
        const fb = S.freeboard || 6;
        const gA = [], gB = [];
        for (let gi = 0; gi < 16; gi++) {
          const gr = HR[gi];
          if (gr) {
            /* 0.62 is uWaterline: the freeboard band is v 0.62..1.0 over fb metres */
            gA.push(new THREE.Vector4(gr.u[0], gr.u[1],
              0.62 + 0.38 * (gr.hM[0] / fb), 0.62 + 0.38 * (gr.hM[1] / fb)));
            gB.push(new THREE.Vector4(gr.pitchM || 0, gr.lightWM || 0,
              gr.kind === 'porthole' ? 0 : (gr.kind === 'band' ? 2 : 1), 0));
          } else {
            gA.push(new THREE.Vector4(0, 0, 0, 0));
            gB.push(new THREE.Vector4(0, 0, 0, 0));
          }
        }
        return {
          uHGrpN: { value: HR.length },
          uHGrpA: { value: gA },
          uHGrpB: { value: gB },
          uHullDims: { value: new THREE.Vector2(S.loa || S.lwl, fb) },
        };
      })(),
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
      /* a yacht's shell is FAIRED — filled, long-boarded and gloss-coated until no plate
         shows. That finish is the record's own fact about the builder, not a default. */
      uFaired: { value: S.faired ? 1 : 0 },
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
  /* ⚠ A ONE-PIECE HULL HAS NO KEEL AND NO FRAMES (round 122). Her own tradition card has
     said it all along — "there is no keel, no frame, no plank and no seam, because there
     is no JOINT" — and while the hull was capped the contradiction hid: a keel timber
     under the log, thirty ribs inside it, none visible. Opening the hull (below) would
     have put the ribs of a ship that has none in plain sight. Same gate class as the
     posts and wales (r121). */
  const ONE_PIECE = S.build === 'dugout';
  if (!ONE_PIECE) group.add(tag(new THREE.Mesh(buildKeelGeometry(S), timber), 'keel'));
  if (FINE) {
    /* every frame its own object, so one rib can be picked out of the skeleton */
    if (!ONE_PIECE)
      for (let f = 0; f < 30; f++)
        group.add(tag(new THREE.Mesh(buildFramesGeometry(S, 1, 0.055 + f / 29 * 0.89), timber),
                      'frames', 'Frame ' + (f + 1) + ' of 30'));
    /* ⚠ A BULKHEAD-BUILT HULL HAS NO STEM AND NO STERNPOST — the outermost bulkheads are
       the ends, planked across. Giving a junk the European backbone contradicted the stage
       card standing right under her: "bulkheads, then planking". */
    if (S.build === 'bulkhead') {
      buildJunkEnds(S, group);
    } else if (S.build !== 'dugout') {
      /* ⚠ A ONE-PIECE HULL RAISES NO POSTS (round 121). "Single trunk, fire and adze" —
         there is nothing to scarf a stem to; the log's own ends are the ends. The same
         gate class as deckLaid and the hold furniture. */
      group.add(tag(new THREE.Mesh(buildStemGeometry(S, false), timber), 'stempost', 'Stem'));
      group.add(tag(new THREE.Mesh(buildStemGeometry(S, true), timber), 'stempost', 'Sternpost'));
    }
    /* wales are a TIMBER remedy for hogging — thickened strakes acting as girders. A steel
       hull's own plating is the girder, and putting wales on one is like bracing a bridge with
       rope. And a one-piece hull has no strake to thicken: the trunk is its own girder. */
    if (S.build !== 'iron' && S.build !== 'steel' && S.build !== 'dugout') {
      const waleMat = new THREE.MeshStandardMaterial({ color: 0x3d2f1f, roughness: 0.9 });
      group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.655, 0.030), waleMat), 'wale'));
      group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026), waleMat), 'wale'));
    }
    /* steering per the record (round 121): a paddled hull mounts nothing, a quarter-
       steered hull ships a pair, everything else keeps the axial rudder its kind draws */
    const steer = steeringOf(S);
    if (steer === 'quarter') {
      for (const sgn of [-1, 1])
        group.add(tag(new THREE.Mesh(buildQuarterRudderGeometry(S, sgn), timber),
                      'quarterRudder',
                      sgn < 0 ? 'Port quarter rudder' : 'Starboard quarter rudder'));
    } else if (steer !== 'paddle') {
      /* ⚠ THE RUDDER IS PART OF THE UNDERWATER BODY (round 153). A steel ship's foil
         works below her load line and is docked and painted with the shell: it wears
         the ship's own antifouling — the same `bottom` the hull shader lays on — not
         the fittings' topside steel grey. Timber rudders stay in the build's timber. */
      const rudderMat = steer === 'steel'
        ? new THREE.MeshStandardMaterial({ color: bottom, roughness: 0.78, metalness: 0.12 })
        : timber;
      group.add(tag(new THREE.Mesh(buildRudderGeometry(S), rudderMat), 'rudder'));
    }
    /* channels: a shelf outboard of each mast, on both sides, which is what the shrouds set
       up to. Positioned from the mast stations, so they cannot land in the wrong place. */
    const HS = hullSurface(S);
    (S.masts || []).forEach(mk => {
      /* a mast that declares NO shrouds carries no channels — the trireme's artemon, the
         corbita's, the wasen mast held by running stays: chainplates and deadeyes are
         northern-European standing rigging, and a channel without shrouds is a bare shelf */
      if (mk.rig !== 'square' || mk.shrouds === 0) return;
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
  } else if (!ONE_PIECE) {
    group.add(tag(new THREE.Mesh(buildFramesGeometry(S), timber), 'frames'));
  }

  const hull = new THREE.Mesh(
    FINE ? buildHullGeometry(S, 420, 72) : buildHullGeometry(S), hullMat);
  group.add(tag(hull, 'planking'));

  /* the weather deck keys off what the DECK was, not what the hull was: liners and
     battleships stayed planked to the end — Titanic's pine, Yamato's hinoki — but a flight
     deck and a container ship's weather deck are bare steel. ⚠ And the covering is a fact
     of the SHIP, not of two cargo types: the round-35 winding fix lit the decks properly
     for the first time and exposed a planked timber deck on the 2026 composite USV, which
     the heuristic below had been guessing at invisibly. The record states the covering
     itself now (`hull.deck`, round 106); `deckSteel`/`deckLaid` are the labelled fallback.
     ── AND THE DECK TAKES THE SHELL'S LIGHT. It was the last MeshStandardMaterial surface
     in the hull's envelope — scene-lit through ACES beside a shell and terrace walls lit
     by HULL_FRAG's own sun, the same two-lighting-models fault round 102 measured at
     216 vs 89 sRGB on Azzam's parapet. DECK_FRAG is the shell's closing recipe on a
     metric covering term, sharing the hull material's OWN uSun/uCam uniform objects. */
  /* ⚠ THE r106 STAGED GATE IS GONE (round 107): every weather deck draws in DECK_FRAG,
     recorded or fallback. Round 106 lit only the recorded covering (azzam) and held the
     other 32 ships byte-identical, because the fleet-wide relight moves ~40 baselines
     and classifying forty diffs deserves a round's whole ratchet budget — round 107
     spent it. The covering is still deckCovering()'s one judgement; the steel grit and
     bare-timber noise took the plank terms' sub-pixel LOD fade before the fleet took
     them (r106's moiré rule — those two modes had never rendered). */
  const cover = deckCovering(S);
  const deckShader = col => new THREE.ShaderMaterial({
    vertexShader: SHADERS['DECK_VERT.vert'], fragmentShader: SHADERS['DECK_FRAG.frag'],
    side: THREE.DoubleSide,
    uniforms: { uSun: hullMat.uniforms.uSun, uCam: hullMat.uniforms.uCam,
                uCol:    { value: new THREE.Color(col) },
                uMode:   { value: cover.mode },
                uPlankW: { value: cover.plankW || 1 },
                uButtL:  { value: cover.buttL || 1 } } });
  const deckMat = deckShader(cover.col);
  if (cover.mode === 0) {
    /* ── AN UNDECKED HULL IS OPEN (round 122) ─────────────────────────────────────────
       deckLaid: false used to buy a "bare timber" CAP across the sheer — a deck by any
       other name, on the two hulls whose records refuse one. The cap is replaced by the
       carved interior: rim, inner walls, floor (buildOpenHullGeometry). The floor sits
       below the load waterline, as a floating hull's floor does, so a depth-only PLUG
       spans the old cap surface: it draws no colour, writes depth after the interior
       (renderOrder 1) and before the sea (renderOrder 2 in each view), and that is the
       whole reason the drawn sea cannot render inside the boat. */
    const tw = S.build === 'dugout' ? Math.max(0.03, S.beam * 0.045)
                                    : Math.max(0.02, S.beam * 0.020);
    const tb = S.build === 'dugout' ? tw * 1.8 : Math.max(0.04, S.draught * 0.06);
    const nm = S.build === 'dugout' ? 'Open hull — the carved hollow'
                                    : 'Open hull — no deck laid';
    const what = 'The record lays no deck (deckLaid: false), so there is no cap: this is '
      + 'the inner surface of the hull itself, open to the sky, running down past the '
      + 'waterline to the floor. '
      + (S.build === 'dugout'
         ? 'Burned and adzed out of the one trunk, so the surface is charred and '
           + 'tool-marked. '
         : 'The inside of the planked shell, unpainted and unbleached. ')
      + `Wall ${Math.round(tw * 100)} cm and bottom ${Math.round(tb * 100)} cm are `
      + 'DERIVED class defaults — no source attests the sidings, and the rim shows the '
      + 'wall figure as its visible thickness.';
    /* two pieces, two surfaces of the real thing: the fire chars the bowl, the adze
       dresses the gunwale — and the rim doubles as the pale line the hull has always
       read by. No capping RAIL goes on an open hull (buildFittings): the rim IS the
       gunwale, and a fitted capping is assembly timber this record refuses. */
    group.add(tag(new THREE.Mesh(buildOpenHullGeometry(S, 96, 'cavity'),
      deckShader(S.build === 'dugout' ? 0x54422d : 0x77664a)), 'deck', nm, what));
    group.add(tag(new THREE.Mesh(buildOpenHullGeometry(S, 96, 'rim'),
      deckShader(S.build === 'dugout' ? 0x97835d : 0x9c8a63)), 'deck',
      S.build === 'dugout' ? 'Gunwale rim — dressed timber' : 'Gunwale — top strake edge',
      'The top face of the hull wall itself, ' + Math.round(tw * 100) + ' cm across — '
      + 'the wall siding, seen end-on. Dressed, not charred: hollowing burns the bowl, '
      + 'the adze finishes the edge. There is no fitted capping rail; on an open hull '
      + 'the rim is the gunwale.'));
    const plug = new THREE.Mesh(buildDeckGeometry(S),
      new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
    plug.renderOrder = 1;
    group.add(tag(plug, 'deck', 'Waterplane mask',
      'Draws nothing. It writes only depth across the open top so the sea surface cannot '
      + 'render inside the open hull; the interior below the waterline shows because it '
      + 'is drawn first.'));
    /* the log's top face, shown only by the Shipwright's pre-hollowing stage — the
       hollowing REMOVES it, which is the one subtractive step in the whole fleet */
    if (S.build === 'dugout') {
      const top = new THREE.Mesh(buildDeckGeometry(S), deckShader(0x8a7a5c));
      top.visible = false;
      group.add(tag(top, 'logtop'));
    }
  } else {
    group.add(tag(new THREE.Mesh(buildDeckGeometry(S), deckMat), 'deck', cover.name, cover.what));
  }

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
  if (FINE && !S.flightDeck && !S.turrets) buildSuperstructure(S, group, hullMat);
  if (FINE && S.cluster) buildCluster(S, group);
  if (FINE && !S.flightDeck && !S.turrets) buildRaisedEnds(S, group);
  if (FINE && S.sternSteps) buildSternTerraces(S, group, hullMat);
  if (FINE) buildJunkCastle(S, group);
  if (FINE && S.turrets) buildCitadel(S, group, mats);
  if (FINE) buildSternAviation(S, group);
  if (FINE) buildDeckHatches(S, group);
  if (FINE) buildHead(S, group, mats);
  if (FINE) buildAnchor(S, group, mats);
  if (FINE && S.netDefence) buildNetDefence(S, group);
  if (FINE) buildOars(S, group, mats.woodPale);
  if (FINE) buildGalleyWorks(S, group, mats);
  if (FINE) buildPaddles(S, group, mats);
  /* an open hull shows her gear — the floor is in sight, and bare it reads as a model */
  if (FINE && cover.mode === 0) buildFloorStowage(S, group, mats);
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
  if (S.livery) buildLivery(S, group);                  /* and her name reads at map scale */
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
    const hullKeys = ['keel', 'frames', 'planking', 'deck', 'stempost', 'wale', 'rudder',
                      'stowage'];   /* each hull carries her own gear (round 127) */
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
