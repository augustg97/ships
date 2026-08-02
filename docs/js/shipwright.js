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
  SW.scene.add(new THREE.HemisphereLight(0xbcd6e6, 0x4a4536, 1.5));
  /* ── SHADOWS ────────────────────────────────────────────────────────────────────────
     The single largest thing still separating this from a photograph. Without them a hull is a
     collection of correctly-shaped objects floating in the same light; with them the courses
     throw onto the deck, the tops throw onto the courses, and the rigging draws itself across
     the canvas. Shadow is what tells the eye these things are in front of each other rather
     than merely near each other.
     Cast from the key only, and the map is fitted to the SELECTED ship rather than the whole
     2.6 km line — a shadow camera stretched over the full yard would put a 57 m ship inside
     about two texels of it. */
  const key = new THREE.DirectionalLight(0xfff4e2, 2.5); key.position.set(90, 120, 70);
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

  /* a ground plane, so the hull reads as an object on a floor rather than in a void */
  const gg = new THREE.PlaneGeometry(1, 1);
  const gm = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({
    color: 0x18232b, roughness: 0.95, metalness: 0.0 }));
  gm.rotation.x = -Math.PI / 2;
  gm.receiveShadow = true;
  SW.ground = gm; SW.scene.add(gm);

  /* ── DRAG TURNS THE SHIP, NOT THE CAMERA ────────────────────────────────────────────
     Orbiting the camera swung all twenty-one hulls about a point, which reads as a carousel.
     But not being able to walk round a ship at all is worse — the whole promise of this view is
     that you can look at the thing from any side. So the drag rotates the SELECTED SHIP on its
     own axis and leaves the line where it is. The camera never moves sideways, so the ships
     either side stay exactly where they were and the one you are looking at turns. Stepping
     between ships is a separate act, on the arrows.  */
  let drag = null;
  cv.addEventListener('pointerdown', e => {
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
    SW.dist = Math.max(0.35, Math.min(8.0, SW.dist * (1 + Math.sign(e.deltaY) * 0.11)));
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
  addEventListener('keydown', e => {
    if (!SW.on) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  document.getElementById('swStage').addEventListener('input', e => {
    SW.stage = +e.target.value; swApplyStage();
  });
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
  const box = document.getElementById('swPart');
  if (!obj || !obj.userData.part) {
    box.classList.add('empty');
    box.innerHTML = '<div class="ph">Click any timber, rope or sail.</div>';
    return;
  }
  if (obj.material && obj.material.emissive) {
    obj.userData.emissiveWas = obj.material.emissive.getHex();
    obj.material = obj.material.clone();
    obj.material.emissive.setHex(0x3a2c10);
  }
  const P = obj.userData.part;
  box.classList.remove('empty');
  box.innerHTML = '<div class="pk">' + STAGE_NAMES[P.stage][0] + '</div>' +
                  '<h3>' + P.name + '</h3><p>' + P.what + '</p>';
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
  ['Loaded', 'Cargo and stores aboard. What she carries is what she is for — and on a liner that '
           + 'includes the people, which is why so much of her volume is accommodation rather '
           + 'than hold.'],
];

function swApplyStage() {
  if (!SW.ship) return;
  const trad = TRADITION[(SW.spec && SW.spec.hull && SW.spec.hull.build) || 'frame'];
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
    const obj = window.SHIPS_HULL.buildShip(v.hull);
    obj.position.x = x;
    SW.yard.add(obj);
    SW.layout.push({ id: v.id, v, x, loa: L, obj, fine: false });
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

/* the selected ship is rebuilt at full detail; the one it replaces goes back to coarse, so
   only ever one 160k-triangle hull exists at a time */
function swPromote(entry) {
  if (entry.fine) return entry.obj;
  SW.layout.forEach(e => {
    if (e.fine && e !== entry) {
      SW.yard.remove(e.obj);
      e.obj = window.SHIPS_HULL.buildShip(e.v.hull);
      e.obj.position.x = e.x;
      SW.yard.add(e.obj);
      e.fine = false;
    }
  });
  SW.yard.remove(entry.obj);
  entry.obj = window.SHIPS_HULL.buildShip(entry.v.hull, { fine: true });
  entry.obj.position.x = entry.x;
  SW.yard.add(entry.obj);
  entry.fine = true;
  return entry.obj;
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
  const span = SW.yardSpan[1] - SW.yardSpan[0];
  SW.ground.scale.set(span * 1.3, span * 1.3, 1);
  SW.ground.position.set((SW.yardSpan[0] + SW.yardSpan[1]) / 2, U.keelBottom - 0.02 * L, 0);
  SW.rigTop = U.rigTop;
  SW.spin = true; SW.dist = 1.12; SW.t0 = performance.now();
  SW.stage = 7;
  document.getElementById('swStage').value = 7;

  document.getElementById('shipwright').classList.remove('hidden');
  document.getElementById('swRuler').style.display = 'flex';
  document.getElementById('swTitle').textContent = vessel.name;
  document.getElementById('swSub').textContent =
    (vessel.sub || '') + ' · ' + (vessel.hull.masts.length ? vessel.polar.rig : 'no sail');
  document.getElementById('swDims').innerHTML = [
    ['Length overall', L.toFixed(1) + ' m'],
    ['Beam', vessel.hull.beam.toFixed(2) + ' m'],
    ['Draught', vessel.hull.draught.toFixed(2) + ' m'],
    /* ⚠ "deck to truck" is a MAST measurement, and it was being printed on ships with no
       masts — Titanic's 62.3 m is her funnels and superstructure. Say what is being measured. */
    [(vessel.hull.masts || []).length ? 'Rig, deck to truck' : 'Air draught, above deck',
     U.rigTop.toFixed(1) + ' m'],
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
  const cap = [
    [v.crew !== undefined ? String(v.crew) : '—', v.crew === 0 ? 'crew — nobody aboard' : 'crew'],
    [v.pax !== undefined ? String(v.pax) : '—', v.pax === undefined ? 'passengers unrecorded' : 'passengers'],
    [bestV.toFixed(1) + ' kn', 'best speed'],
    [bestA + '°', 'at this angle off the wind'],
    /* ⚠ "made good" is in the LABEL, not in a paragraph underneath. The note used to spend
       three lines explaining that these are course-made-good rather than heading, and restating
       the numbers while it did — which made the prose a second copy of the figures, and it had
       already drifted from them. Put the meaning where the number is. */
    [(P.beatLight !== undefined ? P.beatLight + '°' : '—'), 'closest made good, light airs'],
    [(P.beatHard !== undefined ? P.beatHard + '°' : '—'), 'closest made good, blowing hard'],
  ];
  document.getElementById('swCap').innerHTML =
    '<h4>What she could do</h4><div class="cap">' +
    cap.map(c => '<div><b>' + c[0] + '</b><span>' + c[1] + '</span></div>').join('') + '</div>' +
    /* ⚠ NO rigNote HERE. It is a property of the RIG, not the ship, so it repeated verbatim
       on all nine square-riggers — and it restated the two figures printed directly above it.
       Shortening it was not enough; the whole box was boilerplate. The one thing it carried
       that the numbers do not is now in the labels ("closest made good"). */
    '';
  document.getElementById('swStory').innerHTML =
    '<h4>What she was</h4>' +
    (v.text || '').split('\n\n').map(t => '<p>' + t + '</p>').join('');
  document.getElementById('swRows').innerHTML = (v.rows || []).length
    ? '<h4>On the record</h4>' + v.rows.map(r =>
        '<div class="rw"><i>' + r[0] + '</i><b>' + r[1] + '</b></div>').join('')
    : '';
  document.getElementById('swCite').textContent = v.cite || '';
}

/* ── the scale strip: every hull in the model, one baseline, one scale ─────────────── */
function swBuildFleetStrip() {
  const strip = document.getElementById('swFleet');
  const all = ((APP.vessels && APP.vessels.vessels) || []).filter(v => v.hull);
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
  if (!SW.on || !SW.ship) return;
  const L = SW.spec.hull.loa;
  SW.lon = 0.42;      // the camera's angle is fixed; the SHIP turns instead
  /* the line stays put and the selected hull turns under the drag */
  SW.layout && SW.layout.forEach(e => { e.obj.rotation.y = e.id === SW.spec.id ? (SW.shipSpin || 0) : 0; });
  /* ── THE CAMERA TRAVELS, AND SO DOES THE ZOOM ─────────────────────────────────────
     The pan already eased; the ZOOM did not. `fit` was recomputed from the new ship's bounding
     box the instant the selection changed, so stepping from the canoe to Titanic slammed the
     camera 200 m backwards in one frame while it was still gently sliding sideways — half a
     move, which reads as a glitch rather than as travel.
     Both are eased now, and the zoom is the part that carries the scale: pulling visibly back
     for a 269 m liner and closing in for a 19 m canoe IS the size comparison, felt as motion
     rather than read off a number. Easing them at the same rate keeps them one movement. */
  const top = SW.viewTop, bot = SW.viewBot;
  const lookT = bot + (top - bot) * 0.34;
  const halfV = Math.max(top - lookT, lookT - bot);
  const tanV = Math.tan(SW.cam.fov * Math.PI / 360);
  const fitT = 1.14 * Math.max(halfV / tanV,
                               SW.viewX / 2 / (tanV * Math.max(1.2, SW.cam.aspect)));
  if (!isFinite(SW.fit) || !isFinite(SW.look)) { SW.fit = fitT; SW.look = lookT; }
  const EASE = 0.055;                                  // ~1.2 s to settle, which reads as travel
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
      const vis = v.z < 1 && sx > -40 && sx < w + 40 && near < (SW.fit || 200) * 4;
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
      const steps = [5, 10, 20, 50, 100, 200, 500, 1000];
      const m = steps.reduce((p, c) => Math.abs(c - rawM) < Math.abs(p - rawM) ? c : p, steps[0]);
      const r = document.getElementById('swRuler');
      r.querySelector('i').style.width = (m * pxPer100 / 100).toFixed(1) + 'px';
      r.querySelector('b').textContent = m + ' metres';
    }
  }
  SW.renderer.render(SW.scene, SW.cam);
}

addEventListener('resize', swResize);
window.SHIPS_SW = { swOpen, swClose, swFrame, SW };
