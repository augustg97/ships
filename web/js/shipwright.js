/* shipwright.js — THE SHIPWRIGHT: take a ship apart, and put it together.
 *
 * The Yard shows a finished vessel floating. This shows the same vessel as an OBJECT you can
 * dismantle: orbit it, click any timber or rope and be told its name and its job, and drag the
 * building slider to watch it assembled in the order a yard actually built it — keel, frames,
 * planking, deck, masts, rigging, yards, canvas.
 *
 * ── WHY THE LABELS CANNOT DRIFT ────────────────────────────────────────────────────────
 * There is no list of parts in this file. Every mesh the generator makes carries its own
 * `userData.part` — name, function, build stage — and the Shipwright reads the geometry's own
 * tags. A separate table of labels would be a second model of the ship, and second models of
 * the same thing always drift (the Yard's rig-height estimate did exactly that). Click
 * detection is a raycast against real geometry, so what you click IS what you are told about.
 *
 * ── AND WHY THE FLEET IS DRAWN TO SCALE ────────────────────────────────────────────────
 * The strip along the bottom puts every hull in the model on ONE baseline at ONE scale. Scale
 * is the argument: a 19 m voyaging canoe reached Hawaii, a 70 m treasure ship never left the
 * monsoon system, and a 400 m container ship carries more than every vessel before 1800 put
 * together. Drawn at a common scale that comparison needs no caption.
 */
'use strict';

const SW = {
  on: false, renderer: null, scene: null, cam: null, ship: null, spec: null,
  yard: null, layout: null, shipX: 0, panX: undefined,
  lon: 0.9, lat: 0.16, dist: 1.12, spin: true, stage: 7, sel: null,
  ray: null, hit: [], t0: 0,
};

const STAGE_NAMES = [
  ['Keel laid', 'One timber, stem to sternpost. Everything is measured from it.'],
  ['Frames raised', 'The ribs go up on the keel. In a carvel ship the shape is now decided.'],
  ['Planked', 'The skin goes on. Carvel: edge to edge, caulked. Clinker: overlapped, riveted.'],
  ['Decked', 'The deck ties the sides together and carries the guns. Rudder hung aft.'],
  ['Masts stepped', 'Lower mast, topmast, topgallant — each fidded through the doubling.'],
  ['Rigged', 'Shrouds take the sideways pull; ratlines make them a ladder aloft.'],
  ['Yards crossed', 'The spars the square sails hang from, braced round to trim to the wind.'],
  ['Bent on', 'Canvas. She can now be driven by the wind rather than carried by it.'],
];

function swInit() {
  if (SW.renderer) return;
  const cv = document.getElementById('swCanvas');
  SW.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  SW.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  SW.renderer.shadowMap.enabled = true;
  SW.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  SW.scene = new THREE.Scene();
  SW.cam = new THREE.PerspectiveCamera(34, 1, 0.05, 40000);
  SW.ray = new THREE.Raycaster();
  SW.ray.params.Line = { threshold: 0.35 };

  /* ── LIGHTING: A MUSEUM FLOOR, NOT A CELLAR ──────────────────────────────────────────
     The first pass lit the ship the way the globe is lit — one dim hemisphere and a weak key —
     and every vessel came out a brown silhouette on black. A model you are meant to inspect
     needs the light a photographer would give it: a strong warm key high on the bow quarter to
     rake the planking and throw the frames into relief, a cool fill opposite so the shadow side
     still reads, a low bounce standing in for light off the floor, and a rim behind to separate
     the rigging from the background. Four lights, and the ship stops being a silhouette. */
  /* Sky above, sea below — the hemisphere now matches the world the ship is actually in,
     rather than the dark room it used to hang in. */
  SW.scene.add(new THREE.HemisphereLight(0xdCEBFF, 0x3d5a68, 2.2));
  /* ── SHADOWS ────────────────────────────────────────────────────────────────────────
     The single largest thing still separating this from a photograph. Without them a hull is a
     collection of correctly-shaped objects floating in the same light; with them the courses
     throw onto the deck, the tops throw onto the courses, and the rigging draws itself across
     the canvas. Shadow is what tells the eye these things are in front of each other rather
     than merely near each other.
     Cast from the key only, and the map is fitted to the SELECTED ship rather than the whole
     2.6 km line — a shadow camera stretched over the full yard would put a 57 m ship inside
     about two texels of it. */
  const key = new THREE.DirectionalLight(0xfff6e8, 3.1); key.position.set(90, 120, 70);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.35;
  SW.key = key;
  const fill = new THREE.DirectionalLight(0xa8c8e0, 0.85); fill.position.set(-80, 45, -55);
  const bounce = new THREE.DirectionalLight(0xd8c9a8, 0.40); bounce.position.set(15, -60, 25);
  const rim = new THREE.DirectionalLight(0xdcecf6, 1.15); rim.position.set(-40, 70, -120);
  [key, fill, bounce, rim].forEach(l => SW.scene.add(l));
  SW.renderer.outputColorSpace = THREE.SRGBColorSpace || SW.renderer.outputColorSpace;
  if ('toneMapping' in SW.renderer) {
    SW.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    SW.renderer.toneMappingExposure = 1.15;
  }

  /* ── ⚠ THE BACKGROUND WAS NOTHING AT ALL ───────────────────────────────────────────
     Not a dark sky — no sky. The black was empty space, and a ship photographed against
     black is a museum object on a plinth rather than a ship. A dome, drawn inside-out, far
     enough out to sit behind everything, and with depth writing off so it never contests a
     pixel with real geometry. */
  const skyG = new THREE.SphereGeometry(18000, 32, 20);
  const skyM = new THREE.Mesh(skyG, new THREE.ShaderMaterial({
    vertexShader: SHADERS['SKY_VERT.vert'], fragmentShader: SHADERS['SKY_FRAG.frag'],
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
                uTime: { value: 0 } },
  }));
  /* ⚠ A dome centred on the camera was being FRUSTUM-CULLED, so it compiled, sat in the
     scene, reported itself visible, and drew nothing — the background stayed black and every
     check said the sky was fine. Culling a sky is never right: it is always around you. */
  skyM.frustumCulled = false;
  skyM.renderOrder = -1000;
  SW.sky = skyM; SW.scene.add(skyM);

  /* ── ⚠ THE SHIPWRIGHT'S "SEA" WAS A MATTE GREY DISC ────────────────────────────────
     A MeshStandardMaterial plane at roughness 0.95 — a floor, and it read as one. These are
     ships; they belong on water. Same Gerstner surface as the Action, same wave table, so a
     hull sits at the same height in both views. */
  /* ── ⚠ A 2.6 km SQUARE OF WATER IS A FLOATING SQUARE OF WATER ──────────────────────
     The sea here was PlaneGeometry(2600, 2600). From a camera set to frame a 345 m liner the
     far edge of that square is comfortably inside the view, so the ship sat on a visible tile
     of ocean with sky under its corners — which is exactly what it looked like.
     A horizon is not a bigger square. It is the water running out to where the Earth curves
     away, so this is the Passage's own radial disc, geometrically graded from 40 m at the
     hull to 26 km, carrying the sagitta so the far edge DROPS below eye level and reads as a
     horizon rather than as an edge. Same helper, exported rather than copied: two discs would
     be two models of one sea and they would drift. */
  const gg = window.SHIPS_PSG.radialDisc(40, 26000, 150, 192, 6371000);
  const gm = new THREE.Mesh(gg, new THREE.ShaderMaterial({
    vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
    uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
                uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
                uWind: { value: 6.5 }, uScale: { value: 150 }, uRip: { value: 3000 },
                /* ⚠ the same wind as the floatShip call below, or the hulls ride a sea 14%
                   smaller than the one drawn under them — the two-models-of-one-number class */
                uWave: { value: SHIPS_SEA.seaWaveUniform(6.5) } },
  }));
  gm.rotation.x = -Math.PI / 2;
  gm.frustumCulled = false;      /* a horizon is always around you, like the sky */
  SW.ground = gm; SW.scene.add(gm);

  /* ── AND SOMETHING TO BE OFF ────────────────────────────────────────────────────────
     Open water to every horizon reads as a test scene. A low, hazed shore on one bearing
     gives the eye a distance to measure the ship against and says "this is somewhere",
     without pretending to be anywhere in particular: it carries no place name and appears
     in no card. Nondescript on purpose — a coast, not a coastline. */
  /* ── ⚠ AND LAND MUST END WHERE IT GOES UNDER, NOT WHERE THE MESH RUNS OUT ────────────
     The first version was a 63° ARC at a constant 120 m minimum, so both ends were vertical
     walls standing 200 m out of the sea in mid-air: a grey slab that simply stopped, which is
     what August saw at the end of the ship line. Widening the arc only moves the wall.
     A coast ends for one reason — the ground drops below the horizon — so that is what
     decides it here. The strip is a CLOSED RING (no ends exist to be cut), and its height is
     a large-scale landness envelope that spends most of its circumference BELOW zero. Clamped
     at zero, those stretches collapse to zero-area triangles and are open sea; the crossings
     are headlands receding under the curve, which is the shape a real coast makes at fifteen
     kilometres. Every harmonic is an INTEGER multiple of the bearing, so the ring closes on
     itself exactly and there is no seam either. */
  {
    const R0 = 15000, seg = 720, pos = [], idx = [];
    const drop = Math.sqrt(Math.max(0, 6371000 * 6371000 - R0 * R0)) - 6371000;
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * Math.PI * 2;
      const x = Math.sin(a) * R0, z = -Math.cos(a) * R0;
      /* Where there is land at all. The phases are not free-hand: they were searched against
         the sector this camera actually sees (the eye looks along a = −SW.lon, and the fleet
         line spreads the view roughly −80°…+32° about it) for a profile that puts open water
         across one end of the frame, brings the coast up out of the sea INSIDE the picture,
         and runs it out the other side — so the break the viewer sees is a headland going
         under the curve and not the edge of a mesh. Land over 48% of the ring. */
      const envelope = 0.62 * Math.sin(a + 0.524)
                     + 0.30 * Math.sin(a * 2 + 1.571)
                     + 0.26 * Math.sin(a * 3 + 2.618)
                     + 0.14 * Math.sin(a * 5 + 5.236) - 0.06;
      /* and its relief where it stands, finer and never quite repeating */
      const ridge = 0.55 + 0.45 * Math.sin(a * 11 + 1.10)
                                * (0.60 + 0.40 * Math.sin(a * 17 - 0.30))
                         + 0.18 * Math.sin(a * 29 + 2.20);
      const h = Math.max(0, 760 * envelope * ridge);
      pos.push(x, drop, z, x, drop + h, z);
    }
    for (let j = 0; j < seg; j++) {
      const a0 = j * 2, b0 = a0 + 2;
      idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    lg.setIndex(idx); lg.computeVertexNormals();
    /* the colour is the horizon's own haze, lightly darkened — at fifteen kilometres almost
       all of what reaches the eye is scattered air rather than ground */
    const lm = new THREE.MeshBasicMaterial({ color: 0x8fa2ad, fog: false });
    const land = new THREE.Mesh(lg, lm);
    land.frustumCulled = false; land.renderOrder = -900;
    SW.shore = land; SW.scene.add(land);
  }

  /* ── DRAG TURNS THE SHIP, NOT THE CAMERA ────────────────────────────────────────────
     Orbiting the camera swung all twenty-one hulls about a point, which reads as a carousel.
     But not being able to walk round a ship at all is worse — the whole promise of this view is
     that you can look at the thing from any side. So the drag rotates the SELECTED SHIP on its
     own axis and leaves the line where it is. The camera never moves sideways, so the ships
     either side stay exactly where they were and the one you are looking at turns. Stepping
     between ships is a separate act, on the arrows.  */
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    delete SW.viewFromDeg;      // a drag takes the helm back from the URL's bearing
    drag = { x: e.clientX, y: e.clientY, spin: SW.shipSpin || 0, lat: SW.lat, moved: false };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
    /* ⚠ Was inverted: dragging right turned the ship away from the cursor. Grabbing an object
       and pulling right should bring its near side right, which is + not −. */
    SW.shipSpin = drag.spin + (e.clientX - drag.x) * 0.008;
    SW.lat = Math.max(0.02, Math.min(0.90, drag.lat + (e.clientY - drag.y) * 0.004));
  });
  cv.addEventListener('pointerup', e => {
    if (drag && !drag.moved) swPick(e);
    drag = null;
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    /* ⚠ 8x WAS NOT FAR ENOUGH TO SEE THE FLEET. The yard is 2.6 km of hulls laid on one
       baseline, and the whole argument of that line is the comparison along it — a dugout
       against a container ship. Capped at 8x the selected ship's own fit, a canoe's fit is so
       small that 8x still showed only her neighbours. 26x lets the camera pull back to the
       whole line from any vessel; the near limit is unchanged. */
    SW.dist = Math.max(0.35, Math.min(26.0, SW.dist * (1 + Math.sign(e.deltaY) * 0.11)));
  }, { passive: false });

  /* ── stepping along the line ──────────────────────────────────────────────────────── */
  const step = d => {
    if (!SW.layout) return;
    const i2 = SW.layout.findIndex(e => e.id === SW.spec.id);
    const n = SW.layout[(i2 + d + SW.layout.length) % SW.layout.length];
    swOpen(n.v);
  };
  document.getElementById('swPrev').onclick = () => step(-1);
  document.getElementById('swNext').onclick = () => step(1);
  /* Addressable by id, so a URL can name a hull. Until this existed the Shipwright's
     selection was the one piece of state no link could carry and no baseline could target:
     the frame harness could open the view but not choose the ship in it, and verifying a
     particular hull meant stepping the arrow keys a counted number of times and trusting
     the count. A green ratchet over a frame that cannot see the changed ship looks exactly
     like coverage. */
  window.swOpenById = id => {
    const e = (SW.layout || []).find(en => en.id === id);
    if (!e) return false;
    swOpen(e.v);
    return true;
  };
  addEventListener('keydown', e => {
    if (!SW.on) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  document.getElementById('swStage').addEventListener('input', e => {
    SW.stage = +e.target.value; swApplyStage();
  });
  const fb = document.getElementById('swFurl');
  if (fb) fb.onclick = () => swSetFurled(!SW.furled);
}

/* ── clicking a timber ─────────────────────────────────────────────────────────────── */
function swPick(e) {
  const cv = document.getElementById('swCanvas');
  const r = cv.getBoundingClientRect();
  const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1,
                              -((e.clientY - r.top) / r.height) * 2 + 1);
  SW.ray.setFromCamera(m, SW.cam);
  const hits = SW.ray.intersectObjects(SW.hit.filter(o => o.visible), false);
  if (!hits.length) { swSelect(null); return; }
  swSelect(hits[0].object);
}

function swSelect(obj) {
  /* the previous selection goes back to its own colour — held on the object, not in a global,
     so nothing can be left highlighted when the ship is rebuilt */
  if (SW.sel && SW.sel.userData.emissiveWas !== undefined && SW.sel.material.emissive) {
    SW.sel.material.emissive.setHex(SW.sel.userData.emissiveWas);
    SW.sel.userData.emissiveWas = undefined;
  }
  SW.sel = obj;
  /* ── ⚠ THE PART CARD IS GONE, DELIBERATELY ───────────────────────────────────────────
     Clicking a hull raised a panel headed "Deck", "Planking" or "Rail" — a caption naming a
     thing the viewer is already looking at, which spends a large panel on the least
     surprising fact on screen. It also competed with the vessel card for the same corner.
     The GEOMETRY TAGS STAY. Every mesh still carries its own userData.part, the audit still
     reads them, and the build-stage slider still works off them — removing the panel removes
     a caption, not the model's knowledge of itself. The highlight stays too, so a click still
     tells you what you hit. */
  if (obj && obj.material && obj.material.emissive) {
    obj.userData.emissiveWas = obj.material.emissive.getHex();
    obj.material = obj.material.clone();
    obj.material.emissive.setHex(0x3a2c10);
  }
}

/* ── the building slider ───────────────────────────────────────────────────────────── */
/* ── THE THREE TRADITIONS ──────────────────────────────────────────────────────────────
   How a hull is put together is not a detail of process — it decides what the ship can become,
   and the assembly slider is the only place in this project that can show it. The stage ORDER
   changes with the tradition, and so does what stage 1 and 2 are called.

   ⚠ This view used to tell every visitor that every hull in the model was carvel, because the
   shell-first flag existed and had never been set on a single ship. A feature that is wired but
   unset is worse than one that is missing: it asserts a default with the same confidence it
   would state a fact. */
const TRADITION = {
  /* ── THE ONE-PIECE HULL ───────────────────────────────────────────────────────────
     A dugout is not assembled at all, and that is what makes it the beginning of this
     story rather than a crude version of what follows. There is no keel, no frame, no
     plank and no seam, because there is no JOINT: the hull is a single tree with the
     inside taken out of it. Nothing can leak, and nothing can be repaired either.

     It also fixes the ship's limits at the moment the tree is felled. Beam cannot exceed
     the trunk, so a dugout is always narrow and always tender, and the only way to make a
     bigger one is to find a bigger tree. Every later tradition here exists to escape that:
     the moment you can JOIN two pieces of wood, the ship stops being the size of a plant. */
  dugout: { label: 'One piece: a tree with the inside taken out',
            s1: ['Log felled', 'The hull is chosen, not designed. Its beam is the trunk\'s '
                             + 'beam and cannot exceed it, which fixes what the boat can '
                             + 'ever be before a tool touches it.'],
            s2: ['Hollowed', 'Burned and adzed out from above. There is no seam anywhere in '
                           + 'the hull, so nothing can leak — and nothing can be replaced '
                           + 'either, because there are no parts.'] },
  frame: { label: 'Frame-first (carvel): frames, then planking',
           s1: ['Frames raised', 'The ribs go up on the keel. The shape is decided now, on the '
                              + 'drawing floor, before a single plank is cut — which is what '
                              + 'makes a 74 reproducible by a yard that has never built one.'],
           s2: ['Planked', 'Planks meet edge to edge on the frames and the seams are caulked.'] },
  shell: { label: 'Shell-first: planking, then frames',
           s1: ['Shell built', 'The planking shell goes up FIRST and holds the shape — clinker '
                             + 'riveted, or edge-joined by mortise and tenon, or sewn. The form '
                             + "exists only in the shipwright's eye and hands; there is no plan."],
           s2: ['Frames inserted', 'Light frames go in afterwards, into a hull whose shape '
                                 + 'already exists. Superb hulls — and they do not scale, '
                                 + 'because the shell has to carry the building loads.'] },
  iron:     { label: 'Iron frames, riveted plating',
           s1: ['Frames erected', 'Rolled iron frames on a keel plate. Iron does not care about '
                                + 'the length of a tree, which is the whole point: a wooden hull '
                                + 'is limited to about 60 m by the timber available and by '
                                + 'hogging, and iron simply is not.'],
           s2: ['Plated', 'Plates riveted to the frames, lapped and caulked. A riveted seam is '
                        + 'watertight and, unlike a caulked one, does not need re-caulking every '
                        + 'few years — which is a large part of why iron won.'] },
  /* ── ⚠ STEEL IS NOT WELDED UNTIL ABOUT 1950. Titanic and Yamato are steel builds, and this
     card told both of them the block-built welded story — prefabricated blocks are a post-war
     method, and a 1912 shell is three million rivets. The lookup below picks this entry for a
     steel hull whose year is before 1950, the same era key the plating shader dresses by. */
  steelRiveted: { label: 'Steel: frames, riveted plating',
           s1: ['Frames erected', 'Mild-steel frames on a keel plate, erected one by one and '
                                + 'faired by eye — the block-built hull is a post-war invention. '
                                + 'Steel displaced iron in the 1880s because it is stronger for '
                                + 'the same weight, so the same ship needs fewer tons of hull.'],
           s2: ['Plated', 'Plates riveted to the frames, lapped at every land. Titanic carried '
                        + 'three million rivets, driven by four-man gangs — hydraulic where the '
                        + 'shell was fair enough, by hand round the bow and stern where the '
                        + 'machine could not reach.'] },
  steel:    { label: 'Steel: frames, then welded plate',
           s1: ['Frames erected', 'Steel frames on a keel plate — and not one at a time. A modern '
                                + 'hull is assembled from prefabricated BLOCKS welded up elsewhere '
                                + 'and craned together, which is why a 400 m ship takes months '
                                + 'rather than years.'],
           s2: ['Plated', 'Welded plate, not riveted. A welded seam is continuous, so the hull is '
                        + 'one member instead of thousands of plates lapped together — and that '
                        + 'continuity is what lets a ship be 400 m long at all.'] },
  bulkhead: { label: 'Bulkhead-first (Chinese): bulkheads, then planking',
           s1: ['Bulkheads raised', 'Transverse bulkheads go up first. They are structure and '
                                  + 'subdivision at once — which gave the junk WATERTIGHT '
                                  + 'COMPARTMENTS centuries before Europe thought of them. Hole '
                                  + 'one compartment and the ship swims home.'],
           s2: ['Planked', 'The planking is fastened to the bulkheads rather than to ribs.'] },
};

/* ── A SHIP WITH NO RIG IS NOT "BENT ON" ───────────────────────────────────────────────
   The build stages are a sailing ship's story: masts, rigging, yards, canvas. Run a container
   ship through them and the last panel congratulates her on being able to sail. Where there is
   no rig, the same four stages describe what actually goes in — the machinery that replaced it.
   Same slider, same stage numbers, different subject, because that IS the succession. */
const ENGINE_STAGES = [
  null, null, null,
  ['Decked', 'The strength deck closes the box. On a container ship it is mostly hatch, because '
           + 'the hull is a rack and the cargo has to drop straight in.'],
  ['Machinery in', 'The engine and shafting go in before the ship is closed up — they are far too '
                 + 'big to fit through any opening afterwards. A modern low-speed diesel is three '
                 + 'storeys tall and turns at about 100 rpm, straight onto the shaft, no gearbox.'],
  ['Accommodation', 'The house and bridge, pushed to one end so nothing blocks the crane runs.'],
  ['Funnel and uptakes', 'What a mast used to be, doing what a mast never did: taking the exhaust '
                       + 'of about 80 megawatts out of the top of the ship.'],
  /* ⚠ THIS LAST STAGE WAS WRITTEN FOR THE CONTAINER SHIP AND SHOWN ON ALL OF THEM. Titanic
     and Great Eastern were both being told about corner castings and the 1968 box standard.
     The generic line is below; the box boat gets its own, keyed off S.containers. */
  /* ⚠ AND THE GENERIC LINE HAD THE SAME FAULT ONE LEVEL DOWN: it says "on a liner", so the
     yacht was being told about liner accommodation. The honest generic sentence names no type
     at all — every hull in the fleet loads something, and what it is differs. */
  ['Loaded', 'Cargo, stores and people aboard. What a hull is built to carry is what decides '
           + 'her proportions: how much of her volume is hold, how much is accommodation, and '
           + 'how deep she floats when it is all in.'],
];

function swApplyStage() {
  if (!SW.ship) return;
  const H = SW.spec && SW.spec.hull;
  let buildKey = (H && H.build) || 'frame';
  /* the era key: a steel hull before 1950 is riveted — same date the plating shader dresses by */
  if (buildKey === 'steel' && H && H.year && H.year < 1950) buildKey = 'steelRiveted';
  /* ⚠ AN UNKNOWN BUILD KEY MUST NOT KILL THE VIEW. Endurance shipped with build: 'wood' —
     no such tradition — and the undefined lookup threw inside swAdoptShip, which aborted the
     boot path before __FRAME_READY: one bad data field made the whole Shipwright deep-link
     hang, for her and for anyone clicking her in the fleet list. A typo in the record must
     degrade to the default tradition; the audit's 'build tradition unknown' rule reports it. */
  const trad = TRADITION[buildKey] || TRADITION.frame;
  const shell = trad === TRADITION.shell;
  SW.ship.traverse(o => {
    const p = o.userData && o.userData.part;
    if (!p) return;
    /* shell-first swaps the two: the skin is stage 1 and the frames stage 2 */
    let st = p.stage;
    if (shell && p.key === 'frames') st = 2;
    if (shell && p.key === 'planking') st = 1;
    o.visible = st <= SW.stage;

    /* ── ⚠ YOU CANNOT SEE THE FRAMES OF A PLANKED HULL ────────────────────────────────
       Three rounds went into stopping the ribs poking through the skin — first a bigger
       proportional inset, then an inset expressed as a real plank thickness — and they kept
       coming through at the sterns, where the sections are sharpest and the two surfaces are
       tessellated differently (26 steps against 72). Every one of those was a fix to the
       SYMPTOM.
       The frames are interior structure. Once the planking is on, a real ship shows none of
       them, so drawing them and relying on the skin to occlude them was never right: it made
       correctness depend on two independently-sampled curves never crossing, which is a
       promise no tessellation can keep. When the planking is visible, the frames are not. */
    if (p.key === 'frames' && SW.stage >= (shell ? 1 : 2)) o.visible = false;
  });

  const bb = new THREE.Box3();
  SW.ship.traverse(o => { if (o.visible && o.userData.part) bb.expandByObject(o); });
  bb.min.x -= SW.shipX; bb.max.x -= SW.shipX;   // the box is world-space; the camera is not
  if (!bb.isEmpty()) {
    SW.viewTop = bb.max.y; SW.viewBot = bb.min.y;
    SW.viewX = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
  }

  const engine = !(SW.spec.hull.masts || []).length;
  let nm = SW.stage === 1 ? trad.s1
         : SW.stage === 2 ? trad.s2
         : (engine && ENGINE_STAGES[SW.stage]) || STAGE_NAMES[SW.stage];
  if (SW.stage === 7 && SW.spec.hull.containers)
    nm = ['Loaded', 'The boxes. Eight feet by eight foot six by twenty or forty, corner castings '
                  + 'identical everywhere on earth — and the standard, not the ship, is the '
                  + 'invention.'];
  /* the stage card says which STATE the canvas is in, because the picture does */
  const cloth = (SW.spec.hull.masts || []).some(m => m.rig && m.rig !== 'none' && m.rig !== 'pole')
             || SW.spec.hull.headsails;
  if (SW.stage === 7 && SW.furled && cloth)
    nm = ['Bent on, furled', 'The canvas is bent to its spars and stowed: square sails rolled '
                           + 'on their yards in harbour gaskets with the bunt gathered at the '
                           + 'slings, gaff sails lowered onto their booms, a junk\'s battens '
                           + 'dropped into their stack. This is how a ship spends most of her '
                           + 'life — canvas wears out in use, and it was set only when she '
                           + 'was going somewhere.'];
  document.getElementById('swStageName').textContent = nm[0];
  document.getElementById('swStageWhat').textContent = nm[1];
  document.getElementById('swOrder').textContent = trad.label;
}


/* ── THE SHIPYARD: EVERY HULL ON ONE AXIS, AT TRUE RELATIVE SCALE ──────────────────────
 * Scale is the argument this project keeps failing to land. A canoe that reached Hawaii beside
 * a 400 m box boat says more than any card can — but only if they are in the same picture, and
 * until now you could see exactly one ship at a time, so the comparison lived in a number
 * nobody could feel.
 *
 * ⚠ THE AXIS IS DATE, NOT INDEX. Laying them out evenly would make the 2,700 years between the
 * trireme and the cog read the same as the 40 between the fluyt and the Indiaman, and that
 * spacing is half the story: nothing much happens for two millennia and then everything happens
 * at once.
 *
 * But pure date placement COLLIDES — the fluyt and the East Indiaman are both 1595, zero years
 * apart and 82 m of hull between them. So each ship is placed at its date and then DODGED
 * forward just enough to clear its neighbour. Where the fleet is sparse the spacing is honest
 * time; where it bunches, the dodge takes over and the line stays readable. Which is itself
 * legible: the crowded stretch IS the seventeenth century.
 */
/* ⚠ SPACING BY DATE-DISTANCE DID NOT WORK, and August was right about why. At 1.35 m per year
   the canoe and the trireme ended up 3.1 km apart — two of the smallest hulls in the fleet,
   separated by more empty water than the whole rest of the line, so the one comparison that
   most needs to be easy became the hardest. Chronological ORDER is the time axis; the SPACING
   should serve the comparison.
   So the gap is now proportional to the ships it separates: small hulls sit almost shoulder to
   shoulder, and only the big ones get room. */
function swBuildYard() {
  if (SW.yard) return;
  SW.yard = new THREE.Group();
  SW.scene.add(SW.yard);
  const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull)
    .slice().sort((a, b) => (a.from || 0) - (b.from || 0));
  SW.layout = [];
  let cursor = 0, prevL = 0;
  all.forEach((v, i) => {
    const L = v.hull.loa;
    const gap = i === 0 ? 0 : Math.max(9, 0.30 * Math.max(prevL, L));
    const x = cursor + (i === 0 ? L / 2 : prevL / 2 + gap + L / 2);
    cursor = x; prevL = L;
    const obj = window.SHIPS_HULL.buildShip(v.hull, { furled: !!SW.furled });
    obj.position.x = x;
    SW.yard.add(obj);
    SW.layout.push({ id: v.id, v, x, loa: L, obj, fine: false, furlBuilt: !!SW.furled });
  });
  /* ── A NAME UNDER EVERY HULL ────────────────────────────────────────────────────────
     Without them the line is twenty-one anonymous silhouettes and the comparison has nothing
     to hold on to. The name and the length go under each ship and are projected from the
     ship's own position every frame — the same way the globe letters its ports, and for the
     same reason: on a chart the label IS the mark. */
  const lay = document.getElementById('swLabels');
  lay.innerHTML = '';
  SW.layout.forEach(e => {
    const d = document.createElement('div');
    d.className = 'sl';
    const yr = e.v.from === undefined ? '' :
      (e.v.from < 0 ? Math.abs(e.v.from) + ' BC' : String(e.v.from));
    d.innerHTML = '<b>' + e.v.name + '</b><span>' + yr + ' · ' + e.loa.toFixed(0) + ' m</span>';
    lay.appendChild(d);
    e.el = d;
  });
  const first = SW.layout[0], last = SW.layout[SW.layout.length - 1];
  SW.yardSpan = [first.x - first.loa, last.x + last.loa];
}

/* ── HOW MANY HULLS ARE CARRIED AT FULL DETAIL ─────────────────────────────────────────
 * ⚠ ONE WAS TOO FEW, AND IT SHOWED. Only the selected ship was ever fine and every neighbour
 * was coarse, which is not a subtle difference: the fine build is what adds the RUDDER, the
 * stem and sternpost, the wales and the channels, on top of four times the stations. So a
 * neighbour was not a slightly rougher ship, it was a ship with no rudder — and pulled back far
 * enough to see three or four hulls at once, which is the view the fleet exists to give, that
 * is exactly what you were looking at.
 *
 * So a WINDOW of hulls around the selection is carried fine instead of a single one, and the
 * swap is progressive: at most one hull is built or dropped per frame. Building nine at once
 * on a selection would be a visible stall, and the whole reason this budget exists is that the
 * fine build is expensive. Spread over frames the upgrade arrives while the camera is still
 * easing toward the new ship, so it is never seen happening.
 *
 * The window is by POSITION along the yard, not by index, because the fleet is laid out to
 * scale — the ships either side of a container ship are much further away in metres than the
 * ships either side of a canoe, and it is metres the camera sees. */
const FINE_WINDOW = 9;                     /* hulls held at full detail, selection included */

function swFineWanted() {
  if (!SW.layout || !SW.layout.length) return new Set();
  const centre = SW.panTo !== undefined ? SW.panTo
               : (SW.panX !== undefined ? SW.panX : SW.shipX);
  const byNear = SW.layout.slice().sort((a, b) =>
    Math.abs(a.x - centre) - Math.abs(b.x - centre));
  const want = new Set(byNear.slice(0, FINE_WINDOW).map(e => e.id));
  /* ⚠ SW.sel is the picked MESH, not the ship — and every three.js object carries a numeric
     `.id`, so reading it here would silently add a meaningless entry to this set. The selected
     VESSEL is SW.spec. */
  if (SW.spec && SW.spec.id) want.add(SW.spec.id);
  return want;
}

/* Rebuild ONE entry at the given detail, preserving its place in the yard. */
function swRebuild(e, fine) {
  SW.yard.remove(e.obj);
  e.obj = window.SHIPS_HULL.buildShip(e.v.hull, { fine: !!fine, furled: !!SW.furled });
  e.obj.position.x = e.x;
  SW.yard.add(e.obj);
  e.fine = !!fine;
  e.furlBuilt = !!SW.furled;
  /* ⚠ rebuilding the SELECTED hull replaces the object every other piece of state points
     at: the raycast list, the shadow flags and the stage visibility all live on the OLD
     build, and without this the fresh ship is unclickable, unshadowed and ignores the
     slider — the consorts-in-dead-code class, state wired to an object that is gone. */
  if (SW.on && SW.spec && e.id === SW.spec.id && SW.ship !== e.obj) swAdoptShip(e);
  return e.obj;
}

/* point every piece of per-ship state at this entry's current build */
function swAdoptShip(e) {
  SW.ship = e.obj;
  SW.ship.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  SW.hit = [];
  SW.ship.traverse(o => { if (o.userData && o.userData.part) SW.hit.push(o); });
  SW.sel = null;
  swApplyStage();
}

/* Called once per frame: move one hull toward the wanted set. Upgrades are done before
   downgrades, because an under-detailed ship in view is the fault being fixed and a stale
   fine hull off to the side costs only memory. */
function swPumpDetail() {
  if (!SW.layout || !SW.layout.length) return;
  const want = swFineWanted();
  /* ⚠ FROZEN MUST MEAN FROZEN. A capture taken while this queue was still draining would
     photograph however far it had got, and two captures of identical code would differ — the
     exact failure the camera ease was already pinned for. In frozen mode the window is brought
     to its final state in one go, before anything is drawn. */
  /* a hull built in the other canvas state is stale at either detail level */
  const stale = e => e.furlBuilt !== !!SW.furled;
  if (typeof FROZEN !== 'undefined' && FROZEN) {
    SW.layout.forEach(e => { const f = want.has(e.id); if (e.fine !== f || stale(e)) swRebuild(e, f); });
    return;
  }
  const up = SW.layout.find(e => want.has(e.id) && (!e.fine || stale(e)));
  if (up) { swRebuild(up, true); return; }
  const down = SW.layout.find(e => !want.has(e.id) && (e.fine || stale(e)));
  if (down) swRebuild(down, false);
}

/* ── the canvas state: set, or furled ────────────────────────────────────────────────
   The same fleet, stowed. A view choice rather than a fact of any ship — the record owns
   what canvas she carries, this owns whether she is shown wearing it — so it lives here
   and in the URL (`&sail=furled`), never in vessels.json. The selected hull rebuilds at
   once; the rest of the yard follows through swPumpDetail, one hull per frame. */
function swSetFurled(on) {
  on = !!on;
  if (!!SW.furled === on) return;
  SW.furled = on;
  const b = document.getElementById('swFurl');
  if (b) { b.textContent = on ? 'Set sail' : 'Furl sails'; b.classList.toggle('on', on); }
  if (SW.layout && SW.spec) {
    const e = SW.layout.find(en => en.id === SW.spec.id);
    if (e) swRebuild(e, true);
  }
  if (SW.on) swApplyStage();          /* the stage card names the state */
}

function swPromote(entry) {
  if (entry.fine) return entry.obj;
  return swRebuild(entry, true);            /* the window is maintained by swPumpDetail */
}

/* ── open ──────────────────────────────────────────────────────────────────────────── */
function swOpen(vessel) {
  swInit();
  if (!vessel || !vessel.hull) return false;
  swBuildYard();
  SW.spec = vessel;
  const entry = SW.layout.find(e => e.id === vessel.id);
  if (!entry) return false;
  /* ── THE FINE BUILD ────────────────────────────────────────────────────────────────
     The selected ship is rebuilt at four times the stations and twice the waterlines, with
     members the globe and the Yard have no use for. Separate model, much higher detail — but
     generated from the SAME spec and the same surfacePoint(), so it is a finer rendering of
     one ship rather than a second ship. Only one exists at a time: sixteen of them is two and
     a half million triangles and will not run. */
  SW.ship = swPromote(entry);
  SW.ship.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  SW.shipX = entry.x;
  SW.panTo = entry.x;
  SW.shipSpin = 0;                                   // a new ship faces the way she was built
  /* ⚠ Do NOT clear SW.fit here. The easing reads SW.fit AND SW.look, and clearing only one of
     them leaves the other holding a stale or absent value — which puts NaN into the camera
     position and stops the renderer dead, silently, with a black canvas and a fully populated
     UI. The first open snaps by setting both to their targets, which swFrame does on its own
     when they are undefined. */
  if (!SW.on) { SW.panX = entry.x; SW.panTo = entry.x; }
  const idx = SW.layout.findIndex(e => e.id === vessel.id);
  document.getElementById('swNavPos').textContent = (idx + 1) + ' of ' + SW.layout.length;
  SW.sel = null;

  SW.hit = [];
  SW.ship.traverse(o => { if (o.userData && o.userData.part) SW.hit.push(o); });

  const U = SW.ship.userData;
  const L = vessel.hull.loa;
  /* the floor spans the whole line, not one ship */
  /* ── SHE IS LAUNCHED WHEN SHE IS FINISHED ──────────────────────────────────────────
     Putting the sea at the waterline floats the ship, which is what a ship does — but it also
     drowns the keel and the frames, and watching those go up is the whole purpose of this
     view. The real process resolves it: a hull stands on the STOCKS while it is built and
     goes into the water when it is done. So the sea sits below the keel through construction
     and rises to the waterline at the last stage, which is also the moment the canvas is bent
     on and she can first be driven. No scaling of the plane — it is a real 2,600 m of water
     and stretching it would stretch the wavelengths with it. */
  SW.dryY = U.keelBottom - 0.02 * L;
  /* ⚠ THE WATERLINE IS y = 0, BY CONSTRUCTION — and the bounding box is not. surfacePoint
     puts the load waterline at local y = 0, so aligning the sea to the hull's own datum
     floats every vessel at her marks. keelBottom + draught looked like the same number and
     was not: the Box3 floor is the keel timber, the screw or the bulb, not the moulded skin,
     so the sea sat 0.03–0.97 m below the marks — measured per hull in r33 — and the whole
     fleet showed antifouling above the water. The trireme story this comment used to tell
     dates from a parametrisation that no longer exists. */
  SW.waterY = U.waterlineY || 0;
  SW.ground.position.set(SW.shipX, SW.stage >= 7 ? SW.waterY : SW.dryY, 0);
  SW.rigTop = U.rigTop;
  /* ⚠ THE ZOOM IS RELATIVE, SO CARRY IT ACROSS SHIPS. `SW.dist` multiplies `SW.fit`, which is
     recomputed from each vessel's own extents — so one value of dist frames the canoe and the
     container ship identically, and resetting it to 1.12 on every selection was throwing away
     the viewer's zoom for no gain. It also meant walking the fleet snapped back to the same
     middle distance at every step, which reads as the camera fighting you.
     The one thing worth overriding is a zoom so close it would CROP the next ship: below 1.0
     the frame is inside her extents, so open out to just containing her and let the ease carry
     the move. Zoomed out is always kept — there is no reason to pull a viewer back in. Ships
     of very different size need no special case at all, which is the point of a relative zoom:
     `fit` grows 46x from the dugout to the container ship and dist rides on top of it. */
  SW.dist = Math.min(26.0, Math.max(SW.dist, 1.0));
  SW.spin = true; SW.t0 = performance.now();
  SW.stage = 7;
  document.getElementById('swStage').value = 7;

  document.getElementById('shipwright').classList.remove('hidden');
  document.getElementById('swRuler').style.display = 'flex';
  document.getElementById('swTitle').textContent = vessel.name;
  document.getElementById('swSub').textContent = rigLine(vessel);
  document.getElementById('swDims').innerHTML = [
    ['Length overall', L.toFixed(1) + ' m'],
    ['Beam', vessel.hull.beam.toFixed(2) + ' m'],
    ['Draught', vessel.hull.draught.toFixed(2) + ' m'],
    /* ⚠ "deck to truck" is a MAST measurement, and it was being printed on ships with no
       masts — Titanic's 62.3 m is her funnels and superstructure. Say what is being measured.
       ⚠ AND MEASURED FROM THE DECK, WHICH IS WHAT BOTH LABELS SAY. rigTop is the bounding
       box over the WATERLINE, so every ship's number silently carried her freeboard —
       Wyoming's "deck to truck" read 46.8 m over a 42 m mast, which happened to match the
       record and so looked confirmed while being wrong twice. */
    [(vessel.hull.masts || []).length ? 'Rig, deck to truck' : 'Air draught, above deck',
     (U.rigTop - vessel.hull.freeboard).toFixed(1) + ' m'],
  ].map(d => '<div><b>' + d[1] + '</b><span>' + d[0] + '</span></div>').join('');

  /* fit the shadow frustum to this ship, in her own place on the line */
  if (SW.key) {
    const r = Math.max(L, U.rigTop) * 0.85;
    const sc = SW.key.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r;
    sc.near = 1; sc.far = r * 6;
    SW.key.position.set(entry.x + r * 1.1, r * 1.6, r * 0.9);
    SW.key.target.position.set(entry.x, U.rigTop * 0.3, 0);
    SW.scene.add(SW.key.target);
    sc.updateProjectionMatrix();
  }
  swFillCard(vessel);
  swApplyStage();
  swSelect(null);
  swBuildFleetStrip();
  swBuildList();
  SW.on = true;
  swResize();
  return true;
}

/* ── WHAT SHE IS, AND WHAT SHE COULD DO ────────────────────────────────────────────────
   The dimensions say how big; they do not say what the ship was FOR or what it could actually
   achieve. History comes from the vessel's own researched prose and its attested rows. The
   capability figures are not prose at all — they are read straight off the polar diagram the
   routing engine uses, so what the panel claims about a ship's sailing is the same thing the
   model uses to cross oceans with it. If one is wrong, both are. */
function swFillCard(v) {
  const P = v.polar || {};
  const cur = P.curve || {};
  const ks = Object.keys(cur).map(Number).sort((a, b) => a - b);
  let bestA = 0, bestV = 0;
  ks.forEach(k => { if (cur[k] > bestV) { bestV = cur[k]; bestA = k; } });
  /* ── WHO IS ABOARD ─────────────────────────────────────────────────────────────────
     A ship is a place people live, and the manning is often the most surprising number on the
     card: Wyoming carried 3,730 tons with thirteen hands, a 74 carried 640 men in 57 metres,
     and the unmanned vessel carries nobody at all. It belongs beside the speed, not buried in
     the prose. */
  /* ⚠ An engine has no polar in the sailing sense: beat 0/0 marks it, and the wind cells
     below are meaningless for it. Titanic's card once read "closest made good, light airs:
     0°" — a beat angle on a turbine liner. An engine card carries the speed the record
     states and the speed the router actually crosses oceans at, labeled as what each is —
     the steamer's 12.25 kn trial figure sat over a curve topping at 9.6 for rounds with
     nothing on the card saying which one the model believed. */
  const eng = P.beatLight === 0 && P.beatHard === 0;
  const cap = [
    [v.crew !== undefined ? String(v.crew) : '—', v.crew === 0 ? 'crew — nobody aboard' : 'crew'],
    [v.pax !== undefined ? String(v.pax) : '—', v.pax === undefined ? 'passengers unrecorded' : 'passengers'],
    /* ⚠ On a ship with no sails the polar is meaningless as a speed. Titanic's card read
       "9.6 kn best speed" against a real 21 kn service speed, because the number was coming
       from a rig curve she does not have. An attested speed wins where one exists. */
    [(v.speedKn !== undefined ? v.speedKn.toFixed(1) : bestV.toFixed(1)) + ' kn',
     v.speedKn !== undefined ? 'service speed' : 'best speed, in a moderate breeze'],
  ].concat(eng ? [
    [bestV.toFixed(1) + ' kn', 'at sea, in the model — the router uses this'],
    ['0°', 'closest made good — straight upwind, under power'],
    ['—', 'the wind does not set her speed'],
  ] : [
    [bestA + '°', 'at this angle off the wind'],
    /* ⚠ "made good" is in the LABEL, not in a paragraph underneath. The note used to spend
       three lines explaining that these are course-made-good rather than heading, and restating
       the numbers while it did — which made the prose a second copy of the figures, and it had
       already drifted from them. Put the meaning where the number is. */
    [(P.beatLight !== undefined ? P.beatLight + '°' : '—'),
     P.floor ? 'closest made good under sail, light airs' : 'closest made good, light airs'],
    [(P.beatHard !== undefined ? P.beatHard + '°' : '—'),
     P.floor ? 'closest made good under sail, blowing hard' : 'closest made good, blowing hard'],
  ]).concat(P.floor ? (() => {
    /* A hull with a floor has a second engine that is not the wind's — oars, paddles or
       an auxiliary boiler — so the beat angles above are the SAIL's limits only: on the
       floor she goes straight upwind, paying the measured windage. The router holds the
       same two numbers — the floor unscaled by wind, less lossKnPerMs per m/s of head
       component.
       ⚠ The word is the RECORD's (`floor.by`), never guessed off the rig string. The old
       /oar/-else-'paddle' guess printed "4.0 kn UNDER PADDLE" on Endurance's card for a
       350 ihp screw auxiliary, because a barquentine rig string says nothing about her
       engine. The audit convicts any floor with no `by` before this line can print one. */
    const word = P.floor.by;
    return [
      [P.floor.kn.toFixed(1) + ' kn', 'under ' + word + ', any heading — a calm does not slow her'],
      [Math.max(0, P.floor.kn - P.floor.lossKnPerMs * 8).toFixed(1) + ' kn',
       'made good dead upwind, fresh breeze — windage, not a beat limit'],
    ];
  })() : []);
  document.getElementById('swCap').innerHTML =
    '<h4>Performance under sail and power</h4><div class="cap">' +
    cap.map(c => '<div><b>' + c[0] + '</b><span>' + c[1] + '</span></div>').join('') + '</div>' +
    /* ⚠ NO rigNote HERE. It is a property of the RIG, not the ship, so it repeated verbatim
       on all nine square-riggers — and it restated the two figures printed directly above it.
       Shortening it was not enough; the whole box was boilerplate. The one thing it carried
       that the numbers do not is now in the labels ("closest made good"). */
    '';
  /* ── THE SHIP HERSELF, ABOVE THE ACCOUNT OF HER ──────────────────────────────────────
     A generated hull is an argument about proportion and structure; it is not evidence. The
     photograph is, and putting the two together is the whole point — you can check the model
     against the thing. Where no photograph can exist (the fluyt, the corbita) the plate is the
     best surviving depiction and the caption says so, because a painting offered silently as a
     photograph is the one move that would make the rest untrustworthy.
     The credit line is not decoration: several of these are CC BY-SA, where attribution is the
     licence condition. It is rendered from the same manifest the image came from. */
  const pl = (APP.plates || {})[v.id];
  const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  document.getElementById('swStory').innerHTML =
    (pl ? '<figure class="plate">' +
            '<img src="data/assets/ships/' + v.id + '.jpg" alt="" loading="lazy" ' +
                 'onerror="this.closest(\'.plate\').remove()">' +
            '<figcaption>' + esc(pl.caption) +
              (pl.credit ? '<span class="cr">' + esc(pl.credit) +
                           (pl.licence ? ' · ' + esc(pl.licence) : '') + '</span>' : '') +
            '</figcaption></figure>'
        : '') +
    '<h4>History and service</h4>' + proseHTML(v.text);   /* app.js — markdown, not asterisks */
  document.getElementById('swRows').innerHTML = (v.rows || []).length
    ? '<h4>Measurements and sources</h4>' + v.rows.map(r =>
        '<div class="rw"><i>' + r[0] + '</i><b>' + r[1] + '</b></div>').join('')
    : '';
  document.getElementById('swCite').textContent = v.cite || '';
}

/* ── the scale strip: every hull in the model, one baseline, one scale ─────────────── */
function swBuildFleetStrip() {
  const strip = document.getElementById('swFleet');
  /* ⚠ THE SAME ORDER AS THE FLEET LIST, AND FOR THE SAME REASON. The list sorts by date and
     the strip used raw data order, so walking one and reading the other put you in two
     different fleets — a viewer who finds Titanic ninth in the list and fourteenth along the
     bar has no way to know they are the same set. Sorted here by the same key. */
  const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull)
    .slice().sort((a, b) => (a.from || 0) - (b.from || 0));
  const max = Math.max(...all.map(v => v.hull.loa));
  strip.innerHTML = '';
  all.forEach(v => {
    const b = document.createElement('button');
    b.className = 'fs' + (SW.spec && SW.spec.id === v.id ? ' on' : '');
    /* the bar IS the ship's length, at a common scale — the comparison needs no caption */
    b.innerHTML = '<i style="width:' + (Math.sqrt(v.hull.loa / max) * 100).toFixed(1) + '%"></i>'
                + '<span class="n">' + v.name + '</span>'
                + '<span class="l">' + v.hull.loa.toFixed(0) + ' m</span>';
    b.onclick = () => swOpen(v);
    strip.appendChild(b);
  });

  /* ⚠ THE BAR SCROLLED AND NOBODY COULD TELL. Twenty-five hulls at 104 px is 2.6 m of strip
     against a window that shows about nineteen, and `overflow-x:auto` was already set — so the
     rest was reachable and completely unadvertised, because macOS draws overlay scrollbars only
     while they are moving. Two things make it usable: a scrollbar that is always visible (in
     the CSS), and a WHEEL that works. A mouse wheel only sends deltaY, so on a horizontal strip
     it does nothing at all; mapping the larger of the two deltas onto scrollLeft means a wheel,
     a trackpad swipe and a shift-wheel all move the fleet. */
  if (!strip.dataset.wheelWired) {
    strip.dataset.wheelWired = '1';
    strip.addEventListener('wheel', ev => {
      const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if (!d) return;
      const before = strip.scrollLeft;
      strip.scrollLeft += d;
      /* only swallow the gesture if it actually moved, so an over-scroll still reaches the page */
      if (strip.scrollLeft !== before) ev.preventDefault();
    }, { passive: false });
  }
  swScrollFleetIntoView();
}

/* Keep the selected hull on screen in the strip — walking the fleet with the arrows used to
   leave the highlight somewhere off the end of a bar the viewer could not see was scrollable. */
function swScrollFleetIntoView() {
  const on = document.querySelector('#swFleet .fs.on');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function swClose() {
  SW.on = false;
  const rl = document.getElementById('swRuler');
  if (rl) rl.style.display = 'none';
  const lay = document.getElementById('swLabels');
  if (lay) lay.querySelectorAll('.sl').forEach(d => { d.style.opacity = '0'; });
  document.getElementById('shipwright').classList.add('hidden');
}

/* ── the Shipwright's OWN vessel list ──────────────────────────────────────────────────
   Its own list, not the globe's. This view is about the ship as an object — so it is ordered
   by DATE, and reading down it is the argument the project exists to make: the same handful of
   problems solved over and over, each time a little bigger. */
function swBuildList() {
  const el = document.getElementById('swListBody');
  const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull)
    .slice().sort((a, b) => (a.from || 0) - (b.from || 0));
  el.innerHTML = '';
  all.forEach(v => {
    const b = document.createElement('button');
    b.className = 'sv' + (SW.spec && SW.spec.id === v.id ? ' on' : '');
    const yr = v.from === undefined ? '' :
      (v.from < 0 ? Math.abs(v.from) + ' BC' : String(v.from));
    b.innerHTML = '<span class="n">' + v.name + '</span>'
                + '<span class="m">' + yr + (yr ? ' · ' : '') + v.hull.loa.toFixed(0) + ' m</span>';
    b.onclick = () => swOpen(v);
    el.appendChild(b);
  });
}

function swResize() {
  if (!SW.renderer) return;
  const el = document.getElementById('shipwright');
  const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
  SW.renderer.setSize(w, h, false);
  SW.cam.aspect = w / h; SW.cam.updateProjectionMatrix();
}

function swFrame(now) {
  if (SW.sky) { SW.sky.material.uniforms.uTime.value = clockS();
                SW.sky.position.copy(SW.cam.position); }
  if (SW.ground && SW.ground.material.uniforms) {
    const U2 = SW.ground.material.uniforms;
    U2.uTime.value = clockS();
    U2.uCam.value.copy(SW.cam.position);
    /* follow the selected ship, and rise to the waterline once she is complete */
    SW.ground.position.x = SW.shipX;
    SW.ground.position.y = SW.stage >= 7 ? (SW.waterY || 0) : (SW.dryY || 0);
  }
  if (!SW.on || !SW.ship) return;
  const L = SW.spec.hull.loa;
  SW.lon = 0.42;      // the camera's angle is fixed; the SHIP turns instead
  /* `#b=<degrees>` asks to see her FROM a bearing on her own compass — 0 ahead, 135 the
     quarter. Resolved HERE, against the lon the camera actually uses, because app.js reading
     SW.lon at selection time raced this very line: the hash was applied before the first
     swFrame, read the constructor's 0.9, and every "ahead" frame stood 27° off. The camera
     is at lon from world +z and the bow at (shipSpin − π/2), so spin = lon + π/2 − b. */
  if (SW.viewFromDeg !== undefined)
    SW.shipSpin = SW.lon + Math.PI / 2 - SW.viewFromDeg * Math.PI / 180;
  /* the line stays put and the selected hull turns under the drag */
  SW.layout && SW.layout.forEach(e => { e.obj.rotation.y = e.id === SW.spec.id ? (SW.shipSpin || 0) : 0; });
  /* ── AND ONCE AFLOAT, SHE MOVES WITH THE WATER ────────────────────────────────────
     Every hull in the line samples the SAME wave field the shader draws — one table, in
     sea.js — so a ship is never at a height the sea disagrees with.
     A hull does not balance on one point: it spans a length and averages the surface beneath
     it, which is why a long ship is steady in a short sea and a small boat is not. So the
     pitch comes from the difference between bow and stern rather than from a local normal,
     and the canoe visibly works while Titanic barely notices the same swell. */
  if (SW.stage >= 7 && SW.layout) {
    const t = clockS();
    /* the oars work whenever she is complete — a trireme under oar is the only way she moves */
    SHIPS_SEA.animateOars(SW.ship, t);
    SHIPS_SEA.animateWheels(SW.ship, t, (SW.spec && SW.spec.speedKn) || 8);
    SW.layout.forEach(e => {
      const h = (e.v && e.v.hull) || {};
      const len = h.loa || 30;
      const r = SHIPS_SEA.floatShip(e.obj, e.obj.position.x, 0, 0, len, t, 6.5,
                                    h.beam, h.draught);
      e.obj.position.y = r.y;                      // relative to her own floating datum
      e.obj.rotation.z = r.pitch;
      e.obj.rotation.x = r.roll;
    });
  } else if (SW.layout) {
    SW.layout.forEach(e => { e.obj.position.y = 0; e.obj.rotation.z = 0; e.obj.rotation.x = 0; });
  }
  /* ── THE CAMERA TRAVELS, AND SO DOES THE ZOOM ─────────────────────────────────────
     The pan already eased; the ZOOM did not. `fit` was recomputed from the new ship's bounding
     box the instant the selection changed, so stepping from the canoe to Titanic slammed the
     camera 200 m backwards in one frame while it was still gently sliding sideways — half a
     move, which reads as a glitch rather than as travel.
     Both are eased now, and the zoom is the part that carries the scale: pulling visibly back
     for a 269 m liner and closing in for a 19 m canoe IS the size comparison, felt as motion
     rather than read off a number. Easing them at the same rate keeps them one movement. */
  const top = SW.viewTop, bot = SW.viewBot;
  /* `#y=<metres>` aims the camera at a HEIGHT of the viewer's choosing — the default aim
     rides at a fixed fraction of the rig, which frames a whole ship well and a hull detail
     not at all: at any close zoom the hull sat behind the bottom panels, unreachable from a
     URL. Resolved here, against the extents this frame actually uses, for the same reason
     the bearing is (the r55 lesson: state is resolved where it is owned). */
  const lookT = SW.lookAtY !== undefined
              ? Math.max(bot, Math.min(top, SW.lookAtY))
              : bot + (top - bot) * 0.34;
  const halfV = Math.max(top - lookT, lookT - bot);
  const tanV = Math.tan(SW.cam.fov * Math.PI / 360);
  const fitT = 1.14 * Math.max(halfV / tanV,
                               SW.viewX / 2 / (tanV * Math.max(1.2, SW.cam.aspect)));
  if (!isFinite(SW.fit) || !isFinite(SW.look)) { SW.fit = fitT; SW.look = lookT; }
  /* ⚠ FROZEN MUST MEAN FROZEN, AND THIS EASE WAS MISSED WHEN IT WAS BUILT.
     The globe's camera flight is pinned by setting fly.t0 far in the past so it clamps to
     complete. The Shipwright pans and zooms by a per-frame ease toward a target, which is the
     same class of animation and was not pinned — so a capture landed wherever the ease had got
     to. Two consecutive captures of the junk differed by 26% of pixels, and a baseline taken
     from one of them would have failed against the next for no reason at all. In frozen mode
     the camera goes straight to its target. */
  const EASE = typeof FROZEN !== 'undefined' && FROZEN
             ? 1.0                                     // arrive immediately, for deterministic capture
             : 0.055;                                  // ~1.2 s to settle, which reads as travel
  SW.fit += (fitT - SW.fit) * EASE;
  SW.look += (lookT - SW.look) * EASE;
  const look = SW.look;
  const d = SW.fit * SW.dist;
  if (SW.panX === undefined) SW.panX = SW.shipX;
  if (SW.panTo !== undefined) SW.panX += (SW.panTo - SW.panX) * EASE;
  SW.cam.position.set(SW.panX + d * Math.cos(SW.lat) * Math.sin(SW.lon),
                      d * Math.sin(SW.lat) + look,
                      d * Math.cos(SW.lat) * Math.cos(SW.lon));
  SW.cam.lookAt(SW.panX, look, 0);
  if (SW.ground && SW.ground.material.uniforms.uRip)
    SW.ground.material.uniforms.uRip.value =
      SHIPS_SEA.rippleRange(SW.cam, SW.renderer ? SW.renderer.domElement.height : 900);
  const hm = SW.ship.userData.hullMat;
  if (hm) hm.uniforms.uCam.value.copy(SW.cam.position);
  /* place the names: project each ship's foot to the screen */
  /* ── PLACE THE NAMES, AND LET THEM YIELD TO EACH OTHER ──────────────────────────────
     Where the small hulls bunch, their labels overlapped into a smear. The globe already
     solved this for ports: sort by importance, place in order, and drop anything that lands
     on top of something already placed. Here importance is simple — the SELECTED ship always
     gets its name, then the nearest to the camera, then outward. A dropped label is better
     than two unreadable ones. */
  if (SW.layout) {
    const el = document.getElementById('shipwright');
    const w = el.clientWidth, h = el.clientHeight;
    const v = new THREE.Vector3();
    const cand = [];
    SW.layout.forEach(e => {
      v.set(e.x, SW.viewBot !== undefined ? SW.viewBot : 0, 0).project(SW.cam);
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      const on = SW.spec && e.id === SW.spec.id;
      const near = Math.abs(e.x - SW.panX);
      /* the cull scales with how far back the camera actually is, not with the selected
         ship's fit alone — pulling out to see the fleet used to drop every name off it */
      const vis = v.z < 1 && sx > -40 && sx < w + 40 &&
                  near < (SW.fit || 200) * 4 * Math.max(1, SW.dist || 1);
      cand.push({ e, sx, sy, on, near, vis });
    });
    cand.sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0) || a.near - b.near);
    const taken = [];
    cand.forEach(c => {
      let show = c.vis;
      if (show) {
        for (const t of taken) {
          if (Math.abs(t[0] - c.sx) < 96 && Math.abs(t[1] - c.sy) < 26) { show = false; break; }
        }
      }
      if (show) {
        taken.push([c.sx, c.sy]);
        c.e.el.style.left = c.sx + 'px';
        c.e.el.style.top = Math.min(h - 118, c.sy + 14) + 'px';
      }
      c.e.el.style.opacity = show ? (c.on ? '1' : '0.6') : '0';
      c.e.el.classList.toggle('on', !!c.on);
    });
  }
  /* ── THE TRUE-SCALE RULER ───────────────────────────────────────────────────────────
     At true scale the early hulls are slivers, and a viewer needs to be told that is the POINT
     rather than a rendering fault. A bar of known length, measured in the scene and drawn in
     pixels, is the only thing that makes "this canoe really is that small beside that liner"
     a fact rather than an impression. It picks a round number — 10, 20, 50, 100, 200 m — so
     the label is always something you can hold in your head. */
  {
    const a = new THREE.Vector3(SW.panX, SW.look, 0).project(SW.cam);
    const b = new THREE.Vector3(SW.panX + 100, SW.look, 0).project(SW.cam);
    const el = document.getElementById('shipwright');
    const pxPer100 = Math.abs(b.x - a.x) * 0.5 * el.clientWidth;
    if (pxPer100 > 1) {
      const targetPx = 190;
      const rawM = targetPx / (pxPer100 / 100);
      /* ⚠ DOWN TO ONE METRE, AND CHOSEN BY RATIO. Two faults, one symptom: on the small hulls
         the bar grew until it lay across the other panels — on the voyaging canoe a "5 metres"
         bar was wider than half the window. (1) The series STOPPED AT 5. A 19 m canoe filling
         the frame wants a 2.6 m bar, and with nothing below 5 the picker had to round UP, so
         the bar came out at twice its target width — the one case where the target is not
         approximated but abandoned. A 1 m or 2 m bar is still a number you can hold in your
         head, which is the whole point of the round-number rule. (2) Nearest by SUBTRACTION is
         the wrong metric on a geometric series: it is biased towards the larger step at every
         gap (for rawM 15, both 10 and 20 are 5 away, and the bias only widens further up the
         series). Nearest by RATIO is scale-free, which is what a log-spaced set of choices
         wants, and it keeps every vessel's bar near 190 px instead of only the large ones. */
      const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
      const m = steps.reduce((p, c) =>
        Math.abs(Math.log(c / rawM)) < Math.abs(Math.log(p / rawM)) ? c : p, steps[0]);
      const r = document.getElementById('swRuler');
      r.querySelector('i').style.width = (m * pxPer100 / 100).toFixed(1) + 'px';
      r.querySelector('b').textContent = m + (m === 1 ? ' metre' : ' metres');
    }
  }
  swPumpDetail();          /* one hull toward the fine window, per frame */
  SW.renderer.render(SW.scene, SW.cam);
}

/* ⚠ The subtitle is the record's rig, not the mesh's mast count. This line once keyed
   'no sail' off hull.masts.length, so every mastless hull had its rig text overridden:
   the dugout read "no sail" above two "closest made good under sail" rows (her mat sail
   is real, just undrawn), and the USV read "no sail" a round after her label was fixed
   to "wind, wave and solar". One composer for both card views; the audit runs it over
   every hull. */
function rigLine(vessel) {
  return (vessel.sub || '') + ' · ' +
         ((vessel.polar && vessel.polar.rig) ? vessel.polar.rig : 'no sail');
}

addEventListener('resize', swResize);
window.SHIPS_SW = { swOpen, swClose, swFrame, SW, rigLine, swSetFurled };
