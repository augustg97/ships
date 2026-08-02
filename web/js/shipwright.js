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
  const key = new THREE.DirectionalLight(0xfff4e2, 2.5); key.position.set(90, 120, 70);
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
  SW.ground = gm; SW.scene.add(gm);

  let drag = null;
  cv.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, lon: SW.lon, lat: SW.lat, moved: false };
    SW.spin = false; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
    SW.lon = drag.lon - (e.clientX - drag.x) * 0.007;
    SW.lat = Math.max(-0.35, Math.min(1.25, drag.lat + (e.clientY - drag.y) * 0.005));
  });
  cv.addEventListener('pointerup', e => {
    if (drag && !drag.moved) swPick(e);
    drag = null;
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    SW.dist = Math.max(0.55, Math.min(6.0, SW.dist * (1 + Math.sign(e.deltaY) * 0.11)));
  }, { passive: false });

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
function swApplyStage() {
  if (!SW.ship) return;
  SW.ship.traverse(o => {
    if (o.userData && o.userData.part) o.visible = o.userData.part.stage <= SW.stage;
  });
  /* ⚠ Clinker is SHELL-FIRST: the planking shell is built first and light frames go in after.
     Showing every hull frames-then-planking would assert that all shipbuilding is carvel, which
     is the single biggest thing this view could get wrong — the two traditions scale differently
     and that is most of why the Atlantic ship of 1500 could grow and the longship could not. */
  if (SW.spec && SW.spec.hull && SW.spec.hull.shellFirst) {
    SW.ship.traverse(o => {
      const p = o.userData && o.userData.part;
      if (!p) return;
      if (p.key === 'frames') o.visible = SW.stage >= 2;
      if (p.key === 'planking') o.visible = SW.stage >= 1;
    });
  }
  /* ── REFRAME ON WHAT IS ACTUALLY VISIBLE ────────────────────────────────────────────
     A keel is 60 m long and 1 m deep; the finished rig is 61 m tall. Framing both from the
     same box leaves the bare hull as a splinter at the bottom of the screen. The camera box
     is recomputed from the visible meshes at every stage — the same measure-don't-estimate
     rule that fixed the Yard, applied to a target that now changes as you drag. */
  const bb = new THREE.Box3();
  SW.ship.traverse(o => { if (o.visible && o.userData.part) bb.expandByObject(o); });
  if (!bb.isEmpty()) {
    SW.viewTop = bb.max.y; SW.viewBot = bb.min.y;
    /* ⚠ Fitting on the X extent alone assumes every vessel is longer than it is wide. A double
       canoe is 5.4 m across on a 1.05 m hull, and from anywhere but dead abeam that width is
       what runs off the screen. Fit the larger of the two horizontal extents. */
    SW.viewX = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
  }

  const nm = STAGE_NAMES[SW.stage];
  document.getElementById('swStageName').textContent = nm[0];
  document.getElementById('swStageWhat').textContent = nm[1];
  const order = document.getElementById('swOrder');
  order.textContent = (SW.spec && SW.spec.hull && SW.spec.hull.shellFirst)
    ? 'Shell-first (clinker): planking, then frames'
    : 'Frame-first (carvel): frames, then planking';
}

/* ── open ──────────────────────────────────────────────────────────────────────────── */
function swOpen(vessel) {
  swInit();
  if (!vessel || !vessel.hull) return false;
  if (SW.ship) { SW.scene.remove(SW.ship); }
  SW.spec = vessel;
  /* ── THE FINE BUILD ────────────────────────────────────────────────────────────────
     The Shipwright gets its OWN model of the ship, at four times the stations and twice the
     waterlines, with members the globe and the Yard have no use for: stem and sternpost as
     separate timbers, wales, rudder, channels, and every frame as its own pickable object.
     Separate model, much higher detail — but generated from the SAME spec and the same
     surfacePoint(), so it is a finer rendering of one ship rather than a second ship. */
  SW.ship = window.SHIPS_HULL.buildShip(vessel.hull, { fine: true });
  SW.scene.add(SW.ship);
  SW.sel = null;

  SW.hit = [];
  SW.ship.traverse(o => { if (o.userData && o.userData.part) SW.hit.push(o); });

  const U = SW.ship.userData;
  const L = vessel.hull.loa;
  SW.ground.scale.set(L * 24, L * 24, 1);
  SW.ground.position.y = U.keelBottom - 0.02 * L;
  SW.rigTop = U.rigTop;
  SW.spin = true; SW.dist = 1.12; SW.t0 = performance.now();
  SW.stage = 7;
  document.getElementById('swStage').value = 7;

  document.getElementById('shipwright').classList.remove('hidden');
  document.getElementById('swTitle').textContent = vessel.name;
  document.getElementById('swSub').textContent =
    (vessel.sub || '') + ' · ' + (vessel.hull.masts.length ? vessel.polar.rig : 'no sail');
  document.getElementById('swDims').innerHTML = [
    ['Length overall', L.toFixed(1) + ' m'],
    ['Beam', vessel.hull.beam.toFixed(2) + ' m'],
    ['Draught', vessel.hull.draught.toFixed(2) + ' m'],
    ['Rig, deck to truck', U.rigTop.toFixed(1) + ' m'],
  ].map(d => '<div><b>' + d[1] + '</b><span>' + d[0] + '</span></div>').join('');

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
  const cap = [
    [bestV.toFixed(1) + ' kn', 'best speed'],
    [bestA + '°', 'at this angle off the wind'],
    [(P.beatLight !== undefined ? P.beatLight + '°' : '—'), 'closest, light airs'],
    [(P.beatHard !== undefined ? P.beatHard + '°' : '—'), 'closest, blowing hard'],
  ];
  document.getElementById('swCap').innerHTML =
    '<h4>What she could do</h4><div class="cap">' +
    cap.map(c => '<div><b>' + c[0] + '</b><span>' + c[1] + '</span></div>').join('') + '</div>' +
    (P.rigNote ? '<p style="margin-top:10px">' + P.rigNote + '</p>' : '');
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
  if (SW.spin) SW.lon += 0.0016;
  const top = SW.viewTop, bot = SW.viewBot;
  const look = bot + (top - bot) * 0.34;
  const halfV = Math.max(top - look, look - bot);
  const tanV = Math.tan(SW.cam.fov * Math.PI / 360);
  const fit = 1.14 * Math.max(halfV / tanV, SW.viewX / 2 / (tanV * Math.max(1.2, SW.cam.aspect)));
  const d = fit * SW.dist;
  SW.cam.position.set(d * Math.cos(SW.lat) * Math.sin(SW.lon),
                      d * Math.sin(SW.lat) + look,
                      d * Math.cos(SW.lat) * Math.cos(SW.lon));
  SW.cam.lookAt(0, look, 0);
  const hm = SW.ship.userData.hullMat;
  if (hm) hm.uniforms.uCam.value.copy(SW.cam.position);
  SW.renderer.render(SW.scene, SW.cam);
}

addEventListener('resize', swResize);
window.SHIPS_SW = { swOpen, swClose, swFrame, SW };
