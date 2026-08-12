/* battle.js — THE ACTION: a fleet engagement from the water, not from orbit.
 *
 * The globe shows a campaign as a chessboard, which is honest about what a globe can show: at
 * any zoom that fits the Channel, two fleets four miles apart are the same pixel. This view
 * drops the camera to the sea and runs the same day at TRUE SCALE — ships of their real length,
 * at their real separation, moving at the speed their own polar diagram says they can make in
 * the wind the commander wrote down.
 *
 * ── THE SHIPS ARE NOT ANIMATED. THEY ARE SAILED. ───────────────────────────────────────
 * There is no keyframed path here and no tactical AI. Each ship holds a station in its fleet's
 * formation and steers for it; its speed comes from the routing engine's OWN compiled polar —
 * compilePolar and polarSpeed, the functions that cross oceans — evaluated at the angle
 * between its heading and the day's wind. So a ship inside her beat gate stops, one with the
 * wind on the quarter flies, and the
 * fleet to leeward genuinely cannot get back up to the fleet to windward. That last fact is the
 * whole of 1588 and nobody had to author it.
 *
 * Because the polar is shared with the router, a change there shows up here. That is the point:
 * one model of how a ship moves, used everywhere, rather than a plausible-looking second one.
 */
'use strict';

const BT = {
  on: false, renderer: null, scene: null, cam: null, sea: null,
  ships: [], day: 0, t: 0, playing: true, lon: 0.6, lat: 0.10, dist: 900, eye: 26,
  spec: null, wind: 225, force: 5, smoke: null, sp: [], mats: [],
  land: null, shoreReady: false, shoreFor: null, shoreGrid: null,
  shoreW: 0, shoreH: 0, shoreB: null, dayLonR: 0, dayLatR: 0,
};

/* ── ⚠ THE FRAME IS (x = WEST, z = NORTH), RIGHT-HANDED — AND IT USED TO BE A MIRROR ──────
   Until round 83 this file mapped a compass bearing θ to (x, z) = (sin θ, cos θ): east on +x,
   north on +z, y up — the LEFT-handed geographic frame psgFrame's own warning names, "a
   mirrored world that agrees with itself, which is the hardest kind to see." With nothing but
   fleets and wind in the scene the mirror was invisible: every relationship the record states
   (who is upwind, the range, the course) held true in the reflection. The day a real coastline
   arrived it stopped being invisible — a mirrored Salamis puts Aigaleo on the wrong hand of
   the strait, and the view directly contradicts the campaign board one tab over.
   So the frame is now the project's own: +X WEST, +Z NORTH (LAND_VERT states the same), and a
   bearing θ maps to (-sin θ, cos θ). Every conversion between compass and local space below
   carries the flip; the holder yaw is -hd for the same reason. */

/* ── polar: the ROUTER'S model, not a second one ────────────────────────────────────────
   Until round 50 this file kept its own interpolator over polar.curve times a linear force
   scale — no beat gate, no oar floor, no engine rule — so a galley staged here would have
   had her crew wind-scaled: the same B9 fault route.js was cured of in round 48, alive in a
   second consumer. There is no second model now. Each fleet's polar is compiled once at
   open by route.js's own compilePolar, and every frame asks route.js's polarSpeed — floor,
   beat gate and engine rule included by construction, and a change to the model shows up
   here without anyone remembering this file exists.
   ⚠ LOAD ORDER: route.js loads AFTER this file, so its globals may only be touched at
   runtime — btOpen and later — never at parse time. And this file must never DECLARE a
   function named polarSpeed: classic scripts share one global scope and the last file to
   load wins silently. That overwrite has already happened here once, the other way. */

function btInit() {
  if (BT.renderer) return;
  const cv = document.getElementById('btCanvas');
  BT.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  BT.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  BT.scene = new THREE.Scene();
  /* ── A SKY, AND FOG THE SAME COLOUR AS ITS HORIZON ──────────────────────────────────
     Without this the sea ends in a hard black line and the whole view reads as a diorama on a
     table. The dome is a gradient from overcast zenith to a pale, hazy horizon; the fog is set
     to that same horizon colour, so distant ships fade INTO the sky instead of against it —
     which is also, physically, why you lose a ship hull-down before you lose her topsails. */
  const HORIZON = 0xa9bcc6;
  BT.scene.fog = new THREE.FogExp2(HORIZON, 0.00042);
  BT.scene.background = new THREE.Color(HORIZON);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40000, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: new THREE.Color(0x4d6f8c) },
                  uHor: { value: new THREE.Color(HORIZON) } },
      vertexShader: 'varying float vH; void main(){ vH = normalize(position).y;'
                  + ' gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying float vH; uniform vec3 uTop, uHor;'
                  + ' void main(){ float t = smoothstep(-0.04, 0.52, vH);'
                  + ' gl_FragColor = vec4(mix(uHor, uTop, t), 1.0); }',
    }));
  BT.sky = sky;
  BT.scene.add(sky);
  BT.cam = new THREE.PerspectiveCamera(38, 1, 0.5, 90000);

  BT.scene.add(new THREE.HemisphereLight(0x9dc2d8, 0x1e2a30, 1.15));
  const sun = new THREE.DirectionalLight(0xfff0d6, 1.5); sun.position.set(400, 620, 300);
  BT.scene.add(sun);

  /* the sea: the same wind-driven surface as the Yard, at fleet scale */
  /* ── ⚠ A 120 km PLANE OF TWO TRIANGLES CANNOT HAVE WAVES IN IT ────────────────────
     The old sea was PlaneGeometry(1,1,1,1) scaled to 120,000 m: four vertices. Every ripple
     on it was painted by the fragment shader, so nothing was ever displaced, nothing floated,
     and nothing could occlude anything. Real geometry is the only way a hull can sit IN the
     water rather than on a picture of it.
     Uniform tessellation over 120 km is impossible — a 118 m swell would want a million
     vertices. But the haze closes the view at uScale*14, about 3.4 km, so a plane that size
     is all anyone ever sees. Tessellate 4 km at 256 and MOVE IT WITH THE CAMERA; because the
     wave field is a function of world position, sliding the mesh under it changes nothing
     about where the crests are. */
  BT.sea = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200, 256, 256), new THREE.ShaderMaterial({
    vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
    uniforms: { uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
                uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
                uWind: { value: 9 }, uScale: { value: 240 }, uRip: { value: 3000 },
                uWave: { value: SHIPS_SEA.seaWaveUniform() } },
  }));
  BT.sea.rotation.x = -Math.PI / 2;
  BT.scene.add(BT.sea);

  /* powder smoke: quads that bloom and drift down the wind */
  const NS = 460;
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3));
  sg.setAttribute('size', new THREE.BufferAttribute(new Float32Array(NS), 1));
  sg.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(NS), 1));
  BT.smoke = new THREE.Points(sg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `attribute float size; attribute float alpha; varying float vA;
      void main(){ vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA;
      void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d);
        if(r>0.5) discard;
        float a = vA * smoothstep(0.5,0.06,r);
        gl_FragColor = vec4(vec3(0.86,0.84,0.80), a*0.88); }`,
  }));
  BT.scene.add(BT.smoke);
  BT.sp = Array.from({ length: NS }, () => ({ life: -1 }));

  let drag = null;
  cv.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, lon: BT.lon, lat: BT.lat };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    BT.lon = drag.lon - (e.clientX - drag.x) * 0.006;
    BT.lat = Math.max(0.012, Math.min(0.85, drag.lat + (e.clientY - drag.y) * 0.004));
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    BT.dist = Math.max(90, Math.min(6000, BT.dist * (1 + Math.sign(e.deltaY) * 0.11)));
  }, { passive: false });

  document.getElementById('btPlay').onclick = () => btSetPlaying(!BT.playing);
  document.getElementById('btDay').addEventListener('input', e => {
    /* an explicit day choice pauses the slideshow — without this the autoplay overrode
       the user's day within 9 s and wrapped on through 0 (measured live, r85) */
    btSetPlaying(false);
    BT.day = +e.target.value; btSetDay();
  });
}

/* +1 when the English lie upwind of the Armada, -1 when they do not. Read off the SAME
   lon/lat pair the globe uses, so the two views can never disagree about the weather gauge. */
function lonLatUpwind(d) {
  const toWind = d.w * Math.PI / 180;
  const dx = (d.elon - d.lon) * Math.cos(d.lat * Math.PI / 180), dz = d.elat - d.lat;
  return (dx * Math.sin(toWind) + dz * Math.cos(toWind)) > 0 ? 1 : -1;
}

/* ── a station in the fleet's own frame, from the record's formation block ──────────
   Until round 80 the composition and the shape were HARDCODED here — carrack times 22 in
   a crescent, fluyt times 18 in ranks — so the Action could only ever stage 1588. The
   fleets are battle DATA now (`battle.fleets`), and this is the one implementation of a
   formation, drawn by the Action at true scale and by the globe's campaign board at token
   scale. Two shapes cover every fleet staged so far: `crescent` — horns swept back, the
   strong ships in the centre, the Armada's own — and `ranks` — a front so many metres
   across, so many rows deep. Params are metres. t runs -1..+1 across the front. */
function formStation(form, t, i) {
  if (form.shape === 'crescent')
    return { x: t * form.front / 2,
             z: -Math.pow(Math.abs(t), 1.7) * form.depth + form.lead };
  return { x: t * form.front / 2 + ((i % 3) - 1) * (form.jx || 0),
           z: -(form.back || 0) - (i % form.rows) * form.gap };
}

/* negative years are years BC — the same convention the vessel records use */
function btYear(y) { return y < 0 ? (-y) + ' BC' : '' + y; }

/* ── open ──────────────────────────────────────────────────────────────────────────── */
function btOpen(battle) {
  btInit();
  if (!battle || !battle.campaign || !battle.fleets) return false;
  BT.spec = battle;
  BT.ships.forEach(s => BT.scene.remove(s.obj));
  BT.ships = []; BT.mats = [];

  const V = (APP.vessels && APP.vessels.vessels) || [];
  battle.fleets.forEach((F, fi) => {
    /* which SIDE a fleet fights on is the record's own field where it says so — Lepanto's
       galleasses are a third fleet block (their own hull, their own formation, a station
       ahead of the line) but they are League ships, anchored at fleet 0's origin. Without
       `side` the block's index is its side, which is every two-fleet battle unchanged. */
    const side = F.side !== undefined ? F.side : fi;
    const ves = V.find(x => x.id === F.id);
    if (!ves || !ves.hull) return;
    /* `furled` is the fleet record's canvas state: a trireme fought under oar with her
       sails struck — often with no mast aboard at all, so bare spars are themselves a
       stated simplification (Research/SALAMIS.md) */
    const proto = window.SHIPS_HULL.buildShip(ves.hull, { furled: !!F.furled });
    /* one compiled polar per fleet, shared by every ship in it — route.js's own */
    const P = compilePolar(ves.polar);
    /* ⚠ Object3D.clone() DEEP-COPIES userData THROUGH JSON. Any live object reference held
       there — a material, a Vector3, a texture — comes back as a lifeless plain object, so
       `clone.userData.hullMat.uniforms.uCam.value.copy(...)` threw "not a function" and, being
       inside the frame callback, took the whole render loop down with it. Meshes SHARE their
       material by reference, so the proto's real material is the one every clone draws with.
       Hold that, and never read a live reference back out of a clone's userData. */
    if (proto.userData.hullMat) BT.mats.push(proto.userData.hullMat);
    for (let i = 0; i < F.n; i++) {
      const o = i === 0 ? proto : proto.clone();
      const holder = new THREE.Group();
      /* the hull's bow is at local -X; a quarter turn puts it on local +Z, which is this
         view's forward, so heading is a plain rotation about Y from here on */
      o.rotation.y = Math.PI / 2;
      holder.add(o);
      BT.scene.add(holder);
      const t = (i - (F.n - 1) / 2) / ((F.n - 1) / 2);
      const st = formStation(F.form, t, i);
      BT.ships.push({
        obj: holder, side, P, loa: ves.hull.loa,
        t, x: 0, z: 0, hd: 0, spd: 0, phase: i * 1.7,
        /* `face` turns the fleet on its snap heading: 1588's fleets ran the same course
           in line ahead, but at Salamis the column met the line BOW TO BOW, and a line
           snapped stern-to its enemy is the aback fault at fleet scale */
        face: (F.face || 0) * Math.PI / 180,
        /* bare spars barely heel: most of the heeling moment IS the canvas */
        heelK: F.furled ? 0.2 : 1,
        sx: st.x, sz: st.z,
      });
    }
  });

  btShoreLoad(battle);
  BT.day = 0; BT.t = 0; btSetPlaying(true);
  const sl = document.getElementById('btDay');
  sl.max = battle.campaign.length - 1; sl.value = 0;
  document.getElementById('battle').classList.remove('hidden');
  document.getElementById('btTitle').textContent = battle.name;
  btSetDay();
  btPlace(true);
  BT.on = true;
  btResize();
  return true;
}

/* ── a day: the wind, and where the two fleets stand relative to each other ────────── */
function btSetDay() {
  const C = BT.spec.campaign, d = C[BT.day];
  BT.wind = d.w; BT.force = d.f;
  /* Beaufort to m/s once per day — v = 0.836·B^1.5, the scale's defining relation — so the
     frame loop hands polarSpeed a true wind speed, not a force number. */
  BT.tws = 0.836 * Math.pow(d.f, 1.5);
  BT.sea.material.uniforms.uWind.value = 2.5 + d.f * 1.9;
  const CARD = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  document.getElementById('btDate').textContent = d.d + ' ' + btYear(BT.spec.year);
  document.getElementById('btWind').innerHTML =
    '<b>' + CARD[Math.round(d.w / 22.5) % 16] + '</b> force ' + d.f;
  document.getElementById('btText').textContent = d.t;

  /* ── WHERE THE OTHER FLEET IS ──────────────────────────────────────────────────────
     Distance comes from the record — `rng`, the day's engagement range in metres. DIRECTION
     is computed, not authored: whichever fleet holds the weather gauge is placed upwind, using
     the same geometry the campaign bar reports. So the two views cannot disagree about who had
     the wind, and the shrinking range from 900 m in the Channel to 110 m at Gravelines is the
     tactical argument of the whole campaign, visible as distance.

     ⚠ NOT from the lon/lat offsets. Those are drawn for legibility at ocean scale and would put
     the enemy 33 km away — over the horizon, in a view whose entire purpose is true scale. */
  const toWind = (d.w) * Math.PI / 180;               // bearing the wind comes FROM
  const engSep = lonLatUpwind(d);
  BT.sep = { x: -Math.sin(toWind) * d.rng * engSep, z: Math.cos(toWind) * d.rng * engSep };
  /* the day's geographic anchor: fleet 0's position, the origin of the local frame. The
     shore mesh and the grounding rule both derive lon/lat from local metres through this. */
  BT.dayLonR = d.lon * Math.PI / 180; BT.dayLatR = d.lat * Math.PI / 180;
  if (BT.land) BT.land.material.uniforms.uDay.value.set(BT.dayLonR, BT.dayLatR);
  const FL = BT.spec.fleets, gaugeFleet = engSep > 0 ? FL[1] : FL[0];
  BT.gauge = gaugeFleet.name + ' holds the weather gauge';
  /* the course is the track's own bearing, this day to the next — and on the LAST day the
     previous day to this one, the heading the fleet arrived on. The old fallback was a
     hardcoded 90, east up the Channel, which pointed the Armada at Norway on the one day
     its record says it ran north about Scotland.
     ⚠ UNLESS THE DAY SAYS OTHERWISE. Lepanto's battle days walk the STORY across the
     field — noon at the galleasses, then the north flank, then the centre, then the
     south — so the track's bearing is the order of telling, not the fleet's facing, and
     it pointed the League line north-west at a crescent standing to the east. Where the
     record attests a facing (the League met the crescent head-on, heading east into the
     mouth), the day carries it as `hd` and the track bearing is only the fallback. */
  BT.fleetHd = 90;
  if (isFinite(d.hd)) BT.fleetHd = d.hd;
  else if (C.length > 1) {
    const j = Math.min(BT.day, C.length - 2);
    const p = C[j], n = C[j + 1];
    const mLat = 111132, mLon = 111320 * Math.cos(p.lat * Math.PI / 180);
    BT.fleetHd = Math.atan2((n.lon - p.lon) * mLon, (n.lat - p.lat) * mLat) * 180 / Math.PI;
  }
  document.getElementById('btGauge').textContent = BT.gauge;
  document.getElementById('btGauge').className = 'gauge ' + (gaugeFleet.chip || '');
  document.getElementById('btRange').textContent =
    d.rng >= 1000 ? (d.rng / 1000).toFixed(1) + ' km apart' : d.rng + ' m apart';
  btPlace(false);
}

/* put each ship on its station; `snap` teleports, otherwise they sail to it */
function btPlace(snap) {
  BT.ships.forEach(s => {
    const h = BT.fleetHd * Math.PI / 180;
    const ox = s.side === 0 ? 0 : BT.sep.x, oz = s.side === 0 ? 0 : BT.sep.z;
    /* station rotated into the fleet's heading: forward is (-sin h, cos h), the ship's own
       starboard (+sx) is (-cos h, -sin h) — the compass-to-local map, west-positive x */
    s.tx = ox - (s.sx * Math.cos(h) + s.sz * Math.sin(h));
    s.tz = oz - s.sx * Math.sin(h) + s.sz * Math.cos(h);
    /* ── THE WORLD CONSTRAINS THE STATION ───────────────────────────────────────────────
       A formation is a drawing; a shore is a fact. Where the drawn station falls on dry
       land — a wing of the line overlapping a headland the record's own strait puts there —
       the ship takes the nearest afloat point back along the line to her fleet's anchor,
       which is validated water for every day. The line compresses against the coast, which
       at Salamis is not a compromise: it is the battle. */
    if (BT.shoreGrid && btElevLocal(s.tx, s.tz) > -2.0) {
      const vx = ox - s.tx, vz = oz - s.tz;
      const len = Math.hypot(vx, vz), n = Math.max(1, Math.ceil(len / 25));
      for (let k = 1; k <= n; k++) {
        const px = s.tx + vx * k / n, pz = s.tz + vz * k / n;
        if (btElevLocal(px, pz) <= -2.0) { s.tx = px; s.tz = pz; break; }
      }
    }
    if (snap) { s.x = s.tx; s.z = s.tz; s.hd = h + s.face; }
  });
}

/* elevation under a LOCAL point, from the battle's own shore raster; -30 where there is no
   data, which is open sea for every purpose this serves */
function btElevLocal(x, z) {
  if (!BT.shoreGrid) return -30;
  const R = 6371000.0;
  const lat = BT.dayLatR + z / R;
  const lon = BT.dayLonR - x / (R * Math.max(0.05, Math.cos(lat)));
  return btShoreElev(lon * 180 / Math.PI, lat * 180 / Math.PI);
}
function btShoreElev(lonDeg, latDeg) {
  const B = BT.shoreB;
  if (!B || !BT.shoreGrid) return -30;
  const u = (lonDeg - B.lon0) / (B.lon1 - B.lon0);
  const v = (latDeg - B.lat0) / (B.lat1 - B.lat0);
  if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return -30;
  const x = Math.min(BT.shoreW - 1.001, Math.max(0, u * BT.shoreW - 0.5));
  const y = Math.min(BT.shoreH - 1.001, Math.max(0, (1 - v) * BT.shoreH - 0.5));
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const G = BT.shoreGrid, W = BT.shoreW;
  const a = G[yi * W + xi] * (1 - fx) + G[yi * W + xi + 1] * fx;
  const b = G[(yi + 1) * W + xi] * (1 - fx) + G[(yi + 1) * W + xi + 1] * fx;
  return a * (1 - fy) + b * fy;
}

/* ── the shore's dress is DATA, not code ────────────────────────────────────────────────
   A shore block names its ground cover with `veg`, and each name here is a complete palette
   for BT_LAND_FRAG. r84 shipped the Gravelines DEM wearing the Attic set — phrygana scrub
   and limestone on Flemish chalk, dune and polder — because the palette lived in the shader
   as constants. An unknown or missing name warns here and CONVICTS in the audit; the render
   falls back to phrygana and says so, rather than drawing nothing. */
const SHORE_PALS = {
  /* dry limestone Greece, late September: phrygana scrub, grey-buff rock going bare above
     ~220 m (upper Aigaleo), a narrow pale-rock waterline */
  phrygana: { vegLo: [0.335, 0.330, 0.230], vegHi: [0.420, 0.385, 0.270],
              rock: [0.520, 0.480, 0.415], shoreC: [0.560, 0.520, 0.450],
              rockS: [0.10, 0.38], bare: [220, 420, 0.4], shoreHi: 4.0 },
  /* the Flemish coast in August: green polder pasture, chalk where the ground cliffs (Cap
     Blanc-Nez), a wide dune-sand waterline — the dune belt runs to ~10 m — and no bare-summit
     band on a coast whose highest point grazes 150 m */
  polder:   { vegLo: [0.238, 0.318, 0.186], vegHi: [0.330, 0.402, 0.226],
              rock: [0.760, 0.755, 0.700], shoreC: [0.695, 0.655, 0.545],
              rockS: [0.18, 0.45], bare: [1e5, 2e5, 0.0], shoreHi: 9.0 },
};

/* ── the shore: a battle that carries a DEM patch gets its coast staged around the fleets ──
   Loaded once per battle through the app's own tile discipline (createImageBitmap with
   colorSpaceConversion 'none' — these PNGs are DATA, and a colour-managed browser quietly
   corrupting the high byte of an elevation is the class of bug you never find by looking).
   One decode feeds both consumers: the canvas becomes the GPU texture the shader displaces,
   and the same pixels become the CPU grid the grounding rule and the audit sample — the two
   cannot disagree about where the coast is. */
function btShoreLoad(battle) {
  const sh = battle.shore;
  BT.shoreReady = false; BT.shoreGrid = null; BT.shoreFor = battle.id;
  if (BT.land) BT.land.visible = false;
  if (!sh) { BT.shoreReady = true; return; }
  fetch(sh.src).then(r => r.blob())
    .then(b => createImageBitmap(b, { colorSpaceConversion: 'none' }))
    .then(img => {
      if (BT.shoreFor !== battle.id) return;         // a different battle opened meanwhile
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data;
      const G = new Float32Array(cv.width * cv.height);
      /* ⚠ px holds BYTES, 0-255. The shader's decode `(t.r * 65280 + t.g * 255) / 65535`
         is written for GLSL's NORMALIZED channels (t.r = R/255, so t.r * 65280 = R * 256);
         copied here verbatim it read 255x too large — every point on Earth was +2.8
         million metres of land, the grounding rule could never find water to pull a ship
         back to, and the live helm refused every step. The byte form of the same decode: */
      for (let i = 0; i < G.length; i++)
        G[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / 65535 * 20000 - 11000;
      BT.shoreGrid = G; BT.shoreW = cv.width; BT.shoreH = cv.height;
      BT.shoreB = { lon0: sh.lon0, lat0: sh.lat0, lon1: sh.lon1, lat1: sh.lat1 };
      /* the GPU half needs the Action's scene; the audit drives this loader headless
         (ship view, no scene) to make the shore witnesses testify on every run, and it
         only needs the grid above. btOpen loads again with the scene up. */
      if (!BT.scene) { BT.shoreReady = true; return; }
      if (!BT.land) {
        BT.land = new THREE.Mesh(radialDisc(6, 42000, 240, 288, 6371000.0),
          new THREE.ShaderMaterial({
            vertexShader: SHADERS['BT_LAND_VERT.vert'], fragmentShader: SHADERS['BT_LAND_FRAG.frag'],
            uniforms: {
              uShore: { value: null }, uB: { value: new THREE.Vector4() },
              uDay: { value: new THREE.Vector2() },
              uSun: { value: new THREE.Vector3(0.5, 0.72, 0.42).normalize() },
              uCam: { value: new THREE.Vector3() },
              uFogC: { value: new THREE.Color(0xa9bcc6) }, uFogD: { value: 0.00042 },
              uVegLo: { value: new THREE.Vector3() }, uVegHi: { value: new THREE.Vector3() },
              uRock: { value: new THREE.Vector3() }, uShoreC: { value: new THREE.Vector3() },
              uRockS: { value: new THREE.Vector2() }, uBare: { value: new THREE.Vector3() },
              uShoreHi: { value: 4.0 },
            },
          }));
        BT.land.rotation.x = -Math.PI / 2;
        BT.land.frustumCulled = false;
        BT.scene.add(BT.land);
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.generateMipmaps = false;
      tex.colorSpace = THREE.NoColorSpace;
      /* ⚠ CanvasTexture defaults to flipY TRUE, and the shader maps latitude to rows itself.
         With the default, the DRAWN coast is the north-south mirror of the DATA coast — the
         grounding rule and the audit's probes read the true world while the render shows its
         reflection, ships pulled to real water standing on drawn land. The CPU and the GPU
         must read the same rows. */
      tex.flipY = false;
      const U = BT.land.material.uniforms;
      U.uShore.value = tex;
      U.uB.value.set(sh.lon0, sh.lat0, sh.lon1, sh.lat1);
      U.uDay.value.set(BT.dayLonR, BT.dayLatR);
      if (!SHORE_PALS[sh.veg])
        console.warn('shore veg "' + sh.veg + '" names no palette — wearing phrygana as a LABELLED fallback');
      const pal = SHORE_PALS[sh.veg] || SHORE_PALS.phrygana;
      U.uVegLo.value.fromArray(pal.vegLo); U.uVegHi.value.fromArray(pal.vegHi);
      U.uRock.value.fromArray(pal.rock);   U.uShoreC.value.fromArray(pal.shoreC);
      U.uRockS.value.fromArray(pal.rockS); U.uBare.value.fromArray(pal.bare);
      U.uShoreHi.value = pal.shoreHi;
      BT.land.visible = true;
      BT.shoreReady = true;
      /* re-place onto grounded-checked stations: a snap under ?frozen so the capture is the
         constrained picture; a re-target live, so ships sail clear rather than teleport.
         ⚠ FROZEN is a script-scope const in app.js — a bare global binding, NOT a window
         property, so `window.FROZEN` is silently undefined here. */
      btPlace(typeof FROZEN !== 'undefined' && FROZEN);
    })
    .catch(e => { console.warn('shore failed to load:', e); BT.shoreReady = true; });
}

/* jump to a campaign day and SNAP the fleets onto that day's stations — the hash's
   `&day=` uses this, because a frozen capture of ships mid-passage between two days'
   stations is a picture of nothing the record says */
function btGoDay(n) {
  const C = BT.spec && BT.spec.campaign;
  if (!C) return;
  btSetPlaying(false);
  BT.day = Math.max(0, Math.min(C.length - 1, n | 0));
  const sl = document.getElementById('btDay');
  if (sl) sl.value = BT.day;
  btSetDay();
  btPlace(true);
}

/* one writer for the play state, so the button text can never disagree with the clock.
   Every EXPLICIT day choice — the slider, the `&day=` hash — routes through
   btSetPlaying(false): autoplay is the default show for an unaddressed open, but a named
   day is an address, and the slideshow must not wrap it back to 0 nine seconds later. */
function btSetPlaying(on) {
  BT.playing = on;
  BT.dayT = 0;
  const b = document.getElementById('btPlay');
  if (b) b.textContent = on ? 'Pause' : 'Play';
}

function btClose() {
  BT.on = false;
  document.getElementById('battle').classList.add('hidden');
}

function btResize() {
  if (!BT.renderer) return;
  const el = document.getElementById('battle');
  const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
  BT.renderer.setSize(w, h, false);
  BT.cam.aspect = w / h; BT.cam.updateProjectionMatrix();
}

/* ── the step ──────────────────────────────────────────────────────────────────────── */
const KN = 0.5144;                                    // knots to metres per second

function btFrame(now, dt) {
  if (!BT.on) return;
  BT.t += dt;
  const windTo = (BT.wind + 180) * Math.PI / 180;      // where the wind is going
  const fromWind = windTo + Math.PI;                   // where it comes from
  /* Gunfire on the days the record FLAGS action, in fleets whose record carries powder.
     The old test was a regex over the day's prose, and it fired on "A day of no action" —
     5 Aug, the empty day off Beachy Head, drew broadsides for as long as the Action has
     existed, because "no action" contains "Action". And 480 BC has no guns at all, which
     is a fact of the battle record (`powder`), not of the prose. */
  const action = !!BT.spec.campaign[BT.day].a && !!BT.spec.powder;

  BT.ships.forEach(s => {
    /* steer for the station — but the helm knows the gate. If the direct course would make
       no way (a square rig ordered dead upwind), she falls to the nearer beat limb and
       holds it, which is what a helmsman with a station to windward actually does. A hull
       with an oar floor or an engine always makes way, so her helm is never clamped. */
    const dx = s.tx - s.x, dz = s.tz - s.z;
    let want = Math.atan2(-dx, dz);        // compass bearing of a local vector: x is WEST
    let rw = (want - fromWind) * 180 / Math.PI;
    while (rw > 180) rw -= 360;
    while (rw < -180) rw += 360;
    if (polarSpeed(s.P, BT.tws, rw) <= 0)
      want = fromWind + (rw < 0 ? -1 : 1) * polarBeat(s.P, BT.tws) * Math.PI / 180;
    let e = want - s.hd;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    s.hd += Math.max(-0.30 * dt, Math.min(0.30 * dt, e));   // a ship does not turn on a pin

    /* ── SPEED FROM THE POLAR — THE ROUTER'S OWN ──────────────────────────────────
       The angle that matters is between the ship's HEAD and where the wind comes FROM.
       0 is head to wind, where a sail ship stops and an oared one does not. */
    let rel = (s.hd - fromWind) * 180 / Math.PI;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    const kn = polarSpeed(s.P, BT.tws, rel);
    s.spd += (kn * KN - s.spd) * Math.min(1, dt * 0.4);
    const dist = Math.hypot(dx, dz);
    const drive = dist < 40 ? dist / 40 : 1;
    const nx = s.x - Math.sin(s.hd) * s.spd * drive * dt;
    const nz = s.z + Math.cos(s.hd) * s.spd * drive * dt;
    /* a hull does not sail up a hillside: a step that would ground is refused, and she lies
       at the water's edge with her way coming off — the shore is a fact the helm obeys */
    if (!BT.shoreGrid || btElevLocal(nx, nz) <= -2.0) { s.x = nx; s.z = nz; }
    else s.spd *= 0.85;

    const o = s.obj;
    o.position.set(s.x, 0, s.z);
    o.rotation.set(0, -s.hd, 0);           // compass to yaw: the frame's one sign, again
    /* she heels away from the wind by the sine of its angle off the bow, and lifts on the
       swell — scaled down to windage alone when her canvas is stowed, because most of the
       heeling moment IS the canvas. Positive rotateZ rolls the +x (PORT) side down in this
       frame, so the sign travels with the chirality fix. */
    const heel = Math.sin(rel * Math.PI / 180) * (0.035 + BT.force * 0.013) * s.heelK;
    o.rotateZ(heel);
    o.rotateX(Math.sin(BT.t * 0.7 + s.phase) * 0.016);
    o.position.y = Math.sin(BT.t * 0.62 + s.phase) * 0.45 - 0.2;

    /* gunfire, on the days the record says there was gunfire */
    /* Gunfire, on the days the record says there was gunfire — and enough of it. Nine hours
       at musket range put both fleets inside a bank of their own powder smoke thick enough
       that captains complained they could not see the next ship in the line. A polite wisp
       would be the wrong picture. */
    if (action && Math.random() < dt * 1.9) btPuff(s.x, s.z, s.hd, s.loa);
  });

  btStepSmoke(dt, windTo);

  /* The camera floats above the water, off the title fleet's flank — fleet 0's own
     center, the local origin. It orbited the MIDPOINT of the two fleets until round 84,
     which was indistinguishable at Gravelines' 110 m and staged pure empty sea at the
     Armada sighting's 7 km: both fleets 3.5 km away at right angles to a view centred
     on the water between them. A fleet is the subject; the range to the other one is
     the card's number and the background's business. */
  const cx = 0, cz = 0;
  BT.cam.position.set(cx + BT.dist * Math.cos(BT.lat) * Math.sin(BT.lon),
                      BT.eye + BT.dist * Math.sin(BT.lat) + Math.sin(BT.t * 0.5) * 1.2,
                      cz + BT.dist * Math.cos(BT.lat) * Math.cos(BT.lon));
  BT.cam.lookAt(cx, 12, cz);
  BT.sea.position.set(cx, 0, cz);
  BT.sky.position.set(BT.cam.position.x, 0, BT.cam.position.z);
  BT.sea.material.uniforms.uTime.value = BT.t;
  BT.sea.material.uniforms.uCam.value.copy(BT.cam.position);
  if (BT.land && BT.land.visible) BT.land.material.uniforms.uCam.value.copy(BT.cam.position);
  /* the tessellated patch rides with the camera; the wave field is a function of world
     position, so sliding the mesh beneath it does not move a single crest */
  BT.sea.position.set(BT.cam.position.x, 0, BT.cam.position.z);
  BT.mats.forEach(hm => hm.uniforms.uCam.value.copy(BT.cam.position));

  if (BT.playing) {
    BT.dayT = (BT.dayT || 0) + dt;
    if (BT.dayT > 9.0) {
      BT.dayT = 0;
      BT.day = (BT.day + 1) % BT.spec.campaign.length;
      document.getElementById('btDay').value = BT.day;
      btSetDay();
    }
  }
  BT.renderer.render(BT.scene, BT.cam);
}

function btPuff(x, z, hd, loa) {
  const s = BT.sp.find(p => p.life < 0);
  if (!s) return;
  /* a broadside comes out of the SIDE of the ship, which is the whole reason ships fought
     in line: the guns cannot be pointed, only the ship can */
  const side = Math.random() < 0.5 ? 1 : -1;
  const along = (Math.random() - 0.5) * loa * 0.8;
  s.x = x - Math.sin(hd) * along - Math.cos(hd) * side * loa * 0.16;
  s.z = z + Math.cos(hd) * along - Math.sin(hd) * side * loa * 0.16;
  s.y = 4 + Math.random() * 4;
  s.life = 0; s.max = 7.0 + Math.random() * 5.0;
  s.vx = -Math.cos(hd) * side * 7; s.vz = -Math.sin(hd) * side * 7;
}

function btStepSmoke(dt, windTo) {
  const g = BT.smoke.geometry;
  const p = g.attributes.position, sz = g.attributes.size, al = g.attributes.alpha;
  const w = 1.2 + BT.force * 0.9;
  BT.sp.forEach((s, i) => {
    if (s.life < 0) { al.setX(i, 0); return; }
    s.life += dt;
    if (s.life > s.max) { s.life = -1; al.setX(i, 0); return; }
    const f = s.life / s.max;
    s.vx *= 0.94; s.vz *= 0.94;
    s.x += (s.vx - Math.sin(windTo) * w) * dt;
    s.z += (s.vz + Math.cos(windTo) * w) * dt;
    s.y += 1.5 * dt;
    p.setXYZ(i, s.x, s.y, s.z);
    sz.setX(i, 11 + f * 58);
    al.setX(i, Math.sin(Math.min(1, f * 3.2) * Math.PI * 0.5) * (1 - f));
  });
  p.needsUpdate = true; sz.needsUpdate = true; al.needsUpdate = true;
}

addEventListener('resize', btResize);
window.SHIPS_BT = { btOpen, btClose, btFrame, btGoDay, btYear, formStation, btShoreElev, btElevLocal, btShoreLoad, SHORE_PALS, BT };
