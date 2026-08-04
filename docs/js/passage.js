/* passage.js — THE PASSAGE: come down off the globe and stand alongside.
 *
 * The Sea shows the ocean as a planet and the fleet as pieces on it. The Shipwright shows one
 * hull as an object on a stage. Neither shows the thing the whole project is about, which is a
 * SHIP AT SEA — a real hull, at its real size, in the water it is actually crossing, at the
 * place on the Earth it has actually reached. This view is that, and it is reached by clicking
 * a ship on the globe: the camera descends until the piece becomes a vessel.
 *
 * ── WHY IT IS NOT THE SHIPWRIGHT ──────────────────────────────────────────────────────────
 * The Shipwright is a museum floor. Its light is a photographer's light, its sea is a
 * convenience, and its subject is CONSTRUCTION — you take the ship apart there. Here nothing
 * comes apart. The subject is the passage: the sun is the sun over that longitude in that
 * month, the water carries the wave state the globe says is there, the hull is on her course
 * making her own speed, and the land you can see is the land that is actually within the
 * horizon of that position. The same model, in the world instead of on a plinth.
 *
 * ── THE TWO-SCALE PROBLEM, AND HOW IT IS SOLVED ───────────────────────────────────────────
 * The globe is 100 units across for 6371 km, so one unit is 63.7 km and a 72 m hull is 0.0011
 * of a unit. Building that hull into the globe's own scene puts 0.1 m planking detail eleven
 * million times smaller than the sphere it sits on, and float32 in the vertex pipeline gives
 * up long before that: the ship would quantise into rubble, and the depth buffer would tear.
 *
 * So there are two scenes and two cameras, rendered one after the other into the same frame:
 *
 *   1. THE BACKDROP — the globe itself, at planetary scale, with its camera placed at the
 *      exact equivalent position and orientation. This supplies the horizon, the distant water
 *      and any coast within sight, all computed by the same shader that draws the globe from
 *      orbit. It is not a painted sky; it is the Earth, seen from 40 m up.
 *   2. THE FOREGROUND — a metre-scale scene holding the sea patch and the ship, drawn after a
 *      depth clear so it always occupies the near field.
 *
 * The two cameras are locked by one matrix multiply, so they cannot drift apart. The seam is
 * where the water patch runs out, a few kilometres off, and it is hidden the way a real one
 * would be — by matching the colour of the near water to the colour the globe is drawing at
 * that same latitude, month and depth, and letting the fade land inside the haze.
 *
 * ── AND WHY THE WAVES ARE THE SAME WAVES ──────────────────────────────────────────────────
 * sea.js holds one wave table. The Shipwright's water uses it, the globe's shader uses it, the
 * buoyancy that lifts a hull uses it, and this view uses it. A ship rolls the same way in all
 * three because there is only one sea in the model.
 */
'use strict';

const PSG = {
  on: false, scene: null, cam: null, anchor: null,
  track: null, vessel: null, ship: null, sea: null, sky: null,
  lon: 0, lat: 0, hdg: 0, loa: 30, u: 0,
  orbit: 1.15, elev: 0.30, dist: 2.6, spin: true,
  M_PER_UNIT: 0,
};

/* ── HOW FAR THE NEAR WATER HAS TO REACH ─────────────────────────────────────────────────
   The horizon is sqrt(2 R h): 36 km from a masthead, 196 km from three kilometres up. This one
   surface has to serve both, because the camera now descends continuously from orbit and there
   is no altitude at which it is allowed to be obviously wrong. 260 km of radius covers a 5 km
   eye height with room to spare, and the radial mesh spends its vertices by angle, so reaching
   further costs almost nothing where it matters.

   ⚠ AND IT IS CURVED. A flat disc 260 km across ignores 5.3 km of Earth — the sea would run out
   past where the horizon should be, and the globe's own limb would be hidden behind a plane
   pretending to be an ocean. Each ring drops by the sagitta, so the surface leaves the eye line
   at exactly the true horizon and hands off to the backdrop there. */
const SEA_R = 260000;                 // radius of the near-field water, metres
const PATCH_M = SEA_R * 1.15;         // sky dome and far plane

function psgInit(R, globeCamera) {
  if (PSG.scene) return;
  PSG.M_PER_UNIT = 6371000 / R;
  PSG.scene = new THREE.Scene();
  PSG.cam = new THREE.PerspectiveCamera(globeCamera.fov, 1, 0.35, PATCH_M * 1.6);

  /* an empty in the GLOBE scene that carries the local frame: origin on the surface under the
     ship, +Y radial, +Z north, +X east, scaled so one unit here is one metre */
  PSG.anchor = new THREE.Object3D();
  PSG.anchor.scale.setScalar(1 / PSG.M_PER_UNIT);

  /* ── LIGHT ────────────────────────────────────────────────────────────────────────────
     One sun and one sky, because that is what is out there. The Shipwright's four-light rig is
     right for an object under inspection and wrong here: a ship at sea is lit by a single hard
     source and a very large soft one, and the ratio between them is most of what makes a
     photograph of the sea look like the sea. */
  PSG.sun = new THREE.DirectionalLight(0xfff4e2, 3.0);
  PSG.sun.castShadow = true;
  PSG.sun.shadow.mapSize.set(2048, 2048);
  PSG.sun.shadow.bias = -0.0016;
  PSG.sun.shadow.normalBias = 0.6;
  PSG.scene.add(PSG.sun, PSG.sun.target);
  PSG.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x2c4756, 1.55);
  PSG.scene.add(PSG.hemi);

  const skyG = new THREE.SphereGeometry(PATCH_M * 1.3, 40, 24);
  PSG.sky = new THREE.Mesh(skyG, new THREE.ShaderMaterial({
    vertexShader: SHADERS['SKY_VERT.vert'], fragmentShader: SHADERS['SKY_FRAG.frag'],
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { uSun: { value: new THREE.Vector3(0.4, 0.7, 0.5) }, uTime: { value: 0 } },
  }));
  PSG.sky.frustumCulled = false;          // a dome centred on the eye is always around you
  PSG.sky.renderOrder = -1000;
  PSG.scene.add(PSG.sky);

  /* ── THE WATER ────────────────────────────────────────────────────────────────────────
     A real displaced surface, not a normal map on a plane: the hull has to be occluded by the
     wave in front of it or nothing about the picture reads as floating.

     ⚠ AND A UNIFORM GRID IS THE WRONG MESH FOR IT. The first version was 340 x 340 quads over
     14 km — 41 m between vertices, which gives the 118 m swell three samples per wavelength and
     gives the 61, 27 and 13 m components nothing at all. Every wave in the table below the
     longest one simply did not exist as geometry, and the sea rendered as a flat grey field
     with the ship apparently resting on top of it. Spending the same vertices uniformly over
     14 km wastes almost all of them: the far half of that disc is four pixels tall.

     A radial mesh with geometrically growing rings puts the vertices where the pixels are —
     about 2 m between rings alongside the hull, 30 m at a kilometre, 400 m out at the rim. The
     whole wave table is resolved where it can be seen and nothing is spent where it cannot. */
  /* 2 m at the hull to 260 km at the rim is a range of 130,000, which 340 geometric rings
     cover at 3.5 per cent growth apiece: 4 m between rings at 100 m out, 400 m at 10 km,
     8 km at the far edge. One mesh, every altitude. */
  const g = radialDisc(2.0, SEA_R, 340, 256, 6371000.0);
  PSG.sea = new THREE.Mesh(g, new THREE.ShaderMaterial({
    vertexShader: SHADERS['SEA_VERT.vert'], fragmentShader: SHADERS['SEA_FRAG.frag'],
    uniforms: {
      uSun: { value: new THREE.Vector3(0.4, 0.7, 0.5) },
      uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
      /* uScale sets the distance over which the fragment ripple fades and the water darkens
         toward deep. It is the SHIP'S OWN LENGTH, set on open: what counts as near water
         depends entirely on how big the thing in the middle of it is, and 260 m of near field
         around a 9 m canoe is the same mistake as 260 m around a 400 m box boat. */
      uWind: { value: 7.0 }, uScale: { value: 60 },
      uWave: { value: SHIPS_SEA.seaWaveUniform() },
    },
  }));
  PSG.sea.rotation.x = -Math.PI / 2;
  PSG.sea.receiveShadow = true;
  PSG.scene.add(PSG.sea);
}

/* A disc whose rings grow geometrically from r0 to r1: constant angular resolution as seen
   from a camera near the middle, which is the only place this is ever viewed from. Built in
   the XY plane so the mesh can be laid flat by the same -PI/2 rotation a PlaneGeometry needs. */
function radialDisc(r0, r1, rings, seg, curveR) {
  const pos = [], idx = [], uv = [];
  pos.push(0, 0, 0); uv.push(0.5, 0.5);
  const gr = Math.pow(r1 / r0, 1 / (rings - 1));
  for (let i = 0; i < rings; i++) {
    const r = r0 * Math.pow(gr, i);
    /* the sagitta: how far the Earth has fallen away at this range. Built into the geometry
       rather than applied in the shader, because the buoyancy code has to agree with it and
       there is only one place the two can meet. */
    const drop = curveR ? (Math.sqrt(Math.max(0, curveR * curveR - r * r)) - curveR) : 0;
    for (let j = 0; j < seg; j++) {
      const a = j / seg * Math.PI * 2;
      pos.push(Math.cos(a) * r, Math.sin(a) * r, drop);
      uv.push(0.5 + Math.cos(a) * 0.5 * (r / r1), 0.5 + Math.sin(a) * 0.5 * (r / r1));
    }
  }
  for (let j = 0; j < seg; j++) idx.push(0, 1 + j, 1 + (j + 1) % seg);
  for (let i = 0; i < rings - 1; i++) {
    const a0 = 1 + i * seg, b0 = 1 + (i + 1) * seg;
    for (let j = 0; j < seg; j++) {
      const jn = (j + 1) % seg;
      idx.push(a0 + j, b0 + j, b0 + jn);
      idx.push(a0 + j, b0 + jn, a0 + jn);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ── the local frame at a point on the globe ─────────────────────────────────────────────
   east and north are the tangent directions; up is radial. Written once here and used both to
   place the anchor and to derive the ship's heading, so the two cannot disagree. */
/* ⚠ (east, up, north) IS LEFT-HANDED, and building the anchor from it made this frame a
   reflection. In a Y-up right-handed basis with Z along north, X must point WEST — X x Y = Z
   leaves no choice about it. The same wrong sign was written into the era fleet and the voyage
   wake; see tangentBasis() in app.js for what it cost there. Here it did not scatter anything,
   because the backdrop camera is derived from this same anchor and the two stayed consistent
   with each other — a mirrored world that agrees with itself, which is the hardest kind to see. */
function psgFrame(lon, lat, R) {
  const p = lon * Math.PI / 180, a = lat * Math.PI / 180;
  const up = new THREE.Vector3(Math.cos(a) * Math.sin(p), Math.sin(a), Math.cos(a) * Math.cos(p));
  const east = new THREE.Vector3(Math.cos(p), 0, -Math.sin(p));
  const north = new THREE.Vector3().crossVectors(up, east);      // geographic north
  const west = new THREE.Vector3().crossVectors(up, north);      // = X, so that X x Y = Z
  return { up, east, north, west, pos: up.clone().multiplyScalar(R) };
}

function psgOpen(tr, vessel, R, globeCamera) {
  psgInit(R, globeCamera);
  psgClearShip();
  PSG.track = tr; PSG.vessel = vessel;
  PSG.loa = (vessel.hull && vessel.hull.loa) || 30;

  let obj = null;
  try { obj = window.SHIPS_HULL.buildShip(vessel.hull, { fine: true }); } catch (e) { obj = null; }
  if (!obj) return false;
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  /* bow at local -X, and this view's forward is +Z — the same quarter turn the fleet uses.
     ⚠ +PI/2. At -PI/2 the bow lands dead astern; that sign has already cost this project once. */
  const holder = new THREE.Group();
  obj.rotation.y = Math.PI / 2;
  /* ── ⚠ THE WATERLINE IS NOT y = 0 ─────────────────────────────────────────────────────
     A generated hull is built with its keel wherever the sections put it, and floating it at
     the model's own origin puts a trireme in about four metres of water when she draws 1.25.
     The Shipwright solves the same problem the other way round — it raises the SEA to
     keelBottom + draught, because the ship is standing on stocks. Here the sea is the sea and
     cannot move, so the ship comes down to it by the same amount. Same number, from the hull's
     own bounding box and its own stated draught, so a vessel floats at the depth her card
     claims in both views or in neither. */
  obj.position.y = -((obj.userData.keelBottom || 0) + (vessel.hull.draught || 0));
  holder.add(obj);
  PSG.ship = holder;
  PSG.scene.add(holder);

  PSG.sea.material.uniforms.uScale.value = Math.max(14, PSG.loa * 0.7);

  /* ── ⚠ A SHIP IS NOT AS TALL AS SHE IS LONG, AND SHE IS NOT SHORT EITHER ─────────────
     Standing off a fixed number of ship-LENGTHS cut the rig off the top of the frame every
     time, because a clipper's main truck is most of her length above the water and the
     hull's loa says nothing about it. A tea clipper is 65 m long and 50 m tall; a container
     ship is 400 m long and 60 m tall. Fit the whole VESSEL — the real bounding sphere of the
     built model — into the vertical field, with a margin, and both are framed correctly with
     no per-ship tuning. */
  const bb = new THREE.Box3().setFromObject(holder);
  /* ── ⚠ FIT THE SPHERE, NOT THE BOX ────────────────────────────────────────────────────
     Two earlier attempts both framed wrong, and for the same underlying reason. The first
     used the distance from the model's ORIGIN to a corner, which double-counts rig height
     because a hull's origin is at the waterline amidships. The second used the box's half
     extents about its own centre — better, and still wrong, because the corner of a box is
     not at the centre's distance from the camera. A junk's masthead sits 13 m nearer the eye
     than her middle does, so it projects eleven per cent larger than the height sum predicts,
     and the truck went out of the top of the frame with the arithmetic insisting it fitted.

     The bounding SPHERE about her centre has no corners and no orientation, so the fit holds
     from every angle the orbit can reach. rad / sin(fov/2) is the exact tangent distance; the
     margin is the only free number left, and it is small. */
  const ctr = new THREE.Vector3(); bb.getCenter(ctr);
  const rad = Math.max(1, bb.max.distanceTo(ctr));
  const vfov = globeCamera.fov * Math.PI / 180;
  const aspect = Math.max(0.5, globeCamera.aspect || 1.5);
  /* whichever half-angle is the tighter — vertical on a wide window, horizontal on a tall one */
  const half = Math.min(vfov * 0.5, Math.atan(Math.tan(vfov * 0.5) * aspect));
  PSG.dist = Math.max(0.9, (rad / Math.sin(half) * 1.06) / PSG.loa);
  PSG.elev = Math.min(0.42, Math.max(0.09, (bb.max.y * 0.26) / PSG.loa));
  /* the era bar covers the bottom seventh of the canvas, so the aim drops by that much of the
     visible half-height — otherwise the waterline, the one line that has to be seen, is behind
     the furniture */
  PSG.aim = ctr.y - PSG.dist * PSG.loa * Math.tan(vfov * 0.5) * 0.13;
  PSG.orbit = 1.15;
  PSG.on = true;
  return true;
}

function psgClearShip() {
  if (PSG.ship) { PSG.scene.remove(PSG.ship); PSG.ship = null; }
}

function psgClose() {
  PSG.on = false;
  psgClearShip();
  PSG.track = null; PSG.vessel = null;
}

/* ── ONE STEP ────────────────────────────────────────────────────────────────────────────
   Called from the frame loop with the same clock the fleet uses, so the ship in this view is at
   the same point of the same voyage as the piece on the globe. u, the fraction along the track,
   is handed in rather than recomputed — two models of one number is the error this project
   keeps paying for. */
function psgStep(t, u, lon, lat, hdgRad, R, sun, wind, globeCamera, drag) {
  if (!PSG.on || !PSG.ship) return;
  PSG.lon = lon; PSG.lat = lat; PSG.hdg = hdgRad; PSG.u = u;

  const fr = psgFrame(lon, lat, R);
  PSG.anchor.position.copy(fr.pos);
  /* columns: X west, Y up, Z north — right-handed, see psgFrame */
  const m = new THREE.Matrix4().makeBasis(fr.west, fr.up, fr.north);
  PSG.anchor.quaternion.setFromRotationMatrix(m);
  PSG.anchor.updateMatrixWorld(true);

  /* the sun, brought down from the globe into the local frame */
  const sl = sun.clone();
  /* project onto THE FRAME'S OWN AXES. Using east where the anchor uses west put the sun on the
     wrong side of every ship — the hull would be lit from the west while the globe behind her
     was lit from the east, in the same frame. */
  const lsun = new THREE.Vector3(sl.dot(fr.west), sl.dot(fr.up), sl.dot(fr.north)).normalize();
  PSG.sun.position.copy(lsun).multiplyScalar(PATCH_M * 0.5);
  PSG.sun.target.position.set(0, 0, 0);
  PSG.sky.material.uniforms.uSun.value.copy(lsun);
  PSG.sky.material.uniforms.uTime.value = t;
  PSG.sea.material.uniforms.uSun.value.copy(lsun);
  PSG.sea.material.uniforms.uTime.value = t;
  PSG.sea.material.uniforms.uWind.value = wind;
  /* the sea state follows her round the world: the same table, re-scaled to the wind actually
     blowing at this position and month */
  SHIPS_SEA.updateWaveUniform(PSG.sea.material.uniforms.uWave.value, wind);
  /* ⚠ the sun is BELOW the horizon on the night side, and a ship lit from underneath by a
     directional light looks like a horror film. Lift the key to a grazing angle and drop it
     to a moonlit level rather than letting it go under. */
  if (lsun.y < 0.06) {
    PSG.sun.intensity = 0.30;
    PSG.hemi.intensity = 0.55;
    PSG.sun.position.set(lsun.x, 0.10, lsun.z).normalize().multiplyScalar(PATCH_M * 0.5);
  } else {
    PSG.sun.intensity = 3.0 * Math.min(1, 0.35 + lsun.y * 1.5);
    PSG.hemi.intensity = 1.55;
  }

  /* the sea patch follows the ship so she is never near its edge, and it moves in WHOLE
     WAVELENGTHS of the longest component so the pattern does not visibly jump when it does */
  PSG.sea.position.set(0, 0, 0);

  /* ── float her ───────────────────────────────────────────────────────────────────────
     Heading in the local frame: the track's bearing, with +Z north and +X east, so a course of
     090 is +X. The hull is on the same wave table as the water she is in. */
  /* ⚠ floatShip RETURNS pitch and roll; it does not apply them. The Shipwright's own call site
     assigns all three, and reading only position.y here gave a ship that heaved with the sea
     and never once leaned in it — which is the difference between floating and levitating.
     Order matters: yaw first about the world up, then pitch and roll in her own axes, so a
     ship on a southerly course rolls athwart HER beam and not athwart the map's. */
  /* ⚠ THE SIGN OF A COURSE. hdg is a compass bearing: measured from north THROUGH EAST. In
     this frame Z is north and X is WEST, so a positive rotation about Y carries the bow from
     north toward west — the wrong way round the compass. A ship steering 090 has to yaw -90
     here, and getting this backwards mirrors every course in the model without moving a hull
     off the water, which is why it would never look broken. */
  const yaw = -hdgRad;
  PSG.ship.rotation.set(0, 0, 0);
  PSG.ship.rotation.order = 'YXZ';
  PSG.ship.rotation.y = yaw;
  const fl = SHIPS_SEA.floatShip(PSG.ship, 0, 0, yaw, PSG.loa, t, wind);
  PSG.ship.rotation.z = fl.pitch;
  PSG.ship.rotation.x = fl.roll;
  if (SHIPS_SEA.animateOars) SHIPS_SEA.animateOars(PSG.ship, t, PSG.loa);
  if (SHIPS_SEA.animateWheels) SHIPS_SEA.animateWheels(PSG.ship, t, 4.5);

  /* ── the camera, and the backdrop camera locked to it ───────────────────────────────── */
  const d = PSG.loa * PSG.dist;
  const ex = Math.sin(PSG.orbit) * d, ez = Math.cos(PSG.orbit) * d;
  const ey = Math.max(PSG.loa * 0.06, PSG.loa * PSG.elev);
  PSG.cam.position.set(ex, ey, ez);
  /* aim a little above the waterline, at about a third of the rig — centring on the hull puts
     half the frame under the horizon and the masts out of the top of it */
  PSG.cam.lookAt(0, PSG.aim || PSG.loa * 0.10, 0);
  /* ⚠ ASPECT. This camera was built with aspect 1 and never told otherwise, so every frame was
     projected square into a 3:2 viewport — the whole scene stretched horizontally, which reads
     as "the camera is too close" and is not. It has to track the globe camera every frame, not
     once at construction, because the window can be resized at any time. */
  PSG.cam.fov = globeCamera.fov;
  PSG.cam.aspect = globeCamera.aspect;
  PSG.cam.updateProjectionMatrix();
  PSG.cam.updateMatrixWorld(true);
  PSG.sea.material.uniforms.uCam.value.copy(PSG.cam.position);
  PSG.sky.position.copy(PSG.cam.position);

  /* ONE multiply keeps the Earth behind the ship in register with the ship. If this drifts the
     horizon slides out from under the water and the whole illusion goes at once. */
  globeCamera.matrix.multiplyMatrices(PSG.anchor.matrixWorld, PSG.cam.matrix);
  globeCamera.matrix.decompose(globeCamera.position, globeCamera.quaternion, new THREE.Vector3());
  globeCamera.scale.set(1, 1, 1);
  globeCamera.updateMatrixWorld(true);
}

/* ══ THE DESCENT ══════════════════════════════════════════════════════════════════════════
 *
 * The Passage anchors this scene under one ship. The descent anchors the SAME scene under the
 * CAMERA, and that one change turns it from a destination into the bottom of a continuous zoom:
 * the wheel now runs from thirty-eight thousand kilometres to five hundred metres without a cut,
 * and somewhere on the way down the ocean stops being a colour and becomes a surface.
 *
 * ── WHERE THE HANDOVER IS, AND WHY THERE ─────────────────────────────────────────────────
 * Two things have to arrive together or the seam shows.
 *
 * The globe's own shader already grows waves as the ground scale falls — the 118 m swell appears
 * around 56 km up, where a pixel first becomes small against it. Below about 8 km a pixel is
 * under six metres and the shader is being asked for detail a per-pixel normal cannot honestly
 * give: the water needs real displaced geometry, because a hull has to be occluded by the wave
 * in front of it. So 8 km is where this scene takes over the near field.
 *
 * And 8 km is where the fleet reaches TRUE SCALE. A ship drawn at globe zoom has to be about
 * 1,600 times her real size to be visible at all — from 765 km a 42 m hull is eight hundredths
 * of a pixel — so the token is an exaggeration that has to be unwound on the way down, or a
 * 200 km carrack ends up floating on 100 m waves. The exaggeration is a geometric ramp: full
 * token above 300 km, unity at 8 km, so by the time a hull crosses into this scene she is
 * already her own size and nothing changes across the seam except which scene she is in.
 *
 * ⚠ THE DEPTH CLEAR IS WHY BOTH MUST HAPPEN AT ONCE. The near pass clears depth, so anything
 * left in the globe scene is hidden behind the water regardless of where it is. Ships cannot
 * cross at a different altitude from the water; they cross at the same one or they vanish.
 */
const DESCENT_M = 8000;              // altitude below which the near field takes over

function psgDescentActive(altM) { return altM < DESCENT_M; }

function psgDescent(t, lon, lat, R, sun, wind, globeCamera, altM) {
  psgInit(R, globeCamera);
  PSG.mode = 'descent';
  const fr = psgFrame(lon, lat, R);
  PSG.anchor.position.copy(fr.pos);
  PSG.anchor.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(fr.west, fr.up, fr.north));
  PSG.anchor.userData.lon = lon; PSG.anchor.userData.lat = lat;
  PSG.anchor.updateMatrixWorld(true);

  /* the near camera IS the globe camera, expressed in the anchor's metre frame. One inverse
     multiply, so the two cannot disagree about where the eye is — the same discipline that
     keeps the Passage's backdrop in register, run in the other direction. */
  const inv = new THREE.Matrix4().copy(PSG.anchor.matrixWorld).invert();
  PSG.cam.matrix.multiplyMatrices(inv, globeCamera.matrixWorld);
  PSG.cam.matrix.decompose(PSG.cam.position, PSG.cam.quaternion, new THREE.Vector3());
  PSG.cam.scale.set(1, 1, 1);
  PSG.cam.fov = globeCamera.fov;
  PSG.cam.aspect = globeCamera.aspect;
  /* near and far from the eye height: the horizon is sqrt(2 R h), and asking one depth buffer
     to span half a metre and four hundred kilometres gives neither end any precision */
  const hor = Math.sqrt(2 * 6371000 * Math.max(1, altM));
  PSG.cam.near = Math.max(0.3, Math.min(220, altM * 0.02));
  PSG.cam.far = Math.max(20000, Math.min(SEA_R * 1.5, hor * 1.8));
  PSG.cam.updateProjectionMatrix();
  PSG.cam.updateMatrixWorld(true);
  /* ⚠ THE SKY WAS BEING CLIPPED BY THE FAR PLANE. The dome is built at 299 km and the far
     plane now follows the horizon — 222 km at a kilometre up — so the whole sky fell outside
     the frustum and the view had black space above the water. depthTest:false does not save
     it: clipping is geometric, not a depth test. The dome is scaled to sit at half the far
     plane, wherever that is this frame. */
  PSG.sky.scale.setScalar(PSG.cam.far * 0.5 / (PATCH_M * 1.3));

  const lsun = new THREE.Vector3(sun.dot(fr.west), sun.dot(fr.up), sun.dot(fr.north)).normalize();
  PSG.sun.position.copy(lsun).multiplyScalar(hor);
  PSG.sun.target.position.set(0, 0, 0);
  PSG.sun.intensity = lsun.y < 0.06 ? 0.30 : 3.0 * Math.min(1, 0.35 + lsun.y * 1.5);
  PSG.hemi.intensity = lsun.y < 0.06 ? 0.55 : 1.55;
  PSG.sky.material.uniforms.uSun.value.copy(lsun);
  PSG.sky.material.uniforms.uTime.value = t;
  PSG.sky.position.copy(PSG.cam.position);
  PSG.sea.material.uniforms.uSun.value.copy(lsun);
  PSG.sea.material.uniforms.uTime.value = t;
  PSG.sea.material.uniforms.uWind.value = wind;
  PSG.sea.material.uniforms.uCam.value.copy(PSG.cam.position);
  /* what counts as "near water" is now the eye height, not a ship's length */
  PSG.sea.material.uniforms.uScale.value = Math.max(40, altM * 0.5);
  SHIPS_SEA.updateWaveUniform(PSG.sea.material.uniforms.uWave.value, wind);
}

/* ── THE FLEET, AT ITS OWN SIZE, ON THE REAL SURFACE ──────────────────────────────────────
 * Hulls within the patch are built once per vessel and reused. Their station is the same lon/lat
 * the globe token has — read from tr.at, never recomputed — converted into the anchor's metre
 * frame and dropped by the same sagitta the water carries, so a ship forty kilometres away sits
 * in the sea rather than above where the sea used to be before the Earth curved out from under
 * her.
 */
function psgFleet(tracks, R, t, wind, list) {
  if (!PSG.fleetPool) { PSG.fleetPool = new Map(); PSG.fleetGroup = new THREE.Group();
                        PSG.scene.add(PSG.fleetGroup); }
  const seen = new Set();
  const alat = PSG.anchor.userData.lat, alon = PSG.anchor.userData.lon;
  for (const tr of tracks || []) {
    if (!tr.at || !tr.vesselId) continue;
    const ves = list.find(x => x.id === tr.vesselId);
    if (!ves || !ves.hull) continue;
    let dlon = tr.at.lon - alon;
    if (dlon > 180) dlon -= 360; else if (dlon < -180) dlon += 360;
    const east = dlon * Math.PI / 180 * Math.cos(tr.at.lat * Math.PI / 180) * 6371000;
    const north = (tr.at.lat - alat) * Math.PI / 180 * 6371000;
    const r2 = east * east + north * north;
    if (r2 > (SEA_R * 0.7) * (SEA_R * 0.7)) continue;         // beyond the water
    seen.add(tr.name);
    let e = PSG.fleetPool.get(tr.name);
    if (!e) {
      let obj = null;
      try { obj = window.SHIPS_HULL.buildShip(ves.hull, { fine: true }); } catch (x) { continue; }
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      obj.rotation.y = Math.PI / 2;                            // bow -X onto +Z
      obj.position.y = -((obj.userData.keelBottom || 0) + (ves.hull.draught || 0));
      const holder = new THREE.Group();
      holder.add(obj);
      holder.rotation.order = 'YXZ';
      e = { holder, loa: ves.hull.loa };
      PSG.fleetPool.set(tr.name, e);
      PSG.fleetGroup.add(holder);
    }
    e.holder.visible = true;
    const drop = Math.sqrt(Math.max(0, 6371000 * 6371000 - r2)) - 6371000;
    const yaw = -tr.at.hdg;
    e.holder.rotation.set(0, yaw, 0);
    const fl = SHIPS_SEA.floatShip(e.holder, -east, north, yaw, e.loa, t, wind);
    e.holder.position.set(-east, drop + fl.y, north);
    e.holder.rotation.z = fl.pitch;
    e.holder.rotation.x = fl.roll;
    if (SHIPS_SEA.animateOars) SHIPS_SEA.animateOars(e.holder, t, e.loa);
    if (SHIPS_SEA.animateWheels) SHIPS_SEA.animateWheels(e.holder, t, 4.5);
  }
  for (const [k, e] of PSG.fleetPool) if (!seen.has(k)) e.holder.visible = false;
}

function psgFleetClear() {
  if (!PSG.fleetPool) return;
  for (const [, e] of PSG.fleetPool) e.holder.visible = false;
}

window.SHIPS_PSG = { PSG, psgInit, psgOpen, psgClose, psgStep, psgFrame, PATCH_M, SEA_R,
                     psgDescent, psgDescentActive, psgFleet, psgFleetClear, DESCENT_M };
