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

  SW.scene.add(new THREE.HemisphereLight(0x93b8cc, 0x2a2418, 1.35));
  const key = new THREE.DirectionalLight(0xfff2da, 1.45); key.position.set(70, 95, 55);
  const fill = new THREE.DirectionalLight(0x9dc6de, 0.45); fill.position.set(-60, 30, -70);
  SW.scene.add(key); SW.scene.add(fill);

  /* a ground plane, so the hull reads as an object on a floor rather than in a void */
  const gg = new THREE.PlaneGeometry(1, 1);
  const gm = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({
    color: 0x0a161f, roughness: 1.0, metalness: 0.0 }));
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
  document.getElementById('swClose').onclick = swClose;
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
    SW.viewTop = bb.max.y; SW.viewBot = bb.min.y; SW.viewX = bb.max.x - bb.min.x;
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
  SW.ship = window.SHIPS_HULL.buildShip(vessel.hull);
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

  swApplyStage();
  swSelect(null);
  swBuildFleetStrip();
  SW.on = true;
  swResize();
  return true;
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
