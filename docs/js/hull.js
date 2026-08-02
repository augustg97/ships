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
        const inb = 0.965;                          // frames sit just inside the planking
        for (let e = -1; e <= 1; e += 2)
          pos.push(p[0] + e * half, p[1], sgn * p[2] * inb);
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
const HULL_VERT = `
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){ vUv=uv; vN=normalize(normalMatrix*normal);
  vec4 wp = modelMatrix*vec4(position,1.0); vP=wp.xyz;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const HULL_FRAG = `
precision highp float;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
uniform vec3 uSun, uCam;
uniform float uStrakes;      // number of planking strakes keel to sheer
uniform float uCopper;       // 0 = none, 1 = sheathed
uniform float uCopperAge;    // 0 = new and bright, 1 = fully verdigris
uniform float uWaterline;    // v coordinate of the load waterline
uniform float uChequer;      // 0 = plain, 1 = Nelson chequer with gunport bands
uniform float uGunDecks;
uniform vec3  uTopside;      // the paint above the waterline
uniform float uIron;         // 0 = wood, 1 = iron/steel plate
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }

void main(){
  float u = vUv.x, v = vUv.y;
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vP);
  vec3 L = normalize(uSun);

  vec3 col;
  bool underwater = v < uWaterline;

  if (underwater && uCopper > 0.5) {
    /* ── COPPER SHEATHING ────────────────────────────────────────────────
       The Royal Navy plate is 4 ft × 14 in, and the 14 inches is not arbitrary: hull planks
       were 12 in wide, so a 14 in sheet gives a 1 in overlap top and bottom AND puts the
       copper seam deliberately midway between two plank seams. The whole geometry falls out
       of one sentence in the record.

       ⚠ IT DOES NOT GO GREEN. Verdigris is what copper does in AIR — roofs, statues. On the
       wetted hull the antifouling mechanism *is* that the corrosion film keeps dissolving
       away; a stable green patina cannot build up, because if it did the copper would stop
       working. So: bright salmon when new, dulling within weeks, then a dark brown immersed
       film that is continuously shedding. The green belongs only at the boot-top, which is
       wetted and dried and sees the air. The first version of this shader painted the whole
       underwater body verdigris and was wrong for a reason worth knowing. */
    float courses = uStrakes * 1.6;                 // 14 in courses against 12 in planks
    float cv = v * courses;
    float ch = u * 46.0 + floor(cv) * 0.5;          // courses are staggered, like brickwork
    float seamV = smoothstep(0.03, 0.10, abs(fract(cv) - 0.5) * 2.0);
    float seamH = smoothstep(0.05, 0.14, abs(fract(ch) - 0.5) * 2.0);
    /* tacks: 1.25–1.5 in along the overlaps, ~4 in across the field of the sheet */
    float tack = smoothstep(0.40, 0.26,
                   length(fract(vec2(ch * 4.0, cv * 3.0)) - 0.5)) * seamV;
    vec3 bright = vec3(0.76, 0.42, 0.25);           // newly laid
    vec3 dull   = vec3(0.42, 0.26, 0.17);           // weeks
    vec3 dark   = vec3(0.20, 0.15, 0.12);           // the shedding immersed film
    vec3 c = mix(bright, dull, clamp(uCopperAge * 2.2, 0.0, 1.0));
    c = mix(c, dark, clamp((uCopperAge - 0.45) * 1.8, 0.0, 1.0));
    c *= 0.80 + 0.20 * noise(vec2(u * 220.0, v * 90.0));
    c *= mix(0.62, 1.0, seamV * seamH);              // the plate edges catch shadow
    c += tack * 0.06;
    /* the sheathing was carried to about a foot above the load waterline and finished with a
       batten or a canvas roll — and THAT band, wetted and dried, is where green appears */
    c = mix(c, vec3(0.28, 0.44, 0.34), smoothstep(0.585, 0.615, v) * 0.55);
    col = c;
  } else if (underwater) {
    /* the unsheathed underwater body: "white stuff" — tallow, rosin and sulphur — over pitch */
    col = vec3(0.42, 0.40, 0.35) * (0.80 + 0.22 * noise(vec2(u * 160.0, v * 70.0)));
    col = mix(col, vec3(0.20, 0.24, 0.18),
              smoothstep(0.35, 0.9, noise(vec2(u * 34.0, v * 15.0))) * 0.55);  // weed
  } else if (uIron > 0.5) {
    /* riveted iron plate: strakes are wider, seams are proud, and the rivets show */
    float pv = v * uStrakes * 0.6, ph = u * 30.0;
    float seam = smoothstep(0.04, 0.12, abs(fract(pv) - 0.5) * 2.0)
               * smoothstep(0.03, 0.10, abs(fract(ph) - 0.5) * 2.0);
    float rivet = smoothstep(0.42, 0.30, length(fract(vec2(ph, pv) * vec2(6.0, 2.0)) - 0.5));
    col = uTopside * (0.86 + 0.16 * noise(vec2(u * 300.0, v * 120.0)));
    col *= mix(0.72, 1.0, seam);
    col += rivet * 0.05;
  } else {
    /* ── PLANKING ────────────────────────────────────────────────────────
       Carvel strakes running fore-and-aft, caulked with oakum and payed with pine tar. The
       planks NARROW toward the ends, which they must: the girth of a section falls away at
       the stem, so the same number of strakes has less to cover. */
    float taper = 0.55 + 0.45 * (1.0 - abs(2.0 * u - 1.0));
    float sv = v * uStrakes;
    float seam = smoothstep(0.02, 0.09, abs(fract(sv) - 0.5) * 2.0);
    float grain = noise(vec2(u * 420.0, floor(sv) * 31.7)) * 0.5
                + noise(vec2(u * 90.0, floor(sv) * 12.3)) * 0.5;
    col = uTopside * (0.84 + 0.30 * grain);
    col *= mix(0.52, 1.0, seam);                     // the caulked seam is a dark line

    /* ── THE "NELSON CHEQUER", as the paint actually was ────────────────
       ⚠ NOT yellow and black. The 2015 repaint of HMS Victory was preceded by the most
       extensive paint survey ever made of a historic ship — several hundred samples, in places
       through 72 layers, led by Michael Crick-Smith at Lincoln — and it found that at
       Trafalgar she was **pale yellow and DARK GREY**. The pigments were the ones the Navy
       issued free: lead white and ochre. The result is described as running "from a
       creamy-orange to almost salmon pink in certain lights", which is a long way from the
       lemon-yellow of every model kit.

       And the chequer is only a chequer when the ports are OPEN — cleared for action. With
       the lids closed the hull reads as plain stripes, because the lids were painted to match. */
    if (uChequer > 0.5) {
      float band = 0.0, port = 0.0;
      for (float d = 0.0; d < 4.0; d += 1.0) {
        if (d >= uGunDecks) break;
        float centre = uWaterline + 0.10 + d * 0.115;
        band = max(band, smoothstep(0.052, 0.030, abs(v - centre)));
        float px = fract(u * 26.0);
        port = max(port, smoothstep(0.030, 0.016, abs(v - centre))
                       * smoothstep(0.30, 0.22, abs(px - 0.5)));
      }
      vec3 ochre = vec3(0.780, 0.585, 0.395);        // creamy-orange, not lemon
      vec3 grey  = vec3(0.180, 0.178, 0.172);        // dark grey, not black
      col = mix(grey, ochre, band);
      col *= (0.84 + 0.30 * grain);
      col *= mix(0.52, 1.0, seam);
      col = mix(col, vec3(0.055, 0.052, 0.050), port);   // the open port is a hole
    }
    col *= taper * 0.25 + 0.75;
  }

  /* ── light. One sun, a broad sky term, and a bounce off the water so the underside of the
     hull is never black — which it never is, at sea. */
  float lam = max(dot(N, L), 0.0);
  float sky = 0.5 + 0.5 * N.y;
  float bounce = max(0.0, -N.y) * 0.30;
  vec3 lit = col * (0.24 * sky + 0.95 * lam) + col * bounce * vec3(0.34, 0.52, 0.62);

  /* wet sheen below the waterline, and a spec on the paint above it */
  vec3 Hv = normalize(L + V);
  float shin = underwater ? 46.0 : 22.0;
  float spec = pow(max(dot(N, Hv), 0.0), shin) * (underwater ? 0.55 : 0.16);
  lit += vec3(1.0, 0.97, 0.90) * spec * lam;

  /* the boot-top: a hard, wet line exactly at the load waterline */
  float wl = smoothstep(0.012, 0.0, abs(v - uWaterline));
  lit = mix(lit, lit * 0.45, wl * 0.75);

  gl_FragColor = vec4(pow(clamp(lit, 0.0, 1.6), vec3(0.4545)), 1.0);
}`;


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

  const woodDark = mats.spar, canvas = mats.canvas, rope = mats.rope;

  const cyl = (x, y0, y1, r0, r1, mat, tiltZ = 0) => {
    const h = y1 - y0;
    const g = new THREE.CylinderGeometry(r1, r0, h, 9, 1, true);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y0 + h / 2, 0);
    m.rotation.z = tiltZ;
    group.add(tag(m, 'mast'));
    return m;
  };

  const sails = [];
  const maxMastShare = S.masts.length ? Math.max(...S.masts.map(m => m.height)) : 1;

  S.masts.forEach(mk => {
    const u = mk.at;
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
    const lower = mk.height * steelMain;
    /* Steel 1794, "Proportional Lengths of Masts": main topmast = 3/5 of the main mast;
       topgallant = 1/2 of its topmast. Cross-checked against Fincham 1843, whose measured
       ships give topmast 1.05–1.22 x extreme breadth and topgallant 0.57–0.70 x breadth.
       ⚠ The first version used 0.62 and 0.42 — the topgallant was nearly half again too long,
       which is why the rig stood 72 m over a 57 m hull instead of about 62. */
    const top = lower * 0.60, tg = top * 0.50;
    let y = base;
    let prevYard = base + lower * 0.13;   // the courses' foot clears the deck by this
    const segs = mk.rig === 'lateen' ? []                       // built below, from the yard
               : mk.rig === 'crabclaw' ? [lower] : [lower, top, tg];
    const radii = [B * 0.030, B * 0.020, B * 0.013];

    segs.forEach((seg, si) => {
      if (mk.only && si >= mk.only) return;
      const m = cyl(x - Math.sin(rakeRad) * (y - base), y, y + seg,
                    radii[si], radii[si] * 0.7, woodDark, -rakeRad);
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
        const yy = y + seg * (si === 0 ? 0.60 : 0.88);
        /* A yard is not a cylinder: it is octagonal in the middle quarters and tapers to two
           fifths of its slings diameter at the arms. Murray 1754 gives the shipwrights' own
           sector divisions — 1.000, 0.964, 0.900, 0.700, 0.400 — and the last of those is why
           a yard reads as a yard rather than a pole. */
        const yg = new THREE.CylinderGeometry(B * 0.0035, B * 0.0035, yardLen, 8);
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
        ym.rotation.x = Math.PI / 2;
        ym.position.set(x + Math.sin(rakeRad) * (yy - base), yy, 0);
        group.add(tag(ym, 'yard'));
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
                            yardLen * 0.96, drop * 0.97, canvas, group, 'square'));
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
      const heel = [x - dir[0] * yardLen / 3, base];
      const peakPt = [heel[0] + dir[0] * yardLen, heel[1] + dir[1] * yardLen];

      /* the mast, drawn from the deck UP TO the sling — its height is the consequence, and it
         is SHORT, because a lateen takes its area from the spar rather than from height */
      const mh = sling[1] - base;
      const mm = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.020, B * 0.032, mh, 9), woodDark);
      mm.position.set(x, (base + sling[1]) / 2, 0);
      group.add(mm);

      const ylen = Math.hypot(peakPt[0] - heel[0], peakPt[1] - heel[1]);
      const ym = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.005, B * 0.011, ylen, 7), woodDark);
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
      const clew = [tack[0] + yardLen * 0.62, base + H.sheer(0.5) * 0.10];
      sails.push(makeTriSail(tack, peakPt, clew, group, 0.055));
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
      const sparLen = L * 0.98;
      const tack = [x - L * 0.22, base];
      const tipY = [tack[0] + Math.cos(1.19) * sparLen, tack[1] + Math.sin(1.19) * sparLen];
      const tipB = [tack[0] + Math.cos(0.46) * sparLen, tack[1] + Math.sin(0.46) * sparLen];
      [[tipY, 'Yard'], [tipB, 'Boom']].forEach(([tip, nm]) => {
        const len2 = Math.hypot(tip[0] - tack[0], tip[1] - tack[1]);
        const g2 = new THREE.CylinderGeometry(B * 0.007, B * 0.014, len2, 7);
        const m2 = new THREE.Mesh(g2, woodDark);
        m2.position.set((tack[0] + tip[0]) / 2, (tack[1] + tip[1]) / 2, 0);
        m2.rotation.z = -Math.atan2(tip[0] - tack[0], tip[1] - tack[1]);
        group.add(tag(m2, 'yard', nm));
      });
      /* the leech of a crab claw is CONCAVE, which is most of why it looks like a claw and
         also why it works: the deeply raked tips shed tip vortices and it out-performs a
         triangle of the same area on a reach (Marchaj's tunnel tests on the Pacific rigs) */
      sails.push(makeTriSail(tack, tipY, tipB, group, 0.075));
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
      for (let i = 0; i <= nb; i++) {
        const yy = footY + sailH * (i / nb);
        const bg = new THREE.CylinderGeometry(B * 0.004, B * 0.004, sailW, 6);
        const bm = new THREE.Mesh(bg, woodDark);
        bm.rotation.z = Math.PI / 2;                 // along the hull, not across it
        bm.position.set(x + off, yy, 0);
        group.add(tag(bm, 'yard', i === 0 ? 'Boom' : (i === nb ? 'Yard' : 'Batten ' + i)));
      }
      sails.push(makeSail(x + off, footY + sailH, sailW, sailH, canvas, group, 'junk'));
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
      for (let s = 0; s < mk.shrouds; s++) {
        const f = (s + 1) / (mk.shrouds + 1);
        const chX = x + (f - 0.5) * L * 0.055;
        [1, -1].forEach((side, si2) => {
          const a = new THREE.Vector3(chX, base, side * half * 1.06);
          const b = new THREE.Vector3(x + Math.sin(rakeRad) * lower, topY, side * B * 0.03);
          group.add(tag(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), rope), 'shroud'));
          shroudPts[si2].push([a, b]);
        });
      }
      /* the ratlines themselves — they are what makes shrouds read as a ladder */
      const RAT = 0.3302;                                  // thirteen inches, in metres
      shroudPts.forEach(side => {
        if (side.length < 2) return;
        const rise = topY - base;
        for (let h = RAT; h < rise * 0.86; h += RAT) {
          const t = h / rise;
          const pts = side.map(([a, b]) => new THREE.Vector3(
            a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t));
          group.add(tag(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rope), 'ratline'));
        }
      });
    }
  });

  /* bowsprit — steeved up at an angle, and on a large ship it carries its own sail */
  if (S.bowsprit) {
    const u0 = 0.02;
    const x0 = -L / 2 + H.rake(u0);
    const len = L * S.bowsprit;
    const steeve = (S.steeve || 22) * Math.PI / 180;
    const bg = new THREE.CylinderGeometry(B * 0.010, B * 0.020, len, 8);
    const bm = new THREE.Mesh(bg, woodDark);
    bm.rotation.z = Math.PI / 2 - steeve;
    bm.position.set(x0 - Math.cos(steeve) * len / 2,
                    deckAt(u0) + Math.sin(steeve) * len / 2, 0);
    group.add(tag(bm, 'bowsprit'));
  }

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
const SAIL_VERT = `varying vec2 vUv; varying vec3 vN;
void main(){ vUv=uv; vN=normalize(normalMatrix*normal);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const SAIL_FRAG = `
precision highp float;
varying vec2 vUv; varying vec3 vN;
uniform float uPanels;      // number of 24-inch cloths across this sail
uniform vec3 uSun;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
void main(){
  /* panels run parallel to the leech; the seam is a doubled, stitched band about an inch wide */
  float p = vUv.x * uPanels;
  float seam = smoothstep(0.030, 0.075, abs(fract(p) - 0.5) * 2.0);
  vec3 flax = vec3(0.815, 0.775, 0.660);
  float weather = noise(vUv * vec2(9.0, 5.0)) * 0.5 + noise(vUv * vec2(38.0, 21.0)) * 0.5;
  vec3 col = flax * (0.86 + 0.20 * weather);
  col *= mix(1.10, 1.0, seam);                       // the seam is thicker, so it catches light
  /* bolt-rope and tabling darken the edges */
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  col *= mix(0.78, 1.0, smoothstep(0.0, 0.035, edge));
  vec3 N = normalize(vN);
  float lam = abs(dot(N, normalize(uSun)));
  /* canvas is thin: light comes through it as much as off it */
  col *= (0.52 + 0.62 * lam);
  gl_FragColor = vec4(pow(clamp(col,0.0,1.4), vec3(0.4545)), 1.0);
}`;

/* A sail is a bellied surface, not a flat quad: it takes the shape the wind puts in it, and
   that curve is most of what makes a ship under sail look alive rather than papery. */
function makeSail(x, yTop, width, height, mat, group, kind) {
  const NW = 16, NH = 12;
  const g = new THREE.PlaneGeometry(width, height, NW, NH);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i);
    const fx = 1 - Math.abs(px / (width / 2));            // 0 at the leeches, 1 at the middle
    const fy = kind === 'square' ? (0.5 - py / height) : 1 - Math.abs(py / (height / 2));
    p.setZ(i, Math.pow(Math.max(0, fx), 0.8) * Math.max(0, fy) * width * 0.16);
  }
  g.computeVertexNormals();
  /* 0.61 m = the 24-inch bolt. A 30 m course therefore carries about 49 cloths. */
  const sailMat = new THREE.ShaderMaterial({
    vertexShader: SAIL_VERT, fragmentShader: SAIL_FRAG, side: THREE.DoubleSide,
    uniforms: { uPanels: { value: Math.max(4, Math.round(width / 0.61)) },
                uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() } },
  });
  const m = new THREE.Mesh(g, sailMat);
  m.position.set(x, yTop - height / 2, 0);
  /* ⚠ Square sails hang ACROSS the ship; lug, lateen and gaff sails lie ALONG it. This
     quarter-turn was applied unconditionally, which silently swung every fore-and-aft sail
     broadside-on. The rig type has to decide it. */
  if (kind === 'square') m.rotation.y = Math.PI / 2;
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
function makeTriSail(A, B, C, group, belly) {
  const N = 18, pos = [], uvs = [], idx = [];
  const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  const head = Math.hypot(B[0] - A[0], B[1] - A[1]);
  for (let i = 0; i <= N; i++) {
    const sA = i / N;                                   // along the head, tack -> peak
    const Hd = lerp(A, B, sA);
    for (let j = 0; j <= N; j++) {
      const t = j / N;                                  // head -> clew
      const P = lerp(Hd, C, t);
      pos.push(P[0], P[1], 16 * sA * (1 - sA) * t * (1 - t) * head * belly);
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
  const gratingAt = (u, w, l) => {
    const gg = new THREE.Group();
    const y = deckAtU(u) + B * 0.004;
    const x = (u - 0.5) * L;
    const n = Math.max(3, Math.round(w / (B * 0.045)));
    for (let i = 0; i < n; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(l, B * 0.010, B * 0.012), wood);
      bar.position.set(x, y, -w / 2 + (i + 0.5) * (w / n));
      gg.add(bar);
    }
    const m2 = Math.max(3, Math.round(l / (B * 0.045)));
    for (let i = 0; i < m2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(B * 0.012, B * 0.014, w), wood);
      bar.position.set(x - l / 2 + (i + 0.5) * (l / m2), y + B * 0.003, 0);
      gg.add(bar);
    }
    return tag(gg, 'grating');
  };
  [0.30, 0.50, 0.70].forEach(u => {
    const w = halfAtU(u) * 0.85;
    group.add(gratingAt(u, w, L * 0.055));
  });

  /* ── the CAPSTAN: the machine that made a big ship workable by hand ───────────────── */
  {
    const u = 0.62, y = deckAtU(u);
    const cg = new THREE.Group();
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(B * 0.055, B * 0.070, B * 0.13, 12), wood);
    drum.position.y = y + B * 0.065;
    cg.add(drum);
    for (let i = 0; i < 8; i++) {                       // the bars, shipped for heaving
      const a = i / 8 * Math.PI * 2;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(B * 0.008, B * 0.010, B * 0.30, 6), pale);
      bar.rotation.z = Math.PI / 2; bar.rotation.y = a;
      bar.position.set(Math.cos(a) * B * 0.15, y + B * 0.115, Math.sin(a) * B * 0.15);
      cg.add(bar);
    }
    cg.position.x = (u - 0.5) * L;
    group.add(tag(cg, 'capstan'));
  }

  /* ── the SHIP'S BOAT, stowed on the beams over the main hatch ─────────────────────── */
  if (S.lwl > 25) {
    const u = 0.46, y = deckAtU(u);
    const bl = L * 0.16, bb = bl * 0.30;
    const bg = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bm = new THREE.Mesh(bg, pale);
    bm.scale.set(bl / 2, bb * 0.62, bb / 2);
    bm.rotation.x = Math.PI;                            // hollow side up
    bm.position.set((u - 0.5) * L, y + bb * 0.34, 0);
    group.add(tag(bm, 'boat'));
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
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.5, 8), mat);
    d.rotation.x = Math.PI / 2;
    d.position.z = (i - (n - 1) / 2) * r * 2.4;
    g.add(d);
  }
  return tag(g, 'deadeye');
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
    const waleMat = new THREE.MeshStandardMaterial({ color: 0x3d2f1f, roughness: 0.9 });
    group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.655, 0.030), waleMat), 'wale'));
    group.add(tag(new THREE.Mesh(buildWaleGeometry(S, 0.760, 0.026), waleMat), 'wale'));
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
    canvas: new THREE.MeshStandardMaterial({ color: 0xded3b8, roughness: 0.94,
                                             side: THREE.DoubleSide }),
    /* ⚠ Standing rigging is NOT black. It is hemp tarred with Stockholm tar, which is a dark
       reddish-brown to golden-brown. True black rigging is a late-19th-century appearance and
       comes from PETROLEUM tar — so black shrouds on an 18th-century ship are an anachronism
       of about a hundred years. */
    rope: new THREE.LineBasicMaterial({ color: 0x4a3520, transparent: true, opacity: 0.78 }),
  };
  const sails = buildRig(S, group, mats, FINE);
  /* the fittings are what turn a hull with masts into a ship, and they are the reason the
     Shipwright's model is worth building separately from the globe's token */
  if (FINE) buildFittings(S, group, mats);

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
